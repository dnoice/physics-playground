/*
✒ Metadata
    - Title: Automation Surface (digiSpace Edition - v2.5)
    - File Name: automation.js
    - Relative Path: js/shell/automation.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — view.get()
      reports moving while a zoom, frame or recentre is still easing in, so
      tests can wait for the view to come to rest instead of a fixed time.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      viewMode() for a lab's view and units.get() and units.set() for the unit
      system.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      mode surface; renderer status comes from the lab rather than a
      renderer import.
    Earlier entries: see CHANGELOG.md

✒ Description:
    window.PhysicsPlayground: a small scripting surface for tests and power
    users (labs, play, pause, select, view).

✒ Key Features:
    - Read lab state and drive the transport from the console or a test.
    - view.get/zoomBy/toWorld expose the camera.
    - capture exposes the vault and recorders.

✒ Usage Instructions:
    In the browser console: PhysicsPlayground.select('fields');
    PhysicsPlayground.labs.fields.charges

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/

import { globalInsights } from './diagnostics.js';
import { labsById } from '../labs/index.js';
import { camOf, is3D, navActual, navAnim, navFrame, navPan, navZoomBy, toWorld, zoomPct } from './camera.js';
import { dataRec, hist, histSeek, loadState, rewindStep, saveState, toggleData, toggleVideo, vrec } from './capture.js';
import { selectDock, selectView } from './dock.js';
import { setUnitSystem, unitSystem } from '../core/units.js';
import { applyPreset, setParam } from './lifecycle.js';
import { advance } from './loop.js';
import { ptr } from './stage.js';
import { pickTier, setMode, world } from './mode.js';
import { active, perf, state } from './state.js';
import { pause, play, resetActive, setSpeed, stepOnce } from './transport.js';
import { vault } from './vault.js';
import { selectLab } from './workspace.js';

/* ---------- automation surface ---------- */

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  window.PhysicsPlayground = {
    labs: labsById,
    get active() { return active; },
    state, perf,
    select: id => selectLab(id),
    preset: id => applyPreset(active, id),
    setParam: (key, value) => setParam(active, key, value),
    tool: id => selectDock(id),
    viewMode: id => selectView(id),
    units: { get: () => unitSystem(), set: id => setUnitSystem(id) },
    diagnose: () => [...globalInsights(), ...(active.diagnose ? active.diagnose() : [])].map(({ id, level, title }) => ({ id, level, title })),
    play, pause, step: stepOnce, reset: resetActive, setSpeed,
    advance: seconds => advance(active, seconds, Infinity),
    capture: { toggleVideo, toggleData, saveState, loadState, vault, dataRec, vrec },
    history: { seek: k => histSeek(active, k), size: () => hist(active).snaps.length, back: () => rewindStep(-1) },
    renderer: () => active.renderer || 'cpu',
    mode: { get: () => world.mode, set: setMode, tier: pickTier, world, is3D: () => is3D(active), info: () => world.engine && world.engine.info() },
    view: {
      get() {
        if (is3D(active)) { const c = active.c3(); return { mode: '3d', yaw: c.yaw, pitch: c.pitch, dist: c.dist, tx: c.tx, tz: c.tz, zoom: zoomPct(active) }; }
        // moving: a zoom, frame or recentre is still easing in, so a test can wait for the view to come to rest.
        const c = camOf(active); return { mode: '2d', x: c.x, y: c.y, z: c.z, fit: !!c.fit, zoom: zoomPct(active), panMode: ptr.panMode, moving: navAnim.lab === active };
      },
      zoomBy: (f, x, y) => navZoomBy(f, x == null ? null : { x, y }, true),
      pan: (dx, dy) => navPan(dx, dy), frame: () => navFrame(), actual: () => navActual(),
      toWorld: (x, y) => toWorld(active, { x, y }),
      orbit: (dx, dy) => active.orbit3 && active.orbit3(dx, dy), snap: id => active.snap3 && active.snap3(id),
    },
  };
}
