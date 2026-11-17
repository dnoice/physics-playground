/*
✒ Metadata
    - Title: Gravity Lab (digiSpace Edition - v2.19)
    - File Name: gravity.js
    - Relative Path: js/labs/gravity.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for easier selection: whether a click with Throw is on a
      body is judged where the bodies were at the press, with the hover ring's
      reach, so a moving body is followed rather than a new one dropped where
      it was. One pickBody through each view's projector picks, erases and
      rings in 2D and 3D; a click on a drawn orbit (and, with Select, a trail)
      follows its body; the selection contract and the list of bodies. The Pan
      tool, the Follow switch, the Zoom dial with its View group and Release
      camera are gone, the view controls doing each; Tilt marks joins Display.
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for worlds shaped by their distance from their stars:
      every world's climate from the light of every star (climate.js), kept up
      to date as bodies move and following the starlight with a lag; Inspect's
      starlight, temperature, air, climate and rotation rows and a star's
      luminosity; climate colours and heat glow in the flat view; temperature
      and starlight in the tracks; warmth kept by rewind and saved states. On
      Dennis's call for recordings shot like a film: interest() names close
      encounters, mergers, ejections, the fastest body, the heaviest body and
      its system, and each Solar System world with its moons; releaseCam() and
      retakeCam() set Follow and the followed body aside while the director
      films and hand them back after.
    - 2.17.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
      dataset's scene facts (G, softening, merging) and its bodies as a table,
      through the shared scene section.
    Earlier entries: see CHANGELOG.md

✒ Description:
    N-body Newtonian gravity stepped with a kick-drift-kick leapfrog in three
    dimensions, moons on their own substeps, with merging, escapes, an energy
    chart, a potential field view and click-to-follow.

✒ Key Features:
    - Full 3D dynamics: flat scenes add exact zeros and step bit-for-bit as in
      v1.3.
    - Eight scenes, including a Star system with every planet class and a
      moon on each giant, Tilted orbits with inclinations from 0° to 70° and a
      polar comet, and Our Solar System at J2000 from js/labs/solarsystem.js.
    - Multi-scale stepping: massless test bodies feel every pull and pull
      nothing, and each moon and its planet take their own substeps inside a
      step (r-RESPA), so Phobos and the Kuiper belt share one run.
    - Real-sized named worlds above a pixel floor, osculating orbits drawn as
      smooth curves that fade back round from each body, ranked names with a
      dark halo in 2D, and the date on the clock.
    - Zoom to suit the scene: Our Solar System zooms twice as far a step and
      reaches from a few thousand km to all of Sedna's orbit.
    - Planet classes from the research reference (terrestrial, super-Earth,
      sub-Neptune, ice giant, gas giant, then brown dwarf and star), each with
      a few colours a world picks from by its id, its surface in 3D and rings
      on some giants; By mass on the reference's boundaries, and mergers that
      keep their composition.
    - Physical models in Inspect: radius from the reference's mass-radius
      relation (or the real one), density, gravity, escape speed, Hill sphere,
      Roche limit and the IAU mass ratio.
    - Climate from starlight (climate.js): every star's light by its mass,
      equilibrium and surface temperature with a lag, air kept or lost, ice
      lines, day and night sides, tidal locking, and climates from molten to
      frozen, eyeball worlds and giants from ammonia bands to glowing; in
      Inspect, in both views and in the tracks.
    - Throws and drops that stay in the system: a drag throws at a share of
      the circular speed about what holds the point (90 px is a circular
      orbit's), at any zoom, and a click beside a giant gives it a moon.
    - New bodies: their mass, a chosen class that keeps the mass in its range,
      the drop speed in times the circular speed, and the tilt of new orbits;
      Random new bodies draws each class and mass instead, and the throw
      preview shows the body that will fly.
    - Readouts for energy drift, virial ratio, momentum and the range of orbit
      tilts.
    - Datasets and tracks carry z and vz; saved states and rewind keep the
      third dimension, each body's class and its metadata, and states from
      before the classes are classed again.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, drawSeries, seriesRange } from '../core/chart.js';
import { RAMP_HEAT, THEME } from '../core/color.js';
import { brushRing, drawLit, drawStar, followRing, hoverTag, rampRgb, segDist } from '../core/draw.js';

import { Series } from '../core/series.js';
import { fmtQ, sig, unitOf, unitSystem } from '../core/units.js';
import { TAU, clamp, fmtSI, rand } from '../core/util.js';
import { view } from '../core/view.js';
import { navAnim } from '../shell/camera.js';
import { setParam } from '../shell/lifecycle.js';

import { updateNav } from '../shell/navigator.js';
import { syncControl } from '../shell/panel.js';
import { HIT_PX, LINE_PX, PICK_PX, pickReach, ptr } from '../shell/stage.js';
import { gravity3d } from './gravity3d.js';
import { SKY_EPOCH, buildSolarSystem } from './solarsystem.js';
import { AGE_YR, AIRS, CLIMATES, DRAPER, KIND_ALBEDO, LOCK_YR, S_W, atmosphere, classify, eqTemp, heatCss, heatShare, iceLine, internalTemp, lockYears, luminosity, rigidity, shoreline, tintInto, yearsText } from './climate.js';
import { announce } from '../shell/state.js';

/* ================================================================== */
/*  Lab 1 · Gravity                                                    */
/* ================================================================== */
export const G0 = 5000;
export const LAUNCH_K = 1.6;
/* Pixels of drag that throw a body at the circular speed of the orbit it is thrown into: about 1.41 times as far
   escapes. Measured on the screen, so a throw means the same at every zoom, in every scene and in either view. */
export const THROW_PX = 90;
export const TRAIL_CAP = 1200;
export const BODY_CAP = 300;
export const STAR_MASS = 150;
/* Astronomy for real-world units: the Star system's third planet orbits at 1 AU and its star (mass 1000) is the Sun,
   at G = 1×. Kepler's third law then makes a year AU_YR simulated seconds, and fixes every speed. */
export const AU_PX = 135;
const AU_M = 1.495978707e11, YR_S = 31557600;
export const AU_YR = TAU * Math.sqrt(AU_PX ** 3 / (G0 * 1000));
const KMS = AU_M / AU_PX / (YR_S / AU_YR) / 1000;
export const bodyRadius = m => 1.5 + 1.65 * Math.cbrt(m);
export const massIdx = m => clamp(Math.round(70 + 185 * Math.log10(m + 1) / Math.log10(2001)), 0, 255);
export const massColor = m => RAMP_HEAT.css[massIdx(m)];
export const massRgb = m => rampRgb(RAMP_HEAT, massIdx(m));
/* Masses here are thousandths of the Sun's, so the Sun is 1000; Jupiter (JUP) and Earth (EARTH) in those units, from
   the IAU mass ratios. */
export const JUP = 1000 / 1047.348644, EARTH = 1000 / 332946.0487;
/* Planet classes, from the research reference (docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md): the five
   classes with the firmest empirical footing, then brown dwarfs above the deuterium-burning limit and stars above
   hydrogen burning. A body knows its class. me is the class's mass range in Earth masses (the reference's Table 5.2),
   which Random new bodies draws from, evenly in log; the ranges overlap where composition decides and mass cannot
   (a world of 6 Earth masses may be bare rock or carry a gas envelope). family is what a merger keeps: rock, or an
   envelope of gas. The odds lean on the reference's occurrence rates (sub-Neptunes, then super-Earths, are the most
   common planets found), with giants kept common enough for a random sky to show them. typ is the mass a chosen
   class starts from: Earth, LHS 1140 b, GJ 1214 b, Neptune and Jupiter (the reference's Table 5.1). The surface is
   the 3D world's: 0 rocky, 1 ocean, 2 banded. */
export const KINDS = {
  terrestrial: { label: 'Terrestrial planet', short: 'Terrestrial', me: [0.02, 1.5], typ: 1, rgb: [186, 140, 108], surface: 0, odds: 0.16, rank: 1, family: 'rock',
    hues: [[186, 140, 108], [154, 148, 142], [196, 118, 84], [214, 190, 146], [128, 116, 106]] },
  superEarth: { label: 'Super-Earth', short: 'Super-Earth', me: [1.5, 10], typ: 5.6, rgb: [168, 102, 80], surface: 0, odds: 0.2, rank: 2, family: 'rock',
    hues: [[168, 102, 80], [140, 130, 122], [184, 138, 92], [124, 100, 114]] },
  subNeptune: { label: 'Sub-Neptune', short: 'Sub-Neptune', me: [3, 15], typ: 8.17, rgb: [150, 166, 222], surface: 3, odds: 0.22, rank: 3, family: 'gas',
    hues: [[150, 166, 222], [176, 166, 218], [130, 190, 214], [170, 198, 188]] },
  ice: { label: 'Ice giant', short: 'Ice giant', me: [10, 40], typ: 17.15, rgb: [124, 214, 212], surface: 3, odds: 0.14, rank: 4, family: 'gas',
    hues: [[124, 214, 212], [90, 142, 226], [164, 222, 228], [104, 188, 168]] },
  gas: { label: 'Gas giant', short: 'Gas giant', me: [50, 4130], typ: 317.8, rgb: [224, 178, 122], surface: 2, odds: 0.2, rank: 5, family: 'gas',
    hues: [[224, 178, 122], [228, 206, 150], [214, 148, 102], [198, 182, 162], [206, 128, 96]] },
  brown: { label: 'Brown dwarf', short: 'Brown dwarf', m: [13 * JUP, 70], typ: 30 / EARTH, rgb: [178, 86, 80], surface: 2, odds: 0.08, rank: 6, family: 'gas',
    hues: [[178, 86, 80], [150, 70, 96], [194, 106, 72], [132, 64, 72]] },
  star: { label: 'Star', short: 'Star', surface: -1, rank: 7 },
  // The Solar System's moons and smaller worlds; with no odds they are never drawn at random or offered as a type.
  moon: { label: 'Moon', short: 'Moon', rgb: [168, 166, 160], surface: 0, rank: 0, hues: [[168, 166, 160], [214, 192, 108], [206, 214, 220], [138, 120, 102]] },
  dwarf: { label: 'Dwarf planet', short: 'Dwarf', rgb: [204, 186, 160], surface: 0, rank: 0 },
  asteroid: { label: 'Asteroid', short: 'Asteroid', rgb: [150, 138, 124], surface: 0, rank: 0 },
  icy: { label: 'Icy body', short: 'Icy', rgb: [176, 196, 212], surface: 0, rank: 0 },
  comet: { label: 'Comet', short: 'Comet', rgb: [206, 222, 236], surface: 0, rank: 0 },
};
for (const k of Object.values(KINDS)) if (k.me) k.m = k.me.map(v => v * EARTH);
/* 0.08 solar masses: hydrogen burning, above which a body is a star. */
export const STAR_LIMIT = 80;
/* By mass: the class a body of that mass most often is, on the reference's boundaries. 1.5 Earth masses tops the
   terrestrial planets; at 4.37 the measured mass-radius relation turns from bare rock to gas envelopes (Müller et al.
   2024), so heavier is a sub-Neptune rather than a super-Earth; 10 starts the ice giants, 50 (0.15 Jupiter masses)
   the gas giants, and 13 Jupiter masses, the deuterium-burning limit in the IAU's definition of a planet, the brown
   dwarfs. A rocky super-Earth up to 10 Earth masses can be chosen as a type, but mass alone cannot tell it. */
export const kindOf = m => (m > STAR_LIMIT ? 'star' : m >= 13 * JUP ? 'brown' : m >= 50 * EARTH ? 'gas' : m >= 10 * EARTH ? 'ice'
  : m >= 4.37 * EARTH ? 'subNeptune' : m >= 1.5 * EARTH ? 'superEarth' : 'terrestrial');
/* A merger keeps what its bodies were made of: rock stays rock, and a body with a gas envelope keeps one. The class
   then follows the new mass within that family, never down; brown dwarfs and stars follow mass outright. */
export function mergedKind(big, small, m) {
  // A small world (a moon, a dwarf planet, an asteroid, an icy body or a comet) that takes in another stays what it
  // was: its class is its place in the system, not its mass, so a moon hit by a comet is still a moon.
  if (!KINDS[big.kind].rank && !KINDS[small.kind].rank) return big.kind;
  const byMass = kindOf(m), up = k => (KINDS[k].rank > KINDS[big.kind].rank ? k : big.kind);
  if (byMass === 'star' || byMass === 'brown') return up(byMass);
  const gas = KINDS[big.kind].family === 'gas' || KINDS[small.kind].family === 'gas';
  return up(gas ? (m >= 50 * EARTH ? 'gas' : m >= 10 * EARTH ? 'ice' : 'subNeptune') : m >= 1.5 * EARTH ? 'superEarth' : 'terrestrial');
}
/* A class from a rewind snapshot or a saved state; the types from before the research classes (rocky and ocean
   worlds) are classed again, a moon as a moon and anything else by its mass. */
const storedKind = (k, m, meta) => (KINDS[k] ? k : meta && meta.hostId != null ? 'moon' : kindOf(m));
/* A planet's radius in Earth radii from its mass and class (the reference's Model 4.4.3). Rock follows the extended
   rocky branch, 1.03 M^0.29 (Otegi et al. 2020); worlds with an envelope the volatile branch, 0.56 M^0.67 (Müller et
   al. 2024). Gas giants take the volatile branch until it meets the degenerate one, whose slope (M^-0.06) is Müller's
   but whose height is not: his 18.6 fits a sample of hot, inflated giants, and the reference locks mature cold giants
   onto a curve of 0.9 to 1.15 Jupiter radii (Table 6.1, and its fifth hard constraint), so here the curve passes
   through Jupiter itself and stays in that band. Null where the reference gives no relation: brown dwarfs, stars and
   the small worlds. */
const R_EARTH_KM = 6371, R_JUP_KM = 71492, G_SI = 6.6743e-11, SIM_KG = 1.98847e27;
/* Each class's mass-radius branch, for Inspect to say which it used. */
const BRANCH = { terrestrial: 'rocky branch, 1.03 M^0.29', superEarth: 'rocky branch, 1.03 M^0.29', subNeptune: 'volatile branch, 0.56 M^0.67', ice: 'volatile branch, 0.56 M^0.67',
  gas: 'volatile branch, 0.56 M^0.67, then the degenerate one through Jupiter, held to 0.9 to 1.15 Jupiter radii for a mature cold giant' };
export function planetRadius(m, kind) {
  const M = m / EARTH;
  if (kind === 'terrestrial' || kind === 'superEarth') return 1.03 * M ** 0.29;
  if (kind === 'subNeptune' || kind === 'ice') return 0.56 * M ** 0.67;
  if (kind === 'gas') { const cold = R_JUP_KM / R_EARTH_KM * clamp((M / (JUP / EARTH)) ** -0.06, 0.9, 1.15); return M < 127 ? Math.min(0.56 * M ** 0.67, cold) : cold; }
  return null;
}
const hash01 = n => { let x = Math.imul(n + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
/* A body's colour: one of its type's hues, picked by its id, a shade lighter or darker in eight steps, so no two
   giants of a run need look alike while the 3D tint cache stays small (a few dozen colours a type). A star keeps
   the heat ramp of its mass, a world with a tint of its own (the Solar System's, a scene's) keeps that, and a real
   world without one its type's plain colour. Cached on the body until its type or id changes. */
export function bodyRgb(b) {
  if (b.kind === 'star') return massRgb(b.m);
  const key = b.kind + b.id;
  if (b.ck !== key) {
    const K = KINDS[b.kind], hues = !b.real && K.hues ? K.hues : [K.rgb];
    const k = b.tint ? 1 : 0.84 + 0.045 * Math.floor(hash01(b.id) * 8), base = b.tint || hues[Math.floor(hash01(b.id + 3301) * hues.length)];
    b.rgb = base.map(c => Math.min(255, Math.round(c * k))); b.css = `rgb(${b.rgb})`; b.ck = key;
  }
  return b.rgb;
}
/* Whether a world wears rings: as it was given (the Solar System's, a scene's), else about two gas giants in five,
   by id. Shared by the 2D and 3D views. */
export const ringed = b => (typeof b.ring === 'boolean' ? b.ring : b.kind === 'gas' && hash01(b.id + 9001) < 0.4);
export const bodyCss = b => (b.kind === 'star' ? massColor(b.m) : (bodyRgb(b), b.css));
/* A body's name: its own, for the Solar System's, else its number; and the same as a thing to measure from. */
export const nameOf = b => b.name || `Body ${b.id}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const refName = P => (P.name ? (P.name === 'Sun' || P.name === 'Moon' ? `the ${P.name}` : P.name) : P.kind === 'star' ? 'the star' : `Body ${P.id}`);
/* A body with no trail shares one empty buffer, and the trail code passes it by. */
const NO_TRAIL = new Float32Array(0);
/* Picking's scratch, reused so a hover or a press allocates nothing per body: a body's place on the stage, the line
   nearest a point, and the last line found (a point and its time), which the cursor and the hover ring share. */
const SPOT = { x: 0, y: 0, r: 0, w: 0 }, NEAR = { d: 0, b: null }, LINE = { x: NaN, y: NaN, at: 0, trails: false, b: null };
/* The Delete brush's reach in stage pixels, in both views. */
const ERASE_PX = 14;
/* What makes a body one of the Solar System's: its name and kind of world, its own colour, its real radius in stage
   pixels and the smallest size it is drawn at, whether it is labelled, ringed or trail-less, and the id of the body
   it orbits. Kept as one object, so rewind snapshots and saved states carry it whole. */
function applyMeta(b, meta) {
  b.meta = meta;
  if (meta.name) b.name = meta.name;
  if (meta.desc) b.desc = meta.desc;
  if (meta.tint) b.tint = meta.tint;
  if (meta.r != null) b.r = meta.r;
  if (meta.px) b.px = meta.px;
  if (meta.surface != null) b.surface = meta.surface;
  b.real = !!meta.real; b.label = !!meta.label; b.ring = !!meta.ring; b.noTrail = !!meta.noTrail;
}
/* A saved state's meta, checked field by field, since a state file is only text. */
function cleanMeta(m) {
  if (!m || typeof m !== 'object') return null;
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined), num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : undefined);
  const tint = Array.isArray(m.tint) && m.tint.length === 3 && m.tint.every(c => Number.isFinite(+c)) ? m.tint.map(c => clamp(Math.round(+c), 0, 255)) : undefined;
  return { name: str(m.name, 40), desc: str(m.desc, 80), tint, r: num(m.r, 1e-9, 1e4), px: num(m.px, 0.5, 12), surface: [0, 1, 2, 3].includes(m.surface) ? m.surface : undefined, real: !!m.real, label: !!m.label, ring: !!m.ring, noTrail: !!m.noTrail, hostId: num(m.hostId, 0, 1e9),
    albedo: num(m.albedo, 0, 1), air: ['none', 'thin', 'air', 'thick'].includes(m.air) ? m.air : undefined };
}
/* Moons find their planets by id once every body of a scene, a rewind or a saved state exists. */
function linkHosts(B) {
  const byId = new Map(B.map(b => [b.id, b]));
  for (const b of B) b.host = b.meta && b.meta.hostId != null ? byId.get(b.meta.hostId) || null : null;
}

export const gravity = {
  id: 'gravity', name: 'Gravity', title: 'N-body gravity',
  rig3: { plane: 'floor' },
  // Wide enough to frame Sedna and to find Charon beside Pluto in the Solar System.
  zoomRange: [0.002, 20000],
  eq: 'F = Gm<sub>1</sub>m<sub>2</sub> / r<sup>2</sup>',
  eqTex: 'F = G\\,\\frac{m_1 m_2}{r^2}',
  aria: 'Gravity simulation: bodies orbiting under mutual Newtonian attraction',
  blurb: 'Newtonian gravity between every pair of bodies, stepped with a kick-drift-kick leapfrog that keeps orbital energy from creeping away. Throw bodies, build systems, and watch the three-body figure-eight hold its choreography.',
  interact: [
    '<b>Throw</b>: drag to launch a body along the dashed 5-second preview, or click empty sky to drop one into orbit around the heaviest mass: a circle at a drop speed of 1×, an ellipse slower or faster.',
    '<b>Random</b>, under the tools, gives each body you place a random planet class (terrestrial, super-Earth, sub-Neptune, ice giant or gas giant, now and then a brown dwarf) and a mass in that class\'s range. Off, the type and mass come from New bodies in Controls, where a chosen type keeps the mass within its range.',
    '<b>Planet classes</b> follow the research reference: by mass, a world under 1.5 Earth masses is terrestrial, then a super-Earth to 4.4, a sub-Neptune to 10, an ice giant to 50 and a gas giant to 13 Jupiter masses, where brown dwarfs begin. Follow a planet to read its radius, density, gravity and escape speed in Inspect.',
    '<b>Climate</b> follows starlight: every star warms each world by its brightness over the square of its distance. Close in, rock melts and tides turn one face to the star; inside the runaway limit oceans boil into a pale, Venus-like sky; where water stays liquid come oceans and clouds; farther out ice caps spread until the world freezes over. Giants darken and glow when hot and turn pale when cold. Follow a world to read its starlight, temperatures, air, climate and spin in Inspect.',
    '<b>Click a body</b>, its orbit or its trail to follow it with the camera, then zoom in to see its sunlit face. Click the body again, or press Follow in the view controls, to let go. <b>Select</b> (Q) in the view controls makes every click a pick, so nothing is thrown by mistake, and Inspect lists every body.',
    '<b>Delete</b> removes bodies you click or brush over. The hand in the view controls, or Space-drag, pans the view. Hover a body to read its name, mass and speed.',
    '<b>Our Solar System</b>: click a planet to follow it, then zoom in; its moons appear once they stand clear of it. <b>Orbits</b> and <b>Names</b> under Display draw each named body\'s ellipse and name, and the clock reads the date.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'throw', label: 'Throw', key: 't', icon: 'throw', hint: 'Drag to throw a body · click empty sky to drop one into orbit · click a body to follow it' },
    { id: 'erase', label: 'Delete', key: 'x', icon: 'erase', hint: 'Click or brush over bodies to delete them' },
  ] },
  // follow and zoom are the camera's own state, kept in saved states and set by each scene; the rail's Follow and zoom
  // controls change them. marks draws the 3D view's drop lines and foot rings.
  p: { tool: 'throw', G: 1, soft: 4, launchMass: 2, kind: 'auto', rand: false, orbitK: 1, merge: true, trails: true, trailLen: 360, follow: true, zoom: 1, vectors: false, field: false, incl: 0, orbits: false, labels: true, marks: true },
  random: { key: 'rand', label: 'Random new bodies', tip: 'Random new bodies: each one you place gets a random planet type and mass' },
  presetId: 'solar',
  presets: [
    // Softening of 1 px: close passes end in a merge well before it matters, and the giants' moons, a few pixels out,
    // feel their planet's full pull (at 4 px it fell to half, and the star's tides pulled the moons loose).
    { id: 'solar', label: 'Star system', params: { incl: 0, G: 1, soft: 1, merge: true, zoom: 0.6, follow: true, orbits: false } },
    // Our own: real masses, sizes and orbits, with softening far below any distance in it (a few hundred km). Its
    // centre of mass is built at rest, so following it adds nothing; left off, the wheel zooms toward the cursor.
    { id: 'sol', label: 'Our Solar System', params: { incl: 0, G: 1, soft: 0.0001, merge: true, zoom: 0.28, follow: false, orbits: true, labels: true } },
    { id: 'kepler', label: 'Kepler ellipses', params: { incl: 0, G: 1, soft: 0.5, merge: true, zoom: 0.8, follow: true, orbits: false } },
    { id: 'binary', label: 'Binary star', params: { incl: 0, G: 1, soft: 4, merge: true, zoom: 0.7, follow: true, orbits: false } },
    { id: 'figure8', label: 'Figure-eight', params: { incl: 0, G: 1, soft: 0.5, merge: false, zoom: 1.4, follow: true, orbits: false } },
    { id: 'disk', label: 'Accretion disk', params: { incl: 0, G: 1, soft: 4, merge: true, zoom: 0.9, follow: true, orbits: false } },
    { id: 'tilted', label: 'Tilted orbits', params: { G: 1, soft: 4, merge: true, zoom: 0.85, follow: true, incl: 40, orbits: false } },
    { id: 'empty', label: 'Empty sky', params: { incl: 0, zoom: 1, follow: true, orbits: false } },
  ],
  groups: [
    { id: 'physics', label: 'Physics', icon: 'balance' },
    { id: 'spawn', label: 'New bodies', icon: 'add_circle' },
    { id: 'display', label: 'Display', icon: 'visibility' },
  ],
  controls: [
    { type: 'range', key: 'G', label: 'Gravity strength G', min: 0.1, max: 4, step: 0.05, fmt: v => v.toFixed(2) + '×', group: 'physics' },
    { type: 'range', key: 'soft', label: 'Softening length ε', min: 0.0001, max: 30, log: true, qty: 'len', group: 'physics', note: 'Keeps close passes finite. The Solar System needs almost none: its moons sit a fraction of a pixel from their planets.' },
    // Down to the lightest terrestrial planet the reference admits (0.02 Earth masses), up to stars.
    { type: 'range', key: 'launchMass', label: 'Mass of new bodies', min: 0.02 * EARTH, max: 2000, log: true, note: 'The star in most scenes weighs 1000 here, one solar mass; Jupiter is about 1 and Earth 0.003. A chosen type keeps the mass within its range.',
      fmt: v => (unitSystem() === 'sim' ? v.toPrecision(3).replace(/\.?0+$/, '') : gravity.massText(v, true)), group: 'spawn' },
    { type: 'range', key: 'trailLen', label: 'Trail length', min: 20, max: TRAIL_CAP, step: 10, fmt: v => (v / 60).toFixed(1) + ' s', group: 'display' },
    { type: 'toggle', key: 'merge', label: 'Merge bodies on contact', group: 'physics', short: 'Merge on contact' },
    { type: 'toggle', key: 'trails', label: 'Show trails', group: 'display', short: 'Trails' },
    { type: 'toggle', key: 'vectors', label: 'Show velocity vectors', group: 'display', short: 'Velocity vectors' },
    { type: 'toggle', key: 'field', label: 'Show potential field', group: 'display', short: 'Potential field' },
    { type: 'toggle', key: 'orbits', label: 'Show each named body\'s orbit about what it circles', short: 'Orbits', group: 'display' },
    { type: 'toggle', key: 'labels', label: 'Show names of named bodies', short: 'Names', group: 'display' },
    { type: 'toggle', key: 'marks', label: 'Show a drop line and a foot ring under each body, to the orbital plane', short: 'Tilt marks', group: 'display' },
    { type: 'range', key: 'orbitK', label: 'Speed of dropped bodies', min: 0.5, max: 1.5, step: 0.01, fmt: v => v.toFixed(2) + '×',
      note: 'At 1× a dropped body circles its host; slower falls into an ellipse inside, faster swings out, and √2 ≈ 1.41× escapes.', group: 'spawn' },
    { type: 'range', key: 'incl', label: 'Tilt of new orbits', min: 0, max: 90, step: 1, unit: '°', note: 'Bodies dropped with a click or added from the panel get a random tilt up to this angle.', group: 'spawn' },
    { type: 'seg', key: 'kind', label: 'Type of new bodies', options: [['auto', 'By mass'], ...Object.entries(KINDS).filter(([, k]) => k.odds).map(([id, k]) => [id, k.short])], group: 'spawn' },
    { type: 'toggle', key: 'rand', label: 'Random new bodies: a random planet type and mass for each one placed', short: 'Random type and mass', group: 'spawn' },
  ],
  actions: [
    { label: 'Add an orbiting body', run() { gravity.addRandom(); } },
    { label: 'Clear trails', run() { for (const b of gravity.bodies) { b.tn = 0; b.th = 0; } } },
  ],
  bodies: [], cam: { x: 0, y: 0, z: 1 }, aim: null, pan: null, erasing: false, viewXf: { ox: 0, oy: 0, z: 1 }, track: null, trackEase: 0,
  selfCam: true, screenInput: true,
  E0: 0, E: 0, KE: 0, PE: 0, Kint: 0, Eint: 0, merged: 0, escaped: 0, stepCount: 0, uid: 0, accDirty: true, lastSample: -1,
  series: { ke: new Series(400), pe: new Series(400), e: new Series(400), kint: new Series(400) }, fld: null, fldClock: 0,
  stars: Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), a: rand(0.06, 0.32), s: Math.random() < 0.12 ? 2 : 1 })),
  dt() { return 1 / 480; }, maxSteps: 96,

  /* z and vz carry motion out of the orbital plane. A body with z = vz = 0
     adds exact zeros to every sum below, so flat scenes step bit-for-bit as
     they did in two dimensions. */
  body(x, y, vx, vy, m, z = 0, vz = 0, kind = null, meta = null) {
    const id = ++this.uid, b = { x, y, z, vx, vy, vz, ax: 0, ay: 0, az: 0, fx: 0, fy: 0, fz: 0, m, r: bodyRadius(m), kind: kind || kindOf(m), trail: NO_TRAIL, trailZ: NO_TRAIL, tn: 0, th: 0, dead: false, id };
    if (meta) applyMeta(b, meta);
    if (!b.noTrail) { b.trail = new Float32Array(TRAIL_CAP * 2); b.trailZ = new Float32Array(TRAIL_CAP); }
    return b;
  },
  /* The mass and type of the next body placed: drawn at random with Random new bodies on, else the panel's. */
  drawNew() {
    if (!this.p.rand) {
      // A chosen class keeps the body inside its mass range: the reference's controls never let mass and class disagree.
      const kind = this.p.kind === 'auto' ? null : this.p.kind, r = kind && KINDS[kind].m;
      return { m: r ? clamp(this.p.launchMass, r[0], r[1]) : this.p.launchMass, kind };
    }
    let u = Math.random() * Object.values(KINDS).reduce((t, k) => t + (k.odds || 0), 0), kind = 'gas';
    for (const [id, k] of Object.entries(KINDS)) if (k.odds && (u -= k.odds) < 0) { kind = id; break; }
    const [a, b] = KINDS[kind].m;
    return { m: Number((a * Math.pow(b / a, Math.random())).toPrecision(3)), kind };
  },
  /* How the body about to be placed looks, for the throw preview. */
  nextLook() {
    const nb = this.next || this.drawNew(), b = { m: nb.m, kind: nb.kind || kindOf(nb.m), id: this.uid + 1 };
    return { css: bodyCss(b), r: bodyRadius(nb.m) };
  },
  surfaceOf(b) { return b.surface ?? KINDS[b.kind].surface; },
  vCirc(M, d) { const G = G0 * this.p.G, e2 = this.p.soft * this.p.soft; return Math.sqrt(G * M * d * d / Math.pow(d * d + e2, 1.5)); },
  orbit(host, d, ang, m, dir = 1, kind = null, meta = null) {
    const v = this.vCirc(host.m + m, d);
    const b = this.body(host.x + d * Math.cos(ang), host.y + d * Math.sin(ang), host.vx - dir * v * Math.sin(ang), host.vy + dir * v * Math.cos(ang), m, 0, 0, kind, meta);
    this.bodies.push(b); return b;
  },
  /* A circular orbit tilted by inc about its line of nodes, which points at longitude node. */
  orbitTilted(host, d, ang, m, inc, node, dir = 1) {
    const v = this.vCirc(host.m + m, d), ci = Math.cos(inc), si = Math.sin(inc), cn = Math.cos(node), sn = Math.sin(node);
    const px = d * Math.cos(ang), py = d * Math.sin(ang) * ci, pz = d * Math.sin(ang) * si;
    const ux = -dir * v * Math.sin(ang), uy = dir * v * Math.cos(ang) * ci, uz = dir * v * Math.cos(ang) * si;
    const b = this.body(host.x + px * cn - py * sn, host.y + px * sn + py * cn, host.vx + ux * cn - uy * sn, host.vy + ux * sn + uy * cn, m, host.z + pz, host.vz + uz);
    this.bodies.push(b); return b;
  },
  build(preset) {
    const B = this.bodies = [];
    this.merged = 0; this.escaped = 0; this.aim = null; this.pan = null; this.lastSample = -1;
    for (const s of Object.values(this.series)) s.clear();
    if (preset === 'solar') {
      // A system of every class, each world its own: a hot grey rock on an eccentric orbit, a super-Earth inside the runaway limit (a
      // Venus-like hothouse once its climate settles), an
      // ocean world at 1 AU (whose year is the metric year), a lavender sub-Neptune, a banded giant, a pale ringed
      // giant and a deep blue ice giant, each giant with a moon about a third of the way out to the edge of its Hill
      // sphere. Neighbouring giants sit at least four of their mutual Hill radii apart even at closest approach, so
      // the system holds together run after run.
      const star = this.body(0, 0, 0, 0, 1000); B.push(star);
      const world = (d, me, kind, tint, surface, e, ring = false) => {
        const b = this.orbit(star, d, rand(0, TAU), me * EARTH, 1, kind, { tint, surface, ring });
        // Started at periapsis: √(1 + e) times the circular speed draws an ellipse of eccentricity e.
        const k = Math.sqrt(1 + e); b.vx = star.vx + (b.vx - star.vx) * k; b.vy = star.vy + (b.vy - star.vy) * k;
        return b;
      };
      const moon = (pl, d, tint) => this.orbit(pl, d, rand(0, TAU), 0.1 * EARTH, 1, 'moon', { tint });
      world(50, 0.35, 'terrestrial', [158, 148, 140], 0, 0.15);
      world(85, 4, 'superEarth', [182, 106, 78], 0, 0.05);
      world(135, 1, 'terrestrial', [72, 136, 216], 1, 0.02);
      world(175, 7, 'subNeptune', [172, 162, 226], 3, 0.04);
      const jove = world(250, JUP / EARTH, 'gas', [224, 176, 120], 2, 0.03);
      moon(jove, 5.5, [214, 190, 104]);
      const ringer = world(370, 0.32 * JUP / EARTH, 'gas', [228, 206, 150], 2, 0.03, true);
      moon(ringer, 6.2, [204, 160, 90]);
      const ice = world(470, 16, 'ice', [92, 146, 228], 3, 0.02);
      moon(ice, 4.4, [206, 214, 220]);
      // A comet on a long ellipse through the inner system, massless as Halley's is in the Solar System: it feels
      // every pull and pulls on nothing. At a third of a moon's mass, a close pass used to knock a moon off its orbit
      // and into its planet, in about one run in forty. It starts at aphelion, between the ringed giant and the ice
      // giant, so its first dive past the inner worlds comes a few seconds in rather than among them at the start.
      const a = 240, e = 0.82, w = rand(0, TAU), G = G0 * this.p.G, ra = a * (1 + e), va = Math.sqrt(G * 1000 * (1 - e) / ra);
      B.push(this.body(ra * Math.cos(w), ra * Math.sin(w), -va * Math.sin(w), va * Math.cos(w), 0, 0, 0, 'comet'));
    } else if (preset === 'kepler') {
      const star = this.body(0, 0, 0, 0, 1000); B.push(star);
      const a = 210, G = G0 * this.p.G;
      [[0, 0], [0.45, 2.1], [0.75, 4.2]].forEach(([e, w]) => {
        const rp = a * (1 - e), vp = Math.sqrt(G * (1000 + 0.05) * (1 + e) / (a * (1 - e)));
        B.push(this.body(rp * Math.cos(w), rp * Math.sin(w), -vp * Math.sin(w), vp * Math.cos(w), 0.05));
      });
    } else if (preset === 'binary') {
      const M = 400, d = 150, G = G0 * this.p.G, e2 = this.p.soft ** 2;
      const vrel = Math.sqrt(G * 2 * M * d * d / Math.pow(d * d + e2, 1.5));
      B.push(this.body(-d / 2, 0, 0, -vrel / 2, M), this.body(d / 2, 0, 0, vrel / 2, M));
      const com = this.body(0, 0, 0, 0, 2 * M);
      for (const [r, m] of [[330, 2], [420, 5]]) this.orbit(com, r, rand(0, TAU), m);
    } else if (preset === 'figure8') {
      const L = 140, m = 300, G = G0 * this.p.G, T = Math.sqrt(L * L * L / (G * m)), V = L / T;
      const x1 = 0.97000436, y1 = -0.24308753, vx = 0.466203685, vy = 0.43236573;
      B.push(this.body(x1 * L, y1 * L, vx * V, vy * V, m), this.body(-x1 * L, -y1 * L, vx * V, vy * V, m), this.body(0, 0, -2 * vx * V, -2 * vy * V, m));
    } else if (preset === 'tilted') {
      const star = this.body(0, 0, 0, 0, 1000); B.push(star);
      [[80, 0, 0.5], [130, 10, 1], [190, 25, 1.5], [260, 45, 0.8], [340, 70, 2]].forEach(([d, inc, m]) => this.orbitTilted(star, d, rand(0, TAU), m, inc * Math.PI / 180, rand(0, TAU)));
      const a = 230, e = 0.7, rp = a * (1 - e), vp = Math.sqrt(G0 * this.p.G * 1000 * (1 + e) / rp), ci = Math.cos(1.2), si = Math.sin(1.2);
      // The polar comet, massless and classed as a comet (at 0.01 it weighed three Earths and counted as a super-Earth).
      B.push(this.body(rp, 0, 0, vp * ci, 0, 0, vp * si, 'comet'));
    } else if (preset === 'disk') {
      const core = this.body(0, 0, 0, 0, 600); B.push(core);
      for (let i = 0; i < 140; i++) {
        const d = Math.sqrt(rand(70 * 70, 340 * 340)), m = Math.pow(10, rand(-0.7, 0.6));
        const b = this.orbit(core, d, rand(0, TAU), m), k = rand(0.9, 1.1); b.vx *= k; b.vy *= k;
      }
    } else if (preset === 'sol') {
      buildSolarSystem(this, { G: G0 * this.p.G, AU: AU_PX, SUN: 1000 });
      linkHosts(B);
    }
    this.zeroMomentum();
    this.cam.x = 0; this.cam.y = 0; this.cam.z = this.p.zoom; this.track = null;
    this.accDirty = true; this.prepare();
    if (this.cam3) this.frame3(true);
    this.E0 = this.energy();
    this.climateAll(0, true);
  },
  zeroMomentum() {
    let M = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0;
    for (const b of this.bodies) { M += b.m; px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    if (!M) return;
    for (const b of this.bodies) { b.vx -= px / M; b.vy -= py / M; b.vz -= pz / M; b.x -= cx / M; b.y -= cy / M; b.z -= cz / M; }
  },
  /* The force lists, rebuilt whenever bodies come or go: the sources (bodies with mass), the massless test bodies
     (the belts: they feel every source and pull nothing), and the moons, which take substeps about their planets,
     with as many substeps a step as the fastest moon's orbit needs. */
  srcs: [], tests: [], moons: [], sats: new Map(), fastBodies: [], sub: 0, sky: false,
  prepare() {
    const B = this.bodies, live = new Set(B), G = G0 * this.p.G;
    this.srcs = []; this.tests = []; this.moons = []; this.sats = new Map(); this.sky = false;
    for (const b of B) {
      (b.m > 0 ? this.srcs : this.tests).push(b);
      if (b.real) this.sky = true;
      // A moon's host is another live body heavier than it. That rules out a self-host (a zero-length orbit that
      // would hold the substeps at their cap) and a cycle (a pair pulled twice in the substeps), whether they come
      // from a tampered saved state or a merge that left a moon heavier than its planet.
      if (b.host && (!live.has(b.host) || b.host === b || !(b.host.m > b.m))) b.host = null;
      b.fast = false;
    }
    // And a host is not itself a moon: the substeps hold one level of pairs. Links are only ever cut here, so each one
    // kept has a host that stays top-level.
    for (const b of B) if (b.host && b.host.host) b.host = null;
    let Tmin = Infinity;
    for (const b of B) {
      if (!b.host) continue;
      const h = b.host, mu = G * (h.m + b.m), r = Math.hypot(b.x - h.x, b.y - h.y, b.z - h.z);
      if (!(mu > 0)) { b.host = null; continue; }
      this.moons.push(b); b.fast = true; h.fast = true;
      if (this.sats.has(h)) this.sats.get(h).push(b); else this.sats.set(h, [b]);
      Tmin = Math.min(Tmin, TAU * Math.sqrt(r * r * r / mu));
    }
    this.fastBodies = B.filter(b => b.fast);
    // At least 150 substeps to a turn of the fastest moon (Phobos takes about 80 a step); the cap keeps a stray close
    // pair from stalling the run.
    this.sub = this.moons.length ? clamp(Math.ceil(this.dt() * 150 / Tmin), 1, 256) : 0;
  },
  computeAcc() {
    if (this.accDirty) this.prepare();
    const S = this.srcs, T = this.tests, n = S.length, nest = this.sub > 0, G = G0 * this.p.G, e2 = this.p.soft * this.p.soft, merge = this.p.merge;
    let merges = null;
    for (const b of this.bodies) { b.ax = 0; b.ay = 0; b.az = 0; }
    for (let i = 0; i < n; i++) {
      const a = S[i];
      for (let j = i + 1; j < n; j++) {
        const b = S[j], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, r2 = dx * dx + dy * dy + dz * dz;
        if (merge) { const rr = (a.r + b.r) * 0.7; if (r2 < rr * rr) (merges || (merges = [])).push(a, b); }
        // A moon and its planet pull on each other in the substeps instead.
        if (nest && (a.host === b || b.host === a)) continue;
        const d2 = r2 + e2, inv = G / (d2 * Math.sqrt(d2));
        a.ax += dx * inv * b.m; a.ay += dy * inv * b.m; a.az += dz * inv * b.m; b.ax -= dx * inv * a.m; b.ay -= dy * inv * a.m; b.az -= dz * inv * a.m;
      }
    }
    for (const t of T) {
      for (const a of S) {
        const dx = a.x - t.x, dy = a.y - t.y, dz = a.z - t.z, r2 = dx * dx + dy * dy + dz * dz;
        if (merge) { const rr = (a.r + t.r) * 0.7; if (r2 < rr * rr) (merges || (merges = [])).push(a, t); }
        if (nest && t.host === a) continue;
        const d2 = r2 + e2, inv = G / (d2 * Math.sqrt(d2));
        t.ax += dx * inv * a.m; t.ay += dy * inv * a.m; t.az += dz * inv * a.m;
      }
    }
    this.accDirty = false;
    return merges;
  },
  /* The moons' fast pull: each moon and its planet, on each other, for the substeps. */
  fastAcc() {
    const G = G0 * this.p.G, e2 = this.p.soft * this.p.soft;
    for (const b of this.fastBodies) { b.fx = 0; b.fy = 0; b.fz = 0; }
    for (const m of this.moons) {
      const h = m.host, dx = h.x - m.x, dy = h.y - m.y, dz = h.z - m.z, d2 = dx * dx + dy * dy + dz * dz + e2, inv = G / (d2 * Math.sqrt(d2));
      m.fx += dx * inv * h.m; m.fy += dy * inv * h.m; m.fz += dz * inv * h.m; h.fx -= dx * inv * m.m; h.fy -= dy * inv * m.m; h.fz -= dz * inv * m.m;
    }
  },
  /* The drift of a step, for a system with moons, in the manner of r-RESPA: inside the half kicks of every other
     force, the moons and their planets take sub leapfrog substeps under their mutual pull alone. Every other body
     feels no fast force, so its velocity holds through the substeps and one drift of the whole step is the same.
     The scheme stays symplectic and time-reversible, so energy keeps oscillating instead of drifting. */
  substep(dt) {
    const F = this.fastBodies, K = this.sub, hs = dt / K, hh = hs * 0.5;
    for (const b of this.bodies) if (!b.fast) { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; }
    this.fastAcc();
    for (let k = 0; k < K; k++) {
      for (const b of F) { b.vx += b.fx * hh; b.vy += b.fy * hh; b.vz += b.fz * hh; b.x += b.vx * hs; b.y += b.vy * hs; b.z += b.vz * hs; }
      this.fastAcc();
      for (const b of F) { b.vx += b.fx * hh; b.vy += b.fy * hh; b.vz += b.fz * hh; }
    }
  },
  step(dt) {
    const B = this.bodies;
    if (!B.length) return;
    if (this.accDirty) this.computeAcc();
    const h = dt * 0.5;
    if (this.sub) { for (const b of B) { b.vx += b.ax * h; b.vy += b.ay * h; b.vz += b.az * h; } this.substep(dt); }
    else for (const b of B) { b.vx += b.ax * h; b.vy += b.ay * h; b.vz += b.az * h; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; }
    const merges = this.computeAcc();
    for (const b of B) { b.vx += b.ax * h; b.vy += b.ay * h; b.vz += b.az * h; }
    if (merges) this.mergeBodies(merges);
    if (++this.stepCount % 8 === 0) {
      for (const b of this.bodies) { if (b.noTrail) continue; b.trail[b.th * 2] = b.x; b.trail[b.th * 2 + 1] = b.y; b.trailZ[b.th] = b.z; b.th = (b.th + 1) % TRAIL_CAP; if (b.tn < TRAIL_CAP) b.tn++; }
      if (this.stepCount % 480 === 0) this.cullEscapes();
    }
  },
  mergeBodies(list) {
    const before = this.energy();
    for (let k = 0; k < list.length; k += 2) {
      const a = list[k], b = list[k + 1];
      if (a.dead || b.dead) continue;
      const [big, small] = a.m >= b.m ? [a, b] : [b, a], m = big.m + small.m;
      big.x = (big.x * big.m + small.x * small.m) / m; big.y = (big.y * big.m + small.y * small.m) / m; big.z = (big.z * big.m + small.z * small.m) / m;
      big.vx = (big.vx * big.m + small.vx * small.m) / m; big.vy = (big.vy * big.m + small.vy * small.m) / m; big.vz = (big.vz * big.m + small.vz * small.m) / m;
      // A real world grows by volume; the drawn worlds keep the radius their mass gives them.
      big.m = m; big.r = big.real ? Math.cbrt(big.r ** 3 + small.r ** 3) : bodyRadius(m); small.dead = true; this.merged++;
      // A merger keeps its family and moves up a class as its mass grows: rock into a super-Earth, an envelope into an
      // ice or gas giant, gas giants into brown dwarfs, brown dwarfs into stars. The Solar System's worlds stay named.
      if (!big.real) big.kind = mergedKind(big, small, m);
      if (small.id === this.track) this.track = big.id;
    }
    this.bodies = this.bodies.filter(b => !b.dead);
    // Move the baseline by what the merge took away, so numerical gain stays visible as drift.
    this.accDirty = true; this.E0 += this.energy() - before;
  },
  /* Bodies this far from the centre of mass have left: 6000 px (44 AU) in a drawn system, 200 000 px (about
     1500 AU) in the Solar System, whose Kuiper belt, Eris and Sedna lie well beyond the first. */
  cullR() { return this.sky ? 2e5 : 6000; },
  cullEscapes() {
    const B = this.bodies; if (B.length < 2) return;
    let M = 0, cx = 0, cy = 0, cz = 0;
    for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    cx /= M; cy /= M; cz /= M;
    const R = this.cullR(), keep = B.filter(b => (b.x - cx) ** 2 + (b.y - cy) ** 2 + (b.z - cz) ** 2 < R * R);
    if (keep.length !== B.length) { const before = this.energy(); this.escaped += B.length - keep.length; this.bodies = keep; this.accDirty = true; this.E0 += this.energy() - before; }
  },
  /* Energies now. KE and E are totals, and E0 is measured the same way; Kint leaves out the kinetic energy of the
     system's drift as a whole, |P|²/2M, which a thrown or dropped body adds and which binds nothing, so the virial
     ratio and whether the system is bound are judged in the centre-of-mass frame. */
  energy() {
    const B = this.bodies, G = G0 * this.p.G, e2 = this.p.soft * this.p.soft;
    let ke = 0, pe = 0, M = 0, px = 0, py = 0, pz = 0;
    // Massless bodies carry no energy or momentum; only the sources' pairs hold potential energy.
    const S = B.length && B.some(b => b.m === 0) ? B.filter(b => b.m > 0) : B;
    for (let i = 0; i < S.length; i++) {
      const a = S[i]; ke += 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy + a.vz * a.vz);
      M += a.m; px += a.m * a.vx; py += a.m * a.vy; pz += a.m * a.vz;
      for (let j = i + 1; j < S.length; j++) { const b = S[j]; pe -= G * a.m * b.m / Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2 + e2); }
    }
    const kcm = M ? (px * px + py * py + pz * pz) / (2 * M) : 0;
    this.KE = ke; this.PE = pe; this.E = ke + pe; this.Kint = Math.max(0, ke - kcm); this.Eint = this.Kint + pe;
    return this.E;
  },
  after(simDt) {
    if (this.t - this.lastSample >= 0.1) {
      this.lastSample = this.t; this.energy();
      this.series.ke.push(this.t, this.KE); this.series.pe.push(this.t, this.PE); this.series.e.push(this.t, this.E); this.series.kint.push(this.t, this.Kint);
    }
    this.watchOrbit();
    this.climate(simDt);
  },
  /* Kepler's period, measured for the Math page: the angle the followed (or heaviest) planet sweeps about its
     reference body, taken in its own orbital plane so tilted and polar orbits count too, summed once a frame. Each
     full turn gives a period to set beside 2π√(a³/μ). A new body, reference, mass, setting or a rewind starts over. */
  kepW: null, kepT: NaN, kepFast: false,
  watchOrbit() {
    const o = this.orbitOf();
    if (!o) { this.kepW = null; this.kepT = NaN; return; }
    const rx = o.b.x - o.P.x, ry = o.b.y - o.P.y, rz = o.b.z - o.P.z, key = `${o.b.id}|${o.P.id}|${o.b.m}|${o.P.m}|${this.p.G}|${this.p.soft}`;
    const w = this.kepW;
    if (!w || w.key !== key || this.t < w.t) { this.kepW = { key, t: this.t, rx, ry, rz, acc: 0, t0: this.t }; if (!w || w.key !== key) { this.kepT = NaN; this.kepFast = false; } return; }
    // A frame that covers more than a fifth of the orbit cannot follow its angle (Io turns in 0.02 s); say so and
    // start over, rather than count a wrong turn.
    if (Number.isFinite(o.a) && this.t - w.t > 0.2 * TAU * Math.sqrt(o.a ** 3 / o.mu)) { this.kepFast = true; Object.assign(w, { t: this.t, rx, ry, rz, acc: 0, t0: this.t }); return; }
    if (this.t > w.t) this.kepFast = false;
    const cx = w.ry * rz - w.rz * ry, cy = w.rz * rx - w.rx * rz, cz = w.rx * ry - w.ry * rx;
    const hx = ry * (o.b.vz - o.P.vz) - rz * (o.b.vy - o.P.vy), hy = rz * (o.b.vx - o.P.vx) - rx * (o.b.vz - o.P.vz), hz = rx * (o.b.vy - o.P.vy) - ry * (o.b.vx - o.P.vx);
    const sgn = cx * hx + cy * hy + cz * hz >= 0 ? 1 : -1, d = Math.atan2(sgn * Math.hypot(cx, cy, cz), w.rx * rx + w.ry * ry + w.rz * rz);
    if (w.acc + d >= TAU && d > 0) {
      // The turn completes inside this frame: place the crossing by the share of this frame's angle it needed.
      const tc = w.t + (TAU - w.acc) / d * (this.t - w.t);
      this.kepT = tc - w.t0; w.t0 = tc; w.acc = w.acc + d - TAU;
    } else w.acc += d;
    Object.assign(w, { t: this.t, rx, ry, rz });
  },
  onParam(key) {
    if (key === 'zoom') { this.cam.z = this.p.zoom; if (navAnim.lab === this) navAnim.lab = null; }
    if (key === 'follow' && this.p.follow) this.track = null;
    // Mass and class stay consistent: choosing a class brings the mass into its range, at a typical member's, and a
    // mass dialled out of the chosen class's range hands the type back to By mass.
    if (key === 'kind' && this.p.kind !== 'auto') {
      const k = KINDS[this.p.kind], [lo, hi] = k.m;
      if (!(this.p.launchMass >= lo && this.p.launchMass <= hi)) { this.p.launchMass = Number((k.typ * EARTH).toPrecision(3)); syncControl('launchMass'); }
    }
    if (key === 'launchMass' && this.p.kind !== 'auto') {
      const [lo, hi] = KINDS[this.p.kind].m;
      if (this.p.launchMass < lo * 0.995 || this.p.launchMass > hi * 1.005) { this.p.kind = 'auto'; syncControl('kind'); }
    }
    if (key === 'G' || key === 'soft') { this.accDirty = true; this.E0 = this.energy(); for (const s of Object.values(this.series)) s.clear(); }
  },
  heaviest() { let h = null; for (const b of this.bodies) if (!h || b.m > h.m) h = b; return h; },
  addBody(b) {
    if (this.bodies.length >= BODY_CAP) { announce(`Body limit reached (${BODY_CAP}). Delete some or reset the scene.`); return false; }
    this.bodies.push(b); this.accDirty = true; this.E0 = this.energy(); return true;
  },
  /* The body that holds a point: a world whose Hill sphere it lies well inside (half its radius, where a prograde
     orbit lasts), the smallest such, else the heaviest body. A body dropped or thrown there orbits it. */
  hostAt(x, y, z = 0) {
    const H = this.heaviest();
    if (!H) return null;
    let host = H, best = Infinity;
    for (const P of this.bodies) {
      if (P === H || !(P.m > 0)) continue;
      const rH = Math.hypot(P.x - H.x, P.y - H.y, P.z - H.z) * Math.cbrt(P.m / (3 * (H.m + P.m)));
      if (rH < best && Math.hypot(x - P.x, y - P.y, z - P.z) < rH * 0.5) { host = P; best = rH; }
    }
    return host;
  },
  /* A throw from (x, y, z) along the drag's direction in the world (dx, dy, dz), px screen pixels long. Its speed is
     px / THROW_PX times the circular speed about the body that holds the point, on top of that body's own motion, so
     a short drag is a short, bound throw whatever the zoom; the old rule (the drag's length in the world, 1.6 times
     a second) flung a 40-pixel drag out at several times escape speed in a zoomed-out view. With nothing to orbit,
     that old rule stands. Returns the velocity and how it compares with the circular speed there. */
  throwVel(x, y, z, dx, dy, dz, px, m) {
    const H = this.hostAt(x, y, z), len = Math.hypot(dx, dy, dz);
    if (!H || !len) return { vx: dx * LAUNCH_K, vy: dy * LAUNCH_K, vz: 0, rel: Math.hypot(dx, dy) * LAUNCH_K, k: NaN };
    const d = Math.max(Math.hypot(x - H.x, y - H.y, z - H.z), H.r), k = px / THROW_PX, s = this.vCirc(H.m + m, d) * k;
    return { vx: H.vx + dx / len * s, vy: H.vy + dy / len * s, vz: 0, rel: s, k };
  },
  /* Where a throw starts: where the drag began, unless that is on a body, which the new one would merge into at
     once; then just outside it along the drag, as if launched from its surface. */
  throwFrom(x, y, z, dx, dy, m) {
    const r = bodyRadius(m), len = Math.hypot(dx, dy) || 1;
    let on = null;
    for (const b of this.bodies) if (Math.hypot(x - b.x, y - b.y, z - b.z) < 0.7 * (b.r + r) + 1 && (!on || b.m > on.m)) on = b;
    if (!on) return { x, y, z };
    const k = 0.7 * (on.r + r) + 1.5;
    return { x: on.x + dx / len * k, y: on.y + dy / len * k, z: on.z };
  },
  /* The throw's reading beside the aim: its speed against what it orbits, as a multiple of the circular speed. */
  throwText(t) {
    const v = fmtQ(this, 'speed', t.rel);
    return Number.isFinite(t.k) ? `${v} · ${t.k.toFixed(2)}× circular${t.k >= Math.SQRT2 ? ' · escapes' : ''}` : v;
  },
  dropOrbit(wx, wy, wz = 0, nb = this.drawNew()) {
    const m = nb.m, top = this.heaviest(), H = this.hostAt(wx, wy, wz);
    if (!H) { this.addBody(this.body(wx, wy, 0, 0, m, wz, 0, nb.kind)); return; }
    const dx = wx - H.x, dy = wy - H.y, d = Math.hypot(dx, dy);
    // Not inside what it would orbit: beyond the distance at which the two would merge, with a pixel to spare.
    if (d < 0.7 * (H.r + bodyRadius(m)) + 1) return;
    // The sense of the system's orbits about its heaviest body, so a drop goes round with the rest (a moon too).
    let L = 0;
    for (const b of this.bodies) if (b !== top) L += b.m * ((b.x - top.x) * (b.vy - top.vy) - (b.y - top.y) * (b.vx - top.vx));
    const dir = L < 0 ? -1 : 1, v = this.vCirc(H.m + m, d) * this.p.orbitK;
    if (this.p.incl > 0) {
      // Tilt the orbit about the line from the host to the drop point, so the body starts where it was dropped.
      const i = rand(-1, 1) * this.p.incl * Math.PI / 180, ci = Math.cos(i), si = Math.sin(i);
      this.addBody(this.body(wx, wy, H.vx - dir * v * dy / d * ci, H.vy + dir * v * dx / d * ci, m, wz, H.vz + v * si, nb.kind));
      return;
    }
    this.addBody(this.body(wx, wy, H.vx - dir * v * dy / d, H.vy + dir * v * dx / d, m, wz, 0, nb.kind));
  },
  addRandom() {
    const H = this.heaviest();
    const nb = this.drawNew();
    if (!H) { this.addBody(this.body(rand(-150, 150), rand(-100, 100), 0, 0, nb.m, 0, 0, nb.kind)); return; }
    const d = rand(H.r + 50, 380), a = rand(0, TAU);
    this.dropOrbit(H.x + d * Math.cos(a), H.y + d * Math.sin(a), 0, nb);
  },
  toWorld(p) { const { ox, oy, z } = this.viewXf; return { x: (p.x - ox) / z, y: (p.y - oy) / z }; },
  /* ---------- picking: one way in both views ---------- */
  /* The view's projector: it writes where body b is drawn on the stage, and how large, into o, and says false when b
     is not drawn (behind the camera, or a moon still inside its planet's disc). Every test below measures on the
     stage through it, so the flat and 3D views pick, erase and ring alike. */
  projector() {
    if (this.is3D()) return this.proj3 || (this.proj3 = (b, o) => { const s = this.project3(b.x, b.y, b.z); if (!s || !this.apart3(b, s)) return false; o.x = s.x; o.y = s.y; o.r = this.radius3(b, s); return true; });
    return this.proj2 || (this.proj2 = (b, o) => { const { ox, oy, z } = this.viewXf; if (!this.apart(b, z)) return false; o.x = b.x * z + ox; o.y = b.y * z + oy; o.r = this.drawR(b, z); return true; });
  },
  /* The body whose drawn disc comes nearest stage point p, within slack pixels of its edge. */
  pickBody(p, project, slack) {
    const o = SPOT; let best = null, bd = Infinity;
    for (const b of this.bodies) { if (!project(b, o)) continue; const d = Math.hypot(o.x - p.x, o.y - p.y) - o.r; if (d < bd) { bd = d; best = b; } }
    return bd < slack ? best : null;
  },
  bodyAt(p, slack = pickReach()) { return this.pickBody(p, this.projector(), slack); },
  eraseAt(p) {
    const before = this.bodies.length, project = this.projector(), o = SPOT;
    this.bodies = this.bodies.filter(b => !project(b, o) || Math.hypot(o.x - p.x, o.y - p.y) > Math.max(ERASE_PX, o.r + 6));
    if (this.bodies.length !== before) { this.accDirty = true; this.E0 = this.energy(); }
  },
  /* The body whose drawn orbit (and, for the Select tool, trail) passes within LINE_PX of stage point p, nearest
     first: where only the lines show, the line is the way to the body. Orbits are measured on the very curve
     orbitCurve draws, through the same projector, leaving out the moons that are not drawn apart and, in 3D, the
     stretch nearest the camera that fades out; trails on the stretch each view draws. The answer is kept for 60 ms
     at the same point, so the cursor, the hover ring and the press share one measurement. */
  lineAt(p, trails, fresh) {
    const L = LINE, now = performance.now();
    if (!fresh && L.trails === trails && Math.abs(L.x - p.x) < 0.5 && Math.abs(L.y - p.y) < 0.5 && now - L.at < 60) return L.b && this.bodies.includes(L.b) ? L.b : null;
    const best = NEAR; best.d = LINE_PX; best.b = null;
    if (this.p.orbits) this.orbitNear(p, best);
    if (trails && this.p.trails) this.trailNear(p, best);
    L.x = p.x; L.y = p.y; L.at = now; L.trails = trails; L.b = best.b;
    return best.b;
  },
  orbitNear(p, best) {
    const three = this.is3D(), { ox, oy, z } = this.viewXf;
    let cut = 0, f0 = 0, f1 = 1;
    if (three) { const dist = this.c3().dist; cut = this.basis3().near * 3; f0 = dist * 0.06; f1 = dist * 0.2; }
    const project = three ? q => { const s = this.project3(q[0], q[1], q[2]); return s && s.w > cut ? s : null; } : q => ({ x: q[0] * z + ox, y: q[1] * z + oy });
    for (const b of this.orbiters()) {
      if (b.host && !(three ? this.apart3(b) : this.apart(b, z))) continue;
      const P = this.pullHost(b), f = P && this.orbitFrame(b, P); if (!f) continue;
      let lx = 0, ly = 0, on = false;
      this.orbitCurve(f, project, (q, s) => {
        if (!q || (three && (s.w - f0) / (f1 - f0) < 0.35)) { on = false; return; }
        if (on) { const d = segDist(p.x, p.y, lx, ly, s.x, s.y); if (d < best.d) { best.d = d; best.b = b; } }
        lx = s.x; ly = s.y; on = true;
      }, three ? { maxPx: 7, w: view.w, h: view.h, cap: 1400 } : { maxPx: 5, w: view.w, h: view.h });
    }
  },
  trailNear(p, best) {
    const three = this.is3D(), { ox, oy, z } = this.viewXf, o = SPOT, B = this.bodies, len0 = Math.round(this.p.trailLen), R = LINE_PX;
    // The 3D view thins a crowded sky's trails and fades their oldest quarter away, so neither is a target there.
    const keep = three && B.length > 40 ? Math.max(90, 3600 / Math.sqrt(B.length)) : Infinity, cut = three ? this.basis3().near * 3 : 0;
    for (const b of B) {
      const len = Math.min(b.tn, len0, keep); if (len < 2) continue;
      let lx = 0, ly = 0, on = false;
      for (let k = three ? Math.floor(len / 4) : 0; k < len; k++) {
        const i = (b.th - len + k + TRAIL_CAP) % TRAIL_CAP;
        let sx, sy;
        if (three) { if (!this.projectTo3(b.trail[i * 2], b.trail[i * 2 + 1], b.trailZ[i], o) || o.w < cut) { on = false; continue; } sx = o.x; sy = o.y; }
        else { sx = b.trail[i * 2] * z + ox; sy = b.trail[i * 2 + 1] * z + oy; }
        if (on && !(Math.min(lx, sx) > p.x + R || Math.max(lx, sx) < p.x - R || Math.min(ly, sy) > p.y + R || Math.max(ly, sy) < p.y - R)) {
          const d = segDist(p.x, p.y, lx, ly, sx, sy); if (d < best.d) { best.d = d; best.b = b; }
        }
        lx = sx; ly = sy; on = true;
      }
    }
  },
  /* What a click would take now, as the hover ring shows it: with Select, a body within its generous reach, else an
     orbit or a trail; with Throw, a body within the tool's reach, else an orbit; with Delete, a body. */
  hoverPick(p) {
    if (ptr.selectMode) return this.bodyAt(p, PICK_PX) || this.lineAt(p, true);
    return this.bodyAt(p, HIT_PX) || (this.p.tool === 'erase' ? null : this.lineAt(p, false));
  },
  cursorAt(p) {
    if (this.p.tool === 'erase') return this.bodyAt(p, HIT_PX) ? 'pointer' : 'crosshair';
    return this.hoverPick(p) ? 'pointer' : 'crosshair';
  },
  offStage3() { return false; },
  /* The followed body's ring, what a click would take, and the Delete brush: drawn alike over the flat and 3D views. */
  drawMarks(g, w, h) {
    const o = SPOT, project = this.projector(), tb = this.selected();
    if (tb && project(tb, o)) followRing(g, o.x, o.y, o.r + 8);
    if (!this.hover || this.aim) return;
    const b = this.hoverPick(this.hover), del = this.p.tool === 'erase' && !ptr.selectMode;
    if (b && project(b, o)) hoverTag(g, o.x, o.y, o.r, this.hoverText(b), w, h, del ? THEME.crit : THEME.text);
    if (del) brushRing(g, this.hover, ERASE_PX, THEME.crit);
  },
  /* ---------- the selection contract (ARCHITECTURE.md): the followed body is the selection ---------- */
  selected() { return this.track == null ? null : this.bodies.find(q => q.id === this.track) || null; },
  selectedId() { return this.selected() ? this.track : null; },
  /* Selecting a body follows it with the camera, as a click on it always has; null lets the camera go. */
  select(id) {
    if (id == null) { this.deselect(); return true; }
    const b = this.bodies.find(q => q.id === id); if (!b) return false;
    if (this.track !== b.id) { this.track = b.id; this.trackEase = 0; }
    this.p.follow = false; updateNav();
    return true;
  },
  pick(s) { const b = this.bodyAt(s, PICK_PX) || this.lineAt(s, true); return b ? b.id : null; },
  /* Where a body is drawn, in stage pixels, in either view: for the head-up display's target box. */
  spot(id, three) {
    const b = id == null ? null : this.bodies.find(q => q.id === id); if (!b) return null;
    if (three) { const s = this.project3(b.x, b.y, b.z); return s && { x: s.x, y: s.y, r: this.radius3(b, s) }; }
    const { ox, oy, z } = this.viewXf; return { x: b.x * z + ox, y: b.y * z + oy, r: this.drawR(b, z) };
  },
  selectHint: 'click a body, or its orbit or trail, to follow it and inspect it',
  // The Select tool's hover ring is Gravity's own (drawMarks), with the body's name, mass and speed beside it.
  pickRing: true,
  objectsName: 'Bodies',
  objectsEmpty: 'An empty sky. Throw or drop a body with the Throw tool, and it is listed here.',
  /* The list in Inspect: each body, heaviest first, with its mass and its distance from what it orbits. */
  objectCols: [
    { label: 'Mass', w: 1.5, text: v => (!(v > 0) ? '0' : unitSystem() === 'sim' ? sig(v) : gravity.massText(v, true, 2)) },
    { label: 'Distance', w: 1, unit: () => unitOf(gravity, 'len')[1], text: v => sig(v * unitOf(gravity, 'len')[0]) },
  ],
  objects() {
    return [...this.bodies].sort((a, b) => b.m - a.m || a.id - b.id).map(b => {
      const P = this.pullHost(b);
      return { id: b.id, name: nameOf(b), kind: KINDS[b.kind].short, v: [b.m, P ? Math.hypot(b.x - P.x, b.y - P.y, b.z - P.z) : NaN] };
    });
  },
  /* The followed body, for the Details card. Orbit figures are the two-body elements about the heaviest other body. */
  inspect() {
    const b = this.selected(); if (!b) return null;
    const P = this.pullHost(b), title = b.desc || KINDS[b.kind].label, name = nameOf(b);
    const rows = [b.m > 0 ? ['Mass of this body', this.massText(b.m), unitSystem() === 'sim' ? 'In simulation units. The star in most scenes has mass 1000.' : 'The star in most scenes is one solar mass; a planet of mass 1 is about Jupiter\'s.']
      : ['Mass of this body', 'too small to pull', 'A test body: it feels every pull and pulls on nothing, as the belts\' bodies do here.']];
    const ph = this.physique(b);
    if (ph) rows.push(...this.physRows(b, ph));
    rows.push(...this.climRows(b));
    let focus = null;
    if (P) {
      // Speed and distance are the body's own; the orbit's figures are its system's (relative()), so Pluto's hold still.
      const ref = refName(P), r = Math.hypot(b.x - P.x, b.y - P.y, b.z - P.z), u = Math.hypot(b.vx - P.vx, b.vy - P.vy, b.vz - P.vz);
      const { rx, ry, rz, vx: ux, vy: uy, vz: uz, mu } = this.relative(b, P), rs = Math.hypot(rx, ry, rz), us = Math.hypot(ux, uy, uz);
      const E = us * us / 2 - mu / rs, hx = ry * uz - rz * uy, hy = rz * ux - rx * uz, hz = rx * uy - ry * ux, h2 = hx * hx + hy * hy + hz * hz;
      const a = -mu / (2 * E), e = Math.sqrt(Math.max(0, 1 + 2 * E * h2 / (mu * mu))), bound = E < 0, i = Math.acos(clamp(this.pole() * hz / Math.sqrt(h2 || 1), -1, 1)) * 180 / Math.PI;
      focus = `Distance from ${ref}`;
      const shape = !bound ? 'open path' : e < 0.05 ? 'near circle' : e < 0.5 ? 'oval' : 'long ellipse';
      rows.push(
        [`Speed relative to ${ref}`, fmtQ(this, 'speed', u), `How fast this body moves as seen from ${ref}.`],
        [`Distance from ${ref}`, fmtQ(this, 'len', r), `Centre to centre, between this body and ${ref}.`],
        ['Time for one orbit', bound ? this.timeText(TAU * Math.sqrt(a * a * a / mu)) : 'never returns', `The orbital period from the two-body orbit around ${ref}, what pulls on this body hardest.`],
        ['Orbit size', bound ? fmtQ(this, 'len', a) : 'unbounded', 'The semi-major axis: half the long width of the orbit, which is its average radius.'],
        ['Orbit shape', `${e.toFixed(3)}, ${shape}`, 'The eccentricity: 0 is a perfect circle, and 1 or more never comes back.'],
        ['Orbit tilt', `${i.toFixed(1)}°`, this.sky ? 'The inclination: the angle between this orbit and the ecliptic, the plane of Earth\'s orbit. Above 90° it runs backwards.' : 'The inclination: the angle between this orbit and the flat plane. Above 90° it runs backwards.'],
        ['Orbit status', bound ? `Bound to ${ref}` : `Escaping ${ref}`, `Whether this body has too little energy to leave ${ref}.`]);
      // The reference's Model 4.1.4: how far out it can hold moons, and how near it may come to what it orbits.
      const q = a * (1 - e);
      if (bound && b.m > 0 && P.m > b.m) rows.push(['Hill sphere', this.lenText(q * Math.cbrt(b.m / (3 * (P.m + b.m)))), `Within about this distance its own gravity holds moons against the pull of ${ref}: the Hill sphere, taken at the nearest point of its orbit.`]);
      const pP = P.real && ph && this.physique(P);
      if (bound && pP) {
        const d = 2.456 * pP.R * Math.cbrt(pP.rho / ph.rho), inside = q * AU_M / AU_PX <= d;
        rows.push([`Roche limit of ${ref}`, `${this.physText(d, 'len')}${inside ? ', and it is inside' : ''}`, `Closer than this to ${ref}, tides would pull a fluid body of this density apart: the fluid Roche limit. A rigid moon can last inside it for a time, as Phobos does.`]);
      }
      if (KINDS[b.kind].family && b.kind !== 'brown' && P.kind === 'star' && b.m * 25 >= P.m) rows.push(['Planet by IAU rules', `no: ${(b.m / P.m * 100).toFixed(1)} % of its star's mass`, 'The IAU\'s working definition of an exoplanet needs less than 1/25 of the mass of what it orbits; heavier, it is a binary companion.']);
    } else rows.push(...(ph ? [] : [['Radius of this body', fmtQ(this, 'len', b.r), 'The drawn and collision radius.']]), ['Speed through space', fmtQ(this, 'speed', Math.hypot(b.vx, b.vy, b.vz)), 'Nothing else is here to measure against.']);
    return { id: b.id, kicker: `${name} · camera following`, short: name, focus, title, color: this.bodyColor3(b), spot: true, rows, actions: [
      { label: 'Delete body', run: () => { const m = this.bodies; this.bodies = m.filter(q => q !== b); this.track = null; this.accDirty = true; this.E0 = this.energy(); updateNav(); } },
    ] };
  },
  deselect() { this.track = null; updateNav(); },
  /* What a world is like up close: its radius (real, or estimated from its mass and class by the reference's Model
     4.4.3) and from that its bulk density, gravity and escape speed (Model 4.1.2), in SI. Null for a body with no
     mass, or with no radius to go on (a brown dwarf or star of the sandbox). */
  physique(b) {
    if (!(b.m > 0)) return null;
    const est = !b.real, R = est ? (planetRadius(b.m, b.kind) || 0) * R_EARTH_KM * 1000 : b.r * AU_M / AU_PX;
    if (!R) return null;
    const M = b.m * SIM_KG, GM = G_SI * M;
    return { R, est, rho: M / (4 / 3 * Math.PI * R ** 3), g: GM / (R * R), vesc: Math.sqrt(2 * GM / R), cloud: KINDS[b.kind].family === 'gas' };
  },
  /* A physical quantity in the chosen system: US customary in US, else SI, for there is no simulation unit for these. */
  physText(v, kind) {
    const us = unitSystem() === 'us';
    // Up to a million km in km (or miles); beyond, in AU, as a star's Roche limit is.
    if (kind === 'len') return v >= 1e9 ? `${sig(v / AU_M, 3)} AU` : us ? `${sig(v / 1609.344, 4)} mi` : `${sig(v / 1000, 4)} km`;
    if (kind === 'rho') return us ? `${sig(v * 0.0624280, 3)} lb/ft³` : `${sig(v, v >= 1000 ? 4 : 3)} kg/m³`;
    if (kind === 'g') return us ? `${sig(v * 3.280840, 3)} ft/s²` : `${sig(v, 3)} m/s²`;
    return us ? `${sig(v / 1609.344, 3)} mi/s` : `${sig(v / 1000, 3)} km/s`;
  },
  /* A simulated length: in pixels for Simulation units, else as physText reads it, so a moon's Hill sphere is in km. */
  lenText(px) { return unitSystem() === 'sim' ? fmtQ(this, 'len', px) : this.physText(px * AU_M / AU_PX, 'len'); },
  physRows(b, ph) {
    const cls = KINDS[b.kind].label.toLowerCase();
    return [
      ['Radius', `${ph.est ? '≈ ' : ''}${this.physText(ph.R, 'len')}`, ph.est ? `Estimated from its mass for a ${cls}, on the ${BRANCH[b.kind]} in Earth units (the research reference's Model 4.4.3). The stage draws every world larger than this, so it can be seen.` : 'Its real radius. Far off, the stage still draws it as a dot you can find.'],
      ['Density', this.physText(ph.rho, 'rho'), 'Its mass over its volume. Rock and iron run from about 3,900 to 8,000 kg/m³; worlds wrapped in gas are lighter, and Saturn would float.'],
      [ph.cloud ? 'Cloud-top gravity' : 'Surface gravity', this.physText(ph.g, 'g'), ph.cloud ? 'GM/R² at the top of its envelope, the 1-bar level of a giant: a world of gas has no ground to stand on.' : 'GM/R² at its surface, for a sphere that does not spin.'],
      ['Escape speed', this.physText(ph.vesc, 'v'), 'The launch speed from its surface or cloud tops that never falls back: the square root of 2GM/R.'],
    ];
  },
  /* The direction an orbit's angular momentum points for it to go round forwards. The stage's y runs down the screen,
     so a frame that shows the real sky from its north, as the Solar System does, turns prograde orbits' r × v to −z;
     the drawn scenes go round the other way and keep +z. */
  pole() { return this.sky ? -1 : 1; },
  /* The Solar System spans eight decades of scale, so a wheel notch or zoom button goes twice as far there. */
  zoomPace() { return this.sky ? 2 : 1; },
  /* The head-up display: its readings, and the followed body in stage pixels, where the stage draws it. */
  hud: [['Bodies', 'BODIES'], ['Total energy E', 'ENERGY E'], ['Energy drift since last change', 'E DRIFT'], ['Virial ratio 2K / |U|', 'VIRIAL 2K/|U|']],
  /* Real-world units are astronomical here; Simulation keeps pixels and simulated seconds. */
  unitTable(sys) {
    if (sys === 'sim') return null;
    return { len: [1 / AU_PX, 'AU'], speed: sys === 'us' ? [KMS * 1000 / 1609.344, 'mi/s'] : [KMS, 'km/s'] };
  },
  scaleNote: `In Gravity the units are astronomical: the Star system's third planet orbits at 1 AU and its star is the Sun, so at G = 1× a year passes every ${AU_YR.toFixed(1)} simulated seconds. Masses read in solar, Jupiter and Earth masses.`,
  timeText(s) {
    if (unitSystem() === 'sim') return `${fmtSI(s)} s`;
    const yr = s / AU_YR; return yr >= 1 ? `${sig(yr)} yr` : `${sig(yr * 365.25)} days`;
  },
  timeNote(t) {
    if (unitSystem() === 'sim') return '';
    const base = ` ≈ ${this.timeText(t)}`; if (!this.sky) return base;
    // The Solar System starts at J2000.0, noon on 1 January 2000; its clock also reads the date the run has reached.
    const d = new Date(SKY_EPOCH + t / AU_YR * 365.25 * 86400000);
    return Number.isFinite(d.getTime()) ? `${base} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : base;
  },
  /* A mass in solar, Jupiter or Earth masses, to n significant figures (the objects list takes two). */
  massText(m, short, n = 3) {
    if (unitSystem() === 'sim') return short ? `m ${m < 10 ? m.toFixed(2) : m.toFixed(0)}` : fmtSI(m);
    const sun = m / 1000, jup = m / JUP, earth = m / EARTH;
    // Abbreviations in plain letters: the astronomical symbols for the Sun, Jupiter and Earth are missing from many fonts.
    return sun >= 0.05 ? `${sig(sun, n)} ${short ? 'Msun' : 'solar masses'}` : jup >= 0.03 ? `${sig(jup, n)} ${short ? 'MJup' : 'Jupiter masses'}` : `${sig(earth, n)} ${short ? 'MEarth' : 'Earth masses'}`;
  },
  inspectHint: 'Click a body, or its orbit, to follow it and inspect it here.',
  stateSummary() { return { bodies: this.bodies.length }; },
  navExtras: [{ id: 'follow', label: 'Follow', icon: 'follow', title: 'Follow the centre of mass · click a body on the stage to follow it instead · click again to free the camera',
    pressed: () => gravity.p.follow || gravity.track != null,
    run() {
      const on = gravity.p.follow || gravity.track != null;
      gravity.track = null; gravity.p.follow = !on;
      announce(on ? 'Camera free' : 'Following the centre of mass');
    } }],
  camLocked() { return this.p.follow || this.track != null; },
  onUserPan() { this.p.follow = false; this.track = null; },
  // The zoom is kept in p.zoom, so a saved state and a scene's own zoom come back as they were.
  onCamZoom() { this.p.zoom = this.cam.z; },
  /* A click on a body with Throw follows it, and a click on the followed body lets it go. */
  followBody(b) {
    if (this.track === b.id) { this.deselect(); announce('Camera released'); return; }
    this.select(b.id); announce(`Following ${nameOf(b)}`);
  },
  extent() {
    const B = this.bodies; if (!B.length) return null;
    let M = 0, cx = 0, cy = 0;
    for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; }
    cx /= M; cy /= M;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of B) {
      if (Math.abs(b.x - cx) > 4000 || Math.abs(b.y - cy) > 4000) continue;
      x0 = Math.min(x0, b.x - b.r); y0 = Math.min(y0, b.y - b.r); x1 = Math.max(x1, b.x + b.r); y1 = Math.max(y1, b.y + b.r);
    }
    return Number.isFinite(x0) ? { x0: x0 - 20, y0: y0 - 20, x1: x1 + 20, y1: y1 + 20 } : null;
  },
  frameView() {
    const E = this.extent(); this.track = null;
    if (!E) return { x: 0, y: 0, z: 1 };
    return { x: (E.x0 + E.x1) / 2, y: (E.y0 + E.y1) / 2, z: Math.min(view.w / (E.x1 - E.x0 + 80), view.h / (E.y1 - E.y0 + 80)) };
  },
  /* ---------- the director's camera (js/shell/director.js) ---------- */
  /* While the director films, Gravity's own camera lets go: Follow and the followed body are put aside, and handed
     back when it stops. */
  releaseCam() {
    const held = { follow: !!this.p.follow, track: this.track };
    this.p.follow = false; this.track = null; updateNav();
    return held;
  },
  retakeCam(h) {
    this.p.follow = h.follow;
    if (h.track != null && this.bodies.some(b => b.id === h.track)) { this.track = h.track; this.trackEase = 0; }
    updateNav();
  },
  // The director's own memory between looks, never part of a snapshot or a saved state.
  dirMass: null, dirMerged: -1, dirMergeId: -1, dirMergeT: -Infinity, dirT: -Infinity,
  /* Where the action is, in simulation pixels: a close pass between two bodies not bound to each other (or about to
     touch), a merger for three simulated seconds after it, a body leaving the system, the fastest body, the heaviest
     body with what circles it, and in the Solar System each world with its moons. keep is the subject being filmed,
     reported while it lasts even once it no longer stands out. Massless bodies count only as the fastest. */
  interest(keep) {
    const B = this.bodies, out = [], G = G0 * this.p.G;
    // A look after time went back (a rewind, a loaded state, a restart) or after a long gap (a new take; a director's
    // looks are at most 1.2 simulated seconds apart, at four times speed) has nothing of this run to compare with: it
    // forgets the last merger and only takes the masses as they are now.
    if (this.t < this.dirT || this.t - this.dirT > 2) { this.dirMass = null; this.dirMergeT = -Infinity; }
    this.dirT = this.t;
    if (!B.length) return out;
    let M = 0, cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0, top = B[0];
    for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; vx += b.m * b.vx; vy += b.m * b.vy; vz += b.m * b.vz; if (b.m > top.m) top = b; }
    if (!(M > 0)) return out;
    cx /= M; cy /= M; cz /= M; vx /= M; vy /= M; vz /= M;
    const has = key => out.some(p => p.key === key), at = (b, r, w, key, label) => { if (!has(key)) out.push({ x: b.x, y: b.y, z: b.z, r, w, key, label }); };
    const byKey = (key, pre) => (key && key.startsWith(pre) ? B.find(b => b.id === +key.slice(pre.length)) : null);
    // A merger: the merger count went up, and the body that gained most mass since the last look is where it happened.
    if (this.merged > this.dirMerged && this.dirMass) {
      let best = null, gain = 0;
      for (const b of B) { const m0 = this.dirMass.get(b.id); if (m0 != null && b.m - m0 > gain) { gain = b.m - m0; best = b; } }
      if (best) { this.dirMergeId = best.id; this.dirMergeT = this.t; }
    }
    this.dirMerged = this.merged; this.dirMass = new Map(B.map(b => [b.id, b.m]));
    const age = this.t - this.dirMergeT, mb = age >= 0 && age < 3 ? B.find(b => b.id === this.dirMergeId) : null, mk = byKey(keep, 'merge:');
    if (mb) at(mb, Math.max(mb.r * 10, 24), 0.95, `merge:${mb.id}`, 'A merger');
    else if (mk) at(mk, Math.max(mk.r * 10, 24), 0.4, keep, 'A merger');
    // A close encounter: the pair closest for their size, among the heaviest 150, unless they are bound to each other
    // and not yet touching (a moon, a binary).
    const S = B.filter(b => b.m > 0);
    if (S.length > 150) { S.sort((a, b) => b.m - a.m); S.length = 150; }
    let pa = null, pb = null, pq = 0.12;
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j], d = Math.max(1e-9, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)), q = (a.r + b.r) / d;
      if (q <= pq || a.host === b || b.host === a) continue;
      if (q < 0.4 && ((b.vx - a.vx) ** 2 + (b.vy - a.vy) ** 2 + (b.vz - a.vz) ** 2) / 2 < G * (a.m + b.m) / d) continue;
      pq = q; pa = a; pb = b;
    }
    const pk = keep && keep.startsWith('pair:') ? keep.slice(5).split('-').map(Number) : null, pair = (a, b, w) => {
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, r: d / 2 + 4 * Math.max(a.r, b.r), w, key: `pair:${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`, label: 'A close encounter' });
    };
    if (pa) pair(pa, pb, clamp(0.35 + 0.8 * pq, 0.35, 0.9));
    if (pk && !has(keep)) { const a = B.find(b => b.id === pk[0]), b = B.find(q => q.id === pk[1]); if (a && b) pair(a, b, 0.3); }
    // A body on its way out: clearly unbound from the rest, moving outwards and beyond twice the system's median radius.
    // A moon goes with its world, whose own speed it adds to and takes from.
    const ds = S.map(b => Math.hypot(b.x - cx, b.y - cy, b.z - cz)).sort((a, b) => a - b), Rm = ds.length ? ds[ds.length >> 1] : 0;
    let ej = null, ed = 0;
    for (const b of B) {
      const rx = b.x - cx, ry = b.y - cy, rz = b.z - cz, r = Math.hypot(rx, ry, rz), ux = b.vx - vx, uy = b.vy - vy, uz = b.vz - vz;
      if (b.host || r <= 2 * Rm || r <= ed || rx * ux + ry * uy + rz * uz <= 0 || (ux * ux + uy * uy + uz * uz) / 2 <= 1.2 * G * (M - b.m) / r) continue;
      ed = r; ej = b;
    }
    if (ej) at(ej, Math.max(ej.r * 8, Math.hypot(ej.vx - vx, ej.vy - vy, ej.vz - vz) * 1.5), 0.8, `body:${ej.id}`, 'An ejection');
    // The fastest body against the system's drift, weighted by how far it outruns the mean.
    let fb = null, fv = 0, sv = 0;
    for (const b of B) { const v = Math.hypot(b.vx - vx, b.vy - vy, b.vz - vz); sv += v; if (v > fv) { fv = v; fb = b; } }
    const mean = sv / B.length;
    if (fb && B.length > 1 && mean > 0) at(fb, Math.max(fb.r * 8, fv * 0.8), clamp(0.2 + 0.15 * (fv / mean - 1), 0.2, 0.6), `body:${fb.id}`, 'The fastest body');
    // In the Solar System, each world with its moons; everywhere, the heaviest body with the nearer half of the rest,
    // worth a shot of its own when it outweighs the next heaviest twice over.
    const sys = new Map(), moons = new Map();
    for (const b of B) if (b.host) { const d = Math.hypot(b.x - b.host.x, b.y - b.host.y, b.z - b.host.z); if (d > (sys.get(b.host) || 0)) sys.set(b.host, d); moons.set(b.host, (moons.get(b.host) || 0) + 1); }
    for (const [h, d] of sys) out.push({ x: h.x, y: h.y, z: h.z, r: d * 1.4 + h.r, w: 0.5, key: `sys:${h.id}`, label: `${h.name || 'A world'} and its moon${moons.get(h) > 1 ? 's' : ''}` });
    const dt = S.filter(b => b !== top).map(b => Math.hypot(b.x - top.x, b.y - top.y, b.z - top.z)).sort((a, b) => a - b);
    const second = S.reduce((m, b) => (b !== top && b.m > m ? b.m : m), 0);
    at(top, Math.max(top.r * 8, dt.length ? dt[dt.length >> 1] * 1.2 : 0), top.m > 2 * second ? 0.35 : 0.2, `body:${top.id}`, 'The heaviest body and its system');
    const kb = byKey(keep, 'body:');
    if (kb) at(kb, Math.max(kb.r * 8, Math.hypot(kb.vx - vx, kb.vy - vy, kb.vz - vz) * 0.8), 0.3, keep, kb.name || 'A body');
    return out;
  },
  mini(g, k) {
    for (const b of this.bodies) {
      g.fillStyle = b.kind === 'star' ? THEME.amber : bodyCss(b);
      g.beginPath(); g.arc(b.x, b.y, Math.max(1.6 / k, b.r), 0, TAU); g.fill();
    }
  },
  pointerDown(p) {
    if (this.p.tool === 'erase') { this.erasing = true; this.eraseAt(p); return; }
    // Whether this press is on a body (or its orbit) is decided now, where the bodies are at the press, with the
    // hover ring's reach: by the time the button comes up a moving body has left the spot, and a click on it used to
    // drop a new body there instead.
    const on = this.bodyAt(p, HIT_PX) || this.lineAt(p, false, true);
    this.aim = { sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, on: on ? on.id : null };
    // The body is drawn when the aim starts, so the preview shows the one that will fly.
    this.next = this.drawNew();
  },
  /* A stage point on the orbital plane: the flat view's world point, or the 3D view's plane through the centre of
     mass; null where the 3D view's ray misses it. */
  planeAt(s) { if (this.is3D()) return this.pick3(s); const w = this.toWorld(s); return { x: w.x, y: w.y, z: 0 }; },
  next: null,
  pointerCancel() { this.aim = null; this.erasing = false; this.next = null; },
  pointerMove(p, e, down) {
    if (!down) return;
    if (this.erasing) { this.eraseAt(p); return; }
    if (!this.aim) return;
    this.aim.x = p.x; this.aim.y = p.y;
    if (Math.hypot(p.x - this.aim.sx, p.y - this.aim.sy) > 5) this.aim.moved = true;
  },
  /* A click follows the body it was pressed on, or drops a new one into orbit; a drag throws one. Both views. */
  pointerUp() {
    if (this.erasing) { this.erasing = false; return; }
    const a = this.aim, nb = this.next || this.drawNew(); this.aim = null; this.next = null;
    if (!a) return;
    if (!a.moved) {
      const b = a.on != null && this.bodies.find(q => q.id === a.on);
      if (b) { this.followBody(b); return; }
      const w = this.planeAt({ x: a.sx, y: a.sy });
      if (w) this.dropOrbit(w.x, w.y, w.z, nb); else announce('Aim at the orbital plane to drop a body.');
      return;
    }
    const A = this.planeAt({ x: a.sx, y: a.sy }), B = this.planeAt({ x: a.x, y: a.y });
    if (!A || !B) { announce('Aim at the orbital plane to throw a body.'); return; }
    // The flat view throws in the plane z = 0; the 3D view from the height the throw starts at.
    const o = this.throwFrom(A.x, A.y, A.z, B.x - A.x, B.y - A.y, nb.m), oz = this.is3D() ? o.z : 0;
    const t = this.throwVel(o.x, o.y, oz, B.x - A.x, B.y - A.y, 0, Math.hypot(a.x - a.sx, a.y - a.sy), nb.m);
    this.addBody(this.body(o.x, o.y, t.vx, t.vy, nb.m, oz, 0, nb.kind));
  },
  predict(x0, y0, vx0, vy0, z0 = 0, heights = null) {
    const B = this.bodies, n = B.length, dyn = n <= 30, G = G0 * this.p.G, e2 = this.p.soft ** 2, N = n + 1;
    const X = new Float64Array(N), Y = new Float64Array(N), Z = new Float64Array(N), VX = new Float64Array(N), VY = new Float64Array(N), VZ = new Float64Array(N), M = new Float64Array(N), R = new Float64Array(N);
    for (let i = 0; i < n; i++) { const b = B[i]; X[i] = b.x; Y[i] = b.y; Z[i] = b.z; VX[i] = b.vx; VY[i] = b.vy; VZ[i] = b.vz; M[i] = b.m; R[i] = b.r; }
    X[n] = x0; Y[n] = y0; Z[n] = z0; VX[n] = vx0; VY[n] = vy0; M[n] = (this.next || this.drawNew()).m;
    const AX = new Float64Array(N), AY = new Float64Array(N), AZ = new Float64Array(N), out = [x0, y0], dt = 1 / 60;
    if (heights) heights.push(z0);
    for (let s = 0; s < 300; s++) {
      AX.fill(0); AY.fill(0); AZ.fill(0);
      if (dyn) {
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const dx = X[j] - X[i], dy = Y[j] - Y[i], dz = Z[j] - Z[i], d2 = dx * dx + dy * dy + dz * dz + e2, inv = G / (d2 * Math.sqrt(d2));
          AX[i] += dx * inv * M[j]; AY[i] += dy * inv * M[j]; AZ[i] += dz * inv * M[j]; AX[j] -= dx * inv * M[i]; AY[j] -= dy * inv * M[i]; AZ[j] -= dz * inv * M[i];
        }
      } else {
        for (let j = 0; j < n; j++) {
          const dx = X[j] - X[n], dy = Y[j] - Y[n], dz = Z[j] - Z[n], d2 = dx * dx + dy * dy + dz * dz + e2, inv = G / (d2 * Math.sqrt(d2));
          AX[n] += dx * inv * M[j]; AY[n] += dy * inv * M[j]; AZ[n] += dz * inv * M[j];
        }
      }
      for (let i = dyn ? 0 : n; i < N; i++) { VX[i] += AX[i] * dt; VY[i] += AY[i] * dt; VZ[i] += AZ[i] * dt; X[i] += VX[i] * dt; Y[i] += VY[i] * dt; Z[i] += VZ[i] * dt; }
      out.push(X[n], Y[n]);
      if (heights) heights.push(Z[n]);
      let hit = false;
      for (let j = 0; j < n; j++) if ((X[j] - X[n]) ** 2 + (Y[j] - Y[n]) ** 2 + (Z[j] - Z[n]) ** 2 < R[j] * R[j]) { hit = true; break; }
      if (hit) break;
    }
    return out;
  },
  drawField(g, w, h, ox, oy, z) {
    const cs = Math.max(5, Math.ceil(Math.sqrt(w * h / 40000))), fw = Math.ceil(w / cs), fh = Math.ceil(h / cs);
    if (!this.fld || this.fld.w !== fw || this.fld.h !== fh) {
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const cx = c.getContext('2d'); this.fld = { w: fw, h: fh, c, cx, img: cx.createImageData(fw, fh) }; this.fldClock = 0;
    }
    if (this.fldClock++ % 2 === 0) {
      const heavy = [...this.bodies].sort((a, b) => b.m - a.m).slice(0, 24), e2 = Math.max(this.p.soft, 6) ** 2, d = this.fld.img.data, R = RAMP_HEAT.rgb;
      for (let y = 0, o = 0; y < fh; y++) {
        const wy = ((y + 0.5) * cs - oy) / z;
        for (let x = 0; x < fw; x++, o += 4) {
          const wx = ((x + 0.5) * cs - ox) / z;
          let phi = 0;
          for (const b of heavy) { const dx = wx - b.x, dy = wy - b.y; phi += b.m / Math.sqrt(dx * dx + dy * dy + e2); }
          const L = Math.log10(phi + 1e-9), t = clamp((L + 1) / 3.2, 0, 1), f = L * 4 - Math.floor(L * 4), bd = Math.min(f, 1 - f);
          const line = t > 0.05 ? Math.max(0, 1 - bd / 0.1) : 0, idx = Math.round(30 + t * 160 + line * 40) * 3;
          d[o] = R[idx]; d[o + 1] = R[idx + 1]; d[o + 2] = R[idx + 2];
          d[o + 3] = Math.round(t * t * 100 + line * line * 85);
        }
      }
      this.fld.cx.putImageData(this.fld.img, 0, 0);
    }
    g.imageSmoothingEnabled = true;
    g.drawImage(this.fld.c, 0, 0, fw * cs, fh * cs);
  },
  /* A body's radius on the stage at zoom z: its own radius, never smaller than its floor, so a real world is true
     to size up close and still a dot from afar. */
  drawR(b, z) { return Math.max(b.px || 1.4, b.r * z); },
  /* Whether a moon is drawn apart from its planet at zoom z; anything without a host always is. */
  apart(b, z) { return !b.host || Math.hypot(b.x - b.host.x, b.y - b.host.y) * z >= this.drawR(b.host, z) + this.drawR(b, z); },
  /* What a body orbits: its planet, for a moon; else the heavier body that pulls on it hardest (m / r²), so a moon
     placed by hand is seen to go round its planet and a planet the star. */
  pullHost(b) {
    if (b.host) return b.host;
    // The source list is rebuilt on the next step; a body added while paused must already count.
    if (this.accDirty) this.prepare();
    let best = null, f = 0;
    for (const q of this.srcs.length ? this.srcs : this.bodies) {
      if (q === b || q.m <= b.m) continue;
      const k = q.m / ((q.x - b.x) ** 2 + (q.y - b.y) ** 2 + (q.z - b.z) ** 2 || 1e-12);
      if (k > f) { f = k; best = q; }
    }
    return best;
  },
  /* A body with its moons, as one: their total mass and their barycentre's place and motion; a body without moons is
     itself. A planet swings round that point once each moon's turn, Pluto by some 2100 km about Charon, at about 24 m/s
     against its 4.7 km/s round the Sun: enough to swing an ellipse taken from Pluto alone by 0.4 AU every 6.4 days,
     a fast hula-hoop at the Solar System's pace. The orbit the planet is on is its system's, as the elements are. */
  system(b) {
    if (this.accDirty) this.prepare();
    const S = this.sats.get(b); if (!S) return b;
    let m = b.m, x = b.m * b.x, y = b.m * b.y, z = b.m * b.z, vx = b.m * b.vx, vy = b.m * b.vy, vz = b.m * b.vz;
    for (const q of S) { m += q.m; x += q.m * q.x; y += q.m * q.y; z += q.m * q.z; vx += q.m * q.vx; vy += q.m * q.vy; vz += q.m * q.vz; }
    return { m, x: x / m, y: y / m, z: z / m, vx: vx / m, vy: vy / m, vz: vz / m };
  },
  /* How a body moves about what it orbits, for its orbit's elements: a moon about its planet as the two are, anything
     else as its system about P's, with mu, the pull between them. (ox, oy, oz) is where the ellipse is centred so it
     still passes through the body: P's system, carried with the body's own small swing round its barycentre. */
  relative(b, P) {
    const nest = b.host === P, A = nest ? b : this.system(b), C = nest ? P : this.system(P);
    return { rx: A.x - C.x, ry: A.y - C.y, rz: A.z - C.z, vx: A.vx - C.vx, vy: A.vy - C.vy, vz: A.vz - C.vz, mu: G0 * this.p.G * (A.m + C.m),
      ox: C.x + b.x - A.x, oy: C.y + b.y - A.y, oz: C.z + b.z - A.z };
  },
  /* The ellipse a body is on now about P, from its system's position and velocity relative to P's (its osculating
     orbit, see relative()): its centre (P), its axes P̂ (to periapsis) and Q̂ (the way the body moves there), a, b and e, and E0, the body's own
     eccentric anomaly, so a drawing can start at the body. Null when the body is not bound. */
  orbitFrame(b, P) {
    const { rx, ry, rz, vx, vy, vz, mu, ox, oy, oz } = this.relative(b, P);
    const r = Math.hypot(rx, ry, rz), v2 = vx * vx + vy * vy + vz * vz, a = 1 / (2 / r - v2 / mu);
    if (!(a > 0) || !Number.isFinite(a)) return null;
    const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx, H = Math.hypot(hx, hy, hz); if (!H) return null;
    // The eccentricity vector points to periapsis: (v × h) / μ − r̂.
    const ex = (vy * hz - vz * hy) / mu - rx / r, ey = (vz * hx - vx * hz) / mu - ry / r, ez = (vx * hy - vy * hx) / mu - rz / r, e = Math.hypot(ex, ey, ez);
    if (e >= 1) return null;
    const [Px, Py, Pz] = e > 1e-9 ? [ex / e, ey / e, ez / e] : [rx / r, ry / r, rz / r];
    const Qx = (hy * Pz - hz * Py) / H, Qy = (hz * Px - hx * Pz) / H, Qz = (hx * Py - hy * Px) / H, bb = a * Math.sqrt(1 - e * e);
    const E0 = Math.atan2((rx * Qx + ry * Qy + rz * Qz) / bb, (rx * Px + ry * Py + rz * Pz) / a + e);
    return { cx: ox, cy: oy, cz: oz, Px, Py, Pz, Qx, Qy, Qz, a, bb, e, E0 };
  },
  /* The same ellipse as n points by eccentric anomaly from periapsis, in simulation coordinates; null when unbound. */
  orbitPath(b, P, n = 96) {
    const f = this.orbitFrame(b, P); if (!f) return null;
    const out = new Float64Array((n + 1) * 3);
    for (let k = 0; k <= n; k++) {
      const E = TAU * k / n, c = f.a * (Math.cos(E) - f.e), s = f.bb * Math.sin(E);
      out[k * 3] = f.cx + f.Px * c + f.Qx * s; out[k * 3 + 1] = f.cy + f.Py * c + f.Qy * s; out[k * 3 + 2] = f.cz + f.Pz * c + f.Qz * s;
    }
    return out;
  },
  /* An orbit as a smooth curve on the stage. A fixed polygon fails when the view is inside the orbit: the Solar
     System's 3D camera sits within Pluto's and Eris's, whose 128 chords then crossed the stage as long straight lines.
     So it starts at 96 points by eccentric anomaly, from the body back round the orbit, and halves any span that would
     draw longer than maxPx on a stage of w × h; spans wholly off the stage stay coarse, and the curve breaks where
     project() says a point is behind the camera (null). emit(p, s, u) gets each point (p in simulation coordinates,
     s on the stage) with u, the share of the orbit behind the body (0 at it), and emit(null) at a break. */
  orbitCurve(f, project, emit, { maxPx = 6, w = 1, h = 1, cap = 1600 } = {}) {
    const at = E => { const c = f.a * (Math.cos(E) - f.e), s = f.bb * Math.sin(E); return [f.cx + f.Px * c + f.Qx * s, f.cy + f.Py * c + f.Qy * s, f.cz + f.Pz * c + f.Qz * s]; };
    const M = Math.max(w, h), seen = (a, b) => Math.max(a.x, b.x) >= -M && Math.min(a.x, b.x) <= w + M && Math.max(a.y, b.y) >= -M && Math.min(a.y, b.y) <= h + M;
    let n = 0, open = false;
    const put = (p, s, E) => { emit(p, s, (f.E0 - E) / TAU); open = true; n++; };
    const cut = () => { if (open) { emit(null); open = false; } };
    const span = (E1, p1, s1, E2, p2, s2, d) => {
      if (s1 && s2) {
        if (d >= 14 || n >= cap || !seen(s1, s2) || Math.hypot(s2.x - s1.x, s2.y - s1.y) <= maxPx) { put(p2, s2, E2); return; }
      } else if (d >= 14 || n >= cap || (!s1 && !s2 && d >= 3)) { cut(); if (s2) put(p2, s2, E2); return; }
      const Em = (E1 + E2) / 2, pm = at(Em), sm = project(pm);
      span(E1, p1, s1, Em, pm, sm, d + 1); span(Em, pm, sm, E2, p2, s2, d + 1);
    };
    let E1 = f.E0, p1 = at(E1), s1 = project(p1);
    if (s1) put(p1, s1, E1);
    for (let k = 1; k <= 96; k++) { const E2 = f.E0 - TAU * k / 96, p2 = at(E2), s2 = project(p2); span(E1, p1, s1, E2, p2, s2, 0); E1 = E2; p1 = p2; s1 = s2; }
    cut();
  },
  /* Whose orbits Orbits draws: every named body; in a scene without names, the twelve heaviest planets. */
  orbiters() {
    const named = this.bodies.filter(b => b.label && b.kind !== 'star');
    return named.length ? named : this.bodies.filter(b => b.kind !== 'star' && b.m > 0).sort((a, b) => b.m - a.m).slice(0, 12);
  },
  drawOrbits(g, ox, oy, z, w, h) {
    g.lineWidth = 1; g.setLineDash([]); g.lineJoin = 'round'; g.lineCap = 'round';
    const project = p => ({ x: p[0] * z + ox, y: p[1] * z + oy });
    for (const b of this.orbiters()) {
      // A moon's orbit shows once it is drawn clear of its planet.
      if (b.host && !this.apart(b, z)) continue;
      const P = this.pullHost(b), f = P && this.orbitFrame(b, P); if (!f) continue;
      // Brightest at the body and fading back round the orbit, so each line shows which way its body goes.
      const base = b.host ? 0.46 : 0.38, alpha = k => base * (1 - 0.72 * k / 7);
      let band = -1, open = false;
      g.strokeStyle = bodyCss(b);
      this.orbitCurve(f, project, (p, s, u) => {
        if (!p) { if (open) g.stroke(); open = false; return; }
        const k = Math.min(7, Math.floor(u * 8));
        if (!open) { g.globalAlpha = alpha(k); g.beginPath(); g.moveTo(s.x, s.y); open = true; band = k; return; }
        g.lineTo(s.x, s.y);
        if (k !== band) { g.stroke(); g.globalAlpha = alpha(k); g.beginPath(); g.moveTo(s.x, s.y); band = k; }
      }, { maxPx: 5, w, h });
      if (open) g.stroke();
    }
    g.globalAlpha = 1; g.lineCap = 'butt';
  },
  /* The hover readout: the name, if it has one; the mass, if it has any; and the speed. */
  hoverText(b) { return `${b.name ? `${b.name} · ` : ''}${b.m > 0 ? `${this.massText(b.m, true)} · ` : ''}${fmtQ(this, 'speed', Math.hypot(b.vx, b.vy, b.vz))}`; },
  /* Names beside the named bodies, as [body, x, y, drawn radius] on the stage; a moon's only once it stands clear of
     its planet. */
  drawNames(g, list) {
    g.font = `500 10.5px ${THEME.mono}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(5,8,13,0.78)';
    // Where names would overlap, the more important one keeps its place: the followed body, the Sun, the planets,
    // the dwarf planets and comets, then the moons, heaviest first.
    const major = b => !b.host && b.kind !== 'dwarf' && b.kind !== 'icy' && b.kind !== 'comet';
    const rank = b => (b.id === this.track ? 0 : b.kind === 'star' ? 1 : major(b) ? 2 : b.host ? 4 : 3);
    list.sort((p, q) => rank(p[0]) - rank(q[0]) || q[0].m - p[0].m);
    const taken = [];
    // The names drawn, with their bodies, are what the head-up display's callout keeps off (hudClear).
    this.hudClear = [];
    for (const [b, X, Y, R] of list) {
      // A star's name stands clear of its glow.
      const x = X + (b.kind === 'star' ? R * 1.7 : R) + 4, y = Y - Math.min(R, 6) - 2, l = x - 2, r = x + g.measureText(b.name).width + 2, t = y - 7, d = y + 7;
      if (taken.some(q => l < q[2] && r > q[0] && t < q[3] && d > q[1])) continue;
      taken.push([l, t, r, d]); this.hudClear.push({ l: X - R - 2, t, r, b: d });
      // A dark halo keeps a name legible where it crosses an orbit or a trail.
      g.strokeText(b.name, x, y);
      g.fillStyle = major(b) ? 'rgba(232,238,246,0.88)' : 'rgba(176,190,206,0.76)';
      g.fillText(b.name, x, y);
    }
  },
  draw(g, w, h) {
    const B = this.bodies, cam = this.cam;
    let tb = null;
    if (this.track != null) { tb = B.find(b => b.id === this.track) || null; if (!tb) this.track = null; }
    if (tb) { const k = this.trackEase = Math.min(1, this.trackEase + 0.06); cam.x += (tb.x - cam.x) * k; cam.y += (tb.y - cam.y) * k; }
    else if (this.p.follow && B.length) {
      let M = 0, cx = 0, cy = 0;
      for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; }
      cam.x += (cx / M - cam.x) * 0.25; cam.y += (cy / M - cam.y) * 0.25;
    }
    const z = cam.z, ox = w / 2 - cam.x * z, oy = h / 2 - cam.y * z;
    this.viewXf = { ox, oy, z }; this.hudClear = null;
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    g.fillStyle = '#cfd8e3';
    for (const s of this.stars) { g.globalAlpha = s.a; g.fillRect(s.x * w, s.y * h, s.s, s.s); }
    g.globalAlpha = 1;
    if (this.p.field && B.length) this.drawField(g, w, h, ox, oy, z);
    if (this.p.trails) {
      const len0 = Math.round(this.p.trailLen);
      g.lineWidth = 1.2; g.lineJoin = 'round';
      for (const b of B) {
        const len = Math.min(b.tn, len0);
        if (len < 2) continue;
        g.strokeStyle = bodyCss(b);
        const chunks = 6, per = Math.ceil(len / chunks);
        for (let c = 0; c < chunks; c++) {
          const k0 = c * per, k1 = Math.min(len - 1, (c + 1) * per);
          if (k0 >= k1) break;
          g.globalAlpha = 0.06 + 0.5 * (c + 1) / chunks;
          g.beginPath();
          for (let k = k0; k <= k1; k++) {
            const idx = (b.th - len + k + TRAIL_CAP) % TRAIL_CAP, X = b.trail[idx * 2] * z + ox, Y = b.trail[idx * 2 + 1] * z + oy;
            k === k0 ? g.moveTo(X, Y) : g.lineTo(X, Y);
          }
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    if (this.p.orbits) this.drawOrbits(g, ox, oy, z, w, h);
    const S = B.filter(b => b.kind === 'star'), names = this.p.labels ? [] : null;
    for (const b of B) {
      const X = b.x * z + ox, Y = b.y * z + oy, R = this.drawR(b, z);
      if (X < -R * 4 || Y < -R * 4 || X > w + R * 4 || Y > h + R * 4) continue;
      // A moon still inside its planet's disc on screen waits until a zoom draws them apart.
      if (!this.apart(b, z)) continue;
      if (names && b.label) names.push([b, X, Y, R]);
      if (R >= 2.6 && ringed(b)) {
        // Saturn's rings reach about 2.3 radii; from the north they are a broad pale band about the planet, its own
        // colour washed toward ice.
        const c = bodyRgb(b);
        g.strokeStyle = `rgba(${(c[0] + 226) >> 1},${(c[1] + 210) >> 1},${(c[2] + 176) >> 1},0.55)`; g.lineWidth = Math.max(1, R * 0.55);
        g.beginPath(); g.ellipse(X, Y, R * 1.85, R * 1.62, 0.45, 0, TAU); g.stroke();
      }
      if (b.kind === 'star') {
        const grd = g.createRadialGradient(X, Y, R * 0.6, X, Y, R * 3.4);
        grd.addColorStop(0, 'rgba(242,165,65,0.32)'); grd.addColorStop(1, 'rgba(242,165,65,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(X, Y, R * 3.4, 0, TAU); g.fill();
        drawStar(g, X, Y, R);
      } else if (R < 2.6) {
        g.fillStyle = this.climateOf(b).css; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill();
      } else {
        let lx = 0, ly = 0;
        for (const s of S) { const dx = s.x - b.x, dy = s.y - b.y, d2 = dx * dx + dy * dy + 1, f = s.m / (d2 * Math.sqrt(d2)); lx += dx * f; ly += dy * f; }
        const L = Math.hypot(lx, ly);
        if (L > 0) { lx /= L; ly /= L; } else { lx = -0.6; ly = -0.8; }
        drawLit(g, X, Y, R, this.climateOf(b).rgb, lx, ly);
        this.drawHeat(g, X, Y, R, b.clim, lx, ly);
      }
      if (this.p.vectors) {
        const vx = b.vx * 0.3 * z, vy = b.vy * 0.3 * z, L = Math.hypot(vx, vy);
        if (L > 3) {
          g.strokeStyle = THEME.cyan; g.lineWidth = 1.2; g.globalAlpha = 0.85;
          g.beginPath(); g.moveTo(X, Y); g.lineTo(X + vx, Y + vy); g.stroke();
          const a = Math.atan2(vy, vx);
          g.beginPath(); g.moveTo(X + vx, Y + vy); g.lineTo(X + vx - 6 * Math.cos(a - 0.45), Y + vy - 6 * Math.sin(a - 0.45));
          g.moveTo(X + vx, Y + vy); g.lineTo(X + vx - 6 * Math.cos(a + 0.45), Y + vy - 6 * Math.sin(a + 0.45)); g.stroke();
          g.globalAlpha = 1;
        }
      }
    }
    if (names) this.drawNames(g, names);
    this.drawMarks(g, w, h);
    if (this.aim && this.aim.moved) {
      const a = this.aim, wS = this.toWorld({ x: a.sx, y: a.sy });
      const m = (this.next || this.drawNew()).m, dx = (a.x - a.sx) / z, dy = (a.y - a.sy) / z, o = this.throwFrom(wS.x, wS.y, 0, dx, dy, m);
      const t = this.throwVel(o.x, o.y, 0, dx, dy, 0, Math.hypot(a.x - a.sx, a.y - a.sy), m), path = this.predict(o.x, o.y, t.vx, t.vy);
      g.setLineDash([4, 5]); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3;
      g.beginPath();
      for (let i = 0; i < path.length; i += 2) { const X = path[i] * z + ox, Y = path[i + 1] * z + oy; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.strokeStyle = THEME.text; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(a.x, a.y); g.stroke();
      const ang = Math.atan2(a.y - a.sy, a.x - a.sx);
      g.fillStyle = THEME.text; g.beginPath();
      g.moveTo(a.x, a.y); g.lineTo(a.x - 9 * Math.cos(ang - 0.4), a.y - 9 * Math.sin(ang - 0.4)); g.lineTo(a.x - 9 * Math.cos(ang + 0.4), a.y - 9 * Math.sin(ang + 0.4)); g.fill();
      const look = this.nextLook();
      g.fillStyle = look.css; g.beginPath(); g.arc(a.sx, a.sy, Math.max(2, look.r * z), 0, TAU); g.fill();
      g.font = `400 11px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillText(this.throwText(t), a.x + 10, a.y - 6);
    }
  },
  // The readings this lab is about lead the deck with larger figures; the rest follow as secondary.
  primary: ['Total energy E', 'Energy drift since last change'],
  readouts() {
    let px = 0, py = 0, pz = 0;
    for (const b of this.bodies) { px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; }
    const n = this.bodies.length, drift = this.E0 ? (this.E - this.E0) / Math.abs(this.E0) * 100 : 0, ad = Math.abs(drift);
    return [
      ['Bodies', String(n)],
      ['Total energy E', fmtSI(this.E)],
      ['Energy drift since last change', n > 1 ? `${drift >= 0 ? '+' : ''}${drift.toFixed(3)} %` : '—', n > 1 ? (ad < 0.1 ? 'ok' : ad < 1 ? 'warn' : 'crit') : 'idle'],
      ['Virial ratio 2K / |U|', n > 1 && this.PE ? (2 * this.Kint / Math.abs(this.PE)).toFixed(3) : '—', undefined, 'derived'],
      ['Total momentum |p|', fmtSI(Math.hypot(px, py, pz))],
      ['Merged · escaped', `${this.merged} · ${this.escaped}`],
      ['Orbit tilts', this.tilts()],
    ];
  },
  /* Range of orbital inclinations relative to the heaviest body's frame. */
  tilts() {
    if (this.bodies.length < 2) return '—';
    let lo = 180, hi = 0;
    // Each orbit about what it goes round (a moon about its planet), measured from the scene's forward pole.
    for (const b of this.bodies) {
      const H = this.pullHost(b); if (!H) continue;
      const { rx, ry, rz, vx, vy, vz } = this.relative(b, H);
      const lx = ry * vz - rz * vy, ly = rz * vx - rx * vz, lz = rx * vy - ry * vx, L = Math.hypot(lx, ly, lz); if (!L) continue;
      const i = Math.acos(clamp(this.pole() * lz / L, -1, 1)) * 180 / Math.PI; lo = Math.min(lo, i); hi = Math.max(hi, i);
    }
    if (hi < 0.05) return 'flat (0°)';
    return `${lo.toFixed(0)}° – ${hi.toFixed(0)}°`;
  },
  enabled(key) {
    if (key === 'field' && this.is3D()) return 'Drawn in the flat view only.';
    if (key === 'marks' && !this.is3D()) return 'Drawn in the 3D view only.';
    if (key === 'marks' && this.sky && this.p.orbits) return 'In Our Solar System the orbits show each tilt; turn Orbits off for the marks.';
    if (key === 'launchMass' && this.p.rand) return 'Random new bodies picks each mass.';
    return true;
  },
  bodyColor3: b => (b.kind === 'star' ? '#ffcf7a' : bodyCss(b)),
  ringed,
  diagnose() {
    const out = [], B = this.bodies, n = B.length;
    if (!n) { out.push({ id: 'g-empty', level: 'info', title: 'Empty sky', body: 'Drag on the stage to throw a body, or click to drop one in place.' }); return out; }
    if (n > 1) {
      const drift = this.E0 ? (this.E - this.E0) / Math.abs(this.E0) * 100 : 0, ad = Math.abs(drift);
      let worst = Infinity, wd = 0;
      if (ad > 1) {
        const h = this.dt();
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = B[i], b = B[j], d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), v = Math.hypot(b.vx - a.vx, b.vy - a.vy, b.vz - a.vz);
          if (v > 0) { const steps = d / v / h; if (steps < worst) { worst = steps; wd = d; } }
        }
        const fixes = [];
        if (this.p.soft < 12) fixes.push({ label: `Soften to ε = ${fmtQ(this, 'len', Math.min(30, Math.max(8, this.p.soft * 2)))}`, run() { setParam(gravity, 'soft', Math.min(30, Math.max(8, gravity.p.soft * 2))); } });
        if (!this.p.merge) fixes.push({ label: 'Merge on contact', run() { setParam(gravity, 'merge', true); } });
        out.push({ id: 'g-drift', level: ad > 5 ? 'crit' : 'warn', title: 'Energy is drifting',
          body: `Total energy has moved <b>${drift.toFixed(2)}%</b> since the last change.${Number.isFinite(worst) ? ` The tightest pass (${fmtQ(this, 'len', wd)} apart) lasts only about <b>${worst.toFixed(1)} steps</b> of 1/480 s, too few to follow the curve.` : ''} Softening or merging tames close encounters.`, fixes });
      }
      if (this.Eint > 0) out.push({ id: 'g-unbound', level: 'info', title: 'System is unbound', body: `Energy in the centre-of-mass frame is positive (${fmtSI(this.Eint)}), so gravity cannot hold everything together: some bodies are on escape paths.` });
      else if (this.PE) {
        const vr = 2 * this.Kint / Math.abs(this.PE);
        if (this.presetId === 'disk' || n > 40) out.push({ id: 'g-virial', level: 'info', title: 'Virial balance', body: `2K/|U| = <b>${vr.toFixed(2)}</b> at this instant. A settled self-gravitating system averages 1; held below 1 it is still collapsing, above 1 it is puffing up.` });
      }
    }
    if (this.sky) {
      const nep = this.bodies.find(b => b.name === 'Neptune'), T = nep ? 164.8 * AU_YR / 4 : NaN;
      out.push({ id: 'g-sky', level: 'info', title: 'Our Solar System', body: `The sky of 1 January 2000, with real masses, sizes and orbits. A year passes in ${AU_YR.toFixed(1)} s at 1×${Number.isFinite(T) ? `, so Neptune takes about ${Math.round(T / 60)} minutes to go round at 4×` : ''}. Click a planet to follow it, then zoom in to watch its moons. The belts are massless test bodies: they feel the planets and pull on nothing.` });
    }
    if (n > 150 && !this.sky) out.push({ id: 'g-pairs', level: 'info', title: 'Many pair forces', body: `${n} bodies means <b>${fmtSI(n * (n - 1) / 2)}</b> pair forces per step, ${fmtSI(n * (n - 1) / 2 * 480)} per simulated second. Deleting light bodies or merging speeds it up.` });
    if (this.p.soft > 15) out.push({ id: 'g-soft', level: 'info', title: 'Wide softening', body: `With ε = ${fmtQ(this, 'len', this.p.soft)}, gravity weakens inside about that distance, so close passes slide through each other instead of slingshotting.` });
    if (this.escaped) out.push({ id: 'g-esc', level: 'info', title: 'Bodies escaped', body: `${this.escaped} bod${this.escaped === 1 ? 'y' : 'ies'} passed ${fmtQ(this, 'len', this.cullR())} from the centre of mass and ${this.escaped === 1 ? 'was' : 'were'} removed.` });
    return out;
  },
  perfFixes() {
    const n = this.bodies.length;
    // In the Solar System the lightest half would take the small moons with the belts; the belts' unnamed bodies are
    // most of each step's work there (each feels all 31 bodies with mass), and nothing feels them.
    if (this.sky) {
      const belt = this.bodies.filter(b => b.m === 0 && !b.name);
      return belt.length ? [{ label: `Remove the ${belt.length} belt bodies`, run() { const cut = new Set(belt); gravity.bodies = gravity.bodies.filter(b => !cut.has(b)); gravity.accDirty = true; } }] : [];
    }
    return n > 120 ? [{ label: 'Delete the lightest half', run() { const s = [...gravity.bodies].sort((a, b) => a.m - b.m); const cut = new Set(s.slice(0, Math.floor(s.length / 2))); gravity.bodies = gravity.bodies.filter(b => !cut.has(b)); gravity.accDirty = true; gravity.E0 = gravity.energy(); } }] : [];
  },
  sane() { return this.bodies.every(b => Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.vx)); },
  chart: {
    title: 'Energy exchange',
    caption: 'Kinetic energy (amber) and potential energy (cyan) trade places along every orbit; their sum E (white) should stay flat.',
    draw(c) {
      const s = gravity.series;
      if (s.e.n < 2) { chartMessage(c.g, c.w, c.h, gravity.bodies.length > 1 ? 'Collecting samples…' : 'Add two or more bodies'); return; }
      const [lo, hi] = seriesRange([s.ke, s.pe, s.e]), box = chartFrame(c.g, c.w, c.h, lo, hi, fmtSI);
      drawSeries(c.g, box, s.ke, lo, hi, THEME.amber);
      drawSeries(c.g, box, s.pe, lo, hi, THEME.cyan);
      drawSeries(c.g, box, s.e, lo, hi, THEME.text, { width: 1.3 });
    },
  },
  /* The body the live formulas follow: the one the camera follows, else the heaviest planet, and what it orbits. */
  orbitOf() {
    const b = (this.track != null && this.bodies.find(q => q.id === this.track)) || this.bodies.filter(q => q.kind !== 'star').sort((x, y) => y.m - x.m)[0];
    if (!b) return null;
    const P = this.pullHost(b); if (!P) return null;
    const { rx, ry, rz, vx, vy, vz, mu } = this.relative(b, P);
    const r = Math.hypot(rx, ry, rz), u = Math.hypot(vx, vy, vz), E = u * u / 2 - mu / r;
    // Eccentricity vector ((u² − μ/r) r − (r·v) v) / μ: how far the orbit is from a circle.
    const k = u * u - mu / r, rv = rx * vx + ry * vy + rz * vz, e = Math.hypot(k * rx - rv * vx, k * ry - rv * vy, k * rz - rv * vz) / mu;
    return { b, P, r, u, mu, e, a: E < 0 ? -mu / (2 * E) : Infinity, name: nameOf(b), ref: refName(P) };
  },
  /* The Math page's live panels (livemath.js). */
  mathLive: {
    accel: {
      params: ['G', 'soft'],
      vars: L => [['N', String(L.bodies.length), 'Bodies pulling on each other: every pair is summed.'], ['G', `${L.p.G.toFixed(2)}×`, 'Gravity strength, as a multiple of the scenes\' own.'], ['ε', fmtQ(L, 'len', L.p.soft), 'Softening length: keeps a close pass from flinging bodies apart.']],
    },
    leapfrog: {
      vars: L => [['Δt', `${(L.dt() * 1000).toFixed(2)} ms`, 'One kick–drift–kick step.'], ['E', fmtSI(L.E), 'Total energy now, in simulation units.'], ['drift', L.E0 ? `${((L.E - L.E0) / Math.abs(L.E0) * 100).toFixed(3)} %` : '—', 'Energy change since the scene or a setting last changed.']],
      check: L => { const d = L.E0 ? Math.abs((L.E - L.E0) / L.E0) : NaN; return Number.isFinite(d) ? { text: d < 0.001 ? `Energy holds to ${(d * 100).toFixed(3)} %: a symplectic step lets the error swing, never pile up.` : `Energy has moved ${(d * 100).toFixed(2)} %: a close pass or a merger, larger than a step can follow exactly.`, state: d < 0.001 ? 'ok' : d < 0.01 ? 'warn' : 'crit' } : null; },
    },
    vcirc: {
      params: ['G', ['orbitK', 'drop']],
      vars: L => { const o = L.orbitOf(); return o ? [['M', L.massText(o.P.m, true), `The mass of ${o.ref}.`], ['r', fmtQ(L, 'len', o.r), `${o.name}'s distance from ${o.ref}.`], ['v', fmtQ(L, 'speed', o.u), `${o.name}'s speed relative to ${o.ref}.`]] : []; },
      // The theory is the circular speed of the law the run uses, softening and all, which is the formula's for r ≫ ε.
      // A body on an ellipse is not meant to move at it, so the check names the ellipse instead of calling it a miss.
      check: L => {
        const o = L.orbitOf(); if (!o) return { text: 'Add a planet around a star to compare.' };
        const vc = L.vCirc(o.P.m + o.b.m, o.r);
        if (o.e > 0.05) return { text: `${o.name} is on ${o.e < 1 ? `an ellipse, e = ${o.e.toFixed(2)}` : 'an escape path'}, so its speed swings about the circular one: ${fmtQ(L, 'speed', o.u)} against ${fmtQ(L, 'speed', vc)} here.`, state: 'idle' };
        return { what: `${o.name}, circular speed at its r`, theory: vc, sim: o.u, fmt: v => fmtQ(L, 'speed', v), tol: 0.05 };
      },
    },
    kepler: {
      vars: L => { const o = L.orbitOf(); return o ? [['a', Number.isFinite(o.a) ? fmtQ(L, 'len', o.a) : 'unbound', `Semi-major axis of ${o.name}'s orbit.`], ['M', L.massText(o.P.m, true), `The mass of ${o.ref}.`], ['T', Number.isFinite(o.a) ? L.timeText(TAU * Math.sqrt(o.a ** 3 / o.mu)) : '—', 'The period this law gives.']] : []; },
      // The law from the orbit's size now, against the time the planet actually took for its last full turn.
      check: L => { const o = L.orbitOf(); if (!o) return { text: 'Add a planet around a star to time its orbit.' }; if (!Number.isFinite(o.a)) return { text: `${o.name} is not bound to ${o.ref}, so it has no period.`, state: 'warn' }; if (L.kepFast) return { text: `${o.name} goes round ${o.ref} faster than each frame can follow at this speed: slow the run down to time it.` }; return { what: `${o.name}, one full orbit`, theory: TAU * Math.sqrt(o.a ** 3 / o.mu), sim: L.kepT, fmt: v => L.timeText(v), tol: 0.05, wait: `Period: timing ${o.name}'s next full turn around ${o.ref}…` }; },
    },
    virial: {
      vars: L => [['K', fmtSI(L.Kint), 'Kinetic energy of every body, in the centre-of-mass frame.'], ['U', fmtSI(L.PE), 'Potential energy of every pair.'], ['2K / |U|', L.PE ? (2 * L.Kint / Math.abs(L.PE)).toFixed(3) : '—', 'The virial ratio at this instant.']],
      // The theorem holds for averages over time, not at each instant (an eccentric orbit swings the instantaneous
      // ratio far from 1), so the check averages K and U over the energy chart's window, up to 40 s. K is taken in
      // the centre-of-mass frame: the drift of the whole system adds kinetic energy that no orbit balances.
      check: L => {
        if (!(L.bodies.length > 1 && L.Eint < 0)) return { text: 'The virial theorem describes a settled, bound system: energy in the centre-of-mass frame below zero.' };
        const K = L.series.kint, U = L.series.pe, n = Math.min(K.n, U.n);
        let k = 0, u = 0; for (let i = 0; i < n; i++) { k += K.v[K.idx(i)]; u += U.v[U.idx(i)]; }
        const span = n > 1 ? K.t[K.idx(n - 1)] - K.t[K.idx(0)] : 0;
        return { what: `Virial ratio 2⟨K⟩ / |⟨U⟩| over ${span.toFixed(0)} s`, theory: 1, sim: n >= 30 && u ? 2 * k / Math.abs(u) : NaN, fmt: v => v.toFixed(3), tol: 0.1, wait: 'Virial ratio: averaging K and U over a few seconds of the run…' };
      },
    },
  },
  math: `
    <p>Acceleration of body <i>i</i>, with a softening length ε that keeps close passes finite:</p>
    <div class="f" data-live="accel" data-tex="\\mathbf a_i = \\sum_{j \\ne i} \\frac{G\\, m_j\\,(\\mathbf r_j - \\mathbf r_i)}{\\left(|\\mathbf r_j - \\mathbf r_i|^2 + \\varepsilon^2\\right)^{3/2}}"></div>
    <p>Each step is a kick–drift–kick leapfrog with Δt = 1/480 s. It is symplectic, so the energy error oscillates instead of piling up.</p>
    <div class="f" data-live="leapfrog" data-tex="\\begin{aligned} \\mathbf v &amp;\\leftarrow \\mathbf v + \\tfrac12\\,\\mathbf a\\,\\Delta t \\\\ \\mathbf x &amp;\\leftarrow \\mathbf x + \\mathbf v\\,\\Delta t \\\\ \\mathbf v &amp;\\leftarrow \\mathbf v + \\tfrac12\\,\\mathbf a\\,\\Delta t \\end{aligned}"></div>
    <p>Clicking drops a body at this speed times the drop-speed setting, so at 1× its orbit is a circle. Inside a few softening lengths ε the pull weakens, and the run uses the softened speed, which this formula gives for r ≫ ε:</p>
    <div class="f" data-live="vcirc" data-tex="v = \\sqrt{\\frac{G\\,(M + m)}{r}}"></div>
    <p>Kepler’s third law ties the period to the semi-major axis alone, for the pair of masses together. The Kepler scene gives three eccentricities one axis, so all three share one period; the panel times a full turn of the followed planet against it.</p>
    <div class="f" data-live="kepler" data-tex="T = 2\\pi \\sqrt{\\frac{a^3}{G\\,(M + m)}}"></div>
    <p>The potential field draws Φ for the 24 heaviest bodies. Each contour band is a factor of 10<sup>¼</sup> in |Φ|.</p>
    <div class="f" data-tex="\\Phi(\\mathbf r) = -\\sum_j \\frac{G\\, m_j}{|\\mathbf r - \\mathbf r_j|}"></div>
    <p>A settled, bound system satisfies the virial theorem, on average over time: an eccentric orbit swings the ratio at each instant, so the panel averages over the energy chart's window. K is measured in the centre-of-mass frame, so a system drifting as a whole, after a throw, still balances. The figure-eight uses the initial conditions of <cite>Chenciner &amp; Montgomery (2000)</cite>.</p>
    <div class="f" data-live="virial" data-tex="2\\,\\langle K \\rangle = -\\langle U \\rangle"></div>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(gravity, {
  histBudget: 16e6, histInterval: 0.2,
  snapshot() {
    const B = this.bodies, n = B.length, a = new Float64Array(n * 7), { G, soft, merge } = this.p;
    for (let i = 0; i < n; i++) { const b = B[i], o = i * 7; a[o] = b.x; a[o + 1] = b.y; a[o + 2] = b.vx; a[o + 3] = b.vy; a[o + 4] = b.m; a[o + 5] = b.z; a[o + 6] = b.vz; }
    return { stride: 7, a, ids: B.map(b => b.id), kinds: B.map(b => b.kind), metas: B.map(b => b.meta || null), merged: this.merged, escaped: this.escaped, E0: this.E0, cam: { ...this.cam }, stepCount: this.stepCount, p: { G, soft, merge },
      warmth: B.map(b => (b.clim ? [b.clim.T, b.clim.Sbar, b.clim.abar] : null)) };
  },
  restore(s) {
    Object.assign(this.p, s.p);
    const B = [];
    const st = s.stride || 5;
    for (let i = 0; i < s.ids.length; i++) {
      const o = i * st, meta = s.metas ? s.metas[i] : null, b = this.body(s.a[o], s.a[o + 1], s.a[o + 2], s.a[o + 3], s.a[o + 4], st >= 7 ? s.a[o + 5] : 0, st >= 7 ? s.a[o + 6] : 0, null, meta);
      b.id = s.ids[i]; b.kind = storedKind(s.kinds && s.kinds[i], b.m, meta); B.push(b);
    }
    linkHosts(B);
    Object.assign(this, { bodies: B, merged: s.merged, escaped: s.escaped, cam: { ...this.cam, ...s.cam }, stepCount: s.stepCount, aim: null, pan: null, accDirty: true });
    this.prepare();
    if (this.track != null && !B.some(b => b.id === this.track)) this.track = null;
    this.p.zoom = this.cam.z;
    this.energy(); this.E0 = s.E0;
    this.keepWarmth(s.warmth);
    for (const ser of Object.values(this.series)) ser.truncateAfter(this.t);
    this.lastSample = this.t;
    return true;
  },
  serialize() {
    return { bodies: this.bodies.map(b => ({ id: b.id, kind: b.kind, m: b.m, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, ...(b.meta ? { meta: b.meta } : {}), ...(b.clim ? { warmth: [b.clim.T, b.clim.Sbar, b.clim.abar] } : {}) })), merged: this.merged, escaped: this.escaped, E0: this.E0, cam: { ...this.cam }, stepCount: this.stepCount };
  },
  deserialize(o) {
    if (!o || !Array.isArray(o.bodies)) return false;
    this.bodies = o.bodies.map(d => { const b = this.body(+d.x, +d.y, +d.vx, +d.vy, +d.m, +d.z || 0, +d.vz || 0, null, cleanMeta(d.meta)); if (d.id != null) b.id = d.id; b.kind = storedKind(d.kind, b.m, b.meta); return b; });
    linkHosts(this.bodies);
    this.uid = Math.max(this.uid, ...this.bodies.map(b => +b.id || 0));
    this.merged = o.merged || 0; this.escaped = o.escaped || 0; this.stepCount = o.stepCount || 0;
    if (o.cam) this.cam = { x: +o.cam.x || 0, y: +o.cam.y || 0, z: clamp(+o.cam.z || this.p.zoom, this.zoomRange[0], this.zoomRange[1]) };
    this.p.zoom = this.cam.z; this.track = null;
    // A state saved while Gravity still had a Pan tool comes back with Throw; panning is the view controls' hand.
    if (this.p.tool === 'pan') this.p.tool = 'throw';
    this.accDirty = true; this.prepare(); this.E0 = this.energy(); if (Number.isFinite(o.E0)) this.E0 = o.E0;
    this.keepWarmth(o.bodies.map(d => d.warmth));
    for (const s of Object.values(this.series)) s.clear();
    return true;
  },
  // t_years joined in 2.16, after the columns earlier datasets already had, so their analyses still line up.
  dataColumns: ['t_s', 'bodies', 'kinetic_energy', 'potential_energy', 'total_energy', 'energy_drift_pct', 'virial_2K_over_absU', 'momentum_x', 'momentum_y', 'com_x', 'com_y', 'momentum_z', 'com_z', 't_years'],
  /* What each recorded column means, for a dataset's README and data package: [unit, meaning, SI unit, factor to it].
     The scale is the Star system's: 1 AU is 135 px, the Sun weighs 1000, and at G = 1× a year is AU_YR seconds. */
  dataInfo: (() => {
    const L = AU_M / AU_PX, T = YR_S / AU_YR, M = 1.98847e30 / 1000, E = M * L * L / (T * T), P = M * L / T;
    return {
      t_s: ['sim s', 'Time on the simulation clock. At G = 1×, one year passes every 4.41 simulated seconds.', 's', T],
      t_years: ['yr', 'The same time in years, on the Star system\'s scale: one year is the orbit of a planet 1 AU from a star of one solar mass, at G = 1×.', 's', YR_S],
      bodies: ['count', 'Bodies in the scene, after any merges and escapes.'],
      kinetic_energy: ['sim energy', 'Total kinetic energy, ½Σmv².', 'J', E],
      potential_energy: ['sim energy', 'Total gravitational potential energy, −ΣGmm/r over every pair, with the softening length ε.', 'J', E],
      total_energy: ['sim energy', 'Kinetic plus potential energy: constant for an isolated system, apart from merges and escapes.', 'J', E],
      energy_drift_pct: ['%', 'How far the total energy has moved since it was last reset (a scene, a merge, an escape or a change of G), as a share of its size: the integrator\'s error.'],
      virial_2K_over_absU: ['1', 'Twice the kinetic energy in the centre-of-mass frame over |potential energy|: 1 for a bound system in equilibrium (the virial theorem).'],
      momentum_x: ['sim momentum', 'Total momentum Σmv, x component.', 'kg·m/s', P],
      momentum_y: ['sim momentum', 'Total momentum, y component.', 'kg·m/s', P],
      momentum_z: ['sim momentum', 'Total momentum, z component (out of the orbital plane).', 'kg·m/s', P],
      com_x: ['px', 'Centre of mass, x. 135 px is 1 AU.', 'm', L],
      com_y: ['px', 'Centre of mass, y.', 'm', L],
      com_z: ['px', 'Centre of mass, z (out of the orbital plane).', 'm', L],
      body_id: ['id', 'The body\'s number: unique in this run, kept through merges by the heavier body, never reused.'],
      name: ['text', 'The body\'s name, or "Body" and its number.'],
      kind: ['text', 'Its class: star, brown dwarf, gas giant, ice giant, sub-Neptune, super-Earth, terrestrial, dwarf planet, icy body or comet.'],
      orbits_id: ['id', 'The body_id of what this body orbits at that moment, the reference Inspect uses: a moon\'s planet, else the heavier body that pulls on it hardest. Empty for the heaviest body.'],
      mass: ['sim mass', 'Mass. 1000 is one solar mass, about 0.955 one Jupiter, 0.003 one Earth; 0 is a test body that feels gravity but pulls on nothing.', 'kg', M],
      x: ['px', 'Position, x, in the orbital plane. 135 px is 1 AU.', 'm', L],
      y: ['px', 'Position, y, in the orbital plane.', 'm', L],
      z: ['px', 'Position, z, out of the orbital plane.', 'm', L],
      vx: ['px/sim s', 'Velocity, x.', 'm/s', L / T],
      vy: ['px/sim s', 'Velocity, y.', 'm/s', L / T],
      vz: ['px/sim s', 'Velocity, z.', 'm/s', L / T],
      temperature_K: ['K', 'Mean surface temperature, or at the cloud tops of a giant: from the starlight it receives, the share it reflects, the heat its air traps and its own heat, following a change of starlight with a lag. Empty for a star.', 'K', 1],
      instellation_earth: ['Earth = 1', 'Starlight falling on each square metre that faces its stars, from every star, as a multiple of what Earth receives from the Sun (1361 W/m²). Empty for a star.', 'W/m²', S_W],
    };
  })(),
  dataNote: 'Positions are relative to the scene\'s origin, where its centre of mass sat when it was built. The scale holds at G = 1×; with G changed, gravity is stronger or weaker than in the real units the scale names.',
  /* The bodies when a recording starts, so a reader knows who body 448 was. */
  dataContext() {
    const bodies = this.bodies.map(b => { const P = this.pullHost(b); return { id: b.id, name: nameOf(b), kind: KINDS[b.kind].label, mass: b.m, mass_text: b.m > 0 ? this.massText(b.m) : 'massless', orbits_id: P ? P.id : null, orbits: P ? nameOf(P) : null }; });
    return {
      bodies,
      facts: [['Bodies', bodies.length], ['Gravity strength G', `${this.p.G}× (the scale's real units hold at 1×)`], ['Softening length ε', `${this.p.soft} px`], ['Merge on contact', this.p.merge ? 'on' : 'off']],
      tables: [{ title: 'Bodies at the start', note: `The ${bodies.length} bodies when the recording started. Bodies can merge, escape or be added during a run; the tracks name every one at every sample.`,
        head: ['body_id', 'Name', 'Kind', 'Mass (sim)', 'Mass', 'Orbits'], rows: bodies.map(b => [b.id, b.name, b.kind, b.mass, b.mass_text, b.orbits_id == null ? '' : `${b.orbits} (${b.orbits_id})`]) }],
    };
  },
  dataRow() {
    this.energy();
    let M = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0;
    for (const b of this.bodies) { M += b.m; px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    return [this.t, this.bodies.length, this.KE, this.PE, this.E, this.E0 ? (this.E - this.E0) / Math.abs(this.E0) * 100 : 0, this.PE ? 2 * this.Kint / Math.abs(this.PE) : NaN, px, py, M ? cx / M : NaN, M ? cy / M : NaN, pz, M ? cz / M : NaN, this.t / AU_YR];
  },
  trackLabel: 'Per-body tracks',
  // t_years, name, kind and orbits_id joined in 2.16, after the columns earlier tracks already had; temperature_K and
  // instellation_earth in 2.18, after those.
  trackColumns: ['t_s', 'body_id', 'mass', 'x', 'y', 'vx', 'vy', 'z', 'vz', 't_years', 'name', 'kind', 'orbits_id', 'temperature_K', 'instellation_earth'],
  trackRows(out) {
    const ty = this.t / AU_YR;
    for (const b of this.bodies) {
      const P = this.pullHost(b), c = b.kind === 'star' ? null : this.climateOf(b);
      out.push([this.t, b.id, b.m, b.x, b.y, b.vx, b.vy, b.z, b.vz, ty, nameOf(b), KINDS[b.kind].label, P ? P.id : null, c ? c.T : null, c ? c.S : null]);
    }
  },
});

/* ---------- climate from starlight: each world's warmth, air, ice and spin (the physics is in climate.js) ---------- */
/* How long a surface takes to follow a change of starlight, in words for Inspect. */
const lagText = y => { const d = y * 365.25; return d < 10 ? 'about a week' : d < 25 ? `about ${Math.round(d / 7)} weeks` : d < 45 ? 'about a month' : d < 300 ? `about ${Math.round(y * 12)} months` : 'about a year'; };
const ROCKY = new Set(['terrestrial', 'superEarth']);
/* Whether a body's air is its own, given with its metadata (the Solar System's worlds). */
const ownAir = b => !!(b.meta && AIRS[b.meta.air]);
Object.assign(gravity, {
  climStars: [], climLum: [], climTick: 0, climDt: 0,
  /* After each frame's steps: every world's climate, every few frames in a crowded sky (the accretion disk, the Solar
     System's belts), with all the simulated time since. */
  climate(dt) {
    this.climDt += dt > 0 ? dt : 0;
    const n = this.bodies.length;
    if (++this.climTick % (n > 120 ? 4 : n > 40 ? 2 : 1)) return;
    this.climateAll(this.climDt, false); this.climDt = 0;
  },
  /* Every star's light, then every other body's climate; snap sets each temperature to its target at once, as when a
     scene is built. A body without a climate yet (just thrown, dropped or restored) starts at its target. */
  climateAll(dt, snap) {
    const St = this.climStars, Lm = this.climLum;
    St.length = 0;
    for (const b of this.bodies) if (b.kind === 'star' && b.m > 0) { Lm[St.length] = luminosity(b.m / 1000); St.push(b); }
    for (const b of this.bodies) if (b.kind !== 'star') this.warm(b, dt, snap || !b.clim);
  },
  /* A world's climate, worked out on first sight. */
  climateOf(b) { if (!b.clim) this.warm(b, 0, true); return b.clim; },
  /* A rewind or a saved state brings back each world's temperature, the starlight it has grown used to and the size of
     orbit its tides answer to, so a world that was still warming carries on from where it was; anything else is read
     again from where the bodies stand. */
  keepWarmth(list) {
    this.climateAll(0, true);
    if (!Array.isArray(list)) return;
    this.bodies.forEach((b, i) => {
      const w = list[i];
      if (!b.clim || !Array.isArray(w) || !(w[0] > 0 && w[0] < 1e5 && w[1] >= 0 && w[1] < 1e9)) return;
      b.clim.T = +w[0]; b.clim.Sbar = +w[1];
      if (w[2] > 0 && w[2] < 1e7) b.clim.abar = +w[2];
      this.warm(b, 0, false);
    });
  },
  /* One world: the starlight from every star, the air it keeps, its temperature (following the starlight with a lag),
     how its day and night sides differ, how far its ice reaches, whether tides have stopped its spin, and the climate
     all of that makes. Allocation-free once the body has its climate. */
  warm(b, dt, snap) {
    const c = b.clim || (b.clim = { S: 0, Sbar: 0, A: 0, air: 'none', Teq: 0, T: 0, Tday: 0, Tss: 0, Tn: 0, eps: 1, xIce: 1.3, freeze: 0, toStar: false, cls: 'bare',
      type: 0, haze: 0, rim: 0, planet: false, star: null, partner: null, lock: null, spin: 'free', tLock: Infinity, e: 0, abar: 0, shore: 0, m: -1, kind: '', r: -1, R: 0, vesc: 0, Tint: 0, rgb: [0, 0, 0], css: '' });
    const St = this.climStars, Lm = this.climLum, AU2 = AU_PX * AU_PX;
    // Starlight in Earth's units, L / d² with d in AU, from every star; the brightest, and the one whose tides are
    // strongest (m / d³). Inside a star's drawn disc the distance holds at its edge.
    let S = 0, top = null, best = 0, tide = null, most = 0;
    for (let i = 0; i < St.length; i++) {
      const s = St[i], d2 = Math.max((s.x - b.x) ** 2 + (s.y - b.y) ** 2 + (s.z - b.z) ** 2, s.r * s.r), f = Lm[i] * AU2 / d2;
      S += f;
      if (f > best) { best = f; top = s; }
    }
    // The tide that matters is the strongest m / d³ of any heavier body, so a moon of the Star system, or one dropped
    // or thrown beside a giant, answers to its planet as the Solar System's linked moons do; a planet, to its star.
    if (!b.host) {
      if (this.accDirty) this.prepare();
      for (const q of this.srcs.length ? this.srcs : this.bodies) {
        if (q === b || q.m <= b.m) continue;
        const d2 = Math.max((q.x - b.x) ** 2 + (q.y - b.y) ** 2 + (q.z - b.z) ** 2, q.r * q.r), k = q.m / (d2 * Math.sqrt(d2));
        if (k > most) { most = k; tide = q; }
      }
    }
    c.S = S; c.star = top;
    // The starlight it has grown used to, over about a year: what decides whether its oceans boil or its air escapes.
    c.Sbar = snap ? S : c.Sbar + (S - c.Sbar) * (1 - Math.exp(-dt / AU_YR));
    // Its size, escape speed and inner heat change only in a merger.
    if (c.m !== b.m || c.kind !== b.kind || c.r !== b.r) {
      c.m = b.m; c.kind = b.kind; c.r = b.r;
      const Re = b.real ? 0 : planetRadius(b.m, b.kind) || (b.kind === 'brown' ? R_JUP_KM / R_EARTH_KM : 1.03 * (b.m / EARTH) ** 0.29);
      c.R = b.real ? b.r * AU_M / AU_PX : Re * R_EARTH_KM * 1000;
      c.vesc = b.m > 0 && c.R > 0 ? Math.sqrt(2 * G_SI * b.m * SIM_KG / c.R) : 0; c.Tint = internalTemp(b.kind, b.m / JUP);
    }
    // Tides: a moon answers to its planet, anything else to the star that raises the strongest. Their timescale is
    // taken on the size of its orbit about that body over about a year, as its air is on its starlight, so a world
    // moved inward locks as it settles there, not the moment it arrives.
    const P = b.host || tide, fresh = snap || c.partner !== P;
    c.partner = P; c.e = 0; c.tLock = Infinity;
    if (P) {
      const rx = b.x - P.x, ry = b.y - P.y, rz = b.z - P.z, vx = b.vx - P.vx, vy = b.vy - P.vy, vz = b.vz - P.vz, r = Math.hypot(rx, ry, rz) || 1e-9;
      const mu = G0 * this.p.G * (P.m + b.m), a = 1 / (2 / r - (vx * vx + vy * vy + vz * vz) / mu);
      if (a > 0 && Number.isFinite(a)) {
        const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
        c.e = Math.sqrt(Math.max(0, 1 - (hx * hx + hy * hy + hz * hz) / (mu * a)));
        c.abar = fresh || !(c.abar > 0) ? a : c.abar + (a - c.abar) * (1 - Math.exp(-dt / AU_YR));
        c.tLock = lockYears(c.abar * AU_M / AU_PX, c.R, rigidity(b.kind), b.m * SIM_KG, P.m * SIM_KG);
      }
    }
    c.spin = c.tLock < LOCK_YR ? (P.kind === 'star' && c.e >= 0.1 ? 'resonant' : 'locked') : c.tLock < AGE_YR ? 'slowed' : 'free';
    c.lock = c.spin === 'locked' ? P : null; c.toStar = !!c.lock && P.kind === 'star';
    // Its air: a giant's envelope, a real world's own, else what the cosmic shoreline and the runaway limit leave it.
    const gas = KINDS[b.kind].family === 'gas', planet = ROCKY.has(b.kind), meta = b.meta;
    const air = gas ? 'envelope' : ownAir(b) ? meta.air : atmosphere(c.vesc, c.Sbar, planet), A = AIRS[air];
    c.air = air; c.shore = shoreline(c.vesc); c.planet = planet;
    c.A = meta && meta.albedo != null ? meta.albedo : KIND_ALBEDO[b.kind] ?? A.A;
    c.Teq = eqTemp(S, c.A);
    // The target: starlight and inner heat, kept by the greenhouse; the surface follows it over its air's lag.
    const goal = Math.sqrt(Math.sqrt((c.Teq ** 4 + c.Tint ** 4) * (1 + 0.75 * A.tau)));
    c.T = snap ? goal : c.T + (goal - c.T) * (1 - Math.exp(-dt / (A.life * AU_YR)));
    // Day and night: ε of the absorbed light reaches the night side. A hot giant carries less round (its air radiates
    // before it gets there); a world that turns slowly or not at all, less than one that spins.
    // Only starlight is carried round; a body's own heat leaves evenly from both sides. Folding that in gives one ε
    // that the day, noon and night formulas (and the 3D shader) use unchanged: ε' = 1 − s(1 − ε), with s the share of
    // the heat that is starlight. A giant's ε follows the temperature starlight alone would give it.
    const g = 1 + 0.75 * A.tau, Tirr = Math.sqrt(Math.sqrt(c.Teq ** 4 * g)), h = clamp((Tirr - 700) / 700, 0, 1);
    const eps0 = gas ? 0.95 - 0.65 * h * h * (3 - 2 * h) : A.spin[c.spin === 'free' ? 0 : 1], share = c.Teq ** 4 / (c.Teq ** 4 + c.Tint ** 4 || 1);
    const eps = 1 - share * (1 - eps0);
    c.eps = eps; c.Tn = c.T * eps ** 0.25; c.Tss = c.T * (4 - 3 * eps) ** 0.25; c.Tday = c.T * (2 - eps) ** 0.25;
    c.freeze = A.freeze; c.xIce = c.toStar ? 1.3 : iceLine(c.T, A.freeze, A.k);
    c.cls = classify(c, b.kind, gas, air);
    // How it renders: a rocky planet with liquid water shows oceans, one without shows rock; a runaway greenhouse a
    // pale deck of cloud.
    const base = this.surfaceOf(b), wet = planet && air === 'air' && (c.cls === 'temperate' || c.cls === 'cold' || c.cls === 'eyeball'), dry = air !== 'air' || c.cls === 'hot' || c.cls === 'molten';
    c.type = planet ? (wet ? 1 : dry ? 0 : base) : base;
    c.haze = planet && air === 'thick' ? (c.cls === 'molten' ? 0.5 : 1) : 0; c.rim = planet ? A.rim : AIRS.none.rim;
    if (tintInto(c.rgb, bodyRgb(b), c.cls, c, planet) || !c.css) c.css = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
  },
  /* A temperature in the chosen system: kelvin, with Celsius in SI and Fahrenheit in US customary. */
  tempText(K) {
    const k = Math.round(K), sys = unitSystem(), sign = v => (v < 0 ? `−${-v}` : `${v}`);
    return sys === 'si' ? `${k} K (${sign(Math.round(K - 273.15))} °C)` : sys === 'us' ? `${k} K (${sign(Math.round((K - 273.15) * 1.8 + 32))} °F)` : `${k} K`;
  },
  /* Inspect's climate rows: a star's light; a world's starlight, temperatures, air, climate and spin. */
  climRows(b) {
    if (b.kind === 'star') return b.m > 0 ? [['Luminosity', `${sig(luminosity(b.m / 1000), 3)} × the Sun's`, 'Its light, from its mass by the main-sequence mass–luminosity relation: about M⁴ near the Sun\'s mass, M^3.5 above two solar masses, M^2.3 below 0.43. It warms every world in the scene.']] : [];
    const c = this.climateOf(b), sys = unitSystem(), gas = c.air === 'envelope', A = AIRS[c.air], P = c.partner, pr = P ? refName(P) : '';
    const flux = sys === 'si' ? ` · ${sig(c.S * S_W, 3)} W/m²` : sys === 'us' ? ` · ${sig(c.S * S_W * 0.09290304, 3)} W/ft²` : '';
    const faces = this.climStars.length > 1 ? 'its stars, from every star in the scene' : c.star ? refName(c.star) : 'its star';
    const held = gas ? `Starlight and the heat it still gives off from inside (about ${Math.round(c.Tint)} K on its own), at the top of its clouds.`
      : c.air === 'none' ? 'With no air to hold heat, its surface stays at the equilibrium temperature, with its own small inner heat.'
        : `Its air traps heat, as a grey greenhouse of infrared optical depth τ = ${A.tau}: T⁴ = T_eq⁴ (1 + ¾τ).`;
    const sign = v => (v < 0 ? `−${-v}` : `${v}`), deg = K => (sys === 'si' ? `${sign(Math.round(K - 273.15))} °C` : `${sign(Math.round((K - 273.15) * 1.8 + 32))} °F`);
    const rows = [
      ['Starlight received', c.S > 0 ? `${sig(c.S, 3)} × Earth's${flux}` : 'none', c.S > 0 ? `The light on each square ${sys === 'us' ? 'foot' : 'metre'} that faces ${faces}, as a multiple of what Earth gets from the Sun (1361 W/m²). It falls with the square of the distance.` : 'No star shines here, so only its own heat warms it.'],
      ['Equilibrium temperature', this.tempText(c.Teq), `Where it would settle with no air and its warmth spread evenly: 278.6 K × S^¼ × (1 − A)^¼, for this starlight S and a Bond albedo A of ${c.A.toFixed(2)}, the share of light it reflects.`],
      [gas ? 'Cloud-top temperature' : 'Surface temperature', this.tempText(c.T), `${held} It follows a change of starlight over ${lagText(A.life)}, so an eccentric orbit brings seasons.`],
    ];
    if (c.Tss - c.Tn > 25) rows.push(['Hottest and coldest', `${Math.round(c.Tss)} K · ${Math.round(c.Tn)} K`, `Under its star${c.toStar ? ', which never sets there,' : ' at noon'} and on its night side${sys === 'sim' ? '' : ` (${deg(c.Tss)} and ${deg(c.Tn)})`}. Its air and spin carry ε = ${c.eps.toFixed(2)} of the light it absorbs round to the night side: T⁴ goes as ε + 4(1 − ε)μ by day, with μ the height of its star, and as ε by night.`]);
    rows.push(['Air', A.label, gas ? 'A giant keeps all of its air.' : ownAir(b) ? (c.air === 'none' ? 'Like the real world, it has kept no air to speak of.' : 'Its real atmosphere, which it keeps wherever it is moved.')
      : `By the cosmic shoreline (Zahnle & Catling 2017), a world this size keeps its air while its starlight, averaged over the last year or so, stays below about ${sig(c.shore, 2)} times Earth's; it is ${sig(c.Sbar, 2)}.${c.air === 'thick' ? ' Past 1.06 times Earth\'s, oceans boil into a runaway greenhouse (Kopparapu et al. 2013).' : ''}`]);
    rows.push(['Climate', CLIMATES[c.cls][0], CLIMATES[c.cls][1]]);
    const yrs = yearsText(c.tLock);
    rows.push(!P || !Number.isFinite(c.tLock) ? ['Rotation', 'Spins freely', 'Nothing near enough raises tides on it to slow its spin.']
      : c.spin === 'locked' ? ['Rotation', `Tidally locked to ${pr}`, `Tides from ${pr} would stop its spin in ${yrs} (Gladman et al. 1996), far sooner than the few billion years a planetary system lives, so one face always points at ${pr}${c.toStar ? ': endless day on that side, endless night on the other' : ''}.`]
        : c.spin === 'resonant' ? ['Rotation', '3:2 spin–orbit resonance', `Tides from ${pr} would stop its spin in ${yrs} (Gladman et al. 1996), but its orbit is too eccentric (e = ${c.e.toFixed(2)}) to hold one face to it: ${b.name === 'Mercury' ? '' : 'like Mercury, '}it turns three times for every two orbits, so its days are long and hot and its nights cold.`]
          : c.spin === 'slowed' ? ['Rotation', 'Slowed by tides', `Tides from ${pr} would lock it in ${yrs} (Gladman et al. 1996): more than a tenth of the Solar System's age, less than all of it. Its spin is slow${b.name === 'Venus' ? '' : ', as Venus\'s is,'} but has not stopped.`]
            : ['Rotation', 'Spins freely', `Tides from ${pr} would take ${yrs} to lock it (Gladman et al. 1996), longer than the Solar System's 4.6 billion years, so it keeps its own day.`]);
    return rows;
  },
  /* A hot world's own light in the flat view: its night side glows past the Draper point, and a molten world shows its
     lava through the crust on its day side. */
  drawHeat(g, X, Y, R, c, lx, ly) {
    if (!c || c.Tss < DRAPER) return;
    const night = heatShare(c.Tn), lava = c.cls === 'molten' ? heatShare(c.Tss + 250) : 0;
    if (night < 0.02 && lava < 0.02) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(X, Y, R, 0, TAU);
    for (let side = -1; side <= 1; side += 2) {
      const k = side < 0 ? night : lava, T = side < 0 ? c.Tn : c.Tss + 250;
      if (k < 0.02) continue;
      const cx = X + side * lx * R * 0.55, cy = Y + side * ly * R * 0.55, grd = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
      grd.addColorStop(0, heatCss(T, 0.85 * k)); grd.addColorStop(1, heatCss(T, 0));
      g.fillStyle = grd; g.fill();
    }
    g.restore();
  },
  luminosity, eqTemp, CLIMATES, AIRS,
});

/* ---------- 3D mode: the lab's own camera, picking and overlays (gravity3d.js) ---------- */
Object.assign(gravity, gravity3d, { TRAIL_CAP, LAUNCH_K, THROW_PX, BODY_CAP, STAR_MASS, KINDS, JUP, EARTH, STAR_LIMIT, kindOf, mergedKind, planetRadius, bodyRadius, massColor, bodyCss, bodyRgb });
