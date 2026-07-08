import {actorUtils, dialogUtils, documentUtils, effectUtils, genericUtils, workflowUtils} from '../../../proxy.mjs';
async function pickWeapon(workflow) {
    const weapons = workflow.actor.items.filter(i => i.type === 'weapon' && i.system.equipped);
    if (!weapons.length) return;
    if (weapons.length === 1) return weapons[0];
    return await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Attack.SelectWeapon'), weapons);
}
async function attackUse({workflow}) {
    if (!workflow.targets.size) return;
    const selection = await pickWeapon(workflow);
    if (!selection) return;
    await workflowUtils.syntheticItemRoll(selection, Array.from(workflow.targets), {consumeResources: true, consumeUsage: true});
}
export const attack = {
    name: 'Attack',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: attackUse,
            priority: 50
        }
    ]
};
async function knockOutUse({workflow}) {
    if (!workflow.targets.size) return;
    const selection = await pickWeapon(workflow);
    if (!selection) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = {seconds: 1};
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'knock-out-effect');
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'knock-out-effect'}]}]
    });
    await workflowUtils.syntheticItemRoll(selection, Array.from(workflow.targets), {consumeResources: true, consumeUsage: true});
    await genericUtils.sleep(100);
    if (created?.[0]) await documentUtils.deleteDocument(created[0]);
}
async function knockOutDamage({ditem, workflow}) {
    if (!ditem.isHit || ditem.newHP !== 0) return;
    if (workflowUtils.getActionType(workflow) !== 'mwak') return;
    ditem.newHP = 0;
    foundry.utils.setProperty(workflow, 'chris-premades.knockOut', ditem.actorUuid);
}
async function knockOutDone({workflow}) {
    const actorUuid = workflow['chris-premades']?.knockOut;
    if (!actorUuid) return;
    const actor = await fromUuid(actorUuid);
    if (!actor) return;
    await actorUtils.applyConditions(actor, ['unconscious'], {overlay: true});
}
export const knockOut = {
    name: 'Knock Out',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: knockOutUse,
            priority: 50
        }
    ]
};
export const knockOutEffect = {
    name: 'Knock Out: Effect',
    version: knockOut.version,
    rules: knockOut.rules,
    roll: [
        {
            pass: 'actorDamage',
            macro: knockOutDamage,
            priority: 10
        },
        {
            pass: 'actorRollFinished',
            macro: knockOutDone,
            priority: 50
        }
    ]
};
export const dodge = {
    name: 'Dodge',
    version: '2.0.0',
    rules: '2024'
};
export const help = {
    name: 'Help',
    version: '2.0.0',
    rules: '2024'
};
export const ready = {
    name: 'Ready',
    version: '2.0.0',
    rules: '2024'
};
export const search = {
    name: 'Search',
    version: '2.0.0',
    rules: '2024'
};
export const study = {
    name: 'Study',
    version: '2.0.0',
    rules: '2024'
};
export const utilize = {
    name: 'Utilize',
    version: '2.0.0',
    rules: '2024'
};
