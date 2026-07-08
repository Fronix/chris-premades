import {activityUtils, actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, rollUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size || !workflow.activity) return;
    if (documentUtils.getIdentifier(workflow.activity) === 'self-use') return;
    const skills = Object.entries(CONFIG.DND5E.skills).map(([id, value]) => ({name: value.label, id, img: value.icon}));
    const selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Generic.SelectASkill'), skills);
    if (!selection) return;
    const sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    const effectData = sourceEffect.toObject();
    delete effectData._id;
    effectData.origin = workflow.item.uuid;
    effectData.duration = activityUtils.getEffectDuration(workflow.activity);
    const formula = automationUtils.getConfigValue(workflow.item, 'formula') || '1d4';
    effectData.system.changes[0].key = effectData.system.changes[0].key.replaceAll('acr', selection.id);
    effectData.system.changes[0].value = '+ ' + formula;
    effectData.img = selection.img ?? sourceEffect.img;
    for (const token of workflow.targets) {
        const created = await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
        const concentration = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
        if (concentration && created?.length) await documentUtils.makeDependent(concentration, created);
    }
}
async function skillCheck({document: item, actor, roll, token}) {
    const prompt = automationUtils.getConfigValue(item, 'promptToUse');
    if (prompt === 'never') return;
    if (game.combat?.started) return;
    if (actorUtils.getEffectByIdentifier(actor, 'guidance-effect')) return;
    if (prompt === 'prompt') {
        const confirmed = await dialogUtils.confirmUseItem(item);
        if (!confirmed) return;
    }
    const activity = item.system.activities.find(a => a.identifier === 'self-use');
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, token ? [token] : [], {consumeResources: true, consumeUsage: true});
    const formula = automationUtils.getConfigValue(item, 'formula') || '1d4';
    return await rollUtils.addToRoll(roll, '+ ' + formula);
}
export const guidance = {
    name: 'Guidance',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    skill: [
        {
            pass: 'actorBonus',
            macro: skillCheck,
            priority: 50
        }
    ],
    config: {
        promptToUse: {
            default: 'prompt',
            type: 'select',
            label: 'CHRISPREMADES.Config.PromptToUse',
            category: 'behavior',
            options: [
                {label: 'CHRISPREMADES.Generic.Never', value: 'never'},
                {label: 'CHRISPREMADES.Generic.Prompt', value: 'prompt'},
                {label: 'CHRISPREMADES.Generic.Automatic', value: 'auto'}
            ]
        },
        formula: {
            default: '1d4',
            type: 'text',
            label: 'CHRISPREMADES.Config.Formula',
            category: 'tuning'
        }
    }
};
