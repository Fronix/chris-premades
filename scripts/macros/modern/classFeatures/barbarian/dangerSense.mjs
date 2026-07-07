import {automationUtils} from '../../../../proxy.mjs';
async function save({actor, config, options, saveId, document: item}) {
    if (options.advantage || config.advantage) return;
    const saves = automationUtils.getConfigValue(item, 'saves');
    if (!saves?.includes(saveId)) return;
    const blockingConditions = automationUtils.getConfigValue(item, 'blockingConditions');
    if (blockingConditions?.some(status => actor.statuses.has(status))) return;
    options.advantage = true;
}
export const dangerSense = {
    name: 'Danger Sense',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'actorSituational',
            macro: save,
            priority: 50
        }
    ],
    config: {
        saves: {
            default: ['dex'],
            type: 'select-many',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label})),
            label: 'CHRISPREMADES.Config.SaveAbilities',
            category: 'tuning'
        },
        blockingConditions: {
            default: ['incapacitated'],
            type: 'select-many',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name})),
            label: 'CHRISPREMADES.Config.BlockingStatuses',
            category: 'tuning'
        }
    }
};
