/*
✒ Metadata
    - Title: Our Solar System (digiSpace Edition - v2.8)
    - File Name: solarsystem.js
    - Relative Path: js/labs/solarsystem.js
    - Artifact Type: javascript
    - Version: 2.8.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created on
      Dennis's call for our own Solar System as a Gravity scene, from the Sun
      to the moons of the giants, the Kuiper belt and beyond. The Moon starts
      from its osculating elements at J2000.0, from its geocentric state by
      Meeus's lunar theory, as its mean elements ran the month 1.1 % long.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The data and the builder behind Gravity's "Our Solar System" scene: the
    Sun, the eight planets and Pluto from JPL's J2000 mean elements, seventeen
    moons (Charon among them) in their planets' equatorial planes, four more
    dwarf planets, Sedna and Halley's Comet, and massless test particles for
    the main asteroid belt, Jupiter's Trojans, the Kuiper belt's plutinos and
    classical objects, and the scattered disc. Everything is placed by its
    orbital elements and the real masses, radii and periods follow; only the
    starting phases noted below are illustrative.

✒ Key Features:
    - Planets: JPL "Keplerian Elements for Approximate Positions of the Major
      Planets", Table 1 (Standish, valid 1800 to 2050), at J2000. Each planet
      with moons is placed as its system's barycentre, as the elements are.
    - Moons: real distances, eccentricities and masses; each in its planet's
      equatorial plane from the IAU pole. Uranus's moons and Triton go round
      backwards, as they do. The Galilean moons start in their 1:2:4 Laplace
      resonance; other moons' starting phases are illustrative.
    - Our Moon: osculating elements at J2000.0 from its geocentric state by
      Meeus's lunar theory (Astronomical Algorithms, ch. 47, all 120 terms),
      so its month runs true where the mean elements ran it 1.1 % long.
    - Dwarf planets, Sedna and Halley: published orbits, with positions for
      about the year 2000 that are approximate.
    - Belts: seeded, so every load is the same sky. The main belt keeps the
      Kirkwood gaps; Trojans sit about Jupiter's L4 and L5 points; plutinos
      start with their 3:2 resonant angle with Neptune near 180 degrees.
    - The frame: ecliptic north is +z, and the stage shows the sky from the
      north, so the planets go round anticlockwise in 2D and in 3D.

✒ Usage Instructions:
    import { buildSolarSystem, SKY_EPOCH } from './solarsystem.js';
    buildSolarSystem(lab, { G: G0 * lab.p.G, AU: 135, SUN: 1000 });   // pushes the bodies onto lab.bodies

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - Units: lengths in stage pixels (1 AU = AU px), masses with the Sun at
      SUN, as the Gravity lab uses them.
---------
*/

/* J2000.0 as a calendar date, for the scene's clock. */
export const SKY_EPOCH = Date.UTC(2000, 0, 1, 12);

const D2R = Math.PI / 180, TAU = Math.PI * 2, AU_KM = 149597870.7, SUN_KG = 1.98847e30, OBLIQUITY = 23.43928 * D2R;

/* Planets: a (AU), e, I, L, long. perihelion, long. node (degrees), mass (Sun = 1), radius (km). JPL Table 1, J2000.
   Earth's row is the Earth–Moon barycentre's, and Pluto's the Pluto–Charon barycentre's. */
const PLANETS = [
  { name: 'Mercury', el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], m: 1.6601e-7, R: 2439.7, kind: 'rocky', tint: [150, 146, 142], desc: 'Terrestrial planet', px: 2.4 },
  { name: 'Venus', el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], m: 2.4478e-6, R: 6051.8, kind: 'rocky', tint: [226, 198, 140], desc: 'Terrestrial planet', px: 2.8 },
  { name: 'Earth', el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], m: 3.0035e-6, R: 6371, kind: 'ocean', tint: [74, 138, 222], desc: 'Terrestrial planet: home', px: 2.9 },
  { name: 'Mars', el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], m: 3.2272e-7, R: 3389.5, kind: 'rocky', tint: [204, 104, 70], desc: 'Terrestrial planet', px: 2.6, pole: [317.681, 52.887] },
  { name: 'Jupiter', el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], m: 9.5479e-4, R: 69911, kind: 'gas', tint: [216, 178, 132], desc: 'Gas giant', px: 4.2, pole: [268.057, 64.495] },
  { name: 'Saturn', el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], m: 2.8589e-4, R: 58232, kind: 'gas', tint: [228, 204, 146], desc: 'Gas giant, ringed', px: 3.9, ring: true, pole: [40.589, 83.537] },
  { name: 'Uranus', el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], m: 4.3662e-5, R: 25362, kind: 'ice', tint: [156, 216, 222], desc: 'Ice giant, tipped on its side', px: 3.4, pole: [257.311, -15.175] },
  { name: 'Neptune', el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], m: 5.1514e-5, R: 24622, kind: 'ice', tint: [84, 124, 230], desc: 'Ice giant', px: 3.4, pole: [299.36, 43.46] },
  { name: 'Pluto', el: [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684], m: 1.303e22 / SUN_KG, R: 1188.3, kind: 'dwarf', tint: [212, 188, 158], desc: 'Dwarf planet, with Charon', px: 2.2, pole: [132.993, -6.163] },
];

/* Moons by host: a (km), e, mass (kg), radius (km). sense -1 goes round against the host's IAU north pole. The Moon
   carries its own elements [i, node, arg. perigee, mean anomaly] against the ecliptic, and they are osculating ones:
   the Sun swings its orbit by thousands of km about the mean one (evection, variation), so the mean elements
   (a 384400 km, e 0.0549) started here would run the month about 1 % long. These come from its geocentric state at
   J2000.0 by Meeus's lunar theory (Astronomical Algorithms, ch. 47, all 60 + 60 terms): 402445 km away at
   (-291606, -274976, 36274) km, moving at (0.6435, -0.7310, -0.0115) km/s. */
const MOONS = {
  Earth: [{ name: 'Moon', a: 381848.7, e: 0.06320, kg: 7.342e22, R: 1737.4, tint: [178, 178, 176], ecl: [5.2408, 123.953, 308.896, 146.705] }],
  Mars: [
    { name: 'Phobos', a: 9376, e: 0.0151, kg: 1.0659e16, R: 11.3, tint: [142, 126, 112] },
    { name: 'Deimos', a: 23463, e: 0.00033, kg: 1.4762e15, R: 6.2, tint: [162, 150, 134] },
  ],
  // The Laplace resonance: λ(Io) − 3λ(Europa) + 2λ(Ganymede) = 180°.
  Jupiter: [
    { name: 'Io', a: 421700, e: 0.0041, kg: 8.9319e22, R: 1821.6, tint: [232, 212, 112], lam: 30 },
    { name: 'Europa', a: 671034, e: 0.009, kg: 4.7998e22, R: 1560.8, tint: [208, 194, 170], lam: 150 },
    { name: 'Ganymede', a: 1070412, e: 0.0013, kg: 1.4819e23, R: 2634.1, tint: [156, 146, 134], lam: 300 },
    { name: 'Callisto', a: 1882709, e: 0.0074, kg: 1.0759e23, R: 2410.3, tint: [112, 102, 92], lam: 210 },
  ],
  Saturn: [
    { name: 'Enceladus', a: 237948, e: 0.0047, kg: 1.08e20, R: 252.1, tint: [236, 240, 244] },
    { name: 'Rhea', a: 527108, e: 0.0013, kg: 2.3065e21, R: 763.8, tint: [196, 196, 196] },
    { name: 'Titan', a: 1221870, e: 0.0288, kg: 1.3452e23, R: 2574.7, tint: [214, 164, 84] },
    { name: 'Iapetus', a: 3560820, e: 0.0286, kg: 1.8056e21, R: 734.5, tint: [172, 152, 122] },
  ],
  Uranus: [
    { name: 'Miranda', a: 129390, e: 0.0013, kg: 6.4e19, R: 235.8, tint: [182, 182, 186], sense: -1 },
    { name: 'Ariel', a: 190900, e: 0.0012, kg: 1.251e21, R: 578.9, tint: [192, 192, 198], sense: -1 },
    { name: 'Titania', a: 435910, e: 0.0011, kg: 3.4e21, R: 788.4, tint: [178, 172, 168], sense: -1 },
    { name: 'Oberon', a: 583520, e: 0.0014, kg: 3.076e21, R: 761.4, tint: [162, 152, 148], sense: -1 },
  ],
  Neptune: [{ name: 'Triton', a: 354759, e: 0.000016, kg: 2.139e22, R: 1353.4, tint: [198, 208, 216], sense: -1 }],
  Pluto: [{ name: 'Charon', a: 19591, e: 0.0002, kg: 1.586e21, R: 606, tint: [154, 148, 142] }],
};

/* Smaller worlds: a (AU), e, i, node, arg. perihelion, mean anomaly at about J2000 (degrees, approximate), mass (kg,
   0 for massless), radius (km). */
const DWARFS = [
  { name: 'Ceres', el: [2.7675, 0.0758, 10.59, 80.33, 73.51, 0], kg: 9.38e20, R: 469.7, kind: 'dwarf', tint: [164, 162, 158], desc: 'Dwarf planet in the asteroid belt' },
  { name: 'Haumea', el: [43.13, 0.1912, 28.19, 121.8, 239.0, 191], kg: 4.006e21, R: 780, kind: 'dwarf', tint: [226, 226, 232], desc: 'Dwarf planet' },
  { name: 'Makemake', el: [45.79, 0.159, 28.98, 79.6, 294.8, 141], kg: 3.1e21, R: 715, kind: 'dwarf', tint: [214, 166, 132], desc: 'Dwarf planet' },
  { name: 'Eris', el: [67.86, 0.4361, 44.04, 35.95, 151.64, 194.8], kg: 1.6466e22, R: 1163, kind: 'dwarf', tint: [232, 232, 236], desc: 'Dwarf planet, scattered disc' },
  { name: 'Sedna', el: [506, 0.8496, 11.93, 144.40, 311.29, 358.2], kg: 0, R: 500, kind: 'icy', tint: [198, 98, 72], desc: 'Detached object, beyond the Kuiper belt' },
  { name: 'Halley', el: [17.834, 0.96714, 162.26, 58.42, 111.33, 66.4], kg: 0, R: 5.5, kind: 'comet', tint: [206, 222, 236], desc: 'Periodic comet, retrograde', trail: true },
];

/* Mulberry32: the belts come out the same on every load. */
function rng32(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* Kepler's equation, E − e sin E = M, by Newton's method (with the fast start for long ellipses). */
function eccAnomaly(M, e) {
  M = ((M % TAU) + TAU) % TAU;
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 50; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-14) break; }
  return E;
}
/* Position and velocity in the ecliptic frame from elements (a in AU, angles in radians), relative to the body
   orbited, in pixels and pixels per simulated second for gravitational parameter mu (px³/s²). */
function stateOf(a, e, i, node, peri, M, mu, AU) {
  const A = a * AU, E = eccAnomaly(M, e), cE = Math.cos(E), sE = Math.sin(E), q = Math.sqrt(1 - e * e), n = Math.sqrt(mu / (A * A * A));
  const xp = A * (cE - e), yp = A * q * sE, k = n * A / (1 - e * cE), vxp = -k * sE, vyp = k * q * cE;
  const cO = Math.cos(node), sO = Math.sin(node), cw = Math.cos(peri), sw = Math.sin(peri), ci = Math.cos(i), si = Math.sin(i);
  const P = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si], Q = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  return { r: [P[0] * xp + Q[0] * yp, P[1] * xp + Q[1] * yp, P[2] * xp + Q[2] * yp], v: [P[0] * vxp + Q[0] * vyp, P[1] * vxp + Q[1] * vyp, P[2] * vxp + Q[2] * vyp] };
}
/* The plane a moon orbits in: the host's equator from its IAU north pole (right ascension, declination), as an
   inclination and node on the ecliptic; sense -1 turns the orbit round, for moons that go against the pole. */
function equatorPlane(ra, dec, sense = 1) {
  const a = ra * D2R, d = dec * D2R, xq = Math.cos(d) * Math.cos(a), yq = Math.cos(d) * Math.sin(a), zq = Math.sin(d);
  const nx = sense * xq, ny = sense * (yq * Math.cos(OBLIQUITY) + zq * Math.sin(OBLIQUITY)), nz = sense * (-yq * Math.sin(OBLIQUITY) + zq * Math.cos(OBLIQUITY));
  return { i: Math.acos(Math.max(-1, Math.min(1, nz))), node: Math.atan2(nx, -ny) };
}
/* Ecliptic (north up) to the simulation's frame: the stage's y runs down the screen, so y turns over and the stage
   shows the sky from the north, the planets going round anticlockwise. */
const toSim = v => [v[0], -v[1], v[2]];

/* Build the scene onto lab.bodies, heliocentric; the caller moves it to the barycentre. */
export function buildSolarSystem(lab, { G, AU, SUN }) {
  const km = AU / AU_KM, kg = m => m / SUN_KG * SUN, B = lab.bodies, rnd = rng32(20000101);
  const add = (r, v, m, kind, meta) => { const p = toSim(r), u = toSim(v), b = lab.body(p[0], p[1], u[0], u[1], m, p[2], u[2], kind, meta); B.push(b); return b; };
  const sun = add([0, 0, 0], [0, 0, 0], SUN, 'star', { name: 'Sun', desc: 'Star (G2V)', r: 695700 * km, px: 7.5, real: true, label: true, noTrail: true });
  const muSun = m => G * (SUN + m);
  // Planets, each as the barycentre of itself and its moons, then the moons about it.
  const lam = {};
  for (const pl of PLANETS) {
    const [a, e, I, L, wbar, node] = pl.el, moons = MOONS[pl.name] || [], mm = moons.map(mo => kg(mo.kg)), mp = pl.m * SUN, mSys = mp + mm.reduce((s, m) => s + m, 0);
    lam[pl.name] = L;
    const s = stateOf(a, e, I * D2R, node * D2R, (wbar - node) * D2R, (L - wbar) * D2R, muSun(mSys), AU);
    const rel = moons.map((mo, k) => {
      const mu = G * (mp + mm[k]);
      let i, nd, w = 0, M;
      if (mo.ecl) [i, nd, w, M] = [mo.ecl[0] * D2R, mo.ecl[1] * D2R, mo.ecl[2] * D2R, mo.ecl[3] * D2R];
      else { const pln = equatorPlane(pl.pole[0], pl.pole[1], mo.sense || 1); i = pln.i; nd = pln.node; M = (mo.lam != null ? mo.lam : rnd() * 360) * D2R; }
      return stateOf(mo.a / AU_KM, mo.e, i, nd, w, M, mu, AU);
    });
    // The barycentre carries the elements' state: the planet sits opposite its moons' mass-weighted offsets.
    const cr = [0, 0, 0], cv = [0, 0, 0];
    rel.forEach((q, k) => { for (let j = 0; j < 3; j++) { cr[j] += mm[k] * q.r[j] / mSys; cv[j] += mm[k] * q.v[j] / mSys; } });
    const pr = s.r.map((x, j) => x - cr[j]), pv = s.v.map((x, j) => x - cv[j]);
    const host = add(pr, pv, mp, pl.kind, { name: pl.name, desc: pl.desc, tint: pl.tint, r: pl.R * km, px: pl.px, real: true, label: true, ring: !!pl.ring });
    moons.forEach((mo, k) => add(rel[k].r.map((x, j) => pr[j] + x), rel[k].v.map((x, j) => pv[j] + x), mm[k], mo.R > 600 ? 'rocky' : 'icy',
      { name: mo.name, desc: `Moon of ${pl.name}`, tint: mo.tint, r: mo.R * km, px: mo.R > 1000 ? 1.9 : 1.5, real: true, label: true, noTrail: true, hostId: host.id }));
  }
  for (const d of DWARFS) {
    const [a, e, i, node, w, M] = d.el, m = kg(d.kg);
    const s = stateOf(a, e, i * D2R, node * D2R, w * D2R, M * D2R, muSun(m), AU);
    add(s.r, s.v, m, d.kind, { name: d.name, desc: d.desc, tint: d.tint, r: d.R * km, px: d.kind === 'comet' ? 1.6 : 2, real: true, label: true, noTrail: !d.trail });
  }
  // The belts: massless, so they feel the planets and pull on nothing, and they carry no trails.
  const belt = (a, e, i, node, w, M, kind, desc, tint, px) => {
    const s = stateOf(a, e, i * D2R, node * D2R, w * D2R, M * D2R, muSun(0), AU), k = 0.86 + 0.28 * rnd();
    add(s.r, s.v, 0, kind, { desc, tint: tint.map(c => Math.min(255, Math.round(c * k))), r: 50 * km, px, real: true, noTrail: true });
  };
  // Main belt, 2.1 to 3.3 AU, with the Kirkwood gaps at Jupiter's 3:1, 5:2, 7:3 and 2:1 resonances left open.
  const gaps = [[2.502, 0.04], [2.825, 0.03], [2.958, 0.025], [3.279, 0.04]];
  for (let n = 0; n < 80;) {
    const a = 2.1 + 1.2 * rnd(); if (gaps.some(([g, w]) => Math.abs(a - g) < w)) continue;
    belt(a, 0.02 + 0.18 * rnd() ** 2, 18 * rnd() ** 2, 360 * rnd(), 360 * rnd(), 360 * rnd(), 'asteroid', 'Main-belt asteroid', [150, 138, 124], 1.1); n++;
  }
  // Jupiter's Trojans: on its orbit, about 60° ahead (L4, the Greek camp) and behind (L5, the Trojan camp).
  const aJ = PLANETS[4].el[0];
  for (let n = 0; n < 30; n++) {
    const ahead = n < 16, node = 360 * rnd(), w = 360 * rnd(), l = lam.Jupiter + (ahead ? 60 : -60) + 24 * (rnd() - 0.5);
    belt(aJ * (1 + 0.012 * (rnd() - 0.5)), 0.07 * rnd(), 22 * rnd() ** 2, node, w, l - node - w, 'asteroid', ahead ? 'Jupiter Trojan, L4 (Greek camp)' : 'Jupiter Trojan, L5 (Trojan camp)', [168, 140, 116], 1.1);
  }
  // Plutinos: in 3:2 with Neptune, their resonant angle 3λ − 2λ(Neptune) − ϖ near 180°, so they keep clear of it.
  for (let n = 0; n < 24; n++) {
    const wbar = 360 * rnd(), node = 360 * rnd(), phi = 180 + 60 * (rnd() - 0.5), l = (phi + 2 * lam.Neptune + wbar) / 3 + 120 * Math.floor(3 * rnd());
    belt(39.45 + 0.4 * (rnd() - 0.5), 0.1 + 0.2 * rnd(), 16 * rnd(), node, wbar - node, l - wbar, 'icy', 'Plutino (3:2 with Neptune)', [176, 196, 212], 1);
  }
  // Classical Kuiper belt, 42 to 48 AU: mostly a cold, flat population, and a hot, tilted one.
  for (let n = 0; n < 70; n++) {
    const cold = rnd() < 0.7;
    belt(42 + 6 * rnd(), 0.1 * rnd(), cold ? 4 * rnd() : 8 + 22 * rnd(), 360 * rnd(), 360 * rnd(), 360 * rnd(), 'icy', cold ? 'Classical Kuiper belt object (cold)' : 'Classical Kuiper belt object (hot)', [176, 196, 212], 1);
  }
  // Scattered disc: perihelia near Neptune's orbit, flung out to long, tilted ellipses.
  for (let n = 0; n < 10; n++) {
    const q = 32 + 8 * rnd(), a = 50 + 60 * rnd();
    belt(a, 1 - q / a, 30 * rnd(), 360 * rnd(), 360 * rnd(), 360 * rnd(), 'icy', 'Scattered-disc object', [196, 184, 200], 1);
  }
  return sun;
}
