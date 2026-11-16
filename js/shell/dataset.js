/*
✒ Metadata
    - Title: Dataset Description (digiSpace Edition - v2.16)
    - File Name: dataset.js
    - Relative Path: js/shell/dataset.js
    - Artifact Type: javascript
    - Version: 2.16.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.16.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for datasets another person can analyse without
      having watched the run: every dataset explains itself.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Turns a recorded dataset into files that stand on their own: a README
    for people and a Frictionless Tabular Data Package for software, beside
    the CSVs, and one ZIP that carries them all. Built from the Library item
    and the lab's column dictionary when they are downloaded, so a dataset
    saved before this release gains them too.

✒ Key Features:
    - Every column with its unit, its meaning and the factor to SI units.
    - The lab, scene, settings, scale, time span, sample rate, the release
      that recorded it, and, in Gravity, the bodies it started with.
    - How the files join (on t_s), what an empty cell means, and how far the
      tracks were thinned to cover the whole run.
    - datapackage.json follows the Frictionless Data specification, so
      frictionless, pandas and R can read the CSVs with their types.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { APP } from '../core/version.js';
import { zip } from '../core/zip.js';
import { labsById } from '../labs/index.js';
import { vault } from './vault.js';

const INTEGER = new Set(['count', 'id', 'index']);
const num = v => (v == null || !Number.isFinite(v) ? '' : Number.isInteger(v) && Math.abs(v) < 1e7 ? String(v) : String(+v.toPrecision(6)));
/* A conversion factor: seven significant figures, in scientific notation when very large or small (full precision is in
   the data package). */
const factor = v => (v == null || !Number.isFinite(v) ? '' : Math.abs(v) >= 1e7 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(6) : String(+v.toPrecision(7)));
const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');

/* A file's columns, each with what the lab's dictionary says of it. */
export function columnsOf(lab, names) {
  return (names || []).map(name => {
    const d = (lab && lab.dataInfo && lab.dataInfo[name]) || null;
    return { name, unit: d ? d[0] : '', about: d ? d[1] : '', si: d && d[2] ? { unit: d[2], factor: d[3] } : null };
  });
}
/* The names the files go by: the CSVs as saved, and the README and data package beside them. */
export function runNames(item) {
  const base = (item.files[0] && item.files[0].name.replace(/\.csv$/, '')) || `physics-${item.lab}-${item.preset}`;
  return { base, readme: `${base}-README.md`, pkg: `${base}-datapackage.json`, zip: `${base}.zip` };
}
/* The settings the run had, by the names the Controls page gives them. */
function settingsOf(lab, params) {
  const out = [];
  for (const [key, value] of Object.entries(params || {})) {
    const c = lab && (lab.controls || []).find(x => x.key === key);
    if (!c || typeof value === 'object') continue;
    out.push({ key, label: c.label || key, value });
  }
  return out;
}

/* The README and the data package of a saved dataset. */
export function describeRun(item) {
  const lab = labsById[item.lab], names = runNames(item), main = columnsOf(lab, item.columns), tracks = item.trackRows ? columnsOf(lab, item.trackColumns) : null;
  const scene = lab ? ((lab.presets || []).find(p => p.id === item.preset) || {}).label || item.preset : item.preset;
  const labName = lab ? lab.name : item.lab, mainFile = item.files[0] && item.files[0].name, trackFile = item.files[1] && item.files[1].name;
  const span = Number.isFinite(item.t0) && Number.isFinite(item.t1) ? `t_s ${num(item.t0)} to ${num(item.t1)}, ${num(item.t1 - item.t0)} of simulated time` : `${num(item.duration)} of simulated time`;
  const years = item.lab === 'gravity' && lab && lab.dataInfo.t_years && Number.isFinite(item.t0) ? ` (${num((item.t1 - item.t0) * lab.dataInfo.t_s[3] / lab.dataInfo.t_years[3])} years)` : '';
  const asked = item.rateAsked && item.rateAsked !== item.rate ? `, asked for ${item.rateAsked} Hz; samples land on the solver's steps` : '';
  const stride = item.trackStride > 1 ? `every ${item.trackStride} samples, thinned evenly so the tracks span the whole run` : 'every sample';
  const settings = settingsOf(lab, item.params), bodies = item.context && item.context.bodies;
  const L = [];
  L.push(`# ${item.title}`, '');
  L.push(`A dataset recorded in [${APP.name}](${APP.home}) ${item.app || '(release not recorded)'}, in the **${labName}** lab, scene **${scene}**.${lab && lab.blurb ? ` ${lab.blurb}` : ''}`, '');
  L.push(table(['', ''], [
    ['Recorded', item.startedAt || item.createdAt],
    ['Span', `${span}${years}`],
    ['Samples', `${(item.rows || 0).toLocaleString('en')} rows at ${item.rate} Hz of simulated time${asked}`],
    ...(tracks ? [[item.trackLabel || 'Tracks', `${(item.trackRows || 0).toLocaleString('en')} rows, ${stride}`]] : []),
  ]), '');
  L.push('## Files', '');
  L.push(table(['File', 'What it holds'], [
    [`\`${mainFile}\``, 'One row per sample: the readings for the whole system.'],
    ...(tracks ? [[`\`${trackFile}\``, `${item.trackLabel || 'Tracks'}: one row per tracked object per sample. Join it to the samples on \`t_s\`.`]] : []),
    [`\`${names.readme}\``, 'This file.'],
    [`\`${names.pkg}\``, 'The same description for software: a Frictionless Tabular Data Package (frictionlessdata.io).'],
  ]), '');
  L.push('## Scale and units', '');
  if (lab && lab.scaleNote) L.push(lab.scaleNote, '');
  if (lab && lab.dataNote) L.push(lab.dataNote, '');
  L.push('Every value is written exactly as the simulation computed it, in its own units, to ten significant figures. Where a column has an SI unit, multiply by the factor beside it to convert. An empty cell is a value that did not exist at that moment.', '');
  const colTable = cols => table(['Column', 'Unit', 'Meaning', 'SI unit', 'Multiply by'], cols.map(c => [`\`${c.name}\``, c.unit, c.about || '(not described)', c.si ? c.si.unit : '', c.si ? factor(c.si.factor) : '']));
  L.push(`## Columns of \`${mainFile}\``, '', colTable(main), '');
  if (tracks) L.push(`## Columns of \`${trackFile}\``, '', colTable(tracks), '');
  if (settings.length) L.push('## Settings', '', 'As the Controls page set them when the recording started, in the lab\'s own units.', '', table(['Setting', 'Key', 'Value'], settings.map(s => [s.label, `\`${s.key}\``, String(s.value)])), '');
  if (bodies && bodies.length) {
    L.push('## Bodies at the start', '', `The ${bodies.length} bodies when the recording started. Bodies can merge, escape or be added during a run; the tracks name every one at every sample.`, '');
    L.push(table(['body_id', 'Name', 'Kind', 'Mass (sim)', 'Mass', 'Orbits'], bodies.map(b => [b.id, b.name, b.kind, num(b.mass), b.mass_text, b.orbits_id == null ? '' : `${b.orbits} (${b.orbits_id})`])), '');
  }
  if (item.summary && item.summary.length) L.push('## At a glance', '', table(['Column', 'Min', 'Mean', 'Max'], item.summary.map(s => [`\`${s.column}\``, num(s.min), num(s.mean), num(s.max)])), '');
  L.push('---', '', `Written by ${APP.name} ${APP.version}. Source: ${APP.source}`, '');
  const readme = L.join('\n');

  const field = c => ({ name: c.name, type: c.unit === 'text' ? 'string' : INTEGER.has(c.unit) ? 'integer' : 'number', description: c.about, ...(c.unit ? { unit: c.unit } : {}), ...(c.si ? { si: c.si } : {}) });
  const resource = (name, path, cols, description) => ({ profile: 'tabular-data-resource', name, path, format: 'csv', mediatype: 'text/csv', encoding: 'utf-8', description, schema: { fields: cols.map(field), missingValues: [''] } });
  const pkg = {
    profile: 'tabular-data-package', name: names.base.toLowerCase().replace(/[^a-z0-9._-]/g, '-'), title: item.title,
    description: `Recorded in ${APP.name}, ${labName} lab, scene ${scene}. See ${names.readme}.`,
    created: item.createdAt, keywords: ['physics', 'simulation', item.lab], sources: [{ title: `${APP.name} ${item.app || ''}`.trim(), path: APP.home }],
    resources: [resource('samples', mainFile, main, 'One row per sample: the readings for the whole system.'),
      ...(tracks ? [resource('tracks', trackFile, tracks, `${item.trackLabel || 'Tracks'}: one row per tracked object per sample; joins the samples on t_s.`)] : [])],
    physics_playground: {
      lab: item.lab, scene: item.preset, scene_label: scene, release: item.app || null, recorded: item.startedAt || item.createdAt,
      t0: item.t0 ?? null, t1: item.t1 ?? null, rows: item.rows, rate_hz: item.rate, rate_asked_hz: item.rateAsked ?? null,
      track_rows: item.trackRows || 0, track_stride: item.trackStride || (item.trackRows ? 1 : null),
      scale_note: (lab && lab.scaleNote) || null, data_note: (lab && lab.dataNote) || null, units: item.units || null,
      settings: Object.fromEntries(settings.map(s => [s.key, s.value])), bodies: bodies || null,
    },
  };
  return { readme, pkg, names };
}

/* Everything a dataset is, as files: its CSVs, its README and its data package. */
export async function runFiles(item) {
  const { readme, pkg, names } = describeRun(item), out = [];
  for (let i = 0; i < item.files.length; i++) { const b = await vault.blob(item, i); if (b) out.push({ name: item.files[i].name, blob: b }); }
  out.push({ name: names.readme, blob: new Blob([readme], { type: 'text/markdown' }) });
  out.push({ name: names.pkg, blob: new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' }) });
  return out;
}
/* One archive of them all, named for the dataset. */
export async function runZip(item) { return { name: runNames(item).zip, blob: await zip(await runFiles(item)) }; }
