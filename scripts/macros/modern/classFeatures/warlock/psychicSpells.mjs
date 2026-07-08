import {automationUtils, dialogUtils, itemUtils} from '../../../../proxy.mjs';
async function getDamage(item, workflow) {
    const activityData = workflow.activity.toObject();
    const auto = automationUtils.getConfigValue(item, 'changeDamage');
    if (auto === 'never' || !workflow.activity.hasDamage) return activityData;
    const damageType = automationUtils.getConfigValue(item, 'damageType') || 'psychic';
    if (workflow.defaultDamageType === damageType) return activityData;
    if (auto === 'prompt') {
        const change = ' (' + (CONFIG.DND5E.damageTypes[workflow.defaultDamageType]?.label ?? workflow.defaultDamageType) + ' -> ' + (CONFIG.DND5E.damageTypes[damageType]?.label ?? damageType) + ')';
        if (!await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.AwakenedSpellbook.Select') + change)) return activityData;
    }
    activityData.damage.parts.forEach(part => part.types = [damageType]);
    return activityData;
}
async function early({document: item, workflow}) {
    if (workflow.item?.type !== 'spell' || !workflow.activity) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'warlock';
    if (workflow.item.system.sourceClass !== classIdentifier) return;
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id] = await getDamage(item, workflow);
    const schools = automationUtils.getConfigValue(item, 'spellSchools') ?? ['enc', 'ill'];
    if (schools.includes(workflow.item.system.school)) {
        itemData.system.properties = itemData.system.properties.filter(property => !['vocal', 'somatic'].includes(property));
    }
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const psychicSpells = {
    name: 'Psychic Spells',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreItemRoll',
            macro: early,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'warlock',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        damageType: {
            default: 'psychic',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        changeDamage: {
            default: 'always',
            type: 'select',
            label: 'CHRISPREMADES.Macros.AwakenedSpellbook.Select',
            category: 'behavior',
            options: [
                {label: 'CHRISPREMADES.Generic.Never', value: 'never'},
                {label: 'CHRISPREMADES.Generic.Prompt', value: 'prompt'},
                {label: 'CHRISPREMADES.Generic.Automatic', value: 'always'}
            ]
        },
        spellSchools: {
            default: ['enc', 'ill'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.SpellSchools',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.spellSchools).map(([value, {label}]) => ({value, label}))
        }
    }
};
