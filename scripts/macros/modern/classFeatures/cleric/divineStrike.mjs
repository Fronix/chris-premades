import {actorUtils, automationUtils, dialogUtils, workflowUtils} from '../../../../proxy.mjs';
async function damage({document: item, workflow}) {
    if (!workflow.hitTargets.size || !workflow.activity) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!item.system.uses.value) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token?.id) return;
    const damageTypes = automationUtils.getConfigValue(item, 'damageTypes') ?? [];
    if (!damageTypes.length) return;
    const selection = await dialogUtils.selectDamageType(damageTypes, item.name, _loc('CHRISPREMADES.Generic.UseItem', {item: item.name}), {addNo: true});
    if (!selection) return;
    let baseDiceNumber = Number(automationUtils.getConfigValue(item, 'baseDiceNumber')) || 1;
    if (actorUtils.getItemByIdentifier(workflow.actor, 'improved-blessed-strikes')) baseDiceNumber += 1;
    const dieSize = automationUtils.getConfigValue(item, 'dieSize');
    await workflowUtils.bonusDamage(workflow, baseDiceNumber + dieSize, {damageType: selection});
    await workflowUtils.syntheticItemRoll(item, [], {consumeResources: true});
}
export const divineStrike = {
    name: 'Blessed Strikes: Divine Strike',
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
        damageTypes: {
            default: ['radiant', 'necrotic'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        dieSize: {
            default: 'd8',
            type: 'select',
            label: 'CHRISPREMADES.Config.DiceSize',
            category: 'tuning',
            options: () => ['d4', 'd6', 'd8', 'd10', 'd12'].map(value => ({value, label: value}))
        },
        baseDiceNumber: {
            default: 1,
            type: 'text',
            label: 'CHRISPREMADES.Config.BaseDiceNumber',
            category: 'tuning'
        }
    }
};
