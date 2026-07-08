import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function vitalityTurnStart({document: effect}) {
    const token = actorUtils.getFirstToken(effect.parent);
    if (!token) return;
    const range = effect.flags['chris-premades']?.vitalityOfTheTree?.range ?? 10;
    const nearbyAllies = tokenUtils.findNearby(token.document ?? token, range, {disposition: 'ally', includeIncapacitated: true});
    if (!nearbyAllies.length) return;
    const feature = actorUtils.getItemByIdentifier(effect.parent, 'vitality-of-the-tree');
    if (!feature) return;
    const activity = feature.system.activities.find(a => a.identifier === 'life-giving-force');
    if (!activity) return;
    let selection;
    if (nearbyAllies.length === 1) {
        selection = nearbyAllies[0];
    } else {
        const targetSelection = await dialogUtils.selectTargetDialog(feature.name, _loc('CHRISPREMADES.Macros.VitalityOfTheTree'), nearbyAllies, {skipDeadAndUnconscious: false, userId: queryUtils.firstOwner(effect.parent, true)});
        if (!targetSelection?.length) return;
        selection = targetSelection[0];
    }
    await workflowUtils.syntheticActivityRoll(activity, [selection]);
}
export const vitalityOfTheTree = {
    name: 'Vitality of the Tree',
    version: '2.0.0',
    rules: '2024',
    config: {
        range: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
export const lifeGivingForce = {
    name: 'Life-Giving Force',
    version: vitalityOfTheTree.version,
    rules: vitalityOfTheTree.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: vitalityTurnStart,
            priority: 50
        }
    ]
};
async function requireRage({workflow}) {
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'rage');
    if (effect) return;
    ui.notifications.info(_loc('CHRISPREMADES.Macros.BranchesOfTheTree.Rage'));
    workflow.aborted = true;
}
async function branchesUse({workflow}) {
    if (!workflow.failedSaves.size || !workflow.token) return;
    const range = Number(automationUtils.getConfigValue(workflow.item, 'range')) || 5;
    const target = workflow.failedSaves.first();
    await tokenUtils.teleportToken(target.document ?? target, {range, origin: workflow.token.document});
    if (workflow.token.document.disposition === target.document.disposition) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = {rounds: 1};
    await effectUtils.createEffects(target.actor, [effectData]);
}
export const branchesOfTheTree = {
    name: 'Branches of the Tree',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: requireRage,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: branchesUse,
            priority: 50
        }
    ],
    config: {
        range: {
            default: 5,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
async function travelSingle({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'single') return;
    if (!workflow.token) return;
    await tokenUtils.teleportToken(workflow.token.document, {range: workflow.activity.range.value});
}
async function travelGroup({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'group') return;
    if (!workflow.token) return;
    const targets = [workflow.token];
    if (workflow.targets.size) {
        const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.TravelAlongTheTree.WillingCreatures'), Array.from(workflow.targets), {type: 'multiple', skipDeadAndUnconscious: false, maxAmount: 6});
        if (selection?.[0]) targets.push(...selection[0]);
    }
    for (const target of targets) {
        await tokenUtils.teleportToken(target.document ?? target, {range: workflow.activity.range.value});
    }
}
export const travelAlongTheTree = {
    name: 'Travel along the Tree',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: requireRage,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: travelSingle,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: travelGroup,
            priority: 50
        }
    ]
};
async function rootsTurnStart({document: item}) {
    if (!actorUtils.getEffectByIdentifier(item.actor, 'rage')) return;
    const weaponProperties = automationUtils.getConfigValue(item, 'weaponProperties') ?? ['hvy', 'ver'];
    if (!weaponProperties.length) return;
    const range = Number(automationUtils.getConfigValue(item, 'range')) || 10;
    const validWeapons = item.actor.items.filter(i => i.type === 'weapon' && Array.from(i.system.properties ?? []).some(property => weaponProperties.includes(property)));
    for (const weapon of validWeapons) {
        const effectData = {
            name: item.name,
            img: item.img,
            type: 'enchantment',
            origin: item.uuid,
            duration: {turns: 1},
            system: {
                changes: [
                    {key: 'system.range.reach', type: 'override', value: (weapon.system.range.reach || 5) + range, phase: 'final', priority: 20}
                ]
            },
            flags: {
                cat: {
                    identifier: 'battering-roots-enchantment'
                }
            }
        };
        await documentUtils.createEmbeddedDocuments(weapon, 'ActiveEffect', [effectData]);
    }
}
async function rootsAttack({document: item, workflow}) {
    if (!workflow.hitTargets.size || !workflow.item) return;
    if (!actorUtils.getEffectByIdentifier(workflow.actor, 'rage')) return;
    const weaponProperties = automationUtils.getConfigValue(item, 'weaponProperties') ?? ['hvy', 'ver'];
    if (!Array.from(workflow.item.system.properties ?? []).some(property => weaponProperties.includes(property))) return;
    const attackMastery = workflow.attackRoll?.options?.mastery;
    let selection;
    if (attackMastery !== 'push' && attackMastery !== 'topple') {
        selection = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Macros.BatteringRoots.Mastery'), [['CHRISPREMADES.Mastery.Push.Name', 'push'], ['CHRISPREMADES.Mastery.Topple.Name', 'topple'], ['CHRISPREMADES.Generic.No', false]]);
        if (!selection) return;
    } else if (attackMastery === 'push') {
        selection = 'topple';
    } else {
        selection = 'push';
    }
    const target = workflow.hitTargets.first();
    if (selection === 'push') {
        const sizeIndex = Object.keys(CONFIG.DND5E.actorSizes).indexOf(target.actor.system.traits.size);
        if (sizeIndex > 3) return;
        await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token.document, distance: 10});
    } else {
        const abilities = workflow.actor.system.abilities;
        const dc = 8 + workflow.actor.system.attributes.prof + Math.max(abilities.str.mod, abilities.dex.mod);
        const save = await target.actor.rollSavingThrow({ability: 'con', target: dc}, undefined, {create: true});
        const total = save?.[0]?.total;
        if (total !== undefined && total < dc) await actorUtils.applyConditions(target.actor, ['prone']);
    }
}
export const batteringRoots = {
    name: 'Battering Roots',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: rootsAttack,
            priority: 250
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: rootsTurnStart,
            priority: 50
        }
    ],
    config: {
        weaponProperties: {
            default: ['hvy', 'ver'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.WeaponProperties',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.itemProperties).map(([value, {label}]) => ({value, label}))
        },
        range: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
