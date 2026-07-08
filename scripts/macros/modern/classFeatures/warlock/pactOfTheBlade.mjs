import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
const attackBinding = {source: 'chris-premades', rules: '2024', identifier: 'pact-of-the-blade-attack'};
async function bond({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'bond') return;
    const validBaseWeapons = automationUtils.getConfigValue(workflow.item, 'weapons') ?? [];
    const validWeapons = workflow.actor.items.filter(item => item.type === 'weapon' && item.system.properties.has('mgc') && validBaseWeapons.includes(item.system.type.baseItem) && !documentUtils.getEffectByIdentifier(item, 'pact-of-the-blade-bonded-enchantment'));
    if (!validWeapons.length) return;
    validWeapons.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.PactOfTheBlade.SelectBond'), validWeapons);
    if (!selection) return;
    const sourceEffect = workflow.activity.effects?.[0]?.effect ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = sourceEffect.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'pact-of-the-blade-bonded-enchantment');
    foundry.utils.setProperty(effectData, 'flags.cat.macros.roll', [attackBinding]);
    const existing = workflow.actor.items
        .filter(item => item.type === 'weapon')
        .map(item => documentUtils.getEffectByIdentifier(item, 'pact-of-the-blade-bonded-enchantment'))
        .filter(Boolean);
    for (const effect of existing) await documentUtils.deleteDocument(effect);
    await documentUtils.createEmbeddedDocuments(selection, 'ActiveEffect', [effectData]);
}
async function conjure({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'conjure') return;
    const alreadyBonded = workflow.actor.items.find(item => item.type === 'weapon' && documentUtils.getEffectByIdentifier(item, 'pact-of-the-blade-bonded-enchantment'));
    if (alreadyBonded) return;
    const validBaseWeapons = automationUtils.getConfigValue(workflow.item, 'weapons') ?? [];
    const documents = (await Promise.all(validBaseWeapons.map(async name => {
        const uuid = CONFIG.DND5E.weaponIds[name];
        return uuid ? await fromUuid(uuid) : undefined;
    }))).filter(Boolean);
    if (!documents.length) return;
    documents.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.PactOfTheBlade.Conjure'), documents);
    if (!selection) return;
    const sourceEffect = workflow.activity.effects?.[0]?.effect ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const summonedWeaponEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'pact-of-the-blade-summoned-weapon');
    if (summonedWeaponEffect) await documentUtils.deleteDocument(summonedWeaponEffect);
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = sourceEffect.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'pact-of-the-blade-summoned-weapon');
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
    const itemData = selection.toObject();
    delete itemData._id;
    itemData.system.properties.push('mgc');
    itemData.system.equipped = true;
    itemData.system.proficient = 1;
    itemData.name += ' (' + _loc('CHRISPREMADES.Macros.PactOfTheBlade.Name') + ')';
    foundry.utils.setProperty(itemData, 'system.source.rules', '2024');
    foundry.utils.setProperty(itemData, 'flags.cat.macros.roll', [attackBinding]);
    const items = await documentUtils.createEmbeddedDocuments(workflow.actor, 'Item', [itemData]);
    if (created?.[0] && items?.length) await documentUtils.makeDependent(created[0], items);
}
async function early({workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const feature = actorUtils.getItemByIdentifier(workflow.actor, 'eldritch-invocations-pact-of-the-blade');
    if (!feature) return;
    const ability = automationUtils.getConfigValue(feature, 'ability') || 'cha';
    const weaponAbility = workflow.activity.attack.ability || 'str';
    const abilities = [ability, weaponAbility];
    if (workflow.item.system.properties.has('fin')) abilities.push('dex');
    const bestAbility = actorUtils.getBestAbility(workflow.actor, abilities);
    if (bestAbility === weaponAbility) return;
    const activity = workflow.activity.clone({'attack.ability': bestAbility}, {keepId: true});
    activity.prepareData();
    activity.prepareFinalData();
    workflow.activity = activity;
}
async function damage({workflow}) {
    const feature = actorUtils.getItemByIdentifier(workflow.actor, 'eldritch-invocations-pact-of-the-blade');
    if (!feature) return;
    const damageTypes = automationUtils.getConfigValue(feature, 'damageTypes') ?? [];
    if (!damageTypes.length) return;
    let damageType;
    if (damageTypes.length === 1) {
        damageType = damageTypes[0];
    } else {
        damageType = await dialogUtils.selectDamageType(damageTypes, feature.name, _loc('CHRISPREMADES.Macros.PactOfTheBlade.ReplaceDamage'), {addNo: true});
        if (!damageType || damageType === 'no') return;
    }
    workflow.damageRolls.forEach(roll => roll.options.type = damageType);
    await workflow.setDamageRolls(workflow.damageRolls);
}
export const pactOfTheBlade = {
    name: 'Eldritch Invocations: Pact of the Blade',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: bond,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: conjure,
            priority: 50
        }
    ],
    config: {
        weapons: {
            default: ['battleaxe', 'club', 'dagger', 'flail', 'glaive', 'greataxe', 'greatclub', 'greatsword', 'halberd', 'handaxe', 'javelin', 'lance', 'lighthammer', 'longsword', 'mace', 'maul', 'morningstar', 'pike', 'quarterstaff', 'rapier', 'scimitar', 'shortsword', 'sickle', 'spear', 'trident', 'warpick', 'warhammer', 'whip'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.WeaponTypes',
            category: 'behavior',
            options: () => Object.keys(CONFIG.DND5E.weaponIds).map(value => ({value, label: value.charAt(0).toUpperCase() + value.slice(1)}))
        },
        ability: {
            default: 'cha',
            type: 'select',
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label}))
        },
        damageTypes: {
            default: ['necrotic', 'psychic', 'radiant'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const pactOfTheBladeAttack = {
    name: 'Pact of the Blade: Attack',
    version: pactOfTheBlade.version,
    rules: pactOfTheBlade.rules,
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 25
        },
        {
            pass: 'itemDamageRollComplete',
            macro: damage,
            priority: 25
        },
        {
            pass: 'enchantmentPreambleComplete',
            macro: early,
            priority: 25
        },
        {
            pass: 'enchantmentDamageRollComplete',
            macro: damage,
            priority: 25
        }
    ]
};
