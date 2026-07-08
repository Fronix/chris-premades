import {activityUtils, actorUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
function turnKey() {
    if (!game.combat?.started) return null;
    return game.combat.round + '-' + game.combat.turn;
}
function allShieldEffects(disposition) {
    return (canvas?.scene?.tokens ?? [])
        .filter(token => token.disposition === disposition && token.actor)
        .map(token => actorUtils.getEffectByIdentifier(token.actor, 'cacophonic-shield-source-effect'))
        .filter(Boolean);
}
async function damageHelper(affectedTokens, effect, sourceTokenDocument) {
    let targets = affectedTokens
        .map(token => token.document ?? token)
        .filter(token => token.actor && !MidiQOL.checkIncapacitated(token.actor) && token.disposition !== sourceTokenDocument.disposition);
    const turn = turnKey();
    if (turn) {
        const shieldEffects = allShieldEffects(sourceTokenDocument.disposition);
        targets = targets.filter(token => !shieldEffects.find(shield => shield.flags['chris-premades']?.cacophonicShield?.touchedTokenIds?.[turn]?.includes(token.id)));
    }
    if (!targets.length) return;
    const originItem = await fromUuid(effect.origin);
    if (!originItem) return;
    const activity = originItem.system.activities.find(a => a.identifier === 'cacophonic-shield-damage');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, targets, {consumeUsage: false, consumeResources: false, spellSlot: false});
    if (turn) {
        const touched = effect.flags['chris-premades']?.cacophonicShield?.touchedTokenIds?.[turn] ?? [];
        touched.push(...targets.map(token => token.id));
        await documentUtils.update(effect, {['flags.chris-premades.cacophonicShield.touchedTokenIds.' + turn]: touched});
    }
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'cacophonic-shield-damage') return;
    if (!workflow.token) return;
    const sourceEffect = workflow.activity.effects?.[0]?.effect ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'cacophonic-shield-source-effect');
    foundry.utils.setProperty(effectData, 'flags.chris-premades.cacophonicShield', {
        touchedTokenIds: {},
        castLevel: getCastLevel(workflow)
    });
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'cacophonic-shield-source-effect'};
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'combat', macros: [macroEntry]},
            {type: 'move', macros: [macroEntry]}
        ]
    });
    const effect = created?.[0];
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && effect) await documentUtils.makeDependent(concentrationEffect, [effect]);
    if (!effect) return;
    const nearbyTokens = tokenUtils.findNearby(workflow.token.document, 10, {disposition: 'enemy'});
    await damageHelper(nearbyTokens, effect, workflow.token.document);
}
async function nearbyTurnEnd({document: effect, token}) {
    const sourceToken = actorUtils.getFirstToken(effect.parent);
    if (!sourceToken || !token) return;
    const distance = tokenUtils.getDistance(sourceToken.document ?? sourceToken, token.document ?? token);
    if (distance > 10) return;
    await damageHelper([token], effect, sourceToken.document ?? sourceToken);
}
async function movedNear({document: effect, token}) {
    const sourceToken = actorUtils.getFirstToken(effect.parent);
    if (!sourceToken || !token) return;
    const distance = tokenUtils.getDistance(sourceToken.document ?? sourceToken, token.document ?? token);
    if (distance > 10) return;
    await damageHelper([token], effect, sourceToken.document ?? sourceToken);
}
async function selfMoved({document: effect, token}) {
    const selfToken = token ?? actorUtils.getFirstToken(effect.parent);
    if (!selfToken) return;
    const nearbyTokens = tokenUtils.findNearby(selfToken.document ?? selfToken, 10, {disposition: 'enemy'});
    await damageHelper(nearbyTokens, effect, selfToken.document ?? selfToken);
}
export const cacophonicShield = {
    name: 'Cacophonic Shield',
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
export const cacophonicShieldSourceEffect = {
    name: 'Cacophonic Shield: Effect',
    version: cacophonicShield.version,
    rules: cacophonicShield.rules,
    combat: [
        {
            pass: 'nearbyTurnEnd',
            macro: nearbyTurnEnd,
            priority: 50,
            distance: 15
        }
    ],
    move: [
        {
            pass: 'nearbyMoved',
            macro: movedNear,
            priority: 50,
            distance: 15
        },
        {
            pass: 'actorMoved',
            macro: selfMoved,
            priority: 50
        }
    ]
};
