/*
✒ Metadata
    - Title: Transport and Keys (digiSpace Edition - v2.10)
    - File Name: transport.js
    - Relative Path: js/shell/transport.js
    - Artifact Type: javascript
    - Version: 2.10.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.10.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The + and
      - keys take the lab's zoomPace.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Shift+H
      shows or hides the head-up display, ahead of the tool letters so a lab
      whose tool is H keeps it; Escape also closes the HUD menu; a held H acts
      once.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — V steps
      through the active lab's views and U opens the Units menu; Escape closes
      the Units menu. The diagnostics sheet it used to close is now the deck's
      Insights pane.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Play, pause, step, reset and speed, plus every global keyboard shortcut.

✒ Key Features:
    - Space toggles play unless it is held to pan; period steps; comma
      rewinds.
    - 1–7 switch labs, letters pick tools, F focuses the stage, Shift+B
      hides the bay, ? opens the keys.
    - R resets, M records video, D records data, [ and ] change speed.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, clamp, store } from '../core/util.js';
import { labs } from '../labs/index.js';
import { is3D, navFrame, navPan, navZoomBy, zoomPace } from './camera.js';
import { histBranch, histCapture, rewindStep, toggleData, toggleVideo, updateRewind } from './capture.js';
import { evaluateDiagnostics } from './diagnostics.js';
import { nextView, selectDock } from './dock.js';
import { restart } from './lifecycle.js';
import { advance } from './loop.js';
import { drawChart, rangeMap, updateReadouts } from './panel.js';
import { ptr, refreshCursor } from './stage.js';
import { active, announce, canvas, perf, stageEl, state } from './state.js';
import { selectLab } from './workspace.js';
import { closeSceneMenu, hasBay, isFocus, setBay, setFocus, setKeys } from './layout.js';
import { closeGfx, toggleMode } from './mode.js';
import { closeUnits, setUnits } from './unitmenu.js';
import { closeHudSheet, toggleHud } from './headsup.js';

/* ---------- transport and keys ---------- */
export const speedInput = $('#ctl-speed'), speedMap = rangeMap({ min: 0.1, max: 4, log: true });
export function showSpeed() {
  speedInput.value = speedMap.toS(state.speed);
  const txt = state.speed.toFixed(2) + '×';
  $('#ctl-speed-out').textContent = txt; speedInput.setAttribute('aria-valuetext', txt);
  speedInput.style.setProperty('--fill', `${+speedInput.value / 10}%`);
  $('#speed-reset').hidden = state.speed === 1;
}
export function setSpeed(v) { state.speed = clamp(Number(v.toPrecision(3)), 0.1, 4); if (Math.abs(state.speed - 1) < 0.04) state.speed = 1; showSpeed(); store.set('speed', state.speed); perf.slow = 0; }
export function updatePlay() {
  $('#btn-play-label').textContent = state.running ? 'Pause' : 'Play';
  $('#btn-play-icon').textContent = state.running ? 'pause' : 'play_arrow';
  const pill = $('#hud-state'); pill.dataset.state = state.running ? 'run' : 'pause'; pill.textContent = state.running ? 'Running' : 'Paused';
}
export function play() { histBranch(active); state.running = true; perf.slow = 0; updatePlay(); announce('Running'); }
export function pause() { state.running = false; updatePlay(); announce('Paused'); }
export function togglePlay() { state.running ? pause() : play(); }
export function stepOnce() { if (state.running) pause(); histBranch(active); advance(active, 1 / 60, Infinity); histCapture(active); updateReadouts(); drawChart(); updateRewind(); }
export function resetActive() { restart(active); updateReadouts(); drawChart(); evaluateDiagnostics(); announce(`${active.title} restarted`); }
/* Whether the focused element got focus from a press. A clicked button keeps focus, but Space then
   means play and pause; focus that arrived any other way, by Tab, arrows or from code, keeps Space. */
let pointerFocus = false, pressing = false;
/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  document.addEventListener('pointerdown', () => { pointerFocus = pressing = true; }, true);
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => { pressing = false; }, true);
  document.addEventListener('focusin', () => { if (!pressing) pointerFocus = false; }, true);
  speedInput.parentElement.style.setProperty('--notch', speedMap.toS(1) / 1000);
  speedInput.addEventListener('input', () => setSpeed(speedMap.fromS(+speedInput.value)));
  $('#speed-reset').addEventListener('click', () => { setSpeed(1); speedInput.focus(); });
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-step').addEventListener('click', stepOnce);
  $('#btn-reset').addEventListener('click', resetActive);
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName, typing = tag === 'TEXTAREA' || (tag === 'INPUT' && t.type !== 'range');
    if (typing) return;
    const k = e.key;
    // One action per press: holding a key must not chain clips or flip the layout back and forth.
    if (e.repeat && (/^[rfmdz?]$/i.test(k) || e.code === 'KeyB' || e.code === 'KeyH')) return;
    if (k === ' ' || e.code === 'Space') {
      if (tag === 'BUTTON' && pointerFocus) t.blur();
      else if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A' || tag === 'SUMMARY') return;
      e.preventDefault();
      if (!e.repeat && !ptr.space) { ptr.space = true; ptr.spaceUsed = false; refreshCursor(); }
    } else if (k === '.') { e.preventDefault(); stepOnce(); }
    else if (k === '+' || k === '=') { e.preventDefault(); navZoomBy(1.5 ** zoomPace(), null); }
    else if (k === '-' || k === '_') { e.preventDefault(); navZoomBy(1.5 ** -zoomPace(), null); }
    else if (k === '0') { e.preventDefault(); navFrame(); }
    else if (k.startsWith('Arrow') && (t === document.body || t === canvas || t === stageEl || !t)) {
      e.preventDefault();
      const dx = k === 'ArrowLeft' ? 1 : k === 'ArrowRight' ? -1 : 0, dy = k === 'ArrowUp' ? 1 : k === 'ArrowDown' ? -1 : 0;
      if (is3D(active) && !e.shiftKey) active.orbit3(-dx * 24, -dy * 18); else navPan(dx * 60, dy * 60);
    }
    else if (k === 'r' || k === 'R') resetActive();
    else if (k === 'f' || k === 'F') { setFocus(!isFocus()); announce(isFocus() ? 'Stage focused' : 'Workspace restored'); }
    else if (e.code === 'KeyB' && e.shiftKey) { setBay(!hasBay()); announce(hasBay() ? 'Instruments shown' : 'Instruments hidden'); }
    // Shift+H, ahead of the tool letters, so a lab whose tool is H keeps it on the plain key.
    else if (e.code === 'KeyH' && e.shiftKey) toggleHud();
    else if (k === '?') { e.preventDefault(); setKeys(document.getElementById('keys-sheet').hidden); }
    else if (k === 'z' || k === 'Z') toggleMode();
    else if (k === 'u' || k === 'U') setUnits(document.getElementById('units-sheet').hidden);
    else if (k === 'Escape') { if (closeSceneMenu() || closeGfx() || closeUnits() || closeHudSheet()) return; if (!document.getElementById('keys-sheet').hidden) { setKeys(false); document.getElementById('btn-keys').focus(); } }
    else if (k === ',') { e.preventDefault(); rewindStep(-1); }
    else if (k === 'm' || k === 'M') toggleVideo();
    else if (k === 'd' || k === 'D') toggleData();
    else if (k === '[') setSpeed(state.speed / 2);
    else if (k === ']') setSpeed(state.speed * 2);
    else if (/^[1-9]$/.test(k) && labs[+k - 1]) selectLab(labs[+k - 1].id);
    else if ((k === 'v' || k === 'V') && active && active.views) { e.preventDefault(); nextView(); }
    else if (active && active.dock && k.length === 1) {
      const o = active.dock.options.find(x => x.key === k.toLowerCase());
      if (o) { e.preventDefault(); selectDock(o.id); }
    }
  });
  document.addEventListener('keyup', e => {
    if ((e.key === ' ' || e.code === 'Space') && ptr.space) {
      ptr.space = false;
      if (!ptr.spaceUsed) togglePlay();
      refreshCursor();
    }
  });
  window.addEventListener('blur', () => { if (ptr.space) { ptr.space = false; refreshCursor(); } });
}
