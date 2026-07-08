import {activityUtils, actorUtils, documentUtils, effectUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
function buildEffectData(workflow) {
    const naturesWard = actorUtils.getEffectByIdentifier(workflow.actor, 'natures-ward');
    const wardChanges = naturesWard?.toObject().system?.changes ?? naturesWard?.toObject().changes ?? [];
    const resistance = wardChanges[1]?.value ?? 'fire';
    return {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        statuses: ['coverHalf'],
        system: {
            changes: [
                {key: 'system.traits.dr.value', type: 'add', value: resistance, phase: 'final', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'natures-sanctuary'
            }
        }
    };
}
async function applyToTokens(region, tokens) {
    const disposition = region.flags['chris-premades']?.naturesSanctuary?.disposition;
    const effectData = region.flags['chris-premades']?.naturesSanctuary?.effectData;
    if (!effectData) return;
    for (const token of tokens) {
        if (!token?.actor) continue;
        if ((token.disposition ?? token.document?.disposition) !== disposition) continue;
        if (actorUtils.getEffectByIdentifier(token.actor, 'natures-sanctuary')) continue;
        const created = await effectUtils.createEffects(token.actor, [effectData]);
        if (created?.length) await documentUtils.makeDependent(region, created);
    }
}
async function removeFromTokens(tokens) {
    for (const token of tokens) {
        if (!token?.actor) continue;
        const effect = actorUtils.getEffectByIdentifier(token.actor, 'natures-sanctuary');
        if (effect) await documentUtils.deleteDocument(effect);
    }
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'natures-sanctuary') return;
    const region = workflow.template;
    if (!region || !workflow.token) return;
    const effectData = buildEffectData(workflow);
    await documentUtils.update(region, {
        flags: {
            cat: {
                identifier: 'natures-sanctuary',
                macros: {
                    region: [{source: 'chris-premades', rules: '2024', identifier: 'natures-sanctuary-template'}]
                }
            },
            'chris-premades': {
                naturesSanctuary: {
                    disposition: workflow.token.document.disposition,
                    effectData
                }
            }
        }
    });
    await applyToTokens(region, Array.from(workflow.targets).map(token => token.document ?? token));
    const casterEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'natures-sanctuary-source'
            },
            'chris-premades': {
                naturesSanctuary: {regionUuid: region.uuid}
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['natures-sanctuary-move'],
            favorite: true
        }
    });
    if (created?.[0]) await documentUtils.makeDependent(created[0], [region]);
}
async function entered(trigger) {
    await applyToTokens(trigger.document, trigger.tokens ?? []);
}
async function exited(trigger) {
    await removeFromTokens(trigger.tokens ?? []);
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['natures-sanctuary'], 'wild-shape');
}
export const naturesSanctuary = {
    name: 'Nature\'s Sanctuary',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
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
    ]
};
export const naturesSanctuaryTemplate = {
    name: 'Nature\'s Sanctuary: Template',
    version: naturesSanctuary.version,
    rules: naturesSanctuary.rules,
    region: [
        {
            pass: 'entered',
            macro: entered,
            priority: 50
        },
        {
            pass: 'exited',
            macro: exited,
            priority: 50
        }
    ]
};
