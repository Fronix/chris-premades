import {actorUtils, automationUtils, documentUtils, effectUtils, tokenUtils} from '../../../../proxy.mjs';
function isUnarmored(actor) {
    return !actor.itemTypes.equipment.some(equipment => equipment.system.equipped && ['heavy', 'medium', 'light', 'shield'].includes(equipment.system.type?.value));
}
async function skill({actor, skillId}) {
    if (skillId !== 'prf') return;
    if (!isUnarmored(actor)) return;
    return {label: 'CHRISPREMADES.Macros.DazzlingFootwork.DanceVirtuoso', type: 'advantage'};
}
async function early({document: item, workflow}) {
    if (!workflow.item) return;
    if (!isUnarmored(workflow.actor)) return;
    const identifier = documentUtils.getIdentifier(workflow.item);
    if (!['unarmed-strike', 'monk-unarmed-strike'].includes(identifier)) return;
    if (documentUtils.getIdentifier(workflow.activity) !== 'punch') return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'bard';
    workflow.item = workflow.item.clone({'system.damage.base.bonus': '@scale.' + classIdentifier + '.bardic-inspiration.die + @abilities.dex.mod', 'system.properties': Array.from(workflow.item.system.properties).concat('fin')}, {keepId: true});
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const dazzlingFootwork = {
    name: 'Dazzling Footwork',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: early,
            priority: 60
        }
    ],
    skill: [
        {
            pass: 'actorContext',
            macro: skill,
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
async function evasionEarly({document: item, workflow}) {
    if (!workflow.token || !workflow.targets.size) return;
    if (!workflow.activity?.save?.ability?.has?.('dex')) return;
    const sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration.seconds = 1;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'leading-evasion-effect');
    let used = false;
    for (const token of workflow.targets) {
        if (actorUtils.getItemByIdentifier(token.actor, 'leading-evasion')) continue;
        const valid = tokenUtils.findNearby(token.document ?? token, 5, {disposition: 'ally'}).find(ally => actorUtils.getItemByIdentifier(ally.actor, 'leading-evasion') && !ally.actor.statuses.has('incapacitated') && workflow.targets.has(ally));
        if (!valid) continue;
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
        used = true;
    }
    if (used) await item.displayCard();
}
async function evasionLate({workflow}) {
    if (!workflow.token || !workflow.targets.size) return;
    if (!workflow.activity?.save?.ability?.has?.('dex')) return;
    for (const token of workflow.targets) {
        const effect = actorUtils.getEffectByIdentifier(token.actor, 'leading-evasion-effect');
        if (effect) await documentUtils.deleteDocument(effect);
    }
}
export const leadingEvasion = {
    name: 'Leading Evasion',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'scenePreambleComplete',
            macro: evasionEarly,
            priority: 50
        },
        {
            pass: 'sceneRollFinished',
            macro: evasionLate,
            priority: 50
        }
    ]
};
export const combatInspiration = {
    name: 'Combat Inspiration',
    version: '2.0.0',
    rules: '2024'
};
