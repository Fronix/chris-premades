import {activityUtils, actorUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    if (documentUtils.getIdentifier(workflow.activity) === 'sanctuary-save') return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'sanctuary-safe'
            }
        }
    };
    for (const target of workflow.targets) {
        await effectUtils.createEffects(target.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'sanctuary-safe'}]}]
        });
    }
}
async function attack({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'sanctuary-save') return;
    let remove = false;
    remove ||= workflow.damageRoll && !(workflow.defaultDamageType === 'healing' || workflow.defaultDamageType === 'temphp');
    remove ||= workflowUtils.isAttackType(workflow, 'attack');
    remove ||= workflow.item?.type === 'spell';
    if (!remove) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'sanctuary-safe');
    if (effect) await documentUtils.deleteDocument(effect);
}
async function targeted({document: effect, workflow}) {
    if (workflow.targets.size !== 1) return;
    if (Object.keys(CONFIG.DND5E.areaTargetTypes).includes(workflow.item.system.target?.type)) return;
    if (workflow.item.system.type?.value === 'spellFeature') return;
    const targetToken = workflow.targets.first();
    if (targetToken.document.disposition === workflow.token.document.disposition) return;
    const originItem = await fromUuid(effect.origin);
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'sanctuary-save');
    if (!feature) return;
    const saveWorkflow = await workflowUtils.syntheticActivityRoll(feature, [workflow.token]);
    if (!saveWorkflow?.failedSaves?.size) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: workflow.actor}),
        content: _loc('CHRISPREMADES.Macros.Sanctuary.Failed')
    });
    workflow.aborted = true;
}
export const sanctuary = {
    name: 'Sanctuary',
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
export const sanctuarySafe = {
    name: 'Sanctuary: Safe',
    version: sanctuary.version,
    rules: sanctuary.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: attack,
            priority: 50
        },
        {
            pass: 'targetPreItemRoll',
            macro: targeted,
            priority: 50
        }
    ]
};
