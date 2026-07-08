import {documentUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const targetActor = workflow.targets.first()?.actor;
    if (!targetActor) return;
    await documentUtils.update(targetActor, {'system.attributes.death.success': 3});
}
export const healersKit = {
    name: 'Healer\'s Kit',
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
