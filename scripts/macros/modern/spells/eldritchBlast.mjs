import {dialogUtils, documentUtils, workflowUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'eldritch-blast') return;
    if (!workflow.targets.size) return;
    const level = workflow.actor.system.details?.level ?? workflow.actor.system.details?.cr ?? 1;
    const bolts = 1 + Math.floor((level + 1) / 6);
    const feature = workflow.item.system.activities.find(a => a.identifier === 'eldritch-blast-beam');
    if (!feature) return;
    let boltsLeft = bolts;
    while (boltsLeft > 0) {
        let selection;
        if (workflow.targets.size > 1) {
            const choice = await dialogUtils.selectTargetDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.EldritchBlast.Target'), Array.from(workflow.targets), {type: 'selectAmount', maxAmount: boltsLeft});
            if (!choice) return;
            selection = choice[0];
            if (!selection?.length) return;
        } else {
            selection = [{document: workflow.targets.first(), value: 1}];
        }
        for (const entry of selection) {
            const count = Number(entry.value ?? entry.amount ?? 1);
            for (let i = 0; i < count && boltsLeft > 0; i++) {
                await workflowUtils.syntheticActivityRoll(feature, [entry.document ?? entry]);
                boltsLeft -= 1;
            }
        }
    }
}
export const eldritchBlast = {
    name: 'Eldritch Blast',
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
