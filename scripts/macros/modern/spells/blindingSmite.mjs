import {activityUtils, automationUtils, effectUtils} from '../../../proxy.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const ability = automationUtils.getConfigValue(workflow.item, 'ability') || 'con';
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        statuses: ['blinded'],
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.OverTime',
                    type: 'custom',
                    value: 'turn=end, allowIncapacitated=true, rollType=save, saveAbility=' + ability + ', saveDC=' + activityUtils.getSaveDC(workflow.activity) + ', saveDamage=nodamage, saveRemove=true, saveMagic=true',
                    phase: 'initial',
                    priority: 20
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'blinding-smite'
            }
        }
    };
    await Promise.all(Array.from(workflow.targets).map(async token => {
        if (token.actor.system.traits.ci.value.has('blinded')) return;
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }));
}
export const blindingSmite = {
    name: 'Blinding Smite',
    version: '2.0.0',
    rules: '2024',
    roll: [
        ...smitePasses,
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        damageType: damageTypeConfig('radiant'),
        diceSize: diceSizeConfig('d8'),
        baseDiceNumber: diceNumberConfig(3),
        ability: {
            default: 'con',
            type: 'select',
            label: 'CHRISPREMADES.Config.Ability',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.abilities).map(([value, {label}]) => ({value, label}))
        }
    }
};
