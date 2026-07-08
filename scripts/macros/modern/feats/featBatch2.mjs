import {actorUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
const unarmedIdentifiers = ['unarmed-strike', 'monk-unarmed-strike'];
async function interceptionHelper(token, targetToken, ditem) {
    const actor = token.actor;
    if (MidiQOL.hasUsedReaction(actor)) return;
    const interceptionItem = actorUtils.getItemByIdentifier(actor, 'interception');
    if (!interceptionItem) return;
    const items = actor.items.filter(i => i.system.equipped && ((i.type === 'weapon' && !unarmedIdentifiers.includes(documentUtils.getIdentifier(i))) || i.system.type?.value === 'shield'));
    if (!items.length) return;
    const userId = queryUtils.firstOwner(actor, true);
    const selection = await dialogUtils.confirm(interceptionItem.name, _loc('CHRISPREMADES.Macros.Interception.Damage', {item: interceptionItem.name, name: targetToken.name}), {userId});
    if (!selection) return;
    const result = await workflowUtils.syntheticItemRoll(interceptionItem, [token], {consumeResources: true, userId});
    const total = result?.damageRolls?.[0]?.total;
    if (!total) return;
    workflowUtils.modifyDamageAppliedFlat(ditem, -total);
    return true;
}
async function interceptionDamage({targetToken, workflow, ditem}) {
    if (!ditem?.isHit) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!targetToken) return;
    const nearbyTokens = tokenUtils.findNearby(targetToken, 5, {disposition: 'ally'});
    for (const token of nearbyTokens) {
        const intercepted = await interceptionHelper(token, targetToken, ditem);
        if (intercepted) break;
    }
}
export const interception = {
    name: 'Interception',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'sceneDamageComplete',
            macro: interceptionDamage,
            priority: 250
        }
    ]
};
async function grapplerEarly({document: item, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflow.targets.size) return;
    const grapplingEffects = actorUtils.getEffects(workflow.actor).filter(effect => documentUtils.getIdentifier(effect) === 'grappling');
    if (!grapplingEffects.length) return;
    if (!grapplingEffects.some(effect => effect.flags['chris-premades']?.grapple?.tokenId === workflow.targets.first()?.id)) return;
    workflow.advantage = true;
}
async function grapplerHit({document: item, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (workflow.hitTargets.size !== 1) return;
    const combat = game.combat;
    if (combat && item.getFlag('cat', 'grapplerStamp') === combat.round + '-' + combat.turn) return;
    const unarmedStrikeItem = workflow.item;
    if (!unarmedIdentifiers.includes(documentUtils.getIdentifier(unarmedStrikeItem))) return;
    const targetToken = workflow.targets.first();
    const selection = await dialogUtils.confirm(unarmedStrikeItem.name, _loc('CHRISPREMADES.Macros.Grappler.Grapple', {tokenName: targetToken.name}));
    if (!selection) return;
    const grappleActivity = unarmedStrikeItem.system.activities.find(a => a.identifier === 'grapple');
    if (!grappleActivity) return;
    if (combat) await item.setFlag('cat', 'grapplerStamp', combat.round + '-' + combat.turn);
    await workflowUtils.syntheticActivityRoll(grappleActivity, [targetToken]);
}
export const grappler = {
    name: 'Grappler',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: grapplerEarly,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: grapplerHit,
            priority: 50
        }
    ]
};
