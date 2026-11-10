/*
✒ Metadata
    - Title: Waves Lab (digiSpace Edition - v2.5)
    - File Name: waves.js
    - Relative Path: js/labs/waves.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Live Math:
      c and damping with the Courant number, Snell's index, the double slit's
      fringe spacing measured against λL/d with the detector plotted, the
      phased array's beam angle, and the Mach cone; Inspect follows a source's
      drive.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Displacement and Intensity become the rail's Height and Intensity views;
      any tool selects a source it lands on for the Inspect pane, which
      removes it; lengths and speeds follow the chosen units at a ripple-tank
      scale of 4 mm per cell.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Controls
      are grouped into Medium, Sources and Display.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The 2-D wave equation on a grid with slits, sources, a phased array, a
    glass lens and a moving source.

✒ Key Features:
    - Second-order finite differences with a Courant check and absorbing
      edges.
    - Detector chart of time-averaged intensity along the screen edge.
    - In 3D mode, a ripple tank on the shared plane camera.

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
import { FOV3 } from '../core/math3d.js';
import { fmtPos, fmtQ, unitSystem } from '../core/units.js';
import { TAU, clamp, rand } from '../core/util.js';
import { view } from '../core/view.js';
import { camOf } from '../shell/camera.js';
import { setParam } from '../shell/lifecycle.js';
import { refreshEnabled } from '../shell/panel.js';
import { active } from '../shell/state.js';

/* ================================================================== */
/*  Lab 4 · Waves (ripple tank)                                        */
/* ================================================================== */
export const waves = {
  id: 'waves', name: 'Waves', title: 'Ripple tank',
  zoomRange: [0.5, 10],
  rig3: { plane: 'floor', yaw: -0.6, pitch: 0.68, fit: 1.04, height: 1.5, pitchMin: 0.14, target: [0.2, -0.2, 0] },
  /* The tank in scene units: water depth, depth over a glass slab, barrier height above the water, surface height of a unit wave. */
  tank3: { depth: 0.46, shallow: 0.15, wall: 0.3, amp: 0.085 },
  eq: '∂<sup>2</sup>u/∂t<sup>2</sup> = c<sup>2</sup>∇<sup>2</sup>u',
  eqTex: '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u',
  aria: 'Wave simulation: a two-dimensional ripple tank',
  blurb: 'The two-dimensional wave equation on a grid, stepped with second-order finite differences. Slits diffract, paired sources interfere, a phased array steers its beam, slower glass bends wavefronts into a focus, and a source outrunning its own waves drags a Mach cone behind it.',
  interact: [
    'Pick a tool from the dock, then click or drag on the tank.',
    '<b>Pulse</b> drops a disturbance. <b>Wall</b> and <b>Erase</b> paint barriers. <b>Source</b> adds an oscillator, or removes one you click. <b>Glass</b> paints a slower medium.',
    'Switch the view to <b>Intensity</b> to see the time-averaged interference pattern. Every tool works in 3D too.',
  ],
  views: { key: 'view', label: 'View', options: [
    { id: 'disp', label: 'Height', icon: 'disp', tip: 'Height: the displacement of the surface right now, up and down' },
    { id: 'int', label: 'Intensity', icon: 'int', tip: 'Intensity: the time-averaged energy, where fringes show' },
  ] },
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'pulse', label: 'Pulse', key: 'p', icon: 'pulse', hint: 'Click to drop a pulse · drag to leave a wake' },
    { id: 'wall', label: 'Wall', key: 'w', icon: 'wall', hint: 'Drag to paint a barrier' },
    { id: 'erase', label: 'Erase', key: 'e', icon: 'eraser', hint: 'Drag to erase walls and glass' },
    { id: 'source', label: 'Source', key: 's', icon: 'source', hint: 'Click to add an oscillating source · click a source to inspect it, and remove it from there' },
    { id: 'glass', label: 'Glass', key: 'g', icon: 'glass', hint: 'Drag to paint glass, where waves travel at c / n' },
  ] },
  // A ripple-tank scale: one grid cell is 4 mm, so the default 60 cells/s is 24 cm/s, about the slowest real ripples.
  units: { len: 'cells', m: 0.004 }, scaleNote: 'In Waves one grid cell is 4 mm, a ripple-tank scale: the default wave speed of 60 cells/s is 24 cm/s and a 2.5 Hz source sends out 9.6 cm waves.',
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
  groups: [
    { id: 'medium', label: 'Medium', icon: 'balance' },
    { id: 'sources', label: 'Sources', icon: 'radar' },
    { id: 'display', label: 'Display', icon: 'visibility' },
  ],
  controls: [
    { type: 'range', key: 'c', label: 'Wave speed c', min: 20, max: 120, step: 1, qty: 'speed', group: 'medium' },
    { type: 'range', key: 'f', label: 'Source frequency f', min: 0.5, max: 8, step: 0.1, unit: 'Hz', group: 'sources' },
    { type: 'range', key: 'phaseStep', label: 'Source phase step Δφ', min: -180, max: 180, step: 1, unit: '°', note: 'Each point source lags the one before it by Δφ.', group: 'sources' },
    { type: 'range', key: 'srcSpeed', label: 'Source speed', min: 0, max: 1.8, step: 0.01, fmt: v => v.toFixed(2) + '× c', group: 'sources' },
    { type: 'range', key: 'glassN', label: 'Glass refractive index n', min: 1.1, max: 2.5, step: 0.05, group: 'medium' },
    { type: 'range', key: 'damp', label: 'Damping γ', min: 0, max: 1.5, step: 0.01, unit: '/s', group: 'medium' },
    { type: 'range', key: 'gain', label: 'Display gain', min: 0.25, max: 4, log: true, fmt: v => v.toFixed(2) + '×', group: 'display' },
    { type: 'range', key: 'relief', label: 'Relief height', min: 0.25, max: 4, log: true, fmt: v => v.toFixed(2) + '×', note: 'Vertical exaggeration of the 3D surface.', group: 'display' },
    { type: 'toggle', key: 'absorb', label: 'Absorbing edges', group: 'medium' },
  ],
  actions: [
    { label: 'Calm the water', run() { waves.u.fill(0); waves.u0.fill(0); waves.inten.fill(0); } },
    { label: 'Clear walls and glass', run() { waves.wall.fill(0); waves.glass.fill(0); waves.geomVer++; refreshEnabled(); } },
    { label: 'Remove sources', run() { waves.sources = []; refreshEnabled(); } },
  ],
  Nx: 2, Ny: 2, cs: 4, Ls: 20, u: null, u0: null, wall: null, glass: null, sponge: null, inten: null, slits: null,
  off: null, octx: null, img: null, sources: [], time: 0, drawing: false, last: null, lastPulse: null,
  steps: 0, stepClock: 0, stepRate: 0, maxU: 0,
  dt() { return 0.5 / this.p.c; }, maxSteps: 24,

  setup(w, h) {
    this.cs = clamp(Math.round(Math.sqrt(w * h / 42000)), 3, 6);
    const Nx = Math.ceil(w / this.cs), Ny = Math.ceil(h / this.cs), N = Nx * Ny;
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
    const point = (x, y) => this.sources.push({ id: ++this.srcId, type: 'point', x, y, phase: 0, t0: 0, dir: 1 });
    const lineSource = () => this.sources.push({ id: ++this.srcId, type: 'line', x: Ls + 2, y: 0, phase: 0, t0: 0, dir: 1 });
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
  mini(g) { g.imageSmoothingEnabled = true; g.drawImage(this.off, 0, 0, this.Nx * this.cs, this.Ny * this.cs); },
  /* What source s, the k-th point source, is driving the water to right now; the solver's own expression. */
  signal3(s, k) {
    const t = this.time - s.t0, phase = s.type === 'point' ? s.phase - k * this.p.phaseStep * Math.PI / 180 : s.phase;
    return clamp(t / 0.6, 0, 1) * Math.sin(TAU * this.p.f * t + phase);
  },
  /* The tank lies across the view on a wide stage, so the whole apparatus has to fit, not just the plane under it. */
  dist0() {
    const P = this.plane3(), R = this.rig3, t = Math.tan(FOV3 / 2), a = view.w / Math.max(1, view.h), X = P.hw + 0.5, Z = P.hh + 0.5;
    const sy = Math.abs(Math.sin(R.yaw)), cy = Math.abs(Math.cos(R.yaw));
    return Math.max((X * cy + Z * sy) / (t * a), ((X * sy + Z * cy) * Math.sin(R.pitch) + 1.3 * Math.cos(R.pitch)) / t) * R.fit;
  },
  /* Surface height of displacement u in scene units, compressed so strong sources stay readable. */
  height3(u) { const v = u * this.p.gain; return this.tank3.amp * this.p.relief * v / (1 + Math.abs(v)); },
  /* The ray lands on the moving water rather than its rest plane, and off the tank it lands on nothing. */
  pick3(s) {
    const hit = this.rayHit(s); if (!hit) return null;
    const { p, P } = hit, e = this.basis3().eye, dy = p[1] - e[1], Nx = this.Nx, Ny = this.Ny, cs = this.cs;
    let x = p[0], z = p[2];
    for (let i = 0; i < 3; i++) {
      const cx = clamp(Math.round((x / P.k + P.cx) / cs), 0, Nx - 1), cy = clamp(Math.round((z / P.k + P.cy) / cs), 0, Ny - 1);
      const t = (P.o[1] + this.height3(this.u[cy * Nx + cx]) - e[1]) / dy;
      x = e[0] + (p[0] - e[0]) * t; z = e[2] + (p[2] - e[2]) * t;
    }
    const wx = x / P.k + P.cx, wy = z / P.k + P.cy;
    return wx >= 0 && wy >= 0 && wx <= P.cx * 2 && wy <= P.cy * 2 ? { x: wx, y: wy } : null;
  },
  /* Screen overlays for the 3D view: phase labels and a preview of what the tool under the cursor will do. */
  overlay3(g) {
    const cs = this.cs, T = this.tank3, hv = this.hover, tool = this.p.tool;
    const ring = (x, y, r, lift, n = 40) => {
      g.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const q = this.project3(x + r * Math.cos(i / n * TAU), y + r * Math.sin(i / n * TAU), lift);
        if (!q) { pen = false; continue; }
        if (pen) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y);
        pen = true;
      }
    };
    g.save(); g.lineWidth = 1.3;
    const sel = this.source();
    if (sel && sel.type === 'point') { g.strokeStyle = THEME.amber; g.setLineDash([4, 3]); ring(sel.x * cs, sel.y * cs, 5.5 * cs, 0.05); g.stroke(); g.setLineDash([]); }
    if (this.p.phaseStep !== 0 && this.pointCount() > 1) {
      let k = 0, lx = -99, ly = -99;
      g.font = `400 11px ${THEME.mono}`; g.fillStyle = THEME.text; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const s of this.sources) {
        if (s.type !== 'point') continue;
        const q = this.project3(s.x * cs, s.y * cs, 0.86), ph = ((-k * this.p.phaseStep) % 360 + 360) % 360;
        k++;
        // A row seen end-on would stack its labels, so each keeps a line of clear space.
        if (!q || Math.hypot(q.x - lx, q.y - ly) < 13) continue;
        g.fillText(`${ph.toFixed(0)}°`, q.x - 7, q.y); lx = q.x; ly = q.y;
      }
    }
    if (hv && tool === 'source') {
      const c = this.toCell(hv), at = this.sources.find(s => s.type === 'point' && Math.hypot(s.x - c.x, s.y - c.y) < 4);
      if (at) { g.strokeStyle = THEME.amber; ring(at.x * cs, at.y * cs, 4 * cs, 0.02); g.stroke(); }
      else {
        const b = this.project3(hv.x, hv.y, 0.02), t = this.project3(hv.x, hv.y, 0.7);
        g.strokeStyle = g.fillStyle = THEME.amber; g.globalAlpha = 0.85;
        ring(hv.x, hv.y, 2.2 * cs, 0.02); g.stroke();
        if (b && t) { g.setLineDash([3, 3]); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(t.x, t.y); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(t.x, t.y, 3, 0, TAU); g.fill(); }
      }
    } else if (hv) {
      const r = { pulse: 3, wall: 1.6, erase: 3.2, glass: 3.2 }[tool] * cs;
      if (tool === 'wall') {
        g.strokeStyle = THEME.text; g.fillStyle = 'rgba(205,214,224,0.14)';
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU + 0.6, b = this.project3(hv.x + r * Math.cos(a), hv.y + r * Math.sin(a), 0), t = this.project3(hv.x + r * Math.cos(a), hv.y + r * Math.sin(a), T.wall);
          if (b && t) { g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(t.x, t.y); g.stroke(); }
        }
        ring(hv.x, hv.y, r, 0); g.stroke();
        ring(hv.x, hv.y, r, T.wall); g.fill(); g.stroke();
      } else if (tool === 'glass') {
        g.strokeStyle = THEME.cyan; g.fillStyle = 'rgba(95,208,223,0.12)';
        ring(hv.x, hv.y, r, -T.shallow); g.fill();
        g.setLineDash([3, 4]); g.stroke(); g.setLineDash([]);
        ring(hv.x, hv.y, r, 0.01); g.stroke();
      } else if (tool === 'erase') {
        g.strokeStyle = THEME.crit; g.setLineDash([3, 4]);
        ring(hv.x, hv.y, r, 0.01); g.stroke(); g.setLineDash([]);
      } else {
        g.strokeStyle = THEME.amber;
        ring(hv.x, hv.y, r, 0.01); g.stroke();
        g.globalAlpha = 0.4; ring(hv.x, hv.y, r * 1.7, 0.01); g.stroke();
      }
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
    if (key === 'relief') return this.is3D() ? true : 'Shapes the 3D view.';
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
      this.sources.push({ id: ++this.srcId, type: 'point', x: c.x, y: c.y, phase: 0, t0: this.time, dir: 1 });
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
  cursorAt(p) { return p && this.hitSource(p) ? 'pointer' : this.p.tool === 'source' ? 'copy' : 'crosshair'; },
  /* Any tool selects a source it lands on, for the Inspect pane, instead of acting on the water there. */
  pointerDown(p) {
    const s = this.hitSource(p);
    if (s) { this.selSrc = s.id; return; }
    this.drawing = true; this.last = null; this.applyTool(p, true);
  },
  srcId: 0, selSrc: null,
  hitSource(p) {
    const c = this.toCell(p);
    return this.sources.find(s => s.type === 'point' ? Math.hypot(s.x - c.x, s.y - c.y) < 4 : Math.abs(Math.round(s.x) - c.x) < 2.5) || null;
  },
  source() { return this.selSrc == null ? null : this.sources.find(s => s.id === this.selSrc) || null; },
  inspectHint: 'Click a source with any tool to inspect it here.',
  /* Read-only figures of the selected source. Frequency and phase step are shared settings, so they stay in Controls. */
  inspect() {
    const s = this.source(); if (!s) return null;
    const pts = this.sources.filter(q => q.type === 'point'), k = pts.indexOf(s), point = s.type === 'point', p = this.p;
    const phase = point ? s.phase - k * p.phaseStep * Math.PI / 180 : s.phase, deg = ((phase * 180 / Math.PI) % 360 + 360) % 360;
    const age = this.time - s.t0, out = Math.min(1, age / 0.6) * Math.sin(TAU * p.f * age + phase);
    const cx = clamp(Math.round(s.x), 0, this.Nx - 1), cy = clamp(Math.round(point ? s.y : this.Ny / 2), 0, this.Ny - 1), I = this.inten[cy * this.Nx + cx];
    const rows = [
      [point ? 'Position' : 'Line at', point ? fmtPos(this, s.x, s.y) : `x = ${fmtQ(this, 'len', s.x)}`, 'Across and down from the tank\'s top-left corner.'],
      ['Frequency f', `${p.f.toFixed(1)} Hz`, 'Shared by every source; set it under Controls.'],
      ['Wavelength λ = c/f', fmtQ(this, 'len', p.c / p.f), 'The distance between crests this source sends out, in open water.'],
      ['Phase', `${deg.toFixed(0)}°`, point && pts.length > 1 ? 'Its own phase, after the phase step Δφ for its place in the row.' : 'Where in its cycle it started.'],
      ['Driving now', out.toFixed(2), 'The displacement this source is holding its cells at this instant, between −1 and 1.'],
      ['Running for', `${age.toFixed(1)} s`, 'Simulated time since it started.'],
      ['Intensity here ⟨u²⟩', I.toFixed(3), 'The time-averaged intensity at its own cell.'],
    ];
    if (point && p.srcSpeed > 0) rows.push(['Speed', `${fmtQ(this, 'speed', p.srcSpeed * p.c)} ${s.dir > 0 ? 'right' : 'left'}`, 'Point sources move together at the Source speed setting.']);
    return { id: `src-${s.id}`, focus: 'Driving now', kicker: point ? `Source ${k + 1} of ${pts.length}` : 'Line source', short: point ? `Source ${k + 1}` : 'Line source', title: point ? 'Point oscillator' : 'Plane-wave paddle', color: '#f2a541', rows,
      actions: [{ label: 'Remove this source', run: () => { this.sources = this.sources.filter(q => q !== s); this.selSrc = null; refreshEnabled(); } }] };
  },
  deselect() { this.selSrc = null; },
  pointerMove(p, e, down) { if (down && this.drawing) this.applyTool(p, false); },
  pointerUp() { this.drawing = false; this.last = null; this.lastPulse = null; },
  draw(g, w, h) {
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
      if (s.type === 'line') {
        g.globalAlpha = 0.6; g.fillRect(Math.round(s.x) * cs - px, 0, 3 * px, h); g.globalAlpha = 1;
        if (s.id === this.selSrc) { g.lineWidth = 1.6 * px; g.setLineDash([4 * px, 3 * px]); g.strokeRect(Math.round(s.x) * cs - 6 * px, 2 * px, 12 * px, h - 4 * px); g.setLineDash([]); }
        continue;
      }
      g.beginPath(); g.arc(s.x * cs, s.y * cs, 6 * px, 0, TAU); g.stroke(); g.beginPath(); g.arc(s.x * cs, s.y * cs, 2 * px, 0, TAU); g.fill();
      if (s.id === this.selSrc) { g.lineWidth = 1.6 * px; g.setLineDash([4 * px, 3 * px]); g.beginPath(); g.arc(s.x * cs, s.y * cs, 11 * px, 0, TAU); g.stroke(); g.setLineDash([]); }
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
  // The readings this lab is about lead the deck with larger figures; the rest follow as secondary.
  primary: ['Wavelength λ = c/f', 'Sources'],
  readouts() {
    const c = this.p.c, lam = c / this.p.f, hasGlass = this.glass && this.glass.includes(1), st = this.steering();
    return [
      ['Grid size', `${this.Nx} × ${this.Ny} cells · ${unitSystem() === 'sim' ? `${this.cs} px each` : `${fmtQ(this, 'len', this.Nx, { prefix: true })} wide`}`],
      ['Courant number cΔt/Δx', (c * this.dt()).toFixed(2), 'ok'],
      ['Wavelength λ = c/f', this.sources.length ? `${fmtQ(this, 'len', lam)}${hasGlass ? ` · ${fmtQ(this, 'len', lam / this.p.glassN)} in glass` : ''}` : '—', this.sources.length ? (lam / (hasGlass ? this.p.glassN : 1) < 8 ? 'warn' : 'ok') : undefined, 'derived'],
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
        ? { id: 'w-steer', level: 'info', title: 'Beam steering', body: `Sources ${fmtQ(this, 'len', st.d)} apart with Δφ = ${this.p.phaseStep}° tilt the main beam by asin(Δφ λ / 2πd) = <b>${(Math.asin(st.s) * 180 / Math.PI).toFixed(1)}°</b>.${st.d > lam / 2 + 0.5 ? ' Spacing above λ/2 also lets grating lobes appear.' : ''}` }
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
  /* The Math page's live panels (livemath.js). */
  mathLive: {
    waveeq: {
      params: ['c', 'damp'],
      vars: L => [['c', fmtQ(L, 'speed', L.p.c), 'Wave speed in open water.'], ['Δt', `${(L.dt() * 1000).toFixed(2)} ms`, 'One solver step.'], ['cΔt/Δx', (L.p.c * L.dt()).toFixed(3), 'The Courant number: how many cells a crest crosses per step.'], ['λ', fmtQ(L, 'len', L.p.c / L.p.f), 'Wavelength c / f of the sources.']],
      check: L => ({ text: `Courant number ${(L.p.c * L.dt()).toFixed(3)}, under the stability limit 1/√2 ≈ 0.707: the step adapts to c, so the scheme stays stable at any speed.`, state: 'ok' }),
    },
    snell: {
      params: [['glassN', 'n₂']],
      vars: L => [['n₁', '1', 'Open water.'], ['n₂', L.p.glassN.toFixed(2), 'Glass: waves there travel at c / n.'], ['c / n₂', fmtQ(L, 'speed', L.p.c / L.p.glassN), 'Wave speed inside the glass.'], ['θc', `${(Math.asin(1 / L.p.glassN) * 180 / Math.PI).toFixed(1)}°`, 'Critical angle from glass to water: beyond it, waves reflect back inside.']],
      check: L => ({ text: L.glass && L.glass.includes(1) ? `Waves in the glass are ${L.p.glassN.toFixed(2)}× shorter, so the lens bends them to a focus.` : 'Paint glass with the Glass tool, or load the Glass lens scene, to watch waves bend.', state: L.glass && L.glass.includes(1) ? 'ok' : 'idle' }),
    },
    slits: {
      params: ['f'],
      vars: L => (L.slits ? [['λ', fmtQ(L, 'len', L.p.c / L.p.f), 'Wavelength c / f.'], ['d', fmtQ(L, 'len', L.slits.d), 'Distance between the slit centres.'], ['L', fmtQ(L, 'len', L.detectorX() - L.slits.x), 'From the slits to the detector line.']] : []),
      check: L => (L.slits ? { what: 'Fringe spacing Δy', theory: L.fringeTheory(L.p.f), sim: L.fringeSpacing(), fmt: v => fmtQ(L, 'len', v), tol: 0.12, wait: 'Fringe spacing: waiting for the pattern to build up on the detector…' } : { text: 'Load the Double slit scene to measure the fringes.' }),
      plot: (c, L) => L.chart.draw(c),
      plotLabel: 'Time-averaged intensity along the detector line',
    },
    phased: {
      params: ['phaseStep', 'f'],
      vars: L => { const st = L.steering(); return st ? [['Δφ', `${L.p.phaseStep}°`, 'Each source lags the one before it by this much.'], ['d', fmtQ(L, 'len', st.d), 'Spacing of the sources.'], ['λ', fmtQ(L, 'len', st.lam), 'Wavelength.']] : []; },
      check: L => { const st = L.steering(); if (!st) return { text: 'Needs two or more point sources: load the Phased array scene.' }; if (Math.abs(st.s) > 1) return { text: 'Δφ λ / 2πd is beyond 1: no main beam can form at this setting.', state: 'warn' }; return { what: 'Beam angle θ', theory: Math.asin(st.s) * 180 / Math.PI, sim: L.beamAngle(), fmt: v => `${v.toFixed(1)}°`, tol: 0.15, wait: 'Beam angle: waiting for the waves to reach the arc…' }; },
    },
    mach: {
      params: ['srcSpeed'],
      vars: L => [['v_s', fmtQ(L, 'speed', L.p.srcSpeed * L.p.c), 'Speed of the moving sources.'], ['c', fmtQ(L, 'speed', L.p.c), 'Wave speed.'], ['v_s / c', L.p.srcSpeed.toFixed(2), 'The Mach number.']],
      check: L => ({ text: L.p.srcSpeed > 1 ? `Faster than its own waves: they pile into a cone with half-angle ${(Math.asin(1 / L.p.srcSpeed) * 180 / Math.PI).toFixed(1)}°.` : L.p.srcSpeed > 0 ? 'Slower than its waves: crests bunch up ahead and spread out behind (the Doppler effect), but no cone forms.' : 'Raise Source speed above 1× c to form a Mach cone.', state: L.p.srcSpeed > 1 ? 'ok' : 'idle' }),
    },
  },
  math: `
    <p>The tank steps the wave equation with leapfrog finite differences, the five-point Laplacian and damping γ:</p>
    <div class="f" data-live="waveeq" data-tex="u^{n+1} = 2u^n - u^{n-1} + \\frac{c^2\\,\\Delta t^2}{\\Delta x^2}\\,\\nabla^2 u^n"></div>
    <p>It is stable while the Courant number cΔt/Δx stays at or below 1/√2; this tank always steps at 0.5. Accuracy needs about eight cells per wavelength.</p>
    <p>Glass of index <i>n</i> slows the wave to c/n, shortening the wavelength and bending wavefronts by Snell’s law:</p>
    <div class="f" data-live="snell" data-tex="n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2"></div>
    <p>Fringe spacing on a screen at distance <i>L</i> from two slits <i>d</i> apart:</p>
    <div class="f" data-live="slits" data-tex="\\Delta y \\approx \\frac{\\lambda L}{d}"></div>
    <p>A row of sources spaced <i>d</i> apart, each lagging the last by Δφ, steers its beam to:</p>
    <div class="f" data-live="phased" data-tex="\\sin\\theta = \\frac{\\Delta\\varphi\\,\\lambda}{2\\pi d}"></div>
    <p>A source faster than the wave (v<sub>s</sub> &gt; c) leaves a Mach cone of half-angle:</p>
    <div class="f" data-live="mach" data-tex="\\sin\\theta = \\frac{c}{v_s}"></div>
    <p>The 3D view lifts each cell to a compressed height, so strong sources stay readable, and refracts the lamp through the surface onto the bed. A crest focuses light, which is why a ripple tank projects its waves as bright lines. Walls stand as blocks in the water; glass is a shallow slab, which is what slows a real ripple.</p>
    <div class="f" data-tex="h = \\frac{H\\,u}{1 + |u|}, \\qquad \\hat{\\mathbf n} \\propto \\left(-\\frac{\\partial h}{\\partial x},\\ 1,\\ -\\frac{\\partial h}{\\partial y}\\right)"></div>`,
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
    // States saved before sources had ids get fresh ones, so their sources can be selected too.
    this.sources = s.sources.map(x => ({ ...x, id: x.id ?? ++this.srcId })); this.time = s.time;
    this.srcId = Math.max(this.srcId, ...this.sources.map(x => x.id));
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
