/*
✒ Metadata
    - Title: Relief Renderer (digiSpace Edition - v2.0)
    - File Name: relief-gl.js
    - Relative Path: js/render/relief-gl.js
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
    Renders the ripple tank as a lit 3D height field for the waves lab's
    Relief 3D view.

✒ Key Features:
    - Height-field mesh displaced by the wave amplitude, with normals from
      finite differences.
    - Walls, glass and sources drawn in place; the orbit camera matches the
      shared axis ball.
    - Reports failure so the lab can fall back to the flat view.

✒ Other Important Information:
    - Dependencies: WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { RAMP_WAVE } from '../core/color.js';

import { view } from '../core/view.js';
import { glProgram } from './gl.js';


/* ================================================================== */
/*  Ripple-tank relief renderer: WebGL 2 heightfield with lighting     */
/* ================================================================== */
export const RELIEF_VS = `#version 300 es
layout(location = 0) in vec2 aCell;
layout(location = 1) in float aKind;
layout(location = 2) in vec2 aOut;
uniform sampler2D uU; uniform sampler2D uM;
uniform mat4 uMVP; uniform vec2 uN; uniform float uGain, uH, uWallH, uDepth;
out vec3 vN; out vec3 vP; out float vV; out float vMask; out vec2 vCell; out float vSide;
float hAt(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(uN) - 1);
  if (texelFetch(uM, c, 0).r > 0.75) return uWallH;
  float v = texelFetch(uU, c, 0).r * uGain;
  return uH * v / (1.0 + 0.5 * abs(v));
}
void main() {
  ivec2 c = ivec2(aCell + 0.5);
  float h = hAt(c);
  vec3 n = normalize(vec3(hAt(c - ivec2(1, 0)) - hAt(c + ivec2(1, 0)), 2.0, hAt(c - ivec2(0, 1)) - hAt(c + ivec2(0, 1))));
  vSide = 0.0;
  if (aKind > 0.5) { vSide = 1.0; if (aKind > 1.5) h = -uDepth; n = vec3(aOut.x, 0.0, aOut.y); }
  vec3 P = vec3(aCell.x - uN.x * 0.5, h, aCell.y - uN.y * 0.5);
  float v = texelFetch(uU, c, 0).r * uGain;
  vV = v / (1.0 + abs(v)); vMask = texelFetch(uM, c, 0).r; vN = n; vP = P; vCell = aCell;
  gl_Position = uMVP * vec4(P, 1.0);
}`;
export const RELIEF_FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vP; in float vV; in float vMask; in vec2 vCell; in float vSide;
uniform sampler2D uRamp; uniform vec3 uEye; uniform vec2 uN; uniform float uLs, uAbsorb, uDepth;
out vec4 o;
void main() {
  vec3 n = normalize(vN), V = normalize(uEye - vP), L = normalize(vec3(-0.42, 0.82, 0.38));
  if (vSide > 0.5) {
    float k = clamp((vP.y + uDepth) / (uDepth + 2.0), 0.0, 1.0);
    vec3 col = mix(vec3(0.02, 0.05, 0.08), vec3(0.07, 0.22, 0.32), k * k);
    o = vec4(col * (0.5 + 0.6 * max(dot(n, L), 0.0)) + vec3(0.015), 1.0);
    return;
  }
  bool wall = vMask > 0.75;
  vec3 col = texture(uRamp, vec2(0.5 + 0.5 * vV, 0.5)).rgb;
  if (wall) col = vec3(0.30, 0.34, 0.40);
  else if (vMask > 0.25) col = col * 0.7 + vec3(0.10, 0.20, 0.26);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), wall ? 18.0 : 70.0);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
  vec3 c = col * (0.35 + 0.8 * diff) + vec3(0.028, 0.045, 0.06);
  c += spec * (wall ? 0.12 : 0.55) + fres * vec3(0.12, 0.24, 0.32) * (wall ? 0.3 : 1.0);
  vec2 q = vCell / 10.0, gq = abs(fract(q + 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
  c += (1.0 - min(min(gq.x, gq.y), 1.0)) * 0.035;
  float d = min(min(vCell.x, vCell.y), min(uN.x - 1.0 - vCell.x, uN.y - 1.0 - vCell.y));
  c *= 1.0 - 0.3 * uAbsorb * clamp((uLs - d) / uLs, 0.0, 1.0);
  o = vec4(min(c, vec3(1.0)), 1.0);
}`;
export const reliefGL = {
  ok: null, gl: null, canvas: null, Nx: 0, Ny: 0, maskVer: -1, nIdx: 0, loc: null, mask: null,
  init() {
    if (this.ok !== null) return this.ok;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2', { antialias: true, alpha: false, depth: true, stencil: false, premultipliedAlpha: false });
      if (!gl) return (this.ok = false);
      this.gl = gl; this.canvas = c;
      this.prog = glProgram(gl, RELIEF_VS, RELIEF_FS);
      const L = n => gl.getUniformLocation(this.prog, n);
      this.loc = { mvp: L('uMVP'), N: L('uN'), gain: L('uGain'), H: L('uH'), wallH: L('uWallH'), depth: L('uDepth'), U: L('uU'), M: L('uM'), ramp: L('uRamp'), eye: L('uEye'), Ls: L('uLs'), absorb: L('uAbsorb') };
      this.vao = gl.createVertexArray(); this.vbo = gl.createBuffer(); this.ibo = gl.createBuffer();
      this.texU = gl.createTexture(); this.texM = gl.createTexture(); this.texR = gl.createTexture();
      const px = new Uint8Array(RAMP_WAVE.n * 4);
      for (let i = 0; i < RAMP_WAVE.n; i++) { px[i * 4] = RAMP_WAVE.rgb[i * 3]; px[i * 4 + 1] = RAMP_WAVE.rgb[i * 3 + 1]; px[i * 4 + 2] = RAMP_WAVE.rgb[i * 3 + 2]; px[i * 4 + 3] = 255; }
      this.tex(this.texR, gl.RGBA8, RAMP_WAVE.n, 1, gl.RGBA, gl.UNSIGNED_BYTE, px, gl.LINEAR);
      c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; });
      this.ok = true;
    } catch (_) { this.ok = false; }
    return this.ok;
  },
  tex(t, internal, w, h, format, type, data, filter) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  },
  /* One vertex per cell (every second cell on very large tanks), plus a skirt down the four sides. */
  geometry(Nx, Ny) {
    const gl = this.gl, st = Nx * Ny > 90000 ? 2 : 1, xs = [], ys = [];
    for (let x = 0; x < Nx; x += st) xs.push(x);
    if (xs[xs.length - 1] !== Nx - 1) xs.push(Nx - 1);
    for (let y = 0; y < Ny; y += st) ys.push(y);
    if (ys[ys.length - 1] !== Ny - 1) ys.push(Ny - 1);
    const mx = xs.length, my = ys.length, vt = [], ix = [];
    for (const y of ys) for (const x of xs) vt.push(x, y, 0, 0, 0);
    for (let j = 0; j < my - 1; j++) for (let i = 0; i < mx - 1; i++) { const a = j * mx + i, b = a + 1, c = a + mx, d = c + 1; ix.push(a, c, b, b, c, d); }
    const skirt = (cells, ox, oz) => {
      const base = vt.length / 5;
      for (const [x, y] of cells) vt.push(x, y, 1, ox, oz, x, y, 2, ox, oz);
      for (let k = 0; k < cells.length - 1; k++) { const a = base + k * 2, b = a + 2; ix.push(a, a + 1, b, b, a + 1, b + 1); }
    };
    skirt(xs.map(x => [x, Ny - 1]), 0, 1); skirt(xs.map(x => [x, 0]), 0, -1);
    skirt(ys.map(y => [0, y]), -1, 0); skirt(ys.map(y => [Nx - 1, y]), 1, 0);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vt), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(ix), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.tex(this.texU, gl.R32F, Nx, Ny, gl.RED, gl.FLOAT, null, gl.NEAREST);
    this.tex(this.texM, gl.R8, Nx, Ny, gl.RED, gl.UNSIGNED_BYTE, null, gl.NEAREST);
    this.nIdx = ix.length; this.Nx = Nx; this.Ny = Ny; this.maskVer = -1; this.mask = new Uint8Array(Nx * Ny);
  },
  render(lab, w, h) {
    if (!this.init()) return false;
    const gl = this.gl;
    try {
      if (gl.isContextLost()) { this.ok = false; return false; }
      const d = Math.min(view.dpr, 1.5), pw = Math.max(1, Math.round(w * d)), ph = Math.max(1, Math.round(h * d));
      if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
      if (lab.Nx !== this.Nx || lab.Ny !== this.Ny) this.geometry(lab.Nx, lab.Ny);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      if (this.maskVer !== lab.geomVer) {
        const m = this.mask, W = lab.wall, G = lab.glass;
        for (let i = 0; i < m.length; i++) m[i] = W[i] ? 255 : G[i] ? 128 : 0;
        gl.bindTexture(gl.TEXTURE_2D, this.texM); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, lab.Nx, lab.Ny, gl.RED, gl.UNSIGNED_BYTE, m);
        this.maskVer = lab.geomVer;
      }
      gl.bindTexture(gl.TEXTURE_2D, this.texU); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, lab.Nx, lab.Ny, gl.RED, gl.FLOAT, lab.u);
      const V = lab.view3 = lab.camMatrices(w, h), Lc = this.loc;
      gl.viewport(0, 0, pw, ph); gl.clearColor(0.039, 0.055, 0.078, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.useProgram(this.prog);
      gl.uniformMatrix4fv(Lc.mvp, false, V.mvp); gl.uniform2f(Lc.N, lab.Nx, lab.Ny); gl.uniform3f(Lc.eye, V.eye[0], V.eye[1], V.eye[2]);
      gl.uniform1f(Lc.gain, lab.p.gain); gl.uniform1f(Lc.H, 7 * lab.p.relief); gl.uniform1f(Lc.wallH, 6); gl.uniform1f(Lc.depth, 12);
      gl.uniform1f(Lc.Ls, lab.Ls); gl.uniform1f(Lc.absorb, lab.p.absorb ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texU); gl.uniform1i(Lc.U, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texM); gl.uniform1i(Lc.M, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.texR); gl.uniform1i(Lc.ramp, 2);
      gl.bindVertexArray(this.vao); gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
      return true;
    } catch (_) { this.ok = false; return false; }
  },
};
