export const warriorOfTheGods = {
    name: 'Warrior of the Gods',
    version: '2.0.0',
    rules: '2024',
    config: {
        subclassIdentifier: {
            default: 'zealot',
            type: 'text',
            label: 'CHRISPREMADES.Config.SubclassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'warrior-of-the-gods',
            classIdentifier: 'zealot',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'warrior-of-the-gods',
                    type: 'dice',
                    distance: {
                        units: ''
                    },
                    scale: {
                        3: {number: 4, faces: 12, modifiers: []},
                        6: {number: 5, faces: 12, modifiers: []},
                        12: {number: 6, faces: 12, modifiers: []},
                        17: {number: 7, faces: 12, modifiers: []}
                    }
                },
                value: {},
                title: 'Warrior of the Gods'
            }
        }
    ]
};
