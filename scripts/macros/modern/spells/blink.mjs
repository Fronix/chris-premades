import {activityUtils, documentUtils, effectUtils, tokenUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'blink'
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'blink-blinking'}]}]
    });
}
async function turnEnd({document: effect, token}) {
    if (!token) return;
    const blinkRoll = await new Roll('1d6').evaluate();
    await blinkRoll.toMessage({
        rollMode: 'roll',
        speaker: ChatMessage.getSpeaker({token: token.document ?? token}),
        flavor: effect.name
    });
    if (blinkRoll.total < 4) return;
    const effectData = {
        name: _loc('CHRISPREMADES.Macros.Blink.Away'),
        img: effect.img,
        type: 'base',
        origin: effect.uuid,
        duration: {rounds: 2},
        system: {
            changes: [
                {key: 'flags.midi-qol.superSaver.all', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'system.attributes.ac.bonus', type: 'upgrade', value: 99, phase: 'final', priority: 20},
                {key: 'flags.midi-qol.min.ability.save.all', type: 'custom', value: 99, phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.grants.noCritical.all', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.neverTarget', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'macro.tokenMagic', type: 'custom', value: 'spectral-body', phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'blink-blinked-away'
            }
        }
    };
    await effectUtils.createEffects(token.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'blink-blinked-away'}]}]
    });
}
async function turnStart({document: effect, token}) {
    if (!token) return;
    await tokenUtils.teleportToken(token.document ?? token, {range: 10});
    await documentUtils.deleteDocument(effect);
}
export const blink = {
    name: 'Blink',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const blinkBlinking = {
    name: 'Blink: Blinking',
    version: blink.version,
    rules: blink.rules,
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: turnEnd,
            priority: 50
        }
    ]
};
export const blinkBlinkedAway = {
    name: 'Blink: Blinked Away',
    version: blink.version,
    rules: blink.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};
