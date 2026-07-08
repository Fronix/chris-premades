import {actorUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function ghoulClawUse({workflow}) {
    if (!workflow.hitTargets.size) return;
    const validTargets = Array.from(workflow.hitTargets).filter(token => {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        if (type === 'undead') return false;
        const species = token.actor.system.details?.type?.subtype ?? type ?? '';
        return !/\belf\b/i.test(species);
    });
    if (!validTargets.length) return;
    const activity = workflow.item.system.activities.find(a => a.identifier === 'save');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, validTargets);
}
export const ghoulClaw = {
    name: 'Claw',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Ghoul'],
    roll: [
        {
            pass: 'itemRollFinished',
            macro: ghoulClawUse,
            priority: 50
        }
    ]
};
async function vampireBiteEarly({workflow}) {
    if (!workflow.targets.size) return;
    const target = workflow.targets.first();
    const conditions = ['grappled', 'incapacitated', 'restrained'];
    const valid = conditions.find(status => target.actor.statuses.has(status));
    const charmed = actorUtils.getEffects(target.actor).find(effect => documentUtils.getIdentifier(effect) === 'charm-person-effect' || effect.statuses.has('charmed'));
    if (!valid && !charmed) {
        game.user.updateTokenTargets([]);
        workflow.targets = new Set();
        ui.notifications.info(workflow.item.name + ': ' + _loc('CHRISPREMADES.Macros.VampireBite.Invalid'));
    }
}
export const vampireBite = {
    name: 'Bite (Bat or Vampire Form Only)',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Vampire'],
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: vampireBiteEarly,
            priority: 50
        }
    ]
};
async function mistyEscapeUse({workflow}) {
    const item = actorUtils.getItemByIdentifier(workflow.actor, 'vampire-shape-shift');
    if (!item || !workflow.token) return;
    const activity = item.system.activities.find(a => a.identifier === 'mist');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [workflow.token]);
}
export const vampireMistyEscape = {
    name: 'Misty Escape',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Vampire'],
    roll: [
        {
            pass: 'itemRollFinished',
            macro: mistyEscapeUse,
            priority: 50
        }
    ]
};
async function redirectAttacked({document: item, targetToken, workflow}) {
    if (!workflow.targets.size || !workflow.token) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const target = targetToken?.object ?? workflow.targets.first();
    if (MidiQOL.hasUsedReaction(item.actor)) return;
    const nearby = tokenUtils.findNearby(target.document ?? target, 5, {disposition: 'ally', includeIncapacitated: true}).filter(token => {
        if ((token.document?.id ?? token.id) === workflow.token.document.id) return false;
        const sizeIndex = Object.keys(CONFIG.DND5E.actorSizes).indexOf(token.actor.system.traits.size);
        return [1, 2].includes(sizeIndex);
    });
    if (!nearby.length) return;
    const selection = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), nearby, {skipDeadAndUnconscious: false, userId: queryUtils.firstOwner(item.actor, true)});
    if (!selection?.length) return;
    const other = selection[0];
    const targetDoc = target.document ?? target;
    const otherDoc = other.document ?? other;
    const targetPos = {x: targetDoc.x, y: targetDoc.y};
    await documentUtils.update(targetDoc, {x: otherDoc.x, y: otherDoc.y});
    await documentUtils.update(otherDoc, targetPos);
    game.user.updateTokenTargets([otherDoc.id]);
    workflow.targets = new Set([other]);
    if (game.combat?.started) await MidiQOL.setReactionUsed(item.actor);
}
export const goblinBossRedirectAttack = {
    name: 'Redirect Attack',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Goblin Boss'],
    roll: [
        {
            pass: 'targetAttackRollConfig',
            macro: redirectAttacked,
            priority: 40
        }
    ]
};
