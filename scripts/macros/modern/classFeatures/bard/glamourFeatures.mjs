import {actorUtils, automationUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function beguilingVeryEarly({activity, dialog, actor, config}) {
    if (activity.item.system.uses.value) return;
    if (dialog) dialog.configure = false;
    const bardicInspiration = actorUtils.getItemByIdentifier(actor, 'bardic-inspiration');
    if (!bardicInspiration?.system?.uses?.value) return true;
    const selection = await dialogUtils.confirm(activity.item.name, _loc('CHRISPREMADES.Generic.ConsumeItemToUse', {item: bardicInspiration.name}));
    if (!selection) return true;
    foundry.utils.setProperty(config, 'consume.resources', false);
    await documentUtils.update(bardicInspiration, {'system.uses.spent': bardicInspiration.system.uses.spent + 1});
}
async function beguilingSpell({document: item, workflow}) {
    if (!workflow.item || !workflow.token) return;
    if (workflow.item.type !== 'spell') return;
    if (!workflow.item.system.level) return;
    if (!['spell', 'pact'].includes(workflow.item.system.method)) return;
    const spellSchools = automationUtils.getConfigValue(item, 'spellSchools') ?? ['enc', 'ill'];
    if (!spellSchools.includes(workflow.item.system.school)) return;
    if (!item.system.uses.value) {
        const bardicInspiration = actorUtils.getItemByIdentifier(workflow.actor, 'bardic-inspiration');
        if (!bardicInspiration?.system?.uses?.value) return;
    }
    const range = Number(automationUtils.getConfigValue(item, 'range')) || 60;
    const nearbyTokens = tokenUtils.findNearby(workflow.token.document, range, {disposition: 'enemy', includeIncapacitated: true});
    if (!nearbyTokens.length) return;
    const selection = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Generic.UseItem', {item: item.name}), nearbyTokens, {skipDeadAndUnconscious: false});
    if (!selection?.length) return;
    await workflowUtils.syntheticItemRoll(item, [selection[0]], {consumeUsage: true, consumeResources: true});
}
export const beguilingMagic = {
    name: 'Beguiling Magic',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreTargeting',
            macro: beguilingVeryEarly,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: beguilingSpell,
            priority: 250
        }
    ],
    config: {
        spellSchools: {
            default: ['enc', 'ill'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.SpellSchools',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.spellSchools).map(([value, {label}]) => ({value, label}))
        },
        range: {
            default: 60,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
async function mantleEarly({workflow}) {
    const maxTargets = Math.max(1, workflow.actor.system.abilities.cha.mod);
    if (workflow.targets.size <= maxTargets) return;
    let selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.MantleOfInspiration.Targets', {maxTargets}), Array.from(workflow.targets), {type: 'multiple', maxAmount: maxTargets, skipDeadAndUnconscious: false});
    selection = selection?.[0] ?? Array.from(workflow.targets).slice(0, maxTargets);
    game.user.updateTokenTargets(selection.map(token => token.id ?? token.document?.id).filter(Boolean));
    workflow.targets = new Set(selection);
}
async function mantleUse({workflow}) {
    for (const token of workflow.targets) {
        if (MidiQOL.hasUsedReaction(token.actor)) continue;
        const selection = await dialogUtils.confirm(workflow.item.name, _loc('CHRISPREMADES.Macros.MantleOfInspiration.Reaction'), {userId: queryUtils.firstOwner(token.actor, true)});
        if (!selection) continue;
        if (game.combat?.started) await MidiQOL.setReactionUsed(token.actor);
    }
}
async function mantleAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'bardic-inspiration');
}
export const mantleOfInspiration = {
    name: 'Mantle of Inspiration',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: mantleEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: mantleUse,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: mantleAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: mantleAdded,
            priority: 50
        }
    ]
};
