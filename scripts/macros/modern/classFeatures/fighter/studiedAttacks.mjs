import {effectUtils, workflowUtils} from '../../../../proxy.mjs';
async function attack({document: item, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack') || workflow.hitTargets.size || !workflow.targets.size) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.targets.first()]);
    const sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = sourceEffect.uuid;
    effectData.system.changes[0].value = 'workflow.token.id === "' + workflow.token.id + '"';
    await effectUtils.createEffects(workflow.targets.first().actor, [effectData], {rules: '2024'});
}
export const studiedAttacks = {
    name: 'Studied Attacks',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: attack,
            priority: 200
        }
    ]
};
