import {activityUtils, automationUtils} from '../../../proxy.mjs';
async function early({workflow}) {
    if (!workflow.targets.size) return;
    const injured = Array.from(workflow.targets).filter(token => token.actor.system.attributes.hp.value < token.actor.system.attributes.hp.effectiveMax);
    if (!injured.length) return;
    const formula = automationUtils.getConfigValue(workflow.item, 'formula') || 'd12';
    const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, formula);
    workflow.activity = activityUtils.syntheticActivity(activityData, workflow.item);
}
export const tollTheDead = {
    name: 'Toll the Dead',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 50
        }
    ],
    config: {
        formula: {
            default: 'd12',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
