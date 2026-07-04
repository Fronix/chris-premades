import {actorUtils, animationUtils, automationUtils, dataUtils, documentUtils, effectUtils, genericUtils, Logging, workflowUtils} from '../../../../proxy.mjs';
async function preChecks({workflow}) {
    if (workflow.actor.system.attributes.ac.equippedArmor?.system.type.value === 'heavy' && !automationUtils.getConfigValue(workflow.item, 'allowHeavyArmor')) {
        genericUtils.notify('CHRISPREMADES.Macros.All.Rage.HeavyArmor', {type: 'warn'});
        workflow.aborted = true;
        return true;
    }
    if (automationUtils.getConfigValue(workflow.item, 'allowConcentration')) return;
    const effects = Array.from(workflow.actor.concentration.effects);
    if (!effects.length) return;
    genericUtils.notify('CHRISPREMADES.Macros.Modern.All.Concentration', {type: 'warn'});
    await documentUtils.deleteEmbeddedDocuments(workflow.actor, 'ActiveEffect', effects.map(e => e.id));
}
function rageEffect({effect, options, updates}) {
    const activity = effectUtils.getOriginActivitySync(effect);
    if (!activity) return;
    const configs = {};
    const rules = documentUtils.getRules(activity.item) || '2014';
    dataUtils.setRules(configs, rules);
    genericUtils.setProperty(configs, 'flags.chris-premades.rage.bonus', automationUtils.getConfigValue(activity.item, 'rageBonus'));
    genericUtils.setProperty(configs, 'flags.chris-premades.rage.allowConcentration', automationUtils.getConfigValue(activity.item, 'allowConcentration'));
    genericUtils.setProperty(configs, 'flags.chris-premades.rage.allowSpellcasting', automationUtils.getConfigValue(activity.item, 'allowSpellcasting'));
    if (automationUtils.getConfigValue(activity.item, 'allowHeavyArmor'))
        genericUtils.setProperty(configs, 'flags.cat.specialDuration', (effect.flags.cat?.specialDuration ?? []).filter(d => d !== 'heavy'));
    const secondActivity = activity.item.system.activities.getByType('utility').find(a => a.id !== activity.id);
    if (secondActivity) {
        genericUtils.setProperty(configs, 'flags.cat.vae.buttons', [{
            type: 'use',
            name: secondActivity.name,
            itemIdentifier: activity.item.system.identifier,
            activityIdentifier: secondActivity.identifier
        }]);
    }
    effect.updateSource(configs);
    automationUtils.calledEventSync('preCreateRageEffect', activity.actor, {
        canOverlap: true, 
        data: {
            activity, 
            actor: activity.actor,
            effect, 
            options, 
            rules, 
            updates
        }}
    );
}
async function animate({effect}) {
    if (!effect) return;
    const activity = await effectUtils.getOriginActivity(effect);
    if (!activity) return;
    const token = actorUtils.getFirstToken(activity.actor);
    await automationUtils.calledEvent('rageBegin', activity.actor, {
        canOverlap: true, 
        data: {
            activity, 
            actor: activity.actor, 
            effect,
            token
        }
    });
    const animationSetting = automationUtils.getConfigValue(activity.item, 'animation');
    if (!animationSetting) return;
    const animation = animationUtils.getAnimation(animationSetting);
    if (!animation) return;
    animation.macros.play(effect, token);
}
async function spellcasting({document: effect, workflow}) {
    if (workflow.item.type !== 'spell') return;
    const exit = reason => {
        genericUtils.notify('CHRISPREMADES.Macros.All.Rage.' + reason, {type: 'warn'});
        workflow.aborted = true;
    };
    if (workflow.activity.duration.concentration && !effect.flags['chris-premades']?.rage?.allowConcentration) return exit('Concentration');
    if (!effect.flags['chris-premades']?.rage?.allowSpellcasting) return exit('Spellcasting');
}
async function rageDamage({document: effect, workflow}) {
    if (!workflow.hitTargets.size) return;
    if (workflow.activity.ability !== 'str') return;
    const allowedAttack = documentUtils.getRules(effect) === '2024' ? 'attack' : 'meleeWeaponAttack';
    if (!workflowUtils.isAttackType(workflow, allowedAttack)) return;
    const formula = effect.flags['chris-premades']?.rage?.bonus;
    if (!formula) return Logging.addMacroWarning('chris-premades', 'rage', 'Rage damage bonus formula not found!');
    await workflowUtils.bonusDamage(workflow, formula);
}
export const rage = {
    name: 'Rage',
    version: '2.0.2',
    rules: 'all',
    notes: 'Use the "actorPreCreateRageEffect" called event (sync) to modify the rage effect.\n\tData available: actor, activity, effect, options, rules, updates.\nUse "actorRageBegin" (async) to respond when rage starts.\n\tData available: actor, activity, effect, token.',
    roll: [
        {
            pass: 'activityPreambleComplete',
            macro: preChecks,
            priority: 100
        }
    ],
    config: {
        allowConcentration: {
            default: false,
            type: 'checkbox',
            category: 'behavior',
            label: 'CHRISPREMADES.Macros.All.Rage.AllowConcentration'
        },
        allowHeavyArmor: {
            default: false,
            type: 'checkbox',
            category: 'behavior',
            label: 'CHRISPREMADES.Macros.All.Rage.AllowHeavyArmor'
        },
        allowSpellcasting: {
            default: false,
            type: 'checkbox',
            category: 'behavior',
            label: 'CHRISPREMADES.Macros.All.Rage.AllowSpellcasting'
        },
        animation: {
            default: {
                source: 'chris-premades',
                identifier: 'rageDefault'
            },
            type: 'selectAnimation',
            inputs: ['document', 'sourceToken'],
            label: 'CHRISPREMADES.Config.Animation',
            category: 'visuals'
        },
        rageBonus: {
            default: '@scale.barbarian.rage-damage',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'behavior'
        }
    },
    scales: [
        {
            identifier: 'rage-damage',
            classIdentifier: 'barbarian',
            data: {
                type: 'ScaleValue',
                configuration: {
                    distance: {
                        units: ''
                    },
                    identifier: 'rage-damage',
                    type: 'number',
                    scale: {
                        1: {value: 2},
                        9: {value: 3},
                        16: {value: 4}
                    }
                },
                value: {},
                title: 'Rage Damage'
            }
        }
    ]
};
export const raging = {
    name: rage.name,
    version: rage.version,
    rules: rage.rules,
    effect: [
        {
            pass: 'preCreated',
            macro: rageEffect,
            priority: 100
        },
        {
            pass: 'created',
            macro: animate,
            priority: 100
        }
    ],
    roll: [
        {
            pass: 'actorPreambleComplete',
            macro: spellcasting,
            priority: 100
        },
        {
            pass: 'actorDamageRollBonuses',
            macro: rageDamage,
            priority: 100
        }
    ]
};
