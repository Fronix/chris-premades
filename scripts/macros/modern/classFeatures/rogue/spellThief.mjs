import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils, queryUtils, workflowUtils} from '../../../../proxy.mjs';
async function targeted({workflow}) {
    if (!workflow.targets.size || workflow.item?.type !== 'spell') return;
    const removeTargets = [];
    for (const token of workflow.targets) {
        const item = actorUtils.getItemByIdentifier(token.actor, 'spell-thief');
        if (!item?.system?.uses?.value) continue;
        if (MidiQOL.hasUsedReaction(token.actor)) continue;
        const userId = queryUtils.firstOwner(token.actor, true);
        const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {userId});
        if (!selection) continue;
        const targetWorkflow = await workflowUtils.syntheticItemRoll(item, [workflow.token], {userId, consumeResources: true, consumeUsage: true});
        if (!targetWorkflow?.failedSaves?.size) continue;
        removeTargets.push(token);
        if (!workflow.item.system.level) continue;
        const spellLevelSlot = token.actor.system.spells?.['spell' + workflow.item.system.level];
        if (!spellLevelSlot?.max) continue;
        const sourceEffect = item.effects.contents?.[0];
        if (!sourceEffect) continue;
        const activity = item.system.activities.find(a => a.identifier === 'use');
        if (!activity) continue;
        const effectData = sourceEffect.toObject();
        delete effectData._id;
        effectData.duration = activityUtils.getEffectDuration(activity);
        const created = await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
        const itemData = workflow.item.toObject();
        delete itemData._id;
        itemData.system.method = 'spell';
        itemData.system.prepared = 1;
        const items = await documentUtils.createEmbeddedDocuments(token.actor, 'Item', [itemData]);
        if (created?.[0] && items?.length) await documentUtils.makeDependent(created[0], items);
        const enchantData = {
            name: item.name,
            img: item.img,
            type: 'enchantment',
            origin: item.uuid,
            duration: activityUtils.getEffectDuration(activity),
            system: {
                changes: [
                    {key: 'system.prepared', type: 'override', value: 0, phase: 'final', priority: 20},
                    {key: 'system.method', type: 'override', value: 'spell', phase: 'final', priority: 20},
                    {key: 'name', type: 'override', value: '{} (' + _loc('CHRISPREMADES.Generic.Disabled') + ')', phase: 'final', priority: 20}
                ]
            }
        };
        const enchantments = await documentUtils.createEmbeddedDocuments(workflow.item, 'ActiveEffect', [enchantData]);
        if (created?.[0] && enchantments?.length) await documentUtils.makeDependent(created[0], enchantments);
    }
    if (removeTargets.length) {
        const remaining = Array.from(workflow.targets).filter(token => !removeTargets.includes(token));
        game.user.updateTokenTargets(remaining.map(token => token.id ?? token.document?.id).filter(Boolean));
        workflow.targets = new Set(remaining);
    }
}
export const spellThief = {
    name: 'Spell Thief',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetPreambleComplete',
            macro: targeted,
            priority: 100
        }
    ]
};
