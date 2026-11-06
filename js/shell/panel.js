/*
✒ Metadata
    - Title: Panel Builder (digiSpace Edition - v2.0)
    - File Name: panel.js
    - Relative Path: js/shell/panel.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file. v2.0 places controls into bento tiles,
      typesets maths with KaTeX, lets switches show why they are disabled,
      and renders the experiments page.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the Scene and Parameters tiles, the guide and math notebook
    pages, the readouts and the chart for the active lab.

✒ Key Features:
    - Range sliders with typed entry, reset and log scales; segmented
      choices; switches.
    - Sliders and switches honour the lab's enabled() and show the reason
      when disabled.
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
import { $, clamp, decimalsFor, el, reduceMotion } from '../core/util.js';
import { evaluateDiagnostics } from './diagnostics.js';
import { renderExperiments } from './experiments.js';
import { applyPreset, rebuild } from './lifecycle.js';

import { active, announce, ui } from './state.js';

/* ---------- controls ---------- */
export const RESET_SVG = '<span class="ms" aria-hidden="true">restart_alt</span>';
export function syncControl(key) { const f = ui.sync.get(key); if (f) f(); }
export function syncPanel() { for (const f of ui.sync.values()) f(); refreshEnabled(); }
export function refreshEnabled() {
  if (!active) return;
  for (const [key, fn] of ui.enable) { const s = active.enabled ? active.enabled(key) : true; fn(s === undefined ? true : s); }
}
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
export function buildRange(lab, c) {
  const id = `ctl-${lab.id}-${c.key}`, { toS, fromS } = rangeMap(c);
  const input = el('input', { type: 'range', id, min: c.log ? 0 : c.min, max: c.log ? 1000 : c.max, step: c.log ? 1 : (c.step || 'any'), 'aria-describedby': id + '-note' });
  const wrap = el('div', { class: 'range-wrap' }, input);
  const fmt = c.fmt || (v => v.toFixed(decimalsFor(c.step)) + (c.unit ? ' ' + c.unit : ''));
  const val = el('button', { type: 'button', class: 'ctl-val', id: id + '-out', 'aria-label': `${c.label}: edit value` });
  const reset = el('button', { type: 'button', class: 'ctl-reset', html: RESET_SVG, hidden: true });
  const tools = el('span', { class: 'ctl-tools' }, reset, val);
  const note = el('span', { class: 'ctl-note', id: id + '-note', text: c.note || '' });
  const round = v => c.log ? Number(v.toPrecision(3)) : (c.step ? Number((Math.round(v / c.step) * c.step).toFixed(decimalsFor(c.step) + 2)) : v);
  const frac = v => { const lo = +input.min, hi = +input.max; return (toS(v) - lo) / (hi - lo); };
  const same = (a, b) => Math.abs(a - b) <= Math.max(1e-12, Math.abs(b) * 1e-9);
  const show = v => {
    val.textContent = fmt(v); input.setAttribute('aria-valuetext', fmt(v));
    input.style.setProperty('--fill', `${frac(v) * 100}%`);
    const sv = lab.sceneP[c.key];
    if (typeof sv === 'number') { wrap.style.setProperty('--notch', clamp(frac(sv), 0, 1)); reset.hidden = same(v, sv); reset.setAttribute('aria-label', `Reset ${c.label} to the scene value, ${fmt(sv)}`); reset.title = `Back to ${fmt(sv)}`; }
  };
  const set = v => { input.value = toS(v); show(v); };
  const commit = (v, rebuildNow) => {
    v = clamp(round(v), c.min, c.max);
    lab.p[c.key] = v; set(v);
    if (c.rebuild === 'input' || (c.rebuild && rebuildNow)) rebuild(lab);
    else if (!c.rebuild && lab.onParam) lab.onParam(c.key, v);
  };
  input.addEventListener('input', () => {
    const v = clamp(round(fromS(+input.value)), c.min, c.max);
    lab.p[c.key] = v; show(v);
    if (c.rebuild === 'input') rebuild(lab);
    else if (!c.rebuild && lab.onParam) lab.onParam(c.key, v);
  });
  if (c.rebuild === true) input.addEventListener('change', () => rebuild(lab));
  reset.addEventListener('click', () => { commit(lab.sceneP[c.key], true); input.focus(); announce(`${c.label} reset`); });
  val.addEventListener('click', () => {
    if (input.disabled) return;
    const box = el('input', { type: 'text', class: 'ctl-edit', inputmode: 'decimal', 'aria-label': `${c.label} value, from ${c.min} to ${c.max}`, value: String(Number(lab.p[c.key].toPrecision(6))) });
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      if (ok) { const v = parseFloat(box.value.replace(/[^0-9eE+\-.]/g, '')); if (Number.isFinite(v)) commit(v, true); }
      box.replaceWith(val); val.focus();
    };
    box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
    box.addEventListener('blur', () => finish(true));
    val.replaceWith(box); box.focus(); box.select();
  });
  set(lab.p[c.key]);
  ui.sync.set(c.key, () => set(lab.p[c.key]));
  const node = el('div', { class: 'ctl' }, el('div', { class: 'ctl-head' }, el('label', { for: id, text: c.label }), tools), wrap, note);
  ui.enable.set(c.key, s => {
    const ok = s === true;
    input.disabled = !ok; node.classList.toggle('is-disabled', !ok); val.disabled = !ok;
    note.textContent = ok ? (c.note || '') : s;
  });
  return node;
}
export function buildControl(lab, c) {
  if (c.type === 'range') return buildRange(lab, c);
  const id = `ctl-${lab.id}-${c.key}`;
  if (c.type === 'toggle') {
    const note = el('span', { class: 'switch-note' });
    const btn = el('button', { type: 'button', role: 'switch', class: 'switch', id },
      el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })), el('span', { class: 'switch-text' }, el('span', { text: c.label }), note));
    const set = () => btn.setAttribute('aria-checked', String(!!lab.p[c.key]));
    btn.addEventListener('click', () => { lab.p[c.key] = !lab.p[c.key]; set(); if (lab.onParam) lab.onParam(c.key, lab.p[c.key]); refreshEnabled(); });
    set(); ui.sync.set(c.key, set);
    // A switch the lab cannot honour right now is disabled and says why.
    ui.enable.set(c.key, s => { const ok = s === true; btn.disabled = !ok; btn.classList.toggle('is-disabled', !ok); note.textContent = ok ? '' : s; });
    return btn;
  }
  if (c.type === 'seg') {
    const { group, update } = radioGroup(c.label, c.options, () => lab.p[c.key], v => { lab.p[c.key] = v; if (lab.onParam) lab.onParam(c.key, v); }, id);
    ui.sync.set(c.key, update);
    return el('div', { class: 'seg-wrap wide' }, el('span', { class: 'seg-label', text: c.label }), group);
  }
  return null;
}
/* ---------- tiles: scene, parameters, guide, math, chart, readouts ---------- */
export function buildPanel(lab) {
  ui.sync.clear(); ui.enable.clear();
  const eq = el('p', { class: 'eq' });
  if (lab.eqTex) { eq.dataset.tex = lab.eqTex; eq.dataset.inline = 'true'; } else eq.innerHTML = lab.eqFull || lab.eq;
  const pg = radioGroup('Scene', lab.presets.map(p => [p.id, p.label]), () => lab.presetId, id => applyPreset(lab, id), `preset-${lab.id}`, 'preset-list');
  ui.sync.set('__preset', pg.update);
  $('#scene-body').replaceChildren(el('div', { class: 'scene-intro' }, el('h2', { text: lab.title }), eq), pg.group);
  const grid = el('div', { class: 'params' });
  const ranges = lab.controls.filter(c => c.type !== 'toggle'), toggles = lab.controls.filter(c => c.type === 'toggle');
  for (const c of ranges) { const n = buildControl(lab, c); if (n) grid.append(n); }
  for (const c of toggles) { const n = buildControl(lab, c); if (n) grid.append(n); }
  const kids = [grid];
  if (lab.actions && lab.actions.length) kids.push(el('div', { class: 'actions' }, ...lab.actions.map(a => el('button', { type: 'button', class: 'btn', text: a.label, onclick: () => { a.run(); announce(a.label); evaluateDiagnostics(); } }))));
  $('#params-body').replaceChildren(...kids);
  $('#chart-title').textContent = lab.chart ? lab.chart.title : 'Chart';
  $('#chart').setAttribute('aria-label', lab.chart ? lab.chart.title : 'No chart for this lab');
  $('#chart-caption').textContent = lab.chart ? lab.chart.caption : '';
  $('#guide').replaceChildren(el('div', { class: 'guide' }, el('p', { class: 'blurb', text: lab.blurb }),
    el('ul', { class: 'interact', html: [...lab.interact, navHelp(lab)].map(s => `<li>${s}</li>`).join('') })));
  const math = $('#math');
  math.innerHTML = lab.math;
  typeset(math); typeset($('#scene-body'));
  renderExperiments(lab);
  refreshEnabled();
  readoutNodes = []; $('#readouts').replaceChildren();
  updateReadouts(); drawChart();
  for (const f of math.querySelectorAll('.f')) { formulaRO.observe(f); f.addEventListener('scroll', () => markClip(f), { passive: true }); }
  if (!reduceMotion) for (const b of document.querySelectorAll('#scene-body, #params-body, #math, #guide, #dock')) if (b.animate) b.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
}
export function navHelp(lab) {
  const pan = lab.rightButton ? 'drag with the middle button, or hold <b>Space</b> and drag, to pan' : 'drag with the right or middle button, or hold <b>Space</b> and drag, to pan';
  return `<b>View</b>: scroll to zoom at the cursor and ${pan}; pinch and two-finger drag on touch. The view controls on the right edge of the stage zoom, pan, frame the scene and open an overview.${lab.id === 'waves' ? ' In <b>Relief 3D</b>, right-drag or the axis ball orbits and Shift-drag pans.' : ''}`;
}
export function markClip(f) {
  const clipped = f.scrollWidth - f.clientWidth - f.scrollLeft > 2, scrollable = f.scrollWidth - f.clientWidth > 2;
  f.classList.toggle('is-clipped', clipped);
  if (scrollable) { f.tabIndex = 0; f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Formula, scrolls sideways'); }
  else { f.removeAttribute('tabindex'); f.removeAttribute('role'); f.removeAttribute('aria-label'); }
}
export const formulaRO = new ResizeObserver(entries => { for (const e of entries) markClip(e.target); });
export let readoutNodes = [];
export function updateReadouts() {
  const dl = $('#readouts'); if (!dl || !active) return;
  const rows = active.readouts();
  if (readoutNodes.length !== rows.length) {
    dl.replaceChildren(); readoutNodes = [];
    for (const r of rows) { const dt = el('dt', { text: r[0] }), dd = el('dd'); dl.append(dt, dd); readoutNodes.push([dt, dd]); }
  }
  rows.forEach((r, i) => {
    const [dt, dd] = readoutNodes[i];
    if (dt.textContent !== r[0]) dt.textContent = r[0];
    if (dd.textContent !== r[1]) dd.textContent = r[1];
    if (r[2]) dd.setAttribute('data-state', r[2]); else dd.removeAttribute('data-state');
  });
}
export function drawChart() {
  if (!active) return;
  const c = canvasContext($('#chart')); if (!c) return;
  if (!active.chart) { chartMessage(c.g, c.w, c.h, 'This lab has no running chart'); return; }
  active.chart.draw(c);
  const cap = $('#chart-caption'); if (cap && cap.textContent !== active.chart.caption) cap.textContent = active.chart.caption;
}
