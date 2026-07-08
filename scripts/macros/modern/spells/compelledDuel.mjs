import {activityUtils, dialogUtils, documentUtils, effectUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.failedSaves.size) {
        if (concentration) await documentUtils.deleteDocument(concentration);
        return;
    }
    const duration = activityUtils.getEffectDuration(workflow.activity);
    const sourceEffectData = {
        name: _loc('CHRISPREMADES.Macros.CompelledDuel.Source'),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration,
        flags: {
            cat: {
                identifier: 'compelled-duel-source'
            },
            'chris-premades': {
                compelledDuel: {
                    targetUuids: Array.from(workflow.failedSaves).map(token => token.document.uuid)
                }
            }
        }
    };
    const sourceEffects = await effectUtils.createEffects(workflow.actor, [sourceEffectData], {
        rules: '2024',
        macros: [
            {type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'compelled-duel-source'}]},
            {type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'compelled-duel-source'}]}
        ]
    });
    const sourceEffect = sourceEffects?.[0];
    if (!sourceEffect) return;
    if (concentration) await documentUtils.makeDependent(concentration, [sourceEffect]);
    const targetEffectData = {
        name: _loc('CHRISPREMADES.Macros.CompelledDuel.Target'),
        img: workflow.item.img,
        type: 'base',
        origin: sourceEffect.uuid,
        duration,
        flags: {
            cat: {
                identifier: 'compelled-duel-target'
            },
            'chris-premades': {
                compelledDuel: {
                    sourceUuid: workflow.token.document.uuid
                }
            }
        }
    };
    for (const target of workflow.failedSaves) {
        const targetEffects = await effectUtils.createEffects(target.actor, [targetEffectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'compelled-duel-target'}]}]
        });
        if (targetEffects?.length) await documentUtils.makeDependent(sourceEffect, targetEffects);
    }
}
// Source: end the spell when the caster attacks someone else or targets an enemy other than the duel target
async function sourceAttack({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    const targetUuids = effect.flags['chris-premades']?.compelledDuel?.targetUuids;
    if (!targetUuids) return;
    let endSpell = false;
    for (const target of workflow.targets) {
        if (workflowUtils.isAttackType(workflow, 'attack')) {
            if (!targetUuids.includes(target.document.uuid)) {
                endSpell = true;
                break;
            }
        } else if (target.document.disposition !== workflow.token.document.disposition && !targetUuids.includes(target.document.uuid)) {
            endSpell = true;
            break;
        }
    }
    if (endSpell) await documentUtils.deleteDocument(effect);
}
// Source: at the caster's turn end, offer to end the spell if the target is more than 30 feet away
async function turnEnd({document: effect, token}) {
    const targetUuids = effect.flags['chris-premades']?.compelledDuel?.targetUuids;
    if (!targetUuids || !token) return;
    for (const targetUuid of targetUuids) {
        const targetToken = fromUuidSync(targetUuid);
        if (!targetToken) continue;
        const distance = tokenUtils.getDistance(token, targetToken);
        if (distance <= 30) continue;
        const item = await fromUuid(effect.origin);
        const confirmed = await dialogUtils.confirm(item?.name ?? effect.name, _loc('CHRISPREMADES.Macros.CompelledDuel.EndEffect'), {userId: queryUtils.gmUser()});
        if (confirmed) await documentUtils.deleteDocument(effect);
        return;
    }
}
// Target: disadvantage on attacks against anyone but the caster
async function targetAttack({document: effect, workflow}) {
    if (workflow.targets.size !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const sourceUuid = effect.flags['chris-premades']?.compelledDuel?.sourceUuid;
    if (!sourceUuid || workflow.targets.first().document.uuid === sourceUuid) return;
    workflow.disadvantage = true;
}
// Target: the spell ends when an enemy other than the caster attacks the target
async function targetAttacked({document: effect, workflow, targetToken}) {
    if (!targetToken || targetToken.disposition === workflow.token.document.disposition) return;
    const sourceUuid = effect.flags['chris-premades']?.compelledDuel?.sourceUuid;
    if (!sourceUuid || workflow.token.document.uuid === sourceUuid) return;
    await documentUtils.deleteDocument(effect);
}
export const compelledDuel = {
    name: 'Compelled Duel',
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
export const compelledDuelSource = {
    name: 'Compelled Duel: Source',
    version: compelledDuel.version,
    rules: compelledDuel.rules,
    roll: [
        {
            pass: 'actorAttackRollComplete',
            macro: sourceAttack,
            priority: 50
        }
    ],
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: turnEnd,
            priority: 50
        }
    ]
};
export const compelledDuelTarget = {
    name: 'Compelled Duel: Target',
    version: compelledDuel.version,
    rules: compelledDuel.rules,
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: targetAttack,
            priority: 50
        },
        {
            pass: 'targetDamageComplete',
            macro: targetAttacked,
            priority: 50
        }
    ]
};
