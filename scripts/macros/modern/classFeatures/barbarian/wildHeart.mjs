import {actorUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function lion({workflow}) {
    if (!workflow.targets.size || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    const firstTarget = workflow.targets.first();
    const nearbyTargets = tokenUtils.findNearby(workflow.token.document, 5, {disposition: 'enemy'})
        .filter(token => actorUtils.getEffects(token.actor).find(e => e.flags['chris-premades']?.powerOfTheWildsLion))
        .filter(token => (token.document?.id ?? token.id) !== (firstTarget.document?.id ?? firstTarget.id));
    if (!nearbyTargets.length) return;
    workflow.disadvantage = true;
}
async function ram({document, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'meleeWeaponAttack')) return;
    const target = workflow.hitTargets.first();
    if (target.actor.statuses.has('prone')) return;
    const sizeIndex = Object.keys(CONFIG.DND5E.actorSizes).indexOf(target.actor.system.traits.size);
    if (sizeIndex > 3) return;
    const selection = await dialogUtils.confirm(document.name, _loc('CHRISPREMADES.Macros.PowerOfTheWilds.RamProne'));
    if (!selection) return;
    await actorUtils.applyConditions(target.actor, ['prone']);
}
export const powerOfTheWilds = {
    name: 'Power of the Wilds',
    version: '2.0.0',
    rules: '2024'
};
export const powerOfTheWildsLion = {
    name: powerOfTheWilds.name,
    version: powerOfTheWilds.version,
    rules: powerOfTheWilds.rules,
    roll: [
        {
            pass: 'sceneAttackRollConfig',
            macro: lion,
            priority: 50
        }
    ]
};
export const powerOfTheWildsRam = {
    name: powerOfTheWilds.name,
    version: powerOfTheWilds.version,
    rules: powerOfTheWilds.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: ram,
            priority: 250
        }
    ]
};
