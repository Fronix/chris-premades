import {actorUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function mageHand({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'mage-hand') return;
    if (!workflow.targets.size || !workflow.token) return;
    const raging = actorUtils.getEffectByIdentifier(workflow.actor, 'rage');
    const distance = raging ? 10 : 5;
    const target = workflow.targets.first();
    await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token, distance});
}
async function shockingGrasp({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'shocking-grasp') return;
    if (!workflow.targets.size) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    const raging = actorUtils.getEffectByIdentifier(workflow.actor, 'rage');
    effectData.duration = raging ? {rounds: 2} : {turns: 1};
    effectData.origin = workflow.item.uuid;
    await effectUtils.createEffects(workflow.targets.first().actor, [effectData]);
}
async function damage({document: item, workflow}) {
    if (workflow.item?.actor !== item.actor) return;
    if (!workflow.hitTargets.size || !workflow.activity) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token?.id) return;
    if (workflow.activity.ability !== 'str') return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!item.system.uses.value) return;
    const mageHandActivity = item.system.activities.find(a => a.identifier === 'mage-hand');
    const shockingGraspActivity = item.system.activities.find(a => a.identifier === 'shocking-grasp');
    const trueStrikeActivity = item.system.activities.find(a => a.identifier === 'true-strike');
    if (!shockingGraspActivity || !trueStrikeActivity || !mageHandActivity) return;
    const target = workflow.hitTargets.first();
    const sizes = Object.keys(CONFIG.DND5E.actorSizes);
    const activities = [shockingGraspActivity, trueStrikeActivity];
    if (sizes.indexOf(target.actor.system.traits.size) <= 3) activities.unshift(mageHandActivity);
    const buttons = activities.map(activity => [activity.name, activity.id]);
    buttons.push(['CHRISPREMADES.Generic.No', false]);
    const selection = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), buttons);
    if (!selection) return;
    const activity = item.system.activities.get(selection);
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [target.object ?? target], {consumeUsage: true});
    if (activity.identifier !== 'true-strike') return;
    let formula = '1d6';
    if (actorUtils.getEffectByIdentifier(workflow.actor, 'rage')) {
        const levels = workflow.actor.classes.barbarian?.system?.levels;
        if (levels) formula += ' + ' + Math.floor(levels / 2);
    }
    await workflowUtils.bonusDamage(workflow, formula);
}
export const cantrips = {
    name: '"Cantrips"',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: mageHand,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: shockingGrasp,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ]
};
export const unarguableWizardry = {
    name: 'Unarguable Wizardry',
    version: '2.0.0',
    rules: '2024'
};
