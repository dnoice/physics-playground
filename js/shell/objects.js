/*
✒ Metadata
    - Title: Objects List (digiSpace Edition - v2.19)
    - File Name: objects.js
    - Relative Path: js/shell/objects.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for every current object in an intuitive table under
      Inspect: the lab's objects() as a sortable list beside the card, the
      selected one marked, a click or Enter selecting, kept fast at 1500
      balls by drawing only the rows in view.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The list of every object in the scene, in the deck's Inspect pane beside
    the card. A lab lists them through objects() and objectCols; this module
    sorts them, draws the rows in view, marks the selection and hands a pick
    back to details.js, which selects through the lab's select().

✒ Key Features:
    - Name, kind and the lab's own two or three figures, in the chosen units,
      sortable by any column, the lab's own order first.
    - Only the rows in view exist, so the Solar System's belts and
      Collisions' 1500 balls scroll as lightly as five posts; the rows are
      refreshed in place at panel rate and only where their text changed.
    - The order holds still while the pointer is over the list, so a row
      cannot move away from a click; with the keyboard in the list, the
      active row keeps its place on the screen as the order changes.
    - A listbox with the full keyboard contract: arrows, Page keys, Home and
      End move, Enter or Space select; focus stays on the list across
      refreshes.

✒ Usage Instructions:
    In a lab:  objectCols: [{ label, unit() { return 'km/s' }, text: v => '12.3', w: 0.85 }]   w: the column's share
               objects() { return [{ id, name, kind, v: [n0, n1] }] }
    In the shell:  initObjects(pick) once, updateObjects(lab) at panel rate

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, el } from '../core/util.js';

/* Row height in pixels; tiles.css sets the same as --orow. */
const ROW = 26;
const host = $('#objects'), listEl = $('#objects-list'), space = $('#objects-space'), colsEl = $('#objects-cols'), countEl = $('#objects-n'), emptyEl = $('#objects-empty');
let lab0 = null, list = [], order = [], sortCol = null, sortDir = 1, heads = [], pool = [], activeId = null, lastSel = null, held = false, onPick = () => {};
const pane = () => $('#dp-inspect');

/* The header: Name and Kind, then the lab's figures, each a button that sorts by it (again to reverse). */
function buildHead(lab) {
  const cols = [{ label: 'Name', key: 'name' }, { label: 'Kind', key: 'kind' }, ...lab.objectCols.map((c, i) => ({ ...c, key: i }))];
  host.style.setProperty('--ocols', `minmax(0, 1.2fr) minmax(0, 1fr) ${lab.objectCols.map(c => `minmax(0, ${c.w || 0.85}fr)`).join(' ')}`);
  heads = cols.map(c => {
    const unit = el('small', { class: 'ocol-unit' }), b = el('button', { type: 'button', class: 'ocol' + (typeof c.key === 'number' ? ' num' : '') },
      el('span', { class: 'ocol-name', text: c.label }), unit, el('span', { class: 'ms', 'aria-hidden': 'true', text: 'expand_more' }));
    b.addEventListener('click', () => { if (sortCol === c.key) sortDir = -sortDir; else { sortCol = c.key; sortDir = typeof c.key === 'number' ? -1 : 1; } refresh(lab0, true); });
    return { c, b, unit };
  });
  colsEl.replaceChildren(...heads.map(h => h.b));
}
function syncHead() {
  for (const h of heads) {
    const u = h.c.unit ? h.c.unit() : '', on = sortCol === h.c.key, dir = sortDir > 0 ? (typeof h.c.key === 'number' ? 'smallest first' : 'A to Z') : (typeof h.c.key === 'number' ? 'largest first' : 'Z to A');
    if (h.unit.textContent !== u) h.unit.textContent = u;
    h.b.setAttribute('aria-pressed', String(on));
    h.b.classList.toggle('up', on && sortDir > 0);
    const lbl = `Sort by ${h.c.label.toLowerCase()}${on ? `, now ${dir}` : ''}`;
    if (h.b.getAttribute('aria-label') !== lbl) h.b.setAttribute('aria-label', lbl);
  }
}
/* The rows' order, as indices into list: the lab's own, or by a column. While the pointer is over the list the order
   holds: heldIds is the order shown before this refresh, by object id (indices move as the lab's own order changes),
   and only objects that came (at the end) or went change it. */
function sortList(heldIds) {
  const n = list.length;
  if (heldIds && heldIds.length) {
    const at = new Map(list.map((o, i) => [o.id, i])), kept = [], seen = new Set();
    for (const id of heldIds) { const i = at.get(id); if (i != null && !seen.has(i)) { kept.push(i); seen.add(i); } }
    for (let i = 0; i < n; i++) if (!seen.has(i)) kept.push(i);
    return kept;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  if (sortCol == null) return idx;
  const key = sortCol, d = sortDir;
  if (typeof key === 'number') idx.sort((a, b) => { const x = list[a].v[key], y = list[b].v[key], fx = Number.isFinite(x), fy = Number.isFinite(y); return fx && fy ? (x - y) * d || a - b : fx ? -1 : fy ? 1 : a - b; });
  else idx.sort((a, b) => String(list[a][key]).localeCompare(String(list[b][key]), undefined, { numeric: true }) * d || a - b);
  return idx;
}
/* One row of the pool: reused for whichever object scrolls into its place, its text set only when it changes. */
function makeRow() {
  const cells = [];
  for (let k = 0; k < heads.length; k++) cells.push(el('span', { class: 'ocell' + (k > 1 ? ' num' : '') }));
  const r = el('div', { class: 'orow', role: 'option', 'aria-selected': 'false' }, ...cells);
  r.cells = cells; r.txt = []; r.oid = null;
  r.addEventListener('click', () => { if (r.oid != null) { activeId = r.oid; onPick(r.oid); listEl.focus({ preventScroll: true }); } });
  space.append(r);
  return r;
}
function render() {
  const lab = lab0, n = order.length, h = listEl.clientHeight || ROW * 6, first = Math.max(0, Math.floor(listEl.scrollTop / ROW)), count = Math.min(n - first, Math.ceil(h / ROW) + 1);
  const sel = lab.selectedId(), cols = lab.objectCols;
  while (pool.length < count) pool.push(makeRow());
  let act = null;
  for (let j = 0; j < pool.length; j++) {
    const r = pool[j];
    if (j >= count) { if (!r.hidden) { r.hidden = true; r.oid = null; r.removeAttribute('id'); } continue; }
    const o = list[order[first + j]], txt = [o.name, o.kind, ...cols.map((c, k) => c.text(o.v[k]))];
    if (r.hidden) r.hidden = false;
    // Only the rows in view exist, so each tells assistive technology its place in the whole list.
    if (r.top !== first + j) { r.top = first + j; r.style.transform = `translateY(${(first + j) * ROW}px)`; r.setAttribute('aria-posinset', String(first + j + 1)); }
    if (r.size !== n) { r.size = n; r.setAttribute('aria-setsize', String(n)); }
    r.oid = o.id;
    let changed = false;
    for (let k = 0; k < txt.length; k++) if (r.txt[k] !== txt[k]) { r.txt[k] = txt[k]; r.cells[k].textContent = txt[k]; changed = true; }
    if (changed) r.setAttribute('aria-label', `${o.name}, ${o.kind}${cols.map((c, k) => `, ${c.label} ${txt[k + 2]}${c.unit ? ` ${c.unit()}` : ''}`).join('')}`);
    const isSel = o.id === sel, isAct = o.id === activeId;
    if (r.getAttribute('aria-selected') !== String(isSel)) r.setAttribute('aria-selected', String(isSel));
    r.classList.toggle('act', isAct);
    if (isAct) { act = r; if (r.id !== 'orow-act') r.id = 'orow-act'; } else if (r.id) r.removeAttribute('id');
  }
  if (act) listEl.setAttribute('aria-activedescendant', 'orow-act'); else listEl.removeAttribute('aria-activedescendant');
}
/* Scroll so the row at index i shows, by as little as it takes, or centred when it was far off. */
function reveal(i, centre) {
  const top = i * ROW, h = listEl.clientHeight;
  if (top >= listEl.scrollTop && top + ROW <= listEl.scrollTop + h) return;
  listEl.scrollTop = centre ? top - (h - ROW) / 2 : top < listEl.scrollTop ? top : top + ROW - h;
}
function refresh(lab, now) {
  if (!lab) return;
  const prev = activeId == null ? -1 : order.findIndex(i => list[i] && list[i].id === activeId);
  const heldIds = held ? order.map(i => list[i] && list[i].id) : null;
  list = lab.objects(); order = sortList(heldIds);
  const n = list.length, sel = lab.selectedId();
  host.classList.toggle('none', !n);
  emptyEl.hidden = !!n; listEl.hidden = !n;
  if (!n) emptyEl.textContent = lab.objectsEmpty || `Nothing to list in this scene yet.`;
  const c = String(n); if (countEl.textContent !== c) countEl.textContent = c;
  space.style.height = `${n * ROW}px`;
  syncHead();
  // The keyboard's place in the list keeps its spot on the screen as the order changes under it.
  const at = activeId == null ? -1 : order.findIndex(i => list[i].id === activeId);
  if (activeId != null && at < 0) activeId = null;
  if (at >= 0 && prev >= 0 && at !== prev && document.activeElement === listEl && !now) listEl.scrollTop += (at - prev) * ROW;
  // A selection made on the stage shows in the list.
  if (sel !== lastSel) { lastSel = sel; if (sel != null) { const i = order.findIndex(k => list[k].id === sel); if (i >= 0) { activeId = sel; reveal(i, true); } } }
  render();
}
function moveActive(step, to) {
  if (!order.length) return;
  const at = activeId == null ? -1 : order.findIndex(i => list[i].id === activeId);
  const i = Math.max(0, Math.min(order.length - 1, to != null ? to : at < 0 ? 0 : at + step));
  activeId = list[order[i]].id; reveal(i, false); render();
}

/* Panel rate, from details.js: only while the Inspect pane shows, since nothing else reads the list. */
export function updateObjects(lab) {
  if (!host) return;
  const has = !!(lab && lab.objects);
  host.hidden = !has;
  if (!has) { lab0 = lab; return; }
  if (lab !== lab0) {
    lab0 = lab; sortCol = null; sortDir = 1; activeId = null; lastSel = null; order = []; held = false;
    for (const r of pool) r.remove();
    pool = []; buildHead(lab); listEl.scrollTop = 0;
    $('#objects-h-name').textContent = lab.objectsName || 'Objects';
  }
  if (pane().hidden) return;
  refresh(lab);
}

/* Wiring: once, from details.js; pick selects an object by id. */
export function initObjects(pick) {
  if (!host) return;
  onPick = pick;
  listEl.addEventListener('scroll', () => { if (lab0 && lab0.objects) render(); }, { passive: true });
  listEl.addEventListener('pointerenter', () => { held = true; });
  listEl.addEventListener('pointerleave', () => { held = false; });
  listEl.addEventListener('focus', () => { if (activeId == null && order.length) { activeId = list[order[Math.floor(listEl.scrollTop / ROW)] ?? order[0]].id; render(); } });
  listEl.addEventListener('keydown', e => {
    const page = Math.max(1, Math.floor(listEl.clientHeight / ROW) - 1);
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page }[e.key];
    if (step) { e.preventDefault(); moveActive(step); }
    else if (e.key === 'Home') { e.preventDefault(); moveActive(0, 0); }
    else if (e.key === 'End') { e.preventDefault(); moveActive(0, order.length - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && activeId != null) { e.preventDefault(); e.stopPropagation(); onPick(activeId); }
  });
  // The pane coming into view fills the list at once, not at the next panel tick.
  $('#dt-inspect').addEventListener('click', () => requestAnimationFrame(() => { if (lab0 && lab0.objects) refresh(lab0, true); }));
  new ResizeObserver(() => { if (lab0 && lab0.objects && !pane().hidden) render(); }).observe(listEl);
}
