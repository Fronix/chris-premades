import {automationUtils, tokenUtils} from '../../../proxy.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
async function use({workflow}) {
    if (!workflow.failedSaves.size || !workflow.token) return;
    const distance = Number(automationUtils.getConfigValue(workflow.item, 'distance')) || 10;
    for (const token of workflow.failedSaves) {
        await tokenUtils.slideToken(token.document, {sourceToken: workflow.token.document, distance});
    }
}
export const thunderousSmite = {
    name: 'Thunderous Smite',
    version: '2.0.0',
    rules: '2024',
    roll: [
        ...smitePasses,
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        damageType: damageTypeConfig('thunder'),
        diceSize: diceSizeConfig('d6'),
        baseDiceNumber: diceNumberConfig(2),
        distance: {
            default: 10,
            type: 'text',
            label: 'CHRISPREMADES.Config.Distance',
            category: 'tuning'
        }
    }
};
