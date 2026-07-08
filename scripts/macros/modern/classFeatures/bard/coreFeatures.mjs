import {actorUtils, automationUtils, dialogUtils, documentUtils, tokenUtils} from '../../../../proxy.mjs';
export const jackOfAllTrades = {
    name: 'Jack of All Trades',
    version: '2.0.0',
    rules: '2024'
};
async function combatStart({document: item}) {
    const feature = actorUtils.getItemByIdentifier(item.actor, 'bardic-inspiration');
    if (!feature) return;
    if (feature.system.uses.value >= 2) return;
    await documentUtils.update(feature, {'system.uses.spent': feature.system.uses.max - 2});
    await item.displayCard();
}
export const superiorInspiration = {
    name: 'Superior Inspiration',
    version: '2.0.0',
    rules: '2024',
    combat: [
        {
            pass: 'combatStart',
            macro: combatStart,
            priority: 250
        }
    ]
};
async function fontAdded({document: item}) {
    const actor = item.actor;
    if (!actor) return;
    const bardicInspiration = actorUtils.getItemByIdentifier(actor, 'bardic-inspiration');
    if (!bardicInspiration) return;
    if (!bardicInspiration.system.uses.recovery.find(recovery => recovery.period === 'sr')) {
        const newRecovery = bardicInspiration.toObject().system.uses.recovery;
        newRecovery.push({period: 'sr', type: 'recoverAll'});
        await documentUtils.update(bardicInspiration, {'system.uses.recovery': newRecovery});
    }
    const activity = item.system.activities.find(a => a.identifier === 'recover');
    if (!activity) return;
    const targets = activity.toObject().consumption.targets;
    if (!targets?.length) return;
    targets[0].target = bardicInspiration.id;
    await documentUtils.update(item, {['system.activities.' + activity.id + '.consumption.targets']: targets});
}
export const fontOfInspiration = {
    name: 'Font of Inspiration',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'created',
            macro: fontAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: fontAdded,
            priority: 50
        }
    ]
};
async function wordsTarget({document: item, workflow}) {
    if (!workflow.targets.size || !workflow.item) return;
    const identifier = documentUtils.getIdentifier(workflow.item);
    if (!['power-word-heal', 'power-word-kill'].includes(identifier)) return;
    const range = Number(automationUtils.getConfigValue(item, 'range')) || 10;
    const nearbyTargets = [];
    workflow.targets.forEach(token => {
        nearbyTargets.push(...tokenUtils.findNearby(token.document ?? token, range, {disposition: 'ally', includeIncapacitated: true}));
    });
    if (!nearbyTargets.length) return;
    let selection;
    if (nearbyTargets.length === 1) {
        selection = nearbyTargets[0];
    } else {
        const selected = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.WordsOfCreation.Target'), nearbyTargets, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        selection = selected[0];
    }
    const targets = Array.from(workflow.targets);
    targets.push(selection);
    game.user.updateTokenTargets(targets.map(token => token.id ?? token.document?.id).filter(Boolean));
    workflow.targets = new Set(targets);
    await item.displayCard();
}
export const wordsOfCreation = {
    name: 'Words of Creation',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: wordsTarget,
            priority: 150
        }
    ],
    config: {
        range: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
