import {documentUtils} from '../../../../proxy.mjs';
export const greaterDivineIntervention = {
    name: 'Greater Divine Intervention',
    version: '2.0.0',
    rules: '2024',
    config: {
        restFormula: {
            default: '2d4',
            type: 'text',
            label: 'CHRISPREMADES.Macros.GreaterDivineIntervention.RestFormula',
            category: 'tuning'
        }
    }
};
async function rest({document: effect}) {
    const restsLeft = effect.flags['chris-premades']?.greaterDivineInterventionRest?.value;
    if (!restsLeft || restsLeft === 1) {
        await documentUtils.deleteDocument(effect);
    } else {
        await documentUtils.update(effect, {'flags.chris-premades.greaterDivineInterventionRest.value': restsLeft - 1});
    }
}
export const greaterDivineInterventionRest = {
    name: 'Divine Intervention: Blocked',
    version: greaterDivineIntervention.version,
    rules: greaterDivineIntervention.rules,
    rest: [
        {
            pass: 'actorLong',
            macro: rest,
            priority: 50
        }
    ]
};
