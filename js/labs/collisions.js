/*
✒ Metadata
    - Title: Collisions Lab (digiSpace Edition - v2.5)
    - File Name: collisions.js
    - Relative Path: js/labs/collisions.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Live Math:
      the impulse with e and the energy it keeps, the speed distribution
      checked and plotted against Maxwell–Boltzmann, PA / NkT against 1 + 2φ,
      and friction's spin share; Inspect follows a ball's speed.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Gravity,
      radii and speeds follow the chosen units, one pixel being 1.09 cm; the
      empty Inspect pane says how to select a ball.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Controls
      are grouped into Setup, Physics, New balls and Display.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Hard discs with impulse-based collisions, restitution and Coulomb
    contact friction, in a box with optional gravity and drag.

✒ Key Features:
    - Sweep-and-prune broad phase for up to 1500 discs.
    - Maxwell–Boltzmann speed histogram and an ideal-gas pressure check.
    - Grab, heat, cool and erase tools; a Brownian tracer with its path.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, velocityTracker } from '../core/chart.js';
import { genericState } from '../core/codec.js';
import { RAMP_HEAT, THEME } from '../core/color.js';
import { brushRing, drawSphere, rampRgb, sphereSprite } from '../core/draw.js';

import { FOV3 } from '../core/math3d.js';
import { TAU, clamp, fmtSI, pct, rand, reduceMotion } from '../core/util.js';
import { PX_M, fmtQ } from '../core/units.js';
import { view } from '../core/view.js';

import { camOf, camXf } from '../shell/camera.js';

import { setParam } from '../shell/lifecycle.js';


import { announce, canvas } from '../shell/state.js';
import { stage3d } from './stage3d.js';

/* ================================================================== */
/*  Lab 2 · Collisions                                                 */
/* ================================================================== */
export const COLL_CAP = 1500;
export const COLL_RGB = Array.from({ length: 24 }, (_, b) => rampRgb(RAMP_HEAT, Math.round(40 + 215 * b / 23)));
export const collisions = {
  id: 'collisions', name: 'Collisions', title: 'Elastic and inelastic collisions',
  zoomRange: [0.5, 16],
  rig3: { plane: 'floor', yaw: 0.42, pitch: 0.64, fit: 1.26, height: 2.7, target: [0, -0.7, 0.3] },
  eq: 'J = −(1 + e) μ v<sub>n</sub>',
  eqTex: 'J = -(1 + e)\\,\\mu\\, v_n',
  aria: 'Collision simulation: discs bouncing in a box',
  blurb: 'Hard discs resolved by impulses along the contact normal, each with mass growing as its area. With e = 1 and no gravity the gas keeps its energy, relaxes into the Maxwell–Boltzmann distribution, and presses on its walls the way the ideal-gas law predicts. Give the contacts friction and every ball also spins.',
  interact: [
    '<b>Grab</b>: drag a ball to throw it, or click empty space to add one and keep dragging to throw it.',
    '<b>Heat</b> and <b>Cool</b> brushes speed up or slow down every ball under them; watch the energy spread out.',
    '<b>Erase</b> removes balls under the brush. Lower restitution <i>e</i> to watch kinetic energy drain away; raise friction μ to make balls roll and spin, marked by the dot on each one.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'grab', label: 'Grab', key: 'g', icon: 'grab', hint: 'Drag a ball to throw it · click empty space to add one' },
    { id: 'heat', label: 'Heat', key: 'h', icon: 'heat', hint: 'Hold over the gas to speed balls up and watch the heat spread' },
    { id: 'cool', label: 'Cool', key: 'c', icon: 'cool', hint: 'Hold over the gas to slow balls down' },
    { id: 'erase', label: 'Erase', key: 'x', icon: 'erase', hint: 'Brush over balls to remove them' },
  ] },
  p: { tool: 'grab', colorBy: 'speed', count: 260, gravity: 0, e: 1, drag: 0, radius: 9, mu: 0 },
  presetId: 'gas',
  presets: [
    { id: 'gas', label: 'Ideal gas', params: { gravity: 0, e: 1, drag: 0, count: 260, mu: 0 } },
    { id: 'pile', label: 'Gravity pile', params: { gravity: 900, e: 0.5, drag: 0.02, count: 200, mu: 0.5 } },
    { id: 'pool', label: 'Billiard break', params: { gravity: 0, e: 0.96, drag: 0.35, mu: 0.15 } },
    { id: 'brownian', label: 'Brownian motion', params: { gravity: 0, e: 1, drag: 0, count: 420, mu: 0 } },
  ],
  groups: [
    { id: 'setup', label: 'Setup', icon: 'flag' },
    { id: 'physics', label: 'Physics', icon: 'balance' },
    { id: 'spawn', label: 'New balls', icon: 'add_circle' },
    { id: 'display', label: 'Display', icon: 'visibility' },
  ],
  controls: [
    { type: 'seg', key: 'colorBy', label: 'Colour balls by', options: [['speed', 'Speed'], ['mass', 'Mass'], ['spin', 'Spin']], group: 'display' },
    { type: 'range', key: 'count', label: 'Number of balls', min: 20, max: 1200, step: 10, rebuild: true, group: 'setup' },
    { type: 'range', key: 'gravity', label: 'Gravity', min: 0, max: 2000, step: 10, qty: 'acc', group: 'physics' },
    { type: 'range', key: 'e', label: 'Restitution e', min: 0, max: 1, step: 0.01, group: 'physics' },
    { type: 'range', key: 'mu', label: 'Contact friction μ', min: 0, max: 1, step: 0.01, note: 'Friction at contacts and walls turns sliding into spin.', group: 'physics' },
    { type: 'range', key: 'drag', label: 'Air drag', min: 0, max: 2, step: 0.01, unit: '/s', group: 'physics' },
    { type: 'range', key: 'radius', label: 'Radius of new balls', min: 3, max: 30, step: 1, qty: 'len', group: 'spawn' },
  ],
  actions: [
    { label: 'Shake the box', run() { const c = collisions; for (let i = 0; i < c.n; i++) { const a = rand(0, TAU), s = rand(150, 400); c.vx[i] += s * Math.cos(a); c.vy[i] += s * Math.sin(a); } c.KE0 = c.stats().etot; } },
    { label: 'Freeze all balls', run() { collisions.vx.fill(0); collisions.vy.fill(0); collisions.om.fill(0); collisions.KE0 = 0; } },
  ],
  x: new Float64Array(COLL_CAP), y: new Float64Array(COLL_CAP), vx: new Float64Array(COLL_CAP), vy: new Float64Array(COLL_CAP),
  r: new Float64Array(COLL_CAP), im: new Float64Array(COLL_CAP), order: new Int32Array(COLL_CAP), bin: new Uint8Array(COLL_CAP),
  ang: new Float64Array(COLL_CAP), om: new Float64Array(COLL_CAP), sprites: null, spinning: false,
  // One pixel is PX_M metres, as in every mechanical lab: the Gravity pile's 900 px/s² is 9.81 m/s².
  units: { len: 'px', m: PX_M }, scaleNote: 'In Collisions one pixel is 1.09 cm, as in Fluid and Cloth: 900 px/s² of gravity is 9.81 m/s². Masses and energies stay in simulation units, with a disc of radius r weighing r².',
  n: 0, w: 800, h: 600, tracer: -1, trail: new Float32Array(1800), tn: 0, th: 0, trailClock: 0,
  grab: null, brush: null, hits: 0, hitTime: 0, hitRate: 0, vel: velocityTracker(),
  wallImp: 0, wallTime: 0, Z: NaN, KE0: 0,
  dt() { return 1 / 240; }, maxSteps: 48,
  tiltNow: 0,

  add(x, y, vx, vy, r) {
    if (this.n >= COLL_CAP) return -1;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.r[i] = r; this.im[i] = 1 / (r * r); this.order[i] = i;
    this.ang[i] = Math.random() * TAU; this.om[i] = 0;
    return i;
  },
  remove(i) {
    const last = this.n - 1;
    if (this.grab && this.grab.i === i) this.grab = null;
    if (i !== last) {
      this.x[i] = this.x[last]; this.y[i] = this.y[last]; this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last]; this.r[i] = this.r[last]; this.im[i] = this.im[last];
      this.ang[i] = this.ang[last]; this.om[i] = this.om[last];
      if (this.tracer === last) this.tracer = i; else if (this.tracer === i) this.tracer = -1;
      if (this.grab && this.grab.i === last) this.grab.i = i;
    } else if (this.tracer === i) this.tracer = -1;
    this.n--;
    for (let k = 0; k < this.n; k++) this.order[k] = k;
  },
  overlaps(x, y, r) {
    for (let i = 0; i < this.n; i++) { const rr = r + this.r[i]; if ((this.x[i] - x) ** 2 + (this.y[i] - y) ** 2 < rr * rr) return true; }
    return false;
  },
  jitterGrid(count, r, speed, skip) {
    const w = this.w, h = this.h, cell = Math.sqrt(w * h / count);
    const cols = Math.max(1, Math.floor(w / cell)), rows = Math.max(1, Math.ceil(count / cols));
    const cw = w / cols, ch = h / rows, rr = Math.min(r, cw / 2 - 1, ch / 2 - 1), jx = Math.max(0, (cw - 2 * rr) / 2 - 0.5), jy = Math.max(0, (ch - 2 * rr) / 2 - 0.5);
    let placed = 0;
    for (let row = 0; row < rows && placed < count; row++) for (let col = 0; col < cols && placed < count; col++) {
      const x = (col + 0.5) * cw + rand(-jx, jx), y = (row + 0.5) * ch + rand(-jy, jy);
      if (skip && skip(x, y, rr)) continue;
      const a = rand(0, TAU);
      this.add(x, y, speed * Math.cos(a), speed * Math.sin(a), rr); placed++;
    }
  },
  build(preset, w, h) {
    Object.assign(this, { w, h, n: 0, tracer: -1, tn: 0, th: 0, grab: null, brush: null, hits: 0, hitTime: 0, hitRate: 0, wallImp: 0, wallTime: 0, Z: NaN });
    const N = Math.round(this.p.count);
    if (preset === 'gas') this.jitterGrid(N, 5, 170);
    else if (preset === 'pile') {
      for (let k = 0; k < N; k++) {
        const r = rand(5, 14);
        for (let t = 0; t < 40; t++) { const x = rand(r, w - r), y = rand(r, h * 0.62); if (!this.overlaps(x, y, r)) { this.add(x, y, rand(-40, 40), rand(-20, 20), r); break; } }
      }
    } else if (preset === 'pool') {
      const r = clamp(Math.min(w, h) / 40, 8, 14), dx = 2 * r * Math.cos(Math.PI / 6) * 1.004, dy = 2 * r * 1.004, x0 = w * 0.64, cy = h / 2;
      for (let row = 0; row < 5; row++) for (let k = 0; k <= row; k++) this.add(x0 + row * dx, cy + (k - row / 2) * dy, 0, 0, r);
      this.add(w * 0.2, cy + rand(-1.5, 1.5), 950, 0, r);
    } else if (preset === 'brownian') {
      const R = clamp(Math.min(w, h) / 22, 18, 30);
      this.tracer = this.add(w / 2, h / 2, 0, 0, R);
      this.jitterGrid(N, 3, 230, (x, y, r) => Math.hypot(x - w / 2, y - h / 2) < R + r + 2);
    }
    this.KE0 = this.stats().etot;
  },
  onResize(w, h) { this.w = w; this.h = h; },
  worldRect() { return { w: this.w, h: this.h }; },
  onParam(key) { if (key === 'e' || key === 'gravity' || key === 'drag' || key === 'mu') { this.KE0 = this.stats().etot; this.wallImp = 0; this.wallTime = 0; this.Z = NaN; } },
  enabled(key) { return key === 'count' && this.presetId === 'pool' ? 'Fixed by the 15-ball rack in this scene.' : true; },
  step(dt) {
    const n = this.n, g = this.p.gravity, damp = Math.max(0, 1 - this.p.drag * dt), X = this.x, Y = this.y, VX = this.vx, VY = this.vy, R = this.r, IM = this.im;
    const G = this.grab, ANG = this.ang, OM = this.om, mu = this.p.mu;
    for (let i = 0; i < n; i++) {
      ANG[i] += OM[i] * dt; OM[i] *= damp;
      if (G && G.i === i) continue;
      VY[i] += g * dt; VX[i] *= damp; VY[i] *= damp; X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
    }
    if (G) {
      const i = G.i, k = Math.min(1, dt * 30), nx = X[i] + (G.tx - X[i]) * k, ny = Y[i] + (G.ty - Y[i]) * k;
      VX[i] = (nx - X[i]) / dt; VY[i] = (ny - Y[i]) / dt; X[i] = nx; Y[i] = ny;
    }
    const B = this.brush;
    if (B && (this.p.tool === 'heat' || this.p.tool === 'cool')) {
      const f = Math.exp((this.p.tool === 'heat' ? 1.6 : -2.2) * dt), r2 = 70 * 70;
      for (let i = 0; i < n; i++) if ((X[i] - B.x) ** 2 + (Y[i] - B.y) ** 2 < r2) {
        VX[i] *= f; VY[i] *= f;
        if (this.p.tool === 'heat' && VX[i] * VX[i] + VY[i] * VY[i] < 400) { const a = rand(0, TAU); VX[i] += 30 * Math.cos(a); VY[i] += 30 * Math.sin(a); }
      }
      this.KE0 = 0;
    }
    const O = this.order;
    for (let a = 1; a < n; a++) {
      const id = O[a], key = X[id] - R[id];
      let b = a - 1;
      while (b >= 0 && X[O[b]] - R[O[b]] > key) { O[b + 1] = O[b]; b--; }
      O[b + 1] = id;
    }
    const e = this.p.e, rest = g > 0 ? g * dt * 3 : 0;
    for (let it = 0; it < 2; it++) {
      for (let a = 0; a < n; a++) {
        const i = O[a], right = X[i] + R[i];
        for (let b = a + 1; b < n; b++) {
          const j = O[b];
          if (X[j] - R[j] > right) break;
          const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = R[i] + R[j], d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 < 1e-12) continue;
          const wi = IM[i], wj = IM[j], ws = wi + wj;
          if (ws === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, corr = (rr - d) / ws * 0.9;
          X[i] -= nx * corr * wi; Y[i] -= ny * corr * wi; X[j] += nx * corr * wj; Y[j] += ny * corr * wj;
          const vn = (VX[j] - VX[i]) * nx + (VY[j] - VY[i]) * ny;
          if (vn < 0) {
            const ee = -vn < rest ? 0 : e, J = -(1 + ee) * vn / ws;
            VX[i] -= J * nx * wi; VY[i] -= J * ny * wi; VX[j] += J * nx * wj; VY[j] += J * ny * wj;
            if (mu > 0) {
              // Coulomb friction: stop the surfaces sliding, never beyond μ times the normal impulse.
              const vt = -(VX[j] - VX[i]) * ny + (VY[j] - VY[i]) * nx - OM[j] * R[j] - OM[i] * R[i], lim = mu * J;
              const Jt = clamp(-vt / (3 * ws), -lim, lim);
              VX[i] += Jt * ny * wi; VY[i] -= Jt * nx * wi; VX[j] -= Jt * ny * wj; VY[j] += Jt * nx * wj;
              OM[i] -= 2 * Jt * wi / R[i]; OM[j] -= 2 * Jt * wj / R[j];
            }
            if (it === 0) this.hits++;
          }
        }
      }
    }
    const w = this.w, h = this.h;
    let imp = 0;
    for (let i = 0; i < n; i++) {
      const r = R[i], m = IM[i] ? 1 / IM[i] : 0;
      let jx = 0, jy = 0, nx = 0, ny = 0;
      if (X[i] < r) { X[i] = r; if (VX[i] < 0) { jx = m * (1 + e) * -VX[i]; VX[i] = -VX[i] * e; nx = -1; } }
      else if (X[i] > w - r) { X[i] = w - r; if (VX[i] > 0) { jx = m * (1 + e) * VX[i]; VX[i] = -VX[i] * e; nx = 1; } }
      if (Y[i] < r) { Y[i] = r; if (VY[i] < 0) { jy = m * (1 + e) * -VY[i]; VY[i] = -VY[i] * e; ny = -1; } }
      else if (Y[i] > h - r) { Y[i] = h - r; if (VY[i] > 0) { const ee = VY[i] < rest ? 0 : e; jy = m * (1 + ee) * VY[i]; VY[i] = -VY[i] * ee; ny = 1; } }
      imp += jx + jy;
      if (mu > 0 && IM[i]) { if (nx) this.wallSpin(i, nx, 0, mu * jx); if (ny) this.wallSpin(i, 0, ny, mu * jy); }
    }
    this.wallImp += imp; this.wallTime += dt;
    this.hitTime += dt;
    if (this.hitTime >= 0.5) { this.hitRate = this.hits / this.hitTime; this.hits = 0; this.hitTime = 0; }
    if (this.tracer >= 0 && (this.trailClock += dt) >= 1 / 30) {
      this.trailClock = 0; const t = this.tracer;
      this.trail[this.th * 2] = X[t]; this.trail[this.th * 2 + 1] = Y[t]; this.th = (this.th + 1) % 900; if (this.tn < 900) this.tn++;
    }
  },
  /* Wall friction for ball i against a wall whose outward normal is (Nx, Ny). */
  wallSpin(i, Nx, Ny, lim) {
    const wi = this.im[i], r = this.r[i], Tx = -Ny, Ty = Nx;
    const vt = this.vx[i] * Tx + this.vy[i] * Ty + this.om[i] * r, Jt = clamp(-vt / (3 * wi), -lim, lim);
    this.vx[i] += Jt * Tx * wi; this.vy[i] += Jt * Ty * wi; this.om[i] += 2 * wi * Jt / r;
  },
  after() {
    if (this.wallTime >= 1) {
      const P = this.wallImp / (2 * (this.w + this.h) * this.wallTime), ke = this.stats().ke;
      const Z = ke > 0 ? P * this.w * this.h / ke : NaN;
      this.Z = Number.isFinite(this.Z) && Number.isFinite(Z) ? this.Z + (Z - this.Z) * 0.35 : Z;
      this.wallImp = 0; this.wallTime = 0;
    }
  },
  hit(p) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.n; i++) { const d = Math.hypot(this.x[i] - p.x, this.y[i] - p.y) - this.r[i]; if (d < bd) { bd = d; best = i; } }
    return bd < 6 / camOf(this).z ? best : -1;
  },
  eraseAt(p) { for (let i = this.n - 1; i >= 0; i--) if (Math.hypot(this.x[i] - p.x, this.y[i] - p.y) < 26 + this.r[i] * 0.5) this.remove(i); },
  /* The ball last grabbed, for the Details card. A disc's mass is r² and its spin energy ¼m²ω² here. */
  picked: -1,
  inspect() {
    const i = this.picked; if (i < 0 || i >= this.n) return null;
    const r = this.r[i], m = r * r, v = Math.hypot(this.vx[i], this.vy[i]), w = this.om[i];
    return { id: `ball-${i}`, kicker: i === this.tracer ? 'Tracer' : `Ball ${i + 1}`, title: 'Resin ball', color: '#5fd0df', focus: 'Speed across the table', rows: [['Mass of this ball', fmtSI(m), 'A disc of radius r has mass r² here.'], ['Radius of this ball', fmtQ(this, 'len', r), 'The drawn and collision radius.'], ['Speed across the table', fmtQ(this, 'speed', v), 'How fast it moves over the table.'], ['Spin rate', `${w.toFixed(2)} rad/s`, 'How fast it turns about its own centre.'], ['Energy of motion', fmtSI(0.5 * m * v * v), 'Kinetic energy, ½mv².'], ['Energy of spin', fmtSI(0.25 * m * m * w * w), 'Rotational energy, ¼m²ω².']], actions: [] };
  },
  deselect() { this.picked = -1; },
  inspectHint: 'With the Grab tool, click a ball to inspect it here.',
  cursorAt(p) { return this.p.tool === 'grab' ? (this.hit(p) >= 0 ? 'grab' : 'copy') : 'crosshair'; },
  pointerDown(p) {
    const tool = this.p.tool;
    if (tool === 'erase') { this.brush = { ...p }; this.eraseAt(p); return; }
    if (tool === 'heat' || tool === 'cool') { this.brush = { ...p }; return; }
    let i = this.hit(p);
    this.picked = i;
    if (i < 0) {
      const r = this.p.radius;
      i = this.add(clamp(p.x, r, this.w - r), clamp(p.y, r, this.h - r), 0, 0, r);
      if (i < 0) { announce(`Ball limit reached (${COLL_CAP}).`); return; }
    }
    this.grab = { i, tx: p.x, ty: p.y, im: this.im[i] };
    this.im[i] = 0; this.vel.reset(p); canvas.style.cursor = 'grabbing';
  },
  pointerMove(p, e, down) {
    if (!down) return;
    if (this.brush) { this.brush.x = p.x; this.brush.y = p.y; if (this.p.tool === 'erase') this.eraseAt(p); return; }
    if (this.grab) { this.grab.tx = p.x; this.grab.ty = p.y; this.vel.update(p); }
  },
  pointerUp() {
    this.brush = null;
    const G = this.grab; if (!G) return;
    this.im[G.i] = G.im;
    const s = Math.hypot(this.vel.vx, this.vel.vy), k = s > 2500 ? 2500 / s : 1;
    this.vx[G.i] = this.vel.vx * k; this.vy[G.i] = this.vel.vy * k;
    this.grab = null; this.KE0 = this.stats().etot;
  },
  pointerCancel() { this.vel.vx = 0; this.vel.vy = 0; this.pointerUp(); },
  stats() {
    let ke = 0, kr = 0, px = 0, py = 0, v2 = 0, cnt = 0, vmax = 0, area = 0, rmin = Infinity;
    for (let i = 0; i < this.n; i++) {
      const m = this.r[i] * this.r[i], s2 = this.vx[i] ** 2 + this.vy[i] ** 2;
      ke += 0.5 * m * s2; kr += 0.25 * m * m * this.om[i] * this.om[i]; px += m * this.vx[i]; py += m * this.vy[i]; area += Math.PI * m;
      if (s2 > vmax) vmax = s2; if (this.r[i] < rmin) rmin = this.r[i];
      if (i !== this.tracer) { v2 += s2; cnt++; }
    }
    return { ke, kr, etot: ke + kr, p: Math.hypot(px, py), vrms: cnt ? Math.sqrt(v2 / cnt) : 0, vmax: Math.sqrt(vmax), phi: area / (this.w * this.h), rmin };
  },
  draw(g, w, h) {
    const xf = camXf(this), z = xf.z, px = 1 / z;
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    g.strokeStyle = THEME.rule; g.lineWidth = 2 * px; g.strokeRect(px, px, w - 2 * px, h - 2 * px);
    const n = this.n, X = this.x, Y = this.y, R = this.r, OM = this.om;
    if (this.tracer >= 0 && this.tn > 1) {
      g.strokeStyle = THEME.amber; g.globalAlpha = 0.7; g.lineWidth = 1.3 * px; g.beginPath();
      for (let k = 0; k < this.tn; k++) { const i = (this.th - this.tn + k + 900) % 900; k ? g.lineTo(this.trail[i * 2], this.trail[i * 2 + 1]) : g.moveTo(this.trail[i * 2], this.trail[i * 2 + 1]); }
      g.stroke(); g.globalAlpha = 1;
    }
    const BINS = COLL_RGB.length, bin = this.bin, mode = this.p.colorBy;
    let rmin = Infinity, rmax = 0, v2 = 0, s2 = 0;
    for (let i = 0; i < n; i++) { if (R[i] < rmin) rmin = R[i]; if (R[i] > rmax) rmax = R[i]; v2 += this.vx[i] ** 2 + this.vy[i] ** 2; s2 += (OM[i] * R[i]) ** 2; }
    const vref = 2.2 * Math.sqrt(v2 / Math.max(1, n)) || 1, sref = 2.2 * Math.sqrt(s2 / Math.max(1, n)) || 1;
    this.spinning = s2 / Math.max(1, n) > 4;
    for (let i = 0; i < n; i++) {
      const t = mode === 'speed' ? Math.hypot(this.vx[i], this.vy[i]) / vref : mode === 'spin' ? Math.abs(OM[i] * R[i]) / sref : (rmax > rmin ? (R[i] - rmin) / (rmax - rmin) : 0.5);
      bin[i] = Math.min(BINS - 1, (t * BINS) | 0);
    }
    const sprites = this.sprites || (this.sprites = COLL_RGB.map(sphereSprite)), tracerRgb = [242, 165, 65];
    const x0 = -xf.ox / z, y0 = -xf.oy / z, x1 = x0 + view.w / z, y1 = y0 + view.h / z;
    const seen = (i, r) => X[i] + r >= x0 && X[i] - r <= x1 && Y[i] + r >= y0 && Y[i] - r <= y1;
    for (let i = 0; i < n; i++) {
      const r = R[i];
      if (!seen(i, r)) continue;
      const c = i === this.tracer ? tracerRgb : COLL_RGB[bin[i]];
      if (r * z > 44) drawSphere(g, X[i], Y[i], r, c);
      else g.drawImage(i === this.tracer ? sphereSprite(tracerRgb) : sprites[bin[i]], X[i] - r, Y[i] - r, 2 * r, 2 * r);
    }
    if (this.p.mu > 0 || this.spinning) {
      g.fillStyle = 'rgba(10,14,20,0.5)'; g.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R[i];
        if (r * z < 4 || !seen(i, r)) continue;
        const a = this.ang[i], mx = X[i] + Math.cos(a) * r * 0.52, my = Y[i] + Math.sin(a) * r * 0.52, mr = r * 0.2;
        g.moveTo(mx + mr, my); g.arc(mx, my, mr, 0, TAU);
      }
      g.fill();
    }
    if (this.tracer >= 0) { const t = this.tracer; g.strokeStyle = THEME.ink; g.lineWidth = 2 * px; g.beginPath(); g.arc(X[t], Y[t], R[t], 0, TAU); g.stroke(); }
    if (this.grab) { const i = this.grab.i; g.strokeStyle = THEME.text; g.lineWidth = 1.5 * px; g.beginPath(); g.arc(X[i], Y[i], R[i] + 4 * px, 0, TAU); g.stroke(); }
    const tool = this.p.tool, hv = this.brush || this.hover;
    if (tool === 'heat') brushRing(g, hv, 70, THEME.amber);
    else if (tool === 'cool') brushRing(g, hv, 70, THEME.cyan);
    else if (tool === 'erase') brushRing(g, hv, 26, THEME.crit);
  },
  /* Frame the table with its rails and trunnions, which the plane alone does not reach. */
  dist0() {
    const P = this.plane3(), t = Math.tan(FOV3 / 2), a = view.w / Math.max(1, view.h);
    return Math.max((P.hh + 1.2) / t, (P.hw + 1.4) / (t * a)) * this.rig3.fit;
  },
  /* The table's angle: tilted up like a bagatelle board, so the lab's +y gravity runs downhill. */
  tilt3() { return this.tiltNow; },
  /* Cosmetic easing toward the angle the gravity slider asks for, called from the scene's sync; never saved. */
  ease3(dt) {
    const reach = this.h * 5 / Math.max(this.w, this.h) + 0.72, room = Math.asin(Math.min(1, (this.rig3.height - 0.32) / reach));
    const goal = Math.min(room, 0.6 * (1 - Math.exp(-this.p.gravity / 420)));
    this.tiltNow = reduceMotion ? goal : this.tiltNow + (goal - this.tiltNow) * (1 - Math.exp(-dt * 3));
  },
  /* Balls stand on the plane, so the pointer meets a sphere above its disc: a ray that strikes one
     lands on it, and a held ball follows the pointer at its own height. */
  pick3(s) {
    if (this.p.tool !== 'grab') return stage3d.pick3.call(this, s);
    const V = this.basis3(), P = this.plane3(), t = Math.tan(FOV3 / 2), a = V.w / Math.max(1, V.h), nx = (2 * s.x / V.w - 1) * t * a, ny = (1 - 2 * s.y / V.h) * t;
    const d = [0, 1, 2].map(i => V.f[i] + V.r[i] * nx + V.u[i] * ny), e = [0, 1, 2].map(i => V.eye[i] - P.o[i]);
    const dot = (A, B) => A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    const ex = dot(e, P.u) / P.k + P.cx, ey = dot(e, P.v) / P.k + P.cy, ez = dot(e, P.n) / P.k, dx = dot(d, P.u), dy = dot(d, P.v), dz = dot(d, P.n);
    if (this.grab) {
      const q = (this.r[this.grab.i] - ez) / dz;
      return q > 0 ? { x: ex + dx * q, y: ey + dy * q } : stage3d.pick3.call(this, s);
    }
    const dd = dx * dx + dy * dy + dz * dz;
    let best = Infinity;
    for (let i = 0; i < this.n; i++) {
      const r = this.r[i], ox = ex - this.x[i], oy = ey - this.y[i], oz = ez - r, b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - r * r, h = b * b - dd * c;
      if (h < 0) continue;
      const q = (-b - Math.sqrt(h)) / dd;
      if (q > 0 && q < best) best = q;
    }
    return best < Infinity ? { x: ex + dx * best, y: ey + dy * best } : stage3d.pick3.call(this, s);
  },
  /* Screen overlay in 3D: every tool's preview, laid on the table so it leans with the tilt. */
  overlay3(g) {
    const P = this.plane3(), tool = this.p.tool, B = this.brush || this.hover, G = this.grab, k = P.k;
    const at = (x, y, lift) => { const q = this.to3(x, y, lift, P); return this.projectScene(q[0], q[1], q[2]); };
    const circle = (x, y, r, lift) => {
      g.beginPath();
      for (let a = 0; a < 64; a++) { const s = at(x + r * Math.cos(a / 64 * TAU), y + r * Math.sin(a / 64 * TAU), lift); if (s) g.lineTo(s.x, s.y); }
      g.closePath();
    };
    g.save(); g.lineCap = 'round';
    if (tool === 'grab' && G) {
      const i = G.i, x = this.x[i], y = this.y[i], r = this.r[i], lift = r * k, c = at(x, y, lift), m = at(G.tx, G.ty, lift);
      g.strokeStyle = THEME.text; g.lineWidth = 1.5; g.globalAlpha = 0.9; circle(x, y, r + 3, lift); g.stroke();
      // The spring: a coil from the ball to where the pointer is pulling it.
      const dx = G.tx - x, dy = G.ty - y, L = Math.hypot(dx, dy);
      if (L > 2 && c && m) {
        const turns = Math.max(3, Math.min(10, Math.round(L / 14))), ux = dx / L, uy = dy / L, A = Math.min(5, L / 6);
        g.strokeStyle = THEME.cyan; g.lineWidth = 1.4; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(c.x, c.y);
        for (let q = 1; q < turns * 12; q++) { const f = q / (turns * 12), w = Math.sin(f * turns * TAU) * A, s = at(x + dx * f - uy * w, y + dy * f + ux * w, lift); if (s) g.lineTo(s.x, s.y); }
        g.lineTo(m.x, m.y); g.stroke();
        g.fillStyle = THEME.cyan; g.beginPath(); g.arc(m.x, m.y, 3, 0, TAU); g.fill();
      }
      // The throw: where the ball would go in the next quarter second if released now.
      const v = Math.hypot(this.vel.vx, this.vel.vy), cap = v > 2500 ? 2500 / v : 1;
      if (v > 20 && c) {
        const vx = this.vel.vx * cap, vy = this.vel.vy * cap, e = at(x + vx * 0.25, y + vy * 0.25, lift), b = at(x + vx * 0.25 - (vx - vy * 0.5) * 0.03, y + vy * 0.25 - (vy + vx * 0.5) * 0.03, lift), d = at(x + vx * 0.25 - (vx + vy * 0.5) * 0.03, y + vy * 0.25 - (vy - vx * 0.5) * 0.03, lift);
        if (e && b && d) {
          g.strokeStyle = g.fillStyle = THEME.amber; g.lineWidth = 2; g.globalAlpha = 0.95; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(e.x, e.y); g.stroke();
          g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(b.x, b.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
          g.font = `400 11px ${THEME.mono}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(fmtQ(this, 'speed', v * cap), e.x + 9, e.y);
        }
      }
    } else if (tool === 'grab' && B) {
      const i = this.hit(B);
      if (i >= 0) { g.strokeStyle = THEME.amber; g.lineWidth = 1.5; g.globalAlpha = 0.9; circle(this.x[i], this.y[i], this.r[i] + 3, this.r[i] * k); g.stroke(); }
      else if (B.x >= 0 && B.x <= this.w && B.y >= 0 && B.y <= this.h) {
        const r = this.p.radius;
        g.strokeStyle = THEME.amber; g.lineWidth = 1.5; g.globalAlpha = 0.6; g.setLineDash([4, 4]); circle(clamp(B.x, r, this.w - r), clamp(B.y, r, this.h - r), r, 0.01); g.stroke(); g.setLineDash([]);
      }
    } else if (B) {
      const R = tool === 'erase' ? 26 : 70, col = tool === 'heat' ? THEME.amber : tool === 'cool' ? THEME.cyan : THEME.crit;
      g.strokeStyle = col; g.lineWidth = this.brush ? 2 : 1.5; g.globalAlpha = this.brush ? 0.95 : 0.65; g.setLineDash(this.brush ? [] : [5, 5]); circle(B.x, B.y, R, 0.015); g.stroke(); g.setLineDash([]);
    }
    g.restore();
  },
  mini(g, k) {
    g.fillStyle = THEME.cyan; g.globalAlpha = 0.8;
    for (let i = 0; i < this.n; i++) { const r = Math.max(this.r[i], 1.1 / k); g.fillRect(this.x[i] - r, this.y[i] - r, 2 * r, 2 * r); }
    g.globalAlpha = 1;
  },
  // The readings this lab is about lead the deck with larger figures; the rest follow as secondary.
  primary: ['Total kinetic energy', 'RMS speed'],
  readouts() {
    const s = this.stats();
    return [
      ['Balls', String(this.n)],
      ['Total kinetic energy', fmtSI(s.etot)],
      ...(s.kr > 0 ? [['Share of energy in spin', pct(s.kr / s.etot)]] : []),
      ['Total momentum |p|', fmtSI(s.p)],
      ['RMS speed', fmtQ(this, 'speed', s.vrms)],
      ['Packing fraction φ', pct(s.phi)],
      ['Pressure check PA / NkT', this.p.gravity === 0 && Number.isFinite(this.Z) ? this.Z.toFixed(2) : '—', undefined, 'derived'],
      ['Collisions per second', fmtSI(this.hitRate)],
    ];
  },
  diagnose() {
    const out = [], s = this.stats(), dt = this.dt();
    if (!this.n) { out.push({ id: 'c-empty', level: 'info', title: 'Empty box', body: 'Click anywhere with the Grab tool to add a ball.' }); return out; }
    const stepMove = s.vmax * dt;
    if (stepMove > s.rmin) {
      const cap = s.rmin / dt * 0.8;
      out.push({ id: 'c-tunnel', level: 'warn', title: 'Fast balls can tunnel', body: `The fastest ball moves <b>${stepMove.toFixed(1)} px per step</b>, more than the smallest radius (${s.rmin.toFixed(0)} px), so it can skip through another ball between checks.`,
        fixes: [{ label: `Cap speeds at ${fmtQ(this, 'speed', cap)}`, run() { const c = collisions; for (let i = 0; i < c.n; i++) { const v = Math.hypot(c.vx[i], c.vy[i]); if (v > cap) { c.vx[i] *= cap / v; c.vy[i] *= cap / v; } } c.KE0 = c.stats().etot; } }] });
    }
    if (s.phi > 0.78) {
      out.push({ id: 'c-jam', level: 'warn', title: 'The box is jammed', body: `Discs cover <b>${pct(s.phi)}</b> of the box. Past about 78% they lock into a crystal and can only rattle in place.`,
        fixes: this.presetId === 'pool' ? [] : [{ label: `Restart with ${Math.round(this.p.count * 0.6)} balls`, run() { setParam(collisions, 'count', Math.round(collisions.p.count * 0.6 / 10) * 10); } }] });
    }
    if (this.p.gravity > 0) {
      let worst = 0; const O = this.order, X = this.x, Y = this.y, R = this.r;
      for (let a = 0; a < this.n; a++) {
        const i = O[a], right = X[i] + R[i];
        for (let b = a + 1; b < this.n; b++) { const j = O[b]; if (X[j] - R[j] > right) break; const d = Math.hypot(X[j] - X[i], Y[j] - Y[i]); worst = Math.max(worst, (R[i] + R[j] - d) / Math.min(R[i], R[j])); }
      }
      if (worst > 0.5) out.push({ id: 'c-squash', level: 'warn', title: 'The pile is over-compressed', body: `Neighbours overlap by up to <b>${pct(worst)}</b> of a radius. Gravity of ${fmtQ(this, 'acc', this.p.gravity)} squeezes the pile faster than two solver passes per step can push it apart.`,
        fixes: [{ label: 'Halve gravity', run() { setParam(collisions, 'gravity', Math.round(collisions.p.gravity / 20) * 10); } }] });
    }
    if (this.p.e < 1 && this.p.gravity === 0 && this.KE0 > 0) {
      const ratio = s.etot / this.KE0;
      out.push({ id: 'c-cool', level: 'info', title: 'The gas is cooling', body: `With e = ${this.p.e.toFixed(2)}, a head-on impact keeps only e² = ${(this.p.e ** 2).toFixed(2)} of its energy along the normal. Kinetic energy is now <b>${pct(ratio)}</b> of where it started.${this.p.e < 0.6 ? ' Slow balls clump together: inelastic collapse.' : ''}` });
    }
    if (this.p.gravity === 0 && Number.isFinite(this.Z) && this.n > 30) {
      out.push({ id: 'c-z', level: 'info', title: 'Ideal-gas check', body: `PA / NkT = <b>${this.Z.toFixed(2)}</b>. An ideal gas gives 1; hard discs covering ${pct(s.phi)} of the box add excluded-area pressure (low-density theory: 1 + 2φ = ${(1 + 2 * s.phi).toFixed(2)}).` });
    }
    if (this.p.mu > 0 && s.kr > 0 && s.etot > 0) out.push({ id: 'c-spin', level: 'info', title: 'Friction is spinning the balls', body: `<b>${pct(s.kr / s.etot)}</b> of the kinetic energy is now rotation. Friction trades sliding for spin at every contact, and it also dissipates energy while surfaces slide, so even with e = 1 the total slowly falls.` });
    if (this.n > 1000) out.push({ id: 'c-many', level: 'info', title: 'Large population', body: `${this.n} balls: sort-and-sweep keeps contact search near linear, but every extra ball still costs work four times per frame.` });
    return out;
  },
  perfFixes() { return this.n > 400 && this.presetId !== 'pool' ? [{ label: `Restart with ${Math.round(this.n * 0.6)} balls`, run() { setParam(collisions, 'count', clamp(Math.round(collisions.n * 0.06) * 10, 20, 1200)); } }] : []; },
  sane() { for (let i = 0; i < this.n; i++) if (!Number.isFinite(this.x[i]) || !Number.isFinite(this.vx[i])) return false; return true; },
  chart: {
    title: 'Speed distribution', caption: '',
    draw(c) {
      const L = collisions, n = L.n, tr = L.tracer;
      let v2 = 0, cnt = 0, m0 = -1, equal = true;
      for (let i = 0; i < n; i++) {
        if (i === tr || (L.grab && L.grab.i === i)) continue;
        v2 += L.vx[i] ** 2 + L.vy[i] ** 2; cnt++;
        if (m0 < 0) m0 = L.r[i]; else if (Math.abs(L.r[i] - m0) > 1e-6) equal = false;
      }
      collisions.chart.caption = equal
        ? `Bars: share of ${cnt} balls in each speed band. Line: the 2-D Maxwell–Boltzmann curve for the same mean energy, f(v) = (v/σ²) e^(−v²/2σ²).`
        : `Bars: share of ${cnt} balls in each speed band. The Maxwell–Boltzmann curve is drawn only when every ball has the same mass.`;
      if (cnt < 5) { chartMessage(c.g, c.w, c.h, 'Add more balls'); return; }
      const vrms = Math.sqrt(v2 / cnt), vmax = Math.max(1, 3 * vrms), B = 28, bw = vmax / B, hist = new Float64Array(B);
      for (let i = 0; i < n; i++) {
        if (i === tr || (L.grab && L.grab.i === i)) continue;
        const s = Math.hypot(L.vx[i], L.vy[i]); hist[Math.min(B - 1, (s / bw) | 0)] += 1 / cnt;
      }
      const sig2 = vrms * vrms / 2, f = v => bw * v / sig2 * Math.exp(-v * v / (2 * sig2));
      let ymax = 0; for (const v of hist) ymax = Math.max(ymax, v);
      if (equal) ymax = Math.max(ymax, f(Math.sqrt(sig2)));
      ymax *= 1.15;
      const box = chartFrame(c.g, c.w, c.h, 0, ymax, v => (v * 100).toFixed(v * 100 >= 10 ? 0 : 1) + '%'), g = c.g, sx = v => box.x0 + v / vmax * (box.x1 - box.x0);
      g.fillStyle = THEME.cyan; g.globalAlpha = 0.55;
      for (let k = 0; k < B; k++) { const x0 = sx(k * bw) + 0.5, x1 = sx((k + 1) * bw) - 0.5, y = box.sy(hist[k]); g.fillRect(x0, y, Math.max(0.5, x1 - x0), box.y1 - y); }
      g.globalAlpha = 1;
      if (equal) {
        g.strokeStyle = THEME.amber; g.lineWidth = 1.8; g.beginPath();
        for (let k = 0; k <= 80; k++) { const v = vmax * k / 80, X = sx(v), Y = box.sy(f(v)); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
        g.stroke();
      }
      g.fillStyle = THEME.muted; g.font = `400 10px ${THEME.mono}`; g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillText('0', box.x0, c.h - 5);
      g.textAlign = 'right'; g.fillText(fmtQ(L, 'speed', vmax), box.x1, c.h - 5);
      g.textAlign = 'center'; g.fillText('speed →', (box.x0 + box.x1) / 2, c.h - 5);
    },
  },
  /* The Math page's live panels: what each formula is doing in the run right now (livemath.js). */
  mathLive: {
    impulse: {
      params: ['e'],
      vars: L => { const s = L.stats(); return [
        ['e', L.p.e.toFixed(2), 'Restitution: the share of the approach speed each contact gives back.'],
        ['e²', L.p.e ** 2 < 0.995 ? `${(L.p.e ** 2 * 100).toFixed(0)} %` : '100 %', 'The share of the relative-motion energy along the normal a contact keeps.'],
        ['contacts', `${fmtSI(L.hitRate)} /s`, 'Contacts resolved per simulated second.'],
        ['energy now', L.KE0 > 0 ? `${(s.etot / L.KE0 * 100).toFixed(1)} %` : '—', 'Total kinetic energy, against its value when the scene or a setting last changed.'],
      ]; },
      check: L => (L.p.gravity === 0 && L.p.drag === 0 && L.p.e === 1 && L.KE0 > 0
        ? { what: 'Energy kept with e = 1', theory: 1, sim: L.stats().etot / L.KE0, fmt: v => `${(v * 100).toFixed(1)} %`, tol: 0.01 }
        : { text: L.p.e < 1 ? `With e = ${L.p.e.toFixed(2)} every head-on contact keeps ${(L.p.e ** 2 * 100).toFixed(0)} % of its relative-motion energy, so the total drains away.` : 'Gravity or drag adds or removes energy, so the total is not conserved here.' }),
    },
    mb: {
      vars: L => {
        let v2 = 0, v1 = 0, n = 0;
        for (let i = 0; i < L.n; i++) { if (i === L.tracer) continue; const s2 = L.vx[i] ** 2 + L.vy[i] ** 2; v2 += s2; v1 += Math.sqrt(s2); n++; }
        const sig = n ? Math.sqrt(v2 / n / 2) : NaN;
        return [['σ', fmtQ(L, 'speed', sig), 'From σ² = ½⟨v²⟩: the most likely speed.'], ['⟨v⟩', fmtQ(L, 'speed', n ? v1 / n : NaN), 'The mean speed of the balls now.'], ['N', String(n), 'Balls counted (the Brownian tracer is left out).']];
      },
      check: L => {
        let v2 = 0, v1 = 0, n = 0, m0 = -1, equal = true;
        for (let i = 0; i < L.n; i++) { if (i === L.tracer) continue; const s2 = L.vx[i] ** 2 + L.vy[i] ** 2; v2 += s2; v1 += Math.sqrt(s2); n++; if (m0 < 0) m0 = L.r[i]; else if (Math.abs(L.r[i] - m0) > 1e-6) equal = false; }
        if (n < 20) return { text: 'Needs twenty or more balls to compare.' };
        if (!equal) return { text: 'The balls differ in mass, so the Rayleigh curve does not apply.' };
        return { what: 'Mean speed σ√(π/2)', theory: Math.sqrt(v2 / n / 2) * Math.sqrt(Math.PI / 2), sim: v1 / n, fmt: v => fmtQ(L, 'speed', v), tol: 0.03 };
      },
      plot: (c, L) => L.chart.draw(c),
      plotLabel: 'Histogram of ball speeds against the Maxwell–Boltzmann curve for the same mean energy',
    },
    gas: {
      vars: L => { const s = L.stats(); return [['N', String(L.n), 'Balls in the box.'], ['φ', `${(s.phi * 100).toFixed(1)} %`, 'Packing fraction: the share of the box the balls cover.'], ['PA / NkT', Number.isFinite(L.Z) ? L.Z.toFixed(3) : '—', 'Measured from the momentum the balls deliver to the walls.']]; },
      check: L => (L.p.gravity !== 0 ? { text: 'Set gravity to 0: the law describes a gas at rest in an empty box.' }
        : { what: 'PA / NkT ≈ 1 + 2φ', theory: 1 + 2 * L.stats().phi, sim: L.Z, fmt: v => v.toFixed(3), tol: 0.06, wait: 'PA / NkT: collecting wall impacts…' }),
    },
    friction: {
      params: ['mu'],
      vars: L => { const s = L.stats(); return [['μ', L.p.mu.toFixed(2), 'Contact friction: the most the tangential impulse may be, as a share of the normal one.'], ['spin share', s.etot > 0 ? `${(s.kr / s.etot * 100).toFixed(1)} %` : '—', 'The share of the energy in spin rather than motion.']]; },
      check: L => ({ text: L.p.mu > 0 ? 'Friction turns sliding into spin: watch the spin share climb toward its steady value.' : 'With μ = 0 contacts cannot spin the balls; raise μ to see the spin share grow.' }),
    },
  },
  math: `
    <p>Each contact gets an impulse along its normal <i>n</i>, set by the restitution <i>e</i> and the reduced mass μ:</p>
    <div class="f" data-live="impulse" data-tex="\\begin{aligned} J &amp;= -(1 + e)\\,\\mu\\,(\\mathbf v_2 - \\mathbf v_1)\\cdot\\hat{\\mathbf n} \\\\ \\mu &amp;= \\frac{m_1 m_2}{m_1 + m_2} \\end{aligned}"></div>
    <div class="f" data-tex="\\mathbf v_1 \\leftarrow \\mathbf v_1 - \\frac{J}{m_1}\\,\\hat{\\mathbf n}, \\qquad \\mathbf v_2 \\leftarrow \\mathbf v_2 + \\frac{J}{m_2}\\,\\hat{\\mathbf n}"></div>
    <p><i>e</i> = 1 is perfectly elastic; <i>e</i> = 0 removes all relative speed along the normal. Disc mass grows with area, m ∝ r².</p>
    <p>With equal masses, speeds settle into the two-dimensional Maxwell–Boltzmann (Rayleigh) distribution:</p>
    <div class="f" data-live="mb" data-tex="f(v) = \\frac{v}{\\sigma^2}\\, e^{-v^2/2\\sigma^2}, \\qquad \\sigma^2 = \\tfrac12 \\langle v^2 \\rangle"></div>
    <p>Pressure is the momentum delivered to the walls per unit length per second. In two dimensions the ideal-gas law reads:</p>
    <div class="f" data-live="gas" data-tex="P A = N k T, \\qquad k T = \\langle \\tfrac12 m v^2 \\rangle"></div>
    <p>Hard discs raise it by roughly a factor 1 + 2φ, where φ is the packing fraction. In the Brownian scene the heavy disc’s mean-squared displacement grows linearly with time, ⟨Δr<sup>2</sup>⟩ ∝ t.</p>
    <p>With contact friction μ, a tangential impulse stops the two surfaces sliding past each other, but never more than μ times the normal impulse (Coulomb’s law). Each ball is a uniform disc, I = ½ m r², so the impulse also spins it:</p>
    <div class="f" data-live="friction" data-tex="\\begin{aligned} J_t &amp;= -\\frac{v_t}{3\\,(1/m_1 + 1/m_2)}, \\quad |J_t| \\le \\mu J \\\\ \\Delta\\omega_k &amp;= -\\frac{J_t\\, r_k}{I_k} \\end{aligned}"></div>
    <p>Here v<sub>t</sub> is the sliding speed of the touching surfaces, including ω r from each spin. Walls work the same way with an infinitely heavy partner.</p>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(collisions, genericState, {
  histBudget: 16e6, histInterval: 0.25,
  snapshot() {
    const n = this.n, a = new Float64Array(n * 7), { gravity, e, drag, mu } = this.p;
    for (let i = 0; i < n; i++) { const o = i * 7; a[o] = this.x[i]; a[o + 1] = this.y[i]; a[o + 2] = this.vx[i]; a[o + 3] = this.vy[i]; a[o + 4] = this.r[i]; a[o + 5] = this.ang[i]; a[o + 6] = this.om[i]; }
    return { n, a, stride: 7, tracer: this.tracer, KE0: this.KE0, p: { gravity, e, drag, mu } };
  },
  restore(s) {
    Object.assign(this.p, s.p);
    this.n = 0;
    const st = s.stride || 5;
    for (let i = 0; i < s.n; i++) {
      const o = i * st, k = this.add(s.a[o], s.a[o + 1], s.a[o + 2], s.a[o + 3], s.a[o + 4]);
      if (st >= 7 && k >= 0) { this.ang[k] = s.a[o + 5]; this.om[k] = s.a[o + 6]; }
    }
    Object.assign(this, { tracer: s.tracer, KE0: s.KE0, grab: null, brush: null, tn: 0, th: 0, wallImp: 0, wallTime: 0 });
    return true;
  },
  dataColumns: ['t_s', 'balls', 'kinetic_energy', 'momentum', 'rms_speed', 'max_speed', 'packing_fraction', 'pressure_ratio_PA_over_NkT', 'collisions_per_s', 'spin_energy'],
  dataRow() { const s = this.stats(); return [this.t, this.n, s.etot, s.p, s.vrms, s.vmax, s.phi, this.p.gravity === 0 ? this.Z : NaN, this.hitRate, s.kr]; },
  trackLabel: 'Brownian tracer path',
  trackColumns: ['t_s', 'x', 'y', 'vx', 'vy'],
  trackRows(out) { const t = this.tracer; if (t >= 0) out.push([this.t, this.x[t], this.y[t], this.vx[t], this.vy[t]]); },
});
