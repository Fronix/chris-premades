import {activityUtils, actorUtils, automationUtils, documentUtils, itemUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
import {unarmedAttackIdentifiers} from '../../../lib/monkUtils.mjs';
async function attack({document: item, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (automationUtils.getConfigValue(item, 'validateWeaponType')) {
        const isNatural = workflow.item.system.type.value === 'natural';
        const isUnarmed = unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item));
        if (!isUnarmed && isNatural) return;
        if (['martialM', 'martialR'].includes(workflow.item.system.type.value) && !workflow.item.system.properties.has('lgt')) return;
    }
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'monk';
    const scale = workflow.actor.system.scale?.[classIdentifier]?.['martial-arts'];
    if (!scale) return;
    const baseMaxDamage = rollUtils.rollDiceSync(workflow.item.system.damage.base.formula, {document: workflow.item, options: {maximize: true}});
    const scaleMaxDamage = rollUtils.rollDiceSync(scale.formula, {options: {maximize: true}});
    const itemData = workflow.item.toObject();
    if (baseMaxDamage.total <= scaleMaxDamage.total) {
        itemData.system.activities[workflow.activity.id] = activityUtils.getDamageModifiedActivityData(workflow.activity, {number: scale.number ?? 1, denomination: scale.faces});
    }
    if (workflowUtils.isAttackType(workflow, 'meleeAttack')) {
        const defaultType = workflow.activity.attack.ability || 'str';
        const abilities = [...(workflow.item.system.availableAbilities ?? []), defaultType, 'dex'];
        itemData.system.activities[workflow.activity.id].attack.ability = actorUtils.getBestAbility(workflow.actor, abilities);
    }
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
async function grappleShove({workflow}) {
    if (!unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item))) return;
    const identifier = documentUtils.getIdentifier(workflow.activity);
    if (!['grapple', 'shove-prone', 'shove-push'].includes(identifier)) return;
    const defaultType = workflow.activity.save.dc.calculation;
    const bestType = actorUtils.getBestAbility(workflow.actor, [defaultType, 'dex']);
    if (bestType === defaultType) return;
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id].save.dc.calculation = bestType;
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const martialArts = {
    name: 'Martial Arts',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: attack,
            priority: 25
        },
        {
            pass: 'actorPreambleComplete',
            macro: grappleShove,
            priority: 26
        }
    ],
    config: {
        validateWeaponType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.MartialArts.ValidateWeaponType',
            category: 'behavior'
        },
        classIdentifier: {
            default: 'monk',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
