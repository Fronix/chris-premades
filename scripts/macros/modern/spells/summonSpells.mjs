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
async function celestialUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-celestial-avenger': 'avenger',
        'summon-celestial-defender': 'defender'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 5;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Celestial Spirit)');
    const healingTouch = await getPackEntry(featuresPack, 'Healing Touch (Celestial Spirit)');
    if (!multiattack || !healingTouch) return;
    const items = [{uuid: multiattack.uuid}, {uuid: healingTouch.uuid}];
    const bonusNames = ['Healing Touch (Celestial Spirit)'];
    if (creatureType === 'avenger') {
        const radiantBow = await getPackEntry(featuresPack, 'Radiant Bow (Avenger Only)');
        if (radiantBow) items.push({uuid: radiantBow.uuid, matchAttack: true});
        bonusNames.push('Radiant Bow (Avenger Only)');
    } else {
        const radiantMace = await getPackEntry(featuresPack, 'Radiant Mace (Defender Only)');
        if (radiantMace) items.push({uuid: radiantMace.uuid, matchAttack: true});
        bonusNames.push('Radiant Mace (Defender Only)');
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.CelestialSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const hpFormula = 40 + (spellLevel - 5) * 10;
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Celestial Spirit',
        name,
        hpFormula,
        acFlat: 11 + spellLevel + (creatureType === 'defender' ? 2 : 0),
        items
    });
    if (!summon) return;
    for (const itemName of bonusNames) {
        await applyDamageBonus(summon, itemName, {damageBonus: spellLevel});
    }
}
export const summonCelestial = {
    name: 'Summon Celestial',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: celestialUse,
            priority: 50
        }
    ],
    config: {
        avengerName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        defenderName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function constructUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-construct-clay': 'clay',
        'summon-construct-metal': 'metal',
        'summon-construct-stone': 'stone'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 4;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Construct Spirit)');
    const slam = await getPackEntry(featuresPack, 'Slam (Construct Spirit)');
    if (!multiattack || !slam) return;
    const items = [{uuid: multiattack.uuid}, {uuid: slam.uuid, matchAttack: true}];
    if (creatureType === 'clay') {
        const berserk = await getPackEntry(featuresPack, 'Berserk Lashing (Clay Only)');
        if (berserk) items.push({uuid: berserk.uuid});
    } else if (creatureType === 'metal') {
        const heatedBody = await getPackEntry(featuresPack, 'Heated Body (Metal Only)');
        if (heatedBody) items.push({uuid: heatedBody.uuid});
    } else {
        const lethargy = await getPackEntry(featuresPack, 'Stone Lethargy (Stone Only)');
        if (lethargy) items.push({uuid: lethargy.uuid, matchDC: true});
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.ConstructSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const hpFormula = 40 + (spellLevel - 4) * 15;
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Construct Spirit',
        name,
        hpFormula,
        acFlat: 13 + spellLevel,
        items
    });
    if (!summon) return;
    await applyDamageBonus(summon, 'Slam (Construct Spirit)', {damageBonus: spellLevel});
}
export const summonConstruct = {
    name: 'Summon Construct',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: constructUse,
            priority: 50
        }
    ],
    config: {
        clayName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        metalName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        stoneName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function dragonUse({workflow}) {
    if (documentUtils.getIdentifier(workflow.activity)?.startsWith('summon-dragon') !== true) return;
    const spellLevel = getCastLevel(workflow) ?? 5;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Draconic Spirit)');
    const rend = await getPackEntry(featuresPack, 'Rend (Draconic Spirit)');
    const breathWeapon = await getPackEntry(featuresPack, 'Breath Weapon');
    const sharedResistances = await getPackEntry(featuresPack, 'Shared Resistances');
    if (!multiattack || !rend || !breathWeapon) return;
    const items = [
        {uuid: multiattack.uuid},
        {uuid: rend.uuid, matchAttack: true},
        {uuid: breathWeapon.uuid, matchDC: true}
    ];
    if (sharedResistances) items.push({uuid: sharedResistances.uuid});
    let name = automationUtils.getConfigValue(workflow.item, 'name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.DraconicSpirit');
    const hpFormula = 50 + (spellLevel - 5) * 10;
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Draconic Spirit',
        name,
        hpFormula,
        acFlat: 14 + spellLevel,
        items
    });
    if (!summon) return;
    await applyDamageBonus(summon, 'Rend (Draconic Spirit)', {damageBonus: spellLevel});
}
export const summonDragon = {
    name: 'Summon Dragon',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: dragonUse,
            priority: 50
        }
    ],
    config: {
        name: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
async function elementalUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-elemental-air': 'air',
        'summon-elemental-earth': 'earth',
        'summon-elemental-fire': 'fire',
        'summon-elemental-water': 'water'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 4;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Elemental Spirit)');
    const slam = await getPackEntry(featuresPack, 'Slam (Elemental Spirit)');
    if (!multiattack || !slam) return;
    const items = [{uuid: multiattack.uuid}, {uuid: slam.uuid, matchAttack: true}];
    const updates = {};
    if (creatureType === 'earth') {
        foundry.utils.setProperty(updates, 'system.attributes.movement.burrow', 40);
    } else {
        const amorphous = await getPackEntry(featuresPack, 'Amorphous Form (Air, Fire, and Water Only)');
        if (amorphous) items.push({uuid: amorphous.uuid});
        if (creatureType === 'air') foundry.utils.setProperty(updates, 'system.attributes.movement', {fly: 40, hover: true});
        if (creatureType === 'water') foundry.utils.setProperty(updates, 'system.attributes.movement.swim', 40);
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.ElementalSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const hpFormula = 50 + (spellLevel - 4) * 10;
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Elemental Spirit',
        name,
        hpFormula,
        acFlat: 11 + spellLevel,
        items,
        updates
    });
    if (!summon) return;
    await applyDamageBonus(summon, 'Slam (Elemental Spirit)', {damageBonus: spellLevel});
}
export const summonElemental = {
    name: 'Summon Elemental',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: elementalUse,
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
        earthName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        fireName: {
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
async function fiendUse({workflow}) {
    const activityIdentifier = documentUtils.getIdentifier(workflow.activity);
    const creatureType = {
        'summon-fiend-demon': 'demon',
        'summon-fiend-devil': 'devil',
        'summon-fiend-yugoloth': 'yugoloth'
    }[activityIdentifier];
    if (!creatureType) return;
    const spellLevel = getCastLevel(workflow) ?? 6;
    const featuresPack = 'chris-premades.CPRSummonFeatures2024';
    const multiattack = await getPackEntry(featuresPack, 'Multiattack (Fiendish Spirit)');
    const magicResistance = await getPackEntry(featuresPack, 'Magic Resistance (Fiendish Spirit)');
    if (!multiattack) return;
    const items = [{uuid: multiattack.uuid}];
    if (magicResistance) items.push({uuid: magicResistance.uuid});
    let hpFormula = (spellLevel - 6) * 15;
    const updates = {};
    const bonusNames = [];
    if (creatureType === 'demon') {
        hpFormula += 50;
        const deathThroes = await getPackEntry(featuresPack, 'Death Throes (Demon Only)');
        const bite = await getPackEntry(featuresPack, 'Bite (Demon Only)');
        if (deathThroes) items.push({uuid: deathThroes.uuid, matchDC: true});
        if (bite) items.push({uuid: bite.uuid, matchAttack: true});
        bonusNames.push('Death Throes (Demon Only)', 'Bite (Demon Only)');
        foundry.utils.setProperty(updates, 'system.attributes.movement.climb', 40);
    } else if (creatureType === 'devil') {
        hpFormula += 40;
        const fieryStrike = await getPackEntry(featuresPack, 'Fiery Strike (Devil Only)');
        const devilsSight = await getPackEntry(featuresPack, 'Devil\'s Sight (Devil Only)');
        if (fieryStrike) items.push({uuid: fieryStrike.uuid, matchAttack: true});
        if (devilsSight) items.push({uuid: devilsSight.uuid});
        bonusNames.push('Fiery Strike (Devil Only)');
        foundry.utils.setProperty(updates, 'system.attributes.movement.fly', 60);
    } else {
        hpFormula += 60;
        const claws = await getPackEntry(featuresPack, 'Claws (Yugoloth Only)');
        if (claws) items.push({uuid: claws.uuid, matchAttack: true});
        bonusNames.push('Claws (Yugoloth Only)');
    }
    let name = automationUtils.getConfigValue(workflow.item, creatureType + 'Name');
    if (!name?.length) name = _loc('CHRISPREMADES.Summons.CreatureNames.FiendishSpirit' + creatureType.charAt(0).toUpperCase() + creatureType.slice(1));
    const summon = await summonSpirit(workflow, {
        sourceActorName: 'CPR - Fiendish Spirit',
        name,
        hpFormula,
        acFlat: 12 + spellLevel,
        items,
        updates
    });
    if (!summon) return;
    for (const itemName of bonusNames) {
        await applyDamageBonus(summon, itemName, {damageBonus: spellLevel});
    }
}
export const summonFiend = {
    name: 'Summon Fiend',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: fiendUse,
            priority: 50
        }
    ],
    config: {
        demonName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        devilName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        },
        yugolothName: {
            default: '',
            type: 'text',
            label: 'CHRISPREMADES.Summons.CustomName',
            category: 'visuals'
        }
    }
};
