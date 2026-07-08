import {actorUtils, automationUtils, dialogUtils, documentUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function early({document: item, workflow}) {
    if (!item.system.uses.value) return;
    if (!workflow.token || !workflow.targets.size || workflow.disadvantage || !workflowUtils.isAttackType(workflow, 'attack')) return;
    if (game.combat && game.combat.combatant?.tokenId !== workflow.token.id) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'reckless-attack-effect');
    if (!effect) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'barbarian';
    const classItem = workflow.actor.classes[classIdentifier];
    if (!classItem) return;
    const barbarianLevel = classItem.system.levels;
    const activityIdentifiers = ['forceful-blow', 'hamstring-blow'];
    if (barbarianLevel >= 13) activityIdentifiers.push('staggering-blow', 'sundering-blow');
    const activities = activityIdentifiers.map(identifier => item.system.activities.find(a => a.identifier === identifier)).filter(Boolean);
    if (!activities.length) return;
    let selections;
    if (barbarianLevel >= 17) {
        const selection = await dialogUtils.selectDocumentDialog(item.name, _loc('CHRISPREMADES.Macros.BrutalStrike.Choose', {item: item.name}), activities, {max: 2, checkbox: true});
        if (!selection) return;
        selections = (Array.isArray(selection) ? selection : [selection]).filter(Boolean);
        if (!selections.length) return;
    } else {
        const selection = await dialogUtils.selectDocumentDialog(item.name, _loc('CHRISPREMADES.Macros.BrutalStrike.Choose', {item: item.name}), activities, {addNoneDocument: true});
        if (!selection) return;
        selections = [selection];
    }
    await documentUtils.update(item, {'system.uses.spent': item.system.uses.spent + 1});
    foundry.utils.setProperty(workflow, 'chris-premades.brutalStrike', selections.map(activity => documentUtils.getIdentifier(activity)));
    workflow.advantage = false;
}
async function damage({document: item, workflow}) {
    if (!workflow.targets.size) return;
    if (!workflow['chris-premades']?.brutalStrike) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'barbarian';
    const classItem = workflow.actor.classes[classIdentifier];
    if (!classItem) return;
    const formula = (classItem.system.levels >= 17 ? 2 : 1) + 'd10';
    await workflowUtils.bonusDamage(workflow, formula, {damageType: workflow.defaultDamageType});
}
async function late({document: item, workflow}) {
    if (!workflow.hitTargets.size) return;
    const activityIdentifiers = workflow['chris-premades']?.brutalStrike;
    if (!activityIdentifiers) return;
    for (const identifier of activityIdentifiers) {
        const activity = item.system.activities.find(a => a.identifier === identifier);
        if (!activity) continue;
        await workflowUtils.syntheticActivityRoll(activity, [workflow.targets.first()]);
    }
}
async function forcefulBlow({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'forceful-blow') return;
    if (!workflow.token || !workflow.targets.size) return;
    const target = workflow.targets.first();
    await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token.document, distance: 15});
}
async function sunderingBlowAttacked({document: effect, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!effect.origin) return;
    const origin = await fromUuid(effect.origin);
    const originActor = origin?.actor ?? origin?.parent;
    if (!originActor) return;
    if (workflow.actor.id === originActor.id) return;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, '5');
    await workflow.setAttackRoll(newRoll);
    await documentUtils.deleteDocument(effect);
}
export const brutalStrike = {
    name: 'Brutal Strike',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: forcefulBlow,
            priority: 50
        },
        {
            pass: 'actorAttackRollConfig',
            macro: early,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        },
        {
            pass: 'actorRollFinished',
            macro: late,
            priority: 250
        }
    ],
    config: {
        classIdentifier: {
            default: 'barbarian',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
export const sunderingBlow = {
    name: 'Sundering Blow',
    version: brutalStrike.version,
    rules: brutalStrike.rules,
    roll: [
        {
            pass: 'targetAttackRollBonuses',
            macro: sunderingBlowAttacked,
            priority: 50
        }
    ]
};
