/*
✒ Metadata
    - Title: Capture (digiSpace Edition - v2.3)
    - File Name: capture.js
    - Relative Path: js/shell/capture.js
    - Artifact Type: javascript
    - Version: 2.3.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Loading a
      saved state rebuilds fresh before the state is restored.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Datasets
      stay one timeline across a rewind and name their own scene; saved
      states carry their world size; clips stop at 512 MB.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Rewind history, video clips, datasets with per-body tracks, and saved
    states for every lab.

✒ Key Features:
    - Rewind timeline that branches when you play from the past.
    - WebM recording of the stage with an overlay and size readout.
    - CSV datasets with summaries; states restore exactly.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { $, clamp, store } from '../core/util.js';
import { view } from '../core/view.js';
import { labsById } from '../labs/index.js';
import { updateDock } from './dock.js';
import { rebuild } from './lifecycle.js';

import { drawChart, syncPanel, updateReadouts } from './panel.js';
import { active, announce, canvas, ctx, state } from './state.js';
import { updatePlay } from './transport.js';
import { vault } from './vault.js';
import { selectLab, updateStageTitle } from './workspace.js';

/* ================================================================== */
/*  Capture: rewind history, video, datasets, saved states, library    */
/* ================================================================== */
export const presetLabel = (lab, id = lab.presetId) => { const p = lab.presets.find(x => x.id === id); return p ? p.label : id; };
export const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`; };
export const baseName = (lab, preset = lab.presetId) => `physics-${lab.id}-${preset}-${stamp()}`;
export const fmtBytes = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' kB' : b + ' B';
export const fmtDur = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m ? `${m}:${String(Math.floor(r)).padStart(2, '0')}` : `${r.toFixed(1)} s`; };
export const fmtWhen = iso => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; } };
export const newId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
export const jsonSafe = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)));
export function bytesOf(o) {
  if (!o) return 0;
  if (ArrayBuffer.isView(o)) return o.byteLength;
  if (Array.isArray(o)) return o.reduce((a, v) => a + bytesOf(v), 8 * o.length);
  if (typeof o === 'object') { let s = 16; for (const [k, v] of Object.entries(o)) if (k !== 'shared') s += bytesOf(v); return s; }
  return 8;
}
export function toCSV(cols, rows) {
  const cell = v => (typeof v === 'number' ? (Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(10))) : '') : String(v ?? ''));
  const out = [cols.join(',')];
  for (const r of rows) out.push(r.map(cell).join(','));
  return out.join('\n') + '\n';
}

/* ---------- rewind history ---------- */
export function hist(lab) { return lab.hist || (lab.hist = { snaps: [], pos: -1, cap: 480 }); }
export function histReset(lab) { lab.hist = { snaps: [], pos: -1, cap: 480 }; }
export function histCapture(lab, force) {
  if (!lab.snapshot) return;
  const H = hist(lab), last = H.snaps[H.snaps.length - 1];
  if (!force && last && lab.t - last.t < (lab.histInterval || 0.25) - 1e-9) return;
  const data = lab.snapshot();
  H.cap = clamp(Math.floor((lab.histBudget || 16e6) / Math.max(1, bytesOf(data))), 20, 600);
  H.snaps.push({ t: lab.t, data });
  if (H.snaps.length > H.cap) H.snaps.splice(0, H.snaps.length - H.cap);
}
export function histBranch(lab) {
  const H = hist(lab);
  if (H.pos < 0) return;
  H.snaps.length = H.pos + 1; H.pos = -1; updateRewind();
  // The discarded future leaves a running dataset too, so the CSV stays one continuous timeline.
  if (dataRec.on && dataRec.lab === lab) {
    const kept = r => r[0] <= lab.t + 1e-9;
    dataRec.rows = dataRec.rows.filter(kept); dataRec.tracks = dataRec.tracks.filter(kept);
    dataRec.next = lab.t + 1 / dataRec.meta.rate;
  }
}
export function histSeek(lab, k) {
  const H = hist(lab);
  if (H.snaps.length < 2) return;
  k = clamp(Math.round(k), 0, H.snaps.length - 1);
  if (state.running) { state.running = false; updatePlay(); }
  const s = H.snaps[k];
  lab.t = s.t; lab._acc = 0;
  if (lab.restore(s.data) === false) { announce('That moment cannot be restored at the current stage size.'); return; }
  H.pos = k;
  // A snapshot brings back the parameters its physics ran under, so the panel follows it.
  syncPanel(); updateRewind(); updateReadouts(); drawChart();
}
export const rewindEl = $('#rewind-range'), rewindOut = $('#rewind-out'), rewindNote = $('#rewind-note');
export function updateRewind() {
  if (!active) return;
  const H = hist(active), n = H.snaps.length;
  rewindEl.disabled = n < 2;
  rewindEl.max = String(Math.max(0, n - 1));
  let txt;
  if (H.pos >= 0) { rewindEl.value = String(H.pos); txt = `t = ${H.snaps[H.pos].t.toFixed(1)} s · ${(H.snaps[n - 1].t - H.snaps[H.pos].t).toFixed(1)} s back`; }
  else { rewindEl.value = rewindEl.max; txt = n > 1 ? `live · last ${(H.snaps[n - 1].t - H.snaps[0].t).toFixed(0)} s kept` : 'live'; }
  rewindOut.textContent = txt; rewindEl.setAttribute('aria-valuetext', txt);
  const note = H.pos >= 0 ? 'Press Play to carry on from here, or Video first to record the replay.' : 'Drag back to replay recent history. Comma steps back.';
  if (rewindNote.textContent !== note) rewindNote.textContent = note;
  rewindEl.style.setProperty('--fill', n > 1 ? `${(+rewindEl.value / (n - 1)) * 100}%` : '100%');
}
export function rewindStep(dir) {
  const H = hist(active); if (H.snaps.length < 2) return;
  const cur = H.pos >= 0 ? H.pos : H.snaps.length - 1;
  histSeek(active, cur + dir);
}

/* ---------- video recorder ---------- */
export const VQ = { compact: 3e6, standard: 6e6, high: 12e6 }, VIDEO_CAP = 512 * 1048576;
export const vrec = { mr: null, stream: null, chunks: [], bytes: 0, t0: 0, mime: '', lab: null, quality: store.get('vq', 'standard'), overlay: store.get('overlay', true) };
export const videoSupported = () => !!(window.MediaRecorder && canvas.captureStream);
export function pickMime() {
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4']) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) { /* keep looking */ }
  }
  return '';
}
export function startVideo() {
  if (vrec.mr) return;
  if (!videoSupported()) { announce('Video recording is not supported in this browser.'); return; }
  const mime = pickMime();
  try {
    vrec.stream = canvas.captureStream(60);
    vrec.mr = new MediaRecorder(vrec.stream, mime ? { mimeType: mime, videoBitsPerSecond: VQ[vrec.quality] || VQ.standard } : { videoBitsPerSecond: VQ.standard });
  } catch (e) { vrec.mr = null; announce('The browser refused to start a recording.'); return; }
  Object.assign(vrec, { chunks: [], bytes: 0, t0: performance.now(), lab: active, preset: active.presetId, simT0: active.t, mime: (vrec.mr.mimeType || mime || 'video/webm').split(';')[0] });
  vrec.mr.ondataavailable = e => {
    if (!e.data || !e.data.size) return;
    vrec.chunks.push(e.data); vrec.bytes += e.data.size;
    if (vrec.bytes >= VIDEO_CAP) { announce('The clip reached 512 MB, so the recording stopped.'); stopVideo(); }
  };
  vrec.mr.onstop = finishVideo;
  vrec.mr.start(1000);
  updateCaptureUI(); announce('Recording video');
}
export function stopVideo() { if (vrec.mr && vrec.mr.state !== 'inactive') vrec.mr.stop(); }
export async function finishVideo() {
  const lab = vrec.lab, dur = (performance.now() - vrec.t0) / 1000, blob = new Blob(vrec.chunks, { type: vrec.mime });
  try { vrec.stream.getTracks().forEach(t => t.stop()); } catch (_) { /* already stopped */ }
  vrec.mr = null; vrec.chunks = []; updateCaptureUI();
  if (!blob.size) { announce('The recording came out empty.'); return; }
  const ext = vrec.mime.includes('mp4') ? 'mp4' : 'webm', saved = vrec.preset;
  const { where } = await vault.add({ kind: 'clip', lab: lab.id, preset: saved, title: `${lab.name} · ${presetLabel(lab, saved)} clip`, duration: dur, simFrom: vrec.simT0, simTo: lab.t, width: canvas.width, height: canvas.height },
    [{ name: `${baseName(lab, saved)}.${ext}`, type: vrec.mime, blob }]);
  announce(`Clip saved${where === 'session' ? ' for this session' : ''}: ${fmtDur(dur)}, ${fmtBytes(blob.size)}`);
}
export function toggleVideo() { vrec.mr ? stopVideo() : startVideo(); }
export function drawRecOverlay() {
  if (!vrec.mr || !vrec.overlay) return;
  const lab = active, sp = state.speed !== 1 ? ` · ${state.speed.toFixed(2)}× speed` : '';
  const text = `${lab.name} · ${presetLabel(lab)} · t = ${lab.t.toFixed(2)} s${sp}`;
  ctx.save();
  ctx.font = `500 13px ${THEME.mono}`;
  const tw = ctx.measureText(text).width, x = view.w - tw - 26, y = view.h - 18;
  ctx.fillStyle = 'rgba(10,14,20,0.72)'; ctx.fillRect(x - 10, y - 17, tw + 20, 26);
  ctx.fillStyle = THEME.amber; ctx.fillRect(x - 10, y - 17, 3, 26);
  ctx.fillStyle = THEME.text; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---------- dataset recorder ---------- */
export const dataRec = { on: false, lab: null, rows: [], tracks: [], next: 0, rate: store.get('dataRate', 10), tracksOn: store.get('tracks', true), meta: null };
export function startData() {
  const lab = active;
  if (!lab.dataColumns || dataRec.on) return;
  Object.assign(dataRec, { on: true, lab, rows: [], tracks: [], next: lab.t, meta: { preset: lab.presetId, params: { ...lab.p }, t0: lab.t, rate: dataRec.rate } });
  sampleData(lab);
  updateCaptureUI(); announce('Recording data');
}
export function sampleData(lab) {
  if (lab.t + 1e-9 < dataRec.next) return;
  const period = 1 / dataRec.meta.rate;
  dataRec.next += period;
  if (dataRec.next <= lab.t) dataRec.next = lab.t + period;
  dataRec.rows.push(lab.dataRow());
  if (dataRec.tracksOn && lab.trackRows && dataRec.tracks.length < 400000) lab.trackRows(dataRec.tracks);
  if (dataRec.rows.length >= 200000) stopData('The dataset reached 200,000 rows and was saved.');
}
export async function stopData(note) {
  if (!dataRec.on) return;
  dataRec.on = false; updateCaptureUI();
  const lab = dataRec.lab, rows = dataRec.rows, cols = lab.dataColumns, { preset, rate } = dataRec.meta;
  if (rows.length < 2) { announce('Not enough samples to save a dataset.'); return; }
  const base = baseName(lab, preset), files = [{ name: `${base}.csv`, type: 'text/csv', blob: new Blob([toCSV(cols, rows)], { type: 'text/csv' }) }];
  if (dataRec.tracks.length) files.push({ name: `${base}-tracks.csv`, type: 'text/csv', blob: new Blob([toCSV(lab.trackColumns, dataRec.tracks)], { type: 'text/csv' }) });
  const summary = cols.map((c, j) => {
    let lo = Infinity, hi = -Infinity, sum = 0, k = 0;
    for (const r of rows) { const v = r[j]; if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; sum += v; k++; } }
    return { column: c, min: k ? lo : null, max: k ? hi : null, mean: k ? sum / k : null };
  });
  const dur = rows[rows.length - 1][0] - rows[0][0], tracks = dataRec.tracks.length;
  // Samples land on solver steps, so a coarse step can deliver fewer than the rate asked for.
  const actual = dur > 0 ? Number(((rows.length - 1) / dur).toPrecision(3)) : rate;
  dataRec.rows = []; dataRec.tracks = [];
  const { where } = await vault.add({ kind: 'run', lab: lab.id, preset, title: `${lab.name} · ${presetLabel(lab, preset)} data`, duration: dur, rows: rows.length, columns: cols, rate: actual, rateAsked: rate,
    params: dataRec.meta.params, summary, trackRows: tracks, trackColumns: tracks ? lab.trackColumns : null, trackLabel: tracks ? lab.trackLabel : null }, files);
  announce(note || `Dataset saved${where === 'session' ? ' for this session' : ''}: ${rows.length} rows over ${fmtDur(dur)}`);
}
export function toggleData() { dataRec.on ? stopData() : startData(); }

/* ---------- saved states ---------- */
export async function saveState() {
  const lab = active;
  if (!lab.serialize) return;
  const obj = { app: 'physics-simulation-playground', version: '2.1.0', lab: lab.id, preset: lab.presetId, t: lab.t, built: lab.built, params: { ...lab.p }, state: lab.serialize(), savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(jsonSafe(obj))], { type: 'application/json' });
  const extra = lab.stateSummary ? lab.stateSummary() : {};
  const { where } = await vault.add({ kind: 'state', lab: lab.id, preset: lab.presetId, title: `${lab.name} · ${presetLabel(lab)} at t = ${lab.t.toFixed(1)} s`, t: lab.t, params: { ...lab.p }, ...extra },
    [{ name: `${baseName(lab)}-state.json`, type: 'application/json', blob }]);
  announce(`State saved${where === 'session' ? ' for this session' : ''}`);
}
export async function loadState(item) {
  try {
    const blob = await vault.blob(item, 0);
    if (!blob) { announce('That saved state could not be read.'); return; }
    const obj = JSON.parse(await blob.text()), lab = labsById[obj.lab];
    if (!lab || !lab.deserialize) { announce('That saved state belongs to an unknown lab.'); return; }
    if (dataRec.on) await stopData();
    selectLab(lab.id);
    if (lab.presets.some(p => p.id === obj.preset)) lab.presetId = obj.preset;
    Object.assign(lab.p, obj.params || {});
    lab.sceneP = { ...lab.p };
    rebuild(lab, obj.built, { fresh: true });
    const ok = lab.deserialize(obj.state);
    if (ok) lab.t = +obj.t || 0;
    histReset(lab); histCapture(lab, true);
    if (state.running) { state.running = false; updatePlay(); }
    syncPanel(); updateStageTitle(lab); updateDock(true); updateRewind(); updateReadouts(); drawChart();
    announce(ok ? `Loaded “${item.title}”. Press Play to continue.` : 'Settings restored, but the saved positions do not fit the current stage size.');
  } catch (e) { announce('That saved state could not be loaded.'); }
}

/* ---------- capture controls ---------- */
export const btnRec = $('#btn-rec'), btnData = $('#btn-data'), btnState = $('#btn-state'), hudRec = $('#hud-rec'), hudData = $('#hud-data');
export function updateCaptureUI() {
  const v = !!vrec.mr, d = dataRec.on;
  btnRec.setAttribute('aria-pressed', String(v)); $('#btn-rec-label').textContent = v ? 'Stop video' : 'Video';
  btnData.setAttribute('aria-pressed', String(d)); $('#btn-data-label').textContent = d ? 'Stop data' : 'Data';
  hudRec.hidden = !v; hudData.hidden = !d;
  if (!videoSupported()) { btnRec.disabled = true; btnRec.title = 'Video recording needs MediaRecorder, which this browser does not offer.'; }
  updateCaptureChips();
}
export function updateCaptureChips() {
  if (vrec.mr) { hudRec.textContent = `REC ${fmtDur((performance.now() - vrec.t0) / 1000)} · ${fmtBytes(vrec.bytes)}`; hudRec.setAttribute('aria-label', 'Stop video recording'); }
  if (dataRec.on) { hudData.textContent = `DATA ${dataRec.rows.length.toLocaleString()} rows`; hudData.setAttribute('aria-label', 'Stop data recording'); }
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  rewindEl.addEventListener('input', () => histSeek(active, +rewindEl.value));
  btnRec.addEventListener('click', toggleVideo);
  btnData.addEventListener('click', toggleData);
  btnState.addEventListener('click', saveState);
  hudRec.addEventListener('click', stopVideo);
  hudData.addEventListener('click', () => stopData());
}
