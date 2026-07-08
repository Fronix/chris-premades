import {dialogUtils, documentUtils, queryUtils, workflowUtils} from '../../../../proxy.mjs';
async function damageApplication({document: item, workflow, ditem}) {
    if (ditem.newHP === ditem.oldHP || !ditem.isHit) return;
    if (MidiQOL.hasUsedReaction(item.actor)) return;
    if (documentUtils.getIdentifier(workflow.item) !== 'fall') return;
    const confirmed = await dialogUtils.confirmUseItem(item, {userId: queryUtils.firstOwner(item.actor, true)});
    if (!confirmed) return;
    const targetWorkflow = await workflowUtils.syntheticItemRoll(item, [workflow.targets.first()]);
    const reduction = targetWorkflow?.utilityRolls?.[0]?.total;
    if (!reduction) return;
    workflowUtils.modifyDamageAppliedFlat(ditem, -reduction);
}
export const slowFall = {
    name: 'Slow Fall',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 100
        }
    ]
};
