/*
✒ Metadata
    - Title: Vault (digiSpace Edition - v2.0)
    - File Name: vault.js
    - Relative Path: js/shell/vault.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file; v2.0 flags the Library tab when something new
      is saved.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Storage behind the Library: artifact storage when the page runs as an
    artifact, IndexedDB otherwise, memory as a last resort.

✒ Key Features:
    - Saves clips, datasets and states with metadata and usage figures.
    - Reports its mode honestly (synced, read-only, browser, session).
    - Marks the Library tab when a capture lands while another tab is open.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { jsonSafe, newId } from './capture.js';
import { noteNewItem, renderLibrary } from './library.js';
import { announce } from './state.js';

/* ---------- storage: artifact (db + assets), browser (IndexedDB), or session ---------- */
export function idbOpen() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no indexedDB')); return; }
    const r = indexedDB.open('physics-playground', 1);
    r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('meta', { keyPath: 'id' }); db.createObjectStore('blob'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
  });
}
export function idbTx(db, stores, mode, fn) {
  return new Promise((res, rej) => {
    const tx = db.transaction(stores, mode); let out;
    const q = fn(tx); if (q) q.onsuccess = () => { out = q.result; };
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
export const vault = {
  mode: 'memory', stored: [], session: [], pending: [], mem: new Map(), urls: new Map(),
  db: null, assets: null, dl: null, idb: null, stale: false, usage: null, err: null,
  list() { return [...this.pending, ...this.session, ...this.stored].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); },
  async init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      this.mode = 'connecting'; renderLibrary();
      const get = n => Promise.resolve().then(() => c.use(n)).catch(() => null);
      [this.db, this.assets, this.dl] = await Promise.all([get('db'), get('assets'), get('downloads')]);
      if (this.db) { this.mode = this.assets ? 'cloud' : 'cloud-ro'; this.subscribe(); this.refreshUsage(); }
      else this.mode = 'memory';
    } else {
      try { this.idb = await idbOpen(); this.stored = (await idbTx(this.idb, 'meta', 'readonly', tx => tx.objectStore('meta').getAll())) || []; this.mode = 'local'; }
      catch (_) { this.mode = 'memory'; }
    }
    renderLibrary();
  },
  subscribe() {
    const timer = setTimeout(() => { this.stale = true; renderLibrary(); }, 10000);
    try {
      this.db.collection('vault').orderBy('createdAt', 'desc').limit(300).onSnapshot(snap => {
        if (!snap.metadata.fromCache) { clearTimeout(timer); this.stale = false; }
        this.stored = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        renderLibrary();
      }, err => { clearTimeout(timer); this.err = err && err.code; renderLibrary(); });
    } catch (e) { clearTimeout(timer); this.err = 'unavailable'; }
  },
  async refreshUsage() {
    if (!this.assets) return;
    try { this.usage = (await this.assets.list()).usage; } catch (_) { this.usage = null; }
    renderLibrary();
  },
  async add(meta, files) {
    const item = { id: newId(), createdAt: new Date().toISOString(), sizeBytes: files.reduce((a, f) => a + f.blob.size, 0), files: files.map(f => ({ name: f.name, type: f.type, size: f.blob.size })), ...meta };
    files.forEach((f, i) => this.mem.set(item.id + ':' + i, f.blob));
    const ph = { ...item, saving: true };
    this.pending.push(ph); noteNewItem(); renderLibrary();
    let where = 'session';
    try {
      if (this.mode === 'cloud') {
        for (let i = 0; i < files.length; i++) { const r = await this.assets.upload(files[i].blob, { type: files[i].type }); item.files[i].assetId = r.id; }
        await this.db.collection('vault').doc(item.id).set(jsonSafe(item));
        where = 'artifact'; this.refreshUsage();
      } else if (this.mode === 'local') {
        await idbTx(this.idb, ['meta', 'blob'], 'readwrite', tx => { tx.objectStore('meta').put(jsonSafe(item)); files.forEach((f, i) => tx.objectStore('blob').put(f.blob, item.id + ':' + i)); });
        this.stored.unshift(jsonSafe(item)); where = 'browser';
      } else { item.localOnly = true; this.session.unshift(item); }
    } catch (e) {
      const code = e && e.code;
      item.localOnly = true;
      item.note = code === 'too_large' ? 'Over the 20 MB artifact limit: kept for this session only. Save it to your computer.' : code === 'quota_or_state' || code === 'quota_exceeded' ? 'Artifact storage is full: kept for this session only.' : 'Could not store it: kept for this session only.';
      this.session.unshift(item);
    }
    this.pending = this.pending.filter(p => p !== ph);
    renderLibrary();
    return { item, where };
  },
  async blob(item, i) {
    const key = item.id + ':' + i;
    if (this.mem.has(key)) return this.mem.get(key);
    let b = null;
    if (this.mode === 'local' && !item.localOnly) b = await idbTx(this.idb, 'blob', 'readonly', tx => tx.objectStore('blob').get(key));
    else if (item.files[i] && item.files[i].assetId) { const r = await fetch('/_blob/' + item.files[i].assetId); if (r.ok) b = await r.blob(); }
    if (b) this.mem.set(key, b);
    return b;
  },
  async src(item, i) {
    const f = item.files[i];
    if (f && f.assetId && !this.mem.has(item.id + ':' + i)) return '/_blob/' + f.assetId;
    const key = item.id + ':' + i;
    if (this.urls.has(key)) return this.urls.get(key);
    const b = await this.blob(item, i); if (!b) return null;
    const u = URL.createObjectURL(b); this.urls.set(key, u); return u;
  },
  async remove(item) {
    if (!item.localOnly) {
      if (this.mode === 'cloud') {
        await this.db.collection('vault').doc(item.id).delete();
        for (const f of item.files) if (f.assetId) await this.assets.delete(f.assetId).catch(() => null);
        this.refreshUsage();
      } else if (this.mode === 'local') {
        await idbTx(this.idb, ['meta', 'blob'], 'readwrite', tx => { tx.objectStore('meta').delete(item.id); item.files.forEach((_, i) => tx.objectStore('blob').delete(item.id + ':' + i)); });
        this.stored = this.stored.filter(s => s.id !== item.id);
      }
    }
    this.session = this.session.filter(s => s.id !== item.id);
    item.files.forEach((_, i) => { const k = item.id + ':' + i; this.mem.delete(k); if (this.urls.has(k)) { URL.revokeObjectURL(this.urls.get(k)); this.urls.delete(k); } });
    renderLibrary();
  },
  async rename(item, title) {
    item.title = title;
    if (!item.localOnly) {
      if (this.mode === 'cloud') await this.db.collection('vault').doc(item.id).update({ title });
      else if (this.mode === 'local') { const rec = this.stored.find(s => s.id === item.id); if (rec) { rec.title = title; await idbTx(this.idb, 'meta', 'readwrite', tx => tx.objectStore('meta').put(jsonSafe(rec))); } }
    }
    renderLibrary();
  },
  canDownload() { return !!this.dl || !(window.claude && typeof window.claude.use === 'function'); },
  async download(name, blob) {
    if (this.dl) {
      try { await this.dl.save({ filename: name, data: blob }); return true; }
      catch (e) { if (!e || e.code !== 'declined') announce(e && e.code === 'rate_limited' ? 'Another save prompt is open; try again in a moment.' : 'This view cannot save files.'); return false; }
    }
    if (window.claude && typeof window.claude.use === 'function') { announce('Saving files is not available in this view.'); return false; }
    const a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
    return true;
  },
};
