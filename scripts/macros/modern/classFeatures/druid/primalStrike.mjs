import {automationUtils, dialogUtils, workflowUtils} from '../../../../proxy.mjs';
async function damage({document: item, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (workflow.activity?.type !== 'attack') return;
    if (workflow.item.type !== 'weapon' && workflow.item.system.type?.value !== 'monster') return;
    if (!item.system.uses.value) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token?.id) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'druid';
    const bonusFormula = workflow.actor.system.scale?.[classIdentifier]?.['elemental-fury']?.formula ?? '1d8';
    const damageTypes = automationUtils.getConfigValue(item, 'damageTypes') ?? ['cold', 'fire', 'lightning', 'thunder'];
    const selection = await dialogUtils.selectDamageType(damageTypes, workflow.item.name, _loc('CHRISPREMADES.Dialog.UseWeaponDamageExtra', {itemName: item.name, bonusFormula}), {addNo: true});
    if (!selection || selection === 'no') return;
    await workflowUtils.bonusDamage(workflow, bonusFormula, {damageType: selection});
    await workflowUtils.completeActivityUse(item.system.activities.contents[0], [], {consumeUsage: true});
}
export const elementalFuryPrimalStrike = {
    name: 'Elemental Fury: Primal Strike',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'druid',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        },
        damageTypes: {
            default: ['cold', 'fire', 'lightning', 'thunder'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    },
    scales: [
        {
            identifier: 'elemental-fury',
            classIdentifier: 'druid',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'elemental-fury',
                    type: 'dice',
                    scale: {
                        7: {number: 1, faces: 8, modifiers: []},
                        15: {number: 2, faces: 8, modifiers: []}
                    }
                },
                value: {},
                title: 'Elemental Fury'
            }
        }
    ]
};
