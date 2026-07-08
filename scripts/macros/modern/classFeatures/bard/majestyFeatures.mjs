import {activityUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
async function majestyAttacked({document: effect, workflow}) {
    if (!workflow.hitTargets.size || !workflow.token) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!effect.origin) return;
    const item = await fromUuid(effect.origin);
    if (!item) return;
    const activity = item.system?.activities?.find(a => a.identifier === 'save');
    if (!activity?.uses?.value) return;
    const result = await workflowUtils.syntheticActivityRoll(activity, [workflow.token], {consumeResources: true});
    if (!result?.failedSaves?.size) return;
    workflow.aborted = true;
}
async function majestyUse({workflow}) {
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'unbreakable-majesty-effect');
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'unbreakable-majesty-effect'}]}]
    });
}
export const unbreakableMajesty = {
    name: 'Unbreakable Majesty',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: majestyUse,
            priority: 50
        }
    ]
};
export const unbreakableMajestyEffect = {
    name: unbreakableMajesty.name,
    version: unbreakableMajesty.version,
    rules: unbreakableMajesty.rules,
    roll: [
        {
            pass: 'targetAttackRollComplete',
            macro: majestyAttacked,
            priority: 50
        }
    ]
};
async function mantleUse({workflow}) {
    const pack = game.packs.get('chris-premades.CPRSpells2024');
    if (!pack) return;
    const index = await pack.getIndex();
    const entry = index.find(e => e.name === 'Command');
    if (!entry) return;
    const commandItem = await pack.getDocument(entry._id);
    const spellData = commandItem.toObject();
    delete spellData._id;
    spellData.system.activation.type = 'special';
    spellData.system.method = 'innate';
    spellData.system.identifier = 'mantle-of-majesty-command';
    spellData.name = workflow.item.name + ': ' + spellData.name;
    const commandBinding = {source: 'chris-premades', rules: '2024', identifier: 'mantle-of-majesty-command'};
    const existingRoll = foundry.utils.getProperty(spellData, 'flags.cat.macros.roll') ?? [];
    foundry.utils.setProperty(spellData, 'flags.cat.macros.roll', [...existingRoll, commandBinding]);
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'mantle-of-majesty-effect');
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
    const effect = created?.[0];
    if (effect) {
        const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
        if (concentration) await documentUtils.makeDependent(concentration, [effect]);
    }
    await workflowUtils.syntheticItemDataRoll(spellData, workflow.actor, Array.from(workflow.targets));
    spellData.system.activation.type = 'bonus';
    const items = await documentUtils.createEmbeddedDocuments(workflow.actor, 'Item', [spellData]);
    if (effect && items?.length) await documentUtils.makeDependent(effect, items);
}
async function mantleVeryEarly({activity, dialog, actor, config}) {
    if (activity.item.system.uses.value) return;
    if (dialog) dialog.configure = false;
    const available = [];
    for (let level = 3; level <= 9; level++) {
        const slot = actor.system.spells['spell' + level];
        if (slot?.value) available.push(level);
    }
    if (!available.length) return true;
    const buttons = available.map(level => [_loc('CHRISPREMADES.Macros.ArcaneRecovery.Slot', {slot: level}), level]).concat([['CHRISPREMADES.Generic.No', false]]);
    const selection = await dialogUtils.buttonDialog(activity.item.name, _loc('CHRISPREMADES.Generic.ConsumeSpellSlotToUse'), buttons);
    if (!selection) return true;
    await documentUtils.update(actor, {['system.spells.spell' + selection + '.value']: actor.system.spells['spell' + selection].value - 1});
    foundry.utils.setProperty(config, 'consume.resources', false);
}
async function commandEarly({workflow}) {
    if (!workflow.targets.size) return;
    const autoFailData = {
        name: _loc('CHRISPREMADES.Generic.AutoFail'),
        img: 'icons/svg/downgrade.svg',
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.fail.ability.save.all', type: 'override', value: 1, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
    for (const token of workflow.targets) {
        const charmedBySource = token.actor.appliedEffects.some(effect => effect.statuses.has('charmed') && effect.origin?.includes(workflow.actor.id));
        if (!charmedBySource) continue;
        await effectUtils.createEffects(token.actor, [autoFailData]);
    }
}
export const mantleOfMajesty = {
    name: 'Mantle of Majesty',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: mantleUse,
            priority: 50
        },
        {
            pass: 'itemPreTargeting',
            macro: mantleVeryEarly,
            priority: 50
        }
    ]
};
export const mantleOfMajestyCommand = {
    name: 'Mantle of Majesty: Command',
    version: mantleOfMajesty.version,
    rules: mantleOfMajesty.rules,
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: commandEarly,
            priority: 50
        }
    ]
};
