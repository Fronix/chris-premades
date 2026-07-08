import {activityUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function cast({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'cast') return;
    const target = workflow.targets.first()?.actor;
    if (!target) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {key: 'system.attributes.death.roll.mode', type: 'add', value: 1, phase: 'final', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'death-armor-effect'
            }
        }
    };
    await effectUtils.createEffects(target, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'death-armor-effect'}]}]
    });
}
async function hit({document: effect, workflow, ditem}) {
    if (!ditem?.isHit) return;
    if (!workflowUtils.isAttackType(workflow, 'meleeAttack')) return;
    if (!workflow.token) return;
    const wearerToken = effect.parent ? (effect.parent.getActiveTokens?.()[0]?.document ?? null) : null;
    if (wearerToken && tokenUtils.getDistance(workflow.token.document, wearerToken) > 5) return;
    const combat = game.combat;
    if (combat && effect.flags.cat?.deathArmorStamp === combat.round + '-' + combat.turn) return;
    const spell = await fromUuid(effect.origin);
    const damage = spell?.system.activities.find(a => a.identifier === 'damage');
    if (!damage) return;
    await workflowUtils.syntheticActivityRoll(damage, [workflow.token]);
    if (combat) await effect.setFlag('cat', 'deathArmorStamp', combat.round + '-' + combat.turn);
}
export const deathArmor = {
    name: 'Death Armor',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: cast,
            priority: 50
        }
    ]
};
export const deathArmorEffect = {
    name: deathArmor.name,
    version: deathArmor.version,
    rules: deathArmor.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: hit,
            priority: 250
        }
    ]
};
