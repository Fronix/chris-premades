import {actorUtils, dialogUtils, documentUtils, queryUtils, workflowUtils} from '../../../../proxy.mjs';
async function nearbyAttack({document: item, workflow}) {
    if (item.actor === workflow.actor) return;
    if (!workflowUtils.isAttackType(workflow, 'attack') || !workflow.targets.size) return;
    if (!item.system.uses.value) return;
    const confirmed = await dialogUtils.confirmUseItem(item, {userId: queryUtils.firstOwner(item.actor, true)});
    if (!confirmed) return;
    await workflowUtils.completeItemUse(item, [workflow.token]);
    workflow.disadvantage = true;
}
async function use({workflow}) {
    const improved = actorUtils.getItemByIdentifier(workflow.actor, 'improved-warding-flare');
    if (improved?.system.uses.value) await workflowUtils.syntheticItemRoll(improved, Array.from(workflow.targets), {consumeResources: true, consumeUsage: true});
}
async function added({document: item}) {
    const actor = item.actor;
    if (!actor) return;
    const wardingFlare = actorUtils.getItemByIdentifier(actor, 'warding-flare');
    if (!wardingFlare) return;
    if (!wardingFlare.system.uses.recovery.find(recovery => recovery.period === 'sr')) {
        const recovery = wardingFlare.toObject().system.uses.recovery;
        recovery.push({period: 'sr', type: 'recoverAll'});
        await documentUtils.update(wardingFlare, {'system.uses.recovery': recovery});
    }
}
export const wardingFlare = {
    name: 'Warding Flare',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'nearbyAttackRollConfig',
            macro: nearbyAttack,
            priority: 200,
            distance: 30,
            dispositions: ['enemy']
        }
    ]
};
export const improvedWardingFlare = {
    name: 'Improved Warding Flare',
    version: wardingFlare.version,
    rules: wardingFlare.rules,
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ]
};
