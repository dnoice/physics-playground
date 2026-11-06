/*
✒ Metadata
    - Title: Chart Drawing (digiSpace Edition - v2.0)
    - File Name: chart.js
    - Relative Path: js/core/chart.js
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
    Canvas helpers for the bottom-bay chart: sizing to the device pixel
    ratio, a labelled frame, line series and a centred message.

✒ Key Features:
    - canvasContext sizes the chart canvas to its box and the screen
      density.
    - chartFrame draws gridlines and three y labels and returns a
      value-to-pixel mapper.
    - drawSeries draws a line with optional gradient fill and a live end
      dot; velocityTracker smooths pointer throws.

✒ Usage Instructions:
    const c = canvasContext(canvas); const box = chartFrame(c.g, c.w, c.h,
    lo, hi, fmtSI);

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from './color.js';
import { TAU, clamp } from './util.js';
import { view } from './view.js';

/* ================================================================== */
/*  Chart helpers                                                      */
/* ================================================================== */
export function canvasContext(c) {
  if (!c) return null;
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return null;
  const pw = Math.round(w * view.dpr), ph = Math.round(h * view.dpr);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  const g = c.getContext('2d');
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}
export function chartFrame(g, w, h, ymin, ymax, fmt) {
  const box = { x0: 46, x1: w - 10, y0: 10, y1: h - 18 };
  box.sy = v => box.y1 - (v - ymin) / ((ymax - ymin) || 1) * (box.y1 - box.y0);
  g.font = `400 10px ${THEME.mono}`; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) {
    const y = Math.round(box.y0 + (box.y1 - box.y0) * k / 4) + 0.5;
    g.strokeStyle = THEME.rule; g.globalAlpha = k === 4 ? 1 : 0.55; g.lineWidth = 1;
    g.beginPath(); g.moveTo(box.x0, y); g.lineTo(box.x1, y); g.stroke();
  }
  g.globalAlpha = 1; g.fillStyle = THEME.muted;
  g.fillText(fmt(ymax), box.x0 - 6, box.y0);
  g.fillText(fmt((ymax + ymin) / 2), box.x0 - 6, (box.y0 + box.y1) / 2);
  g.fillText(fmt(ymin), box.x0 - 6, box.y1);
  return box;
}
export function chartMessage(g, w, h, text) {
  g.fillStyle = THEME.muted; g.font = `400 12px ${THEME.mono}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2);
}
export function seriesRange(list) {
  let lo = Infinity, hi = -Infinity;
  for (const s of list) for (let i = 0; i < s.n; i++) { const v = s.v[s.idx(i)]; if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!Number.isFinite(lo)) return [0, 1];
  if (hi - lo < 1e-9) { const m = Math.abs(hi) * 0.05 || 1; lo -= m; hi += m; }
  return [lo, hi];
}
export function drawSeries(g, box, s, ymin, ymax, color, { fill = false, width = 1.6 } = {}) {
  if (s.n < 2) return;
  const t0 = s.t[s.idx(0)], t1 = s.t[s.idx(s.n - 1)];
  const sx = t => box.x0 + (t - t0) / ((t1 - t0) || 1) * (box.x1 - box.x0);
  const sy = v => box.y1 - (clamp(v, ymin, ymax) - ymin) / ((ymax - ymin) || 1) * (box.y1 - box.y0);
  const path = () => { g.beginPath(); for (let i = 0; i < s.n; i++) { const k = s.idx(i); const X = sx(s.t[k]), Y = sy(s.v[k]); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } };
  if (fill) {
    path(); g.lineTo(sx(t1), box.y1); g.lineTo(sx(t0), box.y1); g.closePath();
    const grd = g.createLinearGradient(0, box.y0, 0, box.y1);
    grd.addColorStop(0, color); grd.addColorStop(1, 'transparent');
    g.save(); g.globalAlpha = 0.22; g.fillStyle = grd; g.fill(); g.restore();
  }
  path(); g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.stroke();
  const k = s.idx(s.n - 1);
  g.fillStyle = color; g.beginPath(); g.arc(sx(s.t[k]), sy(s.v[k]), 2.8, 0, TAU); g.fill();
}
export function velocityTracker() {
  return { x: 0, y: 0, t: 0, vx: 0, vy: 0,
    reset(p) { this.x = p.x; this.y = p.y; this.t = performance.now(); this.vx = 0; this.vy = 0; },
    update(p) {
      const now = performance.now(), dt = Math.max(1, now - this.t) / 1000;
      this.vx += ((p.x - this.x) / dt - this.vx) * 0.5; this.vy += ((p.y - this.y) / dt - this.vy) * 0.5;
      this.x = p.x; this.y = p.y; this.t = now;
    } };
}
