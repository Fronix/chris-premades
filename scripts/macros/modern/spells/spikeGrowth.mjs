import {documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'spike-growth-damage') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.template) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    await documentUtils.update(workflow.template, {
        flags: {
            cat: {
                identifier: 'spike-growth',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'spike-growth-spikes'}]
                }
            },
            'chris-premades': {
                spikeGrowth: {origin: workflow.item.uuid}
            }
        }
    });
    if (concentrationEffect) await documentUtils.makeDependent(concentrationEffect, [workflow.template]);
}
async function moved(trigger) {
    const region = trigger.document;
    const tokens = trigger.tokens ?? [];
    const originItem = await fromUuid(region.flags['chris-premades']?.spikeGrowth?.origin ?? '');
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'spike-growth-damage');
    if (!feature) return;
    const targets = tokens.filter(token => token?.actor);
    if (!targets.length) return;
    await workflowUtils.syntheticActivityRoll(feature, targets.map(token => token.object ?? token));
}
export const spikeGrowth = {
    name: 'Spike Growth',
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
export const spikeGrowthSpikes = {
    name: 'Spike Growth: Spikes',
    version: spikeGrowth.version,
    rules: spikeGrowth.rules,
    region: [
        {
            pass: 'entered',
            macro: moved,
            priority: 50
        },
        {
            pass: 'stayed',
            macro: moved,
            priority: 50
        },
        {
            pass: 'passedOver',
            macro: moved,
            priority: 50
        },
        {
            pass: 'exited',
            macro: moved,
            priority: 50
        }
    ]
};
