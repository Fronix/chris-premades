import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, itemUtils, queryUtils, tokenUtils, workflowUtils} from '../../../proxy.mjs';
async function healerEarly({workflow}) {
    if (workflow.targets.size !== 1) return;
    if (documentUtils.getIdentifier(workflow.activity) !== 'healer-heal') return;
    const healersKit = actorUtils.getItemByIdentifier(workflow.actor, 'healers-kit');
    if (!healersKit?.system.uses.value) return;
    const targetActor = workflow.targets.first().actor;
    const ownerId = queryUtils.firstOwner(targetActor, true);
    const classSelection = await dialogUtils.selectHitDie(targetActor, workflow.item.name, _loc('CHRISPREMADES.Macros.Healer.SelectHitDie'), {userId: ownerId, max: 1});
    if (!classSelection) return;
    await documentUtils.update(healersKit, {'system.uses.spent': healersKit.system.uses.spent + 1});
    let formula = '';
    for (const entry of classSelection) {
        if (!entry.amount) continue;
        formula += entry.amount + entry.document.system.hd.denomination + ' + ';
        await documentUtils.update(entry.document, {'system.hd.spent': entry.document.system.hd.spent + entry.amount});
    }
    if (!formula.length) return;
    formula += workflow.actor.system.attributes.prof;
    const itemData = workflow.item.toObject();
    const activityData = itemData.system.activities[workflow.activity.id];
    if (activityData.healing?.custom) {
        activityData.healing.custom.enabled = true;
        activityData.healing.custom.formula = formula;
    }
    workflow.item = itemUtils.syntheticItem(itemData, workflow.actor);
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
async function healerHealing({document: item, workflow}) {
    if (workflow.activity.type !== 'heal') return;
    if (automationUtils.getConfigValue(item, 'spellOnly')) {
        if (!(workflow.item.type === 'spell' || workflow.item.system.type?.value === 'spellFeature' || documentUtils.getIdentifier(workflow.activity) === 'healer-heal')) return;
    } else if (documentUtils.getIdentifier(workflow.item) !== 'healer') {
        return;
    }
    const damageRolls = await Promise.all(workflow.damageRolls.map(async roll => {
        let newFormula = '';
        for (const term of roll.terms) {
            if (term.isDeterministic) {
                newFormula += term.expression;
            } else if (term.expression.toLowerCase().includes('r1')) {
                newFormula += term.formula;
            } else if (term.flavor) {
                newFormula += term.expression + 'r1[' + term.flavor + ']';
            } else {
                newFormula += term.expression + 'r1';
            }
        }
        return await new CONFIG.Dice.DamageRoll(newFormula, workflow.activity.getRollData(), roll.options).evaluate();
    }));
    await workflow.setDamageRolls(damageRolls);
}
export const healer = {
    name: 'Healer',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: healerEarly,
            priority: 10
        },
        {
            pass: 'actorDamageRollComplete',
            macro: healerHealing,
            priority: 320
        }
    ],
    config: {
        spellOnly: {
            default: true,
            type: 'checkbox',
            label: 'CHRISPREMADES.Macros.Healer.SpellOnly',
            category: 'behavior'
        }
    }
};
async function protectionEarly({workflow}) {
    if (workflow.targets.size !== 1 || !workflow.token) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    const targetToken = workflow.targets.first();
    if (actorUtils.getEffectByIdentifier(targetToken.actor, 'protection-protected')) return;
    const nearbyTokens = tokenUtils.findNearby(targetToken.document ?? targetToken, 5, {disposition: 'ally'}).filter(t => {
        if (workflow.token.document.disposition === (t.document?.disposition ?? t.disposition)) return false;
        if (!t.actor.system.attributes.ac.equippedShield) return false;
        if (MidiQOL.hasUsedReaction(t.actor)) return false;
        if (workflow.targets.has(t)) return false;
        return !!actorUtils.getItemByIdentifier(t.actor, 'protection');
    });
    if (!nearbyTokens.length) return;
    for (const t of nearbyTokens) {
        const protection = actorUtils.getItemByIdentifier(t.actor, 'protection');
        const selection = await dialogUtils.confirm(protection.name, _loc('CHRISPREMADES.Macros.Protection.Protect', {tokenName: targetToken.name}), {userId: queryUtils.firstOwner(t.actor, true)});
        if (!selection) continue;
        const targetEffectData = {
            name: _loc('CHRISPREMADES.Macros.Protection.Protected'),
            img: protection.img,
            type: 'base',
            origin: protection.uuid,
            duration: {rounds: 1},
            system: {
                changes: [
                    {key: 'flags.midi-qol.grants.disadvantage.attack.all', type: 'override', value: '1', phase: 'initial', priority: 20}
                ]
            },
            flags: {
                cat: {
                    identifier: 'protection-protected'
                }
            }
        };
        const protectorEffectData = {
            name: protection.name,
            img: protection.img,
            type: 'base',
            origin: protection.uuid,
            duration: {rounds: 1},
            flags: {
                cat: {
                    identifier: 'protection'
                },
                dae: {
                    specialDuration: ['turnStartSource', 'combatEnd'],
                    stackable: 'noneNameOnly'
                }
            }
        };
        const protectorCreated = await effectUtils.createEffects(t.actor, [protectorEffectData]);
        const targetCreated = await effectUtils.createEffects(targetToken.actor, [targetEffectData]);
        if (protectorCreated?.[0] && targetCreated?.length) await documentUtils.makeDependent(protectorCreated[0], targetCreated);
        if (game.combat?.started) await MidiQOL.setReactionUsed(t.actor);
        break;
    }
}
export const protection = {
    name: 'Protection',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'sceneAttackRollConfig',
            macro: protectionEarly,
            priority: 40
        }
    ]
};
