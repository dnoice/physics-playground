/*
✒ Metadata
    - Title: Units Menu (digiSpace Edition - v2.4)
    - File Name: unitmenu.js
    - Relative Path: js/shell/unitmenu.js
    - Artifact Type: javascript
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      with the unit systems Dennis asked for: the top-bar Units menu and the
      refresh that follows a change of system.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Units button and its menu: Metric, US customary or Simulation. A
    change of system rebuilds the controls in the new units, restarts the
    plotted series (they would otherwise mix units), and redraws every
    figure, without touching the simulation.

✒ Key Features:
    - A radio group with arrow keys, like the Graphics menu beside it; U
      opens it from anywhere.
    - The menu states the current lab's scale, so a metre is never a
      mystery: what one pixel or one cell stands for, and why.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { SYSTEMS, onUnits, setUnitSystem, unitSystem } from '../core/units.js';
import { $, el } from '../core/util.js';
import { updateDetails } from './details.js';
import { resetSeries } from './instruments.js';
import { updateNav } from './navigator.js';
import { buildPanel, updateReadouts } from './panel.js';
import { active, announce } from './state.js';

const open = () => !$('#units-sheet').hidden;
export function setUnits(on) {
  $('#units-sheet').hidden = !on;
  $('#btn-units').setAttribute('aria-expanded', String(on));
  if (on) { renderUnits(); const cur = $('#units-list [aria-checked="true"]'); if (cur) cur.focus(); }
}
export function closeUnits() { if (!open()) return false; setUnits(false); $('#btn-units').focus(); return true; }
export function renderUnits() {
  const sys = unitSystem(), S = SYSTEMS.find(s => s.id === sys);
  $('#btn-units-label').textContent = S.label;
  $('#btn-units').title = `Units: ${S.long} (U)`;
  for (const b of document.querySelectorAll('#units-list [role="radio"]')) { const on = b.dataset.sys === sys; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
  $('#units-scale').textContent = active && active.scaleNote ? active.scaleNote : '';
}
/* Everything that shows a number in units follows the change; the run itself is untouched. */
function refresh() {
  resetSeries();
  if (active) { buildPanel(active); updateReadouts(); updateDetails(active); updateNav(); }
  renderUnits();
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  const list = $('#units-list');
  SYSTEMS.forEach((s, i) => {
    const b = el('button', { type: 'button', role: 'radio', class: 'gfx-row', 'data-sys': s.id, 'aria-checked': 'false' }, el('b', { text: s.long }), el('span', { text: s.note }));
    b.addEventListener('click', () => { if (setUnitSystem(s.id)) announce(`Units: ${s.long}`); });
    b.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % SYSTEMS.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + SYSTEMS.length) % SYSTEMS.length;
      if (j >= 0) { e.preventDefault(); if (setUnitSystem(SYSTEMS[j].id)) announce(`Units: ${SYSTEMS[j].long}`); list.children[j].focus(); }
    });
    list.append(b);
  });
  onUnits(refresh);
  $('#btn-units').addEventListener('click', () => setUnits(!open()));
  $('#units-close').addEventListener('click', closeUnits);
  document.addEventListener('pointerdown', e => {
    if (open() && !$('#units-sheet').contains(e.target) && !$('#btn-units').contains(e.target)) setUnits(false);
  });
  renderUnits();
}
