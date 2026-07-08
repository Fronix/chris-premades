import {actorUtils, automationUtils, dialogUtils, summonUtils, tokenUtils} from '../../../../proxy.mjs';
export const naturesVeil = {
    name: 'Nature\'s Veil',
    version: '2.0.0',
    rules: '2024'
};
export const preciseHunter = {
    name: 'Precise Hunter',
    version: '2.0.0',
    rules: '2024'
};
export const exceptionalTraining = {
    name: 'Exceptional Training',
    version: '2.0.0',
    rules: '2024'
};
export const otherworldlyGlamour = {
    name: 'Otherworldly Glamour',
    version: '2.0.0',
    rules: '2024'
};
async function shareEarly({document: item, workflow}) {
    if (workflow.item?.type !== 'spell' || !workflow.token) return;
    if (!Array.from(workflow.targets).some(token => token.document.uuid === workflow.token.document.uuid)) return;
    const primalCompanion = actorUtils.getItemByIdentifier(workflow.actor, 'primal-companion');
    if (!primalCompanion) return;
    const summons = summonUtils.getSummonBySource(primalCompanion);
    const companionToken = summons?.[0];
    if (!companionToken) return;
    const range = Number(automationUtils.getConfigValue(item, 'range')) || 30;
    if (tokenUtils.getDistance(workflow.token.document, companionToken) > range) return;
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Macros.ShareSpells.Confirm', {spell: workflow.item.name, name: companionToken.actor.name}));
    if (!selection) return;
    const targets = Array.from(workflow.targets);
    targets.push(companionToken);
    game.user.updateTokenTargets(targets.map(token => token.id ?? token.document?.id).filter(Boolean));
    workflow.targets = new Set(targets);
}
export const shareSpells = {
    name: 'Share Spells',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: shareEarly,
            priority: 250
        }
    ],
    config: {
        range: {
            default: 30,
            type: 'text',
            label: 'CHRISPREMADES.Config.Range',
            category: 'tuning'
        }
    }
};
