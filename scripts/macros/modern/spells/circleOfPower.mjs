import {activityUtils, actorUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {key: 'flags.midi-qol.magicResistance.all', type: 'custom', value: '1', phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.semiSuperSaver.all', type: 'custom', value: 'item?.itemType === "spell" || activity?.midiProperties?.magicEffect', phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'circle-of-power'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'aura', macros: [{source: 'chris-premades', rules: '2024', identifier: 'circle-of-power-active'}]}]
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function create(trigger) {
    const {document: effect, token} = trigger;
    if (!token?.actor) return;
    if (effect.parent.uuid === token.actor.uuid) return;
    const existing = actorUtils.getEffects(token.actor).find(e => e.flags.cat?.auraEffect && e.origin === effect.uuid);
    if (existing) return;
    const effectData = {
        name: effect.name,
        img: effect.img,
        type: 'base',
        duration: {seconds: effect.duration.remaining},
        system: {
            changes: effect.toObject().system?.changes ?? effect.toObject().changes ?? []
        }
    };
    return {effectData};
}
export const circleOfPower = {
    name: 'Circle of Power',
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
export const circleOfPowerActive = {
    name: 'Circle of Power: Active',
    version: circleOfPower.version,
    rules: circleOfPower.rules,
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
