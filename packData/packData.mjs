import {compilePack, extractPack} from '@foundryvtt/foundryvtt-cli';
let packs = [
    'cpr-3rd-party-class-features',
    'cpr-3rd-party-class-features-2024',
    'cpr-3rd-party-feats-2024',
    'cpr-3rd-party-items',
    'cpr-3rd-party-spells',
    'cpr-3rd-party-spells-2024',
    'cpr-actions',
    'cpr-actions-2024',
    'cpr-class-feature-items',
    'cpr-class-features-all',
    'cpr-class-features-2014',
    'cpr-class-features-2024',
    'cpr-feats',
    'cpr-feats-2024',
    'cpr-item-features',
    'cpr-items',
    'cpr-monster-features',
    'cpr-monster-features-2024',
    'cpr-other-features',
    'cpr-race-features',
    'cpr-species-features-2024',
    'cpr-spell-features',
    'cpr-spells',
    'cpr-spells-2024',
    'cpr-summon-features',
    'cpr-summon-features-2024',
    'cpr-summons',
    'cpr-summons-2024'
];
for (let i of packs) {
    await compilePack('./packData/' + i, './packs/' + i, {log: true});
}
