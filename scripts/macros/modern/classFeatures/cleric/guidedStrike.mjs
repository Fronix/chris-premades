import {automationUtils, dialogUtils, queryUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
async function addAttackBonus(workflow, item) {
    const bonus = Number(automationUtils.getConfigValue(item, 'attackBonus')) || 10;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, String(bonus));
    await workflow.setAttackRoll(newRoll);
}
function missedAttack(workflow) {
    if (!workflow.activity || workflow.isFumble || !workflow.targets.size) return false;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return false;
    return workflow.targets.first().actor.system.attributes.ac.value > workflow.attackTotal;
}
async function selfAttack({document: item, workflow}) {
    if (!missedAttack(workflow)) return;
    const activity = item.system.activities.find(a => a.identifier === 'self-use');
    if (!activity || !item.system.uses.value) return;
    const confirmed = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Missed', {attackTotal: workflow.attackTotal, itemName: item.name}));
    if (!confirmed) return;
    await workflowUtils.syntheticActivityRoll(activity, [workflow.token], {consumeResources: true, consumeUsage: true});
    await addAttackBonus(workflow, item);
}
async function nearbyAttack({document: item, workflow}) {
    if (item.actor === workflow.actor) return;
    if (!missedAttack(workflow)) return;
    const activity = item.system.activities.find(a => a.identifier === 'use');
    if (!activity || !item.system.uses.value) return;
    const confirmed = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.GuidedStrike.Attack', {item: item.name, attackRoll: workflow.attackTotal}), {userId: queryUtils.firstOwner(item.actor, true)});
    if (!confirmed) return;
    await workflowUtils.syntheticActivityRoll(activity, [], {consumeResources: true, consumeUsage: true});
    await addAttackBonus(workflow, item);
}
export const guidedStrike = {
    name: 'Guided Strike',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollMissedBonuses',
            macro: selfAttack,
            priority: 200
        },
        {
            pass: 'nearbyAttackRollMissedBonuses',
            macro: nearbyAttack,
            priority: 200,
            distance: 30,
            dispositions: ['ally']
        }
    ],
    config: {
        attackBonus: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.AttackBonus',
            category: 'tuning'
        }
    }
};
