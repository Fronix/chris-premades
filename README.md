# Readme

> [!IMPORTANT]
> ## Foundry VTT V14 Fork
> This is a fork of [chrisk123999/chris-premades](https://github.com/chrisk123999/chris-premades) targeting **Foundry VTT V14** and **D&D 5e 5.3.x**, based on upstream's in-progress V14 rewrite with additional ported features and fixes.
>
> The module is built on **CAT (Coven's Automation Toolkit)**, which does all the heavy lifting. This fork depends on fixes that are not yet in the upstream CAT release, so **you must install CAT manually from [my CAT fork](https://github.com/Fronix/covens-automation-toolkit)** — do not use the upstream CAT.
>
> ### Installation
> Install both modules in Foundry via **Install Module → Manifest URL** (install CAT first):
> 1. **CAT**: `https://github.com/Fronix/covens-automation-toolkit/releases/latest/download/module.json`
> 2. **Cauldron of Plentiful Resources**: `https://github.com/Fronix/chris-premades/releases/latest/download/module.json`
>
> Ported automation status is tracked in [docs/porting-status.md](docs/porting-status.md).

> [!WARNING]
> ## AI-Ported Automations
> The V14 automation port in this fork was done **entirely with AI** (Claude, via Claude Code). Every ported macro was migrated from the V13 Midi-QOL implementation to CAT's trigger system by AI, verified with automated checks (lint, compendium build, bundle build, and a CAT API contract check) — but **not every automation has been play-tested at a real table yet**. Expect rough edges: if an automation misbehaves, please [open an issue](https://github.com/Fronix/chris-premades/issues) with the item name and what happened.

## Port Status

The entire **2024 (modern) rules tree is ported** — all eleven classes and their subclasses, the spell compendium (including the Summon X family, region spells like Cloudkill/Sleet Storm/Zone of Truth, and heavy-dialog spells like Wish, Teleport and Animate Objects), the complete Metamagic set, feats, species features, actions, items, monster features, and all 3rd-party 2024 content (full Pugilist class, Muscle Wizard, Spellfire, and more).

The **2014 (legacy) rules tree is in progress**: spells and features whose mechanics are shared with 2024 (smites, auras, summons, Hex, Hunter's Mark, Eldritch Blast, the SCAG blade cantrips, …) are already available; the remaining legacy-only automations are being ported in waves. Animation passes (Sequencer/JB2A visuals) are largely still pending.

See [docs/porting-status.md](docs/porting-status.md) for the milestone-by-milestone breakdown.

A collection of automated items including spells, class features, monster features, etc., mechanics to make those possible, and quality-of-life based extensions for a high-automation Midi-QOL based D&D5e environment. Compendiums included in this module do not include item's descriptions. While this module has several module dependencies by different authors, do not pester tposney, Wasp, or any other module authors with bugs or issues related to this module. Bug reports and large module implementation requests may be made on the GitHub. Faster support and feature requests can be accessed on the [Discord server](https://discord.gg/BumxBcQDrT).

Find detailed information in [our wiki](https://github.com/chrisk123999/chris-premades/wiki).

![cpr-logo](https://raw.githubusercontent.com/chrisk123999/chris-premades/refs/heads/master/images/cpr-logo.png) 
  
### Authors:
[Chris](https://github.com/chrisk123999) <br> 
[Autumn](https://github.com/Autumn225) <br>
[Michael](https://github.com/roth-michael) <br>
[SagaTympana](https://github.com/SagaTympana)

### Support:
[<img src="images/chris-kofi.svg" width=237px />](https://ko-fi.com/O5O5G582S) <br>
[<img src="images/michael-kofi.svg" width=253px />](https://ko-fi.com/T6T8XKCII)
  
# Requirements:
| Requirement | Minimum Version |
| --- | --- |
| Foundry VTT | V14 |
| D&D 5e System | ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FFronix%2Fchris-premades%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.relationships.systems%5B%3A1%5D.compatibility.minimum&label=%20&color=orange) |
| Midi-Qol | ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FFronix%2Fchris-premades%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.relationships.requires%5B0%5D.compatibility.minimum&label=%20&color=green) |
| Dynamic Active Effects | ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FFronix%2Fchris-premades%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.relationships.requires%5B1%5D.compatibility.minimum&label=%20&color=green) |
| [Coven's Automation Toolkit (my fork)](https://github.com/Fronix/covens-automation-toolkit) | ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FFronix%2Fchris-premades%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.relationships.requires%5B2%5D.compatibility.minimum&label=%20&color=green) |

# Modules Required for Animations:
- Sequencer 3.6.0+
- Jules & Ben's Animated Assets 0.6.0+
- [Animated Spell Effects: Cartoon](https://github.com/chrisk123999/animated-spell-effects-cartoon/releases/download/0.4.6/module.json)
  
# Optional Supported Modules:  
- Gambit's Premades
- Midi Item Showcase Community
- Universal Animations
- Visual Active Effects
- D&D Beyond Importer
- Tidy5e Sheet
- Token Magic FX
  
# Main Features:
- Compendiums of automated spells, items, class features, and more.
- Title bar button that provides an interface to apply and configure included automations.
- Fancy animations created by ***Eskiemoh*** for some automations, using *Patreon JB2A* and *Animated Spell Effects: Cartoon*.
- Custom roll resolver for manual rolls, designed for in-person games.
- Custom API extending from Midi-QOL's workflow that allows for precise event timing and automation of overlapping spell effects.
- Public API for running custom macros.
- Various optional quality-of-life user-interface extentions.
- Effect changes including automatic descriptions, status effect icon changes, and application of relevant Midi-QOL flags to status effects.
- Custom effect interface to store and apply custom effects.
- Optional and Homebrew mechanics including DMG Cleave, Exploding Heals, and BG3 Weapon Actions.
- Automatic character backups.

# Licenses:
The assets included in this module are distributed under various terms, please see their `LICENSE` file for full details.

# Community Links:
[Cauldron of Plentiful Resources Discord](https://discord.gg/BumxBcQDrT)<br>
[Foundry VTT Discord](https://discord.gg/foundryvtt)<br>
[Posney's Foundry Automation Discord](https://discord.gg/Xd4NEvw5d7)<br>
