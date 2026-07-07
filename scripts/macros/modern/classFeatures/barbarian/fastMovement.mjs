import {actorUtils, documentUtils} from '../../../../proxy.mjs';
async function armorChange({item}) {
    if (item.type !== 'equipment' || item.system.type?.value !== 'heavy' || !item.actor) return;
    const effect = actorUtils.getEffectByIdentifier(item.actor, 'fast-movement');
    if (!effect) return;
    const heavyArmor = item.actor.items.some(i => i.system.equipped && i.type === 'equipment' && i.system.type?.value === 'heavy');
    if (heavyArmor !== effect.disabled) await documentUtils.update(effect, {disabled: heavyArmor});
}
export const fastMovement = {
    name: 'Fast Movement',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'actorEquipped',
            macro: armorChange,
            priority: 50
        },
        {
            pass: 'actorUnequipped',
            macro: armorChange,
            priority: 50
        }
    ]
};
