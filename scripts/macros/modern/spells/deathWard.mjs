import {activityUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'death-ward-target'
            }
        }
    };
    for (const target of workflow.targets) {
        await effectUtils.createEffects(target.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'death-ward-warded'}]}]
        });
    }
}
async function damageApplication({document: effect, ditem}) {
    if (ditem.newHP > 0 || !ditem.isHit) return;
    ditem.totalDamage = ditem.oldHP - 1;
    ditem.newHP = 1;
    ditem.newTempHP = 0;
    ditem.hpDamage = ditem.totalDamage;
    ditem.damageDetail.forEach(detail => detail.value = 0);
    ditem.damageDetail[0].value = ditem.totalDamage;
    await documentUtils.deleteDocument(effect);
}
export const deathWard = {
    name: 'Death Ward',
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
export const deathWardWarded = {
    name: 'Death Ward: Warded',
    version: deathWard.version,
    rules: deathWard.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 250
        }
    ]
};
