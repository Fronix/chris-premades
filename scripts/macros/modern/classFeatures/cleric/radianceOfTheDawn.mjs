import {actorUtils, effectUtils, tokenUtils} from '../../../../proxy.mjs';
import {saveDisadvantageEffectData} from '../../../lib/spellUtils.mjs';
async function early({workflow}) {
    if (!workflow.token) return;
    if (!actorUtils.getEffectByIdentifier(workflow.actor, 'corona-of-light-effect')) return;
    for (const token of workflow.targets) {
        if (tokenUtils.getDistance(workflow.token.document, token.document) > 60) continue;
        await effectUtils.createEffects(token.actor, [saveDisadvantageEffectData()]);
    }
}
export const radianceOfTheDawn = {
    name: 'Radiance of the Dawn',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 100
        }
    ]
};
