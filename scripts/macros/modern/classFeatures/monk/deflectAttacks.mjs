import {activityUtils, actorUtils, dialogUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function damageApplication({document: item, workflow, ditem}) {
    if (ditem.newHP === ditem.oldHP || !ditem.isHit) return;
    if (MidiQOL.hasUsedReaction(item.actor)) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    let damageTypes = workflowUtils.getDamageTypes(workflow.damageRolls);
    const deflectEnergy = actorUtils.getItemByIdentifier(item.actor, 'deflect-energy');
    if (!deflectEnergy) {
        damageTypes = new Set(['bludgeoning', 'piercing', 'slashing']).intersection(damageTypes);
        if (!damageTypes.size) return;
    }
    const userId = queryUtils.firstOwner(item.actor, true);
    const confirmed = await dialogUtils.confirmUseItem(item, {userId});
    if (!confirmed) return;
    const reduceActivity = item.system.activities.find(a => a.identifier === 'use');
    if (!reduceActivity) return;
    const targetWorkflow = await workflowUtils.syntheticActivityRoll(reduceActivity, [workflow.hitTargets.first()], {userId});
    let reduction = targetWorkflow?.utilityRolls?.[0]?.total ?? 0;
    if (!reduction) return;
    const originalDetail = foundry.utils.deepClone(ditem.damageDetail);
    for (const detail of originalDetail) {
        const multiplier = detail.active?.multiplier ?? 1;
        if (detail.active?.immunity || multiplier === 0) continue;
        if (!damageTypes.has(detail.type)) continue;
        const distributed = Math.min(detail.damage ?? detail.value, reduction);
        workflowUtils.modifyDamageAppliedFlat(ditem, -Math.ceil(distributed * multiplier), {type: detail.type, multiplier});
        reduction -= distributed;
        if (reduction <= 0) break;
    }
    if (ditem.newHP !== ditem.oldHP) return;
    const monksFocus = actorUtils.getItemByIdentifier(item.actor, 'monks-focus');
    if (!monksFocus?.system?.uses?.value) return;
    const range = workflowUtils.isAttackType(workflow, 'meleeAttack') ? 5 : 60;
    const firstTarget = workflow.hitTargets.first();
    const nearby = tokenUtils.findNearby(firstTarget.document ?? firstTarget, range, {disposition: 'all', includeIncapacitated: true});
    if (!nearby.length) return;
    const targetSelection = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.DeflectAttacks.UseAndTarget'), nearby, {skipDeadAndUnconscious: false, userId});
    if (!targetSelection?.[0]) return;
    const saveActivity = item.system.activities.find(a => a.identifier === 'save');
    if (!saveActivity) return;
    const activityData = activityUtils.getDamageModifiedActivityData(saveActivity, '', {types: [workflow.defaultDamageType]});
    await workflowUtils.syntheticActivityDataRoll(activityData, item, [targetSelection[0]], {userId, consumeResources: true, consumeUsage: true});
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['save'], 'monks-focus');
}
export const deflectAttacks = {
    name: 'Deflect Attacks',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 100
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
