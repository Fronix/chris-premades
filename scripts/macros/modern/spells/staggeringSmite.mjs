import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
export const staggeringSmite = {
    name: 'Staggering Smite',
    version: '2.0.0',
    rules: '2024',
    roll: smitePasses,
    config: {
        damageType: damageTypeConfig('psychic'),
        diceSize: diceSizeConfig('d6'),
        baseDiceNumber: diceNumberConfig(4)
    }
};
