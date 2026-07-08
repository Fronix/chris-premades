import {actorUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const wildShape = actorUtils.getItemByIdentifier(workflow.actor, 'wild-shape');
    if (!wildShape?.system.uses.value) return;
    await workflowUtils.syntheticItemRoll(wildShape, [workflow.token], {consumeResources: true, consumeUsage: true});
}
export const circleForms = {
    name: 'Circle Forms',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const lunarForm = {
    name: 'Lunar Form',
    version: '2.0.0',
    rules: '2024',
    config: {
        formula: {
            default: '2d10',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'radiant',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
