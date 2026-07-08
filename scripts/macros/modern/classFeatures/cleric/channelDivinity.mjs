import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
function tempSaveEffect(name, key, value) {
    return {
        name,
        img: 'icons/svg/upgrade.svg',
        type: 'base',
        duration: {value: 1, units: 'turns'},
        system: {
            changes: [
                {
                    key,
                    type: 'override',
                    value,
                    phase: 'initial',
                    priority: 120
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
async function spark({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'spark') return;
    if (!workflow.actor || !workflow.targets.size) return;
    let disposition = workflow.token?.document?.disposition ?? 1;
    if (disposition === 0) disposition = 1;
    const identifier = workflow.targets.first().document.disposition === disposition ? 'heal' : 'damage';
    const activity = workflow.item.system.activities.find(a => a.identifier === identifier);
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [workflow.targets.first()]);
}
async function turnEarly({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'turn') return;
    if (!workflow.targets.size) return;
    const validTypes = automationUtils.getConfigValue(workflow.item, 'creatureTypes') ?? ['undead'];
    const validTargets = [];
    for (const token of workflow.targets) {
        const type = token.actor.system.details.type?.value ?? token.actor.system.details.race;
        if (!validTypes.includes(type)) continue;
        if (token.actor.flags['chris-premades']?.turnResistance) await effectUtils.createEffects(token.actor, [tempSaveEffect('Turn Advantage', 'flags.midi-qol.advantage.save.wis', 1)]);
        if (token.actor.flags['chris-premades']?.turnImmunity) await effectUtils.createEffects(token.actor, [tempSaveEffect('Turn Immunity', 'flags.midi-qol.min.ability.save.wis', 100)]);
        validTargets.push(token);
    }
    game.user.updateTokenTargets(validTargets.map(token => token.id ?? token.document?.id));
    workflow.targets = new Set(validTargets);
}
async function turnLate({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'turn') return;
    if (!workflow.failedSaves.size) return;
    const sourceTurnEffect = workflow.item.effects.contents?.[0];
    const sourceEffect = workflow.item.effects.contents?.[1];
    if (!sourceTurnEffect || !sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const turnEffectData = sourceTurnEffect.toObject();
    delete turnEffectData._id;
    turnEffectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
    const parent = created?.[0];
    const searUndead = actorUtils.getItemByIdentifier(workflow.actor, 'sear-undead');
    if (searUndead) await workflowUtils.syntheticItemRoll(searUndead, Array.from(workflow.failedSaves));
    for (const token of workflow.failedSaves) {
        const turned = await effectUtils.createEffects(token.actor, [turnEffectData], {rules: '2024'});
        if (parent && turned?.length) await documentUtils.makeDependent(parent, turned);
    }
}
async function damage({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'damage') return;
    const damageTypes = automationUtils.getConfigValue(workflow.item, 'damageTypes') ?? ['radiant', 'necrotic'];
    let selection = await dialogUtils.selectDamageType(damageTypes, workflow.item.name, _loc('CHRISPREMADES.Generic.SelectDamageType'));
    if (!selection) selection = damageTypes[0];
    workflow.damageRolls.forEach(roll => roll.options.type = selection);
    await workflow.setDamageRolls(workflow.damageRolls);
    workflow.defaultDamageType = selection;
}
export const channelDivinity = {
    name: 'Channel Divinity (Cleric)',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: spark,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: turnLate,
            priority: 50
        },
        {
            pass: 'itemPreambleComplete',
            macro: turnEarly,
            priority: 50
        },
        {
            pass: 'itemDamageRollComplete',
            macro: damage,
            priority: 50
        }
    ],
    config: {
        creatureTypes: {
            default: ['undead'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.CreatureTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.creatureTypes).map(([value, {label}]) => ({value, label}))
        },
        damageTypes: {
            default: ['radiant', 'necrotic'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        classIdentifier: {
            default: 'cleric',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'channel-divinity',
            classIdentifier: 'cleric',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'channel-divinity',
                    type: 'number',
                    scale: {
                        2: {value: 2},
                        6: {value: 3},
                        18: {value: 4}
                    }
                },
                value: {},
                title: 'Channel Divinity'
            }
        }
    ]
};
