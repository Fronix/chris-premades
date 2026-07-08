import {dialogUtils, documentUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
const unarmedIdentifiers = ['unarmed-strike', 'monk-unarmed-strike'];
async function savageAttack({document: item, workflow}) {
    if (workflow.hitTargets.size !== 1 || item.system.uses.value === 0 || !workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}));
    if (!selection) return;
    await workflowUtils.completeItemUse(item);
    foundry.utils.setProperty(workflow, 'chris-premades.savageAttacker', true);
}
async function savageDamage({workflow}) {
    if (!workflow?.['chris-premades']?.savageAttacker) return;
    const numWeaponDamageRolls = workflow.activity.damage.parts.length;
    const trueOld = [];
    const trueNew = [];
    for (let i = 0; i < numWeaponDamageRolls; i++) {
        const currRoll = workflow.damageRolls[i];
        trueOld.push(currRoll);
        trueNew.push(await new CONFIG.Dice.DamageRoll(currRoll.formula, currRoll.data, currRoll.options).evaluate());
    }
    const oldTotal = trueOld.reduce((acc, roll) => acc + roll.total, 0);
    const newTotal = trueNew.reduce((acc, roll) => acc + roll.total, 0);
    const highRolls = oldTotal < newTotal ? trueNew : trueOld;
    const lowRolls = oldTotal < newTotal ? trueOld : trueNew;
    for (let i = 0; i < highRolls.length; i++) {
        const highRoll = highRolls[i];
        const lowRoll = lowRolls[i];
        for (let j = 0; j < highRoll.terms.length; j++) {
            const term = highRoll.terms[j];
            if (term.isDeterministic) continue;
            const lowTerm = lowRoll.terms[j];
            for (const result of lowTerm.results) {
                result.active = false;
                result.hidden = true;
                result.rerolled = true;
                term.results.push(result);
            }
        }
    }
    const newDamageRolls = workflow.damageRolls;
    for (let i = 0; i < numWeaponDamageRolls; i++) {
        newDamageRolls[i] = highRolls[i];
    }
    await workflow.setDamageRolls(newDamageRolls);
}
export const savageAttacker = {
    name: 'Savage Attacker',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollComplete',
            macro: savageAttack,
            priority: 200
        },
        {
            pass: 'actorDamageRollComplete',
            macro: savageDamage,
            priority: 25
        }
    ]
};
async function brawlerLate({document: item, workflow}) {
    if (workflow.hitTargets.size !== 1 || !workflow.token) return;
    if (workflowUtils.getActionType(workflow) !== 'mwak') return;
    if (!unarmedIdentifiers.includes(documentUtils.getIdentifier(workflow.item))) return;
    const combat = game.combat;
    if (combat && item.getFlag('cat', 'tavernBrawlerStamp') === combat.round + '-' + combat.turn) return;
    const targetToken = workflow.targets.first();
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseOn', {itemName: item.name, tokenName: targetToken.name}));
    if (!selection) return;
    if (combat) await item.setFlag('cat', 'tavernBrawlerStamp', combat.round + '-' + combat.turn);
    await workflowUtils.completeItemUse(item);
    await tokenUtils.slideToken(targetToken.document ?? targetToken, {sourceToken: workflow.token.document, distance: 5});
}
export const tavernBrawler = {
    name: 'Tavern Brawler',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: brawlerLate,
            priority: 50
        }
    ]
};
