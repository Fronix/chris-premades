import {activityUtils, dialogUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
import {getCastLevel, upcastTargets} from '../../lib/spellUtils.mjs';
function advantageEffectData() {
    return {
        name: _loc('CHRISPREMADES.Generic.Advantage'),
        img: 'icons/svg/upgrade.svg',
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.advantage.ability.save.all', type: 'override', value: 1, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
function immuneEffectData() {
    return {
        name: _loc('CHRISPREMADES.Generic.Immune'),
        img: 'icons/svg/invisible.svg',
        type: 'base',
        duration: {value: 1, units: 'seconds'},
        system: {
            changes: [
                {key: 'flags.midi-qol.min.ability.save.all', type: 'override', value: 100, phase: 'initial', priority: 120}
            ]
        },
        flags: {
            dae: {
                specialDuration: ['isSave']
            }
        }
    };
}
async function charmMonsterEarly({workflow}) {
    if (!workflow.targets.size) return;
    if (!game.combat?.started) return;
    for (const token of workflow.targets) {
        await effectUtils.createEffects(token.actor, [advantageEffectData()]);
    }
}
export const charmMonster = {
    name: 'Charm Monster',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: charmMonsterEarly,
            priority: 50
        }
    ]
};
async function charmPersonEarly({workflow}) {
    if (!workflow.targets.size) return;
    for (const token of workflow.targets) {
        const type = token.actor.system.details?.type?.value ?? token.actor.system.details?.race;
        if (type !== 'humanoid') {
            await effectUtils.createEffects(token.actor, [immuneEffectData()]);
            continue;
        }
        if (game.combat?.started) await effectUtils.createEffects(token.actor, [advantageEffectData()]);
    }
}
export const charmPerson = {
    name: 'Charm Person',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: charmPersonEarly,
            priority: 50
        }
    ]
};
async function arcaneVigorDamage({workflow}) {
    const selection = await dialogUtils.selectHitDie(workflow.actor, workflow.item.name, _loc('CHRISPREMADES.Macros.ArcaneVigor.Choose'), {max: getCastLevel(workflow)});
    if (!selection) return;
    let formula = '';
    for (const entry of selection) {
        if (!entry.amount) continue;
        if (formula.length) formula += ' + ';
        formula += entry.amount + entry.document.system.hd.denomination;
        await documentUtils.update(entry.document, {'system.hd.spent': entry.document.system.hd.spent + entry.amount});
    }
    if (!formula.length) return;
    formula += ' + @mod';
    const options = workflow.damageRolls[0].options;
    const roll = await new CONFIG.Dice.DamageRoll(formula, workflow.activity.getRollData(), options).evaluate();
    await workflow.setDamageRolls([roll]);
}
export const arcaneVigor = {
    name: 'Arcane Vigor',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemDamageRollComplete',
            macro: arcaneVigorDamage,
            priority: 50
        }
    ]
};
async function blindnessUse({workflow}) {
    if (!workflow.failedSaves.size) return;
    const identifier = documentUtils.getIdentifier(workflow.activity);
    if (!identifier) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        statuses: [identifier],
        system: {
            changes: [
                {key: 'flags.midi-qol.OverTime', type: 'custom', value: 'turn=end, allowIncapacitated=true, rollType=save, saveAbility=con, saveDC=' + activityUtils.getSaveDC(workflow.activity) + ', saveMagic=true', phase: 'initial', priority: 20}
            ]
        }
    };
    for (const token of workflow.failedSaves) {
        await effectUtils.createEffects(token.actor, [effectData]);
    }
}
async function blindnessEarly({workflow}) {
    await upcastTargets(workflow, 1);
}
export const blindnessDeafness = {
    name: 'Blindness/Deafness',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: blindnessEarly,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: blindnessUse,
            priority: 50
        }
    ]
};
