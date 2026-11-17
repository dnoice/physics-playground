/*
✒ Metadata
    - Title: Details Card (digiSpace Edition - v2.19)
    - File Name: details.js
    - Relative Path: js/shell/details.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for an objects table under Inspect and one way to select:
      chooseObject() selects for the stage, the Select tool, the list and the
      close button alike, and a pick in the list keeps Inspect in place; one
      button per figure, with Pin to Telemetry on the focus chart's caption.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Inspect
      pane fills its space: every figure keeps its history since the selection
      as a sparkline, and a focus chart follows the figure the lab names (or
      the one clicked) across the rest of the pane.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the deck's Inspect pane on Dennis's brief that inspection is
      read-only and editing stays in Controls: each figure can be plotted
      over time, a new selection opens the pane, and an empty pane says how
      to select something in this lab.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The card in the deck's Inspect pane that shows what the user selected on
    the stage or in the objects list. A lab describes its selection through
    inspect(); this module draws it, keeps it current at panel rate, and asks
    the 3D scene for a live portrait, falling back to a shaded sphere in 2D.
    chooseObject() is the one way a selection is made or cleared.

✒ Key Features:
    - One hook, inspect(), so any lab can describe its selection; its focus
      names the figure to follow first.
    - Figures update in place, each with a sparkline of its history since the
      selection began.
    - A focus chart fills the rest of the pane with one figure over time;
      clicking a figure focuses it, and the chart's caption pins it to
      Telemetry as that object's own series.
    - chooseObject(lab, id) selects through the lab's select(), for the
      stage, the Select tool, the objects list and the close button alike.
    - A live portrait from the 3D scene when it offers one; actions from the
      lab, and a close button.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { canvasContext } from '../core/chart.js';
import { THEME } from '../core/color.js';
import { drawSphere } from '../core/draw.js';
import { Series } from '../core/series.js';
import { $, el } from '../core/util.js';
import { hist as rewindHist } from './capture.js';
import { noteSelection, showPane } from './deck.js';
import { objectColor, objectKey, objectPinned, readingValue, sampleObject, sparkPath, toggleObjectPin } from './instruments.js';
import { in3D, world } from './mode.js';
import { initObjects, updateObjects } from './objects.js';
import { announce } from './state.js';

let shown = null, shownLab = null, shownInfo = null, rows = [], actionsKey = '';
// Every figure's history since the selection began, and the one the focus chart shows.
let past = new Map(), focus = null, chosen = false;
const HIST = 600;
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const pinBtn = $('#details-pin');

/* ---------- one way to select: the stage, the Select tool, the list and the close button all come here ---------- */
/* Select the object with this id in the lab (null clears the selection), say so, and show it at once rather than at
   the next panel tick. Returns whether the lab took it. */
export function chooseObject(lab, id) {
  if (!lab || !lab.select) return false;
  const had = lab.selectedId(), ok = lab.select(id);
  if (id == null) { if (had != null) announce('Selection cleared'); }
  else if (ok && had !== id) { const info = lab.inspect(); if (info) announce(`${info.short || info.kicker} selected`); }
  updateDetails(lab);
  return ok;
}
/* What updateDetails last read from the lab, for the head-up display at the same tick, so inspect() runs once. */
export const inspected = lab => (lab === shownLab ? shownInfo : lab && lab.inspect ? lab.inspect() : null);

function portrait(lab, info) {
  const c = $('#details-portrait'), S = c.width;
  // A scene that can shoot one fills the canvas during the next frame.
  if (in3D(lab) && world.engine.canPortrait(lab) && info.spot) { world.engine.portraitTo = c; return; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  drawSphere(g, S / 2, S / 2, S * 0.36, info.rgb || hexRgb(info.color || '#8f9cad'));
}
/* One figure: its name, its value and a sparkline of its history since the selection began. The whole tile is one
   button: a click puts the figure in the focus chart below, whose caption pins it to Telemetry. */
function row() {
  const dt = el('dt'), dd = el('dd');
  const spark = el('span', { class: 'drow-spark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path/></svg>' });
  const pick = el('button', { type: 'button', class: 'drow-pick', 'aria-pressed': 'false' });
  const n = { root: el('div', { class: 'drow' }, dt, dd, spark, pick), dt, dd, pick, path: spark.querySelector('path'), key: '', label: '' };
  pick.addEventListener('click', () => { if (past.has(n.label)) { focus = n.label; chosen = true; drawFocus(shownLab); announce(`Focus: ${n.label}`); } });
  return n;
}
/* The focused figure since the selection began: line, shaded area, its range and where it is now. */
function drawFocus(lab) {
  const c = canvasContext($('#details-plot')), s = focus && past.get(focus);
  for (const n of rows) { const on = n.label === focus; n.pick.setAttribute('aria-pressed', String(on)); n.root.classList.toggle('focus', on); }
  const cap = $('#details-focus-cap'), unit = (rows.find(n => n.label === focus) || {}).unit || '';
  const txt = focus ? `${focus} since the selection began${unit ? ` (${unit})` : ''}` : 'Click a figure to follow it over time';
  if (cap.textContent !== txt) cap.textContent = txt;
  syncPin(lab);
  if (!c) return;
  const { g, w, h } = c;
  if (!s || s.n < 2) { g.fillStyle = THEME.muted; g.font = `400 11px ${THEME.mono}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Collecting…', w / 2, h / 2); return; }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < s.n; i++) { const v = s.v[s.idx(i)]; if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!(hi >= lo)) return;
  if (hi - lo < 1e-12) { const m = Math.abs(hi) * 0.05 || 1; lo -= m; hi += m; }
  const pad = (hi - lo) * 0.12, t0 = s.t[s.idx(0)], t1 = s.t[s.idx(s.n - 1)], x0 = 44, x1 = w - 8, y0 = 8, y1 = h - 16;
  const sx = t => x0 + (t - t0) / Math.max(1e-9, t1 - t0) * (x1 - x0), sy = v => y1 - (v - lo + pad) / (hi - lo + 2 * pad) * (y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
  for (const f of [0, 0.5, 1]) { const y = Math.round(y0 + f * (y1 - y0)) + 0.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  const col = THEME.cyan, grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, 'rgba(95,208,223,0.22)'); grad.addColorStop(1, 'rgba(95,208,223,0)');
  g.beginPath(); let first = true;
  for (let i = 0; i < s.n; i++) { const k = s.idx(i), v = s.v[k]; if (!Number.isFinite(v)) continue; const X = sx(s.t[k]), Y = sy(v); if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y); }
  g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
  g.lineTo(sx(t1), y1); g.lineTo(sx(t0), y1); g.closePath(); g.fillStyle = grad; g.fill();
  const v = s.last(), X = sx(t1), Y = sy(v);
  g.fillStyle = THEME.ink; g.beginPath(); g.arc(X, Y, 4.5, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(X, Y, 3, 0, Math.PI * 2); g.fill();
  g.font = `400 10px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
  const f = x => Number(x.toPrecision(3)).toString();
  g.fillText(f(hi), x0 - 6, sy(hi)); g.fillText(f(lo), x0 - 6, sy(lo));
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillText(`t = ${t0.toFixed(1)} s`, x0, h - 3);
  g.textAlign = 'right'; g.fillText(`${t1.toFixed(1)} s`, x1, h - 3);
}
/* A figure pinned under Telemetry is marked in its object's series colour; the caption's button pins the focused one. */
function syncRow(lab, n) {
  const on = !!n.key && objectPinned(lab, n.key);
  n.root.classList.toggle('on', on);
  if (on) n.root.style.setProperty('--series', objectColor(lab, n.key)); else n.root.style.removeProperty('--series');
}
function syncPin(lab) {
  const n = rows.find(r => r.label === focus), key = n && n.key, on = !!key && objectPinned(lab, key);
  pinBtn.hidden = !key;
  pinBtn.setAttribute('aria-pressed', String(on));
  const txt = on ? 'Unpin from Telemetry' : 'Pin to Telemetry', lbl = pinBtn.querySelector('.lbl');
  if (lbl.textContent !== txt) lbl.textContent = txt;
  pinBtn.title = on ? `${focus} is plotted under Telemetry · click to stop` : `Plot ${focus || 'this figure'} over time under Telemetry, as this object's own series`;
}
function empty(lab) {
  $('#inspect-how').textContent = !lab ? '' : lab.inspect ? (lab.inspectHint || 'Click an object on the stage to inspect it here.') : `${lab.name} has no single objects to select; its figures are under Telemetry.`;
}
export function updateDetails(lab) {
  const root = $('#details'), info = lab && lab.inspect ? lab.inspect() : null, had = shown != null;
  shownInfo = info;
  root.hidden = !info; $('#inspect-empty').hidden = !!info;
  if (shownLab !== lab) { shownLab = lab; empty(lab); }
  noteSelection(had, !!info);
  updateObjects(lab);
  if (!info) { shown = null; past = new Map(); focus = null; chosen = false; return; }
  // A new object, or the same one with more or fewer figures (a source that starts moving), rebuilds the rows.
  if (shown !== info.id || rows.length !== info.rows.length) {
    if (shown !== info.id) { actionsKey = ''; past = new Map(); focus = null; chosen = false; }
    shown = info.id;
    rows = info.rows.map(() => row());
    $('#details-rows').replaceChildren(...rows.map(r => r.root));
  }
  $('#details-kicker').textContent = info.kicker;
  $('#details-title').textContent = info.title;
  info.rows.forEach((r, i) => {
    const n = rows[i]; if (!n) return;
    if (n.dt.textContent !== r[0]) n.dt.textContent = r[0];
    n.root.title = r[2] || '';
    if (n.dd.textContent !== r[1]) n.dd.textContent = r[1];
    const key = objectKey(info, r), v = readingValue(r[1]), numeric = Number.isFinite(v);
    if (n.label !== r[0] || n.key !== (numeric ? key : '')) { n.key = numeric ? key : ''; n.label = r[0]; n.pick.hidden = !numeric; n.pick.setAttribute('aria-label', `Follow ${r[0]} over time`); }
    const u = (/^\s*[-+−]?[\d.,]+(?:e[-+]?\d+)?\s*(.*)$/.exec(r[1]) || [, ''])[1];
    n.unit = /^[kMGT]?$/.test(u) ? '' : u;
    syncRow(lab, n);
    // Sample while the run moves forward; scrubbing the past leaves the history alone.
    if (numeric && rewindHist(lab).pos < 0) {
      let s = past.get(r[0]);
      if (!s) past.set(r[0], s = new Series(HIST));
      if (s.n && s.t[s.idx(s.n - 1)] > lab.t + 1e-9) s.clear();
      if (!s.n || lab.t > s.t[s.idx(s.n - 1)] + 1e-9) s.push(lab.t, v);
      if (!focus) focus = r[0];
    }
    n.path.setAttribute('d', sparkPath(past.get(r[0])));
  });
  // Until the user picks one, the focus goes to the first figure that actually changes (a ball's mass never does).
  if (!chosen && info.focus && past.has(info.focus)) focus = info.focus;
  else if (!chosen) {
    const moving = [...past].find(([, s]) => { if (s.n < 4) return false; let lo = Infinity, hi = -Infinity; for (let i = 0; i < s.n; i++) { const v = s.v[s.idx(i)]; lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo > Math.abs(hi) * 1e-6; });
    if (moving) focus = moving[0];
  }
  sampleObject(lab, info);
  drawFocus(lab);
  const key = (info.actions || []).map(a => a.label).join('|');
  if (key !== actionsKey) {
    actionsKey = key;
    $('#details-actions').replaceChildren(...(info.actions || []).map(a => el('button', { type: 'button', class: 'btn', text: a.label, onclick: () => { a.run(); announce(a.label); updateDetails(lab); } })));
  }
  portrait(lab, info);
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  $('#details-close').addEventListener('click', () => chooseObject(window.PhysicsPlayground.active, null));
  pinBtn.addEventListener('click', () => {
    const lab = shownLab, n = rows.find(r => r.label === focus); if (!lab || !n || !n.key) return;
    if (toggleObjectPin(lab, n.key)) { syncRow(lab, n); syncPin(lab); }
  });
  // A pick in the list is the user at work in Inspect, so clearing the selection afterwards stays here rather than
  // going back to the pane an earlier stage click opened Inspect from.
  initObjects(id => { showPane('inspect'); chooseObject(window.PhysicsPlayground.active, id); });
}
