import {dialogUtils, documentUtils, rollUtils, workflowUtils} from '../../../proxy.mjs';
import {automationUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'use') return;
    if (!workflow.targets.size) return;
    let blastsLeft = (getCastLevel(workflow) ?? 1) + (Number(automationUtils.getConfigValue(workflow.item, 'baseAttacks')) || 1);
    const blast = workflow.item.system.activities.find(a => a.identifier === 'blast');
    if (!blast) return;
    while (blastsLeft > 0) {
        let selection;
        if (workflow.targets.size > 1) {
            const choice = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.EldritchBlast.Target'), Array.from(workflow.targets), {type: 'selectAmount', maxAmount: blastsLeft});
            selection = Array.isArray(choice) ? choice[0] : choice;
            if (!selection?.length) return;
        } else {
            selection = [{document: workflow.targets.first(), value: blastsLeft}];
        }
        for (const entry of selection) {
            for (let i = 0; i < entry.value && blastsLeft > 0; i++) {
                const token = entry.document?.object ?? entry.document;
                await workflowUtils.syntheticActivityRoll(blast, [token]);
                blastsLeft -= 1;
            }
        }
    }
}
async function attack({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'blast') return;
    const target = workflow.targets.first();
    if (!target || !workflow.token) return;
    const coverBonus = MidiQOL.computeCoverBonus?.(workflow.token, target, workflow.item) ?? 0;
    if (coverBonus !== 2 && coverBonus !== 5) return;
    const newRoll = await rollUtils.addToRoll(workflow.attackRoll, String(coverBonus));
    await workflow.setAttackRoll(newRoll);
}
export const spellfireFlare = {
    name: 'Spellfire Flare',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        },
        {
            pass: 'itemAttackRollComplete',
            macro: attack,
            priority: 50
        }
    ],
    config: {
        baseAttacks: {
            default: 1,
            type: 'text',
            label: 'CHRISPREMADES.Config.BaseDiceNumber',
            category: 'tuning'
        }
    }
};
export const spellfireSpark = {
    name: 'Spellfire Spark',
    version: '2.0.0',
    rules: '2024'
};
export const purpleDragonRook = {
    name: 'Purple Dragon Rook',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: async ({workflow}) => {
                if (!workflow.targets.size) return;
                for (const target of workflow.targets) {
                    await documentUtils.update(target.actor, {'system.attributes.inspiration': true});
                }
            },
            priority: 50
        }
    ]
};
export const arcaneBolt = {
    name: 'Arcane Bolt',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Eldritch Eddy']
};
export const eldritchOverload = {
    name: 'Eldritch Overload',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Eldritch Eddy']
};
export const searingSwipe = {
    name: 'Searing Swipe',
    version: '2.0.0',
    rules: '2024',
    monsters: ['Eldritch Eddy']
};
