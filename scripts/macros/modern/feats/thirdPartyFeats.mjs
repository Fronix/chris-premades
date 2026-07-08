import {actorUtils, dialogUtils, documentUtils, queryUtils, workflowUtils} from '../../../proxy.mjs';
async function giveInspiration(actor) {
    await documentUtils.update(actor, {'system.attributes.inspiration': true});
}
async function betBig(item, token) {
    const activity = item.system.activities.find(a => a.identifier === 'bet-big');
    if (!activity || !token) return;
    await workflowUtils.syntheticActivityRoll(activity, [token.object ?? token]);
}
async function fateGamblerAttack({document: item, workflow}) {
    if (workflow.actor.system.attributes.inspiration) return;
    if (workflow.item?.actor !== item.actor) return;
    const killed = (workflow.damageList ?? []).find(entry => {
        if (entry.newHP !== 0 || entry.oldHP === 0) return false;
        const actor = fromUuidSync(entry.actorUuid);
        return !!actor?.system.details?.cr;
    });
    const failedCR = workflow.failedSaves?.size ? Array.from(workflow.failedSaves).some(token => token.actor?.system.details?.cr) : false;
    if (!killed && !failedCR) return;
    await giveInspiration(workflow.actor);
    await betBig(item, workflow.token);
}
async function fateGamblerHeal({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'heal') return;
    await documentUtils.update(workflow.actor, {'system.attributes.inspiration': false});
}
async function fateGamblerSkill({document: item, actor}) {
    const owner = actor ?? item.actor;
    if (!owner || owner.system.attributes.inspiration) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.FateGambler.SkillOrAbility'));
    if (!selection) return;
    await giveInspiration(owner);
    await betBig(item, actorUtils.getFirstToken(owner));
}
export const fateGambler = {
    name: 'Fate Gambler',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: fateGamblerAttack,
            priority: 250
        },
        {
            pass: 'itemRollFinished',
            macro: fateGamblerHeal,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorPost',
            macro: fateGamblerSkill,
            priority: 50
        }
    ],
    check: [
        {
            pass: 'actorPost',
            macro: fateGamblerSkill,
            priority: 50
        }
    ]
};
function makeShakeOff(statusId, activityIdentifier) {
    async function turnStart({document: item}) {
        if (!item.actor?.statuses.has(statusId)) return;
        const activity = item.system.activities.find(a => a.identifier === activityIdentifier);
        if (!activity) return;
        await workflowUtils.syntheticActivityRoll(activity, []);
    }
    async function use({workflow}) {
        if (documentUtils.getIdentifier(workflow.activity) !== activityIdentifier) return;
        const effect = workflow.actor.effects.find(e => e.statuses.has(statusId));
        if (!effect || (workflow.utilityRolls?.[0]?.total ?? 0) < 10) return;
        await documentUtils.deleteDocument(effect);
    }
    return {turnStart, use};
}
const foughtHandlers = makeShakeOff('frightened', 'frightened');
async function defiantStrike({document: item, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (workflow.item?.actor !== item.actor) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (Math.floor(workflow.actor.system.attributes.hp.pct) > 50) return;
    const activity = item.system.activities.find(a => a.identifier === 'defiant-strike');
    if (!activity?.item?.system.uses.value) return;
    const selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    for (let i = 0; i < workflow.damageRolls.length; i++) {
        workflow.damageRolls[i] = await workflow.damageRolls[i].reroll({maximize: true});
    }
    await workflow.setDamageRolls(workflow.damageRolls);
    await workflowUtils.syntheticActivityRoll(activity, [workflow.token], {consumeUsage: true});
}
export const iFoughtILived = {
    name: 'I Fought, I Lived',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: foughtHandlers.use,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: defiantStrike,
            priority: 900
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: foughtHandlers.turnStart,
            priority: 50
        }
    ]
};
const piercedHandlers = makeShakeOff('charmed', 'charmed');
async function insight({trigger}) {
    if (trigger?.skillId !== 'ins') return;
    return {label: _loc('CHRISPREMADES.Macros.IPiercedTheIllusion.Insight'), type: 'advantage'};
}
export const iPiercedTheIllusion = {
    name: 'I Pierced the Illusion',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: piercedHandlers.use,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnStart',
            macro: piercedHandlers.turnStart,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorContext',
            macro: insight,
            priority: 50
        }
    ]
};
const survivedHandlers = makeShakeOff('grappled', 'grappled');
async function survive({document: item, workflow, ditem}) {
    if (!ditem.isHit || ditem.newHP !== 0 || ditem.oldHP === 0) return;
    const activity = item.system.activities.find(a => a.identifier === 'survive');
    if (!activity || !item.system.uses.value) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {userId: queryUtils.firstOwner(item.actor, true)});
    if (!selection) return;
    const token = actorUtils.getFirstToken(item.actor);
    if (!token) return;
    if (actorUtils.checkTrait?.(item.actor, 'ci', 'healing')) return;
    let level = item.actor.system.details.level;
    if (actorUtils.checkTrait?.(item.actor, 'dr', 'healing')) level = Math.floor(level / 2);
    ditem.totalDamage = ditem.oldHP - level;
    ditem.newHP = level;
    ditem.newTempHP = 0;
    ditem.hpDamage = ditem.totalDamage;
    ditem.damageDetail.forEach(detail => detail.value = 0);
    if (ditem.damageDetail[0]) ditem.damageDetail[0].value = ditem.totalDamage;
    await workflowUtils.syntheticActivityRoll(activity, [token], {consumeUsage: true});
}
export const iSurvivedToTellTheTale = {
    name: 'I Survived to Tell the Tale',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: survivedHandlers.use,
            priority: 50
        },
        {
            pass: 'targetDamageComplete',
            macro: survive,
            priority: 250
        }
    ]
};
export const sangromanticInitiate = {
    name: 'Sangromantic Initiate',
    version: '2.0.1',
    rules: '2024',
    config: {
        diceSize: {
            default: 'd12',
            type: 'text',
            label: 'CHRISPREMADES.Config.DiceSize',
            category: 'tuning'
        }
    }
};
