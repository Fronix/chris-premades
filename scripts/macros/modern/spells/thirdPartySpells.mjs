import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
import {getPackEntry} from './summonSpells.mjs';
import {summonUtils} from '../../../proxy.mjs';
async function bloodSacrificeUse({workflow}) {
    if (workflow.item.type !== 'spell') return;
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'blood-sacrifice');
    if (existing) await documentUtils.deleteDocument(existing);
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'blood-sacrifice'
            },
            'chris-premades': {
                bloodSacrifice: {castLevel: getCastLevel(workflow) ?? workflow.item.system.level}
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'blood-sacrifice-active'}]}]
    });
}
async function bloodSacrificeDamage({document: effect, workflow}) {
    if (!workflow.hitTargets.size || !workflow.damageRolls) return;
    if (workflow.item.type !== 'spell' && !workflow.item.flags['chris-premades']?.trueStrike) return;
    const item = await fromUuid(effect.origin);
    if (!item) return;
    const dieSize = automationUtils.getConfigValue(item, 'dieSize') || 'd6';
    const castLevel = effect.flags['chris-premades']?.bloodSacrifice?.castLevel ?? 1;
    const formula = Math.max(1, castLevel - 1) + dieSize;
    if (workflow.targets.size === 1) {
        await workflowUtils.bonusDamage(workflow, formula);
        return;
    }
    const result = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.BloodSacrifice.Apply', {itemName: item.name}), Array.from(workflow.targets), {skipDeadAndUnconscious: false});
    if (!result?.[0]) return;
    const target = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (!target) return;
    const damageRoll = await new CONFIG.Dice.DamageRoll(formula, {}, {type: workflow.defaultDamageType ?? workflow.damageRolls[0]?.options.type}).evaluate();
    await damageRoll.toMessage({speaker: {alias: workflow.actor.name}, flavor: item.name});
    await workflowUtils.applyDamage([target], damageRoll.total, workflow.defaultDamageType ?? workflow.damageRolls[0]?.options.type ?? 'necrotic');
}
export const bloodSacrifice = {
    name: 'Blood Sacrifice',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: bloodSacrificeUse,
            priority: 50
        }
    ],
    config: {
        dieSize: diceSizeConfig('d6')
    }
};
export const bloodSacrificeActive = {
    name: 'Blood Sacrifice: Active',
    version: bloodSacrifice.version,
    rules: bloodSacrifice.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: bloodSacrificeDamage,
            priority: 60
        }
    ]
};
export const dissolution = {
    name: 'Dissolution',
    version: '2.0.1',
    rules: '2024'
};
async function sproutFoliageUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) === 'attack') return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'sprout-foliage');
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'sprout-foliage');
    if (existing) await documentUtils.deleteDocument(existing);
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['attack'],
            favorite: true
        }
    });
}
export const sproutFoliage = {
    name: 'Sprout Foliage',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: sproutFoliageUse,
            priority: 50
        }
    ]
};
async function summerWindsEarly({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'heal') return;
    const targets = Array.from(workflow.targets);
    const undead = targets.filter(token => (token.actor?.system.details.type?.value ?? token.actor?.system.details.race) === 'undead' && token.document.disposition !== workflow.token?.document.disposition);
    const allies = targets.filter(token => token.document.disposition === workflow.token?.document.disposition);
    game.user.updateTokenTargets(allies.map(token => token.id));
    workflow.targets = new Set(allies);
    if (undead.length) workflowUtils.setWorkflowProperty(workflow, 'summerWinds', undead.map(token => token.document.uuid));
}
async function summerWindsLate({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'heal') return;
    const undeadUuids = workflowUtils.getWorkflowProperty(workflow, 'summerWinds');
    if (!undeadUuids?.length) return;
    const undead = undeadUuids.map(uuid => fromUuidSync(uuid)?.object).filter(Boolean);
    const activity = workflow.item.system.activities.find(a => a.identifier === 'undead');
    if (!activity || !undead.length) return;
    await workflowUtils.syntheticActivityRoll(activity, undead, {spellSlot: getCastLevel(workflow)});
}
export const summerWinds = {
    name: 'Summer Winds',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: summerWindsEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: summerWindsLate,
            priority: 50
        }
    ]
};
export const wiltingSmite = {
    name: 'Wilting Smite',
    version: '2.0.0',
    rules: '2024',
    roll: smitePasses,
    config: {
        damageType: damageTypeConfig('necrotic'),
        diceSize: diceSizeConfig('d6'),
        baseDiceNumber: diceNumberConfig(2)
    }
};
async function forestGuardUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    if (!workflow.token) return;
    const sourceEntry = await getPackEntry('chris-premades.CPRSummons2024', 'CPR - Forest Guard');
    if (!sourceEntry) return;
    const sourceActor = await fromUuid(sourceEntry.uuid);
    if (!sourceActor) return;
    let name = automationUtils.getConfigValue(workflow.item, 'name');
    if (!name?.length) name = workflow.item.name;
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        name,
        duration: activityUtils.getEffectDuration(workflow.activity)?.seconds ?? 3600,
        sourceDocument: workflow.item,
        initiative: 'none',
        updates: {
            name,
            flags: {'chris-premades': {forestGuard: {ownerUuid: workflow.actor.uuid}}},
            prototypeToken: {name, disposition: workflow.token.document.disposition}
        }
    });
    if (!summon) return;
    await summonUtils.placeSummon(summon, workflow.activity.range?.value ?? 60, {token: workflow.token});
    const casterEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'forest-guard') ?? effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'forest-guard-source'
            }
        }
    }], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['attack'],
            favorite: true
        }
    });
    if (casterEffect) await documentUtils.makeDependent(casterEffect, [summon]);
}
function nearbyShrubs(token, ownerUuid, range = 10) {
    return tokenUtils.findNearby(token.document ?? token, range, {includeIncapacitated: true}).filter(nearby => (nearby.actor ?? nearby.object?.actor)?.flags['chris-premades']?.forestGuard?.ownerUuid === ownerUuid);
}
async function forestGuardAttackGate({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'attack') return;
    const target = workflow.targets.first();
    if (!target) return;
    const shrubs = nearbyShrubs(target, workflow.actor.uuid);
    if (shrubs.length) return;
    ui.notifications.warn(_loc('CHRISPREMADES.Macros.ForestGuard.NoShrub'));
    workflow.aborted = true;
}
async function forestGuardDamage({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'attack') return;
    if (!workflow.hitTargets.size) return;
    const shrubs = nearbyShrubs(workflow.hitTargets.first(), workflow.actor.uuid);
    if (shrubs.length <= 1) return;
    await workflowUtils.bonusDamage(workflow, (shrubs.length - 1) + 'd4');
}
export const forestGuard = {
    name: 'Forest Guard',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: forestGuardUse,
            priority: 50
        },
        {
            pass: 'itemPreambleComplete',
            macro: forestGuardAttackGate,
            priority: 50
        },
        {
            pass: 'itemDamageRollComplete',
            macro: forestGuardDamage,
            priority: 50
        }
    ],
    config: {
        name: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
