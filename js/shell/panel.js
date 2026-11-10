/*
✒ Metadata
    - Title: Panel Builder (digiSpace Edition - v2.7)
    - File Name: panel.js
    - Relative Path: js/shell/panel.js
    - Artifact Type: javascript
    - Version: 2.7.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      updateReadouts reads the lab once per panel tick and gives the rows to
      Telemetry and the head-up display's tape, so both show the same text.
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Comments
      speak of dials rather than sliders.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Guide
      page moves to guide.js and the Math page gains live panels from
      livemath.js; a control's value format is shared through controlFormat().
      On Dennis's call to retire the long sliders, every number is a
      thumbwheel dial (dial.js) in a grid of compact cards, its note held to
      two lines; a changed setting also refreshes the rail's Random dice and
      the Guide's cards at once. The dice fades in with the tools when a lab
      opens.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the Controls page, the guide and math notebook pages, the readouts
    and the chart for the active lab. Controls are grouped into the sections
    the lab declares, with quick actions above them; numbers are thumbwheel
    dials set out as a grid of compact cards.

✒ Key Features:
    - Thumbwheel dials (dial.js) for numbers, with typed entry, reset and log
      scales, in a grid of compact cards; segmented choices; switches.
    - Sections from the lab's groups list: a glyph and title, a remembered
      fold, Reset to the scene's values, and one note when changes restart the
      run.
    - Switches sit in a grid under their section, with short names and the
      full name as tooltip.
    - Quick actions first, where they are seen without scrolling.
    - Dials and switches honour the lab's enabled() and show the reason when
      disabled; a dial shows two lines of its note and the whole note as its
      tooltip.
    - syncControl() also refreshes the Random dice and the Guide's cards, so
      every mirror of a setting moves with it.
    - Formula cards typeset with KaTeX; readouts update in place.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { canvasContext, chartMessage } from '../core/chart.js';
import { typeset } from '../core/tex.js';
import { fmtQ, toDisplay, toNative, unitDecimals } from '../core/units.js';
import { $, clamp, decimalsFor, el, reduceMotion, store } from '../core/util.js';
import { evaluateDiagnostics } from './diagnostics.js';
import { drawScope, resetGauges, scopeOn, updateGauges } from './instruments.js';
import { renderExperiments } from './experiments.js';
import { makeWheel } from './dial.js';
import { buildLiveMath } from './livemath.js';
import { hudReadings } from './headsup.js';
import { syncDice } from './dock.js';
import { buildGuide, syncGuide } from './guide.js';
import { applyPreset, rebuild, setParam } from './lifecycle.js';

import { active, announce, ui } from './state.js';

/* ---------- controls ---------- */
export const RESET_SVG = '<span class="ms" aria-hidden="true">restart_alt</span>';
/* After a setting changes: its control, the section Resets, and the dice and Guide cards that mirror settings. */
export function syncControl(key) { const f = ui.sync.get(key); if (f) f(); refreshGroups(); syncDice(); syncGuide(); }
export function syncPanel() { for (const f of ui.sync.values()) f(); refreshEnabled(); }
export function refreshEnabled() {
  if (!active) return;
  for (const [key, fn] of ui.enable) { const s = active.enabled ? active.enabled(key) : true; fn(s === undefined ? true : s); }
  refreshGroups();
}
/* Each section's Reset shows only while one of its values differs from the scene's. */
const groupResets = [];
function refreshGroups() { for (const f of groupResets) f(); }
const sameValue = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= Math.max(1e-12, Math.abs(b) * 1e-9) : a === b);
export function radioGroup(label, options, get, set, idBase, cls = 'seg') {
  const group = el('div', { class: cls, role: 'radiogroup', 'aria-label': label });
  const buttons = options.map(([value, text]) => {
    const b = el('button', { type: 'button', role: 'radio', id: `${idBase}-${value}`, text });
    b.addEventListener('click', () => { set(value); update(); });
    b.addEventListener('keydown', e => {
      const i = options.findIndex(o => o[0] === value);
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % options.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + options.length) % options.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = options.length - 1;
      if (j >= 0) { e.preventDefault(); set(options[j][0]); update(); buttons[j].focus(); }
    });
    return b;
  });
  function update() { const cur = get(); buttons.forEach((b, k) => { const on = options[k][0] === cur; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
  group.append(...buttons); update();
  return { group, update };
}
export function rangeMap({ min, max, log }) {
  return {
    toS: log ? v => 1000 * Math.log(v / min) / Math.log(max / min) : v => v,
    fromS: log ? s => min * Math.exp(s / 1000 * Math.log(max / min)) : s => +s,
  };
}
/* How a range control shows its value: its own fmt, its quantity in the chosen units, or a number and its unit. */
export function controlFormat(lab, c) {
  const q = c.qty, dec = q ? unitDecimals(lab, q, c.step) : decimalsFor(c.step);
  // A quantity on a log scale with no step spans decades (Gravity's softening runs from 1e-4 to 30 px), so it keeps
  // three significant figures where fixed decimals would round its low end to nothing.
  if (!c.fmt && q && c.log && !c.step) return v => fmtQ(lab, q, v);
  return c.fmt || (q ? v => fmtQ(lab, q, v, { digits: dec }) : v => v.toFixed(dec) + (c.unit ? ' ' + c.unit : ''));
}
export function buildRange(lab, c) {
  const id = `ctl-${lab.id}-${c.key}`, { toS, fromS } = rangeMap(c);
  // A thumbwheel over a native range input: the input keeps the keyboard, screen readers and these listeners.
  const W = makeWheel({ id, min: c.log ? 0 : c.min, max: c.log ? 1000 : c.max, step: c.log ? 1 : (c.step || 'any'), describedby: id + '-note', valLabel: `${c.label}: edit value` });
  const { input, val } = W;
  // A control with a quantity kind shows, and takes typed values in, the chosen unit system; the lab keeps its own.
  const q = c.qty, shown = v => (q ? toDisplay(lab, q, v) : v);
  const fmt = controlFormat(lab, c);
  const reset = el('button', { type: 'button', class: 'ctl-reset', html: RESET_SVG, hidden: true });
  // A dial shows two lines of its note; the whole note is its tooltip, and screen readers read all of it.
  const note = el('span', { class: 'ctl-note', id: id + '-note', text: c.note || '', title: c.note || null });
  const round = v => c.log ? Number(v.toPrecision(3)) : (c.step ? Number((Math.round(v / c.step) * c.step).toFixed(decimalsFor(c.step) + 2)) : v);
  const same = (a, b) => Math.abs(a - b) <= Math.max(1e-12, Math.abs(b) * 1e-9);
  const show = v => {
    val.textContent = fmt(v); input.setAttribute('aria-valuetext', fmt(v));
    const sv = lab.sceneP[c.key], scene = typeof sv === 'number';
    W.paint(scene ? toS(sv) : null);
    if (scene) { reset.hidden = same(v, sv); reset.setAttribute('aria-label', `Reset ${c.label} to the scene value, ${fmt(sv)}`); reset.title = `Back to ${fmt(sv)}`; }
  };
  const set = v => { input.value = toS(v); show(v); };
  const commit = (v, rebuildNow) => {
    v = clamp(round(v), c.min, c.max);
    lab.p[c.key] = v; set(v);
    if (c.rebuild === 'input' || (c.rebuild && rebuildNow)) rebuild(lab);
    else if (!c.rebuild && lab.onParam) lab.onParam(c.key, v);
    refreshEnabled();
  };
  input.addEventListener('input', () => {
    const v = clamp(round(fromS(+input.value)), c.min, c.max);
    lab.p[c.key] = v; show(v);
    if (c.rebuild === 'input') rebuild(lab);
    else if (!c.rebuild && lab.onParam) lab.onParam(c.key, v);
    refreshEnabled();
  });
  if (c.rebuild === true) input.addEventListener('change', () => rebuild(lab));
  reset.addEventListener('click', () => { commit(lab.sceneP[c.key], true); input.focus(); announce(`${c.label} reset`); });
  val.addEventListener('click', () => {
    if (input.disabled) return;
    const box = el('input', { type: 'text', class: 'ctl-edit', inputmode: 'decimal', 'aria-label': `${c.label} value, from ${fmt(c.min)} to ${fmt(c.max)}`, value: String(Number(shown(lab.p[c.key]).toPrecision(6))) });
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      if (ok) { const v = parseFloat(box.value.replace(/[^0-9eE+\-.]/g, '')); if (Number.isFinite(v)) commit(q ? toNative(lab, q, v) : v, true); }
      box.replaceWith(val); val.focus();
    };
    box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
    box.addEventListener('blur', () => finish(true));
    val.replaceWith(box); box.focus(); box.select();
  });
  set(lab.p[c.key]);
  ui.sync.set(c.key, () => set(lab.p[c.key]));
  // In a section the heading carries the context, so a dial may show a shorter name; the full one stays as its tooltip.
  const name = el('label', { for: id, class: 'dial-name', text: c.short || c.label, title: c.short ? c.label : null });
  const node = el('div', { class: 'ctl dial' }, el('div', { class: 'dial-head' }, name, reset), W.wheel, note);
  ui.enable.set(c.key, s => {
    const ok = s === true;
    input.disabled = !ok; node.classList.toggle('is-disabled', !ok); val.disabled = !ok;
    note.textContent = ok ? (c.note || '') : s; note.title = note.textContent;
  });
  return node;
}
export function buildControl(lab, c) {
  if (c.type === 'range') return buildRange(lab, c);
  const id = `ctl-${lab.id}-${c.key}`;
  if (c.type === 'toggle') {
    const note = el('span', { class: 'switch-note' });
    // In a section the heading carries the context, so a switch may show a shorter name; the full one stays as its tooltip.
    const btn = el('button', { type: 'button', role: 'switch', class: 'switch', id, title: c.short ? c.label : null },
      el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })), el('span', { class: 'switch-text' }, el('span', { text: c.short || c.label }), note));
    const set = () => btn.setAttribute('aria-checked', String(!!lab.p[c.key]));
    btn.addEventListener('click', () => setParam(lab, c.key, !lab.p[c.key]));
    set(); ui.sync.set(c.key, set);
    // A switch the lab cannot honour right now is disabled and says why.
    ui.enable.set(c.key, s => { const ok = s === true; btn.disabled = !ok; btn.classList.toggle('is-disabled', !ok); note.textContent = ok ? '' : s; });
    return btn;
  }
  if (c.type === 'seg') {
    const { group, update } = radioGroup(c.label, c.options, () => lab.p[c.key], v => setParam(lab, c.key, v), id);
    ui.sync.set(c.key, update);
    return el('div', { class: 'seg-wrap wide' }, el('span', { class: 'seg-label', text: c.label }), group);
  }
  return null;
}
/* ---------- control sections ---------- */
/* A lab lists its sections in groups ({ id, label, icon }) and tags each control with one; anything untagged lands
   in a closing "More" section so no control can go missing. A lab with no groups gets one section. */
export function panelGroups(lab) {
  if (!lab.groups) return [{ id: 'all', label: 'Controls', icon: 'tune', controls: lab.controls }];
  const ids = new Set(lab.groups.map(g => g.id)), out = lab.groups.map(g => ({ ...g, controls: lab.controls.filter(c => c.group === g.id) }));
  const loose = lab.controls.filter(c => !ids.has(c.group));
  if (loose.length) out.push({ id: 'more', label: 'More', icon: 'tune', controls: loose });
  return out.filter(g => g.controls.length);
}
function buildGroup(lab, g) {
  const id = `pg-${lab.id}-${g.id}`, key = `${lab.id}.${g.id}`;
  const body = el('div', { class: 'pgroup-body', id: id + '-body' });
  // Consecutive dials share a grid of compact cards; choices between them keep the full width.
  let dials = null;
  for (const c of g.controls.filter(c => c.type !== 'toggle')) {
    const n = buildControl(lab, c); if (!n) continue;
    if (c.type === 'range') { if (!dials) body.append(dials = el('div', { class: 'dial-grid' })); dials.append(n); } else { dials = null; body.append(n); }
  }
  const switches = g.controls.filter(c => c.type === 'toggle').map(c => buildControl(lab, c)).filter(Boolean);
  if (switches.length) body.append(el('div', { class: 'pgroup-switches' }, ...switches));
  const toggle = el('button', { type: 'button', class: 'pgroup-toggle', id, 'aria-expanded': 'true', 'aria-controls': body.id },
    el('span', { class: 'ms pgroup-ico', 'aria-hidden': 'true', text: g.icon || 'tune' }), el('span', { class: 'pgroup-title', text: g.label }),
    el('span', { class: 'ms pgroup-chev', 'aria-hidden': 'true', text: 'expand_more' }));
  const reset = el('button', { type: 'button', class: 'pgroup-reset', hidden: true, html: `${RESET_SVG}<span>Reset</span>`, 'aria-label': `Reset ${g.label} to the scene's values`, title: "Back to the scene's values" });
  // A section whose changes start the run again says so once, instead of a note under every dial.
  const note = g.controls.some(c => c.rebuild) ? el('p', { class: 'pgroup-note', text: 'Changes here restart the run.' }) : null;
  const sec = el('section', { class: 'pgroup', 'aria-labelledby': id, 'data-group': g.id }, el('div', { class: 'pgroup-head' }, toggle, reset), ...(note ? [note] : []), body);
  const fold = f => { toggle.setAttribute('aria-expanded', String(!f)); body.hidden = f; if (note) note.hidden = f; sec.classList.toggle('is-folded', f); };
  fold(!!store.get('folded', {})[key]);
  toggle.addEventListener('click', () => {
    const f = toggle.getAttribute('aria-expanded') === 'true', all = store.get('folded', {});
    fold(f); if (f) all[key] = true; else delete all[key]; store.set('folded', all);
  });
  const keys = g.controls.map(c => c.key).filter(k => k in lab.sceneP), differs = () => keys.filter(k => !sameValue(lab.p[k], lab.sceneP[k]));
  groupResets.push(() => { reset.hidden = !differs().length; });
  reset.addEventListener('click', () => {
    const changed = differs();
    if (!changed.length) return;
    let restart = false;
    for (const k of changed) {
      const c = g.controls.find(x => x.key === k);
      lab.p[k] = lab.sceneP[k];
      if (c.rebuild) restart = true; else if (lab.onParam) lab.onParam(k, lab.p[k]);
    }
    if (restart) rebuild(lab);
    syncPanel(); evaluateDiagnostics(); toggle.focus();
    announce(`${g.label} set back to the scene's values`);
  });
  return sec;
}

/* ---------- tiles: scene, parameters, guide, math, chart, readouts ---------- */
export function buildPanel(lab) {
  ui.sync.clear(); ui.enable.clear();
  const eq = el('p', { class: 'eq' });
  if (lab.eqTex) { eq.dataset.tex = lab.eqTex; eq.dataset.inline = 'true'; } else eq.innerHTML = lab.eqFull || lab.eq;
  const pg = radioGroup('Scene', lab.presets.map(p => [p.id, p.label]), () => lab.presetId, id => applyPreset(lab, id), `preset-${lab.id}`, 'preset-list');
  ui.sync.set('__preset', pg.update);
  $('#scene-menu').replaceChildren(pg.group);
  $('#scene-body').replaceChildren(el('h2', { text: lab.title }), eq);
  groupResets.length = 0;
  const grid = el('div', { class: 'params' });
  // Actions act on the run now, so they sit first, where they are seen without scrolling past every dial.
  if (lab.actions && lab.actions.length) grid.append(el('div', { class: 'quick', role: 'group', 'aria-label': 'Quick actions' }, ...lab.actions.map(a => el('button', { type: 'button', class: 'btn btn-quick', text: a.label, onclick: () => { a.run(); announce(a.label); evaluateDiagnostics(); } }))));
  for (const g of panelGroups(lab)) grid.append(buildGroup(lab, g));
  $('#params-body').replaceChildren(grid);
  $('#chart-title').textContent = lab.chart ? lab.chart.title : 'Chart';
  $('#chart').setAttribute('aria-label', lab.chart ? lab.chart.title : 'No chart for this lab');
  $('#chart-caption').textContent = lab.chart ? lab.chart.caption : '';
  $('#chart-caption').title = lab.chart ? lab.chart.caption : '';
  buildGuide(lab);
  const math = $('#math');
  math.innerHTML = lab.math;
  typeset(math); typeset($('#scene-body'));
  buildLiveMath(lab, math);
  renderExperiments(lab);
  refreshEnabled();
  resetGauges();
  updateReadouts(); drawChart();
  for (const f of math.querySelectorAll('.f')) { formulaRO.observe(f); f.addEventListener('scroll', () => markClip(f), { passive: true }); }
  if (!reduceMotion) for (const b of document.querySelectorAll('#scene-body, #params-body, #math, #guide, #dock, #dock-dice')) if (b.animate) b.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
}
export function navHelp(lab) {
  const pan = lab.rightButton ? 'drag with the middle button, or hold <b>Space</b> and drag, to pan' : 'drag with the right or middle button, or hold <b>Space</b> and drag, to pan';
  return `<b>View</b>: scroll to zoom at the cursor and ${pan}; pinch and two-finger drag on touch. The view controls on the right edge of the stage zoom, pan, frame the scene and open an overview. In <b>3D mode</b>, ${lab.rightButton ? 'middle-drag' : 'right-drag'} or the axis ball orbits and Shift-drag pans.`;
}
export function markClip(f) {
  const clipped = f.scrollWidth - f.clientWidth - f.scrollLeft > 2, scrollable = f.scrollWidth - f.clientWidth > 2;
  f.classList.toggle('is-clipped', clipped);
  if (scrollable) { f.tabIndex = 0; f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Formula, scrolls sideways'); }
  else { f.removeAttribute('tabindex'); f.removeAttribute('role'); f.removeAttribute('aria-label'); }
}
export const formulaRO = new ResizeObserver(entries => { for (const e of entries) markClip(e.target); });
// Telemetry and the head-up display share one reading of the lab per panel tick.
export function updateReadouts() { if (!active) return; const rows = active.readouts(); updateGauges(active, rows); hudReadings(active, rows); }
export function drawChart() {
  if (!active) return;
  const c = canvasContext($('#chart')); if (!c) return;
  if (scopeOn(active)) { drawScope(c); return; }
  if (!active.chart) { chartMessage(c.g, c.w, c.h, 'This lab has no running chart'); return; }
  active.chart.draw(c);
  const cap = $('#chart-caption'); if (cap && cap.textContent !== active.chart.caption) { cap.textContent = active.chart.caption; cap.title = active.chart.caption; }
}
