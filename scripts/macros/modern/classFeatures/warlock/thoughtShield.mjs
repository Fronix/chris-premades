import {activityUtils, queryUtils, workflowUtils} from '../../../../proxy.mjs';
async function damaged({document: item, workflow, ditem}) {
    if (!ditem.isHit) return;
    const damage = ditem.damageDetail.reduce((total, detail) => total + (detail.type === 'psychic' ? detail.value : 0), 0);
    if (!damage || !workflow.token) return;
    const activity = item.system.activities.find(a => a.identifier === 'damage');
    if (!activity) return;
    const activityData = activityUtils.getDamageModifiedActivityData(activity, damage, {types: ['none']});
    await workflowUtils.syntheticActivityDataRoll(activityData, item, [workflow.token], {userId: queryUtils.firstOwner(item.actor, true)});
}
export const thoughtShield = {
    name: 'Thought Shield',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damaged,
            priority: 200
        }
    ]
};
