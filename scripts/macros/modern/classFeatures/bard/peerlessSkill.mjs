import {actorUtils, automationUtils, dialogUtils, documentUtils, rollUtils, workflowUtils} from '../../../../proxy.mjs';
function getScale(item, actor) {
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'bard';
    return actor.system.scale?.[classIdentifier]?.['bardic-inspiration'] ?? actor.system.scale?.[classIdentifier]?.['inspiration'];
}
async function attackEarly({document: item, workflow}) {
    if (!workflow.targets.size || workflow.isFumble || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (workflow.targets.first().actor.system.attributes.ac.value <= workflow.attackTotal) return;
    const bardicInspiration = actorUtils.getItemByIdentifier(workflow.actor, 'bardic-inspiration');
    if (!bardicInspiration?.system?.uses?.value) return;
    const scale = getScale(item, workflow.actor);
    if (!scale) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseAttack', {itemName: item.name + ' (' + scale.formula + ')', attackTotal: workflow.attackTotal}));
    if (!selection) return;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, scale.formula);
    await workflow.setAttackRoll(newRoll);
    foundry.utils.setProperty(workflow, 'chris-premades.peerlessSkill', true);
    await workflowUtils.syntheticItemRoll(item, []);
}
async function attackLate({workflow}) {
    if (!workflow?.['chris-premades']?.peerlessSkill || !workflow.hitTargets.size || !workflowUtils.isAttackType(workflow, 'attack')) return;
    const bardicInspiration = actorUtils.getItemByIdentifier(workflow.actor, 'bardic-inspiration');
    if (!bardicInspiration) return;
    await documentUtils.update(bardicInspiration, {'system.uses.spent': bardicInspiration.system.uses.spent + 1});
}
async function checkSkill({document: item, actor, roll, options}) {
    const targetValue = roll.options.target;
    if (targetValue && roll.total >= targetValue) return;
    const bardicInspiration = actorUtils.getItemByIdentifier(actor, 'bardic-inspiration');
    if (!bardicInspiration?.system?.uses?.value) return;
    const scale = getScale(item, actor);
    if (!scale) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.UseRollTotal', {itemName: item.name + ' (' + scale.formula + ')', rollTotal: roll.total}));
    if (!selection) return;
    await workflowUtils.syntheticItemRoll(item, []);
    if (options) foundry.utils.setProperty(options, 'chris-premades.peerlessSkill', true);
    return await rollUtils.addToRoll(roll, scale.formula);
}
async function checkSkillLate({document: item, actor, roll, options}) {
    if (!options?.['chris-premades']?.peerlessSkill) return;
    const targetValue = roll.options.target;
    if (targetValue) {
        if (roll.total < targetValue) return;
    } else {
        const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.PeerlessSkill.Confirm'));
        if (!selection) return;
    }
    const bardicInspiration = actorUtils.getItemByIdentifier(actor, 'bardic-inspiration');
    if (!bardicInspiration) return;
    await documentUtils.update(bardicInspiration, {'system.uses.spent': bardicInspiration.system.uses.spent + 1});
}
export const peerlessSkill = {
    name: 'Peerless Skill',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollMissedBonuses',
            macro: attackEarly,
            priority: 200
        },
        {
            pass: 'actorRollFinished',
            macro: attackLate,
            priority: 25
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: checkSkill,
            priority: 50
        },
        {
            pass: 'actorPost',
            macro: checkSkillLate,
            priority: 50
        }
    ],
    check: [
        {
            pass: 'actorBonus',
            macro: checkSkill,
            priority: 50
        },
        {
            pass: 'actorPost',
            macro: checkSkillLate,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'bard',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
