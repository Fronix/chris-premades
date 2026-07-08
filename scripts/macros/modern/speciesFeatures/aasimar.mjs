import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const identifier = documentUtils.getIdentifier(workflow.activity);
    if (!['heavenly-wings', 'inner-radiance', 'necrotic-shroud'].includes(identifier)) return;
    const sourceEffect = workflow.activity.effects?.[0]?.effect;
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const damageType = identifier === 'necrotic-shroud' ? 'necrotic' : 'radiant';
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'celestial-revelation-effect');
    foundry.utils.setProperty(effectData, 'flags.chris-premades.celestialRevelation', {damageType, form: identifier});
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'celestial-revelation-active'};
    const macros = [{type: 'roll', macros: [macroEntry]}];
    if (identifier === 'inner-radiance') macros.push({type: 'combat', macros: [macroEntry]});
    await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024', macros});
}
async function turnEnd({document: effect}) {
    if (effect.flags['chris-premades']?.celestialRevelation?.form !== 'inner-radiance') return;
    const originItem = await fromUuid(effect.origin);
    const activity = originItem?.system.activities.find(a => a.identifier === 'inner-radiance-damage');
    if (!activity) return;
    const token = actorUtils.getFirstToken(effect.parent);
    if (!token) return;
    const nearby = tokenUtils.findNearby(token.document ?? token, 10, {disposition: 'all', includeIncapacitated: true});
    if (!nearby.length) return;
    await workflowUtils.syntheticActivityRoll(activity, nearby);
}
async function damage({document: effect, workflow}) {
    if (!workflow.targets.size || !(workflow.item.type === 'spell' || workflowUtils.isAttackType(workflow, 'attack'))) return;
    const combat = game.combat;
    if (combat && effect.flags.cat?.celestialRevelationStamp === combat.round + '-' + combat.turn) return;
    const damageType = effect.flags['chris-premades']?.celestialRevelation?.damageType;
    if (!damageType) return;
    if (workflow.targets.size === 1) {
        const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: effect.name}));
        if (!selection) return;
        await workflowUtils.bonusDamage(workflow, String(workflow.actor.system.attributes.prof), {damageType});
    } else {
        const result = await dialogUtils.selectTargetDialog(effect.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: effect.name}), Array.from(workflow.targets), {skipDeadAndUnconscious: false});
        if (!result?.length) return;
        foundry.utils.setProperty(workflow, 'chris-premades.celestialRevelation', {target: result[0].document.uuid, damage: workflow.actor.system.attributes.prof, damageType});
    }
    if (combat) await effect.setFlag('cat', 'celestialRevelationStamp', combat.round + '-' + combat.turn);
}
async function applyDamage({workflow, ditem}) {
    if (!workflow['chris-premades']?.celestialRevelation) return;
    const {target, damage: amount, damageType} = workflow['chris-premades'].celestialRevelation;
    if (target !== ditem.targetUuid || !amount) return;
    workflowUtils.modifyDamageAppliedFlat(ditem, amount, {type: damageType, multiplier: 'auto'});
}
export const celestialRevelation = {
    name: 'Celestial Revelation',
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
export const celestialRevelationActive = {
    name: 'Celestial Revelation: Active',
    version: celestialRevelation.version,
    rules: celestialRevelation.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 50
        },
        {
            pass: 'actorDamage',
            macro: applyDamage,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: turnEnd,
            priority: 50
        }
    ]
};
export const celestialResistance = {
    name: 'Celestial Resistance',
    version: '2.0.0',
    rules: '2024'
};
export const healingHands = {
    name: 'Healing Hands',
    version: '2.0.0',
    rules: '2024'
};
