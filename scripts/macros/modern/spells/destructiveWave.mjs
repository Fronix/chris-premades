import {actorUtils, dialogUtils, workflowUtils} from '../../../proxy.mjs';
async function damage({workflow}) {
    let damageType = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Dialog.DamageType'), [['DND5E.DamageRadiant', 'radiant'], ['DND5E.DamageNecrotic', 'necrotic']]);
    if (!damageType) damageType = 'radiant';
    await workflowUtils.bonusDamage(workflow, '5d6', {damageType});
}
async function prone({workflow}) {
    if (!workflow.failedSaves.size) return;
    for (const token of workflow.failedSaves) {
        await actorUtils.applyConditions(token.actor, ['prone']);
    }
}
export const destructiveWave = {
    name: 'Destructive Wave',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemDamageRollComplete',
            macro: damage,
            priority: 250
        },
        {
            pass: 'itemRollFinished',
            macro: prone,
            priority: 50
        }
    ]
};
