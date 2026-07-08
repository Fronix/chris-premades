import {automationUtils, workflowUtils} from '../../../../proxy.mjs';
import {getCastLevel} from '../../../lib/spellUtils.mjs';
async function heal({document: item, workflow}) {
    if (!workflow.targets.size || !workflow.item || !workflow.token || !workflow.damageRolls) return;
    if (workflow.item.type !== 'spell') return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('healing')) return;
    const validTypes = ['spell', 'pact'];
    if (!validTypes.includes(workflow.item.system.method)) return;
    const castLevel = getCastLevel(workflow);
    if (!castLevel) return;
    if (workflow.targets.size === 1 && workflow.targets.first().document.uuid === workflow.token.document.uuid) return;
    const activity = item.system.activities.find(a => a.identifier === 'heal');
    if (!activity) return;
    const itemData = item.toObject();
    itemData.system.activities[activity.id].healing.bonus = String((Number(automationUtils.getConfigValue(item, 'baseHealing')) || 2) + castLevel);
    await workflowUtils.syntheticItemDataRoll(itemData, workflow.actor, [workflow.token]);
}
export const blessedHealer = {
    name: 'Blessed Healer',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: heal,
            priority: 250
        }
    ],
    config: {
        baseHealing: {
            default: 2,
            type: 'text',
            label: 'CHRISPREMADES.Config.BaseHealing',
            category: 'tuning'
        }
    }
};
