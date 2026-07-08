import {documentUtils} from '../../../proxy.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
async function veryEarly({dialog, activity}) {
    if (documentUtils.getIdentifier(activity) !== 'banish') return;
    dialog.configure = false;
}
export const banishingSmite = {
    name: 'Banishing Smite',
    version: '2.0.0',
    rules: '2024',
    roll: [
        ...smitePasses,
        {
            pass: 'itemPreTargeting',
            macro: veryEarly,
            priority: 50
        }
    ],
    config: {
        damageType: damageTypeConfig('force'),
        diceSize: diceSizeConfig('d10'),
        baseDiceNumber: diceNumberConfig(5),
        hp: {
            default: 50,
            type: 'text',
            label: 'CHRISPREMADES.Macros.BanishingSmite.Hp',
            category: 'tuning'
        }
    }
};
