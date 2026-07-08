import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
function getEnergyScale(item, actor) {
    const subclassIdentifier = automationUtils.getConfigValue(item, 'subclassIdentifier') || 'soulknife';
    return actor.system.scale?.[subclassIdentifier]?.['energy-die'];
}
async function psychicWhispersUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'psychic-whispers') return;
    if (!workflow.activity.consumption.targets.length) {
        await documentUtils.update(workflow.activity, {consumption: {targets: [{type: 'itemUses', value: 1}]}});
    }
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration.seconds = (workflow.utilityRolls?.[0]?.total ?? 1) * 3600;
    const targets = new Set(workflow.targets);
    if (workflow.token) targets.add(workflow.token);
    for (const token of targets) {
        await effectUtils.createEffects(token.actor, [effectData]);
    }
}
async function psychicWhispersRest({document: item}) {
    const activity = item.system.activities.find(a => a.identifier === 'psychic-whispers');
    if (!activity) return;
    await documentUtils.update(activity, {consumption: {targets: []}});
}
async function skillToolCheck({document: item, actor, roll, options}) {
    if (typeof roll.data.prof !== 'string' && typeof roll.data.prof !== 'object') return;
    const targetValue = roll.options.target;
    if (targetValue && roll.total >= targetValue) return;
    const scale = getEnergyScale(item, actor);
    if (!scale) return;
    const activity = item.system.activities.find(a => a.identifier === 'psi-bolstered-knack');
    if (!activity) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseRollTotal', {itemName: activity.name + ' (' + scale.die + ')', rollTotal: roll.total}));
    if (!selection) return;
    await workflowUtils.syntheticActivityRoll(activity, []);
    if (options) foundry.utils.setProperty(options, 'chris-premades.psiBolsteredKnack', true);
    return await rollUtils.addToRoll(roll, '1' + scale.die);
}
async function skillToolCheckLate({document: item, roll, options}) {
    if (!options?.['chris-premades']?.psiBolsteredKnack) return;
    const targetValue = roll.options.target;
    if (targetValue) {
        if (roll.total < targetValue) return;
    } else {
        const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.PsionicPower.Confirm'));
        if (!selection) return;
    }
    await documentUtils.update(item, {'system.uses.spent': item.system.uses.spent + 1});
}
export const psionicPower = {
    name: 'Psionic Power',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: psychicWhispersUse,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: skillToolCheck,
            priority: 50
        },
        {
            pass: 'actorPost',
            macro: skillToolCheckLate,
            priority: 50
        }
    ],
    tool: [
        {
            pass: 'actorBonus',
            macro: skillToolCheck,
            priority: 50
        },
        {
            pass: 'actorPost',
            macro: skillToolCheckLate,
            priority: 50
        }
    ],
    rest: [
        {
            pass: 'actorLong',
            macro: psychicWhispersRest,
            priority: 50
        }
    ],
    config: {
        subclassIdentifier: {
            default: 'soulknife',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'energy-die',
            classIdentifier: 'soulknife',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'energy-die',
                    type: 'dice',
                    distance: {
                        units: ''
                    },
                    scale: {
                        3: {number: 4, faces: 6, modifiers: []},
                        5: {number: 6, faces: 8, modifiers: []},
                        9: {number: 8, faces: 8, modifiers: []},
                        11: {number: 8, faces: 10, modifiers: []},
                        13: {number: 10, faces: 10, modifiers: []},
                        17: {number: 12, faces: 12, modifiers: []}
                    }
                },
                value: {},
                title: 'Energy Die'
            }
        }
    ]
};
async function bladesAttack({workflow}) {
    if (workflow.targets.size !== 1 || workflow.isFumble) return;
    const soulBlades = actorUtils.getItemByIdentifier(workflow.actor, 'soul-blades');
    if (!soulBlades) return;
    const psionicPowerItem = actorUtils.getItemByIdentifier(workflow.actor, 'psionic-power');
    if (!psionicPowerItem?.system?.uses?.value) return;
    if (workflow.targets.first().actor.system.attributes.ac.value <= workflow.attackTotal) return;
    const scale = getEnergyScale(psionicPowerItem, workflow.actor);
    if (!scale) return;
    const activity = soulBlades.system.activities.find(a => a.identifier === 'homing-strikes');
    if (!activity) return;
    const selection = await dialogUtils.confirm(activity.name, _loc('CHRISPREMADES.Dialog.UseAttack', {itemName: activity.name + ' (1' + scale.die + ')', attackTotal: workflow.attackTotal}));
    if (!selection) return;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, '1' + scale.die);
    await workflow.setAttackRoll(newRoll);
    foundry.utils.setProperty(workflow, 'chris-premades.soulBlades.used', true);
    await workflowUtils.syntheticActivityRoll(activity, []);
}
async function bladesRange({workflow}) {
    if (!['ranged', 'bonus-ranged'].includes(documentUtils.getIdentifier(workflow.activity))) return;
    if (!workflow.targets.size || !workflow.token) return;
    if (actorUtils.getItemByIdentifier(workflow.actor, 'sharpshooter')) return;
    const target = workflow.targets.first();
    const distance = tokenUtils.getDistance(workflow.token.document, target.document ?? target);
    if (distance <= 60) return;
    workflow.disadvantage = true;
}
async function bladesEarly({workflow}) {
    if (workflow.actor.system.abilities.str.mod <= workflow.actor.system.abilities.dex.mod) return;
    if (!workflow.activity?.attack) return;
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id].attack.ability = 'str';
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
async function bladesUse({workflow}) {
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'psychic-blades-effect');
    if (!existing) {
        const identifier = documentUtils.getIdentifier(workflow.activity);
        if (['melee', 'ranged'].includes(identifier)) {
            const effectData = {
                name: workflow.item.name,
                img: workflow.item.img,
                type: 'base',
                origin: workflow.item.uuid,
                duration: {turns: 1, seconds: 1},
                flags: {
                    cat: {
                        identifier: 'psychic-blades-effect'
                    }
                }
            };
            await effectUtils.createEffects(workflow.actor, [effectData], {
                rules: '2024',
                unhideActivities: {
                    itemUuid: workflow.item.uuid,
                    activityIdentifiers: ['bonus-melee', 'bonus-ranged']
                }
            });
        }
    }
    if (!workflow['chris-premades']?.soulBlades?.used) return;
    const psionicPowerItem = actorUtils.getItemByIdentifier(workflow.actor, 'psionic-power');
    if (!psionicPowerItem || !workflow.hitTargets.size) return;
    await documentUtils.update(psionicPowerItem, {'system.uses.spent': psionicPowerItem.system.uses.spent + 1});
}
export const psychicBlades = {
    name: 'Psychic Blades',
    version: psionicPower.version,
    rules: psionicPower.rules,
    roll: [
        {
            pass: 'itemAttackRollMissedBonuses',
            macro: bladesAttack,
            priority: 200
        },
        {
            pass: 'itemRollFinished',
            macro: bladesUse,
            priority: 50
        },
        {
            pass: 'itemAttackRollConfig',
            macro: bladesRange,
            priority: 55
        },
        {
            pass: 'itemPreambleComplete',
            macro: bladesEarly,
            priority: 50
        }
    ],
    config: {
        subclassIdentifier: {
            default: 'soulknife',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        }
    }
};
