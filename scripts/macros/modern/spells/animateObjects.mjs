import {dialogUtils, documentUtils, effectUtils, summonUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
import {getPackEntry} from './summonSpells.mjs';
function getDataForSize(size) {
    switch (size) {
        case 'tiny':
        case 'sm':
        case 'med': return {hp: 10, number: 1, faces: 4, weight: 1};
        case 'lg': return {hp: 20, number: 2, faces: 6, bonus: true, weight: 2};
        case 'huge': return {hp: 40, number: 2, faces: 12, bonus: true, weight: 3};
        default: return null;
    }
}
async function use({workflow}) {
    const scaling = Math.max(0, (getCastLevel(workflow) ?? 5) - 5);
    const casterData = workflow.actor.getRollData();
    const mod = casterData.attributes.spell?.mod ?? casterData.abilities?.int?.mod ?? 1;
    if (mod < 1 || !workflow.token) return;
    const prof = casterData.attributes.prof;
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    const exit = async () => {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
    };
    const sourceEntry = await getPackEntry('chris-premades.CPRSummons2024', 'CPR - Animated Object');
    if (!sourceEntry) return exit();
    const sourceActor = await fromUuid(sourceEntry.uuid);
    const attackEntry = await getPackEntry('chris-premades.CPRSummonFeatures2024', 'Slam (Animated Object)');
    if (!sourceActor || !attackEntry) return exit();
    const attackDoc = await fromUuid(attackEntry.uuid);
    const baseAttackData = attackDoc.toObject();
    delete baseAttackData._id;
    let remaining = mod;
    const summons = [];
    const defaultName = _loc('CHRISPREMADES.Summons.CreatureNames.AnimatedObject');
    while (remaining > 0) {
        const buttons = [];
        for (const size of ['tiny', 'sm', 'med', 'lg', 'huge']) {
            const data = getDataForSize(size);
            if (data.weight > remaining) continue;
            buttons.push([CONFIG.DND5E.actorSizes[size].label + ' (' + data.weight + ')', size]);
        }
        if (!buttons.length) break;
        buttons.push(['CHRISPREMADES.Generic.No', false]);
        const size = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Summons.SelectSummons', {totalSummons: remaining}), buttons);
        if (!size) break;
        const data = getDataForSize(size);
        remaining -= data.weight;
        const name = CONFIG.DND5E.actorSizes[size].label + ' ' + defaultName;
        const attackData = foundry.utils.duplicate(baseAttackData);
        for (const [id, activityData] of Object.entries(attackData.system.activities)) {
            if (activityData.type !== 'attack') continue;
            activityData.damage.parts[0].number = data.number + scaling;
            activityData.damage.parts[0].denomination = data.faces;
            if (data.bonus) activityData.damage.parts[0].bonus = String(activityData.damage.parts[0].bonus || '') + ' + ' + mod;
            activityData.damage.includeBase = false;
            foundry.utils.setProperty(activityData, 'attack.flat', true);
            foundry.utils.setProperty(activityData, 'attack.bonus', String(mod + prof));
        }
        const updates = {
            name,
            system: {
                traits: {size},
                attributes: {hp: {value: data.hp, max: data.hp}}
            },
            prototypeToken: {
                name,
                disposition: workflow.token.document.disposition,
                width: CONFIG.DND5E.actorSizes[size].token ?? 1,
                height: CONFIG.DND5E.actorSizes[size].token ?? 1,
                sight: {enabled: true},
                detectionModes: [{id: 'blindsight', range: 30, enabled: true}]
            },
            items: [attackData],
            effects: [{
                name: workflow.item.name,
                img: workflow.item.img,
                type: 'base',
                origin: workflow.item.uuid,
                system: {
                    changes: [
                        {key: 'system.attributes.prof', type: 'override', value: prof, phase: 'final', priority: 20}
                    ]
                }
            }]
        };
        const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
            name,
            duration: 60,
            sourceDocument: workflow.item,
            initiative: 'follows',
            updates
        });
        if (summon) summons.push(summon);
    }
    if (!summons.length) return exit();
    await summonUtils.placeSummons(summons, 30, {token: workflow.token});
}
export const animateObjects = {
    name: 'Animate Objects',
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
