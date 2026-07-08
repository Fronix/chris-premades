import {actorUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
function makeRestoreFlow(identifier) {
    return {
        async use({workflow}) {
            if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
            const effectData = {
                name: workflow.item.name + ' ' + _loc('CHRISPREMADES.Generic.Used'),
                img: workflow.item.img,
                type: 'base',
                origin: workflow.item.uuid,
                flags: {
                    cat: {
                        identifier
                    },
                    dae: {
                        specialDuration: ['longRest']
                    }
                }
            };
            await effectUtils.createEffects(workflow.actor, [effectData], {
                unhideActivities: {
                    itemUuid: workflow.item.uuid,
                    activityIdentifiers: ['restore']
                }
            });
        },
        async restore({workflow}) {
            if (documentUtils.getIdentifier(workflow.activity) !== 'restore') return;
            const effect = actorUtils.getEffectByIdentifier(workflow.actor, identifier);
            if (effect) await documentUtils.deleteDocument(effect);
        }
    };
}
const veilFlow = makeRestoreFlow('psychic-veil-restore-effect');
async function veilAdded({document: item}) {
    await correctActivityItemConsumption(item, ['restore'], 'psionic-power');
}
export const psychicVeil = {
    name: 'Psychic Veil',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: veilFlow.use,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: veilFlow.restore,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: veilAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: veilAdded,
            priority: 50
        }
    ]
};
const rendFlow = makeRestoreFlow('rend-mind-restore-effect');
export const rendMind = {
    name: 'Rend Mind',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: rendFlow.use,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: rendFlow.restore,
            priority: 50
        }
    ],
    item: psychicVeil.item
};
async function teleport({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'psychic-teleportation') return;
    if (!workflow.token) return;
    const range = workflow.utilityRolls?.[0]?.total;
    if (!range) return;
    await tokenUtils.teleportToken(workflow.token.document, {range});
}
async function bladesAdded({document: item}) {
    await correctActivityItemConsumption(item, ['psychic-teleportation'], 'psionic-power');
}
export const soulBlades = {
    name: 'Soul Blades',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: teleport,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: bladesAdded,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: bladesAdded,
            priority: 50
        }
    ]
};
