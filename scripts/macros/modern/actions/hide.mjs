import {activityUtils, actorUtils, dialogUtils, documentUtils, effectUtils, queryUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (workflow.failedSaves.size) return;
    const sourceEffect = documentUtils.getEffectByIdentifier(workflow.item, 'hide-effect') ?? workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    effectData.origin = workflow.item.uuid;
    foundry.utils.setProperty(effectData, 'flags.cat.identifier', 'hide-effect');
    const macroEntry = {source: 'chris-premades', rules: '2024', identifier: 'hide-effect'};
    const macros = [
        {type: 'roll', macros: [macroEntry]},
        {type: 'effect', macros: [macroEntry]}
    ];
    if (actorUtils.getItemByIdentifier(workflow.actor, 'supreme-sneak')) {
        macros.push({type: 'combat', macros: [macroEntry]});
    }
    await effectUtils.createEffects(workflow.actor, [effectData], {rules: '2024', macros});
}
async function checkRemove({document: effect, workflow}) {
    if (!workflow.activity) return;
    if (workflow.item.type === 'spell') {
        if (!workflow.item.system.properties.has('vocal')) return;
    } else {
        if (!workflowUtils.isAttackType(workflow, 'attack')) return;
        if (workflowUtils.getWorkflowProperty(workflow, 'supremeSneak.used')) {
            await effect.setFlag('chris-premades', 'supremeSneak.check', true);
            return;
        }
    }
    await documentUtils.deleteDocument(effect);
}
async function turn({document: effect}) {
    if (!effect.flags['chris-premades']?.supremeSneak?.check) return;
    const supremeSneak = actorUtils.getItemByIdentifier(effect.parent, 'supreme-sneak');
    if (!supremeSneak) return;
    const selection = await dialogUtils.confirm(supremeSneak.name, _loc('CHRISPREMADES.Macros.SupremeSneak.TurnEnd'), {userId: queryUtils.firstOwner(effect.parent, true)});
    if (selection) {
        await effect.setFlag('chris-premades', 'supremeSneak.check', false);
        return;
    }
    await documentUtils.deleteDocument(effect);
}
export const hide = {
    name: 'Hide',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
export const hideEffect = {
    name: 'Hidden',
    version: hide.version,
    rules: hide.rules,
    roll: [
        {
            pass: 'actorRollFinished',
            macro: checkRemove,
            priority: 500
        }
    ],
    combat: [
        {
            pass: 'actorTurnEnd',
            macro: turn,
            priority: 50
        }
    ]
};
