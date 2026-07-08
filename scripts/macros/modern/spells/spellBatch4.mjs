import {effectUtils} from '../../../proxy.mjs';
function immuneEffectData() {
    return {
        name: _loc('CHRISPREMADES.Generic.Immune'),
        img: 'icons/svg/invisible.svg',
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.min.ability.save.all', type: 'override', value: 100, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
async function armsUse({workflow}) {
    if (!workflow.failedSaves.size) return;
    for (const token of workflow.failedSaves) {
        await MidiQOL.setReactionUsed(token.actor);
    }
}
export const armsOfHadar = {
    name: 'Arms of Hadar',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: armsUse,
            priority: 50
        }
    ]
};
async function friendshipEarly({workflow}) {
    if (!workflow.targets.size) return;
    for (const token of workflow.targets) {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        if (type === 'beast') continue;
        await effectUtils.createEffects(token.actor, [immuneEffectData()]);
    }
}
export const animalFriendship = {
    name: 'Animal Friendship',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: friendshipEarly,
            priority: 50
        }
    ]
};
async function messengerEarly({workflow}) {
    if (!workflow.targets.size) return;
    for (const token of workflow.targets) {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        const cr = token.actor.system.details?.cr ?? token.actor.system.details?.level ?? 0;
        if (type === 'beast' && cr === 0) continue;
        await effectUtils.createEffects(token.actor, [immuneEffectData()]);
    }
}
export const animalMessenger = {
    name: 'Animal Messenger',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: messengerEarly,
            priority: 50
        }
    ]
};
