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
import { drawSphere } from '../core/draw.js';
import { $, el } from '../core/util.js';
import { noteSelection } from './deck.js';
import { objectColor, objectKey, objectPinned, readingValue, sampleObject, toggleObjectPin } from './instruments.js';
import { in3D, world } from './mode.js';
import { announce } from './state.js';

let shown = null, shownLab = null, rows = [], actionsKey = '';
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function portrait(lab, info) {
  const c = $('#details-portrait'), S = c.width;
  // A scene that can shoot one fills the canvas during the next frame.
  if (in3D(lab) && world.engine.canPortrait(lab) && info.spot) { world.engine.portraitTo = c; return; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  drawSphere(g, S / 2, S / 2, S * 0.36, info.rgb || hexRgb(info.color || '#8f9cad'));
}
/* One figure: its name, its value and, when it is a number, a button that plots it under Telemetry. */
function row(lab) {
  const dt = el('dt'), dd = el('dd'), plot = el('button', { type: 'button', class: 'drow-plot', 'aria-pressed': 'false', html: '<span class="ms" aria-hidden="true">show_chart</span>' });
  const n = { root: el('div', { class: 'drow' }, dt, dd, plot), dt, dd, plot, key: '' };
  plot.addEventListener('click', () => { if (n.key && toggleObjectPin(lab, n.key)) syncPlot(lab, n); });
  return n;
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
  if (!info) { shown = null; return; }
  // A new object, or the same one with more or fewer figures (a source that starts moving), rebuilds the rows.
  if (shown !== info.id || rows.length !== info.rows.length) {
    if (shown !== info.id) actionsKey = '';
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
    const key = objectKey(info, r);
    if (n.key !== key) { n.key = key; n.plot.hidden = !Number.isFinite(readingValue(r[1])); }
    syncPlot(lab, n);
  });
  sampleObject(lab, info);
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
