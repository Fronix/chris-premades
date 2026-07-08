import {actorUtils, documentUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'poison') return;
    if (!workflow.targets.size) return;
    const poisoned = actorUtils.getEffectByStatusID(workflow.targets.first().actor, 'poisoned');
    if (poisoned) await documentUtils.deleteDocument(poisoned);
}
export const layOnHands = {
    name: 'Lay On Hands',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
