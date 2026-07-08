import {actorUtils, automationUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
async function damage({document: item, workflow}) {
    if (!workflow.damageRolls || !workflow.actor || !workflow.item) return;
    if (automationUtils.getConfigValue(item, 'spellOnly')) {
        if (!(workflow.item.type === 'spell' || workflow.item.system.type?.value === 'spellFeature')) return;
    }
    const validTypes = automationUtils.getConfigValue(item, 'damageTypes') ?? [];
    if (!validTypes.length) return;
    const damageRolls = await Promise.all(workflow.damageRolls.map(async roll => {
        if (!validTypes.includes(roll.options.type)) return roll;
        let newFormula = '';
        for (const term of roll.terms) {
            if (term.isDeterministic) {
                newFormula += term.expression;
            } else if (term.expression.toLowerCase().includes('min2')) {
                newFormula += term.formula;
            } else if (term.flavor) {
                newFormula += term.expression + 'min2[' + term.flavor + ']';
            } else {
                newFormula += term.expression + 'min2';
            }
        }
        return await new CONFIG.Dice.DamageRoll(newFormula, workflow.activity.getRollData(), roll.options).evaluate();
    }));
    await workflow.setDamageRolls(damageRolls);
    if (!workflow.targets.size) return;
    const mode = automationUtils.getConfigValue(item, 'mode') ?? 'ignoreResistance';
    if (mode === 'none') return;
    const changes = validTypes.map(type => ({key: 'system.traits.idr.value', type: 'add', value: type, phase: 'final', priority: 20}));
    if (mode === 'ignoreResistanceImmunity') {
        changes.push(...validTypes.map(type => ({key: 'system.traits.idi.value', type: 'add', value: type, phase: 'final', priority: 20})));
    }
    const effectData = {
        name: item.name,
        img: item.img,
        type: 'base',
        origin: item.uuid,
        duration: {value: 1, units: 'seconds'},
        system: {changes},
        flags: {
            cat: {
                identifier: 'elemental-adept-effect'
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData]);
}
async function done({workflow}) {
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'elemental-adept-effect');
    if (effect) await documentUtils.deleteDocument(effect);
}
function makeAdept(name, element) {
    return {
        name,
        version: '2.0.0',
        rules: '2024',
        roll: [
            {
                pass: 'actorDamageRollComplete',
                macro: damage,
                priority: 320
            },
            {
                pass: 'actorRollFinished',
                macro: done,
                priority: 320
            }
        ],
        config: {
            damageTypes: {
                default: [element],
                type: 'select-many',
                label: 'CHRISPREMADES.Config.DamageTypes',
                category: 'tuning',
                options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
            },
            spellOnly: {
                default: true,
                type: 'checkbox',
                label: 'CHRISPREMADES.Macros.Healer.SpellOnly',
                category: 'behavior'
            },
            mode: {
                default: 'ignoreResistance',
                type: 'select',
                label: 'CHRISPREMADES.Macros.ElementalAdept.Mode',
                category: 'behavior',
                options: [
                    {value: 'none', label: 'CHRISPREMADES.Generic.No'},
                    {value: 'ignoreResistance', label: 'CHRISPREMADES.Macros.ElementalAdept.IgnoreResistance'},
                    {value: 'ignoreResistanceImmunity', label: 'CHRISPREMADES.Macros.ElementalAdept.IgnoreResistanceImmunity'}
                ]
            }
        }
    };
}
export const elementalAdeptA = makeAdept('Elemental Adept (Acid)', 'acid');
export const elementalAdeptC = makeAdept('Elemental Adept (Cold)', 'cold');
export const elementalAdeptF = makeAdept('Elemental Adept (Fire)', 'fire');
export const elementalAdeptL = makeAdept('Elemental Adept (Lightning)', 'lightning');
export const elementalAdeptT = makeAdept('Elemental Adept (Thunder)', 'thunder');
