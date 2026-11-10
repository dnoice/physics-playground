/*
✒ Metadata
    - Title: View Camera (digiSpace Edition - v2.7)
    - File Name: camera.js
    - Relative Path: js/shell/camera.js
    - Artifact Type: javascript
    - Version: 2.7.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — toScreen()
      takes a point of a lab drawn by the stage camera to stage pixels, for
      the head-up display's target box.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Zoom
      limits moved onto each lab.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file; v2.0 adds the Fields lab's zoom range.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Shared 2D camera for every box lab (zoom at the cursor, pan, frame,
    eased motion) and the dispatch to each lab's 3D camera.

✒ Key Features:
    - World-to-screen transform with clamped zoom ranges per lab.
    - Eased zoom and pan toward an anchor; frame fits the world.
    - Labs with their own camera (gravity) or a 3D view plug in through
      hooks.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { clamp, reduceMotion } from '../core/util.js';
import { view } from '../core/view.js';





import { active } from './state.js';

/* ---------- view camera: zoom, pan and orbit for every lab ----------
   Box labs (collisions, fluid, waves, chaos, cloth) are drawn under a world
   transform; cam.x/y is the world point at the stage centre, cam.z the
   screen px per world px, and cam.fit keeps the whole box in view. Gravity
   keeps its own camera fields and draws in screen space (selfCam). The
   3D mode brings the plane camera from labs/stage3d.js (is3D). */
export const is3D = lab => !!(lab && lab.is3D && lab.is3D());
export const zoomRange = lab => lab.zoomRange || [0.5, 8];
export function worldOf(lab) { return lab.worldRect ? lab.worldRect() : { w: lab.size.w || view.w, h: lab.size.h || view.h }; }
export function camOf(lab) { const c = lab.cam || (lab.cam = { x: 0, y: 0, z: 1, fit: true }); if (c.z == null) c.z = 1; return c; }
export function fitCam(lab) {
  const W = worldOf(lab);
  let z = Math.min(view.w / W.w, view.h / W.h);
  if (Math.abs(z - 1) < 0.04) z = 1;
  return { x: W.w / 2, y: W.h / 2, z };
}
export function camXf(lab) { const c = camOf(lab); return { z: c.z, ox: view.w / 2 - c.x * c.z, oy: view.h / 2 - c.y * c.z }; }
/* A point of a lab drawn by the stage camera (2D) to stage pixels, with the zoom, for the head-up display. */
export function toScreen(lab, x, y) { const { z, ox, oy } = camXf(lab); return { x: x * z + ox, y: y * z + oy, z }; }
export function toWorld(lab, s) {
  if (is3D(lab)) return lab.pick3(s);
  const { z, ox, oy } = camXf(lab);
  return { x: (s.x - ox) / z, y: (s.y - oy) / z };
}
export function clampCam(lab) {
  const c = camOf(lab), [lo, hi] = zoomRange(lab);
  c.z = clamp(c.z, lo, hi);
  if (!lab.selfCam) { const W = worldOf(lab); c.x = clamp(c.x, 0, W.w); c.y = clamp(c.y, 0, W.h); }
}
export function unfit(lab) { const c = camOf(lab); if (c.fit && !lab.selfCam) Object.assign(c, fitCam(lab)); c.fit = false; return c; }
export const navAnim = { lab: null, z: 1, anchor: null, wx: 0, wy: 0, cx: null, cy: null, done: null };
/* Zoom by factor f toward screen point s (stage centre when s is null or the camera is locked to a body). */
export function navZoomBy(f, s, instant) {
  const lab = active; if (!lab) return;
  if (is3D(lab)) { lab.zoom3(f, s, instant); return; }
  const c = unfit(lab), [lo, hi] = zoomRange(lab);
  const zt = clamp((navAnim.lab === lab ? navAnim.z : c.z) * f, lo, hi);
  const locked = !!(lab.camLocked && lab.camLocked()), a = s && !locked ? s : { x: view.w / 2, y: view.h / 2 }, w = toWorld(lab, a);
  Object.assign(navAnim, { lab, z: zt, anchor: locked ? null : a, wx: w.x, wy: w.y, cx: null, cy: null, done: null });
  if (instant || reduceMotion) navStep(1);
}
export function navGo(lab, x, y, z, done) {
  unfit(lab);
  const locked = !!(lab.camLocked && lab.camLocked());
  Object.assign(navAnim, { lab, z: clamp(z, ...zoomRange(lab)), anchor: null, cx: locked ? null : x, cy: locked ? null : y, done: done || null });
  if (reduceMotion) navStep(1);
}
export function navStep(k) {
  const lab = navAnim.lab;
  if (!lab || lab !== active || is3D(lab)) { navAnim.lab = null; return; }
  const c = camOf(lab), zt = navAnim.z;
  c.z = k >= 1 || Math.abs(zt - c.z) < zt * 1e-3 ? zt : c.z * Math.pow(zt / c.z, k);
  if (navAnim.anchor) { c.x = navAnim.wx - (navAnim.anchor.x - view.w / 2) / c.z; c.y = navAnim.wy - (navAnim.anchor.y - view.h / 2) / c.z; }
  let near = true;
  if (navAnim.cx != null) {
    c.x += (navAnim.cx - c.x) * Math.min(1, k); c.y += (navAnim.cy - c.y) * Math.min(1, k);
    near = Math.hypot(navAnim.cx - c.x, navAnim.cy - c.y) * c.z < 0.3;
    if (near) { c.x = navAnim.cx; c.y = navAnim.cy; }
  }
  clampCam(lab);
  if (lab.onCamZoom) lab.onCamZoom();
  if (c.z === zt && near) { const d = navAnim.done; navAnim.lab = null; if (d) d(); }
}
/* Move the view by a screen-space drag (dx, dy): the scene follows the pointer. */
export function navPan(dx, dy) {
  const lab = active; if (!lab || (!dx && !dy)) return;
  if (is3D(lab)) { lab.pan3(dx, dy); return; }
  const c = unfit(lab);
  if (navAnim.lab === lab) { navAnim.wx -= dx / c.z; navAnim.wy -= dy / c.z; navAnim.cx = null; navAnim.done = null; }
  c.x -= dx / c.z; c.y -= dy / c.z;
  if (lab.onUserPan) lab.onUserPan();
  clampCam(lab);
}
export function navCenter(wx, wy) {
  const lab = active; if (!lab || is3D(lab)) return;
  const c = unfit(lab);
  if (navAnim.lab === lab) navAnim.lab = null;
  c.x = wx; c.y = wy;
  if (lab.onUserPan) lab.onUserPan();
  clampCam(lab);
}
export function navFrame() {
  const lab = active; if (!lab) return;
  if (is3D(lab)) { lab.frame3(); return; }
  if (lab.frameView) { const f = lab.frameView(); navGo(lab, f.x, f.y, f.z); return; }
  const f = fitCam(lab);
  navGo(lab, f.x, f.y, f.z, () => { camOf(lab).fit = true; });
}
export function navActual() {
  const lab = active; if (!lab) return;
  if (is3D(lab)) { lab.actual3(); return; }
  const c = unfit(lab);
  navGo(lab, c.x, c.y, 1);
}
export const zoomPct = lab => (is3D(lab) ? lab.zoomPct3() : camOf(lab).z * 100);
export function navTick(real) {
  if (navAnim.lab) navStep(1 - Math.exp(-real * 16));
  if (active && is3D(active) && active.tick3) active.tick3(real);
}
