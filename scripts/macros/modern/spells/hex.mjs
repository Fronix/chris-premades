import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'hex') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.targets.size) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const buttons = Object.values(CONFIG.DND5E.abilities).map(ability => [ability.label, ability.abbreviation]);
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Hex.SelectAbility'), buttons);
    if (!selection) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    let seconds;
    switch (getCastLevel(workflow)) {
        case 2: seconds = 14400; break;
        case 3:
        case 4: seconds = 28800; break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9: seconds = 86400; break;
        default: seconds = 3600;
    }
    const targetEffectData = {
        name: _loc('CHRISPREMADES.Macros.Hex.Hexed'),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds},
        system: {
            changes: [
                {key: 'flags.midi-qol.disadvantage.check.' + selection, type: 'custom', value: true, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'hexed'
            }
        }
    };
    if (actorUtils.getItemByIdentifier(workflow.actor, 'eldritch-hex')) {
        targetEffectData.system.changes.push({key: 'flags.midi-qol.disadvantage.save.' + selection, type: 'custom', value: true, phase: 'initial', priority: 20});
    }
    const casterEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds},
        flags: {
            cat: {
                identifier: 'hex'
            },
            'chris-premades': {
                hex: {
                    targets: Array.from(workflow.targets).map(token => token.document.uuid),
                    damageType: automationUtils.getConfigValue(workflow.item, 'damageType') || 'necrotic',
                    formula: automationUtils.getConfigValue(workflow.item, 'formula') || '1d6',
                    ability: selection
                }
            }
        }
    };
    const feature = workflow.item.system.activities.find(a => a.identifier === 'hex-move');
    if (!feature) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const created = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'hex-attack'}]}],
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['hex-move'],
            favorite: true
        }
    });
    const casterEffect = created?.[0];
    if (casterEffect && concentrationEffect) await documentUtils.makeDependent(concentrationEffect, [casterEffect]);
    for (const token of workflow.targets) {
        if (!token.actor) continue;
        const targetCreated = await effectUtils.createEffects(token.actor, [targetEffectData], {rules: '2024'});
        if (casterEffect && targetCreated?.length) await documentUtils.makeDependent(casterEffect, targetCreated);
    }
    if (concentrationEffect) await documentUtils.update(concentrationEffect, {'duration.seconds': seconds});
}
async function move({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'hex-move') return;
    if (workflow.targets.size !== 1) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'hex');
    if (!effect) return;
    let oldTargets = effect.flags['chris-premades'].hex.targets;
    const targets = oldTargets.map(uuid => fromUuidSync(uuid)?.object).filter(Boolean);
    let selection;
    if (targets.length) {
        if (targets.length > 1) {
            const picked = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.Hex.Multiple'), targets, {skipDeadAndUnconscious: false});
            selection = picked?.[0] ?? targets[0];
        } else {
            selection = targets[0];
        }
    }
    if (selection?.actor) {
        const hexedEffect = actorUtils.getEffectByIdentifier(selection.actor, 'hexed');
        if (hexedEffect) await documentUtils.deleteDocument(hexedEffect);
    }
    if (selection) oldTargets = oldTargets.filter(uuid => uuid !== selection.document.uuid);
    oldTargets.push(workflow.targets.first().document.uuid);
    await effect.setFlag('chris-premades', 'hex.targets', oldTargets);
    const effectData = {
        name: _loc('CHRISPREMADES.Macros.Hex.Hexed'),
        img: effect.img,
        type: 'base',
        origin: effect.uuid,
        duration: {seconds: effect.duration.remaining},
        system: {
            changes: [
                {key: 'flags.midi-qol.disadvantage.check.' + effect.flags['chris-premades'].hex.ability, type: 'custom', value: true, phase: 'initial', priority: 20}
            ]
        },
        flags: {
            cat: {
                identifier: 'hexed'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.targets.first().actor, [effectData], {rules: '2024'});
    if (created?.length) await documentUtils.makeDependent(effect, created);
}
async function damage({workflow}) {
    if (!workflow.targets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'hex');
    if (!effect) return;
    const validTargetUuids = effect.flags['chris-premades'].hex.targets;
    if (!workflow.hitTargets.find(token => validTargetUuids.includes(token.document.uuid))) return;
    const {damageType, formula} = effect.flags['chris-premades'].hex;
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
}
export const hex = {
    name: 'Hex',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: move,
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
            default: '1d6',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
export const hexAttack = {
    name: 'Hex: Attack',
    version: hex.version,
    rules: hex.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ]
};
