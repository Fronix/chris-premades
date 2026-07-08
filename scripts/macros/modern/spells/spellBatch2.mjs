import {activityUtils, actorUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {upcastTargets} from '../../lib/spellUtils.mjs';
async function blurUse({workflow}) {
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'blur-effect'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'blur-effect'}]}]
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function blurAttacked({document: effect, workflow}) {
    if (!workflow.targets.size || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    const senses = workflow.token.actor?.system.attributes.senses;
    if (senses?.blindsight) {
        const target = workflow.targets.first();
        const distance = tokenUtils.getDistance(workflow.token.document, target.document ?? target);
        if (distance <= senses.blindsight) return;
    }
    workflow.disadvantage = true;
}
export const blur = {
    name: 'Blur',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: blurUse,
            priority: 50
        }
    ]
};
export const blurEffect = {
    name: blur.name,
    version: blur.version,
    rules: blur.rules,
    roll: [
        {
            pass: 'targetAttackRollConfig',
            macro: blurAttacked,
            priority: 50
        }
    ]
};
async function banishmentUse({workflow}) {
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.failedSaves.size) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const creatureTypes = ['aberration', 'celestial', 'elemental', 'fey', 'fiend'];
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        statuses: ['incapacitated'],
        system: {
            changes: [
                {key: 'flags.midi-qol.superSaver.all', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'system.attributes.ac.bonus', type: 'upgrade', value: 99, phase: 'final', priority: 20},
                {key: 'flags.midi-qol.min.ability.save.all', type: 'custom', value: 99, phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.grants.noCritical.all', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.neverTarget', type: 'custom', value: 1, phase: 'initial', priority: 20},
                {key: 'macro.tokenMagic', type: 'custom', value: 'spectral-body', phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'banishment-banished'
            },
            'chris-premades': {
                banishment: {creatureTypes}
            }
        }
    };
    for (const token of workflow.failedSaves) {
        const created = await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'effect', macros: [{source: 'chris-premades', rules: '2024', identifier: 'banishment-banished'}]}]
        });
        if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
    }
}
async function banishmentEarly({workflow}) {
    await upcastTargets(workflow, 1);
}
async function banishmentRemove({document: effect}) {
    if (effect.duration.remaining !== 0) return;
    const creatureTypes = effect.flags['chris-premades']?.banishment?.creatureTypes;
    if (!creatureTypes?.length) return;
    const type = effect.parent?.system.details?.type?.value ?? effect.parent?.system.details?.race;
    if (!creatureTypes.includes(type)) return;
    const token = actorUtils.getFirstToken(effect.parent);
    if (!token) return;
    await documentUtils.update(token.document ?? token, {hidden: true});
}
export const banishment = {
    name: 'Banishment',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: banishmentUse,
            priority: 50
        },
        {
            pass: 'itemPreambleComplete',
            macro: banishmentEarly,
            priority: 50
        }
    ]
};
export const banishmentBanished = {
    name: 'Banished',
    version: banishment.version,
    rules: banishment.rules,
    effect: [
        {
            pass: 'deleted',
            macro: banishmentRemove,
            priority: 50
        }
    ]
};
