import {actorUtils, automationUtils, documentUtils, workflowUtils} from '../../../../proxy.mjs';
async function apply({ditem, document: item, targetToken}) {
    if (!ditem.isHit || ditem.newHP !== 0 || ditem.oldHP === 0) return;
    const actor = targetToken.actor;
    if (!actorUtils.getEffectByIdentifier(actor, 'rage')) return;
    const activity = item.system.activities.getByType('save')[0];
    if (!activity) return;
    const activityWorkflow = await workflowUtils.syntheticActivityRoll(activity, [targetToken]);
    await documentUtils.update(item, {['system.activities.' + activity.id + '.save.dc.formula']: String(Number(activity.save.dc.formula) + 5)});
    if (activityWorkflow.failedSaves.size) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier');
    const classItem = actor.classes[classIdentifier];
    if (!classItem) return;
    const newHealth = classItem.system.levels * 2;
    ditem.totalDamage = ditem.oldHP - newHealth;
    ditem.newHP = newHealth;
    ditem.newTempHP = 0;
    ditem.hpDamage = ditem.totalDamage;
    ditem.damageDetail.forEach(i => i.value = 0);
    ditem.damageDetail[0].value = ditem.totalDamage;
}
async function rest({document: item}) {
    const activity = item.system.activities.getByType('save')[0];
    if (!activity) return;
    await documentUtils.update(item, {['system.activities.' + activity.id + '.save.dc.formula']: '10'});
}
export const relentlessRage = {
    name: 'Relentless Rage',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: apply,
            priority: 300
        }
    ],
    rest: [
        {
            pass: 'actorShort',
            macro: rest,
            priority: 50
        },
        {
            pass: 'actorLong',
            macro: rest,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'tuning'
        }
    }
};
