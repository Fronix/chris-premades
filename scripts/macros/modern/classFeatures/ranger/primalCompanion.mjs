import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, summonUtils, workflowUtils} from '../../../../proxy.mjs';
async function getPackEntry(packId, name) {
    const pack = game.packs.get(packId);
    if (!pack) return;
    const index = await pack.getIndex();
    return index.find(entry => entry.name === name);
}
async function getPackItemData(packId, name, identifier) {
    const entry = await getPackEntry(packId, name);
    if (!entry) return;
    const doc = await fromUuid(entry.uuid);
    if (!doc) return;
    const data = doc.toObject();
    delete data._id;
    if (identifier) data.system.identifier = identifier;
    return data;
}
async function use({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    if (!['primal-companion-land', 'primal-companion-sea', 'primal-companion-sky'].includes(activityIdentifier)) return;
    if (!workflow.token) return;
    const sourceEntry = await getPackEntry('chris-premades.CPRSummons', 'CPR - Primal Companion');
    if (!sourceEntry) return;
    const sourceActor = await fromUuid(sourceEntry.uuid);
    const classLevel = workflow.actor.classes?.ranger?.system?.levels;
    if (!classLevel || !sourceActor) return;
    const creatureType = activityIdentifier.split('-').pop();
    const exceptionalTraining = actorUtils.getItemByIdentifier(workflow.actor, 'exceptional-training');
    const itemsToAdd = [];
    const primalBond = await getPackItemData('chris-premades.CPRSummonFeatures', 'Primal Bond', 'primal-companion-primal-bond');
    if (primalBond) itemsToAdd.push(primalBond);
    const actionNames = exceptionalTraining ? ['Dash', 'Disengage', 'Dodge', 'Help'] : ['Dodge'];
    for (const actionName of actionNames) {
        const actionData = await getPackItemData('chris-premades.CPRActions', actionName, 'primal-companion-' + actionName.toLowerCase());
        if (!actionData) continue;
        if (exceptionalTraining) {
            Object.values(actionData.system.activities ?? {}).forEach(activityData => activityData.activation.type = 'bonus');
        }
        itemsToAdd.push(actionData);
    }
    let hpValue = 5 + classLevel * 5;
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.BeastOfThe' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const profs = workflow.actor.system.attributes.prof;
    const cr = profs >= 6 ? (profs - 2) * 4 : (profs - 1) * 4 - 3;
    const updates = {
        name,
        system: {
            details: {cr: Math.max(1, cr)},
            attributes: {
                hp: {formula: String(hpValue), max: hpValue, value: hpValue},
                ac: {flat: 13 + workflow.actor.system.abilities.wis.mod}
            }
        },
        prototypeToken: {name, disposition: workflow.token.document.disposition},
        items: itemsToAdd
    };
    const strikeNames = {land: 'Beast\'s Strike (Land)', sea: 'Beast\'s Strike (Sea)', sky: 'Beast\'s Strike (Sky)'};
    const strikeEntry = await getPackEntry('chris-premades.CPRSummonFeatures', strikeNames[creatureType]);
    if (!strikeEntry) return;
    let damageType;
    if (creatureType === 'land') {
        damageType = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Dialog.DamageType'), [
            ['DND5E.DamageBludgeoning', 'bludgeoning'],
            ['DND5E.DamagePiercing', 'piercing'],
            ['DND5E.DamageSlashing', 'slashing']
        ]) || 'slashing';
        foundry.utils.setProperty(updates, 'system.attributes.movement', {walk: 40, climb: 40});
    } else if (creatureType === 'sea') {
        damageType = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Dialog.DamageType'), [
            ['DND5E.DamageBludgeoning', 'bludgeoning'],
            ['DND5E.DamagePiercing', 'piercing']
        ]) || 'bludgeoning';
        const amphibious = await getPackItemData('chris-premades.CPRSummonFeatures', 'Amphibious', 'primal-companion-amphibious');
        if (amphibious) updates.items.push(amphibious);
        foundry.utils.setProperty(updates, 'system.attributes.movement', {walk: 5, swim: 60});
    } else {
        damageType = 'slashing';
        hpValue = 4 + 4 * classLevel;
        const flyby = await getPackItemData('chris-premades.CPRSummonFeatures', 'Flyby', 'primal-companion-flyby');
        if (flyby) updates.items.push(flyby);
        foundry.utils.mergeObject(updates.system, {
            abilities: {str: {value: 6}, dex: {value: 16}, con: {value: 13}},
            attributes: {
                hp: {formula: String(hpValue), max: hpValue, value: hpValue},
                movement: {walk: 10, fly: 60}
            },
            traits: {size: 'sm'}
        });
        foundry.utils.setProperty(updates, 'prototypeToken.texture', {scaleX: 0.8, scaleY: 0.8});
    }
    const existing = summonUtils.getSummonBySource(workflow.item);
    if (existing?.length) for (const summonToken of existing) await summonUtils.deleteSummon(summonToken.actor ?? summonToken);
    const oldEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'primal-companion-effect');
    if (oldEffect) await documentUtils.deleteDocument(oldEffect);
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        name,
        sourceDocument: workflow.item,
        initiative: 'follows',
        items: [{uuid: strikeEntry.uuid, matchAttack: true}],
        updates
    });
    if (!summon) return;
    const strikeItem = summon.items.find(i => i.name === strikeNames[creatureType]);
    if (strikeItem) {
        const types = [damageType];
        if (exceptionalTraining) types.push('force');
        const strikeUpdates = {'system.identifier': 'primal-companion-strike', 'flags.cat.macros.roll': [{source: 'chris-premades', rules: '2024', identifier: 'primal-companion-strike'}]};
        const attackActivity = strikeItem.system.activities.find(a => a.type === 'attack');
        if (attackActivity) {
            const damageParts = attackActivity.toObject().damage.parts;
            if (damageParts[0]) damageParts[0].types = types;
            strikeUpdates['system.activities.' + attackActivity.id + '.damage.parts'] = damageParts;
        }
        await documentUtils.update(strikeItem, strikeUpdates);
    }
    await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: 'primal-companion-effect'
            }
        }
    }], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['primal-companion-command'],
            favorite: true
        }
    });
    await summonUtils.placeSummon(summon, 10, {token: workflow.token});
}
async function strikeDamage({workflow}) {
    const ownerUuid = workflow.actor.flags.cat?.summon?.owner;
    if (!ownerUuid) return;
    const ownerActor = await fromUuid(ownerUuid);
    if (!ownerActor) return;
    const bestialFury = actorUtils.getItemByIdentifier(ownerActor, 'bestial-fury');
    if (!bestialFury) return;
    if (workflow.hitTargets.size !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const effect = actorUtils.getEffectByIdentifier(ownerActor, 'hunters-mark');
    if (!effect) return;
    const markData = effect.flags['chris-premades']?.huntersMark;
    if (!markData) return;
    const {targets: validTargetUuids, formula, damageType} = markData;
    if (!validTargetUuids?.includes(workflow.hitTargets.first().document.uuid)) return;
    const combat = game.combat;
    if (combat && workflow.item.getFlag('cat', 'bestialFuryStamp') === combat.round + '-' + combat.turn) return;
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
    if (combat) await workflow.item.setFlag('cat', 'bestialFuryStamp', combat.round + '-' + combat.turn);
}
export const primalCompanion = {
    name: 'Primal Companion',
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
        landName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        seaName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        skyName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
export const primalCompanionStrike = {
    name: 'Primal Companion: Strike',
    version: primalCompanion.version,
    rules: primalCompanion.rules,
    roll: [
        {
            pass: 'itemDamageRollComplete',
            macro: strikeDamage,
            priority: 250
        }
    ]
};
