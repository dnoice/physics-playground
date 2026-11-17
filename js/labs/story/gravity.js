/*
✒ Metadata
    - Title: Gravity Narrator (digiSpace Edition - v2.19)
    - File Name: gravity.js
    - Relative Path: js/labs/story/gravity.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one way to select: Show me follows a body through the
      lab's select(), now that Controls has no Follow switch to keep in step.
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's report that twenty minutes of Empty sky told him only that
      a body had escaped: Gravity's narrator watches every body's orbit and
      explains, with the numbers, who dominates, what perturbs whom, Hill
      spheres, passes, captures, mergers, escapes and the drawn scale.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the gravity lab by the registry: narrate(N) looks at the run
    four times a second and tells the Story (js/shell/story.js) what
    happened and why. It keeps a record per body, its osculating orbit about
    what holds it (the lab's system() barycentres), and compares each look
    with the last.

✒ Key Features:
    - Who holds whom: a body's primary is the smallest Hill sphere it is
      bound inside, else the heaviest body, or a bound binary's barycentre
      for whatever circles the pair.
    - Births (a throw or drop and the orbit it starts), mergers and what
      they formed, falls into a star, departures, ejections against the
      escape speed, captures and losses of moons, binaries forming.
    - Passes through a Hill sphere with the measured slingshot against
      2v∞/e, and flybys on open paths with their bending angle.
    - Orbits that drift, with the likely perturber named by the ratio of
      its tide to the primary's pull; first orbits timed against Kepler.
    - The barycentre leaving the star and the star's wobble when a giant
      rivals it; near mean-motion resonances, crossing orbits and pairs
      packed closer than 2√3 mutual Hill radii; the drawn scale, once.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - Cost: at most 40 bodies are followed and 12 heavy ones are tested as
      hosts and perturbers, so a look stays a few thousand operations at
      any body count; records are kept between looks, not rebuilt.
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { TAU, fmtSI } from '../../core/util.js';
import { navFrame } from '../../shell/camera.js';
import { announce } from '../../shell/state.js';
import { AU_PX, G0, KINDS, nameOf } from '../gravity.js';

/* True sizes on the Star system's scale, where 1 AU is AU_PX pixels: the Sun's radius, and Jupiter's for a brown dwarf. */
const M_PX = 1.495978707e11 / AU_PX, R_SUN_PX = 6.957e8 / M_PX, R_JUP_PX = 7.1492e7 / M_PX;
const TRACK_CAP = 40, MAJOR_CAP = 12, HILL_STABLE = 2 * Math.sqrt(3);
// First- and second-order mean-motion resonances, as outer turns to inner turns.
const RESONANCES = [[2, 1], [3, 2], [4, 3], [5, 4], [3, 1], [5, 3]];
const TIMES = { 1: 'once', 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' }, TURNS = { 1: 'turn', 2: 'two turns', 3: 'three turns', 4: 'four turns' };

let S = null;
// The osculating orbit of the last osc() call: written in place, never allocated.
const O = { r: 0, v: 0, E: 0, a: NaN, e: NaN, T: NaN, q: NaN, Q: NaN, rv: 0, mu: 0, hx: 0, hy: 0, hz: 0, rx: 0, ry: 0, rz: 0, ex: 0, ey: 0, ez: 0 };

/* ---------- words and numbers ---------- */
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const an = w => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
const cls = b => { const l = KINDS[b.kind] ? KINDS[b.kind].label : 'Body'; return l.charAt(0).toLowerCase() + l.slice(1); };
const pc = x => `${sig(x * 100, 2)} %`;
const pcSmall = x => (x < 1e-5 ? 'less than 0.001 %' : pc(x));
const pairKey = (k, p, q) => `${k}|${Math.min(p.id, q.id)}|${Math.max(p.id, q.id)}`;
const deg = a => `${Math.round(a * 180 / Math.PI)}°`;
const shape = e => (e < 0.05 ? 'a near circle' : e < 0.5 ? 'an oval' : 'a long ellipse');
/* What to call a body (or a dead body's record): its name, "the star" when there is only one, else its number. */
function ref(b) {
  if (b === S.pair) return 'the binary';
  if (b === S.inner) return ref(S.inner.of);
  if (b.name) return b.name === 'Sun' || b.name === 'Moon' ? `the ${b.name}` : b.name;
  if (b.kind === 'star' && S.stars === 1) return 'the star';
  return `Body ${b.id}`;
}
/* The same, with its class on first mention: "Body 9, a brown dwarf"; the binary names its two stars. */
const who = b => { if (b === S.pair) return `the binary of ${ref(b.a)} and ${ref(b.b)}`; const r = ref(b); return r.startsWith('Body ') ? `${r}, ${an(cls(b))}` : r; };
/* A body as a sentence's subject, with its class and mass: "Body 9, a brown dwarf of 0.0700 solar masses," or
   "Jupiter (318 Earth masses)". */
function subj(L, b) {
  const r = ref(b);
  if (!r.startsWith('Body ')) return `${cap(r)} (${massOf(L, b.m)})`;
  return b.m > 0 ? `${r}, ${an(cls(b))} of ${massOf(L, b.m)},` : `${r}, a massless ${cls(b)},`;
}
/* The same without the mass: "Body 9, a brown dwarf,". */
const subjOf = b => { const r = ref(b); return r.startsWith('Body ') ? `${r}, ${an(cls(b))},` : cap(r); };
const len = (L, px) => fmtQ(L, 'len', px), spd = (L, v) => fmtQ(L, 'speed', v), dur = (L, s) => L.timeText(s);
const massOf = (L, m) => (m > 0 ? L.massText(m) : 'massless');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/* ---------- Show me ---------- */
function follow(L, b) {
  const id = b.id;
  return {
    label: `Follow ${ref(b)}`, can: () => L.bodies.some(q => q.id === id),
    run() {
      const q = L.bodies.find(x => x.id === id); if (!q) return;
      L.select(id);
      announce(`Following ${nameOf(q)}`);
    },
  };
}
const frameAll = { label: 'Frame the system', run() { navFrame(); } };

/* ---------- orbits ---------- */
/* The osculating orbit of A about B (bodies or systems: m, x, y, z, vx, vy, vz) under mu = G(M + m), into O. */
function osc(A, B, mu) {
  const rx = A.x - B.x, ry = A.y - B.y, rz = A.z - B.z, vx = A.vx - B.vx, vy = A.vy - B.vy, vz = A.vz - B.vz;
  const r = Math.hypot(rx, ry, rz), v2 = vx * vx + vy * vy + vz * vz;
  if (!(r > 0) || !(mu > 0)) return false;
  const E = v2 / 2 - mu / r, hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx, h2 = hx * hx + hy * hy + hz * hz;
  const e = Math.sqrt(Math.max(0, 1 + 2 * E * h2 / (mu * mu)));
  O.r = r; O.v = Math.sqrt(v2); O.E = E; O.e = e; O.mu = mu; O.rv = (rx * vx + ry * vy + rz * vz) / r;
  O.hx = hx; O.hy = hy; O.hz = hz; O.rx = rx; O.ry = ry; O.rz = rz;
  // The eccentricity vector points at periapsis: ((v² − μ/r) r − (r·v) v) / μ.
  const k = v2 - mu / r, rv = rx * vx + ry * vy + rz * vz;
  O.ex = (k * rx - rv * vx) / mu; O.ey = (k * ry - rv * vy) / mu; O.ez = (k * rz - rv * vz) / mu;
  O.q = h2 / (mu * (1 + e));
  if (E < 0) { O.a = -mu / (2 * E); O.T = TAU * Math.sqrt(O.a ** 3 / mu); O.Q = O.a * (1 + e); } else { O.a = NaN; O.T = Infinity; O.Q = Infinity; }
  return true;
}
/* A body's orbit about its primary, as the lab's relative() takes it: a moon about its planet as the two are, anything
   else as its system (with its moons) about the primary's system, or about a binary's barycentre. */
function about(L, b, P) {
  const G = G0 * L.p.G;
  if (P === S.pair || P === S.inner) { const A = L.system(b); return osc(A, P, G * (A.m + P.m)); }
  const nest = b.host === P, A = nest ? b : L.system(b), B = nest ? P : L.system(P);
  return osc(A, B, G * (A.m + B.m));
}
/* How hard Q tugs on b's orbit about P: Q's pull on b less its pull on P (the tide), against P's pull on b. */
function pullRatio(b, P, Q) {
  const dx = Q.x - b.x, dy = Q.y - b.y, dz = Q.z - b.z, ex = Q.x - P.x, ey = Q.y - P.y, ez = Q.z - P.z;
  const d3 = (dx * dx + dy * dy + dz * dz) ** 1.5, e3 = (ex * ex + ey * ey + ez * ez) ** 1.5, r2 = (b.x - P.x) ** 2 + (b.y - P.y) ** 2 + (b.z - P.z) ** 2;
  if (!(d3 > 0) || !(e3 > 0) || !(r2 > 0)) return 0;
  return Q.m * Math.hypot(dx / d3 - ex / e3, dy / d3 - ey / e3, dz / d3 - ez / e3) / ((P.m + b.m) / r2);
}
/* A body's true radius on the stage's scale: real worlds are drawn true already; a star follows R ∝ M^0.8 from the
   Sun's; a brown dwarf is about Jupiter's size; a planet takes the lab's mass-radius model. */
function trueR(L, b) {
  if (b.real) return b.r;
  if (b.kind === 'star') return R_SUN_PX * Math.pow(b.m / 1000, 0.8);
  if (b.kind === 'brown') return R_JUP_PX;
  const ph = L.physique(b); return ph ? ph.R / M_PX : NaN;
}
/* What a heavy body's Hill sphere is measured against: the star of a binary that it circles, else the core. */
function hillHost(P) {
  const pr = S.pair, rp = pr && S.recs.get(P.id);
  return rp && rp.prim === pr.a.id ? pr.a : rp && rp.prim === pr.b.id ? pr.b : S.core;
}
const hillAbout = (P, H) => dist(P, H) * Math.cbrt(P.m / (3 * (H.m + P.m)));
/* The Hill radius of a heavy body about what holds it: the reach inside which its pull beats that body's tide. */
function hillOf(P) {
  const i = S.majors.indexOf(P);
  if (i >= 0) return S.hill[i];
  const H = S.core && hillHost(P); return P === S.C || !H ? 0 : hillAbout(P, H);
}
/* What holds a body: its own planet while it stays bound inside that planet's Hill sphere, else the smallest Hill
   sphere of a heavy body it is bound inside, else the core: the heaviest body, or a bound binary's barycentre (a
   planet close to one of the pair circles that star). */
function primaryOf(L, b) {
  const C = S.C, pr = S.pair, G = G0 * L.p.G;
  if (!C || b === C || (pr && b === pr.b)) return null;
  const inside = P => {
    if (P === b || P === C || (pr && P === pr.b) || !(P.m > b.m) || P.dead) return false;
    const rH = hillOf(P), d = dist(b, P);
    if (!(d < rH)) return false;
    const v2 = (b.vx - P.vx) ** 2 + (b.vy - P.vy) ** 2 + (b.vz - P.vz) ** 2;
    return v2 / 2 - G * (P.m + b.m) / d < 0;
  };
  if (b.host && inside(b.host)) return b.host;
  let best = null, bestR = Infinity;
  for (let i = 0; i < S.majors.length; i++) { const P = S.majors[i]; if (S.hill[i] < bestR && inside(P)) { best = P; bestR = S.hill[i]; } }
  if (best) return best;
  if (pr) { const da = dist(b, pr.a), db = dist(b, pr.b); return Math.min(da, db) < 0.35 * pr.sep ? (da < db ? pr.a : pr.b) : pr; }
  return C;
}
const keyOf = P => (P === S.pair ? -1 : P === S.inner ? S.inner.of.id : P.id);
/* What a body's orbit about a star C (the heaviest body, or either star of a binary) is really about: that star
   together with the planets circling it well inside the body's closest approach (half of it), as their barycentre,
   so a distant world's orbit is not shaken by the star's own wobble round them (Jacobi's coordinates). The star
   alone when nothing lies that far inside. */
function interior(b, r, C) {
  const q = r.q, I = S.inner;
  if (!(q > 0)) return C;
  let m = C.m, x = C.m * C.x, y = C.m * C.y, z = C.m * C.z, vx = C.m * C.vx, vy = C.m * C.vy, vz = C.m * C.vz, k = 0;
  for (const P of S.majors) {
    if (P === C || P === b) continue;
    const rp = S.recs.get(P.id);
    if (!rp || rp.prim !== C.id || !(rp.a < 0.5 * q)) continue;
    m += P.m; x += P.m * P.x; y += P.m * P.y; z += P.m * P.z; vx += P.m * P.vx; vy += P.m * P.vy; vz += P.m * P.vz; k++;
  }
  if (!k) return C;
  I.of = C; I.m = m; I.x = x / m; I.y = y / m; I.z = z / m; I.vx = vx / m; I.vy = vy / m; I.vz = vz / m; I.r = C.r;
  return I;
}

/* ---------- records ---------- */
function mkRec(b, isNew, t) {
  return {
    id: b.id, name: b.name || null, kind: b.kind, m: b.m, r: b.r, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz,
    tick: 0, isNew, told: !isNew, gain: 0,
    prim: 0, cand: 0, candN: 0, bound: false, flipN: 0, regime: false,
    a: NaN, e: NaN, q: NaN, Q: NaN, T: NaN, rv: 0, hx: 0, hy: 0, hz: 0, ex: 0, ey: 0, ez: 0,
    a0: NaN, e0: NaN, T0: NaN, pm0: 0, drift: 0, quiet: -Infinity, pertK: 0, pertWho: '',
    pass: null, passer: '', passT: -Infinity, plunged: false, v0: NaN, free: false,
    turn: NaN, tx: 0, ty: 0, tz: 0, turnT0: 0, turnD: 0, timed: false,
    px: 0, py: 0, pz: 0, pT: NaN, pN: 0, precessed: false,
  };
}
/* A new baseline for a body's orbit: what later looks are measured against. */
function rebase(r, P, t) {
  r.a0 = O.a; r.e0 = O.e; r.T0 = O.T; r.pm0 = P.m; r.drift = 0; r.pertK = 0; r.pertWho = ''; r.turn = NaN;
  r.bound = O.E < 0; r.flipN = 0; r.quiet = Math.max(r.quiet, t + 1); r.v0 = NaN; r.pT = NaN;
}
function keep(r, b) {
  r.m = b.m; r.kind = b.kind; r.r = b.r; r.x = b.x; r.y = b.y; r.z = b.z; r.vx = b.vx; r.vy = b.vy; r.vz = b.vz;
}

/* ---------- a fresh story: every body present is the baseline, and nothing about them is news ---------- */
function start(L, t) {
  S = {
    tick: 0, t, dt: 0, recs: new Map(), majors: [], hill: [], tracked: [], births: [], deaths: [], arch: [], cands: new Map(),
    sigN: -1, sigU: -1, sigM: -1, sigE: -1, C: null, Cid: 0, pair: null, core: null, stars: 0,
    pairObj: { id: -1, kind: 'pair', name: null, m: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, a: null, b: null, sep: 0 },
    inner: { id: -2, kind: 'star', name: null, of: null, m: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0 }, crowd: false, n0: 0, cleared: 1,
    cm: { M: 0, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0 },
    merged: L.merged, escaped: L.escaped, base: true, bary: 0, moving: false, E0: L.E0, eT: t, had: L.bodies.length, lastBy: new Map(),
  };
  for (const b of L.bodies) S.recs.set(b.id, mkRec(b, false, t));
  // More than forty bodies around one is a crowd: a disk or a swarm, not a planetary system.
  S.crowd = !L.sky && L.bodies.length > 40; S.n0 = L.bodies.length; S.t0 = t; S.merged0 = L.merged; S.escaped0 = L.escaped;
}

/* The heavy bodies (hosts and perturbers) and the followed ones, rebuilt only when bodies come or go. */
const byMass = (x, y) => y.m - x.m;
function roster(L) {
  S.majors.length = 0; S.tracked.length = 0;
  for (const b of L.bodies) if (b.m > 0) S.majors.push(b);
  S.majors.sort(byMass); if (S.majors.length > MAJOR_CAP) S.majors.length = MAJOR_CAP;
  // In the Solar System only named bodies and those placed by hand are followed: the belts are thousands of rocks.
  for (const b of L.bodies) { const r = S.recs.get(b.id); if (L.sky && !b.name && !r.isNew) continue; S.tracked.push(b); }
  S.tracked.sort((x, y) => (S.recs.get(y.id).isNew - S.recs.get(x.id).isNew) || y.m - x.m);
  if (S.tracked.length > TRACK_CAP) S.tracked.length = TRACK_CAP;
}
/* The core everything is measured about: the heaviest body, or with a companion of a tenth its mass or more, bound
   and with no comparable body near, the barycentre of the pair. */
function setCore(L) {
  const C = S.majors[0], B2 = S.majors[1], G = G0 * L.p.G;
  S.C = C; S.pair = null;
  if (C && B2 && B2.m >= 0.1 * C.m && osc(B2, C, G * (C.m + B2.m)) && O.E < 0) {
    const d = O.r, M = C.m + B2.m, P = S.pairObj, x = (C.m * C.x + B2.m * B2.x) / M, y = (C.m * C.y + B2.m * B2.y) / M, z = (C.m * C.z + B2.m * B2.z) / M;
    let alone = true;
    for (let i = 2; i < S.majors.length; i++) { const Q = S.majors[i]; if (Q.m >= 0.1 * B2.m && Math.hypot(Q.x - x, Q.y - y, Q.z - z) < 3 * d) { alone = false; break; } }
    if (alone) {
      Object.assign(P, { m: M, x, y, z, vx: (C.m * C.vx + B2.m * B2.vx) / M, vy: (C.m * C.vy + B2.m * B2.vy) / M, vz: (C.m * C.vz + B2.m * B2.vz) / M, a: C, b: B2, sep: d });
      S.pair = P;
    }
  }
  S.core = S.pair || C;
  // A planet close to one star of a binary has its Hill sphere about that star; anything held by another body is a moon.
  for (let i = 0; i < S.majors.length; i++) {
    const P = S.majors[i], H = S.core && hillHost(P), rp = S.recs.get(P.id), moon = !!P.host || (rp && rp.prim !== 0 && rp.prim !== keyOf(H));
    S.hill[i] = !H || P === C || (S.pair && P === S.pair.b) || moon ? 0 : hillAbout(P, H);
  }
  S.hill.length = S.majors.length;
}

/* ---------- births and deaths ---------- */
function census(L, N, t) {
  S.births.length = 0; S.deaths.length = 0;
  for (const b of L.bodies) {
    let r = S.recs.get(b.id);
    if (!r) { r = mkRec(b, true, t); S.recs.set(b.id, r); S.births.push(b); }
    r.tick = S.tick; r.gain = 0;
  }
  for (const r of S.recs.values()) if (r.tick !== S.tick) S.deaths.push(r);
  let merges = L.merged - S.merged, escapes = L.escaped - S.escaped;
  S.merged = L.merged; S.escaped = L.escaped;
  if (!S.deaths.length) return 0;
  S.deaths.sort(byMass);
  let gone = 0;
  for (const d of S.deaths) {
    S.recs.delete(d.id);
    const s = merges > 0 ? eater(L, d) : null;
    if (s) { merges--; merged(L, N, d, s); continue; }
    if (escapes > 0) { escapes--; gone++; left(L, N, d); }
    // Anything else was deleted by hand, which needs no telling.
  }
  return gone;
}
/* The body that swallowed a dead one. A survivor's growth since the last look is a budget: two bodies can fall into
   one survivor in a look, or one into another that then falls into a third, so a survivor qualifies while what it
   gained, less the mass already put down to it, still covers this body's. One whose remainder fits exactly comes
   first, then the one nearest to where the dead body was heading. */
function eater(L, d) {
  let best = null, bd = Infinity, exact = false;
  for (const s of L.bodies) {
    const rs = S.recs.get(s.id); if (!rs || (rs.isNew && !rs.told)) continue;
    const tol = 1e-9 * (s.m + d.m) + 1e-15, room = s.m - rs.m - rs.gain;
    if (room < d.m - tol) continue;
    const fit = room - d.m <= tol, k = Math.hypot(d.x + d.vx * S.dt - s.x, d.y + d.vy * S.dt - s.y, d.z + d.vz * S.dt - s.z) / (s.r + d.r);
    if ((fit && !exact) || (fit === exact && k < bd)) { bd = k; best = s; exact = fit; }
  }
  if (best) S.recs.get(best.id).gain += d.m;
  return best;
}
function merged(L, N, d, s) {
  const rs = S.recs.get(s.id), G = G0 * L.p.G, rc = 0.7 * (rs.r + d.r), dd = Math.max(rc, dist(d, rs));
  // The meeting speed from the last look, carried in by their mutual pull to the contact distance.
  const v2 = (d.vx - rs.vx) ** 2 + (d.vy - rs.vy) ** 2 + (d.vz - rs.vz) ** 2, vi = Math.sqrt(v2 + 2 * G * (rs.m + d.m) * (1 / rc - 1 / dd));
  const star = rs.kind === 'star' && d.kind !== 'star', grown = s.kind !== rs.kind;
  // The survivor's record still holds it as it was before the merger: its old mass and class.
  const formed = !grown ? `${cap(ref(s))} now has ${massOf(L, s.m)}, still ${an(cls(s))}.`
    : `The merged body, ${massOf(L, s.m)}, has grown from ${an(cls(rs))} into ${an(cls(s))}${s.kind === 'brown' ? ': past 13 Jupiter masses, deuterium can fuse in its core' : s.kind === 'star' ? ': past about 80 Jupiter masses hydrogen fuses in its core, and it shines' : ''}.`;
  N.add({
    kind: star ? 'infall' : 'merge', group: star ? 'bodies swallowed' : 'mergers', tone: grown || star ? 'key' : 'event', show: follow(L, s),
    title: star ? `${cap(ref(d))} fell into ${ref(s)}` : `${cap(ref(d))} merged into ${ref(s)}`,
    body: star
      ? `${subj(L, d)} reached ${ref(s)} at about <b>${spd(L, vi)}</b> and was swallowed. ${d.m > 0 ? `Its mass and momentum join ${ref(s)}'s, so ${ref(s)} moves on at their shared velocity.` : 'It carried no mass, so the star is unchanged.'}`
      : `${subj(L, d)} met ${subj(L, rs)} at about <b>${spd(L, vi)}</b>, and the two merged on contact: their total mass and momentum carry on in one body, and the energy of their approach becomes heat. ${formed}`,
  });
  scale(L, N, 'Two bodies just merged where their drawn discs met.');
}
function left(L, N, d) {
  const c = S.cm, v = Math.hypot(d.vx - c.vx, d.vy - c.vy, d.vz - c.vz);
  N.add({ kind: 'escape', group: 'departures', key: `left|${d.id}`, title: `${cap(ref(d))} has left the system`,
    body: `${subjOf(d)} passed ${len(L, L.cullR())} from the centre of mass moving at ${spd(L, v)}, and was taken out of the run: nothing left behind can pull it back.` });
}

/* ---------- a body arrives ---------- */
function arrival(L, N, b, r, P) {
  r.told = true;
  if (!P) {
    if (S.majors.length > 1 || L.bodies.length > 1) return;
    N.add({ kind: 'added', group: 'bodies added', show: follow(L, b), title: `${cap(ref(b))} coasts alone`,
      body: `${subj(L, b)} moves at <b>${spd(L, Math.hypot(b.vx, b.vy, b.vz))}</b> with nothing to pull on it, so it keeps a straight line at a steady speed, as Newton's first law says, until something is placed near it.` });
    return;
  }
  if (!about(L, b, P)) return;
  const rel = b.m / P.m, vesc = Math.sqrt(2 * O.mu / O.r);
  const pair = rel >= 0.1 ? ` At ${pc(rel)} of ${ref(P)}'s mass it is no satellite: the two circle their common centre as a binary.`
    : P.kind === 'star' && rel >= 0.04 ? ` At ${pc(rel)} of the star's mass it counts as a binary companion by the IAU's rule, and the star will wobble.` : '';
  N.add(O.E < 0
    ? { kind: 'added', group: 'bodies added', show: follow(L, b), title: `${cap(ref(b))} entered orbit about ${ref(P)}`,
      body: `${subj(L, b)} is on ${shape(O.e)} about ${ref(P)}: a = <b>${len(L, O.a)}</b>, e = ${O.e.toFixed(2)}, swinging between ${len(L, O.q)} and ${len(L, O.Q)} and round once every <b>${dur(L, O.T)}</b>.${pair}` }
    : { kind: 'added', group: 'bodies added', show: follow(L, b), title: `${cap(ref(b))} is on an escape path`,
      body: `${subj(L, b)} moves at <b>${spd(L, O.v)}</b> relative to ${ref(P)}, ${len(L, O.r)} away, where escape speed √(2GM/r) is ${spd(L, vesc)}. Its path is a hyperbola (e = ${O.e.toFixed(2)}), so unless something takes speed from it, it will not come back.` });
}

/* ---------- each followed body, every look ---------- */
function watch(L, N, b, r, t) {
  const P0 = primaryOf(L, b);
  if (!r.told) { arrival(L, N, b, r, P0); }
  // About a star (the heaviest body, or either star of a binary) the orbit is taken about it and the planets inside.
  const star = !!P0 && (S.pair ? P0 === S.pair.a || P0 === S.pair.b : P0 === S.C), P = star ? interior(b, r, P0) : P0;
  if (!P || !about(L, b, P)) { r.prim = 0; return; }
  const pk = keyOf(P), bound = O.E < 0;
  r.regime = b.m < 0.1 * P.m;
  // A first primary (or a new one after the heaviest body changed) that hosts the body's pass ends the pass.
  if (r.prim === 0) { if (r.pass && r.pass.P === P) r.pass = null; r.prim = pk; rebase(r, P, t); return note(r); }
  // The interior barycentre gains or loses a planet as the orbit changes: a new frame, so a new baseline.
  if (r.pm0 !== P.m && pk === r.prim) { rebase(r, P, t); return note(r); }
  if (pk !== r.prim) {
    // A new primary is believed on the second look in a row, so a grazing pass does not count as a capture.
    if (r.cand === pk) r.candN++; else { r.cand = pk; r.candN = 1; }
    if (r.candN >= 2) { handover(L, N, b, r, P, t); r.prim = pk; r.cand = 0; r.candN = 0; rebase(r, P, t); }
    return note(r);
  }
  r.cand = 0; r.candN = 0;
  if (bound !== r.bound) { if (++r.flipN >= 2) { flipped(L, N, b, r, P, t); rebase(r, P, t); return note(r); } } else r.flipN = 0;
  if (bound && r.regime && (star || P === S.core) && !S.crowd) drift(L, N, b, r, P, t);
  if (bound && r.isNew && !r.timed) clock(L, N, b, r, P, t);
  if (bound && r.regime && !S.crowd) precess(L, N, b, r, P, t);
  if (!bound && !r.pass) { flyby(L, N, b, r, P); climb(L, N, b, r, P); }
  plunge(L, N, b, r, P);
  note(r);
}
function note(r) { r.a = O.a; r.e = O.e; r.q = O.q; r.Q = O.Q; r.T = O.T; r.rv = O.rv; const h = Math.hypot(O.hx, O.hy, O.hz) || 1; r.hx = O.hx / h; r.hy = O.hy / h; r.hz = O.hz / h; r.ex = O.ex; r.ey = O.ey; r.ez = O.ez; }
/* The body changed hands: a planet captured it, or it slipped out of its planet's Hill sphere. */
function handover(L, N, b, r, P, t) {
  // A pass through P's Hill sphere ends when P takes the body.
  if (r.pass && r.pass.P === P) r.pass = null;
  if (S.crowd) return;
  // A binary's stars count as the core: a body moving between a star and the pair is neither captured nor lost.
  const pr = S.pair, core = P === S.core || P === S.inner || (!!pr && (P === pr.a || P === pr.b));
  const was = r.prim > 0 && S.C && r.prim !== S.C.id && !(pr && r.prim === pr.b.id) ? L.bodies.find(q => q.id === r.prim) : null;
  if (!core && O.E < 0) {
    N.add({ kind: 'capture', group: 'captures', tone: 'key', show: follow(L, b), title: `${cap(ref(P))} captured ${ref(b)}`,
      body: `${subjOf(b)} fell inside ${ref(P)}'s Hill sphere (${len(L, hillOf(P))}), where ${ref(P)}'s pull beats ${ref(hillHost(P))}'s tide, slowly enough to be held: it now circles ${ref(P)} every <b>${dur(L, O.T)}</b> (a = ${len(L, O.a)}, e = ${O.e.toFixed(2)}). With nothing to carry off the extra energy, a capture like this is usually temporary: the path that brought it in can take it out.` });
  } else if (was && core) {
    const by = S.lastBy.get(was.id), after = by && t - by.t < 10 ? `, after ${by.who} swept close by` : '';
    N.add({ kind: 'loss', group: 'moons lost', tone: 'key', show: follow(L, b), title: `${cap(ref(was))} lost ${ref(b)}`,
      body: `${subjOf(b)} is no longer held inside ${ref(was)}'s Hill sphere${after}. ${O.E < 0 ? `It now orbits ${ref(P)} directly: a = ${len(L, O.a)}, e = ${O.e.toFixed(2)}, once every ${dur(L, O.T)}.` : `It is on an open path past ${ref(P)}.`}` });
  }
}
/* Bound to its primary, or not: a binary forms, a capture, or an ejection measured against the escape speed. */
function flipped(L, N, b, r, P, t) {
  if (O.E < 0 && r.pass && r.pass.P === P) r.pass = null;
  const vesc = Math.sqrt(2 * O.mu / O.r), by = t - r.passT < 10 ? r.passer : '', pairs = b.m >= 0.1 * P.m;
  if (O.E < 0) {
    if (S.crowd) return;
    N.add(pairs
      ? { kind: 'binary', group: 'pairs bound', tone: 'key', show: follow(L, b), title: `${cap(ref(b))} and ${ref(P)} are now a bound pair`,
        body: `Their relative speed fell below escape speed (${spd(L, O.v)} against √(2G(M + m)/r) = ${spd(L, vesc)}), so they now circle their common centre every <b>${dur(L, O.T)}</b>: a binary with a = ${len(L, O.a)} and e = ${O.e.toFixed(2)}.${by ? ` Its pass by ${by} took away the speed.` : ''}` }
      : { kind: 'capture', group: 'captures', tone: 'key', show: follow(L, b), title: `${cap(ref(P))} captured ${ref(b)}`,
        body: `${subjOf(b)} slowed below escape speed (${spd(L, O.v)} against ${spd(L, vesc)}) and is now bound to ${ref(P)}: a = ${len(L, O.a)}, e = ${O.e.toFixed(2)}, round once every ${dur(L, O.T)}.${by ? ` Its pass by ${by} took away the speed.` : ''}` });
    return;
  }
  N.add(pairs
    ? { kind: 'escape', group: 'escapes', tone: 'key', key: `fling|${b.id}`, show: follow(L, b), title: `${cap(ref(b))} and ${ref(P)} have come apart`,
      body: `Their relative speed, ${spd(L, O.v)} at ${len(L, O.r)}, is now above escape speed √(2G(M + m)/r) = ${spd(L, vesc)}, so the pair is no longer bound.${by ? ` The pass by ${by} gave it the energy.` : ''}` }
    : { kind: 'escape', group: 'escapes', tone: 'key', key: `fling|${b.id}`, show: follow(L, b), title: `${cap(ref(b))} has been flung out`,
      body: `It now moves at <b>${spd(L, O.v)}</b> relative to ${ref(P)}, ${len(L, O.r)} out, where escape speed √(2GM/r) is ${spd(L, vesc)}, so ${ref(P)} can no longer hold it.${by ? ` Its pass by ${by} gave it the extra speed: a gravity assist.` : ''}` });
}
/* An orbit that has changed size or shape since its baseline, and the likely cause: the heavy body whose tide on it
   was strongest relative to the primary's pull. */
function drift(L, N, b, r, P, t) {
  // The star the orbit is about (both, for an orbit about a binary) and the planets inside it are its frame, not its
  // perturbers; for a planet close to one star of a binary, the other star is.
  const star = P === S.inner ? S.inner.of : P, pr = S.pair;
  for (const Q of S.majors) {
    if (Q === b || Q === P || Q === star || (P === pr && (Q === pr.a || Q === pr.b))) continue;
    const rq = P === S.inner ? S.recs.get(Q.id) : null;
    if (rq && rq.prim === star.id && rq.a < 0.5 * r.q) continue;
    const k = pullRatio(b, P, Q); if (k > r.pertK) { r.pertK = k; r.pertWho = who(Q); }
  }
  if (r.pass || t < r.quiet || !(r.a0 > 0)) return;
  const da = Math.abs(O.a - r.a0) / r.a0, de = Math.abs(O.e - r.e0);
  r.drift = da > 0.04 || de > 0.06 ? r.drift + 1 : 0;
  if (r.drift < 2 || S.perturbed >= 2) return;
  if (r.pertK >= 0.002) {
    S.perturbed++;
    const dT = O.T / r.T0 - 1;
    N.add({ kind: 'perturb', group: 'orbit changes', show: follow(L, b), title: `${cap(ref(b))}'s orbit is changing`,
      body: `Its orbit about ${ref(P)} has gone from a = ${len(L, r.a0)} to <b>${len(L, O.a)}</b>${de > 0.02 ? ` and e = ${r.e0.toFixed(2)} to ${O.e.toFixed(2)}` : ''}, so a turn that took ${dur(L, r.T0)} now takes <b>${dur(L, O.T)}</b>${Math.abs(dT) > 0.02 ? ` and it falls out of step with its neighbours` : ''}. The likely cause is ${r.pertWho}: at its strongest it pulled on ${ref(b)} with <b>${pc(r.pertK)}</b> of ${ref(P)}'s pull, counting only the difference between its tugs on the two, the tide that reshapes an orbit.` });
  }
  rebase(r, P, t); r.quiet = t + Math.max(3 * O.T, 4);
}
/* A placed body's first full turn, timed and set beside Kepler's third law. */
function clock(L, N, b, r, P, t) {
  if (!(O.T > 4 * S.dt) || !(S.dt > 0)) { r.turn = NaN; return; }
  if (!Number.isFinite(r.turn)) { r.turn = 0; r.tx = O.rx; r.ty = O.ry; r.tz = O.rz; r.turnT0 = t; return; }
  const cx = r.ty * O.rz - r.tz * O.ry, cy = r.tz * O.rx - r.tx * O.rz, cz = r.tx * O.ry - r.ty * O.rx;
  const s = cx * O.hx + cy * O.hy + cz * O.hz >= 0 ? 1 : -1, d = Math.atan2(s * Math.hypot(cx, cy, cz), r.tx * O.rx + r.ty * O.ry + r.tz * O.rz);
  r.turn += d; r.tx = O.rx; r.ty = O.ry; r.tz = O.rz;
  if (r.turn < TAU || d <= 0) return;
  // The turn closed inside this look: place the crossing by the share of the last step it needed.
  const Tm = t - (r.turn - TAU) / d * S.dt - r.turnT0, off = Math.abs(Tm / O.T - 1);
  r.timed = true;
  N.add({ kind: 'orbit', group: 'first orbits', show: follow(L, b), title: `${cap(ref(b))} completed its first orbit`,
    body: `One full turn about ${ref(P)} took <b>${dur(L, Tm)}</b>. Kepler's third law, T = 2π√(a³/G(M + m)), gives ${dur(L, O.T)} for its orbit now (a = ${len(L, O.a)}): ${off < 0.03 ? `within ${pc(off)}` : `${pc(off)} apart, the work of the other bodies' pull on it during the turn`}.` });
}
/* The ellipse turning in its own plane: periapsis advances when the pull is not exactly 1/r² (softening near the
   primary) or when other bodies tug. Measured from the eccentricity vector, told once a body's has turned 15°. */
function precess(L, N, b, r, P, t) {
  if (r.precessed || r.pass || !(O.e > 0.1)) { r.pT = NaN; return; }
  const e = O.e;
  if (!Number.isFinite(r.pT)) { r.px = O.ex / e; r.py = O.ey / e; r.pz = O.ez / e; r.pT = t; r.pN = 0; return; }
  const turn = Math.acos(Math.max(-1, Math.min(1, (O.ex * r.px + O.ey * r.py + O.ez * r.pz) / e)));
  if (turn < 15 * Math.PI / 180) return;
  const orbits = (t - r.pT) / O.T;
  if (!(orbits >= 1)) return;
  r.precessed = true;
  const soft = L.p.soft / O.q, why = soft > 0.02
    ? `Softening, ε = ${len(L, L.p.soft)}, is ${pc(soft)} of its closest approach, so near periapsis the pull is weaker than 1/r² and the orbit does not quite close`
    : r.pertWho ? `The tug of ${r.pertWho} (${pc(r.pertK)} of ${ref(P)}'s pull at its strongest) slowly turns it` : `The other bodies' tugs slowly turn it`;
  N.add({ kind: 'perturb', group: 'turning ellipses', show: follow(L, b), title: `${cap(ref(b))}'s ellipse is turning`,
    body: `The long axis of ${ref(b)}'s orbit about ${ref(P)} has swung <b>${deg(turn)}</b> in ${sig(orbits, 2)} orbit${orbits >= 1.5 ? 's' : ''}, about ${deg(turn / orbits)} a turn: its periapsis is precessing. ${why}. In the Solar System the same effect, from the planets' tugs and a little from relativity, turns Mercury's orbit about 0.16° a century.` });
}
/* The closest point of an open path: how far the pull bent it, sin(δ/2) = 1/e. */
function flyby(L, N, b, r, P) {
  if (!(r.rv < 0 && O.rv >= 0)) return;
  const bend = 2 * Math.asin(Math.min(1, 1 / O.e));
  if (bend < 8 * Math.PI / 180) return;
  N.add({ kind: 'pass', group: 'close passes', show: follow(L, b), title: `${cap(ref(b))} swung past ${ref(P)}`,
    body: `Too fast to be held, ${spd(L, Math.sqrt(2 * O.E))} even far away, it is on an open path about ${ref(P)} (a hyperbola, e = ${O.e.toFixed(2)}). It passed <b>${len(L, O.q)}</b> from ${ref(P)}'s centre and was bent <b>${deg(bend)}</b> off course, leaving as fast as it came: the pull turned it without slowing it.` });
  scale(L, N, null, b, P, O.q);
}
/* An open path far out: the body has climbed out of the well and coasts at its speed at infinity, v∞² = v² − 2GM/r. */
function climb(L, N, b, r, P) {
  if (r.free || O.rv <= 0) return;
  const vinf = Math.sqrt(2 * O.E);
  if (!Number.isFinite(r.v0)) { r.v0 = O.v; return; }
  if (!(O.v < 1.05 * vinf) || !(r.v0 > 1.25 * vinf)) return;
  r.free = true;
  N.add({ kind: 'escape', group: 'escapes', key: `free|${b.id}`, show: follow(L, b), title: `${cap(ref(b))} has climbed out of ${ref(P)}'s pull`,
    body: `Climbing away, it slowed from ${spd(L, r.v0)} to <b>${spd(L, O.v)}</b>: kinetic energy paid for the climb, as a ball thrown upward slows. Now ${len(L, O.r)} out, it is close to its speed at infinity, v∞ = √(v² − 2GM/r) = ${spd(L, vinf)}, which it will keep, since ${ref(P)}'s pull falls off as 1/r².` });
}
/* A path that dips inside the contact distance: the body will hit what it orbits. */
function plunge(L, N, b, r, P) {
  if (r.plunged || S.crowd || P === S.pair || !L.p.merge || O.rv >= 0) return;
  const rc = 0.7 * (P.r + b.r);
  if (!(O.q < rc && O.r > 1.5 * rc)) return;
  r.plunged = true;
  N.add({ kind: 'plunge', key: `plunge|${b.id}`, tone: 'key', show: follow(L, b), title: `${cap(ref(b))} is falling into ${ref(P)}`,
    body: `Its path now dips to <b>${len(L, O.q)}</b> from ${ref(P)}'s centre, inside the contact distance of ${len(L, rc)} that their drawn sizes set, so unless another body pulls it aside first, it will touch ${ref(P)} on the way in and merge. ${O.E < 0 ? `It is bound (a = ${len(L, O.a)}, e = ${O.e.toFixed(2)}) with too little sideways speed to swing clear.` : 'It is heading too directly at it to swing clear.'}` });
}

/* ---------- passes through a heavy body's Hill sphere ---------- */
function encounters(L, N, t) {
  if (S.crowd) return;
  const G = G0 * L.p.G;
  // A pass whose host is gone (merged, deleted or escaped) or no longer has a Hill sphere (it became a moon) is dropped.
  for (const b of S.tracked) { const r = S.recs.get(b.id), H = r && r.pass && r.pass.P; if (H && (H.dead || !S.recs.has(H.id) || !(hillOf(H) > 0))) r.pass = null; }
  for (let i = 0; i < S.majors.length; i++) {
    const P = S.majors[i], rH = S.hill[i];
    if (!(rH > 0)) continue;
    for (const b of S.tracked) {
      if (b === P || !(b.m < P.m)) continue;
      const r = S.recs.get(b.id);
      if (!r || (r.pass && r.pass.P !== P) || r.prim === P.id || r.cand === P.id) continue;
      const d = dist(b, P);
      if (!r.pass) {
        if (d >= rH || (r.passer === ref(P) && t - r.passT < 2) || !osc(b, P, G * (P.m + b.m)) || O.E < 0) continue;
        r.pass = { P, t0: t, rH, dmin: d, e: O.e, vinf: Math.sqrt(2 * O.E), q: O.q, aB: r.a, eB: r.e, boundB: r.bound, ux: b.vx - P.vx, uy: b.vy - P.vy, uz: b.vz - P.vz };
      }
      const p = r.pass;
      if (d < p.dmin && osc(b, P, G * (P.m + b.m)) && O.E > 0) { p.dmin = d; p.e = O.e; p.vinf = Math.sqrt(2 * O.E); p.q = O.q; }
      if (d > 1.1 * p.rH) passed(L, N, b, r, t);
    }
  }
}
function passed(L, N, b, r, t) {
  const p = r.pass, P = p.P;
  r.pass = null;
  if (!S.core || P.dead) return;
  const c = hillHost(P);
  // The velocity relative to P, in against out: the turn the pass gave it, set beside the two-body hyperbola's.
  const ox = b.vx - P.vx, oy = b.vy - P.vy, oz = b.vz - P.vz, dv = Math.hypot(ox - p.ux, oy - p.uy, oz - p.uz), u = Math.hypot(p.ux, p.uy, p.uz) || 1;
  const turned = Math.acos(Math.max(-1, Math.min(1, (ox * p.ux + oy * p.uy + oz * p.uz) / (u * (Math.hypot(ox, oy, oz) || 1))))), bend = 2 * Math.asin(Math.min(1, 1 / p.e)), dvT = 2 * p.vinf / p.e;
  S.lastBy.set(P.id, { who: ref(b), t });
  r.passer = ref(P); r.passT = t;
  if (!(p.dmin < 0.6 * p.rH || turned > 0.15)) return;
  const P0 = primaryOf(L, b), ok = P0 && about(L, b, P0);
  let after = '';
  if (ok && P0 === c) {
    const boundA = O.E < 0;
    if (p.boundB && boundA) after = ` Its orbit about ${ref(c)} went from a = ${len(L, p.aB)} to <b>${len(L, O.a)}</b>${Math.abs(O.e - p.eB) > 0.02 ? ` (e ${p.eB.toFixed(2)} to ${O.e.toFixed(2)})` : ''}: ${O.a > p.aB ? 'it gained energy from the pass, a gravity assist' : `it gave energy to ${ref(P)}`}.`;
    else if (p.boundB) after = ` It now moves fast enough to leave ${ref(c)} for good.`;
    else if (boundA) after = ` It is now bound to ${ref(c)}.`;
    // The pass told the change in its orbit, so the orbit's watch starts again from here.
    rebase(r, c, t);
  }
  N.add({ kind: 'pass', group: 'close passes', show: follow(L, b),
    title: b.m >= 0.1 * P.m ? `${cap(ref(b))} strayed into ${ref(P)}'s Hill sphere` : `${cap(ref(b))} swung past ${ref(P)}`,
    body: `${subjOf(b)} came within <b>${len(L, p.dmin)}</b> of ${who(P)}: ${sig(p.dmin / p.rH, 2)} of its Hill radius (${len(L, p.rH)}, the reach inside which ${ref(P)}'s pull beats ${ref(c)}'s tide). Relative to ${ref(P)} it was turned <b>${deg(turned)}</b>, a change of <b>${spd(L, dv)}</b> in its velocity: the slingshot. A two-body hyperbola with its v∞ of ${spd(L, p.vinf)} and e = ${p.e.toFixed(2)} predicts ${deg(bend)} and 2v∞/e = ${spd(L, dvT)}; the gap is ${ref(c)}'s pull during the pass.${after}` });
  scale(L, N, null, b, P, p.dmin);
}

/* ---------- the system as a whole ---------- */
/* The star's partner pulls the barycentre out of it: outside its true surface, outside its drawn disc, past a
   twenty-fifth of its mass (a binary companion by the IAU's rule), or a match for it. Told as the level rises. */
function dominance(L, N, t) {
  const C = S.C, B = S.majors[1];
  let level = 0;
  // A star and its heaviest partner, bound: two planets that circle each other are a binary, told as one.
  if (C && B && C.kind === 'star' && osc(B, C, G0 * L.p.G * (C.m + B.m)) && O.E < 0) {
    const q = B.m / C.m, db = O.r * B.m / (C.m + B.m);
    level = q >= 0.5 ? 4 : q >= 1 / 25 && C.kind === 'star' ? 3 : db > C.r ? 2 : db > trueR(L, C) ? 1 : 0;
  }
  if (level <= S.bary) { if (level === 0) S.bary = 0; return; }
  S.bary = level;
  if (S.base) return;
  const q = B.m / C.m, db = O.r * B.m / (C.m + B.m), vstar = O.v * B.m / (C.m + B.m), R = trueR(L, C);
  let near = null, far = null, kn = Infinity, kf = 0;
  for (const b of S.tracked) {
    const r = S.recs.get(b.id);
    if (b === B || b === C || !r || r.prim !== C.id || !r.regime) continue;
    const k = pullRatio(b, C, B); if (k < kn) { kn = k; near = b; } if (k > kf) { kf = k; far = b; }
  }
  const title = level === 4 ? `${cap(ref(C))} and ${ref(B)} orbit each other` : level === 3 ? `${cap(ref(B))} is a binary companion, not a planet` : level === 2 ? `${cap(ref(C))} now visibly wobbles` : `The barycentre has left ${ref(C)}`;
  const lead = level === 4
    ? `Neither dominates: ${ref(C)} and ${who(B)} (${massOf(L, B.m)}, ${pc(q)} of its mass) circle a barycentre between them, <b>${len(L, db)}</b> from ${ref(C)}'s centre, once every ${dur(L, O.T)}.`
    : `${subj(L, B).replace(/,$/, '')}, ${pc(q)} of ${ref(C)}'s mass, and ${ref(C)} circle their common centre of mass, the barycentre, which now lies <b>${len(L, db)}</b> from ${ref(C)}'s centre: outside ${Number.isFinite(R) ? `its true surface (radius about ${len(L, R)})` : 'it'}${db > C.r ? ' and even outside its drawn disc' : ''}.`;
  const wobble = ` ${cap(ref(C))} swings round that point at <b>${spd(L, vstar)}</b> once every ${dur(L, O.T)}, the wobble astronomers read as a Doppler shift to find planets.`;
  const iau = level === 3 && B.kind !== 'star' ? ' Above a twenty-fifth of its star\'s mass, it counts as a binary companion by the IAU\'s working rule rather than a planet.' : '';
  const inner = near ? ` Bodies close to ${ref(C)} are carried round with its wobble, so their paths loop on the stage, but their orbits about it change only where ${ref(B)}'s tide is strong: ${ref(near)} feels ${pc(kn)} of ${ref(C)}'s pull from it${far && far !== near ? `, ${ref(far)} ${pc(kf)}${kf > 0.01 ? ', enough to reshape its orbit' : ''}` : ''}.` : '';
  const cam = L.p.follow ? ' The camera follows the centre of mass, so you see the star itself circle.' : '';
  N.add({ kind: 'bary', key: `bary${level}|${B.id}`, tone: 'key', show: follow(L, B), title, body: `${lead}${level < 4 ? wobble : ''}${iau}${inner}${cam}` });
  scale(L, N, `${cap(ref(B))} looks huge beside its neighbours, but its pull comes from its mass alone.`);
}
/* A crowd (a disk of planetesimals) is told as it clears: each quarter of its bodies gone, merged into fewer and
   larger ones or flung out, as planets are thought to grow from such a disk. */
function clearing(L, N, t) {
  const n = L.bodies.length, f = n / S.n0;
  for (const mark of [0.75, 0.5, 0.25]) {
    if (!(f <= mark) || !(S.cleared > mark)) continue;
    S.cleared = mark;
    let big = null; for (const b of S.majors) if (b !== S.C && (!big || b.m > big.m)) big = b;
    N.add({ kind: 'merge', key: `clear|${mark}`, tone: 'key', show: big ? follow(L, big) : null, title: `The disk is clearing: ${n} of ${S.n0} bodies left`,
      body: `In ${dur(L, t - S.t0)}, ${L.merged - S.merged0} mergers${L.escaped > S.escaped0 ? ` and ${L.escaped - S.escaped0} escapes` : ''} have taken the disk from ${S.n0} bodies to <b>${n}</b>. Bodies on crossing paths collide and stick, so the survivors grow while their number falls${big ? `; the largest, ${who(big)}, now has ${massOf(L, big.m)}` : ''}. Planets are thought to grow this way, from a disk of planetesimals around a young star.` });
  }
}
/* The heaviest body changed: everything is now measured about the new one. */
function outweighed(L, N, C, was) {
  N.add({ kind: 'bary', tone: 'key', show: follow(L, C), key: `top|${C.id}`, title: `${cap(ref(C))} now outweighs ${ref(was)}`,
    body: `At ${massOf(L, C.m)} against ${massOf(L, was.m)}, ${ref(C)} is the heaviest body now, so the barycentre lies nearer to it and ${ref(was)} goes round it, not the other way round. Bodies that circled ${ref(was)} feel a new and stronger pull, and many will not keep their old orbits.` });
}
/* The centre of mass moves only if something from outside pushed it: here, a throw. */
function momentum(L, N) {
  if (S.moving) return;
  const c = S.cm, v = Math.hypot(c.vx, c.vy, c.vz);
  if (!(c.M > 0) || !(v > 0.5)) return;
  S.moving = true;
  if (S.base) return;
  N.add({ kind: 'momentum', key: 'momentum', title: 'The centre of mass is on the move',
    body: `The system's centre of mass now moves at <b>${spd(L, v)}</b>, and it will keep that velocity: no force from outside acts on the system, so its total momentum (${fmtSI(c.M * v)} in simulation units) cannot change, only pass from body to body.${L.p.follow ? ' Follow keeps the centre of mass in the middle of the stage, so the system seems to stand still while it moves.' : ''}` });
}
/* A long stretch with no merge, escape or change: the symplectic step keeps energy. */
function energy(L, N, t) {
  if (L.E0 !== S.E0) { S.E0 = L.E0; S.eT = t; return; }
  if (N.said('energy') || t - S.eT < 30 || S.majors.length < 2 || !L.E0) return;
  const d = Math.abs((L.E - L.E0) / L.E0);
  if (d < 5e-4) N.add({ kind: 'energy', key: 'energy', title: 'Energy is holding',
    body: `Over the last ${dur(L, t - S.eT)} the total energy has stayed within <b>${pcSmall(d)}</b> of where it started. The kick–drift–kick leapfrog is symplectic: its small error swings back and forth along each orbit instead of piling up, so orbits neither spiral in nor drift out.` });
}
/* The planets about the core, and those close to either star of a binary about that star: resonances, crossings and
   pairs packed too tight. */
function architecture(L, N) {
  if (!S.core || S.crowd) return;
  orbitsAbout(L, N, S.core);
  if (S.pair) { orbitsAbout(L, N, S.pair.a); orbitsAbout(L, N, S.pair.b); }
}
/* The planets about c, in order of size. */
function orbitsAbout(L, N, c) {
  const A = S.arch, ck = keyOf(c);
  A.length = 0;
  for (const b of S.tracked) { const r = S.recs.get(b.id); if (r && r.prim === ck && r.bound && r.regime && b.m > 0 && r.a > 0) A.push(r); }
  A.sort((x, y) => x.a - y.a);
  for (let i = 0; i + 1 < A.length; i++) {
    const p = A[i], q = A[i + 1], ratio = q.T / p.T;
    let res = null;
    // Osculating periods wander by a per cent or so in any frame, so a first-order ratio is near within 2 %, a second-order one within 1 %.
    for (const R of RESONANCES) if (Math.abs(ratio / (R[0] / R[1]) - 1) < (R[0] - R[1] === 1 ? 0.02 : 0.01)) { res = R; break; }
    // A resonance is told only when it holds for three seconds of looks, so a passing ratio in a shaken system is not.
    if (res && hold(`${pairKey('res', p, q)}|${res[0]}`, 12)) {
      const [m, n] = res;
      N.add({ kind: 'resonance', group: 'resonances', key: pairKey('res', p, q), show: frameAll, title: `${cap(ref(p))} and ${ref(q)} are near a ${m}:${n} resonance`,
        body: `${subjOf(p)} goes round ${TIMES[m] || `${m} times`} for every ${TURNS[n] || `${n} turns`} of ${who(q)}: their periods, ${dur(L, p.T)} and ${dur(L, q.T)}, stand in the ratio <b>${ratio.toFixed(3)}</b>. So they line up again at the same points of their orbits and each tug repeats instead of averaging out. A resonance can lock orbits in step, as Neptune's keeps Pluto safe, or pump them more eccentric until they cross.` });
    }
    const dot = p.hx * q.hx + p.hy * q.hy + p.hz * q.hz, tilt = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (p.Q > q.q && tilt < 10 * Math.PI / 180 && crosses(p, q) && hold(pairKey('cross', p, q), 2)) {
      const co = Math.abs(ratio - 1) < 0.01, safe = co || (!!res && res[1] === res[0] - 1);
      N.add({ kind: 'cross', group: 'orbit crossings', key: pairKey('cross', p, q), tone: safe ? 'event' : 'warn', show: frameAll, title: `The orbits of ${ref(p)} and ${ref(q)} cross`,
        body: `${cap(ref(q))} dips to ${len(L, q.q)} at its closest to ${ref(c)}, inside ${ref(p)}'s farthest point, ${len(L, p.Q)}, and their orbits are tilted only ${deg(tilt)} to each other. ${co ? `They share one period (${dur(L, p.T)}), so whatever spacing they keep along their orbits repeats every turn: they cross each other's paths at different times and have not met.` : safe ? `Their ${res[0]}:${res[1]} resonance keeps them from meeting: when one crosses the other's path, the other is always far away.` : 'Crossing orbits must meet sooner or later unless a resonance keeps them apart: expect a close pass, a merger or an ejection.'}` });
    }
    if (p.e < 0.3 && q.e < 0.3) {
      const rh = Math.cbrt((p.m + q.m) / (3 * c.m)) * (p.a + q.a) / 2, gap = (q.a - p.a) / rh;
      if (gap < HILL_STABLE && hold(pairKey('packed', p, q), 2)) N.add({ kind: 'packed', group: 'tight pairs', key: pairKey('packed', p, q), tone: 'warn', show: frameAll, title: `${cap(ref(p))} and ${ref(q)} are packed too tight`,
        body: `Their orbits (a = ${len(L, p.a)} and ${len(L, q.a)}) lie only <b>${sig(gap, 2)} mutual Hill radii</b> apart, a mutual Hill radius here being ${len(L, rh)}. Two planets on near-circular orbits can stay clear of each other for good only beyond 2√3 ≈ 3.5 of them, and a system of several needs about 10, so expect close passes, swaps or an ejection soon.` });
    }
  }
}
/* Whether two orbits about one focus truly cross. Overlapping distances (the inner one's farthest point beyond the
   outer one's closest) are needed but not enough: two ovals can nest with their long axes turned apart. Each is
   r = ℓ/(1 + e cos(φ − ϖ)), ℓ = a(1 − e²), and they cross where the difference changes sign round the focus.
   Like the rest of the narrator, which tells a crossing only for orbits tilted less than 10° to each other, this
   treats them as coplanar: both are laid in the inner orbit's plane, each periapsis direction projected into it. */
const CROSS_SAMPLES = 64;
function crosses(p, q) {
  // Axes in p's plane: x̂ less its part along the normal (ŷ if the normal is near x̂), and the normal × that.
  let ux = 1 - p.hx * p.hx, uy = -p.hx * p.hy, uz = -p.hx * p.hz;
  if (Math.hypot(ux, uy, uz) < 0.1) { ux = -p.hy * p.hx; uy = 1 - p.hy * p.hy; uz = -p.hy * p.hz; }
  const u = Math.hypot(ux, uy, uz); ux /= u; uy /= u; uz /= u;
  const wx = p.hy * uz - p.hz * uy, wy = p.hz * ux - p.hx * uz, wz = p.hx * uy - p.hy * ux;
  const wp = Math.atan2(p.ex * wx + p.ey * wy + p.ez * wz, p.ex * ux + p.ey * uy + p.ez * uz);
  const wq = Math.atan2(q.ex * wx + q.ey * wy + q.ez * wz, q.ex * ux + q.ey * uy + q.ez * uz);
  const lp = p.a * (1 - p.e * p.e), lq = q.a * (1 - q.e * q.e);
  let was = 0;
  for (let k = 0; k < CROSS_SAMPLES; k++) {
    const f = k * TAU / CROSS_SAMPLES, sgn = Math.sign(lp / (1 + p.e * Math.cos(f - wp)) - lq / (1 + q.e * Math.cos(f - wq)));
    if (sgn && was && sgn !== was) return true;
    if (sgn) was = sgn;
  }
  return false;
}
/* A condition seen on n looks in a row. */
function hold(key, n) {
  const c = S.cands.get(key);
  if (c && c.tick === S.tick - 1) { c.tick = S.tick; c.n++; return c.n >= n; }
  S.cands.set(key, { tick: S.tick, n: 1 }); return n <= 1;
}
/* The drawn scale, told once per story and only when it matters: what made it matter comes first. */
function scale(L, N, why, b, P, d) {
  if (L.sky || N.said('scale')) return;
  if (!why) {
    if (!(d < 2 * (b.r + P.r))) return;
    const tr = (trueR(L, b) || 0) + (trueR(L, P) || 0);
    why = `${cap(ref(b))} came within ${len(L, d)} of ${ref(P)}, so close their drawn discs nearly touched${tr > 0 ? `; at true size they passed ${Math.round(d / tr)} of their radii apart` : ''}.`;
  }
  let kmin = Infinity, kmax = 0, star = null;
  for (const q of L.bodies) {
    if (!(q.m > 0) || q.real) continue;
    const R = trueR(L, q); if (!(R > 0)) continue;
    if (q.kind === 'star') { if (!star || q.m > star.m) star = q; } else { kmin = Math.min(kmin, q.r / R); kmax = Math.max(kmax, q.r / R); }
  }
  if (!star && !(kmax > 0)) return;
  const worlds = kmax > 0 ? (Math.round(kmin) === Math.round(kmax) ? `worlds about ${Math.round(kmax)} times their true size` : `worlds ${Math.round(kmin)} to ${Math.round(kmax)} times their true size`) : '';
  const st = star ? `${ref(star)} ${Math.round(star.r / trueR(L, star))} times` : '';
  N.add({ kind: 'scale', key: 'scale', title: 'Sizes are drawn larger than life',
    body: `${why} Every body here is drawn far larger than it would be against these orbits: ${[worlds, st].filter(Boolean).join(', ')}.${star ? ` At true scale ${ref(star)} would be ${len(L, 2 * trueR(L, star))} across, a speck at this zoom.` : ''} Gravity acts on mass and the distance between centres, never on drawn size, so discs can overlap on the stage while the bodies are still far apart. Only merging on contact goes by the drawn sizes, which is why bodies merge here where real worlds would just pass close.` });
}

/* ---------- the narrator ---------- */
export const gravityStory = {
  storyHint: 'Throw or drop bodies, or let a scene run: close passes, captures, mergers, escapes, resonances and the star\'s wobble are explained here as they happen, with the numbers behind them.',
  narrate(N) {
    const L = this, t = N.t;
    if (N.fresh || !S) start(L, t);
    S.tick++; S.dt = t - S.t; S.t = t; S.perturbed = 0;
    const gone = census(L, N, t);
    if (!L.bodies.length) {
      if (S.had && gone) N.add({ kind: 'empty', group: 'empty skies', title: 'The sky is empty again', body: `The last body has left: everything thrown here was moving faster than the others' pull could hold, so the system flew apart. Throw two bodies slowly near each other to make a bound pair.` });
      S.had = 0; S.base = false; return;
    }
    S.had = L.bodies.length;
    if (L.bodies.length !== S.sigN || L.uid !== S.sigU || L.merged !== S.sigM || L.escaped !== S.sigE) {
      roster(L); S.sigN = L.bodies.length; S.sigU = L.uid; S.sigM = L.merged; S.sigE = L.escaped;
    }
    const prevC = S.Cid ? S.recs.get(S.Cid) : null;
    setCore(L);
    const C = S.C;
    // The centre of mass and its motion, of the bodies with mass.
    const c = S.cm; c.M = 0; c.x = c.y = c.z = c.vx = c.vy = c.vz = 0;
    if (S.majors.length) for (const b of L.bodies) if (b.m > 0) { c.M += b.m; c.x += b.m * b.x; c.y += b.m * b.y; c.z += b.m * b.z; c.vx += b.m * b.vx; c.vy += b.m * b.vy; c.vz += b.m * b.vz; }
    if (c.M > 0) { c.x /= c.M; c.y /= c.M; c.z /= c.M; c.vx /= c.M; c.vy /= c.M; c.vz /= c.M; }
    S.stars = 0; for (const b of S.majors) if (b.kind === 'star') S.stars++;
    if (C && S.Cid && C.id !== S.Cid) {
      if (prevC && !S.base && L.bodies.some(b => b.id === prevC.id)) outweighed(L, N, C, prevC);
      for (const r of S.recs.values()) r.prim = 0;
    }
    S.Cid = C ? C.id : 0;
    for (const b of S.tracked) { const r = S.recs.get(b.id); if (r && !b.dead) watch(L, N, b, r, t); }
    // A body placed beyond the followed few still gets its arrival told.
    for (const b of S.births) { const r = S.recs.get(b.id); if (r && !r.told) arrival(L, N, b, r, primaryOf(L, b)); }
    if (C) { encounters(L, N, t); dominance(L, N, t); architecture(L, N); }
    if (S.crowd) clearing(L, N, t);
    momentum(L, N); energy(L, N, t);
    if (S.base && !S.crowd) {
      // At the start, a moon right at its planet's drawn edge is where the drawn scale matters first.
      for (const b of S.tracked) {
        const r = S.recs.get(b.id), H = r && r.prim > 0 && C && r.prim !== C.id ? S.majors.find(q => q.id === r.prim) : null;
        if (!H || !(dist(b, H) < 2.5 * H.r) || !(trueR(L, H) > 0)) continue;
        scale(L, N, `${subjOf(b)} circles ${len(L, dist(b, H))} from ${ref(H)}, just past its drawn edge, yet that is ${Math.round(dist(b, H) / trueR(L, H))} of ${ref(H)}'s true radii.`); break;
      }
    }
    for (const b of L.bodies) { const r = S.recs.get(b.id); if (r) keep(r, b); }
    S.base = false;
  },
};
