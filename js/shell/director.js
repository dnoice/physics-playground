/*
✒ Metadata
    - Title: Director (digiSpace Edition - v2.18)
    - File Name: director.js
    - Relative Path: js/shell/director.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for recordings shot like a film: a director that
      drives the live view while a clip records, with establishing wide
      shots, eased pans and dollies, slow orbits in 3D and holds on what
      each lab says is interesting, then hands the camera back.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The director's camera. With the Director switch on, a clip is filmed:
    the director picks shots from the lab's areas of interest (its
    interest() hook) and moves the user's own view between them, smoothly
    and within fixed limits of speed, then puts the view back as it was
    when the clip stops.

✒ Key Features:
    - Shots of several seconds: an establishing wide shot, then subjects
      chosen by weight and novelty, with a wide shot between runs of them
      and whenever nothing stands out; a strong moment (a merger, a close
      encounter) is held, or cut to once the current shot has settled.
    - Moves between shots follow van Wijk and Nuij's smooth zoom and pan,
      which pulls out, travels and pushes in, eased at both ends; within a
      shot a critically damped spring follows the moving subject while the
      camera dollies in and, in 3D, orbits slowly.
    - Hard limits on pan, zoom, yaw and pitch per second hold every frame;
      reduced motion halves them and lengthens the shots.
    - Touching the camera hands it to the user: the director waits until
      the camera has been left alone for four seconds (six with reduced
      motion), then carries on from where the user left it.
    - Preview direction runs the same director without recording, and the
      stage chip shows the shot and gives the camera back when pressed.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { ICON } from '../core/icons.js';
import { FOV3 } from '../core/math3d.js';
import { $, clamp, el, rand, reduceMotion, store, wrapAngle } from '../core/util.js';
import { view } from '../core/view.js';
import { camOf, fitCam, is3D, navAnim, navGo, worldOf, zoomRange } from './camera.js';
import { active, announce } from './state.js';

/* ================================================================== */
/*  Director: the live view filmed like a camera crew would            */
/* ================================================================== */
/* The camera is one vector of six numbers in both modes: the point it looks at (x, y, z), ln of the view's width there
   (lw), and in 3D the yaw and pitch of the orbit. In 2D the point is the world point at the stage centre and the width
   is the stage's short side in world units; in 3D the point is the orbit target in the scene and the width is the
   frame's height at the target. Working in ln w makes a zoom feel the same at every scale. */
const GENTLE = reduceMotion ? 0.5 : 1, LONG = reduceMotion ? 1.4 : 1;
const QUERY = 0.25, YIELD = reduceMotion ? 6 : 4, FILL = 0.7, RHO = Math.SQRT2, TAN = Math.tan(FOV3 / 2);
const ORBIT = 0.07 * GENTLE, SPRING = reduceMotion ? 1.1 : 1.7, PLAN = 0.7, TMIN = reduceMotion ? 3.6 : 2.2, TMAX = 12;
// The most the camera may move in a second: views of pan, e-folds of zoom, radians of yaw and pitch.
export const DIRECTOR_CAP = { pan: 0.55 * GENTLE, zoom: 0.6 * GENTLE, yaw: 0.4 * GENTLE, pitch: 0.25 * GENTLE };
const CAP = DIRECTOR_CAP;

export const director = {
  on: !!store.get('director', false), rec: false, why: null, lab: null, kind: null, saved: null, held: null,
  yieldT: 0, clock: 0, now: 0, ui: 0, shots: 0, subjects: 0, pace: 1, d0: 0, ww: 1, wh: 1, zlo: 0.5, zhi: 8, fitZ: 1, yawMax: Infinity,
  pts: [], recent: [],
  shot: { kind: 'wide', key: '', label: '', t0: 0, len: 1, w: 0, lost: 0, dir: 1, yaw: 0, pitch: 0, push: 0, dx: 0, dy: 0 },
  sub: { key: null, x: 0, y: 0, z: 0, lw: 0, vx: 0, vy: 0, vz: 0, t: 0 },
};
const D = director;
const C = new Float64Array(6), V = new Float64Array(6), G = new Float64Array(6), GV = new Float64Array(6), G1 = new Float64Array(6), PC = new Float64Array(6), W = new Float64Array(6);
// A move between shots: from a to b along the smooth zoom-and-pan path, timed by a quintic ease.
const T = { on: false, t: 0, len: 1, S: 0, d1: 0, r0: 0, w0: 1, pure: true, a: new Float64Array(6), b: new Float64Array(6) };
const AIM = { txT: 0, tyT: 0, tzT: 0 };
let PU = 0, PLW = 0;

const kindOf = lab => (is3D(lab) ? '3d' : '2d');
const short = () => Math.max(1, Math.min(view.w, view.h));
const near = (a, b) => Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b));

/* ---------- reading and writing the user's camera ---------- */
function read(lab, c = D.kind === '3d' ? lab.c3() : camOf(lab)) {
  if (D.kind === '3d') { C[0] = c.tx; C[1] = c.ty; C[2] = c.tz; C[3] = Math.log(2 * c.dist * TAN); C[4] = c.yaw; C[5] = c.pitch; return; }
  if (c.fit && !lab.selfCam) Object.assign(c, fitCam(lab));
  C[0] = c.x; C[1] = c.y; C[2] = 0; C[3] = Math.log(short() / c.z); C[4] = 0; C[5] = 0;
}
/* Set value and target alike, so the camera's own easing has nothing left to do, and keep what was set to notice a
   hand on the camera next frame. 2D keeps clampCam's limits itself, from the sizes cached at the last look. */
function write(lab) {
  for (let i = 0; i < 6; i++) if (!Number.isFinite(C[i])) { read(lab); V.fill(0); T.on = false; return; }
  if (D.kind === '3d') {
    const c = lab.c3();
    c.tx = c.txT = C[0]; c.ty = c.tyT = C[1]; c.tz = c.tzT = C[2]; c.dist = c.distT = Math.exp(C[3]) / (2 * TAN); c.yaw = c.yawT = C[4];
    const lo = lab.pitchFloor ? lab.pitchFloor(c) : -1.45;
    if (C[5] < lo) { C[5] = lo; if (V[5] < 0) V[5] = 0; }
    c.pitch = c.pitchT = C[5];
    remember(lab, c);
    return;
  }
  const c = camOf(lab), s = short();
  if (!lab.selfCam) c.fit = false;
  c.z = clamp(s / Math.exp(C[3]), D.zlo, D.zhi);
  c.x = lab.selfCam ? C[0] : clamp(C[0], 0, D.ww); c.y = lab.selfCam ? C[1] : clamp(C[1], 0, D.wh);
  C[0] = c.x; C[1] = c.y; C[3] = Math.log(s / c.z);
  remember(lab, c);
}
function remember(lab, c) {
  if (D.kind === '3d') { W[0] = c.txT; W[1] = c.tyT; W[2] = c.tzT; W[3] = c.distT; W[4] = c.yawT; W[5] = c.pitchT; D.d0 = c.d0; return; }
  W[0] = c.x; W[1] = c.y; W[3] = c.z;
}
/* Has anyone else moved the camera since the director last set it? A zoom still easing in, a re-fit or any changed
   target is a hand on the camera. A resize that only rescales the 3D distance is not. */
function touched(lab, strict) {
  if (D.kind === '3d') {
    const c = lab.c3();
    if (c.d0 !== D.d0) { remember(lab, c); read(lab, c); return false; }
    return !(near(c.txT, W[0]) && near(c.tyT, W[1]) && near(c.tzT, W[2]) && near(c.distT, W[3]) && near(c.yawT, W[4]) && near(c.pitchT, W[5]));
  }
  const c = camOf(lab);
  return (strict && !!c.fit) || navAnim.lab === lab || !(near(c.x, W[0]) && near(c.y, W[1]) && near(c.z, W[3]));
}

/* ---------- what to film: the lab's areas of interest ---------- */
function query(lab) {
  let pts = null;
  try { pts = lab.interest ? lab.interest(D.shot.kind === 'subject' ? D.shot.key : null) : null; } catch (_) { pts = null; }
  D.pts = Array.isArray(pts) ? pts.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0 && Number.isFinite(p.r) && typeof p.key === 'string') : [];
  if (D.kind === '2d') {
    const R = worldOf(lab), [lo, hi] = zoomRange(lab);
    D.ww = R.w; D.wh = R.h; D.zlo = lo; D.zhi = hi; D.fitZ = lab.selfCam ? lo : fitCam(lab).z;
  }
  const S = D.shot;
  if (S.kind === 'subject') {
    const p = D.pts.find(q => q.key === S.key);
    if (p) { look(lab, p); S.lost = 0; S.w = clamp(+p.w || 0, 0, 1); } else S.lost += QUERY;
  } else look(lab, null);
}
/* Frame a point of interest, or the whole scene for a wide shot, in the camera's own terms, and estimate how fast it
   moves from the last look, so the camera can keep pace without lagging. A jump (a new densest patch) moves the
   subject but not its speed. */
function look(lab, p) {
  const s = D.sub, key = p ? p.key : '', t = D.now, same = s.key === key && t > s.t;
  let x, y, z = 0, lw;
  if (D.kind === '3d') {
    const H = lab.home3(), [lo, hi] = lab.zoomLimits3 ? lab.zoomLimits3() : [0.2, 3.2];
    if (p) {
      const a = lab.aim3(p.x, p.y, p.z || 0);
      AIM.txT = a.x; AIM.tyT = a.y; AIM.tzT = a.z;
      if (lab.clampTarget) lab.clampTarget(AIM);
      x = AIM.txT; y = AIM.tyT; z = AIM.tzT;
      lw = Math.log(2 * p.r * a.k / (FILL * Math.min(1, view.w / Math.max(1, view.h))));
    } else { x = H.tx; y = H.ty; z = H.tz; lw = Math.log(2 * H.dist * TAN); }
    lw = clamp(lw, Math.log(2 * H.dist * lo * TAN), Math.log(2 * H.dist * hi * TAN));
  } else {
    if (p) {
      x = p.x; y = p.y;
      const zMin = lab.selfCam ? D.zlo : D.fitZ, zMax = lab.selfCam ? D.zhi : Math.min(D.zhi, D.fitZ * 5);
      lw = Math.log(short() / clamp(FILL * short() / (2 * p.r), zMin, Math.max(zMin, zMax)));
    } else { const f = lab.frameView ? lab.frameView() : fitCam(lab); x = f.x; y = f.y; lw = Math.log(short() / clamp(f.z, D.zlo, D.zhi)); }
  }
  if (same) {
    const dt = t - s.t, jump = Math.hypot(x - s.x, y - s.y, z - s.z) > 0.6 * Math.exp(s.lw), k = 0.5;
    s.vx = jump ? 0 : s.vx * (1 - k) + (x - s.x) / dt * k; s.vy = jump ? 0 : s.vy * (1 - k) + (y - s.y) / dt * k; s.vz = jump ? 0 : s.vz * (1 - k) + (z - s.z) / dt * k;
  } else { s.vx = s.vy = s.vz = 0; }
  s.key = key; s.x = x; s.y = y; s.z = z; s.lw = lw; s.t = t;
}
/* The camera this shot wants at time t: the subject carried on at its speed, a slow dolly in, and in 3D a slow orbit.
   A wide 2D shot also drifts a little sideways. The point stays where the world fills the frame. */
function goalAt(lab, t, out) {
  const s = D.sub, S = D.shot, p = clamp((t - S.t0) / S.len, 0, 1.6), q = t - s.t;
  out[0] = s.x + s.vx * q; out[1] = s.y + s.vy * q; out[2] = s.z + s.vz * q;
  out[3] = s.lw - Math.log(1 + S.push * p);
  if (D.kind === '3d') { out[4] = clamp(S.yaw + S.dir * ORBIT * (t - S.t0), -D.yawMax, D.yawMax); out[5] = S.pitch; return; }
  out[4] = out[5] = 0;
  if (S.kind === 'wide') { out[0] += S.dx * p; out[1] += S.dy * p; }
  if (lab.selfCam) return;
  const z = short() / Math.exp(out[3]), hx = view.w / (2 * z), hy = view.h / (2 * z);
  out[0] = D.ww > 2 * hx ? clamp(out[0], hx, D.ww - hx) : D.ww / 2;
  out[1] = D.wh > 2 * hy ? clamp(out[1], hy, D.wh - hy) : D.wh / 2;
}

/* ---------- shots ---------- */
/* Pick the next shot: the best point by weight, less for one seen lately, after the establishing shot; a wide shot
   after two subjects running or when nothing stands out. A moment not to miss (weight 0.85 or more, not seen lately)
   wins, and may put off the wide shot once. */
function nextShot(lab) {
  const S = D.shot, seen = k => D.recent.includes(k);
  let best = null, score = 0.3;
  if (D.shots > 0) for (const p of D.pts) {
    const w = clamp(+p.w || 0, 0, 1), sc = w * (seen(p.key) ? 0.35 : 1) * (p.key === S.key ? 0.3 : 1);
    if ((D.subjects < 2 || (D.subjects < 3 && w >= 0.85 && !seen(p.key))) && sc > score) { score = sc; best = p; }
  }
  D.shots++;
  if (Math.random() < 0.25) S.dir = -S.dir;
  if (best) {
    Object.assign(S, { kind: 'subject', key: best.key, label: best.label || 'Point of interest', w: clamp(+best.w || 0, 0, 1), len: (5 + 3 * clamp(+best.w || 0, 0, 1)) * LONG, push: 0.06 });
    D.subjects++; D.recent.push(best.key); if (D.recent.length > 3) D.recent.shift();
  } else {
    Object.assign(S, { kind: 'wide', key: '', label: D.shots === 1 ? 'Establishing shot' : 'Wide shot', w: 0, len: (D.shots === 1 ? 5 : 6.5) * LONG, push: 0.07 });
    D.subjects = 0;
  }
  S.t0 = D.now; S.lost = 0; S.dx = S.dy = 0;
  if (D.kind === '3d') {
    const H = lab.home3(), R = lab.rig3, lo = R ? (R.pitchMin ?? (R.plane === 'wall' ? -0.25 : 0.08)) + 0.04 : 0.2, hi = R ? Math.min(R.pitchMax ?? 1.553, 1.35) - 0.04 : 1.1;
    S.pitch = clamp(H.pitch + (S.kind === 'wide' ? rand(0, 0.12) : rand(-0.06, 0.16)), lo, Math.max(lo, hi));
    S.yaw = S.kind === 'wide' ? C[4] + wrapAngle(H.yaw + rand(-0.6, 0.6) - C[4]) : C[4];
  } else if (S.kind === 'wide' && !lab.selfCam) { S.dx = rand(-0.03, 0.03) * D.ww; S.dy = rand(-0.02, 0.02) * D.wh; }
  look(lab, best);
  plan(lab);
}
/* Has the shot run its course? It has once its time is up, unless a strong subject is still strong (hold on it for up
   to four seconds more), or once its subject has been gone a second. A routine shot also gives way to a moment not
   to miss elsewhere, once it has held for three seconds; a moment not to miss is never cut short by another. */
function shotOver() {
  const S = D.shot, age = D.now - S.t0;
  if (S.lost >= 1) return true;
  if (age >= S.len) return !(S.kind === 'subject' && S.w >= 0.7 && age < S.len + 4 * LONG);
  return !T.on && S.w < 0.7 && age >= 3 * LONG && D.pts.some(p => p.w >= 0.85 && p.key !== S.key && !D.recent.includes(p.key));
}

/* ---------- moving the camera ---------- */
/* van Wijk and Nuij's optimal path from the camera now to the shot's opening frame: for a long way it pulls out,
   travels and pushes in, as an eye would want. Its length is set so the eased move keeps inside the limits, measured
   on the path itself, and never shorter than TMIN. */
function plan(lab) {
  goalAt(lab, D.now, G);
  T.a.set(C); T.b.set(G);
  const d1 = Math.hypot(G[0] - C[0], G[1] - C[1], G[2] - C[2]), w0 = Math.exp(C[3]), w1 = Math.exp(G[3]);
  T.d1 = d1; T.w0 = w0;
  if (d1 < 1e-9 * (w0 + w1)) { T.pure = true; T.S = Math.abs(G[3] - C[3]) / RHO; }
  else {
    const r2 = RHO * RHO, b0 = (w1 * w1 - w0 * w0 + r2 * r2 * d1 * d1) / (2 * w0 * r2 * d1), b1 = (w1 * w1 - w0 * w0 - r2 * r2 * d1 * d1) / (2 * w1 * r2 * d1);
    T.r0 = -Math.asinh(b0); T.S = (-Math.asinh(b1) - T.r0) / RHO; T.pure = false;
  }
  let pan = 0, zoom = 0, lu = 0, llw = C[3];
  for (let k = 1; k <= 32; k++) {
    path(k / 32);
    pan = Math.max(pan, Math.abs(PU - lu) * d1 / Math.exp(Math.min(PLW, llw)) * 32); zoom = Math.max(zoom, Math.abs(PLW - llw) * 32);
    lu = PU; llw = PLW;
  }
  const ease = 1.875 / PLAN;
  T.len = clamp(Math.max(TMIN, ease * pan / CAP.pan, ease * zoom / (CAP.zoom * D.pace), ease * Math.abs(G[4] - C[4]) / CAP.yaw, ease * Math.abs(G[5] - C[5]) / CAP.pitch), TMIN, TMAX);
  T.t = 0; T.on = true;
}
/* A point on the path, as the share u of the way across and ln of the width there. */
function path(e) {
  if (T.pure) { PU = e; PLW = T.a[3] + e * (T.b[3] - T.a[3]); return; }
  const s = e * T.S, c0 = Math.cosh(T.r0);
  PU = T.w0 / (RHO * RHO * T.d1) * (c0 * Math.tanh(RHO * s + T.r0) - Math.sinh(T.r0));
  PLW = Math.log(T.w0 * c0 / Math.cosh(RHO * s + T.r0));
}
/* Between shots: along the path, plus whatever the shot's own frame has done since the move began, both eased in. */
function transit(lab, dt) {
  T.t += dt;
  const tau = Math.min(1, T.t / T.len), e = tau * tau * tau * (tau * (tau * 6 - 15) + 10), a = T.a, b = T.b;
  path(e); goalAt(lab, D.now, G);
  for (let i = 0; i < 3; i++) C[i] = a[i] + PU * (b[i] - a[i]) + e * (G[i] - b[i]);
  C[3] = PLW + e * (G[3] - b[3]);
  C[4] = a[4] + e * (G[4] - a[4]); C[5] = a[5] + e * (G[5] - a[5]);
  if (tau >= 1) { T.on = false; goalVelocity(lab); V.set(GV); }
}
function goalVelocity(lab) {
  goalAt(lab, D.now, G); goalAt(lab, D.now + 0.05, G1);
  for (let i = 0; i < 6; i++) GV[i] = (G1[i] - G[i]) / 0.05;
}
/* Within a shot: a critically damped spring on each number, solved exactly for a goal moving at constant speed over
   the step, so it follows without overshoot or lag. */
function hold(lab, dt) {
  goalVelocity(lab);
  const k = Math.exp(-SPRING * dt);
  for (let i = 0; i < 6; i++) {
    const e = C[i] - (G[i] - GV[i] * dt), ev = V[i] - GV[i], q = (ev + SPRING * e) * dt;
    C[i] = G[i] + (e + q) * k; V[i] = GV[i] + (ev - SPRING * q) * k;
  }
}
/* The hard limits, frame by frame: pan in views a second, zoom in e-folds a second (faster for a lab that spans
   decades of scale), yaw and pitch in radians a second. */
function cap(dt) {
  const mp = CAP.pan * Math.exp(PC[3]) * dt, dx = C[0] - PC[0], dy = C[1] - PC[1], dz = C[2] - PC[2], m = Math.hypot(dx, dy, dz);
  if (m > mp) { const k = mp / m, vm = Math.hypot(V[0], V[1], V[2]), kv = vm > mp / dt ? mp / dt / vm : 1; C[0] = PC[0] + dx * k; C[1] = PC[1] + dy * k; C[2] = PC[2] + dz * k; for (let i = 0; i < 3; i++) V[i] *= kv; }
  capOne(3, CAP.zoom * D.pace, dt); capOne(4, CAP.yaw, dt); capOne(5, CAP.pitch, dt);
}
function capOne(i, rate, dt) {
  const d = C[i] - PC[i], m = rate * dt;
  if (d > m || d < -m) { C[i] = PC[i] + (d > 0 ? m : -m); V[i] = clamp(V[i], -rate, rate); }
}

/* ---------- taking the camera and giving it back ---------- */
function take(lab) {
  D.lab = lab; D.kind = kindOf(lab);
  if (navAnim.lab === lab) navAnim.lab = null;
  if (D.kind === '3d') { const c = lab.c3(); D.saved = { yaw: c.yawT, pitch: c.pitchT, dist: c.distT, tx: c.txT, ty: c.tyT, tz: c.tzT }; }
  else { const c = camOf(lab); if (c.fit && !lab.selfCam) Object.assign(c, fitCam(lab)); D.saved = { x: c.x, y: c.y, z: c.z, fit: !lab.selfCam && !!c.fit }; }
  D.held = lab.releaseCam ? lab.releaseCam() : null;
  D.pace = (lab.zoomPace ? lab.zoomPace() : 1) ** 2;
  D.yawMax = lab.rig3 && lab.rig3.yawMax != null ? lab.rig3.yawMax : Infinity;
  Object.assign(D, { yieldT: 0, clock: 0, now: 0, ui: 1, shots: 0, subjects: 0 });
  D.recent.length = 0; D.sub.key = null; D.shot.kind = 'wide'; D.shot.key = ''; D.shot.dir = Math.random() < 0.5 ? 1 : -1;
  T.on = false; V.fill(0);
  query(lab); read(lab); write(lab); nextShot(lab);
}
/* The user's camera as it was: eased back in the shown lab, at once in one no longer shown, and whatever the lab let go
   of (Gravity's follow and followed body) handed back first, so the camera can lock again. */
function give(lab, kind, instant) {
  const s = D.saved;
  if (lab && lab.retakeCam && D.held) lab.retakeCam(D.held);
  if (lab && s) {
    if (kind === '3d') {
      const c = lab.c3();
      Object.assign(c, { yawT: c.yaw + wrapAngle(s.yaw - c.yaw), pitchT: s.pitch, distT: s.dist, txT: s.tx, tyT: s.ty, tzT: s.tz });
      if (instant || reduceMotion) Object.assign(c, { yaw: c.yawT, pitch: c.pitchT, dist: c.distT, tx: c.txT, ty: c.tyT, tz: c.tzT });
    } else {
      const c = camOf(lab), f = s.fit ? fitCam(lab) : s;
      if (instant || lab !== active) { Object.assign(c, { x: f.x, y: f.y, z: f.z }); if (!lab.selfCam) c.fit = s.fit; if (navAnim.lab === lab) navAnim.lab = null; }
      else navGo(lab, f.x, f.y, f.z, s.fit ? () => { camOf(lab).fit = true; } : null);
      if (lab.onCamZoom) lab.onCamZoom();
    }
  }
  D.saved = D.held = null;
}
function begin(why) {
  if (!active) return;
  D.why = why; take(active); syncDirectorUI();
}
/* Stop directing and give the camera back. */
export function stopDirector() {
  if (!D.why) return;
  give(D.lab, D.kind, false);
  D.why = null; D.lab = null; D.kind = null; T.on = false;
  syncDirectorUI();
}
/* From capture.js: a clip started or stopped. A preview running when a clip starts carries on as its director, so the
   view goes back to where it was before the preview when the clip ends. */
export function directorRec(rec) {
  D.rec = !!rec;
  if (rec) { if (D.why === 'preview') D.why = 'rec'; else if (D.on && !D.why) begin('rec'); }
  else if (D.why === 'rec') stopDirector();
  syncDirectorUI();
}
export function setDirector(on) {
  on = !!on;
  if (on === D.on) return;
  D.on = on; store.set('director', on);
  if (!on) stopDirector(); else if (D.rec && !D.why) begin('rec');
  syncDirectorUI();
}
export function previewDirector() {
  if (D.why === 'preview') { stopDirector(); announce('Preview stopped: the view is yours again'); return; }
  if (D.why || !D.on) return;
  begin('preview'); announce('Previewing the director: press again, or the chip on the stage, to stop');
}
export function directorState() {
  return { on: D.on, why: D.why, driving: !!D.why, kind: D.kind, lab: D.lab && D.lab.id, shot: D.shot.kind, label: D.shot.label, key: D.shot.key,
    shots: D.shots, t: D.now, yielding: D.yieldT > 0, moving: T.on, saved: D.saved && { ...D.saved } };
}

/* ---------- each frame, from the loop, before the camera's own easing ---------- */
export function tickDirector(real) {
  if (!D.why || !active) return;
  const lab = active;
  if (lab !== D.lab || kindOf(lab) !== D.kind) { give(D.lab, D.kind, true); take(lab); }
  if (!(real > 0)) return;
  D.now += real;
  if (D.yieldT > 0) {
    // The user has the camera: wait until it has been left alone, then carry on from where they left it.
    if (touched(lab, false)) D.yieldT = YIELD; else D.yieldT -= real;
    remember(lab, D.kind === '3d' ? lab.c3() : camOf(lab));
    if (D.yieldT > 0) { chip(lab, real); return; }
    D.yieldT = 0;
    if (lab.releaseCam) lab.releaseCam();
    read(lab); V.fill(0); query(lab); nextShot(lab);
  } else if (touched(lab, true)) {
    D.yieldT = YIELD; T.on = false;
    remember(lab, D.kind === '3d' ? lab.c3() : camOf(lab));
    chip(lab, 1); return;
  }
  if ((D.clock += real) >= QUERY) { D.clock = 0; query(lab); if (shotOver()) nextShot(lab); }
  PC.set(C);
  if (T.on) transit(lab, real); else hold(lab, real);
  cap(real);
  write(lab);
  chip(lab, real);
}

/* ---------- on the stage and in the capture settings ---------- */
const ui = { chip: null, sw: null, pv: null, pvLabel: null };
function chip(lab, dt) {
  if ((D.ui += dt) < 0.25) return;
  D.ui = 0;
  const who = D.why === 'preview' ? 'PREVIEW' : 'DIRECTOR', txt = D.yieldT > 0 ? `${who} · yours for ${Math.ceil(D.yieldT)} s` : `${who} · ${D.shot.label}`;
  if (ui.chip && ui.chip.textContent !== txt) {
    ui.chip.textContent = txt;
    ui.chip.setAttribute('aria-label', `${D.why === 'preview' ? 'Director preview' : 'Director filming'}: ${D.yieldT > 0 ? `the camera is yours for ${Math.ceil(D.yieldT)} s` : D.shot.label}. Press to give the camera back`);
  }
  // Gravity's zoom control reads the flat camera's zoom; keep it true at the panel's pace.
  if (D.kind === '2d' && lab.onCamZoom) lab.onCamZoom();
}
export function syncDirectorUI() {
  if (ui.chip) { ui.chip.hidden = !D.why; if (D.why) { D.ui = 1; chip(D.lab || active, 0); } }
  if (ui.sw) ui.sw.setAttribute('aria-checked', String(D.on));
  if (ui.pv) {
    const on = D.why === 'preview';
    ui.pv.hidden = !D.on && !on; ui.pv.setAttribute('aria-pressed', String(on));
    ui.pv.disabled = D.why === 'rec';
    ui.pv.title = D.why === 'rec' ? 'The director is filming the clip now' : on ? 'Stop the preview and have your view back' : 'Watch the director move the view, without recording';
    ui.pvLabel.textContent = on ? 'Stop preview' : 'Preview direction';
  }
}
/* The switch and the preview, for the capture settings. */
export function directorSettings() {
  const note = 'While a clip records, the director films the run for you: an establishing wide shot, then slow pans, dollies and orbits '
    + `onto what is happening. Move the camera and it waits until you have let go for ${YIELD} seconds; your view comes back when the clip stops.`
    + (reduceMotion ? ' With reduced motion on, every move is slower and gentler.' : '');
  ui.sw = el('button', { type: 'button', role: 'switch', class: 'switch', id: 'sw-director', 'aria-checked': 'false' },
    el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })),
    el('span', { class: 'switch-text' }, el('span', { id: 'sw-director-label', text: 'Direct clips like a film' }), el('span', { class: 'switch-note', text: note })));
  ui.sw.addEventListener('click', () => setDirector(!D.on));
  ui.pvLabel = el('span', { text: 'Preview direction' });
  ui.pv = el('button', { type: 'button', class: 'btn btn-fix dir-preview', id: 'btn-dir-preview', 'aria-pressed': 'false' }, el('span', { class: 'ms', 'aria-hidden': 'true', text: ICON.clip }), ui.pvLabel);
  ui.pv.addEventListener('click', previewDirector);
  syncDirectorUI();
  return el('div', { class: 'dir-set' }, ui.sw, ui.pv);
}
/* Wiring: from capture.js's init. The chip gives the camera back: it ends a preview, or the director's part in a clip. */
export function init() {
  ui.chip = $('#hud-dir');
  if (ui.chip) ui.chip.addEventListener('click', () => { const was = D.why; stopDirector(); if (was) announce('The director has given the camera back'); });
  syncDirectorUI();
}
