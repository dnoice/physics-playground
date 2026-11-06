/*
✒ Metadata
    - Title: Instruments Deck (digiSpace Edition - v2.1)
    - File Name: instruments.js
    - Relative Path: js/shell/instruments.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created:
      the chart, readouts and diagnostics become one compact instrument, on
      Dennis's call that the panels took more room than they gave back.
    Earlier entries: see CHANGELOG.md

✒ Description:
    One tile in place of the chart, readouts and diagnostics panels. Every
    reading is a gauge with a sparkline; clicking one plots it on a shared
    time axis. The plot is live: hovering reads any moment, and clicking or
    dragging rewinds the simulation to that moment.

✒ Key Features:
    - Gauges build from each lab's readouts, so no lab needed changing.
    - Up to four readings plot together, each on its own scale, with their
      values in a legend that follows the cursor.
    - Click or drag on the scope to rewind; the wheel zooms the time window.
    - Plotted readings are remembered per lab, and a rewind that branches
      drops the abandoned future from the plot too.
    - With nothing plotted, the lab's own chart shows.
    - Diagnostics shrink to a status pill; the full list opens on demand, and
      the top alert and its fix stay in the header.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { Series } from '../core/series.js';
import { $, clamp, el, store } from '../core/util.js';
import { hist, histSeek } from './capture.js';
import { drawChart } from './panel.js';
import { active, announce } from './state.js';

const CAP = 1200, SPARK = 64, MAX_PINS = 4, INK = ['#f2a541', '#5fd0df', '#6fcf97', '#c58af9'];
const SI = { k: 1e3, M: 1e6, G: 1e9, T: 1e12 };
const saved = store.get('pins', {});
const inst = lab => lab.inst || (lab.inst = { series: new Map(), pins: new Set(saved[lab.id] || []), span: 0, hoverX: null });
export const scopeOn = lab => inst(lab).pins.size > 0;
const inkOf = (I, label) => INK[[...I.pins].indexOf(label) % INK.length];

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
  if (I.pins.has(label)) I.pins.delete(label);
  else if (I.pins.size < MAX_PINS) I.pins.add(label);
  else { announce(`Up to ${MAX_PINS} readings plot at once. Remove one first.`); return; }
  saved[lab.id] = [...I.pins]; store.set('pins', saved);
  refresh(lab);
}
function gauge(lab, label) {
  const dt = el('dt'), dd = el('dd'), spark = el('span', { class: 'gauge-spark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path/></svg>' });
  const hit = el('button', { type: 'button', class: 'gauge-hit', 'aria-pressed': 'false' });
  const n = { root: el('div', { class: 'gauge' }, dt, dd, spark, hit), dt, dd, hit, path: spark.querySelector('path'), label: null, on: null };
  hit.addEventListener('click', () => togglePin(lab, n.label));
  return n;
}
function sparkPath(s) {
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
    if (n.label !== r[0]) { n.label = r[0]; n.dt.textContent = r[0]; n.root.title = r[0]; n.hit.setAttribute('aria-label', `Plot ${r[0]}`); }
    if (n.dd.textContent !== r[1]) n.dd.textContent = r[1];
    if (r[2]) n.dd.setAttribute('data-state', r[2]); else n.dd.removeAttribute('data-state');
    const on = I.pins.has(r[0]), numeric = Number.isFinite(readingValue(r[1])) || (!!s && Number.isFinite(s.last()));
    n.hit.disabled = !numeric && !on;
    if (n.on !== on) { n.on = on; n.hit.setAttribute('aria-pressed', String(on)); n.root.classList.toggle('on', on); }
    if (on) n.root.style.setProperty('--ink', inkOf(I, r[0]));
    n.path.setAttribute('d', sparkPath(s));
  });
  renderLegend(lab);
}

/* ---------- scope ---------- */
const BOX = { l: 8, r: 8, t: 8, b: 16 };
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

export function drawScope(c) {
  const { g, w, h } = c, lab = active, W = windowOf(lab);
  g.font = `400 10px ${THEME.mono}`; g.textBaseline = 'alphabetic';
  if (!W || W.end <= W.beg) { g.fillStyle = THEME.muted; g.textAlign = 'center'; g.fillText('Collecting samples…', w / 2, h / 2); return; }
  const x0 = BOX.l, x1 = w - BOX.r, y0 = BOX.t, y1 = h - BOX.b, sx = t => x0 + (t - W.beg) / (W.end - W.beg) * (x1 - x0);
  g.strokeStyle = THEME.rule; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const y = Math.round(y0 + (y1 - y0) * k / 4) + 0.5; g.globalAlpha = k === 4 ? 1 : 0.45; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = THEME.muted;
  g.textAlign = 'left'; g.fillText(`t = ${W.beg.toFixed(1)} s`, x0, h - 4);
  g.textAlign = 'right'; g.fillText(`${W.end.toFixed(1)} s`, x1, h - 4);
  const H = hist(lab), hover = W.I.hoverX == null ? null : timeAt(W, W.I.hoverX, w);
  // History reaches back less far than the plot: shade what a click cannot rewind to.
  if (H.snaps.length) { const kept = sx(clamp(H.snaps[0].t, W.beg, W.end)); if (kept > x0) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x0, y0, kept - x0, y1 - y0); } }
  [...W.I.pins].forEach(label => {
    const s = W.I.series.get(label); if (!s || !s.n) return;
    const a = Math.max(0, nearest(s, W.beg) - 1);
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i < s.n; i++) { const v = s.v[s.idx(i)]; if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    if (!(hi >= lo)) return;
    if (hi - lo < 1e-12) { const m = Math.abs(hi) * 0.05 || 1; lo -= m; hi += m; }
    const pad = (hi - lo) * 0.08, sy = v => y1 - (v - lo + pad) / (hi - lo + 2 * pad) * (y1 - y0), col = inkOf(W.I, label);
    g.strokeStyle = col; g.lineWidth = 1.6; g.lineJoin = 'round'; g.beginPath();
    let pen = false;
    for (let i = a; i < s.n; i++) { const k = s.idx(i), v = s.v[k]; if (!Number.isFinite(v)) { pen = false; continue; } const X = sx(s.t[k]), Y = sy(v); pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; }
    g.stroke();
    if (hover != null) { const k = s.idx(nearest(s, hover)), v = s.v[k]; if (Number.isFinite(v)) { g.fillStyle = col; g.beginPath(); g.arc(sx(s.t[k]), sy(v), 3, 0, Math.PI * 2); g.fill(); } }
  });
  if (H.pos >= 0) { const X = Math.round(sx(clamp(H.snaps[H.pos].t, W.beg, W.end))) + 0.5; g.strokeStyle = THEME.amber; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, y0); g.lineTo(X, y1); g.stroke(); }
  if (hover != null) { const X = Math.round(sx(hover)) + 0.5; g.strokeStyle = THEME.text; g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath(); g.moveTo(X, y0); g.lineTo(X, y1); g.stroke(); g.globalAlpha = 1; }
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
        return el('span', { class: 'scope-chip', style: `--ink: ${inkOf(I, label)}`, title: label }, el('i'), el('span', { class: 'scope-name', text: label }), val, x);
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

/* ---------- diagnostics pill ---------- */
const diagOpen = () => !$('#diag').hidden;
export function setDiag(open) {
  $('#diag').hidden = !open;
  $('#diag-toggle').setAttribute('aria-expanded', String(open));
  if (open) { $('#diag').focus({ preventScroll: true }); drawChart(); }
}
export function closeDiag() { if (!diagOpen()) return false; setDiag(false); $('#diag-toggle').focus(); return true; }
/* The top alert and its first fix stay in the header, so a problem never needs the sheet opened to act on it. */
export function showTopAlert(alert, apply) {
  const top = $('#diag-top');
  top.hidden = !alert;
  if (!alert) { top.replaceChildren(); return; }
  if (top.dataset.id === alert.id) return;
  top.dataset.id = alert.id;
  const fix = alert.fixes && alert.fixes[0];
  top.replaceChildren(el('span', { text: alert.title }), fix ? el('button', { type: 'button', class: 'btn btn-fix', text: fix.label, onclick: () => { apply(alert, 0); top.dataset.id = ''; } }) : null);
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
  $('#diag-toggle').addEventListener('click', () => setDiag(!diagOpen()));
  $('#diag-close').addEventListener('click', closeDiag);
  document.addEventListener('pointerdown', e => {
    if (diagOpen() && !$('#diag').contains(e.target) && !$('#diag-toggle').contains(e.target) && !$('#hud-alert').contains(e.target)) setDiag(false);
  });
  const tall = store.get('deckTall', false), bento = $('#bento'), btn = $('#btn-deck-tall');
  const setTall = on => { bento.classList.toggle('deck-tall', on); btn.setAttribute('aria-pressed', String(on)); store.set('deckTall', on); };
  setTall(tall);
  btn.addEventListener('click', () => setTall(!bento.classList.contains('deck-tall')));
}
