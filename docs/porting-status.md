# v13 → V14/CAT Porting Status

Tracks the port of content from the `v13` branch into the CAT-based V14 architecture.
Porting is a per-feature rewrite against CAT's declarative macro API (see
`scripts/macros/all/classFeatures/barbarian/rage.mjs` as the reference implementation),
plus pack item JSON under `packData/`.

Legend: ✅ ported · 🚧 in progress · ⬜ not started · ➖ not applicable (no automation needed / superseded)

## Milestone 1 — Barbarian & Rogue (all subclasses, both rulesets)

### Barbarian (base class)

| Feature | 2014 | 2024 | Notes |
| --- | --- | --- | --- |
| Rage | ✅ `legacy` | ✅ `modern` | shared logic in `all/classFeatures/barbarian/rage.mjs` |
| Unarmored Defense | ✅ `all` | ✅ `all` | rules-agnostic |
| Danger Sense | ✅ `legacy` | ✅ `modern` | 2014 context dialog; 2024 auto-advantage with tuning configs |
| Reckless Attack | ➖ | ✅ `modern` | item-data only; V14 native duration expiry (turnStart) |
| Fast Movement | ➖ | ✅ `modern` | uses new `item` fn-macro type (needs CAT fix branch) |
| Feral Instinct | ➖ | ✅ `modern` | item-data only (initiativeAdv flag) |
| Instinctive Pounce | ⬜ | ⬜ | deferred: heavy Sequencer animation; rebuild on `generic/movementAnimation` + `animations/selectLocations` primitives |
| Brutal Strike / Improved Brutal Strike | ➖ | ⬜ | 2024 only; couples to upstream's WIP sneak-attack/cunning-strike architecture |
| Primal Knowledge | ➖ | ✅ `modern` | swaps skill ability while raging; tuning configs |
| Relentless Rage | ➖ | ✅ `modern` | save-DC escalation + rest reset; ditem mutation on targetDamageComplete |
| Persistent Rage | ✅ `legacy` | ✅ `modern` | 2014 metadata-only; 2024 1/LR activity restores Rage uses |
| Indomitable Might | ➖ | ✅ `modern` | needs CAT bonus-pass roll replacement (fix branch) |

### Barbarian subclasses

| Subclass | Features (v13) | 2014 | 2024 |
| --- | --- | --- | --- |
| Ancestral Guardian | ancestralProtectors, spiritShield, vengefulAncestors | ⬜ | ➖ |
| Beast | bestialSoul, callTheHunt, formOfTheBeast, infectiousFury | ⬜ | ➖ |
| Berserker | frenzy, intimidatingPresence, mindlessRage, retaliation | ⬜ | ⬜ |
| Giant | crushingThrow, demiurgicColossus, elementalCleaver, giantStature, mightyImpel | ⬜ | ➖ |
| Totem Warrior / Wild Heart | totemSpirit (2014); aspect/power/rageOfTheWilds (2024) | ⬜ | ⬜ |
| Wild Magic | bolsteringMagic, controlledSurge, unstableBacklash, wildSurge | ⬜ | ➖ |
| World Tree | batteringRoots, branchesOfTheTree, travelAlongTheTree, vitalityOfTheTree | ➖ | ⬜ |
| Zealot | divineFury, zealousPresence (+ fanaticalFocus, rageOfTheGods, warriorOfTheGods 2024) | ⬜ | ⬜ |
| Muscle Wizard (homebrew) | cantrips, spells, unarguableWizardry | ➖ | ⬜ |

### Rogue (base class)

| Feature | 2014 | 2024 | Notes |
| --- | --- | --- | --- |
| Sneak Attack | ⬜ | ✅ `modern` | 2014 variant still to port |
| Cunning Action | ⬜ | 🚧 `modern` | macro file exists but is empty (upstream WIP) |
| Cunning Strike / Improved Cunning Strike | ➖ | ⬜ | 2024 only |
| Devious Strikes | ➖ | ⬜ | 2024 only |
| Steady Aim | ➖ | ✅ `modern` | activity + move pass spends use on own-turn movement |
| Uncanny Dodge | ➖ | ✅ `modern` | item-data only (reaction activity + midi flag) |
| Evasion | ⬜ | ⬜ | check v13 (may be dnd5e-native) |
| Reliable Talent | ➖ | ✅ `modern` | item-data only (dnd5e reliableTalent flag) |
| Elusive | ➖ | ✅ `modern` | item-data only (grants.noAdvantage flag) |
| Slippery Mind | ➖ | ✅ `modern` | item-data only (wis/cha save proficiency) |
| Stroke of Luck | ➖ | ✅ `modern` | needs CAT bonus-pass roll replacement (fix branch) |

### Rogue subclasses

| Subclass | Features (v13) | 2014 | 2024 |
| --- | --- | --- | --- |
| Arcane Trickster | mageHandLegerdemain, magicalAmbush, spellThief, versatileTrickster | ⬜ | ⬜ |
| Assassin | assassinate, deathStrike, envenomWeapons, infiltrationExpertise | ⬜ | ⬜ |
| Inquisitive | eyeForWeakness, insightfulFighting | ⬜ | ➖ |
| Mastermind | insightfulManipulator, masterOfTactics, misdirection, soulOfDeceit | ⬜ | ➖ |
| Phantom | deathsFriend, ghostWalk, tokensOfTheDeparted, wailsFromTheGrave, whispersOfTheDead | ⬜ | ➖ |
| Soulknife | psionicEnergy/psionicPower, psychicBlades, rendMind, homingStrikes, soulBlades, psychicVeil | ⬜ | ⬜ |
| Swashbuckler | rakishAudacity | ⬜ | ➖ |
| Thief | fastHands, secondStoryWork, supremeSneak, useMagicDevice | ➖ | ⬜ |

## Remaining v13 categories (post-milestone backlog)

Counts from `upstream/v13` `scripts/macros/`:

| Category | 2014 files | 2024 files |
| --- | --- | --- |
| spells | ~large (biggest category) | ~large |
| classFeatures (other classes) | rest of 709 total | rest of 470 total |
| feats | ✱ | ✱ |
| items | ✱ | ✱ |
| monsterFeatures | ✱ | ✱ |
| raceFeatures | ✱ | ✱ |
| actions / mechanics / homebrew / piety | ✱ | ✱ |

✱ Counted per-directory when each category becomes the active milestone
(`git ls-tree -r upstream/v13 --name-only scripts/macros/<rules>/<category> | wc -l`).

## CAT dependency notes

The CAT dev checkout lives at `~/git/covens-automation-toolkit` (with `~/git/cat`
symlinked to it so the `jsconfig.json` `cat/*` path mapping resolves). Some ported
features require CAT fixes carried on its `fix/latent-bugs` branch (upstream PR
candidates):
- Fast Movement: `item` fn-macro type support (equipped/unequipped passes).
- Indomitable Might / Stroke of Luck: bonus passes must honor a returned
  replacement Roll; `rollUtils.replaceD20` helper.
- (Danger Sense's save `options`/`saveId` requirement was fixed upstream in
  CAT commit `cb3e2d3`, which also delivers `checkId`/`saveId`/`skillId` and
  `options` to roll-event macros.)

## V13 → V14 data conversion rules (learned during porting)

- Effects use the **V14 ActiveEffect v2 schema**: changes live under `system.changes`
  as `{key, type, value, phase, priority}`. Mode mapping: 0→`custom`, 1→`multiply`,
  2→`add`, 3→`downgrade`, 4→`upgrade`, 5→`override`. Phase: `initial` for `flags.*`
  changes, `final` for `system.*` changes. Boolean-ish `"1"` values become `true`.
- Turn-based expiry is core now: `duration: {value: 1, units: 'rounds', expiry: 'turnStart'}`
  replaces DAE `turnStartSource`. DAE flags block is still kept (defaults) and DAE
  specialDurations like `1Reaction` still work.
- `flags.chris-premades.info.identifier` → `flags.cat.identifier` (effects) and
  `flags.cat.automation.version` (items). Macro references live in
  `flags.cat.macros.<type>: [{source, rules, identifier}]` on items/activities/effects.
- Trigger pass names are prefixed by scope: an item macro on the actor fires with
  `actor` prefix (`actorContext`, `actorEquipped`); activity-attached macros with
  `activity` prefix (`activityRollFinished`).
- Macros receive the trigger object: `{document, actor, token, item, config, dialog,
  message, roll, options?, ...}` — check the relevant CAT event's `appendData`.
- Generate items with the scratchpad generator pattern (copy Rage exemplar's activity
  and effect blocks; see git history for gen-items scripts).

## Porting checklist (per feature)

1. Read the v13 implementation: `git show upstream/v13:scripts/macros/<rules>/<path>.js`
2. Rewrite as a CAT macro descriptor in `scripts/macros/{all|legacy|modern|generic}/...`
   (`{name, version, rules, <pass hooks>, config, scales, notes}`); prefer a shared
   `all` implementation when 2014/2024 behavior matches.
3. Export via the barrel files (`scripts/macros.mjs`, `scripts/macros/animations.mjs`).
4. Add/refresh pack item JSON in `packData/<pack>/` and rebuild (`npm run buildCompendiums`).
5. V14 rules: areas of effect via CAT `regionUtils`/`Crosshairs` (no MeasuredTemplates),
   ActiveEffect changes use string `type`, i18n via `localize` only.
6. Verify: eslint clean, contract check resolves all proxied members, in-game smoke test.
