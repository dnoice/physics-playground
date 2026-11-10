/*
✒ Metadata
    - Title: Gravity 3D View (digiSpace Edition - v2.8)
    - File Name: gravity3d.js
    - Relative Path: js/labs/gravity3d.js
    - Artifact Type: javascript
    - Version: 2.8.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Our Solar
      System in 3D: the first frame reaches Saturn and the zoom out reaches
      the Kuiper belt; bodies keep their own pixel floor; a moon inside its
      planet's disc is hidden and cannot be picked (apart3); the near plane
      follows the camera in to a moon; names in the overlay, and the hover
      readout names the body.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Throws and
      drops in 3D place the body drawn for the throw, random or set, and the
      preview shows its colour and size.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The hover
      and throw labels in 3D give mass and speed in the chosen units.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the gravity lab: the orbit camera, picking on the orbital
    plane, 3D tools and the screen overlay. The world itself is drawn by
    js/render/world/scenes/gravity.js.

✒ Key Features:
    - The same camera contract as every other lab in 3D mode: orbit, dolly
      toward the cursor, pan, frame and axis snaps.
    - Target follows the centre of mass or a tracked body, exactly like the
      flat view.
    - Throw, drop and follow work in 3D by picking on the orbital plane and
      hit-testing projected bodies.
    - Real-sized worlds: each body is drawn and picked at its own radius above
      its pixel floor, a moon waits inside its planet's disc until the camera
      draws them apart, and the near plane follows the camera in.
    - Names of named bodies in the overlay, ranked so a moon's never covers
      its planet's.
    - Gravity is really three-dimensional, so unlike the plane labs it keeps
      its own camera.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { brushRing } from '../core/draw.js';
import { FOV3, m4look, m4mul, m4persp } from '../core/math3d.js';
import { TAU, clamp, reduceMotion, wrapAngle } from '../core/util.js';
import { fmtQ } from '../core/units.js';
import { view } from '../core/view.js';
import { in3D } from '../shell/mode.js';
import { announce } from '../shell/state.js';

/* ================================================================== */
/*  Gravity · 3D mode: camera, picking, tools and overlays             */
/* ================================================================== */
/* Mixed into the gravity lab. Gravity is the one lab simulated in real
   depth, so it keeps this camera rather than the stage rig: it orbits a
   target that follows the centre of mass (or a tracked body) exactly as
   the flat view does, and its units are simulation pixels. Simulation
   (x, y, z) is drawn at three.js (X, Z, Y), so z is height. The orbital
   plane is the horizontal plane through the centre of mass. */
const PITCH3 = 0.62;

export const gravity3d = {
  cam3: null, view3: null,
  is3D() { return in3D(this); },
  com3() {
    let M = 0, x = 0, y = 0, z = 0;
    for (const b of this.bodies) { M += b.m; x += b.m * b.x; y += b.m * b.y; z += b.m * b.z; }
    return M ? { x: x / M, y: y / M, z: z / M } : { x: 0, y: 0, z: 0 };
  },
  tracked3() { return this.track != null ? this.bodies.find(b => b.id === this.track) || null : null; },
  /* Distance at which the whole system fits the stage; the Solar System frames the planets out to Saturn, as the
     flat view does, and zooms out to the Kuiper belt from there. */
  dist0() {
    const c = this.com3(), cap = this.sky ? 1500 : 4000; let R = 120;
    for (const b of this.bodies) { const d = Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z) + b.r; if (d < cap && d > R) R = d; }
    const a = Math.min(1, view.w / Math.max(1, view.h));
    return R * 1.15 / Math.tan(FOV3 / 2) / a;
  },
  c3() {
    if (!this.cam3) { const D = this.dist0(); this.cam3 = { yaw: 0.5, pitch: PITCH3, dist: D, tx: 0, ty: 0, tz: 0, yawT: 0.5, pitchT: PITCH3, distT: D, txT: 0, tyT: 0, tzT: 0 }; }
    return this.cam3;
  },
  camMatrices(w, h) {
    // A real moon is a few thousandths of a pixel across, so the Solar System's near plane follows the camera in.
    const c = this.c3(), cp = Math.cos(c.pitch), near = Math.max(this.sky ? 1e-7 : 0.05, c.dist * 0.004), far = c.dist * 40 + 2e4;
    const e = [c.tx + c.dist * cp * Math.sin(c.yaw), c.ty + c.dist * Math.sin(c.pitch), c.tz + c.dist * cp * Math.cos(c.yaw)];
    const V = m4look(e, [c.tx, c.ty, c.tz], [0, 1, 0]), P = m4persp(FOV3, w / Math.max(1, h), near, far);
    return { mvp: m4mul(P, V.m), eye: e, r: V.r, u: V.u, f: V.f, w, h, fovDeg: FOV3 * 180 / Math.PI, near, far };
  },
  basis3() { return this.view3 || (this.view3 = this.camMatrices(view.w, view.h)); },
  /* Simulation point to stage pixels, or null behind the camera. */
  project3(x, y, z) {
    const V = this.basis3(), m = V.mvp, X = x, Y = z, Z = y;
    const cx = m[0] * X + m[4] * Y + m[8] * Z + m[12], cy = m[1] * X + m[5] * Y + m[9] * Z + m[13], cw = m[3] * X + m[7] * Y + m[11] * Z + m[15];
    return cw > 1e-6 ? { x: (cx / cw + 1) * 0.5 * V.w, y: (1 - cy / cw) * 0.5 * V.h, w: cw } : null;
  },
  /* World length to stage pixels at a projected point. */
  scale3(s) { return this.basis3().h / (2 * Math.tan(FOV3 / 2) * s.w); },
  /* A body's radius on the stage, with the same floor the scene draws it at: a real world's own, else the stars' and
     planets'. */
  radius3(b, s) { return Math.max(b.px || (b.m >= this.STAR_MASS ? 4 : 2.6), b.r * this.scale3(s)); },
  /* Whether a moon is drawn apart from its planet on the stage (the flat view's apart() in 3D); a body without a
     host, or behind the camera, always is. */
  apart3(b, s = this.project3(b.x, b.y, b.z)) {
    if (!b.host || !s) return true;
    const h = this.project3(b.host.x, b.host.y, b.host.z);
    return !h || Math.hypot(s.x - h.x, s.y - h.y) >= this.radius3(b.host, h) + this.radius3(b, s);
  },
  /* Stage pixel to the point on the orbital plane. */
  pick3(s) {
    const V = this.basis3(), c = this.c3(), t = Math.tan(FOV3 / 2), a = V.w / Math.max(1, V.h), z0 = this.com3().z;
    const nx = (2 * s.x / V.w - 1) * t * a, ny = (1 - 2 * s.y / V.h) * t;
    const d = [V.f[0] + V.r[0] * nx + V.u[0] * ny, V.f[1] + V.r[1] * nx + V.u[1] * ny, V.f[2] + V.r[2] * nx + V.u[2] * ny];
    if (Math.abs(d[1]) < 1e-5) return null;
    const k = (z0 - V.eye[1]) / d[1]; if (k <= 0 || k > c.dist * 8 + 2000) return null;
    return { x: V.eye[0] + d[0] * k, y: V.eye[2] + d[2] * k, z: z0 };
  },
  orbit3(dx, dy) { const c = this.c3(); c.yaw = c.yawT = c.yawT - dx * 0.008; c.pitch = c.pitchT = clamp(c.pitchT + dy * 0.006, -1.45, 1.553); },
  pan3(dx, dy) {
    this.onUserPan();
    const c = this.c3(), k = 2 * c.dist * Math.tan(FOV3 / 2) / Math.max(1, view.h), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), sp = Math.max(0.35, Math.abs(Math.sin(c.pitch)));
    c.tx += -cy * dx * k - sy * dy * k / sp; c.tz += sy * dx * k - cy * dy * k / sp; c.txT = c.tx; c.tzT = c.tz;
    this.cam.x = c.tx; this.cam.y = c.tz;
  },
  zoom3(f, s, instant) {
    // A tracked body may fill the stage; the free camera stops at a fraction of the system.
    const c = this.c3(), D0 = this.dist0(), tb = this.tracked3(), nd = clamp(c.distT / f, tb ? Math.min(tb.r * 2.5, D0 * 0.04) : D0 * 0.04, D0 * (this.sky ? 12 : 6));
    if (s && !this.camLocked()) { const p = this.pick3(s); if (p) { const k = 1 - nd / c.distT; c.txT += (p.x - c.txT) * k; c.tzT += (p.y - c.tzT) * k; } }
    c.distT = nd;
    if (instant || reduceMotion) { c.dist = c.distT; c.tx = c.txT; c.tz = c.tzT; }
  },
  actual3() { this.c3().distT = this.dist0(); },
  zoomPct3() { return this.dist0() / this.c3().dist * 100; },
  frame3(instant) {
    const c = this.c3(), m = this.com3();
    Object.assign(c, { yawT: c.yaw, pitchT: PITCH3, distT: this.dist0(), txT: m.x, tyT: m.z, tzT: m.y });
    if (instant) Object.assign(c, { pitch: c.pitchT, dist: c.distT, tx: c.txT, ty: c.tyT, tz: c.tzT });
  },
  snap3(id) {
    const c = this.c3(), S = { x: Math.PI / 2, '-x': -Math.PI / 2, y: Math.PI, '-y': 0 };
    if (id === 'z') { c.yawT = Math.round(c.yaw / TAU) * TAU; c.pitchT = 1.553; return; }
    if (!(id in S)) return;
    c.yawT = c.yaw + wrapAngle(S[id] - c.yaw); c.pitchT = 0.02;
  },
  tick3(real) {
    const c = this.c3(), k = reduceMotion ? 1 : 1 - Math.exp(-real * 10), tb = this.tracked3();
    if (this.track != null && !tb) this.track = null;
    if (this.camLocked()) { const m = tb || this.com3(); c.txT = m.x; c.tyT = m.z; c.tzT = m.y; }
    // Tracking eases in, then sits exactly on the body, so a fast planet holds still under a close camera.
    const kt = tb ? (this.trackEase = Math.min(1, this.trackEase + real * 2.5)) : k;
    c.yaw += wrapAngle(c.yawT - c.yaw) * k; c.pitch += (c.pitchT - c.pitch) * k;
    c.dist *= Math.pow(c.distT / c.dist, k); c.tx += (c.txT - c.tx) * kt; c.ty += (c.tyT - c.ty) * kt; c.tz += (c.tzT - c.tz) * kt;
    this.cam.x = c.tx; this.cam.y = c.tz;
  },
  /* Screen overlay: names, follow ring, hover readout, delete brush and the throw preview. The orbits are drawn in
     the world scene, where planets can hide them. */
  overlay3(g, w, h) {
    const tb = this.tracked3(), a = this.aim, sT = tb && this.project3(tb.x, tb.y, tb.z);
    if (this.p.labels) {
      const names = [];
      for (const b of this.bodies) {
        if (!b.label) continue;
        const s = this.project3(b.x, b.y, b.z); if (!s || s.x < -40 || s.y < -20 || s.x > w + 40 || s.y > h + 20) continue;
        if (this.apart3(b, s)) names.push([b, s.x, s.y, this.radius3(b, s)]);
      }
      this.drawNames(g, names);
    }
    if (sT) {
      g.save(); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3; g.setLineDash([4, 4]); g.lineDashOffset = -performance.now() / 60;
      g.beginPath(); g.arc(sT.x, sT.y, this.radius3(tb, sT) + 8, 0, TAU); g.stroke(); g.restore();
    }
    if (this.hover && !a) {
      const b = this.bodyAt3(this.hover, 12), s = b && this.project3(b.x, b.y, b.z);
      if (s) {
        const R = this.radius3(b, s) + 5, label = this.hoverText(b);
        g.strokeStyle = this.p.tool === 'erase' ? THEME.crit : THEME.text; g.lineWidth = 1.2;
        g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.stroke();
        g.font = `400 11px ${THEME.mono}`; const tw = g.measureText(label).width;
        const lx = clamp(s.x + R + 6, 4, w - tw - 14), ly = clamp(s.y - R - 6, 16, h - 6);
        g.fillStyle = 'rgba(10,14,20,0.82)'; g.fillRect(lx - 5, ly - 13, tw + 10, 18);
        g.fillStyle = THEME.text; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(label, lx, ly);
      }
    }
    if (this.p.tool === 'erase' && this.hover) brushRing(g, this.hover, 14, THEME.crit);
    if (a && a.moved) this.aimOverlay3(g, a);
  },
  /* The throw: the same dashed five-second preview as the flat view, carried over the orbital plane. */
  aimOverlay3(g, a) {
    const A = this.pick3({ x: a.sx, y: a.sy }), B = this.pick3({ x: a.x, y: a.y });
    if (A && B) {
      const vx = (B.x - A.x) * this.LAUNCH_K, vy = (B.y - A.y) * this.LAUNCH_K, zs = [], path = this.predict(A.x, A.y, vx, vy, A.z, zs);
      g.setLineDash([4, 5]); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3;
      g.beginPath();
      let on = false;
      for (let i = 0; i < zs.length; i++) { const s = this.project3(path[i * 2], path[i * 2 + 1], zs[i]); if (!s) { on = false; continue; } if (on) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); on = true; }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      const s0 = this.project3(A.x, A.y, A.z);
      if (s0) { const look = this.nextLook(); g.fillStyle = look.css; g.beginPath(); g.arc(a.sx, a.sy, Math.max(2, look.r * this.scale3(s0)), 0, TAU); g.fill(); }
      g.font = `400 11px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillText(fmtQ(this, 'speed', Math.hypot(vx, vy)), a.x + 10, a.y - 6);
    }
    g.strokeStyle = A && B ? THEME.text : THEME.crit; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(a.x, a.y); g.stroke();
    const ang = Math.atan2(a.y - a.sy, a.x - a.sx);
    g.fillStyle = g.strokeStyle; g.beginPath();
    g.moveTo(a.x, a.y); g.lineTo(a.x - 9 * Math.cos(ang - 0.4), a.y - 9 * Math.sin(ang - 0.4)); g.lineTo(a.x - 9 * Math.cos(ang + 0.4), a.y - 9 * Math.sin(ang + 0.4)); g.fill();
  },
  /* Pointer tools in 3D: pick on the orbital plane, hit-test projected bodies. */
  bodyAt3(p, slack = 8) {
    let best = null, bd = Infinity;
    for (const b of this.bodies) {
      const s = this.project3(b.x, b.y, b.z); if (!s || !this.apart3(b, s)) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y) - this.radius3(b, s);
      if (d < bd) { bd = d; best = b; }
    }
    return bd < slack ? best : null;
  },
  eraseAt3(p) {
    const before = this.bodies.length;
    this.bodies = this.bodies.filter(b => { const s = this.project3(b.x, b.y, b.z); return !s || !this.apart3(b, s) || Math.hypot(s.x - p.x, s.y - p.y) > Math.max(14, this.radius3(b, s) + 6); });
    if (this.bodies.length !== before) { this.accDirty = true; this.E0 = this.energy(); }
  },
  pointerUp3(a, nb = this.drawNew()) {
    if (!a.moved) {
      const hit = this.bodyAt3({ x: a.sx, y: a.sy });
      if (hit) { this.followBody(hit); return; }
      const w = this.pick3({ x: a.sx, y: a.sy });
      if (w) this.dropOrbit(w.x, w.y, w.z, nb); else announce('Aim at the orbital plane to drop a body.');
      return;
    }
    const A = this.pick3({ x: a.sx, y: a.sy }), B = this.pick3({ x: a.x, y: a.y });
    if (!A || !B) { announce('Aim at the orbital plane to throw a body.'); return; }
    this.addBody(this.body(A.x, A.y, (B.x - A.x) * this.LAUNCH_K, (B.y - A.y) * this.LAUNCH_K, nb.m, A.z, 0, nb.kind));
  },
};
