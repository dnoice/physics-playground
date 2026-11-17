/*
✒ Metadata
    - Title: Instruments Deck Workspace (digiSpace Edition - v2.19)
    - File Name: deck.js
    - Relative Path: js/shell/deck.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for drag handles and a duplication sweep: the grip is the
      deck's one size control, and the size button is gone. It lies across the
      gap above the deck; a drag or the arrow keys set any height, Home, Enter
      and End pick the compact, standard and tall presets, and a double-click
      steps through them as the button did. It runs on dragHandle(), and its
      value is the deck's height in pixels between its limits.
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Removed the
      unused deckPane() export.
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
    - One grip over the gap above the deck: a drag or the arrow keys set any
      height, Home, Enter and End pick the compact, standard and tall
      presets, and a double-click steps through them.
    - A deck too short for a plot hides it and keeps the readings; the plot
      redraws whenever the deck changes size.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, clamp, dragHandle, store } from '../core/util.js';
import { revealTile } from './layout.js';
import { drawChart } from './panel.js';
import { announce } from './state.js';

/* ---------- panes ---------- */
export const PANES = ['telemetry', 'inspect', 'insights'];
const NAMES = { telemetry: 'Telemetry', inspect: 'Inspect', insights: 'Insights' };
const tile = () => $('#tile-deck');
let pane = 'telemetry', before = null;
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
// the stylesheet's own, so they follow the viewport. The grip in the gap above the deck is the one control for both.
const MIN = 112, SHORT = 196;
const SIZES = ['compact', 'standard', 'tall'];
let size = 'standard', px = 0;
function applySize() {
  const b = $('#bento');
  b.classList.toggle('deck-compact', size === 'compact');
  b.classList.toggle('deck-tall', size === 'tall');
  b.classList.toggle('deck-sized', size === 'custom');
  if (size === 'custom') b.style.setProperty('--bay-px', `${Math.round(px)}px`); else b.style.removeProperty('--bay-px');
}
const saveSize = () => { store.set('deckSize', size); store.set('deckPx', px); };
function setSize(s) { size = s; applySize(); saveSize(); announce(`Instruments ${s}`); }
/* A double-click steps through the presets as the old size button did; from a dragged height it goes to standard. */
const nextSize = () => (size === 'custom' ? 'standard' : SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]);
// Layout sizes, not drawn ones: the tiles' entrance animation scales them for a moment.
const height = () => tile().offsetHeight;
function resize(h) { px = clamp(h, MIN, maxHeight()); size = 'custom'; applySize(); }
function maxHeight() {
  const wide = getComputedStyle($('#bento')).gridTemplateAreas.includes('notes'), stage = $('#tile-stage').offsetHeight;
  // Beside the inspector the stage keeps 260 px, as the stylesheet does; stacked, the deck may take most of the screen.
  return wide && stage > 0 ? Math.max(MIN, Math.floor(stage + height() - 260)) : Math.round(innerHeight * 0.8);
}
function syncGrip() {
  const h = Math.round(height()), g = $('#deck-grip');
  g.setAttribute('aria-valuemax', String(Math.round(maxHeight())));
  g.setAttribute('aria-valuenow', String(h));
  g.setAttribute('aria-valuetext', `${h} pixels, ${size === 'custom' ? 'custom height' : size}`);
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
  applySize();

  // The grip: drag the top edge, or focus it and use the arrow keys (Page keys step further). Home, Enter and End
  // pick the compact, standard and tall presets, and a double-click steps through them.
  const grip = $('#deck-grip');
  let h0 = 0;
  dragHandle(grip, {
    slop: 3, busy: 'resizing-deck', save: saveSize,
    start: () => { h0 = height(); },
    move: (e, dx, dy) => resize(h0 - dy),
    keys: { ArrowUp: 24, ArrowDown: -24, PageUp: 96, PageDown: -96, Home: 'compact', Enter: 'standard', End: 'tall' },
    step: v => (typeof v === 'number' ? resize(height() + v) : setSize(v)),
  });
  grip.addEventListener('dblclick', () => setSize(nextSize()));
  // Too short for a plot: keep the readings and hide the plot. Any size change redraws it at the new size.
  // The grip's range follows the console's height, so the console is watched too.
  const ro = new ResizeObserver(() => {
    const h = height();
    tile().classList.toggle('deck-short', h < SHORT && h > 0);
    syncGrip();
    drawChart();
  });
  ro.observe(tile()); ro.observe($('#bento'));
  showPane('telemetry');
}
