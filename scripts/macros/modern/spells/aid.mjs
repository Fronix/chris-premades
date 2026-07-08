import {activityUtils, effectUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const bonus = 5 * (getCastLevel(workflow) - 1);
    if (!bonus) return;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        system: {
            changes: [
                {
                    key: 'system.attributes.hp.tempmax',
                    type: 'add',
                    value: bonus,
                    phase: 'final',
                    priority: null
                }
            ]
        },
        flags: {
            cat: {
                identifier: 'aid'
            }
        }
    };
    await Promise.all(Array.from(workflow.targets).map(async token => {
        await effectUtils.createEffects(token.actor, [effectData], {rules: '2024'});
    }));
}
export const aid = {
    name: 'Aid',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'activityDamageRollComplete',
            macro: use,
            priority: 50
        }
    ]
};
