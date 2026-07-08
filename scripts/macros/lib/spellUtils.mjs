import {dialogUtils} from '../../proxy.mjs';
function getCastLevel(workflow) {
    return workflow.castData?.castLevel ?? workflow.spellLevel ?? workflow.item.system.level;
}
async function upcastTargets(workflow, baseTargets) {
    const maxTargets = getCastLevel(workflow) - workflow.item.system.level + baseTargets;
    if (workflow.targets.size <= maxTargets) return;
    const oldTargets = Array.from(workflow.targets);
    const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.UpcastTargets.Select', {maxTargets}), oldTargets, {type: 'multiple', maxAmount: maxTargets, skipDeadAndUnconscious: false});
    const newTargets = selection?.[0]?.length ? selection[0] : oldTargets.slice(0, maxTargets);
    game.user.updateTokenTargets(newTargets.map(token => token.id ?? token.document?.id));
    workflow.targets = new Set(newTargets);
}
export {getCastLevel, upcastTargets};
