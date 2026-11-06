/*
✒ Metadata
    - Title: Stage Input (digiSpace Edition - v2.1)
    - File Name: stage.js
    - Relative Path: js/shell/stage.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Shift-drag pans in 3D, a cancelled pointer never commits, and the
      stage draws the 3D world.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Draws the active lab under the camera transform and routes pointer
    input: tools, pan, orbit, pinch and wheel.

✒ Key Features:
    - Middle, right or Space-drag pans; right-drag orbits in 3D views.
    - Two-finger pinch zoom and pan on touch screens.
    - Tools receive world coordinates, or screen coordinates for labs that
      ask.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { view } from '../core/view.js';
import { camOf, clampCam, fitCam, is3D, navPan, navZoomBy, toWorld, worldOf } from './camera.js';

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
  if (in3D(lab)) { drawWorld(lab, ctx, view.w, view.h); return; }
  if (lab.selfCam) { lab.draw(ctx, view.w, view.h); return; }
  const c = camOf(lab);
  if (c.fit) Object.assign(c, fitCam(lab)); else clampCam(lab);
  const W = worldOf(lab), z = c.z, ox = Math.round((view.w / 2 - c.x * z) * d) / d, oy = Math.round((view.h / 2 - c.y * z) * d) / d;
  if (ox > 0.5 || oy > 0.5 || ox + W.w * z < view.w - 0.5 || oy + W.h * z < view.h - 0.5) drawVoid(ctx, ox, oy, W.w * z, W.h * z, z);
  ctx.setTransform(d * z, 0, 0, d * z, d * ox, d * oy);
  lab.draw(ctx, W.w, W.h);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (lab.drawScreen) lab.drawScreen(ctx, view.w, view.h);
}

/* ---------- pointer: tools, pan, orbit, pinch ---------- */
export const ptr = { ids: new Map(), drag: null, pinch: null, space: false, spaceUsed: false, panMode: false, last: null };
export const ptrPos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
export const labPoint = (lab, s) => (lab.screenInput ? s : toWorld(lab, s));
export function cursorFor(s) {
  if (ptr.drag) return ptr.drag.mode === 'orbit' ? 'move' : 'grabbing';
  if (ptr.space || ptr.panMode || (active.wantsPan && active.wantsPan({ button: 0 }))) return 'grab';
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
  const p = labPoint(active, ptrPos(e)) || active.hover || { x: 0, y: 0 };
  if (active.pointerUp) active.pointerUp(p, e);
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
    else if (b === 0 && (ptr.space || ptr.panMode || (active.wantsPan && active.wantsPan(e)))) mode = three && ptr.space && !ptr.panMode && !e.shiftKey ? 'orbit' : 'pan';
    if (mode) { ptr.drag = { mode, id: e.pointerId, x: s.x, y: s.y }; if (ptr.space) ptr.spaceUsed = true; canvas.style.cursor = cursorFor(s); return; }
    const p = labPoint(active, s);
    if (!p) return;
    setPointerDown(true); active.hover = p;
    if (active.pointerDown) active.pointerDown(p, e);
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
    const p = labPoint(active, s);
    active.hover = p;
    if (p && active.pointerMove) active.pointerMove(p, e, pointerIsDown);
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
    navZoomBy(Math.exp(-e.deltaY * k * (e.ctrlKey ? 0.01 : 0.0015)), ptrPos(e));
  }, { passive: false });
}
