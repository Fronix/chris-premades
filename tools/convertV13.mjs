/* eslint-env node */
// Convert v13 CPR packData documents to the V14 schema.
//
// Usage:
//   node tools/convertV13.mjs --src <v13 pack dir> --out <packData/<pack>> [options]
//
// Options:
//   --rules <2014|2024>   system.source.rules to stamp when the item has none (default: inferred
//                         from the source dir name: *-2024 -> 2024, otherwise 2014)
//   --data-only           skip documents that reference v13 macros (they need a hand port first)
//   --only <name,...>     only convert documents whose name matches (case-insensitive)
//   --report <file>       write a JSON report of macros/flags that need manual porting
//   --force               overwrite existing output files (default: skip identifiers already present)
import fs from 'node:fs';
import path from 'node:path';

const MODE_TO_TYPE = {0: 'custom', 1: 'multiply', 2: 'add', 3: 'downgrade', 4: 'upgrade', 5: 'override'};
const VERSION = '2.0.0';

function kebab(identifier) {
    return identifier?.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
function parseValue(value) {
    if (typeof value !== 'string') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+$/.test(value)) return Number(value);
    return value;
}
function convertChange(change, notes) {
    const type = MODE_TO_TYPE[change.mode] ?? 'custom';
    const key = change.key;
    if (key.startsWith('flags.chris-premades')) notes.push('change key references v13 CPR runtime: ' + key);
    if (key.startsWith('macro.')) notes.push('DAE macro change key (verify in V14): ' + key + ' = ' + change.value);
    return {
        key,
        type,
        value: parseValue(change.value),
        phase: key.startsWith('system.') ? 'final' : 'initial',
        priority: change.priority ?? null
    };
}
function convertDuration(duration = {}, notes) {
    if (duration.seconds) return {value: duration.seconds, units: 'seconds', expiry: null, expired: false};
    if (duration.rounds && duration.turns) notes.push('duration has both rounds and turns; kept rounds');
    if (duration.rounds) return {value: duration.rounds, units: 'rounds', expiry: null, expired: false};
    if (duration.turns) return {value: duration.turns, units: 'turns', expiry: null, expired: false};
    return {value: null, units: 'seconds', expiry: null, expired: false};
}
function convertEffectFlags(flags = {}, notes, report) {
    const out = {};
    for (const [scope, value] of Object.entries(flags)) {
        if (scope === 'chris-premades') {
            if (value.info?.identifier) {
                out.cat ??= {};
                out.cat.identifier = kebab(value.info.identifier);
            }
            if (value.macros) report.effectMacros.push(value.macros);
            const other = Object.keys(value).filter(k => !['info', 'macros'].includes(k));
            if (other.length) notes.push('unmapped effect flags.chris-premades keys: ' + other.join(', '));
            continue;
        }
        if (scope === 'ActiveAuras') {
            notes.push('ActiveAuras flags dropped (auras are CAT-native in V14)');
            continue;
        }
        out[scope] = value;
    }
    return out;
}
function convertEffect(effect, notes, report) {
    const changes = (effect.changes ?? []).map(change => convertChange(change, notes));
    const converted = {
        name: effect.name,
        img: effect.img ?? effect.icon,
        origin: effect.origin ?? null,
        transfer: !!effect.transfer,
        _id: effect._id,
        type: effect.type && effect.type !== 'base' ? effect.type : 'base',
        system: {...(effect.system ?? {}), changes},
        disabled: !!effect.disabled,
        start: null,
        duration: convertDuration(effect.duration, notes),
        tint: effect.tint ?? '#ffffff',
        statuses: effect.statuses ?? [],
        showIcon: 1,
        folder: null,
        sort: effect.sort ?? 0,
        flags: convertEffectFlags(effect.flags, notes, report)
    };
    if (effect.description) converted.description = effect.description;
    if (effect._key) converted._key = effect._key;
    const daeSpecial = effect.flags?.dae?.specialDuration;
    if (daeSpecial?.length) notes.push('dae specialDuration (verify CAT/DAE-14 handling): ' + daeSpecial.join(', '));
    return converted;
}
function convertItem(item, {rules, embedded = false}, report) {
    const notes = [];
    const converted = {...item};
    delete converted._stats;
    // flags
    const cpr = converted.flags?.['chris-premades'];
    if (cpr) {
        if (cpr.macros) report.itemMacros = cpr.macros;
        // v13 tracked activity identifiers in a flag; V14 activities have a native identifier field
        if (cpr.activityIdentifiers && converted.system?.activities) {
            converted.system = {...converted.system, activities: {...converted.system.activities}};
            for (const [identifier, activityId] of Object.entries(cpr.activityIdentifiers)) {
                const activity = converted.system.activities[activityId];
                if (activity) converted.system.activities[activityId] = {...activity, identifier: kebab(identifier)};
            }
        }
        const other = Object.keys(cpr).filter(k => !['macros', 'info', 'activityIdentifiers'].includes(k));
        if (other.length) notes.push('unmapped item flags.chris-premades keys: ' + other.join(', '));
        converted.flags = {...converted.flags};
        delete converted.flags['chris-premades'];
    }
    converted.flags = {...(converted.flags ?? {})};
    converted.flags.cat = {...(converted.flags.cat ?? {}), automation: {version: VERSION}};
    // identity
    converted.system = {...converted.system};
    if (!converted.system.identifier && cpr?.info?.identifier) converted.system.identifier = kebab(cpr.info.identifier);
    if (!converted.system.identifier) converted.system.identifier = converted.name.slugify?.() ?? converted.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    converted.system.source = {...(converted.system.source ?? {})};
    if (!['2014', '2024'].includes(converted.system.source.rules)) converted.system.source.rules = rules;
    // effects
    converted.effects = (item.effects ?? []).map(effect => convertEffect(effect, notes, report));
    if (embedded) delete converted._key;
    report.notes.push(...notes);
    return converted;
}
function convertActor(actor, {rules}, report) {
    const notes = [];
    const converted = {...actor};
    delete converted._stats;
    if (converted.flags?.['chris-premades']) {
        report.actorFlags = converted.flags['chris-premades'];
        converted.flags = {...converted.flags};
        delete converted.flags['chris-premades'];
    }
    converted.effects = (actor.effects ?? []).map(effect => convertEffect(effect, notes, report));
    converted.items = (actor.items ?? []).map(item => convertItem(item, {rules, embedded: true}, report));
    report.notes.push(...notes);
    return converted;
}
// v13 macros bind two ways: explicit flags.chris-premades.macros, or implicitly by
// info.identifier matching a registered macro. tools/v13-behavior-identifiers.json lists
// every v13 macro export whose file declares behavior triggers (regenerate from the v13
// branch if upstream v13 ever changes).
const behaviorIdentifiers = new Set(JSON.parse(fs.readFileSync(new URL('./v13-behavior-identifiers.json', import.meta.url), 'utf8')));
function hasMacros(doc) {
    const cpr = doc.flags?.['chris-premades'];
    const own = cpr?.macros || behaviorIdentifiers.has(cpr?.info?.identifier);
    const effects = (doc.effects ?? []).some(effect => {
        const flags = effect.flags?.['chris-premades'];
        return flags?.macros || behaviorIdentifiers.has(flags?.info?.identifier);
    });
    const embedded = (doc.items ?? []).some(item => hasMacros(item));
    return !!own || effects || embedded;
}
function existingIdentifiers(outDir) {
    const identifiers = new Set();
    if (!fs.existsSync(outDir)) return identifiers;
    for (const file of fs.readdirSync(outDir)) {
        if (!file.endsWith('.json')) continue;
        try {
            const doc = JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
            if (doc._key?.startsWith('!folders')) continue;
            const identifier = doc.system?.identifier;
            const rules = doc.system?.source?.rules;
            if (identifier) identifiers.add(identifier + '|' + (rules ?? ''));
        } catch { /* ignore unparsable */ }
    }
    return identifiers;
}

// --- CLI ---
const args = process.argv.slice(2);
function opt(name) {
    const index = args.indexOf('--' + name);
    return index === -1 ? undefined : args[index + 1];
}
const srcDir = opt('src');
const outDir = opt('out');
if (!srcDir || !outDir) {
    console.error('Usage: node tools/convertV13.mjs --src <v13 pack dir> --out <packData dir> [--rules 2014|2024] [--data-only] [--only names] [--report file] [--force]');
    process.exit(1);
}
const rules = opt('rules') ?? (srcDir.includes('2024') ? '2024' : '2014');
const dataOnly = args.includes('--data-only');
const force = args.includes('--force');
const only = opt('only')?.toLowerCase().split(',').map(s => s.trim());
const reportPath = opt('report');

const existing = existingIdentifiers(outDir);
fs.mkdirSync(outDir, {recursive: true});
const reports = [];
const stats = {converted: 0, skippedMacros: 0, skippedExisting: 0, folders: 0};
const usedFolders = new Set();
const folderDocs = [];
for (const file of fs.readdirSync(srcDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
    if (doc._key?.startsWith('!folders')) {
        folderDocs.push({file, doc});
        continue;
    }
    if (only && !only.includes(doc.name.toLowerCase())) continue;
    if (dataOnly && hasMacros(doc)) {
        stats.skippedMacros++;
        continue;
    }
    const report = {file, name: doc.name, itemMacros: null, effectMacros: [], notes: []};
    const isActor = doc._key?.startsWith('!actors');
    const converted = isActor ? convertActor(doc, {rules}, report) : convertItem(doc, {rules}, report);
    if (!isActor && !force && existing.has(converted.system.identifier + '|' + converted.system.source.rules)) {
        stats.skippedExisting++;
        continue;
    }
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(converted, null, 2) + '\n');
    stats.converted++;
    if (doc.folder) usedFolders.add(doc.folder);
    if (report.itemMacros || report.effectMacros.length || report.notes.length) reports.push(report);
}
// copy folder docs referenced by converted documents (walk up parent folders)
let changed = true;
while (changed) {
    changed = false;
    for (const {doc} of folderDocs) {
        if (usedFolders.has(doc._id) && doc.folder && !usedFolders.has(doc.folder)) {
            usedFolders.add(doc.folder);
            changed = true;
        }
    }
}
for (const {file, doc} of folderDocs) {
    if (!usedFolders.has(doc._id)) continue;
    const target = path.join(outDir, file);
    if (!fs.existsSync(target)) {
        const folder = {...doc};
        delete folder._stats;
        fs.writeFileSync(target, JSON.stringify(folder, null, 2) + '\n');
        stats.folders++;
    }
}
if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), {recursive: true});
    fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2) + '\n');
}
console.log(`${srcDir} -> ${outDir}: converted ${stats.converted}, folders ${stats.folders}, skipped ${stats.skippedMacros} (macros) / ${stats.skippedExisting} (existing)${reportPath ? ', report: ' + reportPath : ''}`);
