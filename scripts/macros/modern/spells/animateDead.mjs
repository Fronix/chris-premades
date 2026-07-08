import {actorUtils, automationUtils, dialogUtils, documentUtils, effectUtils, summonUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
async function use({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity) !== 'animate-dead') return;
    if (!workflow.token) return;
    const zombieActorName = automationUtils.getConfigValue(workflow.item, 'zombieActorName') || 'Zombie';
    const skeletonActorName = automationUtils.getConfigValue(workflow.item, 'skeletonActorName') || 'Skeleton';
    const zombieActor = game.actors.getName(zombieActorName);
    const skeletonActor = game.actors.getName(skeletonActorName);
    if (!zombieActor && !skeletonActor) {
        ui.notifications.warn(_loc('CHRISPREMADES.Error.ActorNotFound'));
        return;
    }
    let totalSummons = 1 + ((getCastLevel(workflow) ?? 3) - 3) * 2;
    if (actorUtils.getItemByIdentifier(workflow.actor, 'undead-thralls')) totalSummons += 1;
    if (totalSummons < 1) return;
    const choices = [zombieActor, skeletonActor].filter(Boolean);
    let selection;
    if (choices.length > 1) {
        const selected = await dialogUtils.selectDocumentDialog(workflow.item.name, _loc('CHRISPREMADES.Summons.SelectSummons', {totalSummons}), choices, {checkbox: true, max: choices.length});
        selection = (Array.isArray(selected) ? selected : [selected]).filter(Boolean);
        if (!selection.length) return;
    } else {
        selection = choices;
    }
    const perActor = Math.max(1, Math.floor(totalSummons / selection.length));
    const summons = [];
    for (const sourceActor of selection) {
        for (let i = 0; i < perActor && summons.length < totalSummons; i++) {
            const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
                name: sourceActor.name,
                duration: 86400,
                sourceDocument: workflow.item,
                initiative: 'follows',
                updates: {prototypeToken: {disposition: workflow.token.document.disposition}}
            });
            if (summon) summons.push(summon);
        }
    }
    if (!summons.length) return;
    await summonUtils.placeSummons(summons, 10, {token: workflow.token});
    await effectUtils.createEffects(workflow.actor, [{
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: {seconds: 86400},
        flags: {
            cat: {
                identifier: 'animate-dead-effect'
            }
        }
    }], {
        rules: '2024',
        unhideActivities: {
            itemUuid: workflow.item.uuid,
            activityIdentifiers: ['animate-dead-command'],
            favorite: true
        }
    });
}
export const animateDead = {
    name: 'Animate Dead',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ],
    config: {
        zombieActorName: {
            default: 'Zombie',
            type: 'text',
            label: 'CHRISPREMADES.Macros.AnimateDead.ZombieName',
            category: 'behavior'
        },
        skeletonActorName: {
            default: 'Skeleton',
            type: 'text',
            label: 'CHRISPREMADES.Macros.AnimateDead.SkeletonName',
            category: 'behavior'
        }
    }
};
export const vitriolicSphere = {
    name: 'Vitriolic Sphere',
    version: '2.0.0',
    rules: '2024'
};
