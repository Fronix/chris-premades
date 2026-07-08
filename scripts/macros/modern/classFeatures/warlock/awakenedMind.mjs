import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const target = workflow.targets.first();
    if (!target) return;
    let failedSave = false;
    const clairvoyant = actorUtils.getItemByIdentifier(workflow.actor, 'clairvoyant-combatant');
    const useClairvoyant = clairvoyant?.system.activities.find(a => a.identifier === 'use');
    if (useClairvoyant && clairvoyant.system.uses.value && await dialogUtils.confirmUseItem(clairvoyant)) {
        const featureRoll = await workflowUtils.syntheticActivityRoll(useClairvoyant, [target], {consumeUsage: true, consumeResources: true});
        failedSave = (featureRoll?.failedSaves?.size ?? 0) > 0;
    }
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'awakened-mind'
            },
            dae: {
                stackable: 'noneName'
            }
        }
    };
    const sourceEffects = await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
    const targetEffectData = foundry.utils.duplicate(effectData);
    if (failedSave) {
        targetEffectData.system = {
            changes: [
                {key: 'flags.midi-qol.disadvantage.attack.all', type: 'override', value: 'targetId === "' + workflow.token.id + '"', phase: 'initial', priority: 20},
                {key: 'flags.midi-qol.grants.advantage.attack.all', type: 'override', value: 'targetId === "' + workflow.token.id + '"', phase: 'initial', priority: 20}
            ]
        };
    }
    const created = await effectUtils.createEffects(target.actor, [targetEffectData], {rules: '2024'});
    if (sourceEffects?.[0] && created?.length) await documentUtils.makeDependent(sourceEffects[0], created);
}
export const awakenedMind = {
    name: 'Awakened Mind',
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
