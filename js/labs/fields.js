/*
✒ Metadata
    - Title: Fields Lab (digiSpace Edition - v2.0)
    - File Name: fields.js
    - Relative Path: js/labs/fields.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: the Fields & charges lab, one of the
      recommendations he asked to implement.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Point charges add their fields by superposition; charged test particles
    move through them and through a uniform electric field and a magnetic
    field under the Lorentz force, advanced with the Boris pusher.

✒ Key Features:
    - Potential map, equipotentials by marching squares, field lines with
      direction arrows, and an optional vector grid.
    - Six scenes: dipole, quadrupole, parallel plates with a beam, cyclotron
      motion, E × B drift and grad-B drift.
    - Tools: add +, add −, move, launch, probe and erase; clicking a charge
      changes it by one unit.
    - Energy chart of the ringed particle (kinetic, potential, total) and
      readouts for the probe, cyclotron period and drift speed.
    - Rewind, datasets, particle tracks and saved states like every other
      lab.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, drawSeries, seriesRange } from '../core/chart.js';
import { genericState } from '../core/codec.js';
import { RAMP_WAVE, THEME } from '../core/color.js';
import { brushRing, drawSphere, zoomOf } from '../core/draw.js';
import { Series } from '../core/series.js';
import { TAU, clamp, fmtSI, pct } from '../core/util.js';
import { announce, canvas } from '../shell/state.js';

/* ================================================================== */
/*  Lab 7 · Fields & charges                                           */
/* ================================================================== */
/* Fixed source charges make an electrostatic field by superposition;
   charged test particles move through it, and through a uniform electric
   field E₀ and a magnetic field B along the screen normal, under the
   Lorentz force. The particles are advanced with the Boris pusher, which
   rotates the velocity exactly in B, so a magnetic field never changes a
   particle's speed. Test particles feel the field but do not make one. */
export const FIELD_P_CAP = 320;
export const FIELD_Q_CAP = 32;
const TR = 160;                 // trail points per particle
const CELL = 4;                 // potential-map cell size, px
const K0 = 5e5;                 // Coulomb constant at strength 1, px³/s² per unit charge
const SOFT = 6;                 // softening length ε, px
const RAMP_N = RAMP_WAVE.rgb.length / 3;
/* Field readings round to zero below a millionth of their natural scale, so a
   point of exact symmetry reads 0 rather than a rounding residue like 9e-13. */
const fmtField = (v, scale) => (Math.abs(v) < 1e-6 * scale ? '0' : fmtSI(v));

export const fields = {
  id: 'fields', name: 'Fields', title: 'Electric and magnetic fields',
  eq: 'F = q(E + v × B)',
  eqTex: '\\mathbf F = q\\,(\\mathbf E + \\mathbf v \\times \\mathbf B)',
  aria: 'Field simulation: point charges, their electric field and charged particles moving through it',
  blurb: 'Point charges add their fields by superposition. The colour map is the electric potential, the thin rings are equipotentials, and the field lines run from positive to negative charge, always crossing the rings at right angles. Launch charged particles to watch the Lorentz force bend them; add a magnetic field to make them circle and drift.',
  interact: [
    '<b>Add +</b> and <b>Add −</b> place a source charge; click an existing charge to add or remove one unit. Keep dragging to position it.',
    '<b>Move</b> drags charges around, and clicking a particle charts its energy. <b>Launch</b>: press and drag to fire a test particle; the arrow is its starting velocity.',
    '<b>Probe</b> pins a field meter that reads |E| and the potential V. <b>Erase</b> brushes away charges and particles.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'plus', label: 'Add +', key: 'p', icon: 'plus', hint: 'Click to place a positive charge · click a charge to add one unit' },
    { id: 'minus', label: 'Add −', key: 'n', icon: 'minus', hint: 'Click to place a negative charge · click a charge to remove one unit' },
    { id: 'move', label: 'Move', key: 'v', icon: 'move', hint: 'Drag a charge to move it · click a particle to chart its energy' },
    { id: 'launch', label: 'Launch', key: 'l', icon: 'launch', hint: 'Press and drag to fire a test particle · a click releases one at rest' },
    { id: 'probe', label: 'Probe', key: 'i', icon: 'probe', hint: 'Click or drag to place the field meter' },
    { id: 'erase', label: 'Erase', key: 'x', icon: 'erase', hint: 'Brush over charges and particles to remove them' },
  ] },
  p: { tool: 'plus', k: 1, B: 0, gradB: 0, E0: 0, qm: 1, sign: 1, v0: 120, beam: false, map: true, equip: true, lines: true, vectors: false, trails: true },
  presetId: 'dipole',
  presets: [
    { id: 'dipole', label: 'Dipole', params: { B: 0, gradB: 0, E0: 0, beam: false, k: 1, sign: 1 } },
    { id: 'quad', label: 'Quadrupole', params: { B: 0, gradB: 0, E0: 0, beam: false, k: 1, sign: 1 } },
    { id: 'plates', label: 'Parallel plates', params: { B: 0, gradB: 0, E0: 0, beam: true, k: 0.6, sign: -1, v0: 150, qm: 1 } },
    { id: 'cyclotron', label: 'Cyclotron motion', params: { B: 1.5, gradB: 0, E0: 0, beam: false, qm: 1 } },
    { id: 'exb', label: 'E × B drift', params: { B: 1.5, gradB: 0, E0: 60, beam: false, qm: 1 } },
    { id: 'gradb', label: 'Grad-B drift', params: { B: 1.5, gradB: 0.8, E0: 0, beam: false, qm: 1 } },
  ],
  controls: [
    { type: 'range', key: 'k', label: 'Charge strength k', min: 0.1, max: 3, step: 0.05, fmt: v => v.toFixed(2) + '×' },
    { type: 'range', key: 'B', label: 'Magnetic field B', min: -3, max: 3, step: 0.05, fmt: v => (v === 0 ? '0' : (v > 0 ? '⊗ ' : '⊙ ') + Math.abs(v).toFixed(2)), note: '⊗ points into the screen, ⊙ out of it.' },
    { type: 'range', key: 'gradB', label: 'B gradient (down the screen)', min: 0, max: 0.9, step: 0.05, fmt: v => '±' + Math.round(v * 100) + '%' },
    { type: 'range', key: 'E0', label: 'Uniform field E₀ (down)', min: -150, max: 150, step: 5, unit: 'px/s²' },
    { type: 'range', key: 'qm', label: 'Charge-to-mass |q|/m of new particles', min: 0.2, max: 4, step: 0.1, fmt: v => v.toFixed(1) },
    { type: 'seg', key: 'sign', label: 'Sign of new particles', options: [[1, '+ positive'], [-1, '− negative']] },
    { type: 'range', key: 'v0', label: 'Beam speed', min: 20, max: 400, step: 5, unit: 'px/s' },
    { type: 'toggle', key: 'beam', label: 'Fire a beam from the left edge' },
    { type: 'toggle', key: 'map', label: 'Show potential map' },
    { type: 'toggle', key: 'equip', label: 'Show equipotentials' },
    { type: 'toggle', key: 'lines', label: 'Show field lines' },
    { type: 'toggle', key: 'vectors', label: 'Show field vectors' },
    { type: 'toggle', key: 'trails', label: 'Show particle trails' },
  ],
  actions: [
    { label: 'Clear particles', run() { fields.clearParticles(); } },
    { label: 'Clear charges', run() { fields.charges.length = 0; fields.dirty = true; fields.probeRead(); } },
  ],
  /* source charges */
  charges: [], nextId: 1, dirty: true,
  /* test particles (struct of arrays) */
  n: 0, pid: new Int32Array(FIELD_P_CAP), x: new Float64Array(FIELD_P_CAP), y: new Float64Array(FIELD_P_CAP),
  vx: new Float64Array(FIELD_P_CAP), vy: new Float64Array(FIELD_P_CAP), qm: new Float64Array(FIELD_P_CAP),
  trail: new Float32Array(FIELD_P_CAP * TR * 2), th: new Int32Array(FIELD_P_CAP), tn: new Int32Array(FIELD_P_CAP), trailClock: 0,
  absorbed: 0, escaped: 0, beamClock: 0, nextPid: 1,
  /* tracked particle and its energy history */
  track: -1, E0track: NaN, sampleClock: 0,
  series: { ke: new Series(900), pe: new Series(900), et: new Series(900) },
  /* derived field geometry, rebuilt when sources change */
  gw: 0, gh: 0, V: null, map: null, mapCtx: null, img: null, contours: null, zero: null, flines: [],
  probe: null, probeVal: null, w: 800, h: 600, drag: null, brush: null, aim: null,
  dt() { return 1 / 240; }, maxSteps: 48,

  /* ---------- fields ---------- */
  K() { return K0 * this.p.k; },
  Bz(y) { const B = this.p.B; return B === 0 ? 0 : B * (1 + this.p.gradB * (y - this.h / 2) / (this.h / 2)); },
  /* Electric field at (x, y), written into out[0], out[1]. */
  E(x, y, out) {
    let ex = 0, ey = this.p.E0;
    const K = this.K(), Q = this.charges;
    for (let i = 0; i < Q.length; i++) {
      const c = Q[i], dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + SOFT * SOFT, f = K * c.q / (r2 * Math.sqrt(r2));
      ex += f * dx; ey += f * dy;
    }
    out[0] = ex; out[1] = ey; return out;
  },
  /* Electric potential, zero at the stage centre for the uniform part. */
  Vat(x, y) {
    let v = -this.p.E0 * (y - this.h / 2);
    const K = this.K(), Q = this.charges;
    for (let i = 0; i < Q.length; i++) { const c = Q[i]; v += K * c.q / Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + SOFT * SOFT); }
    return v;
  },
  Vscale() { return this.K() / 70; },
  chargeR(c) { return 9 + 2.2 * Math.min(5, Math.abs(c.q)); },

  /* ---------- scene building ---------- */
  addCharge(x, y, q) {
    if (this.charges.length >= FIELD_Q_CAP) { announce(`Charge limit reached (${FIELD_Q_CAP}).`); return null; }
    const c = { id: this.nextId++, x: clamp(x, 0, this.w), y: clamp(y, 0, this.h), q };
    this.charges.push(c); this.dirty = true; return c;
  },
  addParticle(x, y, vx, vy, qm) {
    if (this.n >= FIELD_P_CAP) return -1;
    const i = this.n++;
    this.pid[i] = this.nextPid++; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.qm[i] = qm; this.th[i] = 0; this.tn[i] = 0;
    return i;
  },
  removeParticle(i) {
    const last = --this.n;
    if (this.pid[i] === this.track) this.track = -1;
    if (i === last) return;
    this.pid[i] = this.pid[last]; this.x[i] = this.x[last]; this.y[i] = this.y[last]; this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last]; this.qm[i] = this.qm[last];
    this.th[i] = this.th[last]; this.tn[i] = this.tn[last];
    this.trail.copyWithin(i * TR * 2, last * TR * 2, (last + 1) * TR * 2);
  },
  clearParticles() { this.n = 0; this.track = -1; this.absorbed = 0; this.escaped = 0; for (const s of Object.values(this.series)) s.clear(); },
  indexOf(pid) { for (let i = 0; i < this.n; i++) if (this.pid[i] === pid) return i; return -1; },
  setTrack(pid) {
    this.track = pid; for (const s of Object.values(this.series)) s.clear();
    const i = this.indexOf(pid); this.E0track = i >= 0 ? this.energyOf(i).et : NaN; this.sampleClock = 0;
  },
  energyOf(i) { const ke = 0.5 * (this.vx[i] ** 2 + this.vy[i] ** 2), pe = this.qm[i] * this.Vat(this.x[i], this.y[i]); return { ke, pe, et: ke + pe }; },
  build(preset, w, h) {
    this.w = w; this.h = h; this.charges.length = 0; this.clearParticles();
    this.drag = null; this.brush = null; this.aim = null; this.beamClock = 0;
    const cx = w / 2, cy = h / 2, s = Math.min(w, h);
    const qm = this.p.qm;
    if (preset === 'dipole') { this.addCharge(cx - 0.24 * s, cy, 2); this.addCharge(cx + 0.24 * s, cy, -2); this.probe = { x: cx, y: cy - 0.22 * s }; }
    else if (preset === 'quad') {
      const d = 0.2 * s; this.addCharge(cx - d, cy - d, 1); this.addCharge(cx + d, cy - d, -1); this.addCharge(cx + d, cy + d, 1); this.addCharge(cx - d, cy + d, -1);
      this.probe = { x: cx, y: cy };
    } else if (preset === 'plates') {
      const n = 14, x0 = w * 0.3, x1 = w * 0.86, gap = h * 0.2;
      for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * k / (n - 1); this.addCharge(x, cy - gap, -1); this.addCharge(x, cy + gap, 1); }
      this.probe = { x: (x0 + x1) / 2, y: cy };
    } else if (preset === 'cyclotron') {
      this.probe = null;
      [[0.3, 50, 1], [0.3, 100, 1], [0.3, 150, 1], [0.7, 70, -1], [0.7, 130, -1]].forEach(([fx, v, sg]) => this.addParticle(w * fx, cy + sg * v / (qm * this.p.B), v, 0, sg * qm));
    } else if (preset === 'exb') {
      this.probe = null;
      for (let k = 0; k < 3; k++) { this.addParticle(w * 0.12, h * (0.25 + 0.25 * k), 0, 0, qm); this.addParticle(w * 0.12 + 40, h * (0.25 + 0.25 * k) + 20, 0, 0, -qm); }
    } else if (preset === 'gradb') {
      this.probe = null;
      // Start each particle one Larmor radius off the midline so its orbit is centred there;
      // positive charges then drift left and negative charges right.
      const v = 110, r = v / (qm * this.p.B);
      this.addParticle(w * 0.7, cy + r, v, 0, qm); this.addParticle(w * 0.3, cy - r, v, 0, -qm);
    }
    if (this.n) this.setTrack(this.pid[0]);
    this.dirty = true; this.probeRead();
  },
  onResize(w, h, ow, oh) {
    const sx = ow ? w / ow : 1, sy = oh ? h / oh : 1;
    for (const c of this.charges) { c.x *= sx; c.y *= sy; }
    for (let i = 0; i < this.n; i++) { this.x[i] *= sx; this.y[i] *= sy; this.tn[i] = 0; }
    if (this.probe) { this.probe.x *= sx; this.probe.y *= sy; }
    this.w = w; this.h = h; this.dirty = true; this.probeRead();
    // Rescaling moves the potential's zero, so restart the energy count.
    if (this.indexOf(this.track) >= 0) this.setTrack(this.track);
  },
  worldRect() { return { w: this.w, h: this.h }; },
  onParam(key) {
    if (key === 'k' || key === 'E0') { this.dirty = true; this.probeRead(); }
    if (key === 'k' || key === 'E0' || key === 'B' || key === 'gradB') { const i = this.indexOf(this.track); if (i >= 0) this.setTrack(this.track); }
  },
  enabled(key) {
    if (key === 'gradB' && this.p.B === 0) return 'Needs a magnetic field B.';
    if (key === 'v0' && !this.p.beam) return 'Sets the speed of beam particles; turn the beam on.';
    if (key === 'equip' && !this.charges.length && this.p.E0 === 0) return 'Place a charge or set E₀ first.';
    return true;
  },

  /* ---------- dynamics: Boris pusher ---------- */
  step(dt) {
    const e = [0, 0], X = this.x, Y = this.y, VX = this.vx, VY = this.vy, QM = this.qm, Q = this.charges, w = this.w, h = this.h, m = 60;
    if (this.p.beam && (this.beamClock += dt) >= 0.35) {
      this.beamClock = 0;
      const sg = this.p.sign, i = this.addParticle(6, h / 2, this.p.v0, 0, sg * this.p.qm);
      if (i >= 0 && this.indexOf(this.track) < 0) this.setTrack(this.pid[i]);
    }
    for (let i = this.n - 1; i >= 0; i--) {
      const qm = QM[i], hdt = 0.5 * dt * qm;
      this.E(X[i], Y[i], e);
      let vx = VX[i] + hdt * e[0], vy = VY[i] + hdt * e[1];
      const t = hdt * this.Bz(Y[i]);
      if (t !== 0) {
        const s = 2 * t / (1 + t * t), px = vx + vy * t, py = vy - vx * t;
        vx += py * s; vy -= px * s;
      }
      vx += hdt * e[0]; vy += hdt * e[1];
      VX[i] = vx; VY[i] = vy; X[i] += vx * dt; Y[i] += vy * dt;
      let gone = X[i] < -m || X[i] > w + m || Y[i] < -m || Y[i] > h + m;
      if (gone) { this.escaped++; this.removeParticle(i); continue; }
      for (let k = 0; k < Q.length; k++) {
        const c = Q[k];
        if (c.q * qm < 0 && (X[i] - c.x) ** 2 + (Y[i] - c.y) ** 2 < (this.chargeR(c) * 0.8) ** 2) { this.absorbed++; this.removeParticle(i); gone = true; break; }
      }
    }
  },
  after(simDt) {
    if (!simDt) return;
    if ((this.trailClock += simDt) >= 1 / 40) {
      this.trailClock = 0;
      for (let i = 0; i < this.n; i++) {
        const o = i * TR * 2, k = this.th[i];
        this.trail[o + k * 2] = this.x[i]; this.trail[o + k * 2 + 1] = this.y[i];
        this.th[i] = (k + 1) % TR; if (this.tn[i] < TR) this.tn[i]++;
      }
    }
    let i = this.indexOf(this.track);
    if (i < 0 && this.n) { this.setTrack(this.pid[this.n - 1]); i = this.n - 1; }
    if (i >= 0 && (this.sampleClock -= simDt) <= 0) {
      this.sampleClock = 1 / 20;
      const en = this.energyOf(i);
      this.series.ke.push(this.t, en.ke); this.series.pe.push(this.t, en.pe); this.series.et.push(this.t, en.et);
    }
    if (this.probe) this.probeRead();
  },
  probeRead() {
    if (!this.probe) { this.probeVal = null; return; }
    const e = this.E(this.probe.x, this.probe.y, [0, 0]);
    this.probeVal = { ex: e[0], ey: e[1], E: Math.hypot(e[0], e[1]), V: this.Vat(this.probe.x, this.probe.y), B: this.Bz(this.probe.y) };
  },

  /* ---------- derived geometry: potential map, equipotentials, field lines ---------- */
  rebuildGeometry() {
    this.dirty = false;
    const gw = Math.max(2, Math.ceil(this.w / CELL) + 1), gh = Math.max(2, Math.ceil(this.h / CELL) + 1);
    if (gw !== this.gw || gh !== this.gh || !this.V) {
      this.gw = gw; this.gh = gh; this.V = new Float32Array(gw * gh);
      this.map = document.createElement('canvas'); this.map.width = gw; this.map.height = gh;
      this.mapCtx = this.map.getContext('2d'); this.img = this.mapCtx.createImageData(gw, gh);
    }
    const V = this.V, Vs = this.Vscale(), d = this.img.data, R = RAMP_WAVE.rgb, cw = this.w / (gw - 1), ch = this.h / (gh - 1);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const s = Math.tanh(this.Vat(i * cw, j * ch) / Vs), k = j * gw + i;
      V[k] = s;
      const r = clamp(Math.round((0.5 + 0.5 * s) * (RAMP_N - 1)), 0, RAMP_N - 1) * 3, o = k * 4;
      d[o] = R[r]; d[o + 1] = R[r + 1]; d[o + 2] = R[r + 2]; d[o + 3] = 255;
    }
    this.mapCtx.putImageData(this.img, 0, 0);
    this.contours = this.march([-0.875, -0.75, -0.625, -0.5, -0.375, -0.25, -0.125, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875], cw, ch);
    this.zero = this.march([0], cw, ch);
    this.traceLines();
  },
  /* Marching squares over the compressed potential grid; returns segment endpoints. */
  march(levels, cw, ch) {
    const V = this.V, gw = this.gw, gh = this.gh, out = [];
    const lerp = (a, b, L) => (L - a) / ((b - a) || 1e-9);
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const a = V[j * gw + i], b = V[j * gw + i + 1], c = V[(j + 1) * gw + i + 1], dd = V[(j + 1) * gw + i];
      const lo = Math.min(a, b, c, dd), hi = Math.max(a, b, c, dd);
      for (const L of levels) {
        if (L <= lo || L > hi) continue;
        const x0 = i * cw, y0 = j * ch, pts = [];
        if ((a < L) !== (b < L)) pts.push(x0 + cw * lerp(a, b, L), y0);
        if ((b < L) !== (c < L)) pts.push(x0 + cw, y0 + ch * lerp(b, c, L));
        if ((dd < L) !== (c < L)) pts.push(x0 + cw * lerp(dd, c, L), y0 + ch);
        if ((a < L) !== (dd < L)) pts.push(x0, y0 + ch * lerp(a, dd, L));
        if (pts.length === 4) out.push(...pts);
        else if (pts.length === 8) {
          const mid = (a + b + c + dd) / 4;
          if ((mid < L) === (a < L)) out.push(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
          else out.push(pts[0], pts[1], pts[6], pts[7], pts[2], pts[3], pts[4], pts[5]);
        }
      }
    }
    return new Float32Array(out);
  },
  /* Field lines by midpoint integration along the unit field direction. */
  traceLines() {
    const Q = this.charges, lines = [], e = [0, 0], w = this.w, h = this.h, ds = 3;
    let qp = 0, qn = 0; for (const c of Q) { if (c.q > 0) qp += c.q; else qn -= c.q; }
    const dir = qp >= qn ? 1 : -1, seeds = [];
    for (const c of Q) {
      if (Math.sign(c.q) !== dir) continue;
      const nl = Math.min(24, 6 * Math.abs(c.q)), r0 = this.chargeR(c) + 2;
      for (let k = 0; k < nl; k++) { const a = (k + 0.5) / nl * TAU; seeds.push([c.x + r0 * Math.cos(a), c.y + r0 * Math.sin(a), dir]); }
    }
    if (this.p.E0 !== 0) {
      const y = this.p.E0 > 0 ? 2 : h - 2, sp = clamp(4800 / Math.abs(this.p.E0), 36, 140);
      for (let x = sp / 2; x < w; x += sp) seeds.push([x, y, 1]);
    }
    const unit = (x, y, sg) => { this.E(x, y, e); const m = Math.hypot(e[0], e[1]) || 1e-12; return [sg * e[0] / m, sg * e[1] / m, m]; };
    for (const [sx, sy, sg] of seeds) {
      const pts = [sx, sy]; let x = sx, y = sy;
      for (let it = 0; it < 1400; it++) {
        const [ux, uy, m] = unit(x, y, sg); if (m < 1e-6) break;
        const [mx, my] = unit(x + ux * ds * 0.5, y + uy * ds * 0.5, sg);
        x += mx * ds; y += my * ds; pts.push(x, y);
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;
        let sink = false;
        for (const c of Q) if (Math.sign(c.q) === -sg && (x - c.x) ** 2 + (y - c.y) ** 2 < (this.chargeR(c) * 0.9) ** 2) { sink = true; break; }
        if (sink) break;
      }
      if (pts.length >= 6) lines.push(new Float32Array(pts));
    }
    this.flines = lines;
  },

  /* ---------- pointer tools ---------- */
  hitCharge(p) {
    let best = null, bd = Infinity;
    for (const c of this.charges) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < this.chargeR(c) + 6 && d < bd) { bd = d; best = c; } }
    return best;
  },
  hitParticle(p) {
    let best = -1, bd = 14 * 14;
    for (let i = 0; i < this.n; i++) { const d = (this.x[i] - p.x) ** 2 + (this.y[i] - p.y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  },
  eraseAt(p) {
    const r = 24;
    for (let k = this.charges.length - 1; k >= 0; k--) { const c = this.charges[k]; if (Math.hypot(c.x - p.x, c.y - p.y) < r + this.chargeR(c) * 0.5) { this.charges.splice(k, 1); this.dirty = true; } }
    for (let i = this.n - 1; i >= 0; i--) if (Math.hypot(this.x[i] - p.x, this.y[i] - p.y) < r) this.removeParticle(i);
  },
  cursorAt(p) {
    const t = this.p.tool;
    if (t === 'move') return this.hitCharge(p) ? 'grab' : this.hitParticle(p) >= 0 ? 'pointer' : 'default';
    if (t === 'plus' || t === 'minus') return this.hitCharge(p) ? 'pointer' : 'copy';
    return 'crosshair';
  },
  pointerDown(p) {
    const t = this.p.tool;
    if (t === 'erase') { this.brush = { ...p }; this.eraseAt(p); return; }
    if (t === 'probe') { this.probe = { x: p.x, y: p.y }; this.drag = { kind: 'probe' }; this.probeRead(); return; }
    if (t === 'launch') { this.aim = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
    const c = this.hitCharge(p);
    if (t === 'move') {
      if (c) { this.drag = { kind: 'charge', c, dx: c.x - p.x, dy: c.y - p.y }; canvas.style.cursor = 'grabbing'; return; }
      const i = this.hitParticle(p); if (i >= 0) { this.setTrack(this.pid[i]); announce('Charting this particle'); }
      return;
    }
    const dq = t === 'plus' ? 1 : -1;
    if (c) {
      c.q = clamp(c.q + dq, -5, 5); this.dirty = true;
      if (c.q === 0) { this.charges.splice(this.charges.indexOf(c), 1); announce('Charge removed'); } else announce(`Charge now ${c.q > 0 ? '+' : '−'}${Math.abs(c.q)}`);
      this.probeRead(); return;
    }
    const nc = this.addCharge(p.x, p.y, dq);
    if (nc) { this.drag = { kind: 'charge', c: nc, dx: 0, dy: 0 }; this.probeRead(); }
  },
  pointerMove(p, e, down) {
    if (!down) return;
    if (this.brush) { this.brush.x = p.x; this.brush.y = p.y; this.eraseAt(p); return; }
    if (this.aim) { this.aim.x1 = p.x; this.aim.y1 = p.y; return; }
    const D = this.drag; if (!D) return;
    if (D.kind === 'probe') { this.probe.x = clamp(p.x, 0, this.w); this.probe.y = clamp(p.y, 0, this.h); this.probeRead(); return; }
    D.c.x = clamp(p.x + D.dx, 0, this.w); D.c.y = clamp(p.y + D.dy, 0, this.h); this.dirty = true; this.probeRead();
  },
  pointerUp() {
    this.brush = null;
    if (this.aim) {
      const A = this.aim, vx = (A.x1 - A.x0) * 2, vy = (A.y1 - A.y0) * 2, s = Math.hypot(vx, vy), k = s > 600 ? 600 / s : 1;
      const i = this.addParticle(A.x0, A.y0, vx * k, vy * k, this.p.sign * this.p.qm);
      if (i < 0) announce(`Particle limit reached (${FIELD_P_CAP}).`); else this.setTrack(this.pid[i]);
      this.aim = null;
    }
    if (this.drag && this.drag.kind === 'charge') { const i = this.indexOf(this.track); if (i >= 0) this.setTrack(this.track); }
    this.drag = null;
  },
  pointerCancel() { this.aim = null; this.pointerUp(); },

  /* ---------- drawing ---------- */
  draw(g, w, h) {
    if (this.dirty) this.rebuildGeometry();
    const px = 1 / zoomOf(g), P = this.p;
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    if (P.map && this.map) { g.save(); g.globalAlpha = 0.55; g.imageSmoothingEnabled = true; g.drawImage(this.map, 0, 0, w, h); g.restore(); }
    if (P.B !== 0) this.drawB(g, w, h, px);
    if (P.equip && this.contours) {
      g.strokeStyle = THEME.text; g.globalAlpha = 0.22; g.lineWidth = px; g.beginPath();
      const C = this.contours; for (let k = 0; k < C.length; k += 4) { g.moveTo(C[k], C[k + 1]); g.lineTo(C[k + 2], C[k + 3]); }
      g.stroke();
      g.globalAlpha = 0.4; g.setLineDash([4 * px, 4 * px]); g.beginPath();
      const Z = this.zero; for (let k = 0; k < Z.length; k += 4) { g.moveTo(Z[k], Z[k + 1]); g.lineTo(Z[k + 2], Z[k + 3]); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
    if (P.lines) this.drawLines(g, px);
    if (P.vectors) this.drawVectors(g, w, h, px);
    g.strokeStyle = THEME.rule; g.lineWidth = 2 * px; g.strokeRect(px, px, w - 2 * px, h - 2 * px);
    if (P.beam) { g.fillStyle = P.sign > 0 ? THEME.amber : THEME.cyan; g.globalAlpha = 0.8; g.fillRect(0, h / 2 - 9, 5, 18); g.globalAlpha = 1; }
    this.drawParticles(g, px);
    for (const c of this.charges) this.drawCharge(g, c, px);
    if (this.probe && this.probeVal) this.drawProbe(g, px);
    if (this.aim) {
      const A = this.aim; g.strokeStyle = P.sign > 0 ? THEME.amber : THEME.cyan; g.lineWidth = 2 * px; g.setLineDash([5 * px, 4 * px]);
      g.beginPath(); g.moveTo(A.x0, A.y0); g.lineTo(A.x1, A.y1); g.stroke(); g.setLineDash([]);
      const a = Math.atan2(A.y1 - A.y0, A.x1 - A.x0), L = 9 * px;
      if (Math.hypot(A.x1 - A.x0, A.y1 - A.y0) > 4) { g.beginPath(); g.moveTo(A.x1, A.y1); g.lineTo(A.x1 - L * Math.cos(a - 0.45), A.y1 - L * Math.sin(a - 0.45)); g.moveTo(A.x1, A.y1); g.lineTo(A.x1 - L * Math.cos(a + 0.45), A.y1 - L * Math.sin(a + 0.45)); g.stroke(); }
    }
    if (this.brush) brushRing(g, this.brush, 24);
  },
  drawB(g, w, h, px) {
    const sp = 48, into = this.p.B > 0, Bmax = Math.abs(this.p.B) * (1 + this.p.gradB);
    g.strokeStyle = THEME.muted; g.fillStyle = THEME.muted; g.lineWidth = px;
    for (let y = sp / 2; y < h; y += sp) {
      const r = 3 + 3 * Math.abs(this.Bz(y)) / (Bmax || 1);
      g.globalAlpha = 0.18 + 0.22 * Math.abs(this.Bz(y)) / 3;
      for (let x = sp / 2; x < w; x += sp) {
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
        if (into) { g.beginPath(); g.moveTo(x - r * 0.7, y - r * 0.7); g.lineTo(x + r * 0.7, y + r * 0.7); g.moveTo(x + r * 0.7, y - r * 0.7); g.lineTo(x - r * 0.7, y + r * 0.7); g.stroke(); }
        else { g.beginPath(); g.arc(x, y, Math.max(1, r * 0.28), 0, TAU); g.fill(); }
      }
    }
    g.globalAlpha = 1;
  },
  drawLines(g, px) {
    g.strokeStyle = THEME.text; g.lineWidth = 1.2 * px; g.globalAlpha = 0.55;
    for (const L of this.flines) {
      g.beginPath(); g.moveTo(L[0], L[1]);
      for (let k = 2; k < L.length; k += 2) g.lineTo(L[k], L[k + 1]);
      g.stroke();
    }
    g.fillStyle = THEME.text; g.globalAlpha = 0.75;
    const e = [0, 0];
    for (const L of this.flines) {
      const m = (Math.floor(L.length / 4) * 2) | 0, x = L[m], y = L[m + 1];
      this.E(x, y, e); const a = Math.atan2(e[1], e[0]), s = 5 * px;
      g.beginPath(); g.moveTo(x + s * Math.cos(a), y + s * Math.sin(a)); g.lineTo(x + s * Math.cos(a + 2.5), y + s * Math.sin(a + 2.5)); g.lineTo(x + s * Math.cos(a - 2.5), y + s * Math.sin(a - 2.5)); g.fill();
    }
    g.globalAlpha = 1;
  },
  drawVectors(g, w, h, px) {
    const sp = 34, e = [0, 0], ref = this.K() / 1600 + Math.abs(this.p.E0) || 1;
    g.strokeStyle = THEME.amber; g.lineWidth = 1.2 * px; g.globalAlpha = 0.8; g.beginPath();
    for (let y = sp / 2; y < h; y += sp) for (let x = sp / 2; x < w; x += sp) {
      this.E(x, y, e); const m = Math.hypot(e[0], e[1]); if (m < 1e-9) continue;
      const L = clamp(10 * Math.log1p(m / ref * 4), 2, 15), ux = e[0] / m, uy = e[1] / m, tx = x + ux * L, ty = y + uy * L;
      g.moveTo(x - ux * L * 0.4, y - uy * L * 0.4); g.lineTo(tx, ty);
      g.lineTo(tx - 4 * (ux * 0.8 - uy * 0.5), ty - 4 * (uy * 0.8 + ux * 0.5)); g.moveTo(tx, ty); g.lineTo(tx - 4 * (ux * 0.8 + uy * 0.5), ty - 4 * (uy * 0.8 - ux * 0.5));
    }
    g.stroke(); g.globalAlpha = 1;
  },
  drawParticles(g, px) {
    const T = this.trail;
    if (this.p.trails) {
      g.lineWidth = 1.3 * px; g.lineJoin = 'round';
      for (let i = 0; i < this.n; i++) {
        const tn = this.tn[i]; if (tn < 2) continue;
        const o = i * TR * 2, h0 = this.th[i];
        g.strokeStyle = this.qm[i] > 0 ? THEME.amber : THEME.cyan; g.globalAlpha = this.pid[i] === this.track ? 0.85 : 0.45;
        g.beginPath();
        for (let k = 0; k < tn; k++) { const j = ((h0 - tn + k + TR) % TR) * 2; k ? g.lineTo(T[o + j], T[o + j + 1]) : g.moveTo(T[o + j], T[o + j + 1]); }
        g.lineTo(this.x[i], this.y[i]); g.stroke();
      }
      g.globalAlpha = 1;
    }
    for (let i = 0; i < this.n; i++) {
      const pos = this.qm[i] > 0, r = 3.2 * Math.max(px, 0.6);
      g.fillStyle = pos ? THEME.amber : THEME.cyan; g.beginPath(); g.arc(this.x[i], this.y[i], r, 0, TAU); g.fill();
      if (this.pid[i] === this.track) { g.strokeStyle = THEME.text; g.lineWidth = 1.2 * px; g.beginPath(); g.arc(this.x[i], this.y[i], r + 4 * px, 0, TAU); g.stroke(); }
    }
  },
  drawCharge(g, c, px) {
    const r = this.chargeR(c), pos = c.q > 0;
    g.save(); g.shadowColor = pos ? THEME.amber : THEME.cyan; g.shadowBlur = 18; drawSphere(g, c.x, c.y, r, pos ? [242, 140, 70] : [60, 170, 210]); g.restore();
    g.strokeStyle = THEME.ink; g.lineWidth = Math.max(1.6, r * 0.18); g.lineCap = 'round';
    const s = r * 0.45; g.beginPath(); g.moveTo(c.x - s, c.y); g.lineTo(c.x + s, c.y);
    if (pos) { g.moveTo(c.x, c.y - s); g.lineTo(c.x, c.y + s); }
    g.stroke(); g.lineCap = 'butt';
    if (Math.abs(c.q) > 1) { g.fillStyle = THEME.text; g.font = `500 ${11 * px}px ${THEME.mono}`; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(String(Math.abs(c.q)), c.x + r * 0.75, c.y - r * 0.6); }
  },
  drawProbe(g, px) {
    const P = this.probe, v = this.probeVal, s = 7 * px;
    g.strokeStyle = THEME.text; g.lineWidth = 1.3 * px;
    g.beginPath(); g.arc(P.x, P.y, s, 0, TAU); g.moveTo(P.x - s * 1.8, P.y); g.lineTo(P.x - s * 0.5, P.y); g.moveTo(P.x + s * 0.5, P.y); g.lineTo(P.x + s * 1.8, P.y);
    g.moveTo(P.x, P.y - s * 1.8); g.lineTo(P.x, P.y - s * 0.5); g.moveTo(P.x, P.y + s * 0.5); g.lineTo(P.x, P.y + s * 1.8); g.stroke();
    if (v.E > 1e-9) {
      const L = clamp(14 * Math.log1p(v.E / (this.K() / 1600 + 1) * 4), 8, 60) * px, ux = v.ex / v.E, uy = v.ey / v.E, tx = P.x + ux * L, ty = P.y + uy * L;
      g.strokeStyle = THEME.amber; g.lineWidth = 2 * px; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(tx, ty);
      g.lineTo(tx - 6 * px * (ux * 0.8 - uy * 0.5), ty - 6 * px * (uy * 0.8 + ux * 0.5)); g.moveTo(tx, ty); g.lineTo(tx - 6 * px * (ux * 0.8 + uy * 0.5), ty - 6 * px * (uy * 0.8 - ux * 0.5)); g.stroke();
    }
    g.font = `400 ${11 * px}px ${THEME.mono}`; g.textAlign = 'left'; g.textBaseline = 'top';
    const text = [`|E| ${fmtField(v.E, this.K() / 1e6)}`, `V ${fmtField(v.V, this.Vscale())}`], tx = P.x + 12 * px, ty = P.y + 10 * px, bw = 92 * px, bh = 34 * px;
    g.fillStyle = THEME.ink; g.globalAlpha = 0.82; g.fillRect(tx - 4 * px, ty - 3 * px, bw, bh); g.globalAlpha = 1;
    g.fillStyle = THEME.text; text.forEach((s2, k) => g.fillText(s2, tx, ty + k * 14 * px));
  },
  mini(g, k) {
    for (const c of this.charges) { g.fillStyle = c.q > 0 ? THEME.amber : THEME.cyan; const r = Math.max(this.chargeR(c), 2 / k); g.fillRect(c.x - r, c.y - r, 2 * r, 2 * r); }
    g.fillStyle = THEME.text; g.globalAlpha = 0.7;
    for (let i = 0; i < this.n; i++) { const r = 1.2 / k; g.fillRect(this.x[i] - r, this.y[i] - r, 2 * r, 2 * r); }
    g.globalAlpha = 1;
  },
  unit() { return { name: 'px', k: 1 }; },

  /* ---------- panel: readouts, diagnostics, chart, math ---------- */
  stats() {
    let qnet = 0; for (const c of this.charges) qnet += c.q;
    const B = this.Bz(this.h / 2), qm = this.p.qm, i = this.indexOf(this.track);
    let drift = NaN;
    if (i >= 0 && Number.isFinite(this.E0track)) {
      // Measure drift against the energy being exchanged, never against a total
      // that happens to sit near zero (a particle released where V = 0).
      const en = this.energyOf(i), S = this.series;
      let ref = Math.max(Math.abs(this.E0track), Math.abs(en.ke), Math.abs(en.pe), 0.05 * this.p.qm * this.Vscale());
      for (let k = 0; k < S.ke.n; k++) { const j = S.ke.idx(k); ref = Math.max(ref, S.ke.v[j], Math.abs(S.pe.v[j])); }
      drift = (en.et - this.E0track) / ref;
    }
    return { qnet, B, T: B !== 0 ? TAU / (qm * Math.abs(B)) : Infinity, vd: B !== 0 && this.p.E0 !== 0 ? Math.abs(this.p.E0 / B) : NaN, drift, ti: i };
  },
  readouts() {
    const s = this.stats(), pv = this.probeVal;
    return [
      ['Source charges', `${this.charges.length} · net ${s.qnet > 0 ? '+' : s.qnet < 0 ? '−' : ''}${Math.abs(s.qnet)}`],
      ['Test particles', String(this.n)],
      ['Absorbed · escaped', `${this.absorbed} · ${this.escaped}`],
      ['Probe |E|', pv ? fmtField(pv.E, this.K() / 1e6) : '—'],
      ['Probe potential V', pv ? fmtField(pv.V, this.Vscale()) : '—'],
      ['B at centre', s.B === 0 ? '0' : `${s.B > 0 ? '⊗' : '⊙'} ${Math.abs(s.B).toFixed(2)}`],
      ['Cyclotron period 2πm/|q|B', Number.isFinite(s.T) ? `${s.T.toFixed(2)} s` : '—'],
      ['E × B drift speed E/B', Number.isFinite(s.vd) ? `${s.vd.toFixed(1)} px/s` : '—'],
      ['Energy drift (charted particle)', Number.isFinite(s.drift) ? pct(s.drift) : '—', Number.isFinite(s.drift) ? (Math.abs(s.drift) < 0.01 ? 'ok' : Math.abs(s.drift) < 0.05 ? 'warn' : 'crit') : null],
    ];
  },
  diagnose() {
    const out = [], s = this.stats();
    if (!this.charges.length && !this.n && this.p.E0 === 0 && this.p.B === 0 && !this.p.beam) {
      out.push({ id: 'f-empty', level: 'info', title: 'Empty space', body: 'Place a charge with <b>Add +</b> or <b>Add −</b>, or turn on a magnetic field and launch a particle.' });
      return out;
    }
    if (Number.isFinite(s.drift) && Math.abs(s.drift) > 0.03) {
      out.push({ id: 'f-drift', level: 'warn', title: 'The charted particle is gaining or losing energy', body: `Its total energy has drifted by <b>${pct(s.drift)}</b>. Static fields cannot do that, so the cause is numerical: a pass very close to a charge, where the field changes faster than one time step can follow.`,
        fixes: [{ label: 'Restart its energy count', run() { fields.setTrack(fields.track); } }] });
    }
    const wdt = Math.abs(this.p.qm * this.p.B) * (1 + this.p.gradB) * this.dt();
    if (wdt > 0.25) out.push({ id: 'f-gyro', level: 'warn', title: 'Gyration is under-resolved', body: `Each time step turns a particle by <b>${(wdt * 180 / Math.PI).toFixed(0)}°</b>. The Boris pusher stays stable but the orbit shape gets coarse.` });
    if (this.n >= FIELD_P_CAP) out.push({ id: 'f-cap', level: 'info', title: 'Particle limit reached', body: `At most ${FIELD_P_CAP} test particles fly at once. Clear some, or turn the beam off.`, fixes: [{ label: 'Clear particles', run() { fields.clearParticles(); } }] });
    if (this.p.B !== 0 && this.p.E0 !== 0) out.push({ id: 'f-exb', level: 'info', title: 'Crossed fields', body: `Every particle, positive or negative, slow or fast, drifts sideways at <b>E/B = ${s.vd.toFixed(1)} px/s</b>. The drift does not depend on charge or mass.` });
    return out;
  },
  sane() {
    for (let i = 0; i < this.n; i++) if (!Number.isFinite(this.x[i]) || !Number.isFinite(this.vx[i])) return false;
    return this.charges.every(c => Number.isFinite(c.x) && Number.isFinite(c.y));
  },
  chart: {
    title: 'Particle energy', caption: '',
    draw(c) {
      const L = fields, S = L.series;
      fields.chart.caption = 'Kinetic energy ½mv² (amber) and electric potential energy qV (cyan) of the ringed particle, per unit mass. Their sum (white) stays flat: a magnetic force never does work.';
      if (S.et.n < 2) { chartMessage(c.g, c.w, c.h, L.n ? 'Charting the ringed particle…' : 'Launch a particle to chart its energy'); return; }
      const [lo, hi] = seriesRange([S.ke, S.pe, S.et]), box = chartFrame(c.g, c.w, c.h, lo, hi, fmtSI);
      drawSeries(c.g, box, S.ke, lo, hi, THEME.amber, { fill: true });
      drawSeries(c.g, box, S.pe, lo, hi, THEME.cyan);
      drawSeries(c.g, box, S.et, lo, hi, THEME.text, { width: 1.3 });
    },
  },
  math: `
    <p>Each source charge contributes a Coulomb field, and fields add as vectors (superposition). The potential adds as plain numbers:</p>
    <div class="f" data-tex="\\mathbf E(\\mathbf r) = \\sum_i k\\,q_i\\,\\frac{\\mathbf r - \\mathbf r_i}{|\\mathbf r - \\mathbf r_i|^3}, \\qquad V(\\mathbf r) = \\sum_i \\frac{k\\,q_i}{|\\mathbf r - \\mathbf r_i|}"></div>
    <p>The field is minus the gradient of the potential, <span data-tex="\\mathbf E = -\\nabla V" data-inline="true"></span>, so field lines always cross equipotentials at right angles. A softening length ε = 6 px keeps the field finite at a charge.</p>
    <p>A particle of charge <i>q</i> and mass <i>m</i> feels the Lorentz force:</p>
    <div class="f" data-tex="m\\,\\frac{d\\mathbf v}{dt} = q\\,(\\mathbf E + \\mathbf v \\times \\mathbf B)"></div>
    <p>The magnetic part is always perpendicular to <b>v</b>, so it bends the path without changing the speed. In a uniform field a particle circles at the cyclotron frequency, the same for every speed; faster particles just draw bigger circles:</p>
    <div class="f" data-tex="\\omega_c = \\frac{|q|\\,B}{m}, \\qquad r_L = \\frac{v_\\perp}{\\omega_c}, \\qquad T = \\frac{2\\pi m}{|q|\\,B}"></div>
    <p>Crossed electric and magnetic fields make every particle drift sideways at the same velocity, whatever its charge or mass:</p>
    <div class="f" data-tex="\\mathbf v_{E} = \\frac{\\mathbf E \\times \\mathbf B}{B^2}"></div>
    <p>A magnetic field that grows across the orbit makes the circle tighter on its strong side, and the guiding centre creeps along the field contours. Positive and negative charges creep in opposite directions:</p>
    <div class="f" data-tex="\\mathbf v_{\\nabla B} = \\frac{m\\,v_\\perp^2}{2\\,q\\,B^3}\\;\\mathbf B \\times \\nabla B"></div>
    <p>Particles move with the Boris pusher: half an electric kick, an exact rotation by the magnetic field, then the other half kick. The rotation keeps the speed fixed to rounding error, which is why gyration stays stable for thousands of turns:</p>
    <div class="f" data-tex="\\begin{aligned} \\mathbf v^- &amp;= \\mathbf v_n + \\tfrac{q}{m}\\mathbf E\\,\\tfrac{\\Delta t}{2}, \\quad \\mathbf t = \\tfrac{q}{m}\\mathbf B\\,\\tfrac{\\Delta t}{2}, \\quad \\mathbf s = \\frac{2\\mathbf t}{1 + t^2} \\\\ \\mathbf v^+ &amp;= \\mathbf v^- + (\\mathbf v^- + \\mathbf v^- \\times \\mathbf t) \\times \\mathbf s \\\\ \\mathbf v_{n+1} &amp;= \\mathbf v^+ + \\tfrac{q}{m}\\mathbf E\\,\\tfrac{\\Delta t}{2} \\end{aligned}"></div>
    <p>Charges here are point charges in three dimensions seen in a plane, so the field falls off as 1/r². The drawn line density is a guide, not an exact flux count, because a flat slice cannot hold all the lines of a 3-D field.</p>`,
};

/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(fields, genericState, {
  histBudget: 8e6, histInterval: 0.2,
  snapshot() {
    const n = this.n, a = new Float64Array(n * 6);
    for (let i = 0; i < n; i++) { const o = i * 6; a[o] = this.pid[i]; a[o + 1] = this.x[i]; a[o + 2] = this.y[i]; a[o + 3] = this.vx[i]; a[o + 4] = this.vy[i]; a[o + 5] = this.qm[i]; }
    return { n, a, charges: this.charges.map(c => ({ ...c })), probe: this.probe ? { ...this.probe } : null, track: this.track, E0track: this.E0track, absorbed: this.absorbed, escaped: this.escaped, nextPid: this.nextPid, nextId: this.nextId, w: this.w, h: this.h };
  },
  restore(s) {
    if (s.w && (Math.abs(s.w - this.w) > 1 || Math.abs(s.h - this.h) > 1)) { const sx = this.w / s.w, sy = this.h / s.h; s = { ...s, charges: s.charges.map(c => ({ ...c, x: c.x * sx, y: c.y * sy })), probe: s.probe ? { x: s.probe.x * sx, y: s.probe.y * sy } : null, a: s.a.map((v, k) => (k % 6 === 1 ? v * sx : k % 6 === 2 ? v * sy : v)) }; }
    this.n = 0;
    for (let i = 0; i < s.n; i++) { const o = i * 6, k = this.addParticle(s.a[o + 1], s.a[o + 2], s.a[o + 3], s.a[o + 4], s.a[o + 5]); if (k >= 0) this.pid[k] = s.a[o]; }
    this.charges = s.charges.map(c => ({ ...c }));
    Object.assign(this, { probe: s.probe ? { ...s.probe } : null, track: s.track, E0track: s.E0track, absorbed: s.absorbed, escaped: s.escaped, nextPid: s.nextPid, nextId: s.nextId, drag: null, aim: null, brush: null, dirty: true });
    for (const ser of Object.values(this.series)) ser.truncateAfter(this.t);
    this.probeRead();
    return true;
  },
  dataColumns: ['t_s', 'charges', 'net_charge', 'particles', 'absorbed', 'escaped', 'probe_E', 'probe_V', 'tracked_kinetic', 'tracked_potential', 'tracked_total', 'tracked_drift_pct'],
  dataRow() {
    const s = this.stats(), pv = this.probeVal, en = s.ti >= 0 ? this.energyOf(s.ti) : null;
    return [this.t, this.charges.length, s.qnet, this.n, this.absorbed, this.escaped, pv ? pv.E : NaN, pv ? pv.V : NaN, en ? en.ke : NaN, en ? en.pe : NaN, en ? en.et : NaN, Number.isFinite(s.drift) ? s.drift * 100 : NaN];
  },
  trackLabel: 'Particle tracks',
  trackColumns: ['t_s', 'particle_id', 'charge_to_mass', 'x', 'y', 'vx', 'vy'],
  trackRows(out) { for (let i = 0; i < Math.min(this.n, 64); i++) out.push([this.t, this.pid[i], this.qm[i], this.x[i], this.y[i], this.vx[i], this.vy[i]]); },
});
