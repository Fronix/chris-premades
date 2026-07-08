import {actorUtils, automationUtils, dialogUtils, documentUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    const conditions = automationUtils.getConfigValue(workflow.item, 'conditions') ?? ['charmed', 'frightened', 'poisoned'];
    const active = conditions.map(condition => actorUtils.getEffectByStatusID(workflow.actor, condition)).filter(Boolean);
    if (!active.length) return;
    let selection;
    if (active.length === 1) {
        selection = active[0];
    } else {
        selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectRemoveCondition'), active);
        if (!selection) return;
    }
    await documentUtils.deleteDocument(selection);
}
export const selfRestoration = {
    name: 'Self-Restoration',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        conditions: {
            default: ['charmed', 'frightened', 'poisoned'],
            type: 'select-many',
            label: 'CHRISPREMADES.Config.Conditions',
            category: 'tuning',
            options: () => Object.entries(CONFIG.DND5E.conditionTypes).map(([value, {label}]) => ({value, label}))
        }
    }
};
