/*
✒ Metadata
    - Title: Library (digiSpace Edition - v2.15)
    - File Name: library.js
    - Relative Path: js/shell/library.js
    - Artifact Type: javascript
    - Version: 2.15.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for a Library where what is what is obvious: a Capture
      control bar whose recorders wear the red record dot and turn to stop
      squares while running, with a Save state that confirms; capture settings
      that fold out beside it; and item cards with the kind's colour, one main
      action, downloads named by format and Delete as a corner trash button.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Capture
      cards on Dennis's call to fill the Library: record a clip, record a
      dataset or save the state with one press, each saying what it will keep
      for this lab and what it is doing now.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Keyboard
      focus survives rebuilds; read-only artifacts hide write actions; sync
      failures are shown; datasets state their real rate.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Library page of the notebook, in two sections: Capture, a control bar
    that records a clip or a dataset or saves the state, with its settings
    beside it; and Saved, the storage status, filter and list of saved items
    with preview, details, load, download, rename and delete.

✒ Key Features:
    - Capture bar: Record clip and Record data with the red record mark, a
      stop square while recording and their progress, and Save state, which
      confirms; each with its key.
    - Capture settings fold out beside the bar and are remembered: video
      quality and labels, the data sample rate, and tracks.
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
/* ---------- capture: the three ways to keep a run, one press each ---------- */
/* Two recorders and a save, laid out as a control bar. The recorders wear the universal record mark, a red dot in a
   ring, which turns to a stop square on a pulsing red disc while they run, their label to Stop and their line to the
   time and size so far. Save state is an instant action with its own mark, and says so when it has saved. Each shows
   its key. A dataset's columns fold away under the bar. */
let capCards = null;
export function buildLibraryCapture(lab) {
  const host = $('#lib-capture'); if (!host || !lab) return;
  const card = (kind, key, run, more = {}) => {
    const name = el('span', { class: 'cap-name' }), sub = el('span', { class: 'cap-sub' });
    const b = el('button', { type: 'button', class: 'cap-card', 'data-kind': kind, 'aria-keyshortcuts': key || null, ...more },
      el('span', { class: 'cap-mark', 'aria-hidden': 'true', 'data-ico': kind === 'state' ? ICON.state : null }), name, sub, key ? el('kbd', { text: key }) : null);
    b.addEventListener('click', () => { run(); syncLibraryCapture(); });
    return { b, name, sub };
  };
  const cols = (lab.dataColumns || []).length;
  capCards = {
    clip: card('clip', 'M', toggleVideo, { 'aria-pressed': 'false' }),
    run: card('run', 'D', toggleData, { 'aria-pressed': 'false', disabled: cols ? null : true }),
    state: card('state', null, () => Promise.resolve(saveState()).then(() => { capCards.saved = performance.now(); syncLibraryCapture(); setTimeout(syncLibraryCapture, 1700); }), { disabled: lab.serialize ? null : true }),
    cols, lab, saved: 0,
  };
  const holds = cols ? el('details', { class: 'cap-cols' }, el('summary', { text: `What a dataset holds: ${cols} columns` }),
    el('div', { class: 'cap-chips' }, ...lab.dataColumns.map(c => el('code', { text: c })))) : el('span');
  host.replaceChildren(capCards.clip.b, capCards.run.b, capCards.state.b, holds);
  syncLibraryCapture();
}
/* Panel rate: each button says what it will do, or what it is doing now. */
export function syncLibraryCapture() {
  if (!capCards) return;
  const { clip, run, state, cols, lab } = capCards, set = (c, name, sub, on) => {
    if (c.name.textContent !== name) c.name.textContent = name;
    if (c.sub.textContent !== sub) c.sub.textContent = sub;
    if (on != null) c.b.setAttribute('aria-pressed', String(!!on));
  };
  const q = vrec.quality[0].toUpperCase() + vrec.quality.slice(1);
  // Two short lines each, broken where they read, never mid-phrase.
  set(clip, vrec.mr ? 'Stop clip' : 'Record clip', vrec.mr ? `${fmtDur((performance.now() - vrec.t0) / 1000)}\n${fmtBytes(vrec.bytes)}` : `WebM, ${q.toLowerCase()}\n${vrec.overlay ? 'labelled' : 'unlabelled'}`, !!vrec.mr);
  set(run, dataRec.on ? 'Stop data' : 'Record data', !cols ? 'Not in\nthis lab' : dataRec.on ? `${dataRec.rows.length.toLocaleString()} rows\nso far` : `${cols} columns\nat ${dataRec.rate} Hz`, dataRec.on);
  const fresh = performance.now() - capCards.saved < 1600;
  state.b.classList.toggle('is-saved', fresh);
  set(state, fresh ? 'Saved' : 'Save state', !lab.serialize ? 'Not in\nthis lab' : fresh ? 'In the list\nbelow' : 'The exact\nscene', null);
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
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Video quality' }), qg.group),
    sw('sw-overlay', 'Label videos with lab, scene and time', () => vrec.overlay, v => { vrec.overlay = v; store.set('overlay', v); }),
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Data sample rate (simulated time)' }), rg.group),
    sw('sw-tracks', 'Include tracks', () => dataRec.tracksOn, v => { dataRec.tracksOn = v; store.set('tracks', v); }),
    el('p', { class: 'ctl-note', id: 'tracks-note' }));
  updateTracksNote();
  // The settings fold out under the capture bar they shape, and stay as left.
  const tog = $('#btn-cap-settings'), show = open => { host.hidden = !open; tog.setAttribute('aria-expanded', String(open)); };
  if (tog && !tog.dataset.wired) {
    tog.dataset.wired = '1';
    tog.addEventListener('click', () => { const open = host.hidden; show(open); store.set('capSettings', open); });
  }
  if (tog) show(!!store.get('capSettings', false));
  // A change of quality or labels shows at once on the clip button.
  host.addEventListener('click', () => syncLibraryCapture());
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
