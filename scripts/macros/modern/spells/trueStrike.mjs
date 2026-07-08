import {automationUtils, dialogUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (workflow.targets.size !== 1) return;
    const weaponTypes = ['simpleM', 'simpleR', 'martialM', 'martialR', 'natural'];
    const weapons = workflow.actor.items.filter(item => item.type === 'weapon' && item.system.equipped && item.system.prof?.hasProficiency && weaponTypes.includes(item.system.type?.value));
    if (!weapons.length) {
        ui.notifications.warn(_loc('CHRISPREMADES.Macros.TrueStrike.NoWeapons'));
        return;
    }
    let selectedWeapon;
    if (weapons.length === 1) {
        selectedWeapon = weapons[0];
    } else {
        selectedWeapon = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.TrueStrike.SelectWeapon'), weapons);
    }
    if (!selectedWeapon) return;
    const level = workflow.actor.system.details?.level ?? workflow.actor.system.details?.cr ?? 1;
    const diceNumber = Math.floor((level + 1) / 6);
    const weaponData = selectedWeapon.toObject();
    delete weaponData._id;
    foundry.utils.setProperty(weaponData, 'flags.chris-premades.trueStrike', true);
    foundry.utils.setProperty(weaponData, 'flags.chris-premades.bladeCantrip', workflow.item.name);
    const damageType = automationUtils.getConfigValue(workflow.item, 'damageType') || 'radiant';
    const selection = await dialogUtils.confirm(workflow.item.name, _loc('CHRISPREMADES.Macros.TrueStrike.ReplaceDamage', {type: damageType}));
    for (const activity of selectedWeapon.system.activities.getByType('attack')) {
        const attackId = activity.id;
        if (!attackId) return;
        weaponData.system.activities[attackId].attack.ability = workflow.item.system.ability?.length ? workflow.item.system.ability : workflow.actor.system.attributes.spellcasting;
        if (selection) {
            weaponData.system.damage.base.types = [damageType];
            weaponData.system.activities[attackId].damage.parts.forEach(part => part.types = [damageType]);
        }
        if (diceNumber) {
            weaponData.system.activities[attackId].damage.parts.push({number: diceNumber, denomination: 6, types: [damageType]});
        }
    }
    await workflowUtils.syntheticItemDataRoll(weaponData, workflow.actor, [workflow.targets.first()]);
}
export const trueStrike = {
    name: 'True Strike',
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
        damageType: {
            default: 'radiant',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const shockingGrasp = {
    name: 'Shocking Grasp',
    version: '2.0.0',
    rules: '2024'
};
