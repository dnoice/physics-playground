/*
✒ Metadata
    - Title: Instruments Deck Workspace (digiSpace Edition - v2.4)
    - File Name: deck.js
    - Relative Path: js/shell/deck.js
    - Artifact Type: javascript
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's brief for an exploration workspace: the deck's three panes
      (Telemetry, Inspect, Insights), its size presets and its resize grip.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The frame of the instruments deck: which pane shows, how tall the deck
    is, and the rules that move between panes on their own. The panes'
    contents belong to instruments.js (Telemetry), details.js (Inspect) and
    diagnostics.js (Insights).

✒ Key Features:
    - A tablist with the roving-tabindex keyboard contract: arrows, Home and
      End move and select.
    - A new selection on the stage opens Inspect; clearing it returns to the
      pane that was showing before, unless the user moved on meanwhile.
    - Compact, standard and tall presets on one button, and a grip on the
      top edge that drags, or steps with the arrow keys, to any height.
    - A deck too short for a plot hides it and keeps the readings; the plot
      redraws whenever the deck changes size.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, clamp, store } from '../core/util.js';
import { revealTile } from './layout.js';
import { drawChart } from './panel.js';
import { announce } from './state.js';

/* ---------- panes ---------- */
export const PANES = ['telemetry', 'inspect', 'insights'];
const NAMES = { telemetry: 'Telemetry', inspect: 'Inspect', insights: 'Insights' };
const tile = () => $('#tile-deck');
let pane = 'telemetry', before = null;
export const deckPane = () => pane;
export function showPane(id, { focus = false, auto = false, reveal = false } = {}) {
  if (!PANES.includes(id)) return;
  // An automatic switch remembers where it came from, so clearing the selection can go back there.
  before = auto ? (before || pane) : null;
  pane = id;
  for (const p of PANES) {
    const t = $(`#dt-${p}`), on = p === id;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $(`#dp-${p}`).hidden = !on;
    if (on && focus) t.focus();
  }
  tile().dataset.pane = id;
  if (id === 'inspect') $('#dt-inspect-dot').hidden = true;
  if (reveal) revealTile(tile());
  if (id === 'telemetry') requestAnimationFrame(() => drawChart());
}
/* Called by the Inspect pane whenever the selection changes: a new one opens Inspect, a cleared one goes back. */
export function noteSelection(had, has) {
  if (has && !had) { if (pane !== 'inspect') showPane('inspect', { auto: true }); }
  else if (!has && had) { if (pane === 'inspect' && before) { const b = before; before = null; showPane(b); } else before = null; }
  else if (has && pane !== 'inspect') $('#dt-inspect-dot').hidden = false;
  if (!has) $('#dt-inspect-dot').hidden = true;
}

/* ---------- size ---------- */
// The deck's height lives in --bay on the bento grid (workspace.css). A custom height is in pixels; the presets are
// the stylesheet's own, so they follow the viewport.
const MIN = 112, SHORT = 196;
const SIZES = ['compact', 'standard', 'tall'], SIZE_NAME = { compact: 'compact', standard: 'standard', tall: 'tall', custom: 'custom' };
let size = 'standard', px = 0;
function applySize(save = true) {
  const b = $('#bento');
  b.classList.toggle('deck-compact', size === 'compact');
  b.classList.toggle('deck-tall', size === 'tall');
  b.classList.toggle('deck-sized', size === 'custom');
  if (size === 'custom') b.style.setProperty('--bay-px', `${Math.round(px)}px`); else b.style.removeProperty('--bay-px');
  const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length] || 'compact', btn = $('#btn-deck-size');
  btn.querySelector('.ms').textContent = next === 'compact' ? 'unfold_less' : 'unfold_more';
  btn.title = `Instruments size: ${SIZE_NAME[size]} · click for ${next}`;
  $('#btn-deck-size-label').textContent = `Instruments size: ${SIZE_NAME[size]}. Make them ${next}.`;
  if (save) { store.set('deckSize', size); store.set('deckPx', px); }
}
export function setSize(s, h) {
  size = s; if (h != null) px = h;
  applySize();
  announce(`Instruments ${SIZE_NAME[s]}`);
}
function maxHeight() {
  const b = $('#bento'), wide = getComputedStyle(b).gridTemplateAreas.includes('notes');
  // Beside the inspector the stage keeps 260 px; stacked, the deck may take most of the screen.
  return wide && b.clientHeight > 0 ? Math.max(MIN, b.clientHeight - 260) : Math.round(innerHeight * 0.8);
}
function syncGrip() {
  const h = tile().getBoundingClientRect().height, g = $('#deck-grip');
  g.setAttribute('aria-valuenow', String(Math.round(h / Math.max(1, innerHeight) * 100)));
  g.setAttribute('aria-valuetext', `${Math.round(h)} pixels, ${SIZE_NAME[size]}`);
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  const tabs = PANES.map(p => $(`#dt-${p}`));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { showPane(PANES[i]); announce(`${NAMES[PANES[i]]} pane`); });
    t.addEventListener('keydown', e => {
      const n = tabs.length, j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (j >= 0) { e.preventDefault(); showPane(PANES[j], { focus: true }); }
    });
  });
  // The old two-state toggle stored deckTall; it maps onto the tall preset.
  size = store.get('deckSize', store.get('deckTall', false) ? 'tall' : 'standard'); px = store.get('deckPx', 0) || 0;
  if (!SIZES.includes(size) && !(size === 'custom' && px >= MIN)) size = 'standard';
  applySize(false);
  $('#btn-deck-size').addEventListener('click', () => setSize(SIZES[(SIZES.indexOf(size) + 1) % SIZES.length] || 'compact'));

  // The grip: drag the top edge, or focus it and use the arrow keys (Page keys step further, Home and End jump to
  // compact and tall, Enter or a double-click restore the standard height).
  const grip = $('#deck-grip');
  let drag = null;
  grip.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { y: e.clientY, h: tile().getBoundingClientRect().height, id: e.pointerId };
    try { grip.setPointerCapture(e.pointerId); } catch (_) { /* capture is best-effort */ }
    document.body.classList.add('resizing');
  });
  grip.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    px = clamp(drag.h + drag.y - e.clientY, MIN, maxHeight()); size = 'custom'; applySize(false);
  });
  const end = e => { if (!drag || e.pointerId !== drag.id) return; drag = null; document.body.classList.remove('resizing'); applySize(); };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('dblclick', () => setSize('standard'));
  grip.addEventListener('keydown', e => {
    const h = tile().getBoundingClientRect().height, step = { ArrowUp: 24, ArrowDown: -24, PageUp: 96, PageDown: -96 }[e.key];
    if (step) { e.preventDefault(); px = clamp(h + step, MIN, maxHeight()); size = 'custom'; applySize(); }
    else if (e.key === 'Home') { e.preventDefault(); setSize('compact'); }
    else if (e.key === 'End') { e.preventDefault(); setSize('tall'); }
    else if (e.key === 'Enter') { e.preventDefault(); setSize('standard'); }
  });
  // Too short for a plot: keep the readings and hide the plot. Any size change redraws it at the new size.
  const ro = new ResizeObserver(() => {
    const h = tile().getBoundingClientRect().height;
    tile().classList.toggle('deck-short', h < SHORT && h > 0);
    syncGrip();
    drawChart();
  });
  ro.observe(tile());
  showPane('telemetry');
}
