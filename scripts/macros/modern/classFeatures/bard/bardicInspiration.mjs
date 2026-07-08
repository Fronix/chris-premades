import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function saveCheckSkill({document: effect, roll}) {
    const targetValue = roll.options.target;
    if (targetValue && roll.total >= targetValue) return;
    const formula = effect.flags['chris-premades']?.bardicInspiration?.formula;
    if (!formula) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Dialog.UseRollTotal', {itemName: effect.name + ' (' + formula + ')', rollTotal: roll.total}));
    if (!selection) return;
    await documentUtils.deleteDocument(effect);
    return await rollUtils.addToRoll(roll, formula);
}
async function attack({document: effect, workflow}) {
    if (!workflow.targets.size || workflow.isFumble) return;
    if (workflow.targets.first().actor.system.attributes.ac.value <= workflow.attackTotal) return;
    const formula = effect.flags['chris-premades']?.bardicInspiration?.formula;
    if (!formula) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Dialog.UseAttack', {itemName: effect.name + ' (' + formula + ')', attackTotal: workflow.attackTotal}));
    if (!selection) return;
    await documentUtils.deleteDocument(effect);
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, formula);
    await workflow.setAttackRoll(newRoll);
}
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const classIdentifier = automationUtils.getConfigValue(workflow.item, 'classIdentifier') || 'bard';
    const scale = workflow.actor.system.scale?.[classIdentifier]?.['bardic-inspiration'] ?? workflow.actor.system.scale?.[classIdentifier]?.['inspiration'];
    if (!scale) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const combatInspiration = actorUtils.getItemByIdentifier(workflow.actor, 'combat-inspiration');
    if (combatInspiration) {
        const combatInspirationEffect = combatInspiration.effects.contents?.[0];
        if (combatInspirationEffect) {
            const ciChanges = combatInspirationEffect.toObject().system?.changes ?? combatInspirationEffect.toObject().changes ?? [];
            ciChanges.forEach(change => {
                if (change.key === 'flags.midi-qol.optional.combatinspiration.label') {
                    change.value = combatInspiration.name;
                } else if (change.key !== 'flags.midi-qol.optional.combatinspiration.count') {
                    change.value = scale.formula;
                }
            });
            effectData.system ??= {};
            effectData.system.changes = [...(effectData.system.changes ?? []), ...ciChanges];
        }
        await combatInspiration.displayCard();
    }
    foundry.utils.setProperty(effectData, 'flags.chris-premades.bardicInspiration.formula', scale.formula);
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'bardic-inspiration-effect'};
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [
                {type: 'roll', macros: [macroEntry]},
                {type: 'save', macros: [macroEntry]},
                {type: 'skill', macros: [macroEntry]},
                {type: 'check', macros: [macroEntry]}
            ]
        });
    }
    const dazzlingFootwork = actorUtils.getItemByIdentifier(workflow.actor, 'dazzling-footwork');
    if (dazzlingFootwork && workflow.token) {
        const wearingArmor = workflow.actor.itemTypes.equipment.some(equipment => equipment.system.equipped && ['heavy', 'medium', 'light', 'shield'].includes(equipment.system.type?.value));
        if (!wearingArmor) {
            const unarmedStrike = actorUtils.getItemByIdentifier(workflow.actor, 'unarmed-strike') ?? actorUtils.getItemByIdentifier(workflow.actor, 'monk-unarmed-strike');
            if (unarmedStrike) {
                const nearbyTargets = tokenUtils.findNearby(workflow.token.document, unarmedStrike.system.range.reach ?? 5, {disposition: 'enemy', includeIncapacitated: true});
                if (nearbyTargets.length) {
                    const selection = await dialogUtils.selectTargetDialog(dazzlingFootwork.name, _loc('CHRISPREMADES.Macros.DazzlingFootwork.AgileStrikes'), nearbyTargets, {skipDeadAndUnconscious: false});
                    if (selection?.[0]) {
                        const activity = unarmedStrike.system.activities.find(a => a.identifier === 'punch');
                        if (activity) {
                            const itemData = unarmedStrike.toObject();
                            itemData.system.activities[activity.id].activation.type = 'special';
                            await workflowUtils.syntheticItemRoll(dazzlingFootwork, [workflow.token]);
                            await workflowUtils.syntheticItemDataRoll(itemData, workflow.actor, [selection[0]]);
                        }
                    }
                }
            }
        }
    }
}
export const bardicInspiration = {
    name: 'Bardic Inspiration',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'bard',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'bardic-inspiration',
            classIdentifier: 'bard',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'bardic-inspiration',
                    type: 'dice',
                    scale: {
                        1: {number: 1, faces: 6, modifiers: []},
                        5: {number: 1, faces: 8, modifiers: []},
                        10: {number: 1, faces: 10, modifiers: []},
                        15: {number: 1, faces: 12, modifiers: []}
                    }
                },
                value: {},
                title: 'Bardic Inspiration'
            }
        }
    ]
};
export const bardicInspirationEffect = {
    name: bardicInspiration.name,
    version: bardicInspiration.version,
    rules: bardicInspiration.rules,
    roll: [
        {
            pass: 'actorAttackRollMissedBonuses',
            macro: attack,
            priority: 100
        }
    ],
    save: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 50
        }
    ],
    check: [
        {
            pass: 'actorBonus',
            macro: saveCheckSkill,
            priority: 50
        }
    ]
};
