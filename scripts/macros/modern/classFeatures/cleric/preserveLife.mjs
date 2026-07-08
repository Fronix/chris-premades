import {automationUtils, dialogUtils, workflowUtils} from '../../../../proxy.mjs';
async function early({workflow}) {
    const eligible = Array.from(workflow.targets).filter(token => token.actor.system.attributes.hp.value < Math.floor(token.actor.system.attributes.hp.max / 2));
    if (workflow.token && workflow.actor.system.attributes.hp.value < Math.floor(workflow.actor.system.attributes.hp.max / 2) && !eligible.includes(workflow.token)) eligible.push(workflow.token);
    game.user.updateTokenTargets(eligible.map(token => token.id ?? token.document?.id));
    workflow.targets = new Set(eligible);
}
async function use({document: item, workflow}) {
    if (!workflow.targets.size) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier') || 'cleric';
    const classItem = workflow.actor.classes[classIdentifier];
    if (!classItem) return;
    const maxAmount = classItem.system.levels * 5;
    const maxes = {};
    Array.from(workflow.targets).forEach(token => {
        maxes[token.id] = Math.min(Math.floor(token.actor.system.attributes.hp.max / 2) - token.actor.system.attributes.hp.value, maxAmount);
    });
    let selection = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.PreserveLife.Select', {maxAmount}), Array.from(workflow.targets), {
        type: 'selectAmount',
        maxAmount,
        skipDeadAndUnconscious: false,
        maxes
    });
    if (!selection?.length) return;
    selection = selection[0].filter(entry => entry.value);
    for (const {document: target, value} of selection) {
        const currHP = target.actor.system.attributes.hp.value;
        const halfHP = Math.floor(target.actor.system.attributes.hp.max / 2);
        await workflowUtils.applyDamage([target], Math.min(value, halfHP - currHP), 'healing');
    }
}
export const preserveLife = {
    name: 'Preserve Life',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: early,
            priority: 50
        },
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        classIdentifier: {
            default: 'cleric',
            type: 'text',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            category: 'linked'
        }
    }
};
