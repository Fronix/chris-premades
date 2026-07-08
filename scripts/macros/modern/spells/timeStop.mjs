import {dialogUtils, documentUtils, effectUtils, queryUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.token || !game.combat?.started) return;
    const combatant = game.combat.combatants.contents.find(c => c.actorId === workflow.actor.id);
    if (!combatant) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const combatantData = {
        tokenId: workflow.token.document.id,
        sceneId: workflow.token.document.parent.id,
        actorId: workflow.actor.id,
        initiative: combatant.initiative
    };
    const updates = [];
    const rounds = workflow.utilityRolls?.[0]?.total ?? 2;
    for (let i = 0; i < rounds; i++) {
        combatantData.initiative -= 0.01;
        updates.push(foundry.utils.duplicate(combatantData));
    }
    const combatants = await game.combat.createEmbeddedDocuments('Combatant', updates);
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'time-stop-effect');
    foundry.utils.setProperty(effectData, 'flags.chris-premades.timeStop.combatantUuids', combatants.map(c => c.uuid));
    foundry.utils.setProperty(effectData, 'flags.chris-premades.timeStop.tokenId', workflow.token.document.id);
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'time-stop-effect'}]},
            {type: 'effect', macros: [{source: 'chris-premades', rules: '2024', identifier: 'time-stop-effect'}]},
            {type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'time-stop-effect'}]}
        ]
    });
}
async function remove({document: effect}) {
    if (!game.combat) return;
    const combatantUuids = effect.flags['chris-premades']?.timeStop?.combatantUuids;
    if (!combatantUuids) return;
    const combatants = (await Promise.all(combatantUuids.map(uuid => fromUuid(uuid)))).filter(Boolean);
    if (combatants.length) await game.combat.deleteEmbeddedDocuments('Combatant', combatants.map(c => c.id));
}
async function targetOther({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    if (!Array.from(workflow.targets).filter(token => token !== workflow.token).length) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.TimeStop.Affect'), {userId: queryUtils.gmID()});
    if (!selection) return;
    await documentUtils.deleteDocument(effect);
}
async function turnEnd({document: effect}) {
    const tokenId = effect.flags['chris-premades']?.timeStop?.tokenId;
    if (game.combat?.current?.tokenId !== tokenId) await documentUtils.deleteDocument(effect);
}
export const timeStop = {
    name: 'Time Stop',
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
export const timeStopEffect = {
    name: 'Time Stop: Effect',
    version: timeStop.version,
    rules: timeStop.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: targetOther,
            priority: 200
        }
    ],
    effect: [
        {
            pass: 'deleted',
            macro: remove,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: turnEnd,
            priority: 50
        }
    ]
};
