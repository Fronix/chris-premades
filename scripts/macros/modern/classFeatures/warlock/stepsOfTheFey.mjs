import {actorUtils, automationUtils, dialogUtils, documentUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function heal({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'refreshing-step') return;
    if (!workflow.token) return;
    const mistyStep = actorUtils.getItemByIdentifier(workflow.actor, 'misty-step');
    if (mistyStep) await workflowUtils.syntheticItemRoll(mistyStep, [workflow.token]);
    const healActivity = workflow.item.system.activities.find(a => a.identifier === 'heal');
    if (!healActivity) return;
    const distance = Number(automationUtils.getConfigValue(workflow.item, 'distance')) || 10;
    const nearby = tokenUtils.findNearby(workflow.token.document, distance, {disposition: 'ally', includeIncapacitated: true, includeToken: true});
    if (!nearby.length) return;
    let selection;
    if (nearby.length === 1) {
        selection = nearby[0];
    } else {
        const selected = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectATarget'), nearby, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        selection = selected[0];
    }
    await workflowUtils.syntheticActivityRoll(healActivity, [selection]);
}
async function taunt({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'taunting-step') return;
    if (!workflow.token) return;
    const mistyStep = actorUtils.getItemByIdentifier(workflow.actor, 'misty-step');
    if (mistyStep) await workflowUtils.syntheticItemRoll(mistyStep, [workflow.token]);
}
export const stepsOfTheFey = {
    name: 'Steps of the Fey',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: heal,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: taunt,
            priority: 50
        }
    ],
    config: {
        distance: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Distance',
            category: 'tuning'
        }
    }
};
