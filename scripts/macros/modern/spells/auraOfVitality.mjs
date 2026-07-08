import {activityUtils, dialogUtils, documentUtils, effectUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function heal(item, tokenDocument, range, {userId} = {}) {
    const nearby = tokenUtils.findNearby(tokenDocument, range, {disposition: 'ally', includeIncapacitated: true, includeToken: true});
    if (!nearby.length) return;
    let selection;
    if (nearby.length === 1) {
        selection = nearby[0];
    } else {
        const chosen = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.AuraOfVitality.Select'), nearby, {skipDeadAndUnconscious: false, ...(userId ? {userId} : {})});
        if (!chosen?.length) return;
        selection = chosen[0];
    }
    const activity = item.system.activities.find(a => a.identifier === 'aura-of-vitality-healing');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [selection]);
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'aura-of-vitality-healing') return;
    const range = workflow.item.system.target?.template?.size || 30;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'aura-of-vitality-effect'
            },
            'chris-premades': {
                auraOfVitality: {
                    range
                }
            }
        }
    };
    const effects = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'aura-of-vitality-effect'}]}]
    });
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentration && effects?.length) await documentUtils.makeDependent(concentration, effects);
    if (workflow.token) await heal(workflow.item, workflow.token.document, range);
}
async function early({dialog, activity}) {
    if (documentUtils.getIdentifier(activity) !== 'aura-of-vitality-healing') return;
    dialog.configure = false;
}
async function turnStart({document: effect, token}) {
    if (!token) return;
    const item = await fromUuid(effect.origin);
    if (!item) return;
    const range = effect.flags['chris-premades']?.auraOfVitality?.range ?? 30;
    await heal(item, token, range, {userId: queryUtils.firstOwner(token.actor, true)});
}
export const auraOfVitality = {
    name: 'Aura of Vitality',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemPreTargeting',
            macro: early,
            priority: 50
        }
    ]
};
export const auraOfVitalityEffect = {
    name: auraOfVitality.name,
    version: auraOfVitality.version,
    rules: auraOfVitality.rules,
    combat: [
        {
            pass: 'turnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};
