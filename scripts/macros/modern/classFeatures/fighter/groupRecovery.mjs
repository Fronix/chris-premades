import {automationUtils} from '../../../../proxy.mjs';
import {capTargets} from '../../../lib/spellUtils.mjs';
async function early({workflow}) {
    if (!workflow.targets.size) return;
    const ability = automationUtils.getConfigValue(workflow.item, 'ability') || 'cha';
    const maxTargets = Math.max(1, workflow.actor.system.abilities[ability]?.mod ?? 1);
    await capTargets(workflow, maxTargets);
}
export const groupRecovery = {
    name: 'Group Recovery',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 50
        }
    ],
    config: {
        subclassIdentifier: {
            default: 'banneret',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        },
        ability: {
            default: 'cha',
            type: 'select',
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label}))
        }
    },
    scales: [
        {
            identifier: 'group-recovery',
            classIdentifier: 'banneret',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'group-recovery',
                    type: 'number',
                    scale: {
                        3: {value: 30},
                        18: {value: 60}
                    }
                },
                value: {},
                title: 'Group Recovery'
            }
        }
    ]
};
