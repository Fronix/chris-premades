import {actorUtils, documentUtils} from '../../../../proxy.mjs';
async function change({item}) {
    if (item.type !== 'equipment' || !item.actor) return;
    const effect = actorUtils.getEffectByIdentifier(item.actor, 'unarmored-defense-monk-effect');
    if (!effect) return;
    const invalidTypes = ['heavy', 'medium', 'light', 'shield'];
    const armor = item.actor.items.find(i => i.system.equipped && i.type === 'equipment' && invalidTypes.includes(i.system.type?.value));
    if (armor && !effect.disabled) await documentUtils.update(effect, {disabled: true});
    if (!armor && effect.disabled) await documentUtils.update(effect, {disabled: false});
}
export const unarmoredDefenseMonk = {
    name: 'Unarmored Defense (Monk)',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'actorEquipped',
            macro: change,
            priority: 50
        },
        {
            pass: 'actorUnequipped',
            macro: change,
            priority: 50
        }
    ]
};
