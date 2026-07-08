import {activityUtils, actorUtils, automationUtils, documentUtils, effectUtils, tokenUtils} from '../../../proxy.mjs';
function typeOf(actor) {
    return actor.system.details?.type?.value ?? actor.system.details?.race;
}
async function use({workflow}) {
    const ignoredCreatureTypes = automationUtils.getConfigValue(workflow.item, 'ignoredCreatureTypes') ?? ['undead', 'construct'];
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'antilife-shell'
            },
            'chris-premades': {
                antilifeShell: {ignoredCreatureTypes}
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'move', macros: [{source: 'chris-premades', rules: '2024', identifier: 'antilife-shell-move'}]}]
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function moved({document: effect, token}) {
    const selfToken = actorUtils.getFirstToken(effect.parent);
    if (!selfToken || (token && token !== selfToken && token.id !== selfToken.id)) return;
    const ignoredCreatureTypes = effect.flags['chris-premades']?.antilifeShell?.ignoredCreatureTypes ?? [];
    const nearbyTokens = tokenUtils.findNearby(selfToken.document ?? selfToken, 10, {disposition: 'all'}).filter(nearby => {
        if (['dead', 'unconscious'].some(status => nearby.actor.statuses.has(status))) return false;
        if (ignoredCreatureTypes.includes(typeOf(nearby.actor))) return false;
        return true;
    });
    if (!nearbyTokens.length) return;
    await documentUtils.deleteDocument(effect);
}
async function movedNear({document: effect, token}) {
    if (!token?.actor) return;
    const ignoredCreatureTypes = effect.flags['chris-premades']?.antilifeShell?.ignoredCreatureTypes ?? [];
    if (ignoredCreatureTypes.includes(typeOf(token.actor))) return;
    if (['dead', 'unconscious'].some(status => token.actor.statuses.has(status))) return;
    const selfToken = actorUtils.getFirstToken(effect.parent);
    if (!selfToken) return;
    const distance = tokenUtils.getDistance(selfToken.document ?? selfToken, token.document ?? token);
    if (distance > 10) return;
    await tokenUtils.slideToken(token.document ?? token, {sourceToken: selfToken.document ?? selfToken, distance: 15 - distance});
}
export const antilifeShell = {
    name: 'Antilife Shell',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        ignoredCreatureTypes: {
            default: ['undead', 'construct'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.IgnoredCreatureTypes',
            category: 'behavior',
            options: () => Object.entries(CONFIG.DND5E.creatureTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const antilifeShellMove = {
    name: antilifeShell.name,
    version: antilifeShell.version,
    rules: antilifeShell.rules,
    move: [
        {
            pass: 'actorMoved',
            macro: moved,
            priority: 50
        },
        {
            pass: 'nearbyMoved',
            macro: movedNear,
            priority: 50,
            distance: 10
        }
    ]
};
