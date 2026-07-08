import {dialogUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.token) return;
    const weapons = workflow.actor.items.filter(item => item.type === 'weapon' && item.system.equipped);
    if (!weapons.length) return;
    let weapon;
    if (weapons.length === 1) {
        weapon = weapons[0];
    } else {
        weapon = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectAWeapon'), weapons);
        if (!weapon) return;
    }
    let targets;
    if (!workflow.targets.size) {
        const activity = weapon.system.activities.find(a => a.type === 'attack');
        if (!activity) return;
        const nearby = tokenUtils.findNearby(workflow.token.document, activity.range?.value || 5, {disposition: 'enemy', includeIncapacitated: true});
        if (!nearby.length) return;
        const selected = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectATarget'), nearby, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        targets = [selected[0]];
    } else {
        targets = Array.from(workflow.targets);
    }
    await workflowUtils.syntheticItemRoll(weapon, targets);
}
export const warPriest = {
    name: 'War Priest',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
