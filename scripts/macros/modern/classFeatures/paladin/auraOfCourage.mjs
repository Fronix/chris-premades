import {actorUtils} from '../../../../proxy.mjs';
async function aura(trigger) {
    const existing = actorUtils.getEffectByIdentifier(trigger.actor, trigger.identifier + 'Aura');
    if (existing && existing.origin === trigger.document.uuid) return;
    const effectData = {
        name: trigger.document.name,
        img: trigger.document.img,
        type: 'base',
        system: {
            changes: [
                {
                    key: 'system.traits.ci.value',
                    type: 'add',
                    value: 'frightened',
                    phase: 'final',
                    priority: null
                }
            ]
        }
    };
    return {effectData};
}
export const auraOfCourage = {
    name: 'Aura of Courage',
    version: '2.0.0',
    rules: '2024',
    aura: [
        {
            pass: 'update',
            macro: aura,
            priority: 50,
            configDistance: 'radius',
            dispositions: ['ally'],
            disabled: ['incapacitated', 'unconscious', 'dead']
        }
    ],
    config: {
        radius: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Radius',
            category: 'tuning'
        }
    }
};
