import {activityUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'armor-of-agathys'
            },
            'chris-premades': {
                castLevel: getCastLevel(workflow)
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'armor-of-agathys-armor'}]}]
    });
}
async function hit({document: effect, workflow, ditem}) {
    if (!ditem.isHit || !workflow.activity) return;
    if (workflow.item?.uuid === effect.origin) return;
    if (ditem.newTempHP === 0) await documentUtils.deleteDocument(effect);
    if (!workflowUtils.isAttackType(workflow, 'meleeAttack')) return;
    if (!workflow.token) return;
    const originItem = await fromUuid(effect.origin);
    const feature = originItem?.system.activities.find(a => a.identifier === 'armor-of-agathys-reflect');
    if (!feature) return;
    const castLevel = effect.flags['chris-premades']?.castLevel ?? 1;
    const activityData = activityUtils.getDamageModifiedActivityData(feature, castLevel * 5, {types: ['cold']});
    await workflowUtils.syntheticActivityDataRoll(activityData, originItem, [workflow.token]);
}
export const armorOfAgathys = {
    name: 'Armor of Agathys',
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
export const armorOfAgathysArmor = {
    name: armorOfAgathys.name,
    version: armorOfAgathys.version,
    rules: armorOfAgathys.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: hit,
            priority: 300
        }
    ]
};
