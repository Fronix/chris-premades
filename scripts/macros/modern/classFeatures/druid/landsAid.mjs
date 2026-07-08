import {dialogUtils, documentUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function early({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'lands-aid') return;
    if (!workflow.token) return;
    const friendly = Array.from(workflow.targets).filter(token => token.document.disposition === workflow.token.document.disposition);
    const hostile = Array.from(workflow.targets).filter(token => !friendly.includes(token));
    workflow['chris-premades'] ??= {};
    workflow['chris-premades'].friendlyTargets = friendly;
    game.user.updateTokenTargets(hostile.map(token => token.id ?? token.document?.id));
    workflow.targets = new Set(hostile);
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'lands-aid') return;
    const friendly = workflow['chris-premades']?.friendlyTargets;
    if (!friendly?.length) return;
    let selection;
    if (friendly.length === 1) {
        selection = friendly[0];
    } else {
        const selected = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.LandsAid.Select'), friendly, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        selection = selected[0];
    }
    const feature = workflow.item.system.activities.find(a => a.identifier === 'lands-aid-heal');
    if (!feature) return;
    await workflowUtils.syntheticActivityRoll(feature, [selection]);
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['lands-aid'], 'wild-shape');
}
export const landsAid = {
    name: 'Land\'s Aid',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ],
    scales: [
        {
            identifier: 'lands-aid',
            classIdentifier: 'land',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'lands-aid',
                    type: 'dice',
                    scale: {
                        3: {number: 2, faces: 6, modifiers: []},
                        10: {number: 3, faces: 6, modifiers: []},
                        14: {number: 4, faces: 6, modifiers: []}
                    }
                },
                value: {},
                title: 'Land\'s Aid Damage'
            }
        }
    ],
    config: {
        subclassIdentifier: {
            default: 'land',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        }
    }
};
