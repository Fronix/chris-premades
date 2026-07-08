import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, queryUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
const formIdentifiers = ['starry-form-archer', 'starry-form-chalice', 'starry-form-dragon'];
async function use({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    if (!formIdentifiers.includes(activityIdentifier)) return;
    const classIdentifier = automationUtils.getConfigValue(workflow.item, 'classIdentifier') || 'druid';
    const classLevels = workflow.actor.classes[classIdentifier]?.system.levels;
    if (!classLevels) return;
    const tier = classLevels > 13 ? 3 : classLevels > 9 ? 2 : 1;
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'starry-form');
    const changes = [
        {key: 'ATL.light.bright', type: 'upgrade', value: 10, phase: 'initial', priority: 20},
        {key: 'ATL.light.dim', type: 'upgrade', value: 20, phase: 'initial', priority: 20},
        {key: 'ATL.light.color', type: 'override', value: '#ffffff', phase: 'initial', priority: 20},
        {key: 'ATL.light.alpha', type: 'override', value: 0.25, phase: 'initial', priority: 20},
        {key: 'ATL.light.animation', type: 'override', value: '{type: \'starlight\', speed: 1, intensity: 3}', phase: 'initial', priority: 20}
    ];
    if (tier === 3) {
        for (const type of ['slashing', 'piercing', 'bludgeoning']) {
            changes.push({key: 'system.traits.dr.value', type: 'add', value: type, phase: 'final', priority: 20});
        }
    }
    if (activityIdentifier === 'starry-form-dragon') {
        changes.push(
            {key: 'system.abilities.wis.check.roll.min', type: 'upgrade', value: 10, phase: 'final', priority: 20},
            {key: 'system.abilities.int.check.roll.min', type: 'upgrade', value: 10, phase: 'final', priority: 20},
            {key: 'system.attributes.concentration.roll.min', type: 'upgrade', value: 10, phase: 'final', priority: 20}
        );
        if (tier > 1) {
            changes.push(
                {key: 'system.attributes.movement.fly', type: 'upgrade', value: 20, phase: 'final', priority: 20},
                {key: 'system.attributes.movement.hover', type: 'override', value: 1, phase: 'final', priority: 20}
            );
        }
    }
    const effectData = {
        name: workflow.activity.name,
        img: existing?.img ?? workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: existing ? foundry.utils.duplicate(existing.toObject().duration) : activityUtils.getEffectDuration(workflow.activity),
        system: {changes},
        flags: {
            cat: {
                identifier: 'starry-form'
            },
            'chris-premades': {
                starryForm: {
                    currentForm: activityIdentifier
                }
            }
        }
    };
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'starry-form-active'};
    const macros = [];
    if (tier > 1) macros.push({type: 'combat', macros: [macroEntry]});
    if (activityIdentifier === 'starry-form-chalice') macros.push({type: 'roll', macros: [macroEntry]});
    if (existing) await documentUtils.deleteDocument(existing);
    const options = {rules: '2024'};
    if (macros.length) options.macros = macros;
    if (activityIdentifier === 'starry-form-archer') {
        options.unhideActivities = {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['luminous-arrow'],
            favorite: true
        };
    }
    await effectUtils.createEffects(workflow.actor, [effectData], options);
}
async function turnStart({document: effect, token}) {
    if (!token?.actor) return;
    const twinkling = actorUtils.getItemByIdentifier(token.actor, 'twinkling-constellations');
    const starryItem = actorUtils.getItemByIdentifier(token.actor, 'starry-form');
    if (!twinkling || !starryItem) return;
    const currentForm = effect.flags['chris-premades']?.starryForm?.currentForm;
    const others = formIdentifiers.filter(identifier => identifier !== currentForm);
    const features = others.map(identifier => starryItem.system.activities.find(a => a.identifier === identifier)).filter(Boolean);
    if (!features.length) return;
    const selection = await dialogUtils.buttonDialog(twinkling.name, _loc('CHRISPREMADES.Macros.StarryForm.Change'), features.map((feature, index) => [feature.name, index + 1]).concat([['CHRISPREMADES.Generic.No', false]]), {userId: queryUtils.firstOwner(token.actor, true)});
    if (!selection) return;
    await workflowUtils.syntheticActivityRoll(features[selection - 1], []);
}
async function late({document: effect, workflow}) {
    if (workflow.item?.type !== 'spell' || !workflow.targets.size || !workflow.item.system.level) return;
    if (effect.flags['chris-premades']?.starryForm?.currentForm !== 'starry-form-chalice') return;
    if (!workflow.damageRolls || !workflowUtils.getDamageTypes(workflow.damageRolls).has('healing')) return;
    const originItem = await fromUuid(effect.origin);
    const chalice = originItem?.system.activities.find(a => a.identifier === 'healing-chalice');
    if (!chalice || !workflow.token) return;
    const nearby = tokenUtils.findNearby(workflow.token.document, 30, {disposition: 'ally', includeIncapacitated: true, includeToken: true});
    if (!nearby.length) return;
    let selected;
    if (nearby.length > 1) {
        const selection = await dialogUtils.selectTargetDialog(chalice.name, _loc('CHRISPREMADES.Macros.StarryForm.Heal'), nearby);
        if (selection?.length) selected = selection[0];
    }
    if (!selected) selected = nearby[0];
    await workflowUtils.syntheticActivityRoll(chalice, [selected]);
}
async function early({activity, dialog, actor}) {
    if (documentUtils.getIdentifier(activity) !== 'luminous-arrow') return;
    if (dialog) dialog.configure = false;
    if ((actor?.classes.druid?.system.levels ?? 0) < 10) return;
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, formIdentifiers, 'wild-shape');
}
export const starryForm = {
    name: 'Starry Form',
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
        }
    ],
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 55
        }
    ],
    config: {
        classIdentifier: {
            default: 'druid',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
export const starryFormActive = {
    name: 'Starry Form: Active',
    version: starryForm.version,
    rules: starryForm.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: turnStart,
            priority: 50
        }
    ],
    roll: [
        {
            pass: 'actorRollFinished',
            macro: late,
            priority: 250
        }
    ]
};
