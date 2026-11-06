/*
✒ Metadata
    - Title: 3D Maths (digiSpace Edition - v2.0)
    - File Name: math3d.js
    - Relative Path: js/core/math3d.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Minimal 4×4 matrix and vector helpers for the hand-written WebGL relief
    view and the 3D orbit camera.

✒ Key Features:
    - m4persp, m4look and m4mul build view-projection matrices.
    - v3dot, v3cross and v3norm for camera bases.
    - FOV3 and PITCH0 shared by every orbit camera so the axis ball agrees
      with all of them.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
export const FOV3 = 40 * Math.PI / 180, PITCH0 = 0.92;
export function m4mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let v = 0; for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = v; }
  return o;
}
export function m4persp(fovy, aspect, near, far) { const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far); return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]); }
export const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function v3norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
export function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function m4look(e, t, up) {
  const f = v3norm([t[0] - e[0], t[1] - e[1], t[2] - e[2]]), r = v3norm(v3cross(f, up)), u = v3cross(r, f);
  return { m: new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -v3dot(r, e), -v3dot(u, e), v3dot(f, e), 1]), r, u, f };
}
