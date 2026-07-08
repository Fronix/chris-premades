import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
import {getClassSpells} from '../../../lib/spellUtils.mjs';
async function use({workflow}) {
    const maxLevel = Number(automationUtils.getConfigValue(workflow.item, 'maxLevel')) || 5;
    const classIdentifier = automationUtils.getConfigValue(workflow.item, 'classIdentifier') || 'cleric';
    let spells = (await getClassSpells(classIdentifier, {maxLevel})).filter(spell => spell.system.activation?.type !== 'reaction');
    const greater = actorUtils.getItemByIdentifier(workflow.actor, 'greater-divine-intervention');
    if (greater) {
        const wish = await automationUtils.getSourceDocumentByIdentifier('wish', 'Spell');
        if (wish) spells.push(wish);
    }
    if (!spells.length) return;
    spells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectSpell'), spells, {showSpellLevel: true});
    if (!selection) return;
    if (documentUtils.getIdentifier(selection) === 'wish' && greater) {
        const formula = automationUtils.getConfigValue(greater, 'restFormula') || '2d4';
        const roll = await rollUtils.rollDice(formula, {document: greater});
        await roll.toMessage({speaker: ChatMessage.getSpeaker({actor: workflow.actor}), flavor: greater.name});
        const sourceEffect = greater.effects.contents?.[0];
        if (sourceEffect) {
            const effectData = sourceEffect.toObject();
            delete effectData._id;
            effectData.origin = greater.uuid;
            foundry.utils.setProperty(effectData, 'flags.chris-premades.greaterDivineInterventionRest.value', roll.total);
            await effectUtils.createEffects(workflow.actor, [effectData], {
                rules: '2024',
                macros: [{type: 'rest', macros: [{source: 'chris-premades', rules: '2024', identifier: 'greater-divine-intervention-rest'}]}]
            });
        }
    }
    const itemData = selection.toObject();
    delete itemData._id;
    itemData.system.properties = (itemData.system.properties ?? []).filter(property => property !== 'material');
    itemData.system.materials = {value: '', consumed: false, cost: 0, supply: 0};
    itemData.system.method = 'innate';
    itemData.system.activation = {...(itemData.system.activation ?? {}), type: 'special'};
    await workflowUtils.syntheticItemDataRoll(itemData, workflow.actor, []);
}
export const divineIntervention = {
    name: 'Divine Intervention',
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
            default: 'cleric',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        maxLevel: {
            default: 5,
            type: 'text',
            label: 'CHRISPREMADES.Config.MaxLevel',
            category: 'tuning'
        }
    }
};
