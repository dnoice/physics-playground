/*
✒ Metadata
    - Title: Fluid Lab (digiSpace Edition - v2.4)
    - File Name: fluid.js
    - Relative Path: js/labs/fluid.js
    - Artifact Type: javascript
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Any tool
      but Obstacle selects a post for the Inspect pane, with figures measured
      from the liquid around it and a remove action; speeds, lengths and
      gravity follow the chosen units, one pixel being 1.09 cm.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Posts
      survive a rebuild that a parameter asks for, after Dennis found them
      vanishing when Particles changed: keep() hands them over and build()
      places them before the liquid. Controls are grouped into Setup, Physics
      and Display.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      3D rig and tool overlay; a seeded generator and Float64 snapshots make
      replay exact; GPU failure now says so.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Smoothed-particle hydrodynamics with a density solver, obstacles, tilt
    and pointer tools, drawn as a GPU liquid surface.

✒ Key Features:
    - Dam break, obstacle course, droplet, twin columns and zero-g scenes.
    - Stir, push, pull, pour, obstacle and drain tools.
    - Posts placed by hand outlast a change of Particles; a scene load or
      Reset starts clean.
    - Diagnostics for compression and speed capping, with fixes.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, drawSeries, seriesRange, velocityTracker } from '../core/chart.js';
import { genericState } from '../core/codec.js';
import { RAMP_DENS, RAMP_HEAT, THEME } from '../core/color.js';
import { brushRing, drawSphere } from '../core/draw.js';

import { Series } from '../core/series.js';
import { TAU, clamp, fmtSI, pct, rand } from '../core/util.js';
import { PX_M, fmtPos, fmtQ, unitOf } from '../core/units.js';
import { view } from '../core/view.js';


import { FL_CAP, fluidGL } from '../render/fluid-gl.js';
import { camOf, camXf, is3D } from '../shell/camera.js';
import { sticky } from '../shell/diagnostics.js';
import { setParam } from '../shell/lifecycle.js';


import { announce } from '../shell/state.js';

/* ================================================================== */
/*  Lab 3 · Fluid (SPH, double-density relaxation)                     */
/* ================================================================== */
export function latticeDensity(s) {
  let rho = 0;
  const rs = s * Math.sqrt(3) / 2;
  for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
    const x = i * s + ((j & 1) ? s / 2 : 0), y = j * rs, r = Math.hypot(x, y);
    if (r > 1e-9 && r < 1) rho += (1 - r) ** 2;
  }
  return rho;
}
export const fluid = {
  id: 'fluid', name: 'Fluid', title: 'Particle fluid',
  rig3: { plane: 'wall', yaw: 0.5, pitch: 0.15, fit: 1.88, height: 0.7, depth: 1.5, yawMax: 1.05, pitchMin: -0.08, pitchMax: 0.95, target: [0, -0.42, 0] },
  eq: 'P = k(ρ − ρ<sub>0</sub>)',
  eqTex: 'P = k\\,(\\rho - \\rho_0)',
  aria: 'Fluid simulation: particles behaving as a liquid in a tank',
  blurb: 'Smoothed-particle hydrodynamics by double-density relaxation: each particle shoves its neighbours apart in proportion to how far its local density sits above rest. A second near-density term stops clumping and gives the surface its tension.',
  interact: [
    'Pick a tool from the dock, then drag inside the tank.',
    '<b>Stir</b> drags the liquid along. <b>Push</b> and <b>Pull</b> blow it apart or draw it in. <b>Pour</b> adds liquid and <b>Drain</b> removes it.',
    '<b>Obstacle</b> places a fixed post where you click; click a post again to remove it. Tilt gravity to slosh the tank.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'stir', label: 'Stir', key: 's', icon: 'stir', hint: 'Drag to stir the liquid along with the pointer · click a post to inspect it' },
    { id: 'push', label: 'Push', key: 'p', icon: 'push', hint: 'Hold to blow the liquid away from the pointer' },
    { id: 'pull', label: 'Pull', key: 'l', icon: 'pull', hint: 'Hold to draw the liquid toward the pointer' },
    { id: 'pour', label: 'Pour', key: 'o', icon: 'pour', hint: 'Hold to pour new liquid at the pointer' },
    { id: 'obstacle', label: 'Obstacle', key: 'b', icon: 'obstacle', hint: 'Click to place a post · click a post to remove it' },
    { id: 'drain', label: 'Drain', key: 'x', icon: 'drain', hint: 'Hold to remove liquid under the pointer' },
  ] },
  p: { tool: 'stir', colorBy: 'water', count: 1400, gravity: 900, tilt: 0, k: 0.08, kNear: 0.05, visc: 0.08, surface: true },
  presetId: 'dam',
  presets: [
    { id: 'dam', label: 'Dam break', params: { gravity: 900, tilt: 0 } },
    { id: 'posts', label: 'Obstacle course', params: { gravity: 900, tilt: 0 } },
    { id: 'drop', label: 'Droplet splash', params: { gravity: 900, tilt: 0 } },
    { id: 'twin', label: 'Twin columns', params: { gravity: 900, tilt: 0 } },
    { id: 'zerog', label: 'Zero-g collision', params: { gravity: 0, tilt: 0 } },
  ],
  groups: [
    { id: 'setup', label: 'Setup', icon: 'flag' },
    { id: 'physics', label: 'Physics', icon: 'balance' },
    { id: 'display', label: 'Display', icon: 'visibility' },
  ],
  controls: [
    { type: 'seg', key: 'colorBy', label: 'Colour', options: [['water', 'Water'], ['speed', 'Speed'], ['density', 'Density']], group: 'display' },
    { type: 'range', key: 'count', label: 'Particles', min: 300, max: 3000, step: 50, rebuild: true, group: 'setup' },
    { type: 'range', key: 'gravity', label: 'Gravity', min: 0, max: 2000, step: 10, qty: 'acc', group: 'physics' },
    { type: 'range', key: 'tilt', label: 'Gravity tilt', min: -90, max: 90, step: 1, unit: '°', group: 'physics' },
    { type: 'range', key: 'k', label: 'Stiffness k', min: 0.01, max: 0.2, step: 0.005, note: 'Higher values resist compression more.', group: 'physics' },
    { type: 'range', key: 'kNear', label: 'Near stiffness k-near', min: 0.005, max: 0.3, step: 0.005, note: 'Higher values spread the liquid into a lighter, foamier body.', group: 'physics' },
    { type: 'range', key: 'visc', label: 'Viscosity σ', min: 0, max: 0.8, step: 0.01, group: 'physics' },
    { type: 'toggle', key: 'surface', label: 'Liquid surface rendering (GPU)', group: 'display', short: 'Liquid surface (GPU)' },
  ],
  actions: [
    { label: 'Level the tank', run() { setParam(fluid, 'tilt', 0); } },
    { label: 'Splash upward', run() { const f = fluid; for (let i = 0; i < f.n; i++) f.vy[i] -= rand(0.04, 0.09); } },
    { label: 'Remove obstacles', run() { fluid.obs = []; } },
  ],
  // One pixel is PX_M metres (core/units.js): the default gravity of 900 px/s² is 9.81 m/s².
  units: { len: 'px', m: PX_M }, scaleNote: 'In Fluid one pixel is 1.09 cm, set so the default gravity of 900 px/s² is 9.81 m/s².',
  U: 20, Wu: 40, Hu: 30, cols: 1, rows: 1, n: 0, rho0: 3, spacing: 0.42, obs: [], seed: 1,
  x: new Float64Array(FL_CAP), y: new Float64Array(FL_CAP), px: new Float64Array(FL_CAP), py: new Float64Array(FL_CAP),
  vx: new Float64Array(FL_CAP), vy: new Float64Array(FL_CAP), rho: new Float32Array(FL_CAP), bin: new Uint8Array(FL_CAP),
  cellOf: new Int32Array(FL_CAP), cellItems: new Int32Array(FL_CAP), cellStart: new Int32Array(2), fillPos: new Int32Array(2),
  ptr: null, vel: velocityTracker(), pourClock: 0, series: new Series(400), lastSample: -1, peak: 1, mean: 1, clamped: 0, ticks: 0, clampRate: 0,
  TICK: 1 / 240,
  dt() { return this.TICK; }, maxSteps: 16,

  setup(w, h) {
    this.U = Math.sqrt(w * h / 1250); this.Wu = w / this.U; this.Hu = h / this.U;
    this.cols = Math.ceil(this.Wu) + 1; this.rows = Math.ceil(this.Hu) + 1;
    const cells = this.cols * this.rows;
    this.cellStart = new Int32Array(cells + 1); this.fillPos = new Int32Array(cells + 1);
    this.rho0 = latticeDensity(this.spacing);
  },
  add(x, y, vx = 0, vy = 0) {
    if (this.n >= FL_CAP) return false;
    for (const o of this.obs) if ((x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + 0.2) ** 2) return true;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.px[i] = x; this.py[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.rho[i] = this.rho0;
    return true;
  },
  removeAt(i) {
    const l = --this.n;
    if (i !== l) { this.x[i] = this.x[l]; this.y[i] = this.y[l]; this.px[i] = this.px[l]; this.py[i] = this.py[l]; this.vx[i] = this.vx[l]; this.vy[i] = this.vy[l]; this.rho[i] = this.rho[l]; }
  },
  fillBlock(x0, y0, x1, y1, max, vx = 0, vy = 0) {
    const s = this.spacing, rs = s * Math.sqrt(3) / 2; let c = 0;
    for (let j = 0; y1 - j * rs >= y0 && c < max; j++) {
      const y = y1 - j * rs;
      for (let x = x0 + ((j & 1) ? s / 2 : 0); x <= x1 && c < max; x += s) { if (!this.add(x, y, vx, vy)) return c; c++; }
    }
    return c;
  },
  fillDisc(cx, cy, R, max, vx = 0, vy = 0) {
    const s = this.spacing, rs = s * Math.sqrt(3) / 2; let c = 0;
    for (let j = -Math.ceil(R / rs); j <= Math.ceil(R / rs) && c < max; j++) {
      const y = cy + j * rs;
      for (let x = cx - R + ((j & 1) ? s / 2 : 0); x <= cx + R && c < max; x += s) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R) { if (!this.add(x, y, vx, vy)) return c; c++; }
      }
    }
    return c;
  },
  /* The posts are the user's edit to the tank, so a rebuild that a parameter asks for carries them over. */
  keep() { return { obs: this.obs.map(o => ({ ...o })) }; },
  build(preset, w, h) {
    this.setup(w, h); this.n = 0; this.series.clear(); this.lastSample = -1; this.ptr = null; this.obs = []; this.clamped = 0; this.ticks = 0; this.clampRate = 0; this.seed = rand(0, 4294967296) | 0;
    const s = this.spacing, A = s * s * Math.sqrt(3) / 2, N = Math.round(this.p.count), Wu = this.Wu, Hu = this.Hu, m = 0.45;
    // Posts go in before the liquid, so no particle starts inside one; kept posts outside a smaller tank are dropped.
    if (this.kept) this.obs = this.kept.obs.filter(o => o.x - o.r > m && o.x + o.r < Wu - m && o.y - o.r > m && o.y + o.r < Hu - m);
    if (preset === 'dam' || preset === 'posts') {
      if (preset === 'posts' && !this.kept) {
        const r = 1.5;
        this.obs.push({ x: Wu * 0.55, y: Hu * 0.72, r }, { x: Wu * 0.7, y: Hu * 0.5, r }, { x: Wu * 0.84, y: Hu * 0.74, r }, { x: Wu * 0.62, y: Hu * 0.3, r: 1.1 });
      }
      const bw = Math.min(Wu * 0.4, Wu - 1), ht = Math.min(Hu - 1.2, N * A / bw);
      this.fillBlock(m, Hu - m - ht, m + bw, Hu - m, N);
    } else if (preset === 'drop') {
      const pool = Math.round(N * 0.62), depth = Math.min(Hu * 0.5, pool * A / (Wu - 2 * m));
      this.fillBlock(m, Hu - m - depth, Wu - m, Hu - m, pool);
      const R = Math.sqrt((N - pool) * A / Math.PI);
      this.fillDisc(Wu / 2, Math.max(R + 1, Hu * 0.2), R, N - pool, 0, 0.004);
    } else if (preset === 'twin') {
      const half = Math.round(N / 2), bw = Wu * 0.2, ht = Math.min(Hu - 1.2, half * A / bw);
      this.fillBlock(m, Hu - m - ht, m + bw, Hu - m, half);
      this.fillBlock(Wu - m - bw, Hu - m - ht, Wu - m, Hu - m, N - half);
    } else if (preset === 'zerog') {
      const half = Math.round(N / 2), R = Math.sqrt(half * A / Math.PI);
      this.fillDisc(Wu * 0.27, Hu * 0.42, R, half, 0.025, 0.002);
      this.fillDisc(Wu * 0.73, Hu * 0.58, R, N - half, -0.025, -0.002);
    }
  },
  worldRect() { return { w: this.Wu * this.U, h: this.Hu * this.U }; },
  enabled(key) { return key === 'surface' && is3D(this) ? 'Shapes the 2D view; the 3D tank always draws the water.' : true; },
  buildGrid() {
    const n = this.n, cols = this.cols, rows = this.rows, start = this.cellStart, fill = this.fillPos, cellOf = this.cellOf, items = this.cellItems;
    start.fill(0);
    for (let i = 0; i < n; i++) { const c = clamp(this.y[i] | 0, 0, rows - 1) * cols + clamp(this.x[i] | 0, 0, cols - 1); cellOf[i] = c; start[c + 1]++; }
    for (let c = 1; c < start.length; c++) start[c] += start[c - 1];
    fill.set(start);
    for (let i = 0; i < n; i++) items[fill[cellOf[i]]++] = i;
  },
  /* Mulberry32 over a seed kept in snapshots, so a replay repeats the wall jitter exactly. */
  jitter() {
    const s = this.seed = (this.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  bounds() {
    const m = 0.25, W = this.Wu - m, H = this.Hu - m, X = this.x, Y = this.y, n = this.n;
    for (let i = 0; i < n; i++) {
      if (X[i] < m) X[i] = m + this.jitter() * 1e-3; else if (X[i] > W) X[i] = W - this.jitter() * 1e-3;
      if (Y[i] < m) Y[i] = m + this.jitter() * 1e-3; else if (Y[i] > H) Y[i] = H - this.jitter() * 1e-3;
    }
    for (const o of this.obs) {
      const rr = o.r + 0.25, rr2 = rr * rr, x0 = o.x - rr, x1 = o.x + rr, y0 = o.y - rr, y1 = o.y + rr;
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const dx = x - o.x, dy = y - o.y, d2 = dx * dx + dy * dy;
        if (d2 >= rr2) continue;
        const d = Math.sqrt(d2);
        if (d < 1e-6) { X[i] = o.x; Y[i] = o.y - rr; continue; }
        X[i] = o.x + dx / d * rr; Y[i] = o.y + dy / d * rr;
      }
    }
  },
  applyPointer() {
    const P = this.ptr;
    if (!P || !P.down) return;
    const tool = this.p.tool, U = this.U, T = this.TICK;
    const px = P.x / U, py = P.y / U, pvx = this.vel.vx * T / U, pvy = this.vel.vy * T / U;
    if (tool === 'obstacle') return;
    if (tool === 'pour') {
      if ((this.pourClock += 1) >= 2) {
        this.pourClock = 0;
        const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 0.6;
        this.add(clamp(px + r * Math.cos(a), 0.3, this.Wu - 0.3), clamp(py + r * Math.sin(a), 0.3, this.Hu - 0.3), pvx * 0.5, pvy * 0.5 + 0.01);
      }
      return;
    }
    if (tool === 'drain') {
      for (let i = this.n - 1; i >= 0; i--) if ((this.x[i] - px) ** 2 + (this.y[i] - py) ** 2 < 4) this.removeAt(i);
      return;
    }
    const R = 3.2, R2 = R * R, X = this.x, Y = this.y, VX = this.vx, VY = this.vy;
    for (let i = 0; i < this.n; i++) {
      const dx = X[i] - px, dy = Y[i] - py, d2 = dx * dx + dy * dy;
      if (d2 >= R2) continue;
      const d = Math.sqrt(d2) || 1e-6, w = 1 - d / R;
      if (tool === 'stir') { VX[i] += (pvx - VX[i]) * 0.15 * w; VY[i] += (pvy - VY[i]) * 0.15 * w; }
      else if (tool === 'push') { VX[i] += dx / d * 0.02 * w; VY[i] += dy / d * 0.02 * w; }
      else { VX[i] -= dx / d * 0.012 * w; VY[i] -= dy / d * 0.012 * w; VX[i] *= 1 - 0.04 * w; VY[i] *= 1 - 0.04 * w; }
    }
  },
  step() {
    const X = this.x, Y = this.y, PX = this.px, PY = this.py, VX = this.vx, VY = this.vy;
    const T = this.TICK, g = this.p.gravity * T * T / this.U, a = this.p.tilt * Math.PI / 180, gx = g * Math.sin(a), gy = g * Math.cos(a);
    for (let i = 0; i < this.n; i++) { VX[i] += gx; VY[i] += gy; }
    this.applyPointer();
    const n = this.n, cols = this.cols, rows = this.rows, start = this.cellStart, items = this.cellItems, cellOf = this.cellOf;
    this.buildGrid();
    const sig = this.p.visc, beta = 0.25;
    if (sig > 0) {
      for (let i = 0; i < n; i++) {
        const c = cellOf[i], cx = c % cols, cy = (c / cols) | 0;
        for (let yy = Math.max(0, cy - 1); yy <= Math.min(rows - 1, cy + 1); yy++) for (let xx = Math.max(0, cx - 1); xx <= Math.min(cols - 1, cx + 1); xx++) {
          const cc = yy * cols + xx;
          for (let k = start[cc], e = start[cc + 1]; k < e; k++) {
            const j = items[k]; if (j <= i) continue;
            const dx = X[j] - X[i], dy = Y[j] - Y[i], r2 = dx * dx + dy * dy;
            if (r2 >= 1 || r2 < 1e-12) continue;
            const r = Math.sqrt(r2), ux = dx / r, uy = dy / r, u = (VX[i] - VX[j]) * ux + (VY[i] - VY[j]) * uy;
            if (u > 0) { const I = (1 - r) * (sig * u + beta * u * u) * 0.5; VX[i] -= I * ux; VY[i] -= I * uy; VX[j] += I * ux; VY[j] += I * uy; }
          }
        }
      }
    }
    let clamped = 0;
    for (let i = 0; i < n; i++) {
      const s2 = VX[i] * VX[i] + VY[i] * VY[i];
      if (s2 > 0.36) { const k = 0.6 / Math.sqrt(s2); VX[i] *= k; VY[i] *= k; clamped++; }
      PX[i] = X[i]; PY[i] = Y[i]; X[i] += VX[i]; Y[i] += VY[i];
    }
    this.clamped += clamped; this.ticks++;
    this.bounds();
    this.buildGrid();
    const k = this.p.k, kn = this.p.kNear, r0 = this.rho0, RHO = this.rho;
    for (let i = 0; i < n; i++) {
      const c = cellOf[i], cx = c % cols, cy = (c / cols) | 0, x0 = Math.max(0, cx - 1), x1 = Math.min(cols - 1, cx + 1), y0 = Math.max(0, cy - 1), y1 = Math.min(rows - 1, cy + 1);
      let rho = 0, rhoN = 0;
      const xi = X[i], yi = Y[i];
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        const cc = yy * cols + xx;
        for (let q = start[cc], e = start[cc + 1]; q < e; q++) {
          const j = items[q]; if (j === i) continue;
          const dx = X[j] - xi, dy = Y[j] - yi, r2 = dx * dx + dy * dy;
          if (r2 >= 1) continue;
          const qq = 1 - Math.sqrt(r2); rho += qq * qq; rhoN += qq * qq * qq;
        }
      }
      RHO[i] = rho;
      const P = k * (rho - r0), PN = kn * rhoN;
      let dxi = 0, dyi = 0;
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        const cc = yy * cols + xx;
        for (let q = start[cc], e = start[cc + 1]; q < e; q++) {
          const j = items[q]; if (j === i) continue;
          const dx = X[j] - xi, dy = Y[j] - yi, r2 = dx * dx + dy * dy;
          if (r2 >= 1 || r2 < 1e-12) continue;
          const r = Math.sqrt(r2), qq = 1 - r, D = (P * qq + PN * qq * qq) * 0.5, ux = dx / r * D, uy = dy / r * D;
          X[j] += ux; Y[j] += uy; dxi -= ux; dyi -= uy;
        }
      }
      X[i] += dxi; Y[i] += dyi;
    }
    this.bounds();
    for (let i = 0; i < n; i++) { VX[i] = X[i] - PX[i]; VY[i] = Y[i] - PY[i]; }
  },
  after() {
    if (this.t - this.lastSample >= 0.1) {
      this.lastSample = this.t;
      const s = this.U / this.TICK; let ke = 0, sum = 0, cnt = 0, peak = 0;
      for (let i = 0; i < this.n; i++) {
        ke += 0.5 * (this.vx[i] ** 2 + this.vy[i] ** 2) * s * s;
        const r = this.rho[i] / this.rho0; if (r > 0.3) { sum += r; cnt++; } if (r > peak) peak = r;
      }
      this.mean = cnt ? sum / cnt : 0; this.peak = peak;
      this.series.push(this.t, this.n ? ke / this.n : 0);
      if (this.ticks) { this.clampRate += (this.clamped / (Math.max(1, this.n) * this.ticks) - this.clampRate) * 0.4; this.clamped = 0; this.ticks = 0; }
    }
  },
  /* The post under a point, by index; -1 for none. */
  hitPost(p) { const ux = p.x / this.U, uy = p.y / this.U; return this.obs.findIndex(o => (o.x - ux) ** 2 + (o.y - uy) ** 2 < (o.r + 0.3) ** 2); },
  pointerDown(p) {
    // Any tool but Obstacle selects a post it lands on, for the Inspect pane, instead of acting on the liquid there.
    const post = this.hitPost(p);
    if (this.p.tool !== 'obstacle' && post >= 0) { const o = this.obs[post]; this.selAt = { x: o.x, y: o.y }; return; }
    this.vel.reset(p); this.ptr = { x: p.x, y: p.y, down: true }; this.pourClock = 2;
    if (this.p.tool === 'obstacle') {
      const hit = post, ux = p.x / this.U, uy = p.y / this.U;
      if (hit >= 0) { if (this.post() === this.obs[hit]) this.selAt = null; this.obs.splice(hit, 1); }
      else if (this.obs.length < 24) this.obs.push({ x: ux, y: uy, r: 1.5 });
      else announce('Obstacle limit reached (24).');
    }
  },
  pointerMove(p, e, down) { if (this.ptr) { this.ptr.x = p.x; this.ptr.y = p.y; } if (down) this.vel.update(p); },
  /* The selected post, found by its centre, so a rebuild that carries posts over keeps the selection. */
  selAt: null,
  post() { const s = this.selAt; return s ? this.obs.find(o => o.x === s.x && o.y === s.y) || null : null; },
  inspectHint: 'Click a post with any tool except Obstacle to inspect it here.',
  cursorAt(p) { return this.p.tool !== 'obstacle' && this.hitPost(p) >= 0 ? 'pointer' : 'crosshair'; },
  /* Read-only figures of the selected post, measured from the particles around it this frame. */
  inspect() {
    const o = this.post(); if (!o) return null;
    const U = this.U, s = U / this.TICK, X = this.x, Y = this.y, near = (o.r + 0.45) ** 2, flow = (o.r + 1.5) ** 2;
    let touch = 0, dens = 0, nf = 0, sp = 0;
    for (let i = 0; i < this.n; i++) {
      const d2 = (X[i] - o.x) ** 2 + (Y[i] - o.y) ** 2;
      if (d2 < near) { touch++; dens += this.rho[i] / this.rho0; }
      if (d2 < flow) { nf++; sp += Math.hypot(this.vx[i], this.vy[i]) * s; }
    }
    const k = this.obs.indexOf(o) + 1;
    return { id: `post-${o.x}-${o.y}`, kicker: `Post ${k} of ${this.obs.length}`, short: `Post ${k}`, focus: 'Liquid touching it', title: 'Steel post', color: '#56677c', rows: [
      ['Centre', fmtPos(this, o.x * U, o.y * U), 'Across and down from the tank\'s top-left corner.'],
      ['Radius', fmtQ(this, 'len', o.r * U), 'The post\'s size, which is also how far it pushes liquid back.'],
      ['Liquid touching it', `${touch} particles`, 'Particles within half a particle spacing of its surface right now.'],
      ['Density at its surface ρ / ρ₀', touch ? (dens / touch).toFixed(3) : '—', 'The mean density of the touching particles over the rest density. Above 1 the liquid is pressing on the post.'],
      ['Flow speed around it', nf ? fmtQ(this, 'speed', sp / nf) : '—', 'The mean speed of the particles within about one and a half spacings of its surface.'],
    ], actions: [{ label: 'Remove this post', run: () => { this.obs = this.obs.filter(q => q !== o); this.selAt = null; } }] };
  },
  deselect() { this.selAt = null; },
  pointerUp() { this.ptr = null; this.vel.vx = 0; this.vel.vy = 0; },
  draw(g, w, h) {
    const px = 1 / camOf(this).z;
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    g.strokeStyle = THEME.rule; g.lineWidth = 2 * px; g.strokeRect(px, px, w - 2 * px, h - 2 * px);
    const n = this.n, U = this.U, rad = U * 0.5, s = U / this.TICK, BINS = 20, bin = this.bin, byDens = this.p.colorBy === 'density';
    const back = g.createLinearGradient(0, 0, 0, h);
    back.addColorStop(0, '#0b1018'); back.addColorStop(1, '#0d1622');
    g.fillStyle = back; g.fillRect(2 * px, 2 * px, w - 4 * px, h - 4 * px);
    if (this.p.surface && fluidGL.render(this, view.w, view.h, camXf(this))) {
      g.save(); g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); g.imageSmoothingEnabled = true;
      g.drawImage(fluidGL.canvas, 0, 0, view.w, view.h); g.restore(); this.renderer = 'gpu';
    } else {
      this.renderer = 'cpu';
      if (this.p.surface) this.surfaceFailed();
    }
    if (this.renderer === 'cpu') for (let i = 0; i < n; i++) {
      const t = byDens ? (this.rho[i] / this.rho0 - 0.4) / 1.2 : Math.hypot(this.vx[i], this.vy[i]) * s / 480;
      bin[i] = clamp((t * BINS) | 0, 0, BINS - 1);
    }
    if (this.renderer === 'cpu') for (let b = 0; b < BINS; b++) {
      g.fillStyle = byDens ? RAMP_DENS.css[Math.round(255 * b / (BINS - 1))] : RAMP_HEAT.css[Math.round(55 + 200 * b / (BINS - 1))];
      g.beginPath(); let any = false;
      for (let i = 0; i < n; i++) if (bin[i] === b) { const X = this.x[i] * U, Y = this.y[i] * U; g.moveTo(X + rad, Y); g.arc(X, Y, rad, 0, TAU); any = true; }
      if (any) g.fill();
    }
    const sel = this.post();
    for (const o of this.obs) {
      const X = o.x * U, Y = o.y * U, R = o.r * U;
      drawSphere(g, X, Y, R, [70, 82, 98]);
      g.strokeStyle = THEME.amber; g.globalAlpha = 0.7; g.lineWidth = 1.5 * px; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke(); g.globalAlpha = 1;
      if (o === sel) { g.setLineDash([4 * px, 3 * px]); g.lineWidth = 1.6 * px; g.beginPath(); g.arc(X, Y, R + 6 * px, 0, TAU); g.stroke(); g.setLineDash([]); }
    }
    const hv = this.hover, tool = this.p.tool;
    if (hv && tool !== 'obstacle') brushRing(g, hv, tool === 'pour' ? 0.6 * U : tool === 'drain' ? 2 * U : 3.2 * U, tool === 'drain' ? THEME.crit : THEME.text);
    if (hv && tool === 'obstacle') brushRing(g, hv, 1.5 * U, THEME.amber);
  },
  /* Screen overlay in 3D: each tool's reach, drawn where it acts, on the tank's mid-plane.
     A post is previewed at both its ends; red marks the post a click would remove. */
  overlay3(g, w, h) {
    if (this.p.gravity > 0 && this.p.tilt !== 0) this.gravityMark(g, h);
    const sel = this.post();
    if (sel) {
      const c = this.project3(sel.x * this.U, sel.y * this.U, this.rig3.depth / 2 + 0.05), e = c && this.project3((sel.x + sel.r) * this.U, sel.y * this.U, this.rig3.depth / 2 + 0.05);
      if (c && e) { g.strokeStyle = THEME.amber; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.beginPath(); g.arc(c.x, c.y, Math.hypot(e.x - c.x, e.y - c.y) + 7, 0, TAU); g.stroke(); g.setLineDash([]); }
    }
    const hv = this.hover; if (!hv) return;
    const tool = this.p.tool, U = this.U, d = this.rig3.depth / 2;
    const ring = (x, y, r, lift, a0 = 0, a1 = TAU) => {
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = a0 + (a1 - a0) * i / 48, s = this.project3(x + r * Math.cos(a), y + r * Math.sin(a), lift);
        if (s) g.lineTo(s.x, s.y);
      }
      g.stroke();
    };
    const spoke = (ax, ay, az, bx, by, bz) => { const p = this.project3(ax, ay, az), q = this.project3(bx, by, bz); if (p && q) { g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); } };
    const rays = (n, r0, r1, turn = 0) => {
      g.beginPath();
      for (let i = 0; i < n; i++) { const a = i / n * TAU + turn, c = Math.cos(a), s = Math.sin(a); spoke(hv.x + r0 * c, hv.y + r0 * s, 0, hv.x + r1 * c, hv.y + r1 * s, 0); }
      g.stroke();
    };
    g.save(); g.lineWidth = 1.5; g.lineCap = 'round';
    if (tool === 'obstacle') {
      const hit = this.obs.find(o => (o.x - hv.x / U) ** 2 + (o.y - hv.y / U) ** 2 < (o.r + 0.3) ** 2);
      const x = hit ? hit.x * U : hv.x, y = hit ? hit.y * U : hv.y, r = (hit ? hit.r : 1.5) * U;
      g.strokeStyle = hit ? THEME.crit : THEME.amber; g.globalAlpha = 0.85;
      if (!hit) g.setLineDash([5, 5]);
      ring(x, y, r, d);
      g.globalAlpha = 0.45; ring(x, y, r, -d);
      g.setLineDash([]); g.beginPath();
      for (let i = 0; i < 4; i++) { const a = (i + 0.5) * TAU / 4, c = x + r * Math.cos(a), s = y + r * Math.sin(a); spoke(c, s, d, c, s, -d); }
      g.stroke();
    } else {
      const R = (tool === 'pour' ? 0.6 : tool === 'drain' ? 2 : 3.2) * U;
      g.strokeStyle = tool === 'drain' ? THEME.crit : tool === 'pour' ? THEME.cyan : THEME.text; g.globalAlpha = 0.75;
      g.setLineDash([4, 5]); ring(hv.x, hv.y, R, 0); g.setLineDash([]);
      if (tool === 'stir') {
        const a = 1.7, c = R * 0.62, tip = [hv.x + c * Math.cos(a), hv.y + c * Math.sin(a)];
        ring(hv.x, hv.y, c, 0, -2.2, a);
        g.beginPath();
        for (const k of [0.82, 1.18]) spoke(hv.x + c * k * Math.cos(a - 0.24), hv.y + c * k * Math.sin(a - 0.24), 0, tip[0], tip[1], 0);
        g.stroke();
      } else if (tool === 'push') rays(8, R * 0.56, R * 0.84);
      else if (tool === 'pull') rays(8, R * 0.84, R * 0.56);
      else if (tool === 'drain') rays(6, R * 0.86, R * 0.5, 0.26);
      else if (tool === 'pour') { g.lineWidth = 2; g.beginPath(); spoke(hv.x, hv.y - R * 6, 0, hv.x, hv.y - R * 1.4, 0); g.stroke(); }
    }
    g.restore();
  },
  gravityMark(g, h) {
    const a = this.p.tilt * Math.PI / 180, cx = 34, cy = h - 64;
    g.save(); g.strokeStyle = THEME.amber; g.fillStyle = THEME.amber; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 14 * Math.sin(a), cy - 14 * Math.cos(a)); g.lineTo(cx + 14 * Math.sin(a), cy + 14 * Math.cos(a)); g.stroke();
    g.beginPath(); g.arc(cx + 14 * Math.sin(a), cy + 14 * Math.cos(a), 3.5, 0, TAU); g.fill(); g.restore();
  },
  mini(g, k) {
    const U = this.U, r = Math.max(U * 0.42, 0.9 / k);
    g.fillStyle = '#2fa6c8';
    for (let i = 0; i < this.n; i++) g.fillRect(this.x[i] * U - r, this.y[i] * U - r, 2 * r, 2 * r);
    g.fillStyle = THEME.amber;
    for (const o of this.obs) { g.beginPath(); g.arc(o.x * U, o.y * U, o.r * U, 0, TAU); g.fill(); }
  },
  drawScreen(g, w, h) { if (this.p.gravity > 0 && this.p.tilt !== 0) this.gravityMark(g, h); },
  // The readings this lab is about lead the deck with larger figures; the rest follow as secondary.
  primary: ['Mean density ρ / ρ₀', 'Peak compression'],
  readouts() {
    let vmax = 0;
    for (let i = 0; i < this.n; i++) { const s2 = this.vx[i] ** 2 + this.vy[i] ** 2; if (s2 > vmax) vmax = s2; }
    const pk = this.peak;
    return [
      ['Particles', `${this.n} / ${FL_CAP}`],
      ['Mean density ρ / ρ₀', this.mean.toFixed(3)],
      ['Peak compression', pk.toFixed(2) + '×', pk < 1.5 ? 'ok' : pk < 2.2 ? 'warn' : 'crit'],
      ['Fastest particle speed', fmtQ(this, 'speed', Math.sqrt(vmax) * this.U / this.TICK)],
      ['Speed-capped particles', pct(this.clampRate), this.clampRate < 0.002 ? 'ok' : this.clampRate < 0.02 ? 'warn' : 'crit'],
      ['Obstacles', String(this.obs.length)],
    ];
  },
  diagnose() {
    const out = [];
    if (this.n < 20) { out.push({ id: 'f-empty', level: 'info', title: 'Almost empty tank', body: 'Choose Pour and hold the pointer down to add liquid, or reset the scene.' }); return out; }
    if (this.peak > 1.5) {
      const nk = Math.min(0.2, +(this.p.k * 1.8).toFixed(3));
      out.push({ id: 'f-compress', level: this.peak > 2.2 ? 'crit' : 'warn', title: 'The liquid is compressing', body: `The densest particles sit at <b>${this.peak.toFixed(2)}×</b> rest density. Stiffness k = ${this.p.k} is too soft for gravity of ${fmtQ(this, 'acc', this.p.gravity)}, so the bottom layers squash.`,
        fixes: nk > this.p.k ? [{ label: `Raise k to ${nk}`, run() { setParam(fluid, 'k', nk); } }] : [] });
    }
    if (this.mean < 0.7) {
      const nn = Math.max(0.005, +(this.p.kNear * 0.4).toFixed(3));
      out.push({ id: 'f-foam', level: 'warn', title: 'The liquid is foaming', body: `Average density is only <b>${this.mean.toFixed(2)}</b> of rest. Near stiffness ${this.p.kNear} pushes neighbours apart harder than k = ${this.p.k} can pull them back.`,
        fixes: [{ label: `Lower k-near to ${nn}`, run() { setParam(fluid, 'kNear', nn); } }] });
    }
    if (this.clampRate > 0.005) {
      out.push({ id: 'f-clamp', level: this.clampRate > 0.03 ? 'crit' : 'warn', title: 'Particles are hitting the speed cap', body: `<b>${pct(this.clampRate)}</b> of particle moves are capped at 0.6 h per tick. Clipped motion loses energy unphysically and can look like syrup.`,
        fixes: [{ label: 'Raise viscosity', run() { setParam(fluid, 'visc', Math.min(0.8, +(fluid.p.visc + 0.15).toFixed(2))); } }, ...(this.p.gravity > 1000 ? [{ label: 'Gravity 900', run() { setParam(fluid, 'gravity', 900); } }] : [])] });
    }
    if (this.p.gravity === 0) out.push({ id: 'f-zerog', level: 'info', title: 'Surface tension at work', body: 'Without gravity, the cohesion from negative pressure plus near-pressure pulls each blob toward a circle, the shape with the least boundary.' });
    if (this.n >= FL_CAP) out.push({ id: 'f-cap', level: 'info', title: 'Particle limit reached', body: `The tank holds at most ${FL_CAP} particles. Use Drain to make room.` });
    if (Math.abs(this.p.tilt) > 45 && this.p.gravity > 0) out.push({ id: 'f-tilt', level: 'info', title: 'Steep tilt', body: `Gravity points ${Math.abs(this.p.tilt)}° off vertical, so the liquid piles against the ${this.p.tilt > 0 ? 'right' : 'left'} wall.` });
    return out;
  },
  /* The GPU could not draw the surface: fall back to discs and say so. */
  surfaceFailed() {
    setParam(this, 'surface', false);
    sticky({ id: 'f-gpu-lost', level: 'warn', title: 'Liquid surface unavailable', body: 'The GPU stopped drawing the liquid surface, so the tank now draws plain discs. Turn Liquid surface rendering back on under Parameters to try again.' }, 14);
  },
  /* Twice a second from diagnostics: a surface this device cannot keep up with falls back to discs. */
  slowSurface: 0,
  watchDraw(perf) {
    if (is3D(this) || !(this.p.surface && this.renderer === 'gpu' && perf.draw > 40 && perf.fps < 24)) { this.slowSurface = 0; return; }
    if ((this.slowSurface += 0.5) < 4) return;
    this.slowSurface = 0;
    setParam(this, 'surface', false);
    sticky({ id: 'f-gpu-slow', level: 'info', title: 'Switched to simple discs', body: `The liquid surface took about ${perf.draw.toFixed(0)} ms per frame on this device, so the tank now draws plain discs. Turn on Liquid surface rendering under Parameters to try it again.` }, 14);
  },
  drawFixes() { return this.p.surface && !is3D(this) ? [{ label: 'Use simple discs', run() { setParam(fluid, 'surface', false); } }] : []; },
  perfFixes() { return this.n > 800 ? [{ label: `Restart with ${Math.round(this.n * 0.6 / 50) * 50} particles`, run() { setParam(fluid, 'count', clamp(Math.round(fluid.n * 0.6 / 50) * 50, 300, 3000)); } }] : []; },
  sane() { for (let i = 0; i < this.n; i++) if (!Number.isFinite(this.x[i]) || !Number.isFinite(this.y[i])) return false; return true; },
  chart: {
    title: 'Mean kinetic energy per particle',
    get caption() { return `Viscosity and contact with walls and posts turn bulk motion into heat; the curve decays after every disturbance. Per particle, in ${unitOf(fluid, 'spec')[1]}.`; },
    draw(c) {
      const s = fluid.series, k = unitOf(fluid, 'spec')[0];
      if (s.n < 2) { chartMessage(c.g, c.w, c.h, 'Collecting samples…'); return; }
      const [, hi] = seriesRange([s]), box = chartFrame(c.g, c.w, c.h, 0, hi * 1.08, v => fmtSI(v * k));
      drawSeries(c.g, box, s, 0, hi * 1.08, THEME.amber, { fill: true });
    },
  },
  /* The Math page's live panels (livemath.js). */
  mathLive: {
    density: {
      vars: L => [['ρ₀', L.rho0.toFixed(2), 'Rest density, in neighbour-weight units.'], ['ρ̄ / ρ₀', L.mean.toFixed(3), 'Mean density of the liquid over the rest density.'], ['peak', `${L.peak.toFixed(2)}×`, 'The densest particle.']],
      check: L => ({ what: 'Mean density at rest', theory: 1, sim: L.mean, fmt: v => `${v.toFixed(3)} ρ₀`, tol: 0.12, wait: 'Waiting for liquid…' }),
      /* How the particles' densities spread around ρ₀: a narrow peak at 1 is a calm, incompressible liquid. */
      plot: (c, L) => {
        const { g, w, h } = c, B = 40, top = 2.5, hist = new Float64Array(B);
        for (let i = 0; i < L.n; i++) hist[Math.min(B - 1, Math.max(0, Math.floor(L.rho[i] / L.rho0 / top * B)))]++;
        let mx = 1; for (const v of hist) mx = Math.max(mx, v);
        const x0 = 8, x1 = w - 8, y1 = h - 18, bw = (x1 - x0) / B;
        g.fillStyle = THEME.cyan; g.globalAlpha = 0.6;
        hist.forEach((v, k) => { const hh = v / mx * (y1 - 10); g.fillRect(x0 + k * bw + 0.5, y1 - hh, bw - 1, hh); });
        g.globalAlpha = 1; const xr = x0 + (1 / top) * (x1 - x0);
        g.strokeStyle = THEME.amber; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(xr, 6); g.lineTo(xr, y1); g.stroke(); g.setLineDash([]);
        g.font = `400 10px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textBaseline = 'alphabetic';
        g.textAlign = 'left'; g.fillText('0', x0, h - 5); g.textAlign = 'center'; g.fillStyle = THEME.amber; g.fillText('ρ₀', xr, h - 5);
        g.fillStyle = THEME.muted; g.textAlign = 'right'; g.fillText(`${top} ρ₀`, x1, h - 5);
      },
      plotLabel: 'Histogram of particle densities, with the rest density marked',
    },
    pressure: {
      params: ['k', ['kNear', 'k-near']],
      vars: L => [['k', L.p.k.toFixed(3), 'Stiffness: pressure per unit of excess density.'], ['k-near', L.p.kNear.toFixed(3), 'Near stiffness: keeps neighbours from clumping.'], ['P̄', (L.p.k * (L.mean - 1) * L.rho0).toFixed(4), 'The pressure at the mean density, k (ρ̄ − ρ₀), in solver units.']],
      check: L => ({ text: L.peak > 1.5 ? `The bottom is squeezed to ${L.peak.toFixed(2)} ρ₀: raise k to stiffen the liquid against gravity.` : `Densities stay within ${((L.peak - 1) * 100).toFixed(0)} % of rest: k holds the liquid nearly incompressible.`, state: L.peak > 2.2 ? 'crit' : L.peak > 1.5 ? 'warn' : 'ok' }),
    },
    visc: {
      params: ['visc'],
      vars: L => [['σ', L.p.visc.toFixed(2), 'Linear viscosity: how strongly approaching neighbours lose relative speed.'], ['Δt', `${(L.TICK * 1000).toFixed(2)} ms`, 'One solver tick.']],
      check: L => ({ text: L.p.visc > 0.3 ? 'High σ: ripples die within a few sloshes, like syrup.' : L.p.visc > 0 ? 'Some σ: splashes settle while the liquid still flows freely.' : 'σ = 0: only the near-pressure damps motion, so the liquid sloshes for a long time.' }),
    },
    velocity: {
      vars: L => { let vmax = 0; for (let i = 0; i < L.n; i++) vmax = Math.max(vmax, L.vx[i] ** 2 + L.vy[i] ** 2); return [['v max', fmtQ(L, 'speed', Math.sqrt(vmax) * L.U / L.TICK), 'The fastest particle now.'], ['capped', `${(L.clampRate * 100).toFixed(2)} %`, 'Particles that hit the per-tick speed cap.']]; },
      check: L => ({ what: 'Particles at the speed cap', theory: 0, sim: L.clampRate, fmt: v => `${(v * 100).toFixed(2)} %`, text: L.clampRate < 0.002 ? `Only ${(L.clampRate * 100).toFixed(2)} % of particles touch the cap: velocities are the liquid's own.` : `${(L.clampRate * 100).toFixed(2)} % of particles hit the cap: the motion is faster than a tick can follow.`, state: L.clampRate < 0.002 ? 'ok' : L.clampRate < 0.02 ? 'warn' : 'crit' }),
    },
  },
  math: `
    <p>Density and near-density sum over neighbours closer than the interaction radius <i>h</i>, with q = r<sub>ij</sub> / h:</p>
    <div class="f" data-live="density" data-tex="\\rho_i = \\sum_j (1 - q)^2, \\qquad \\rho_i^{\\text{near}} = \\sum_j (1 - q)^3"></div>
    <p>They set a pressure and a near-pressure:</p>
    <div class="f" data-live="pressure" data-tex="P_i = k\\,(\\rho_i - \\rho_0), \\qquad P_i^{\\text{near}} = k^{\\text{near}}\\,\\rho_i^{\\text{near}}"></div>
    <p>Each neighbour pair is pushed apart along r̂<sub>ij</sub>, half to each particle:</p>
    <div class="f" data-tex="\\mathbf D_{ij} = \\Delta t^2 \\left[ P_i\\,(1 - q) + P_i^{\\text{near}}\\,(1 - q)^2 \\right] \\hat{\\mathbf r}_{ij}"></div>
    <p>Approaching pairs lose relative speed <i>u</i> to viscosity:</p>
    <div class="f" data-live="visc" data-tex="\\mathbf I = \\Delta t\\,(1 - q)\\,(\\sigma u + \\beta u^2)\\,\\hat{\\mathbf r}_{ij}"></div>
    <p>Velocities come back from positions, capped at 0.6 h per tick so one bad step cannot explode. Method of <cite>Clavet, Beaudoin &amp; Poulin (2005)</cite>.</p>
    <div class="f" data-live="velocity" data-tex="\\mathbf v = \\frac{\\mathbf x - \\mathbf x_{\\text{prev}}}{\\Delta t}"></div>
    <p>The water surface is drawn on the GPU. Each particle adds a smooth bump to a density field, the liquid is wherever that sum crosses a threshold, and the field’s slope and depth give the highlights and colour.</p>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(fluid, genericState, {
  histBudget: 16e6, histInterval: 0.25,
  snapshot() {
    const n = this.n, a = new Float64Array(n * 4), { gravity, tilt, k, kNear, visc } = this.p;
    for (let i = 0; i < n; i++) { const o = i * 4; a[o] = this.x[i]; a[o + 1] = this.y[i]; a[o + 2] = this.vx[i]; a[o + 3] = this.vy[i]; }
    return { n, a, rho: this.rho.slice(0, n), obs: this.obs.map(o => ({ ...o })), seed: this.seed, p: { gravity, tilt, k, kNear, visc } };
  },
  restore(s) {
    Object.assign(this.p, s.p);
    this.n = s.n;
    for (let i = 0; i < s.n; i++) {
      const o = i * 4;
      this.x[i] = s.a[o]; this.y[i] = s.a[o + 1]; this.vx[i] = s.a[o + 2]; this.vy[i] = s.a[o + 3];
      this.px[i] = this.x[i] - this.vx[i]; this.py[i] = this.y[i] - this.vy[i]; this.rho[i] = s.rho ? s.rho[i] : this.rho0;
    }
    this.obs = s.obs.map(o => ({ ...o })); this.ptr = null; this.seed = s.seed ?? this.seed;
    this.series.truncateAfter(this.t); this.lastSample = this.t;
    return true;
  },
  dataColumns: ['t_s', 'particles', 'mean_density_ratio', 'peak_compression', 'ke_per_particle', 'speed_capped_fraction', 'fastest_px_s', 'obstacles'],
  dataRow() {
    let vmax = 0, ke = 0;
    const s = this.U / this.TICK;
    for (let i = 0; i < this.n; i++) { const s2 = this.vx[i] ** 2 + this.vy[i] ** 2; ke += s2; if (s2 > vmax) vmax = s2; }
    return [this.t, this.n, this.mean, this.peak, this.n ? 0.5 * ke * s * s / this.n : 0, this.clampRate, Math.sqrt(vmax) * s, this.obs.length];
  },
});
