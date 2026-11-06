/*
✒ Metadata
    - Title: Waves Lab (digiSpace Edition - v2.0)
    - File Name: waves.js
    - Relative Path: js/labs/waves.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The 2-D wave equation on a grid with slits, sources, a phased array, a
    glass lens, a moving source and a Relief 3D view.

✒ Key Features:
    - Second-order finite differences with a Courant check and absorbing
      edges.
    - Detector chart of time-averaged intensity along the screen edge.
    - Relief 3D view with the shared orbit camera and picking.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage } from '../core/chart.js';
import { genericState } from '../core/codec.js';
import { RAMP_GLOW, RAMP_WAVE, THEME } from '../core/color.js';
import { brushRing } from '../core/draw.js';

import { FOV3, PITCH0, m4look, m4mul, m4persp } from '../core/math3d.js';
import { TAU, clamp, rand, reduceMotion, wrapAngle } from '../core/util.js';
import { view } from '../core/view.js';
import { reliefGL } from '../render/relief-gl.js';
import { camOf } from '../shell/camera.js';
import { sticky } from '../shell/diagnostics.js';
import { updateDock } from '../shell/dock.js';
import { setParam } from '../shell/lifecycle.js';

import { updateNav } from '../shell/navigator.js';
import { refreshEnabled, syncControl } from '../shell/panel.js';
import { active } from '../shell/state.js';

/* ================================================================== */
/*  Lab 4 · Waves (ripple tank)                                        */
/* ================================================================== */
export const waves = {
  id: 'waves', name: 'Waves', title: 'Ripple tank',
  zoomRange: [0.5, 10],
  eq: '∂<sup>2</sup>u/∂t<sup>2</sup> = c<sup>2</sup>∇<sup>2</sup>u',
  eqTex: '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u',
  aria: 'Wave simulation: a two-dimensional ripple tank',
  blurb: 'The two-dimensional wave equation on a grid, stepped with second-order finite differences. Slits diffract, paired sources interfere, a phased array steers its beam, slower glass bends wavefronts into a focus, and a source outrunning its own waves drags a Mach cone behind it.',
  interact: [
    'Pick a tool from the dock, then click or drag on the tank.',
    '<b>Pulse</b> drops a disturbance. <b>Wall</b> and <b>Erase</b> paint barriers. <b>Source</b> adds an oscillator, or removes one you click. <b>Glass</b> paints a slower medium.',
    'Switch the view to <b>Intensity</b> to see the time-averaged interference pattern, or to <b>Relief 3D</b> to see the water as a lit surface you can orbit. Every tool works in 3D too.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'pulse', label: 'Pulse', key: 'p', icon: 'pulse', hint: 'Click to drop a pulse · drag to leave a wake' },
    { id: 'wall', label: 'Wall', key: 'w', icon: 'wall', hint: 'Drag to paint a barrier' },
    { id: 'erase', label: 'Erase', key: 'e', icon: 'eraser', hint: 'Drag to erase walls and glass' },
    { id: 'source', label: 'Source', key: 's', icon: 'source', hint: 'Click to add an oscillating source · click a source to remove it' },
    { id: 'glass', label: 'Glass', key: 'g', icon: 'glass', hint: 'Drag to paint glass, where waves travel at c / n' },
  ] },
  p: { tool: 'pulse', view: 'disp', c: 60, f: 2.5, gain: 1, damp: 0.02, absorb: true, glassN: 1.6, srcSpeed: 0, phaseStep: 0, relief: 1 },
  presetId: 'double',
  presets: [
    { id: 'ripple', label: 'Open tank', params: { srcSpeed: 0, phaseStep: 0 } },
    { id: 'double', label: 'Double slit', params: { f: 4, srcSpeed: 0, phaseStep: 0 } },
    { id: 'single', label: 'Single slit', params: { f: 4, srcSpeed: 0, phaseStep: 0 } },
    { id: 'twosrc', label: 'Two sources', params: { f: 3, srcSpeed: 0, phaseStep: 0 } },
    { id: 'phased', label: 'Phased array', params: { f: 4, srcSpeed: 0, phaseStep: 45 } },
    { id: 'lens', label: 'Glass lens', params: { f: 4, glassN: 1.6, srcSpeed: 0, phaseStep: 0 } },
    { id: 'doppler', label: 'Moving source', params: { f: 3, srcSpeed: 0.6, phaseStep: 0 } },
  ],
  controls: [
    { type: 'seg', key: 'view', label: 'View', options: [['disp', 'Displacement'], ['int', 'Intensity'], ['relief', 'Relief 3D']] },
    { type: 'range', key: 'c', label: 'Wave speed c', min: 20, max: 120, step: 1, unit: 'cells/s' },
    { type: 'range', key: 'f', label: 'Source frequency f', min: 0.5, max: 8, step: 0.1, unit: 'Hz' },
    { type: 'range', key: 'phaseStep', label: 'Source phase step Δφ', min: -180, max: 180, step: 1, unit: '°', note: 'Each point source lags the one before it by Δφ.' },
    { type: 'range', key: 'srcSpeed', label: 'Source speed', min: 0, max: 1.8, step: 0.01, fmt: v => v.toFixed(2) + '× c' },
    { type: 'range', key: 'glassN', label: 'Glass refractive index n', min: 1.1, max: 2.5, step: 0.05 },
    { type: 'range', key: 'damp', label: 'Damping γ', min: 0, max: 1.5, step: 0.01, unit: '/s' },
    { type: 'range', key: 'gain', label: 'Display gain', min: 0.25, max: 4, log: true, fmt: v => v.toFixed(2) + '×' },
    { type: 'range', key: 'relief', label: 'Relief height', min: 0.25, max: 4, log: true, fmt: v => v.toFixed(2) + '×', note: 'Vertical exaggeration of the 3D surface.' },
    { type: 'toggle', key: 'absorb', label: 'Absorbing edges' },
  ],
  actions: [
    { label: 'Calm the water', run() { waves.u.fill(0); waves.u0.fill(0); waves.inten.fill(0); } },
    { label: 'Clear walls and glass', run() { waves.wall.fill(0); waves.glass.fill(0); waves.geomVer++; refreshEnabled(); } },
    { label: 'Remove sources', run() { waves.sources = []; refreshEnabled(); } },
  ],
  Nx: 2, Ny: 2, cs: 4, Ls: 20, u: null, u0: null, wall: null, glass: null, sponge: null, inten: null, slits: null,
  off: null, octx: null, img: null, sources: [], time: 0, drawing: false, last: null, lastPulse: null,
  steps: 0, stepClock: 0, stepRate: 0, maxU: 0, cam3: null, view3: null, flatView: 'disp',
  dt() { return 0.5 / this.p.c; }, maxSteps: 24,

  setup(w, h) {
    this.cs = clamp(Math.round(Math.sqrt(w * h / 42000)), 3, 6);
    const Nx = Math.ceil(w / this.cs), Ny = Math.ceil(h / this.cs), N = Nx * Ny;
    if (Nx !== this.Nx || Ny !== this.Ny) this.cam3 = null;
    this.Nx = Nx; this.Ny = Ny;
    this.u = new Float32Array(N); this.u0 = new Float32Array(N); this.inten = new Float32Array(N);
    this.wall = new Uint8Array(N); this.glass = new Uint8Array(N); this.sponge = new Float32Array(N);
    this.Ls = clamp(Math.round(Math.min(Nx, Ny) * 0.12), 10, 26);
    for (let y = 0; y < Ny; y++) for (let x = 0; x < Nx; x++) {
      const d = Math.min(x, y, Nx - 1 - x, Ny - 1 - y);
      this.sponge[y * Nx + x] = d < this.Ls ? ((this.Ls - d) / this.Ls) ** 2 : 0;
    }
    this.geomVer = (this.geomVer || 0) + 1;
    this.off = document.createElement('canvas'); this.off.width = Nx; this.off.height = Ny;
    this.octx = this.off.getContext('2d'); this.img = this.octx.createImageData(Nx, Ny);
  },
  build(preset, w, h) {
    this.setup(w, h); this.sources = []; this.time = 0; this.maxU = 0; this.slits = null;
    const Nx = this.Nx, Ny = this.Ny, cy = Ny / 2, Ls = this.Ls;
    const point = (x, y) => this.sources.push({ type: 'point', x, y, phase: 0, t0: 0, dir: 1 });
    const lineSource = () => this.sources.push({ type: 'line', x: Ls + 2, y: 0, phase: 0, t0: 0, dir: 1 });
    const barrier = (bx, open) => { for (let y = 1; y < Ny - 1; y++) if (!open(y)) for (let k = 0; k < 2; k++) this.wall[y * Nx + bx + k] = 1; };
    if (preset === 'ripple') {
      for (let k = 0; k < 3; k++) this.pulse(rand(Nx * 0.25, Nx * 0.75), rand(Ny * 0.25, Ny * 0.75), 2.4);
    } else if (preset === 'double') {
      const bx = Math.round(Nx * 0.36), half = Math.round(Ny * 0.12);
      barrier(bx, y => Math.abs(y - (cy - half)) <= 2 || Math.abs(y - (cy + half)) <= 2);
      lineSource(); this.slits = { x: bx + 1, d: 2 * half };
    } else if (preset === 'single') {
      barrier(Math.round(Nx * 0.36), y => Math.abs(y - cy) <= 8);
      lineSource();
    } else if (preset === 'twosrc') {
      const off = Math.round(Ny * 0.16);
      point(Nx * 0.3, cy - off); point(Nx * 0.3, cy + off);
    } else if (preset === 'phased') {
      const d = this.p.c / this.p.f / 2;
      for (let k = 0; k < 8; k++) point(Nx * 0.2, cy + (k - 3.5) * d);
    } else if (preset === 'lens') {
      const xL = Nx * 0.42, R = Ny * 0.75, t2 = Ny * 0.08;
      for (let y = 0; y < Ny; y++) for (let x = 0; x < Nx; x++) {
        const a = (x - (xL - (R - t2))) ** 2 + (y - cy) ** 2 < R * R, b = (x - (xL + (R - t2))) ** 2 + (y - cy) ** 2 < R * R;
        if (a && b) this.glass[y * Nx + x] = 1;
      }
      lineSource();
    } else if (preset === 'doppler') {
      point(Nx * 0.25, cy);
    }
  },
  worldRect() { return { w: this.Nx * this.cs, h: this.Ny * this.cs }; },
  unit() { return { name: 'cells', k: 1 / this.cs }; },
  onParam(key) {
    if (key !== 'view') return;
    if (this.p.view !== 'relief') this.flatView = this.p.view;
    else if (!reliefGL.init()) { this.leave3D('3D relief needs WebGL 2, which this browser did not provide, so the tank stays flat.'); return; }
    if (this === active) { updateNav(); updateDock(); refreshEnabled(); }
  },
  leave3D(msg) {
    this.p.view = this.flatView || 'disp';
    if (this === active) { syncControl('view'); updateNav(); updateDock(); }
    sticky({ id: 'w-3d', level: 'info', title: '3D relief is unavailable', body: msg }, 12);
  },
  drawFixes() { return this.p.view === 'relief' ? [{ label: 'Flat view', run() { setParam(waves, 'view', waves.flatView || 'disp'); } }] : []; },
  navExtras: [{ id: 'relief', label: '3D relief', icon: 'cube', title: 'Switch between the flat tank and the 3D relief',
    pressed: () => waves.p.view === 'relief', run() { setParam(waves, 'view', waves.p.view === 'relief' ? (waves.flatView || 'disp') : 'relief'); } }],
  mini(g) { g.imageSmoothingEnabled = true; g.drawImage(this.off, 0, 0, this.Nx * this.cs, this.Ny * this.cs); },
  /* ---- 3D relief camera: orbit (yaw, pitch), dolly (dist), pan (target on the water plane) ---- */
  is3D() { return this.p.view === 'relief'; },
  dist0() { const a = view.w / Math.max(1, view.h), t = Math.tan(FOV3 / 2); return Math.max(this.Nx / (2 * t * a), this.Ny / (2 * t) * 0.9) * 1.5; },
  c3() {
    if (!this.cam3) { const D = this.dist0(); this.cam3 = { yaw: 0, pitch: PITCH0, dist: D, tx: 0, tz: 0, yawT: 0, pitchT: PITCH0, distT: D, txT: 0, tzT: 0 }; }
    return this.cam3;
  },
  camMatrices(w, h) {
    const c = this.c3(), cp = Math.cos(c.pitch), e = [c.tx + c.dist * cp * Math.sin(c.yaw), c.dist * Math.sin(c.pitch), c.tz + c.dist * cp * Math.cos(c.yaw)];
    const V = m4look(e, [c.tx, 0, c.tz], [0, 1, 0]), P = m4persp(FOV3, w / Math.max(1, h), c.dist * 0.02, c.dist * 6 + Math.max(this.Nx, this.Ny) * 2);
    return { mvp: m4mul(P, V.m), eye: e, r: V.r, u: V.u, f: V.f, w, h };
  },
  basis3() { return this.view3 || (this.view3 = this.camMatrices(view.w, view.h)); },
  project3(x, y, z) {
    const V = this.view3; if (!V) return null;
    const m = V.mvp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return cw > 1e-6 ? { x: (cx / cw + 1) * 0.5 * V.w, y: (1 - cy / cw) * 0.5 * V.h } : null;
  },
  pick3(s) {
    const V = this.basis3(), t = Math.tan(FOV3 / 2), a = view.w / Math.max(1, view.h);
    const nx = (2 * s.x / view.w - 1) * t * a, ny = (1 - 2 * s.y / view.h) * t;
    const d = [V.f[0] + V.r[0] * nx + V.u[0] * ny, V.f[1] + V.r[1] * nx + V.u[1] * ny, V.f[2] + V.r[2] * nx + V.u[2] * ny];
    if (d[1] > -1e-4) return null;
    const k = -V.eye[1] / d[1];
    return { x: (V.eye[0] + d[0] * k + this.Nx / 2) * this.cs, y: (V.eye[2] + d[2] * k + this.Ny / 2) * this.cs };
  },
  clampT3() {
    const c = this.c3(), X = this.Nx / 2, Z = this.Ny / 2;
    c.tx = clamp(c.tx, -X, X); c.tz = clamp(c.tz, -Z, Z); c.txT = clamp(c.txT, -X, X); c.tzT = clamp(c.tzT, -Z, Z);
  },
  orbit3(dx, dy) { const c = this.c3(); c.yaw = c.yawT = c.yawT - dx * 0.008; c.pitch = c.pitchT = clamp(c.pitchT + dy * 0.006, 0.08, 1.553); },
  pan3(dx, dy) {
    const c = this.c3(), k = 2 * c.dist * Math.tan(FOV3 / 2) / Math.max(1, view.h), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), sp = Math.max(0.35, Math.sin(c.pitch));
    c.tx += -cy * dx * k - sy * dy * k / sp; c.tz += sy * dx * k - cy * dy * k / sp;
    c.txT = c.tx; c.tzT = c.tz; this.clampT3();
  },
  zoom3(f, s, instant) {
    const c = this.c3(), D0 = this.dist0(), nd = clamp(c.distT / f, D0 * 0.12, D0 * 3);
    if (s) {
      const p = this.pick3(s);
      if (p) { const k = 1 - nd / c.distT, hx = p.x / this.cs - this.Nx / 2, hz = p.y / this.cs - this.Ny / 2; c.txT += (hx - c.txT) * k; c.tzT += (hz - c.tzT) * k; this.clampT3(); }
    }
    c.distT = nd;
    if (instant || reduceMotion) { c.dist = c.distT; c.tx = c.txT; c.tz = c.tzT; }
  },
  actual3() { this.c3().distT = this.dist0(); },
  zoomPct3() { return this.dist0() / this.c3().dist * 100; },
  frame3() { Object.assign(this.c3(), { yawT: Math.round(this.c3().yaw / TAU) * TAU, pitchT: PITCH0, distT: this.dist0(), txT: 0, tzT: 0 }); },
  snap3(id) {
    const c = this.c3(), S = { x: Math.PI / 2, '-x': -Math.PI / 2, y: Math.PI, '-y': 0 };
    if (id === 'z') { c.yawT = Math.round(c.yaw / TAU) * TAU; c.pitchT = 1.553; return; }
    if (!(id in S)) return;
    c.yawT = c.yaw + wrapAngle(S[id] - c.yaw); c.pitchT = 0.24;
  },
  tick3(real) {
    const c = this.c3(), k = reduceMotion ? 1 : 1 - Math.exp(-real * 12);
    c.yaw += wrapAngle(c.yawT - c.yaw) * k; c.pitch += (c.pitchT - c.pitch) * k;
    c.dist *= Math.pow(c.distT / c.dist, k); c.tx += (c.txT - c.tx) * k; c.tz += (c.tzT - c.tz) * k;
  },
  draw3(g, w, h) {
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    if (!reliefGL.render(this, w, h)) { this.leave3D('The 3D renderer stopped (WebGL 2 failed or its context was lost), so the tank is back to the flat view.'); return; }
    g.imageSmoothingEnabled = true; g.drawImage(reliefGL.canvas, 0, 0, w, h);
    const Nx = this.Nx, Ny = this.Ny, P = (x, y, hh = 0) => this.project3(x - Nx / 2, hh, y - Ny / 2);
    const poly = (pts, close) => { g.beginPath(); let pen = false; for (const q of pts) { if (!q) { pen = false; continue; } pen ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); pen = true; } if (close) g.closePath(); g.stroke(); };
    const ring = (cx, cy, r, hh, n = 24) => Array.from({ length: n + 1 }, (_, i) => P(cx + r * Math.cos(i / n * TAU), cy + r * Math.sin(i / n * TAU), hh));
    g.save(); g.lineWidth = 1;
    if (this.p.absorb) { const L = this.Ls; g.strokeStyle = THEME.muted; g.globalAlpha = 0.3; g.setLineDash([2, 6]); poly([P(L, L), P(Nx - L, L), P(Nx - L, Ny - L), P(L, Ny - L)], true); }
    const xd = this.detectorX();
    g.setLineDash([5, 5]); g.strokeStyle = THEME.cyan; g.globalAlpha = 0.75; g.lineWidth = 1.3; poly([P(xd, 0, 0.4), P(xd, Ny - 1, 0.4)]);
    g.setLineDash([]); g.globalAlpha = 1;
    let k = 0;
    for (const src of this.sources) {
      g.strokeStyle = THEME.amber; g.fillStyle = THEME.amber; g.lineWidth = 2;
      if (src.type === 'line') { g.globalAlpha = 0.75; poly([P(src.x, 1, 0.5), P(src.x, Ny - 2, 0.5)]); g.globalAlpha = 1; continue; }
      const b = P(src.x, src.y, 0), t = P(src.x, src.y, 10);
      poly(ring(src.x, src.y, 2.4, 0.3));
      if (b && t) {
        g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(t.x, t.y); g.stroke(); g.beginPath(); g.arc(t.x, t.y, 3.5, 0, TAU); g.fill();
        if (this.p.phaseStep !== 0 && this.pointCount() > 1) {
          const ph = ((-k * this.p.phaseStep) % 360 + 360) % 360;
          g.font = `400 10px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(`${ph.toFixed(0)}°`, t.x - 8, t.y);
        }
      }
      k++;
    }
    const hv = this.hover;
    if (hv && this.p.tool !== 'source') {
      g.strokeStyle = THEME.text; g.globalAlpha = 0.6; g.setLineDash([3, 4]);
      poly(ring(hv.x / this.cs, hv.y / this.cs, { pulse: 3, wall: 1.6, erase: 3.2, glass: 3.2 }[this.p.tool], 0.4, 32));
    }
    g.restore();
  },
  pointCount() { let n = 0; for (const s of this.sources) if (s.type === 'point') n++; return n; },
  enabled(key) {
    const points = this.pointCount();
    if (key === 'f') return this.sources.length ? true : 'Add a source with the Source tool to use this.';
    if (key === 'srcSpeed') return points ? true : 'Moves point sources; add one with the Source tool.';
    if (key === 'phaseStep') return points > 1 ? true : 'Needs two or more point sources.';
    if (key === 'glassN') return this.glass && this.glass.includes(1) ? true : 'Paint glass, or load the Glass lens scene.';
    if (key === 'relief') return this.p.view === 'relief' ? true : 'Shapes the Relief 3D view.';
    return true;
  },
  pulse(cx, cy, amp, rad = 3) {
    const Nx = this.Nx, Ny = this.Ny, R = Math.ceil(rad * 2.5), r2 = rad * rad;
    for (let y = Math.max(1, Math.floor(cy - R)); y <= Math.min(Ny - 2, Math.ceil(cy + R)); y++)
      for (let x = Math.max(1, Math.floor(cx - R)); x <= Math.min(Nx - 2, Math.ceil(cx + R)); x++) {
        const i = y * Nx + x; if (this.wall[i]) continue;
        const v = amp * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / r2);
        this.u[i] += v; this.u0[i] += v;
      }
  },
  paint(cx, cy, rad, fn) {
    const Nx = this.Nx, Ny = this.Ny;
    for (let y = Math.max(1, Math.floor(cy - rad)); y <= Math.min(Ny - 2, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(1, Math.floor(cx - rad)); x <= Math.min(Nx - 2, Math.ceil(cx + rad)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) fn(y * Nx + x);
  },
  applySources(dt) {
    const Nx = this.Nx, Ny = this.Ny, u = this.u, wall = this.wall, w = TAU * this.p.f, t = this.time, dphi = this.p.phaseStep * Math.PI / 180;
    const lo = this.Ls + 3, hi = Nx - this.Ls - 4;
    let k = 0;
    for (const s of this.sources) {
      if (s.type === 'point' && this.p.srcSpeed > 0) {
        s.x += s.dir * this.p.srcSpeed * this.p.c * dt;
        if (s.x > hi) { s.x = hi; s.dir = -1; } else if (s.x < lo) { s.x = lo; s.dir = 1; }
      }
      const phase = s.type === 'point' ? s.phase - k++ * dphi : s.phase;
      const env = Math.min(1, (t - s.t0) / 0.6), val = env * Math.sin(w * (t - s.t0) + phase);
      if (s.type === 'line') {
        const x = Math.round(s.x);
        for (let y = 1; y < Ny - 1; y++) { const i = y * Nx + x; if (!wall[i]) u[i] = val; }
      } else {
        const cx = Math.round(s.x), cy = Math.round(s.y);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const r2 = dx * dx + dy * dy; if (r2 > 5) continue;
          const x = cx + dx, y = cy + dy; if (x < 1 || y < 1 || x > Nx - 2 || y > Ny - 2) continue;
          const i = y * Nx + x; if (wall[i]) continue;
          const wgt = Math.exp(-r2 / 1.5); u[i] = u[i] * (1 - wgt) + val * wgt;
        }
      }
    }
  },
  step(dt) {
    const Nx = this.Nx, Ny = this.Ny, wall = this.wall, glass = this.glass, sp = this.sponge;
    this.time += dt;
    this.applySources(dt);
    const u = this.u, u0 = this.u0, c = this.p.c, k0 = (c * dt) ** 2, kG = k0 / (this.p.glassN ** 2), gam = this.p.damp, sMax = this.p.absorb ? 0.75 * c : 0;
    for (let y = 1; y < Ny - 1; y++) {
      const row = y * Nx;
      for (let x = 1; x < Nx - 1; x++) {
        const i = row + x;
        if (wall[i]) { u0[i] = 0; continue; }
        const lap = u[i - 1] + u[i + 1] + u[i - Nx] + u[i + Nx] - 4 * u[i], g = (gam + sMax * sp[i]) * dt * 0.5;
        u0[i] = (2 * u[i] - (1 - g) * u0[i] + (glass[i] ? kG : k0) * lap) / (1 + g);
      }
    }
    this.u = u0; this.u0 = u;
    const I = this.inten, nu = this.u, a = dt / 1.2;
    for (let i = 0, N = nu.length; i < N; i++) I[i] += (nu[i] * nu[i] - I[i]) * a;
    this.steps++;
  },
  after(simDt) {
    this.stepClock += simDt;
    if (this.stepClock >= 0.5) {
      this.stepRate = this.steps / this.stepClock; this.steps = 0; this.stepClock = 0;
      let m = 0; const u = this.u; for (let i = 0; i < u.length; i += 7) { const v = Math.abs(u[i]); if (v > m) m = v; } this.maxU = m;
    }
  },
  /* Clear of the corners where the sponges meet, which brighten a fringe that lands there. */
  detectorX() { return this.p.absorb ? this.Nx - this.Ls - 12 : this.Nx - 8; },
  toCell(p) { return { x: p.x / this.cs, y: p.y / this.cs }; },
  applyTool(p, first) {
    const c = this.toCell(p), tool = this.p.tool;
    if (tool === 'pulse') {
      if (first || !this.lastPulse || Math.hypot(c.x - this.lastPulse.x, c.y - this.lastPulse.y) > 3) { this.pulse(c.x, c.y, first ? 2.4 : 0.9); this.lastPulse = c; }
      return;
    }
    if (tool === 'source') {
      if (!first) return;
      const near = this.sources.findIndex(s => s.type === 'point' && Math.hypot(s.x - c.x, s.y - c.y) < 4);
      if (near >= 0) this.sources.splice(near, 1);
      else this.sources.push({ type: 'point', x: c.x, y: c.y, phase: 0, t0: this.time, dir: 1 });
      refreshEnabled();
      return;
    }
    const from = first || !this.last ? c : this.last, steps = Math.max(1, Math.ceil(Math.hypot(c.x - from.x, c.y - from.y)));
    for (let s = 0; s <= steps; s++) {
      const x = from.x + (c.x - from.x) * s / steps, y = from.y + (c.y - from.y) * s / steps;
      if (tool === 'wall') this.paint(x, y, 1.6, i => { this.wall[i] = 1; this.u[i] = 0; this.u0[i] = 0; });
      else if (tool === 'erase') this.paint(x, y, 3.2, i => { this.wall[i] = 0; this.glass[i] = 0; });
      else if (tool === 'glass') this.paint(x, y, 3.2, i => { if (!this.wall[i]) this.glass[i] = 1; });
    }
    this.last = c; this.geomVer = (this.geomVer || 0) + 1;
    if (tool === 'glass' || tool === 'erase') refreshEnabled();
  },
  cursorAt() { return this.p.tool === 'source' ? 'copy' : 'crosshair'; },
  pointerDown(p) { this.drawing = true; this.last = null; this.applyTool(p, true); },
  pointerMove(p, e, down) { if (down && this.drawing) this.applyTool(p, false); },
  pointerUp() { this.drawing = false; this.last = null; this.lastPulse = null; },
  draw(g, w, h) {
    if (this.is3D()) { this.draw3(g, w, h); return; }
    const Nx = this.Nx, Ny = this.Ny, N = Nx * Ny, u = this.u, I = this.inten, wall = this.wall, glass = this.glass, d = this.img.data;
    const disp = this.p.view === 'disp', gain = this.p.gain, RW = RAMP_WAVE.rgb, RG = RAMP_GLOW.rgb;
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      let r, gg, b;
      if (wall[i]) { r = 74; gg = 83; b = 98; }
      else {
        if (disp) { const v = u[i] * gain, idx = clamp((256 + (v / (1 + Math.abs(v))) * 255) | 0, 0, 511) * 3; r = RW[idx]; gg = RW[idx + 1]; b = RW[idx + 2]; }
        else { const v = Math.sqrt(I[i]) * gain * 1.4, idx = clamp(((1 - Math.exp(-v)) * 255) | 0, 0, 255) * 3; r = RG[idx]; gg = RG[idx + 1]; b = RG[idx + 2]; }
        if (glass[i]) { r = r * 0.72 + 26; gg = gg * 0.72 + 52; b = b * 0.72 + 66; }
      }
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    this.octx.putImageData(this.img, 0, 0);
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.off, 0, 0, Nx * this.cs, Ny * this.cs);
    const cs = this.cs, px = 1 / camOf(this).z;
    if (this.p.absorb) {
      g.strokeStyle = THEME.muted; g.globalAlpha = 0.22; g.setLineDash([2 * px, 6 * px]); g.lineWidth = px;
      g.strokeRect(this.Ls * cs, this.Ls * cs, (Nx - 2 * this.Ls) * cs, (Ny - 2 * this.Ls) * cs);
      g.globalAlpha = 1;
    }
    const xd = this.detectorX() * cs;
    g.setLineDash([5 * px, 5 * px]); g.strokeStyle = THEME.cyan; g.globalAlpha = 0.65; g.lineWidth = 1.2 * px;
    g.beginPath(); g.moveTo(xd, 0); g.lineTo(xd, h); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    let k = 0;
    for (const s of this.sources) {
      g.strokeStyle = THEME.amber; g.fillStyle = THEME.amber; g.lineWidth = 2 * px;
      if (s.type === 'line') { g.globalAlpha = 0.6; g.fillRect(Math.round(s.x) * cs - px, 0, 3 * px, h); g.globalAlpha = 1; continue; }
      g.beginPath(); g.arc(s.x * cs, s.y * cs, 6 * px, 0, TAU); g.stroke(); g.beginPath(); g.arc(s.x * cs, s.y * cs, 2 * px, 0, TAU); g.fill();
      if (this.p.phaseStep !== 0 && this.pointCount() > 1) {
        const ph = ((-k * this.p.phaseStep) % 360 + 360) % 360;
        g.font = `400 ${10 * px}px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(`${ph.toFixed(0)}°`, s.x * cs - 10 * px, s.y * cs);
      }
      k++;
    }
    const hv = this.hover;
    if (hv && this.p.tool !== 'source') brushRing(g, hv, { pulse: 3, wall: 1.6, erase: 3.2, glass: 3.2 }[this.p.tool] * cs, THEME.text);
  },
  steering() {
    const pts = this.sources.filter(s => s.type === 'point');
    if (pts.length < 2) return null;
    const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), lam = this.p.c / this.p.f, s = (this.p.phaseStep * Math.PI / 180) * lam / (TAU * d);
    return { d, lam, s };
  },
  /* Fringe spacing measured on the detector: twice the offset of the first dark band each side of the centre.
     That band sits at half the angle of the next bright fringe, so it stays on the detector in a short tank. NaN until one shows. */
  fringeSpacing() {
    const xd = this.detectorX(), Nx = this.Nx, I = this.inten, lo = this.Ls + 1, hi = this.Ny - this.Ls - 2, mid = this.Ny >> 1, at = y => I[y * Nx + xd];
    let top = 0; for (let y = lo; y <= hi; y++) top = Math.max(top, at(y));
    const darkFrom = dir => {
      let low = Infinity, yl = mid;
      for (let y = mid; y >= lo && y <= hi; y += dir) {
        const v = at(y);
        if (v < low) { low = v; yl = y; } else if (low < 0.5 * top && v > low + 0.25 * top) return Math.abs(yl - mid);
      }
      return NaN;
    };
    const d = top > 1e-4 ? [darkFrom(1), darkFrom(-1)].filter(Number.isFinite) : [];
    return d.length ? d.reduce((a, v) => a + v) / d.length * 2 : NaN;
  },
  /* The same spacing from the slit geometry at frequency f: 2 L tan θ with sin θ = λ/2d. */
  fringeTheory(f) { const s = Math.min(0.999, this.p.c / f / (2 * this.slits.d)); return 2 * (this.detectorX() - this.slits.x) * s / Math.sqrt(1 - s * s); },
  /* Degrees off the axis of the beam: the centre of the bright lobe on an arc ahead of the point sources. NaN until waves reach it. */
  beamAngle() {
    const pts = this.sources.filter(s => s.type === 'point'), Nx = this.Nx, Ny = this.Ny, Ls = this.Ls, n = pts.length, arc = [];
    const cx = pts.reduce((a, s) => a + s.x, 0) / n, cy = pts.reduce((a, s) => a + s.y, 0) / n, R = Math.min(Nx - Ls - 3 - cx, (Ny / 2 - Ls - 2) * Math.SQRT2);
    let top = 0, sum = 0, mass = 0;
    for (let a = -80; a <= 80; a++) {
      const t = a * Math.PI / 180, x = Math.round(cx + R * Math.cos(t)), y = Math.round(cy + R * Math.sin(t));
      if (x <= Ls || y <= Ls || x >= Nx - Ls - 1 || y >= Ny - Ls - 1) continue;
      const v = this.inten[y * Nx + x]; arc.push([a, v]); top = Math.max(top, v);
    }
    for (const [a, v] of arc) if (v >= 0.5 * top) { sum += a * v; mass += v; }
    return top > 1e-4 ? sum / mass : NaN;
  },
  readouts() {
    const c = this.p.c, lam = c / this.p.f, hasGlass = this.glass && this.glass.includes(1), st = this.steering();
    return [
      ['Grid', `${this.Nx} × ${this.Ny} cells · ${this.cs} px`],
      ['Courant number cΔt/Δx', (c * this.dt()).toFixed(2), 'ok'],
      ['Wavelength λ = c/f', this.sources.length ? `${lam.toFixed(1)} cells${hasGlass ? ` · ${(lam / this.p.glassN).toFixed(1)} in glass` : ''}` : '—', this.sources.length ? (lam / (hasGlass ? this.p.glassN : 1) < 8 ? 'warn' : 'ok') : undefined],
      ['Sources', String(this.sources.length)],
      ['Beam steering angle', st && this.p.phaseStep !== 0 ? (Math.abs(st.s) <= 1 ? `${(Math.asin(st.s) * 180 / Math.PI).toFixed(1)}°` : 'no main beam') : '—'],
      ['Solver steps per second', this.stepRate.toFixed(0)],
    ];
  },
  diagnose() {
    const out = [], lam = this.p.c / this.p.f, hasGlass = this.glass && this.glass.includes(1), lamMin = lam / (hasGlass ? this.p.glassN : 1);
    if (this.sources.length && lamMin < 8) {
      const fNew = Math.max(0.5, Math.floor(this.p.c / (hasGlass ? this.p.glassN : 1) / 10 * 10) / 10);
      out.push({ id: 'w-lambda', level: lamMin < 5 ? 'crit' : 'warn', title: 'Wavelength is under-resolved', body: `Waves are only <b>${lamMin.toFixed(1)} cells</b> long${hasGlass ? ' inside the glass' : ''}. Below about 8 cells per wavelength the grid slows short waves down (numerical dispersion), so wavefronts smear into ripples and checkerboards.`,
        fixes: [{ label: `Lower f to ${fNew} Hz`, run() { setParam(waves, 'f', fNew); } }] });
    }
    if (this.maxU > 12) out.push({ id: 'w-pile', level: 'warn', title: 'Energy is piling up', body: `Displacement has reached <b>${this.maxU.toFixed(1)}</b>. Sources keep pumping energy in${this.p.absorb ? '' : ' and the reflecting edges keep it in the tank'}, building standing waves.`,
      fixes: [...(this.p.absorb ? [] : [{ label: 'Absorbing edges', run() { setParam(waves, 'absorb', true); } }]), { label: 'Calm the water', run() { waves.u.fill(0); waves.u0.fill(0); waves.inten.fill(0); } }] });
    const pts = this.pointCount();
    if (pts && this.p.srcSpeed > 0) {
      const M = this.p.srcSpeed;
      out.push(M > 1
        ? { id: 'w-mach', level: 'info', title: `Supersonic: Mach ${M.toFixed(2)}`, body: `The source outruns its own waves, which pile up into a cone of half-angle asin(1/M) = <b>${(Math.asin(1 / M) * 180 / Math.PI).toFixed(1)}°</b>.` }
        : { id: 'w-doppler', level: 'info', title: `Doppler shift at ${M.toFixed(2)}× c`, body: `Ahead of the source the frequency rises to f/(1−M) = <b>${(this.p.f / (1 - M)).toFixed(2)} Hz</b>; behind it falls to f/(1+M) = <b>${(this.p.f / (1 + M)).toFixed(2)} Hz</b>.` });
    }
    const st = this.steering();
    if (st && pts > 2 && this.p.phaseStep !== 0) {
      out.push(Math.abs(st.s) <= 1
        ? { id: 'w-steer', level: 'info', title: 'Beam steering', body: `Sources ${st.d.toFixed(1)} cells apart with Δφ = ${this.p.phaseStep}° tilt the main beam by asin(Δφ λ / 2πd) = <b>${(Math.asin(st.s) * 180 / Math.PI).toFixed(1)}°</b>.${st.d > lam / 2 + 0.5 ? ' Spacing above λ/2 also lets grating lobes appear.' : ''}` }
        : { id: 'w-steer', level: 'info', title: 'No main beam', body: `With Δφ = ${this.p.phaseStep}° the required steering sine is ${st.s.toFixed(2)}, beyond 1, so the array cannot form a forward beam; energy leaks into side lobes.` });
    }
    if (!this.p.absorb) out.push({ id: 'w-reflect', level: 'info', title: 'Edges reflect', body: 'With absorbing edges off, every wave bounces back from the walls and the tank fills with standing patterns.' });
    return out;
  },
  perfFixes() { return this.p.c > 70 ? [{ label: 'Wave speed 60', run() { setParam(waves, 'c', 60); } }] : []; },
  sane() { const u = this.u; for (let i = 0; i < u.length; i += 97) if (!Number.isFinite(u[i])) return false; return true; },
  chart: {
    title: 'Detector screen',
    caption: 'Time-averaged intensity ⟨u²⟩ along the dashed cyan line near the right edge, top of the tank at left. Slits and paired sources print fringes here.',
    draw(c) {
      const W = waves, xd = W.detectorX(), Ny = W.Ny, I = W.inten;
      if (!I) return;
      let hi = 0;
      for (let y = 0; y < Ny; y++) hi = Math.max(hi, I[y * W.Nx + xd]);
      if (hi < 1e-6) { chartMessage(c.g, c.w, c.h, 'No waves at the detector yet'); return; }
      const box = chartFrame(c.g, c.w, c.h, 0, hi * 1.1, v => v.toFixed(v >= 1 ? 1 : 2)), g = c.g, sx = y => box.x0 + y / (Ny - 1) * (box.x1 - box.x0);
      const path = () => { g.beginPath(); for (let y = 0; y < Ny; y++) { const X = sx(y), Y = box.sy(I[y * W.Nx + xd]); y ? g.lineTo(X, Y) : g.moveTo(X, Y); } };
      path(); g.lineTo(box.x1, box.y1); g.lineTo(box.x0, box.y1); g.closePath();
      g.globalAlpha = 0.18; g.fillStyle = THEME.cyan; g.fill(); g.globalAlpha = 1;
      path(); g.strokeStyle = THEME.cyan; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = THEME.muted; g.font = `400 10px ${THEME.mono}`; g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillText('top', box.x0, c.h - 5); g.textAlign = 'right'; g.fillText('bottom', box.x1, c.h - 5);
    },
  },
  math: `
    <p>The tank steps the wave equation with leapfrog finite differences, the five-point Laplacian and damping γ:</p>
    <div class="f" data-tex="u^{n+1} = 2u^n - u^{n-1} + \\frac{c^2\\,\\Delta t^2}{\\Delta x^2}\\,\\nabla^2 u^n"></div>
    <p>It is stable while the Courant number cΔt/Δx stays at or below 1/√2; this tank always steps at 0.5. Accuracy needs about eight cells per wavelength.</p>
    <p>Glass of index <i>n</i> slows the wave to c/n, shortening the wavelength and bending wavefronts by Snell’s law:</p>
    <div class="f" data-tex="n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2"></div>
    <p>Fringe spacing on a screen at distance <i>L</i> from two slits <i>d</i> apart:</p>
    <div class="f" data-tex="\\Delta y \\approx \\frac{\\lambda L}{d}"></div>
    <p>A row of sources spaced <i>d</i> apart, each lagging the last by Δφ, steers its beam to:</p>
    <div class="f" data-tex="\\sin\\theta = \\frac{\\Delta\\varphi\\,\\lambda}{2\\pi d}"></div>
    <p>A source faster than the wave (v<sub>s</sub> &gt; c) leaves a Mach cone of half-angle:</p>
    <div class="f" data-tex="\\sin\\theta = \\frac{c}{v_s}"></div>
    <p>The Relief 3D view lifts each cell to a compressed height, so strong sources stay readable, and shades it from the surface normal. Walls stand as raised blocks; glass is tinted.</p>
    <div class="f" data-tex="h = \\frac{H\\,u}{1 + |u|/2}, \\qquad \\hat{\\mathbf n} \\propto \\left(-\\frac{\\partial h}{\\partial x},\\ 1,\\ -\\frac{\\partial h}{\\partial y}\\right)"></div>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(waves, genericState, {
  histBudget: 36e6, histInterval: 0.5, geomVer: 0,
  snapshot() {
    if (!this._geom || this._geom.v !== this.geomVer) this._geom = { v: this.geomVer, wall: this.wall.slice(), glass: this.glass.slice() };
    const { c, f, damp, absorb, glassN, srcSpeed, phaseStep } = this.p;
    return { Nx: this.Nx, Ny: this.Ny, u: this.u.slice(), u0: this.u0.slice(), inten: this.inten.slice(), shared: this._geom, sources: this.sources.map(s => ({ ...s })), time: this.time, p: { c, f, damp, absorb, glassN, srcSpeed, phaseStep } };
  },
  restore(s) {
    if (s.Nx !== this.Nx || s.Ny !== this.Ny) return false;
    Object.assign(this.p, s.p);
    this.u.set(s.u); this.u0.set(s.u0); this.wall.set(s.shared.wall); this.glass.set(s.shared.glass);
    this.geomVer++; this._geom = null;
    this.sources = s.sources.map(x => ({ ...x })); this.time = s.time;
    if (s.inten) this.inten.set(s.inten); else this.inten.fill(0);
    if (this === active) refreshEnabled();
    return true;
  },
  detector() {
    const xd = this.detectorX(); let sum = 0, peak = 0;
    for (let y = 0; y < this.Ny; y++) { const v = this.inten[y * this.Nx + xd]; sum += v; if (v > peak) peak = v; }
    return { mean: sum / this.Ny, peak };
  },
  dataColumns: ['t_s', 'sources', 'max_displacement', 'detector_mean_intensity', 'detector_peak_intensity', 'wave_speed_cells_s', 'frequency_hz', 'phase_step_deg', 'source_speed_c'],
  dataRow() {
    let m = 0; const u = this.u; for (let i = 0; i < u.length; i += 5) { const v = Math.abs(u[i]); if (v > m) m = v; }
    const d = this.detector();
    return [this.t, this.sources.length, m, d.mean, d.peak, this.p.c, this.p.f, this.p.phaseStep, this.p.srcSpeed];
  },
  trackLabel: 'Detector profile',
  trackColumns: ['t_s', 'y_cell', 'intensity'],
  trackRows(out) { const xd = this.detectorX(); for (let y = 0; y < this.Ny; y++) out.push([this.t, y, this.inten[y * this.Nx + xd]]); },
});
