import {dialogUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    let maxRays = 1 + (getCastLevel(workflow) ?? 2);
    const feature = workflow.item.system.activities.find(a => a.identifier === 'scorching-ray-bolt');
    if (!feature || !workflow.token) return;
    let firstRun = true;
    while (maxRays > 0) {
        let nearbyTargets;
        if (firstRun && workflow.targets.size) {
            nearbyTargets = Array.from(workflow.targets);
            firstRun = false;
        } else {
            nearbyTargets = tokenUtils.findNearby(workflow.token.document, workflow.item.system.range.value || 120, {disposition: 'enemy'});
        }
        if (!nearbyTargets.length) break;
        let selection;
        if (nearbyTargets.length > 1) {
            const selectionArr = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.ScorchingRay.Select', {maxRays}), nearbyTargets, {type: 'selectAmount', maxAmount: maxRays});
            if (!selectionArr) break;
            selection = selectionArr[0];
            if (!selection?.length) break;
        } else {
            selection = [{document: nearbyTargets[0], value: maxRays}];
        }
        for (const entry of selection) {
            const numRays = Number(entry.value ?? entry.amount ?? 0);
            if (isNaN(numRays) || numRays === 0) continue;
            const targetToken = entry.document ?? entry;
            for (let i = 0; i < numRays && maxRays > 0; i++) {
                await workflowUtils.syntheticActivityRoll(feature, [targetToken]);
                maxRays -= 1;
            }
        }
    }
}
export const scorchingRay = {
    name: 'Scorching Ray',
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
