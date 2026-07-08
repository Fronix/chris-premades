import {actorUtils, automationUtils, dialogUtils, documentUtils, itemUtils, workflowUtils} from '../../../../proxy.mjs';
async function early({document: item, activity, config}) {
    if (config?.midiOptions?.workflowOptions?.['chris-premades']?.createThrall) return;
    if (documentUtils.getIdentifier(activity?.item) !== 'summon-aberration') return;
    if (!await dialogUtils.confirmUseItem(item)) return;
    const itemData = activity.item.toObject();
    const activityData = activity.toObject();
    const duration = {concentration: false, units: 'minute', value: 1};
    itemData.system.duration = duration;
    activityData.duration = duration;
    itemData.system.properties = itemData.system.properties.filter(property => property !== 'concentration');
    itemData.system.activities[activity.id] = activityData;
    const newItem = itemUtils.syntheticItem(itemData, item.actor);
    const newActivity = newItem.system.activities.get(activity.id);
    await workflowUtils.syntheticActivityRoll(newActivity, [], {
        spellSlot: true,
        options: {
            workflowOptions: {
                'chris-premades': {
                    createThrall: true
                }
            }
        }
    });
    await item.displayCard();
    return true;
}
export function addThrallBonuses(summonData, workflow) {
    const feature = actorUtils.getItemByIdentifier(workflow.actor, 'create-thrall');
    if (!feature) return summonData;
    const classIdentifier = automationUtils.getConfigValue(feature, 'classIdentifier') || 'warlock';
    const ability = automationUtils.getConfigValue(feature, 'ability') || 'cha';
    const levels = workflow.actor.classes[classIdentifier]?.system.levels;
    if (!levels) return summonData;
    const mod = workflow.actor.system.abilities[ability]?.mod ?? 0;
    const damageType = automationUtils.getConfigValue(feature, 'damageType') || 'psychic';
    foundry.utils.setProperty(summonData, 'actor.system.attributes.hp.temp', levels + mod);
    foundry.utils.setProperty(summonData, 'actor.effects', [{
        name: feature.name,
        img: feature.img,
        type: 'base',
        system: {
            changes: [
                {key: 'flags.chris-premades.hexBonusDamageType', type: 'override', value: damageType, phase: 'initial', priority: 20},
                {key: 'flags.chris-premades.summonerUuid', type: 'override', value: workflow.actor.uuid, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'thrall-bonus',
                macros: {
                    roll: [{source: 'chris-premades', rules: '2024', identifier: 'thrall-bonus'}]
                }
            }
        }
    }]);
    return summonData;
}
async function hexBonus({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const combat = game.combat;
    if (combat) {
        const stamp = combat.round + '-' + combat.turn;
        if (effect.flags.cat?.thrallHexBonusStamp === stamp) return;
    }
    const summoner = await fromUuid(workflow.actor.flags['chris-premades']?.summonerUuid ?? '');
    if (!summoner) return;
    const hex = actorUtils.getEffectByIdentifier(summoner, 'hex');
    if (!hex) return;
    const validTargetUuids = hex.flags['chris-premades']?.hex?.targets ?? [];
    if (!workflow.hitTargets.find(token => validTargetUuids.includes(token.document.uuid))) return;
    const damageType = workflow.actor.flags['chris-premades']?.hexBonusDamageType ?? 'psychic';
    const formula = hex.flags['chris-premades']?.hex?.formula;
    if (!formula) return;
    if (combat) await documentUtils.update(effect, {'flags.cat.thrallHexBonusStamp': combat.round + '-' + combat.turn});
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
}
export const createThrall = {
    name: 'Create Thrall',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreTargeting',
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
        ability: {
            default: 'cha',
            type: 'select',
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label}))
        },
        damageType: {
            default: 'psychic',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const thrallBonus = {
    name: 'Thrall Hex Bonus',
    version: createThrall.version,
    rules: createThrall.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: hexBonus,
            priority: 250
        }
    ]
};
