/*
✒ Metadata
    - Title: Workspace Layout (digiSpace Edition - v2.1)
    - File Name: layout.js
    - Relative Path: js/shell/layout.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      scene dropdown; Controls is the first Inspector tab.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: the bento workspace he picked, with
      focus mode and a hideable bay.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Focus mode, the bottom bay, the notebook tabs and the keyboard sheet,
    with their state remembered between visits.

✒ Key Features:
    - setFocus and setBay toggle the bento modes and their buttons.
    - revealTile brings a tile into view, leaving focus mode if needed.
    - Notebook tabs as a roving-tabindex tablist; the keys sheet closes on
      Escape or an outside click.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { store } from '../core/util.js';
import { $ } from '../core/util.js';
import { announce } from './state.js';

/* ---------- workspace modes: focus (stage only) and the bottom bay ---------- */
const bento = () => $('#bento');
export function setFocus(on, save = true) {
  bento().classList.toggle('focus', on);
  $('#btn-focus').setAttribute('aria-pressed', String(on));
  $('#btn-focus-icon').textContent = on ? 'fullscreen_exit' : 'fullscreen';
  if (save) store.set('focus', on);
}
export function setBay(on, save = true) {
  bento().classList.toggle('no-bay', !on);
  $('#btn-bay').setAttribute('aria-pressed', String(on));
  if (save) store.set('bay', on);
}
export const isFocus = () => bento().classList.contains('focus');
export const hasBay = () => !bento().classList.contains('no-bay');
/* Bring a tile into view, leaving focus mode or opening the bay if needed. */
export function revealTile(tile) {
  if (isFocus()) setFocus(false);
  if (tile.classList.contains('bay') && !hasBay()) setBay(true);
  tile.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  tile.classList.remove('flash'); void tile.offsetWidth; tile.classList.add('flash');
}

/* ---------- notebook tabs ---------- */
export function selectNote(id, focus = false) {
  const tabs = [...document.querySelectorAll('#notes-tabs [role="tab"]')];
  for (const t of tabs) {
    const on = t.id === 'nt-' + id;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  }
  if (id === 'library') { const t = $('#nt-library'); t.classList.remove('has-new'); t.removeAttribute('aria-description'); }
  store.set('notesTab', id);
}

/* ---------- keyboard sheet: the single floating panel ---------- */
export function setKeys(open) {
  const sheet = $('#keys-sheet');
  sheet.hidden = !open;
  $('#btn-keys').setAttribute('aria-expanded', String(open));
  if (open) $('#keys-close').focus();
}

/* ---------- scene dropdown ---------- */
export function setSceneMenu(open) {
  const menu = $('#scene-menu');
  menu.hidden = !open;
  $('#scene-btn').setAttribute('aria-expanded', String(open));
  if (open) { const cur = menu.querySelector('[aria-checked="true"]'); if (cur) cur.focus(); }
}
export function closeSceneMenu() { if ($('#scene-menu').hidden) return false; setSceneMenu(false); $('#scene-btn').focus(); return true; }

export function init() {
  $('#scene-btn').addEventListener('click', () => setSceneMenu($('#scene-menu').hidden));
  // A mouse pick leaves nothing focused, so Space goes back to play and pause; a keyboard pick returns to the button.
  $('#scene-menu').addEventListener('click', e => {
    if (!e.target.closest('[role="radio"]')) return;
    closeSceneMenu();
    if (e.detail > 0) document.activeElement.blur();
  });
  document.addEventListener('pointerdown', e => {
    if (!$('#scene-menu').hidden && !e.target.closest('.scene-pick')) setSceneMenu(false);
  });
  $('#btn-focus').addEventListener('click', () => { setFocus(!isFocus()); announce(isFocus() ? 'Stage focused' : 'Workspace restored'); });
  $('#btn-bay').addEventListener('click', () => { setBay(!hasBay()); announce(hasBay() ? 'Instruments shown' : 'Instruments hidden'); });
  $('#btn-keys').addEventListener('click', () => setKeys($('#keys-sheet').hidden));
  $('#keys-close').addEventListener('click', () => { setKeys(false); $('#btn-keys').focus(); });
  document.addEventListener('pointerdown', e => {
    const sheet = $('#keys-sheet');
    if (!sheet.hidden && !sheet.contains(e.target) && !$('#btn-keys').contains(e.target)) setKeys(false);
  });
  const tabs = [...document.querySelectorAll('#notes-tabs [role="tab"]')];
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectNote(t.id.slice(3)));
    t.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
      if (j >= 0) { e.preventDefault(); selectNote(tabs[j].id.slice(3), true); }
    });
  });
  selectNote(store.get('notesTab', 'controls'));
  setFocus(store.get('focus', false), false);
  setBay(store.get('bay', true), false);
  // Hide glyph names if the icon font never arrives (offline).
  if (document.fonts && document.fonts.load) {
    const t = setTimeout(() => document.documentElement.classList.add('no-icons'), 6000);
    document.fonts.load('20px "Material Symbols Rounded"', 'orbit').then(f => { if (f.length) { clearTimeout(t); document.documentElement.classList.remove('no-icons'); } }).catch(() => {});
  }
}
