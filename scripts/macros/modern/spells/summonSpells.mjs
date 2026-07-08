import {activityUtils, automationUtils, documentUtils, effectUtils, summonUtils} from '../../../proxy.mjs';
import {getCastLevel} from '../../lib/spellUtils.mjs';
import {addThrallBonuses} from '../classFeatures/warlock/createThrall.mjs';
export async function getPackEntry(packId, name) {
    const pack = game.packs.get(packId);
    if (!pack) return;
    const index = await pack.getIndex();
    return index.find(entry => entry.name === name);
}
export function getCRFromProf(prof) {
    return Math.max(1, prof >= 6 ? (prof - 2) * 4 : (prof - 1) * 4 - 3);
}
export async function summonSpirit(workflow, {sourceActorName, name, hpFormula, acFlat, items, updates = {}, range = 90, concentration = true, extraUpdatesTransform}) {
    const concentrationEffect = concentration ? effectUtils.getConcentrationEffect(workflow.actor, workflow.item) : undefined;
    const abort = async () => {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
    };
    const sourceEntry = await getPackEntry('chris-premades.CPRSummons2024', sourceActorName);
    if (!sourceEntry) return abort();
    const sourceActor = await fromUuid(sourceEntry.uuid);
    if (!sourceActor || !workflow.token) return abort();
    let summonUpdates = foundry.utils.mergeObject({
        name,
        system: {
            details: {cr: getCRFromProf(workflow.actor.system.attributes.prof)},
            attributes: {
                hp: {formula: String(hpFormula), max: hpFormula, value: hpFormula},
                ...(acFlat ? {ac: {flat: acFlat}} : {})
            }
        },
        prototypeToken: {name, disposition: workflow.token.document.disposition},
        items: []
    }, updates);
    if (workflow.workflowOptions?.['chris-premades']?.createThrall) {
        const wrapped = {actor: summonUpdates};
        addThrallBonuses(wrapped, workflow);
        summonUpdates = wrapped.actor;
    }
    if (extraUpdatesTransform) summonUpdates = extraUpdatesTransform(summonUpdates) ?? summonUpdates;
    const existing = summonUtils.getSummonBySource(workflow.item);
    if (existing?.length) for (const summonToken of existing) await summonUtils.deleteSummon(summonToken.actor ?? summonToken);
    const duration = activityUtils.getEffectDuration(workflow.activity)?.seconds || 3600;
    const summon = await summonUtils.createSummon(workflow.actor, sourceActor, {
        name,
        duration,
        sourceDocument: workflow.item,
        initiative: 'follows',
        items,
        updates: summonUpdates
    });
    if (!summon) return abort();
    await summonUtils.placeSummon(summon, range, {token: workflow.token});
    return summon;
}
export async function applyDamageBonus(summon, itemName, {damageBonus, types} = {}) {
    const item = summon.items.find(i => i.name === itemName);
    if (!item) return;
    const itemUpdates = {};
    for (const activity of item.system.activities) {
        if (!activity.damage?.parts?.length) continue;
        const parts = activity.toObject().damage.parts;
        if (damageBonus) parts.forEach(part => part.bonus = String(part.bonus?.length ? part.bonus + ' + ' + damageBonus : damageBonus));
        if (types) parts.forEach(part => part.types = types);
        itemUpdates['system.activities.' + activity.id + '.damage.parts'] = parts;
    }
    if (Object.keys(itemUpdates).length) await documentUtils.update(item, itemUpdates);
}
async function aberrationUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-aberration-beholderkin': 'beholderkin',
        'summon-aberration-slaad': 'slaad',
        'summon-aberration-mind-flayer': 'mindFlayer'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 4;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Aberrant Spirit)');
    if (!multiattack) return;
    const items = [{uuid: multiattack.uuid}];
    const extraNames = [];
    if (creatureType === 'beholderkin') {
        const eyeRay = await getPackEntry(featuresPack, 'Eye Ray (Beholderkin Only)');
        if (eyeRay) items.push({uuid: eyeRay.uuid, matchAttack: true});
        extraNames.push('Eye Ray (Beholderkin Only)');
    } else if (creatureType === 'slaad') {
        const claws = await getPackEntry(featuresPack, 'Claws (Slaad Only)');
        const regeneration = await getPackEntry(featuresPack, 'Regeneration (Slaad Only)');
        if (claws) items.push({uuid: claws.uuid, matchAttack: true});
        if (regeneration) items.push({uuid: regeneration.uuid});
        extraNames.push('Claws (Slaad Only)');
    } else {
        const psychicSlam = await getPackEntry(featuresPack, 'Psychic Slam (Mind Flayer Only)');
        const whisperingAura = await getPackEntry(featuresPack, 'Whispering Aura (Mind Flayer Only)');
        if (psychicSlam) items.push({uuid: psychicSlam.uuid, matchAttack: true});
        if (whisperingAura) items.push({uuid: whisperingAura.uuid, matchDC: true});
        extraNames.push('Psychic Slam (Mind Flayer Only)');
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.AberrantSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const hpFormula = 40 + (spellLevel - 4) * 10;
    const updates = {};
    if (creatureType === 'beholderkin') foundry.utils.setProperty(updates, 'system.attributes.movement', {fly: 30, hover: true});
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Aberrant Spirit',
        name,
        hpFormula,
        acFlat: 11 + spellLevel,
        items,
        updates
    });
    if (!summon) return;
    for (const itemName of extraNames) {
        await applyDamageBonus(summon, itemName, {damageBonus: spellLevel});
    }
}
export const summonAberration = {
    name: 'Summon Aberration',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: aberrationUse,
            priority: 50
        }
    ],
    config: {
        beholderkinName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        slaadName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        mindFlayerName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function feyUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-fey-fuming': 'fuming',
        'summon-fey-mirthful': 'mirthful',
        'summon-fey-tricksy': 'tricksy'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 3;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Fey Spirit)');
    const feyBlade = await getPackEntry(featuresPack, 'Fey Blade (Fey Spirit)');
    const feyStep = await getPackEntry(featuresPack, 'Fey Step (Fey Spirit)');
    const moodName = creatureType.charAt(0).toUpperCase() + creatureType.slice(1);
    const mood = await getPackEntry(featuresPack, moodName);
    if (!multiattack || !feyBlade || !feyStep || !mood) return;
    const items = [
        {uuid: multiattack.uuid},
        {uuid: feyBlade.uuid, matchAttack: true},
        {uuid: feyStep.uuid},
        {uuid: mood.uuid, matchDC: creatureType === 'mirthful'}
    ];
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.FeySpirit' + moodName);
    const hpFormula = 30 + (spellLevel - 3) * 10;
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Fey Spirit',
        name,
        hpFormula,
        acFlat: 12 + spellLevel,
        items
    });
    if (!summon) return;
    await applyDamageBonus(summon, 'Fey Blade (Fey Spirit)', {damageBonus: spellLevel});
}
export const summonFey = {
    name: 'Summon Fey',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: feyUse,
            priority: 50
        }
    ],
    config: {
        fumingName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        mirthfulName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        tricksyName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function beastUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-beast-air': 'air',
        'summon-beast-land': 'land',
        'summon-beast-water': 'water'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 2;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Bestial Spirit)');
    const rend = await getPackEntry(featuresPack, 'Rend (Bestial Spirit)');
    if (!multiattack || !rend) return;
    const items = [
        {uuid: multiattack.uuid},
        {uuid: rend.uuid, matchAttack: true}
    ];
    let hpFormula = 20;
    const movement = {walk: 30};
    if (creatureType === 'air') {
        const flyby = await getPackEntry(featuresPack, 'Flyby (Air Only)');
        if (flyby) items.push({uuid: flyby.uuid});
        movement.fly = 60;
    } else {
        const packTactics = await getPackEntry(featuresPack, 'Pack Tactics (Land and Water Only)');
        if (packTactics) items.push({uuid: packTactics.uuid});
        hpFormula += 10;
        if (creatureType === 'land') {
            movement.climb = 30;
        } else {
            movement.swim = 30;
            const waterBreathing = await getPackEntry(featuresPack, 'Water Breathing (Water Only)');
            if (waterBreathing) items.push({uuid: waterBreathing.uuid});
        }
    }
    hpFormula += (spellLevel - 2) * 5;
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.BestialSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Bestial Spirit',
        name,
        hpFormula,
        acFlat: 11 + spellLevel,
        items,
        updates: {system: {attributes: {movement}}}
    });
    if (!summon) return;
    await applyDamageBonus(summon, 'Rend (Bestial Spirit)', {damageBonus: spellLevel});
}
export const summonBeast = {
    name: 'Summon Beast',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: beastUse,
            priority: 50
        }
    ],
    config: {
        airName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        landName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        waterName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function undeadUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-undead-ghostly': 'ghostly',
        'summon-undead-putrid': 'putrid',
        'summon-undead-skeletal': 'skeletal'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 3;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Undead Spirit)');
    if (!multiattack) return;
    const items = [{uuid: multiattack.uuid}];
    const bonusNames = [];
    let hpFormula = (spellLevel - 3) * 10;
    const updates = {};
    if (creatureType === 'ghostly') {
        hpFormula += 30;
        const incorporeal = await getPackEntry(featuresPack, 'Incorporeal Passage (Ghostly Only)');
        const deathlyTouch = await getPackEntry(featuresPack, 'Deathly Touch (Ghostly Only)');
        if (incorporeal) items.push({uuid: incorporeal.uuid});
        if (deathlyTouch) items.push({uuid: deathlyTouch.uuid, matchAttack: true});
        bonusNames.push('Deathly Touch (Ghostly Only)');
        foundry.utils.setProperty(updates, 'system.attributes.movement', {fly: 40, hover: true});
    } else if (creatureType === 'skeletal') {
        hpFormula += 20;
        const graveBolt = await getPackEntry(featuresPack, 'Grave Bolt (Skeletal Only)');
        if (graveBolt) items.push({uuid: graveBolt.uuid, matchAttack: true});
        bonusNames.push('Grave Bolt (Skeletal Only)');
    } else {
        hpFormula += 30;
        const festeringAura = await getPackEntry(featuresPack, 'Festering Aura (Putrid Only)');
        const rottingClaw = await getPackEntry(featuresPack, 'Rotting Claw (Putrid Only)');
        const paralyze = await getPackEntry(featuresPack, 'Rotting Claw (Putrid Only): Paralyze');
        if (festeringAura) items.push({uuid: festeringAura.uuid, matchDC: true});
        if (rottingClaw) items.push({uuid: rottingClaw.uuid, matchAttack: true});
        if (paralyze) items.push({uuid: paralyze.uuid});
        bonusNames.push('Rotting Claw (Putrid Only)');
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.UndeadSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Undead Spirit',
        name,
        hpFormula,
        acFlat: 11 + spellLevel,
        items,
        updates
    });
    if (!summon) return;
    for (const itemName of bonusNames) {
        await applyDamageBonus(summon, itemName, {damageBonus: spellLevel});
    }
}
export const summonUndead = {
    name: 'Summon Undead',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: undeadUse,
            priority: 50
        }
    ],
    config: {
        ghostlyName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        putridName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        skeletalName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
