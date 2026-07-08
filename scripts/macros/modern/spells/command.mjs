import {actorUtils, dialogUtils, documentUtils} from '../../../proxy.mjs';
import {upcastTargets} from '../../lib/spellUtils.mjs';
async function preamble({workflow}) {
    await upcastTargets(workflow, 1);
}
async function turnStart({document: effect}) {
    const identifier = documentUtils.getIdentifier(effect);
    if (!identifier) return;
    const key = identifier.replace('command-', '');
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    await dialogUtils.confirm(effect.name, _loc('CHRISPREMADES.Macros.Command.YouMust') + _loc('CHRISPREMADES.Macros.Command.' + label));
}
async function grovel({document: effect}) {
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    if (actorUtils.getEffectByStatusID(actor, 'prone') || actor.system.traits.ci.value.has('prone')) return;
    await actorUtils.applyConditions(actor, ['prone']);
}
export const command = {
    name: 'Command',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemPreambleComplete',
            macro: preamble,
            priority: 50
        }
    ]
};
export const commandTurnStart = {
    name: command.name,
    version: command.version,
    rules: command.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};
export const commandGrovel = {
    name: command.name,
    version: command.version,
    rules: command.rules,
    combat: [
        {
            pass: 'actorTurnStart',
            macro: grovel,
            priority: 49
        }
    ]
};
