import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
function getSorceryPoints(actor) {
    const sorcPoints = actorUtils.getItemByIdentifier(actor, 'sorcery-points');
    if (!sorcPoints?.system.uses.value) {
        ui.notifications.info(_loc('CHRISPREMADES.Macros.Metamagic.NotEnough'));
        return;
    }
    return sorcPoints;
}
async function spendPoints(sorcPoints, amount = 1) {
    await documentUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + amount});
}
async function pickSpell(workflow, validSpells, {cost = 1} = {}) {
    if (!validSpells.length) {
        ui.notifications.info(_loc('CHRISPREMADES.Macros.Metamagic.NoValid'));
        return;
    }
    validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells.sort((a, b) => a.system.level - b.system.level);
    return await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Metamagic.Which', {cost, plural: cost > 1 ? 's' : ''}), validSpells, {showSpellLevel: true, addNoneDocument: true});
}
// Careful Spell: chosen allies automatically succeed on the save
async function useCareful({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => spell.hasSave);
    const selection = await pickSpell(workflow, validSpells);
    if (!selection) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: 'metamagic'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2014', identifier: 'metamagic-careful-spell'}]}]
    });
    const effect = created?.[0];
    if (!effect) return;
    await spendPoints(sorcPoints);
    await workflowUtils.completeItemUse(selection);
    const lingering = actorUtils.getEffectByIdentifier(workflow.actor, 'metamagic');
    if (lingering) await documentUtils.deleteDocument(lingering);
}
async function earlyCareful({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    const max = Math.max(1, workflow.actor.system.abilities.cha.mod ?? 0);
    let targets = Array.from(workflow.targets);
    const originItem = await fromUuid(effect.origin);
    if (!originItem) return;
    if (!automationUtils.getConfigValue(originItem, 'allowEnemies')) {
        targets = targets.filter(token => token.document.disposition === workflow.token.document.disposition);
    }
    if (!targets.length) return;
    let selection = await dialogUtils.selectTargetDialog(effect.name, _loc('CHRISPREMADES.Macros.Metamagic.CarefulWhich', {max}), targets, {type: 'multiple', maxAmount: max});
    if (!selection?.length) return;
    selection = selection[0];
    const savedEffectData = {
        name: effect.name,
        img: 'icons/svg/upgrade.svg',
        type: 'base',
        origin: effect.uuid,
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.min.ability.save.all',
                    type: 'override',
                    value: 100,
                    phase: 'initial',
                    priority: 120
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
    for (const target of selection) {
        await effectUtils.createEffects(target.actor, [savedEffectData]);
    }
}
export const carefulSpell = {
    name: 'Metamagic: Careful Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useCareful,
            priority: 50
        },
        {
            pass: 'actorPreambleComplete',
            macro: earlyCareful,
            priority: 50
        }
    ],
    config: {
        allowEnemies: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.Metamagic.AllowEnemies',
            category: 'behavior'
        }
    }
};
// Distant Spell: touch becomes 30 ft, ranged doubles
async function useDistant({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => ['touch', 'ft'].includes(spell.system.range.units) && spell.system.target.affects.type?.length && spell.system.target.affects.type !== 'self');
    const selection = await pickSpell(workflow, validSpells);
    if (!selection) return;
    await spendPoints(sorcPoints);
    let itemUpdate;
    if (selection.system.range.units === 'touch') {
        itemUpdate = {'system.range': {units: 'ft', value: 30}};
    } else {
        itemUpdate = {'system.range.value': selection.system.range.value * 2};
    }
    const newItem = selection.clone(itemUpdate, {keepId: true});
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        consumeUsage: !!newItem.system.hasLimitedUses,
        spellSlot: !!(newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method))
    });
}
export const distantSpell = {
    name: 'Metamagic: Distant Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useDistant,
            priority: 50
        }
    ]
};
// Extended Spell: double duration (max 24h)
async function useExtended({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => (spell.system.duration?.value ?? 0) > 0 && ['minute', 'hour', 'day'].includes(spell.system.duration?.units));
    const selection = await pickSpell(workflow, validSpells);
    if (!selection) return;
    await spendPoints(sorcPoints);
    const oldUnits = selection.system.duration.units;
    const oldValue = selection.system.duration.value;
    const unitSeconds = {minute: 60, hour: 3600, day: 86400}[oldUnits] ?? 60;
    const newSeconds = Math.min(86400, oldValue * unitSeconds * 2);
    const newItem = selection.clone({'system.duration': {value: newSeconds / 60, units: 'minute'}}, {keepId: true});
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        consumeUsage: !!newItem.system.hasLimitedUses,
        spellSlot: !!(newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method))
    });
}
export const extendedSpell = {
    name: 'Metamagic: Extended Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useExtended,
            priority: 50
        }
    ]
};
// Heightened Spell: one target has disadvantage on the first save
async function useHeightened({workflow}) {
    const sorcPoints = actorUtils.getItemByIdentifier(workflow.actor, 'sorcery-points');
    if (!sorcPoints || sorcPoints.system.uses.value < 3) {
        ui.notifications.info(_loc('CHRISPREMADES.Macros.Metamagic.NotEnough'));
        return;
    }
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => spell.hasSave);
    const selection = await pickSpell(workflow, validSpells, {cost: 3});
    if (!selection) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: 'metamagic'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2014', identifier: 'metamagic-heightened-spell'}]}]
    });
    if (!created?.[0]) return;
    await spendPoints(sorcPoints, 3);
    await workflowUtils.completeItemUse(selection);
    const lingering = actorUtils.getEffectByIdentifier(workflow.actor, 'metamagic');
    if (lingering) await documentUtils.deleteDocument(lingering);
}
async function earlyHeightened({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    const targets = Array.from(workflow.targets).filter(token => token.document.disposition !== workflow.token.document.disposition);
    if (!targets.length) return;
    const selection = await dialogUtils.selectTargetDialog(effect.name, _loc('CHRISPREMADES.Macros.Metamagic.HeightenedWhich'), targets);
    if (!selection?.length) return;
    const disadvantageData = {
        name: effect.name,
        img: 'icons/svg/downgrade.svg',
        type: 'base',
        origin: effect.uuid,
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.disadvantage.save.all', type: 'override', value: 1, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
    await effectUtils.createEffects(selection[0].actor, [disadvantageData]);
}
export const heightenedSpell = {
    name: 'Metamagic: Heightened Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useHeightened,
            priority: 50
        },
        {
            pass: 'actorPreambleComplete',
            macro: earlyHeightened,
            priority: 50
        }
    ]
};
// Quickened Spell: cast an action spell as a bonus action
async function useQuickened({workflow}) {
    const sorcPoints = actorUtils.getItemByIdentifier(workflow.actor, 'sorcery-points');
    if (!sorcPoints || sorcPoints.system.uses.value < 2) {
        ui.notifications.info(_loc('CHRISPREMADES.Macros.Metamagic.NotEnough'));
        return;
    }
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => spell.system.activation.type === 'action');
    const selection = await pickSpell(workflow, validSpells, {cost: 2});
    if (!selection) return;
    await spendPoints(sorcPoints, 2);
    const newItem = selection.clone({'system.activation.type': 'bonus'}, {keepId: true});
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        consumeUsage: !!newItem.system.hasLimitedUses,
        spellSlot: !!(newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method))
    });
}
export const quickenedSpell = {
    name: 'Metamagic: Quickened Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useQuickened,
            priority: 50
        }
    ]
};
// Subtle Spell: strip verbal/somatic components
async function useSubtle({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => ['vocal', 'verbal', 'somatic'].some(property => spell.system.properties.has(property)));
    const selection = await pickSpell(workflow, validSpells);
    if (!selection) return;
    await spendPoints(sorcPoints);
    const newItem = selection.clone({'system.properties': Array.from(selection.system.properties).filter(property => !['vocal', 'verbal', 'somatic'].includes(property))}, {keepId: true});
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        consumeUsage: !!newItem.system.hasLimitedUses,
        spellSlot: !!(newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method))
    });
}
export const subtleSpell = {
    name: 'Metamagic: Subtle Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useSubtle,
            priority: 50
        }
    ]
};
// Seeking Spell: reroll a missed spell attack for 2 points
async function attackSeeking({document: item, workflow}) {
    if (!workflow.targets.size || workflow.item.type !== 'spell') return;
    const sorcPoints = actorUtils.getItemByIdentifier(workflow.actor, 'sorcery-points');
    if (!sorcPoints || sorcPoints.system.uses.value < 2) return;
    const attackTotal = workflow.attackTotal;
    if (Array.from(workflow.targets).every(token => token.actor?.system.attributes.ac.value <= attackTotal)) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Missed', {attackTotal, itemName: item.name + ' (2 ' + sorcPoints.name + ')'}));
    if (!selection) return;
    await spendPoints(sorcPoints, 2);
    const newAttackRoll = await new Roll(workflow.attackRoll.formula, workflow.attackRoll.data, workflow.attackRoll.options).evaluate();
    await workflow.setAttackRoll(newAttackRoll);
}
export const seekingSpell = {
    name: 'Metamagic: Seeking Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'actorAttackRollMissedBonuses',
            macro: attackSeeking,
            priority: 100
        }
    ]
};
// Transmuted Spell: swap an elemental damage type
function getElementalDamageTypes(item) {
    const damageTypes = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
    const activities = Array.from(item.system.activities.getByTypes('attack', 'damage', 'save'));
    const types = new Set(activities.flatMap(a => a.damage.parts.flatMap(part => Array.from(part.types))));
    return damageTypes.filter(type => types.has(type));
}
async function useTransmuted({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const damageTypes = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell => getElementalDamageTypes(spell).length);
    const selection = await pickSpell(workflow, validSpells);
    if (!selection) return;
    await spendPoints(sorcPoints);
    const replacementOptions = getElementalDamageTypes(selection);
    let damageTypeToChange = replacementOptions[0];
    if (replacementOptions.length > 1) {
        const picked = await dialogUtils.buttonDialog(selection.name, _loc('CHRISPREMADES.Macros.Metamagic.TransmutedFirst'), replacementOptions.map(type => ['DND5E.Damage' + type.charAt(0).toUpperCase() + type.slice(1), type]));
        if (picked) damageTypeToChange = picked;
    }
    const newOptions = damageTypes.filter(type => type !== damageTypeToChange);
    let newDamageType = await dialogUtils.buttonDialog(selection.name, _loc('CHRISPREMADES.Macros.Metamagic.TransmutedSecond'), newOptions.map(type => ['DND5E.Damage' + type.charAt(0).toUpperCase() + type.slice(1), type]));
    if (!newDamageType) newDamageType = newOptions[0];
    const itemData = selection.toObject();
    for (const [id, activityData] of Object.entries(itemData.system.activities)) {
        if (!activityData.damage?.parts) continue;
        activityData.damage.parts.forEach(part => {
            if (part.types?.includes(damageTypeToChange)) part.types = [newDamageType];
            if (part.custom?.enabled && part.custom.formula) part.custom.formula = part.custom.formula.replaceAll(damageTypeToChange, newDamageType);
        });
    }
    const newItem = selection.clone({'system.activities': itemData.system.activities}, {keepId: true});
    await workflowUtils.completeItemUse(newItem);
}
export const transmutedSpell = {
    name: 'Metamagic: Transmuted Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useTransmuted,
            priority: 50
        }
    ]
};
// Twinned Spell: single-target spells hit a second target
async function useTwinned({workflow}) {
    const sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints) return;
    const validSpells = actorUtils.getCastableSpells(workflow.actor).filter(spell =>
        spell.system.target?.affects?.count === 1 && !spell.system.target?.template?.count &&
        spell.system.level <= sorcPoints.system.uses.value);
    const selection = await pickSpell(workflow, validSpells, {cost: 1});
    if (!selection) return;
    const cost = Math.max(1, selection.system.level);
    if (cost > sorcPoints.system.uses.value) {
        ui.notifications.info(_loc('CHRISPREMADES.Macros.Metamagic.NotEnough'));
        return;
    }
    await spendPoints(sorcPoints, cost);
    const newItem = selection.clone({'system.target.affects.count': 2}, {keepId: true});
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        consumeUsage: !!newItem.system.hasLimitedUses,
        spellSlot: !!(newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method))
    });
}
export const twinnedSpell = {
    name: 'Metamagic: Twinned Spell',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: useTwinned,
            priority: 50
        }
    ]
};
