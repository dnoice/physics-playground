/*
✒ Metadata
    - Title: Unit Systems (digiSpace Edition - v2.4)
    - File Name: units.js
    - Relative Path: js/core/units.js
    - Artifact Type: javascript
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for real-world units with simulation pixels kept as an
      option: metric, US customary and simulation systems, one scale per lab.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Converts what the labs compute, in their own units (stage pixels, grid
    cells, or metres for the pendulum), into the unit system the user picked,
    and formats it. The simulations never change: only what is shown and
    what is typed in passes through here.

✒ Key Features:
    - Three systems: Metric (SI), US customary, and Simulation (the lab's own
      pixels or cells, as before).
    - A lab states what one of its length units is in metres (lab.units.m),
      or gives a whole table of its own (lab.unitTable) for astronomy.
    - Quantities by kind: length, speed, acceleration, specific energy,
      electric field and time, each with a readable prefix (cm, mm, km, in,
      mi) chosen from the size of the value.
    - toNative() undoes a conversion, for values typed into a control.
    - Listeners run when the system changes, so every view can refresh.

✒ Usage Instructions:
    import { fmtQ, toNative, unitSystem } from '../core/units.js';
    fmtQ(lab, 'speed', 340)          // "3.71 m/s" in metric, "340 px/s" in simulation
    toNative(lab, 'acc', 9.81)       // 900 for a lab whose pixel is 9.81/900 m

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - The mechanical labs share one scale: their default gravity, 900 px/s²,
      is 9.81 m/s², so a pixel is 1.09 cm.
---------
*/
import { store } from './util.js';

export const SYSTEMS = [
  { id: 'si', label: 'Metric', long: 'Metric (SI)', note: 'Metres, seconds and kilograms.' },
  { id: 'us', label: 'US', long: 'US customary', note: 'Feet and inches, seconds and pounds.' },
  { id: 'sim', label: 'Simulation', long: 'Simulation units', note: 'The lab\'s own pixels or grid cells, exactly as it computes them.' },
];
/* One pixel of the mechanical labs, in metres: their default gravity of 900 px/s² is standard gravity. */
export const PX_M = 9.81 / 900;
const FT = 0.3048, IN = 0.0254, MI = 1609.344;

let system = SYSTEMS.some(s => s.id === store.get('units', 'si')) ? store.get('units', 'si') : 'si';
const listeners = [];
export const unitSystem = () => system;
export function setUnitSystem(id) {
  if (!SYSTEMS.some(s => s.id === id) || id === system) return false;
  system = id; store.set('units', id);
  for (const f of listeners) f(id);
  return true;
}
export function onUnits(f) { listeners.push(f); }

/* Powers of length and time for each kind. 'spec' is energy per mass (J/kg = m²/s²); 'efield' is an electric field
   for a charge-to-mass ratio in C/kg, an acceleration per C/kg, which is N/C. */
const DIMS = { len: [1, 0], speed: [1, -1], acc: [1, -2], spec: [2, -2], efield: [1, -2] };
const NAMES = {
  si: { len: 'm', speed: 'm/s', acc: 'm/s²', spec: 'J/kg', efield: 'N/C' },
  us: { len: 'ft', speed: 'ft/s', acc: 'ft/s²', spec: 'ft²/s²', efield: 'N/C' },
};
/* The lab's own unit names, for the simulation system and as a fallback. */
function nativeNames(lab) {
  const L = (lab && lab.units && lab.units.len) || 'px';
  if (L === 'm') return NAMES.si; // a lab that computes in metres already speaks SI
  return { len: L, speed: `${L}/s`, acc: `${L}/s²`, spec: `(${L}/s)²`, efield: `${L}/s²` };
}

/* [factor, unit] taking a lab value of this kind into the current system. */
export function unitOf(lab, kind, sys = system) {
  if (lab && lab.unitTable) { const t = lab.unitTable(sys); if (t && t[kind]) return t[kind]; }
  const d = DIMS[kind]; if (!d) return [1, ''];
  if (sys === 'sim' || !lab || !lab.units) return [1, nativeNames(lab)[kind]];
  const m = lab.units.m;
  if (kind === 'efield') return [m, NAMES.si.efield]; // N/C in both systems: the field has no customary unit
  return [Math.pow(sys === 'us' ? m / FT : m, d[0]), NAMES[sys][kind]];
}
export const toDisplay = (lab, kind, v) => v * unitOf(lab, kind)[0];
export const toNative = (lab, kind, v) => v / unitOf(lab, kind)[0];

/* A number to a few significant figures, without trailing zeros or exponent notation in the usual range. */
export function sig(v, n = 3) {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return v.toExponential(n - 1);
  const d = Math.max(0, n - 1 - Math.floor(Math.log10(a)));
  return v.toFixed(Math.min(d, 6));
}
/* Readable prefixes for lengths and speeds in each system, from the size of the value. */
const SCALES = {
  'm': [[1e3, 'km'], [1, 'm'], [1e-2, 'cm'], [1e-3, 'mm']],
  'm/s': [[1, 'm/s'], [1e-2, 'cm/s'], [1e-3, 'mm/s']],
  'ft': [[MI / FT, 'mi'], [1, 'ft'], [IN / FT, 'in']],
  'ft/s': [[1, 'ft/s'], [IN / FT, 'in/s']],
};
export function prefixFor(a, unit) {
  const S = SCALES[unit]; if (!S || !Number.isFinite(a) || a === 0) return [1, unit];
  for (const [k, name] of S) if (a >= k * 0.999) return [k, name];
  return S[S.length - 1];
}
export function prefixed(v, unit) { const [k, name] = prefixFor(Math.abs(v), unit); return [v / k, name]; }
/* A lab value of a kind, formatted in the current system: "3.71 m/s". digits fixes the decimals instead of the
   significant figures. The base unit stays put by default, so a reading that is plotted over time never switches
   from m/s to cm/s halfway; prefix: true picks a readable one for a single value. */
export function fmtQ(lab, kind, v, { digits, prefix = false, sigs = 3 } = {}) {
  if (!Number.isFinite(v)) return '—';
  const [k, u] = unitOf(lab, kind);
  let x = v * k, name = u;
  if (prefix) [x, name] = prefixed(x, u);
  return `${digits != null ? x.toFixed(digits) : sig(x, sigs)} ${name}`;
}
/* Two lengths, as a position, sharing one prefix. */
export function fmtPos(lab, x, y) {
  const [k, u] = unitOf(lab, 'len'), X = x * k, Y = y * k, [d, name] = prefixFor(Math.max(Math.abs(X), Math.abs(Y)), u);
  return `${sig(X / d)}, ${sig(Y / d)} ${name}`;
}
/* Decimals to show for a control's step once converted, so a slider moving in 10 px/s² steps shows 0.11 m/s². */
export function unitDecimals(lab, kind, step) {
  if (!step) return 2;
  const k = unitOf(lab, kind)[0], s = Math.abs(step * k);
  if (s >= 1) return 0;
  // Enough decimals to tell neighbouring steps apart; one more when a converted step starts with a 1 (10 px/s² is
  // 0.109 m/s², shown as 0.11), but not for a step the lab chose in these very units (0.01 m/s² stays 0.01).
  let d = Math.ceil(-Math.log10(s) - 1e-9);
  if (Math.abs(k - 1) > 1e-9 && s * Math.pow(10, d) < 2) d++;
  return Math.min(4, d);
}
