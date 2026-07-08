import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
import {unarmedAttackIdentifiers} from '../../../lib/monkUtils.mjs';
async function hit({document: item, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (!item.system.uses.value) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    const martialArts = actorUtils.getItemByIdentifier(workflow.actor, 'martial-arts');
    if (!martialArts) return;
    if (automationUtils.getConfigValue(martialArts, 'validateWeaponType')) {
        const isNatural = workflow.item.system.type.value === 'natural';
        const isUnarmed = unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item));
        if (!isUnarmed && isNatural) return;
        if (['martialM', 'martialR'].includes(workflow.item.system.type.value) && !workflow.item.system.properties.has('lgt')) return;
    }
    const confirmed = await dialogUtils.confirmUseItem(item);
    if (!confirmed) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.hitTargets.first()], {consumeResources: true, consumeUsage: true});
}
async function use({workflow}) {
    if (workflow.failedSaves.size) return;
    const slow = documentUtils.getEffectByIdentifier(workflow.item, 'stunning-strike-slow');
    const advantage = documentUtils.getEffectByIdentifier(workflow.item, 'stunning-strike-advantage');
    if (!slow || !advantage) return;
    const duration = activityUtils.getEffectDuration(workflow.activity);
    const effectDatas = [advantage, slow].map(effect => {
        const data = effect.toObject();
        delete data._id;
        data.origin = effect.uuid;
        data.duration = duration;
        return data;
    });
    for (const token of workflow.targets) {
        if (workflow.failedSaves.has(token)) continue;
        await effectUtils.createEffects(token.actor, effectDatas);
    }
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'monks-focus');
}
export const stunningStrike = {
    name: 'Stunning Strike',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'actorRollFinished',
            macro: hit,
            priority: 250
        }
    ],
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 55
        }
    ]
};
