import {dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
function sizeIndex(actor) {
    return Object.keys(CONFIG.DND5E.actorSizes).indexOf(actor.system.traits.size);
}
function stamped(item, key) {
    const combat = game.combat;
    if (!combat) return false;
    return item.getFlag('cat', key) === combat.round + '-' + combat.turn;
}
async function stamp(item, key) {
    const combat = game.combat;
    if (!combat) return;
    await item.setFlag('cat', key, combat.round + '-' + combat.turn);
}
async function crusherMove({document: item, workflow}) {
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('bludgeoning')) return;
    if (!workflow.token) return;
    const targetToken = workflow.hitTargets.first();
    if (sizeIndex(targetToken.actor) > sizeIndex(workflow.actor) + 1) return;
    if (stamped(item, 'crusherStamp')) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.Crusher.Move'));
    if (!selection) return;
    await stamp(item, 'crusherStamp');
    await tokenUtils.slideToken(targetToken.document ?? targetToken, {sourceToken: workflow.token.document, distance: 5});
    await item.displayCard();
}
async function crusherCrit({document: item, workflow}) {
    if (!workflow.isCritical) return;
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('bludgeoning')) return;
    const effectData = {
        name: item.name,
        img: item.img,
        type: 'base',
        origin: item.uuid,
        duration: {seconds: 12},
        system: {
            changes: [
                {key: 'flags.midi-qol.grants.advantage.attack.all', type: 'custom', value: 1, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['turnStartSource']
            }
        }
    };
    await effectUtils.createEffects(workflow.hitTargets.first().actor, [effectData]);
    await item.displayCard();
}
export const crusher = {
    name: 'Crusher',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: crusherMove,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: crusherCrit,
            priority: 55
        }
    ]
};
async function piercerReroll({document: item, workflow}) {
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('piercing')) return;
    if (stamped(item, 'piercerStamp')) return;
    let lowest;
    workflow.damageRolls.forEach((roll, rollIndex) => {
        roll.terms.forEach((term, termIndex) => {
            if (term.isDeterministic !== false || !term.results) return;
            term.results.forEach((result, resultIndex) => {
                if (!result.active) return;
                if (!lowest || result.result < lowest.value) lowest = {value: result.result, rollIndex, termIndex, resultIndex, faces: term.faces};
            });
        });
    });
    if (!lowest || lowest.value >= lowest.faces) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.Piercer.Reroll', {value: lowest.value}));
    if (!selection) return;
    await stamp(item, 'piercerStamp');
    const reroll = await new Roll('1d' + lowest.faces).evaluate();
    const roll = workflow.damageRolls[lowest.rollIndex];
    const term = roll.terms[lowest.termIndex];
    const oldResult = term.results[lowest.resultIndex];
    oldResult.active = false;
    oldResult.rerolled = true;
    term.results.push({result: reroll.total, active: true});
    roll._total = roll._evaluateTotal();
    await workflow.setDamageRolls(workflow.damageRolls);
}
async function piercerCrit({document: item, workflow}) {
    if (!workflow.isCritical) return;
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('piercing')) return;
    const firstRoll = workflow.damageRolls[0];
    const die = firstRoll.terms.find(term => term.faces);
    if (!die) return;
    await workflowUtils.bonusDamage(workflow, '1d' + die.faces, {damageType: 'piercing', ignoreCrit: true});
}
export const piercer = {
    name: 'Piercer',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: piercerReroll,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: piercerCrit,
            priority: 55
        }
    ]
};
async function slasherSpeed({document: item, workflow}) {
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('slashing')) return;
    const activity = item.system.activities.find(a => a.identifier === 'use');
    if (!activity) return;
    if (stamped(item, 'slasherStamp')) return;
    const selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    await stamp(item, 'slasherStamp');
    await workflowUtils.syntheticActivityRoll(activity, Array.from(workflow.targets));
}
async function slasherCrit({document: item, workflow}) {
    if (!workflow.isCritical) return;
    if (workflow.hitTargets.size !== 1 || !workflow.damageRolls || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('slashing')) return;
    const activity = item.system.activities.find(a => a.identifier === 'critical');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, Array.from(workflow.targets));
}
export const slasher = {
    name: 'Slasher',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: slasherSpeed,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: slasherCrit,
            priority: 55
        }
    ]
};
