/*
✒ Metadata
    - Title: Tool Dock (digiSpace Edition - v2.1)
    - File Name: dock.js
    - Relative Path: js/shell/dock.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Tool
      changes refresh disabled controls; the 3D hint knows when middle-drag
      orbits.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the Tools tile from the active lab's dock and keeps the pointer
    hint on the stage current.

✒ Key Features:
    - One button per tool with its icon and keyboard key.
    - Selecting a tool updates the lab parameter, the hint and the cursor.
    - The tile title follows the dock (Pointer tool or View).

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { icon } from '../core/icons.js';
import { $, coarsePointer, el } from '../core/util.js';
import { is3D } from './camera.js';
import { updateNav } from './navigator.js';
import { refreshEnabled } from './panel.js';
import { ptr } from './stage.js';
import { active, announce, ui } from './state.js';

/* ---------- the lab's region of the rail: pointer tools and view modes ---------- */
/* Tools decide what the pointer does to the simulation; views decide what the stage shows. They are separate
   groups with separate state keys, so a lab can have either, both or neither without one disturbing the other. */
export const dockEl = $('#dock'), viewsEl = $('#views');
export let dockButtons = [], viewButtons = [];

/* A radio group with the whole keyboard contract: the checked option is the single tab stop, arrows move and
   select, Home and End jump to the ends, and Space or Enter (native to buttons) select. */
function radios(host, spec, make, pick) {
  const n = spec.options.length;
  const buttons = spec.options.map((o, i) => {
    const b = make(o);
    b.addEventListener('click', () => pick(o.id));
    b.addEventListener('keydown', e => {
      const k = e.key, j = k === 'ArrowRight' || k === 'ArrowDown' ? (i + 1) % n : k === 'ArrowLeft' || k === 'ArrowUp' ? (i - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
      if (j >= 0) { e.preventDefault(); pick(spec.options[j].id); buttons[j].focus(); }
    });
    return b;
  });
  host.replaceChildren(...buttons);
  return buttons;
}
export function buildDock(lab) {
  const d = lab.dock, v = lab.views;
  $('#nav-tools').hidden = !d; $('#nav-views').hidden = !v;
  dockButtons = d ? radios(dockEl, d, o => el('button', { type: 'button', role: 'radio', class: 'dock-btn', id: `dock-${lab.id}-${o.id}`, 'data-tip': `${o.label} · ${o.key.toUpperCase()}`, 'aria-keyshortcuts': o.key.toUpperCase(),
    html: `${icon(o.icon)}<span class="sr-only">${o.label}</span>` }), selectDock) : (dockEl.replaceChildren(), []);
  viewButtons = v ? radios(viewsEl, v, o => el('button', { type: 'button', role: 'radio', class: 'view-btn', id: `view-${lab.id}-${o.id}`, 'data-tip': `${o.tip || o.label} · V`, 'aria-keyshortcuts': 'V',
    html: `${icon(o.icon)}<span class="view-name">${o.label}</span>` }), selectView) : (viewsEl.replaceChildren(), []);
  if (d) { dockEl.setAttribute('aria-label', d.label); ui.sync.set(d.key, updateDock); }
  if (v) ui.sync.set(v.key, updateDock);
  updateDock();
}
export function selectDock(id) {
  const d = active && active.dock;
  if (!d || !d.options.some(o => o.id === id)) { selectView(id); return; }
  active.p[d.key] = id;
  if (active.onParam) active.onParam(d.key, id);
  if (ptr.panMode) { ptr.panMode = false; updateNav(); }
  updateDock(); refreshEnabled();
  announce(`${d.options.find(x => x.id === id).label} tool`);
}
/* A view changes only what is drawn: the run, its history and its trails carry on. */
export function selectView(id) {
  const v = active && active.views, o = v && v.options.find(x => x.id === id); if (!o) return;
  if (active.p[v.key] === id) { updateDock(); return; }
  active.p[v.key] = id;
  if (active.onParam) active.onParam(v.key, id);
  updateDock(); refreshEnabled(); updateNav();
  announce(`${o.label} view`);
}
/* V steps through a lab's views; a lab with none leaves the key to its tools. */
export function nextView() {
  const v = active && active.views; if (!v) return false;
  const i = v.options.findIndex(o => o.id === active.p[v.key]);
  selectView(v.options[(i + 1) % v.options.length].id);
  return true;
}
export function updateDock() {
  if (!active) return;
  const d = active.dock, v = active.views, tool = d && d.options.find(x => x.id === active.p[d.key]), view = v && v.options.find(x => x.id === active.p[v.key]);
  const mark = (buttons, spec, cur) => buttons.forEach((b, i) => { const sel = spec.options[i].id === cur; b.setAttribute('aria-checked', String(sel)); b.tabIndex = sel ? 0 : -1; });
  if (d) mark(dockButtons, d, active.p[d.key]);
  if (v) mark(viewButtons, v, active.p[v.key]);
  // The hint speaks for what a click on the stage does now: the tool's, else the view's, else the lab's own.
  let hint = (tool && tool.hint) || (view && view.hint) || active.hint || '';
  if (ptr.panMode) hint = 'Pan mode: drag to move the view · click the hand in the view controls to use the tool again';
  else if (is3D(active)) hint += coarsePointer ? ` · ${active.selfCam ? 'drag the axis ball' : 'drag around it'} to orbit` : ` · ${active.rightButton ? 'middle' : 'right'}-drag orbits · Shift-drag pans`;
  $('#stage-hint').textContent = hint;
}
