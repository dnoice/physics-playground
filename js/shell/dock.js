/*
✒ Metadata
    - Title: Tool Dock (digiSpace Edition - v2.0)
    - File Name: dock.js
    - Relative Path: js/shell/dock.js
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

/* ---------- tool dock ---------- */
export const dockEl = $('#dock');
export let dockButtons = [];
export function buildDock(lab) {
  dockEl.replaceChildren(); dockButtons = [];
  const d = lab.dock;
  $('#tools-key').textContent = d ? d.label : '';
  $('#tile-tools-title').textContent = d && d.key === 'view' ? 'View' : 'Tools';
  if (!d) { dockEl.append(el('p', { class: 'tool-hint', text: 'This lab has no pointer tools.' })); return; }
  dockEl.setAttribute('aria-label', d.label);
  d.options.forEach((o, i) => {
    const b = el('button', { type: 'button', role: 'radio', class: 'dock-btn', id: `dock-${lab.id}-${o.id}`, title: `${o.label} (${o.key.toUpperCase()})`, 'aria-keyshortcuts': o.key.toUpperCase(),
      html: `${icon(o.icon)}<span class="dock-label">${o.label}</span><kbd>${o.key.toUpperCase()}</kbd>` });
    b.addEventListener('click', () => selectDock(o.id));
    b.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % d.options.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + d.options.length) % d.options.length;
      if (j >= 0) { e.preventDefault(); selectDock(d.options[j].id); dockButtons[j].focus(); }
    });
    dockEl.append(b); dockButtons.push(b);
  });
  ui.sync.set(d.key, updateDock);
  updateDock(true);
}
export function selectDock(id) {
  const d = active && active.dock; if (!d) return;
  active.p[d.key] = id;
  if (active.onParam) active.onParam(d.key, id);
  if (ptr.panMode) { ptr.panMode = false; updateNav(); }
  updateDock(); refreshEnabled();
  const o = d.options.find(x => x.id === id); if (o) announce(`${o.label} ${d.key === 'view' ? 'view' : 'tool'}`);
}
export function updateDock() {
  const d = active && active.dock; if (!d) return;
  const cur = active.p[d.key];
  dockButtons.forEach((b, i) => { const sel = d.options[i].id === cur; b.setAttribute('aria-checked', String(sel)); b.tabIndex = sel ? 0 : -1; });
  const o = d.options.find(x => x.id === cur);
  let hint = o ? o.hint : active.hint || '';
  if (ptr.panMode) hint = 'Pan mode: drag to move the view · click the hand in the view controls to use the tool again';
  else if (is3D(active)) hint += coarsePointer ? ' · drag the axis ball to orbit' : ` · ${active.rightButton ? 'middle' : 'right'}-drag orbits · Shift-drag pans`;
  $('#stage-hint').textContent = hint;
}
