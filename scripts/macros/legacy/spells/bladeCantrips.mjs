import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
const meleeWeaponTypes = ['simpleM', 'martialM'];
async function attackWithWeapon(workflow, damageType) {
    const weapons = workflow.actor.items.filter(i => i.type === 'weapon' && i.system.equipped && meleeWeaponTypes.includes(i.system.type?.value));
    if (!weapons.length) {
        ui.notifications.warn(_loc('CHRISPREMADES.Macros.GreenFlameBlade.NoWeapons'));
        return;
    }
    let selectedWeapon = weapons[0];
    if (weapons.length > 1) {
        selectedWeapon = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.GreenFlameBlade.SelectWeapon'), weapons);
        if (!selectedWeapon) return;
    }
    const level = workflow.actor.system.details.level ?? Math.floor(workflow.actor.system.details.cr ?? 0);
    const diceNumber = Math.floor((level + 1) / 6);
    const weaponData = selectedWeapon.toObject();
    delete weaponData._id;
    if (diceNumber) {
        for (const [id, activityData] of Object.entries(weaponData.system.activities)) {
            if (activityData.type !== 'attack') continue;
            activityData.damage.parts.push({number: diceNumber, denomination: 8, types: [damageType]});
        }
    }
    const item = itemUtils.syntheticItem(weaponData, workflow.actor);
    const target = workflow.targets.first();
    return await workflowUtils.completeItemUse(item, [target.object ?? target]);
}
async function greenFlameUse({workflow}) {
    if (workflow.targets.size !== 1) return;
    const damageType = automationUtils.getConfigValue(workflow.item, 'damageType') || 'fire';
    const attackWorkflow = await attackWithWeapon(workflow, damageType);
    if (!attackWorkflow?.hitTargets.size) return;
    const primary = workflow.targets.first();
    const nearbyTargets = tokenUtils.findNearby(primary.document ?? primary, 5, {disposition: 'ally'});
    if (!nearbyTargets.length) return;
    let target = nearbyTargets[0];
    if (nearbyTargets.length > 1) {
        const targetSelect = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.GreenFlameBlade.Leap'), nearbyTargets);
        const chosen = Array.isArray(targetSelect?.[0]) ? targetSelect[0][0] : targetSelect?.[0];
        if (!chosen) return;
        target = chosen;
    }
    const feature = workflow.item.system.activities.find(a => a.identifier === 'green-flame-blade-leap');
    if (!feature) return;
    await workflowUtils.syntheticActivityRoll(feature, [target.object ?? target]);
}
export const greenFlameBlade = {
    name: 'Green-Flame Blade',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: greenFlameUse,
            priority: 49
        }
    ],
    config: {
        damageType: {
            default: 'fire',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
async function boomingUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'booming-blade-moved') return;
    if (workflow.targets.size !== 1) return;
    const damageType = automationUtils.getConfigValue(workflow.item, 'damageType') || 'thunder';
    const attackWorkflow = await attackWithWeapon(workflow, damageType);
    if (!attackWorkflow?.hitTargets.size) return;
    const target = workflow.targets.first();
    const existing = actorUtils.getEffectByIdentifier(target.actor, 'booming-blade');
    if (existing) await documentUtils.deleteDocument(existing);
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds: 12},
        flags: {
            cat: {
                identifier: 'booming-blade'
            },
            dae: {
                specialDuration: ['turnStartSource']
            }
        }
    };
    await effectUtils.createEffects(target.actor, [effectData], {
        rules: '2014',
        macros: [{type: 'move', macros: [{source: 'chris-premades', rules: '2014', identifier: 'booming-blade-effect'}]}]
    });
}
async function boomingMoved(trigger) {
    const effect = trigger.document;
    if (trigger.options?.teleport) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.BoomingBlade.WillingMove', {actorName: effect.parent.name}));
    if (!selection) return;
    const originItem = await fromUuid(effect.origin);
    const feature = originItem?.system.activities.find(a => a.identifier === 'booming-blade-moved');
    if (!feature) return;
    const token = actorUtils.getFirstToken(effect.parent);
    if (token) await workflowUtils.syntheticActivityRoll(feature, [token]);
    await documentUtils.deleteDocument(effect);
}
export const boomingBlade = {
    name: 'Booming Blade',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: boomingUse,
            priority: 49
        }
    ],
    config: {
        damageType: {
            default: 'thunder',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const boomingBladeEffect = {
    name: 'Booming Blade: Effect',
    version: boomingBlade.version,
    rules: boomingBlade.rules,
    move: [
        {
            pass: 'actorMoved',
            macro: boomingMoved,
            priority: 50
        }
    ]
};
export const absorbElements = {
    name: 'Absorb Elements',
    version: '2.0.1',
    rules: '2014'
};
export const bladeWard = {
    name: 'Blade Ward',
    version: '2.0.1',
    rules: '2014'
};
