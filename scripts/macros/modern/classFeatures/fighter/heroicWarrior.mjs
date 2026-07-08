import {documentUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.actor.system.attributes.inspiration) await documentUtils.update(workflow.actor, {'system.attributes.inspiration': true});
}
async function turnStart({document: item, token}) {
    if (!token || item.actor.system.attributes.inspiration) return;
    await workflowUtils.syntheticItemRoll(item, [token], {consumeResources: true, consumeUsage: true});
}
export const heroicWarrior = {
    name: 'Heroic Warrior',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: turnStart,
            priority: 30
        }
    ]
};
