/*
✒ Metadata
    - Title: Lab Lifecycle (digiSpace Edition - v2.1)
    - File Name: lifecycle.js
    - Relative Path: js/shell/lifecycle.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — A rebuild
      can take a saved world size and tells the running experiment.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds, rebuilds, resizes and re-presets labs, and applies parameter
    changes with their side effects.

✒ Key Features:
    - rebuild() restarts a scene and resets its rewind history and dataset.
    - applyPreset() loads a scene's parameters and announces it.
    - setParam() honours rebuild-on-change controls and refreshes enabled
      states.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/

import { updateStageTitle } from './workspace.js';
import { view } from '../core/view.js';
import { navAnim } from './camera.js';
import { dataRec, histCapture, histReset, stopData, updateRewind } from './capture.js';
import { evaluateDiagnostics } from './diagnostics.js';
import { experimentReset } from './experiments.js';
import { refreshEnabled, syncControl, syncPanel } from './panel.js';
import { active, announce } from './state.js';

export function rebuild(lab, world = view) {
  if (dataRec.on && dataRec.lab === lab) {
    const r = dataRec.rows;
    if (r.length > 1 && r[r.length - 1][0] - r[0][0] >= 1) stopData('The scene restarted, so the dataset so far was saved.');
    else { dataRec.rows = []; dataRec.tracks = []; dataRec.next = 0; }
  }
  lab.t = 0; lab._acc = 0;
  lab.build(lab.presetId, world.w, world.h);
  lab.built = { w: world.w, h: world.h };
  lab.size = { w: view.w, h: view.h };
  histReset(lab); histCapture(lab, true);
  experimentReset(lab);
  if (lab === active) { refreshEnabled(); updateRewind(); }
}
export function ensureReady(lab) {
  if (!lab.ready) { rebuild(lab); lab.ready = true; return; }
  if (lab.size.w !== view.w || lab.size.h !== view.h) resizeLab(lab);
}
export function resizeLab(lab) {
  const ow = lab.size.w, oh = lab.size.h;
  lab.size = { w: view.w, h: view.h };
  if (lab.onResize) lab.onResize(view.w, view.h, ow, oh);
}
export function applyPreset(lab, id) {
  const pr = lab.presets.find(p => p.id === id);
  if (!pr) return;
  lab.presetId = id;
  if (lab.cam && !lab.selfCam) { lab.cam.fit = true; if (navAnim.lab === lab) navAnim.lab = null; }
  Object.assign(lab.p, pr.params || {});
  lab.sceneP = { ...lab.p };
  rebuild(lab);
  if (lab === active) { syncPanel(); updateStageTitle(lab); announce(`${pr.label} loaded`); }
}
export function setParam(lab, key, value) {
  const c = lab.controls.find(k => k.key === key);
  lab.p[key] = value;
  if (lab === active) syncControl(key);
  if (c && c.rebuild) rebuild(lab);
  else if (lab.onParam) lab.onParam(key, value);
  if (lab === active) { refreshEnabled(); evaluateDiagnostics(); }
}
