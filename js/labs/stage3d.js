/*
✒ Metadata
    - Title: Stage Camera for the 3D Mode (digiSpace Edition - v2.1)
    - File Name: stage3d.js
    - Relative Path: js/labs/stage3d.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: one orbit camera and one plane mapping for every lab
      that simulates on a plane.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into a lab by the registry. A lab declares where its simulation
    plane stands with `rig3`, and gets the whole 3D camera contract: orbit,
    pan, dolly toward the cursor, frame, axis snaps, projection and picking.
    Pointer tools keep working unchanged, because a click is carried by a ray
    onto the plane and arrives in the lab's own world coordinates.

✒ Key Features:
    - plane3() maps world (x, y) to the scene: a floor, a wall, or any tilt.
    - pick3() is a ray and plane intersection, so tools work from any angle.
    - project3() takes a world point to stage pixels for screen overlays.
    - The long side of every world is 10 scene units, so lights and materials
      read the same in every lab and at every window size.
    - The camera keeps above the floor and frames the plane at any aspect.
    - The orbit pivot stays on the apparatus: zooming in follows the cursor,
      zooming out retraces home, and a resize keeps the user's angle.
    - Dragging the empty space around the apparatus orbits.

✒ Usage Instructions:
    rig3: { plane: 'floor' | 'wall', yaw, pitch, fit, height }
    tilt3() optionally returns the plane's angle from horizontal in radians.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { FOV3, m4look, m4mul, m4persp } from '../core/math3d.js';
import { TAU, clamp, reduceMotion, wrapAngle } from '../core/util.js';
import { view } from '../core/view.js';
import { worldOf } from '../shell/camera.js';
import { in3D } from '../shell/mode.js';

export const UNIT = 10;
const NEAR = 0.04, FAR = 700, FLOOR_CLEARANCE = 0.14;

export const stage3d = {
  cam3: null, view3: null,
  is3D() { return in3D(this); },
  /* The simulation plane in the scene: world (x, y) = o + u·(x - cx)·k + v·(y - cy)·k, lifted along n. */
  plane3() {
    const W = worldOf(this), R = this.rig3, k = UNIT / Math.max(W.w, W.h), wall = R.plane === 'wall';
    const a = this.tilt3 ? this.tilt3() : wall ? Math.PI / 2 : 0, s = Math.sin(a), c = Math.cos(a);
    const y0 = wall ? W.h * k / 2 + (R.height ?? 0.34) : R.height ?? 0;
    return { k, cx: W.w / 2, cy: W.h / 2, hw: W.w * k / 2, hh: W.h * k / 2, o: [0, y0, 0], u: [1, 0, 0], v: [0, -s, c], n: [0, c, s], a };
  },
  to3(x, y, lift = 0, P = this.plane3()) {
    const dx = (x - P.cx) * P.k, dy = (y - P.cy) * P.k;
    return [P.o[0] + P.u[0] * dx + P.v[0] * dy + P.n[0] * lift, P.o[1] + P.u[1] * dx + P.v[1] * dy + P.n[1] * lift, P.o[2] + P.u[2] * dx + P.v[2] * dy + P.n[2] * lift];
  },
  /* Distance at which the whole plane fits the stage. */
  dist0() {
    const P = this.plane3(), t = Math.tan(FOV3 / 2), a = view.w / Math.max(1, view.h);
    return Math.max(P.hh / t, P.hw / (t * a)) * (this.rig3.fit ?? 1.2);
  },
  home3() {
    const P = this.plane3(), R = this.rig3, T = R.target || [0, 0, 0];
    return { yaw: R.yaw ?? 0.45, pitch: R.pitch ?? (R.plane === 'wall' ? 0.16 : 0.72), dist: this.dist0(), tx: P.o[0] + T[0], ty: P.o[1] + T[1], tz: P.o[2] + T[2] };
  },
  /* A new world re-frames the view; a new stage size only rescales it, so the user keeps their angle. */
  c3() {
    const W = worldOf(this), key = `${W.w}x${W.h}`, D = this.dist0();
    if (!this.cam3 || this.cam3.key !== key) {
      const H = this.home3();
      this.cam3 = { ...H, yawT: H.yaw, pitchT: H.pitch, distT: H.dist, txT: H.tx, tyT: H.ty, tzT: H.tz, key, d0: D };
    } else if (this.cam3.d0 !== D) {
      const r = D / this.cam3.d0;
      this.cam3.dist *= r; this.cam3.distT *= r; this.cam3.d0 = D;
    }
    return this.cam3;
  },
  /* Keep the orbit pivot on the apparatus: past its edges an orbit swings the whole scene off the stage. */
  clampTarget(c) {
    const H = this.home3(), P = this.plane3(), r = [c.txT - H.tx, c.tyT - H.ty, c.tzT - H.tz];
    const ru = clamp(r[0] * P.u[0] + r[1] * P.u[1] + r[2] * P.u[2], -P.hw, P.hw), rv = clamp(r[0] * P.v[0] + r[1] * P.v[1] + r[2] * P.v[2], -P.hh, P.hh);
    const rn = clamp(r[0] * P.n[0] + r[1] * P.n[1] + r[2] * P.n[2], -0.2, 1);
    c.txT = H.tx + P.u[0] * ru + P.v[0] * rv + P.n[0] * rn;
    c.tyT = Math.max(0.05, H.ty + P.u[1] * ru + P.v[1] * rv + P.n[1] * rn);
    c.tzT = H.tz + P.u[2] * ru + P.v[2] * rv + P.n[2] * rn;
  },
  camMatrices(w, h) {
    const c = this.c3(), cp = Math.cos(c.pitch);
    const e = [c.tx + c.dist * cp * Math.sin(c.yaw), c.ty + c.dist * Math.sin(c.pitch), c.tz + c.dist * cp * Math.cos(c.yaw)];
    const V = m4look(e, [c.tx, c.ty, c.tz], [0, 1, 0]), P = m4persp(FOV3, w / Math.max(1, h), NEAR, FAR);
    return { mvp: m4mul(P, V.m), eye: e, r: V.r, u: V.u, f: V.f, w, h, fovDeg: FOV3 * 180 / Math.PI, near: NEAR, far: FAR };
  },
  basis3() { return this.view3 || (this.view3 = this.camMatrices(view.w, view.h)); },
  /* Scene point to stage pixels, or null behind the camera. */
  projectScene(X, Y, Z) {
    const V = this.basis3(), m = V.mvp;
    const cx = m[0] * X + m[4] * Y + m[8] * Z + m[12], cy = m[1] * X + m[5] * Y + m[9] * Z + m[13], cw = m[3] * X + m[7] * Y + m[11] * Z + m[15];
    return cw > 1e-6 ? { x: (cx / cw + 1) * 0.5 * V.w, y: (1 - cy / cw) * 0.5 * V.h, w: cw } : null;
  },
  /* World point (optionally lifted off the plane) to stage pixels. */
  project3(x, y, lift = 0) { const p = this.to3(x, y, lift); return this.projectScene(p[0], p[1], p[2]); },
  /* World length to stage pixels at a projected point. */
  scale3(s) { return (this.basis3().h / (2 * Math.tan(FOV3 / 2) * s.w)) * this.plane3().k; },
  rayHit(s) {
    const V = this.basis3(), P = this.plane3(), t = Math.tan(FOV3 / 2), a = V.w / Math.max(1, V.h);
    const nx = (2 * s.x / V.w - 1) * t * a, ny = (1 - 2 * s.y / V.h) * t;
    const d = [V.f[0] + V.r[0] * nx + V.u[0] * ny, V.f[1] + V.r[1] * nx + V.u[1] * ny, V.f[2] + V.r[2] * nx + V.u[2] * ny];
    const dn = d[0] * P.n[0] + d[1] * P.n[1] + d[2] * P.n[2];
    if (Math.abs(dn) < 1e-5) return null;
    const q = (((P.o[0] - V.eye[0]) * P.n[0] + (P.o[1] - V.eye[1]) * P.n[1] + (P.o[2] - V.eye[2]) * P.n[2])) / dn;
    return q > 0 ? { p: [V.eye[0] + d[0] * q, V.eye[1] + d[1] * q, V.eye[2] + d[2] * q], P } : null;
  },
  /* Stage pixel to the world point under it on the simulation plane. */
  pick3(s) {
    const hit = this.rayHit(s); if (!hit) return null;
    const { p, P } = hit, r = [p[0] - P.o[0], p[1] - P.o[1], p[2] - P.o[2]];
    return { x: (r[0] * P.u[0] + r[1] * P.u[1] + r[2] * P.u[2]) / P.k + P.cx, y: (r[0] * P.v[0] + r[1] * P.v[1] + r[2] * P.v[2]) / P.k + P.cy };
  },
  pitchFloor(c) {
    const low = Math.asin(clamp((FLOOR_CLEARANCE - c.ty) / Math.max(c.dist, 1e-3), -1, 1));
    return Math.max(this.rig3.pitchMin ?? (this.rig3.plane === 'wall' ? -0.25 : 0.08), low);
  },
  orbit3(dx, dy) {
    const c = this.c3(), yawMax = this.rig3.yawMax;
    c.yawT -= dx * 0.008;
    if (yawMax != null) c.yawT = clamp(c.yawT, -yawMax, yawMax);
    c.yaw = c.yawT;
    c.pitch = c.pitchT = clamp(c.pitchT + dy * 0.006, this.pitchFloor(c), this.rig3.pitchMax ?? 1.553);
  },
  /* Slide the plane under the pointer: the point held at the stage centre follows the drag one to one. */
  pan3(dx, dy) {
    const c = this.c3(), a = this.rayHit({ x: view.w / 2, y: view.h / 2 }), b = this.rayHit({ x: view.w / 2 - dx, y: view.h / 2 - dy });
    if (!a || !b) return;
    c.txT = c.tx + b.p[0] - a.p[0]; c.tyT = c.ty + b.p[1] - a.p[1]; c.tzT = c.tz + b.p[2] - a.p[2];
    this.clampTarget(c);
    c.tx = c.txT; c.ty = c.tyT; c.tz = c.tzT;
    if (this.onUserPan) this.onUserPan();
  },
  /* In: dolly toward the cursor. Out: retrace toward the home framing, reached by 100%, so zooming out always recovers the view. */
  zoom3(f, s, instant) {
    const c = this.c3(), H = this.home3(), D0 = H.dist, nd = clamp(c.distT / f, D0 * 0.14, D0 * 3.2);
    let aim = null, k = 0;
    if (nd < c.distT) { const hit = s ? this.rayHit(s) : null; if (hit) { aim = hit.p; k = 1 - nd / c.distT; } }
    else if (c.distT < D0) { aim = [H.tx, H.ty, H.tz]; k = clamp((nd - c.distT) / (D0 - c.distT), 0, 1); }
    if (aim) { c.txT += (aim[0] - c.txT) * k; c.tyT += (aim[1] - c.tyT) * k; c.tzT += (aim[2] - c.tzT) * k; this.clampTarget(c); }
    c.distT = nd;
    if (instant || reduceMotion) { c.dist = c.distT; c.tx = c.txT; c.ty = c.tyT; c.tz = c.tzT; }
  },
  actual3() { const c = this.c3(), H = this.home3(); Object.assign(c, { distT: H.dist, txT: H.tx, tyT: H.ty, tzT: H.tz }); },
  /* True for a stage pixel off the apparatus, where a left-drag has nothing to act on and orbits instead. */
  offStage3(s) {
    const hit = this.rayHit(s); if (!hit) return true;
    const { p, P } = hit, r = [p[0] - P.o[0], p[1] - P.o[1], p[2] - P.o[2]];
    return Math.abs(r[0] * P.u[0] + r[1] * P.u[1] + r[2] * P.u[2]) > P.hw + 0.25 || Math.abs(r[0] * P.v[0] + r[1] * P.v[1] + r[2] * P.v[2]) > P.hh + 0.25;
  },
  zoomPct3() { return this.dist0() / this.c3().dist * 100; },
  frame3(instant) {
    const c = this.c3(), H = this.home3();
    Object.assign(c, { yawT: c.yaw + wrapAngle(H.yaw - c.yaw), pitchT: H.pitch, distT: H.dist, txT: H.tx, tyT: H.ty, tzT: H.tz });
    if (instant) Object.assign(c, { yaw: c.yawT, pitch: c.pitchT, dist: c.distT, tx: c.txT, ty: c.tyT, tz: c.tzT });
  },
  /* Look along an axis. 'z' looks straight down the plane's normal, which is the 2D layout seen in depth. */
  snap3(id) {
    const c = this.c3(), P = this.plane3(), S = { x: Math.PI / 2, '-x': -Math.PI / 2, y: Math.PI, '-y': 0 };
    if (id === 'z') { c.yawT = Math.round(c.yaw / TAU) * TAU; c.pitchT = Math.min(1.553, Math.PI / 2 - P.a + (P.a > 0.01 ? 0.02 : 0)); return; }
    if (!(id in S)) return;
    const yawMax = this.rig3.yawMax, yaw = yawMax != null ? clamp(S[id], -yawMax, yawMax) : S[id];
    c.yawT = c.yaw + wrapAngle(yaw - c.yaw); c.pitchT = Math.max(0.08, this.pitchFloor(c));
  },
  tick3(real) {
    const c = this.c3(), k = reduceMotion ? 1 : 1 - Math.exp(-real * 10);
    c.yaw += wrapAngle(c.yawT - c.yaw) * k;
    const low = this.pitchFloor(c);
    if (c.pitchT < low) c.pitchT = low;
    c.pitch += (c.pitchT - c.pitch) * k;
    c.dist *= Math.pow(c.distT / c.dist, k);
    c.tx += (c.txT - c.tx) * k; c.ty += (c.tyT - c.ty) * k; c.tz += (c.tzT - c.tz) * k;
  },
};
/* Give a lab the camera; anything it already defines stays its own. */
export function mixStage3D(lab) { for (const [k, v] of Object.entries(stage3d)) if (!(k in lab)) lab[k] = v; }
