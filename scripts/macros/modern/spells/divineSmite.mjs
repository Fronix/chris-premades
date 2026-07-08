import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
const smiteIdentifiers = ['divine-smite', 'searing-smite', 'thunderous-smite', 'wrathful-smite', 'shining-smite', 'blinding-smite', 'staggering-smite', 'banishing-smite', 'wilting-smite'];
async function hit({workflow}) {
    if (!workflow.hitTargets.size || workflowUtils.getActionType(workflow) !== 'mwak') return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token?.id) return;
    const smiteSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => smiteIdentifiers.includes(documentUtils.getIdentifier(spell))).sort((a, b) => a.system.level - b.system.level);
    // Collapse duplicate copies of the same smite (e.g. an always-prepared grant plus an
    // innate/prepared copy) so the chooser offers each distinct smite once. Prefer a
    // slot-consuming prepared copy over an innate/at-will one when both exist.
    const byIdentifier = new Map();
    for (const spell of smiteSpells) {
        const id = documentUtils.getIdentifier(spell);
        const existing = byIdentifier.get(id);
        if (!existing || (['atwill', 'innate'].includes(existing.system.method) && !['atwill', 'innate'].includes(spell.system.method))) {
            byIdentifier.set(id, spell);
        }
    }
    const spells = Array.from(byIdentifier.values());
    if (!spells.length) return;
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.DivineSmite.Context'), spells, {addNoneDocument: true, showSpellLevel: true});
    if (!selection) return;
    const identifier = documentUtils.getIdentifier(selection);
    const target = workflow.hitTargets.first();
    const spellWorkflow = await workflowUtils.completeItemUse(selection, [target]);
    if (!spellWorkflow) return;
    const damageType = automationUtils.getConfigValue(selection, 'damageType');
    const diceSize = automationUtils.getConfigValue(selection, 'diceSize');
    let diceNumber = Number(automationUtils.getConfigValue(selection, 'baseDiceNumber')) || 0;
    if (identifier === 'divine-smite') {
        const creatureTypes = automationUtils.getConfigValue(selection, 'creatureTypes') ?? [];
        const targetType = target.actor.system.details.type?.value ?? target.actor.system.details.race;
        if (creatureTypes.includes(targetType)) diceNumber += 1;
    } else if (identifier === 'banishing-smite') {
        const effectData = {
            name: selection.name,
            img: selection.img,
            type: 'base',
            origin: selection.uuid,
            duration: {value: 1, units: 'seconds'},
            flags: {
                cat: {
                    identifier: 'banishing-smite-tracker'
                },
                'chris-premades': {
                    banishingSmite: {
                        workflowId: workflow.id
                    }
                }
            }
        };
        await effectUtils.createEffects(workflow.actor, [effectData]);
    }
    const castLevel = spellWorkflow.castData?.castLevel ?? selection.system.level;
    const baseLevel = spellWorkflow.castData?.baseLevel ?? selection.system.level;
    let formula = ((castLevel - baseLevel) + diceNumber) + diceSize;
    if (workflow.actor.system.bonuses.spell?.all?.damage) formula += ' + @bonuses.spell.all.damage';
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
}
async function complete({workflow}) {
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'banishing-smite-tracker');
    if (!effect) return;
    if (effect.flags['chris-premades']?.banishingSmite?.workflowId !== workflow.id) return;
    const item = await fromUuid(effect.origin);
    await documentUtils.deleteDocument(effect);
    if (!item) return;
    const requiredHP = Number(automationUtils.getConfigValue(item, 'hp')) || 50;
    const target = workflow.targets.first();
    if (!target || target.actor.system.attributes.hp.value > requiredHP) return;
    const activity = item.system.activities.find(a => a.identifier === 'banish');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [target]);
}
const smitePasses = [
    {
        pass: 'actorDamageRollComplete',
        macro: hit,
        priority: 200,
        unique: 'divineSmite'
    },
    {
        pass: 'actorRollFinished',
        macro: complete,
        priority: 200,
        unique: 'divineSmiteComplete'
    }
];
const damageTypeConfig = (defaultType) => ({
    default: defaultType,
    type: 'select',
    label: 'CHRISPREMADES.Config.DamageType',
    category: 'tuning',
    options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
});
const diceSizeConfig = (defaultSize) => ({
    default: defaultSize,
    type: 'select',
    label: 'CHRISPREMADES.Config.DiceSize',
    category: 'tuning',
    options: () => ['d4', 'd6', 'd8', 'd10', 'd12'].map(value => ({value, label: value}))
});
const diceNumberConfig = (defaultNumber) => ({
    default: defaultNumber,
    type: 'text',
    label: 'CHRISPREMADES.Config.BaseDiceNumber',
    category: 'tuning'
});
export {smitePasses, damageTypeConfig, diceSizeConfig, diceNumberConfig};
export const divineSmite = {
    name: 'Divine Smite',
    version: '2.0.0',
    rules: '2024',
    roll: smitePasses,
    config: {
        creatureTypes: {
            default: ['undead', 'fiend'],
            type: 'select-many',
            label: 'CHRISPREMADES.Macros.DivineSmite.CreatureTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.creatureTypes).map(([value, {label}]) => ({value, label}))
        },
        damageType: damageTypeConfig('radiant'),
        diceSize: diceSizeConfig('d8'),
        baseDiceNumber: diceNumberConfig(2)
    }
};
