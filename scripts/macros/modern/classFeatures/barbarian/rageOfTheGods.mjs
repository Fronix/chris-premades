import {actorUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function protectionHelper(token, targetToken, ditem) {
    if (MidiQOL.hasUsedReaction(token.actor)) return;
    const effect = actorUtils.getEffectByIdentifier(token.actor, 'rage-of-the-gods-effect');
    if (!effect) return;
    const item = actorUtils.getItemByIdentifier(token.actor, 'rage-of-the-gods');
    if (!item) return;
    const rageItem = actorUtils.getItemByIdentifier(token.actor, 'rage');
    if (!rageItem?.system?.uses?.value) return;
    const classItem = token.actor.classes.barbarian;
    if (!classItem) return;
    const activity = item.system.activities.find(a => a.identifier === 'revivification');
    if (!activity) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.RageOfTheGods', {item: item.name, token: targetToken.document?.name ?? targetToken.name}), {userId: queryUtils.firstOwner(token.actor, true)});
    if (!selection) return;
    const barbarianLevel = classItem.system.levels;
    ditem.totalDamage = ditem.oldHP - barbarianLevel;
    ditem.newHP = barbarianLevel;
    ditem.newTempHP = 0;
    ditem.hpDamage = ditem.totalDamage;
    ditem.damageDetail.forEach(detail => detail.value = 0);
    ditem.damageDetail[0].value = ditem.totalDamage;
    await documentUtils.update(rageItem, {'system.uses.spent': rageItem.system.uses.spent + 1});
    await workflowUtils.syntheticActivityRoll(activity, [targetToken]);
    return true;
}
async function targetDamageApplication({token, targetToken, ditem}) {
    if (!ditem.isHit || ditem.newHP !== 0 || ditem.oldHP === 0) return;
    const selfToken = token ?? targetToken?.object ?? targetToken;
    if (!selfToken) return;
    await protectionHelper(selfToken, selfToken, ditem);
}
async function damageApplication({targetToken, ditem}) {
    if (!ditem.isHit || ditem.newHP !== 0 || ditem.oldHP === 0) return;
    if (!targetToken) return;
    const nearbyTokens = tokenUtils.findNearby(targetToken, 30, {disposition: 'ally', includeToken: true});
    for (const nearby of nearbyTokens) {
        const saved = await protectionHelper(nearby, targetToken, ditem);
        if (saved) break;
    }
}
export const rageOfTheGods = {
    name: 'Rage of the Gods',
    version: '2.0.0',
    rules: '2024',
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
export const rageOfTheGodsEffect = {
    name: rageOfTheGods.name,
    version: rageOfTheGods.version,
    rules: rageOfTheGods.rules,
    roll: [
        {
            pass: 'sceneDamageComplete',
            macro: damageApplication,
            priority: 250
        },
        {
            pass: 'targetDamageComplete',
            macro: targetDamageApplication,
            priority: 250
        }
    ]
};
