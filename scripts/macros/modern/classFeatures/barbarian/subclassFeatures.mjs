import {actorUtils, automationUtils, dialogUtils, documentUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
async function frenzyDamage({document: item, workflow}) {
    if (!item.system.uses.value) return;
    if (!workflow.token || !workflow.hitTargets.size || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token.id) return;
    if (workflow.activity.attack?.ability !== 'str' && workflow.activity.ability !== 'str') return;
    if (!actorUtils.getEffectByIdentifier(workflow.actor, 'reckless-attack-effect')) return;
    if (!actorUtils.getEffectByIdentifier(workflow.actor, 'rage')) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'barbarian';
    const dieNumber = workflow.actor.system.scale?.[classIdentifier]?.['rage-damage']?.formula;
    if (!dieNumber || isNaN(dieNumber)) return;
    const dieSize = automationUtils.getConfigValue(item, 'dieSize') || 'd6';
    await workflowUtils.bonusDamage(workflow, dieNumber + dieSize, {damageType: workflow.defaultDamageType});
    await workflowUtils.completeItemUse(item);
}
export const frenzy = {
    name: 'Frenzy',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: frenzyDamage,
            priority: 250
        }
    ],
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        dieSize: {
            default: 'd6',
            type: 'select',
            label: 'CHRISPREMADES.Config.DiceSize',
            category: 'tuning',
            options: () => ['d4', 'd6', 'd8', 'd10', 'd12'].map(value => ({value, label: value}))
        }
    }
};
async function divineFuryDamage({workflow}) {
    const item = actorUtils.getItemByIdentifier(workflow.actor, 'divine-fury');
    if (!item) return;
    if (!workflow.hitTargets.size || !workflowUtils.isAttackType(workflow, 'weaponAttack') || !item.system.uses.value) return;
    if (!actorUtils.getEffectByIdentifier(workflow.actor, 'rage')) return;
    const damageTypes = automationUtils.getConfigValue(item, 'damageTypes') ?? ['radiant', 'necrotic'];
    if (!damageTypes.length) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'barbarian';
    const classItem = workflow.actor.classes[classIdentifier];
    if (!classItem) return;
    let selection = await dialogUtils.selectDamageType(damageTypes, item.name, _loc('CHRISPREMADES.Generic.SelectDamageType'));
    if (!selection || selection === 'no') selection = damageTypes[0];
    await workflowUtils.bonusDamage(workflow, '1d6 + ' + Math.floor(classItem.system.levels / 2), {damageType: selection});
    if (game.combat?.started) await documentUtils.update(item, {'system.uses.spent': item.system.uses.spent + 1});
}
export const divineFury = {
    name: 'Divine Fury',
    version: '2.0.0',
    rules: '2024',
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        damageTypes: {
            default: ['radiant', 'necrotic'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const divineFuryAttack = {
    name: divineFury.name,
    version: divineFury.version,
    rules: divineFury.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: divineFuryDamage,
            priority: 150
        }
    ]
};
async function fanaticalSave({document: item, actor, config, roll}) {
    if (config?.['chris-premades']?.fanaticalFocus) return;
    if (!item.system.uses.value) return;
    if (!actorUtils.getEffectByIdentifier(actor, 'rage')) return;
    const targetValue = roll.options.target;
    if (!targetValue || roll.total >= targetValue) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.FanaticalFocus.Use', {item: item.name, total: roll.total}));
    if (!selection) return;
    await workflowUtils.completeItemUse(item);
    foundry.utils.setProperty(config, 'chris-premades.fanaticalFocus', true);
    const newSave = await actor.rollSavingThrow(config, undefined, {create: false});
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'barbarian';
    const formula = actor.system.scale?.[classIdentifier]?.['rage-damage']?.formula;
    if (!formula) return newSave[0];
    return await rollUtils.addToRoll(newSave[0], String(formula));
}
export const fanaticalFocus = {
    name: 'Fanatical Focus',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'actorBonus',
            macro: fanaticalSave,
            priority: 100
        }
    ],
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
