import {actorUtils, automationUtils, dialogUtils, documentUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function pickTarget(workflow) {
    const nearby = tokenUtils.findNearby(workflow.token.document, 5, {disposition: 'enemy', includeIncapacitated: true});
    if (!nearby.length) return;
    if (nearby.length === 1) return nearby[0];
    const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectATarget'), nearby, {skipDeadAndUnconscious: false});
    return selection?.[0];
}
async function flurryOfBlows({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'flurry-of-blows') return;
    if (!automationUtils.getConfigValue(workflow.item, 'promptForTargets')) return;
    if (!workflow.token) return;
    const unarmedStrike = actorUtils.getItemByIdentifier(workflow.actor, 'monk-unarmed-strike') ?? actorUtils.getItemByIdentifier(workflow.actor, 'unarmed-strike');
    if (!unarmedStrike) return;
    let attacks = Number(automationUtils.getConfigValue(workflow.item, 'attacks')) || 2;
    const heightened = actorUtils.getItemByIdentifier(workflow.actor, 'heightened-focus');
    if (heightened) attacks += Number(automationUtils.getConfigValue(heightened, 'attacks')) || 1;
    let target = workflow.targets.first();
    while (attacks) {
        if (!target) {
            target = await pickTarget(workflow);
            if (!target) break;
        }
        await workflowUtils.syntheticItemRoll(unarmedStrike, [target]);
        attacks--;
        target = null;
    }
}
async function patientDefense({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'patient-defense-disengage-dodge') return;
    if (!workflow.token) return;
    const heightened = actorUtils.getItemByIdentifier(workflow.actor, 'heightened-focus');
    if (!heightened) return;
    const activity = heightened.system.activities.find(a => a.identifier === 'patient-defense-heal');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [workflow.token]);
}
export const monksFocus = {
    name: 'Monk\'s Focus',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: flurryOfBlows,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: patientDefense,
            priority: 50
        }
    ],
    config: {
        attacks: {
            default: 2,
            type: 'text',
            label: 'CHRISPREMADES.Config.Attacks',
            category: 'tuning'
        },
        promptForTargets: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Generic.PromptForTargets',
            category: 'behavior'
        }
    }
};
