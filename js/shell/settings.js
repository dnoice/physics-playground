/*
✒ Metadata
    - Title: Settings Dialog (digiSpace Edition - v2.18)
    - File Name: settings.js
    - Relative Path: js/shell/settings.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created on
      Dennis's call for one settings dialog in place of four floating sheets:
      a true modal with a section nav (Graphics, Units, Head-up display,
      Keyboard), its focus kept inside, Escape to close and focus handed back
      to whatever opened it. The top bar's Graphics, Units, HUD and keyboard
      buttons open it at their own section; the Settings button and Shift+S
      open it where it was last left.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Settings dialog: the frame, its section nav and its keyboard. Each
    section's contents belong to the module that owns them (mode.js builds
    Graphics, unitmenu.js Units, headsup.js the head-up display); this
    module opens, closes and moves between them.

✒ Key Features:
    - A native modal dialog: the workspace behind it is inert, Tab and
      Shift+Tab go round its own controls, Escape or a click on the backdrop
      closes it, and focus returns to the control that opened it.
    - A section nav with the full tab contract: arrows move and select, Home
      and End jump. It stands down the left on a wide screen and across the
      top on a phone, where the dialog fills the screen.
    - Quick openers: Graphics, Units, HUD and the keyboard button open it at
      their section and focus its current choice; U and ? do the same, and
      Shift+S opens it at the section last shown.
    - Inside, the workspace's shortcuts wait: U and ? move between sections,
      Shift+H still turns the head-up display on or off, and Shift+S closes.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, store } from '../core/util.js';
import { toggleHud } from './headsup.js';

/* The sections in nav order, each with what takes focus when the dialog opens at it: its current choice, or its first
   control. The keyboard list has none, so its tab takes focus. */
const SECTIONS = { graphics: '#gfx-list [aria-checked="true"]', units: '#units-list [aria-checked="true"]', hud: '#hud-on', keys: null };
/* The top bar's quick openers, each for its own section. */
const OPENERS = [['#btn-gfx', 'graphics'], ['#btn-units', 'units'], ['#btn-hud', 'hud'], ['#btn-keys', 'keys']];
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]';
const dlg = $('#settings'), tabs = [...dlg.querySelectorAll('[role="tab"]')];
let current = Object.hasOwn(SECTIONS, store.get('settingsTab')) ? store.get('settingsTab') : 'graphics', opener = null;

const tabOf = id => $(`#st-${id}`);
const usable = id => Object.hasOwn(SECTIONS, id) && !tabOf(id).hidden;
const firstUsable = () => Object.keys(SECTIONS).find(usable);
export const settingsOpen = () => dlg.open;
export const settingsSection = () => current;

function syncOpeners() {
  $('#btn-settings').setAttribute('aria-expanded', String(dlg.open));
  for (const [sel, id] of OPENERS) $(sel).setAttribute('aria-expanded', String(dlg.open && current === id));
}
/* Show a section, remembered for the next visit. focus is 'tab' for its tab in the nav, true for its own current
   choice or first control, and false to leave focus where it is. */
export function showSection(id, focus = false) {
  if (!usable(id)) id = firstUsable();
  if (id !== current) $('#settings-body').scrollTop = 0;
  current = id; store.set('settingsTab', id);
  for (const t of tabs) { const on = t === tabOf(id); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $(`#${t.getAttribute('aria-controls')}`).hidden = !on; }
  syncOpeners();
  if (focus) ((focus !== 'tab' && SECTIONS[id] && $(SECTIONS[id])) || tabOf(id)).focus();
}
/* Open at a section, or at the one last shown, remembering what had focus so that closing hands it back. */
export function openSettings(id, from) {
  if (!dlg.open) { opener = from || document.activeElement; dlg.showModal(); }
  showSection(id || current, id ? true : 'tab');
}
/* Closed by any way, focus goes back to what opened the dialog, unless that was nothing in particular. */
function closed() {
  syncOpeners();
  const o = opener;
  opener = null;
  if (o && o !== document.body && o.isConnected) o.focus();
}
export function closeSettings() { if (!dlg.open) return false; dlg.close(); closed(); return true; }
/* A section the workspace cannot offer (Graphics, when 3D cannot run) leaves the nav. An open dialog moves off it; a
   closed one finds another when it next opens. */
export function allowSection(id, on) {
  const t = tabOf(id);
  if (t.hidden === !on) return;
  t.hidden = !on;
  if (!on && current === id && dlg.open) showSection(firstUsable(), dlg.contains(document.activeElement) ? 'tab' : false);
}
/* Tab and Shift+Tab go round the dialog's own controls and never leave it. */
function trap(e) {
  const f = [...dlg.querySelectorAll(FOCUSABLE)].filter(n => n.tabIndex >= 0 && !n.disabled && n.getClientRects().length);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement), last = f.length - 1;
  if (e.shiftKey ? i <= 0 : i < 0 || i === last) { e.preventDefault(); f[e.shiftKey ? last : 0].focus(); }
}
/* The dialog's own keys: from inside it, or from the page when focus has dropped there (a focused switch the head-up
   display disabled), through transport.js. U and ? move between sections, Shift+H still works, Shift+S closes. */
export function settingsKey(e) {
  if (e.key === 'Tab') { trap(e); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSettings(); }
  else if (e.code === 'KeyS' && e.shiftKey) { e.preventDefault(); closeSettings(); }
  else if (e.code === 'KeyH' && e.shiftKey) toggleHud();
  else if (e.key === 'u' || e.key === 'U') showSection('units', true);
  else if (e.key === '?') showSection('keys', 'tab');
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  $('#btn-settings').addEventListener('click', e => openSettings(null, e.currentTarget));
  for (const [sel, id] of OPENERS) $(sel).addEventListener('click', e => openSettings(id, e.currentTarget));
  $('#settings-close').addEventListener('click', closeSettings);
  tabs.forEach(t => {
    const id = t.id.slice(3);
    t.addEventListener('click', () => showSection(id));
    t.addEventListener('keydown', e => {
      const list = tabs.filter(x => !x.hidden), k = list.indexOf(t);
      let j = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (k + 1) % list.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (k - 1 + list.length) % list.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = list.length - 1;
      if (j >= 0) { e.preventDefault(); showSection(list[j].id.slice(3), 'tab'); }
    });
  });
  // The dialog's keys stop here: the workspace's shortcuts wait behind it (transport.js).
  dlg.addEventListener('keydown', e => { e.stopPropagation(); settingsKey(e); });
  // Escape with nothing inside focused reaches the dialog as a cancel.
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeSettings(); });
  // A click on the backdrop, outside the dialog's own box, closes it.
  dlg.addEventListener('click', e => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) closeSettings();
  });
  dlg.addEventListener('close', closed);
  // The nav stands down the left on a wide screen and across the top on a phone.
  const narrow = window.matchMedia('(max-width: 640px)'), orient = () => $('#settings-tabs').setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
  narrow.addEventListener('change', orient); orient();
  showSection(current);
}
