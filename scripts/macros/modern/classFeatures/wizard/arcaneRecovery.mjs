import {actorUtils, automationUtils, dialogUtils, documentUtils, rollUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const formula = automationUtils.getConfigValue(workflow.item, 'formula') || 'ceil(@classes.wizard.levels / 2)';
    const grimoires = ['arcane-grimoire-1', 'arcane-grimoire-2', 'arcane-grimoire-3', 'grimoire-infinitus-1', 'grimoire-infinitus-2', 'grimoire-infinitus-3'];
    let bonus = 0;
    for (const identifier of grimoires) {
        const item = actorUtils.getItemByIdentifier(workflow.actor, identifier);
        if (item) bonus += Number(automationUtils.getConfigValue(item, 'bonus')) || 0;
    }
    const totalRoll = await rollUtils.rollDice(formula + ' + ' + bonus, {document: workflow.item});
    let remaining = totalRoll.total;
    const spells = workflow.actor.system.spells;
    const updates = {};
    while (remaining > 0) {
        const buttons = [];
        for (let level = 1; level <= 5 && level <= remaining; level++) {
            const spellData = spells['spell' + level];
            if (!spellData || spellData.max <= 0) continue;
            const pendingValue = updates['system.spells.spell' + level + '.value'] ?? spellData.value;
            if (pendingValue >= spellData.max) continue;
            buttons.push([_loc('CHRISPREMADES.Macros.ArcaneRecovery.Slot', {slot: level}), level]);
        }
        if (!buttons.length) break;
        buttons.push(['CHRISPREMADES.Generic.No', false]);
        const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.ArcaneRecovery.Context', {totalSlots: remaining}), buttons);
        if (!selection) break;
        const level = Number(selection);
        const key = 'system.spells.spell' + level + '.value';
        updates[key] = (updates[key] ?? spells['spell' + level].value) + 1;
        remaining -= level;
    }
    if (Object.keys(updates).length) await documentUtils.update(workflow.actor, updates);
}
export const arcaneRecovery = {
    name: 'Arcane Recovery',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        formula: {
            default: 'ceil(@classes.wizard.levels / 2)',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
