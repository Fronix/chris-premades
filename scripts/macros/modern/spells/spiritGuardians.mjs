import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
function turnKey() {
    if (!game.combat?.started) return null;
    return game.combat.round + '-' + game.combat.turn;
}
function allGuardianEffects(disposition) {
    return (canvas?.scene?.tokens ?? [])
        .filter(token => token.disposition === disposition && token.actor)
        .map(token => actorUtils.getEffectByIdentifier(token.actor, 'spirit-guardians-damage'))
        .filter(Boolean);
}
async function damageHelper(affectedTokens, effect, sourceTokenDocument) {
    let targets = affectedTokens
        .map(token => token.document ?? token)
        .filter(token => token.actor && !MidiQOL.checkIncapacitated(token.actor) && token.disposition !== sourceTokenDocument.disposition);
    const turn = turnKey();
    if (turn) {
        const guardianEffects = allGuardianEffects(sourceTokenDocument.disposition);
        targets = targets.filter(token => !guardianEffects.find(guardian => guardian.flags['chris-premades']?.spiritGuardians?.touchedTokenIds?.[turn]?.includes(token.id)));
    }
    if (!targets.length) return;
    const originItem = await fromUuid(effect.origin);
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'spirit-guardians-damage');
    if (!feature) return;
    const damageType = effect.flags['chris-premades']?.spiritGuardians?.damageType ?? 'radiant';
    const activityData = activityUtils.getDamageModifiedActivityData(feature, '', {types: [damageType]});
    const atLevel = effect.flags['chris-premades']?.spiritGuardians?.castLevel;
    await workflowUtils.syntheticActivityDataRoll(activityData, originItem, targets, {atLevel, consumeUsage: false, consumeResources: false, spellSlot: false});
    if (turn) {
        const touched = effect.flags['chris-premades']?.spiritGuardians?.touchedTokenIds?.[turn] ?? [];
        touched.push(...targets.map(token => token.id));
        await documentUtils.update(effect, {['flags.chris-premades.spiritGuardians.touchedTokenIds.' + turn]: touched});
    }
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'spirit-guardians-damage') return;
    if (!workflow.token) return;
    const alignment = (workflow.actor.system.details.alignment ?? '').toLowerCase();
    let damageType;
    if (alignment.includes('evil')) {
        damageType = 'necrotic';
    } else if (alignment.includes('good') || alignment.includes('neutral')) {
        damageType = 'radiant';
    } else {
        damageType = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.SpiritGuardians.Alignment'), [['CHRISPREMADES.Alignment.Good', 'radiant'], ['CHRISPREMADES.Alignment.Evil', 'necrotic']]);
        if (!damageType) damageType = 'radiant';
    }
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'spirit-guardians-damage'
            },
            'chris-premades': {
                spiritGuardians: {
                    damageType,
                    castLevel: getCastLevel(workflow),
                    touchedTokenIds: {}
                }
            }
        }
    };
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'spirit-guardians-damage'};
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'combat', macros: [macroEntry]},
            {type: 'move', macros: [macroEntry]}
        ]
    });
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentration && created?.length) await documentUtils.makeDependent(concentration, created);
    const effect = created?.[0];
    if (!effect) return;
    const nearby = tokenUtils.findNearby(workflow.token.document, 15, {disposition: 'enemy'});
    if (nearby.length) await damageHelper(nearby, effect, workflow.token.document);
}
// Enemy ends its turn within the aura
async function turnEnd({document: effect, token, targetToken}) {
    const casterToken = targetToken ?? actorUtils.getFirstToken(effect.parent);
    if (!casterToken || !token) return;
    await damageHelper([token], effect, casterToken.document ?? casterToken);
}
// Enemy moves within the aura, or the caster moves the aura onto enemies
async function moved({document: effect, token}) {
    const casterToken = actorUtils.getFirstToken(effect.parent);
    if (!casterToken || !token) return;
    const casterDocument = casterToken.document ?? casterToken;
    if (token.actor === effect.parent) {
        const nearby = tokenUtils.findNearby(casterDocument, 15, {disposition: 'enemy'});
        if (nearby.length) await damageHelper(nearby, effect, casterDocument);
    } else {
        await damageHelper([token], effect, casterDocument);
    }
}
export const spiritGuardians = {
    name: 'Spirit Guardians',
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
export const spiritGuardiansDamage = {
    name: 'Spirit Guardians: Damage',
    version: spiritGuardians.version,
    rules: spiritGuardians.rules,
    combat: [
        {
            pass: 'nearbyTurnEnd',
            macro: turnEnd,
            priority: 50,
            distance: 15,
            dispositions: ['enemy']
        }
    ],
    move: [
        {
            pass: 'nearbyMoved',
            macro: moved,
            priority: 50,
            distance: 15,
            dispositions: ['enemy']
        },
        {
            pass: 'actorMoved',
            macro: moved,
            priority: 50
        }
    ]
};
