import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
async function changeAppearance({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'change-appearance') return;
    const effectData = {
        name: workflow.item.name + ' - ' + workflow.activity.name,
        img: workflow.activity.img || workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'alter-self'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['change-appearance-again'],
            favorite: true
        }
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
async function naturalWeapons({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'natural-weapons') return;
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.AlterSelf.NaturalWeapons.Select'), [
        ['CHRISPREMADES.AlterSelf.NaturalWeapons.Claws', 'slashing'],
        ['CHRISPREMADES.AlterSelf.NaturalWeapons.Fangs', 'piercing'],
        ['CHRISPREMADES.AlterSelf.NaturalWeapons.Hooves', 'bludgeoning']
    ]);
    const unarmedStrike = actorUtils.getItemByIdentifier(workflow.actor, 'unarmed-strike') ?? actorUtils.getItemByIdentifier(workflow.actor, 'monk-unarmed-strike');
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!selection || !unarmedStrike) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const enchantData = {
        name: workflow.item.name + ' - ' + workflow.activity.name,
        img: workflow.activity.img || workflow.item.img,
        type: 'enchantment',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {key: 'system.properties', type: 'add', value: 'mgc', phase: 'final', priority: 20},
                {key: 'system.damage.base.number', type: 'override', value: 1, phase: 'final', priority: 20},
                {key: 'system.damage.base.denomination', type: 'override', value: 6, phase: 'final', priority: 20},
                {key: 'system.damage.base.custom', type: 'override', value: false, phase: 'final', priority: 20},
                {key: 'system.ability', type: 'override', value: workflow.item.system.ability === '' ? 'spellcasting' : workflow.item.system.ability, phase: 'final', priority: 20},
                {key: 'system.damage.base.types', type: 'override', value: JSON.stringify([selection]), phase: 'final', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'alter-self-natural-weapons'
            }
        }
    };
    const created = await documentUtils.createEmbeddedDocuments(unarmedStrike, 'ActiveEffect', [enchantData]);
    if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
}
export const alterSelf = {
    name: 'Alter Self',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: changeAppearance,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: naturalWeapons,
            priority: 50
        }
    ]
};
