/*
✒ Metadata
    - Title: Gravity Lab (digiSpace Edition - v2.1)
    - File Name: gravity.js
    - Relative Path: js/labs/gravity.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      global mode replaces the 3D switch; energy accounting survives culls,
      retrograde inclination reads true, snapshots carry parameters.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file. Then, on Dennis's call for 3D gravity with
      orbital tilt: z and vz in every sum, a Tilted orbits scene, a tilt
      control, 3D datasets and an inclination readout.
    Earlier entries: see CHANGELOG.md

✒ Description:
    N-body Newtonian gravity stepped with a kick-drift-kick leapfrog in
    three dimensions, with merging, escapes, an energy chart, a potential
    field view and click-to-follow.

✒ Key Features:
    - Full 3D dynamics: flat scenes add exact zeros and step bit-for-bit as
      in v1.3.
    - Seven scenes, including Tilted orbits with inclinations from 0° to 70°
      and a polar comet.
    - Tilt of new orbits: dropped bodies get a random inclination about
      their line of nodes.
    - Readouts for energy drift, virial ratio, momentum and the range of
      orbit tilts.
    - Datasets and tracks carry z and vz; saved states and rewind keep the
      third dimension.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, drawSeries, seriesRange } from '../core/chart.js';
import { RAMP_HEAT, THEME } from '../core/color.js';
import { brushRing, drawLit, drawStar, rampRgb } from '../core/draw.js';

import { Series } from '../core/series.js';
import { TAU, clamp, fmtSI, rand } from '../core/util.js';
import { view } from '../core/view.js';
import { navAnim } from '../shell/camera.js';
import { setParam } from '../shell/lifecycle.js';

import { updateNav } from '../shell/navigator.js';
import { syncControl } from '../shell/panel.js';
import { gravity3d } from './gravity3d.js';
import { active, announce } from '../shell/state.js';

/* ================================================================== */
/*  Lab 1 · Gravity                                                    */
/* ================================================================== */
export const G0 = 5000;
export const LAUNCH_K = 1.6;
export const TRAIL_CAP = 1200;
export const BODY_CAP = 300;
export const STAR_MASS = 150;
export const bodyRadius = m => 1.5 + 1.65 * Math.cbrt(m);
export const massIdx = m => clamp(Math.round(70 + 185 * Math.log10(m + 1) / Math.log10(2001)), 0, 255);
export const massColor = m => RAMP_HEAT.css[massIdx(m)];
export const massRgb = m => rampRgb(RAMP_HEAT, massIdx(m));

export const gravity = {
  id: 'gravity', name: 'Gravity', title: 'N-body gravity',
  rig3: { plane: 'floor' },
  zoomRange: [0.1, 40],
  eq: 'F = Gm<sub>1</sub>m<sub>2</sub> / r<sup>2</sup>',
  eqTex: 'F = G\\,\\frac{m_1 m_2}{r^2}',
  aria: 'Gravity simulation: bodies orbiting under mutual Newtonian attraction',
  blurb: 'Newtonian gravity between every pair of bodies, stepped with a kick-drift-kick leapfrog that keeps orbital energy from creeping away. Throw bodies, build systems, and watch the three-body figure-eight hold its choreography.',
  interact: [
    '<b>Throw</b>: drag to launch a body along the dashed 5-second preview, or click empty sky to drop one into a circular orbit around the heaviest mass.',
    '<b>Click a body</b> to follow it with the camera, then zoom in to see its sunlit face. Click it again, or press Follow in the view controls, to let go.',
    '<b>Delete</b> removes bodies you click or brush over. <b>Pan</b> drags the view. Hover a body to read its mass and speed.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'throw', label: 'Throw', key: 't', icon: 'throw', hint: 'Drag to throw a body · click empty sky to drop one into orbit · click a body to follow it' },
    { id: 'erase', label: 'Delete', key: 'x', icon: 'erase', hint: 'Click or brush over bodies to delete them' },
    { id: 'pan', label: 'Pan', key: 'h', icon: 'pan', hint: 'Drag to move the view · scroll to zoom at the cursor' },
  ] },
  p: { tool: 'throw', G: 1, soft: 4, launchMass: 2, merge: true, trails: true, trailLen: 360, follow: true, zoom: 1, vectors: false, field: false, incl: 0 },
  presetId: 'solar',
  presets: [
    { id: 'solar', label: 'Star system', params: { incl: 0, G: 1, soft: 4, merge: true, zoom: 0.85, follow: true } },
    { id: 'kepler', label: 'Kepler ellipses', params: { incl: 0, G: 1, soft: 0.5, merge: true, zoom: 0.8, follow: true } },
    { id: 'binary', label: 'Binary star', params: { incl: 0, G: 1, soft: 4, merge: true, zoom: 0.7, follow: true } },
    { id: 'figure8', label: 'Figure-eight', params: { incl: 0, G: 1, soft: 0.5, merge: false, zoom: 1.4, follow: true } },
    { id: 'disk', label: 'Accretion disk', params: { incl: 0, G: 1, soft: 4, merge: true, zoom: 0.9, follow: true } },
    { id: 'tilted', label: 'Tilted orbits', params: { G: 1, soft: 4, merge: true, zoom: 0.85, follow: true, incl: 40 } },
    { id: 'empty', label: 'Empty sky', params: { incl: 0, zoom: 1, follow: true } },
  ],
  controls: [
    { type: 'range', key: 'G', label: 'Gravity strength G', min: 0.1, max: 4, step: 0.05, fmt: v => v.toFixed(2) + '×' },
    { type: 'range', key: 'soft', label: 'Softening length ε', min: 0.5, max: 30, step: 0.5, unit: 'px' },
    { type: 'range', key: 'launchMass', label: 'Mass of new bodies', min: 0.1, max: 2000, log: true, note: 'The star in most scenes has mass 1000.', fmt: v => v.toPrecision(3).replace(/\.?0+$/, '') },
    { type: 'range', key: 'trailLen', label: 'Trail length', min: 20, max: TRAIL_CAP, step: 10, fmt: v => (v / 60).toFixed(1) + ' s' },
    { type: 'range', key: 'zoom', label: 'Zoom', min: 0.1, max: 40, log: true, fmt: v => v.toFixed(v >= 10 ? 1 : 2) + '×' },
    { type: 'toggle', key: 'merge', label: 'Merge bodies on contact' },
    { type: 'toggle', key: 'trails', label: 'Show trails' },
    { type: 'toggle', key: 'follow', label: 'Keep centre of mass in view' },
    { type: 'toggle', key: 'vectors', label: 'Show velocity vectors' },
    { type: 'toggle', key: 'field', label: 'Show potential field' },
    { type: 'range', key: 'incl', label: 'Tilt of new orbits', min: 0, max: 90, step: 1, unit: '°', note: 'Bodies dropped with a click or added from the panel get a random tilt up to this angle.' },
  ],
  actions: [
    { label: 'Add an orbiting body', run() { gravity.addRandom(); } },
    { label: 'Clear trails', run() { for (const b of gravity.bodies) { b.tn = 0; b.th = 0; } } },
  ],
  bodies: [], cam: { x: 0, y: 0, z: 1 }, aim: null, pan: null, erasing: false, viewXf: { ox: 0, oy: 0, z: 1 }, track: null, trackEase: 0,
  selfCam: true, screenInput: true,
  E0: 0, E: 0, KE: 0, PE: 0, merged: 0, escaped: 0, stepCount: 0, uid: 0, accDirty: true, lastSample: -1,
  series: { ke: new Series(400), pe: new Series(400), e: new Series(400) }, fld: null, fldClock: 0,
  stars: Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), a: rand(0.06, 0.32), s: Math.random() < 0.12 ? 2 : 1 })),
  dt() { return 1 / 480; }, maxSteps: 96,

  /* z and vz carry motion out of the orbital plane. A body with z = vz = 0
     adds exact zeros to every sum below, so flat scenes step bit-for-bit as
     they did in two dimensions. */
  body(x, y, vx, vy, m, z = 0, vz = 0) {
    return { x, y, z, vx, vy, vz, ax: 0, ay: 0, az: 0, m, r: bodyRadius(m), trail: new Float32Array(TRAIL_CAP * 2), trailZ: new Float32Array(TRAIL_CAP), tn: 0, th: 0, dead: false, id: ++this.uid };
  },
  vCirc(M, d) { const G = G0 * this.p.G, e2 = this.p.soft * this.p.soft; return Math.sqrt(G * M * d * d / Math.pow(d * d + e2, 1.5)); },
  orbit(host, d, ang, m, dir = 1) {
    const v = this.vCirc(host.m + m, d);
    const b = this.body(host.x + d * Math.cos(ang), host.y + d * Math.sin(ang), host.vx - dir * v * Math.sin(ang), host.vy + dir * v * Math.cos(ang), m);
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
      const star = this.body(0, 0, 0, 0, 1000); B.push(star);
      const radii = [60, 92, 135, 190, 265, 370], masses = [0.3, 0.8, 1, 0.5, 2, 1.2];
      radii.forEach((d, i) => { const pl = this.orbit(star, d, rand(0, TAU), masses[i]); if (i === 4) this.orbit(pl, 8, rand(0, TAU), 0.02); });
      const a = 250, e = 0.86, w = rand(0, TAU), G = G0 * this.p.G, rp = a * (1 - e), vp = Math.sqrt(G * 1000 * (1 + e) / rp);
      B.push(this.body(rp * Math.cos(w), rp * Math.sin(w), -vp * Math.sin(w), vp * Math.cos(w), 0.01));
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
      B.push(this.body(rp, 0, 0, vp * ci, 0.01, 0, vp * si));
    } else if (preset === 'disk') {
      const core = this.body(0, 0, 0, 0, 600); B.push(core);
      for (let i = 0; i < 140; i++) {
        const d = Math.sqrt(rand(70 * 70, 340 * 340)), m = Math.pow(10, rand(-0.7, 0.6));
        const b = this.orbit(core, d, rand(0, TAU), m), k = rand(0.9, 1.1); b.vx *= k; b.vy *= k;
      }
    }
    this.zeroMomentum();
    this.cam.x = 0; this.cam.y = 0; this.cam.z = this.p.zoom; this.track = null;
    if (this.cam3) this.frame3(true);
    this.accDirty = true;
    this.E0 = this.energy();
  },
  zeroMomentum() {
    let M = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0;
    for (const b of this.bodies) { M += b.m; px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    if (!M) return;
    for (const b of this.bodies) { b.vx -= px / M; b.vy -= py / M; b.vz -= pz / M; b.x -= cx / M; b.y -= cy / M; b.z -= cz / M; }
  },
  computeAcc() {
    const B = this.bodies, n = B.length, G = G0 * this.p.G, e2 = this.p.soft * this.p.soft, merge = this.p.merge;
    let merges = null;
    for (let i = 0; i < n; i++) { B[i].ax = 0; B[i].ay = 0; B[i].az = 0; }
    for (let i = 0; i < n; i++) {
      const a = B[i];
      for (let j = i + 1; j < n; j++) {
        const b = B[j], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, r2 = dx * dx + dy * dy + dz * dz, d2 = r2 + e2, inv = G / (d2 * Math.sqrt(d2));
        a.ax += dx * inv * b.m; a.ay += dy * inv * b.m; a.az += dz * inv * b.m; b.ax -= dx * inv * a.m; b.ay -= dy * inv * a.m; b.az -= dz * inv * a.m;
        if (merge) { const rr = (a.r + b.r) * 0.7; if (r2 < rr * rr) (merges || (merges = [])).push(a, b); }
      }
    }
    this.accDirty = false;
    return merges;
  },
  step(dt) {
    const B = this.bodies;
    if (!B.length) return;
    if (this.accDirty) this.computeAcc();
    const h = dt * 0.5;
    for (const b of B) { b.vx += b.ax * h; b.vy += b.ay * h; b.vz += b.az * h; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; }
    const merges = this.computeAcc();
    for (const b of B) { b.vx += b.ax * h; b.vy += b.ay * h; b.vz += b.az * h; }
    if (merges) this.mergeBodies(merges);
    if (++this.stepCount % 8 === 0) {
      for (const b of this.bodies) { b.trail[b.th * 2] = b.x; b.trail[b.th * 2 + 1] = b.y; b.trailZ[b.th] = b.z; b.th = (b.th + 1) % TRAIL_CAP; if (b.tn < TRAIL_CAP) b.tn++; }
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
      big.m = m; big.r = bodyRadius(m); small.dead = true; this.merged++;
      if (small.id === this.track) this.track = big.id;
    }
    this.bodies = this.bodies.filter(b => !b.dead);
    // Move the baseline by what the merge took away, so numerical gain stays visible as drift.
    this.accDirty = true; this.E0 += this.energy() - before;
  },
  cullEscapes() {
    const B = this.bodies; if (B.length < 2) return;
    let M = 0, cx = 0, cy = 0, cz = 0;
    for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    cx /= M; cy /= M; cz /= M;
    const keep = B.filter(b => (b.x - cx) ** 2 + (b.y - cy) ** 2 + (b.z - cz) ** 2 < 6000 * 6000);
    if (keep.length !== B.length) { const before = this.energy(); this.escaped += B.length - keep.length; this.bodies = keep; this.accDirty = true; this.E0 += this.energy() - before; }
  },
  energy() {
    const B = this.bodies, G = G0 * this.p.G, e2 = this.p.soft * this.p.soft;
    let ke = 0, pe = 0;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; ke += 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy + a.vz * a.vz);
      for (let j = i + 1; j < B.length; j++) { const b = B[j]; pe -= G * a.m * b.m / Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2 + e2); }
    }
    this.KE = ke; this.PE = pe; this.E = ke + pe;
    return this.E;
  },
  after() {
    if (this.t - this.lastSample >= 0.1) {
      this.lastSample = this.t; this.energy();
      this.series.ke.push(this.t, this.KE); this.series.pe.push(this.t, this.PE); this.series.e.push(this.t, this.E);
    }
  },
  onParam(key) {
    if (key === 'zoom') { this.cam.z = this.p.zoom; if (navAnim.lab === this) navAnim.lab = null; }
    if (key === 'follow' && this.p.follow) this.track = null;
    if (key === 'G' || key === 'soft') { this.accDirty = true; this.E0 = this.energy(); for (const s of Object.values(this.series)) s.clear(); }
  },
  heaviest() { let h = null; for (const b of this.bodies) if (!h || b.m > h.m) h = b; return h; },
  addBody(b) {
    if (this.bodies.length >= BODY_CAP) { announce(`Body limit reached (${BODY_CAP}). Delete some or reset the scene.`); return false; }
    this.bodies.push(b); this.accDirty = true; this.E0 = this.energy(); return true;
  },
  dropOrbit(wx, wy, wz = 0) {
    const m = this.p.launchMass, H = this.heaviest();
    if (!H) { this.addBody(this.body(wx, wy, 0, 0, m, wz)); return; }
    const dx = wx - H.x, dy = wy - H.y, d = Math.hypot(dx, dy);
    if (d < H.r + 4) return;
    let L = 0;
    for (const b of this.bodies) if (b !== H) L += b.m * ((b.x - H.x) * (b.vy - H.vy) - (b.y - H.y) * (b.vx - H.vx));
    const dir = L < 0 ? -1 : 1, v = this.vCirc(H.m + m, d);
    if (this.p.incl > 0) {
      // Tilt the orbit about the line from the host to the drop point, so the body starts where it was dropped.
      const i = rand(-1, 1) * this.p.incl * Math.PI / 180, ci = Math.cos(i), si = Math.sin(i);
      this.addBody(this.body(wx, wy, H.vx - dir * v * dy / d * ci, H.vy + dir * v * dx / d * ci, m, wz, H.vz + v * si));
      return;
    }
    this.addBody(this.body(wx, wy, H.vx - dir * v * dy / d, H.vy + dir * v * dx / d, m, wz));
  },
  addRandom() {
    const H = this.heaviest();
    if (!H) { this.addBody(this.body(rand(-150, 150), rand(-100, 100), 0, 0, this.p.launchMass)); return; }
    const d = rand(H.r + 50, 380), a = rand(0, TAU);
    this.dropOrbit(H.x + d * Math.cos(a), H.y + d * Math.sin(a));
  },
  toWorld(p) { const { ox, oy, z } = this.viewXf; return { x: (p.x - ox) / z, y: (p.y - oy) / z }; },
  bodyAt(p, slack = 6) {
    if (this.is3D()) return this.bodyAt3(p, slack + 2);
    const { ox, oy, z } = this.viewXf; let best = null, bd = Infinity;
    for (const b of this.bodies) { const d = Math.hypot(b.x * z + ox - p.x, b.y * z + oy - p.y) - Math.max(1.4, b.r * z); if (d < bd) { bd = d; best = b; } }
    return bd < slack ? best : null;
  },
  eraseAt(p) {
    if (this.is3D()) { this.eraseAt3(p); return; }
    const before = this.bodies.length, { ox, oy, z } = this.viewXf;
    this.bodies = this.bodies.filter(b => Math.hypot(b.x * z + ox - p.x, b.y * z + oy - p.y) > Math.max(12, b.r * z + 6));
    if (this.bodies.length !== before) { this.accDirty = true; this.E0 = this.energy(); }
  },
  cursorAt(p) {
    if (this.p.tool === 'pan') return 'grab';
    if (this.p.tool === 'erase') return this.bodyAt(p) ? 'pointer' : 'crosshair';
    return this.bodyAt(p) ? 'pointer' : 'crosshair';
  },
  wantsPan() { return this.p.tool === 'pan'; },
  offStage3() { return false; },
  stateSummary() { return { bodies: this.bodies.length }; },
  navExtras: [{ id: 'follow', label: 'Follow', icon: 'follow', title: 'Follow the centre of mass · click a body on the stage to follow it instead · click again to free the camera',
    pressed: () => gravity.p.follow || gravity.track != null,
    run() {
      const on = gravity.p.follow || gravity.track != null;
      gravity.track = null; gravity.p.follow = !on; syncControl('follow');
      announce(on ? 'Camera free' : 'Following the centre of mass');
    } }],
  camLocked() { return this.p.follow || this.track != null; },
  onUserPan() { if (this.p.follow) { this.p.follow = false; syncControl('follow'); } this.track = null; },
  onCamZoom() { if (Math.abs(this.p.zoom - this.cam.z) > 1e-9) { this.p.zoom = this.cam.z; syncControl('zoom'); } },
  followBody(b) {
    if (this.track === b.id) { this.track = null; announce('Camera released'); }
    else {
      this.track = b.id; this.trackEase = 0;
      if (this.p.follow) { this.p.follow = false; syncControl('follow'); }
      announce(`Following a body of mass ${b.m < 10 ? b.m.toFixed(2) : b.m.toFixed(0)}`);
    }
    updateNav();
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
  mini(g, k) {
    for (const b of this.bodies) {
      g.fillStyle = b.m > 80 ? THEME.amber : massColor(b.m);
      g.beginPath(); g.arc(b.x, b.y, Math.max(1.6 / k, b.r), 0, TAU); g.fill();
    }
  },
  pointerDown(p) {
    if (this.p.tool === 'erase') { this.erasing = true; this.eraseAt(p); return; }
    this.aim = { sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false };
  },
  pointerCancel() { this.aim = null; this.erasing = false; },
  pointerMove(p, e, down) {
    if (!down) return;
    if (this.erasing) { this.eraseAt(p); return; }
    if (!this.aim) return;
    this.aim.x = p.x; this.aim.y = p.y;
    if (Math.hypot(p.x - this.aim.sx, p.y - this.aim.sy) > 5) this.aim.moved = true;
  },
  pointerUp() {
    if (this.erasing) { this.erasing = false; return; }
    const a = this.aim; this.aim = null;
    if (!a) return;
    if (this.is3D()) { this.pointerUp3(a); return; }
    const w = this.toWorld({ x: a.sx, y: a.sy });
    if (!a.moved) {
      const hit = this.bodyAt({ x: a.sx, y: a.sy });
      if (hit) this.followBody(hit); else this.dropOrbit(w.x, w.y);
      return;
    }
    const z = this.viewXf.z;
    this.addBody(this.body(w.x, w.y, (a.x - a.sx) / z * LAUNCH_K, (a.y - a.sy) / z * LAUNCH_K, this.p.launchMass));
  },
  predict(x0, y0, vx0, vy0, z0 = 0, heights = null) {
    const B = this.bodies, n = B.length, dyn = n <= 30, G = G0 * this.p.G, e2 = this.p.soft ** 2, N = n + 1;
    const X = new Float64Array(N), Y = new Float64Array(N), Z = new Float64Array(N), VX = new Float64Array(N), VY = new Float64Array(N), VZ = new Float64Array(N), M = new Float64Array(N), R = new Float64Array(N);
    for (let i = 0; i < n; i++) { const b = B[i]; X[i] = b.x; Y[i] = b.y; Z[i] = b.z; VX[i] = b.vx; VY[i] = b.vy; VZ[i] = b.vz; M[i] = b.m; R[i] = b.r; }
    X[n] = x0; Y[n] = y0; Z[n] = z0; VX[n] = vx0; VY[n] = vy0; M[n] = this.p.launchMass;
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
    this.viewXf = { ox, oy, z };
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
        g.strokeStyle = massColor(b.m);
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
    const S = B.filter(b => b.m > 80);
    for (const b of B) {
      const X = b.x * z + ox, Y = b.y * z + oy, R = Math.max(1.4, b.r * z);
      if (X < -R * 4 || Y < -R * 4 || X > w + R * 4 || Y > h + R * 4) continue;
      if (b.m > 80) {
        const grd = g.createRadialGradient(X, Y, R * 0.6, X, Y, R * 3.4);
        grd.addColorStop(0, 'rgba(242,165,65,0.32)'); grd.addColorStop(1, 'rgba(242,165,65,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(X, Y, R * 3.4, 0, TAU); g.fill();
        drawStar(g, X, Y, R);
      } else if (R < 2.6) {
        g.fillStyle = massColor(b.m); g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill();
      } else {
        let lx = 0, ly = 0;
        for (const s of S) { const dx = s.x - b.x, dy = s.y - b.y, d2 = dx * dx + dy * dy + 1, f = s.m / (d2 * Math.sqrt(d2)); lx += dx * f; ly += dy * f; }
        const L = Math.hypot(lx, ly);
        if (L > 0) { lx /= L; ly /= L; } else { lx = -0.6; ly = -0.8; }
        drawLit(g, X, Y, R, massRgb(b.m), lx, ly);
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
    if (tb) {
      const X = tb.x * z + ox, Y = tb.y * z + oy, R = Math.max(1.4, tb.r * z) + 8;
      g.save(); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3; g.setLineDash([4, 4]); g.lineDashOffset = -performance.now() / 60;
      g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke(); g.restore();
    }
    if (this.hover && !this.aim) {
      const b = this.bodyAt(this.hover, 10);
      if (b) {
        const X = b.x * z + ox, Y = b.y * z + oy, R = Math.max(1.4, b.r * z) + 5;
        g.strokeStyle = this.p.tool === 'erase' ? THEME.crit : THEME.text; g.lineWidth = 1.2;
        g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke();
        const label = `m ${b.m < 10 ? b.m.toFixed(2) : b.m.toFixed(0)} · ${Math.hypot(b.vx, b.vy, b.vz).toFixed(0)} px/s`;
        g.font = `400 11px ${THEME.mono}`; const tw = g.measureText(label).width;
        const lx = clamp(X + R + 6, 4, w - tw - 14), ly = clamp(Y - R - 6, 16, h - 6);
        g.fillStyle = 'rgba(10,14,20,0.82)'; g.fillRect(lx - 5, ly - 13, tw + 10, 18);
        g.fillStyle = THEME.text; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(label, lx, ly);
      }
    }
    if (this.p.tool === 'erase' && this.hover) brushRing(g, this.hover, 12, THEME.crit);
    if (this.aim && this.aim.moved) {
      const a = this.aim, wS = this.toWorld({ x: a.sx, y: a.sy });
      const vx = (a.x - a.sx) / z * LAUNCH_K, vy = (a.y - a.sy) / z * LAUNCH_K, path = this.predict(wS.x, wS.y, vx, vy);
      g.setLineDash([4, 5]); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3;
      g.beginPath();
      for (let i = 0; i < path.length; i += 2) { const X = path[i] * z + ox, Y = path[i + 1] * z + oy; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.strokeStyle = THEME.text; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(a.x, a.y); g.stroke();
      const ang = Math.atan2(a.y - a.sy, a.x - a.sx);
      g.fillStyle = THEME.text; g.beginPath();
      g.moveTo(a.x, a.y); g.lineTo(a.x - 9 * Math.cos(ang - 0.4), a.y - 9 * Math.sin(ang - 0.4)); g.lineTo(a.x - 9 * Math.cos(ang + 0.4), a.y - 9 * Math.sin(ang + 0.4)); g.fill();
      g.fillStyle = massColor(this.p.launchMass); g.beginPath(); g.arc(a.sx, a.sy, Math.max(2, bodyRadius(this.p.launchMass) * z), 0, TAU); g.fill();
      g.font = `400 11px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillText(`${Math.hypot(vx, vy).toFixed(0)} px/s`, a.x + 10, a.y - 6);
    }
  },
  readouts() {
    let px = 0, py = 0, pz = 0;
    for (const b of this.bodies) { px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; }
    const n = this.bodies.length, drift = this.E0 ? (this.E - this.E0) / Math.abs(this.E0) * 100 : 0, ad = Math.abs(drift);
    return [
      ['Bodies', String(n)],
      ['Total energy E', fmtSI(this.E)],
      ['Energy drift since last change', n > 1 ? `${drift >= 0 ? '+' : ''}${drift.toFixed(3)} %` : '—', n > 1 ? (ad < 0.1 ? 'ok' : ad < 1 ? 'warn' : 'crit') : 'idle'],
      ['Virial ratio 2K / |U|', n > 1 && this.PE ? (2 * this.KE / Math.abs(this.PE)).toFixed(3) : '—'],
      ['Momentum |p|', fmtSI(Math.hypot(px, py, pz))],
      ['Merged · escaped', `${this.merged} · ${this.escaped}`],
      ['Orbit tilts vs heaviest body', this.tilts()],
    ];
  },
  /* Range of orbital inclinations relative to the heaviest body's frame. */
  tilts() {
    const H = this.heaviest(); if (!H || this.bodies.length < 2) return '—';
    let lo = 180, hi = 0;
    for (const b of this.bodies) {
      if (b === H) continue;
      const rx = b.x - H.x, ry = b.y - H.y, rz = b.z - H.z, vx = b.vx - H.vx, vy = b.vy - H.vy, vz = b.vz - H.vz;
      const lx = ry * vz - rz * vy, ly = rz * vx - rx * vz, lz = rx * vy - ry * vx, L = Math.hypot(lx, ly, lz); if (!L) continue;
      const i = Math.acos(lz / L) * 180 / Math.PI; lo = Math.min(lo, i); hi = Math.max(hi, i);
    }
    if (hi < 0.05) return 'flat (0°)';
    return `${lo.toFixed(0)}° – ${hi.toFixed(0)}°`;
  },
  enabled(key) {
    if (key === 'field' && this.is3D()) return 'Drawn in the flat view only.';
    if (key === 'zoom' && this.is3D()) return 'Use the mouse wheel or the view controls in 3D.';
    return true;
  },
  bodyColor3: b => (b.m >= STAR_MASS ? '#ffcf7a' : massColor(b.m)),
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
        if (this.p.soft < 12) fixes.push({ label: `Soften to ε = ${Math.min(30, Math.max(8, this.p.soft * 2))} px`, run() { setParam(gravity, 'soft', Math.min(30, Math.max(8, gravity.p.soft * 2))); } });
        if (!this.p.merge) fixes.push({ label: 'Merge on contact', run() { setParam(gravity, 'merge', true); } });
        out.push({ id: 'g-drift', level: ad > 5 ? 'crit' : 'warn', title: 'Energy is drifting',
          body: `Total energy has moved <b>${drift.toFixed(2)}%</b> since the last change.${Number.isFinite(worst) ? ` The tightest pass (${wd.toFixed(0)} px apart) lasts only about <b>${worst.toFixed(1)} steps</b> of 1/480 s, too few to follow the curve.` : ''} Softening or merging tames close encounters.`, fixes });
      }
      if (this.E > 0) out.push({ id: 'g-unbound', level: 'info', title: 'System is unbound', body: `Total energy is positive (${fmtSI(this.E)}), so gravity cannot hold everything together: some bodies are on escape paths.` });
      else if (this.PE) {
        const vr = 2 * this.KE / Math.abs(this.PE);
        if (this.presetId === 'disk' || n > 40) out.push({ id: 'g-virial', level: 'info', title: 'Virial balance', body: `2K/|U| = <b>${vr.toFixed(2)}</b>. A settled self-gravitating system sits near 1; below 1 it is still collapsing, above 1 it is puffing up.` });
      }
    }
    if (n > 150) out.push({ id: 'g-pairs', level: 'info', title: 'Many pair forces', body: `${n} bodies means <b>${fmtSI(n * (n - 1) / 2)}</b> pair forces per step, ${fmtSI(n * (n - 1) / 2 * 480)} per simulated second. Deleting light bodies or merging speeds it up.` });
    if (this.p.soft > 15) out.push({ id: 'g-soft', level: 'info', title: 'Wide softening', body: `With ε = ${this.p.soft} px, gravity weakens inside about ${this.p.soft} px, so close passes slide through each other instead of slingshotting.` });
    if (this.escaped) out.push({ id: 'g-esc', level: 'info', title: 'Bodies escaped', body: `${this.escaped} bod${this.escaped === 1 ? 'y' : 'ies'} passed 6000 px from the centre of mass and ${this.escaped === 1 ? 'was' : 'were'} removed.` });
    return out;
  },
  perfFixes() {
    const n = this.bodies.length;
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
  math: `
    <p>Acceleration of body <i>i</i>, with a softening length ε that keeps close passes finite:</p>
    <div class="f" data-tex="\\mathbf a_i = \\sum_{j \\ne i} \\frac{G\\, m_j\\,(\\mathbf r_j - \\mathbf r_i)}{\\left(|\\mathbf r_j - \\mathbf r_i|^2 + \\varepsilon^2\\right)^{3/2}}"></div>
    <p>Each step is a kick–drift–kick leapfrog with Δt = 1/480 s. It is symplectic, so the energy error oscillates instead of piling up.</p>
    <div class="f" data-tex="\\begin{aligned} \\mathbf v &amp;\\leftarrow \\mathbf v + \\tfrac12\\,\\mathbf a\\,\\Delta t \\\\ \\mathbf x &amp;\\leftarrow \\mathbf x + \\mathbf v\\,\\Delta t \\\\ \\mathbf v &amp;\\leftarrow \\mathbf v + \\tfrac12\\,\\mathbf a\\,\\Delta t \\end{aligned}"></div>
    <p>Clicking places a body at the circular-orbit speed:</p>
    <div class="f" data-tex="v = \\sqrt{\\frac{G\\,(M + m)}{r}}"></div>
    <p>Kepler’s third law ties the period to the semi-major axis alone. The Kepler scene gives three eccentricities one axis, so all three share one period.</p>
    <div class="f" data-tex="T = 2\\pi \\sqrt{\\frac{a^3}{G M}}"></div>
    <p>The potential field draws Φ for the 24 heaviest bodies. Each contour band is a factor of 10<sup>¼</sup> in |Φ|.</p>
    <div class="f" data-tex="\\Phi(\\mathbf r) = -\\sum_j \\frac{G\\, m_j}{|\\mathbf r - \\mathbf r_j|}"></div>
    <p>A settled, bound system satisfies the virial theorem, 2K ≈ |U|. The figure-eight uses the initial conditions of <cite>Chenciner &amp; Montgomery (2000)</cite>.</p>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(gravity, {
  histBudget: 16e6, histInterval: 0.2,
  snapshot() {
    const B = this.bodies, n = B.length, a = new Float64Array(n * 7), { G, soft, merge } = this.p;
    for (let i = 0; i < n; i++) { const b = B[i], o = i * 7; a[o] = b.x; a[o + 1] = b.y; a[o + 2] = b.vx; a[o + 3] = b.vy; a[o + 4] = b.m; a[o + 5] = b.z; a[o + 6] = b.vz; }
    return { stride: 7, a, ids: B.map(b => b.id), merged: this.merged, escaped: this.escaped, E0: this.E0, cam: { ...this.cam }, stepCount: this.stepCount, p: { G, soft, merge } };
  },
  restore(s) {
    Object.assign(this.p, s.p);
    const B = [];
    const st = s.stride || 5;
    for (let i = 0; i < s.ids.length; i++) { const o = i * st, b = this.body(s.a[o], s.a[o + 1], s.a[o + 2], s.a[o + 3], s.a[o + 4], st >= 7 ? s.a[o + 5] : 0, st >= 7 ? s.a[o + 6] : 0); b.id = s.ids[i]; B.push(b); }
    Object.assign(this, { bodies: B, merged: s.merged, escaped: s.escaped, cam: { ...this.cam, ...s.cam }, stepCount: s.stepCount, aim: null, pan: null, accDirty: true });
    if (this.track != null && !B.some(b => b.id === this.track)) this.track = null;
    this.p.zoom = this.cam.z; if (this === active) syncControl('zoom');
    this.energy(); this.E0 = s.E0;
    for (const ser of Object.values(this.series)) ser.truncateAfter(this.t);
    this.lastSample = this.t;
    return true;
  },
  serialize() {
    return { bodies: this.bodies.map(b => ({ id: b.id, m: b.m, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz })), merged: this.merged, escaped: this.escaped, E0: this.E0, cam: { ...this.cam }, stepCount: this.stepCount };
  },
  deserialize(o) {
    if (!o || !Array.isArray(o.bodies)) return false;
    this.bodies = o.bodies.map(d => { const b = this.body(+d.x, +d.y, +d.vx, +d.vy, +d.m, +d.z || 0, +d.vz || 0); if (d.id != null) b.id = d.id; return b; });
    this.uid = Math.max(this.uid, ...this.bodies.map(b => +b.id || 0));
    this.merged = o.merged || 0; this.escaped = o.escaped || 0; this.stepCount = o.stepCount || 0;
    if (o.cam) this.cam = { x: +o.cam.x || 0, y: +o.cam.y || 0, z: clamp(+o.cam.z || this.p.zoom, 0.1, 40) };
    this.p.zoom = this.cam.z; this.track = null;
    this.accDirty = true; this.E0 = this.energy(); if (Number.isFinite(o.E0)) this.E0 = o.E0;
    for (const s of Object.values(this.series)) s.clear();
    return true;
  },
  dataColumns: ['t_s', 'bodies', 'kinetic_energy', 'potential_energy', 'total_energy', 'energy_drift_pct', 'virial_2K_over_absU', 'momentum_x', 'momentum_y', 'com_x', 'com_y', 'momentum_z', 'com_z'],
  dataRow() {
    this.energy();
    let M = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0;
    for (const b of this.bodies) { M += b.m; px += b.m * b.vx; py += b.m * b.vy; pz += b.m * b.vz; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    return [this.t, this.bodies.length, this.KE, this.PE, this.E, this.E0 ? (this.E - this.E0) / Math.abs(this.E0) * 100 : 0, this.PE ? 2 * this.KE / Math.abs(this.PE) : NaN, px, py, M ? cx / M : NaN, M ? cy / M : NaN, pz, M ? cz / M : NaN];
  },
  trackLabel: 'Per-body tracks',
  trackColumns: ['t_s', 'body_id', 'mass', 'x', 'y', 'vx', 'vy', 'z', 'vz'],
  trackRows(out) { for (const b of this.bodies) out.push([this.t, b.id, b.m, b.x, b.y, b.vx, b.vy, b.z, b.vz]); },
});

/* ---------- 3D mode: the lab's own camera, picking and overlays (gravity3d.js) ---------- */
Object.assign(gravity, gravity3d, { TRAIL_CAP, LAUNCH_K, BODY_CAP, STAR_MASS, bodyRadius, massColor });
