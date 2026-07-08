import {dialogUtils, queryUtils, workflowUtils} from '../../../proxy.mjs';
async function damageApplication({document: item, workflow, ditem}) {
    if (ditem.newHP || !ditem.oldHP) return;
    if (!item.system.uses.value) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {userId: queryUtils.firstOwner(item.actor, true)});
    if (!selection) return;
    await workflowUtils.completeItemUse(item, [], {consumeUsage: true});
    const reduction = ditem.oldHP - 1;
    ditem.totalDamage = reduction;
    ditem.hpDamage = reduction;
    ditem.newHP = 1;
    ditem.newTempHP = 0;
    ditem.damageDetail.forEach(detail => detail.value = 0);
    if (ditem.damageDetail[0]) ditem.damageDetail[0].value = reduction;
}
export const relentlessEndurance = {
    name: 'Relentless Endurance',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: damageApplication,
            priority: 50
        }
    ]
};
export const dreadfulStrikes = {
    name: 'Dreadful Strikes',
    version: '2.0.0',
    rules: '2024',
    config: {
        subclassIdentifier: {
            default: 'fey-wanderer',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'dreadful-strikes',
            classIdentifier: 'fey-wanderer',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'dreadful-strikes',
                    type: 'dice',
                    distance: {
                        units: ''
                    },
                    scale: {
                        3: {number: 1, faces: 4, modifiers: []},
                        11: {number: 1, faces: 6, modifiers: []}
                    }
                },
                value: {},
                title: 'Dreadful Strikes'
            }
        }
    ]
};
