import {automationUtils, constants} from '../../../../proxy.mjs';
async function save({actor, config, document: item, options, saveId}) {
    if (config.advantage || options.advantage) return;
    const saves = automationUtils.getConfigValue(item, 'saves');
    if (!saves.includes(saveId)) return;
    const statuses = automationUtils.getConfigValue(item, 'conditions');
    if (actor.statuses.some(s => statuses.includes(s))) return;
    return {label: 'CHRISPREMADES.Macros.Legacy.DangerSense', type: 'advantage'};
}
export let dangerSense = {
    name: 'Danger Sense',
    version: '2.0.2',
    rules: '2014',
    save: [
        {
            pass: 'actorContext',
            macro: save,
            priority: 250
        }
    ],
    config: {
        saves: {
            default: ['dex'],
            type: 'select-many',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label, icon: image}]) => ({value, label, image})), // TODO replace with constants, pending Tyler's PR
            label: 'CHRISPREMADES.Config.SaveAbilities',
            category: 'behavior'
        },
        conditions: {
            default: ['blinded', 'deafened', 'incapacitated'],
            type: 'select-many',
            options: () => Object.entries(CONFIG.DND5E.conditionTypes).map(([value, {name: label, img: image}]) => ({value, label, image})) , // TODO replace with constants
            label: 'CHRISPREMADES.Config.BlockingConditions',
            category: 'behavior'
        }
    }
};
