import {documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
function turnKey() {
    if (!game.combat?.started) return null;
    return game.combat.round + '-' + game.combat.turn;
}
async function damageTokens(region, tokens) {
    const originItem = await fromUuid(region.flags['chris-premades']?.wallOfFire?.origin ?? '');
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'wall-of-fire-damage');
    if (!feature) return;
    let targets = tokens.filter(token => token?.actor);
    const turn = turnKey();
    if (turn) {
        const touched = region.flags['chris-premades']?.wallOfFire?.touchedTokens?.[turn] ?? [];
        targets = targets.filter(token => !touched.includes(token.id));
        if (targets.length) {
            touched.push(...targets.map(token => token.id));
            await documentUtils.update(region, {['flags.chris-premades.wallOfFire.touchedTokens.' + turn]: touched});
        }
    }
    if (!targets.length) return;
    await workflowUtils.syntheticActivityRoll(feature, targets.map(token => token.object ?? token));
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'wall-of-fire-damage') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.template) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    await documentUtils.update(workflow.template, {
        flags: {
            cat: {
                identifier: 'wall-of-fire',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'wall-of-fire-wall'}]
                }
            },
            'chris-premades': {
                wallOfFire: {origin: workflow.item.uuid, touchedTokens: {}}
            }
        }
    });
    if (concentrationEffect) await documentUtils.makeDependent(concentrationEffect, [workflow.template]);
}
async function moved(trigger) {
    const region = trigger.document;
    const tokens = trigger.tokens ?? [];
    await damageTokens(region, tokens);
}
export const wallOfFire = {
    name: 'Wall of Fire',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const wallOfFireWall = {
    name: 'Wall of Fire: Wall',
    version: wallOfFire.version,
    rules: wallOfFire.rules,
    region: [
        {
            pass: 'entered',
            macro: moved,
            priority: 50
        },
        {
            pass: 'passedOver',
            macro: moved,
            priority: 50
        },
        {
            pass: 'stayed',
            macro: moved,
            priority: 50
        }
    ]
};
