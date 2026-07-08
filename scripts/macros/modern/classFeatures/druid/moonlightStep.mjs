import {actorUtils, dialogUtils, documentUtils, tokenUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'moonlight-step') return;
    if (!workflow.token) return;
    let other;
    const lunarForm = actorUtils.getItemByIdentifier(workflow.actor, 'lunar-form');
    if (lunarForm) {
        const nearby = tokenUtils.findNearby(workflow.token.document, 10, {disposition: 'ally'});
        if (nearby.length) {
            const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.MoonlightStep.TeleportFriend'), nearby);
            if (selection?.length) other = selection[0];
        }
    }
    await tokenUtils.teleportToken(workflow.token.document, {range: 30});
    if (other) await tokenUtils.teleportToken(other.document ?? other, {range: 10});
}
export const moonlightStep = {
    name: 'Moonlight Step',
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
