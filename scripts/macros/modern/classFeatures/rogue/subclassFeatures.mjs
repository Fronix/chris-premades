import {actorUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
async function ambushCast({document: item, workflow}) {
    if (!workflow.targets.size || !workflow.item) return;
    if (workflow.item.type !== 'spell') return;
    if (!workflow.actor.statuses.has('invisible')) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token?.id) return;
    await workflowUtils.syntheticItemRoll(item, []);
    const sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = {seconds: 1};
    effectData.name += ': ' + workflow.item.name;
    foundry.utils.setProperty(effectData, 'flags.chris-premades.magicalAmbush.spellUuid', workflow.item.uuid);
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'magical-ambush-effect');
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [effectData]);
    }
}
async function ambushSave({actor, config}) {
    const effects = actorUtils.getEffects(actor).filter(effect => documentUtils.getIdentifier(effect) === 'magical-ambush-effect');
    for (const effect of effects) {
        const spellUuid = effect.flags['chris-premades']?.magicalAmbush?.spellUuid;
        if (!spellUuid) continue;
        if (spellUuid !== config?.midiOptions?.itemUuid) continue;
        config.disadvantage = true;
        break;
    }
}
export const magicalAmbush = {
    name: 'Magical Ambush',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: ambushCast,
            priority: 100
        }
    ],
    save: [
        {
            pass: 'targetSituational',
            macro: ambushSave,
            priority: 50
        }
    ]
};
async function envenomEarly({document: item, workflow}) {
    const sourceEffect = documentUtils.getEffectByIdentifier(workflow.item, 'envenom-weapons-effect') ?? item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    const effects = [];
    for (const token of workflow.targets) {
        const created = await effectUtils.createEffects(token.actor, [effectData]);
        if (created?.length) effects.push(...created);
    }
    foundry.utils.setProperty(workflow, 'chris-premades.envenomWeapons.effectUuids', effects.map(effect => effect.uuid));
}
async function envenomLate({workflow}) {
    const effectUuids = workflow['chris-premades']?.envenomWeapons?.effectUuids;
    if (!effectUuids) return;
    for (const uuid of effectUuids) {
        const effect = await fromUuid(uuid);
        if (effect) await documentUtils.deleteDocument(effect);
    }
}
async function poisonTurnEnd({document: effect, token}) {
    const item = await fromUuid(effect.origin);
    if (!item?.actor) return;
    const itemData = item.toObject();
    const firstActivity = item.system.activities.contents[0];
    if (firstActivity) itemData.system.activities[firstActivity.id].effectConditionText = 'false';
    const workflow = await workflowUtils.syntheticItemDataRoll(itemData, item.actor, [token]);
    if (workflow?.failedSaves?.size) return;
    await documentUtils.deleteDocument(effect);
}
export const envenomWeapons = {
    name: 'Envenom Weapons',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: envenomEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: envenomLate,
            priority: 50
        }
    ]
};
export const envenomPoison = {
    name: 'Envenom Poison',
    version: envenomWeapons.version,
    rules: envenomWeapons.rules,
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: poisonTurnEnd,
            priority: 50
        }
    ]
};
