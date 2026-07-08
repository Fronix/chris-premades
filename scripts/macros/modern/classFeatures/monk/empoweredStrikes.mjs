import {activityUtils, automationUtils, dialogUtils, documentUtils} from '../../../../proxy.mjs';
import {unarmedAttackIdentifiers} from '../../../lib/monkUtils.mjs';
async function attack({document: item, workflow}) {
    if (!workflow.item) return;
    if (!unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item))) return;
    if (documentUtils.getIdentifier(workflow.activity) !== 'punch') return;
    if (!automationUtils.getConfigValue(item, 'autoApply')) {
        const confirmed = await dialogUtils.confirmUseItem(item);
        if (!confirmed) return;
    }
    const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, '', {types: ['force']});
    workflow.activity = activityUtils.syntheticActivity(activityData, workflow.item);
}
export const empoweredStrikes = {
    name: 'Empowered Strikes',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: attack,
            priority: 40
        }
    ],
    config: {
        autoApply: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.AutoApply',
            category: 'behavior'
        }
    }
};
