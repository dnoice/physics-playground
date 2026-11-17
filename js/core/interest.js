/*
✒ Metadata
    - Title: Areas of Interest (digiSpace Edition - v2.18)
    - File Name: interest.js
    - Relative Path: js/core/interest.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for a director's camera: the measurements the labs'
      interest() hooks share, so each lab names its areas of interest in a
      few lines.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Small measurements over a lab's particle arrays that say where something
    is happening: the densest patch, the fastest group and the fastest
    patch. The director's camera films what they find.

✒ Key Features:
    - densest() bins the points on a coarse grid and reports the fullest
      cell, its centroid and how many times the mean it holds.
    - fastGroup() reports where the particles faster than a multiple of the
      mean speed are, and how far they spread.
    - fastestCell() finds the cell whose particles move fastest on average.
    - Each returns one result object it reuses, so a look costs no garbage.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* ================================================================== */
/*  Areas of interest: where in a lab something is happening           */
/* ================================================================== */
const CELLS = new Int32Array(64), SUMS = new Float64Array(64);
const DENSE = { x: 0, y: 0, r: 0, ratio: 0, count: 0 }, FAST = { x: 0, y: 0, r: 0, ratio: 0, count: 0, speed: 0 }, SWIFT = { x: 0, y: 0, r: 0, speed: 0, count: 0 };
/* The grid the cell measurements share: 8 columns over a W × H world and rows to suit its shape, and the cell holding
   point i once its position is scaled by s (for a lab that stores positions in its own units, as Fluid does). */
function grid(W, H) { const cols = 8, rows = Math.max(2, Math.min(8, Math.round(cols * H / Math.max(1e-9, W)))); return { cols, rows, cw: W / cols, ch: H / rows }; }
const cellOf = (g, x, y) => Math.min(g.cols - 1, Math.max(0, Math.floor(x / g.cw))) + g.cols * Math.min(g.rows - 1, Math.max(0, Math.floor(y / g.ch)));

/* The fullest cell: its points' centroid, the cell's half-diagonal as the extent, its count and how many times the
   mean count per cell that is. */
export function densest(X, Y, n, W, H, s = 1) {
  const g = grid(W, H), R = DENSE, cell = i => cellOf(g, X[i] * s, Y[i] * s), cw = g.cw, ch = g.ch, cols = g.cols, rows = g.rows;
  CELLS.fill(0, 0, cols * rows);
  let best = 0;
  for (let i = 0; i < n; i++) { const k = cell(i); if (++CELLS[k] > CELLS[best]) best = k; }
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) if (cell(i) === best) { x += X[i] * s; y += Y[i] * s; }
  const c = CELLS[best];
  R.count = c; R.ratio = n ? c / (n / (cols * rows)) : 0;
  R.x = c ? x / c : W / 2; R.y = c ? y / c : H / 2; R.r = Math.hypot(cw, ch) * 0.75;
  return R;
}

/* The particles moving faster than k times the mean speed: their centroid, 1.6 times their root-mean-square distance
   from it as the extent, their count, their mean speed and that speed over the mean. */
export function fastGroup(X, Y, VX, VY, n, k, s = 1) {
  const R = FAST;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.hypot(VX[i], VY[i]);
  const mean = n ? sum / n : 0, cut = mean * k;
  let c = 0, x = 0, y = 0, v = 0;
  for (let i = 0; i < n; i++) { const sp = Math.hypot(VX[i], VY[i]); if (sp > cut && sp > 0) { c++; x += X[i]; y += Y[i]; v += sp; } }
  R.count = c; R.ratio = c && mean > 0 ? v / c / mean : 0; R.speed = c ? v / c : 0;
  if (!c) { R.x = R.y = R.r = 0; return R; }
  x /= c; y /= c;
  let d2 = 0;
  for (let i = 0; i < n; i++) { const sp = Math.hypot(VX[i], VY[i]); if (sp > cut && sp > 0) d2 += (X[i] - x) ** 2 + (Y[i] - y) ** 2; }
  R.x = x * s; R.y = y * s; R.r = Math.sqrt(d2 / c) * 1.6 * s;
  return R;
}
/* The cell whose particles move fastest on average, among cells holding at least min of them: their centroid, the
   cell's half-diagonal and that mean speed, in the arrays' own units. */
export function fastestCell(X, Y, VX, VY, n, W, H, s = 1, min = 6) {
  const g = grid(W, H), R = SWIFT, k = g.cols * g.rows;
  CELLS.fill(0, 0, k); SUMS.fill(0, 0, k);
  for (let i = 0; i < n; i++) { const c = cellOf(g, X[i] * s, Y[i] * s); CELLS[c]++; SUMS[c] += Math.hypot(VX[i], VY[i]); }
  let best = -1;
  for (let c = 0; c < k; c++) if (CELLS[c] >= min && (best < 0 || SUMS[c] / CELLS[c] > SUMS[best] / CELLS[best])) best = c;
  if (best < 0) { R.count = 0; R.speed = 0; R.x = W / 2; R.y = H / 2; R.r = Math.hypot(W, H) / 2; return R; }
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) if (cellOf(g, X[i] * s, Y[i] * s) === best) { x += X[i] * s; y += Y[i] * s; }
  R.count = CELLS[best]; R.speed = SUMS[best] / CELLS[best]; R.x = x / R.count; R.y = y / R.count; R.r = Math.hypot(g.cw, g.ch) * 0.75;
  return R;
}
