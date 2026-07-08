import {activityUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, rollUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function early({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'stress-damage') return;
    if (!workflow.item.flags['chris-premades']?.wish?.blocked) return;
    ui.notifications.warn(_loc('CHRISPREMADES.Macros.Wish.BlockedWarn'));
    workflow.aborted = true;
}
async function stress({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    if (activityIdentifier === 'duplicate-spell' || activityIdentifier === 'stress-damage') return;
    const existing = documentUtils.getEffectByIdentifier(workflow.actor, 'wish-stress');
    if (existing) await documentUtils.deleteDocument(existing);
    const sourceEffect = documentUtils.getEffectByIdentifier(workflow.item, 'wish-stress') ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    const durationFormula = automationUtils.getConfigValue(workflow.item, 'stressDurationFormula') || '2d4';
    const roll = await rollUtils.rollDice(durationFormula);
    await roll.toMessage({speaker: {alias: workflow.actor.name}, flavor: workflow.item.name});
    effectData.duration = {seconds: roll.total * 86400};
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'wish-stress');
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'wish-stress'};
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'roll', macros: [macroEntry]},
            {type: 'rest', macros: [macroEntry]}
        ]
    });
    const chanceNumber = Number(automationUtils.getConfigValue(workflow.item, 'chanceNumber')) || 0;
    if (!chanceNumber) return;
    const chanceFormula = automationUtils.getConfigValue(workflow.item, 'chanceFormula') || '1d100';
    const chanceRoll = await rollUtils.rollDice(chanceFormula);
    await chanceRoll.toMessage({speaker: {alias: workflow.actor.name}, flavor: workflow.item.name});
    if (chanceRoll.total > chanceNumber) return;
    await documentUtils.update(workflow.item, {'flags.chris-premades.wish.blocked': true});
    ui.notifications.warn(_loc('CHRISPREMADES.Macros.Wish.Blocked'));
}
async function instantHealth({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'instant-health') return;
    const statusIds = automationUtils.getConfigValue(workflow.item, 'instantHealthConditions') ?? ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'petrified', 'poisoned', 'stunned'];
    const targets = new Set(workflow.targets);
    if (workflow.token) targets.add(workflow.token);
    for (const token of targets) {
        if (!token.actor) continue;
        for (const statusId of statusIds) {
            const effect = token.actor.effects.find(e => e.statuses.has(statusId));
            if (effect) await documentUtils.deleteDocument(effect);
        }
        for (const effect of Array.from(token.actor.effects)) {
            const changes = effect.toObject().system?.changes ?? effect.toObject().changes ?? [];
            const abilities = Object.keys(CONFIG.DND5E.abilities);
            const debuff = changes.find(change => (abilities.some(ability => change.key === 'system.abilities.' + ability + '.value') || change.key === 'system.attributes.hp.tempmax') && Number(change.value) < 0);
            if (debuff) await documentUtils.deleteDocument(effect);
        }
        await documentUtils.update(token.actor, {'system.attributes.hp.value': token.actor.system.attributes.hp.max});
    }
}
async function resistance({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'resistance') return;
    const damageTypes = Object.keys(CONFIG.DND5E.damageTypes).filter(type => !['midi-none', 'none'].includes(type));
    const selection = await dialogUtils.selectDamageType(damageTypes, workflow.item.name, _loc('CHRISPREMADES.Generic.SelectDamageType'));
    if (!selection || selection === 'no') return;
    const resistanceEffect = documentUtils.getEffectByIdentifier(workflow.item, 'wish-resistance');
    if (!resistanceEffect) return;
    const effectData = resistanceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    const changes = effectData.system?.changes ?? effectData.changes;
    if (changes?.[0]) changes[0].value = selection;
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }
}
async function pickSpellFromPack(maxLevel) {
    const pack = game.packs.get('chris-premades.CPRSpells2024');
    if (!pack) return;
    const index = await pack.getIndex({fields: ['system.level']});
    if (!index.size) return;
    let entries = index.contents;
    if (maxLevel !== undefined) entries = entries.filter(entry => (entry.system?.level ?? 0) <= maxLevel);
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    return await dialogUtils.selectDocumentDialog(_loc('CHRISPREMADES.Generic.SelectSpell'), undefined, entries);
}
async function spellImmunity({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'spell-immunity') return;
    if (!workflow.targets.size) return;
    const entry = await pickSpellFromPack();
    if (!entry) return;
    const immuneEffect = documentUtils.getEffectByIdentifier(workflow.item, 'wish-immunity');
    if (!immuneEffect) return;
    const effectData = immuneEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'wish-immunity');
    foundry.utils.setProperty(effectData, 'flags.chris-premades.wish.spellImmunity', entry.name);
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'wish-immunity'}]}]
        });
    }
}
async function duplicateSpell({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'duplicate-spell') return;
    const maxLevel = Number(automationUtils.getConfigValue(workflow.item, 'maxLevel')) || 8;
    const entry = await pickSpellFromPack(maxLevel);
    if (!entry) return;
    const document = await fromUuid(entry.uuid);
    if (!document) return;
    const itemData = document.toObject();
    delete itemData._id;
    itemData.system.properties = itemData.system.properties.filter(property => !['vocal', 'somatic', 'material'].includes(property));
    itemData.system.materials = {value: '', consumed: false, cost: 0, supply: 0};
    itemData.system.method = 'innate';
    itemData.system.activation.type = 'special';
    const item = itemUtils.syntheticItem(itemData, workflow.actor);
    await workflowUtils.completeItemUse(item);
}
async function stressSpellDamage({document: effect, workflow}) {
    if (workflow.item?.type !== 'spell') return;
    const level = getCastLevel(workflow);
    if (!level) return;
    const originItem = await fromUuid(effect.origin);
    if (!originItem || !workflow.token) return;
    const activity = originItem.system.activities.find(a => a.identifier === 'stress-damage');
    if (!activity) return;
    const itemData = originItem.toObject();
    itemData.system.activities[activity.id].damage.parts[0].number = level;
    const item = itemUtils.syntheticItem(itemData, workflow.actor);
    const newActivity = item.system.activities.get(activity.id);
    await workflowUtils.syntheticActivityRoll(newActivity, [workflow.token]);
}
async function rest({document: effect}) {
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.Wish.Rest'));
    if (!selection) return;
    if (effect.duration.seconds - 86400 <= 0) {
        await documentUtils.deleteDocument(effect);
    } else {
        await documentUtils.update(effect, {'duration.seconds': effect.duration.seconds - 86400});
    }
}
async function targeted({document: effect, targetToken, workflow}) {
    if (workflow?.item?.type !== 'spell') return;
    const spellName = effect.flags['chris-premades']?.wish?.spellImmunity;
    if (!spellName || workflow.item.name !== spellName) return;
    const selfToken = targetToken?.object ?? targetToken;
    const newTargets = Array.from(workflow.targets).filter(token => (token.document ?? token) !== (selfToken?.document ?? selfToken) && token.id !== targetToken?.id);
    game.user.updateTokenTargets(newTargets.map(token => token.id ?? token.document?.id).filter(Boolean));
    workflow.targets = new Set(newTargets);
}
export const wish = {
    name: 'Wish',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: instantHealth,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: resistance,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: spellImmunity,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: duplicateSpell,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: stress,
            priority: 51
        }
    ],
    config: {
        stressDurationFormula: {
            default: '2d4',
            type: 'text',
            label: 'CHRISPREMADES.Macros.Wish.StressDuration',
            category: 'tuning'
        },
        chanceFormula: {
            default: '1d100',
            type: 'text',
            label: 'CHRISPREMADES.Macros.Wish.ChanceFormula',
            category: 'tuning'
        },
        chanceNumber: {
            default: 33,
            type: 'text',
            label: 'CHRISPREMADES.Macros.Wish.ChanceNumber',
            category: 'tuning'
        },
        maxLevel: {
            default: 8,
            type: 'text',
            label: 'CHRISPREMADES.Macros.Wish.MaxLevel',
            category: 'tuning'
        },
        instantHealthConditions: {
            default: ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'petrified', 'poisoned', 'stunned'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'behavior',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name}))
        }
    }
};
export const wishStress = {
    name: 'Wish: Stress',
    version: wish.version,
    rules: wish.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: stressSpellDamage,
            priority: 50
        }
    ],
    rest: [
        {
            pass: 'actorLong',
            macro: rest,
            priority: 50
        }
    ]
};
export const wishImmunity = {
    name: 'Wish: Immunity',
    version: wish.version,
    rules: wish.rules,
    roll: [
        {
            pass: 'targetPreambleComplete',
            macro: targeted,
            priority: 50
        }
    ]
};
