/*
✒ Metadata
    - Title: Library (digiSpace Edition - v2.1)
    - File Name: library.js
    - Relative Path: js/shell/library.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Keyboard
      focus survives rebuilds; read-only artifacts hide write actions; sync
      failures are shown; datasets state their real rate.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file. v2.0 adds the tab count and new-item marker,
      and fixes a rename race that sent the first keys typed to the stage
      shortcuts.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Library page of the notebook: storage status, filter, and the list
    of saved items with preview, download, rename and delete.

✒ Key Features:
    - Items update in place, so open previews and focus survive refreshes.
    - Rename field takes focus as soon as it exists, so no keystroke reaches
      the stage.
    - The Library tab shows a count and a dot for new items.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { icon } from '../core/icons.js';
import { $, clamp, el, fmtSI, keepFocus, store } from '../core/util.js';
import { labsById } from '../labs/index.js';
import { dataRec, fmtBytes, fmtDur, fmtWhen, loadState, saveState, toggleData, toggleVideo, vrec } from './capture.js';
import { radioGroup } from './panel.js';
import { active, announce } from './state.js';
import { vault } from './vault.js';

/* ---------- library ---------- */
export const lib = { filter: store.get('libFilter', 'lab'), open: null, confirm: null, renaming: null };
export const KIND = { clip: { icon: 'clip', name: 'Video' }, run: { icon: 'data', name: 'Dataset' }, state: { icon: 'state', name: 'Saved state' } };
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
  const kids = [el('div', { class: 'lib-status' }, el('div', {}, el('div', { text: head }), sub ? el('div', { class: 'lib-sub', text: sub }) : null))];
  if (vault.mode === 'cloud' && vault.usage && vault.usage.maxBytes) {
    const u = vault.usage, frac = clamp(u.bytes / u.maxBytes, 0, 1);
    kids.push(el('div', { class: 'meter', role: 'meter', 'aria-label': 'Artifact storage used', 'aria-valuemin': 0, 'aria-valuemax': u.maxBytes, 'aria-valuenow': u.bytes }, el('span', { style: `width: ${(frac * 100).toFixed(2)}%` })),
      el('div', { class: 'meter-row' }, el('span', { text: `${fmtBytes(u.bytes)} used` }), el('span', { text: `${fmtBytes(u.maxBytes)} total` })));
  }
  if (vault.stale) kids.push(el('div', { class: 'lib-sub', text: 'Storage is not answering yet, so this list may be out of date.' }));
  storeEl.replaceChildren(...kids); storeEl.dataset.mode = vault.mode;
  const items = vault.list().filter(i => lib.filter === 'all' || !active || i.lab === active.id);
  emptyEl.hidden = items.length > 0;
  emptyEl.textContent = lib.filter === 'all' ? 'Nothing saved yet: clips, datasets and saved states from any lab will gather here.' : `Nothing saved for ${active ? active.name : 'this lab'} yet: the clips, datasets and states you capture above will gather here.`;
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
/* A capture saved while another notebook tab is open marks the Library tab,
   so a new clip, dataset or state is never filed away out of sight. */
export function noteNewItem() {
  const tab = $('#nt-library');
  if (tab && tab.getAttribute('aria-selected') !== 'true') { tab.classList.add('has-new'); tab.setAttribute('aria-description', 'New item saved'); }
}
export function renderItem(li, item) {
  const k = KIND[item.kind] || KIND.run, labName = labsById[item.lab] ? labsById[item.lab].name : item.lab;
  const sig = JSON.stringify([item.title, item.saving, item.localOnly, item.note, lib.open === item.id, lib.confirm === item.id, lib.renaming === item.id, item.sizeBytes]);
  if (li.dataset.sig === sig) return;
  li.dataset.sig = sig; li.dataset.kind = item.kind;
  const bits = [k.name];
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
    title = el('button', { type: 'button', class: 'lib-title', 'data-fk': 'title', text: item.title || 'Untitled', title: vault.canWrite(item) ? 'Rename' : item.title, disabled: item.saving || !vault.canWrite(item) || null, onclick: () => { lib.renaming = item.id; renderLibrary(); } });
  }
  const head = el('div', { class: 'lib-main' }, el('span', { class: 'lib-ico', html: icon(k.icon) }),
    el('div', { class: 'lib-text' }, el('div', {}, title, item.localOnly ? el('span', { class: 'lib-badge', text: 'session' }) : null), el('span', { class: 'lib-meta', text: item.saving ? 'Saving…' : bits.join(' · ') }), item.note ? el('span', { class: 'lib-note', text: item.note }) : null));
  const kids = [head];
  if (!item.saving) {
    const acts = el('div', { class: 'lib-actions' });
    const toggle = label => el('button', { type: 'button', class: 'btn', 'data-fk': 'open', 'aria-expanded': String(lib.open === item.id), text: lib.open === item.id ? 'Hide' : label, onclick: () => { lib.open = lib.open === item.id ? null : item.id; renderLibrary(); } });
    if (item.kind === 'clip') acts.append(toggle('Preview'));
    if (item.kind === 'run') acts.append(toggle('Details'));
    if (item.kind === 'state') acts.append(el('button', { type: 'button', class: 'btn', 'data-fk': 'load', text: 'Load', onclick: () => loadState(item) }));
    if (vault.canDownload()) item.files.forEach((f, i) => {
      const ext = (f.name.split('.').pop() || '').toUpperCase(), label = f.name.endsWith('-tracks.csv') ? `Save ${item.trackLabel || 'tracks'} CSV` : `Save ${ext}`;
      acts.append(el('button', { type: 'button', class: 'btn', 'data-fk': `save-${i}`, text: label, onclick: async () => { const b = await vault.blob(item, i); if (b) vault.download(f.name, b); else announce('That file could not be read.'); } }));
    });
    if (vault.canWrite(item)) acts.append(el('button', { type: 'button', class: 'btn btn-del', 'data-fk': 'del', text: 'Delete', onclick: () => { lib.confirm = item.id; renderLibrary(); $('[data-fk="no"]', li).focus(); } }));
    kids.push(acts);
    if (lib.confirm === item.id) {
      kids.push(el('div', { class: 'lib-confirm', role: 'group', 'aria-label': 'Confirm delete' }, el('span', { text: `Delete this ${k.name.toLowerCase()} for good?` }),
        el('button', { type: 'button', class: 'btn btn-fix', 'data-fk': 'yes', text: 'Delete', onclick: async () => { lib.confirm = null; try { await vault.remove(item); announce('Deleted'); $('#nt-library').focus(); } catch (_) { announce('Delete failed; try again.'); renderLibrary(); } } }),
        el('button', { type: 'button', class: 'btn btn-fix', 'data-fk': 'no', text: 'Keep', onclick: () => { lib.confirm = null; renderLibrary(); $('[data-fk="del"]', li).focus(); } })));
    }
    if (lib.open === item.id && item.kind === 'clip') {
      const v = el('video', { controls: true, playsinline: true, preload: 'metadata', 'aria-label': item.title });
      vault.src(item, 0).then(u => { if (u) v.src = u; });
      kids.push(el('div', { class: 'lib-preview' }, v));
    }
    if (lib.open === item.id && item.kind === 'run') {
      const tbl = el('table', { class: 'lib-sum' });
      tbl.append(el('tr', {}, el('th', { text: 'Column' }), el('th', { text: 'Min' }), el('th', { text: 'Mean' }), el('th', { text: 'Max' })));
      for (const s of item.summary || []) tbl.append(el('tr', {}, el('th', { text: s.column }), el('td', { text: s.min == null ? '—' : fmtSI(s.min) }), el('td', { text: s.mean == null ? '—' : fmtSI(s.mean) }), el('td', { text: s.max == null ? '—' : fmtSI(s.max) })));
      const asked = item.rateAsked && item.rateAsked !== item.rate ? ` (asked for ${item.rateAsked} Hz; samples land on solver steps)` : '';
      const note = `${(item.rows || 0).toLocaleString()} rows at ${item.rate} Hz of simulated time${asked}${item.trackRows ? `, plus ${item.trackRows.toLocaleString()} rows of ${(item.trackLabel || 'tracks').toLowerCase()}` : ''}.`;
      kids.push(el('div', { class: 'lib-preview' }, el('p', { class: 'caption', text: note }), tbl));
    }
  }
  keepFocus(li, () => li.replaceChildren(...kids));
}
/* ---------- capture cards: the three ways to keep a run, one press each ---------- */
let capCards = null;
export function buildLibraryCapture(lab) {
  const host = $('#lib-capture'); if (!host || !lab) return;
  const card = (kind, title, key, run) => {
    const name = el('span', { class: 'cap-name', text: title }), sub = el('span', { class: 'cap-sub' });
    const b = el('button', { type: 'button', class: 'cap-card', 'data-kind': kind, 'aria-pressed': 'false' }, el('span', { class: 'cap-ico', html: icon(KIND[kind].icon) }), name, key ? el('kbd', { text: key }) : el('span'), sub);
    b.addEventListener('click', () => { run(); syncLibraryCapture(); });
    return { b, name, sub };
  };
  const cols = (lab.dataColumns || []).length;
  capCards = {
    clip: card('clip', 'Record a clip', 'M', toggleVideo),
    run: card('run', 'Record a dataset', 'D', toggleData),
    state: card('state', 'Save this state', null, () => saveState()),
    cols, lab,
  };
  host.replaceChildren(capCards.clip.b, capCards.run.b, capCards.state.b,
    el('p', { class: 'cap-cols', text: cols ? `A dataset holds ${cols} columns for ${lab.name}: ${lab.dataColumns.join(', ')}.` : '' }));
  syncLibraryCapture();
}
/* Panel rate: each card says what it will do, or what it is doing now. */
export function syncLibraryCapture() {
  if (!capCards) return;
  const { clip, run, state, cols } = capCards, set = (c, name, sub, on) => {
    if (c.name.textContent !== name) c.name.textContent = name;
    if (c.sub.textContent !== sub) c.sub.textContent = sub;
    c.b.setAttribute('aria-pressed', String(!!on));
  };
  set(clip, vrec.mr ? 'Stop the clip' : 'Record a clip', vrec.mr ? `${fmtDur((performance.now() - vrec.t0) / 1000)} · ${fmtBytes(vrec.bytes)}` : `WebM of the stage, ${vrec.quality} quality${vrec.overlay ? ', labelled' : ''}`, vrec.mr);
  set(run, dataRec.on ? 'Stop the dataset' : 'Record a dataset', dataRec.on ? `${dataRec.rows.length.toLocaleString()} rows so far` : `${cols} columns at ${dataRec.rate} Hz of simulated time`, dataRec.on);
  set(state, 'Save this state', 'The exact scene, to reload later or share', false);
}
export function buildCaptureSettings() {
  const host = $('#capture-settings'); if (!host) return;
  const qg = radioGroup('Video quality', [['compact', 'Compact'], ['standard', 'Standard'], ['high', 'High']], () => vrec.quality, v => { vrec.quality = v; store.set('vq', v); }, 'vq');
  const rg = radioGroup('Data sample rate', [['5', '5 Hz'], ['10', '10 Hz'], ['30', '30 Hz'], ['60', '60 Hz']], () => String(dataRec.rate), v => { dataRec.rate = +v; store.set('dataRate', +v); }, 'rate');
  const sw = (id, label, get, set) => {
    const b = el('button', { type: 'button', role: 'switch', class: 'switch', id }, el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })), el('span', { id: id + '-label', text: label }));
    const upd = () => b.setAttribute('aria-checked', String(!!get()));
    b.addEventListener('click', () => { set(!get()); upd(); }); upd();
    return b;
  };
  host.replaceChildren(
    el('h4', { class: 'sub', text: 'Capture settings' }),
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Video quality' }), qg.group),
    sw('sw-overlay', 'Label videos with lab, scene and time', () => vrec.overlay, v => { vrec.overlay = v; store.set('overlay', v); }),
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Data sample rate (simulated time)' }), rg.group),
    sw('sw-tracks', 'Include tracks', () => dataRec.tracksOn, v => { dataRec.tracksOn = v; store.set('tracks', v); }),
    el('p', { class: 'ctl-note', id: 'tracks-note' }));
  updateTracksNote();
}
export function updateTracksNote() {
  const n = $('#tracks-note'), sw = $('#sw-tracks'), lbl = $('#sw-tracks-label'); if (!n || !active) return;
  const has = !!active.trackRows;
  sw.disabled = !has;
  lbl.textContent = has ? `Include ${active.trackLabel.toLowerCase()}` : 'Include tracks';
  n.textContent = has ? `Saved as a second CSV beside the dataset.` : `${active.name} records summary measurements only.`;
}
export function buildLibraryFilter() {
  const host = $('#lib-filter'); if (!host) return;
  const g = radioGroup('Show', [['lab', 'This lab'], ['all', 'All labs']], () => lib.filter, v => { lib.filter = v; store.set('libFilter', v); renderLibrary(); }, 'libf');
  host.replaceChildren(g.group);
}
