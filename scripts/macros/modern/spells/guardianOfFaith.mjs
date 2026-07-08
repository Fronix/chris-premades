import {actorUtils, automationUtils, combatUtils, documentUtils, summonUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.token) return;
    const sourcePack = game.packs.get('chris-premades.CPRSummons');
    const featurePack = game.packs.get('chris-premades.CPRSummonFeatures');
    if (!sourcePack || !featurePack) return;
    const sourceIndex = await sourcePack.getIndex();
    const sourceEntry = sourceIndex.find(entry => entry.name === 'CPR - Guardian of Faith');
    if (!sourceEntry) return;
    const sourceActor = await sourcePack.getDocument(sourceEntry._id);
    const featureIndex = await featurePack.getIndex({fields: ['system.identifier']});
    const featureEntry = featureIndex.find(entry => entry.system?.identifier === 'guardian-of-faith-damage') ?? featureIndex.find(entry => entry.name.startsWith('Guardian of Faith'));
    if (!featureEntry) return;
    const name = automationUtils.getConfigValue(workflow.item, 'name') || sourceActor.name;
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        duration: 28800,
        name,
        sourceDocument: workflow.item,
        initiative: 'none',
        items: [{uuid: featureEntry.uuid, matchDC: true}],
        updates: {
            flags: {
                cat: {
                    identifier: 'guardian-of-faith-summon',
                    macros: {
                        combat: [{source: 'chris-premades', rules: '2024', identifier: 'guardian-of-faith-damage'}],
                        move: [{source: 'chris-premades', rules: '2024', identifier: 'guardian-of-faith-damage'}]
                    }
                }
            }
        }
    });
    if (!summon) return;
    await summonUtils.placeSummon(summon, 30, {token: workflow.token.document});
}
async function moveOrStart({document, token}) {
    const guardianActor = document instanceof Actor ? document : document.actor;
    if (!guardianActor || !token?.actor) return;
    if (token.actor === guardianActor) return;
    const guardianToken = actorUtils.getFirstToken(guardianActor);
    if (!guardianToken) return;
    const feature = actorUtils.getItemByIdentifier(guardianActor, 'guardian-of-faith-damage');
    if (!feature?.system.uses.value) return;
    const combatData = tokenUtils.getCombatData(token);
    if (combatData.inCombat) {
        const stamps = guardianActor.flags['chris-premades']?.guardianOfFaith?.stamps ?? [];
        if (combatUtils.isStampedThisTurn(stamps, token.id, combatData)) return;
        await documentUtils.update(guardianActor, {'flags.chris-premades.guardianOfFaith.stamps': combatUtils.addTurnStamp(stamps, token.id, combatData)});
    }
    const attackWorkflow = await workflowUtils.syntheticItemRoll(feature, [token]);
    const applied = Math.floor(attackWorkflow?.damageList?.[0]?.damageDetail?.reduce((acc, detail) => acc + detail.value, 0) ?? 0);
    if (!applied) return;
    await documentUtils.update(feature, {'system.uses.spent': feature.system.uses.spent + applied});
    if (feature.system.uses.value > 0) return;
    const sourceDocument = await fromUuid(guardianActor.flags.cat?.summon?.sourceDocument ?? '');
    if (!sourceDocument) return;
    await Promise.all(summonUtils.getSummonBySource(sourceDocument).map(summon => summonUtils.deleteSummon(summon)));
}
export const guardianOfFaith = {
    name: 'Guardian of Faith',
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
        name: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'general'
        }
    }
};
export const guardianOfFaithDamage = {
    name: 'Guardian of Faith: Damage',
    version: guardianOfFaith.version,
    rules: guardianOfFaith.rules,
    combat: [
        {
            pass: 'nearbyTurnStart',
            macro: moveOrStart,
            priority: 50,
            distance: 10,
            dispositions: ['enemy']
        }
    ],
    move: [
        {
            pass: 'nearbyMoved',
            macro: moveOrStart,
            priority: 50,
            distance: 10,
            dispositions: ['enemy']
        }
    ]
};
