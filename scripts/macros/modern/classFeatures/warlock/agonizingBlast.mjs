import {automationUtils, dialogUtils, documentUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const names = new Set();
    const spells = [];
    for (const item of workflow.actor.itemTypes.spell) {
        if (item.system.level !== 0 || names.has(item.name)) continue;
        spells.push(item);
        names.add(item.name);
    }
    if (!spells.length) return;
    const max = Number(automationUtils.getConfigValue(workflow.item, 'max')) || 1;
    spells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.AgonizingBlast.Select'), spells, {max, checkbox: true});
    if (!selection) return;
    const selected = (Array.isArray(selection) ? selection : [selection]).filter(Boolean);
    await documentUtils.update(workflow.item, {'flags.chris-premades.agonizingBlast.spells': selected.map(spell => spell.name ?? spell.document?.name).filter(Boolean)});
}
async function damage({document: item, workflow}) {
    if (!workflow.damageRolls) return;
    let name = workflow.item.name;
    if (workflow.item.type !== 'spell') {
        const bladeCantrip = workflow.item.flags['chris-premades']?.bladeCantrip;
        if (!bladeCantrip) return;
        name = bladeCantrip;
    }
    const spellNames = item.flags['chris-premades']?.agonizingBlast?.spells;
    if (!spellNames?.includes(name)) return;
    const formula = automationUtils.getConfigValue(item, 'formula') || '@abilities.cha.mod';
    await workflowUtils.bonusDamage(workflow, formula);
}
export const agonizingBlast = {
    name: 'Eldritch Invocations: Agonizing Blast',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 100
        }
    ],
    config: {
        max: {
            default: 1,
            type: 'text',
            label: 'CHRISPREMADES.Config.Max',
            category: 'behavior'
        },
        formula: {
            default: '@abilities.cha.mod',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
