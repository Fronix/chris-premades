import {activityUtils, actorUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
async function saveToken(token, region) {
    if (!token?.actor) return;
    if (actorUtils.getEffectByIdentifier(token.actor, 'zone-of-truth-save')) return;
    const originItem = await fromUuid(region.flags['chris-premades']?.zoneOfTruth?.origin ?? '');
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'zone-of-truth-save');
    if (!feature) return;
    const workflow = await workflowUtils.syntheticActivityRoll(feature, [token.object ?? token]);
    if (!workflow?.failedSaves?.size) return;
    const startTime = region.flags['chris-premades'].zoneOfTruth.startTime;
    const duration = region.flags['chris-premades'].zoneOfTruth.durationSeconds ?? 600;
    const remaining = Math.max(1, startTime - game.time.worldTime + duration);
    const effectData = {
        name: originItem.name,
        img: originItem.img,
        type: 'base',
        origin: originItem.uuid,
        duration: {seconds: remaining},
        flags: {
            cat: {
                identifier: 'zone-of-truth-save'
            }
        }
    };
    await effectUtils.createEffects(token.actor, [effectData]);
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'zone-of-truth') return;
    if (!workflow.template) return;
    await documentUtils.update(workflow.template, {
        flags: {
            cat: {
                identifier: 'zone-of-truth',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'zone-of-truth'}]
                }
            },
            'chris-premades': {
                zoneOfTruth: {
                    origin: workflow.item.uuid,
                    startTime: game.time.worldTime,
                    durationSeconds: activityUtils.getEffectDuration(workflow.activity)?.seconds ?? 600
                }
            }
        }
    });
    for (const token of workflow.targets) {
        await saveToken(token.document ?? token, workflow.template);
    }
}
async function moved(trigger) {
    const region = trigger.document;
    const tokens = trigger.tokens ?? [];
    for (const token of tokens) {
        await saveToken(token, region);
    }
}
export const zoneOfTruth = {
    name: 'Zone of Truth',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
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
        }
    ]
};
