/*
✒ Metadata
    - Title: Lab Rail (digiSpace Edition - v2.6)
    - File Name: workspace.js
    - Relative Path: js/shell/workspace.js
    - Artifact Type: javascript
    - Version: 2.6.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Selecting a
      lab scrolls its tab into view when the top bar is too narrow for every
      tab.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Switching
      labs rebuilds the Library's capture cards.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Switching
      labs refreshes the Units menu's scale note.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the lab rail in the top bar and switches labs: stops captures,
    resets pointers, rebuilds panels and updates the stage title.

✒ Key Features:
    - Roving-tabindex tablist with arrow, Home and End keys.
    - Animated Material Symbols glyph per lab; the selected lab shows its
      equation.
    - selectLab() is the one place a lab change happens.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { LAB_ICON } from '../core/icons.js';
import { $, el, store } from '../core/util.js';
import { labs, labsById } from '../labs/index.js';
import { navAnim } from './camera.js';
import { dataRec, stopData, stopVideo, updateRewind, vrec } from './capture.js';
import { updateDetails } from './details.js';
import { evaluateDiagnostics, insightCards } from './diagnostics.js';
import { buildDock } from './dock.js';
import { buildLibraryCapture, renderLibrary, updateTracksNote } from './library.js';
import { ensureReady } from './lifecycle.js';
import { prepareLab, renderMode } from './mode.js';
import { buildNav } from './navigator.js';
import { buildPanel } from './panel.js';
import { renderUnits } from './unitmenu.js';
import { cancelLabPointer, ptr } from './stage.js';
import { active, announce, canvas, perf, setActive, setPointerDown, state } from './state.js';

/* ---------- tabs ---------- */
/* The stage tile's header names the lab, its glyph and the loaded scene. */
export function updateStageTitle(lab = active) {
  if (!lab) return;
  const pr = lab.presets.find(p => p.id === lab.presetId);
  $('#stage-lab').textContent = lab.name;
  $('#stage-scene').textContent = pr ? pr.label : '';
  $('#stage-icon').textContent = (LAB_ICON[lab.id] || ['science'])[0];
}
export const rail = $('#rail');
export let tabs = [];
export function selectLab(id, opts = {}) {
  const lab = labsById[id] || labs[0];
  if (active === lab) return;
  if (active) { active.hover = null; cancelLabPointer(); }
  if (active && vrec.mr) stopVideo();
  if (active && dataRec.on) stopData();
  setPointerDown(false); ptr.drag = null; ptr.pinch = null; ptr.ids.clear(); ptr.panMode = false; navAnim.lab = null;
  setActive(lab);
  store.set('lab', lab.id);
  tabs.forEach((t, i) => { const on = labs[i] === lab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  revealTab(tabs[labs.indexOf(lab)]);
  updateStageTitle(lab);
  canvas.setAttribute('aria-label', lab.aria);
  canvas.style.cursor = 'crosshair';
  ensureReady(lab);
  buildPanel(lab);
  buildDock(lab);
  buildNav(lab);
  prepareLab(lab); renderMode();
  insightCards.forEach(c => c.el.remove()); insightCards.clear();
  perf.slow = 0; perf.rate = state.speed;
  evaluateDiagnostics();
  updateRewind(); updateTracksNote(); renderLibrary(); buildLibraryCapture(lab); updateDetails(lab); renderUnits();
  if (!opts.silent) announce(`${lab.title} lab`);
  if (location.hash.slice(1) !== lab.id) { try { location.replace('#' + lab.id); } catch (_) { /* hash routing unavailable */ } }
}

/* On a narrow top bar the lab tabs scroll sideways; keep the selected one in view, without scrolling the page. */
function revealTab(t) {
  const strip = $('#rail').parentElement; if (!t || !strip || strip.scrollWidth <= strip.clientWidth) return;
  const r = t.getBoundingClientRect(), box = strip.getBoundingClientRect(), a = r.left - box.left + strip.scrollLeft, pad = 8;
  if (a < strip.scrollLeft + pad) strip.scrollLeft = a - pad;
  else if (a + r.width > strip.scrollLeft + strip.clientWidth - pad) strip.scrollLeft = a + r.width - strip.clientWidth + pad;
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  tabs = labs.map((lab, i) => {
    const t = el('button', { type: 'button', role: 'tab', class: 'tab', id: `tab-${lab.id}`, 'aria-controls': 'bento', 'aria-selected': 'false', tabindex: '-1' },
      el('span', { class: 'tab-n', text: String(i + 1).padStart(2, '0') }),
      el('span', { class: 'ms', 'aria-hidden': 'true', 'data-anim': (LAB_ICON[lab.id] || [])[1], text: (LAB_ICON[lab.id] || ['science'])[0] }),
      el('span', { class: 'tab-name', text: lab.name }),
      el('span', { class: 'tab-eq', html: lab.eq }));
    t.addEventListener('click', () => selectLab(lab.id));
    t.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % labs.length; else if (e.key === 'ArrowLeft') j = (i - 1 + labs.length) % labs.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = labs.length - 1;
      if (j >= 0) { e.preventDefault(); selectLab(labs[j].id); tabs[j].focus(); }
    });
    rail.append(t);
    return t;
  });
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (labsById[id]) selectLab(id); });
}
