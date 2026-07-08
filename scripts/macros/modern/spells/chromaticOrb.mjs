import {automationUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
function hasDuplicateDie(roll) {
    const results = [];
    for (const term of roll.terms) {
        if (term.results) results.push(...term.results.map(r => r.result));
    }
    return new Set(results).size !== results.length;
}
async function damage({workflow}) {
    if (!workflow.hitTargets.size) return;
    const damageTypes = automationUtils.getConfigValue(workflow.item, 'damageTypes') ?? ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
    if (!damageTypes.length) return;
    let damageType = workflow.item.flags['chris-premades']?.chromaticOrb?.damageType ?? await dialogUtils.selectDamageType(damageTypes, workflow.item.name, _loc('CHRISPREMADES.Generic.SelectDamageType'));
    if (!damageType || damageType === 'no') damageType = damageTypes[0];
    workflow.damageRolls.forEach(roll => roll.options.type = damageType);
    await workflow.setDamageRolls(workflow.damageRolls);
}
async function use({workflow}) {
    if (!workflow.token) return;
    if (!workflow.damageRolls || !workflow.hitTargets.size) return;
    const alwaysBounce = automationUtils.getConfigValue(workflow.item, 'alwaysBounce');
    const canBounce = alwaysBounce ? true : hasDuplicateDie(workflow.damageRolls[0]);
    if (!canBounce) return;
    const baseMaxJumps = Number(automationUtils.getConfigValue(workflow.item, 'baseMaxJumps')) || 1;
    const castLevel = workflow.item.flags['chris-premades']?.chromaticOrb?.castLevel ?? getCastLevel(workflow) ?? 1;
    let bouncesLeft = workflow.item.flags['chris-premades']?.chromaticOrb?.bouncesLeft ?? (castLevel - 1 + baseMaxJumps);
    if (!bouncesLeft) return;
    bouncesLeft--;
    const ignoredTargetUuids = workflow.item.flags['chris-premades']?.chromaticOrb?.ignoredTargetUuids ?? [];
    const range = Number(automationUtils.getConfigValue(workflow.item, 'range')) || 30;
    const firstTarget = workflow.targets.first();
    const nearbyTargets = tokenUtils.findNearby(firstTarget.document ?? firstTarget, range, {disposition: 'all', includeIncapacitated: true}).filter(token => !ignoredTargetUuids.includes(token.document.uuid) && token.document.uuid !== firstTarget.document.uuid);
    if (!nearbyTargets.length) return;
    let nextTarget = nearbyTargets[0];
    if (nearbyTargets.length > 1) {
        const targetSelect = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.ChromaticOrb.Bounce'), nearbyTargets, {skipDeadAndUnconscious: false});
        if (!targetSelect?.length) return;
        nextTarget = targetSelect[0];
    }
    const perTargetDamageType = automationUtils.getConfigValue(workflow.item, 'perTargetDamageType');
    ignoredTargetUuids.push(firstTarget.document.uuid);
    const newItem = workflow.item.clone({
        'flags.chris-premades.chromaticOrb': {
            ignoredTargetUuids,
            damageType: perTargetDamageType ? undefined : workflow.damageRolls[0].options.type,
            bouncesLeft,
            castLevel,
            lastTargetUuid: firstTarget.document.uuid
        }
    }, {keepId: true});
    const activity = newItem.system.activities.find(a => a.identifier === 'chromatic-orb-bounce');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [nextTarget]);
}
export const chromaticOrb = {
    name: 'Chromatic Orb',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemDamageRollComplete',
            macro: damage,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        alwaysBounce: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.ChromaticOrb.AlwaysBounce',
            category: 'behavior'
        },
        baseMaxJumps: {
            default: 1,
            type: 'text',
            label: 'CHRISPREMADES.Macros.ChromaticOrb.BaseMaxJumps',
            category: 'tuning'
        },
        damageTypes: {
            default: ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        perTargetDamageType: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.ChromaticOrb.TargetDamageSelection',
            category: 'behavior'
        },
        range: {
            default: 30,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
export const chillTouch = {
    name: 'Chill Touch',
    version: '2.0.0',
    rules: '2024'
};
export const burningHands = {
    name: 'Burning Hands',
    version: '2.0.0',
    rules: '2024'
};
