import {actorUtils, automationUtils, dialogUtils, documentUtils, queryUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const buttons = [
        ['CHRISPREMADES.Macros.CircleOfTheLandSpells.Arid', 'land-arid'],
        ['CHRISPREMADES.Macros.CircleOfTheLandSpells.Polar', 'land-polar'],
        ['CHRISPREMADES.Macros.CircleOfTheLandSpells.Temperate', 'land-temperate'],
        ['CHRISPREMADES.Macros.CircleOfTheLandSpells.Tropical', 'land-tropical']
    ];
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.CircleOfTheLandSpells.ChooseLand'), buttons, {userId: queryUtils.firstOwner(workflow.actor, true)});
    if (!selection) return;
    const existing = workflow.actor.itemTypes.spell.filter(spell => spell.getFlag('chris-premades', 'isCircleOfTheLandSpell'));
    if (existing.length) await documentUtils.deleteEmbeddedDocuments(workflow.actor, 'Item', existing.map(spell => spell.id));
    const druidLevel = workflow.actor.classes?.druid?.system.levels ?? 0;
    const maxLevel = druidLevel > 9 ? 5 : druidLevel > 6 ? 4 : druidLevel > 4 ? 3 : 2;
    const identifiers = dnd5e.registry.spellLists.forType('subclass', selection)?.identifiers;
    if (!identifiers) return;
    let newSpells = await Promise.all(Array.from(identifiers).map(identifier => automationUtils.getSourceDocumentByIdentifier(identifier, 'Spell')));
    newSpells = newSpells.filter(spell => spell && spell.system.level <= maxLevel).map(spell => foundry.utils.mergeObject(spell.toObject(), {
        system: {prepared: 2},
        flags: {'chris-premades': {isCircleOfTheLandSpell: true}}
    }));
    if (newSpells.length) await documentUtils.createEmbeddedDocuments(workflow.actor, 'Item', newSpells);
    const naturesWard = actorUtils.getEffectByIdentifier(workflow.actor, 'natures-ward');
    if (!naturesWard) return;
    const newChanges = naturesWard.toObject().system.changes;
    const resistances = {'land-arid': 'fire', 'land-polar': 'cold', 'land-temperate': 'lightning', 'land-tropical': 'poison'};
    if (!newChanges[1]) return;
    newChanges[1].value = resistances[selection];
    await documentUtils.update(naturesWard, {'system.changes': newChanges});
}
export const circleOfTheLandSpells = {
    name: 'Circle of the Land Spells',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
