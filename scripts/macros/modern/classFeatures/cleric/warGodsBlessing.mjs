import {actorUtils, dialogUtils, documentUtils, itemUtils, workflowUtils} from '../../../../proxy.mjs';
async function getSpell(actor, identifier, packName) {
    const owned = actorUtils.getItemByIdentifier(actor, identifier);
    if (owned) return owned;
    const pack = game.packs.get('chris-premades.CPRSpells2024');
    if (!pack) return;
    const index = await pack.getIndex();
    const entry = index.find(e => e.name === packName);
    return entry ? await fromUuid(entry.uuid) : undefined;
}
async function use({workflow}) {
    const shieldOfFaith = await getSpell(workflow.actor, 'shield-of-faith', 'Shield of Faith');
    const spiritualWeapon = await getSpell(workflow.actor, 'spiritual-weapon', 'Spiritual Weapon');
    const choices = [shieldOfFaith, spiritualWeapon].filter(Boolean);
    if (!choices.length) return;
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.ChooseASpell'), choices);
    if (!selection) return;
    const selectionData = selection.toObject();
    delete selectionData._id;
    selectionData.system.activation.type = 'special';
    selectionData.system.duration = {units: 'minute', value: '1'};
    selectionData.system.properties = selectionData.system.properties.filter(property => property !== 'concentration');
    selectionData.system.method = 'atwill';
    const item = itemUtils.syntheticItem(selectionData, workflow.actor);
    const targets = workflow.targets.size ? Array.from(workflow.targets) : (workflow.token ? [workflow.token] : []);
    await workflowUtils.completeItemUse(item, targets);
}
export const warGodsBlessing = {
    name: 'War God\'s Blessing',
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
export const thaumaturge = {
    name: 'Thaumaturge',
    version: '2.0.0',
    rules: '2024'
};
export const searUndead = {
    name: 'Sear Undead',
    version: '2.0.1',
    rules: '2024'
};
export const avatarOfBattle = {
    name: 'Avatar of Battle',
    version: '2.0.1',
    rules: '2024'
};
