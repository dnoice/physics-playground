/*
✒ Metadata
    - Title: Ribbon Batches (digiSpace Edition - v2.1)
    - File Name: ribbons.js
    - Relative Path: js/render/world/ribbons.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: soft, screen-wide trails in one draw call.
    Earlier entries: see CHANGELOG.md

✒ Description:
    WebGL lines are one pixel wide, so anything drawn with them reads as a
    wire. A ribbon batch draws any number of polylines as camera-facing
    strips with soft edges, per-point colour and fade, in a single draw call.

✒ Key Features:
    - Screen-space width in CSS pixels, constant at any distance.
    - Per-point colour and alpha; HDR colours feed the bloom pass.
    - Additive or normally blended.
    - Strips are written with begin(), point(), strip() and end() every frame,
      with no allocation.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';

const VERT = `
  attribute vec3 prev; attribute vec3 next; attribute float side; attribute vec4 tint; attribute float wide;
  uniform vec2 uRes; uniform float uWidth;
  varying vec4 vTint; varying float vSide;
  void main() {
    mat4 pv = projectionMatrix * modelViewMatrix;
    vec4 c = pv * vec4(position, 1.0), p = pv * vec4(prev, 1.0), n = pv * vec4(next, 1.0);
    vec2 sc = c.xy / max(c.w, 1e-4) * uRes, sp = p.xy / max(p.w, 1e-4) * uRes, sn = n.xy / max(n.w, 1e-4) * uRes;
    vec2 d = sn - sp; float l = length(d); d = l > 1e-4 ? d / l : vec2(1.0, 0.0);
    vec2 off = vec2(-d.y, d.x) * side * uWidth * wide;
    gl_Position = vec4((sc + off) / uRes * c.w, c.z, c.w);
    vTint = tint; vSide = side;
  }`;
const FRAG = `
  varying vec4 vTint; varying float vSide;
  void main() {
    float e = 1.0 - smoothstep(0.35, 1.0, abs(vSide));
    gl_FragColor = vec4(vTint.rgb, vTint.a * e);
    #include <colorspace_fragment>
  }`;

export function createRibbons(cap, { width = 1.5, additive = true, depthTest = true } = {}) {
  const vcount = cap * 2;
  const pos = new Float32Array(vcount * 3), prev = new Float32Array(vcount * 3), next = new Float32Array(vcount * 3);
  const side = new Float32Array(vcount), tint = new Float32Array(vcount * 4), wide = new Float32Array(vcount);
  const index = new Uint32Array((cap - 1) * 6);
  for (let i = 0; i < cap; i++) { side[i * 2] = -1; side[i * 2 + 1] = 1; }
  const g = new THREE.BufferGeometry();
  const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
  const A = { position: attr(pos, 3), prev: attr(prev, 3), next: attr(next, 3), side: new THREE.BufferAttribute(side, 1), tint: attr(tint, 4), wide: attr(wide, 1) };
  for (const [k, v] of Object.entries(A)) g.setAttribute(k, v);
  const I = attr(index, 1); g.setIndex(I);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest, side: THREE.DoubleSide, toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: width } },
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  let n = 0, start = 0, tris = 0;

  return {
    mesh,
    setResolution(w, h) { mat.uniforms.uRes.value.set(w / 2, h / 2); },
    begin() { n = 0; start = 0; tris = 0; },
    /* Append a point to the open strip. Beyond the capacity, points are dropped. */
    point(x, y, z, r, gr, b, a, w = 1) {
      if (n >= cap) return;
      const v = n * 2, p = v * 3;
      pos[p] = pos[p + 3] = x; pos[p + 1] = pos[p + 4] = y; pos[p + 2] = pos[p + 5] = z;
      const t = v * 4;
      for (let k = 0; k < 2; k++) { tint[t + k * 4] = r; tint[t + k * 4 + 1] = gr; tint[t + k * 4 + 2] = b; tint[t + k * 4 + 3] = a; }
      wide[v] = wide[v + 1] = w;
      n++;
    },
    /* Close the open strip: link neighbours, cap the ends and emit its triangles. */
    strip() {
      const c = n - start;
      if (c >= 2) {
        for (let i = start; i < n; i++) {
          const a = Math.max(start, i - 1) * 6, b = Math.min(n - 1, i + 1) * 6, v = i * 6;
          for (let k = 0; k < 3; k++) { prev[v + k] = prev[v + 3 + k] = pos[a + k]; next[v + k] = next[v + 3 + k] = pos[b + k]; }
        }
        for (let i = start; i < n - 1; i++) {
          const v = i * 2;
          index[tris++] = v; index[tris++] = v + 1; index[tris++] = v + 2;
          index[tris++] = v + 2; index[tris++] = v + 1; index[tris++] = v + 3;
        }
      }
      start = n;
    },
    end() {
      for (const k of ['position', 'prev', 'next', 'tint', 'wide']) { A[k].clearUpdateRanges(); A[k].addUpdateRange(0, n * 2 * A[k].itemSize); A[k].needsUpdate = true; }
      I.clearUpdateRanges(); I.addUpdateRange(0, tris); I.needsUpdate = true;
      g.setDrawRange(0, tris);
      mesh.visible = tris > 0;
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
