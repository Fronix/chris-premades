import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function getOngoingFeatureData(actor, {aquaticAffinity, spellDC, wisMod}) {
    const pack = game.packs.get('chris-premades.CPRFeatureItems2024');
    if (!pack) return;
    const index = await pack.getIndex();
    const entry = index.find(e => e.name === 'Wrath of the Sea: Ongoing');
    if (!entry) return;
    const featureItem = await pack.getDocument(entry._id);
    const featureData = featureItem.toObject();
    delete featureData._id;
    const activityId = Object.keys(featureData.system.activities)[0];
    const activity = featureData.system.activities[activityId];
    if (activity.damage?.parts?.[0]) activity.damage.parts[0].number = wisMod;
    if (aquaticAffinity) activity.range.value = '10';
    foundry.utils.setProperty(activity, 'save.dc', {calculation: '', formula: String(spellDC), value: true});
    return {featureData, activityId};
}
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'wrath-of-the-sea') return;
    if (!workflow.token) return;
    const aquaticAffinity = actorUtils.getItemByIdentifier(workflow.actor, 'aquatic-affinity');
    const stormborn = actorUtils.getItemByIdentifier(workflow.actor, 'stormborn');
    const oceanicGift = actorUtils.getItemByIdentifier(workflow.actor, 'oceanic-gift');
    const wildShape = actorUtils.getItemByIdentifier(workflow.actor, 'wild-shape');
    if (!wildShape) return;
    const wisMod = Math.max(1, workflow.actor.system.abilities.wis.mod);
    const spellDC = workflow.actor.system.abilities.wis.dc;
    const prepared = await getOngoingFeatureData(workflow.actor, {aquaticAffinity, spellDC, wisMod});
    if (!prepared) return;
    const {featureData, activityId} = prepared;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'wrath-of-the-sea-ongoing'
            }
        }
    };
    if (stormborn) {
        effectData.system = {
            changes: [
                {key: 'system.attributes.movement.fly', type: 'upgrade', value: '@attributes.movement.walk', phase: 'final', priority: 100},
                {key: 'system.traits.dr.value', type: 'add', value: 'cold', phase: 'final', priority: 20},
                {key: 'system.traits.dr.value', type: 'add', value: 'lightning', phase: 'final', priority: 20},
                {key: 'system.traits.dr.value', type: 'add', value: 'thunder', phase: 'final', priority: 20}
            ]
        };
    }
    let giveSelf = true;
    let giveAlly;
    const nearbyAllies = tokenUtils.findNearby(workflow.token.document, 60, {disposition: 'ally'});
    if (oceanicGift && nearbyAllies.length) {
        const buttons = [
            ['CHRISPREMADES.Macros.WrathOfTheSea.Self', 'self'],
            ['CHRISPREMADES.Macros.WrathOfTheSea.Ally', 'ally']
        ];
        if (wildShape.system.uses.value) buttons.push([_loc('CHRISPREMADES.Macros.WrathOfTheSea.Both', {itemName: wildShape.name}), 'both']);
        const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.WrathOfTheSea.Choose'), buttons);
        if (selection === 'ally') giveSelf = false;
        if (['ally', 'both'].includes(selection)) {
            const selected = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.WrathOfTheSea.Choose'), nearbyAllies);
            if (selected?.length) giveAlly = selected[0];
        }
    }
    const tokens = [];
    if (giveSelf) tokens.push(workflow.token.document);
    if (giveAlly) tokens.push(giveAlly.document ?? giveAlly);
    if (!tokens.length) return;
    if (tokens.length > 1) await documentUtils.update(wildShape, {'system.uses.spent': wildShape.system.uses.spent + 1});
    const initialFeatureData = foundry.utils.duplicate(featureData);
    initialFeatureData.system.activities[activityId].activation.type = 'special';
    for (const token of tokens) {
        const created = await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
        const items = await documentUtils.createEmbeddedDocuments(token.actor, 'Item', [featureData]);
        if (created?.[0] && items?.length) await documentUtils.makeDependent(created[0], items);
        const nearbyEnemies = tokenUtils.findNearby(token, aquaticAffinity ? 10 : 5, {disposition: 'enemy'});
        if (!nearbyEnemies.length) continue;
        const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.WrathOfTheSea.Target'), nearbyEnemies);
        if (!selection?.length) continue;
        await workflowUtils.syntheticItemDataRoll(initialFeatureData, token.actor, [selection[0]]);
    }
}
async function push({workflow}) {
    const targetToken = workflow.failedSaves.first();
    if (!targetToken || !workflow.token) return;
    const sizeIndex = Object.keys(CONFIG.DND5E.actorSizes).indexOf(targetToken.actor.system.traits.size);
    if (sizeIndex > 3) return;
    await tokenUtils.slideToken(targetToken.document, {sourceToken: workflow.token.document, distance: 15});
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['wrath-of-the-sea'], 'wild-shape');
}
export const wrathOfTheSea = {
    name: 'Wrath of the Sea',
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
export const wrathOfTheSeaOngoing = {
    name: 'Wrath of the Sea: Ongoing',
    version: wrathOfTheSea.version,
    rules: wrathOfTheSea.rules,
    roll: [
        {
            pass: 'itemRollFinished',
            macro: push,
            priority: 50
        }
    ]
};
