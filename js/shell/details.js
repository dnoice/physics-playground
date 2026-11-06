/*
✒ Metadata
    - Title: Details Card (digiSpace Edition - v2.1)
    - File Name: details.js
    - Relative Path: js/shell/details.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created:
      clicking a body shows it in the Inspector with its stats, on Dennis's
      call that a click should open up what was clicked.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The card at the top of the Inspector that shows what the user selected on
    the stage. A lab describes its selection through inspect(); this module
    draws it, keeps it current at panel rate, and asks the 3D scene for a live
    portrait, falling back to a shaded sphere in 2D.

✒ Key Features:
    - One hook, inspect(), so any lab can describe its selection.
    - Stat rows update in place while the simulation runs.
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
import { in3D, world } from './mode.js';
import { announce } from './state.js';

let shown = null, rows = [], actionsKey = '';
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function portrait(lab, info) {
  const c = $('#details-portrait'), S = c.width;
  // A scene that can shoot one fills the canvas during the next frame.
  if (in3D(lab) && world.engine.canPortrait(lab) && info.spot) { world.engine.portraitTo = c; return; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  drawSphere(g, S / 2, S / 2, S * 0.36, info.rgb || hexRgb(info.color || '#8f9cad'));
}
export function updateDetails(lab) {
  const root = $('#details'), info = lab && lab.inspect ? lab.inspect() : null;
  root.hidden = !info;
  if (!info) { shown = null; return; }
  if (shown !== info.id) {
    shown = info.id; actionsKey = '';
    rows = info.rows.map(r => { const dt = el('dt', { text: r[0] }), dd = el('dd', { text: r[1] }); return { dt, dd }; });
    $('#details-rows').replaceChildren(...rows.flatMap(r => [el('div', {}, r.dt, r.dd)]));
  }
  $('#details-kicker').textContent = info.kicker;
  $('#details-title').textContent = info.title;
  info.rows.forEach((r, i) => {
    const n = rows[i]; if (!n) return;
    if (n.dt.textContent !== r[0]) n.dt.textContent = r[0];
    if (n.dd.textContent !== r[1]) n.dd.textContent = r[1];
  });
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
