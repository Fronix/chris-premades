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

## Milestone 2 — Paladin (2024) — complete (Nature's Wrath blocked on upstream)

| Item | Status | Notes |
| --- | --- | --- |
| Lay On Hands | ✅ | `activityRollFinished` on the `poison` activity cures the poisoned condition |
| Channel Divinity (Paladin) | ✅ | data-only (v13 macro was config/ddbi metadata only) |
| Paladin's Smite | ✅ | data-only |
| Aura of Protection | ✅ | new work — CAT `aura`/`update` pass, save bonus baked from source CHA (min 1), configurable radius |
| Aura of Courage | ✅ | new work — CAT aura pass, frightened immunity, configurable radius |
| Bless | ✅ | upcast target selection + effect application with concentration dependency |
| Heroism | ✅ | per-target effect with baked spell mod; `turnStart` temp HP via effect combat macro |
| Aid | ✅ | `activityDamageRollComplete` temp max HP by cast level |
| Crusader's Mantle | ✅ | caster source effect + runtime-bound aura macro (30 ft, allies, 1d4 radiant) |
| Shield of Faith | ✅ | data-only (converted in Phase 1 batch) |
| Nature's Wrath (Ancients) | ⬜ | v13 2024 macro file is empty (upstream WIP) |
| Divine Smite (smite hub) | ✅ | on melee hit: pick a castable smite spell, cast it at the target, add config-driven bonus damage (actor passes, `unique`-deduped) |
| Searing Smite | ✅ | OverTime burn effect (con save ends, start of turn) |
| Thunderous Smite | ✅ | failed saves pushed via CAT `tokenUtils.slideToken` |
| Wrathful Smite | ✅ | frightened + save-to-end OverTime |
| Blinding Smite | ✅ | blinded + save-to-end OverTime, configurable ability |
| Staggering Smite | ✅ | hub binding + item effect data |
| Banishing Smite | ✅ | tracker effect at damage; banish activity fires at ≤ configured HP |
| Compelled Duel | ✅ | source/target effects; disadvantage vs others, break on attack/attacked/turn-end distance (v13 willing-move teleport-back not ported) |
| Command | ✅ | upcast +1 target; per-command turn-start reminder, Grovel applies prone |
| Protection from Evil and Good | ✅ | save-context advantage on the applied effect |
| Aura of Vitality | ✅ | caster effect + turn-start ally heal via healing activity |

Runtime caveats to verify at the table: upcast target selection reads `workflow.castData.castLevel`
(midi-qol), aura value staleness is resolved on the next aura update after a CHA change.

## Milestone 3 — Fighter (2024) — complete

| Item | Status | Notes |
| --- | --- | --- |
| Second Wind | ✅ | scale + Banneret Group Recovery follow-up prompt |
| Tactical Mind | ✅ | bonus/post passes on checks/skills/tools; 1d10 + fighter level, refund on failure |
| Studied Attacks | ✅ | on miss: advantage-vs-attacker effect stamped on the target |
| Heroic Warrior | ✅ | use grants Heroic Inspiration; turn-start auto-use while uninspired |
| Group Recovery (Banneret) | ✅ | target cap = CHA mod; subclass scale (30/60 ft) |
| Knightly Envoy (Banneret) | ✅ | language picker writing into the item effect |
| Fighting Spirit / Great Stature / Runic Juggernaut | ✅ | data-only (Phase 1 batch) |
| Battle Master maneuvers / Rune Knight runes | ⬜ | v13 only shipped 2014 versions — ported with the legacy pass |

## Roadmap: class-by-class, 2024 first

The full v13 catalog (1,586 pack items; ~1,100 need macro rewrites, the rest were
data-only and have been batch-converted by `tools/convertV13.mjs`) is tracked
item-by-item in **[porting-inventory.md](porting-inventory.md)** (auto-generated —
regenerate rather than hand-editing its tables).

Working order (per user priority; each slice = features + subclasses + that class's
staple spells, committed and releasable on its own):

1. ~~Paladin~~ ✅
2. ~~Fighter~~ ✅
3. **Cleric** ← current slice
4. Monk
5. Druid
6. Wizard
7. Sorcerer
8. Warlock
9. Bard
10. Ranger
11. Barbarian + Rogue subclass completion
12. Artificer / 3rd-party
13. Remaining categories: spell long tail, feats, species features, actions,
    magic items, monster features, misc; then 2014 variants

**Per-slice process**: list the class's ⬜ rows in porting-inventory.md → convert
pack items (`node tools/convertV13.mjs --src <v13 pack> --out packData/<pack> --only "<names>" --force`)
→ hand-port each listed macro to a CAT descriptor in `scripts/macros/modern/...` →
export via barrels → verify (eslint, contract check, buildCompendiums, build) →
regenerate inventory → commit.

v13 macros bind by explicit `flags.chris-premades.macros` **and** implicitly via
`info.identifier` matching a registered macro export. `tools/v13-behavior-identifiers.json`
lists every v13 export with behavior triggers; the converter and inventory generator
both consult it, so "data-only" is trustworthy.

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
