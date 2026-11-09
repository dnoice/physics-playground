/*
✒ Metadata
    - Title: Cloth Lab (digiSpace Edition - v2.3)
    - File Name: cloth.js
    - Relative Path: js/labs/cloth.js
    - Artifact Type: javascript
    - Version: 2.3.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Controls
      are grouped into Setup, Forces, Fabric and Display.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      3D rig, tool overlay and a stated visual relief; snapshots use
      Float64, and resizing no longer restarts the scene.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Verlet cloth with distance constraints, wind, tearing, cutting, pins and
    a ball collider, drawn with shading and a lining.

✒ Key Features:
    - Curtain, hammock, flag and fragile net scenes.
    - Tearing past a stretch threshold, cutting with right-drag, pin and
      ball tools.
    - Stretch and tearing-rate readouts with a runaway guard.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { genericState } from '../core/codec.js';
import { RAMP_HEAT, THEME } from '../core/color.js';
import { BLACK, WHITE, css, drawSphere, mixRgb } from '../core/draw.js';

import { TAU, clamp } from '../core/util.js';

import { camOf } from '../shell/camera.js';
import { rebuild, setParam } from '../shell/lifecycle.js';

import { syncControl } from '../shell/panel.js';
import { canvas } from '../shell/state.js';

/* ================================================================== */
/*  Lab 6 · Cloth                                                      */
/* ================================================================== */
export const CL_PTS = 5000, CL_LINKS = 10000, CL_MAXSTEP = 60;
export const cloth = {
  id: 'cloth', name: 'Cloth', title: 'Verlet cloth',
  rig3: { plane: 'wall', yaw: 0.3, pitch: 0.07, fit: 1.46, height: 0.05, pitchMin: -0.05, target: [0, 0.12, 0] },
  zoomRange: [0.5, 10],
  eq: 'x<sub>n+1</sub> = 2x<sub>n</sub> − x<sub>n−1</sub> + aΔt<sup>2</sup>',
  eqTex: '\\mathbf x_{n+1} = 2\\mathbf x_n - \\mathbf x_{n-1} + \\mathbf a\\,\\Delta t^2',
  aria: 'Cloth simulation: a sheet of linked points hanging under gravity',
  blurb: 'A sheet of points stepped with position Verlet and held together by distance constraints that are relaxed several times per step. The fabric darkens where it bunches into folds and shows its lining where it turns over. Threads colour by how far they are stretched, and tear when they pass their limit.',
  interact: [
    '<b>Grab</b> pulls the nearest point. <b>Cut</b> slices every link your stroke crosses. <b>Pin</b> fixes or frees the point you click.',
    '<b>Ball</b> drags a round collider through the sheet, so you can drape and push it.',
    'Hold <b>Shift</b> or use the right mouse button to cut with any tool. In 3D mode the right button still cuts and Shift-drag pans, so orbit with the middle button or the axis ball.',
  ],
  dock: { key: 'tool', label: 'Pointer tool', options: [
    { id: 'grab', label: 'Grab', key: 'g', icon: 'grab', get hint() { return `Drag to pull the cloth · ${cloth.is3D && cloth.is3D() ? 'right-drag' : 'Shift-drag or right-drag'} to cut`; } },
    { id: 'cut', label: 'Cut', key: 'c', icon: 'cut', hint: 'Drag across the cloth to slice it' },
    { id: 'pin', label: 'Pin', key: 'n', icon: 'pin', hint: 'Click a point to pin or free it' },
    { id: 'ball', label: 'Ball', key: 'b', icon: 'ball', hint: 'Drag the ball through the cloth to push and drape it' },
  ] },
  p: { tool: 'grab', gravity: 900, wind: 0, iters: 8, damping: 0.01, tearable: true, tear: 3, spacing: 14, fabric: true },
  presetId: 'curtain',
  presets: [
    { id: 'curtain', label: 'Curtain', params: { gravity: 900, wind: 140, tear: 3, spacing: 14, iters: 8 } },
    { id: 'hammock', label: 'Hammock', params: { gravity: 900, wind: 0, tear: 3.4, spacing: 14, iters: 8 } },
    { id: 'flag', label: 'Flag in wind', params: { gravity: 250, wind: 700, tear: 4, spacing: 14, iters: 8 } },
    { id: 'net', label: 'Fragile net', params: { gravity: 900, wind: 0, tear: 1.7, spacing: 22, iters: 8 } },
  ],
  groups: [
    { id: 'setup', label: 'Setup', icon: 'flag' },
    { id: 'forces', label: 'Forces', icon: 'balance' },
    { id: 'fabric', label: 'Fabric', icon: 'texture' },
    { id: 'display', label: 'Display', icon: 'visibility' },
  ],
  controls: [
    { type: 'range', key: 'gravity', label: 'Gravity', min: 0, max: 2000, step: 10, unit: 'px/s²', group: 'forces' },
    { type: 'range', key: 'wind', label: 'Wind', min: -1500, max: 1500, step: 10, unit: 'px/s²', note: 'Negative values blow to the left.', group: 'forces' },
    { type: 'range', key: 'iters', label: 'Constraint iterations', min: 1, max: 24, step: 1, note: 'More iterations make the cloth stiffer.', group: 'fabric' },
    { type: 'range', key: 'damping', label: 'Damping', min: 0, max: 0.1, step: 0.001, group: 'forces' },
    { type: 'range', key: 'tear', label: 'Tear at stretch', min: 1.3, max: 6, step: 0.05, fmt: v => v.toFixed(2) + '× rest', group: 'fabric' },
    { type: 'range', key: 'spacing', label: 'Mesh spacing', min: 8, max: 30, step: 1, unit: 'px', rebuild: true, group: 'setup' },
    { type: 'toggle', key: 'tearable', label: 'Links can tear', group: 'fabric' },
    { type: 'toggle', key: 'fabric', label: 'Shaded fabric surface', group: 'display', short: 'Shaded fabric' },
  ],
  actions: [
    { label: 'Release all pins', run() { cloth.pin.fill(0); } },
    { label: 'Calm the cloth', run() { const c = cloth; c.ox.set(c.x.subarray(0, c.n)); c.oy.set(c.y.subarray(0, c.n)); } },
  ],
  x: new Float64Array(CL_PTS), y: new Float64Array(CL_PTS), ox: new Float64Array(CL_PTS), oy: new Float64Array(CL_PTS), pin: new Uint8Array(CL_PTS),
  la: new Int32Array(CL_LINKS), lb: new Int32Array(CL_LINKS), rest: new Float32Array(CL_LINKS), alive: new Uint8Array(CL_LINKS), lbin: new Uint8Array(CL_LINKS),
  hL: new Int32Array(CL_PTS), vL: new Int32Array(CL_PTS), cols: 0, rows: 0, sp0: 14, rightButton: true,
  n: 0, L: 0, w: 800, h: 600, grab: null, ball: null, cutting: false, lastCut: null, cutTrail: [], capped: 0, tearClock: 0, tornLast: 0, tearRate: 0,
  meanStretch: 0, maxStretch: 0, aliveCount: 0,
  dt() { return 1 / 120; }, maxSteps: 16,

  ballR() { return clamp(this.p.spacing * 3.5, 30, 90); },
  build(preset, w, h) {
    Object.assign(this, { w, h, n: 0, L: 0, grab: null, ball: null, cutTrail: [], capped: 0, tearClock: 0, tornLast: 0, tearRate: 0 });
    let s = this.p.spacing, cols, rows, x0, y0;
    if (preset === 'flag') { cols = Math.floor(w * 0.5 / s); rows = Math.floor(cols * 0.6); x0 = w * 0.18; y0 = h * 0.14; }
    else { cols = Math.floor(w * 0.66 / s); rows = Math.floor(h * 0.6 / s); y0 = h * 0.08; }
    cols = clamp(cols, 6, 90); rows = clamp(rows, 4, 60);
    while (cols * rows > 4400) { cols--; rows = Math.max(4, rows - 1); }
    if (preset !== 'flag') x0 = (w - (cols - 1) * s) / 2;
    const id = (c, r) => r * cols + c;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = this.n++, X = x0 + c * s, Y = y0 + r * s;
      this.x[i] = X; this.y[i] = Y; this.ox[i] = X; this.oy[i] = Y; this.pin[i] = 0;
    }
    const link = (a, b) => { const k = this.L++; this.la[k] = a; this.lb[k] = b; this.rest[k] = Math.hypot(this.x[b] - this.x[a], this.y[b] - this.y[a]); this.alive[k] = 1; };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c < cols - 1) { this.hL[id(c, r)] = this.L; link(id(c, r), id(c + 1, r)); }
      if (r < rows - 1) { this.vL[id(c, r)] = this.L; link(id(c, r), id(c, r + 1)); }
    }
    this.cols = cols; this.rows = rows; this.sp0 = s;
    if (preset === 'curtain') { for (let c = 0; c < cols; c += 3) this.pin[id(c, 0)] = 1; this.pin[id(cols - 1, 0)] = 1; }
    else if (preset === 'hammock') { this.pin[id(0, 0)] = 1; this.pin[id(cols - 1, 0)] = 1; }
    else if (preset === 'flag') { for (let r = 0; r < rows; r++) this.pin[id(0, r)] = 1; }
    else if (preset === 'net') { for (let c = 0; c < cols; c++) this.pin[id(c, 0)] = 1; }
    this.aliveCount = this.L;
  },
  worldRect() { return { w: this.w, h: this.h }; },
  step(dt) {
    const n = this.n, X = this.x, Y = this.y, OX = this.ox, OY = this.oy, pin = this.pin, dt2 = dt * dt;
    const g = this.p.gravity, wd = this.p.wind, damp = 1 - this.p.damping, t = this.t, G = this.grab;
    let capped = 0;
    for (let i = 0; i < n; i++) {
      if (pin[i] || (G && G.i === i)) continue;
      let vx = (X[i] - OX[i]) * damp, vy = (Y[i] - OY[i]) * damp;
      const sp = vx * vx + vy * vy;
      if (sp > CL_MAXSTEP * CL_MAXSTEP) { const k = CL_MAXSTEP / Math.sqrt(sp); vx *= k; vy *= k; capped++; }
      OX[i] = X[i]; OY[i] = Y[i];
      let ax = 0, ay = g;
      if (wd) {
        const gust = 0.62 + 0.38 * Math.sin(t * 1.9 + Y[i] * 0.017) + 0.25 * Math.sin(t * 5.3 + X[i] * 0.031 + Y[i] * 0.011);
        ax += wd * gust; ay += wd * 0.18 * Math.sin(t * 3.1 + X[i] * 0.02);
      }
      X[i] += vx + ax * dt2; Y[i] += vy + ay * dt2;
    }
    this.capped += capped;
    if (G) { const i = G.i; OX[i] = X[i]; OY[i] = Y[i]; X[i] = G.tx; Y[i] = G.ty; }
    const la = this.la, lb = this.lb, rest = this.rest, alive = this.alive, tear = this.p.tearable ? this.p.tear : Infinity, gi = G ? G.i : -1, B = this.ball, BR = this.ballR();
    for (let it = 0; it < this.p.iters; it++) {
      for (let k = 0; k < this.L; k++) {
        if (!alive[k]) continue;
        const a = la[k], b = lb[k], dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
        if (d > rest[k] * tear) { alive[k] = 0; continue; }
        const wa = pin[a] || a === gi ? 0 : 1, wb = pin[b] || b === gi ? 0 : 1, ws = wa + wb;
        if (!ws) continue;
        const diff = (d - rest[k]) / (d * ws);
        X[a] += dx * diff * wa; Y[a] += dy * diff * wa; X[b] -= dx * diff * wb; Y[b] -= dy * diff * wb;
      }
      if (B) {
        const r2 = BR * BR;
        for (let i = 0; i < n; i++) {
          if (pin[i]) continue;
          const dx = X[i] - B.x, dy = Y[i] - B.y, d2 = dx * dx + dy * dy;
          if (d2 < r2) { const d = Math.sqrt(d2) || 1e-6; X[i] = B.x + dx / d * BR; Y[i] = B.y + dy / d * BR; }
        }
      }
    }
    const hb = this.h - 3, wr = this.w - 3;
    for (let i = 0; i < n; i++) {
      if (Y[i] > hb) { Y[i] = hb; OX[i] = X[i] - (X[i] - OX[i]) * 0.6; }
      else if (Y[i] < 3) { Y[i] = 3; OX[i] = X[i] - (X[i] - OX[i]) * 0.6; }
      if (X[i] < 3) X[i] = 3; else if (X[i] > wr) X[i] = wr;
    }
    if ((this.tearClock += dt) >= 0.5) {
      let a = 0; for (let k = 0; k < this.L; k++) a += alive[k];
      const torn = this.L - a; this.tearRate = (torn - this.tornLast) / this.tearClock; this.tornLast = torn; this.tearClock = 0;
    }
  },
  nearest(p, maxD) {
    maxD = Math.max(this.p.spacing * 0.75, maxD / camOf(this).z);
    let best = -1, bd = maxD * maxD;
    for (let i = 0; i < this.n; i++) { const d = (this.x[i] - p.x) ** 2 + (this.y[i] - p.y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  },
  cut(p0, p1) {
    const X = this.x, Y = this.y, ax = p0.x, ay = p0.y, bx = p1.x, by = p1.y;
    const cross = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
    for (let k = 0; k < this.L; k++) {
      if (!this.alive[k]) continue;
      const a = this.la[k], b = this.lb[k];
      const d1 = cross(ax, ay, bx, by, X[a], Y[a]), d2 = cross(ax, ay, bx, by, X[b], Y[b]);
      const d3 = cross(X[a], Y[a], X[b], Y[b], ax, ay), d4 = cross(X[a], Y[a], X[b], Y[b], bx, by);
      if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) this.alive[k] = 0;
    }
  },
  cursorAt(p) {
    const tool = this.p.tool;
    if (tool === 'cut' || tool === 'ball') return 'crosshair';
    return this.nearest(p, tool === 'pin' ? 20 : 40) >= 0 ? (tool === 'grab' ? 'grab' : 'cell') : 'default';
  },
  pointerDown(p, e) {
    const tool = this.p.tool;
    if (tool === 'cut' || e.shiftKey || e.button === 2) { this.cutting = true; this.lastCut = p; this.cutTrail = [{ ...p, t: performance.now() }]; return; }
    if (tool === 'ball') { this.ball = { x: p.x, y: p.y }; return; }
    if (tool === 'pin') { const i = this.nearest(p, 20); if (i >= 0) this.pin[i] = this.pin[i] ? 0 : 1; return; }
    const i = this.nearest(p, 40);
    if (i >= 0) { this.grab = { i, tx: p.x, ty: p.y }; canvas.style.cursor = 'grabbing'; }
  },
  pointerMove(p, e, down) {
    if (!down) return;
    if (this.cutting) { this.cut(this.lastCut, p); this.lastCut = p; this.cutTrail.push({ ...p, t: performance.now() }); if (this.cutTrail.length > 40) this.cutTrail.shift(); }
    else if (this.ball) { this.ball.x = p.x; this.ball.y = p.y; }
    else if (this.grab) { this.grab.tx = clamp(p.x, 3, this.w - 3); this.grab.ty = clamp(p.y, 3, this.h - 3); }
  },
  pointerUp() { this.cutting = false; this.grab = null; this.ball = null; },
  draw(g, w, h) {
    const z = camOf(this).z, px = 1 / z;
    g.fillStyle = THEME.ink; g.fillRect(0, 0, w, h);
    g.strokeStyle = THEME.rule; g.lineWidth = px; g.globalAlpha = 0.5;
    g.beginPath(); for (let x = 40; x < w; x += 40) { g.moveTo(x, 0); g.lineTo(x, h); } for (let y = 40; y < h; y += 40) { g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
    g.globalAlpha = 1;
    const X = this.x, Y = this.y, BINS = 12, lbin = this.lbin;
    if (this.p.fabric) this.drawFabric(g);
    let sum = 0, mx = 0, cnt = 0;
    for (let k = 0; k < this.L; k++) {
      if (!this.alive[k]) continue;
      const a = this.la[k], b = this.lb[k], s = Math.hypot(X[b] - X[a], Y[b] - Y[a]) / this.rest[k] - 1;
      sum += s; if (s > mx) mx = s; cnt++;
      lbin[k] = Math.min(BINS - 1, Math.max(0, (s / 0.5 * BINS) | 0));
    }
    this.meanStretch = cnt ? sum / cnt : 0; this.maxStretch = mx; this.aliveCount = cnt;
    g.lineWidth = (this.p.spacing > 18 ? 1.6 : 1.2) / Math.sqrt(z);
    if (this.p.fabric) g.globalAlpha = 0.6;
    for (let b = 0; b < BINS; b++) {
      g.strokeStyle = RAMP_HEAT.css[Math.round(70 + 185 * b / (BINS - 1))];
      g.beginPath(); let any = false;
      for (let k = 0; k < this.L; k++) { if (!this.alive[k] || lbin[k] !== b) continue; const a = this.la[k], c = this.lb[k]; g.moveTo(X[a], Y[a]); g.lineTo(X[c], Y[c]); any = true; }
      if (any) g.stroke();
    }
    g.globalAlpha = 1;
    const pinR = clamp(this.p.spacing * 0.28, 3, 5.5);
    for (let i = 0; i < this.n; i++) if (this.pin[i]) drawSphere(g, X[i], Y[i], pinR, [242, 165, 65]);
    if (this.grab) { const i = this.grab.i; g.strokeStyle = THEME.text; g.lineWidth = 1.5 * px; g.beginPath(); g.arc(X[i], Y[i], 7 * px + 2, 0, TAU); g.stroke(); }
    const BR = this.ballR(), bp = this.ball || (this.p.tool === 'ball' ? this.hover : null);
    if (this.ball) drawSphere(g, bp.x, bp.y, BR, [150, 162, 178], 0.96);
    else if (bp) {
      const grd = g.createRadialGradient(bp.x - BR * 0.35, bp.y - BR * 0.35, BR * 0.1, bp.x, bp.y, BR);
      grd.addColorStop(0, 'rgba(242,165,65,0.14)'); grd.addColorStop(1, 'rgba(242,165,65,0.04)');
      g.fillStyle = grd; g.beginPath(); g.arc(bp.x, bp.y, BR, 0, TAU); g.fill();
      g.strokeStyle = THEME.amber; g.globalAlpha = 0.45; g.lineWidth = 1.5 * px; g.stroke(); g.globalAlpha = 1;
    }
    const now = performance.now();
    this.cutTrail = this.cutTrail.filter(q => now - q.t < 350);
    if (this.cutTrail.length > 1) {
      g.strokeStyle = THEME.crit; g.lineWidth = 2 * px; g.globalAlpha = 0.8; g.beginPath();
      this.cutTrail.forEach((q, k) => k ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); g.globalAlpha = 1;
    }
  },
  /* Fabric panels between intact grid cells. Brightness follows the panel's
     area against its rest area: bunched cloth turns away from the light and
     darkens, a panel whose area flips sign has folded over to show its lining. */
  drawFabric(g) {
    const FB = 12, cols = this.cols, rows = this.rows, X = this.x, Y = this.y, A = this.alive, hL = this.hL, vL = this.vL, A0 = this.sp0 * this.sp0;
    const paths = Array.from({ length: FB * 2 }, () => new Path2D());
    const used = new Uint8Array(FB * 2);
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      if (!A[hL[a]] || !A[hL[d]] || !A[vL[a]] || !A[vL[b]]) continue;
      const q = 0.5 * ((X[e] - X[a]) * (Y[d] - Y[b]) - (Y[e] - Y[a]) * (X[d] - X[b])) / A0, m = Math.abs(q);
      const lum = clamp(0.24 + 0.76 * Math.pow(Math.min(m, 1), 1.6) + (m > 1 ? (m - 1) * 0.2 : 0), 0.2, 1.15);
      const k = Math.min(FB - 1, (lum / 1.15 * FB) | 0) + (q < 0 ? FB : 0);
      const P = paths[k]; P.moveTo(X[a], Y[a]); P.lineTo(X[b], Y[b]); P.lineTo(X[e], Y[e]); P.lineTo(X[d], Y[d]); P.closePath(); used[k] = 1;
    }
    const front = [62, 92, 130], back = [132, 94, 62];
    for (let k = 0; k < FB * 2; k++) {
      if (!used[k]) continue;
      const lum = ((k % FB) + 0.5) / FB * 1.15, base = k < FB ? front : back;
      g.fillStyle = css(lum <= 1 ? mixRgb(BLACK, base, lum) : mixRgb(base, WHITE, (lum - 1) * 1.6));
      g.fill(paths[k]);
    }
  },
  /* The readouts draw() refreshes in 2D. */
  measure3() {
    const X = this.x, Y = this.y;
    let sum = 0, mx = 0, cnt = 0;
    for (let k = 0; k < this.L; k++) {
      if (!this.alive[k]) continue;
      const a = this.la[k], b = this.lb[k], s = Math.hypot(X[b] - X[a], Y[b] - Y[a]) / this.rest[k] - 1;
      sum += s; if (s > mx) mx = s; cnt++;
    }
    this.meanStretch = cnt ? sum / cnt : 0; this.maxStretch = mx; this.aliveCount = cnt;
  },
  /* Screen overlay in 3D: the cut trail, the grab handle and what the tool would act on. */
  overlay3(g) {
    this.measure3();
    const k = this.plane3().k, lift = i => (this.relief3 ? this.relief3[i] * k : 0), H = this.hover, tool = this.p.tool, X = this.x, Y = this.y;
    const now = performance.now();
    if (this.cutTrail.length) this.cutTrail = this.cutTrail.filter(q => now - q.t < 350);
    if (this.cutTrail.length > 1) {
      g.strokeStyle = THEME.crit; g.lineWidth = 2; g.globalAlpha = 0.85; g.lineJoin = 'round'; g.beginPath();
      let on = false;
      for (const q of this.cutTrail) { const s = this.project3(q.x, q.y, 0.04); if (!s) continue; if (on) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); on = true; }
      g.stroke(); g.globalAlpha = 1;
    }
    if (this.grab) {
      const i = this.grab.i, s = this.project3(X[i], Y[i], lift(i));
      if (s) {
        g.strokeStyle = THEME.text; g.lineWidth = 1.5; g.beginPath(); g.arc(s.x, s.y, 9, 0, TAU); g.stroke();
        g.fillStyle = THEME.amber; g.beginPath(); g.arc(s.x, s.y, 3, 0, TAU); g.fill();
      }
      return;
    }
    if (!H || this.cutting || this.ball) return;
    if (tool === 'ball') {
      const R = this.ballR();
      g.strokeStyle = THEME.amber; g.globalAlpha = 0.6; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath();
      for (let a = 0; a <= 40; a++) { const s = this.project3(H.x + R * Math.cos(a / 40 * TAU), H.y + R * Math.sin(a / 40 * TAU), 0); if (s) g.lineTo(s.x, s.y); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    } else if (tool === 'cut') {
      const s = this.project3(H.x, H.y, 0);
      if (s) { g.strokeStyle = THEME.crit; g.lineWidth = 1.5; g.globalAlpha = 0.7; g.beginPath(); g.arc(s.x, s.y, 7, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    } else {
      const i = this.nearest(H, tool === 'pin' ? 20 : 40); if (i < 0) return;
      const s = this.project3(X[i], Y[i], lift(i)); if (!s) return;
      g.strokeStyle = tool === 'pin' && this.pin[i] ? THEME.crit : THEME.amber; g.lineWidth = 1.5; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(s.x, s.y, 9, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
  },
  mini(g, k) {
    g.fillStyle = 'rgba(95,208,223,0.75)'; const r = Math.max(1, 0.9 / k);
    for (let i = 0; i < this.n; i++) g.fillRect(this.x[i] - r, this.y[i] - r, 2 * r, 2 * r);
  },
  pins() { let p = 0; for (let i = 0; i < this.n; i++) p += this.pin[i]; return p; },
  readouts() {
    const alive = this.aliveCount, mx = this.maxStretch * 100;
    return [
      ['Points · pinned', `${this.n} · ${this.pins()}`],
      ['Links intact', `${alive} / ${this.L}`],
      ['Links torn or cut', String(this.L - alive)],
      ['Mean stretch', `${(this.meanStretch * 100).toFixed(2)} %`],
      ['Peak stretch', `${mx.toFixed(1)} %`, mx < 25 ? 'ok' : mx < 80 ? 'warn' : 'crit'],
      ['Tearing rate', `${Math.max(0, this.tearRate).toFixed(0)} links/s`],
    ];
  },
  diagnose() {
    const out = [], mx = this.maxStretch, it = this.p.iters, forces = [];
    if (this.p.gravity) forces.push(`gravity of ${this.p.gravity} px/s²`);
    if (this.p.wind) forces.push(`wind of ${this.p.wind} px/s²`);
    const fdesc = forces.length ? forces.join(' and ') : 'the forces on it';
    if (mx > 2 && !this.p.tearable) {
      out.push({ id: 'k-over', level: 'crit', title: 'The cloth is over-stretched', body: `Links are pulled to <b>${(1 + mx).toFixed(1)}×</b> their rest length. ${it} constraint iteration${it === 1 ? '' : 's'} per step cannot hold back ${fdesc}, and with tearing off the mesh can only stretch like rubber.${this.capped ? ' Some points are also hitting the per-step speed cap.' : ''}`,
        fixes: [...(it < 16 ? [{ label: 'Raise iterations to 16', run() { setParam(cloth, 'iters', 16); } }] : []), { label: 'Let links tear', run() { setParam(cloth, 'tearable', true); } }, { label: 'Restart the scene', run() { rebuild(cloth); } }] });
    } else if (mx > 0.5 && it < 4) {
      out.push({ id: 'k-rubber', level: 'warn', title: 'Rubbery cloth', body: `Peak stretch is <b>${(mx * 100).toFixed(0)}%</b>. With only ${it} iteration${it === 1 ? '' : 's'} the constraints barely pull back between steps.`,
        fixes: [{ label: 'Raise iterations to 10', run() { setParam(cloth, 'iters', 10); } }] });
    }
    if (this.capped > 0) {
      out.push({ id: 'k-cap', level: 'warn', title: 'Points are hitting the speed cap', body: `Some points tried to move more than ${CL_MAXSTEP} px in a single 1/120 s step and were held back. That keeps the cloth on screen but means ${fdesc} is beyond what the mesh can follow.`,
        fixes: [...(Math.abs(this.p.wind) > 800 ? [{ label: 'Calm the wind to 400', run() { setParam(cloth, 'wind', Math.sign(cloth.p.wind) * 400); } }] : []), { label: 'Add damping', run() { setParam(cloth, 'damping', Math.min(0.1, +(cloth.p.damping + 0.03).toFixed(3))); } }] });
      this.capped = 0;
    }
    if (this.tearRate > 40) out.push({ id: 'k-shred', level: 'info', title: 'The cloth is shredding', body: `${this.tearRate.toFixed(0)} links per second are tearing. Raise Tear at stretch for tougher fabric.` });
    if (this.n && !this.pins()) out.push({ id: 'k-free', level: 'info', title: 'No pins left', body: 'Nothing is holding the cloth, so it falls and piles on the floor. Use the Pin tool to hang it again.' });
    return out;
  },
  perfFixes() { return this.p.iters > 10 || this.p.spacing < 12 ? [{ label: 'Iterations 8, spacing 14', run() { cloth.p.iters = 8; syncControl('iters'); setParam(cloth, 'spacing', 14); } }] : []; },
  sane() { for (let i = 0; i < this.n; i++) if (!Number.isFinite(this.x[i]) || !Number.isFinite(this.y[i])) return false; return true; },
  chart: null,
  math: `
    <p>Position Verlet stores each point’s previous position instead of a velocity, with Δt = 1/120 s:</p>
    <div class="f" data-tex="\\mathbf x_{n+1} = \\mathbf x_n + (\\mathbf x_n - \\mathbf x_{n-1})(1 - \\text{damping}) + \\mathbf a\\,\\Delta t^2"></div>
    <p>Each link with rest length L<sub>0</sub> moves its two ends back toward that length, half each unless one end is pinned:</p>
    <div class="f" data-tex="\\Delta = \\frac{|\\mathbf d| - L_0}{|\\mathbf d|}\\cdot\\frac{\\mathbf d}{2}"></div>
    <p>Repeating that relaxation <i>k</i> times per step converges toward a stiff sheet; fewer iterations give stretchier fabric. Technique after <cite>Jakobsen (2001), Advanced Character Physics</cite>.</p>
    <p>A link tears once |d| passes the tear factor × L<sub>0</sub>. The ball collider pushes any point inside it back to its surface on every iteration, and a per-step cap of ${CL_MAXSTEP} px keeps extreme wind from flinging points off the stage.</p>
    <p>The fabric shade comes from each panel’s area A against its rest area A<sub>0</sub>: a sheet seen edge-on looks smaller, so bunching into folds reads as cloth turning away from the light. A negative area means the panel has flipped over, and the warm lining shows.</p>
    <p>The solver is planar: the depth in the 3D view is a visual relief, a height solved per node for display from compression, wind and contact, and it never feeds back into the cloth.</p>`,
};


/* ---------- capture hooks: rewind snapshots, datasets, saved states ---------- */
Object.assign(cloth, genericState, {
  histBudget: 16e6, histInterval: 0.25,
  snapshot() {
    const n = this.n, a = new Float64Array(n * 4), { gravity, wind, iters, damping, tearable, tear } = this.p;
    for (let i = 0; i < n; i++) { const o = i * 4; a[o] = this.x[i]; a[o + 1] = this.y[i]; a[o + 2] = this.ox[i]; a[o + 3] = this.oy[i]; }
    return { n, L: this.L, a, alive: this.alive.slice(0, this.L), pin: this.pin.slice(0, n), p: { gravity, wind, iters, damping, tearable, tear } };
  },
  restore(s) {
    if (s.n !== this.n || s.L !== this.L) return false;
    Object.assign(this.p, s.p);
    for (let i = 0; i < s.n; i++) { const o = i * 4; this.x[i] = s.a[o]; this.y[i] = s.a[o + 1]; this.ox[i] = s.a[o + 2]; this.oy[i] = s.a[o + 3]; }
    this.alive.set(s.alive); this.pin.set(s.pin);
    let a = 0; for (let k = 0; k < this.L; k++) a += this.alive[k];
    Object.assign(this, { grab: null, ball: null, cutting: false, tornLast: this.L - a, tearRate: 0, tearClock: 0 });
    return true;
  },
  dataColumns: ['t_s', 'points', 'pinned', 'links_intact', 'links_torn', 'mean_stretch', 'peak_stretch', 'tearing_per_s'],
  dataRow() { return [this.t, this.n, this.pins(), this.aliveCount, this.L - this.aliveCount, this.meanStretch, this.maxStretch, Math.max(0, this.tearRate)]; },
});
