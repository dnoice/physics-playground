/*
✒ Metadata
    - Title: Frame Loop (digiSpace Edition - v2.5)
    - File Name: loop.js
    - Relative Path: js/shell/loop.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — At panel
      rate, the live formulas, the Guide's marks and the Library's capture
      cards refresh with the readings.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The HUD
      clock adds the lab's own time note, so Gravity shows its simulated days
      or years.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Meters
      read the true frame gap, so a slow run reports itself; the frame loop
      drives the automatic graphics tier.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The requestAnimationFrame loop: steps the active lab under a time
    budget, draws it, and updates HUD, panel, diagnostics and experiments at
    their own rates.

✒ Key Features:
    - Fixed-step simulation with an accumulator and a per-frame step cap.
    - Frame-time, simulation and drawing statistics for diagnostics.
    - Experiment checks run four times a second.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $ } from '../core/util.js';
import { is3D, navTick } from './camera.js';
import { dataRec, drawRecOverlay, histBranch, histCapture, sampleData, updateCaptureChips, updateRewind } from './capture.js';
import { drawPerf, evaluateDiagnostics, updatePerfNums } from './diagnostics.js';
import { tickExperiment } from './experiments.js';
import { updateDetails } from './details.js';
import { updateLiveMath } from './livemath.js';
import { syncGuide } from './guide.js';
import { syncLibraryCapture } from './library.js';
import { updateDock } from './dock.js';
import { resizeLab } from './lifecycle.js';
import { updateNav, updateOrbit } from './navigator.js';
import { tickWorld } from './mode.js';
import { drawChart, updateReadouts } from './panel.js';
import { drawStage } from './stage.js';
import { BUDGET_MS, active, measure, perf, stageEl, state } from './state.js';

/* ---------- loop ---------- */
export function advance(lab, simDt, budget = BUDGET_MS) {
  const h = lab.dt(), cap = lab.maxSteps || 32, t0 = performance.now();
  lab._acc += simDt;
  let n = 0, over = false;
  const rec = dataRec.on && dataRec.lab === lab;
  while (lab._acc >= h && n < cap) {
    lab.step(h); lab.t += h; lab._acc -= h; n++;
    if (rec && dataRec.on) sampleData(lab);
    if ((n & 1) === 0 && performance.now() - t0 > budget) { over = true; break; }
  }
  if (n >= cap || over) lab._acc = Math.min(lab._acc, h);
  if (lab.after) lab.after(n * h);
  return n;
}
export let last = performance.now(), uiClock = 0, hudClock = 0, diagClock = 0;
export function setLast(t) { last = t; }
export function frame(now) {
  // `raw` is the true frame gap for the meters; `real` is capped so a stall cannot fast-forward the run.
  const raw = Math.max(0, (now - last) / 1000), real = Math.min(0.05, raw);
  last = now;
  if (raw > 0 && raw < 1) perf.fps += (1 / raw - perf.fps) * 0.05;
  tickWorld(raw);
  if (active) {
    const t0 = performance.now();
    let n = 0;
    const stepping = state.running && !active.holding;
    if (stepping) { histBranch(active); n = advance(active, real * state.speed); if (n) histCapture(active); }
    const t1 = performance.now();
    navTick(real);
    drawStage(active);
    drawRecOverlay();
    if (is3D(active)) updateOrbit();
    const t2 = performance.now();
    perf.sim += ((t1 - t0) - perf.sim) * 0.1; perf.draw += ((t2 - t1) - perf.draw) * 0.1; perf.steps += (n - perf.steps) * 0.1;
    perf.hist[perf.hi] = t2 - t0; perf.hsim[perf.hi] = t1 - t0; perf.hi = (perf.hi + 1) % perf.hist.length;
    if (stepping && raw > 0 && raw < 1) {
      perf.rate += ((n * active.dt()) / raw - perf.rate) * 0.06;
      perf.slow = perf.rate < state.speed * 0.9 ? perf.slow + raw : Math.max(0, perf.slow - raw * 2);
    } else if (!stepping) perf.slow = 0;
    if ((hudClock += real) >= 0.1) {
      hudClock = 0;
      $('#hud-time').textContent = `t = ${active.t.toFixed(2)} s${active.timeNote ? active.timeNote(active.t) : ''}`;
      $('#hud-fps').textContent = `${Math.round(perf.fps)} fps`;
      updateNav();
    }
    if ((uiClock += real) >= 0.25) { uiClock = 0; updateReadouts(); drawChart(); updateDetails(active); updateLiveMath(active); syncGuide(); syncLibraryCapture(); drawPerf(); updatePerfNums(); updateCaptureChips(); tickExperiment(); if (stepping) updateRewind(); }
    if ((diagClock += real) >= 0.5) { diagClock = 0; evaluateDiagnostics(); }
  }
  requestAnimationFrame(frame);
}
export let resizeTimer = 0;

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  new ResizeObserver(() => {
    if (!measure()) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (active) { resizeLab(active); updateDock(true); } }, 120);
  }).observe(stageEl);
  document.addEventListener('visibilitychange', () => { last = performance.now(); perf.slow = 0; });
}
