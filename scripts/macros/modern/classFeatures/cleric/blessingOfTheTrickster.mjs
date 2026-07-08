import {activityUtils, documentUtils, effectUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const target = workflow.targets.first()?.actor ?? workflow.actor;
    const previousUuid = workflow.item.flags['chris-premades']?.blessingOfTheTrickster?.targetUuid;
    if (previousUuid) {
        const previous = await fromUuid(previousUuid);
        if (previous) await documentUtils.deleteDocument(previous);
    }
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const created = await effectUtils.createEffects(target, [effectData], {rules: '2024'});
    if (created?.length) await documentUtils.update(workflow.item, {'flags.chris-premades.blessingOfTheTrickster.targetUuid': created[0].uuid});
}
export const blessingOfTheTrickster = {
    name: 'Blessing of the Trickster',
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
