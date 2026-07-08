import {activityUtils, actorUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
async function castAura(workflow, identifier, auraIdentifier) {
    const effectData = {
        name: _loc('CHRISPREMADES.Auras.Source', {auraName: workflow.item.name}),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'aura', macros: [{source: 'chris-premades', rules: '2024', identifier: auraIdentifier}]}]
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function lifeUse({workflow}) {
    await castAura(workflow, 'aura-of-life', 'aura-of-life-aura');
}
async function lifeCreate(trigger) {
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
                {key: 'system.traits.dr.value', type: 'add', value: 'necrotic', phase: 'final', priority: 50}
            ]
        },
        flags: {
            cat: {
                macros: {
                    combat: [{source: 'chris-premades', rules: '2024', identifier: 'aura-of-life-aura'}]
                }
            }
        }
    };
    return {effectData};
}
async function lifeTurnStart({token}) {
    if (!token?.actor) return;
    if (token.actor.system.attributes.hp.value !== 0) return;
    await workflowUtils.applyDamage([token], 1, 'healing');
}
export const auraOfLife = {
    name: 'Aura of Life',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: lifeUse,
            priority: 50
        }
    ]
};
export const auraOfLifeAura = {
    name: 'Aura of Life: Aura',
    version: auraOfLife.version,
    rules: auraOfLife.rules,
    aura: [
        {
            pass: 'update',
            macro: lifeCreate,
            priority: 50,
            distance: 30,
            dispositions: ['ally']
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: lifeTurnStart,
            priority: 50
        }
    ]
};
async function purityUse({workflow}) {
    await castAura(workflow, 'aura-of-purity', 'aura-of-purity-aura');
}
async function purityCreate(trigger) {
    const {document: effect, token} = trigger;
    if (!token?.actor) return;
    const existing = actorUtils.getEffects(token.actor).find(e => e.flags.cat?.auraEffect && e.origin === effect.uuid);
    if (existing) return;
    const conditionResistances = ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'poisoned', 'stunned'];
    const effectData = {
        name: effect.name.split(':')[0],
        img: effect.img,
        type: 'base',
        duration: {seconds: effect.duration.remaining},
        system: {
            changes: [
                {key: 'system.traits.dr.value', type: 'add', value: 'poison', phase: 'final', priority: 20},
                ...conditionResistances.map(condition => ({key: 'flags.midi-qol.advantage.ability.save.dnd5eCondition.' + condition, type: 'override', value: 1, phase: 'initial', priority: 20}))
            ]
        }
    };
    return {effectData};
}
export const auraOfPurity = {
    name: 'Aura of Purity',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: purityUse,
            priority: 50
        }
    ]
};
export const auraOfPurityAura = {
    name: 'Aura of Purity: Aura',
    version: auraOfPurity.version,
    rules: auraOfPurity.rules,
    aura: [
        {
            pass: 'update',
            macro: purityCreate,
            priority: 50,
            distance: 30,
            dispositions: ['ally']
        }
    ]
};
