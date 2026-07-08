import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['heal'], 'monks-focus');
}
export const uncannyMetabolism = {
    name: 'Uncanny Metabolism',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 45
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 45
        }
    ],
    scales: [
        {
            identifier: 'martial-arts',
            classIdentifier: 'monk',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'martial-arts',
                    type: 'dice',
                    scale: {
                        1: {number: 1, faces: 6, modifiers: []},
                        5: {number: 1, faces: 8, modifiers: []},
                        11: {number: 1, faces: 10, modifiers: []},
                        17: {number: 1, faces: 12, modifiers: []}
                    }
                },
                value: {},
                title: 'Martial Arts'
            }
        }
    ]
};
