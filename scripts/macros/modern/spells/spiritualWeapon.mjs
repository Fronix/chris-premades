import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, summonUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
function rangeOverrideEffectData(item) {
    return {
        name: item.name + ': Attack',
        img: item.img,
        type: 'base',
        origin: item.uuid,
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.rangeOverride.attack.all',
                    type: 'custom',
                    value: 1,
                    phase: 'initial',
                    priority: 20
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'spiritual-weapon-attacking'
            }
        }
    };
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'spiritual-weapon-attack') return;
    if (!workflow.token) return;
    const sourcePack = game.packs.get('chris-premades.CPRSummons');
    if (!sourcePack) return;
    const sourceIndex = await sourcePack.getIndex();
    const sourceEntry = sourceIndex.find(entry => entry.name === 'CPR - Spiritual Weapon');
    if (!sourceEntry) return;
    const sourceActor = await sourcePack.getDocument(sourceEntry._id);
    const name = automationUtils.getConfigValue(workflow.item, 'name') || workflow.item.name;
    const duration = activityUtils.getEffectDuration(workflow.activity);
    const casterEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration,
        flags: {
            cat: {
                identifier: 'spiritual-weapon'
            }
        }
    };
    const casterEffects = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['spiritual-weapon-attack'],
            favorite: true
        }
    });
    const casterEffect = casterEffects?.[0];
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        duration: duration.value ?? 60,
        name,
        sourceDocument: workflow.item,
        initiative: 'none',
        parent: casterEffect
    });
    if (!summon) return;
    await summonUtils.placeSummon(summon, 60, {token: workflow.token.document});
    const summonToken = summon.token ?? actorUtils.getFirstToken(summon.actor);
    if (!summonToken) return;
    const nearby = tokenUtils.findNearby(summonToken.document ?? summonToken, 5, {disposition: 'enemy', includeIncapacitated: true});
    if (!nearby.length) return;
    let target;
    if (nearby.length === 1) {
        target = nearby[0];
    } else {
        const selected = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectATarget'), nearby, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        target = selected[0];
    }
    const attackActivity = workflow.item.system.activities.find(a => a.identifier === 'spiritual-weapon-attack');
    if (!attackActivity) return;
    await workflowUtils.syntheticActivityRoll(attackActivity, [target]);
}
async function early({activity, actor, dialog}) {
    if (documentUtils.getIdentifier(activity) !== 'spiritual-weapon-attack') return;
    if (dialog) dialog.configure = false;
    const summons = summonUtils.getSummonBySource(activity.item);
    const summonActor = summons?.[0]?.actor;
    const effectData = rangeOverrideEffectData(activity.item);
    await effectUtils.createEffects(actor, [effectData]);
    if (summonActor) await effectUtils.createEffects(summonActor, [effectData]);
}
async function late({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'spiritual-weapon-attack') return;
    const summons = summonUtils.getSummonBySource(workflow.item);
    const summonActor = summons?.[0]?.actor;
    for (const actor of [workflow.actor, summonActor]) {
        if (!actor) continue;
        const effect = actorUtils.getEffectByIdentifier(actor, 'spiritual-weapon-attacking');
        if (effect) await documentUtils.deleteDocument(effect);
    }
}
export const spiritualWeapon = {
    name: 'Spiritual Weapon',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemPreTargeting',
            macro: early,
            priority: 50
        },
        {
            pass: 'itemAttackRollComplete',
            macro: late,
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
