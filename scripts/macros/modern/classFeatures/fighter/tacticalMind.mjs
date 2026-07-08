import {actorUtils, automationUtils, dialogUtils, documentUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
async function check({document: item, actor, roll, options}) {
    const targetValue = roll.options.target;
    if (targetValue && roll.total >= targetValue) return;
    const secondWind = actorUtils.getItemByIdentifier(actor, 'second-wind');
    if (!secondWind?.system?.uses?.value) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier');
    const classLevels = actor.classes[classIdentifier]?.system?.levels;
    if (!classLevels) return;
    const confirmed = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseRollTotal', {itemName: item.name + ' (1d10 + ' + classLevels + ')', rollTotal: roll.total}));
    if (!confirmed) return;
    const workflow = await workflowUtils.syntheticItemRoll(item, []);
    foundry.utils.setProperty(options, 'chris-premades.tacticalMind', true);
    return await rollUtils.addToRoll(roll, String(workflow.utilityRolls[0].total));
}
async function checkLate({document: item, actor, roll, options}) {
    if (!options?.['chris-premades']?.tacticalMind) return;
    const targetValue = roll.options.target;
    if (targetValue) {
        if (roll.total < targetValue) return;
    } else {
        const confirmed = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.TacticalMind.Confirm'));
        if (!confirmed) return;
    }
    const secondWind = actorUtils.getItemByIdentifier(actor, 'second-wind');
    if (!secondWind) return;
    await documentUtils.update(secondWind, {'system.uses.spent': secondWind.system.uses.spent + 1});
}
const passes = [
    {
        pass: 'actorBonus',
        macro: check,
        priority: 50
    },
    {
        pass: 'actorPost',
        macro: checkLate,
        priority: 50
    }
];
export const tacticalMind = {
    name: 'Tactical Mind',
    version: '2.0.0',
    rules: '2024',
    skill: passes,
    check: passes,
    tool: passes,
    config: {
        classIdentifier: {
            default: 'fighter',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
