/*
✒ Metadata
    - Title: Fluid Scene (digiSpace Edition - v2.1)
    - File Name: fluid.js
    - Relative Path: js/render/world/scenes/fluid.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the particle fluid as a thick bead of water standing
      between the plates of a glass aquarium.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The fluid lab in the 3D mode: a slim glass aquarium with a brushed-steel
    frame on a walnut plinth, a pale ruled panel behind it, and steel posts
    running from the front glass to the back panel. The solver is 2D, so its
    particles become a density field and the field becomes a body of water:
    thick in the middle, rolling to a rounded rim at every free surface, and
    traced ray by ray through its two curved faces.

✒ Key Features:
    - Particles splatted on the GPU into a half-float field, then blurred
      into a smooth surface and a wide body map that sets the thickness.
    - The bead is ray marched, so its silhouette is exact from any angle.
    - Two refractions through the water, Beer-Lambert absorption, Fresnel
      reflection of the softboxes, specular, meniscus, foam and caustics.
    - Posts are hit analytically, so they occlude and refract in the water.
    - Field size, march length and ripple scale with the graphics tier.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { RAMP_DENS, RAMP_HEAT } from '../../../core/color.js';
import { reduceMotion } from '../../../core/util.js';
import { FL_CAP } from '../../fluid-gl.js';
import { canvasTexture, fbmField } from '../materials.js';
import { bolt, ringFrame, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

/* Tank proportions in scene units. WATER is the bead's half thickness at its fullest. */
const WATER = 0.68, PANE = 0.08, RAIL = 0.2, TRAY = 0.16, FOOT = 0.12, PLINTH = 0.42;
/* The field: FIELD texels across the long side at detail 1. Kernel and blur are in
   smoothing lengths, so the look does not change with the field's resolution. */
const FIELD = 900, KERNEL = 1.3, BLUR = 0.17, BODY = 0.2, TH = 0.07, POSTS = 24;

const FS_VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const SPLAT_VERT = `
  attribute vec4 aP; uniform vec2 uWorld; uniform float uR; varying vec2 vQ; varying vec2 vC;
  void main(){
    vQ = position.xy; vC = aP.zw;
    vec2 c = (aP.xy + position.xy * uR) / uWorld;
    gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  }`;
const SPLAT_FRAG = `
  varying vec2 vQ; varying vec2 vC; uniform float uPeak;
  void main(){ float q = 1.0 - dot(vQ, vQ); if (q <= 0.0) discard; q = q * q * q * uPeak; gl_FragColor = vec4(q, q * vC.x, q * vC.y, q); }`;

/* Nine taps through five bilinear reads. */
const BLUR_FRAG = `
  varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uStep;
  void main(){
    vec4 c = texture2D(tSrc, vUv) * 0.227027;
    c += (texture2D(tSrc, vUv + uStep * 1.3846) + texture2D(tSrc, vUv - uStep * 1.3846)) * 0.316216;
    c += (texture2D(tSrc, vUv + uStep * 3.2308) + texture2D(tSrc, vUv - uStep * 3.2308)) * 0.07027;
    gl_FragColor = c;
  }`;
const MASK_FRAG = `
  varying vec2 vUv; uniform sampler2D tSrc; uniform float uTh;
  void main(){ float m = clamp((texture2D(tSrc, vUv).r - uTh) * 2.4, 0.0, 1.0); gl_FragColor = vec4(m); }`;

/* Density falls to half at a wall because half its kernel is missing, which would thin
   the water against the glass. Dividing by what the kernel can reach keeps it full. */
const RESOLVE_FRAG = `
  varying vec2 vUv; uniform sampler2D tSrc, tBody; uniform vec2 uWorld; uniform float uTh, uReach; uniform vec3 uObs[${POSTS}]; uniform int uPosts;
  float reach(float d){ return smoothstep(-uReach, uReach, d); }
  void main(){
    vec4 f = texture2D(tSrc, vUv);
    vec2 x = vec2(vUv.x, 1.0 - vUv.y) * uWorld;
    float cover = reach(x.x) * reach(uWorld.x - x.x) * reach(x.y) * reach(uWorld.y - x.y);
    for (int i = 0; i < uPosts; i++) cover *= reach(length(x - uObs[i].xy) - uObs[i].z);
    float d = f.r / max(cover, 0.22), w = max(f.r, 1e-4);
    gl_FragColor = vec4((d - uTh) / (1.0 - uTh), f.g / w, f.b / w, texture2D(tBody, vUv).r);
  }`;

/* The softboxes as directions, sharp where the baked environment is soft, because
   water and glass reflect like mirrors. */
const STUDIO = `
  float rect(vec2 q, vec2 h, float e){ vec2 d = abs(q) - h; return (1.0 - smoothstep(-e, e, d.x)) * (1.0 - smoothstep(-e, e, d.y)); }
  vec3 studio(vec3 d){
    vec3 c = mix(vec3(0.008, 0.011, 0.016), vec3(0.03, 0.037, 0.05), smoothstep(-0.3, 0.8, d.y));
    if (d.y > 0.02) { vec2 q = d.xz / d.y; c += vec3(1.0, 0.95, 0.88) * 4.6 * rect(q - vec2(0.0, 0.25), vec2(1.25, 0.72), 0.05); }
    if (d.x < -0.02) { vec2 q = d.zy / -d.x; c += vec3(0.54, 0.77, 1.0) * 5.2 * rect(q - vec2(0.25, 0.32), vec2(0.2, 0.92), 0.03); }
    if (d.x > 0.02) { vec2 q = d.zy / d.x; c += vec3(1.0, 0.68, 0.4) * 4.4 * rect(q - vec2(0.1, 0.3), vec2(0.15, 0.78), 0.03); }
    if (d.z > 0.02) { vec2 q = d.xy / d.z, r = vec2(q.x + 0.22 * q.y, q.y);
      c += vec3(0.86, 0.92, 1.0) * 0.95 * rect(r - vec2(-0.76, 0.0), vec2(0.04, 1.2), 0.05);
      c += vec3(0.86, 0.92, 1.0) * 0.6 * rect(r - vec2(-0.6, 0.0), vec2(0.01, 1.2), 0.016);
      c += vec3(1.0, 0.86, 0.68) * 1.5 * rect(r - vec2(0.62, 0.0), vec2(0.05, 1.0), 0.012); }
    return c;
  }`;

/* The back panel's light, shared by the panel itself and everything that sees it. */
const PANEL = `
  uniform sampler2D tPanel; uniform vec3 uBox;
  vec3 panelAt(vec2 uv){
    vec3 c = texture2D(tPanel, uv).rgb;
    vec2 q = (uv - vec2(0.5, 0.62)) * vec2(1.0, 1.3);
    vec2 e = min(uv, 1.0 - uv) * uBox.xy * 2.0;
    return c * vec3(0.98, 0.97, 0.93) * (0.34 + 0.5 * exp(-dot(q, q) * 3.0)) * (0.5 + 0.5 * smoothstep(0.0, 0.5, min(e.x, e.y)));
  }
  vec3 floorAt(vec3 p){ return panelAt(vec2(p.x / (2.0 * uBox.x) + 0.5, 0.012 + (p.z + uBox.z) / (2.0 * uBox.z) * 0.1)) * 0.62; }
  /* What a ray leaving the water sees: panel, tank floor, or the studio through the glass. */
  vec3 behind(vec3 o, vec3 d){
    float tz = d.z < -1e-3 ? (-uBox.z - o.z) / d.z : 1e5, ty = d.y < -1e-3 ? (-uBox.y - o.y) / d.y : 1e5;
    float tx = (sign(d.x) * uBox.x - o.x) / (abs(d.x) < 1e-4 ? 1e-4 : d.x);
    if (tz < min(tx, ty)) { vec3 p = o + d * tz; return panelAt(p.xy / (2.0 * uBox.xy) + 0.5); }
    if (ty < tx) return floorAt(o + d * ty);
    return studio(d) * 0.7;
  }`;

const POST_HIT = `
  uniform vec3 uPost[${POSTS}]; uniform int uPosts;
  /* The nearest post along a ray, up to tMax. Posts are cylinders along z between the glass and the panel. */
  float postHit(vec3 o, vec3 d, float tMax, out vec3 n){
    float best = tMax, a = dot(d.xy, d.xy) + 1e-7, iz = 1.0 / (abs(d.z) < 1e-6 ? 1e-6 : d.z);
    float z0 = (uBox.z - o.z) * iz, z1 = (-uBox.z - o.z) * iz, tz0 = min(z0, z1), tz1 = max(z0, z1);
    n = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < uPosts; i++) {
      vec2 q = o.xy - uPost[i].xy; float R = uPost[i].z, b = dot(q, d.xy), h = b * b - a * (dot(q, q) - R * R);
      if (h <= 0.0) continue;
      h = sqrt(h);
      float t0 = (-b - h) / a, t1 = (-b + h) / a, t = max(max(t0, tz0), 0.0);
      if (t < min(t1, tz1) && t < best) { best = t; n = t0 >= tz0 && t0 >= 0.0 ? vec3((q + d.xy * t) / R, 0.0) : vec3(0.0, 0.0, 1.0); }
    }
    return best;
  }
  vec3 steelSeen(vec3 p, vec3 d, vec3 n){ vec3 r = reflect(d, n); return (behind(p + n * 0.002, r) * 0.9 + studio(r) * 0.2) * vec3(0.84, 0.87, 0.9); }`;

const WATER_VERT = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const WATER_FRAG = `
  varying vec3 vW;
  uniform sampler2D tField, tHalo, tRipple, tRamp; uniform vec3 uC; uniform vec2 uTexel, uHaloTexel; uniform float uWater, uMode, uClock, uPix, uRipple; uniform int uSteps;
  ${STUDIO}${PANEL}${POST_HIT}
  const vec3 KEY = vec3(-0.3641, 0.7281, 0.5807), ABSORB = vec3(3.2, 1.0, 0.56), TEAL = vec3(0.01, 0.08, 0.115);
  vec2 uvOf(vec2 p){ return p / (2.0 * uBox.xy) + 0.5; }
  /* The bead's section: a round shoulder over the rim, thick in proportion to the body it belongs to. */
  float crown(float s){ s = clamp(s, 0.0, 1.0); return sqrt(s * (2.0 - s)); }
  float girth(float w){ return mix(0.3, 1.0, smoothstep(0.03, 0.8, w)); }
  float gap(vec3 p){
    vec4 f = textureLod(tField, uvOf(p.xy), 0.0);
    return f.r > 0.0 ? abs(p.z) - uWater * crown(f.r) * girth(f.a) : abs(p.z) - f.r * 3.0;
  }
  float caustic(vec2 p){
    vec2 a = texture2D(tRipple, p * 0.17 + uClock * vec2(0.011, -0.019)).rg, b = texture2D(tRipple, p * 0.23 - uClock * vec2(0.016, 0.01)).gr;
    float c = 1.0 - abs(a.x - b.x) * 5.0, e = 1.0 - abs(a.y - b.y) * 5.0;
    return pow(clamp(c, 0.0, 1.0), 4.0) * 0.6 + pow(clamp(e, 0.0, 1.0), 6.0) * 0.5;
  }
  void main(){
    vec3 ro = cameraPosition - uC, rd = normalize(vW - cameraPosition), bx = vec3(uBox.xy, uWater);
    vec3 ia = 1.0 / (rd + vec3(1e-6)), a = (-bx - ro) * ia, b = (bx - ro) * ia, lo = min(a, b), hi = max(a, b);
    float tN = max(max(lo.x, lo.y), max(lo.z, 0.0)), tF = min(hi.x, min(hi.y, hi.z));
    if (tF <= tN) discard;
    vec3 nPost;
    tF = postHit(ro, rd, tF, nPost);
    if (tF <= tN) discard;
    // Nothing near this ray: one coarse read of the body map says so.
    vec3 pm = ro + rd * 0.5 * (tN + tF);
    float spread = length(rd.xy) * (tF - tN) / (2.0 * uBox.x) / uHaloTexel.x;
    if (textureLod(tHalo, uvOf(pm.xy), log2(max(spread, 1.0)) + 1.0).r < 1e-5) discard;

    // March from each glass to the mid-plane, in steps that shrink there, where the thin beads live.
    float tM = abs(rd.z) > 1e-4 ? clamp(-ro.z / rd.z, tN, tF) : 0.5 * (tN + tF);
    float tA = tN, tB = tN, g = gap(ro + rd * tN), gMin = g, tMin = tN;
    bool hit = g < 0.0, entered = hit;
    for (int i = 1; i <= 2 * uSteps && !hit; i++) {
      float u = float(i) / float(uSteps) - 1.0;
      tA = tB; tB = u < 0.0 ? tM - u * u * (tM - tN) : tM + u * u * (tF - tM);
      g = gap(ro + rd * tB);
      if (g < gMin) { gMin = g; tMin = tB; }
      hit = g < 0.0;
    }
    float t = tN, cover = 1.0;
    if (hit && !entered) {
      for (int i = 0; i < 5; i++) { t = 0.5 * (tA + tB); if (gap(ro + rd * t) < 0.0) tB = t; else tA = t; }
      t = tB;
    } else if (!hit) {
      float e = tMin * uPix * 1.4;
      if (gMin > e) discard;
      t = tMin; cover = 1.0 - gMin / e;
    }

    vec3 p = ro + rd * t;
    vec2 uv = uvOf(p.xy), e = uTexel * 1.5, span = 8.0 * e * uBox.xy;
    vec4 f = textureLod(tField, uv, 0.0), l = textureLod(tField, uv - vec2(e.x, 0.0), 0.0), r = textureLod(tField, uv + vec2(e.x, 0.0), 0.0);
    vec4 d = textureLod(tField, uv - vec2(0.0, e.y), 0.0), u = textureLod(tField, uv + vec2(0.0, e.y), 0.0);
    float s = clamp(f.r, 0.0, 1.0), c = max(crown(s), 0.05), w = girth(f.a), H = uWater * crown(s) * w;
    vec2 gs = vec2(r.r - l.r, u.r - d.r) / span, gw = vec2(girth(r.a) - girth(l.a), girth(u.a) - girth(d.a)) / span;
    vec2 gH = uWater * ((1.0 - s) / c * w * gs + c * gw) + 0.018 * gs;
    vec2 w1 = texture2D(tRipple, p.xy * 0.31 + uClock * vec2(0.023, 0.014)).rg - 0.5, w2 = texture2D(tRipple, p.xy * 0.83 - uClock * vec2(0.031, 0.022)).rg - 0.5;
    gH += (w1 + 0.5 * w2) * uRipple * c;
    vec3 N = normalize(vec3(-gH, 1.0));
    if (p.z < 0.0) N.z = -N.z;
    bool side = entered && max(lo.x, lo.y) > lo.z;
    if (side) N = lo.x > lo.y ? vec3(-sign(rd.x), 0.0, 0.0) : vec3(0.0, -sign(rd.y), 0.0);

    vec3 V = -rd;
    float ndv = clamp(dot(N, V), 0.0, 1.0), F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
    vec3 T1 = refract(rd, N, 0.7519);
    if (dot(T1, T1) < 0.01) T1 = rd;
    float L = min((side ? 2.0 * H : max(p.z + H, 0.0)) / max(abs(T1.z), 0.3), 2.4 * H + 0.1), Lt = L;
    vec3 nP, bg;
    float tP = postHit(p, T1, L, nP);
    if (tP < L) { Lt = tP; bg = steelSeen(p + T1 * tP, T1, nP); }
    else {
      vec3 pB = p + T1 * L, Nb = normalize(vec3(N.xy, abs(N.z)));
      vec3 T2 = refract(T1, Nb, 1.33);
      if (dot(T2, T2) < 0.01) bg = studio(reflect(T1, Nb)) * 0.5 + behind(pB, normalize(T1 - Nb * 0.5)) * 0.55;
      else {
        float tEnd = T2.z < -1e-3 ? (-uBox.z - pB.z) / T2.z : 4.0;
        tP = postHit(pB, T2, tEnd, nP);
        bg = tP < tEnd ? steelSeen(pB + T2 * tP, T2, nP) : behind(pB, T2) * (1.0 + 0.55 * caustic(pB.xy + T2.xy * tEnd));
      }
    }

    vec3 dye = vec3(0.0);
    float rich = 1.0 - exp(-Lt * 1.1), lit = 0.55 + 0.45 * smoothstep(-uBox.y, uBox.y, p.y + 0.8);
    vec3 col = bg * exp(-ABSORB * (Lt + 0.2)) + TEAL * rich * lit;
    if (uMode > 0.5) {
      dye = texture2D(tRamp, vec2(uMode < 1.5 ? f.g : f.b, 0.5)).rgb;
      col = bg * pow(dye, vec3(0.3 + 0.6 * Lt)) * 0.58 + dye * (0.36 + 0.26 * lit) * (0.6 + 0.4 * rich);
    } else {
      // Whitewater: the fast water at a free surface, and spray too sparse to hold together.
      float fast = smoothstep(0.7, 1.0, f.g) * (1.0 - smoothstep(0.2, 0.75, s)), thin = 1.0 - smoothstep(0.0, 0.05, f.b), churn = max(fast, thin * 0.85);
      float grain = texture2D(tRipple, p.xy * 2.1 + vec2(0.0, uClock * 0.05)).b + 0.6 * texture2D(tRipple, p.xy * 5.7 - vec2(uClock * 0.07, 0.0)).b;
      float foam = churn * smoothstep(0.84, 1.22, grain + 0.25 * churn);
      col = mix(col, vec3(0.8, 0.9, 0.95) * (0.5 + 0.55 * clamp(dot(N, KEY) * 0.5 + 0.5, 0.0, 1.0)), foam * 0.74);
    }

    vec3 hv = normalize(KEY + V);
    float nh = max(dot(N, hv), 0.0), spec = pow(nh, 520.0) * 16.0 + pow(nh, 70.0) * 0.32;
    // Light the bead gathers: a crescent inside the rim, on the side away from the key.
    float focus = pow(clamp(dot(normalize(N.xy + vec2(1e-4)), -normalize(KEY.xy)), 0.0, 1.0), 2.0) * smoothstep(0.02, 0.2, s) * (1.0 - smoothstep(0.25, 0.7, s));
    float shore = min(uBox.x - abs(p.x), uBox.y - abs(p.y));
    for (int i = 0; i < uPosts; i++) shore = min(shore, length(p.xy - uPost[i].xy) - uPost[i].z);
    float lip = smoothstep(0.0, 0.03, s) * (1.0 - smoothstep(0.05, 0.2, s)), wet = 1.0 - smoothstep(0.012, 0.075, shore);
    vec3 glow = mix(vec3(0.55, 0.86, 0.95), dye * 1.5, step(0.5, uMode));
    col = min(col + glow * (0.45 * focus + 0.24 * lip + 0.2 * wet), vec3(0.94));

    col = mix(col, studio(reflect(rd, N)), F) + vec3(1.0, 0.97, 0.92) * spec;
    gl_FragColor = vec4(col, cover);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const PANEL_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
/* The tank floor reuses the panel's bottom rows, so the tiles turn the corner. */
const PANEL_FRAG = `
  varying vec2 vUv; uniform sampler2D tHalo; uniform float uFloor; ${STUDIO}${PANEL}
  void main(){
    vec3 c = uFloor > 0.5 ? floorAt(vec3((vUv.x - 0.5) * 2.0 * uBox.x, 0.0, (vUv.y - 0.5) * 2.0 * uBox.z)) : panelAt(vUv);
    // The body of water shades the panel behind it, offset away from the key.
    float a = textureLod(tHalo, uFloor > 0.5 ? vec2(vUv.x, 0.02) : vUv + vec2(-0.012, 0.028), 1.4).r;
    c *= mix(vec3(1.0), vec3(0.6, 0.78, 0.84), smoothstep(0.02, 0.75, a));
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const GLASS_VERT = 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * w; }';
/* Reflection is added, not faded by an opacity: that is why glass shows softboxes at full strength. */
const GLASS_FRAG = `
  varying vec3 vW; varying vec3 vN; uniform vec3 uC; uniform float uDirect, uGraze; ${STUDIO}${PANEL}
  void main(){
    vec3 V = normalize(cameraPosition - vW), N = normalize(vN), R = reflect(-V, N), p = vW - uC;
    float nv = clamp(dot(N, V), 0.0, 1.0), F = min(0.075 + 0.925 * pow(1.0 - nv, 5.0), uGraze);
    // Panes seen from inside the tank mirror the panel; from outside, the softboxes.
    bool within = abs(p.x) < uBox.x + 0.2 && abs(p.y) < uBox.y + 0.2 && abs(p.z) < uBox.z + 0.2 && dot(N, p) < 0.0;
    vec3 c = min((within && R.z < 0.0 ? behind(p, R) : studio(R)) * F, vec3(0.9));
    float a = clamp(0.012 + F * 0.8, 0.0, 1.0);
    gl_FragColor = vec4(c + vec3(0.07, 0.17, 0.16) * pow(1.0 - nv, 4.0) * 0.2, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // With no post chain this blends in display space, where an encoded reflection reads far too bright.
    if (uDirect > 0.5) gl_FragColor.rgb = c * 0.6;
  }`;

const POST_VERT = `
  varying vec3 vW; varying vec3 vN; varying vec2 vR;
  void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vN = mat3(modelMatrix) * mat3(instanceMatrix) * normal; vR = position.xz; gl_Position = projectionMatrix * viewMatrix * w; }`;
/* Polished steel mirrors the bright panel beside it, which the shared environment does not hold. */
const POST_FRAG = `
  varying vec3 vW; varying vec3 vN; varying vec2 vR; uniform sampler2D tField; uniform vec3 uC; ${STUDIO}${PANEL}
  void main(){
    vec3 V = normalize(cameraPosition - vW), N = normalize(vN), R = reflect(-V, N), p = vW - uC;
    float F = 0.62 + 0.38 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
    vec3 c = (R.z < 0.0 ? behind(p, R) : studio(R) * 0.8 + vec3(0.03)) * vec3(0.92, 0.94, 0.97) * F + studio(R) * 0.25;
    // Faces turned on a lathe: fine circular grooves throw a bow of light across the disc.
    float face = smoothstep(0.7, 0.95, abs(N.z)), r = length(vR);
    if (face > 0.0) {
      vec2 toLight = normalize(vec2(-0.45, 0.9) + (V.xy - vec2(0.3, 0.1)) * 0.8), q = vR / max(r, 1e-3);
      float bow = pow(abs(dot(q, toLight)), 9.0), groove = 0.9 + 0.1 * sin(r * 60.0);
      c = mix(c, vec3(0.13, 0.145, 0.165) + vec3(0.78, 0.82, 0.88) * bow * groove + studio(R) * 0.5, face);
    }
    float s = clamp(textureLod(tField, (p.xy + N.xy * 0.05) / (2.0 * uBox.xy) + 0.5, 0.0).r * 3.0, 0.0, 1.0);
    c *= mix(vec3(1.0), vec3(0.42, 0.72, 0.82), s);
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/* A pale, glazed tile board ruled like a flume's backing plate. It is what the water bends. */
function paintPanel(renderer, hw, hh) {
  const S = 2048, Hp = Math.round(S * hh / hw), c = document.createElement('canvas'); c.width = S; c.height = Hp;
  const g = c.getContext('2d'), u = S / (2 * hw), T = 0.5, nx = Math.ceil(2 * hw / T), ny = Math.ceil(2 * hh / T);
  let seed = 48271;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  g.fillStyle = '#6d7880'; g.fillRect(0, 0, S, Hp);
  const inset = 0.011 * u;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = i * T * u, y = Hp - (j + 1) * T * u, w = T * u, t = 216 + rnd() * 11, b = g.createLinearGradient(x, y, x + w, y + w);
    b.addColorStop(0, `rgb(${t + 8},${t + 9},${t + 6})`); b.addColorStop(1, `rgb(${t - 9},${t - 7},${t - 7})`);
    g.fillStyle = b; g.fillRect(x + inset, y + inset, w - 2 * inset, w - 2 * inset);
  }
  g.strokeStyle = 'rgba(58,74,92,0.26)'; g.lineWidth = 1.6;
  for (let i = 1; i * 0.1 < 2 * hw; i++) if (i % 5) { const x = i * 0.1 * u; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hp); g.stroke(); }
  for (let j = 1; j * 0.1 < 2 * hh; j++) if (j % 5) { const y = Hp - j * 0.1 * u; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  g.fillStyle = '#23303d'; g.font = `500 ${Math.round(0.13 * u)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
  for (let j = 1; j < 2 * hh; j++) { const y = Hp - j * u; g.fillRect(0, y - 2.4, 0.22 * u, 4.8); g.fillRect(S - 0.22 * u, y - 2.4, 0.22 * u, 4.8); g.textAlign = 'left'; g.fillText(String(j), 0.27 * u, y); g.textAlign = 'right'; g.fillText(String(j), S - 0.27 * u, y); }
  const t = canvasTexture(c, { renderer, srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* A tiling gradient of fBm in red and green, and the fBm itself in blue. */
function rippleTexture() {
  const S = 256, f = fbmField(37, 5, 4), H = new Float32Array(S * S), d = new Uint8Array(S * S * 4);
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) H[p] = f(x / S, y / S);
  const at = (x, y) => H[((y + S) % S) * S + (x + S) % S];
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) {
    d[p * 4] = Math.max(0, Math.min(255, 127.5 + (at(x + 1, y) - at(x - 1, y)) * 2400));
    d[p * 4 + 1] = Math.max(0, Math.min(255, 127.5 + (at(x, y + 1) - at(x, y - 1)) * 2400));
    d[p * 4 + 2] = H[p] * 255; d[p * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
function rampTexture(ramp) {
  const d = new Uint8Array(1024);
  for (let i = 0; i < 256; i++) { for (let k = 0; k < 3; k++) d[i * 4 + k] = ramp.rgb[i * 3 + k]; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

export function createScene(E, lab) {
  const studio = createStudio(E, {
    keyPos: [-6.5, 12, 13], keyTarget: [0, 2.6, 0], key: 760, keyAngle: 0.5, shadowSpan: 40, envLook: { power: 1.3 }, envIntensity: 1.2,
    dome: { glowDir: [0.08, 0.16, -1], glow: 0x18283a, glowPow: 5 }, floor: { repeat: 6, reflect: 1, f0: 0.09 },
  });
  const { scene } = studio, M = E.mats, DEPTH = lab.rig3.depth;

  /* ---------- the density field ---------- */
  const packed = new Float32Array(FL_CAP * 4), inst = new THREE.InstancedBufferAttribute(packed, 4).setUsage(THREE.DynamicDrawUsage);
  const splatGeo = new THREE.InstancedBufferGeometry();
  splatGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  splatGeo.setIndex([0, 1, 2, 0, 2, 3]); splatGeo.setAttribute('aP', inst); splatGeo.instanceCount = 0;
  const flat = { depthTest: false, depthWrite: false, toneMapped: false };
  const splatMat = new THREE.ShaderMaterial({
    ...flat, vertexShader: SPLAT_VERT, fragmentShader: SPLAT_FRAG, side: THREE.DoubleSide, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: { uWorld: { value: new THREE.Vector2(1, 1) }, uR: { value: KERNEL }, uPeak: { value: 0.1 } },
  });
  const splats = new THREE.Mesh(splatGeo, splatMat); splats.frustumCulled = false;
  const splatScene = new THREE.Scene(); splatScene.add(splats);
  const blurMat = new THREE.ShaderMaterial({ ...flat, vertexShader: FS_VERT, fragmentShader: BLUR_FRAG, uniforms: { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } } });
  const maskMat = new THREE.ShaderMaterial({ ...flat, vertexShader: FS_VERT, fragmentShader: MASK_FRAG, uniforms: { tSrc: { value: null }, uTh: { value: TH } } });
  const postWorld = Array.from({ length: POSTS }, () => new THREE.Vector3()), postScene = Array.from({ length: POSTS }, () => new THREE.Vector3());
  const resolveMat = new THREE.ShaderMaterial({ ...flat, vertexShader: FS_VERT, fragmentShader: RESOLVE_FRAG,
    uniforms: { tSrc: { value: null }, tBody: { value: null }, uWorld: { value: new THREE.Vector2(1, 1) }, uTh: { value: TH }, uReach: { value: KERNEL * 1.05 }, uObs: { value: postWorld }, uPosts: { value: 0 } } });
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(quadGeo, blurMat); quad.frustumCulled = false;
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const flatCam = new THREE.Camera();
  const target = (w, h, wrap, mips) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, wrapS: wrap, wrapT: wrap, magFilter: THREE.LinearFilter, minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, generateMipmaps: !!mips });
  let T = null;
  const freeTargets = () => { if (T) for (const t of Object.values(T)) t.dispose(); T = null; };

  /* ---------- the water ---------- */
  const ripple = rippleTexture(), ramps = { speed: rampTexture(RAMP_HEAT), density: rampTexture(RAMP_DENS) };
  const shared = {
    tPanel: { value: null }, tField: { value: null }, tHalo: { value: null }, tRipple: { value: ripple }, tRamp: { value: ramps.speed },
    uBox: { value: new THREE.Vector3(1, 1, DEPTH / 2) }, uC: { value: new THREE.Vector3() }, uPost: { value: postScene }, uPosts: { value: 0 }, uDirect: { value: 0 }, uGraze: { value: 1 },
  };
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false, side: THREE.FrontSide,
    uniforms: { ...shared, uTexel: { value: new THREE.Vector2() }, uHaloTexel: { value: new THREE.Vector2() }, uWater: { value: WATER }, uMode: { value: 0 }, uClock: { value: 0 }, uPix: { value: 0.001 }, uRipple: { value: 0.06 }, uSteps: { value: 10 } },
  });
  const water = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), waterMat); water.renderOrder = 2; water.frustumCulled = false; scene.add(water);
  let inside = false;

  /* ---------- the tank ---------- */
  const tank = new THREE.Group(); scene.add(tank);
  let tier = E.tier;
  const panelMat = new THREE.ShaderMaterial({ vertexShader: PANEL_VERT, fragmentShader: PANEL_FRAG, uniforms: { ...shared, uFloor: { value: 0 } } });
  const floorMat = new THREE.ShaderMaterial({ vertexShader: PANEL_VERT, fragmentShader: PANEL_FRAG, uniforms: { ...shared, uFloor: { value: 1 } } });
  const glassMat = new THREE.ShaderMaterial({ vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, uniforms: shared, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.72, metalness: 0 });
  /* The frame's own steel: without antialiasing it goes rougher, so softboxes do not break into dashes on its chamfers. */
  const frameSteel = M.steel().clone(), steelGloss = frameSteel.roughness;
  frameSteel.roughness = tier.msaa ? steelGloss : 0.8;
  const postMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: POST_FRAG, uniforms: shared });
  const postGeo = turned([[0, DEPTH / 2 + 0.012], [0.3, DEPTH / 2 + 0.012], [0.32, DEPTH / 2 + 0.002], [1.1, DEPTH / 2], [1.2, DEPTH / 2 - 0.01], [1.2, DEPTH / 2 - 0.03], [1.04, DEPTH / 2 - 0.05], [1, DEPTH / 2 - 0.08], [1, DEPTH / 4], [1, 0], [1, -DEPTH / 4], [1, -DEPTH / 2 + 0.08], [1.04, -DEPTH / 2 + 0.05], [1.2, -DEPTH / 2 + 0.03], [1.2, -DEPTH / 2], [0, -DEPTH / 2]], 48, 4);
  const posts = new THREE.InstancedMesh(postGeo, postMat, POSTS); posts.count = 0; posts.frustumCulled = false; posts.castShadow = true; scene.add(posts);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const made = [], batches = [];
  let seal = null;
  const batch = (geo, mat, n) => { const o = new THREE.InstancedMesh(geo, mat, n); o.frustumCulled = false; batches.push(o); tank.add(o); return o; };
  const add = (geo, mat, x, y, z, shadow = true) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = shadow; tank.add(o); made.push(geo); return o; };

  function buildTank(hw, hh, Y0) {
    for (const g of made) g.dispose();
    made.length = 0; tank.clear();
    for (const b of batches) b.dispose();
    batches.length = 0;
    const W = 2 * hw, H = 2 * hh, B = Y0 - hh, D = DEPTH, zF = D / 2 + PANE / 2, zB = -D / 2 - 0.06;
    add(new THREE.PlaneGeometry(W, H), panelMat, 0, Y0, -D / 2, false);
    add(roundedBox(W + 2 * RAIL, H + 2 * RAIL, 0.08, 0.02, 2), M.gunmetal(), 0, Y0, zB - 0.02);
    const inner = add(new THREE.PlaneGeometry(W, D), floorMat, 0, B + 0.004, 0, false); inner.rotation.x = -Math.PI / 2;
    // Frame: a machined front and rear ring, joined by rails along the depth.
    add(ringFrame(W, H, RAIL, 0.14, 0.02, 0.055), frameSteel, 0, Y0, zF);
    add(ringFrame(W, H, RAIL, 0.14, 0.02, 0.055), frameSteel, 0, Y0, zB);
    for (const sx of [-1, 1]) for (const y of [B - RAIL / 2, B + H + RAIL / 2]) add(roundedBox(RAIL, RAIL, D, 0.02, 3), frameSteel, sx * (hw + RAIL / 2), y, 0);
    // Silicone in the rebate, between the glass and the steel.
    seal = add(ringFrame(W - 0.012, H - 0.012, 0.04, 0.02, 0.01, 0.006), rubber, 0, Y0, D / 2 + PANE + 0.012, false);
    seal.visible = tier.msaa > 0;
    const glass = (w, h, d, x, y, z) => { const o = add(roundedBox(w, h, d, 0.016, 3), glassMat, x, y, z, false); o.renderOrder = 3; return o; };
    glass(W, H, PANE, 0, Y0, zF); glass(PANE, H, D, -hw - PANE / 2, Y0, 0); glass(PANE, H, D, hw + PANE / 2, Y0, 0); glass(W, PANE, D, 0, B + H + PANE / 2, 0);
    // Base: tray, sealed rubber feet, plinth.
    const yTray = B - TRAY / 2, yFoot = B - TRAY - FOOT, yPl = yFoot - PLINTH / 2;
    add(roundedBox(W + 2 * RAIL + 0.1, TRAY, D + 0.5, 0.03, 4), M.steel(), 0, yTray, 0);
    add(roundedBox(W + 2 * RAIL + 0.8, PLINTH, D + 1.5, 0.05, 5), M.walnut(), 0, yPl, 0);
    const footGeo = turned([[0, 0], [0.13, 0], [0.15, 0.012], [0.135, 0.03], [0.1, 0.05], [0.095, FOOT - 0.006], [0.09, FOOT], [0, FOOT]], 28, 5);
    const ringGeo = new THREE.TorusGeometry(0.143, 0.011, 10, 36); made.push(footGeo, ringGeo);
    const spots = [];
    for (const x of [-hw + 0.4, 0, hw - 0.4]) for (const z of [-D / 2 - 0.14, D / 2 + 0.14]) spots.push([x, z]);
    const feet = batch(footGeo, rubber, spots.length), rings = batch(ringGeo, M.brass(), spots.length);
    feet.castShadow = true;
    spots.forEach(([x, z], i) => { feet.setMatrixAt(i, m4.makeTranslation(x, yFoot, z)); rings.setMatrixAt(i, m4.compose(v3.set(x, yFoot + 0.015, z), q4, s3.set(1, 1, 1))); });
    // Screws along the front frame, brass in steel.
    const stations = [];
    const nX = Math.max(3, Math.round(W / 1.6)), nY = Math.max(2, Math.round(H / 1.6));
    for (let i = 0; i <= nX; i++) { const x = -hw - RAIL / 2 + (W + RAIL) * i / nX; stations.push([x, B - RAIL / 2], [x, B + H + RAIL / 2]); }
    for (let j = 1; j < nY; j++) { const y = B + H * j / nY; stations.push([-hw - RAIL / 2, y], [hw + RAIL / 2, y]); }
    const screwGeo = bolt(0.03); made.push(screwGeo);
    const screws = batch(screwGeo, M.brass(), stations.length);
    stations.forEach(([x, y], i) => { screws.setMatrixAt(i, m4.compose(v3.set(x, y, zF + 0.07), q4, s3.set(1, 1, 1))); });
  }

  let shape = '', sized = '', plane = null;
  function sizeField() {
    freeTargets();
    const long = Math.max(lab.Wu, lab.Hu), fw = Math.max(64, Math.round(FIELD * tier.detail * lab.Wu / long)), fh = Math.max(64, Math.round(FIELD * tier.detail * lab.Hu / long));
    const ew = Math.max(16, fw >> 2), eh = Math.max(16, fh >> 2), clamp = THREE.ClampToEdgeWrapping, mirror = THREE.MirroredRepeatWrapping;
    T = { splat: target(fw, fh, clamp), blur: target(fw, fh, clamp), wide: target(fw, fh, clamp), field: target(fw, fh, clamp), m0: target(ew, eh, mirror), m1: target(ew, eh, mirror), body: target(ew, eh, mirror, true) };
    waterMat.uniforms.uTexel.value.set(1 / fw, 1 / fh); waterMat.uniforms.uHaloTexel.value.set(1 / ew, 1 / eh);
    shared.tField.value = T.field.texture; shared.tHalo.value = T.body.texture;
    waterMat.uniforms.uSteps.value = Math.round(5 + 9 * tier.detail);
  }
  function layout() {
    const P = lab.plane3(), k = `${P.hw.toFixed(3)}:${P.hh.toFixed(3)}:${P.o[1].toFixed(3)}`, f = `${tier.id}:${lab.Wu.toFixed(2)}:${lab.Hu.toFixed(2)}`;
    plane = P;
    if (k !== shape) {
      shape = k;
      const old = shared.tPanel.value;
      shared.tPanel.value = paintPanel(E.renderer, P.hw, P.hh);
      if (old) old.dispose();
      buildTank(P.hw, P.hh, P.o[1]);
      shared.uBox.value.set(P.hw, P.hh, DEPTH / 2); shared.uC.value.set(0, P.o[1], 0);
      water.position.set(0, P.o[1], 0); water.scale.set(2 * P.hw, 2 * P.hh, DEPTH);
    }
    if (f !== sized) { sized = f; sizeField(); }
  }

  const keep = new THREE.Color();
  return {
    scene, studio, exposure: 1, bloom: { strength: 0.12, radius: 0.45, threshold: 1 },
    onTier(t) { tier = t; shared.uDirect.value = t.bloom || t.grade || t.msaa ? 0 : 1; shared.uGraze.value = t.msaa ? 1 : 0.22; if (seal) seal.visible = t.msaa > 0; frameSteel.roughness = t.msaa ? steelGloss : 0.8; },
    sync(l, view) {
      layout();
      const n = Math.min(lab.n, FL_CAP), X = lab.x, Y = lab.y, VX = lab.vx, VY = lab.vy, R = lab.rho, D = packed, sp = lab.U / lab.TICK / 520, r0 = lab.rho0;
      for (let i = 0, o = 0; i < n; i++, o += 4) {
        const v = Math.sqrt(VX[i] * VX[i] + VY[i] * VY[i]) * sp, q = (R[i] / r0 - 0.4) / 1.2;
        D[o] = X[i]; D[o + 1] = Y[i]; D[o + 2] = v < 1 ? v : 1; D[o + 3] = q < 0 ? 0 : q > 1 ? 1 : q;
      }
      inst.clearUpdateRanges(); inst.addUpdateRange(0, n * 4); inst.needsUpdate = true; splatGeo.instanceCount = n;

      const Wu = lab.Wu, Hu = lab.Hu, P = plane, ppu = 2 * P.hw / Wu, c = Math.min(lab.obs.length, POSTS);
      const density = 2 / (lab.spacing * lab.spacing * Math.sqrt(3));
      splatMat.uniforms.uWorld.value.set(Wu, Hu); splatMat.uniforms.uPeak.value = 4 / (density * Math.PI * KERNEL * KERNEL);
      resolveMat.uniforms.uWorld.value.set(Wu, Hu); resolveMat.uniforms.uPosts.value = shared.uPosts.value = c;
      for (let i = 0; i < c; i++) {
        const o = lab.obs[i], x = (o.x - Wu / 2) * ppu, y = (Hu / 2 - o.y) * ppu, r = o.r * ppu;
        postWorld[i].set(o.x, o.y, o.r); postScene[i].set(x, y, r);
        posts.setMatrixAt(i, m4.compose(v3.set(x, P.o[1] + y, 0), q4, s3.set(r, 1, r)));
      }
      posts.count = c; posts.instanceMatrix.needsUpdate = true;

      const mode = lab.p.colorBy, W = waterMat.uniforms, cam = view.camera.position, hz = DEPTH / 2 + PANE, nowIn = Math.abs(cam.x) < P.hw + PANE && Math.abs(cam.y - P.o[1]) < P.hh + PANE && Math.abs(cam.z) < hz;
      W.uMode.value = mode === 'speed' ? 1 : mode === 'density' ? 2 : 0; shared.tRamp.value = mode === 'density' ? ramps.density : ramps.speed;
      W.uClock.value = reduceMotion ? 0 : lab.t; W.uPix.value = 1 / (view.px * view.pr);
      if (nowIn !== inside) { inside = nowIn; waterMat.side = inside ? THREE.BackSide : THREE.FrontSide; waterMat.needsUpdate = true; }
    },
    prepare(renderer) {
      const was = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), auto = renderer.autoClear;
      renderer.getClearColor(keep); renderer.setClearColor(0x000000, 0); renderer.autoClear = true;
      const Wu = lab.Wu, Hu = lab.Hu, B = blurMat.uniforms, P = plane;
      const run = (mat, to) => { quad.material = mat; renderer.setRenderTarget(to); renderer.render(quadScene, flatCam); };
      const blur = (from, to, x, y) => { B.tSrc.value = from.texture; B.uStep.value.set(x, y); run(blurMat, to); };
      renderer.setRenderTarget(T.splat); renderer.render(splatScene, flatCam);
      blur(T.splat, T.blur, BLUR / Wu, 0); blur(T.blur, T.wide, 0, BLUR / Hu);
      maskMat.uniforms.tSrc.value = T.wide.texture; run(maskMat, T.m0);
      blur(T.m0, T.m1, BODY / (2 * P.hw), 0); blur(T.m1, T.body, 0, BODY / (2 * P.hh));
      resolveMat.uniforms.tSrc.value = T.wide.texture; resolveMat.uniforms.tBody.value = T.body.texture; run(resolveMat, T.field);
      renderer.setRenderTarget(was); renderer.autoClear = auto; renderer.setClearColor(keep, alpha);
    },
    dispose() {
      studio.dispose(); freeTargets();
      for (const g of made) g.dispose();
      for (const b of batches) b.dispose();
      for (const o of [splatGeo, splatMat, blurMat, maskMat, resolveMat, quadGeo, waterMat, water.geometry, panelMat, floorMat, glassMat, rubber, frameSteel, postMat, postGeo, ripple, ramps.speed, ramps.density]) o.dispose();
      if (shared.tPanel.value) shared.tPanel.value.dispose();
      posts.dispose();
    },
  };
}
