import {automationUtils, dialogUtils, documentUtils, effectUtils, rollUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const damageTypes = automationUtils.getConfigValue(workflow.item, 'damageTypes') ?? ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'necrotic', 'piercing', 'poison', 'radiant', 'slashing', 'thunder'];
    const damageType = await dialogUtils.selectDamageType(damageTypes, workflow.item.name, _loc('CHRISPREMADES.Generic.SelectDamageType'));
    if (!damageType || damageType === 'no') return;
    const sourceEffect = workflow.activity.effects?.[0]?.effect ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'resistance-effect');
    foundry.utils.setProperty(effectData, 'flags.chris-premades.resistance', {
        damageType,
        formula: automationUtils.getConfigValue(workflow.item, 'formula') || '1d4'
    });
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    for (const token of workflow.targets) {
        const created = await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'resistance-effect'}]}]
        });
        if (concentrationEffect && created?.length) await documentUtils.makeDependent(concentrationEffect, created);
    }
}
async function targeted({document: effect}) {
    const combat = game.combat;
    if (combat && effect.flags.cat?.resistanceStamp === combat.round + '-' + combat.turn) return;
    const {damageType, formula} = effect.flags['chris-premades']?.resistance ?? {};
    if (!formula || !damageType) return;
    const roll = await rollUtils.rollDice(formula);
    const reductionData = {
        name: _loc('CHRISPREMADES.Macros.Resistance.Name') + ': ' + damageType,
        img: effect.img,
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'system.traits.dm.amount.' + damageType, type: 'add', value: -roll.total, phase: 'final', priority: 20}
            ]
        }
    };
    await effectUtils.createEffects(effect.parent, [reductionData]);
    if (combat) await effect.setFlag('cat', 'resistanceStamp', combat.round + '-' + combat.turn);
    await roll.toMessage({speaker: {alias: effect.parent.name}, flavor: effect.name});
}
export const resistance = {
    name: 'Resistance',
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
        formula: {
            default: '1d4',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageTypes: {
            default: ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'necrotic', 'piercing', 'poison', 'radiant', 'slashing', 'thunder'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.DamageTypes',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const resistanceEffect = {
    name: 'Resistance: Effect',
    version: resistance.version,
    rules: resistance.rules,
    roll: [
        {
            pass: 'targetPreambleComplete',
            macro: targeted,
            priority: 250
        }
    ]
};
export const synapticStatic = {
    name: 'Synaptic Static',
    version: '2.0.0',
    rules: '2024'
};
async function thornWhipUse({workflow}) {
    if (!workflow.hitTargets.size || !workflow.token) return;
    for (const target of workflow.hitTargets) {
        const sizeIndex = Object.keys(CONFIG.DND5E.actorSizes).indexOf(target.actor.system.traits.size);
        if (sizeIndex > 3) continue;
        const distance = tokenUtils.getDistance(workflow.token.document, target.document ?? target);
        if (distance <= 5) continue;
        const options = [[_loc('CHRISPREMADES.Distance.DistanceFeet', {distance: 0}), 0]];
        if (distance > 5) options.push([_loc('CHRISPREMADES.Distance.DistanceFeet', {distance: 5}), 5]);
        if (distance > 10) options.push([_loc('CHRISPREMADES.Distance.DistanceFeet', {distance: 10}), 10]);
        const selection = Number(await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.ThornWhip.Pull'), options));
        if (!selection) continue;
        await tokenUtils.slideToken(target.document ?? target, {sourceToken: workflow.token.document, distance: -selection});
    }
}
export const thornWhip = {
    name: 'Thorn Whip',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: thornWhipUse,
            priority: 50
        }
    ]
};
