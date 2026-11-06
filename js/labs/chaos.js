/*
✒ Metadata
    - Title: Chaos Lab (digiSpace Edition - v2.0)
    - File Name: chaos.js
    - Relative Path: js/labs/chaos.js
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
    Several double pendulums started a hair apart; their separation grows
    exponentially and gives a Lyapunov estimate.

✒ Key Features:
    - RK4 integration of the full double-pendulum equations.
    - Pendulum and phase-space views; drag a bob or set angles in the phase
      square.
    - Separation chart on a log scale, with the moment the copies diverge.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chartFrame, chartMessage, drawSeries } from '../core/chart.js';
import { genericState } from '../core/codec.js';
import { RAMP_HEAT, THEME } from '../core/color.js';
import { drawSphere, mixRgb, rampRgb } from '../core/draw.js';

import { Series } from '../core/series.js';
import { TAU, clamp, wrapAngle } from '../core/util.js';

import { camOf } from '../shell/camera.js';
import { rebuild, setParam } from '../shell/lifecycle.js';


import { syncControl } from '../shell/panel.js';
import { canvas } from '../shell/state.js';

/* ================================================================== */
/*  Lab 5 · Chaos (double pendulums)                                   */
/* ================================================================== */
export const PEND_TRAIL = 900;
export const pendulum = {
  id: 'chaos', name: 'Chaos', title: 'Chaotic double pendulum',
  eq: 'δ(t) ≈ δ<sub>0</sub> e<sup>λt</sup>',
  eqTex: '\\delta(t) \\approx \\delta_0\\, e^{\\lambda t}',
  aria: 'Chaos simulation: several double pendulums starting almost identically',
  blurb: 'A double pendulum is fully deterministic and still unpredictable. Several copies start a hair apart; the gap between them grows exponentially until they share nothing but their energy. The front pendulum is drawn as solid steel, its bobs sized by mass.',
  interact: [
    '<b>Pendulums</b> view: drag either bob of the front pendulum to set new starting angles; every copy restarts from there.',
    '<b>Phase space</b> view: each copy is a dot at (θ₁, θ₂) on a square torus. Click or drag anywhere in the square to start from that point.',
    'Shrink <b>Perturbation</b> to see how little a smaller error buys you: each factor of ten adds the same few seconds.',
  ],
  dock: { key: 'view', label: 'View', options: [
    { id: 'pend', label: 'Pendulums', key: 'v', icon: 'pend', hint: 'Drag a bob of the front pendulum to set the starting angles' },
    { id: 'phase', label: 'Phase space', key: 'q', icon: 'phase', hint: 'Click or drag in the square to start every copy from that (θ₁, θ₂)' },
  ] },
  p: { view: 'pend', theta1: 120, theta2: -20, copies: 24, delta: 1e-4, mass: 1, len: 1, g: 9.81, damp: 0, trails: true, trailLen: 300 },
  presetId: 'chaos',
  presets: [
    { id: 'chaos', label: 'Sensitive start', params: { theta1: 120, theta2: -20, copies: 24, delta: 1e-4, mass: 1, len: 1, damp: 0 } },
    { id: 'flip', label: 'Near inverted', params: { theta1: 175, theta2: 170, copies: 30, delta: 1e-6, mass: 1, len: 1, damp: 0 } },
    { id: 'calm', label: 'Small swing', params: { theta1: 14, theta2: -9, copies: 12, delta: 1e-3, mass: 1, len: 1, damp: 0 } },
    { id: 'mode', label: 'Normal mode', params: { theta1: 10, theta2: 14.1421, copies: 1, delta: 1e-4, mass: 1, len: 1, damp: 0 } },
  ],
  controls: [
    { type: 'range', key: 'theta1', label: 'Start angle θ₁', min: -180, max: 180, step: 1, unit: '°', rebuild: 'input', note: 'Restarts every copy as you slide.' },
    { type: 'range', key: 'theta2', label: 'Start angle θ₂', min: -180, max: 180, step: 0.1, unit: '°', rebuild: 'input', note: 'Restarts every copy as you slide.' },
    { type: 'range', key: 'copies', label: 'Copies', min: 1, max: 60, step: 1, rebuild: true, note: 'Restarts the scene when released.' },
    { type: 'range', key: 'delta', label: 'Perturbation δ₀ between copies', min: 1e-9, max: 1e-1, log: true, rebuild: true, fmt: v => v.toExponential(0) + ' rad' },
    { type: 'range', key: 'mass', label: 'Mass ratio m₂ / m₁', min: 0.1, max: 5, log: true, fmt: v => v.toFixed(2) },
    { type: 'range', key: 'len', label: 'Length ratio L₂ / L₁', min: 0.3, max: 2, step: 0.05, fmt: v => v.toFixed(2) },
    { type: 'range', key: 'g', label: 'Gravity g', min: 1, max: 30, step: 0.01, unit: 'm/s²' },
    { type: 'range', key: 'damp', label: 'Damping', min: 0, max: 0.5, step: 0.01, unit: '/s' },
    { type: 'range', key: 'trailLen', label: 'Trail length', min: 20, max: PEND_TRAIL, step: 10, fmt: v => (v / 60).toFixed(1) + ' s' },
    { type: 'toggle', key: 'trails', label: 'Show trails' },
  ],
  actions: [{ label: 'Restart from these angles', run() { rebuild(pendulum); } }],
  N: 0, s: new Float64Array(240), trails: null, phist: null, tn: 0, th: 0, trailClock: 0, E0: 0, holding: false, drag: null, wmax: 0,
  sep: new Series(1800), sepClock: 0, lyap: NaN, divergeAt: NaN,
  k1: new Float64Array(4), k2: new Float64Array(4), k3: new Float64Array(4), k4: new Float64Array(4), tmp: new Float64Array(4),
  pivot: { x: 0, y: 0 }, scale: 100, sq: { x0: 0, y0: 0, S: 1 },
  dt() { return 1 / 600; }, maxSteps: 64,

  build() {
    const N = this.N = Math.round(this.p.copies), d2r = Math.PI / 180;
    this.s = new Float64Array(N * 4);
    for (let i = 0; i < N; i++) { this.s[i * 4] = this.p.theta1 * d2r; this.s[i * 4 + 1] = this.p.theta2 * d2r + i * this.p.delta; }
    this.trails = new Float32Array(N * PEND_TRAIL * 2); this.phist = new Float32Array(N * PEND_TRAIL * 2); this.tn = 0; this.th = 0;
    this.sep.clear(); this.sepClock = 0; this.lyap = NaN; this.divergeAt = NaN; this.wmax = 0;
    this.E0 = this.energy(0);
  },
  deriv(t1, t2, w1, w2, out) {
    const M = this.p.mass, L = this.p.len, g = this.p.g, b = this.p.damp;
    const d = t1 - t2, sd = Math.sin(d), cd = Math.cos(d), den = 2 + M - M * Math.cos(2 * d);
    out[0] = w1; out[1] = w2;
    out[2] = (-g * (2 + M) * Math.sin(t1) - M * g * Math.sin(t1 - 2 * t2) - 2 * sd * M * (w2 * w2 * L + w1 * w1 * cd)) / den - b * w1;
    out[3] = (2 * sd * (w1 * w1 * (1 + M) + g * (1 + M) * Math.cos(t1) + w2 * w2 * L * M * cd)) / (L * den) - b * w2;
  },
  energy(i) {
    const M = this.p.mass, L = this.p.len, g = this.p.g, s = this.s, o = i * 4;
    const t1 = s[o], t2 = s[o + 1], w1 = s[o + 2], w2 = s[o + 3];
    return 0.5 * (1 + M) * w1 * w1 + 0.5 * M * L * L * w2 * w2 + M * L * w1 * w2 * Math.cos(t1 - t2) - (1 + M) * g * Math.cos(t1) - M * g * L * Math.cos(t2);
  },
  step(dt) {
    const s = this.s, { k1, k2, k3, k4, tmp } = this;
    for (let i = 0; i < this.N; i++) {
      const o = i * 4;
      this.deriv(s[o], s[o + 1], s[o + 2], s[o + 3], k1);
      for (let j = 0; j < 4; j++) tmp[j] = s[o + j] + k1[j] * dt / 2;
      this.deriv(tmp[0], tmp[1], tmp[2], tmp[3], k2);
      for (let j = 0; j < 4; j++) tmp[j] = s[o + j] + k2[j] * dt / 2;
      this.deriv(tmp[0], tmp[1], tmp[2], tmp[3], k3);
      for (let j = 0; j < 4; j++) tmp[j] = s[o + j] + k3[j] * dt;
      this.deriv(tmp[0], tmp[1], tmp[2], tmp[3], k4);
      for (let j = 0; j < 4; j++) s[o + j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
    }
    if ((this.trailClock += dt) >= 1 / 60) {
      this.trailClock = 0;
      const L = this.p.len;
      for (let i = 0; i < this.N; i++) {
        const o = i * 4, k = (i * PEND_TRAIL + this.th) * 2;
        this.trails[k] = Math.sin(s[o]) + L * Math.sin(s[o + 1]); this.trails[k + 1] = Math.cos(s[o]) + L * Math.cos(s[o + 1]);
        this.phist[k] = wrapAngle(s[o]); this.phist[k + 1] = wrapAngle(s[o + 1]);
        const wm = Math.max(Math.abs(s[o + 2]), Math.abs(s[o + 3])); if (wm > this.wmax) this.wmax = wm;
      }
      this.th = (this.th + 1) % PEND_TRAIL; if (this.tn < PEND_TRAIL) this.tn++;
    }
  },
  separation() {
    if (this.N < 2) return NaN;
    const s = this.s, tau = Math.sqrt(1 / this.p.g);
    const a = wrapAngle(s[4] - s[0]), b = wrapAngle(s[5] - s[1]), c = (s[6] - s[2]) * tau, d = (s[7] - s[3]) * tau;
    return Math.sqrt(a * a + b * b + c * c + d * d);
  },
  after() {
    if (this.N < 2) return;
    if (this.t - this.sepClock >= 1 / 30 || this.sep.n === 0) {
      this.sepClock = this.t;
      const d = this.separation();
      this.sep.push(this.t, Math.log10(Math.max(d, 1e-14)));
      if (!Number.isFinite(this.divergeAt)) {
        if (this.t > 0.3) this.lyap = Math.log(d / this.p.delta) / this.t;
        if (d >= 0.1) this.divergeAt = this.t;
      }
    }
  },
  onParam(key) { if (key === 'mass' || key === 'len' || key === 'g') this.E0 = this.energy(0); },
  layout(w, h) {
    this.scale = 0.9 * Math.min(w / 2, h / 2) / (1 + this.p.len);
    this.pivot = { x: w / 2, y: h / 2 };
    const S = Math.min(w, h) * 0.78; this.sq = { x0: (w - S) / 2, y0: (h - S) / 2, S };
  },
  bobs(i) {
    const s = this.s, o = i * 4, S = this.scale, P = this.pivot, L = this.p.len;
    const x1 = P.x + S * Math.sin(s[o]), y1 = P.y + S * Math.cos(s[o]);
    return { x1, y1, x2: x1 + S * L * Math.sin(s[o + 1]), y2: y1 + S * L * Math.cos(s[o + 1]) };
  },
  bobR() { return [10, clamp(10 * Math.cbrt(this.p.mass), 5, 22)]; },
  unit() { return { name: 'm', k: 1 / this.scale }; },
  hitBob(p) {
    if (!this.N || this.p.view !== 'pend') return null;
    const b = this.bobs(0), [r1, r2] = this.bobR(), sl = 12 / camOf(this).z;
    if (Math.hypot(p.x - b.x2, p.y - b.y2) < r2 + sl) return 2;
    if (Math.hypot(p.x - b.x1, p.y - b.y1) < r1 + sl) return 1;
    return null;
  },
  inSquare(p) { const q = this.sq; return p.x >= q.x0 && p.x <= q.x0 + q.S && p.y >= q.y0 && p.y <= q.y0 + q.S; },
  cursorAt(p) { if (this.p.view === 'phase') return this.inSquare(p) ? 'crosshair' : 'default'; return this.hitBob(p) ? 'grab' : 'default'; },
  setFromSquare(p) {
    const q = this.sq;
    this.p.theta1 = Math.round(clamp((p.x - q.x0) / q.S, 0, 1) * 360 - 180);
    this.p.theta2 = Math.round((180 - clamp((p.y - q.y0) / q.S, 0, 1) * 360) * 10) / 10;
    rebuild(this); syncControl('theta1'); syncControl('theta2');
  },
  pointerDown(p) {
    if (this.p.view === 'phase') { if (this.inSquare(p)) { this.drag = 'sq'; this.holding = true; this.setFromSquare(p); } return; }
    const k = this.hitBob(p); if (!k) return;
    this.drag = k; this.holding = true; canvas.style.cursor = 'grabbing';
  },
  pointerMove(p, e, down) {
    if (!down || !this.drag) return;
    if (this.drag === 'sq') { this.setFromSquare(p); return; }
    const r2d = 180 / Math.PI;
    if (this.drag === 1) this.p.theta1 = Math.round(Math.atan2(p.x - this.pivot.x, p.y - this.pivot.y) * r2d);
    else { const b = this.bobs(0); this.p.theta2 = Math.round(Math.atan2(p.x - b.x1, p.y - b.y1) * r2d * 10) / 10; }
    rebuild(this); syncControl('theta1'); syncControl('theta2');
  },
  pointerUp() { this.drag = null; this.holding = false; },
  colorOf(i) { return this.N === 1 ? THEME.text : RAMP_HEAT.css[Math.round(70 + 185 * i / Math.max(1, this.N - 1))]; },
  drawPhase(g, w, h) {
    const q = this.sq, N = this.N, mx = th => q.x0 + (th + Math.PI) / TAU * q.S, my = th => q.y0 + (Math.PI - th) / TAU * q.S, px = 1 / camOf(this).z;
    g.fillStyle = 'rgba(16,21,29,0.6)'; g.fillRect(q.x0, q.y0, q.S, q.S);
    g.strokeStyle = THEME.rule; g.lineWidth = px;
    g.strokeRect(q.x0 + 0.5 * px, q.y0 + 0.5 * px, q.S, q.S);
    g.beginPath();
    for (const f of [0.25, 0.5, 0.75]) { g.moveTo(q.x0 + q.S * f, q.y0); g.lineTo(q.x0 + q.S * f, q.y0 + q.S); g.moveTo(q.x0, q.y0 + q.S * f); g.lineTo(q.x0 + q.S, q.y0 + q.S * f); }
    g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
    g.font = `400 ${10 * px}px ${THEME.mono}`; g.fillStyle = THEME.muted;
    g.textAlign = 'center'; g.textBaseline = 'top';
    [['−π', 0], ['0', 0.5], ['π', 1]].forEach(([t, f]) => g.fillText(t, q.x0 + q.S * f, q.y0 + q.S + 6 * px));
    g.textAlign = 'right'; g.textBaseline = 'middle';
    [['π', 0], ['0', 0.5], ['−π', 1]].forEach(([t, f]) => g.fillText(t, q.x0 - 8 * px, q.y0 + q.S * f));
    g.font = `italic 400 ${16 * px}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`; g.fillStyle = THEME.text;
    g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('θ₁', q.x0 + q.S / 2, q.y0 + q.S + 20 * px);
    g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('θ₂', q.x0 - 30 * px, q.y0 + q.S / 2);
    if (this.p.trails && this.tn > 1) {
      const len = Math.min(this.tn, Math.round(this.p.trailLen));
      g.globalAlpha = N > 8 ? 0.28 : 0.45;
      for (let i = 0; i < N; i++) {
        g.fillStyle = this.colorOf(i);
        for (let k = 0; k < len; k++) { const idx = (this.th - len + k + PEND_TRAIL) % PEND_TRAIL, o = (i * PEND_TRAIL + idx) * 2; g.fillRect(mx(this.phist[o]) - 0.75, my(this.phist[o + 1]) - 0.75, 1.5, 1.5); }
      }
      g.globalAlpha = 1;
    }
    for (let i = N - 1; i >= 0; i--) {
      g.fillStyle = this.colorOf(i);
      g.beginPath(); g.arc(mx(wrapAngle(this.s[i * 4])), my(wrapAngle(this.s[i * 4 + 1])), i === 0 ? 5 : 3.5, 0, TAU); g.fill();
    }
    if (this.hover && this.inSquare(this.hover)) {
      const hx = this.hover.x, hy = this.hover.y;
      g.strokeStyle = THEME.amber; g.globalAlpha = 0.5; g.setLineDash([3 * px, 4 * px]);
      g.beginPath(); g.moveTo(hx, q.y0); g.lineTo(hx, q.y0 + q.S); g.moveTo(q.x0, hy); g.lineTo(q.x0 + q.S, hy); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
    }
  },
  draw(g, w, h) {
    this.layout(w, h);
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    if (this.p.view === 'phase') { this.drawPhase(g, w, h); return; }
    const P = this.pivot, S = this.scale, L = this.p.len, N = this.N, px = 1 / camOf(this).z;
    g.strokeStyle = THEME.rule; g.lineWidth = px; g.setLineDash([2 * px, 6 * px]);
    g.beginPath(); g.arc(P.x, P.y, S * (1 + L), 0, TAU); g.stroke(); g.setLineDash([]);
    if (this.p.trails && this.tn > 1) {
      const len = Math.min(this.tn, Math.round(this.p.trailLen));
      g.lineWidth = px; g.globalAlpha = N > 8 ? 0.35 : 0.55;
      for (let i = N - 1; i >= 0; i--) {
        g.strokeStyle = this.colorOf(i); g.beginPath();
        for (let k = 0; k < len; k++) {
          const idx = (this.th - len + k + PEND_TRAIL) % PEND_TRAIL, o = (i * PEND_TRAIL + idx) * 2, X = P.x + S * this.trails[o], Y = P.y + S * this.trails[o + 1];
          k ? g.lineTo(X, Y) : g.moveTo(X, Y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    const [r1, r2] = this.bobR();
    for (let i = N - 1; i >= 1; i--) {
      const b = this.bobs(i), c = this.colorOf(i);
      g.strokeStyle = c; g.globalAlpha = 0.7; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke();
      g.fillStyle = c;
      g.beginPath(); g.arc(b.x1, b.y1, r1 * 0.7, 0, TAU); g.fill();
      g.beginPath(); g.arc(b.x2, b.y2, r2 * 0.7, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // ceiling mount
    g.fillStyle = '#222b37'; g.fillRect(P.x - 22, P.y - 15, 44, 7);
    g.fillStyle = '#2f3a48'; g.fillRect(P.x - 4, P.y - 9, 8, 9);
    if (N) {
      const b = this.bobs(0), c = N === 1 ? [222, 228, 236] : rampRgb(RAMP_HEAT, 70);
      g.lineCap = 'round';
      for (const [w, col] of [[7, '#1d252f'], [5, '#5d6b7d'], [1.6, 'rgba(232,237,243,0.55)']]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke();
      }
      g.lineCap = 'butt';
      drawSphere(g, b.x1, b.y1, r1, mixRgb(c, [150, 160, 175], 0.35));
      drawSphere(g, b.x2, b.y2, r2, mixRgb(c, [150, 160, 175], 0.35));
      for (const [x, y] of [[b.x1, b.y1]]) { g.fillStyle = '#1d252f'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
    }
    drawSphere(g, P.x, P.y, 6.5, [242, 165, 65]);
    g.fillStyle = '#1d252f'; g.beginPath(); g.arc(P.x, P.y, 2.2, 0, TAU); g.fill();
  },
  mini(g, k) {
    if (!this.N) return;
    const b = this.bobs(0), P = this.pivot;
    g.strokeStyle = THEME.amber; g.lineWidth = 1.5 / k; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke();
    g.fillStyle = THEME.text; for (const [x, y] of [[b.x1, b.y1], [b.x2, b.y2]]) { g.beginPath(); g.arc(x, y, 3 / k, 0, TAU); g.fill(); }
  },
  readouts() {
    const E = this.N ? this.energy(0) : 0, drift = this.E0 ? (E - this.E0) / Math.abs(this.E0) * 100 : 0, ad = Math.abs(drift);
    let spread = 0;
    for (let i = 1; i < this.N; i++) spread = Math.max(spread, Math.abs(wrapAngle(this.s[i * 4 + 1] - this.s[1])));
    const damped = this.p.damp > 0;
    return [
      ['Energy E (front pendulum)', `${E.toFixed(4)} J/kg`],
      ['Energy drift', damped ? 'damped' : `${drift >= 0 ? '+' : ''}${drift.toExponential(1)} %`, damped ? 'idle' : ad < 1e-3 ? 'ok' : ad < 1e-1 ? 'warn' : 'crit'],
      ['Spread of θ₂ across copies', this.N > 1 ? `${(spread * 180 / Math.PI).toFixed(spread < 0.01 ? 4 : 1)}°` : '—'],
      ['Lyapunov estimate λ', this.N < 2 ? 'needs 2+ copies' : Number.isFinite(this.lyap) ? `${this.lyap.toFixed(2)} s⁻¹` : 'measuring…'],
      ['Copies diverged (δ ≥ 0.1)', this.N < 2 ? '—' : Number.isFinite(this.divergeAt) ? `at t = ${this.divergeAt.toFixed(2)} s` : 'not yet'],
      ['Fastest spin so far', `${this.wmax.toFixed(1)} rad/s`],
    ];
  },
  diagnose() {
    const out = [], damped = this.p.damp > 0;
    if (!damped && this.N) {
      const E = this.energy(0), drift = this.E0 ? Math.abs((E - this.E0) / this.E0) * 100 : 0;
      if (drift > 0.01) out.push({ id: 'p-drift', level: drift > 0.5 ? 'crit' : 'warn', title: 'Integrator error is growing', body: `Energy has drifted <b>${drift.toFixed(3)}%</b>. Spins up to ${this.wmax.toFixed(0)} rad/s cover a large angle per 1/600 s step, which RK4 follows less exactly.`,
        fixes: this.p.g > 12 ? [{ label: 'Gravity 9.81', run() { setParam(pendulum, 'g', 9.81); rebuild(pendulum); } }] : [] });
    }
    if (this.N >= 2 && Number.isFinite(this.lyap) && this.lyap > 0.2) {
      out.push({ id: 'p-horizon', level: 'info', title: 'Predictability horizon', body: `λ ≈ <b>${this.lyap.toFixed(2)} s⁻¹</b>, so each tenfold cut in the starting error buys only ln 10 / λ ≈ <b>${(Math.LN10 / this.lyap).toFixed(1)} s</b> more agreement between copies.` });
    }
    if (this.N >= 2 && this.t > 15 && !Number.isFinite(this.divergeAt) && (!Number.isFinite(this.lyap) || this.lyap < 0.2)) {
      out.push({ id: 'p-regular', level: 'info', title: 'Regular motion', body: 'After 15 s the copies are still together and the separation is growing slowly, not exponentially. This start sits on a quasi-periodic island rather than in the chaotic sea.' });
    }
    if (damped) out.push({ id: 'p-damped', level: 'info', title: 'Transient chaos', body: `With damping ${this.p.damp}/s energy drains away, so the chaos cannot last: every copy ends hanging straight down.` });
    if (this.N === 1 && this.presetId !== 'mode') out.push({ id: 'p-one', level: 'info', title: 'One copy', body: 'Divergence needs a second copy to compare against. Raise Copies to 2 or more.', fixes: [{ label: 'Use 12 copies', run() { setParam(pendulum, 'copies', 12); } }] });
    return out;
  },
  sane() { for (let i = 0; i < this.s.length; i++) if (!Number.isFinite(this.s[i])) return false; return true; },
  chart: {
    title: 'Separation of the first two copies',
    caption: 'log₁₀ of the state-space distance between copy 1 and copy 2. A straight climb is exponential growth, and its slope is the Lyapunov exponent; the flat top is saturation.',
    draw(c) {
      const P = pendulum, s = P.sep;
      if (P.N < 2) { chartMessage(c.g, c.w, c.h, 'Set Copies to 2 or more'); return; }
      if (s.n < 2) { chartMessage(c.g, c.w, c.h, 'Collecting samples…'); return; }
      const hi = 1;
      let lo = Math.floor(Math.log10(P.p.delta)) - 1;
      if ((hi - lo) % 2) lo -= 1;
      const box = chartFrame(c.g, c.w, c.h, lo, hi, v => '1e' + Math.round(v));
      drawSeries(c.g, box, s, lo, hi, THEME.amber, { fill: true });
      const g = c.g; g.fillStyle = THEME.muted; g.font = `400 10px ${THEME.mono}`; g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillText(`t = ${s.t[s.idx(0)].toFixed(1)} s`, box.x0, c.h - 5);
      g.textAlign = 'right'; g.fillText(`${s.t[s.idx(s.n - 1)].toFixed(1)} s`, box.x1, c.h - 5);
    },
  },
  math: `
    <p>The equations of motion come from the Lagrangian of two point masses on light rods (m<sub>1</sub> = 1 kg, L<sub>1</sub> = 1 m), integrated with fourth-order Runge–Kutta at Δt = 1/600 s. For the first arm, with ω = dθ/dt and Δ = θ<sub>1</sub> − θ<sub>2</sub>:</p>
    <div class="f" data-tex="\\alpha_1 = \\frac{\\begin{array}{c} -g\\,(2m_1 + m_2)\\sin\\theta_1 - m_2 g\\sin(\\theta_1 - 2\\theta_2) \\\\ -\\,2m_2 \\sin\\Delta\\,(\\omega_2^2 L_2 + \\omega_1^2 L_1\\cos\\Delta) \\end{array}}{L_1\\,(2m_1 + m_2 - m_2\\cos 2\\Delta)}"></div>
    <p>Copy <i>k</i> starts with θ<sub>2</sub> shifted by kδ<sub>0</sub>. The gap between copies grows as δ(t) ≈ δ<sub>0</sub>e<sup>λt</sup> until it reaches the size of the motion itself, so predictability lasts only about:</p>
    <div class="f" data-tex="t \\approx \\frac{1}{\\lambda}\\,\\ln\\frac{0.1}{\\delta_0}"></div>
    <p>The phase-space view plots (θ<sub>1</sub>, θ<sub>2</sub>) wrapped to (−π, π]. Its opposite edges join, so the square is really a torus.</p>
    <p>Small swings with equal masses and lengths have two normal modes, θ<sub>2</sub> / θ<sub>1</sub> = ±√2, with frequencies:</p>
    <div class="f" data-tex="\\omega^2 = \\left(2 \\mp \\sqrt2\\right)\\frac{g}{L}"></div>
    <p>The Normal mode scene starts on the slower, in-phase one.</p>
    <p>The bobs are drawn with volume proportional to mass (radius ∝ m<sup>1/3</sup>, equal density), but the equations still treat them as point masses on massless rods.</p>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(pendulum, genericState, {
  histBudget: 8e6, histInterval: 0.1,
  snapshot() { return { N: this.N, s: this.s.slice(), lyap: this.lyap, divergeAt: this.divergeAt, wmax: this.wmax }; },
  restore(o) {
    if (o.N !== this.N) return false;
    this.s.set(o.s); this.lyap = o.lyap ?? NaN; this.divergeAt = o.divergeAt ?? NaN; this.wmax = o.wmax || 0;
    this.sep.truncateAfter(this.t); this.sepClock = this.t; this.tn = 0; this.th = 0;
    return true;
  },
  dataColumns: ['t_s', 'copies', 'energy', 'energy_drift_pct', 'log10_separation', 'lyapunov_estimate', 'theta1', 'theta2', 'omega1', 'omega2'],
  dataRow() {
    const E = this.N ? this.energy(0) : NaN, d = this.separation();
    return [this.t, this.N, E, this.E0 ? (E - this.E0) / Math.abs(this.E0) * 100 : 0, Number.isFinite(d) ? Math.log10(Math.max(d, 1e-14)) : NaN, this.lyap, this.s[0], this.s[1], this.s[2], this.s[3]];
  },
  trackLabel: 'Per-copy tracks',
  trackColumns: ['t_s', 'copy', 'theta1', 'theta2', 'omega1', 'omega2', 'bob2_x_m', 'bob2_y_m'],
  trackRows(out) {
    const L = this.p.len;
    for (let i = 0; i < this.N; i++) { const o = i * 4, s = this.s; out.push([this.t, i, s[o], s[o + 1], s[o + 2], s[o + 3], Math.sin(s[o]) + L * Math.sin(s[o + 1]), -(Math.cos(s[o]) + L * Math.cos(s[o + 1]))]); }
  },
});
