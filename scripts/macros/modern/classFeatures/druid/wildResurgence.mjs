import {actorUtils, documentUtils} from '../../../../proxy.mjs';
import {correctActivityItemConsumption} from '../../../lib/spellUtils.mjs';
async function early({activity, actor}) {
    if (documentUtils.getIdentifier(activity) !== 'restore-wild-shape') return;
    const wildShape = actorUtils.getItemByIdentifier(actor, 'wild-shape');
    if (wildShape?.system.uses.value === 0) return;
    ui.notifications.info(_loc('CHRISPREMADES.Macros.WildResurgence.WildShapeUses'));
    return true;
}
async function added({document: item}) {
    await correctActivityItemConsumption(item, ['restore-wild-shape', 'restore-spell-slot'], 'wild-shape');
}
export const wildResurgence = {
    name: 'Wild Resurgence',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreTargeting',
            macro: early,
            priority: 50
        }
    ],
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
