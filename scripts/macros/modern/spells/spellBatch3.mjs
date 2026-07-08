import {activityUtils, dialogUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
function autoFailEffectData(origin) {
    return {
        name: _loc('CHRISPREMADES.Generic.AutoFail'),
        img: 'icons/svg/downgrade.svg',
        type: 'base',
        origin,
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.fail.ability.save.all', type: 'override', value: 1, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
function immuneEffectData() {
    return {
        name: _loc('CHRISPREMADES.Generic.Immune'),
        img: 'icons/svg/invisible.svg',
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.min.ability.save.all', type: 'override', value: 100, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
async function blightEarly({workflow}) {
    if (!workflow.targets.size) return;
    for (const token of workflow.targets) {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        if (type === 'plant') await effectUtils.createEffects(token.actor, [autoFailEffectData(workflow.item.uuid)]);
    }
}
export const blight = {
    name: 'Blight',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: blightEarly,
            priority: 50
        }
    ]
};
async function calmEarly({workflow}) {
    if (!workflow.targets.size) return;
    for (const token of workflow.targets) {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        if (type !== 'humanoid') await effectUtils.createEffects(token.actor, [immuneEffectData()]);
    }
}
async function calmUse({workflow}) {
    if (!workflow.failedSaves.size) return;
    const ciEffectData = workflow.item.effects.contents[0]?.toObject();
    const iEffectData = workflow.item.effects.contents[1]?.toObject();
    if (!ciEffectData || !iEffectData) return;
    for (const data of [ciEffectData, iEffectData]) {
        delete data._id;
        data.origin = workflow.item.uuid;
        data.duration = activityUtils.getEffectDuration(workflow.activity);
    }
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    for (const token of workflow.failedSaves) {
        const selection = await dialogUtils.buttonDialog(workflow.item.name, token.name + ': ' + _loc('CHRISPREMADES.Generic.SelectTargetEffect'), [
            ['CHRISPREMADES.Macros.CalmEmotions.ConditionImmunity', 'ci'],
            ['CHRISPREMADES.Macros.CalmEmotions.Indifference', 'indifference'],
            ['CHRISPREMADES.Generic.No', false]
        ]);
        if (!selection) continue;
        const created = await effectUtils.createEffects(token.actor, [selection === 'ci' ? ciEffectData : iEffectData], {rules: '2024'});
        if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
    }
}
export const calmEmotions = {
    name: 'Calm Emotions',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: calmEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: calmUse,
            priority: 50
        }
    ]
};
