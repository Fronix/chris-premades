import {actorUtils, dialogUtils, documentUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
export const heightenedFocus = {
    name: 'Heightened Focus',
    version: '2.0.0',
    rules: '2024'
};
async function perfectFocusUse({workflow}) {
    const monksFocus = actorUtils.getItemByIdentifier(workflow.actor, 'monks-focus');
    if (!monksFocus) return;
    if (monksFocus.system.uses.value > 3) return;
    await documentUtils.update(monksFocus, {'system.uses.spent': monksFocus.system.uses.max - 4});
}
export const perfectFocus = {
    name: 'Perfect Focus',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: perfectFocusUse,
            priority: 50
        }
    ]
};
async function survivorSave({document: item, actor, config, roll}) {
    if (config?.['chris-premades']?.disciplinedSurvivor) return;
    if (!item.system.uses.value) return;
    const targetValue = roll.options.target;
    if (!targetValue || roll.total >= targetValue) return;
    const confirmed = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.FanaticalFocus.Use', {item: item.name, total: roll.total}));
    if (!confirmed) return;
    await workflowUtils.completeItemUse(item);
    foundry.utils.setProperty(config, 'chris-premades.disciplinedSurvivor', true);
    return await actor.rollSavingThrow(config, undefined, {create: false})[0];
}
export const disciplinedSurvivor = {
    name: 'Disciplined Survivor',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'actorBonus',
            macro: survivorSave,
            priority: 100
        }
    ]
};
async function superiorDefenseAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'monks-focus');
}
export const superiorDefense = {
    name: 'Superior Defense',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'created',
            macro: superiorDefenseAdded,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: superiorDefenseAdded,
            priority: 55
        }
    ]
};
