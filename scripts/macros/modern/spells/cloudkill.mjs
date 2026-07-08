import {activityUtils, actorUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
function turnKey() {
    if (!game.combat?.started) return null;
    return game.combat.round + '-' + game.combat.turn;
}
async function damageTokens(region, tokens) {
    const originItem = await fromUuid(region.flags['chris-premades']?.cloudkill?.origin ?? '');
    if (!originItem) return;
    const feature = originItem.system.activities.find(a => a.identifier === 'cloudkill-damage');
    if (!feature) return;
    let targets = tokens.filter(token => token?.actor);
    const turn = turnKey();
    if (turn) {
        const touched = region.flags['chris-premades']?.cloudkill?.touchedTokens?.[turn] ?? [];
        targets = targets.filter(token => !touched.includes(token.id));
        if (targets.length) {
            touched.push(...targets.map(token => token.id));
            await documentUtils.update(region, {['flags.chris-premades.cloudkill.touchedTokens.' + turn]: touched});
        }
    }
    if (!targets.length) return;
    await workflowUtils.syntheticActivityRoll(feature, targets.map(token => token.object ?? token));
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'cloudkill') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.template) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    await documentUtils.update(workflow.template, {
        flags: {
            cat: {
                identifier: 'cloudkill',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'cloudkill-cloud'}]
                }
            },
            'chris-premades': {
                cloudkill: {origin: workflow.item.uuid, touchedTokens: {}}
            }
        }
    });
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'cloudkill-source'
            },
            'chris-premades': {
                cloudkill: {templateUuid: workflow.template.uuid}
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'cloudkill-source'}]}]
    });
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function sourceTurnStart({document: effect}) {
    const region = await fromUuid(effect.flags['chris-premades']?.cloudkill?.templateUuid ?? '');
    if (!region) return;
    const casterToken = actorUtils.getFirstToken(effect.parent);
    if (casterToken) {
        const anchor = region.shapes?.[0];
        const center = anchor ? {x: anchor.x ?? region.x ?? 0, y: anchor.y ?? region.y ?? 0} : null;
        if (center) {
            const ray = new foundry.canvas.geometry.Ray(casterToken.center, center);
            const movePixels = 2 * canvas.grid.size;
            if (ray.distance > 0) {
                const newCenter = ray.project((ray.distance + movePixels) / ray.distance);
                const dx = newCenter.x - center.x;
                const dy = newCenter.y - center.y;
                const newShapes = region.toObject().shapes.map(shape => ({...shape, x: (shape.x ?? 0) + dx, y: (shape.y ?? 0) + dy, points: shape.points?.map((p, i) => i % 2 === 0 ? p + dx : p + dy)}));
                await documentUtils.update(region, {shapes: newShapes});
            }
        }
    }
    const tokens = Array.from(region.tokens ?? []);
    await damageTokens(region, tokens);
}
async function moved(trigger) {
    const region = trigger.document;
    const tokens = trigger.tokens ?? [];
    await damageTokens(region, tokens);
}
export const cloudkill = {
    name: 'Cloudkill',
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
export const cloudkillCloud = {
    name: 'Cloudkill: Cloud',
    version: cloudkill.version,
    rules: cloudkill.rules,
    region: [
        {
            pass: 'entered',
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
export const cloudkillSource = {
    name: 'Cloudkill: Source',
    version: cloudkill.version,
    rules: cloudkill.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: sourceTurnStart,
            priority: 50
        }
    ]
};
