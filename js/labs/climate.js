/*
✒ Metadata
    - Title: Planet Climate (digiSpace Edition - v2.18)
    - File Name: climate.js
    - Relative Path: js/labs/climate.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for worlds that differ by their distance from their
      stars: starlight from every star, equilibrium and surface temperature,
      air kept or lost, ice lines, day and night sides, tidal locking and the
      climate classes Gravity draws and Inspect names.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The physics behind Gravity's climates, as plain functions and tables:
    how bright a star of a given mass is, how warm its light makes a world,
    whether that world keeps its air, how far its ice reaches, how heat
    spreads between its day and night sides, whether tides have stopped its
    spin, and which climate all of that adds up to. js/labs/gravity.js keeps
    each world's climate up to date with these; the 3D scene and the flat
    view draw it.

✒ Key Features:
    - Luminosity from mass: the piecewise main-sequence relation, the Sun 1.
    - Equilibrium temperature 278.6 K × S^¼ × (1 − A)^¼, with S the
      starlight in Earth's units and A a Bond albedo by kind and air.
    - Air from the cosmic shoreline (Zahnle & Catling 2017) and the runaway
      greenhouse limit (Kopparapu et al. 2013); a grey greenhouse,
      T⁴ = T_eq⁴ (1 + ¾τ), calibrated on Earth and Venus.
    - Internal heat for giants and brown dwarfs, so cloud tops match
      Jupiter's, Saturn's and Neptune's effective temperatures.
    - Day and night: T⁴ ∝ ε + 4(1 − ε)μ on the day side and ε on the night
      side, conserving the absorbed light, with ε the share carried round.
    - Ice lines from a one-dimensional energy-balance profile (North 1975).
    - Tidal locking from Gladman et al. (1996) in its simplified form.
    - Climate classes for rocky worlds (molten to frozen, eyeball worlds
      locked to their star) and giants (after Sudarsky et al. 2000).

✒ Usage Instructions:
    import { luminosity, eqTemp, lockYears, classify } from './climate.js';
    luminosity(1);                    // 1: the Sun, in solar luminosities
    eqTemp(1, 0.306);                 // 254 K: Earth without its greenhouse

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - Units: SI, with starlight in Earth's units (1 = 1361 W/m²), stellar
      masses and luminosities in the Sun's, and times in years.
---------
*/

/* A body 1 AU from one solar luminosity, reflecting nothing and spreading what it absorbs over its whole surface,
   settles at (L / 16πσd²)^¼ = 278.6 K. */
export const T_1AU = 278.6;
/* The solar constant: sunlight on a square metre facing the Sun at 1 AU. */
export const S_W = 1361;
/* Tides that would stop a spin within a tenth of the Solar System's age have stopped it; within its age, slowed it. */
export const AGE_YR = 4.6e9, LOCK_YR = 4.6e8;
/* Above this much starlight a world with oceans boils them into a runaway greenhouse: 1.06 times Earth's for an
   Earth-mass planet about a Sun-like star (Kopparapu et al. 2013). */
export const S_RUNAWAY = 1.06;
/* The visible glow of hot rock begins at the Draper point. */
export const DRAPER = 798;

/* Main-sequence mass–luminosity relation in solar units, piecewise as it is usually fitted: M^2.3 below 0.43 solar
   masses, M^4 to 2, M^3.5 to 55 and a linear rise above. The Sun gives 1. */
export function luminosity(M) { return M < 0.43 ? 0.23 * M ** 2.3 : M < 2 ? M ** 4 : M < 55 ? 1.4 * M ** 3.5 : 32000 * M; }
/* Equilibrium temperature for starlight S (Earth = 1) and Bond albedo A. */
export const eqTemp = (S, A) => T_1AU * Math.sqrt(Math.sqrt(Math.max(0, S * (1 - A))));
/* Zahnle & Catling (2017) find worlds that kept their air and worlds that lost it parted by a line, starlight ∝ v_esc⁴,
   the cosmic shoreline. Here it passes 25 times Earth's starlight at Earth's escape speed (11.19 km/s), which leaves
   Mercury and the Moon bare, Mars barely clothed, and Titan its thick air. Escape speed in m/s. */
export const shoreline = vesc => 25 * (vesc / 11186) ** 4;
/* Years for tides to stop a spin, from Gladman et al. (1996) in its simplified form,
   t ≈ 6 a⁶ R μ / (m_s m_p²) × 10¹⁰ years: a rock of dissipation Q = 100 that started with a 12-hour day, SI units, μ
   the rigidity (3×10¹⁰ Pa for rock, 4×10⁹ Pa for ice). It ignores the fluid interiors of giants, so for them it is a
   guide to the order of magnitude only. */
export const lockYears = (a, R, mu, ms, mp) => (ms > 0 && mp > 0 && R > 0 ? 6e10 * (a * a) ** 3 * R * mu / (ms * mp * mp) : Infinity);
export const rigidity = kind => (kind === 'icy' || kind === 'comet' || kind === 'dwarf' ? 4e9 : 3e10);

/* The kinds of air, with what each does:
   - tau: infrared optical depth of a grey greenhouse, T⁴ = T_eq⁴ (1 + ¾τ): 0.86 brings Earth from 254 K to 288 K, 0.1
     adds Mars's few degrees, and Venus's 139 its 737 K;
   - A: the Bond albedo a rocky planet takes with it (bare rock, dusty thin air, clouds, Venus's sulphuric deck);
   - spin: ε, the share of the absorbed light carried to the night side, for a spinning world and for one that is locked
     or turns slowly;
   - freeze: the annual mean below which ice stays (263 K for water under thick air; frost under thin air near 200 K);
   - k: how steeply temperature falls toward the poles, 1 with no heat carried there (North 1975's s₂ = −0.482);
   - life: the years the surface takes to follow a change in starlight (a week for bare rock, a month under Earth's air
     and oceans, half a year under Venus's), so an eccentric orbit gives seasons without flicker;
   - rim: how strongly its air lights the limb of a rocky world. */
export const AIRS = {
  none: { tau: 0, A: 0.1, spin: [0.05, 0.02], freeze: 0, k: 1, life: 0.02, rim: 0.04, label: 'None' },
  thin: { tau: 0.1, A: 0.25, spin: [0.5, 0.15], freeze: 200, k: 1, life: 0.05, rim: 0.25, label: 'Thin' },
  air: { tau: 0.86, A: 0.3, spin: [0.9, 0.35], freeze: 263, k: 0.8, life: 0.1, rim: 0.8, label: 'Earth-like' },
  thick: { tau: 139, A: 0.76, spin: [0.98, 0.95], freeze: 0, k: 0.1, life: 0.5, rim: 0.9, label: 'Thick: a runaway greenhouse' },
  envelope: { tau: 0, A: 0.3, spin: [0.95, 0.95], freeze: 0, k: 0.3, life: 0.3, rim: 0, label: 'A deep envelope of hydrogen and helium' },
};
/* Bond albedos by kind where the kind decides: the small worlds and the giants (Jupiter 0.343, Neptune 0.29). */
export const KIND_ALBEDO = { moon: 0.12, dwarf: 0.5, asteroid: 0.08, icy: 0.6, comet: 0.04, subNeptune: 0.3, ice: 0.3, gas: 0.343, brown: 0.1 };

/* What air a rocky world keeps: none past the cosmic shoreline, thin within four times it, else Earth-like, or thick
   once a planet's long-run starlight passes the runaway limit. */
export function atmosphere(vesc, S, planet) {
  const q = shoreline(vesc) / Math.max(S, 1e-12);
  return q < 1 ? 'none' : q < 4 ? 'thin' : planet && S > S_RUNAWAY ? 'thick' : 'air';
}
/* Heat from inside, in kelvin: Earth's geothermal 0.09 W/m² for a rocky planet, less for a small world; for a giant,
   what its slow contraction still gives off (Jupiter about 100 K, Saturn about 70, Neptune 45); for a brown dwarf, a
   few billion years into its cooling, about 400 K at 13 Jupiter masses to 1700 K near 75 (after Burrows et al. 1997).
   mj is the mass in Jupiter masses. */
export function internalTemp(kind, mj) {
  if (kind === 'brown') return 400 * (mj / 13) ** 0.85;
  if (kind === 'gas') return 100 * mj ** 0.3;
  if (kind === 'ice' || kind === 'subNeptune') return 45;
  return kind === 'terrestrial' || kind === 'superEarth' ? 35 : 15;
}
/* The sine of the latitude where ice begins for a world of mean temperature T: the annual-mean profile of a
   one-dimensional energy-balance model, T(x) = T (1 − 0.482 k P₂(x))^¼ with x the sine of latitude (North 1975), meets
   the freezing point there. 1.3 means no ice at all, 0 ice to the equator. */
export function iceLine(T, freeze, k) {
  if (!freeze || !(T > 0)) return 1.3;
  const P2 = (1 - (freeze / T) ** 4) / (0.482 * k);
  return P2 >= 1 ? 1.3 : P2 <= -0.5 ? 0 : Math.sqrt((1 + 2 * P2) / 3);
}

/* The climates, each with its name in Inspect and what it means. */
export const CLIMATES = {
  molten: ['Molten', 'Its star melts the rock: lava glows on the day side and in the cracks of a dark crust, and the night side glows where it is still hot enough.'],
  hothouse: ['Hothouse', 'Its oceans boiled into a runaway greenhouse: a thick, pale sky over a surface hot enough to melt lead, as on Venus.'],
  hot: ['Hot and dry', 'Too hot for liquid water to stay on its surface.'],
  bare: ['Airless rock', 'Too small, or too near its star, to keep any air: nothing holds water or evens out its days and nights, as on the Moon.'],
  frigid: ['Cold and airless', 'Too small to keep air and far enough from its star that its surface stays far below freezing, as on the moons of the giants.'],
  dry: ['Cold desert', 'Its thin air holds little heat and no liquid water; frost gathers at the poles when it is cold enough, as on Mars.'],
  temperate: ['Temperate', 'In the band where water stays liquid: oceans, clouds and polar ice, as on Earth.'],
  eyeball: ['Eyeball world', 'One face always toward its star: open water under the star, ice across the night side, and milder weather in the ring between.'],
  cold: ['Cold', 'Its ice caps reach toward the equator: more than half its surface is frozen.'],
  frozen: ['Frozen', 'Ice from pole to pole, a snowball: too little starlight for liquid water anywhere on its surface.'],
  hotGiant: ['Hot giant', 'Its envelope is hotter than 1000 K: few clouds survive, it reflects little light, and its night side glows red (Sudarsky et al. 2000, classes IV and V).'],
  warmGiant: ['Warm giant', 'Too warm for water clouds: a clear, deep sky with faint bands, blue from scattering (Sudarsky class III).'],
  waterGiant: ['Temperate giant', 'Water condenses into bright white clouds high in its envelope (Sudarsky class II).'],
  coldGiant: ['Cold giant', 'Ammonia ice clouds in belts and zones, as on Jupiter and Saturn (Sudarsky class I).'],
  iceGiant: ['Cold and blue', 'So cold that methane in its haze absorbs red light, so it looks blue, as Uranus and Neptune do.'],
  brown: ['Self-heated', 'A brown dwarf glows with the heat of its own slow contraction, starlight or none.'],
};
/* Which climate a world's temperatures and air add up to. c carries T (mean), Tday (day-side mean), Tss and Tn (under
   the star and on the night side), xIce, freeze and toStar (one face locked to its star). */
export function classify(c, kind, gas, air) {
  if (kind === 'brown') return 'brown';
  if (gas) return c.T >= 1000 ? 'hotGiant' : c.T >= 350 ? 'warmGiant' : c.T >= 150 ? 'waterGiant' : kind === 'gas' ? 'coldGiant' : 'iceGiant';
  if (c.Tday >= 1000) return 'molten';
  if (air === 'thick') return 'hothouse';
  if (c.T >= 330) return 'hot';
  if (air === 'none') return c.T >= 150 ? 'bare' : 'frigid';
  if (air === 'thin') return c.xIce <= 0.02 ? 'frozen' : 'dry';
  if (c.toStar) return c.Tss < c.freeze ? 'frozen' : c.Tn < c.freeze ? 'eyeball' : 'temperate';
  return c.xIce <= 0.02 ? 'frozen' : c.xIce < 0.5 ? 'cold' : 'temperate';
}
/* The flat view's colour for a climate: the world's own colour drawn toward what covers it (a dark crust, a pale
   haze, open water, ice, a dark or pale envelope). share(c) is how far. */
const TOWARD = {
  molten: [[54, 36, 32], () => 0.62], hothouse: [[234, 210, 158], () => 0.58], temperate: [[64, 120, 200], () => 0.5],
  eyeball: [[200, 214, 226], () => 0.4], cold: [[226, 234, 242], c => 0.85 * (1 - Math.min(1, c.xIce))], frozen: [[226, 234, 242], () => 0.78],
  dry: [[226, 234, 242], c => 0.6 * (1 - Math.min(1, c.xIce))], hotGiant: [[58, 36, 38], () => 0.55], warmGiant: [[62, 98, 168], () => 0.3],
  waterGiant: [[236, 238, 238], () => 0.38],
};
/* Writes the flat view's colour into out (three channels, 0 to 255) and returns whether it changed. Only a rocky
   planet takes on its surface's look; every world takes on its envelope's or crust's. */
export function tintInto(out, base, cls, c, planet) {
  const t = TOWARD[cls], ok = t && (planet || !(cls === 'temperate' || cls === 'cold' || cls === 'frozen' || cls === 'dry' || cls === 'eyeball' || cls === 'hothouse'));
  const k = ok ? t[1](c) : 0, to = ok ? t[0] : base;
  let moved = false;
  for (let i = 0; i < 3; i++) { const v = Math.round(base[i] + (to[i] - base[i]) * k); if (v !== out[i]) { out[i] = v; moved = true; } }
  return moved;
}
/* How strongly a surface at T kelvin glows in visible light, 0 to 1, and its colour as CSS at alpha a: dull red past
   the Draper point, then orange and yellow, steeply brighter, as a blackbody's visible light grows. */
export const heatShare = T => Math.min(1, (Math.max(0, T - DRAPER) / 1000) ** 2 * 3);
export function heatCss(T, a) {
  const x = Math.min(1, Math.max(0, (T - 1000) / 1200));
  return `rgba(255,${Math.round(46 + 112 * x)},${Math.round(10 + 66 * x)},${a.toFixed(3)})`;
}
/* Years as words, for Inspect: "about 127 million years". */
export function yearsText(y) {
  if (!Number.isFinite(y) || y >= 1e12) return 'more than a trillion years';
  const [d, w] = y >= 1e9 ? [1e9, 'billion '] : y >= 1e6 ? [1e6, 'million '] : y >= 1e3 ? [1e3, 'thousand '] : [1, ''];
  const v = y / d;
  return `about ${v >= 10 ? Math.round(v) : v.toFixed(1)} ${w}years`;
}
