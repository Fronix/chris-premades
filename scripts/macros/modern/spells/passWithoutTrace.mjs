import {activityUtils, actorUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const effectData = {
        name: _loc('CHRISPREMADES.Auras.Source', {auraName: workflow.item.name}),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'pass-without-trace'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'aura', macros: [{source: 'chris-premades', rules: '2024', identifier: 'pass-without-trace-aura'}]}]
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function create(trigger) {
    const {document: effect, token} = trigger;
    if (!token?.actor) return;
    const existing = actorUtils.getEffects(token.actor).find(e => e.flags.cat?.auraEffect && e.origin === effect.uuid);
    if (existing) return;
    const effectData = {
        name: effect.name.split(':')[0],
        img: effect.img,
        type: 'base',
        duration: {seconds: effect.duration.remaining},
        system: {
            changes: [
                {key: 'system.skills.ste.bonuses.check', type: 'add', value: '10', phase: 'final', priority: 20}
            ]
        }
    };
    return {effectData};
}
export const passWithoutTrace = {
    name: 'Pass without Trace',
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
export const passWithoutTraceAura = {
    name: 'Pass without Trace: Aura',
    version: passWithoutTrace.version,
    rules: passWithoutTrace.rules,
    aura: [
        {
            pass: 'update',
            macro: create,
            priority: 50,
            distance: 30,
            dispositions: ['ally']
        }
    ]
};
