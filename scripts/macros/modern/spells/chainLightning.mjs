import {activityUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const maxTargets = (getCastLevel(workflow) ?? 6) - 3;
    const feature = workflow.item.system.activities.find(a => a.identifier === 'chain-lightning-leap');
    if (!feature) return;
    for (const targetToken of workflow.targets) {
        const nearbyTokens = tokenUtils.findNearby(targetToken.document ?? targetToken, 30, {disposition: 'ally'});
        if (!nearbyTokens.length) continue;
        let newTargets = nearbyTokens;
        if (nearbyTokens.length > maxTargets) {
            const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.ChainLightning.Select', {maxTargets}), nearbyTokens, {type: 'multiple', maxAmount: maxTargets});
            if (!selection) continue;
            newTargets = selection[0] ?? [];
        }
        if (!newTargets.length) continue;
        const activityData = activityUtils.getDamageModifiedActivityData(feature, String(workflow.damageTotal));
        await workflowUtils.syntheticActivityDataRoll(activityData, workflow.item, newTargets);
    }
}
export const chainLightning = {
    name: 'Chain Lightning',
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
