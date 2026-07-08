import {upcastTargets} from '../../lib/spellUtils.mjs';
async function preamble({workflow}) {
    await upcastTargets(workflow, 3);
}
export const bane = {
    name: 'Bane',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: preamble,
            priority: 50
        }
    ]
};
