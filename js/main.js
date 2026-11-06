/*
✒ Metadata
    - Title: Boot Sequence (digiSpace Edition - v2.1)
    - File Name: main.js
    - Relative Path: js/main.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Starts
      the mode module and reopens the last lab.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 as the boot sequence of the module split Dennis asked for.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Entry module. Imports the lab registry first so every lab object exists,
    then runs each shell module's init() in a fixed order and starts the
    frame loop on the remembered lab.

✒ Key Features:
    - One place that decides start-up order; no module wires itself on
      import.
    - Restores the last lab, theme and workspace mode from local storage
      before the first frame.
    - Opens the artifact library after the stage is live, so storage never
      delays the first draw.

✒ Usage Instructions:
    Loaded by index.html as <script type="module" src="js/main.js">.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { labs, labsById } from './labs/index.js';
import { readTheme } from './core/color.js';
import { clamp, store } from './core/util.js';
import { updateCaptureUI } from './shell/capture.js';
import { buildCaptureSettings, buildLibraryFilter } from './shell/library.js';
import { frame, setLast } from './shell/loop.js';
import { buildOrbit } from './shell/navigator.js';
import { active, measure, state } from './shell/state.js';
import { showSpeed, updatePlay } from './shell/transport.js';
import { init as initLayout } from './shell/layout.js';
import { vault } from './shell/vault.js';
import { init as initDiagnostics } from './shell/diagnostics.js';
import { init as initTransport } from './shell/transport.js';
import { init as initStage } from './shell/stage.js';
import { init as initNavigator } from './shell/navigator.js';
import { init as initLoop } from './shell/loop.js';
import { init as initCapture } from './shell/capture.js';
import { init as initWorkspace } from './shell/workspace.js';
import { init as initAutomation } from './shell/automation.js';
import { init as initDetails } from './shell/details.js';
import { init as initInstruments } from './shell/instruments.js';
import { init as initMode } from './shell/mode.js';
import { selectLab } from './shell/workspace.js';

/* ---------- boot ---------- */
export function start(data) {
  readTheme();
  measure();
  if (data && data.params) for (const l of labs) if (data.params[l.id]) Object.assign(l.p, data.params[l.id]);
  if (data && data.presets) for (const l of labs) if (data.presets[l.id] && l.presets.some(p => p.id === data.presets[l.id])) l.presetId = data.presets[l.id];
  if (data && typeof data.speed === 'number') state.speed = clamp(data.speed, 0.1, 4);
  if (data && typeof data.running === 'boolean') state.running = data.running;
  for (const l of labs) {
    if (!(data && data.params && data.params[l.id])) { const pr = l.presets.find(p => p.id === l.presetId); if (pr && pr.params) Object.assign(l.p, pr.params); }
    l.sceneP = { ...l.p };
  }
  showSpeed(); updatePlay(); buildOrbit();
  buildCaptureSettings(); buildLibraryFilter(); updateCaptureUI();
  const fromHash = location.hash.slice(1), last = (data && data.lab) || store.get('lab');
  selectLab(labsById[fromHash] ? fromHash : labsById[last] ? last : labs[0].id, { silent: true });
  requestAnimationFrame(t => { setLast(t); frame(t); });
  vault.init();
}
export const hot = window.claude && window.claude.hot;

/* Boot: wire every shell module, then start the selected lab. */
function boot() {
  initLayout(); initDiagnostics(); initTransport(); initStage(); initNavigator(); initLoop(); initCapture(); initWorkspace(); initMode(); initInstruments(); initDetails(); initAutomation();
  if (hot && typeof hot.snapshot === 'function') {
    hot.snapshot(() => ({
      lab: active && active.id, running: state.running, speed: state.speed,
      params: Object.fromEntries(labs.map(l => [l.id, { ...l.p }])),
      presets: Object.fromEntries(labs.map(l => [l.id, l.presetId])),
    }));
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start);
  else start((hot && hot.data) || {});
}

boot();
