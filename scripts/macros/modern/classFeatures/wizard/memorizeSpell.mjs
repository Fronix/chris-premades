import {automationUtils, dialogUtils, documentUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const classIdentifier = automationUtils.getConfigValue(workflow.item, 'classIdentifier') || 'wizard';
    const validSpells = workflow.actor.items.filter(item => {
        if (item.type !== 'spell') return false;
        if (item.flags.dnd5e?.cachedFor) return false;
        if (!item.system.level) return false;
        if (item.system.sourceClass !== classIdentifier) return false;
        if (item.system.method !== 'spell') return false;
        return [0, 1].includes(item.system.prepared);
    });
    const unprepared = validSpells.filter(item => item.system.prepared === 0);
    const prepared = validSpells.filter(item => item.system.prepared === 1);
    if (!unprepared.length || !prepared.length) return;
    const spellToPrepare = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.MemorizeSpell.Prepare'), unprepared, {showSpellLevel: true});
    if (!spellToPrepare) return;
    const spellToUnprepare = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.MemorizeSpell.Unprepare'), prepared, {showSpellLevel: true});
    if (!spellToUnprepare) return;
    await documentUtils.update(spellToPrepare, {'system.prepared': 1});
    await documentUtils.update(spellToUnprepare, {'system.prepared': 0});
}
export const memorizeSpell = {
    name: 'Memorize Spell',
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
        classIdentifier: {
            default: 'wizard',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
