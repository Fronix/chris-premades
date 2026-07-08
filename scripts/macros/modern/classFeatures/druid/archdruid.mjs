import {actorUtils, documentUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function added({document: item}) {
    const actor = item.actor;
    if (!actor) return;
    const wildShape = actorUtils.getItemByIdentifier(actor, 'wild-shape');
    if (!wildShape) return;
    if (!wildShape.system.uses.recovery.find(recovery => recovery.period === 'initiative')) {
        const newRecovery = wildShape.toObject().system.uses.recovery;
        newRecovery.push({
            formula: '1 - sign(@item.uses.value)',
            period: 'initiative',
            type: 'formula'
        });
        await documentUtils.update(wildShape, {'system.uses.recovery': newRecovery});
    }
    const archdruidActivity = item.system.activities.find(a => a.identifier === 'archdruid');
    if (!archdruidActivity) return;
    if (archdruidActivity.consumption.scaling.max === '') {
        await documentUtils.update(archdruidActivity, {'consumption.scaling.max': wildShape._source.system.uses.max});
        await correctActivityItemConsumption(item, ['archdruid'], 'wild-shape');
    }
}
export const archdruid = {
    name: 'Archdruid',
    version: '2.0.0',
    rules: '2024',
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'medkit',
            macro: added,
            priority: 50
        }
    ]
};
