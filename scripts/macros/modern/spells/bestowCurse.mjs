import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    if (!['bestow-curse-ability', 'bestow-curse-damage', 'bestow-curse-attack', 'bestow-curse-turn'].includes(activityIdentifier)) return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.failedSaves.size) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    let concentration = true;
    let duration = 60;
    switch (getCastLevel(workflow)) {
        case 4: duration = 600; break;
        case 5:
        case 6: duration = 28800; concentration = false; break;
        case 7:
        case 8: duration = 86400; concentration = false; break;
        case 9: duration = null; concentration = false; break;
    }
    if (!concentration && concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
    const effectName = workflow.activity.name;
    const targetEffectData = {
        name: effectName,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: activityIdentifier
            }
        }
    };
    if (duration) targetEffectData.duration = {seconds: duration};
    let casterEffectData;
    const targetMacros = [];
    switch (activityIdentifier) {
        case 'bestow-curse-ability': {
            const abilityChoices = Object.entries(CONFIG.DND5E.abilities).map(([abbr, {label}]) => [label, abbr]);
            const ability = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.BestowCurse.AbilitySelect'), abilityChoices);
            if (!ability) return;
            targetEffectData.system = {
                changes: [
                    {key: 'flags.midi-qol.disadvantage.check.' + ability, type: 'custom', value: true, phase: 'initial', priority: 20},
                    {key: 'flags.midi-qol.disadvantage.save.' + ability, type: 'custom', value: true, phase: 'initial', priority: 20}
                ]
            };
            break;
        }
        case 'bestow-curse-damage':
            casterEffectData = {
                name: effectName,
                img: workflow.item.img,
                type: 'base',
                origin: workflow.item.uuid,
                flags: {
                    cat: {
                        identifier: 'bestow-curse-source'
                    },
                    'chris-premades': {
                        bestowCurse: {
                            targets: Array.from(workflow.failedSaves).map(target => target.document.uuid),
                            damageType: automationUtils.getConfigValue(workflow.item, 'damageType') || 'necrotic',
                            formula: automationUtils.getConfigValue(workflow.item, 'formula') || '1d8'
                        }
                    }
                }
            };
            if (duration) casterEffectData.duration = {seconds: duration};
            break;
        case 'bestow-curse-attack':
            targetEffectData.flags['chris-premades'] = {bestowCurse: {sourceActor: workflow.actor.uuid}};
            targetMacros.push({type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'bestow-curse-attack-effect'}]});
            break;
        case 'bestow-curse-turn': {
            const saveDC = activityUtils.getSaveDC(workflow.activity);
            targetEffectData.system = {
                changes: [
                    {key: 'flags.midi-qol.OverTime', type: 'custom', value: 'turn=start,saveAbility=wis,saveMagic=true,saveRemove=false,saveDC=' + saveDC + ',label="' + workflow.item.name + '"', phase: 'initial', priority: 20}
                ]
            };
            break;
        }
    }
    let casterEffect;
    if (casterEffectData) {
        const created = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
            rules: '2024',
            macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'bestow-curse-damage-source'}]}]
        });
        casterEffect = created?.[0];
        if (concentration && concentrationEffect && casterEffect) await documentUtils.makeDependent(concentrationEffect, [casterEffect]);
    }
    for (const targetToken of workflow.failedSaves) {
        const options = {rules: '2024'};
        if (targetMacros.length) options.macros = targetMacros;
        const created = await effectUtils.createEffects(targetToken.actor, [targetEffectData], options);
        if (created?.length) {
            if (casterEffect) await documentUtils.makeDependent(casterEffect, created);
            else if (concentration && concentrationEffect) await documentUtils.makeDependent(concentrationEffect, created);
        }
    }
    if (concentration && duration && concentrationEffect) await documentUtils.update(concentrationEffect, {'duration.seconds': duration});
}
async function attack({document: effect, workflow}) {
    if (!workflow.targets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const sourceActorUuid = effect.flags['chris-premades']?.bestowCurse?.sourceActor;
    if (!sourceActorUuid) return;
    if (Array.from(workflow.targets).some(target => target.actor?.uuid === sourceActorUuid)) workflow.disadvantage = true;
}
async function damage({workflow}) {
    if (!workflow.hitTargets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'bestow-curse-source');
    if (!effect) return;
    const {targets: validTargetUuids, damageType, formula} = effect.flags['chris-premades'].bestowCurse;
    if (!Array.from(workflow.hitTargets).every(target => validTargetUuids.includes(target.document.uuid))) return;
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
}
export const bestowCurse = {
    name: 'Bestow Curse',
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
        damageType: {
            default: 'necrotic',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        },
        formula: {
            default: '1d8',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
export const bestowCurseAttackEffect = {
    name: 'Bestow Curse: Attack',
    version: bestowCurse.version,
    rules: bestowCurse.rules,
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: attack,
            priority: 50
        }
    ]
};
export const bestowCurseDamageSource = {
    name: 'Bestow Curse: Damage',
    version: bestowCurse.version,
    rules: bestowCurse.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ]
};
