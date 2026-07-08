import {activityUtils, dialogUtils, documentUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'teleport-damage') return;
    if (!workflow.token) return;
    const targets = tokenUtils.findNearby(workflow.token.document, 10, {disposition: 'ally', includeIncapacitated: true});
    const toTeleport = [workflow.token];
    if (targets.length) {
        const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Teleport.Select'), targets, {skipDeadAndUnconscious: false, type: 'multiple', maxAmount: 8});
        if (selection?.[0]?.length) toTeleport.push(...selection[0]);
    }
    const buttons = [
        ['CHRISPREMADES.Macros.Teleport.PermanentCircle', 'pc'],
        ['CHRISPREMADES.Macros.Teleport.LinkedObject', 'ao'],
        ['CHRISPREMADES.Macros.Teleport.VeryFamiliar', 'vf'],
        ['CHRISPREMADES.Macros.Teleport.SeenCasually', 'sc'],
        ['CHRISPREMADES.Macros.Teleport.ViewedOnceDescribed', 'vo'],
        ['CHRISPREMADES.Macros.Teleport.FalseDestination', 'fd']
    ];
    const gmId = queryUtils.gmID();
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Teleport.Familiarity'), buttons, {userId: gmId});
    if (!selection) return;
    const flavors = {
        mishap: 'CHRISPREMADES.Macros.Teleport.Mishap',
        onTarget: 'CHRISPREMADES.Macros.Teleport.OnTarget',
        offTarget: 'CHRISPREMADES.Macros.Teleport.OffTarget',
        similarArea: 'CHRISPREMADES.Macros.Teleport.SimilarArea'
    };
    let flavor = 'mishap';
    let totalDamage = 0;
    while (flavor === 'mishap') {
        const roll = await new Roll('1d100').evaluate();
        const total = Math.clamp(roll.total, 0, 100);
        switch (selection) {
            case 'pc':
            case 'ao':
                flavor = 'onTarget';
                break;
            case 'vf':
                flavor = total < 6 ? 'mishap' : total < 14 ? 'similarArea' : total < 25 ? 'offTarget' : 'onTarget';
                break;
            case 'sc':
                flavor = total < 34 ? 'mishap' : total < 44 ? 'similarArea' : total < 54 ? 'offTarget' : 'onTarget';
                break;
            case 'vo':
                flavor = total < 44 ? 'mishap' : total < 54 ? 'similarArea' : total < 74 ? 'offTarget' : 'onTarget';
                break;
            case 'fd':
            default:
                flavor = total < 51 ? 'mishap' : 'similarArea';
        }
        if (flavor === 'mishap') totalDamage += 3;
        await roll.toMessage({
            rollMode: CONST.DICE_ROLL_MODES.BLIND,
            speaker: {alias: workflow.actor.name},
            flavor: _loc(flavors[flavor]),
            whisper: [gmId]
        });
    }
    if (totalDamage > 0) {
        const feature = workflow.item.system.activities.find(a => a.identifier === 'teleport-damage');
        if (feature) {
            const activityData = activityUtils.getDamageModifiedActivityData(feature, {number: totalDamage, denomination: 10}, {types: ['force']});
            await workflowUtils.syntheticActivityDataRoll(activityData, workflow.item, toTeleport);
        }
    }
    if (flavor === 'offTarget') {
        const distanceRoll = await new Roll('2d12').evaluate();
        const directionRoll = await new Roll('1d8').evaluate();
        const directions = ['East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest', 'North', 'Northeast'].map(dir => _loc('CHRISPREMADES.Direction.' + dir));
        await ChatMessage.create({
            speaker: {alias: workflow.actor.name},
            content: _loc('CHRISPREMADES.Macros.Teleport.OffTargetString', {distance: distanceRoll.total, units: _loc('CHRISPREMADES.Units.Miles').toLowerCase(), direction: directions[directionRoll.total - 1]}),
            whisper: [gmId],
            blind: true
        });
    }
}
export const teleport = {
    name: 'Teleport',
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
