import {dialogUtils} from '../../proxy.mjs';
function getCastLevel(workflow) {
    return workflow.castData?.castLevel ?? workflow.spellLevel ?? workflow.item.system.level;
}
async function capTargets(workflow, maxTargets) {
    if (workflow.targets.size <= maxTargets) return;
    const oldTargets = Array.from(workflow.targets);
    const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.UpcastTargets.Select', {maxTargets}), oldTargets, {type: 'multiple', maxAmount: maxTargets, skipDeadAndUnconscious: false});
    const newTargets = selection?.[0]?.length ? selection[0] : oldTargets.slice(0, maxTargets);
    game.user.updateTokenTargets(newTargets.map(token => token.id ?? token.document?.id));
    workflow.targets = new Set(newTargets);
}
async function upcastTargets(workflow, baseTargets) {
    await capTargets(workflow, getCastLevel(workflow) - workflow.item.system.level + baseTargets);
}
async function getClassSpells(classIdentifier, {maxLevel = 9} = {}) {
    const list = dnd5e.registry.spellLists.forType('class', classIdentifier);
    if (!list) return [];
    const uuids = Array.from(list.uuids);
    const spells = await Promise.all(uuids.map(uuid => fromUuid(uuid)));
    return spells.filter(spell => spell && spell.system.level <= maxLevel);
}
export {getCastLevel, capTargets, upcastTargets, getClassSpells};
