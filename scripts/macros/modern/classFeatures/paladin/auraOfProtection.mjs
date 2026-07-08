import {actorUtils, documentUtils} from '../../../../proxy.mjs';
async function aura(trigger) {
    const bonus = Math.max(1, trigger.document.actor?.system.abilities.cha.mod ?? 1);
    const existing = actorUtils.getEffectByIdentifier(trigger.actor, trigger.identifier + 'Aura');
    if (existing) {
        if (existing.origin === trigger.document.uuid && existing.system.changes[0]?.value === '+' + bonus) return;
        await documentUtils.deleteDocument(existing);
    }
    const effectData = {
        name: trigger.document.name,
        img: trigger.document.img,
        type: 'base',
        system: {
            changes: [
                {
                    key: 'system.bonuses.abilities.save',
                    type: 'add',
                    value: '+' + bonus,
                    phase: 'final',
                    priority: null
                }
            ]
        }
    };
    return {effectData};
}
export const auraOfProtection = {
    name: 'Aura of Protection',
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
