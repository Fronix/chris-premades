import {actorUtils, dialogUtils, documentUtils, effectUtils} from '../../../../proxy.mjs';
function languageOptions() {
    const options = [];
    const walk = obj => Object.entries(obj ?? {}).forEach(([value, data]) => {
        if (typeof data === 'string') {
            options.push({value, label: data});
        } else {
            if (data.label) options.push({value, label: data.label});
            if (data.children) walk(data.children);
        }
    });
    walk(CONFIG.DND5E.languages);
    return options;
}
async function use({workflow}) {
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'polyglot-effect');
    const knownLanguages = Array.from(workflow.actor.system.traits.languages.value);
    const options = languageOptions().filter(option => !knownLanguages.includes(option.value));
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectALanguage'), options.map(option => [option.label, option.value]));
    if (!selection) return;
    const sourceEffect = workflow.activity?.effects?.[0]?.effect ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = sourceEffect.uuid;
    effectData.system.changes[0].value = selection;
    if (existing) await documentUtils.deleteDocument(existing);
    await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
}
export const knightlyEnvoy = {
    name: 'Knightly Envoy',
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
