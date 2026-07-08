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
