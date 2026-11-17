/*
✒ Metadata
    - Title: Library (digiSpace Edition - v2.19)
    - File Name: library.js
    - Relative Path: js/shell/library.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one timeline: the capture cards and their settings
      moved out (to the player bar and the Capture section of Settings); the
      Library keeps the saved items, and its empty line points to the player
      bar. A clip's tag says Clip, the word Record clip uses.
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for recordings shot like a film: the capture settings hold
      the director's switch, its note and Preview direction.
    - 2.16.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
      dataset's ZIP download carries its CSVs with a README and a data
      package, and its Details show each column's unit, with its meaning on
      hover, and how far its tracks were thinned.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Library page of the notebook: what the player bar's capture cluster
    saved, with the storage status, the filter and the list of saved items
    with preview, details, load, download, rename and delete.

✒ Key Features:
    - Storage status and, when synced to an artifact, a usage meter.
    - One list for clips, datasets and saved states, filtered to this lab or
      all, each in its kind's colour with one main action, downloads named by
      format, rename and a confirmed delete.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { ICON, icon } from '../core/icons.js';
import { $, clamp, el, fmtSI, keepFocus, store } from '../core/util.js';
import { labsById } from '../labs/index.js';
import { fmtBytes, fmtDur, fmtWhen, loadState } from './capture.js';
import { columnsOf, runZip } from './dataset.js';
import { radioGroup } from './panel.js';
import { active, announce } from './state.js';
import { vault } from './vault.js';

/* ---------- library ---------- */
export const lib = { filter: store.get('libFilter', 'lab'), open: null, confirm: null, renaming: null };
export const KIND = { clip: { icon: 'clip', name: 'Clip' }, run: { icon: 'data', name: 'Dataset' }, state: { icon: 'state', name: 'Saved state' } };
export function renderLibrary() {
  const storeEl = $('#lib-store'), listEl = $('#lib-list'), emptyEl = $('#lib-empty');
  if (!storeEl) return;
  const [head, sub] = vault.err ? ['Sync stopped', 'This list may be out of date, and new captures may not reach the artifact.'] : {
    connecting: ['Connecting to storage…', ''],
    cloud: ['Synced to this artifact', 'Kept across sessions and devices, and Claude can read your datasets.'],
    'cloud-ro': ['Read-only here', 'Only editors can save to this artifact, so new captures last for this session.'],
    local: ['Saved in this browser', 'Kept on this device until its site data is cleared.'],
    memory: ['Session only', 'Storage is not available here. Save the files you want to keep.'],
  }[vault.mode] || ['', ''];
  const kids = [el('div', { class: 'lib-status' }, el('span', { class: 'lib-status-head', text: head }), sub ? el('span', { class: 'lib-sub', text: sub }) : null)];
  if (vault.mode === 'cloud' && vault.usage && vault.usage.maxBytes) {
    const u = vault.usage, frac = clamp(u.bytes / u.maxBytes, 0, 1);
    kids.push(el('div', { class: 'meter', role: 'meter', 'aria-label': 'Artifact storage used', 'aria-valuemin': 0, 'aria-valuemax': u.maxBytes, 'aria-valuenow': u.bytes }, el('span', { style: `width: ${(frac * 100).toFixed(2)}%` })),
      el('div', { class: 'meter-row' }, el('span', { text: `${fmtBytes(u.bytes)} used` }), el('span', { text: `${fmtBytes(u.maxBytes)} total` })));
  }
  if (vault.stale) kids.push(el('div', { class: 'lib-sub', text: 'Storage is not answering yet, so this list may be out of date.' }));
  storeEl.replaceChildren(...kids); storeEl.dataset.mode = vault.mode;
  const items = vault.list().filter(i => lib.filter === 'all' || !active || i.lab === active.id);
  const shown = $('#lib-count');
  if (shown) shown.textContent = items.length ? `· ${items.length}` : '';
  emptyEl.hidden = items.length > 0;
  emptyEl.textContent = lib.filter === 'all' ? 'Nothing saved yet: clips, datasets and saved states from any lab will gather here.'
    : `Nothing saved for ${active ? active.name : 'this lab'} yet: what Record clip, Record data and Save state keep, in the player bar under the stage, will gather here.`;
  const keep = new Map([...listEl.children].map(li => [li.dataset.id, li]));
  const rows = items.map(item => {
    const li = keep.get(item.id) || el('li', { class: 'lib-item', 'data-id': item.id });
    renderItem(li, item);
    return li;
  });
  const same = rows.length === listEl.children.length && rows.every((r, i) => r === listEl.children[i]);
  if (!same) listEl.replaceChildren(...rows);
  // Focus the rename field as soon as it is in the document, not a frame later:
  // keys typed in between would otherwise reach the stage shortcuts.
  const ren = listEl.querySelector('.lib-rename');
  if (ren && document.activeElement !== ren) { ren.focus(); ren.select(); }
  const count = $('#nt-library-count'), total = vault.list().length;
  if (count) { count.textContent = total ? String(total) : ''; count.hidden = !total; }
}
/* A capture saved while another notebook tab is open marks the Library tab with the unseen count every tab uses
   (+1, then +2) beside its total, so a new clip, dataset or state is never filed away out of sight. Opening the
   Library takes has-new away, which hides the count (layout.js). */
export function noteNewItem() {
  const tab = $('#nt-library');
  if (!tab || tab.getAttribute('aria-selected') === 'true') return;
  const mark = tab.querySelector('.tab-new') || tab.appendChild(el('span', { class: 'tab-new', 'aria-hidden': 'true' }));
  const k = tab.classList.contains('has-new') ? (Number(mark.textContent) || 0) + 1 : 1;
  mark.textContent = String(k);
  tab.classList.add('has-new'); tab.setAttribute('aria-description', `${k} new item${k === 1 ? '' : 's'} saved`);
}
/* A saved item: its kind as a coloured tile and tag, its name (press to rename) and what it holds, and Delete as a
   quiet trash button in the corner, red on hover, which asks first. Then one row of actions: the main one leads,
   filled in the kind's colour (Preview a clip, see a dataset's Details, Load a state), and the downloads follow,
   each named by its format. */
export function renderItem(li, item) {
  const k = KIND[item.kind] || KIND.run, labName = labsById[item.lab] ? labsById[item.lab].name : item.lab;
  const sig = JSON.stringify([item.title, item.saving, item.localOnly, item.note, lib.open === item.id, lib.confirm === item.id, lib.renaming === item.id, item.sizeBytes, lib.filter]);
  if (li.dataset.sig === sig) return;
  li.dataset.sig = sig; li.dataset.kind = item.kind;
  const bits = [];
  if (item.duration) bits.push(fmtDur(item.duration));
  if (item.kind === 'run' && item.rows) bits.push(`${item.rows.toLocaleString()} rows`);
  if (item.kind === 'state' && item.bodies != null) bits.push(`${item.bodies} bodies`);
  bits.push(fmtBytes(item.sizeBytes || 0));
  if (lib.filter === 'all') bits.push(labName);
  bits.push(fmtWhen(item.createdAt));
  let title;
  if (lib.renaming === item.id) {
    title = el('input', { type: 'text', class: 'ctl-edit lib-rename', 'data-fk': 'title', value: item.title || '', 'aria-label': 'New name' });
    const done = ok => { if (lib.renaming !== item.id) return; lib.renaming = null; const v = title.value.trim(); if (ok && v && v !== item.title) vault.rename(item, v.slice(0, 120)); else renderLibrary(); };
    title.addEventListener('keydown', e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
    title.addEventListener('blur', () => done(true));
  } else {
    title = el('button', { type: 'button', class: 'lib-title', 'data-fk': 'title', 'data-ico': ICON.rename, text: item.title || 'Untitled', title: vault.canWrite(item) ? 'Rename' : item.title, disabled: item.saving || !vault.canWrite(item) || null, onclick: () => { lib.renaming = item.id; renderLibrary(); } });
  }
  // The glyph is drawn from data-ico by CSS, so a button's text is only its words.
  const act = (fk, label, ico, onclick, more = {}) => el('button', { type: 'button', class: 'lib-act', 'data-fk': fk, 'data-ico': ico, text: label, onclick, ...more });
  const del = !item.saving && vault.canWrite(item)
    ? el('button', { type: 'button', class: 'lib-del', 'data-fk': 'del', 'data-ico': ICON.erase, title: `Delete this ${k.name.toLowerCase()}`, onclick: () => { lib.confirm = item.id; renderLibrary(); $('[data-fk="no"]', li).focus(); } }, el('span', { class: 'sr-only', text: 'Delete' }))
    : null;
  const head = el('div', { class: 'lib-main' }, el('span', { class: 'lib-ico', html: icon(k.icon) }),
    el('div', { class: 'lib-text' }, el('div', { class: 'lib-line' }, title, item.localOnly ? el('span', { class: 'lib-badge', text: 'session' }) : null),
      el('span', { class: 'lib-meta' }, el('span', { class: 'lib-kind', text: k.name }), el('span', { text: item.saving ? 'Saving…' : bits.join(' · ') })),
      item.note ? el('span', { class: 'lib-note', text: item.note }) : null), del);
  const kids = [head];
  if (!item.saving) {
    const acts = el('div', { class: 'lib-actions' });
    const toggle = (label, ico) => act('open', lib.open === item.id ? 'Hide' : label, ico, () => { lib.open = lib.open === item.id ? null : item.id; renderLibrary(); }, { class: 'lib-act lib-act-main', 'aria-expanded': String(lib.open === item.id) });
    if (item.kind === 'clip') acts.append(toggle('Preview', ICON.preview));
    if (item.kind === 'run') acts.append(toggle('Details', ICON.details));
    if (item.kind === 'state') acts.append(act('load', 'Load', ICON.load, () => loadState(item), { class: 'lib-act lib-act-main', title: 'Load this state into the lab' }));
    // A dataset leaves whole as one ZIP: its CSVs with the README and data package that explain them.
    if (item.kind === 'run' && vault.canDownload()) acts.append(act('zip', 'ZIP', ICON.download, async () => { try { const z = await runZip(item); vault.download(z.name, z.blob); } catch (_) { announce('The dataset could not be packed.'); } },
      { title: 'Download everything: the CSVs, a README that explains every column, and a data package', 'aria-label': 'Download all files with their README, as a ZIP' }));
    if (vault.canDownload()) item.files.forEach((f, i) => {
      const ext = (f.name.split('.').pop() || '').toUpperCase(), tracks = f.name.endsWith('-tracks.csv'), label = tracks ? `Tracks ${ext}` : ext;
      acts.append(act(`save-${i}`, label, ICON.download, async () => { const b = await vault.blob(item, i); if (b) vault.download(f.name, b); else announce('That file could not be read.'); }, { title: `Download ${f.name}`, 'aria-label': `Download ${tracks ? `${(item.trackLabel || 'tracks').toLowerCase()} ${ext}` : ext}` }));
    });
    kids.push(acts);
    if (lib.confirm === item.id) {
      kids.push(el('div', { class: 'lib-confirm', role: 'group', 'aria-label': 'Confirm delete' }, el('span', { text: `Delete this ${k.name.toLowerCase()} for good?` }),
        el('button', { type: 'button', class: 'btn btn-fix lib-yes', 'data-fk': 'yes', text: 'Delete', onclick: async () => { lib.confirm = null; try { await vault.remove(item); announce('Deleted'); $('#nt-library').focus(); } catch (_) { announce('Delete failed; try again.'); renderLibrary(); } } }),
        el('button', { type: 'button', class: 'btn btn-fix', 'data-fk': 'no', text: 'Keep', onclick: () => { lib.confirm = null; renderLibrary(); $('[data-fk="del"]', li).focus(); } })));
    }
    if (lib.open === item.id && item.kind === 'clip') {
      const v = el('video', { controls: true, playsinline: true, preload: 'metadata', 'aria-label': item.title });
      vault.src(item, 0).then(u => { if (u) v.src = u; });
      kids.push(el('div', { class: 'lib-preview' }, v));
    }
    if (lib.open === item.id && item.kind === 'run') {
      // Each column with its unit, and what it means on hover: the README in the ZIP has it all in full.
      const tbl = el('table', { class: 'lib-sum' }), info = new Map(columnsOf(labsById[item.lab], item.columns).map(c => [c.name, c]));
      tbl.append(el('tr', {}, el('th', { text: 'Column' }), el('th', { text: 'Unit' }), el('th', { text: 'Min' }), el('th', { text: 'Mean' }), el('th', { text: 'Max' })));
      for (const s of item.summary || []) {
        const c = info.get(s.column) || {};
        tbl.append(el('tr', { title: c.about || '' }, el('th', { text: s.column }), el('td', { class: 'lib-unit', text: c.unit || '' }), el('td', { text: s.min == null ? '—' : fmtSI(s.min) }), el('td', { text: s.mean == null ? '—' : fmtSI(s.mean) }), el('td', { text: s.max == null ? '—' : fmtSI(s.max) })));
      }
      const asked = item.rateAsked && item.rateAsked !== item.rate ? ` (asked for ${item.rateAsked} Hz; samples land on solver steps)` : '';
      const thin = item.trackStride > 1 ? `, every ${item.trackStride} samples so they span the whole run` : '';
      const note = `${(item.rows || 0).toLocaleString()} rows at ${item.rate} Hz of simulated time${asked}${item.trackRows ? `, plus ${item.trackRows.toLocaleString()} rows of ${(item.trackLabel || 'tracks').toLowerCase()}${thin}` : ''}. The ZIP adds a README that explains every column, its unit and its SI factor.`;
      kids.push(el('div', { class: 'lib-preview' }, el('p', { class: 'caption', text: note }), tbl));
    }
  }
  keepFocus(li, () => li.replaceChildren(...kids));
}
export function buildLibraryFilter() {
  const host = $('#lib-filter'); if (!host) return;
  const g = radioGroup('Show', [['lab', 'This lab'], ['all', 'All labs']], () => lib.filter, v => { lib.filter = v; store.set('libFilter', v); renderLibrary(); }, 'libf');
  host.replaceChildren(g.group);
}
