import {actorUtils, automationUtils, dialogUtils, documentUtils, queryUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
function findBards(sourceTokenDoc, configKey) {
    return tokenUtils.findNearby(sourceTokenDoc, 60, {disposition: 'enemy'}).filter(token => {
        if (MidiQOL.hasUsedReaction(token.actor)) return false;
        const cuttingWords = actorUtils.getItemByIdentifier(token.actor, 'cutting-words');
        if (!cuttingWords) return false;
        if (!automationUtils.getConfigValue(cuttingWords, configKey)) return false;
        const bardicInspiration = actorUtils.getItemByIdentifier(token.actor, 'bardic-inspiration');
        return !!bardicInspiration?.system?.uses?.value;
    });
}
async function rollCuttingWords(bardToken, targets) {
    const item = actorUtils.getItemByIdentifier(bardToken.actor, 'cutting-words');
    const userId = queryUtils.firstOwner(bardToken.actor, true);
    const result = await workflowUtils.syntheticItemRoll(item, targets, {consumeResources: true, userId});
    const total = result?.damageRolls?.[0]?.total;
    return total ? -total : undefined;
}
async function damage({workflow}) {
    if (!workflow.hitTargets.size || !workflow.damageRolls || !workflow.item || workflow.defaultDamageType === 'midi-none') return;
    if (!workflow.token) return;
    const damageTypes = workflowUtils.getDamageTypes(workflow.damageRolls);
    if (damageTypes.has('healing') || damageTypes.has('temphp')) return;
    const nearbyTokens = findBards(workflow.token.document, 'damageRollsEnabled');
    for (const token of nearbyTokens) {
        const item = actorUtils.getItemByIdentifier(token.actor, 'cutting-words');
        const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.CuttingWords.Damage', {item: item.name, name: token.name}), {userId: queryUtils.firstOwner(token.actor, true)});
        if (!selection) continue;
        let total = await rollCuttingWords(token, [workflow.token]);
        if (total === undefined) continue;
        const value = workflow.damageTotal + total;
        if (value < 0) total -= value;
        await workflowUtils.bonusDamage(workflow, String(total), {damageType: workflow.defaultDamageType, ignoreCrit: true});
        break;
    }
}
async function check({actor, roll, skillId}) {
    const targetValue = roll.options.target;
    if (!targetValue || roll.total < targetValue) return;
    const token = actorUtils.getFirstToken(actor);
    if (!token) return;
    const nearbyTokens = findBards(token.document ?? token, 'abilityChecksEnabled');
    for (const bardToken of nearbyTokens) {
        const item = actorUtils.getItemByIdentifier(bardToken.actor, 'cutting-words');
        const message = skillId ? 'CHRISPREMADES.Macros.CuttingWords.SkillCheck' : 'CHRISPREMADES.Macros.CuttingWords.AbilityCheck';
        const selection = await dialogUtils.confirm(item.name, _loc(message, {item: item.name, name: bardToken.name, total: roll.total}), {userId: queryUtils.firstOwner(bardToken.actor, true)});
        if (!selection) continue;
        const total = await rollCuttingWords(bardToken, [bardToken]);
        if (total === undefined) continue;
        return await rollUtils.addToRoll(roll, String(total), {rollData: roll.data});
    }
}
async function attack({workflow}) {
    if (!workflow.targets.size || !workflow.item || !workflowUtils.isAttackType(workflow, 'attack') || workflow.isFumble || workflow.isCritical) return;
    if (!workflow.token) return;
    if (workflow.targets.first().actor.system.attributes.ac.value > workflow.attackTotal) return;
    if (documentUtils.getIdentifier(workflow.item) === 'cutting-words') return;
    const nearbyTokens = findBards(workflow.token.document, 'attackRollsEnabled');
    for (const token of nearbyTokens) {
        const item = actorUtils.getItemByIdentifier(token.actor, 'cutting-words');
        const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.CuttingWords.Attack', {item: item.name, name: token.name, attack: workflow.attackTotal}), {userId: queryUtils.firstOwner(token.actor, true)});
        if (!selection) continue;
        const total = await rollCuttingWords(token, [workflow.token]);
        if (total === undefined) continue;
        const newRoll = await rollUtils.addToRoll(workflow.attackRoll, String(total));
        await workflow.setAttackRoll(newRoll);
        break;
    }
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'bardic-inspiration');
}
export const cuttingWords = {
    name: 'Cutting Words',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'sceneDamageRollComplete',
            macro: damage,
            priority: 250
        },
        {
            pass: 'sceneAttackRollBonuses',
            macro: attack,
            priority: 250
        }
    ],
    check: [
        {
            pass: 'sceneBonus',
            macro: check,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'sceneBonus',
            macro: check,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ],
    config: {
        damageRollsEnabled: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.CuttingWords.DamageRollsEnabled',
            category: 'behavior'
        },
        attackRollsEnabled: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.CuttingWords.AttackRollsEnabled',
            category: 'behavior'
        },
        abilityChecksEnabled: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.CuttingWords.AbilityChecksEnabled',
            category: 'behavior'
        }
    }
};
