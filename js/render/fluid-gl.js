/*
✒ Metadata
    - Title: Fluid Surface Renderer (digiSpace Edition - v2.0)
    - File Name: fluid-gl.js
    - Relative Path: js/render/fluid-gl.js
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
    Draws the SPH particles as a continuous liquid surface on the GPU: splat
    density, blur, threshold and shade.

✒ Key Features:
    - Metaball-style liquid surface with depth tint, rim light and foam.
    - Runs on WebGL 2, or WebGL 1 with half-float textures; the lab draws
      particle discs when neither works.
    - FL_CAP, the particle cap, lives here so the lab and renderer agree
      without an import cycle.

✒ Other Important Information:
    - Dependencies: WebGL 2 or WebGL 1
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { RAMP_DENS, RAMP_HEAT } from '../core/color.js';
import { clamp } from '../core/util.js';


/* ================================================================== */
/*  Fluid surface renderer: WebGL metaballs with depth shading         */
/* ================================================================== */
/* Particle capacity of the fluid lab; the splat buffer is sized from it. */
export const FL_CAP = 4000;
export const fluidGL = {
  ok: null, gl: null, canvas: null, w: 0, h: 0, fw: 0, fh: 0, ds: 0.5, data: new Float32Array(FL_CAP * 4),
  peak: 1, splatR: 1.55, curDs: 0,
  shader(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  },
  program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    gl.attachShader(p, this.shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  },
  rampTexture(ramp) {
    const gl = this.gl, t = gl.createTexture(), px = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) { const k = Math.round(i * (ramp.n - 1) / 255) * 3; px[i * 4] = ramp.rgb[k]; px[i * 4 + 1] = ramp.rgb[k + 1]; px[i * 4 + 2] = ramp.rgb[k + 2]; px[i * 4 + 3] = 255; }
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  },
  init() {
    if (this.ok !== null) return this.ok;
    try {
      const c = document.createElement('canvas');
      const opts = { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false };
      let gl = c.getContext('webgl2', opts), v2 = !!gl;
      if (!gl) gl = c.getContext('webgl', opts);
      if (!gl) return (this.ok = false);
      this.gl = gl; this.canvas = c;
      let linear = true;
      if (v2 && gl.getExtension('EXT_color_buffer_float')) this.fmt = { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
      else if (!v2 && gl.getExtension('OES_texture_half_float') && gl.getExtension('EXT_color_buffer_half_float')) {
        this.fmt = { internal: gl.RGBA, format: gl.RGBA, type: gl.getExtension('OES_texture_half_float').HALF_FLOAT_OES };
        linear = !!gl.getExtension('OES_texture_half_float_linear');
      } else { this.fmt = { internal: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE }; this.peak = 0.09; }
      this.ds = linear ? 0.5 : 1;
      this.filter = linear ? gl.LINEAR : gl.NEAREST;
      this.maxPt = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
      this.splat = this.program(
        `attribute vec4 a; uniform vec2 uRes; uniform float uSize; varying vec2 vD;
         void main(){ vec2 p = a.xy / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); gl_PointSize = uSize; vD = a.zw; }`,
        `precision mediump float; varying vec2 vD; uniform float uPeak;
         void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q); if (r2 > 1.0) discard;
           float w = 1.0 - r2; w = w * w * w * uPeak; gl_FragColor = vec4(w, w * vD.x, w * vD.y, w); }`);
      this.comp = this.program(
        `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`,
        `precision highp float;
         varying vec2 vUv; uniform sampler2D uTex; uniform sampler2D uRamp; uniform vec2 uTexel;
         uniform float uTh; uniform float uFull; uniform float uMode; uniform float uGrad;
         float D(vec2 o){ return texture2D(uTex, vUv + o).r; }
         void main(){
           vec4 s = texture2D(uTex, vUv); float d = s.r;
           float a = smoothstep(uTh * 0.8, uTh * 1.2, d);
           if (a < 0.002) { gl_FragColor = vec4(0.0); return; }
           float spd = clamp(s.g / max(d, 1e-4), 0.0, 1.0), den = clamp(s.b / max(d, 1e-4), 0.0, 1.0);
           float gx = D(vec2(uTexel.x, 0.0)) - D(vec2(-uTexel.x, 0.0));
           float gy = D(vec2(0.0, uTexel.y)) - D(vec2(0.0, -uTexel.y));
           vec3 n = normalize(vec3(-gx * uGrad, -gy * uGrad, uFull * 0.3));
           float depth = clamp((d - uTh) / (uFull - uTh), 0.0, 1.0);
           vec3 col;
           if (uMode < 0.5) {
             col = mix(vec3(0.16, 0.62, 0.78), vec3(0.02, 0.13, 0.27), sqrt(depth));
             col = mix(col, vec3(0.88, 0.97, 1.0), smoothstep(0.5, 1.0, spd) * (1.0 - 0.75 * depth) * 0.85);
           } else {
             col = texture2D(uRamp, vec2(uMode < 1.5 ? spd : den, 0.5)).rgb * mix(1.0, 0.72, depth);
           }
           vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
           float diff = clamp(dot(n, L), 0.0, 1.0);
           float spec = pow(clamp(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 40.0);
           float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
           float meniscus = 1.0 - smoothstep(uTh, uTh * 2.2, d);
           col = col * (0.72 + 0.4 * diff) + vec3(spec * 0.6) + rim * vec3(0.3, 0.72, 0.88) * 0.5 + meniscus * vec3(0.3, 0.7, 0.85) * 0.45;
           float alpha = a * mix(0.84, 0.97, depth);
           gl_FragColor = vec4(min(col, vec3(1.0)) * alpha, alpha);
         }`);
      this.buf = gl.createBuffer();
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.tex = gl.createTexture(); this.fbo = gl.createFramebuffer();
      this.ramps = { speed: this.rampTexture(RAMP_HEAT), density: this.rampTexture(RAMP_DENS) };
      c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; });
      // The next init() builds a fresh context, so a brief loss does not last until reload.
      c.addEventListener('webglcontextrestored', () => { this.ok = null; this.w = 0; this.h = 0; });
      this.ok = true;
    } catch (err) {
      this.ok = false;
    }
    return this.ok;
  },
  resize(w, h, ds) {
    const gl = this.gl;
    this.w = w; this.h = h; this.curDs = ds; this.canvas.width = w; this.canvas.height = h;
    this.fw = Math.max(1, Math.round(w * ds)); this.fh = Math.max(1, Math.round(h * ds));
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.fmt.internal, this.fw, this.fh, 0, this.fmt.format, this.fmt.type, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, this.filter], [gl.TEXTURE_MAG_FILTER, this.filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  /* w, h: stage size in CSS px; xf maps world px to stage px (zoom z, offset ox, oy). */
  render(lab, w, h, xf) {
    if (!this.init()) return false;
    const gl = this.gl;
    try {
      if (gl.isContextLost()) { this.ok = false; return false; }
      const z = xf.z, Rs = this.splatR * lab.U * z;
      let ds = this.ds;
      if (2 * Rs * ds > this.maxPt) ds = Math.pow(2, Math.floor(Math.log2(this.maxPt * 0.98 / (2 * Rs)) * 2) / 2);
      if (w !== this.w || h !== this.h || ds !== this.curDs) this.resize(w, h, ds);
      const n = lab.n, U = lab.U, s = U / lab.TICK, D = this.data, byDens = lab.p.colorBy === 'density', kz = U * z;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        D[o] = (lab.x[i] * kz + xf.ox) * ds; D[o + 1] = (lab.y[i] * kz + xf.oy) * ds;
        D[o + 2] = Math.min(1, Math.hypot(lab.vx[i], lab.vy[i]) * s / 520);
        D[o + 3] = clamp((lab.rho[i] / lab.rho0 - 0.4) / 1.2, 0, 1);
      }
      const size = Math.min(this.maxPt, 2 * Rs * ds);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.fw, this.fh);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.splat);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, D.subarray(0, n * 4), gl.DYNAMIC_DRAW);
      const la = gl.getAttribLocation(this.splat, 'a');
      gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 4, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(this.splat, 'uRes'), this.fw, this.fh);
      gl.uniform1f(gl.getUniformLocation(this.splat, 'uSize'), size);
      gl.uniform1f(gl.getUniformLocation(this.splat, 'uPeak'), this.peak);
      if (n) gl.drawArrays(gl.POINTS, 0, n);
      gl.disableVertexAttribArray(la);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.comp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, byDens ? this.ramps.density : this.ramps.speed);
      gl.uniform1i(gl.getUniformLocation(this.comp, 'uTex'), 0);
      gl.uniform1i(gl.getUniformLocation(this.comp, 'uRamp'), 1);
      gl.uniform2f(gl.getUniformLocation(this.comp, 'uTexel'), 1 / this.fw, 1 / this.fh);
      gl.uniform1f(gl.getUniformLocation(this.comp, 'uGrad'), z * ds / this.ds);
      const full = this.peak * Math.PI * (this.splatR * this.splatR) / (4 * lab.spacing * lab.spacing * Math.sqrt(3) / 2);
      gl.uniform1f(gl.getUniformLocation(this.comp, 'uTh'), this.peak * 0.55);
      gl.uniform1f(gl.getUniformLocation(this.comp, 'uFull'), full * 0.9);
      gl.uniform1f(gl.getUniformLocation(this.comp, 'uMode'), lab.p.colorBy === 'speed' ? 1 : byDens ? 2 : 0);
      const lp = gl.getAttribLocation(this.comp, 'p');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(lp);
      gl.activeTexture(gl.TEXTURE0);
      return true;
    } catch (err) {
      this.ok = false;
      return false;
    }
  },
};
