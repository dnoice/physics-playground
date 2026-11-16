/*
✒ Metadata
    - Title: View Mode and Graphics Tiers (digiSpace Edition - v2.18)
    - File Name: mode.js
    - Relative Path: js/shell/mode.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one settings dialog: the Graphics section lives in it,
      with the tiers, the machine's four verdicts with the part that set the
      suggestion marked, and a card for each setting of one's own. A setting
      holds over whichever tier is in use, shows the tier's own value, resets
      on its own or with Reset to tier, is kept in this browser and reaches
      the engine through the change-of-tier path. The GPU's caps still bound
      the budget, and nothing above them is offered.
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — The engine
      gets the tier's budget capped at what the GPU reports (MSAA samples,
      anisotropy, texture size), and the Graphics sheet reads the whole
      machine: threads, the CPU's measured speed, memory, the suggestion and
      the part that set it.
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
    - The Graphics section of Settings: Auto plus five named tiers, the
      machine's four verdicts and what the budget costs, and a card for each
      setting of one's own laid over the tier, within the GPU's limits.
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
import { KNOBS, KNOB_GROUPS, TIERS, cleanOverrides, knobByKey, knobText, layered, probeDevice, tierById, tierStep } from '../core/tiers.js';
import { $, el, reduceMotion, store } from '../core/util.js';
import { msEl } from '../core/icons.js';
import { view } from '../core/view.js';
import { sticky } from './diagnostics.js';
import { updateDock } from './dock.js';
import { updateNav } from './navigator.js';
import { radioGroup, refreshEnabled } from './panel.js';
import { allowSection } from './settings.js';
import { cancelLabPointer } from './stage.js';
import { active, announce, canvas, stageEl } from './state.js';

export const world = {
  mode: store.get('mode', '3d') === '2d' ? '2d' : '3d',
  pick: store.get('tier', 'auto'), autoTier: null, device: null,
  // The person's own settings, laid over whichever tier is in use (Settings, under Graphics).
  over: cleanOverrides(store.get('gfxOverrides', {})),
  engine: null, loading: null, fail: null, lost: false, broken: new Set(),
};
const tierNow = () => tierById(world.pick) || tierById(world.autoTier) || tierById(world.device.suggest) || TIERS[TIERS.length - 1];
/* The most of a setting this GPU takes, by its knob's cap: no samples or filtering reported means none, and an
   unreported texture limit bounds nothing. */
const limit = key => { const c = (knobByKey(key) || {}).cap, v = c && world.device[c]; return !c ? Infinity : v || (c === 'maxTexture' ? Infinity : c === 'maxAniso' ? 1 : 0); };
/* Never more antialiasing samples or texture filtering than this GPU offers, and never a texture larger than it takes. */
const capped = t => ({ ...t, msaa: Math.min(t.msaa, limit('msaa')), aniso: Math.max(1, Math.min(t.aniso, limit('aniso'))), tex: Math.min(t.tex, limit('tex')) });
/* The tier as the engine spends it: the tier in use with the person's own settings laid over it, within the GPU's
   limits. */
const budget = () => capped(layered(tierNow(), world.over));
export const gfxBudget = () => budget();
/* The tier's own value for each setting on this GPU; a tier without shadows still names the penumbra one would get. */
const tierOwn = () => { const t = capped(layered(tierNow(), {})); if (!(t.soft > 0)) t.soft = 5; return t; };
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
    world.engine = m.createEngine(budget());
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
const AUTO = { WINDOW: 3, SLOW_MS: 25, FAST_MS: 17.6, FAST_WINDOWS: 4, STALL: 5 };
const auto = { ms: 16, clock: 0, frames: 0, fast: 0, from: null, before: 0, ceil: null, settled: false };
function resetAuto() { Object.assign(auto, { clock: 0, frames: 0, fast: 0, from: null, before: 0, settled: false }); }
function setAutoTier(id, why) {
  world.autoTier = id;
  if (world.engine) world.engine.setTier(budget());
  renderGfx();
  announce(why);
  if (active) sticky({ id: 'gfx-auto', level: 'info', title: `Graphics tier is now ${tierById(id).label}`, body: `${why} Pick a fixed tier in Settings, under Graphics, to stop this.` }, 8);
}
/* From the frame loop: raw is the true frame gap in seconds. */
export function tickWorld(raw) {
  // Only a true stall is ignored: on a machine that cannot cope, every frame is slow, and those are the ones to count.
  if (!active || !in3D(active) || world.pick !== 'auto' || auto.settled || raw <= 0 || raw > AUTO.STALL || document.hidden) return;
  auto.frames++;
  if ((auto.clock += raw) < AUTO.WINDOW) return;
  auto.ms = auto.clock / auto.frames * 1000;
  auto.clock = 0; auto.frames = 0;
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
  if (world.engine) world.engine.setTier(budget());
  renderGfx();
  announce(`Graphics: ${gfxLabel()}`);
}
/* A cheaper fixed tier to offer from diagnostics, or null at the bottom. */
export const cheaperTier = () => (world.pick === 'auto' ? null : tierStep(tierNow().id, 1));

/* ---------- settings of one's own ---------- */
/* Set one part of the budget apart from the tier. It holds over whatever tier is in use, Auto's included; choosing the
   tier's own value hands the setting back to the tier. A value the GPU cannot take is refused. */
export function setOverride(key, v) {
  const k = knobByKey(key);
  if (!k || !(k.bool ? typeof v === 'boolean' : k.options.includes(v) && v <= limit(key))) return false;
  const was = world.over[key];
  if (v === tierOwn()[key]) delete world.over[key]; else world.over[key] = v;
  if (world.over[key] !== was) gfxChanged(`${k.label}: ${knobText(k, v)}`);
  return true;
}
export function resetOverride(key) {
  const k = knobByKey(key);
  if (!k || !Object.hasOwn(world.over, key)) return false;
  delete world.over[key];
  gfxChanged(`${k.label} follows the ${tierNow().label} tier again`);
  return true;
}
export function resetOverrides() {
  if (!Object.keys(world.over).length) return false;
  world.over = {};
  gfxChanged(`Every graphics setting follows the ${tierNow().label} tier again`);
  return true;
}
/* Kept for the next visit and applied at once, through the same path as a change of tier, which frees what the last
   budget made. Auto measures afresh, since the cost of a frame has changed. */
function gfxChanged(msg) {
  store.set('gfxOverrides', world.over);
  resetAuto();
  if (world.engine) world.engine.setTier(budget());
  renderGfx();
  announce(msg);
}

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
  allowSection('graphics', !world.fail);
  if (active) { refreshEnabled(); updateDock(); updateNav(); canvas.style.cursor = 'crosshair'; }
}
const ownText = n => `${n} setting${n === 1 ? '' : 's'} of your own`;
function renderGfx() {
  const b = budget(), t = tierNow(), n = Object.keys(world.over).length, btn = $('#btn-gfx');
  $('#btn-gfx-label').textContent = gfxLabel();
  btn.title = `Graphics: ${gfxLabel()}${n ? `, ${ownText(n)}` : ''}`;
  btn.classList.toggle('has-own', n > 0);
  for (const r of document.querySelectorAll('#gfx-list [role="radio"]')) { const on = r.dataset.tier === world.pick; r.setAttribute('aria-checked', String(on)); r.tabIndex = on ? 0 : -1; }
  const sum = [`resolution up to ${b.scale}×`, b.msaa ? `${b.msaa}× antialiasing` : 'no antialiasing', b.shadow ? `${b.shadow} shadows` : 'no shadows', b.reflect ? 'floor reflections' : 'no reflections'];
  $('#gfx-now').textContent = `${t.label}${n ? ` with ${ownText(n)}` : ''}: ${sum.join(', ')}.`;
  renderKnobs(b, n);
}

/* ---------- Settings: the Graphics section ---------- */
/* What this machine reports and what each part of it can carry, with the part that set the suggestion marked. */
function renderDevice() {
  const d = world.device, v = d.verdict, host = $('#gfx-device');
  if (!v) { host.textContent = 'This browser did not report its graphics hardware.'; return; }
  const what = {
    GPU: `${v.parts[0][1].kind}: ${d.name}`, CPU: `${d.cores} threads at ${d.cpu.toFixed(1)}× a laptop core`,
    Memory: d.memory == null ? 'memory not reported' : `${d.memory} GB memory`, 'GPU limits': d.maxTexture ? `${d.maxTexture} px textures at most` : 'texture limit not reported',
  };
  const rows = v.parts.map(([part, pv]) => el('div', { class: 'dev-row', 'data-sets': String(part === v.by) },
    el('dt', { text: part === 'GPU limits' ? 'Texture limit' : part }), el('dd', {}, el('span', { class: 'dev-what', text: what[part] }), el('span', { class: 'dev-tier', text: tierById(pv.tier).label }))));
  host.replaceChildren(el('dl', { class: 'dev-list' }, ...rows), el('p', { class: 'dev-sum', text: `This machine suggests ${tierById(d.suggest).label}${v.by ? `, set by the ${v.by}` : ''}.` }));
}
/* A card for each setting: its name, the tier's own value, its choices (only what this GPU takes) or a switch, and a
   reset that shows while the setting is the person's own. */
const knobs = new Map();
let shown = {};
const slug = v => String(v).replace('.', 'p');
function buildKnob(k) {
  const id = `ov-${k.key}`, tag = el('span', { class: 'knob-tag', text: 'Yours', hidden: true }), own = el('span', { class: 'knob-tier', id: `${id}-tier` });
  const note = el('p', { class: 'knob-note', id: `${id}-note` }), reset = el('button', { type: 'button', class: 'knob-reset', id: `${id}-reset`, title: 'Back to the tier\'s value', hidden: true },
    msEl('restart_alt'), el('span', { class: 'sr-only', text: `${k.label}: back to the tier's value` }));
  const u = { k, tag, own, note, reset, row: null, sync: null, focus: null };
  if (k.bool) {
    const ctl = el('button', { type: 'button', role: 'switch', class: 'switch', id, 'aria-describedby': `${id}-tier ${id}-note` },
      el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })), el('span', { class: 'switch-text' }, el('span', { class: 'knob-name', text: k.label })));
    ctl.addEventListener('click', () => setOverride(k.key, !shown[k.key]));
    u.sync = () => ctl.setAttribute('aria-checked', String(!!shown[k.key]));
    u.focus = () => ctl.focus();
    u.row = el('div', { class: 'knob', 'data-key': k.key }, el('div', { class: 'knob-head' }, ctl, tag, own, reset), note);
  } else {
    const opts = k.options.filter(v => v <= limit(k.key)).map(v => [v, knobText(k, v)]), name = el('span', { class: 'knob-name', id: `${id}-name`, text: k.label });
    const { group, update } = radioGroup(k.label, opts, () => shown[k.key], v => setOverride(k.key, v), id), buttons = [...group.children];
    group.removeAttribute('aria-label'); group.setAttribute('aria-labelledby', name.id); group.setAttribute('aria-describedby', `${id}-tier ${id}-note`);
    buttons.forEach((b, i) => { b.id = `${id}-${slug(opts[i][0])}`; });
    u.sync = off => {
      update();
      for (const b of buttons) b.disabled = !!off;
      // A value between the offered steps (a GPU limit) still leaves the group one tab stop.
      if (!buttons.some(b => b.tabIndex === 0)) buttons[0].tabIndex = 0;
    };
    u.focus = () => (buttons.find(b => b.tabIndex === 0) || buttons[0]).focus();
    u.row = el('div', { class: 'knob', 'data-key': k.key }, el('div', { class: 'knob-head' }, name, tag, own, reset), group, note);
  }
  reset.addEventListener('click', () => { resetOverride(k.key); u.focus(); });
  knobs.set(k.key, u);
  return u.row;
}
function buildKnobs() {
  const host = $('#gfx-knobs');
  for (const [g, title] of KNOB_GROUPS) host.append(el('div', { class: 'knob-group', role: 'group', 'aria-labelledby': `knobs-${g}` },
    el('h5', { class: 'knob-group-title', id: `knobs-${g}`, text: title }), el('div', { class: 'knobs' }, ...KNOBS.filter(k => k.group === g).map(buildKnob))));
  // Everything now follows the tier, so focus goes to the tier.
  $('#gfx-reset').addEventListener('click', () => { resetOverrides(); const cur = $('#gfx-list [aria-checked="true"]'); if (cur) cur.focus(); });
}
function renderKnobs(b, n) {
  if (!knobs.size) return;
  const own = tierOwn(), label = tierNow().label;
  shown = { ...b, soft: b.soft || own.soft };
  for (const [key, u] of knobs) {
    const k = u.k, mine = Object.hasOwn(world.over, key), off = !!k.needs && !b[k.needs], top = limit(key);
    u.row.dataset.own = String(mine); u.tag.hidden = !mine; u.reset.hidden = !mine;
    u.own.textContent = `${label}: ${knobText(k, own[key])}`;
    u.sync(off);
    const more = off ? ' Switch the shadow map on to soften it.' : key === 'scale' ? ` This display has ${+view.dpr.toFixed(2)}×.` : k.options && top < Math.max(...k.options) ? ` This GPU takes up to ${knobText(k, top)}.` : '';
    u.note.textContent = k.note + more;
  }
  const own1 = ownText(n);
  $('#gfx-own').textContent = n ? `${own1[0].toUpperCase()}${own1.slice(1)}, kept over whichever tier is in use.` : 'Every setting follows the tier.';
  $('#gfx-reset').hidden = !n;
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  world.device = probeDevice();
  if (!world.device.webgl2) { world.fail = 'This browser did not provide WebGL 2, so the playground stays in 2D.'; world.mode = '2d'; }
  const list = $('#gfx-list'), rows = [{ id: 'auto', label: 'Auto', blurb: 'Starts from your device and adapts to the frame rate.' }, ...TIERS];
  if (world.device.webgl2) { renderDevice(); buildKnobs(); }
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
  renderMode(); renderGfx();
  if (world.mode === '3d') ensureEngine();
}
