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
| Cunning Action | ⬜ | 🚧 `modern` | macro file exists but is empty in the v13 source (nothing to port) |
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

## Milestone 2 — Paladin (2024) — complete (Nature's Wrath has no v13 source)

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
| Nature's Wrath (Ancients) | ⬜ | v13 2024 macro file is empty (no source to port) |
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

## Milestone 4 — Cleric (2024) — in progress

Ported: Divine Intervention (+ Greater, with Wish rest-block), Blessed Strikes (Divine
Strike / Potent Spellcasting), Improved Blessed Strikes, Disciple of Life, Blessed
Healer, Preserve Life, Guided Strike (own + allied attacks via nearby pass), War
Priest, Warding Flare (+ Improved), Radiance of the Dawn (save disadvantage vs Corona;
magical-darkness template dispel deferred to region work), Corona of Light, Blessing of
the Trickster. Data-only: Avatar of Battle, Divine Order: Thaumaturge, Sear Undead.

Also ported: Channel Divinity (Cleric) with Divine Spark/Turn Undead + scale,
Guidance, Bane, Toll the Dead, Death Ward, Beacon of Hope, Sanctuary.

Also ported (summons batch): Guardian of Faith, Spiritual Weapon, Spirit
Guardians (approximated own-move sweep as end-position proximity; JB2A pickers
dropped for now). Still deferred: War God's Blessing, Invoke Duplicity,
Improved Duplicity, Trickster's Transposition.

## Milestone 5 — Monk (2024) — core complete

Ported: Monk's Focus (Flurry chains + Patient Defense heal via Heightened Focus),
Martial Arts (die upgrade + best-ability swap, grapple/shove DC), Stunning Strike,
Deflect Attacks (reduce + redirect), Empowered Strikes, Self-Restoration, Slow Fall,
Disciplined Survivor, Perfect Focus, Superior Defense, Uncanny Metabolism,
Unarmored Defense (Monk), Unarmored Movement, Heightened Focus (config).
Data-only: Deflect Energy, Stride of the Elements. Deferred: Warrior of the
Elements subclass (Elemental Attunement/Burst/Epitome — 571 lines, subclass sweep),
Step of the Wind animation flow (native activities work; animation pass later).

## Milestone 6 — Druid (2024) — complete (Nature's Sanctuary on regions batch)

Ported: Wild Shape (transform activity + equipment merge/wear, Beast Spells,
Improved Circle Forms radiant + con save, Lunar Form bonus damage, revert item
and auto-revert at 0 HP), Elemental Fury (both), Circle Forms, Lunar Form,
Archdruid, Wild Companion, Wild Resurgence, Moonlight Step, Circle of the Land
Spells, Cosmic Omen, Land's Aid, Wrath of the Sea (+ CPR Feature Items (2024)
support pack), Starry Form (+ Twinkling swap, Chalice heals). Nature's
Sanctuary deferred to regions batch. Milestone complete otherwise.

## Milestone 7 — Wizard (2024) — complete

Ported: Arcane Recovery (slot-by-slot recovery picker honoring Arcane Grimoire
bonuses), Memorize Spell (prepare/unprepare swap). The wizard's table impact
lives in the spell long tail, which accumulates through every class slice.

## Milestone 8 — Sorcerer — no 2024 content in v13

v13 never shipped 2024 Sorcerer items (no Sorcerer folder in the 2024 pack);
its Sorcerer content is all 2014-rules (Metamagic set, Shadow Magic, Aberrant
Mind, Storm Sorcery). Started the legacy Metamagic sub-slice early since it is
high table value: Careful Spell and Distant Spell ported (2014 rules);
remaining metamagics (Empowered, Extended, Heightened, Quickened, Seeking,
Subtle, Transmuted, Twinned) queue with the legacy pass. Sorcery Points and
Favored by the Gods were data-only conversions.

## Milestone 9 — Warlock (2024) — complete

Ported: Pact of the Blade (bond enchantment + conjure with best-ability attack
and damage-type swap), Pact of the Chain (familiar reaction attack via CAT
summons), Agonizing Blast (cantrip picker + bonus), Gift of the Protectors
(death-prevention gift), Thought Shield (psychic reflection), Awakened Mind /
Clairvoyant Combatant, Psychic Spells, Steps of the Fey, Create Thrall
(non-concentration Summon Aberration + thrall hex bonus, addThrallBonuses
exported for the Summon Aberration spell port), Magical Cunning and One with
Shadows metadata. Data-only: Devil's Sight, Fiendish Vigor, Eldritch Hex,
Sorcery-free invocations.

## Milestone 10 — Bard (2024) — complete

Ported: Bardic Inspiration (+effect prompts on failed rolls/missed attacks,
Combat Inspiration merge, Dazzling Footwork chain), Font of Inspiration,
Superior Inspiration, Jack of All Trades, Words of Creation (no v13 pack item —
medkit-only), Countercharm (self + ally reroll reactions), Cutting Words,
Peerless Skill, Dazzling Footwork, Leading Evasion, Inspiring Movement, Tandem
Footwork, Beguiling Magic, Mantle of Inspiration, Mantle of Majesty (+Command
grant), Unbreakable Majesty (attacker save-or-abort).

## Milestone 11 — Ranger (2024) — complete (core + Gloom Stalker + Beast Master)

Ported: Tireless, Relentless Hunter, Foe Slayer, Favored Enemy (scale), Dread
Ambusher, Stalker's Flurry (identifier normalized from v13 typo), Shadowy
Dodge, Share Spells, Primal Companion (CAT summon: per-form stats/HP/AC/CR,
Exceptional Training bonus actions + force type, damage-type picker, Bestial
Fury strike rider via Hunter's Mark flags, command unhide), plus metadata for
Nature's Veil, Precise Hunter, Exceptional Training, Otherworldly Glamour.
Deferred to legacy pass: Beguiling Twist, Dreadful Strikes, Umbral Sight
(legacy re-exports); Fey Reinforcements / Misty Wanderer are data-only links.

## Milestone 12 — Barbarian & Rogue subclass completion — complete

Barbarian: Brutal Strike (+Sundering Blow), Unarmored Defense, rage effect
builder with subclass riders (Mindless Rage, Rage/Power of the Wilds choices,
Vitality of the Tree, Instinctive Pounce, Rage of the Gods), Frenzy, Divine
Fury, Fanatical Focus, Warrior of the Gods scale, World Tree quartet
(Vitality/Life-Giving Force, Branches, Travel, Battering Roots with inline
push/topple masteries), Rage of the Gods protection. Deferred: Muscle Wizard
(3rd party).
Rogue: Cunning Action metadata, Cunning Strike (trip + Versatile Trickster),
Magical Ambush, Spell Thief, Envenom Weapons (+ongoing poison), Soulknife
complete (Psionic Power, Psychic Blades, Soul Blades, Psychic Veil, Rend
Mind).

## Milestone 13 — 2024 spell long tail — in progress

Ported so far: Hex (+attack), Hunter's Mark (+source), Eldritch Blast, Misty
Step, Shield, Armor of Agathys, Arcane Vigor, Blindness/Deafness, Charm
Monster/Person, Blur, Banishment, Chromatic Orb, Chill Touch/Burning Hands,
Blink, Blight, Calm Emotions, Dragon's Breath, Arms of Hadar, Animal
Friendship/Messenger, Aura of Life/Purity (CAT aura pattern), Alter Self,
Antilife Shell (move passes), Circle of Power, Chain Lightning, Bestow Curse,
Death Armor, Destructive Wave, Power Word Kill/Heal, Shining Smite config,
True Strike, Shocking Grasp, Warding Bond, Resistance, Thorn Whip, Synaptic
Static, Thunderwave, Vampiric Touch, Scorching Ray, and the COMPLETE Summon X
family (Aberration/Beast/Celestial/Construct/Dragon/Elemental/Fey/Fiend/
Undead via the shared summonSpirit helper, with Create Thrall integration).
Deferred: region/template spells (Darkness, Cloudkill, Sleet Storm, Spike
Growth, Wall of Fire, Zone of Truth), Teleport, Time Stop, Wish, Steel Wind
Strike, Vitriolic Sphere, Animate Dead/Objects, plus legacy re-reads.

## Milestone 14 — Feats (2024) — core complete

Ported: Alert (initiative swap), Archery, Defense, Dueling, Great Weapon
Fighting (min3), Thrown Weapon Fighting, Interception, Grappler, Savage
Attacker, Tavern Brawler (+Str/Con pack variants), Healer (Battle Medic hit-die
heal + reroll 1s), Protection. Metadata: Heavy Armor Master, Sharpshooter,
Speedy. Deferred: legacy re-exports (Crusher, Piercer, Slasher, Telekinetic,
Unarmed Fighting, Elemental Adept — legacy pass) and 3rd-party feats (Fate
Gambler, Purple Dragon Rook, Sangromantic Initiate, Spellfire Spark, the
"I Survived" trio).

## Milestone 15 — Species features & Actions (2024) — core complete

Species: Aasimar Celestial Revelation (all three forms + damage riders),
Celestial Resistance, Healing Hands; Orc Relentless Endurance deferred to
legacy pass. Actions: Attack, Knock Out, Hide (+Supreme Sneak cover check),
plus data-driven registrations for Dash/Disengage/Dodge/Fall/Help/Ready/
Search/Squeeze/Stabilize/Study/Utilize. Deferred: dash/disengage animation
flows, Circle Cast, Mount, Suffocation, Jump, Underwater, Influence.

## Milestone 16 — Items & Monster features (2024) — core complete; 2024 SWEEP COMPLETE

Items: Healer's Kit. Monster features: Ghoul Claw, Vampire Bite/Misty Escape,
Goblin Boss Redirect Attack, with the remaining ~15 features data-driven.

With this, every 2024-rules category from the roadmap has core automation:
classes (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger,
Rogue, Warlock, Wizard + subclasses), the spell tail (incl. all nine Summon X
spells), feats, species features, actions, items and monster features.

Outstanding (tracked for later passes):
- Regions batch: template/region spells (Darkness, Cloudkill, Sleet Storm,
  Spike Growth, Wall of Fire, Zone of Truth, Nature's Sanctuary, Radiance of
  the Dawn dispel)
- Heavy dialog spells: Teleport, Wish, Animate Objects
- Legacy re-export returns (Crusher/Piercer/Slasher, Elemental Adept,
  Telekinetic, Unarmed Fighting, Umbral Sight, Dreadful Strikes, Beguiling
  Twist, Relentless Endurance, remaining Metamagics)
- 3rd-party content (Muscle Wizard, Fate Gambler, Spellfire, "I Survived"
  trio, Purple Dragon Rook, Sangromantic Initiate, Eldritch Eddy...)
- Deferred class features: War God's Blessing, Invoke Duplicity trio,
  Nature's Wrath (no v13 source), Warrior of the Elements
- Animation passes (JB2A/Sequencer flows dropped during porting)
- 2014 variants (the legacy tree)

## Milestone 17 — Deferred returns, wave 1 — complete

Full Metamagic set finished (Extended, Heightened, Quickened, Seeking, Subtle,
Transmuted, Twinned join Careful/Distant; Empowered still deferred on its
dice-picker UI). Crusher, Piercer, Slasher ported with inline once-per-turn
stamps. Relentless Endurance, Dreadful Strikes scale, Beguiling Twist ported.
Still deferred: Umbral Sight (needs light-level/canSense utils in CAT),
Elemental Adept (326-line legacy), Telekinetic, Unarmed Fighting, regions
batch, Teleport/Wish/Animate Objects, 3rd-party content, animation passes,
2014 variants.

## Milestone 18 — Regions wave 1 + final deferred returns

Region-spell pattern established and applied: Zone of Truth, Sleet Storm,
Cloudkill (drifting cloud + once-per-turn damage). Umbral Sight ported using
new CAT tokenUtils.getLightLevel/canSense (requires the next CAT release).
Elemental Adept (all five), Telekinetic Shove, Fighting Style: Unarmed
Fighting, Beguiling Twist, Relentless Endurance, Dreadful Strikes complete.

Remaining work requires new machinery or is long-tail:
- Spike Growth / Wall of Fire need per-token movement paths in CAT region
  triggers; Darkness needs the light/dispel system
- Teleport, Wish, Animate Objects, Empowered Spell need bespoke dialog UIs
- 3rd-party content and the 2014 legacy tree
- Animation passes (Sequencer/JB2A flows)

## Milestone 19 — 3rd-party 2024 complete + heavy spells + all class deferrals closed

Wish, Teleport, Animate Objects, Empowered Spell (Metamagic now 100%),
Darkness/Wall of Fire/Spike Growth region cores, Nature's Sanctuary,
War God's Blessing, Invoke Duplicity trio, Warrior of the Elements.
3rd-party 2024: full Pugilist class + Muscle Wizard, Fate Gambler,
the I Survived trio, Sangromantic Initiate, Force Gauntlet, Mask of
Monstrous Forms, Blood Sacrifice, Forest Guard, Sprout Foliage,
Summer Winds, Wilting Smite, Spellfire Flare/Spark, Purple Dragon
Rook, Eldritch Eddy. Radiance of the Dawn dispels Darkness regions.

The ENTIRE 2024 tree (core + 3rd-party) is ported. Remaining frontiers:
the 2014 legacy tree and animation passes.

## Milestone 20 — 2014 legacy tree underway

Wave 1: 55 legacy spells bound to shared 2024 macros (smites, auras,
summons, region spells, Hex, Hunter's Mark, Eldritch Blast...).
Wave 2: 88 items across nine legacy packs (34 macro-bound via shared
automations, 54 data-only: summon features, experimental elixirs).
Wave 3: SCAG blade cantrips (Booming Blade with movement detonation,
Green-Flame Blade with flame leap).

Remaining 2014 macro ports (~440 items): ~86 spells (find familiar,
conjure-X family, crown of madness, call lightning...), 234 class
features, 66 items, 27 feats, 26 monster features, 25 race features.
The item-by-item ⬜ list is in **[porting-inventory.md](porting-inventory.md)**
(filter for the `— 2014` sections). The earlier scratchpad `legacy-plan.json`
donor map was transient and no longer exists — rebuild any grouping from the
inventory + `git grep` on `upstream/v13`.

## Milestone 21 — 2024 bug-sweep + Rogue Sneak/Cunning Strike (post-port hardening)

Not new content — a hardening pass over already-ported 2024 features plus two new
Rogue automations. **Everything here is the exact bug class the legacy pass must
avoid**, so it's captured as a checklist in *New-session bootstrap* below.

- **Reckless Attack effect id** (`f660b0206`, bump `5790fea09`): the converter had
  derived the effect's `flags.cat.identifier` from its *name* (`reckless-attack`)
  instead of the v13 `info.identifier` (`recklessAttackEffect` → `reckless-attack-effect`),
  so Frenzy / Brutal Strike (which look up `reckless-attack-effect`) never matched.
- **Knightly Envoy** (`1bb8a4bdd`): dedup looked up `knightly-envoy` but its applied
  effect is tagged `polyglot-effect`.
- **Sneak Attack (2024)** added (`06f329203`) then fixed across `178e41719`–`ae76ab039`:
  recovery `turn`→`turnStart`; descriptor `rules:'modern'`→`'2024'` (macro never
  dispatched otherwise); camelCase→kebab identifier lookups; ally-proximity via explicit
  disposition match (findNearby's ally/enemy is relative to the *reference* token);
  explicit `uses.spent` decrement (empty `consumption.targets` made `consumeUsage` inert);
  `new Roll(formula, actor.getRollData())` so `@scale.rogue.sneak-attack` resolves.
- **Cunning Strike (2024)** automated off Sneak Attack (`4ffdd5553`, `ae76ab039`):
  the upstream `sneakAttackCunningStrike` called-event has **no answerer in CPR**, so
  options are now gathered directly from the actor's features.
- **Version-bump discipline** (`ae83698e8`, `5790fea09`): every pack-data/effect fix this
  session bumped the descriptor `version` (source of truth via `versions2024`) so the
  medkit re-syncs it. See the memory rule [[bump-version-for-medkit]].
- **CAT minimum → 0.0.5** (`3b3e6c251`): `module-template.json` requires CAT ≥ 0.0.5
  (getLightLevel/canSense/modifyDamageAppliedFlat). **CAT 0.0.5 must be tagged/released
  before or with the next CPR release.**
- **Divine Smite chooser** dedup was tried (`dc1f500f5`) and **reverted** (`1dd1a8d91`):
  collapsing smite copies preferred a slot-consuming prepared copy and hid the free
  innate smite. The chooser lists all castable smites again.

Known dead code (safe to ignore or delete; NOT wired up): `scripts/macros/generic/hide.mjs`
is an orphan (not barrel-exported; live hide is `scripts/macros/modern/actions/hide.mjs`).
It still contains `rules:'modern'` and camelCase `supremeSneak`/`supremeSneakEffect` — a
false positive for the grep guards below. Don't "fix" it; delete it or leave it.

## New-session bootstrap for legacy porting

Everything a fresh session needs to resume the 2014 (legacy) pass. Read this plus the
per-feature checklist at the bottom of the file.

### Where the source lives (nothing on disk)
> `upstream/v13` is the **original** CPR (`upstream` = `chrisk123999/chris-premades`), NOT
> this fork (`origin` = `Fronix/chris-premades`, which is the V14 port and has no v13 branch).
> The v13 content *is* the original's V13 implementation. Requires the `upstream` remote to be
> configured and fetched: `git remote add upstream https://github.com/chrisk123999/chris-premades.git && git fetch upstream v13`.

- **v13 macros**: `git show upstream/v13:scripts/macros/legacy/<path>.js`
- **v13 pack data**: `git show upstream/v13:packData/<pack>/<file>.json`, or check out the
  whole tree once: `git worktree add /tmp/v13 upstream/v13` (gives both `scripts/macros/legacy/`
  and `packData/` for `convertV13.mjs --src`). Remove with `git worktree remove /tmp/v13`.
- **What's ⬜**: `docs/porting-inventory.md` (the `— 2014` sections). It was generated by a
  scratchpad `gen-tracker.py` that no longer exists; hand-edit the Status cells as you go, or
  rebuild a generator from `tools/v13-behavior-identifiers.json` (maps every v13 export → its
  behavior triggers, so "data-only" is trustworthy).

### Per-batch pipeline (same as 2024)
1. Pick a batch of ⬜ legacy rows from `porting-inventory.md`.
2. Read each v13 macro (`git show upstream/v13:...`). Prefer binding the 2014 pack item to an
   already-ported shared macro (`all/` or the `modern/` descriptor) when mechanics match —
   most of Waves 1–2 were exactly this. Only write a new `legacy/` descriptor for 2014-only behavior.
3. Barrel-export from `scripts/macros/legacy.mjs` (or `all.mjs`); add lang keys (4-space indent).
4. Convert pack items: `node tools/convertV13.mjs --src /tmp/v13/packData/<pack> --out packData/<pack> --only "Name A,Name B" --force`
5. Bind `flags.cat.macros.<bucket>` on the converted JSON (`[{source:'chris-premades', rules:'2014', identifier:'<kebab>'}]`).
6. Verify (below), then `npm run buildCompendiums`, commit, push.

### The bug-class checklist (the "systematic sweep" — every one of these bit us in 2024)
Run these grep guards after each batch and eyeball every hit:
- **Ruleset vocabulary**: descriptors and `flags.cat.macros.*` bindings use `'2024'`/`'2014'`/`'all'`,
  **never** V13's `'modern'`/`'legacy'`. CAT's resolver (`cat` `macros.mjs`) needs
  `macro.rules === rules || macro.rules === 'all'`; `'legacy' !== '2014'` silently never dispatches.
  Guard: `grep -rn "rules:\s*'\(modern\|legacy\)'" scripts/macros` (only the dead `generic/hide.mjs`
  should match).
- **Identifier casing**: `documentUtils.getIdentifier` is an exact string match, no camelCase↔kebab
  normalization. V13 used camelCase (`psychicBlades`); shipped pack identifiers are kebab
  (`psychic-blades`). Every `getItemByIdentifier`/`getEffectByIdentifier`/`includes(id)` must use the
  kebab form that's actually in the pack. Guard: `grep -rnE "getItemByIdentifier|getEffectByIdentifier" scripts/macros/legacy`
  and check each string is kebab.
- **Converter derives effect ids from the effect NAME**, not v13 `info.identifier`. After converting,
  verify each effect's `flags.cat.identifier` equals what consumer macros look up; hand-fix in packData
  otherwise (this was the Reckless Attack bug).
- **findNearby disposition is relative to the reference token.** To find the attacker's allies near a
  target, pull all nearby and match `token.disposition === workflow.token.document.disposition` — do
  NOT pass a relative `'ally'`/`'enemy'` keyed off the target.
- **Empty `consumption.targets` → `consumeUsage` is inert.** If a converted activity doesn't spend the
  feature's own once-per-turn use, decrement explicitly:
  `documentUtils.update(item, {'system.uses.spent': (item.system.uses.spent ?? 0) + 1})`.
- **Recovery period**: v13's `turn` is stale; dnd5e 5.x wants `turnStart` for once-per-turn.
- **`@scale` needs roll data**: `new Roll(formula, actor.getRollData())`, else `@scale.*` stays literal.
- **calledEvent answerers**: v13's implicit called-events often have NO answerer in CPR — gather from
  actor features directly instead of awaiting a `calledEvent` that returns nothing.

### Medkit reaches existing actors only on a version bump
Any change to **pack data / effects / activities** MUST bump the descriptor `version` (the source of
truth — `versions2024`/legacy equivalent overrides the pack flag) in the **same commit** as the fix, or
the medkit skips it and the user must re-import. Pure macro-*code* changes ship in the webpack bundle and
need no bump. See memory [[bump-version-for-medkit]].

### Verify chain (in-repo; run with `set -o pipefail`)
- `node --check <changed>.mjs` and `npx eslint "scripts/**/*.mjs"`
- `npm run buildCompendiums 2>&1 | grep -c Packed`  (LevelDB pack rebuild)
- `npm run build 2>&1 | tail -1`  (webpack bundle)
- The old scratchpad `contract-check.mjs` (verified every `proxy.mjs` member resolves) and
  `gen-tracker.py` (regenerated the inventory) are **gone**. `npm run build` catches most import
  breakage; recreate the contract check if you want the stricter guarantee.
- Then in-game: medkit the actor, Ctrl+F5, smoke-test. The user is the only live tester.

## Roadmap: class-by-class, 2024 first

The full v13 catalog (1,586 pack items; ~1,100 need macro rewrites, the rest were
data-only and have been batch-converted by `tools/convertV13.mjs`) is tracked
item-by-item in **[porting-inventory.md](porting-inventory.md)** (auto-generated —
regenerate rather than hand-editing its tables).

Working order (per user priority; each slice = features + subclasses + that class's
staple spells, committed and releasable on its own):

1. ~~Paladin~~ ✅
2. ~~Fighter~~ ✅
3. ~~Cleric~~ ✅ (core)
4. ~~Monk~~ ✅ (core)
5. ~~Druid~~ ✅
6. ~~Wizard~~ ✅
7. ~~Sorcerer~~ (no 2024 content; legacy metamagic started)
8. ~~Warlock~~ ✅
9. ~~Bard~~ ✅
10. ~~Ranger~~ ✅
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

The CAT dev checkout lives at `~/git/covens-automation-toolkit` (my CAT fork, with
`~/git/cat` symlinked to it so the `jsconfig.json` `cat/*` path mapping resolves).
Some ported features require CAT fixes carried on its `fix/latent-bugs` branch. These
are maintained in my CAT fork for this fork's use only (no upstream contribution):
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
