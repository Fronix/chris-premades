import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['wild-companion'], 'wild-shape');
}
export const wildCompanion = {
    name: 'Wild Companion',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ]
};
