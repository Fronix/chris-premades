import {actorUtils, documentUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'sleet-storm') return;
    if (!workflow.template) return;
    await documentUtils.update(workflow.template, {
        flags: {
            cat: {
                identifier: 'sleet-storm',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'sleet-storm-area'}]
                }
            },
            'chris-premades': {
                sleetStorm: {origin: workflow.item.uuid}
            }
        }
    });
}
async function prone({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'sleet-storm-prone') return;
    if (!workflow.failedSaves.size) return;
    for (const token of workflow.failedSaves) {
        await actorUtils.applyConditions(token.actor, ['prone']);
        const concentrationEffect = token.actor.effects.find(effect => effect.statuses.has('concentrating'));
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
    }
}
async function moved(trigger) {
    const region = trigger.document;
    const tokens = trigger.tokens ?? [];
    const originItem = await fromUuid(region.flags['chris-premades']?.sleetStorm?.origin ?? '');
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'sleet-storm-prone');
    if (!feature) return;
    for (const token of tokens) {
        if (!token?.actor) continue;
        if (token.actor.statuses.has('prone')) continue;
        const combat = game.combat;
        if (combat) {
            const stampKey = 'sleetStormStamp';
            const stamp = combat.round + '-' + combat.turn;
            if (region.flags.cat?.[stampKey + token.id] === stamp) continue;
            await region.setFlag('cat', stampKey + token.id, stamp);
        }
        await workflowUtils.syntheticActivityRoll(feature, [token.object ?? token]);
    }
}
export const sleetStorm = {
    name: 'Sleet Storm',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: prone,
            priority: 50
        }
    ]
};
export const sleetStormArea = {
    name: 'Sleet Storm: Area',
    version: sleetStorm.version,
    rules: sleetStorm.rules,
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
