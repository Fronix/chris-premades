import {activityUtils, automationUtils, effectUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
import {damageTypeConfig, diceNumberConfig, diceSizeConfig, smitePasses} from './divineSmite.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const damageType = automationUtils.getConfigValue(workflow.item, 'damageType');
    const diceSize = automationUtils.getConfigValue(workflow.item, 'diceSize');
    const diceNumber = Number(automationUtils.getConfigValue(workflow.item, 'baseDiceNumber')) || 1;
    const formula = ((getCastLevel(workflow) - 1) + diceNumber) + diceSize;
    const saveDC = activityUtils.getSaveDC(workflow.activity);
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.OverTime',
                    type: 'custom',
                    value: 'turn=start, allowIncapacitated=true, saveAbility=con, rollType=save, saveDamage=fulldamage, saveRemove=true, saveDC=' + saveDC + ', saveMagic=true, damageRoll=' + formula + ', damageType=' + damageType + ', name=' + workflow.item.name,
                    phase: 'initial',
                    priority: 20
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'searing-smite'
            }
        }
    };
    await Promise.all(Array.from(workflow.targets).map(async token => {
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }));
}
export const searingSmite = {
    name: 'Searing Smite',
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
        damageType: damageTypeConfig('fire'),
        diceSize: diceSizeConfig('d6'),
        baseDiceNumber: diceNumberConfig(1)
    }
};
