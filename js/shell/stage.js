/*
✒ Metadata
    - Title: Stage Input (digiSpace Edition - v2.19)
    - File Name: stage.js
    - Relative Path: js/shell/stage.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for a select button: with Select on, a press picks through
      the lab's pick() and never reaches its tools, a ring shows what a click
      would take and the tools show no preview; PICK_PX, HIT_PX and LINE_PX
      set how far a press reaches, and a selection a tool makes shows in
      Inspect at once.
    - 2.10.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The wheel
      zoom takes the lab's zoomPace.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Shift-drag pans in 3D, a cancelled pointer never commits, and the
      stage draws the 3D world.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Draws the active lab under the camera transform and routes pointer
    input: tools, the Select tool, pan, orbit, pinch and wheel.

✒ Key Features:
    - Middle, right or Space-drag pans; right-drag orbits in 3D views.
    - Two-finger pinch zoom and pan on touch screens.
    - Tools receive world coordinates, or screen coordinates for labs that
      ask.
    - The Select tool picks with the lab's pick() and never reaches its
      tools; PICK_PX, HIT_PX and LINE_PX set how far a press still takes an
      object or a line.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { TAU } from '../core/util.js';
import { view } from '../core/view.js';
import { camOf, clampCam, fitCam, is3D, navPan, navZoomBy, toWorld, worldOf, zoomPace } from './camera.js';

import { chooseObject, updateDetails } from './details.js';
import { drawWorld, in3D } from './mode.js';
import { updateNav } from './navigator.js';
import { active, canvas, ctx, pointerIsDown, setPointerDown } from './state.js';

/* ---------- staged drawing: void, world transform, screen overlays ---------- */
export function drawVoid(g, x, y, w, h, z) {
  g.fillStyle = '#070a0f'; g.fillRect(0, 0, view.w, view.h);
  const step = 40 * z;
  if (step >= 18) {
    g.fillStyle = 'rgba(143,156,173,0.16)';
    for (let k = Math.ceil(-x / step); x + k * step <= view.w; k++) for (let j = Math.ceil(-y / step); y + j * step <= view.h; j++) g.fillRect(x + k * step - 0.75, y + j * step - 0.75, 1.5, 1.5);
  }
  g.save(); g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 30; g.fillStyle = THEME.ink; g.fillRect(x, y, w, h); g.restore();
  g.strokeStyle = 'rgba(143,156,173,0.28)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}
export function drawStage(lab) {
  const d = view.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (in3D(lab)) { drawWorld(lab, ctx, view.w, view.h); drawPickRing(lab); return; }
  if (lab.selfCam) { lab.draw(ctx, view.w, view.h); drawPickRing(lab); return; }
  const c = camOf(lab);
  if (c.fit) Object.assign(c, fitCam(lab)); else clampCam(lab);
  const W = worldOf(lab), z = c.z, ox = Math.round((view.w / 2 - c.x * z) * d) / d, oy = Math.round((view.h / 2 - c.y * z) * d) / d;
  if (ox > 0.5 || oy > 0.5 || ox + W.w * z < view.w - 0.5 || oy + W.h * z < view.h - 0.5) drawVoid(ctx, ox, oy, W.w * z, W.h * z, z);
  ctx.setTransform(d * z, 0, 0, d * z, d * ox, d * oy);
  lab.draw(ctx, W.w, W.h);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (lab.drawScreen) lab.drawScreen(ctx, view.w, view.h);
  drawPickRing(lab);
}
/* The Select tool's hover, in stage pixels over any view: a ring round what a click would take now, where the lab
   draws it (spot). A lab that rings its own objects, with a tag, says so with pickRing (Gravity). */
function drawPickRing(lab) {
  if (!ptr.selectMode || !ptr.last || ptr.drag || lab.pickRing || !lab.pick || !lab.spot) return;
  const id = lab.pick(ptr.last), t = id == null ? null : lab.spot(id, is3D(lab));
  if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) return;
  ctx.save(); ctx.strokeStyle = THEME.text; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(5, t.r || 0) + 5, 0, TAU); ctx.stroke(); ctx.restore();
}

/* ---------- pointer: tools, pan, orbit, pinch ---------- */
export const ptr = { ids: new Map(), drag: null, pinch: null, space: false, spaceUsed: false, panMode: false, selectMode: false, last: null };
export const ptrPos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
export const labPoint = (lab, s) => (lab.screenInput ? s : toWorld(lab, s));
/* ---------- picking: one reach for the ring and the click ---------- */
/* How far from an object, in stage pixels, a press still takes it: generous for the Select tool, closer for a tool's
   own click, so a click beside a giant can still drop it a moon. A lab's hover ring uses the same reach, so what the
   ring shows is what the click takes. A drawn line (an orbit, a trail) is thin, so it has its own. */
export const PICK_PX = 16, HIT_PX = 10, LINE_PX = 7;
export const pickReach = () => (ptr.selectMode ? PICK_PX : HIT_PX);
/* A stage point as the lab's input point, with k, the lab's own length per stage pixel there, so a lab can hit-test
   in its own units with a reach measured on the screen. Null off the plane in 3D. */
export function pickFrame(lab, s) {
  const p = labPoint(lab, s); if (!p) return null;
  if (lab.screenInput) return { p, k: 1 };
  if (!is3D(lab)) return { p, k: 1 / camOf(lab).z };
  const q = lab.project3(p.x, p.y, 0); return { p, k: q ? 1 / lab.scale3(q) : 1 };
}
/* The Select tool: a press takes the object nearest it, or clears the selection on empty space, and never reaches the
   lab's own tools, so nothing is thrown, dropped, painted or erased. */
export function selectAt(s) { if (active && active.pick) chooseObject(active, active.pick(s)); }
/* A tool's own press or release that changed the selection (a click on a body with Throw, a ball with Grab) shows it
   in Inspect at once, as the Select tool does, rather than at the next panel tick. */
const selNow = () => (active && active.selectedId ? active.selectedId() : null);
function shownIfChanged(had) { if (selNow() !== had) updateDetails(active); }
export function cursorFor(s) {
  if (ptr.drag) return 'grabbing';
  if (is3D(active) && active.offStage3(s)) return 'grab';
  if (ptr.space || ptr.panMode) return 'grab';
  if (ptr.selectMode) return active.pick && active.pick(s) != null ? 'pointer' : 'default';
  const p = labPoint(active, s);
  return (p && active.cursorAt && active.cursorAt(p)) || 'crosshair';
}
export function refreshCursor() { if (ptr.last && !pointerIsDown && active) canvas.style.cursor = cursorFor(ptr.last); }
export function cancelLabPointer() {
  if (!pointerIsDown) return;
  setPointerDown(false);
  if (active.pointerCancel) active.pointerCancel(); else if (active.pointerUp) active.pointerUp(active.hover || { x: 0, y: 0 }, {});
}
export function pinchState() { const [a, b] = [...ptr.ids.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
export function endPointer(e) {
  ptr.ids.delete(e.pointerId);
  if (ptr.pinch) { if (ptr.ids.size < 2) ptr.pinch = null; return; }
  if (ptr.drag && e.pointerId === ptr.drag.id) { ptr.drag = null; canvas.style.cursor = cursorFor(ptrPos(e)); updateNav(); return; }
  if (!pointerIsDown) return;
  setPointerDown(false);
  const p = labPoint(active, ptrPos(e)) || active.hover || { x: 0, y: 0 }, had = selNow();
  if (active.pointerUp) active.pointerUp(p, e);
  shownIfChanged(had);
  canvas.style.cursor = cursorFor(ptrPos(e));
}
/* The browser took the pointer away: drop what it was doing rather than commit it. */
export function cancelPointer(e) {
  ptr.ids.delete(e.pointerId);
  if (ptr.pinch) { if (ptr.ids.size < 2) ptr.pinch = null; return; }
  if (ptr.drag && e.pointerId === ptr.drag.id) { ptr.drag = null; updateNav(); return; }
  cancelLabPointer();
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  canvas.addEventListener('pointerdown', e => {
    if (e.button > 2) return;
    const s = ptrPos(e);
    ptr.ids.set(e.pointerId, s); ptr.last = s;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* capture is best-effort */ }
    if (e.pointerType === 'touch' && ptr.ids.size === 2) { cancelLabPointer(); ptr.drag = null; ptr.pinch = pinchState(); return; }
    if (ptr.ids.size > 1 || ptr.drag) return;
    const three = is3D(active), b = e.button;
    let mode = null;
    if (b === 1 || (b === 2 && !active.rightButton)) mode = three && !e.shiftKey ? 'orbit' : 'pan';
    else if (b === 0 && three && e.shiftKey) mode = 'pan';
    else if (b === 0 && (ptr.space || ptr.panMode)) mode = three && ptr.space && !ptr.panMode && !e.shiftKey ? 'orbit' : 'pan';
    else if (b === 0 && three && active.offStage3(s)) mode = 'orbit';
    if (mode) { ptr.drag = { mode, id: e.pointerId, x: s.x, y: s.y }; if (ptr.space) ptr.spaceUsed = true; canvas.style.cursor = cursorFor(s); return; }
    if (ptr.selectMode) { if (b === 0) selectAt(s); return; }
    const p = labPoint(active, s);
    if (!p) return;
    setPointerDown(true); active.hover = p;
    const had = selNow();
    if (active.pointerDown) active.pointerDown(p, e);
    shownIfChanged(had);
  });
  canvas.addEventListener('pointermove', e => {
    const s = ptrPos(e);
    if (ptr.ids.has(e.pointerId)) ptr.ids.set(e.pointerId, s);
    ptr.last = s;
    if (ptr.pinch) {
      if (ptr.ids.size < 2) return;
      const q = pinchState(), o = ptr.pinch;
      navZoomBy(q.d / o.d, { x: q.mx, y: q.my }, true); navPan(q.mx - o.mx, q.my - o.my);
      ptr.pinch = q; return;
    }
    if (ptr.drag) {
      if (e.pointerId !== ptr.drag.id) return;
      const dx = s.x - ptr.drag.x, dy = s.y - ptr.drag.y;
      ptr.drag.x = s.x; ptr.drag.y = s.y;
      if (ptr.drag.mode === 'orbit') active.orbit3(dx, dy); else navPan(dx, dy);
      return;
    }
    // With Select on, the lab's tools are not under the pointer, so none previews what a click will not do (a brush,
    // a ball to drop); a lab that rings its own picks (pickRing) still reads where the pointer is.
    const p = labPoint(active, s), picking = ptr.selectMode && !pointerIsDown;
    active.hover = picking && !active.pickRing ? null : p;
    if (p && active.pointerMove && !picking) active.pointerMove(p, e, pointerIsDown);
    if (!pointerIsDown) canvas.style.cursor = cursorFor(s);
  });
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('pointerleave', () => { if (!pointerIsDown) active.hover = null; ptr.last = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('auxclick', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.h : 1;
    if (e.shiftKey && !e.ctrlKey) { navPan(-(e.deltaY || e.deltaX) * k, 0); return; }
    navZoomBy(Math.exp(-e.deltaY * k * (e.ctrlKey ? 0.01 : 0.0015) * zoomPace()), ptrPos(e));
  }, { passive: false });
}
