import {actorUtils, automationUtils, dialogUtils, tokenUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.token) return;
    const mistyWanderer = actorUtils.getItemByIdentifier(workflow.actor, 'misty-wanderer');
    let secondaryTarget;
    if (mistyWanderer) {
        const nearbyTargets = tokenUtils.findNearby(workflow.token.document, 5, {disposition: 'ally'});
        if (nearbyTargets.length) {
            const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.MistyWanderer.TeleportFriend'), nearbyTargets);
            if (selection?.length) secondaryTarget = selection[0];
        }
    }
    const range = Number(automationUtils.getConfigValue(workflow.item, 'range')) || 30;
    await tokenUtils.teleportToken(workflow.token.document, {range});
    if (!secondaryTarget) return;
    await tokenUtils.teleportToken(secondaryTarget.document ?? secondaryTarget, {range: 5});
}
export const mistyStep = {
    name: 'Misty Step',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        range: {
            default: 30,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
export const shield = {
    name: 'Shield',
    version: '2.0.0',
    rules: '2024'
};
