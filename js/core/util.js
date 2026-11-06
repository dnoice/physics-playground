/*
✒ Metadata
    - Title: Core Utilities (digiSpace Edition - v2.0)
    - File Name: util.js
    - Relative Path: js/core/util.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Small helpers shared by every module: maths constants, clamping, DOM
    building, number formatting and a guarded local-storage wrapper.

✒ Key Features:
    - el(tag, attrs, ...kids) builds DOM nodes with text, html, attributes
      and listeners.
    - store.get/set wraps localStorage and survives browsers that block it.
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
