import {activityUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.advantage.save.wis',
                    type: 'override',
                    value: 1,
                    phase: 'initial',
                    priority: 20
                },
                {
                    key: 'flags.midi-qol.advantage.deathSave',
                    type: 'override',
                    value: 1,
                    phase: 'initial',
                    priority: 20
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'beacon-of-hope'
            }
        }
    };
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    for (const token of workflow.targets) {
        const created = await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'beacon-of-hope-hopeful'}]}]
        });
        if (concentration && created?.length) await documentUtils.makeDependent(concentration, created);
    }
}
async function damageApplication({workflow, ditem}) {
    if (!workflow.targets.size || !workflow.damageRoll) return;
    const healingType = CONFIG.DND5E.healingTypes.healing.label.toLowerCase();
    if (workflow.defaultDamageType !== healingType) return;
    const targetActor = await fromUuid(ditem.actorUuid);
    if (!targetActor || targetActor.system.traits.di.value.has(healingType)) return;
    let newHealingTotal = 0;
    for (const term of workflow.damageRoll.terms) {
        if (term.flavor?.length && term.flavor.toLowerCase() !== healingType) continue;
        if (term.isDeterministic) {
            if (!isNaN(term.total)) newHealingTotal += term.total;
        } else {
            newHealingTotal += term.number * term.faces;
        }
    }
    let appliedHealingTotal = newHealingTotal;
    if (targetActor.system.traits.dr.value.has(healingType)) appliedHealingTotal = Math.floor(appliedHealingTotal / 2);
    if (targetActor.system.traits.dv.value.has(healingType)) appliedHealingTotal = appliedHealingTotal * 2;
    const maxHP = targetActor.system.attributes.hp.max;
    ditem.totalDamage = newHealingTotal;
    ditem.hpDamage = -Math.min(appliedHealingTotal, maxHP - ditem.oldHP);
    ditem.damageDetail[0].value = ditem.hpDamage;
    ditem.newHP = ditem.oldHP - ditem.hpDamage;
}
export const beaconOfHope = {
    name: 'Beacon of Hope',
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
export const beaconOfHopeHopeful = {
    name: 'Beacon of Hope: Hopeful',
    version: beaconOfHope.version,
    rules: beaconOfHope.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 250
        }
    ]
};
