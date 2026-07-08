import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const newActor = workflow.transformedActors?.[0];
    if (!newActor) return;
    const equippedItems = workflow.actor.items.filter(i => i.system.equipped && i.type !== 'container');
    let keepItems = [];
    if (equippedItems.length) {
        const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.WildShape.Equipment'), equippedItems, {checkbox: true, max: equippedItems.length});
        if (selection) keepItems = (Array.isArray(selection) ? selection : [selection]).filter(Boolean).map(item => item.toObject());
    }
    if (actorUtils.getItemByIdentifier(workflow.actor, 'beast-spells')) {
        const validSpells = workflow.actor.itemTypes.spell.filter(spell => {
            if (spell.system.materials.cost > 0 || spell.system.materials.consumed) return false;
            return !newActor.itemTypes.spell.find(other => other.id === spell.id);
        });
        keepItems.push(...validSpells.map(spell => spell.toObject()));
    }
    if (keepItems.length) await documentUtils.createEmbeddedDocuments(newActor, 'Item', keepItems);
    const featurePack = game.packs.get('chris-premades.CPRFeatureItems2024');
    if (!featurePack) return;
    const featureIndex = await featurePack.getIndex();
    const featureEntry = featureIndex.find(entry => entry.name === 'Wild Shape: Revert');
    if (!featureEntry) return;
    const featureItem = await featurePack.getDocument(featureEntry._id);
    const featureData = featureItem.toObject();
    delete featureData._id;
    foundry.utils.setProperty(featureData, 'flags.cat.macros.roll', [{source: 'chris-premades', rules: '2024', identifier: 'wild-shape-active'}]);
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'wild-shape-active'};
    const changes = [];
    const improvedCircleForms = actorUtils.getItemByIdentifier(workflow.actor, 'improved-circle-forms');
    if (improvedCircleForms) changes.push({key: 'system.abilities.con.bonuses.save', type: 'add', value: '@abilities.wis.mod', phase: 'final', priority: 20});
    const lunarForm = actorUtils.getItemByIdentifier(workflow.actor, 'lunar-form');
    if (lunarForm) {
        const formula = automationUtils.getConfigValue(lunarForm, 'formula') || '2d10';
        const damageType = automationUtils.getConfigValue(lunarForm, 'damageType') || 'radiant';
        changes.push(
            {key: 'flags.midi-qol.optional.LunarForm.damage.mwak', type: 'override', value: formula + '[' + damageType + ']', phase: 'initial', priority: 20},
            {key: 'flags.midi-qol.optional.LunarForm.activation', type: 'override', value: 'workflow.hitTargets.size > 0', phase: 'initial', priority: 20},
            {key: 'flags.midi-qol.optional.LunarForm.count', type: 'override', value: 'each-turn', phase: 'initial', priority: 20}
        );
    }
    if (improvedCircleForms) {
        const itemUpdates = [];
        for (const beastItem of newActor.items) {
            const currItem = beastItem.toObject();
            let shouldChange = false;
            if (currItem.type === 'weapon') {
                shouldChange = true;
                currItem.system.damage.base.types.push('radiant');
            } else if (currItem.system.type?.value === 'monster') {
                const attackActivities = Object.values(currItem.system.activities ?? {}).filter(a => a.type === 'attack');
                if (attackActivities.length) {
                    shouldChange = true;
                    for (const activity of attackActivities) {
                        currItem.system.activities[activity._id].damage.parts.forEach(part => part.types.push('radiant'));
                    }
                }
            }
            if (shouldChange) itemUpdates.push(currItem);
        }
        if (itemUpdates.length) await documentUtils.updateEmbeddedDocuments(newActor, 'Item', itemUpdates);
    }
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'wild-shape-active'
            }
        }
    };
    if (changes.length) effectData.system = {changes};
    const created = await effectUtils.createEffects(newActor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'roll', macros: [macroEntry]},
            {type: 'effect', macros: [macroEntry]}
        ]
    });
    const items = await documentUtils.createEmbeddedDocuments(newActor, 'Item', [featureData]);
    if (created?.[0] && items?.length) await documentUtils.makeDependent(created[0], items);
}
async function preRevert({document: item, workflow}) {
    if (item !== workflow.item) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'wild-shape-active');
    if (effect) await documentUtils.deleteDocument(effect);
}
async function revert({document: effect}) {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !actor.isPolymorphed) return;
    const spellData = actor.system.spells;
    const origActor = await actor.revertOriginalForm({renderSheet: false});
    if (!origActor) return;
    await documentUtils.update(origActor, {'system.spells': spellData});
}
async function hit({document: effect, ditem}) {
    if (!ditem || ditem.newHP > 0) return;
    await documentUtils.deleteDocument(effect);
}
export const wildShape = {
    name: 'Wild Shape',
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
        classIdentifier: {
            default: 'druid',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    },
    scales: [
        {
            identifier: 'wild-shape-uses',
            classIdentifier: 'druid',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'wild-shape-uses',
                    type: 'number',
                    scale: {
                        2: {value: 2},
                        6: {value: 3},
                        17: {value: 4}
                    }
                },
                value: {},
                title: 'Wild Shape Uses'
            }
        }
    ]
};
export const wildShapeActive = {
    name: 'Wild Shape: Active',
    version: wildShape.version,
    rules: wildShape.rules,
    roll: [
        {
            pass: 'itemRollFinished',
            macro: preRevert,
            priority: 50
        },
        {
            pass: 'targetDamageComplete',
            macro: hit,
            priority: 50
        }
    ],
    effect: [
        {
            pass: 'deleted',
            macro: revert,
            priority: 50
        }
    ]
};
