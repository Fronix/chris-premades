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
                identifier: 'crusaders-mantle'
            }
        }
    };
    const effects = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'aura', macros: [{source: 'chris-premades', rules: '2024', identifier: 'crusaders-mantle-aura'}]}]
    });
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentration && effects?.length) await documentUtils.makeDependent(concentration, effects);
}
async function aura(trigger) {
    const existing = actorUtils.getEffectByIdentifier(trigger.actor, trigger.identifier + 'Aura');
    if (existing && existing.origin === trigger.document.uuid) return;
    const effectData = {
        name: trigger.document.name.split(':')[0],
        img: trigger.document.img,
        type: 'base',
        duration: {value: trigger.document.duration.remaining, units: 'seconds'},
        system: {
            changes: [
                {
                    key: 'system.bonuses.mwak.damage',
                    type: 'add',
                    value: '1d4[radiant]',
                    phase: 'final',
                    priority: null
                },
                {
                    key: 'system.bonuses.rwak.damage',
                    type: 'add',
                    value: '1d4[radiant]',
                    phase: 'final',
                    priority: null
                }
            ]
        }
    };
    return {effectData};
}
export const crusadersMantle = {
    name: 'Crusader\'s Mantle',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const crusadersMantleAura = {
    name: 'Crusader\'s Mantle: Aura',
    version: crusadersMantle.version,
    rules: crusadersMantle.rules,
    aura: [
        {
            pass: 'update',
            macro: aura,
            priority: 50,
            distance: 30,
            dispositions: ['ally']
        }
    ]
};
