import {actorUtils, automationUtils, documentUtils, rollUtils, workflowUtils} from '../../../proxy.mjs';
const rangedWeaponTypes = ['simpleR', 'martialR'];
const meleeWeaponTypes = ['simpleM', 'martialM'];
const armorTypes = ['light', 'medium', 'heavy'];
async function alertUse({workflow}) {
    if (!game.combat || game.combat.started || workflow.targets.size !== 1 || !workflow.token) return;
    if (workflow.token.document.disposition !== workflow.targets.first().document.disposition) return;
    const tokenCombatant = game.combat.getCombatantByToken(workflow.token.id);
    const targetCombatant = game.combat.getCombatantByToken(workflow.targets.first().id);
    if (tokenCombatant?.initiative == null || targetCombatant?.initiative == null) return;
    const tokenInitiative = tokenCombatant.initiative;
    await tokenCombatant.update({initiative: targetCombatant.initiative});
    await targetCombatant.update({initiative: tokenInitiative});
}
export const alert = {
    name: 'Alert',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: alertUse,
            priority: 50
        }
    ]
};
async function archeryAttack({document: item, workflow}) {
    if (!workflow.targets.size || !rangedWeaponTypes.includes(workflow.item.system.type?.value)) return;
    const bonus = automationUtils.getConfigValue(item, 'bonus') || '2';
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, bonus);
    await workflow.setAttackRoll(newRoll);
}
export const archery = {
    name: 'Archery',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollBonuses',
            macro: archeryAttack,
            priority: 200
        }
    ],
    config: {
        bonus: {
            default: '2',
            type: 'text',
            label: 'CHRISPREMADES.Config.AttackBonus',
            category: 'tuning'
        }
    }
};
async function duelingDamage({document: item, workflow}) {
    if (!workflow.hitTargets.size || workflow.attackMode === 'twoHanded' || !meleeWeaponTypes.includes(workflow.item.system.type?.value)) return;
    const unarmedIdentifiers = ['unarmed-strike', 'monk-unarmed-strike'];
    const weapons = workflow.actor.items.filter(i => i.system.equipped && i.type === 'weapon' && !unarmedIdentifiers.includes(documentUtils.getIdentifier(i)));
    if (weapons.length > 1) return;
    const bonus = automationUtils.getConfigValue(item, 'formula') || '2';
    await workflowUtils.bonusDamage(workflow, bonus);
}
export const dueling = {
    name: 'Dueling',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: duelingDamage,
            priority: 200
        }
    ],
    config: {
        formula: {
            default: '2',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
async function defenseChange({item}) {
    if (item.type !== 'equipment' || !item.actor) return;
    const effect = actorUtils.getEffectByIdentifier(item.actor, 'defense');
    if (!effect) return;
    const armor = armorTypes.includes(item.actor.system.attributes.ac.equippedArmor?.system?.type?.value);
    if (armor && effect.disabled) await documentUtils.update(effect, {disabled: false});
    if (!armor && !effect.disabled) await documentUtils.update(effect, {disabled: true});
}
export const defense = {
    name: 'Defense',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'actorEquipped',
            macro: defenseChange,
            priority: 50
        },
        {
            pass: 'actorUnequipped',
            macro: defenseChange,
            priority: 50
        }
    ]
};
export const heavyArmorMaster = {
    name: 'Heavy Armor Master',
    version: '2.0.0',
    rules: '2024'
};
export const sharpshooter = {
    name: 'Sharpshooter',
    version: '2.0.0',
    rules: '2024'
};
export const speedy = {
    name: 'Speedy',
    version: '2.0.0',
    rules: '2024'
};
async function gwfDamage({workflow}) {
    if (!workflow.damageRolls || !workflow.actor || workflow.attackMode !== 'twoHanded' || !meleeWeaponTypes.includes(workflow.item?.system?.type?.value)) return;
    const requiredProperties = new Set(['ver', 'two']);
    if (!workflow.item.system.properties.intersection(requiredProperties).size) return;
    const damageRolls = await Promise.all(workflow.damageRolls.map(async roll => {
        let newFormula = '';
        for (const term of roll.terms) {
            if (term.isDeterministic) {
                newFormula += term.expression;
            } else if (term.expression.toLowerCase().includes('min3')) {
                newFormula += term.formula;
            } else if (term.flavor) {
                newFormula += term.expression + 'min3[' + term.flavor + ']';
            } else {
                newFormula += term.expression + 'min3';
            }
        }
        return await new CONFIG.Dice.DamageRoll(newFormula, workflow.activity.getRollData(), roll.options).evaluate();
    }));
    await workflow.setDamageRolls(damageRolls);
}
export const greatWeaponFighting = {
    name: 'Great Weapon Fighting',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: gwfDamage,
            priority: 320
        }
    ]
};
async function twfDamage({document: item, workflow}) {
    if (!workflow.hitTargets.size || !workflowUtils.isAttackType(workflow, 'rangedAttack') || !workflow.item.system.properties?.has('thr')) return;
    const bonus = automationUtils.getConfigValue(item, 'formula') || '2';
    await workflowUtils.bonusDamage(workflow, bonus);
}
export const thrownWeaponFighting = {
    name: 'Thrown Weapon Fighting',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: twfDamage,
            priority: 200
        }
    ],
    config: {
        formula: {
            default: '2',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
