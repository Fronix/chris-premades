import {actorUtils, dialogUtils, documentUtils, summonUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function trip({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'trip') return;
    if (!workflow.failedSaves.size) return;
    for (const token of workflow.failedSaves) {
        await actorUtils.applyConditions(token.actor, ['prone']);
    }
}
async function use({document: item, workflow}) {
    const activities = workflowUtils.getWorkflowProperty(workflow, 'cunningStrikeActivities');
    if (!activities?.length) return;
    const versatileTrickster = actorUtils.getItemByIdentifier(workflow.actor, 'versatile-trickster');
    for (const activityUuid of activities) {
        const activity = await fromUuid(activityUuid);
        if (!activity) break;
        const identifier = documentUtils.getIdentifier(activity);
        const targets = Array.from(workflow.targets);
        if (versatileTrickster && identifier === 'trip' && workflow.token) {
            const mageHand = actorUtils.getItemByIdentifier(workflow.actor, 'mage-hand');
            const summons = mageHand ? summonUtils.getSummonBySource(mageHand) : [];
            const mageHandToken = summons?.[0];
            if (mageHandToken) {
                const nearbyTokens = tokenUtils.findNearby(mageHandToken.document ?? mageHandToken, 5, {disposition: 'all', includeIncapacitated: true}).filter(token => token.document.disposition !== workflow.token.document.disposition && !workflow.targets.has(token));
                if (nearbyTokens.length) {
                    const selection = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: versatileTrickster.name}), nearbyTokens, {skipDeadAndUnconscious: false});
                    if (selection?.length) targets.push(selection[0]);
                }
            }
        }
        await workflowUtils.syntheticActivityRoll(activity, targets);
    }
}
export const cunningStrike = {
    name: 'Cunning Strike',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: trip,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: use,
            priority: 300,
            unique: 'cunningStrikeUse'
        }
    ],
    config: {
        uses: {
            default: 1,
            type: 'text',
            label: 'CHRISPREMADES.Config.SimultaneousUses',
            category: 'tuning'
        }
    }
};
