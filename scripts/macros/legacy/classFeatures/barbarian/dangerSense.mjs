async function save({actor, config}) {
    if (config.ability !== 'dex') return;
    if (['blinded', 'deafened', 'incapacitated'].some(status => actor.statuses.has(status))) return;
    return {label: 'CHRISPREMADES.Macros.Legacy.DangerSense.CanSee', type: 'advantage'};
}
export const dangerSense = {
    name: 'Danger Sense',
    version: '2.0.0',
    rules: '2014',
    save: [
        {
            pass: 'actorContext',
            macro: save,
            priority: 50
        }
    ]
};
