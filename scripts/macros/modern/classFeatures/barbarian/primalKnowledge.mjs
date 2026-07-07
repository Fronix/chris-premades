import {actorUtils, automationUtils, workflowUtils} from '../../../../proxy.mjs';
async function skill({actor, config, skillId, document: item}) {
    if (!actorUtils.getEffectByIdentifier(actor, 'rage')) return;
    const skills = automationUtils.getConfigValue(item, 'skills');
    if (!skills?.includes(skillId)) return;
    const blockingConditions = automationUtils.getConfigValue(item, 'blockingConditions');
    if (blockingConditions?.some(status => actor.statuses.has(status))) return;
    const replacementAbility = automationUtils.getConfigValue(item, 'replacementAbility');
    const defaultAbility = config.ability ?? CONFIG.DND5E.skills[skillId].ability;
    if (replacementAbility === defaultAbility) return;
    const abilities = actor.system.abilities;
    if ((abilities[defaultAbility].mod + abilities[defaultAbility].checkBonus) >= (abilities[replacementAbility].mod + abilities[replacementAbility].checkBonus)) return;
    await workflowUtils.completeItemUse(item);
    config.ability = replacementAbility;
}
export const primalKnowledge = {
    name: 'Primal Knowledge',
    version: '2.0.0',
    rules: '2024',
    skill: [
        {
            pass: 'actorSituational',
            macro: skill,
            priority: 50
        }
    ],
    config: {
        skills: {
            default: ['acr', 'itm', 'prc', 'ste', 'sur'],
            type: 'select-many',
            options: () => Object.entries(CONFIG.DND5E.skills).map(([value, {label}]) => ({value, label})),
            label: 'CHRISPREMADES.Config.Skills',
            category: 'tuning'
        },
        blockingConditions: {
            default: [],
            type: 'select-many',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name})),
            label: 'CHRISPREMADES.Config.BlockingConditions',
            category: 'tuning'
        },
        replacementAbility: {
            default: 'str',
            type: 'select',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label})),
            label: 'CHRISPREMADES.Macros.Modern.PrimalKnowledge.ReplacementAbility',
            category: 'tuning'
        }
    }
};
