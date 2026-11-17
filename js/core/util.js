/*
✒ Metadata
    - Title: Core Utilities (digiSpace Edition - v2.19)
    - File Name: util.js
    - Relative Path: js/core/util.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for drag handles on the panels: dragHandle(), one captured
      pointer drag that ends exactly once, on release, cancel or a lost
      capture, with a slop before the first move so a double-click moves
      nothing, keyboard steps and a save after each. The deck's and the
      inspector's grips and the Telemetry plot's scrub use it.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added
      keepFocus, so rebuilt controls do not drop keyboard focus.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Small helpers shared by every module: maths constants, clamping, DOM
    building, drag handles, number formatting and a guarded local-storage
    wrapper.

✒ Key Features:
    - el(tag, attrs, ...kids) builds DOM nodes with text, html, attributes
      and listeners.
    - store.get/set wraps localStorage and survives browsers that block it.
    - dragHandle gives a grip or a plot one captured pointer drag that ends
      exactly once, keyboard steps and a save after each.
    - fmtSI, pct, trimNum and decimalsFor format readouts consistently.

✒ Usage Instructions:
    import { $, clamp, el, store } from '../core/util.js';

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rand = (a, b) => a + Math.random() * (b - a);
export const $ = (sel, root = document) => root.querySelector(sel);
export const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
export const coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
export const store = {
  get(k, d) { try { const v = localStorage.getItem('psp:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('psp:' + k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } },
};

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
}
/* Rebuild part of the page without dropping keyboard focus: the element that
   had it is found again by its data-fk key, else `fallback` takes it. */
export function keepFocus(host, rebuild, fallback) {
  const a = document.activeElement, had = !!a && host.contains(a), key = had ? a.dataset.fk : null;
  rebuild();
  if (!had || host.contains(document.activeElement)) return;
  const next = (key && host.querySelector(`[data-fk="${key}"]`)) || fallback;
  if (next) next.focus();
}
/* One pointer drag on an element, captured so it carries on past the element's edge, with optional keyboard steps.
   A drag ends exactly once, on release, cancel or a lost capture; then save() keeps the result, as after each step.
   - start(e): runs on a primary press; return false to decline it (nothing to drag).
   - move(e, dx, dy): the pointer's travel since the press, in CSS pixels, once it has passed slop pixels, so a
     click or a double-click with a tremor in it moves nothing.
   - end(e): the drag is over (e.type says how), just before save().
   - keys: { key: value } for keydown; step(value, e) acts on it, then save() runs.
   - busy: a class on <body> while a drag lasts, for the cursor. */
export function dragHandle(node, { start, move, end, keys, step, save, busy, slop = 0 } = {}) {
  let id = null, x0 = 0, y0 = 0, moved = false;
  const stop = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (busy) document.body.classList.remove(busy);
    if (end) end(e);
    if (save) save();
  };
  node.addEventListener('pointerdown', e => {
    if (e.button !== 0 || id !== null || (start && start(e) === false)) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; moved = slop <= 0;
    try { node.setPointerCapture(id); } catch (_) { /* capture is best-effort */ }
    if (busy) document.body.classList.add(busy);
  });
  node.addEventListener('pointermove', e => {
    if (e.pointerId !== id || !move) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!moved && Math.abs(dx) < slop && Math.abs(dy) < slop) return;
    moved = true; move(e, dx, dy);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) node.addEventListener(type, stop);
  if (keys) node.addEventListener('keydown', e => {
    const v = keys[e.key];
    if (v == null || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault(); step(v, e);
    if (save) save();
  });
}
export function trimNum(v) { const a = Math.abs(v); return v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2); }
export function fmtSI(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && a < 0.01) return v.toExponential(1);
  for (const [s, u] of [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k']]) if (a >= s) return trimNum(v / s) + u;
  return trimNum(v);
}
export function decimalsFor(step) { if (!step || step >= 1) return 0; return Math.min(4, Math.ceil(-Math.log10(step) - 1e-9)); }
export function wrapAngle(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
export const pct = v => (v * 100).toFixed(Math.abs(v) < 0.1 ? 2 : 1) + '%';
