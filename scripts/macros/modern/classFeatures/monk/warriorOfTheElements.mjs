import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
import {unarmedAttackIdentifiers} from '../../../lib/monkUtils.mjs';
const elementTypes = ['acid', 'cold', 'fire', 'lightning', 'thunder'];
async function chooseElement(item, flagKey) {
    const prevChoice = item.flags['chris-premades']?.[flagKey];
    const choice = await dialogUtils.selectDamageType(elementTypes, item.name, _loc('CHRISPREMADES.Dialog.DamageType'));
    if (choice && choice !== 'no') await documentUtils.update(item, {['flags.chris-premades.' + flagKey]: choice});
    return (choice && choice !== 'no') ? choice : prevChoice;
}
function getMartialArtsDie(actor) {
    return actor.system.scale?.monk?.['martial-arts']?.faces;
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'elemental-attunement');
    if (existing) await documentUtils.deleteDocument(existing);
    const changes = [];
    if (actorUtils.getItemByIdentifier(workflow.actor, 'stride-of-the-elements')) {
        changes.push(
            {key: 'system.attributes.movement.fly', type: 'upgrade', value: '@attributes.movement.walk', phase: 'final', priority: 20},
            {key: 'system.attributes.movement.swim', type: 'upgrade', value: '@attributes.movement.walk', phase: 'final', priority: 20}
        );
    }
    const macroEntries = [{source: 'chris-premades', rules: '2024', identifier: 'elemental-attunement-strikes'}];
    const epitome = actorUtils.getItemByIdentifier(workflow.actor, 'elemental-epitome');
    let unhideActivities;
    if (epitome) {
        const resistance = await chooseElement(epitome, 'elementalEpitomeChoice');
        if (resistance) changes.push({key: 'system.traits.dr.value', type: 'add', value: resistance, phase: 'final', priority: 20});
        macroEntries.push({source: 'chris-premades', rules: '2024', identifier: 'elemental-epitome-strikes'});
        unhideActivities = {itemUuid: epitome.uuid, activityIdentifiers: ['swap'], favorite: true};
    }
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {changes},
        flags: {
            cat: {
                identifier: 'elemental-attunement'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: macroEntries}],
        unhideActivities
    });
    const effect = created?.[0];
    if (!effect) return;
    const items = workflow.actor.items.filter(i => unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(i)));
    for (const unarmedItem of items) {
        const enchantmentData = {
            name: workflow.item.name,
            img: workflow.item.img,
            type: 'enchantment',
            origin: workflow.item.uuid,
            system: {
                changes: [
                    {key: 'system.range.reach', type: 'upgrade', value: (unarmedItem.system.range?.reach ?? 5) + 10, phase: 'final', priority: 20}
                ]
            },
            flags: {
                cat: {
                    identifier: 'elemental-attunement-enchantment'
                }
            }
        };
        const [enchantment] = await unarmedItem.createEmbeddedDocuments('ActiveEffect', [enchantmentData]);
        if (enchantment) await documentUtils.makeDependent(effect, [enchantment]);
    }
}
async function strikes({document: effect, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (!unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item))) return;
    if (documentUtils.getIdentifier(workflow.activity) !== 'punch') return;
    const item = await fromUuid(effect.origin);
    if (!item) return;
    let damageType = effect.flags['chris-premades']?.elementalAttunement;
    const remember = automationUtils.getConfigValue(item, 'remember');
    if (!remember || !damageType) {
        const buttons = elementTypes.map(type => [CONFIG.DND5E.damageTypes[type].label, type]);
        buttons.push(['CHRISPREMADES.Generic.No', 'no']);
        const selection = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Dialog.DamageType'), buttons);
        if (!selection) return;
        if (selection !== damageType) await documentUtils.update(effect, {'flags.chris-premades.elementalAttunement': selection});
        damageType = selection;
    }
    if (!damageType || damageType === 'no') return;
    workflowUtils.setWorkflowProperty(workflow, 'elementalAttunementUsed', true);
    for (let i = 0; i < workflow.damageRolls.length; i++) {
        workflow.damageRolls[i].options.type = damageType;
    }
    await workflow.setDamageRolls(workflow.damageRolls);
    const activity = item.system.activities.find(a => a.identifier === 'move');
    if (!activity || !workflow.token) return;
    const target = workflow.hitTargets.first();
    const current = tokenUtils.getDistance(workflow.token.document, target.document ?? target);
    const buttons = [
        [_loc('CHRISPREMADES.Distance.10') + ' ' + _loc('CHRISPREMADES.Direction.Away'), 10],
        [_loc('CHRISPREMADES.Distance.5') + ' ' + _loc('CHRISPREMADES.Direction.Away'), 5],
        ['CHRISPREMADES.Generic.None', 0]
    ];
    if (current > 5) buttons.push([_loc('CHRISPREMADES.Distance.5') + ' ' + _loc('CHRISPREMADES.Direction.Towards'), -5]);
    if (current > 10) buttons.push([_loc('CHRISPREMADES.Distance.10') + ' ' + _loc('CHRISPREMADES.Direction.Towards'), -10]);
    const distance = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Macros.Crusher.Move'), buttons);
    if (!distance) return;
    const save = await workflowUtils.syntheticActivityRoll(activity, [target.object ?? target]);
    if (!save?.failedSaves?.size) return;
    await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token, distance: Number(distance)});
}
async function epitomeStrikes({workflow}) {
    if (!workflow.hitTargets.size) return;
    if (!unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item))) return;
    if (documentUtils.getIdentifier(workflow.activity) !== 'punch') return;
    const feature = actorUtils.getItemByIdentifier(workflow.actor, 'elemental-epitome');
    if (!feature?.system.uses.value) return;
    const dice = getMartialArtsDie(workflow.actor);
    if (!dice) return;
    const bonusFormula = '1d' + dice;
    const activity = feature.system.activities.find(a => a.identifier === 'strike');
    if (!activity) return;
    const confirmed = await dialogUtils.confirm(feature.name, _loc('CHRISPREMADES.Dialog.UseWeaponDamageExtra', {itemName: feature.name, bonusFormula}));
    if (!confirmed) return;
    await workflowUtils.bonusDamage(workflow, bonusFormula, {damageType: workflow.damageRolls[0]?.options.type});
    await workflowUtils.completeActivityUse(activity, [], {consumeUsage: true});
}
async function burst({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    const dice = getMartialArtsDie(workflow.actor);
    if (!dice) return;
    const damageType = await dialogUtils.selectDamageType(elementTypes, workflow.item.name, _loc('CHRISPREMADES.Dialog.DamageType'));
    if (!damageType || damageType === 'no') return;
    const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, '3d' + dice, {types: [damageType]});
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id] = activityData;
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
async function swap({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'swap') return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'elemental-attunement');
    if (!effect) return;
    const damageType = await chooseElement(workflow.item, 'elementalEpitomeChoice');
    if (!damageType) return;
    const effectData = effect.toObject();
    const changes = effectData.system?.changes ?? effectData.changes ?? [];
    const resistance = changes.find(change => change.key === 'system.traits.dr.value');
    if (resistance) resistance.value = damageType;
    else changes.push({key: 'system.traits.dr.value', type: 'add', value: damageType, phase: 'final', priority: 20});
    await documentUtils.update(effect, {'system.changes': changes});
}
async function addedAttunement({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'monks-focus');
}
export const elementalAttunement = {
    name: 'Elemental Attunement',
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
            macro: addedAttunement,
            priority: 45
        },
        {
            pass: 'medkit',
            macro: addedAttunement,
            priority: 45
        }
    ],
    config: {
        remember: {
            default: false,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.Remember',
            category: 'behavior'
        }
    }
};
export const elementalAttunementStrikes = {
    name: 'Elemental Attunement: Strikes',
    version: elementalAttunement.version,
    rules: elementalAttunement.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: strikes,
            priority: 50
        }
    ]
};
export const elementalBurst = {
    name: 'Elemental Burst',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: burst,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: addedAttunement,
            priority: 45
        },
        {
            pass: 'medkit',
            macro: addedAttunement,
            priority: 45
        }
    ]
};
export const elementalEpitome = {
    name: 'Elemental Epitome',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: swap,
            priority: 50
        }
    ]
};
export const elementalEpitomeStrikes = {
    name: 'Elemental Epitome: Strikes',
    version: elementalEpitome.version,
    rules: elementalEpitome.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: epitomeStrikes,
            priority: 55
        }
    ]
};
export const strideOfTheElements = {
    name: 'Stride of the Elements',
    version: '2.0.1',
    rules: '2024'
};
