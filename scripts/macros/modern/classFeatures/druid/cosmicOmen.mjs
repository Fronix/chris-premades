import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, queryUtils, rollUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'cosmic-omen') return;
    const existing = actorUtils.getEffectByIdentifier(workflow.actor, 'cosmic-omen-woe') ?? actorUtils.getEffectByIdentifier(workflow.actor, 'cosmic-omen-weal');
    if (existing) await documentUtils.deleteDocument(existing);
    const isOdd = (workflow.utilityRolls?.[0]?.total ?? 0) % 2;
    const activityIdentifier = isOdd ? 'cosmic-omen-woe' : 'cosmic-omen-weal';
    const activity = workflow.item.system.activities.find(a => a.identifier === activityIdentifier);
    if (!activity) return;
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'cosmic-omen-active'};
    const effectData = {
        name: activity.name,
        img: activity.img,
        type: 'base',
        origin: workflow.item.uuid,
        flags: {
            cat: {
                identifier: activityIdentifier
            }
        }
    };
    await effectUtils.createEffects(workflow.actor, [effectData], {
        rules: '2024',
        macros: [
            {type: 'roll', macros: [macroEntry]},
            {type: 'check', macros: [macroEntry]},
            {type: 'save', macros: [macroEntry]},
            {type: 'skill', macros: [macroEntry]}
        ],
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: [activityIdentifier],
            favorite: true
        }
    });
}
async function manual({workflow}) {
    const identifier = documentUtils.getIdentifier(workflow.activity);
    if (!['cosmic-omen-weal', 'cosmic-omen-woe'].includes(identifier)) return;
    if (workflow.targets.size !== 1) return;
    if (workflow.workflowOptions?.['chris-premades']?.notManual) return;
    const bonus = workflow.utilityRolls?.[0]?.total;
    if (!bonus) return;
    const changeKeys = [
        'system.bonuses.mwak.attack',
        'system.bonuses.msak.attack',
        'system.bonuses.rwak.attack',
        'system.bonuses.rsak.attack',
        'system.bonuses.abilities.check',
        'system.bonuses.abilities.save',
        'system.attributes.init.bonus'
    ];
    const effectData = {
        name: workflow.activity.name,
        img: workflow.activity.img,
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: changeKeys.map(key => ({key, type: 'add', value: bonus, phase: 'final', priority: 20}))
        },
        flags: {
            dae: {
                specialDuration: ['1Attack', 'isSave', 'isCheck', 'isInitiative']
            }
        }
    };
    await effectUtils.createEffects(workflow.targets.first().actor, [effectData]);
}
async function getWealWoeBonus(effect, item, druidToken, targetToken) {
    const isWeal = documentUtils.getIdentifier(effect) === 'cosmic-omen-weal';
    const content = _loc('CHRISPREMADES.Macros.CosmicOmen.' + (isWeal ? 'Weal' : 'Woe'), {itemName: effect.name, tokenName: targetToken.name});
    const confirmed = await dialogUtils.confirm(effect.name, content, {userId: queryUtils.firstOwner(item.actor, true)});
    if (!confirmed) return;
    const activity = item.system.activities.find(a => a.identifier === (isWeal ? 'cosmic-omen-weal' : 'cosmic-omen-woe'));
    if (!activity) return;
    const newWorkflow = await workflowUtils.syntheticActivityRoll(activity, [targetToken], {
        options: {workflowOptions: {'chris-premades': {notManual: true}}},
        consumeResources: true
    });
    if (!item.system.uses.value) await documentUtils.deleteDocument(effect);
    return newWorkflow?.utilityRolls?.[0]?.total;
}
async function attack({document: effect, workflow}) {
    const item = await fromUuid(effect.origin);
    if (!item || !automationUtils.getConfigValue(item, 'enablePrompt')) return;
    if (MidiQOL.hasUsedReaction(item.actor)) return;
    const druidToken = actorUtils.getFirstToken(item.actor);
    if (!druidToken || !workflow.token) return;
    if (tokenUtils.getDistance(druidToken.document ?? druidToken, workflow.token.document) > 30) return;
    const bonus = await getWealWoeBonus(effect, item, druidToken, workflow.token);
    if (!bonus) return;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, String(bonus));
    await workflow.setAttackRoll(newRoll);
}
async function check({document: effect, actor, roll}) {
    const item = await fromUuid(effect.origin);
    if (!item || !automationUtils.getConfigValue(item, 'enablePrompt')) return;
    if (MidiQOL.hasUsedReaction(item.actor)) return;
    if (actor === item.actor) return;
    const token = actorUtils.getFirstToken(actor);
    const druidToken = actorUtils.getFirstToken(item.actor);
    if (!token || !druidToken) return;
    if (tokenUtils.getDistance(druidToken.document ?? druidToken, token.document ?? token) > 30) return;
    const bonus = await getWealWoeBonus(effect, item, druidToken, token);
    if (!bonus) return;
    return await rollUtils.addToRoll(roll, String(bonus), {rollData: roll.data});
}
export const cosmicOmen = {
    name: 'Cosmic Omen',
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
            macro: manual,
            priority: 50
        }
    ],
    config: {
        enablePrompt: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Config.EnablePrompt',
            category: 'behavior'
        }
    }
};
export const cosmicOmenActive = {
    name: 'Cosmic Omen: Active',
    version: cosmicOmen.version,
    rules: cosmicOmen.rules,
    roll: [
        {
            pass: 'sceneAttackRollBonuses',
            macro: attack,
            priority: 50
        }
    ],
    check: [
        {
            pass: 'sceneBonus',
            macro: check,
            priority: 50
        }
    ],
    save: [
        {
            pass: 'sceneBonus',
            macro: check,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'sceneBonus',
            macro: check,
            priority: 50
        }
    ]
};
