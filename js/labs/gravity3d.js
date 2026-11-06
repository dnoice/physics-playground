/*
✒ Metadata
    - Title: Gravity 3D View (digiSpace Edition - v2.0)
    - File Name: gravity3d.js
    - Relative Path: js/labs/gravity3d.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: the 3D orbit view behind the gravity
      lab's new 3D switch.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the gravity lab: the orbit camera, picking on the orbital
    plane, 3D tools and the compositing of the three.js view onto the stage.

✒ Key Features:
    - Same camera contract as the ripple tank relief: orbit, dolly toward
      the cursor, pan, frame and axis snaps.
    - Target follows the centre of mass or a tracked body, exactly like the
      flat view.
    - Throw, drop and follow work in 3D by picking on the orbital plane and
      hit-testing projected bodies.
    - Loads three.js on demand; if it cannot, the lab says why, disables the
      switch and stays flat.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from '../core/color.js';
import { FOV3, m4look, m4mul, m4persp } from '../core/math3d.js';
import { TAU, clamp, reduceMotion, wrapAngle } from '../core/util.js';
import { view } from '../core/view.js';
import { refreshEnabled, syncControl } from '../shell/panel.js';
import { updateNav } from '../shell/navigator.js';
import { active, announce, canvas } from '../shell/state.js';

/* ================================================================== */
/*  Gravity · 3D orbit view: camera, picking, tools and compositing    */
/* ================================================================== */
/* Mixed into the gravity lab. The camera orbits a target point that
   follows the centre of mass (or a tracked body) exactly as the flat view
   does. three.js is imported only when the view is first switched on; if
   it cannot load, the lab says so and stays in the flat view. Simulation
   (x, y, z) is drawn at three.js (X, Z, Y), so z is height. */
const PITCH3 = 0.62;
let orbitModule = null;

export const gravity3d = {
  gl3: null, loading3: null, fail3: null, cam3: null, view3: null,
  is3D() { return !!(this.p.view3d && this.gl3); },
  /* Start loading the renderer; the flat view keeps drawing until it is ready. */
  ensure3() {
    if (this.gl3 || this.loading3 || this.fail3) return;
    this.loading3 = (orbitModule || import('../render/orbit3d.js'))
      .then(m => { orbitModule = Promise.resolve(m); this.gl3 = m.createOrbitView(this.TRAIL_CAP); this.loading3 = null; this.frame3(true); if (active === this) { refreshEnabled(); updateNav(); } })
      .catch(err => { this.loading3 = null; this.fail3 = String((err && err.message) || err); this.leave3D('The 3D view could not load its library (three.js from the jsDelivr CDN), so the lab stays in the flat view.'); });
  },
  leave3D(msg) {
    if (this.p.view3d) { this.p.view3d = false; syncControl('view3d'); }
    if (msg) announce(msg);
    canvas.style.cursor = 'crosshair';
    if (active === this) { refreshEnabled(); updateNav(); }
  },
  com3() {
    let M = 0, x = 0, y = 0, z = 0;
    for (const b of this.bodies) { M += b.m; x += b.m * b.x; y += b.m * b.y; z += b.m * b.z; }
    return M ? { x: x / M, y: y / M, z: z / M } : { x: 0, y: 0, z: 0 };
  },
  /* Distance at which the whole system fits the stage. */
  dist0() {
    const c = this.com3(); let R = 120;
    for (const b of this.bodies) { const d = Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z) + b.r; if (d < 4000 && d > R) R = d; }
    const a = Math.min(1, view.w / Math.max(1, view.h));
    return R * 1.15 / Math.tan(FOV3 / 2) / a;
  },
  c3() {
    if (!this.cam3) { const D = this.dist0(); this.cam3 = { yaw: 0.5, pitch: PITCH3, dist: D, tx: 0, ty: 0, tz: 0, yawT: 0.5, pitchT: PITCH3, distT: D, txT: 0, tyT: 0, tzT: 0 }; }
    return this.cam3;
  },
  camMatrices(w, h) {
    const c = this.c3(), cp = Math.cos(c.pitch);
    const e = [c.tx + c.dist * cp * Math.sin(c.yaw), c.ty + c.dist * Math.sin(c.pitch), c.tz + c.dist * cp * Math.cos(c.yaw)];
    const V = m4look(e, [c.tx, c.ty, c.tz], [0, 1, 0]), P = m4persp(FOV3, w / Math.max(1, h), Math.max(0.5, c.dist * 0.004), c.dist * 40 + 2e4);
    return { mvp: m4mul(P, V.m), eye: e, r: V.r, u: V.u, f: V.f, w, h, fovDeg: FOV3 * 180 / Math.PI };
  },
  basis3() { return this.view3 || (this.view3 = this.camMatrices(view.w, view.h)); },
  /* Simulation point to stage pixels, or null behind the camera. */
  project3(x, y, z) {
    const V = this.basis3(), m = V.mvp, X = x, Y = z, Z = y;
    const cx = m[0] * X + m[4] * Y + m[8] * Z + m[12], cy = m[1] * X + m[5] * Y + m[9] * Z + m[13], cw = m[3] * X + m[7] * Y + m[11] * Z + m[15];
    return cw > 1e-6 ? { x: (cx / cw + 1) * 0.5 * V.w, y: (1 - cy / cw) * 0.5 * V.h, w: cw } : null;
  },
  /* Stage pixel to the point on the orbital plane through the target. */
  pick3(s) {
    const V = this.basis3(), c = this.c3(), t = Math.tan(FOV3 / 2), a = V.w / Math.max(1, V.h);
    const nx = (2 * s.x / V.w - 1) * t * a, ny = (1 - 2 * s.y / V.h) * t;
    const d = [V.f[0] + V.r[0] * nx + V.u[0] * ny, V.f[1] + V.r[1] * nx + V.u[1] * ny, V.f[2] + V.r[2] * nx + V.u[2] * ny];
    if (Math.abs(d[1]) < 1e-5) return null;
    const k = (c.ty - V.eye[1]) / d[1]; if (k <= 0) return null;
    return { x: V.eye[0] + d[0] * k, y: V.eye[2] + d[2] * k, z: c.ty };
  },
  orbit3(dx, dy) { const c = this.c3(); c.yaw = c.yawT = c.yawT - dx * 0.008; c.pitch = c.pitchT = clamp(c.pitchT + dy * 0.006, -1.45, 1.553); },
  pan3(dx, dy) {
    this.onUserPan();
    const c = this.c3(), k = 2 * c.dist * Math.tan(FOV3 / 2) / Math.max(1, view.h), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), sp = Math.max(0.35, Math.abs(Math.sin(c.pitch)));
    c.tx += -cy * dx * k - sy * dy * k / sp; c.tz += sy * dx * k - cy * dy * k / sp; c.txT = c.tx; c.tzT = c.tz;
    this.cam.x = c.tx; this.cam.y = c.tz;
  },
  zoom3(f, s, instant) {
    const c = this.c3(), D0 = this.dist0(), nd = clamp(c.distT / f, D0 * 0.04, D0 * 6);
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
    const c = this.c3(), k = reduceMotion ? 1 : 1 - Math.exp(-real * 10);
    if (this.camLocked()) {
      const tb = this.track != null ? this.bodies.find(b => b.id === this.track) : null, m = tb || this.com3();
      c.txT = m.x; c.tyT = m.z; c.tzT = m.y;
    }
    c.yaw += wrapAngle(c.yawT - c.yaw) * k; c.pitch += (c.pitchT - c.pitch) * k;
    c.dist *= Math.pow(c.distT / c.dist, k); c.tx += (c.txT - c.tx) * k; c.ty += (c.tyT - c.ty) * k; c.tz += (c.tzT - c.tz) * k;
    this.cam.x = c.tx; this.cam.y = c.tz;
  },
  draw3(g, w, h) {
    this.view3 = this.camMatrices(w, h);
    if (!this.gl3.render(this, w, h, view.dpr, THEME)) {
      this.gl3 = null; this.fail3 = 'WebGL context lost';
      this.leave3D('The 3D renderer stopped (its WebGL context was lost), so gravity is back to the flat view.');
      return;
    }
    g.drawImage(this.gl3.canvas, 0, 0, w, h);
    if (this.track != null) {
      const b = this.bodies.find(q => q.id === this.track), s = b && this.project3(b.x, b.y, b.z);
      if (s) { g.strokeStyle = THEME.text; g.globalAlpha = 0.8; g.lineWidth = 1.2; g.beginPath(); g.arc(s.x, s.y, 10 + b.r * this.view3.h / (2 * Math.tan(FOV3 / 2) * s.w), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    }
    const a = this.aim;
    if (a && a.moved) {
      g.strokeStyle = THEME.amber; g.lineWidth = 1.8; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(a.x, a.y); g.stroke(); g.setLineDash([]);
    }
  },
  /* Pointer tools in 3D: pick on the orbital plane, hit-test projected bodies. */
  bodyAt3(p, slack = 8) {
    let best = null, bd = Infinity;
    for (const b of this.bodies) {
      const s = this.project3(b.x, b.y, b.z); if (!s) continue;
      const rs = b.r * this.basis3().h / (2 * Math.tan(FOV3 / 2) * s.w), d = Math.hypot(s.x - p.x, s.y - p.y) - Math.max(2, rs);
      if (d < bd) { bd = d; best = b; }
    }
    return bd < slack ? best : null;
  },
  eraseAt3(p) {
    const before = this.bodies.length;
    this.bodies = this.bodies.filter(b => { const s = this.project3(b.x, b.y, b.z); return !s || Math.hypot(s.x - p.x, s.y - p.y) > 14; });
    if (this.bodies.length !== before) { this.accDirty = true; this.E0 = this.energy(); }
  },
  pointerUp3(a) {
    if (!a.moved) {
      const hit = this.bodyAt3({ x: a.sx, y: a.sy });
      if (hit) { this.followBody(hit); return; }
      const w = this.pick3({ x: a.sx, y: a.sy }); if (w) this.dropOrbit(w.x, w.y, w.z);
      return;
    }
    const A = this.pick3({ x: a.sx, y: a.sy }), B = this.pick3({ x: a.x, y: a.y });
    if (!A || !B) { announce('Aim at the orbital plane to throw a body.'); return; }
    this.addBody(this.body(A.x, A.y, (B.x - A.x) * this.LAUNCH_K, (B.y - A.y) * this.LAUNCH_K, this.p.launchMass, A.z, 0));
  },
};
