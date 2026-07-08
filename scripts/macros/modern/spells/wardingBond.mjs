import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'warding-bond') return;
    if (!workflow.targets.size || !workflow.token) return;
    const maxDistance = Number(automationUtils.getConfigValue(workflow.item, 'maxDistance')) || 60;
    const duration = activityUtils.getEffectDuration(workflow.activity);
    const targetEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration,
        system: {
            changes: [
                {key: 'system.traits.dr.all', type: 'custom', value: 1, phase: 'final', priority: 20},
                {key: 'system.attributes.ac.bonus', type: 'add', value: '+1', phase: 'final', priority: 20},
                {key: 'system.bonuses.abilities.save', type: 'add', value: '+1', phase: 'final', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'warding-bond-target'
            },
            'chris-premades': {
                wardingBond: {
                    bondUuid: workflow.token.document.uuid,
                    maxDistance
                }
            }
        }
    };
    const casterEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration,
        flags: {
            cat: {
                identifier: 'warding-bond-source'
            },
            'chris-premades': {
                wardingBond: {
                    bondUuids: Array.from(workflow.targets).map(token => token.document.uuid),
                    maxDistance
                }
            }
        }
    };
    const sourceBinding = {source: 'chris-premades', rules: '2024', identifier: 'warding-bond-source'};
    const targetBinding = {source: 'chris-premades', rules: '2024', identifier: 'warding-bond-target'};
    const created = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
        rules: '2024',
        macros: [{type: 'move', macros: [sourceBinding]}]
    });
    const sourceEffect = created?.[0];
    for (const token of workflow.targets) {
        const targetCreated = await effectUtils.createEffects(token.actor, [targetEffectData], {
            rules: '2024',
            macros: [
                {type: 'move', macros: [targetBinding]},
                {type: 'roll', macros: [targetBinding]}
            ]
        });
        if (sourceEffect && targetCreated?.length) await documentUtils.makeDependent(sourceEffect, targetCreated);
    }
}
async function onHit({document: effect, token, targetToken, workflow, ditem}) {
    if (!ditem || !workflow.damageList) return;
    const bondUuid = effect.flags['chris-premades']?.wardingBond?.bondUuid;
    if (!bondUuid) return;
    const bond = await fromUuid(bondUuid);
    if (!bond) return;
    const appliedDamage = Math.floor(ditem.damageDetail.reduce((acc, detail) => acc + detail.value, 0)) || 0;
    if (appliedDamage <= 0) return;
    const originItem = await fromUuid(effect.origin);
    const feature = originItem?.system.activities.find(a => a.identifier === 'warding-bond-damage');
    if (!feature) return;
    const activityData = activityUtils.getDamageModifiedActivityData(feature, String(appliedDamage));
    const targetWorkflow = await workflowUtils.syntheticActivityDataRoll(activityData, originItem, [bond.object ?? bond]);
    const bondActor = bond.actor ?? bond.object?.actor;
    if (bondActor && bondActor.system.attributes.hp.value !== 0) return;
    await documentUtils.deleteDocument(effect);
}
async function movedTarget({document: effect, token}) {
    const bondUuid = effect.flags['chris-premades']?.wardingBond?.bondUuid;
    const maxDistance = effect.flags['chris-premades']?.wardingBond?.maxDistance;
    if (!bondUuid || !maxDistance || !token) return;
    const bond = await fromUuid(bondUuid);
    if (!bond) return;
    const distance = tokenUtils.getDistance(bond, token.document ?? token);
    if (distance <= maxDistance) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.WardingBond.Distance'), {userId: queryUtils.gmID()});
    if (!selection) return;
    await documentUtils.deleteDocument(effect);
}
async function movedSource({document: effect, token}) {
    const bondUuids = effect.flags['chris-premades']?.wardingBond?.bondUuids;
    const maxDistance = effect.flags['chris-premades']?.wardingBond?.maxDistance;
    if (!bondUuids || !maxDistance) return;
    const selfToken = token ?? actorUtils.getFirstToken(effect.parent);
    if (!selfToken) return;
    let distant = false;
    for (const uuid of bondUuids) {
        const bond = await fromUuid(uuid);
        if (!bond) continue;
        if (tokenUtils.getDistance(selfToken.document ?? selfToken, bond) > maxDistance) {
            distant = true;
            break;
        }
    }
    if (!distant) return;
    const selection = await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.WardingBond.Distance'), {userId: queryUtils.gmID()});
    if (!selection) return;
    await documentUtils.deleteDocument(effect);
}
export const wardingBond = {
    name: 'Warding Bond',
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
        maxDistance: {
            default: 60,
            type: 'text',
            label: 'CHRISPREMADES.Macros.WardingBond.MaxDistance',
            category: 'tuning'
        }
    }
};
export const wardingBondTarget = {
    name: 'Warding Bond: Target',
    version: wardingBond.version,
    rules: wardingBond.rules,
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: onHit,
            priority: 300
        }
    ],
    move: [
        {
            pass: 'actorMoved',
            macro: movedTarget,
            priority: 50
        }
    ]
};
export const wardingBondSource = {
    name: 'Warding Bond: Source',
    version: wardingBond.version,
    rules: wardingBond.rules,
    move: [
        {
            pass: 'actorMoved',
            macro: movedSource,
            priority: 50
        }
    ]
};
