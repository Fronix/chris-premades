import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, summonUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
import {getPackEntry} from '../../spells/summonSpells.mjs';
function getDuplicityToken(actor) {
    const item = actorUtils.getItemByIdentifier(actor, 'invoke-duplicity');
    if (!item) return;
    const summons = summonUtils.getSummonBySource(item);
    return summons?.[0];
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'summon') return;
    if (!workflow.token) return;
    const sourceEntry = await getPackEntry('chris-premades.CPRSummons2024', 'CPR - Invoke Duplicity');
    if (!sourceEntry) return;
    const sourceActor = await fromUuid(sourceEntry.uuid);
    if (!sourceActor) return;
    let name = automationUtils.getConfigValue(workflow.item, 'name');
    if (!name?.length) name = sourceActor.name;
    const existing = getDuplicityToken(workflow.actor);
    if (existing) await summonUtils.deleteSummon(existing.actor ?? existing);
    const oldEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'invoke-duplicity');
    if (oldEffect) await documentUtils.deleteDocument(oldEffect);
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        name,
        duration: activityUtils.getEffectDuration(workflow.activity)?.seconds ?? 60,
        sourceDocument: workflow.item,
        initiative: 'none',
        updates: {name, prototypeToken: {name, disposition: workflow.token.document.disposition}}
    });
    if (!summon) return;
    await summonUtils.placeSummon(summon, workflow.activity.range?.value ?? 30, {token: workflow.token});
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'invoke-duplicity-active'};
    const created = await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'invoke-duplicity'
            }
        }
    }], {
        rules: '2024',
        macros: [{type: 'roll', macros: [macroEntry]}],
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['cast-spells', 'move', 'dismiss'],
            favorite: true
        }
    });
    const trickstersTransposition = actorUtils.getItemByIdentifier(workflow.actor, 'tricksters-transposition');
    if (trickstersTransposition) {
        const selection = await dialogUtils.confirm(trickstersTransposition.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: trickstersTransposition.name}));
        if (selection) await swapWithDuplicate(workflow.actor, trickstersTransposition);
    }
}
async function swapWithDuplicate(actor, feature) {
    const casterToken = actorUtils.getFirstToken(actor);
    const duplicityToken = getDuplicityToken(actor);
    if (!casterToken || !duplicityToken) return;
    const casterDoc = casterToken.document ?? casterToken;
    const dupDoc = duplicityToken.document ?? duplicityToken;
    const casterPos = {x: casterDoc.x, y: casterDoc.y};
    await documentUtils.update(casterDoc, {x: dupDoc.x, y: dupDoc.y}, {animate: false, teleport: true});
    await documentUtils.update(dupDoc, casterPos, {animate: false, teleport: true});
    if (feature) await workflowUtils.completeItemUse(feature);
}
async function attackAdvantage({document: effect, workflow}) {
    if (!workflow.activity || !workflow.targets.size || !workflow.token) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const duplicityToken = getDuplicityToken(workflow.actor);
    if (!duplicityToken) return;
    const target = workflow.targets.first();
    const distance = tokenUtils.getDistance(target.document ?? target, duplicityToken.document ?? duplicityToken);
    if (distance > 5) return;
    workflow.advantage = true;
}
async function castSpells({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'cast-spells') return;
    if (!workflow.token) return;
    const duplicityToken = getDuplicityToken(workflow.actor);
    if (!duplicityToken) return;
    const effectData = {
        name: workflow.activity.name,
        img: workflow.activity.img || workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.rangeOverride.attack.all', type: 'custom', value: 1, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['1Spell']
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData]);
}
async function dismiss({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'dismiss') return;
    const duplicityToken = getDuplicityToken(workflow.actor);
    if (duplicityToken) await summonUtils.deleteSummon(duplicityToken.actor ?? duplicityToken);
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'invoke-duplicity');
    if (effect) await documentUtils.deleteDocument(effect);
}
async function move({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'move') return;
    const feature = actorUtils.getItemByIdentifier(workflow.actor, 'tricksters-transposition');
    if (!feature) return;
    const selection = await dialogUtils.confirm(feature.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: feature.name}));
    if (selection) await swapWithDuplicate(workflow.actor, feature);
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['summon'], 'channel-divinity-cleric');
}
export const invokeDuplicity = {
    name: 'Invoke Duplicity',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: castSpells,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: dismiss,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: move,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ],
    config: {
        name: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
export const invokeDuplicityActive = {
    name: 'Invoke Duplicity: Active',
    version: invokeDuplicity.version,
    rules: invokeDuplicity.rules,
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: attackAdvantage,
            priority: 50
        }
    ]
};
export const improvedDuplicity = {
    name: 'Improved Duplicity',
    version: '2.0.0',
    rules: '2024'
};
export const trickstersTransposition = {
    name: 'Trickster\'s Transposition',
    version: '2.0.0',
    rules: '2024'
};
