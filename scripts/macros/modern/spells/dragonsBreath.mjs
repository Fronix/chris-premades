import {activityUtils, dialogUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.targets.size) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const buttons = [
        ['DND5E.DamageAcid', 'acid'],
        ['DND5E.DamageCold', 'cold'],
        ['DND5E.DamageFire', 'fire'],
        ['DND5E.DamageLightning', 'lightning'],
        ['DND5E.DamagePoison', 'poison']
    ];
    let damageType = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Dialog.DamageType'), buttons);
    if (!damageType) damageType = 'fire';
    const pack = game.packs.get('chris-premades.CPRSpellFeatures');
    if (!pack) return;
    const index = await pack.getIndex();
    const entry = index.find(e => e.name === 'Dragon Breath');
    if (!entry) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const featureItem = await pack.getDocument(entry._id);
    const featureData = featureItem.toObject();
    delete featureData._id;
    featureData.system.identifier = 'dragon-breath';
    const diceNumber = (getCastLevel(workflow) ?? 2) + 1;
    const activityId = Object.keys(featureData.system.activities)[0];
    const activity = featureData.system.activities[activityId];
    activity.damage.parts[0].number = diceNumber;
    activity.damage.parts[0].types = [damageType];
    const dc = activityUtils.getSaveDC(workflow.activity) ?? workflow.actor.system.attributes.spell?.dc;
    foundry.utils.setProperty(activity, 'save.dc', {calculation: '', formula: String(dc), value: Number(dc)});
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'dragons-breath'
            }
        }
    };
    for (const target of workflow.targets) {
        const created = await effectUtils.createEffects(target.actor, [effectData], {rules: '2024'});
        const effect = created?.[0];
        if (concentrationEffect && effect) await documentUtils.makeDependent(concentrationEffect, [effect]);
        const items = await documentUtils.createEmbeddedDocuments(target.actor, 'Item', [featureData]);
        if (effect && items?.length) await documentUtils.makeDependent(effect, items);
    }
    if (concentrationEffect) await documentUtils.update(concentrationEffect, {duration: effectData.duration});
}
export const dragonsBreath = {
    name: 'Dragon\'s Breath',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
