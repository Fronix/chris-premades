import {automationUtils, dialogUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
async function saveCheckSkill({document: item, roll}) {
    if (!item.system.uses.value) return;
    const targetValue = roll.options.target;
    if (targetValue && roll.total >= targetValue) return;
    if (!targetValue && !automationUtils.getConfigValue(item, 'noDCPrompt')) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseRollTotal', {itemName: item.name, rollTotal: roll.total}));
    if (!selection) return;
    await workflowUtils.completeItemUse(item);
    return await rollUtils.replaceD20(roll, 20);
}
async function attack({document: item, workflow}) {
    if (!workflow.activity) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!item.system.uses.value) return;
    if (workflow.targets.size !== 1) return;
    if (workflow.targets.first().actor.system.attributes.ac.value <= workflow.attackTotal) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Missed', {attackTotal: workflow.attackTotal, itemName: item.name}));
    if (!selection) return;
    await workflowUtils.completeItemUse(item);
    const roll = await rollUtils.replaceD20(workflow.attackRoll, 20);
    await workflow.setAttackRoll(roll);
}
export const strokeOfLuck = {
    name: 'Stroke of Luck',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollMissedBonuses',
            macro: attack,
            priority: 50
        }
    ],
    save: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 250
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 250
        }
    ],
    check: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 250
        }
    ],
    config: {
        noDCPrompt: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.NoDCPrompt',
            category: 'tuning'
        }
    }
};
