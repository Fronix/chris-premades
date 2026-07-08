import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, queryUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
import {unarmedAttackIdentifiers} from '../../../lib/monkUtils.mjs';
function isSimpleMelee(item, validate) {
    if (!validate) return true;
    return ['simpleM', 'improv'].includes(item.system.type?.value);
}
function getScale(actor, item, defaultScale) {
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'pugilist';
    const scaleIdentifier = automationUtils.getConfigValue(item, 'scaleIdentifier') || defaultScale;
    return actor.system.scale?.[classIdentifier]?.[scaleIdentifier];
}
async function fisticuffsAttack({document: item, workflow}) {
    if (workflow.item?.actor !== item.actor) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!isSimpleMelee(workflow.item, automationUtils.getConfigValue(item, 'validateWeaponType') ?? true)) return;
    const scale = getScale(workflow.actor, item, 'fisticuffs');
    if (!scale?.faces) return;
    const baseFormula = workflow.item.system.damage?.base?.formula;
    if (!baseFormula) return;
    const baseMax = rollUtils.rollDiceSync?.(baseFormula, {options: {maximize: true}})?.total ?? new Roll(baseFormula).evaluateSync({maximize: true}).total;
    const scaleMax = new Roll(scale.formula).evaluateSync({maximize: true}).total;
    const itemData = workflow.item.toObject();
    if (baseMax <= scaleMax) {
        const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, {number: scale.number, denomination: scale.faces});
        itemData.system.activities[workflow.activity.id] = activityData;
    }
    if (workflow.item.system.type.value === 'improv') {
        itemData.system.proficient = 1;
        itemData.system.mastery = 'sap';
    }
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const fisticuffs = {
    name: 'Fisticuffs',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: fisticuffsAttack,
            priority: 25
        }
    ],
    config: {
        validateWeaponType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.MartialArts.ValidateWeaponType',
            category: 'behavior'
        },
        classIdentifier: {
            default: 'pugilist',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'tuning'
        },
        scaleIdentifier: {
            default: 'fisticuffs',
            type: 'text',
            label: 'CHRISPREMADES.Config.ScaleIdentifier',
            category: 'tuning'
        }
    },
    scales: [
        {
            identifier: 'fisticuffs',
            classIdentifier: 'pugilist',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'fisticuffs',
                    type: 'dice',
                    distance: {units: ''},
                    scale: {
                        1: {number: 1, faces: 6, modifiers: []},
                        5: {number: 1, faces: 8, modifiers: []},
                        11: {number: 1, faces: 10, modifiers: []},
                        17: {number: 1, faces: 12, modifiers: []}
                    }
                },
                value: {},
                title: 'Fisticuffs'
            }
        }
    ]
};
function getPugilistUnarmedStrike(actor) {
    for (const identifier of ['pugilist-unarmed-strike', ...unarmedAttackIdentifiers]) {
        const item = actorUtils.getItemByIdentifier(actor, identifier);
        if (item) return item;
    }
}
async function pickNearbyTarget(workflow) {
    if (workflow.targets.size) return workflow.targets.first();
    const nearby = tokenUtils.findNearby(workflow.token.document, 5, {disposition: 'enemy', includeIncapacitated: true});
    if (!nearby.length) return;
    if (nearby.length === 1) return nearby[0].object ?? nearby[0];
    const selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectATarget'), nearby, {skipDeadAndUnconscious: false});
    const chosen = Array.isArray(selection?.[0]) ? selection[0][0] : selection?.[0];
    return chosen?.object ?? chosen;
}
async function oneTwoPunch({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'one-two-punch') return;
    if (!workflow.token) return;
    const unarmedStrike = getPugilistUnarmedStrike(workflow.actor);
    if (!unarmedStrike) return;
    for (let i = 0; i < 2; i++) {
        const target = await pickNearbyTarget(workflow);
        if (!target) break;
        await workflowUtils.syntheticItemRoll(unarmedStrike, [target]);
    }
}
async function stickAndMove({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'stick-and-move') return;
    if (!workflow.token) return;
    const unarmedStrike = getPugilistUnarmedStrike(workflow.actor);
    if (unarmedStrike) {
        const target = await pickNearbyTarget(workflow);
        if (target) await workflowUtils.syntheticItemRoll(unarmedStrike, [target]);
    }
    const pack = game.packs.get('chris-premades.CPRActions2024');
    if (!pack) return;
    const index = await pack.getIndex();
    const docs = [];
    for (const name of ['Dash', 'Disengage']) {
        const entry = index.find(e => e.name === name);
        if (entry) docs.push(await fromUuid(entry.uuid));
    }
    if (!docs.length) return;
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: workflow.activity.name}), docs);
    if (!selection) return;
    const documentData = selection.toObject();
    delete documentData._id;
    const item = itemUtils.syntheticItem(documentData, workflow.actor);
    await workflowUtils.completeItemUse(item, [workflow.token]);
}
export const moxie = {
    name: 'Moxie',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: oneTwoPunch,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: stickAndMove,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'pugilist',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'tuning'
        },
        scaleIdentifier: {
            default: 'moxie',
            type: 'text',
            label: 'CHRISPREMADES.Config.ScaleIdentifier',
            category: 'tuning'
        }
    },
    scales: [
        {
            identifier: 'moxie',
            classIdentifier: 'pugilist',
            data: {
                type: 'ScaleValue',
                configuration: {
                    identifier: 'moxie',
                    type: 'number',
                    distance: {units: ''},
                    scale: {
                        2: {value: 2},
                        4: {value: 3},
                        6: {value: 4},
                        8: {value: 5},
                        10: {value: 6},
                        12: {value: 7},
                        14: {value: 8},
                        16: {value: 9},
                        18: {value: 10},
                        20: {value: 11}
                    }
                },
                value: {},
                title: 'Moxie'
            }
        }
    ]
};
async function moxieFueledFistsAttack({document: item, workflow}) {
    if (workflow.item?.actor !== item.actor) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    const validate = automationUtils.getConfigValue(item, 'validateWeaponType') ?? true;
    const isUnarmed = unarmedAttackIdentifiers.includes(documentUtils.getIdentifier(workflow.item)) || documentUtils.getIdentifier(workflow.item) === 'pugilist-unarmed-strike' || workflow.item.system.type?.value === 'improv';
    if (validate && !isUnarmed) return;
    if (!(automationUtils.getConfigValue(item, 'changeDamageType') ?? true)) return;
    const changedType = automationUtils.getConfigValue(item, 'damageType') || 'force';
    const base = workflow.activity.damage?.parts?.[0]?.toObject?.();
    if (!base) return;
    const activityData = activityUtils.getDamageModifiedActivityData(workflow.activity, base, {types: [changedType]});
    const itemData = workflow.item.toObject();
    itemData.system.activities[workflow.activity.id] = activityData;
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export const moxieFueledFists = {
    name: 'Moxie Fueled Fists',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: moxieFueledFistsAttack,
            priority: 50
        }
    ],
    config: {
        validateWeaponType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.MartialArts.ValidateWeaponType',
            category: 'behavior'
        },
        changeDamageType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.DamageType',
            category: 'behavior'
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
async function haymakerUse({document: item, workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    if (workflow.item !== item) return;
    await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds: 6},
        flags: {
            cat: {
                identifier: 'haymaker'
            }
        }
    }]);
}
async function haymakerHit({document: item, workflow}) {
    if (workflow.item?.actor !== item.actor || workflow.item === item) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!isSimpleMelee(workflow.item, automationUtils.getConfigValue(item, 'validateWeaponType') ?? true)) return;
    const haymakerEffect = actorUtils.getEffectByIdentifier(workflow.actor, 'haymaker');
    if (!haymakerEffect) return;
    if (workflow.hitTargets.size) {
        const moxieItem = actorUtils.getItemByIdentifier(workflow.actor, 'moxie');
        if (moxieItem) await documentUtils.update(moxieItem, {'system.uses.spent': Math.max(0, moxieItem.system.uses.spent - 1)});
        for (let i = 0; i < workflow.damageRolls.length; i++) {
            workflow.damageRolls[i] = await workflow.damageRolls[i].reroll({maximize: true});
        }
        await workflow.setDamageRolls(workflow.damageRolls);
    }
    await documentUtils.deleteDocument(haymakerEffect);
}
async function haymakerAdded({document: item}) {
    await correctActivityItemConsumption(item, ['use'], 'moxie');
}
export const haymaker = {
    name: 'Haymaker',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: haymakerUse,
            priority: 50
        },
        {
            pass: 'actorDamageRollComplete',
            macro: haymakerHit,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: haymakerAdded,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: haymakerAdded,
            priority: 55
        }
    ],
    config: {
        validateWeaponType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.MartialArts.ValidateWeaponType',
            category: 'behavior'
        }
    }
};
async function downButNotOutUse({workflow}) {
    await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        flags: {
            cat: {
                identifier: 'down-but-not-out'
            },
            'chris-premades': {
                downButNotOut: {validateWeaponType: automationUtils.getConfigValue(workflow.item, 'validateWeaponType') ?? true}
            }
        }
    }], {
        rules: '2024',
        macros: [{type: 'roll', macros: [{source: 'chris-premades', rules: '2024', identifier: 'down-but-not-out-active'}]}]
    });
}
async function downButNotOutDamage({document: effect, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (!isSimpleMelee(workflow.item, effect.flags['chris-premades']?.downButNotOut?.validateWeaponType)) return;
    const con = workflow.actor.system.abilities.con.mod;
    const exhaustion = workflow.actor.system.attributes.exhaustion ?? 0;
    const damageType = workflow.damageRolls[0]?.options.type ?? 'bludgeoning';
    await workflowUtils.bonusDamage(workflow, `${con} + ${exhaustion}`, {damageType});
}
export const downButNotOut = {
    name: 'Down But Not Out',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: downButNotOutUse,
            priority: 50
        }
    ],
    config: {
        validateWeaponType: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.MartialArts.ValidateWeaponType',
            category: 'behavior'
        }
    }
};
export const downButNotOutActive = {
    name: 'Down But Not Out: Active',
    version: downButNotOut.version,
    rules: downButNotOut.rules,
    roll: [
        {
            pass: 'actorDamageRollComplete',
            macro: downButNotOutDamage,
            priority: 60
        }
    ]
};
async function digDeepUse({workflow}) {
    const source = workflow.item.effects.contents?.[0];
    if (!source) return;
    const effectData = source.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'digging-deep');
    await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024'});
}
export const digDeep = {
    name: 'Dig Deep',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: digDeepUse,
            priority: 50
        }
    ]
};
async function shakeItOffTurnStart({document: item}) {
    if (!item.system.uses.value) return;
    const actor = item.actor;
    if (!actor) return;
    const conditions = automationUtils.getConfigValue(item, 'conditions') ?? ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'poisoned', 'stunned'];
    const hasConditions = conditions.map(statusId => actor.effects.find(e => e.statuses.has(statusId))).filter(Boolean);
    const exhaustion = actor.system.attributes.exhaustion ?? 0;
    if (!hasConditions.length && !exhaustion) return;
    const userId = queryUtils.firstOwner(actor, true);
    const buttons = hasConditions.map(effect => [effect.name, effect.id]);
    if (exhaustion) buttons.push([_loc('DND5E.Exhaustion'), 'exhaustion']);
    buttons.push(['CHRISPREMADES.Generic.No', false]);
    const selection = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Generic.SelectRemoveCondition'), buttons, {userId});
    if (!selection) return;
    const useActivity = item.system.activities.find(a => a.identifier === 'use') ?? item.system.activities.contents[0];
    if (useActivity) await workflowUtils.completeActivityUse(useActivity, [], {consumeUsage: true});
    if (selection === 'exhaustion') {
        await documentUtils.update(actor, {'system.attributes.exhaustion': Math.max(0, exhaustion - 1)});
    } else {
        const effect = actor.effects.get(selection);
        if (effect) await documentUtils.deleteDocument(effect);
    }
}
export const shakeItOff = {
    name: 'Shake It Off',
    version: '2.0.0',
    rules: '2024',
    combat: [
        {
            pass: 'actorTurnStart',
            macro: shakeItOffTurnStart,
            priority: 50
        }
    ],
    config: {
        conditions: {
            default: ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'poisoned', 'stunned'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'behavior',
            options: () => CONFIG.statusEffects.map(status => ({value: status.id, label: status.name}))
        }
    }
};
async function bloodiedDamaged({document: item, workflow, ditem}) {
    if (!ditem.isHit || !ditem.totalDamage) return;
    if (!item.system.uses.value) return;
    const bloodied = ditem.newHP <= Math.floor(0.5 * item.actor.system.attributes.hp.effectiveMax);
    if ((automationUtils.getConfigValue(item, 'triggerBloodiedOnly') ?? true) && !bloodied) return;
    const userId = queryUtils.firstOwner(item.actor, true);
    const selection = await dialogUtils.confirm(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {userId});
    if (!selection) return;
    const recover = item.system.activities.find(a => a.identifier === 'recover');
    if (recover) await workflowUtils.completeActivityUse(recover, [], {consumeUsage: true});
    if (!bloodied) return;
    const tempHP = item.system.activities.find(a => a.identifier === 'bloodied-temp-hp');
    if (tempHP) await workflowUtils.completeActivityUse(tempHP, []);
}
async function bloodiedAdded({document: item}) {
    await correctActivityItemConsumption(item, ['recover'], 'moxie');
}
export const bloodiedButUnbowed = {
    name: 'Bloodied But Unbowed',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'targetDamageComplete',
            macro: bloodiedDamaged,
            priority: 50
        }
    ],
    item: [
        {
            pass: 'created',
            macro: bloodiedAdded,
            priority: 55
        },
        {
            pass: 'medkit',
            macro: bloodiedAdded,
            priority: 55
        }
    ],
    config: {
        triggerBloodiedOnly: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'behavior'
        }
    }
};
async function heavyHitterHit({document: item, workflow}) {
    if (workflow.item?.actor !== item.actor) return;
    if (workflow.hitTargets.size !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const identifier = documentUtils.getIdentifier(workflow.item);
    if (!unarmedAttackIdentifiers.includes(identifier) && identifier !== 'pugilist-unarmed-strike') return;
    const targetToken = workflow.hitTargets.first();
    if (targetToken.actor.system.attributes.hp.value <= 0) return;
    const options = ['grapple', 'shove-push', 'shove-prone'].map(activityIdentifier => workflow.item.system.activities.find(a => a.identifier === activityIdentifier)).filter(Boolean);
    if (!options.length) return;
    const buttons = options.map(activity => [activity.name, activity.id]);
    buttons.push(['CHRISPREMADES.Generic.No', false]);
    const selection = await dialogUtils.buttonDialog(item.name, _loc('CHRISPREMADES.Dialog.Use', {itemName: item.name}), buttons);
    if (!selection) return;
    const activity = workflow.item.system.activities.get(selection);
    if (activity) await workflowUtils.syntheticActivityRoll(activity, [targetToken.object ?? targetToken]);
}
export const heavyHitter = {
    name: 'Heavy Hitter',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
            macro: heavyHitterHit,
            priority: 50
        }
    ]
};
export const pugilistUnarmedStrike = {
    name: 'Unarmed Strike (Pugilist)',
    version: '2.0.0',
    rules: '2024'
};
export const ironChin = {
    name: 'Iron Chin',
    version: '2.0.0',
    rules: '2024'
};
export const herculean = {
    name: 'Herculean',
    version: '2.0.0',
    rules: '2024'
};
export const heavyweight = {
    name: 'Heavyweight',
    version: '2.0.0',
    rules: '2024'
};
export const schoolOfHardKnocks = {
    name: 'School of Hard Knocks',
    version: '2.0.0',
    rules: '2024'
};
export const swaggerStreak = {
    name: 'Swagger Streak',
    version: '2.0.0',
    rules: '2024'
};
export const cleanFinish = {
    name: 'Clean Finish',
    version: '2.0.0',
    rules: '2024'
};
export const groundwork = {
    name: 'Groundwork',
    version: '2.0.0',
    rules: '2024'
};
export const meatShield = {
    name: 'Meat Shield',
    version: '2.0.0',
    rules: '2024'
};
export const felineForm = {
    name: 'Feline Form',
    version: '2.0.0',
    rules: '2024'
};
