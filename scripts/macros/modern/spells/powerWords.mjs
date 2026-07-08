import {actorUtils, automationUtils, dialogUtils, documentUtils, queryUtils} from '../../../proxy.mjs';
async function killDamage({document: item, workflow, ditem}) {
    if (!ditem.isHit) return;
    const maxHP = Number(automationUtils.getConfigValue(item, 'hp')) || 100;
    if (ditem.oldHP > maxHP) return;
    ditem.totalDamage = 10000;
    ditem.hpDamage = ditem.oldHP + (ditem.newTempHP ?? 0);
    ditem.tempDamage = ditem.newTempHP ?? 0;
    ditem.newTempHP = 0;
    ditem.newHP = 0;
    if (ditem.damageDetail?.[0]) ditem.damageDetail[0].value = 10000;
}
export const powerWordKill = {
    name: 'Power Word Kill',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemDamage',
            macro: killDamage,
            priority: 50
        }
    ],
    config: {
        hp: {
            default: 100,
            type: 'text',
            label: 'CHRISPREMADES.Config.HitPoints',
            category: 'tuning'
        }
    }
};
async function healUse({workflow}) {
    if (!workflow.targets.size) return;
    const validConditions = automationUtils.getConfigValue(workflow.item, 'conditions') ?? ['charmed', 'frightened', 'paralyzed', 'poisoned', 'stunned'];
    for (const token of workflow.targets) {
        const removeIds = Array.from(token.actor.statuses)
            .filter(status => validConditions.includes(status))
            .map(status => actorUtils.getEffectByStatusID(token.actor, status))
            .filter(Boolean)
            .map(effect => effect.id);
        if (removeIds.length) await documentUtils.deleteEmbeddedDocuments(token.actor, 'ActiveEffect', removeIds);
        if (token.actor.statuses.has('prone') && !MidiQOL.hasUsedReaction(token.actor)) {
            const selection = await dialogUtils.confirm(workflow.item.name, _loc('CHRISPREMADES.Macros.PowerWordHeal.Prone'), {userId: queryUtils.firstOwner(token.actor, true)});
            if (selection) {
                const effect = actorUtils.getEffectByStatusID(token.actor, 'prone');
                if (effect) await documentUtils.deleteDocument(effect);
                await MidiQOL.setReactionUsed(token.actor);
            }
        }
    }
}
export const powerWordHeal = {
    name: 'Power Word Heal',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: healUse,
            priority: 50
        }
    ],
    config: {
        conditions: {
            default: ['charmed', 'frightened', 'paralyzed', 'poisoned', 'stunned'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'behavior',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name}))
        }
    }
};
