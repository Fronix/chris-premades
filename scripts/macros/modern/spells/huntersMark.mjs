import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'hunters-mark') return;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.targets.size) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    const feature = workflow.item.system.activities.find(a => a.identifier === 'hunters-mark-move');
    if (!feature) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    let seconds;
    switch (getCastLevel(workflow)) {
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
        name: _loc('CHRISPREMADES.Macros.HuntersMark.Marked'),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds},
        flags: {
            cat: {
                identifier: 'hunters-mark-marked'
            }
        }
    };
    const foeSlayer = actorUtils.getItemByIdentifier(workflow.actor, 'foe-slayer');
    const damageFormulaItem = foeSlayer ?? workflow.item;
    const casterEffectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds},
        flags: {
            cat: {
                identifier: 'hunters-mark'
            },
            'chris-premades': {
                huntersMark: {
                    targets: Array.from(workflow.targets).map(token => token.document.uuid),
                    formula: automationUtils.getConfigValue(damageFormulaItem, 'formula') || '1d6',
                    damageType: automationUtils.getConfigValue(damageFormulaItem, 'damageType') || 'force'
                }
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.actor, [casterEffectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'hunters-mark-source'}]}],
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['hunters-mark-move'],
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
    if (documentUtils.getIdentifier(workflow.activity) !== 'hunters-mark-move') return;
    if (workflow.targets.size !== 1) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'hunters-mark');
    if (!effect) return;
    let targetUuids = effect.flags['chris-premades'].huntersMark.targets;
    const targets = targetUuids.map(uuid => fromUuidSync(uuid)?.object).filter(Boolean);
    let selection;
    if (targets.length) {
        if (targets.length > 1) {
            const picked = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.HuntersMark.Select'), targets, {skipDeadAndUnconscious: false});
            if (!picked?.length) return;
            selection = picked[0];
        } else {
            selection = targets[0];
        }
    }
    if (selection?.actor) {
        const markedEffect = actorUtils.getEffectByIdentifier(selection.actor, 'hunters-mark-marked');
        if (markedEffect) await documentUtils.deleteDocument(markedEffect);
    }
    targetUuids = targetUuids.filter(uuid => uuid !== selection?.document.uuid);
    targetUuids.push(workflow.targets.first().document.uuid);
    await effect.setFlag('chris-premades', 'huntersMark.targets', targetUuids);
    const effectData = {
        name: _loc('CHRISPREMADES.Macros.HuntersMark.Marked'),
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds: effect.duration.remaining},
        flags: {
            cat: {
                identifier: 'hunters-mark-marked'
            }
        }
    };
    const created = await effectUtils.createEffects(workflow.targets.first().actor, [effectData], {rules: '2024'});
    if (created?.length) await documentUtils.makeDependent(effect, created);
}
async function attack({workflow}) {
    if (workflow.targets.size !== 1) return;
    const preciseHunter = actorUtils.getItemByIdentifier(workflow.actor, 'precise-hunter');
    if (!preciseHunter) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'hunters-mark');
    if (!effect) return;
    const validTargetUuids = effect.flags['chris-premades'].huntersMark.targets;
    if (!validTargetUuids.includes(workflow.targets.first().document.uuid)) return;
    workflow.advantage = true;
}
async function damage({workflow}) {
    if (workflow.hitTargets.size !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const effect = actorUtils.getEffectByIdentifier(workflow.actor, 'hunters-mark');
    if (!effect) return;
    const {targets: validTargetUuids, formula, damageType} = effect.flags['chris-premades'].huntersMark;
    if (!validTargetUuids.includes(workflow.hitTargets.first().document.uuid)) return;
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
}
export const huntersMark = {
    name: 'Hunter\'s Mark',
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
        formula: {
            default: '1d6',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        },
        damageType: {
            default: 'force',
            type: 'select',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.damageTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
export const huntersMarkSource = {
    name: 'Hunter\'s Mark: Source',
    version: huntersMark.version,
    rules: huntersMark.rules,
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: attack,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: damage,
            priority: 250
        }
    ]
};
