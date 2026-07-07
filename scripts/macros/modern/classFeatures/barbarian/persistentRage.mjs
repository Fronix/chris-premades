import {actorUtils, documentUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const rage = actorUtils.getItemByIdentifier(workflow.actor, 'rage');
    if (!rage) return;
    await documentUtils.update(rage, {'system.uses.spent': 0});
}
export const persistentRage = {
    name: 'Persistent Rage',
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
