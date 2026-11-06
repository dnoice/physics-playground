/*
✒ Metadata
    - Title: Shell State (digiSpace Edition - v2.0)
    - File Name: state.js
    - Relative Path: js/shell/state.js
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
    Shared mutable state of the workspace: the stage canvas, the active lab,
    run state, panel bindings, performance counters and the live-region
    announcer.

✒ Key Features:
    - active and pointerIsDown change only through setActive and
      setPointerDown.
    - measure() sizes the stage canvas to its box and the screen density.
    - announce() speaks short status messages to screen readers.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, clamp, reduceMotion, store } from '../core/util.js';
import { view } from '../core/view.js';


export const canvas = $('#stage-canvas'), ctx = canvas.getContext('2d'), stageEl = $('#stage');
export const state = { running: !reduceMotion, speed: clamp(store.get('speed', 1), 0.1, 4) };
export const ui = { sync: new Map(), enable: new Map() };
export const perf = { sim: 0, draw: 0, steps: 0, rate: 1, slow: 0, fps: 60, hist: new Float32Array(120), hsim: new Float32Array(120), hi: 0 };
export const BUDGET_MS = 11;
export let active = null, pointerIsDown = false;
/* The two shared mutable bindings; other modules read them live and change them only through these setters. */
export function setActive(lab) { active = lab; }
export function setPointerDown(v) { pointerIsDown = v; }
export const stickies = [];

export function announce(msg) { const s = $('#sr-status'); s.textContent = ''; requestAnimationFrame(() => { s.textContent = msg; }); }
export function measure() {
  const r = stageEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (w === view.w && h === view.h && dpr === view.dpr) return false;
  view.w = w; view.h = h; view.dpr = dpr;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  return true;
}
