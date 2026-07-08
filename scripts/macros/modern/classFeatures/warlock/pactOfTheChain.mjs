import {actorUtils, dialogUtils, summonUtils, workflowUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (!workflow.targets.size) return;
    const findFamiliar = actorUtils.getItemByIdentifier(workflow.actor, 'find-familiar');
    const summons = findFamiliar ? summonUtils.getSummonBySource(findFamiliar) : [];
    const familiarActor = summons?.[0]?.actor;
    if (!familiarActor) return;
    if (MidiQOL.hasUsedReaction(familiarActor)) return;
    const attacks = familiarActor.items.filter(item => item.system.activities?.some(a => a.type === 'attack'));
    if (!attacks.length) return;
    let selection;
    if (attacks.length === 1) {
        selection = attacks[0];
    } else {
        attacks.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
        selection = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.PactOfTheChain.Attack'), attacks);
        if (!selection) return;
    }
    await workflowUtils.syntheticItemRoll(selection, Array.from(workflow.targets), {consumeResources: true, consumeUsage: true});
    if (game.combat?.started) await MidiQOL.setReactionUsed(familiarActor);
}
export const pactOfTheChain = {
    name: 'Eldritch Invocations: Pact of the Chain',
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
export const magicalCunning = {
    name: 'Magical Cunning',
    version: '2.0.0',
    rules: '2024'
};
export const oneWithShadows = {
    name: 'Eldritch Invocations: One with Shadows',
    version: '2.0.0',
    rules: '2024'
};
