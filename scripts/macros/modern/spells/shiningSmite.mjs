export const shiningSmite = {
    name: 'Shining Smite',
    version: '2.0.0',
    rules: '2024',
    config: {
        damageType: {
            default: 'radiant',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        diceSize: {
            default: 'd6',
            type: 'select',
            label: 'CHRISPREMADES.Config.DiceSize',
            category: 'tuning',
            options: () => ['d4', 'd6', 'd8', 'd10', 'd12'].map(value => ({value, label: value}))
        },
        baseDiceNumber: {
            default: 2,
            type: 'text',
            label: 'CHRISPREMADES.Config.BaseDiceNumber',
            category: 'tuning'
        }
    }
};
