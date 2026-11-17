/*
✒ Metadata
    - Title: Capture (digiSpace Edition - v2.19)
    - File Name: capture.js
    - Relative Path: js/shell/capture.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one timeline: captureStatus() words Record clip,
      Record data and Save state once (name, live line and tooltip) for the
      player bar's buttons and the stage's recording light, and syncCapture()
      writes them. The history keeps the times of the states saved in this
      run, and timelineMarks() gives them and the running recordings to the
      rewind track and the Telemetry plot alike. The Capture section of
      Settings is built here, and a preview started from it closes the
      dialog.
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for recordings shot like a film: a clip that starts hands
      the view to the director when its switch is on, and one that stops has
      it give the view back; init also wires the director's stage chip.
    - 2.16.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call after his tracks stopped at under half a run: tracks thin
      evenly when they fill, doubling their stride so they always reach the
      end; a recording keeps its start time, span, release and the lab's
      context; CSV text is quoted as RFC 4180 asks. Clips record a canvas of
      their own, fixed at the stage's size when they began and fed a scaled
      copy of the stage each frame, so a resize (the deck's charts, the
      window) no longer freezes them part way.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Rewind history, video clips, datasets with per-body tracks, and saved
    states for every lab, and the player bar's capture cluster that starts
    them: its one status wording, the timeline's marks, the stage's
    recording light and the Capture section of Settings.

✒ Key Features:
    - Rewind timeline that branches when you play from the past, marked
      with the running recordings and the states saved in this run.
    - WebM recording of the stage with an overlay and size readout.
    - CSV datasets with summaries; states restore exactly.
    - captureStatus() words Record clip, Record data and Save state once,
      for their buttons, the recording light and anything else that shows
      them.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { APP } from '../core/version.js';
import { $, clamp, el, store } from '../core/util.js';
import { view } from '../core/view.js';
import { labsById } from '../labs/index.js';
import { director, directorRec, directorSettings, directorState, init as initDirector } from './director.js';
import { updateDock } from './dock.js';
import { rebuild } from './lifecycle.js';

import { drawChart, radioGroup, syncPanel, updateReadouts } from './panel.js';
import { closeSettings } from './settings.js';
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
/* CSV as RFC 4180 writes it: numbers to ten significant figures, a missing value empty, and text quoted when it holds a
   comma, a quote or a line break. */
export function toCSV(cols, rows) {
  const text = v => { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const cell = v => (typeof v === 'number' ? (Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(10))) : '') : text(v));
  const out = [cols.join(',')];
  for (const r of rows) out.push(r.map(cell).join(','));
  return out.join('\n') + '\n';
}

/* ---------- rewind history ---------- */
/* marks holds the simulated times of the states saved in this run, in order, for as long as the history reaches them. */
export function hist(lab) { return lab.hist || (lab.hist = { snaps: [], pos: -1, cap: 480, marks: [] }); }
/* A recording that runs on through a rebuild or a loaded state starts its span again with the new history, which
   begins at the lab's time now: the old start lay in the future of the new timeline, so its span had vanished. */
export function histReset(lab) {
  lab.hist = { snaps: [], pos: -1, cap: 480, marks: [] };
  if (vrec.mr && vrec.lab === lab) vrec.from = lab.t;
  if (dataRec.on && dataRec.lab === lab) dataRec.meta.t0 = lab.t;
}
export function histCapture(lab, force) {
  if (!lab.snapshot) return;
  const H = hist(lab), last = H.snaps[H.snaps.length - 1];
  if (!force && last && lab.t - last.t < (lab.histInterval || 0.25) - 1e-9) return;
  const data = lab.snapshot();
  H.cap = clamp(Math.floor((lab.histBudget || 16e6) / Math.max(1, bytesOf(data))), 20, 600);
  H.snaps.push({ t: lab.t, data });
  if (H.snaps.length > H.cap) H.snaps.splice(0, H.snaps.length - H.cap);
  while (H.marks.length && H.marks[0] < H.snaps[0].t) H.marks.shift();
}
export function histBranch(lab) {
  const H = hist(lab);
  if (H.pos < 0) return;
  H.snaps.length = H.pos + 1; H.pos = -1;
  // States saved in the future just discarded are no longer this run's.
  while (H.marks.length && H.marks[H.marks.length - 1] > lab.t + 1e-9) H.marks.pop();
  updateRewind();
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
  // A clip that goes on recording through a rewind covers the replay too, so its mark reaches back with it.
  if (vrec.mr && vrec.lab === lab && lab.t < vrec.from) vrec.from = lab.t;
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
  const note = H.pos >= 0 ? 'Press Play to carry on from here, or Record clip first to record the replay.' : 'Drag back to replay recent history. Comma steps back.';
  if (rewindNote.textContent !== note) rewindNote.textContent = note;
  rewindEl.style.setProperty('--fill', n > 1 ? `${(+rewindEl.value / (n - 1)) * 100}%` : '100%');
  placeMarks(H, n);
}
/* ---------- the timeline's marks: what is recording, and the states saved in this run ---------- */
/* One record of them, read by the rewind track below and by Telemetry's plot (instruments.js), so the two places that
   rewind show the same marks: the simulated time each running recording began at (NaN while none runs), and the times
   of the states saved in this run that the history still reaches. Filled in place, so a redraw allocates nothing. */
const MARKS = { clip: NaN, run: NaN, states: [] };
export function timelineMarks(lab) {
  MARKS.clip = vrec.mr && vrec.lab === lab ? vrec.from : NaN;
  MARKS.run = dataRec.on && dataRec.lab === lab ? (dataRec.rows.length ? dataRec.rows[0][0] : dataRec.meta.t0) : NaN;
  MARKS.states = hist(lab).marks;
  return MARKS;
}
/* Where a moment falls along the rewind track, from 0 to 1: the track steps through snapshots, so the moment is placed
   between the two it falls between. */
function trackAt(H, t) {
  const S = H.snaps, n = S.length;
  if (t <= S[0].t) return 0;
  if (t >= S[n - 1].t) return 1;
  let a = 0, b = n - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (S[m].t <= t) a = m; else b = m; }
  return (a + (t - S[a].t) / Math.max(1e-12, S[b].t - S[a].t)) / (n - 1);
}
const tlMarks = $('#tl-marks'), tlClip = $('#tl-clip'), tlData = $('#tl-data'), ticks = [];
function placeSpan(node, H, n, t0) {
  const on = n > 1 && Number.isFinite(t0);
  if (node.hidden === on) node.hidden = !on;
  if (!on) return;
  const left = `${(trackAt(H, t0) * 100).toFixed(2)}%`;
  if (node.style.left !== left) node.style.left = left;
}
function placeMarks(H, n) {
  const M = timelineMarks(active);
  placeSpan(tlClip, H, n, M.clip); placeSpan(tlData, H, n, M.run);
  // A tick for each saved state, made as they come and kept for reuse.
  const k = n > 1 ? M.states.length : 0;
  while (ticks.length < k) { const i = el('i', { class: 'tl-tick' }); ticks.push(i); tlMarks.append(i); }
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i], on = i < k;
    if (tick.hidden === on) tick.hidden = !on;
    if (on) { const left = `${(trackAt(H, M.states[i]) * 100).toFixed(2)}%`; if (tick.style.left !== left) tick.style.left = left; }
  }
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
  if (!videoSupported()) { announce('Recording a clip is not supported in this browser.'); return; }
  const mime = pickMime();
  try {
    vrec.rc = recCanvas(); vrec.rctx = vrec.rc.getContext('2d', { alpha: false }); copyFrame();
    vrec.stream = vrec.rc.captureStream(60);
    vrec.mr = new MediaRecorder(vrec.stream, mime ? { mimeType: mime, videoBitsPerSecond: VQ[vrec.quality] || VQ.standard } : { videoBitsPerSecond: VQ.standard });
  } catch (e) { vrec.mr = null; announce('The browser refused to start a recording.'); return; }
  Object.assign(vrec, { chunks: [], bytes: 0, t0: performance.now(), lab: active, preset: active.presetId, simT0: active.t, from: active.t, mime: (vrec.mr.mimeType || mime || 'video/webm').split(';')[0] });
  vrec.mr.ondataavailable = e => {
    if (!e.data || !e.data.size) return;
    vrec.chunks.push(e.data); vrec.bytes += e.data.size;
    if (vrec.bytes >= VIDEO_CAP) { announce('The clip reached 512 MB, so the recording stopped.'); stopVideo(); }
  };
  vrec.mr.onstop = finishVideo;
  vrec.mr.start(1000);
  // With the Director on, the clip is filmed from this frame on.
  directorRec(true);
  updateCaptureUI(); announce('Recording a clip');
}
export function stopVideo() { if (vrec.mr && vrec.mr.state !== 'inactive') vrec.mr.stop(); }
/* The recording's own canvas, fixed at the size the stage had when recording began, in even pixels as encoders prefer.
   The stage is copied into it each frame, scaled to fit, with dark bars when its shape changes, so the encoder always
   sees one resolution. Recording the stage canvas itself froze the clip at the first resize (opening the deck's charts
   shortens the stage): a WebM stream cannot change size part way, so players held the last frame while the clock ran. */
function recCanvas() {
  const c = document.createElement('canvas');
  c.width = Math.max(2, canvas.width - (canvas.width % 2)); c.height = Math.max(2, canvas.height - (canvas.height % 2));
  return c;
}
function copyFrame() {
  const c = vrec.rc, g = vrec.rctx, sw = canvas.width, sh = canvas.height;
  if (!c || !sw || !sh) return;
  const k = Math.min(c.width / sw, c.height / sh), dw = Math.round(sw * k), dh = Math.round(sh * k);
  if (dw !== c.width || dh !== c.height) { g.fillStyle = THEME.ink || '#05070b'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(canvas, (c.width - dw) >> 1, (c.height - dh) >> 1, dw, dh);
}
export async function finishVideo() {
  const lab = vrec.lab, dur = (performance.now() - vrec.t0) / 1000, blob = new Blob(vrec.chunks, { type: vrec.mime }), size = vrec.rc ? [vrec.rc.width, vrec.rc.height] : [canvas.width, canvas.height];
  try { vrec.stream.getTracks().forEach(t => t.stop()); } catch (_) { /* already stopped */ }
  vrec.mr = null; vrec.chunks = []; vrec.rc = vrec.rctx = null; updateCaptureUI();
  // The director hands the camera back as it was before the clip.
  directorRec(false);
  if (!blob.size) { announce('The recording came out empty.'); return; }
  const ext = vrec.mime.includes('mp4') ? 'mp4' : 'webm', saved = vrec.preset;
  const { where } = await vault.add({ kind: 'clip', lab: lab.id, preset: saved, title: `${lab.name} · ${presetLabel(lab, saved)} clip`, duration: dur, simFrom: vrec.simT0, simTo: lab.t, width: size[0], height: size[1] },
    [{ name: `${baseName(lab, saved)}.${ext}`, type: vrec.mime, blob }]);
  announce(`Clip saved${where === 'session' ? ' for this session' : ''}: ${fmtDur(dur)}, ${fmtBytes(blob.size)}`);
}
export function toggleVideo() { vrec.mr ? stopVideo() : startVideo(); }
/* Each frame while recording: the label on the stage, when labels are on, then the stage into the recording's canvas. */
export function drawRecOverlay() {
  if (!vrec.mr) return;
  if (vrec.overlay) drawRecLabel();
  copyFrame();
}
function drawRecLabel() {
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
/* Tracks keep the whole run. When they reach trackCap rows, every other sample's rows are dropped and the stride
   doubles, so they thin evenly instead of stopping; the README says how far they were thinned. They had stopped at
   400,000 rows and said nothing, which cut a 17-body run at 60 Hz short at under half its length. */
export const dataRec = { on: false, lab: null, rows: [], tracks: [], next: 0, rate: store.get('dataRate', 10), tracksOn: store.get('tracks', true), meta: null, trackCap: 400000, trackStride: 1, trackK: 0 };
export function startData() {
  const lab = active;
  if (!lab.dataColumns || dataRec.on) return;
  Object.assign(dataRec, { on: true, lab, rows: [], tracks: [], next: lab.t, trackStride: 1, trackK: 0,
    meta: { preset: lab.presetId, params: { ...lab.p }, t0: lab.t, rate: dataRec.rate, startedAt: new Date().toISOString(), context: lab.dataContext ? jsonSafe(lab.dataContext()) : null } });
  sampleData(lab);
  updateCaptureUI(); announce('Recording data');
}
function thinTracks() {
  const out = [];
  let k = -1, last = NaN;
  for (const r of dataRec.tracks) { if (r[0] !== last) { last = r[0]; k++; } if (k % 2 === 0) out.push(r); }
  dataRec.tracks = out; dataRec.trackStride *= 2;
}
export function sampleData(lab) {
  if (lab.t + 1e-9 < dataRec.next) return;
  const period = 1 / dataRec.meta.rate;
  dataRec.next += period;
  if (dataRec.next <= lab.t) dataRec.next = lab.t + period;
  dataRec.rows.push(lab.dataRow());
  if (dataRec.tracksOn && lab.trackRows && dataRec.trackK++ % dataRec.trackStride === 0) {
    lab.trackRows(dataRec.tracks);
    if (dataRec.tracks.length >= dataRec.trackCap) thinTracks();
  }
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
  const dur = rows[rows.length - 1][0] - rows[0][0], tracks = dataRec.tracks.length, stride = dataRec.trackStride;
  // Samples land on solver steps, so a coarse step can deliver fewer than the rate asked for.
  const actual = dur > 0 ? Number(((rows.length - 1) / dur).toPrecision(3)) : rate;
  dataRec.rows = []; dataRec.tracks = [];
  const { where } = await vault.add({ kind: 'run', lab: lab.id, preset, title: `${lab.name} · ${presetLabel(lab, preset)} data`, duration: dur, rows: rows.length, columns: cols, rate: actual, rateAsked: rate,
    params: dataRec.meta.params, summary, trackRows: tracks, trackColumns: tracks ? lab.trackColumns : null, trackLabel: tracks ? lab.trackLabel : null, trackStride: tracks ? stride : null,
    // What a reader of the files needs that the rows do not say: when, over what span, from what release, among which bodies.
    startedAt: dataRec.meta.startedAt, t0: rows[0][0], t1: rows[rows.length - 1][0], app: APP.version, context: dataRec.meta.context,
    // Datasets keep the lab's own units, exactly as computed; the scale to real units travels with them.
    units: { native: (lab.units && lab.units.len) || 'px', metresPerUnit: lab.units ? lab.units.m : null, note: lab.scaleNote || null } }, files);
  announce(note || `Dataset saved${where === 'session' ? ' for this session' : ''}: ${rows.length} rows over ${fmtDur(dur)}${stride > 1 && tracks ? `, tracks every ${stride} samples to fit the whole run` : ''}`);
}
export function toggleData() { dataRec.on ? stopData() : startData(); }

/* ---------- saved states ---------- */
export async function saveState() {
  const lab = active;
  if (!lab.serialize) return;
  const H = hist(lab), t = lab.t;
  const obj = { app: 'physics-simulation-playground', version: '2.1.0', lab: lab.id, preset: lab.presetId, t: lab.t, built: lab.built, params: { ...lab.p }, state: lab.serialize(), savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(jsonSafe(obj))], { type: 'application/json' });
  const extra = lab.stateSummary ? lab.stateSummary() : {};
  const { where } = await vault.add({ kind: 'state', lab: lab.id, preset: lab.presetId, title: `${lab.name} · ${presetLabel(lab)} at t = ${lab.t.toFixed(1)} s`, t: lab.t, params: { ...lab.p }, ...extra },
    [{ name: `${baseName(lab)}-state.json`, type: 'application/json', blob }]);
  // Once the vault has it, the timeline marks the moment, in order among the others (unless the run was rebuilt
  // meanwhile), and the button confirms.
  if (lab.hist === H) { let i = H.marks.length; while (i && H.marks[i - 1] > t) i--; H.marks.splice(i, 0, t); if (lab === active) updateRewind(); }
  saved.at = performance.now(); syncCapture(); setTimeout(syncCapture, SAVED_MS + 100);
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

/* ---------- capture status: one wording for every place that shows it ---------- */
/* What each capture will do, or how far it has got: the player bar's buttons and the stage's recording light both read
   it from here. Each has its name (what a press does now), a short line under it, its tooltip, whether it is running,
   and why it cannot act, if it cannot. Written in place at panel rate. */
const SAVED_MS = 1600, saved = { at: -Infinity };
// The format a clip will take, asked of the browser once.
let format = '';
const TIP = {
  clip: ['Record the stage as a video clip (M)', 'Stop the clip and keep it in the Library (M)', 'Recording a clip needs MediaRecorder, which this browser does not offer'],
  run: ['Record this lab\'s measurements over time as a dataset (D)', 'Stop the dataset and keep it in the Library (D)', 'This lab has no measurements to record'],
  state: ['Save the exact state of this scene to load it again later', 'Saved: the state is in the Library', 'This lab cannot save its state'],
};
const tipOf = (k, s) => TIP[k][s.off ? 2 : s.on ? 1 : 0];
const clipFormat = () => format || (format = (pickMime() || 'video/webm').includes('mp4') ? 'MP4' : 'WebM');
export const capStatus = {
  clip: { name: 'Record clip', sub: '', tip: '', on: false, off: '' },
  run: { name: 'Record data', sub: '', tip: '', on: false, off: '' },
  state: { name: 'Save state', sub: '', tip: '', on: false, off: '' },
  rec: '', recKind: '',
};
export function captureStatus(lab = active) {
  const S = capStatus, { clip, run, state: st } = S, now = performance.now(), cols = lab && lab.dataColumns ? lab.dataColumns.length : 0;
  clip.on = !!vrec.mr; clip.off = videoSupported() ? '' : 'Not in this browser';
  clip.name = clip.on ? 'Stop clip' : 'Record clip';
  const took = clip.on ? `${fmtDur((now - vrec.t0) / 1000)} · ${fmtBytes(vrec.bytes)}` : '';
  clip.sub = clip.off || took || `${director.on ? 'Directed' : clipFormat()}, ${VQ[vrec.quality] ? vrec.quality : 'standard'}`;
  run.on = dataRec.on; run.off = cols ? '' : 'Not in this lab';
  run.name = run.on ? 'Stop data' : 'Record data';
  const rows = run.on ? `${dataRec.rows.length.toLocaleString()} rows` : '';
  run.sub = run.off || rows || `${cols} cols · ${dataRec.rate} Hz`;
  st.on = now - saved.at < SAVED_MS; st.off = lab && lab.serialize ? '' : 'Not in this lab';
  st.name = st.on ? 'Saved' : 'Save state';
  st.sub = st.off || (st.on ? 'In the Library' : 'This moment');
  clip.tip = tipOf('clip', clip); run.tip = tipOf('run', run); st.tip = tipOf('state', st);
  S.rec = took && rows ? `REC ${took} · ${rows}` : took || rows ? `REC ${took || rows}` : '';
  S.recKind = took ? 'clip' : rows ? 'run' : '';
  return S;
}

/* ---------- the capture cluster in the player bar, and the stage's recording light ---------- */
export const btnRec = $('#btn-rec'), btnData = $('#btn-data'), btnState = $('#btn-state'), hudRec = $('#hud-rec');
const lines = [[btnRec, 'clip', $('#btn-rec-label'), $('#btn-rec-sub')], [btnData, 'run', $('#btn-data-label'), $('#btn-data-sub')], [btnState, 'state', $('#btn-state-label'), $('#btn-state-sub')]];
/* Panel rate, and whenever a capture starts, stops or saves: each button's name and line, and the light on the stage.
   The light is status, not a control: the stop is the button that started it, in the player bar. */
export function syncCapture() {
  const S = captureStatus();
  for (const [b, k, name, sub] of lines) {
    const s = S[k];
    if (name.textContent !== s.name) name.textContent = s.name;
    if (sub.textContent !== s.sub) sub.textContent = s.sub;
    if (b.title !== s.tip) b.title = s.tip;
    if (k === 'state') b.classList.toggle('is-saved', s.on); else b.setAttribute('aria-pressed', String(s.on));
    if (b.disabled !== !!s.off) b.disabled = !!s.off;
  }
  hudRec.hidden = !S.rec;
  if (hudRec.textContent !== S.rec) hudRec.textContent = S.rec;
  if (hudRec.dataset.kind !== S.recKind) hudRec.dataset.kind = S.recKind;
}
/* A recording started or stopped: the buttons, the light and the timeline's marks follow at once. */
export function updateCaptureUI() { syncCapture(); updateRewind(); }

/* ---------- capture settings: the Capture section of Settings ---------- */
/* Clip quality and labels, the director, then the data's sample rate, its tracks and what a dataset holds. Built once
   at boot; the tracks switch and the columns follow the lab (updateCaptureSettings). */
const sw = (id, label, get, set) => {
  const b = el('button', { type: 'button', role: 'switch', class: 'switch', id }, el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })), el('span', { id: id + '-label', text: label }));
  const upd = () => b.setAttribute('aria-checked', String(!!get()));
  b.addEventListener('click', () => { set(!get()); upd(); }); upd();
  return b;
};
function buildCaptureSettings() {
  const host = $('#capture-settings');
  const qg = radioGroup('Clip quality', [['compact', 'Compact'], ['standard', 'Standard'], ['high', 'High']], () => vrec.quality, v => { vrec.quality = v; store.set('vq', v); }, 'vq');
  const rg = radioGroup('Data sample rate', [['5', '5 Hz'], ['10', '10 Hz'], ['30', '30 Hz'], ['60', '60 Hz']], () => String(dataRec.rate), v => { dataRec.rate = +v; store.set('dataRate', +v); }, 'rate');
  const dir = directorSettings();
  host.replaceChildren(
    el('h4', { class: 'sub set-sub', text: 'Clips' }),
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Clip quality' }), qg.group),
    sw('sw-overlay', 'Label clips with the lab, scene and time', () => vrec.overlay, v => { vrec.overlay = v; store.set('overlay', v); }),
    el('h4', { class: 'sub set-sub', text: 'Director' }), dir,
    el('h4', { class: 'sub set-sub', text: 'Data' }),
    el('div', { class: 'seg-wrap' }, el('span', { class: 'seg-label', text: 'Data sample rate (simulated time)' }), rg.group),
    sw('sw-tracks', 'Include tracks', () => dataRec.tracksOn, v => { dataRec.tracksOn = v; store.set('tracks', v); }),
    el('p', { class: 'ctl-note', id: 'tracks-note' }),
    el('details', { class: 'cap-cols', id: 'cap-cols' }, el('summary', { id: 'cap-cols-sum' }), el('div', { class: 'cap-chips', id: 'cap-chips' })));
  // A preview is for watching the stage, so the dialog steps aside for it; the director's chip on the stage ends it.
  $('#btn-dir-preview', dir).addEventListener('click', () => { if (directorState().why === 'preview') closeSettings(); });
  // A change of quality, rate or director shows at once on the buttons' lines.
  host.addEventListener('click', () => syncCapture());
}
/* Per lab: whether it keeps tracks, and the columns a dataset of it holds. */
let colsOf = null;
export function updateCaptureSettings() {
  const n = $('#tracks-note'), swT = $('#sw-tracks'), lbl = $('#sw-tracks-label'); if (!n || !active) return;
  const has = !!active.trackRows;
  swT.disabled = !has;
  lbl.textContent = has ? `Include ${active.trackLabel.toLowerCase()}` : 'Include tracks';
  n.textContent = has ? 'Saved as a second CSV beside the dataset.' : `${active.name} records summary measurements only.`;
  if (colsOf === active) return;
  colsOf = active;
  const cols = active.dataColumns || [];
  $('#cap-cols').hidden = !cols.length;
  $('#cap-cols-sum').textContent = `What a dataset from ${active.name} holds: ${cols.length} columns`;
  $('#cap-chips').replaceChildren(...cols.map(c => el('code', { text: c })));
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  rewindEl.addEventListener('input', () => histSeek(active, +rewindEl.value));
  btnRec.addEventListener('click', toggleVideo);
  btnData.addEventListener('click', toggleData);
  btnState.addEventListener('click', saveState);
  initDirector();
  buildCaptureSettings();
}
