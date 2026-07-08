import {actorUtils, automationUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../../proxy.mjs';
import {getCastLevel} from '../../../lib/spellUtils.mjs';
async function use({document: item, workflow}) {
    if (workflow.item?.type !== 'spell' || !workflow.activity || !workflow.token || !workflow.castData) return;
    if (!actorUtils.getItemByIdentifier(workflow.actor, 'blessed-strikes-potent-spellcasting')) return;
    if (getCastLevel(workflow) !== 0) return;
    const classIdentifier = automationUtils.getConfigValue(item, 'classIdentifier');
    if (workflow.item.system.sourceClass !== classIdentifier) return;
    const feature = item.system.activities.find(a => a.identifier === 'improved-potent-spellcasting');
    if (!feature) return;
    const range = feature.range?.value ?? 60;
    const nearby = tokenUtils.findNearby(workflow.token.document, range, {disposition: 'ally', includeIncapacitated: true, includeToken: true});
    if (!nearby.length) return;
    let selection;
    if (nearby.length === 1) {
        selection = nearby[0];
    } else {
        const selected = await dialogUtils.selectTargetDialog(item.name, _loc('CHRISPREMADES.Macros.ImprovedPotentSpellcasting.Target'), nearby, {skipDeadAndUnconscious: false});
        if (!selected?.length) return;
        selection = selected[0];
    }
    await workflowUtils.syntheticActivityRoll(feature, [selection]);
}
export const improvedBlessedStrikes = {
    name: 'Improved Blessed Strikes',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorRollFinished',
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
