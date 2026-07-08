import {automationUtils, workflowUtils} from '../../../../proxy.mjs';
import {getCastLevel} from '../../../lib/spellUtils.mjs';
async function damage({document: item, workflow}) {
    if (workflow.item?.type !== 'spell' || !workflow.castData) return;
    if (getCastLevel(workflow) !== 0) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier');
    if (workflow.item.system.sourceClass !== classIdentifier) return;
    const ability = automationUtils.getConfigValue(item, 'ability') || 'wis';
    const modifier = workflow.actor.system.abilities[ability]?.mod ?? 0;
    if (!modifier) return;
    await workflowUtils.bonusDamage(workflow, String(modifier), {damageType: workflow.defaultDamageType});
    await item.displayCard();
}
export const potentSpellcasting = {
    name: 'Blessed Strikes: Potent Spellcasting',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ],
    config: {
        classIdentifier: {
            default: 'cleric',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        ability: {
            default: 'wis',
            type: 'select',
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label}))
        }
    }
};
