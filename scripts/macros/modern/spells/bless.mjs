import {activityUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
import {upcastTargets} from '../../lib/spellUtils.mjs';
async function preamble({workflow}) {
    await upcastTargets(workflow, 3);
}
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const sourceEffect = workflow.activity?.effects?.[0]?.effect ?? workflow.item.effects.contents[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    const created = [];
    for (const token of workflow.targets) {
        const effects = await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
        if (effects?.length) created.push(...effects);
    }
    if (concentration && created.length) await documentUtils.makeDependent(concentration, created);
}
export const bless = {
    name: 'Bless',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityPreambleComplete',
            macro: preamble,
            priority: 50
        },
        {
            pass: 'activityRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
