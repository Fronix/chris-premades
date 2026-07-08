import {actorUtils, automationUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.token) return;
    const groupRecovery = actorUtils.getItemByIdentifier(workflow.actor, 'group-recovery');
    if (!groupRecovery?.system?.uses?.value) return;
    const subclassIdentifier = automationUtils.getConfigValue(groupRecovery, 'subclassIdentifier');
    const scale = workflow.actor.system.scale?.[subclassIdentifier]?.['group-recovery'];
    const range = Number(scale?.value ?? scale);
    if (!range) return;
    const nearby = tokenUtils.findNearby(workflow.token.document, range, {disposition: 'ally', includeIncapacitated: true});
    if (!nearby.length) return;
    const confirmed = await dialogUtils.confirmUseItem(groupRecovery);
    if (confirmed) await workflowUtils.syntheticItemRoll(groupRecovery, nearby, {consumeResources: true, consumeUsage: true});
}
export const secondWind = {
    name: 'Second Wind',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'fighter',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'second-wind',
            classIdentifier: 'fighter',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'second-wind',
                    type: 'number',
                    scale: {
                        1: {value: 2},
                        4: {value: 3},
                        10: {value: 4}
                    }
                },
                value: {},
                title: 'Second Wind'
            }
        }
    ]
};
