import {actorUtils, automationUtils, effectUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {saveDisadvantageEffectData} from '../../../lib/spellUtils.mjs';
async function damage({workflow}) {
    if (!workflow.activity?.hasSave || workflow.item?.type !== 'spell' || !workflow.damageRolls) return;
    const damageTypes = workflowUtils.getDamageTypes(workflow.damageRolls);
    for (const token of workflow.targets) {
        const nearby = tokenUtils.findNearby(token.document, 60, {disposition: 'all', includeToken: true, includeIncapacitated: true});
        for (const nearbyToken of nearby) {
            const effect = actorUtils.getEffectByIdentifier(nearbyToken.actor, 'corona-of-light-effect');
            if (!effect) continue;
            const item = await fromUuid(effect.origin);
            if (!item) continue;
            const validTypes = automationUtils.getConfigValue(item, 'damageTypes') ?? [];
            if (!validTypes.some(type => damageTypes.has(type))) continue;
            await effectUtils.createEffects(token.actor, [saveDisadvantageEffectData()]);
            break;
        }
    }
}
export const coronaOfLight = {
    name: 'Corona of Light',
    version: '2.0.0',
    rules: '2024',
    config: {
        damageTypes: {
            default: ['fire', 'radiant'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const coronaOfLightEffect = {
    name: coronaOfLight.name,
    version: coronaOfLight.version,
    rules: coronaOfLight.rules,
    roll: [
        {
            pass: 'sceneDamageRollComplete',
            macro: damage,
            priority: 250
        },
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ]
};
