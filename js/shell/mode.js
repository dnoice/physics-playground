/*
✒ Metadata
    - Title: View Mode and Graphics Tiers (digiSpace Edition - v2.1)
    - File Name: mode.js
    - Relative Path: js/shell/mode.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created:
      one global 2D or 3D mode and a graphics tier ladder, on Dennis's call
      for two modes and a tier system.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Owns the workspace's two modes. 2D is the flat view of every lab; 3D is
    the rendered world. This module loads the engine on demand, composites a
    frame into the stage, picks and adapts the graphics tier, and falls back
    to 2D with the reason on screen if 3D cannot run.

✒ Key Features:
    - 2D and 3D switch in the top bar, key Z, remembered between visits.
    - Graphics menu: Auto plus five named tiers, with the detected device and
      what the active tier costs.
    - Auto steps down when frames run long and back up when there is room; a
      step that buys nothing is undone and adapting stops, because the limit
      is then the solver or the display, not the GPU.
    - A lost WebGL context drops to 2D until it returns; a scene that throws
      sends only its own lab back to 2D.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports; the engine loads
      three.js on first use
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { TIERS, probeDevice, tierById, tierStep } from '../core/tiers.js';
import { $, el, reduceMotion, store } from '../core/util.js';
import { view } from '../core/view.js';
import { sticky } from './diagnostics.js';
import { updateDock } from './dock.js';
import { updateNav } from './navigator.js';
import { refreshEnabled } from './panel.js';
import { cancelLabPointer } from './stage.js';
import { active, announce, canvas, stageEl } from './state.js';

export const world = {
  mode: store.get('mode', '3d') === '2d' ? '2d' : '3d',
  pick: store.get('tier', 'auto'), autoTier: null, device: null,
  engine: null, loading: null, fail: null, lost: false, broken: new Set(),
};
const tierNow = () => tierById(world.pick) || tierById(world.autoTier) || tierById(world.device.suggest) || TIERS[TIERS.length - 1];
export const in3D = lab => world.mode === '3d' && !!world.engine && !world.lost && !world.broken.has(lab.id) && world.engine.ready(lab.id);

/* ---------- engine ---------- */
function failWorld(msg) {
  world.fail = msg; world.mode = '2d';
  announce(msg);
  sticky({ id: 'world-off', level: 'info', title: '3D mode is unavailable', body: msg }, 14);
  renderMode();
}
export function ensureEngine() {
  if (world.engine || world.loading || world.fail) return;
  if (!world.device.webgl2) { failWorld('This browser did not provide WebGL 2, so the playground stays in 2D.'); return; }
  world.loading = import('../render/world/engine.js').then(m => {
    world.engine = m.createEngine(tierNow());
    world.engine.onContext(contextLost, contextRestored);
    world.loading = null;
    if (active) prepareLab(active);
  }).catch(err => {
    world.loading = null;
    console.warn('3D engine failed to load', err);
    failWorld('The 3D mode could not load its library (three.js from the jsDelivr CDN), so the playground stays in 2D.');
  });
}
/* Called when a lab is shown: its scene module loads the first time it is needed. */
export function prepareLab(lab) {
  if (world.mode !== '3d') return;
  if (!world.engine) { ensureEngine(); return; }
  world.engine.prepare(lab.id).then(ok => { if (ok && lab === active) renderMode(); })
    .catch(err => { console.warn('3D scene failed to load', err); breakScene(lab, 'Its 3D scene could not load'); });
}
function breakScene(lab, why) {
  world.broken.add(lab.id);
  sticky({ id: 'world-scene', level: 'warn', title: `${lab.name} is back in 2D`, body: `${why}, so this lab is showing its flat view. The other labs are unaffected.` }, 14);
  if (lab === active) renderMode();
}
function contextLost() {
  world.lost = true;
  announce('The 3D renderer lost its graphics context, so the stage is in 2D until it returns.');
  sticky({ id: 'world-lost', level: 'warn', title: 'Graphics context lost', body: 'The browser took the GPU away from the 3D renderer. The stage shows the flat view until it comes back, and nothing in the simulation was lost.' }, 12);
  renderMode();
}
function contextRestored() { world.lost = false; announce('3D renderer restored'); renderMode(); }

/* ---------- one frame ---------- */
let lastDraw = 0;
export function drawWorld(lab, g, w, h) {
  const now = performance.now(), dt = Math.min(0.1, (now - lastDraw) / 1000);
  lastDraw = now;
  lab.view3 = lab.camMatrices(w, h);
  try {
    if (!world.engine.render(lab, lab.view3, w, h, view.dpr, dt)) return;
  } catch (err) { console.warn('3D scene failed', err); breakScene(lab, 'Its 3D scene stopped with an error'); return; }
  g.drawImage(world.engine.canvas, 0, 0, w, h);
  if (lab.overlay3) lab.overlay3(g, w, h);
}

/* ---------- automatic tier ---------- */
const AUTO = { WINDOW: 3, SLOW_MS: 25, FAST_MS: 17.6, FAST_WINDOWS: 4, SETTLE: 0.08 };
const auto = { ms: 16, clock: 0, fast: 0, from: null, before: 0, ceil: null, settled: false };
function resetAuto() { Object.assign(auto, { clock: 0, fast: 0, from: null, before: 0, settled: false }); }
function setAutoTier(id, why) {
  world.autoTier = id;
  if (world.engine) world.engine.setTier(tierNow());
  renderGfx();
  announce(why);
  if (active) sticky({ id: 'gfx-auto', level: 'info', title: `Graphics tier is now ${tierById(id).label}`, body: `${why} Pick a fixed tier in the Graphics menu to stop this.` }, 8);
}
/* From the frame loop: raw is the true frame gap in seconds. */
export function tickWorld(raw) {
  if (!active || !in3D(active) || world.pick !== 'auto' || auto.settled || raw <= 0 || raw > 0.5 || document.hidden) return;
  auto.ms += (raw * 1000 - auto.ms) * AUTO.SETTLE;
  if ((auto.clock += raw) < AUTO.WINDOW) return;
  auto.clock = 0;
  const cur = tierNow().id;
  // The last step down bought nothing, so the GPU is not the limit: undo it and stop adapting.
  if (auto.from) {
    const from = auto.from;
    auto.from = null;
    if (auto.ms > auto.before * 0.92) { auto.settled = true; setAutoTier(from, 'Lowering the graphics tier did not help here, so it went back.'); return; }
  }
  if (auto.ms > AUTO.SLOW_MS) {
    const down = tierStep(cur, 1);
    auto.fast = 0;
    if (!down) { auto.settled = true; return; }
    auto.ceil = auto.ceil === null ? null : down;
    Object.assign(auto, { from: cur, before: auto.ms });
    setAutoTier(down, `Frames were taking ${auto.ms.toFixed(0)} ms, so the graphics tier was lowered.`);
    return;
  }
  auto.fast = auto.ms < AUTO.FAST_MS ? auto.fast + 1 : 0;
  if (auto.fast < AUTO.FAST_WINDOWS) return;
  auto.fast = 0;
  const up = tierStep(cur, -1);
  if (!up || up === auto.ceil) { auto.settled = true; return; }
  auto.ceil = cur === auto.ceil ? cur : up;
  setAutoTier(up, 'There is headroom, so the graphics tier was raised.');
}

/* ---------- switches ---------- */
export function setMode(m) {
  if (m === '3d' && world.fail) { announce(world.fail); return; }
  if (m === world.mode) return;
  cancelLabPointer();
  world.mode = m; store.set('mode', m);
  resetAuto();
  if (m === '3d' && active) prepareLab(active);
  renderMode();
  if (!reduceMotion && canvas.animate) canvas.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  announce(m === '3d' ? '3D mode' : '2D mode');
}
export const toggleMode = () => setMode(world.mode === '3d' ? '2d' : '3d');
export function pickTier(id) {
  world.pick = id; store.set('tier', id);
  world.autoTier = null; auto.ceil = null;
  resetAuto();
  if (world.engine) world.engine.setTier(tierNow());
  renderGfx();
  announce(`Graphics: ${gfxLabel()}`);
}
/* A cheaper fixed tier to offer from diagnostics, or null at the bottom. */
export const cheaperTier = () => (world.pick === 'auto' ? null : tierStep(tierNow().id, 1));

/* ---------- top bar ---------- */
const gfxLabel = () => (world.pick === 'auto' ? `Auto · ${tierNow().label}` : tierNow().label);
export function renderMode() {
  const three = world.mode === '3d';
  for (const [id, on] of [['#mode-2d', !three], ['#mode-3d', three]]) { const b = $(id); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
  const b3 = $('#mode-3d');
  b3.disabled = !!world.fail;
  b3.title = world.fail || '3D world (Z)';
  stageEl.dataset.mode = active && in3D(active) ? '3d' : '2d';
  $('#btn-gfx').hidden = !!world.fail;
  if (active) { refreshEnabled(); updateDock(); updateNav(); canvas.style.cursor = 'crosshair'; }
}
function renderGfx() {
  $('#btn-gfx-label').textContent = gfxLabel();
  for (const b of document.querySelectorAll('#gfx-list [role="radio"]')) { const on = b.dataset.tier === world.pick; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
  const t = tierNow(), d = world.device, sum = [`${t.label}: resolution up to ${t.scale}×`, t.msaa ? `${t.msaa}× antialiasing` : 'no antialiasing', t.shadow ? `${t.shadow} shadows` : 'no shadows', t.reflect ? 'floor reflections' : 'no reflections'];
  $('#gfx-now').textContent = `${sum.join(', ')}.`;
  $('#gfx-device').textContent = `${d.name} · ${d.cores} threads · suggests ${tierById(d.suggest).label}`;
}
const gfxOpen = () => !$('#gfx-sheet').hidden;
export function setGfx(open) {
  $('#gfx-sheet').hidden = !open;
  $('#btn-gfx').setAttribute('aria-expanded', String(open));
  if (open) { const cur = $('#gfx-list [aria-checked="true"]'); if (cur) cur.focus(); }
}
export function closeGfx() { if (!gfxOpen()) return false; setGfx(false); $('#btn-gfx').focus(); return true; }

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  world.device = probeDevice();
  if (!world.device.webgl2) { world.fail = 'This browser did not provide WebGL 2, so the playground stays in 2D.'; world.mode = '2d'; }
  const list = $('#gfx-list'), rows = [{ id: 'auto', label: 'Auto', blurb: 'Starts from your device and adapts to the frame rate.' }, ...TIERS];
  rows.forEach((t, i) => {
    const b = el('button', { type: 'button', role: 'radio', class: 'gfx-row', 'data-tier': t.id, 'aria-checked': 'false' }, el('b', { text: t.label }), el('span', { text: t.blurb }));
    b.addEventListener('click', () => pickTier(t.id));
    b.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % rows.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + rows.length) % rows.length;
      if (j >= 0) { e.preventDefault(); pickTier(rows[j].id); list.children[j].focus(); }
    });
    list.append(b);
  });
  $('#mode-2d').addEventListener('click', () => setMode('2d'));
  $('#mode-3d').addEventListener('click', () => setMode('3d'));
  const modeKeys = e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); toggleMode(); $(world.mode === '3d' ? '#mode-3d' : '#mode-2d').focus(); } };
  $('#mode-2d').addEventListener('keydown', modeKeys); $('#mode-3d').addEventListener('keydown', modeKeys);
  $('#btn-gfx').addEventListener('click', () => setGfx(!gfxOpen()));
  $('#gfx-close').addEventListener('click', closeGfx);
  document.addEventListener('pointerdown', e => {
    if (gfxOpen() && !$('#gfx-sheet').contains(e.target) && !$('#btn-gfx').contains(e.target)) setGfx(false);
  });
  renderMode(); renderGfx();
  if (world.mode === '3d') ensureEngine();
}
