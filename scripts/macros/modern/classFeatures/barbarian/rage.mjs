import {keepRage as keepRageLegacy} from '../../../legacy/classFeatures/barbarian/rage.mjs';
import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function early({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'rage') return;
    if (automationUtils.getConfigValue(workflow.item, 'allowHeavyArmor')) return;
    const heavyArmor = workflow.actor.items.filter(item => item.system.type?.value === 'heavy' && item.system.equipped);
    if (!heavyArmor.length) return;
    ui.notifications.info(_loc('CHRISPREMADES.Macros.Rage.HeavyArmor'));
    workflow.aborted = true;
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'rage') return;
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'rage');
    if (existing) await documentUtils.deleteDocument(existing);
    if (!automationUtils.getConfigValue(workflow.item, 'allowConcentration')) {
        const concentrationEffects = Array.from(workflow.actor.concentration?.effects ?? []);
        for (const effect of concentrationEffects) await documentUtils.deleteDocument(effect);
    }
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.transfer = false;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'rage');
    const classIdentifier = automationUtils.getConfigValue(workflow.item, 'classIdentifier') || 'barbarian';
    const formula = workflow.actor.system.scale?.[classIdentifier]?.['rage-damage']?.formula;
    if (formula) foundry.utils.setProperty(effectData, 'flags.chris-premades.rage.formula', formula);
    if (automationUtils.getConfigValue(workflow.item, 'allowSpellcasting')) foundry.utils.setProperty(effectData, 'flags.chris-premades.rage.allowSpellcasting', true);
    const changes = effectData.system?.changes ?? effectData.changes ?? [];
    const macros = [];
    // Path of the Berserker
    const mindlessRage = actorUtils.getItemByIdentifier(workflow.actor, 'mindless-rage');
    if (mindlessRage) {
        const charmedEffect = actorUtils.getEffectByStatusID(workflow.actor, 'charmed');
        if (charmedEffect) await documentUtils.deleteDocument(charmedEffect);
        const frightenedEffect = actorUtils.getEffectByStatusID(workflow.actor, 'frightened');
        if (frightenedEffect) await documentUtils.deleteDocument(frightenedEffect);
        const mrEffect = mindlessRage.effects.contents?.[0];
        if (mrEffect) changes.push(...(mrEffect.toObject().system?.changes ?? mrEffect.toObject().changes ?? []));
        if (charmedEffect || frightenedEffect) await workflowUtils.completeItemUse(mindlessRage);
    }
    // Path of the Wild Heart
    const rageOfTheWilds = actorUtils.getItemByIdentifier(workflow.actor, 'rage-of-the-wilds');
    if (rageOfTheWilds) {
        const selection = await dialogUtils.buttonDialog(rageOfTheWilds.name, _loc('CHRISPREMADES.Macros.RageOfTheWilds.Use'), [
            ['CHRISPREMADES.Macros.RageOfTheWilds.Bear', 'bear'],
            ['CHRISPREMADES.Macros.RageOfTheWilds.Eagle', 'eagle'],
            ['CHRISPREMADES.Macros.RageOfTheWilds.Wolf', 'wolf']
        ]);
        if (selection === 'bear') {
            const bearEffect = rageOfTheWilds.effects.contents?.[0];
            if (bearEffect) changes.push(...(bearEffect.toObject().system?.changes ?? bearEffect.toObject().changes ?? []));
        }
        if (selection) await workflowUtils.completeItemUse(rageOfTheWilds);
    }
    const powerOfTheWilds = actorUtils.getItemByIdentifier(workflow.actor, 'power-of-the-wilds');
    if (powerOfTheWilds) {
        const options = [
            ['CHRISPREMADES.Macros.PowerOfTheWilds.Lion', 'lion'],
            ['CHRISPREMADES.Macros.PowerOfTheWilds.Ram', 'ram']
        ];
        const invalidTypes = ['heavy', 'medium', 'light'];
        const allArmor = workflow.actor.items.filter(item => invalidTypes.includes(item.system.type?.value) && item.system.equipped);
        if (!allArmor.length) options.unshift(['CHRISPREMADES.Macros.PowerOfTheWilds.Falcon', 'falcon']);
        const selection = await dialogUtils.buttonDialog(powerOfTheWilds.name, _loc('CHRISPREMADES.Macros.RageOfTheWilds.Use'), options);
        if (selection === 'falcon') {
            const falconEffect = powerOfTheWilds.effects.contents?.[0];
            if (falconEffect) changes.push(...(falconEffect.toObject().system?.changes ?? falconEffect.toObject().changes ?? []));
        } else if (selection === 'lion') {
            macros.push({type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'power-of-the-wilds-lion'}]});
            foundry.utils.setProperty(effectData, 'flags.chris-premades.powerOfTheWildsLion', true);
        } else if (selection === 'ram') {
            macros.push({type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'power-of-the-wilds-ram'}]});
        }
        if (selection) await workflowUtils.completeItemUse(powerOfTheWilds);
    }
    if (effectData.system) effectData.system.changes = changes;
    else effectData.changes = changes;
    const options = {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['rage-continue'],
            favorite: true
        }
    };
    if (macros.length) options.macros = macros;
    await effectUtils.createEffects(workflow.actor, [effectData], options);
    const instinctivePounce = actorUtils.getItemByIdentifier(workflow.actor, 'instinctive-pounce');
    if (instinctivePounce) await workflowUtils.completeItemUse(instinctivePounce);
    // Path of the Zealot
    const rageOfTheGods = actorUtils.getItemByIdentifier(workflow.actor, 'rage-of-the-gods');
    if (rageOfTheGods?.system?.uses?.value) {
        const selection = await dialogUtils.confirm(rageOfTheGods.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: rageOfTheGods.name}));
        if (selection) await workflowUtils.completeItemUse(rageOfTheGods);
    }
}
async function rageContinue({workflow}) {
    const combatData = tokenUtils.getCombatData(workflow.token);
    if (!combatData.inCombat) return;
    const rageEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'rage');
    if (!rageEffect) return;
    await keepRageLegacy.utils.setTurn(combatData, rageEffect);
}
async function attackSave({document: rageEffect, workflow}) {
    const combatData = tokenUtils.getCombatData(workflow.token);
    if (!combatData.inCombat) return;
    if (!workflow.targets.size || (workflow.activity.actionType !== 'save' && !workflowUtils.isAttackType(workflow, 'attack'))) return;
    if (!workflow.targets.some(t => t.document.disposition !== workflow.token.document.disposition)) return;
    await keepRageLegacy.utils.setTurn(combatData, rageEffect);
}
export const extendRage = {
    name: 'Rage',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreTargeting',
            macro: early,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 40
        },
        {
            pass: 'activityRollFinished',
            macro: rageContinue,
            priority: 50
        }
    ],
    config: {
        allowConcentration: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.Rage.AllowConcentration',
            category: 'behavior'
        },
        allowHeavyArmor: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.Rage.AllowHeavyArmor',
            category: 'behavior'
        },
        allowSpellcasting: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.Rage.AllowSpellcasting',
            category: 'behavior'
        },
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
export const keepRage = {
    name: extendRage.name,
    rules: extendRage.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: attackSave,
            priority: 300
        }
    ],
    combat: keepRageLegacy.combat
};
