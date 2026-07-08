import {activityUtils, actorUtils, dialogUtils, documentUtils, itemUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function telekineticUse({workflow}) {
    if (!workflow.failedSaves.size || !workflow.token) return;
    const targetToken = workflow.targets.first();
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Telekinetic.Select'), [
        ['CHRISPREMADES.Direction.Towards', -5],
        ['CHRISPREMADES.Direction.Away', 5]
    ]);
    if (!selection) return;
    await tokenUtils.slideToken(targetToken.document ?? targetToken, {sourceToken: workflow.token.document, distance: Number(selection)});
}
export const telekineticShove = {
    name: 'Telekinetic: Shove',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: telekineticUse,
            priority: 50
        }
    ]
};
async function unarmedTurnStart({document: item, token}) {
    if (!token?.actor) return;
    const grapplingEffects = actorUtils.getEffects(token.actor).filter(effect => documentUtils.getIdentifier(effect) === 'grappling');
    const potentialTargets = grapplingEffects.map(effect => token.parent?.tokens.get(effect.flags['chris-premades']?.grapple?.tokenId) ?? token.scene?.tokens.get(effect.flags['chris-premades']?.grapple?.tokenId)).filter(Boolean);
    if (!potentialTargets.length) return;
    const feature = item.system.activities.find(a => a.identifier === 'unarmed-fighting-damage');
    if (!feature) return;
    let targetToken;
    if (potentialTargets.length > 1) {
        const selected = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.UnarmedFighting.Select'), potentialTargets);
        if (selected?.length) targetToken = selected[0];
    }
    if (!targetToken) targetToken = potentialTargets[0];
    await workflowUtils.syntheticActivityRoll(feature, [targetToken]);
}
async function unarmedEarly({workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const unarmedIdentifiers = ['unarmed-strike', 'monk-unarmed-strike'];
    const equippedShields = workflow.actor.items.filter(i => i.system.type?.value === 'shield' && i.system.equipped);
    const equippedWeapons = workflow.actor.items.filter(i => i.type === 'weapon' && i.system.equipped && i !== workflow.item && !unarmedIdentifiers.includes(documentUtils.getIdentifier(i)));
    const denomination = (!equippedShields.length && !equippedWeapons.length) ? 8 : 6;
    const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, {number: 1, denomination}, {types: ['bludgeoning']});
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id] = activityData;
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const unarmedFighting = {
    name: 'Fighting Style: Unarmed Fighting',
    version: '2.0.0',
    rules: '2024',
    combat: [
        {
            pass: 'actorTurnStart',
            macro: unarmedTurnStart,
            priority: 50
        }
    ]
};
export const unarmedFightingUnarmedStrike = {
    name: 'Unarmed Strike (Unarmed Fighting)',
    version: unarmedFighting.version,
    rules: unarmedFighting.rules,
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: unarmedEarly,
            priority: 10
        }
    ]
};
