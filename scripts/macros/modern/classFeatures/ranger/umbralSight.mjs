import {tokenUtils} from '../../../../proxy.mjs';
async function early({document: item, workflow}) {
    if (workflow.targets.size !== 1 || !workflow.token) return;
    if (tokenUtils.getLightLevel(workflow.token) !== 'dark') return;
    const targetToken = workflow.targets.first();
    const validModes = targetToken.detectionModes.map(mode => mode.id).filter(id => !['lightPerception', 'basicSight', 'hearing'].includes(id));
    if (tokenUtils.canSense(targetToken, workflow.token, validModes)) return;
    workflow.advantage = true;
}
async function earlyTarget({document: item, workflow}) {
    if (workflow.targets.size !== 1 || !workflow.token) return;
    const targetToken = workflow.targets.first();
    if (tokenUtils.getLightLevel(targetToken) !== 'dark') return;
    const validModes = workflow.token.detectionModes.map(mode => mode.id).filter(id => !['lightPerception', 'basicSight', 'hearing'].includes(id));
    if (tokenUtils.canSense(workflow.token, targetToken, validModes)) return;
    workflow.disadvantage = true;
}
export const umbralSight = {
    name: 'Umbral Sight',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'actorAttackRollConfig',
            macro: early,
            priority: 50
        },
        {
            pass: 'targetAttackRollConfig',
            macro: earlyTarget,
            priority: 50
        }
    ]
};
