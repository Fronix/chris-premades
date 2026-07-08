import {actorUtils, automationUtils, dialogUtils, documentUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function turnStart({document: item}) {
    if (game.combat?.round !== 1) return;
    await workflowUtils.completeItemUse(item);
}
async function damage({document: item, workflow}) {
    if (!item.system.uses.value) return;
    if (workflow.hitTargets.size !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!workflow.token) return;
    const combat = game.combat;
    if (combat && item.getFlag('cat', 'dreadAmbusherStamp') === combat.round + '-' + combat.turn + '-' + workflow.token.id) return;
    const selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    await documentUtils.update(item, {'system.uses.spent': item.system.uses.spent + 1});
    const stalkersFlurry = actorUtils.getItemByIdentifier(workflow.actor, 'stalkers-flurry');
    const damageFormulaItem = stalkersFlurry ?? item;
    const formula = automationUtils.getConfigValue(damageFormulaItem, 'formula') || '2d6';
    const damageType = automationUtils.getConfigValue(damageFormulaItem, 'damageType') || 'psychic';
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
    foundry.utils.setProperty(workflow, 'chris-premades.dreadAmbusher', true);
    if (combat) await item.setFlag('cat', 'dreadAmbusherStamp', combat.round + '-' + combat.turn + '-' + workflow.token.id);
}
async function late({workflow}) {
    if (!workflow['chris-premades']?.dreadAmbusher) return;
    const stalkersFlurry = actorUtils.getItemByIdentifier(workflow.actor, 'stalkers-flurry');
    if (!stalkersFlurry || !workflow.token) return;
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.StalkersFlurry.Use', {item: stalkersFlurry.name}), [
        ['CHRISPREMADES.Macros.StalkersFlurry.SuddenStrike', 'suddenStrike'],
        ['CHRISPREMADES.Macros.StalkersFlurry.MassFear', 'massFear'],
        ['CHRISPREMADES.Generic.No', false]
    ]);
    if (selection === 'suddenStrike') {
        const target = workflow.hitTargets.first();
        const targetNearbyAllies = tokenUtils.findNearby(target.document ?? target, 5, {disposition: 'ally'});
        const nearbyTargets = tokenUtils.findNearby(workflow.token.document, workflow.rangeDetails?.range ?? 5, {disposition: 'enemy'}).filter(token => token !== target && targetNearbyAllies.includes(token));
        if (!nearbyTargets.length) return;
        const picked = await dialogUtils.selectTargetDialog(_loc('CHRISPREMADES.Macros.StalkersFlurry.SuddenStrike'), _loc('CHRISPREMADES.Generic.Target'), nearbyTargets, {skipDeadAndUnconscious: false});
        if (!picked?.length) return;
        await workflowUtils.syntheticItemRoll(workflow.item, [picked[0]]);
    } else if (selection === 'massFear') {
        const massFear = stalkersFlurry.system.activities.find(a => a.identifier === 'stalkers-flurry-mass-fear');
        if (!massFear) return;
        const range = Number(automationUtils.getConfigValue(stalkersFlurry, 'range')) || 10;
        const first = workflow.targets.first();
        const targets = tokenUtils.findNearby(first.document ?? first, range, {disposition: 'all', includeToken: true}).filter(token => automationUtils.getConfigValue(stalkersFlurry, 'includeSelf') || token.actor !== workflow.actor);
        if (!targets.length) return;
        await workflowUtils.syntheticActivityRoll(massFear, targets);
    }
}
export const dreadAmbusher = {
    name: 'Dread Ambusher',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        },
        {
            pass: 'actorRollFinished',
            macro: late,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: turnStart,
            priority: 50
        }
    ],
    config: {
        formula: {
            default: '2d6',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'psychic',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const stalkersFlurry = {
    name: 'Stalker\'s Flurry',
    version: '2.0.0',
    rules: '2024',
    config: {
        formula: {
            default: '2d8',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'psychic',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        range: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        },
        includeSelf: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.StalkersFlurry.IncludeSelf',
            category: 'behavior'
        }
    }
};
async function dodgeAttacked({document: item, workflow}) {
    if (!workflow.targets.size || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    const actor = item.actor;
    if (!actor) return;
    if (MidiQOL.hasUsedReaction(actor)) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.ShadowyDodge.Use', {item: item.name}));
    if (!selection) return;
    workflow.disadvantage = true;
    foundry.utils.setProperty(workflow, 'chris-premades.shadowyDodge', true);
}
async function dodgeRollFinished({document: item, token, workflow}) {
    if (!workflow['chris-premades']?.shadowyDodge) return;
    const range = Number(automationUtils.getConfigValue(item, 'range')) || 30;
    const targetToken = token ?? actorUtils.getFirstToken(item.actor);
    if (!targetToken) return;
    await tokenUtils.teleportToken(targetToken.document ?? targetToken, {range});
}
export const shadowyDodge = {
    name: 'Shadowy Dodge',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetAttackRollConfig',
            macro: dodgeAttacked,
            priority: 50
        },
        {
            pass: 'targetRollFinished',
            macro: dodgeRollFinished,
            priority: 250
        }
    ],
    config: {
        range: {
            default: 30,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
