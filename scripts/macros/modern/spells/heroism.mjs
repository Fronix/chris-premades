import {activityUtils, documentUtils, effectUtils} from '../../../proxy.mjs';
import {upcastTargets} from '../../lib/spellUtils.mjs';
async function preamble({workflow}) {
    await upcastTargets(workflow, 1);
}
async function use({workflow}) {
    const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    if (!workflow.targets.size) {
        if (concentration) await documentUtils.deleteDocument(concentration);
        return;
    }
    const ability = workflow.item.system.ability || workflow.actor.system.attributes?.spellcasting || 'cha';
    const spellMod = workflow.actor.system.abilities[ability]?.mod ?? 0;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {
                    key: 'system.traits.ci.value',
                    type: 'add',
                    value: 'frightened',
                    phase: 'final',
                    priority: null
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'heroism'
            },
            'chris-premades': {
                heroism: {
                    spellMod
                }
            }
        }
    };
    const created = [];
    for (const token of workflow.targets) {
        const effects = await effectUtils.createEffects(token.actor, [effectData], {
            rules: '2024',
            macros: [{type: 'combat', macros: [{source: 'chris-premades', rules: '2024', identifier: 'heroism-heroic'}]}]
        });
        if (effects?.length) created.push(...effects);
    }
    if (concentration && created.length) await documentUtils.makeDependent(concentration, created);
}
async function turnStart({document: effect, token}) {
    const actor = token?.actor;
    if (!actor) return;
    const tempHP = effect.flags['chris-premades']?.heroism?.spellMod;
    if (!tempHP) return;
    if ((actor.system.attributes.hp.temp ?? 0) >= tempHP) return;
    await documentUtils.update(actor, {'system.attributes.hp.temp': tempHP});
}
export const heroism = {
    name: 'Heroism',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityPreambleComplete',
            macro: preamble,
            priority: 50
        },
        {
            pass: 'activityRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const heroismHeroic = {
    name: 'Heroism: Heroic',
    version: heroism.version,
    rules: heroism.rules,
    combat: [
        {
            pass: 'turnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};
