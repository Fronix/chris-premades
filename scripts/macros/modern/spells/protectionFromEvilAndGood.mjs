async function save() {
    return {label: 'CHRISPREMADES.Macros.ProtectionFromEvilAndGood.Save', type: 'advantage'};
}
export const protectionFromEvilAndGood = {
    name: 'Protection from Evil and Good',
    version: '2.0.0',
    rules: '2024',
    save: [
        {
            pass: 'actorContext',
            macro: save,
            priority: 50
        }
    ]
};
