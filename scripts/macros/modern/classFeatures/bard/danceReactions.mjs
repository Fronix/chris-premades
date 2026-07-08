import {activityUtils, actorUtils, dialogUtils, effectUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function inspiringUse({workflow}) {
    const unarmedStrike = actorUtils.getItemByIdentifier(workflow.actor, 'unarmed-strike') ?? actorUtils.getItemByIdentifier(workflow.actor, 'monk-unarmed-strike');
    const dazzlingFootwork = actorUtils.getItemByIdentifier(workflow.actor, 'dazzling-footwork');
    const wearingArmor = workflow.actor.itemTypes.equipment.some(equipment => equipment.system.equipped && ['heavy', 'medium', 'light', 'shield'].includes(equipment.system.type?.value));
    if (unarmedStrike && dazzlingFootwork && workflow.token && !wearingArmor) {
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
    if (game.combat?.started && workflow.targets.size) {
        for (const token of workflow.targets) await MidiQOL.setReactionUsed(token.actor);
    }
}
async function inspiringAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'bardic-inspiration');
}
export const inspiringMovement = {
    name: 'Inspiring Movement',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: inspiringUse,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: inspiringAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: inspiringAdded,
            priority: 50
        }
    ]
};
async function tandemEarly({workflow}) {
    if (!workflow.token) return;
    const targets = Array.from(workflow.targets).concat(workflow.token);
    game.user.updateTokenTargets(targets.map(token => token.id ?? token.document?.id).filter(Boolean));
    workflow.targets = new Set(targets);
}
async function tandemUse({workflow}) {
    const classIdentifier = 'bard';
    const scale = workflow.actor.system.scale?.[classIdentifier]?.['bardic-inspiration'] ?? workflow.actor.system.scale?.[classIdentifier]?.['inspiration'];
    if (!scale) return;
    const roll = await rollUtils.rollDice(scale.formula, {chatMessage: true});
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const changes = effectData.system?.changes ?? effectData.changes;
    if (changes?.[0]) changes[0].value = roll.total ?? roll.roll?.total;
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }
}
async function tandemAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'bardic-inspiration');
}
export const tandemFootwork = {
    name: 'Tandem Footwork',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: tandemEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: tandemUse,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: tandemAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: tandemAdded,
            priority: 50
        }
    ]
};
