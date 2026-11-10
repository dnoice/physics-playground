/*
✒ Metadata
    - Title: Instruments Deck (digiSpace Edition - v2.5)
    - File Name: instruments.js
    - Relative Path: js/shell/instruments.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — sparkPath()
      is shared with the Inspect pane's figure sparklines.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Readings
      rank as primary or derived and set their units in a smaller face, so a
      narrow gauge keeps both. A selected object's figures can be plotted
      beside the readings (not remembered across visits), every series
      restarts when the units change, and the diagnostics sheet's code moves
      to the deck's Insights pane.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Lane
      backgrounds use rrect(), so the scope draws in browsers without
      CanvasRenderingContext2D.roundRect.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Telemetry pane of the instruments deck: every reading is a gauge with
    a sparkline; clicking one plots it on a shared time axis. The plot is
    live: hovering reads any moment, and clicking or dragging rewinds the
    simulation to that moment. Plotted figures of a selected object join the
    same scope.

✒ Key Features:
    - Gauges build from each lab's readouts; the primary readings (lab.primary,
      a list of labels or the first two) lead with larger figures, and a row
      marked derived says so.
    - Up to four series plot together, each in its own lane on one time axis,
      with their values in a legend that follows the cursor.
    - Click or drag on the scope to rewind; the wheel zooms the time window.
    - Plotted readings are remembered per lab; a selected object's figures
      plot under its own name and are not.
    - A change of unit system restarts every series, since old samples are in
      the old units.
    - With nothing plotted, the lab's own chart shows; the top alert and its
      first fix stay in the deck header.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { rrect } from '../core/draw.js';
import { Series } from '../core/series.js';
import { $, clamp, el, store } from '../core/util.js';
import { labs } from '../labs/index.js';
import { hist, histSeek } from './capture.js';
import { drawChart } from './panel.js';
import { active, announce } from './state.js';

/* Passes the categorical checks on the dark surface: lightness band, colour-blind separation and contrast. */
const CAP = 1200, SPARK = 64, MAX_PINS = 4, SERIES = ['#c4852a', '#2f9fc4', '#d9648c', '#8f7ae0'];
const SI = { k: 1e3, M: 1e6, G: 1e9, T: 1e12 };
const saved = store.get('pins', {});
/* A reading keeps its colour slot for as long as it is plotted, so removing one never repaints the others. */
function pin(I, label) {
  const used = new Set(I.slot.values());
  let k = 0; while (used.has(k)) k++;
  I.slot.set(label, k); I.pins.add(label);
}
function inst(lab) {
  if (lab.inst) return lab.inst;
  // obj holds the plotted figures of selected objects: they plot like readings but are not remembered across visits.
  const I = lab.inst = { series: new Map(), pins: new Set(), slot: new Map(), obj: new Set(), span: 0, hoverX: null };
  for (const label of saved[lab.id] || []) pin(I, label);
  return I;
}
export const scopeOn = lab => inst(lab).pins.size > 0;
/* A change of units restarts every plotted series: old samples are numbers in the old units. Pins stay. */
export function resetSeries() {
  for (const lab of labs) if (lab.inst) { lab.inst.series.clear(); lab.inst.hoverX = null; }
  gauges.forEach(n => { n.text = null; n.label = null; });
  legendKey = null;
}
const colorOf = (I, label) => SERIES[I.slot.get(label) ?? 0];

/* A reading plots only if it starts as a number: "0.5916 J/kg", "−8.8e-6 %" and "1.2k" do; "not yet" does not. */
export function readingValue(text) {
  const m = /^\s*([-+−]?\d[\d,]*\.?\d*(?:e[-+]?\d+)?)([kMGT](?![a-zA-Z]))?/.exec(text);
  return m ? Number(m[1].replace('−', '-').replace(/,/g, '')) * (SI[m[2]] || 1) : NaN;
}
const lastT = s => (s.n ? s.t[s.idx(s.n - 1)] : -Infinity);

/* Panel rate. Scrubbing the past leaves the recorded future alone; only a new branch discards it. */
function sample(lab, rows) {
  const I = inst(lab);
  if (hist(lab).pos >= 0) return;
  for (const [label, text] of rows) {
    let s = I.series.get(label);
    if (!s) I.series.set(label, s = new Series(CAP));
    if (lastT(s) > lab.t + 1e-9) s.truncateAfter(lab.t);
    if (lab.t > lastT(s) + 1e-9) s.push(lab.t, readingValue(text));
  }
}

/* ---------- gauges ---------- */
let gauges = [];
export function resetGauges() { gauges = []; $('#readouts').replaceChildren(); legendKey = null; }
function togglePin(lab, label) {
  const I = inst(lab);
  if (I.pins.has(label)) { I.pins.delete(label); I.slot.delete(label); I.obj.delete(label); }
  else if (I.pins.size < MAX_PINS) pin(I, label);
  else { announce(`Up to ${MAX_PINS} readings plot at once. Remove one first.`); return false; }
  saved[lab.id] = [...I.pins].filter(l => !I.obj.has(l)); store.set('pins', saved);
  refresh(lab);
  return true;
}

/* ---------- object figures: a selected object's numbers, plotted beside the lab's readings ---------- */
/* The key names the object as well as the figure, so two bodies' speeds are two series. */
export const objectKey = (info, row) => `${info.short || info.kicker}: ${row[0]}`;
export const objectPinned = (lab, key) => inst(lab).pins.has(key);
export const objectColor = (lab, key) => colorOf(inst(lab), key);
export function toggleObjectPin(lab, key) {
  const I = inst(lab), on = I.pins.has(key);
  if (!on) I.obj.add(key);
  if (!togglePin(lab, key)) { I.obj.delete(key); return false; }
  announce(on ? `Stopped plotting ${key}` : `Plotting ${key} under Telemetry`);
  return true;
}
/* Panel rate, as the readings: the figures of the selected object that are plotted take a sample each. */
export function sampleObject(lab, info) {
  const I = inst(lab);
  if (!info || !I.obj.size || hist(lab).pos >= 0) return;
  for (const row of info.rows) {
    const key = objectKey(info, row); if (!I.pins.has(key)) continue;
    let s = I.series.get(key);
    if (!s) I.series.set(key, s = new Series(CAP));
    if (lastT(s) > lab.t + 1e-9) s.truncateAfter(lab.t);
    if (lab.t > lastT(s) + 1e-9) s.push(lab.t, readingValue(row[1]));
  }
}
function gauge(lab, label) {
  // Primary readings lead the row with larger figures; derived ones (computed from others) are marked as such.
  const dt = el('dt'), dd = el('dd'), spark = el('span', { class: 'gauge-spark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path/></svg>' });
  const hit = el('button', { type: 'button', class: 'gauge-hit', 'aria-pressed': 'false' });
  const n = { root: el('div', { class: 'gauge' }, dt, dd, spark, hit), dt, dd, hit, path: spark.querySelector('path'), label: null, on: null };
  hit.addEventListener('click', () => togglePin(lab, n.label));
  return n;
}
/* A figure and its unit: the unit in a smaller face, so "0.5916 J/kg" fits a narrow gauge without losing either. */
const NUM = /^\s*([-+−]?\d[\d,]*\.?\d*(?:e[-+]?\d+)?[kMGT]?(?![a-zA-Z]))\s*(.*)$/;
function setValue(dd, text) {
  const m = NUM.exec(text);
  if (!m || !m[2]) { dd.textContent = text; return; }
  // One inline run, so the figure and its unit read and copy as one line ("1400 / 4000"), not two flex items.
  dd.replaceChildren(el('span', { class: 'val' }, el('span', { class: 'num', text: m[1] }), ' ', el('span', { class: 'unit', text: m[2] })));
}
export function sparkPath(s) {
  if (!s || s.n < 2) return '';
  const n = Math.min(s.n, SPARK);
  let lo = Infinity, hi = -Infinity, d = '';
  for (let i = s.n - n; i < s.n; i++) { const v = s.v[s.idx(i)]; if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!(hi >= lo)) return '';
  const k = hi > lo ? 18 / (hi - lo) : 0;
  for (let i = 0; i < n; i++) { const v = s.v[s.idx(s.n - n + i)]; if (Number.isFinite(v)) d += `${d ? 'L' : 'M'}${(i * 100 / (n - 1)).toFixed(1)} ${(19 - (v - lo) * k).toFixed(1)}`; }
  return d;
}
export function updateGauges(lab, rows) {
  sample(lab, rows);
  const dl = $('#readouts'), I = inst(lab);
  if (gauges.length !== rows.length) { gauges = rows.map(r => gauge(lab, r[0])); dl.replaceChildren(...gauges.map(n => n.root)); }
  rows.forEach((r, i) => {
    const n = gauges[i], s = I.series.get(r[0]);
    if (n.label !== r[0]) {
      const pr = lab.primary ?? 2, tier = r[3] || ((Array.isArray(pr) ? pr.includes(r[0]) : i < pr) ? 'primary' : 'secondary');
      n.label = r[0]; n.dt.textContent = r[0]; n.hit.setAttribute('aria-label', `Plot ${r[0]}`);
      n.root.classList.toggle('primary', tier === 'primary'); n.root.classList.toggle('derived', tier === 'derived');
      n.root.title = tier === 'derived' ? `${r[0]} (derived: computed from other figures, not measured directly)` : r[0];
    }
    if (n.text !== r[1]) { n.text = r[1]; setValue(n.dd, r[1]); }
    if (r[2]) n.dd.setAttribute('data-state', r[2]); else n.dd.removeAttribute('data-state');
    const on = I.pins.has(r[0]), numeric = Number.isFinite(readingValue(r[1])) || (!!s && Number.isFinite(s.last()));
    n.hit.disabled = !numeric && !on;
    if (n.on !== on) { n.on = on; n.hit.setAttribute('aria-pressed', String(on)); n.root.classList.toggle('on', on); }
    if (on) n.root.style.setProperty('--series', colorOf(I, r[0]));
    n.path.setAttribute('d', sparkPath(s));
  });
  renderLegend(lab);
}

/* ---------- scope ---------- */
const BOX = { l: 2, r: 2, t: 2, b: 16 }, LANE_GAP = 7;
function windowOf(lab) {
  const I = inst(lab), list = [...I.pins].map(l => I.series.get(l)).filter(s => s && s.n);
  if (!list.length) return null;
  const end = Math.max(...list.map(lastT)), first = Math.min(...list.map(s => s.t[s.idx(0)]));
  return { I, list, end, beg: I.span ? Math.max(first, end - I.span) : first, first };
}
function nearest(s, t) {
  let a = 0, b = s.n - 1;
  while (a < b) { const m = (a + b) >> 1; if (s.t[s.idx(m)] < t) a = m + 1; else b = m; }
  return a;
}
const timeAt = (W, x, w) => W.beg + clamp((x - BOX.l) / Math.max(1, w - BOX.l - BOX.r), 0, 1) * (W.end - W.beg);

/* Each reading gets its own lane on one time axis: their units differ, and a shared scale would be a lie. */
export function drawScope(c) {
  const { g, w, h } = c, lab = active, W = windowOf(lab);
  g.textBaseline = 'alphabetic';
  if (!W || W.end <= W.beg) { g.font = `400 12px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'center'; g.fillText('Collecting samples…', w / 2, h / 2); return; }
  const pins = [...W.I.pins].filter(l => { const s = W.I.series.get(l); return s && s.n; });
  const x0 = BOX.l, x1 = w - BOX.r, top = BOX.t, bottom = h - BOX.b, sx = t => x0 + (t - W.beg) / (W.end - W.beg) * (x1 - x0);
  const laneH = (bottom - top - LANE_GAP * (pins.length - 1)) / Math.max(1, pins.length);
  const H = hist(lab), hover = W.I.hoverX == null ? null : timeAt(W, W.I.hoverX, w);
  const kept = H.snaps.length ? sx(clamp(H.snaps[0].t, W.beg, W.end)) : x0;
  pins.forEach((label, n) => {
    const s = W.I.series.get(label), y0 = top + n * (laneH + LANE_GAP), y1 = y0 + laneH, a = Math.max(0, nearest(s, W.beg) - 1);
    g.fillStyle = 'rgba(255,255,255,0.025)'; g.beginPath(); rrect(g, x0, y0, x1 - x0, laneH, 7); g.fill();
    // History reaches back less far than the plot: shade what a click cannot rewind to.
    if (kept > x0) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, y0, kept - x0, laneH); }
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i < s.n; i++) { const v = s.v[s.idx(i)]; if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    if (hi >= lo) {
      if (hi - lo < 1e-12) { const m = Math.abs(hi) * 0.05 || 1; lo -= m; hi += m; }
      const pad = (hi - lo) * 0.12, sy = v => y1 - (v - lo + pad) / (hi - lo + 2 * pad) * laneH, col = colorOf(W.I, label);
      g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
      let pen = false;
      for (let i = a; i < s.n; i++) { const k = s.idx(i), v = s.v[k]; if (!Number.isFinite(v)) { pen = false; continue; } const X = sx(s.t[k]), Y = sy(v); pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; }
      g.stroke();
      if (hover != null) { const k = s.idx(nearest(s, hover)), v = s.v[k]; if (Number.isFinite(v)) { const X = sx(s.t[k]), Y = sy(v); g.fillStyle = THEME.ink; g.beginPath(); g.arc(X, Y, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(X, Y, 3.5, 0, Math.PI * 2); g.fill(); } }
    }
    g.font = '500 12px "Raleway", system-ui, sans-serif'; g.fillStyle = THEME.muted; g.textAlign = 'left';
    if (laneH >= 26) g.fillText(label, x0 + 9, y0 + 15);
  });
  g.font = `400 11px ${THEME.mono}`; g.fillStyle = THEME.muted;
  g.textAlign = 'left'; g.fillText(`t = ${W.beg.toFixed(1)} s`, x0 + 2, h - 3);
  g.textAlign = 'right'; g.fillText(`${W.end.toFixed(1)} s`, x1 - 2, h - 3);
  if (H.pos >= 0) { const X = Math.round(sx(clamp(H.snaps[H.pos].t, W.beg, W.end))) + 0.5; g.strokeStyle = THEME.amber; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, top); g.lineTo(X, bottom); g.stroke(); }
  if (hover != null) { const X = Math.round(sx(hover)) + 0.5; g.strokeStyle = THEME.text; g.globalAlpha = 0.45; g.lineWidth = 1; g.beginPath(); g.moveTo(X, top); g.lineTo(X, bottom); g.stroke(); g.globalAlpha = 1; g.textAlign = X > w - 90 ? 'right' : 'left'; g.fillStyle = THEME.text; g.fillText(`t = ${hover.toFixed(2)} s`, X + (X > w - 90 ? -6 : 6), h - 3); }
}

/* ---------- legend ---------- */
let legendKey = null, chips = [];
function renderLegend(lab) {
  const I = inst(lab), host = $('#scope-legend'), key = `${lab.id}:${[...I.pins].join('|')}`;
  if (key !== legendKey) {
    legendKey = key; chips = [];
    if (!I.pins.size) host.replaceChildren(el('span', { class: 'scope-hint', text: 'Click a reading to plot it here' }));
    else {
      host.replaceChildren(...[...I.pins].map(label => {
        const val = el('b'), x = el('button', { type: 'button', class: 'scope-x', 'aria-label': `Stop plotting ${label}`, title: 'Stop plotting', html: '<span class="ms" aria-hidden="true">close</span>', onclick: () => togglePin(lab, label) });
        chips.push({ label, val });
        return el('span', { class: 'scope-chip', style: `--series: ${colorOf(I, label)}`, title: label }, el('i'), el('span', { class: 'scope-name', text: label }), val, x);
      }));
    }
    $('#chart-title').textContent = I.pins.size ? 'Scope' : (lab.chart ? lab.chart.title : 'Chart');
    $('#tile-deck').classList.toggle('scoping', I.pins.size > 0);
  }
  const W = windowOf(lab), c = $('#chart'), t = W && I.hoverX != null ? timeAt(W, I.hoverX, c.clientWidth) : null;
  for (const { label, val } of chips) {
    const s = I.series.get(label), v = s && s.n ? (t == null ? s.last() : s.v[s.idx(nearest(s, t))]) : NaN, txt = Number.isFinite(v) ? Number(v.toPrecision(4)).toString() : '—';
    if (val.textContent !== txt) val.textContent = txt;
  }
}
function refresh(lab) { renderLegend(lab); drawChart(); const rows = lab.readouts(); updateGauges(lab, rows); }
/* Rewind to the time under the pointer, as far back as history reaches. */
function seekTo(lab, x, w) {
  const W = windowOf(lab), H = hist(lab); if (!W || H.snaps.length < 2) return;
  const t = timeAt(W, x, w);
  let a = 0, b = H.snaps.length - 1;
  while (a < b) { const m = (a + b) >> 1; if (H.snaps[m].t < t) a = m + 1; else b = m; }
  if (a !== H.pos) histSeek(lab, a);
}

/* ---------- top alert ---------- */
/* The top alert and its first fix stay in the header, so a problem never needs the sheet opened to act on it. */
export function showTopAlert(alert, apply) {
  const top = $('#diag-top');
  top.hidden = !alert;
  if (!alert) { top.replaceChildren(); return; }
  if (top.dataset.id === alert.id) return;
  top.dataset.id = alert.id;
  const fix = alert.fixes && alert.fixes[0];
  top.replaceChildren(el('span', { text: alert.title }));
  if (fix) top.append(el('button', { type: 'button', class: 'btn btn-fix', text: fix.label, onclick: () => { apply(alert, 0); top.dataset.id = ''; } }));
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  const c = $('#chart'), x = e => e.clientX - c.getBoundingClientRect().left;
  let scrub = null;
  c.addEventListener('pointermove', e => {
    if (!active || !scopeOn(active)) return;
    inst(active).hoverX = x(e);
    if (scrub === e.pointerId) seekTo(active, x(e), c.clientWidth);
    renderLegend(active); drawChart();
  });
  c.addEventListener('pointerleave', () => { if (!active) return; inst(active).hoverX = null; if (scopeOn(active)) { renderLegend(active); drawChart(); } });
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !active || !scopeOn(active)) return;
    scrub = e.pointerId;
    try { c.setPointerCapture(e.pointerId); } catch (_) { /* capture is best-effort */ }
    seekTo(active, x(e), c.clientWidth);
  });
  for (const type of ['pointerup', 'pointercancel']) c.addEventListener(type, () => { scrub = null; });
  c.addEventListener('wheel', e => {
    if (!active || !scopeOn(active)) return;
    e.preventDefault();
    const W = windowOf(active); if (!W) return;
    const span = (W.I.span || W.end - W.first) * Math.exp(e.deltaY * 0.0015);
    W.I.span = span >= W.end - W.first ? 0 : Math.max(2, span);
    drawChart();
  }, { passive: false });
}
