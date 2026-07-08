import {dialogUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {automationUtils} from '../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../lib/spellUtils.mjs';
import {wildShape} from '../classFeatures/druid/wildShape.mjs';
async function gauntletDamage({document: item, workflow}) {
    if (!item.system.equipped || !item.system.uses.value) return;
    if (!workflow.hitTargets.size || !workflowUtils.isAttackType(workflow, 'meleeAttack') || !workflow.token) return;
    if (workflow.item?.actor !== item.actor) return;
    const selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    const formula = automationUtils.getConfigValue(item, 'formula') || '2d6';
    const damageType = automationUtils.getConfigValue(item, 'damageType') || 'force';
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
    workflowUtils.setWorkflowProperty(workflow, 'forceGauntlet', true);
}
async function gauntletUsed({document: item, workflow}) {
    if (!workflowUtils.getWorkflowProperty(workflow, 'forceGauntlet') || !workflow.targets.size) return;
    const target = workflow.targets.first();
    const sizes = Object.keys(CONFIG.DND5E.actorSizes);
    const sourceIndex = sizes.indexOf(workflow.actor.system.traits.size);
    const targetIndex = sizes.indexOf(target.actor.system.traits.size);
    const autoFail = targetIndex - 2 >= sourceIndex;
    if (autoFail) {
        const effectData = {
            name: _loc('CHRISPREMADES.GenericEffects.InvalidTarget'),
            img: 'icons/magic/time/arrows-circling-green.webp',
            type: 'base',
            origin: item.uuid,
            duration: {turns: 1},
            system: {
                changes: [
                    {key: 'flags.midi-qol.min.ability.save.all', type: 'override', value: 99, phase: 'initial', priority: 120}
                ]
            },
            flags: {
                dae: {
                    specialDuration: ['isSave']
                }
            }
        };
        await effectUtils.createEffects(target.actor, [effectData]);
    }
    const targetWorkflow = await workflowUtils.completeItemUse(item, [target], {consumeUsage: true});
    if (!targetWorkflow) return;
    if (targetWorkflow.failedSaves?.size) {
        await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token, distance: 10});
    } else {
        await tokenUtils.slideToken(workflow.token.document ?? workflow.token, {sourceToken: target, distance: 10});
    }
}
export const forceGauntlet = {
    name: 'Force Gauntlet',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: gauntletDamage,
            priority: 150
        },
        {
            pass: 'actorRollFinished',
            macro: gauntletUsed,
            priority: 150
        }
    ],
    config: {
        formula: {
            default: '2d6',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'force',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
async function maskAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'wild-shape');
}
export const maskOfMonstrousForms = {
    name: 'Mask of Monstrous Forms',
    version: '2.0.0',
    rules: '2024',
    roll: wildShape.roll,
    item: [
        {
            pass: 'created',
            macro: maskAdded,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: maskAdded,
            priority: 55
        }
    ]
};
