import {actorUtils, documentUtils, effectUtils, tokenUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (actorUtils.getItemByIdentifier(workflow.actor, 'infiltration-expertise')) return;
    const sourceEffect = documentUtils.getEffectByIdentifier(workflow.item, 'steady-aim-movement');
    if (!sourceEffect) return;
    await effectUtils.createEffects(workflow.actor, [sourceEffect.toObject()]);
}
async function move({document: item, token}) {
    const combatData = tokenUtils.getCombatData(token);
    if (!combatData.inCombat) return;
    const combat = game.combats.get(combatData.combatId);
    if (combat?.combatant?.tokenId !== token.id) return;
    if (!item.system.uses.value) return;
    await documentUtils.update(item, {'system.uses.spent': item.system.uses.spent + 1});
}
export const steadyAim = {
    name: 'Steady Aim',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityRollFinished',
            macro: use,
            priority: 50
        }
    ],
    move: [
        {
            pass: 'actorMoved',
            macro: move,
            priority: 50
        }
    ]
};
