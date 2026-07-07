import {automationUtils, rollUtils} from '../../../../proxy.mjs';
async function ability({actor, config, document: item, roll}) {
    const configuredAbility = automationUtils.getConfigValue(item, 'ability');
    const testAbility = roll.data.abilityId ?? config.ability ?? (config.skill ? CONFIG.DND5E.skills[config.skill].ability : undefined);
    if (testAbility !== configuredAbility) return;
    const score = actor.system.abilities[configuredAbility].value;
    if (roll.total >= score) return;
    return await rollUtils.rollDice('max(' + roll.formula + ', ' + score + ')', {document: actor});
}
export const indomitableMight = {
    name: 'Indomitable Might',
    version: '2.0.0',
    rules: '2024',
    check: [
        {
            pass: 'actorBonus',
            macro: ability,
            priority: 50
        }
    ],
    save: [
        {
            pass: 'actorBonus',
            macro: ability,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: ability,
            priority: 50
        }
    ],
    config: {
        ability: {
            default: 'str',
            type: 'select',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label})),
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning'
        }
    }
};
