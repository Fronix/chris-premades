import {activityUtils, automationUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function thunderwaveUse({workflow}) {
    if (!workflow.failedSaves.size || !workflow.token) return;
    const distance = Number(automationUtils.getConfigValue(workflow.item, 'distance')) || 10;
    for (const token of workflow.failedSaves) {
        await tokenUtils.slideToken(token.document ?? token, {sourceToken: workflow.token.document, distance});
    }
}
export const thunderwave = {
    name: 'Thunderwave',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: thunderwaveUse,
            priority: 50
        }
    ],
    config: {
        distance: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Generic.Distance',
            category: 'tuning'
        }
    }
};
async function vtUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'vampiric-touch') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    const feature = workflow.item.system.activities.find(a => a.identifier === 'vampiric-touch-attack');
    if (!feature) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const healingModifier = Number(automationUtils.getConfigValue(workflow.item, 'healingModifier')) || 0.5;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'vampiric-touch'
            },
            'chris-premades': {
                vampiricTouch: {healingModifier}
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['vampiric-touch-attack'],
            favorite: true
        }
    });
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
    const target = workflow.targets.first();
    if (target && target !== workflow.token) {
        await workflowUtils.syntheticActivityRoll(feature, [target]);
    }
}
async function vtLate({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'vampiric-touch-attack') return;
    if (workflow.hitTargets.size !== 1 || !workflow.token) return;
    const damage = workflow.damageItem?.hpDamage ?? workflow.damageTotal ?? 0;
    if (!damage) return;
    const healingModifier = workflow.item.flags['chris-premades']?.vampiricTouch?.healingModifier ?? (Number(automationUtils.getConfigValue(workflow.item, 'healingModifier')) || 0.5);
    const healing = Math.floor(damage * healingModifier);
    if (healing > 0) await workflowUtils.applyDamage([workflow.token], healing, 'healing');
}
export const vampiricTouch = {
    name: 'Vampiric Touch',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: vtUse,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: vtLate,
            priority: 50
        }
    ],
    config: {
        healingModifier: {
            default: '0.5',
            type: 'text',
            label: 'CHRISPREMADES.Macros.VampiricTouch.HealingModifier',
            category: 'tuning'
        }
    }
};
