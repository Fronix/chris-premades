import {activityUtils, effectUtils} from '../../../proxy.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
async function use({workflow}) {
    if (!workflow.failedSaves.size) return;
    const saveAbility = workflow.activity.save?.ability?.first?.() ?? 'wis';
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        statuses: ['frightened'],
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.OverTime',
                    type: 'custom',
                    value: 'turn=end, allowIncapacitated=true, rollType=save, saveAbility=' + saveAbility + ', saveDC=' + activityUtils.getSaveDC(workflow.activity) + ', saveDamage=nodamage, saveRemove=true, saveMagic=true',
                    phase: 'initial',
                    priority: 20
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'wrathful-smite'
            }
        }
    };
    await Promise.all(Array.from(workflow.failedSaves).map(async token => {
        if (token.actor.system.traits.ci.value.has('frightened')) return;
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }));
}
export const wrathfulSmite = {
    name: 'Wrathful Smite',
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
        damageType: damageTypeConfig('necrotic'),
        diceSize: diceSizeConfig('d6'),
        baseDiceNumber: diceNumberConfig(1)
    }
};
