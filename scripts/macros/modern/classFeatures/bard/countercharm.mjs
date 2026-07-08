import {actorUtils, automationUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
function getActivityConditions(activity) {
    const conditions = new Set();
    activity?.applicableEffects?.forEach(effect => effect.statuses.forEach(status => conditions.add(status)));
    return conditions;
}
async function resolveActivity(config, options) {
    const uuid = config?.['chris-premades']?.activityUuid ?? config?.midiOptions?.sourceActivityUuid;
    if (uuid) return await fromUuid(uuid);
    return options?.workflow?.activity ?? config?.workflow?.activity;
}
async function selfSave({document: item, actor, token, config, options, roll}) {
    if (!item || !actor) return;
    if (config?.['chris-premades']?.countercharm) return;
    if (MidiQOL.hasUsedReaction(actor)) return;
    const targetValue = roll.options.target;
    if (!targetValue || roll.total >= targetValue) return;
    const activity = await resolveActivity(config, options);
    if (!activity) return;
    const conditions = getActivityConditions(activity);
    if (!conditions.size) return;
    const validConditions = automationUtils.getConfigValue(item, 'conditions') ?? ['charmed', 'frightened'];
    if (![...conditions].find(condition => validConditions.includes(condition))) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.Countercharm.Use', {total: roll.total, feature: item.name}));
    if (!selection) return;
    const selfToken = token ?? actorUtils.getFirstToken(actor);
    await workflowUtils.syntheticItemRoll(item, selfToken ? [selfToken] : []);
    foundry.utils.setProperty(config, 'chris-premades.countercharm', true);
    foundry.utils.setProperty(config, 'midiOptions.advantage', true);
    return (await actor.rollSavingThrow(config, undefined, {create: false}))?.[0];
}
async function save({document: effectOrItem, actor, config, options, roll}) {
    if (config?.['chris-premades']?.countercharm) return;
    const targetValue = roll.options.target;
    if (!targetValue || roll.total >= targetValue) return;
    const activity = await resolveActivity(config, options);
    if (!activity) return;
    const conditions = getActivityConditions(activity);
    if (!conditions.size) return;
    const token = actorUtils.getFirstToken(actor);
    if (!token) return;
    const validTokens = tokenUtils.findNearby(token.document ?? token, 30, {disposition: 'ally'}).filter(target => {
        const feature = actorUtils.getItemByIdentifier(target.actor, 'countercharm');
        if (!feature || target.actor === actor) return false;
        if (MidiQOL.hasUsedReaction(target.actor)) return false;
        const validConditions = automationUtils.getConfigValue(feature, 'conditions') ?? ['charmed', 'frightened'];
        return !![...conditions].find(condition => validConditions.includes(condition));
    });
    if (!validTokens.length) return;
    let returnRoll;
    for (const target of validTokens) {
        if (returnRoll) continue;
        const feature = actorUtils.getItemByIdentifier(target.actor, 'countercharm');
        const userId = queryUtils.firstOwner(target.actor, true);
        const selection = await dialogUtils.confirm(target.actor.name + ': ' + feature.name, _loc('CHRISPREMADES.Macros.Countercharm.AllyFail', {name: actor.name, total: roll.total, feature: feature.name}), {userId});
        if (!selection) continue;
        await workflowUtils.syntheticItemRoll(feature, [token], {userId});
        foundry.utils.setProperty(config, 'chris-premades.countercharm', true);
        foundry.utils.setProperty(config, 'midiOptions.advantage', true);
        returnRoll = (await actor.rollSavingThrow(config, undefined, {create: false}))?.[0];
    }
    return returnRoll;
}
export const countercharm = {
    name: 'Countercharm',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'sceneBonus',
            macro: save,
            priority: 50
        },
        {
            pass: 'actorBonus',
            macro: selfSave,
            priority: 50
        }
    ],
    config: {
        conditions: {
            default: ['charmed', 'frightened'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'behavior',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name}))
        }
    }
};
