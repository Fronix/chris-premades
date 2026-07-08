import {documentUtils, effectUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const sourceData = {
        name: _loc('CHRISPREMADES.Auras.Source', {auraName: workflow.item.name}),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: 'gift-of-the-protectors-source'
            },
            dae: {
                stackable: 'noneName'
            }
        }
    };
    const sources = await effectUtils.createEffects(workflow.actor, [sourceData], {rules: '2024'});
    const source = sources?.[0];
    const targetData = foundry.utils.duplicate(sourceData);
    targetData.name = workflow.item.name;
    targetData.flags.cat.identifier = 'gift-of-the-protectors-target';
    for (const target of workflow.targets) {
        const created = await effectUtils.createEffects(target.actor, [targetData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'gift-of-the-protectors-protected'}]}]
        });
        if (source && created?.length) await documentUtils.makeDependent(source, created);
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
    const item = await fromUuid(effect.origin);
    await documentUtils.deleteDocument(effect);
    await item?.displayCard();
}
export const giftOfTheProtectors = {
    name: 'Eldritch Invocations: Gift of the Protectors',
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
export const giftOfTheProtectorsProtected = {
    name: 'Gift of the Protectors: Protected',
    version: giftOfTheProtectors.version,
    rules: giftOfTheProtectors.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 240
        }
    ]
};
