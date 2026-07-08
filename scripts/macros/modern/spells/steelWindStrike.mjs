import {documentUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    if (!workflow.token || !workflow.targets.size) return;
    const activity = workflow.item.system.activities.find(a => a.identifier === 'attack');
    if (!activity) return;
    for (const token of workflow.targets) {
        await workflowUtils.syntheticActivityRoll(activity, [token]);
    }
    await tokenUtils.teleportToken(workflow.token.document, {range: (workflow.activity.range?.value ?? 30) + 5});
}
export const steelWindStrike = {
    name: 'Steel Wind Strike',
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
