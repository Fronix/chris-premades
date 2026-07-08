import {documentUtils, rollUtils} from '../../../../proxy.mjs';
async function tirelessRest({document: item}) {
    const actor = item.actor;
    if (!actor) return;
    const currExhaustion = actor.system.attributes.exhaustion;
    if (!currExhaustion) return;
    await documentUtils.update(actor, {'system.attributes.exhaustion': currExhaustion - 1});
}
export const tireless = {
    name: 'Tireless',
    version: '2.0.0',
    rules: '2024',
    rest: [
        {
            pass: 'actorShort',
            macro: tirelessRest,
            priority: 50
        }
    ]
};
async function relentlessSaveBonus({actor, roll, config}) {
    if (!config?.isConcentration) return;
    if (!actor.concentration?.items?.some(item => documentUtils.getIdentifier(item) === 'hunters-mark')) return;
    const target = config.target ?? roll.options.target;
    if (!target) return;
    const bonus = target - roll.total;
    if (bonus <= 0) return;
    return await rollUtils.addToRoll(roll, bonus);
}
export const relentlessHunter = {
    name: 'Relentless Hunter',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'actorBonus',
            macro: relentlessSaveBonus,
            priority: 50
        }
    ]
};
export const foeSlayer = {
    name: 'Foe Slayer',
    version: '2.0.0',
    rules: '2024',
    config: {
        formula: {
            default: '1d10',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'force',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const favoredEnemy = {
    name: 'Favored Enemy',
    version: '2.0.0',
    rules: '2024',
    config: {
        classIdentifier: {
            default: 'ranger',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'favored-enemy',
            classIdentifier: 'ranger',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'favored-enemy',
                    type: 'number',
                    distance: {
                        units: ''
                    },
                    scale: {
                        1: {value: 2},
                        5: {value: 3},
                        9: {value: 4},
                        13: {value: 5},
                        17: {value: 6}
                    }
                },
                value: {},
                title: 'Favored Enemy'
            }
        }
    ]
};
