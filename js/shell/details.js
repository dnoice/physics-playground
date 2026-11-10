/*
✒ Metadata
    - Title: Details Card (digiSpace Edition - v2.4)
    - File Name: details.js
    - Relative Path: js/shell/details.js
    - Artifact Type: javascript
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the deck's Inspect pane on Dennis's brief that inspection is
      read-only and editing stays in Controls: each figure can be plotted
      over time, a new selection opens the pane, and an empty pane says how
      to select something in this lab.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created:
      clicking a body shows it in the Inspector with its stats, on Dennis's
      call that a click should open up what was clicked.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The card in the deck's Inspect pane that shows what the user selected on
    the stage. A lab describes its selection through inspect(); this module
    draws it, keeps it current at panel rate, and asks the 3D scene for a live
    portrait, falling back to a shaded sphere in 2D.

✒ Key Features:
    - One hook, inspect(), so any lab can describe its selection.
    - Stat rows update in place while the simulation runs, and a hover
      explains each one. A numeric row has a plot button that adds it to the
      Telemetry scope as that object's own series.
    - Read-only: the card's actions act on the object (follow, delete,
      reuse its state) but never stand in for a lab setting.
    - With nothing selected, the pane says how to select in this lab, from
      the lab's inspectHint, or that the lab has nothing to select.
    - A live portrait from the 3D scene when it offers one.
    - Actions from the lab, such as follow and delete, and a close button.

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
import { noteSelection } from './deck.js';
import { objectColor, objectKey, objectPinned, readingValue, sampleObject, sparkPath, toggleObjectPin } from './instruments.js';
import { in3D, world } from './mode.js';
import { announce } from './state.js';

let shown = null, shownLab = null, rows = [], actionsKey = '';
// Every figure's history since the selection began, and the one the focus chart shows.
let past = new Map(), focus = null, chosen = false;
const HIST = 600;
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function portrait(lab, info) {
  const c = $('#details-portrait'), S = c.width;
  // A scene that can shoot one fills the canvas during the next frame.
  if (in3D(lab) && world.engine.canPortrait(lab) && info.spot) { world.engine.portraitTo = c; return; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  drawSphere(g, S / 2, S / 2, S * 0.36, info.rgb || hexRgb(info.color || '#8f9cad'));
}
/* One figure: its name, its value, a sparkline of its history since the selection began, and, when it is a number,
   a button that plots it under Telemetry. Clicking the figure itself puts it in the focus chart below. */
function row(lab) {
  const dt = el('dt'), dd = el('dd'), plot = el('button', { type: 'button', class: 'drow-plot', 'aria-pressed': 'false', html: '<span class="ms" aria-hidden="true">show_chart</span>' });
  const spark = el('span', { class: 'drow-spark', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path/></svg>' });
  const pick = el('button', { type: 'button', class: 'drow-pick', 'aria-pressed': 'false' });
  const n = { root: el('div', { class: 'drow' }, dt, dd, spark, pick, plot), dt, dd, plot, pick, path: spark.querySelector('path'), key: '', label: '' };
  plot.addEventListener('click', () => { if (n.key && toggleObjectPin(lab, n.key)) syncPlot(lab, n); });
  pick.addEventListener('click', () => { if (past.has(n.label)) { focus = n.label; chosen = true; drawFocus(lab); announce(`Focus: ${n.label}`); } });
  return n;
}
/* The focused figure since the selection began: line, shaded area, its range and where it is now. */
function drawFocus(lab) {
  const c = canvasContext($('#details-plot')), s = focus && past.get(focus);
  for (const n of rows) { const on = n.label === focus; n.pick.setAttribute('aria-pressed', String(on)); n.root.classList.toggle('focus', on); }
  const cap = $('#details-focus-cap'), unit = (rows.find(n => n.label === focus) || {}).unit || '';
  const txt = focus ? `${focus} since the selection began${unit ? ` (${unit})` : ''} · click another figure to focus it` : 'Click a figure to follow it over time';
  if (cap.textContent !== txt) cap.textContent = txt;
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
function syncPlot(lab, n) {
  const on = objectPinned(lab, n.key);
  n.plot.setAttribute('aria-pressed', String(on));
  n.plot.setAttribute('aria-label', `${on ? 'Stop plotting' : 'Plot'} ${n.key}`);
  n.plot.title = on ? 'Plotted under Telemetry · click to stop' : 'Plot this over time under Telemetry';
  n.root.classList.toggle('on', on);
  if (on) n.root.style.setProperty('--series', objectColor(lab, n.key)); else n.root.style.removeProperty('--series');
}
function empty(lab) {
  $('#inspect-how').textContent = !lab ? '' : lab.inspect ? (lab.inspectHint || 'Click an object on the stage to inspect it here.') : `${lab.name} has no single objects to select; its figures are under Telemetry.`;
}
export function updateDetails(lab) {
  const root = $('#details'), info = lab && lab.inspect ? lab.inspect() : null, had = shown != null;
  root.hidden = !info; $('#inspect-empty').hidden = !!info;
  if (shownLab !== lab) { shownLab = lab; empty(lab); }
  noteSelection(had, !!info);
  if (!info) { shown = null; past = new Map(); focus = null; chosen = false; return; }
  // A new object, or the same one with more or fewer figures (a source that starts moving), rebuilds the rows.
  if (shown !== info.id || rows.length !== info.rows.length) {
    if (shown !== info.id) { actionsKey = ''; past = new Map(); focus = null; chosen = false; }
    shown = info.id;
    rows = info.rows.map(() => row(lab));
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
    if (n.key !== key) { n.key = key; n.label = r[0]; n.plot.hidden = !numeric; n.pick.hidden = !numeric; n.pick.setAttribute('aria-label', `Follow ${r[0]} over time`); }
    const u = (/^\s*[-+−]?[\d.,]+(?:e[-+]?\d+)?\s*(.*)$/.exec(r[1]) || [, ''])[1];
    n.unit = /^[kMGT]?$/.test(u) ? '' : u;
    syncPlot(lab, n);
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
  $('#details-close').addEventListener('click', () => { const lab = window.PhysicsPlayground.active; if (lab && lab.deselect) lab.deselect(); updateDetails(lab); });
}
