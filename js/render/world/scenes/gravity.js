/*
✒ Metadata
    - Title: Gravity Scene (digiSpace Edition - v2.5)
    - File Name: gravity.js
    - Relative Path: js/render/world/scenes/gravity.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — A planet's
      surface and colour come from its type, read from the lab, instead of
      from its mass and id; stars are the bodies typed as stars, and only gas
      giants carry rings.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the gravity lab as open space, with procedural worlds.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The gravity lab in the 3D mode, and the one scene that is not a studio:
    open space, simulated in real depth and seen through the lab's own camera.
    Stars are the true light source of the system, and every planet is shaded
    in its fragment shader from object-space noise seeded by its body id.

✒ Key Features:
    - Sky: fBm nebula and galactic band baked once into a cube map, with stars
      drawn as a crisp point field, both centred on the camera.
    - Stars: flowing plasma surface, limb darkening, HDR colour by mass, an
      animated corona and a lens glare that a passing body can hide.
    - Planets: rocky, oceanic and banded surfaces in one material and one
      instanced mesh, chosen by each body's type (ice giants and brown dwarfs
      are banded in their own colours); close bodies move to a finer sphere in
      a second batch.
    - Up to three star lights, a soft terminator, a real night side, an
      atmospheric rim, a shell of air on close worlds and rings on gas giants.
    - Trails, drop lines and velocity arrows as ribbons, thinned by tier.
    - A faint polar grid on the orbital plane, drawn analytically.
    - Merges flash and pulse the bloom; the flash is watched from the lab's
      merge count, never written back.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { reduceMotion } from '../../../core/util.js';
import { createRibbons } from '../ribbons.js';

const TAU = Math.PI * 2, MAX_LIGHTS = 3, MIN_STAR_PX = 4, MIN_BODY_PX = 2.6, HERO_PX = 22, HERO_CAP = 24, RING_CAP = 48, FLASH_CAP = 16;
const TRAIL_POINTS = 56000, MARK_POINTS = 12000, SKY_STARS = 24000, RING_MASS = 1.5, FALL = 300, BLOOM = 0.3;
const RING_IN = 1.46, RING_OUT = 2.02;
/* The band crosses the home view diagonally, behind the system, with its bulge just off centre. */
const POLE = new THREE.Vector3(-0.62, 0.73, -0.26).normalize(), BAND_U = new THREE.Vector3().crossVectors(POLE, new THREE.Vector3(0.2, 0.1, 1)).normalize(), BAND_W = new THREE.Vector3().crossVectors(POLE, BAND_U);
const HOME = new THREE.Vector3(-0.39, -0.58, -0.71), BULGE = Math.atan2(HOME.dot(BAND_W), HOME.dot(BAND_U)) + 0.45;
const v3 = v => `vec3(${v.x.toFixed(6)}, ${v.y.toFixed(6)}, ${v.z.toFixed(6)})`;

/* ---------- shared GLSL ---------- */
const NOISE = `
  vec3 hash33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  float gn(vec3 i, vec3 f, vec3 o) { return dot(hash33(i + o) * 2.0 - 1.0, f - o); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = x - i, u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return 1.6 * mix(mix(mix(gn(i, f, vec3(0.0, 0.0, 0.0)), gn(i, f, vec3(1.0, 0.0, 0.0)), u.x), mix(gn(i, f, vec3(0.0, 1.0, 0.0)), gn(i, f, vec3(1.0, 1.0, 0.0)), u.x), u.y),
                     mix(mix(gn(i, f, vec3(0.0, 0.0, 1.0)), gn(i, f, vec3(1.0, 0.0, 1.0)), u.x), mix(gn(i, f, vec3(0.0, 1.0, 1.0)), gn(i, f, vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
  }
  /* Octaves fade in by a fractional count, so detail never pops as a body grows on screen. */
  float fbm(vec3 p, float oct) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 9 && float(i) < oct; i++) { s += a * clamp(oct - float(i), 0.0, 1.0) * noise(p); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; }
    return s;
  }
  /* Value and analytic gradient of gradient noise: bump lighting without extra height samples. */
  vec4 noised(vec3 x) {
    vec3 p = floor(x), w = x - p, u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0), du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
    vec3 ga = hash33(p) * 2.0 - 1.0, gb = hash33(p + vec3(1.0, 0.0, 0.0)) * 2.0 - 1.0, gc = hash33(p + vec3(0.0, 1.0, 0.0)) * 2.0 - 1.0, gd = hash33(p + vec3(1.0, 1.0, 0.0)) * 2.0 - 1.0;
    vec3 ge = hash33(p + vec3(0.0, 0.0, 1.0)) * 2.0 - 1.0, gf = hash33(p + vec3(1.0, 0.0, 1.0)) * 2.0 - 1.0, gg = hash33(p + vec3(0.0, 1.0, 1.0)) * 2.0 - 1.0, gh = hash33(p + vec3(1.0, 1.0, 1.0)) * 2.0 - 1.0;
    float va = dot(ga, w), vb = dot(gb, w - vec3(1.0, 0.0, 0.0)), vc = dot(gc, w - vec3(0.0, 1.0, 0.0)), vd = dot(gd, w - vec3(1.0, 1.0, 0.0));
    float ve = dot(ge, w - vec3(0.0, 0.0, 1.0)), vf = dot(gf, w - vec3(1.0, 0.0, 1.0)), vg = dot(gg, w - vec3(0.0, 1.0, 1.0)), vh = dot(gh, w - vec3(1.0, 1.0, 1.0));
    float k0 = va - vb - vc + vd, k1 = va - vc - ve + vg, k2 = va - vb - ve + vf, k3 = -va + vb + vc - vd + ve - vf - vg + vh;
    return 1.6 * vec4(va + u.x * (vb - va) + u.y * (vc - va) + u.z * (ve - va) + u.x * u.y * k0 + u.y * u.z * k1 + u.z * u.x * k2 + u.x * u.y * u.z * k3,
      ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga) + u.x * u.y * (ga - gb - gc + gd) + u.y * u.z * (ga - gc - ge + gg) + u.z * u.x * (ga - gb - ge + gf) + u.x * u.y * u.z * (-ga + gb + gc - gd + ge - gf - gg + gh)
      + du * (vec3(vb - va, vc - va, ve - va) + u.yzx * vec3(k0, k1, k2) + u.zxy * vec3(k2, k0, k1) + u.yzx * u.zxy * k3));
  }
  vec4 fbmd(vec3 p, float oct) {
    float a = 0.5, f = 1.0; vec4 s = vec4(0.0);
    for (int i = 0; i < 9 && float(i) < oct; i++) { vec4 n = noised(p * f + float(i) * 11.7) * a * clamp(oct - float(i), 0.0, 1.0); s.x += n.x; s.yzw += n.yzw * f; a *= 0.5; f *= 2.03; }
    return s;
  }`;
const OUTPUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;
/* A camera-facing quad at an instance's centre; vQ runs -1..1 across it and the instance scale is its half size. */
const BILLBOARD = `
  varying vec2 vQ;
  void billboard(float k) {
    vec4 c = viewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
    vQ = position.xy;
    c.xy += position.xy * length(instanceMatrix[0].xyz) * k;
    gl_Position = projectionMatrix * c;
  }`;

/* ---------- sky ---------- */
const SKY_BAKE = `
  varying vec3 vD;
  ${NOISE}
  float wrapA(float a) { return mod(a + 3.14159265, 6.2831853) - 3.14159265; }
  /* Ridged noise: the thin filaments inside a cloud. */
  float wisp(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { float n = 1.0 - abs(noise(p)) * 1.7; s += a * n * n; p = p * 2.03 + vec3(5.1, 1.3, 8.7); a *= 0.5; } return s; }
  void main() {
    vec3 d = normalize(vD), P = ${v3(POLE)}, U = ${v3(BAND_U)}, W = ${v3(BAND_W)};
    float lat = dot(d, P), lon = atan(dot(d, W), dot(d, U));
    // One slow warp runs through everything, so dust and band read as one sky.
    vec3 q = d * 1.6, warp = vec3(fbm(q + vec3(1.7, 9.2, 3.1), 4.0), fbm(q + vec3(8.3, 2.8, 5.5), 4.0), fbm(q + vec3(4.1, 6.3, 7.7), 4.0));
    vec3 e = d + warp * 0.42;
    float deep = fbm(e * 1.2 + 3.0, 4.0);
    vec3 c = mix(vec3(0.0013, 0.0019, 0.0042), vec3(0.0040, 0.0068, 0.0150), smoothstep(-0.4, 0.5, deep));

    // Dust clouds lit in the house colours: never thresholded, only raised to a power, so they thin out into nothing.
    float mt = smoothstep(-0.25, 0.5, noise(d * 0.8 + 2.0)), ma = smoothstep(-0.2, 0.5, noise(d * 0.75 + 13.0));
    float t = pow(clamp(0.6 + 1.2 * fbm(e * 1.9 + 11.0, 6.0), 0.0, 1.0), 4.0) * mt;
    float am = pow(clamp(0.58 + 1.25 * fbm(e * 1.7 - 7.0, 6.0), 0.0, 1.0), 4.0) * ma;
    float tw = wisp(e * 3.3 + 4.0), aw = wisp(e * 3.0 - 9.0);
    c += vec3(0.010, 0.056, 0.066) * t * (0.32 + 1.5 * tw * tw) + vec3(0.092, 0.047, 0.014) * am * (0.3 + 1.6 * aw * aw);

    // The galactic band: pale unresolved stars, warmer toward a central bulge, split by dust lanes.
    float la = lat + 0.07 * warp.x, spread = 0.15 + 0.05 * noise(d * 1.8 + 5.0);
    float band = exp(-la * la / (spread * spread)), bulge = exp(-pow(wrapA(lon - ${BULGE.toFixed(4)}) / 1.05, 2.0)) * exp(-la * la / 0.035);
    float milk = 0.5 + fbm(e * 7.0 + 1.0, 6.0), lanes = smoothstep(0.0, 0.4, fbm(e * 2.6 + vec3(3.3, 8.1, 1.4), 6.0) - 0.6 * abs(la) + 0.05);
    vec3 bandC = mix(vec3(0.024, 0.031, 0.052), vec3(0.092, 0.068, 0.046), bulge);
    c *= 1.0 - 0.6 * lanes;
    c += bandC * (band * (0.2 + 0.58 * milk) + 0.62 * bulge * milk) * (1.0 - 0.88 * lanes * exp(-la * la / 0.03));

    // Unresolved star dust, thickest in the band.
    vec3 g = d * 300.0, id = floor(g), r = hash33(id), f = g - id - 0.25 - 0.5 * r;
    float dust = step(0.9 - 0.42 * band, r.z) * exp(-dot(f, f) * 30.0) * (0.15 + 0.85 * r.y * r.y);
    c += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.66), r.x) * dust * (0.01 + 0.04 * band);
    gl_FragColor = vec4(c, 1.0);
  }`;
function bakeSky(renderer, size) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { format: THREE.RGBFormat, type: THREE.UnsignedInt101111Type, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthTest: false, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SKY_BAKE });
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat), room = new THREE.Scene();
  room.add(box);
  new THREE.CubeCamera(0.1, 10, rt).update(renderer, room);
  box.geometry.dispose(); mat.dispose();
  return rt;
}
/* Everything in the sky ignores the camera's position: directions only, turned by the view rotation. */
const SKY_DIR = 'vec4 c = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = vec4(c.xy, c.w * 0.99999, c.w);';
function createSkyDome(tex) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthTest: false, depthWrite: false, uniforms: { tSky: { value: tex } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; ${SKY_DIR} }`,
    fragmentShader: `varying vec3 vD; uniform samplerCube tSky;
      void main() {
        vec3 c = textureCube(tSky, normalize(vD)).rgb;
        gl_FragColor = vec4(c, 1.0);
        ${OUTPUT}
      }`,
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
  m.frustumCulled = false; m.renderOrder = -20;
  return m;
}
/* A fixed star field: flux follows a power law, colour a spread of spectral classes, and about half lie near the band. */
function createStarfield() {
  let seed = 90210;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(TAU * rnd());
  const CLASS = [[0.05, 0.62, 0.72, 1], [0.18, 0.78, 0.85, 1], [0.42, 1, 0.97, 0.93], [0.68, 1, 0.88, 0.70], [0.9, 1, 0.72, 0.46], [1.01, 1, 0.56, 0.32]];
  const pos = new Float32Array(SKY_STARS * 3), col = new Float32Array(SKY_STARS * 3), size = new Float32Array(SKY_STARS), v = new THREE.Vector3();
  for (let i = 0; i < SKY_STARS; i++) {
    if (rnd() < 0.36) {
      const lat = gauss() * 0.19, lon = rnd() * TAU, r = Math.sqrt(Math.max(0, 1 - lat * lat));
      v.copy(BAND_U).multiplyScalar(r * Math.cos(lon)).addScaledVector(BAND_W, r * Math.sin(lon)).addScaledVector(POLE, lat);
    } else { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); v.set(r * Math.cos(a), u, r * Math.sin(a)); }
    v.toArray(pos, i * 3);
    const flux = Math.min(40, Math.pow(1 - rnd(), -0.74)), sp = rnd(), k = CLASS.find(c => sp < c[0]), b = 0.08 * Math.pow(flux, 0.66);
    col[i * 3] = k[1] * b; col[i * 3 + 1] = k[2] * b; col[i * 3 + 2] = k[3] * b;
    size[i] = Math.min(3.6, 1.35 + 0.44 * Math.log2(flux));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.BufferAttribute(col, 3)); g.setAttribute('aS', new THREE.BufferAttribute(size, 1));
  // Opaque queue with additive blending, so the stars land straight after the dome and before everything else.
  const mat = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, uniforms: { uPR: { value: 1 } },
    vertexShader: `attribute vec3 aC; attribute float aS; uniform float uPR; varying vec3 vC;
      void main(){ vC = aC; ${SKY_DIR} gl_PointSize = aS * uPR; }`,
    fragmentShader: `varying vec3 vC;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0, k = exp(-r * r * 6.5) * smoothstep(1.0, 0.75, r);
        gl_FragColor = vec4(vC * k, 1.0);
        ${OUTPUT}
      }`,
  });
  const m = new THREE.Points(g, mat);
  m.frustumCulled = false; m.renderOrder = -19;
  return m;
}

/* ---------- planets ---------- */
const PLANET_VS = `
  attribute vec4 aA, aB, aD; attribute vec3 aC;
  uniform float uSpin;
  varying vec3 vW, vN, vO;
  flat varying vec3 vTint, vX, vY, vZ; flat varying vec4 vA, vD; flat varying float vPx;
  void main() {
    vec3 n = position, Y = aB.xyz, X0 = normalize(cross(Y, abs(Y.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), Z0 = cross(X0, Y);
    float a = aA.x * 6.2831853 + uSpin * aA.w, c = cos(a), s = sin(a);
    vX = c * X0 - s * Z0; vY = Y; vZ = s * X0 + c * Z0;
    vO = vec3(dot(n, vX), dot(n, vY), dot(n, vZ));
    vec4 w = instanceMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = n; vTint = aC; vA = aA; vD = aD; vPx = aB.w;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const LIGHTING = `
  #define RING_IN ${RING_IN.toFixed(3)}
  #define RING_OUT ${RING_OUT.toFixed(3)}
  uniform vec4 uL[${MAX_LIGHTS}], uLC[${MAX_LIGHTS}]; uniform int uLN; uniform float uFall;
  float wob(float x, float s) { float i = floor(x), f = x - i; f = f * f * (3.0 - 2.0 * f); return mix(fract(sin(i * 12.9898 + s) * 43758.5453), fract(sin((i + 1.0) * 12.9898 + s) * 43758.5453), f); }
  /* Optical depth of a ring: 1D noise at three scales, one clean gap, soft edges. */
  float ringBand(float r, float seed) {
    float x = (r - RING_IN) / (RING_OUT - RING_IN);
    if (x <= 0.0 || x >= 1.0) return 0.0;
    float s = seed * 50.0, b = 0.18 + 0.72 * wob(x * 5.0, s) * wob(x * 13.0, s + 3.0) + 0.42 * wob(x * 29.0, s + 7.0) * wob(x * 3.0, s + 1.0);
    return clamp(b * b * 1.6, 0.03, 1.0) * smoothstep(0.0, 0.03, abs(x - 0.62 - 0.12 * fract(seed * 9.0)) - 0.022) * smoothstep(0.0, 0.08, x) * smoothstep(1.0, 0.9, x);
  }`;
const SURFACES = `
  /* Craters from the eight nearest cells of a jittered grid: a parabolic bowl and a raised rim, with an exact gradient. */
  void craters(vec3 p, float scale, float seed, float w, inout vec3 G, inout float bowl, inout float rays) {
    vec3 q = p * scale + seed * 61.0, base = floor(q - 0.5);
    for (int k = 0; k < 8; k++) {
      vec3 c = base + vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1)), r = hash33(c + seed * 3.1);
      if (r.z > 0.66) continue;
      vec3 ctr = c + 0.25 + 0.5 * vec3(r.x, r.y, fract(r.x * 7.31 + r.y * 3.17)), dv = q - ctr;
      float rad = mix(0.1, 0.205, r.y * r.y), L = length(dv), d = L / rad;
      if (d > 1.5) continue;
      float e = (d - 1.0) / 0.2, rim = exp(-e * e), dh = (d < 1.0 ? 2.0 * d : 0.0) * 0.5 - 0.7 * e * rim / 0.2 * 0.5;
      G += 0.3 * w * dh * dv / max(L, 1e-4) * (0.5 + 0.5 * r.x);
      bowl = max(bowl, w * smoothstep(1.0, 0.72, d));
      rays = max(rays, w * smoothstep(0.26, 0.0, r.x) * exp(-d * 0.9));
    }
  }
  void rocky(vec3 p, float seed, vec3 tint, float oct, float px, inout vec3 alb, inout vec3 G, inout float spec, inout float gloss) {
    vec4 h = fbmd(p * 2.1 + seed * 37.0, oct);
    vec3 grad = h.yzw * 0.06;
    float bowl = 0.0, rays = 0.0;
    craters(p, 2.6, seed, smoothstep(5.0, 16.0, px), grad, bowl, rays);
    craters(p, 5.7, seed + 0.31, smoothstep(14.0, 40.0, px) * 0.8, grad, bowl, rays);
    craters(p, 12.3, seed + 0.67, smoothstep(40.0, 110.0, px) * 0.6, grad, bowl, rays);
    float mare = smoothstep(0.1, -0.2, fbm(p * 1.25 + seed * 91.0, 3.0)), fine = 0.5 + 0.5 * h.x + 0.4 * fbm(p * 11.0 + seed * 7.0, max(oct - 3.0, 0.0));
    vec3 rock = mix(tint, vec3(0.42, 0.39, 0.36), 0.68);
    alb = mix(rock, rock * vec3(0.36, 0.38, 0.42), mare * 0.8) * (0.6 + 0.75 * fine);
    alb *= 1.0 - 0.22 * bowl;
    alb += rock * 0.5 * rays;
    G = grad; spec = 0.03; gloss = 24.0;
  }
  void ocean(vec3 p, float seed, vec3 tint, float oct, float px, float clock, inout vec3 alb, inout vec3 G, inout float spec, inout float gloss, inout float land, inout float cloud) {
    vec4 h = fbmd(p * 1.5 + seed * 53.0, oct + 0.6);
    float e = h.x - 0.1 - 0.12 * fract(seed * 7.0), lat = abs(p.y), rough = noise(p * 3.0 + seed);
    land = smoothstep(0.0, 0.025, e);
    float shelf = smoothstep(-0.16, 0.0, e), ice = smoothstep(0.78, 0.9, lat + 0.2 * fbm(p * 3.4 + seed * 11.0, min(oct, 4.0)));
    vec3 deep = tint * vec3(0.09, 0.15, 0.26) + vec3(0.002, 0.005, 0.016), shallow = tint * 0.3 + vec3(0.0, 0.025, 0.03);
    vec3 soil = mix(vec3(0.3, 0.23, 0.15), mix(vec3(0.07, 0.13, 0.08), tint * 0.22, 0.25), smoothstep(0.15, 0.6, 1.0 - lat - 0.5 * rough));
    soil = mix(soil, vec3(0.32, 0.29, 0.27), smoothstep(0.22, 0.42, e));
    alb = mix(mix(deep, shallow, shelf * shelf * shelf), soil * (0.8 + 1.3 * clamp(e, 0.0, 0.4)), land);
    alb = mix(alb, vec3(0.74, 0.8, 0.84), ice);
    G = h.yzw * 0.05 * land;
    // Small waves break the sun's glitter into a patch of sparkle instead of a mirror disc.
    if (px > 40.0) G += noised(p * 57.0 + seed).yzw * 0.02 * (1.0 - land) * smoothstep(40.0, 140.0, px);
    spec = mix(0.3, 0.04, max(land, ice)); gloss = mix(170.0, 18.0, land);
    // Weather in latitudinal belts, drifting against the surface.
    float a = clock * 0.5, ca = cos(a), sa = sin(a);
    vec3 cp = vec3(ca * p.x - sa * p.z, p.y, sa * p.x + ca * p.z), sq = vec3(cp.x * 1.7, cp.y * 5.4, cp.z * 1.7) + seed * 29.0;
    float wisps = fbm(sq + 1.5 * vec3(fbm(cp * 2.3 + seed, 3.0)), oct + 0.5);
    float belts = 0.5 + 0.5 * sin(p.y * 11.0 + seed * 31.0 + 2.4 * noise(p * 1.7 + seed));
    cloud = smoothstep(0.1, 0.42, wisps + 0.16 * belts - 0.1);
  }
  void giant(vec3 p, float seed, vec3 tint, float oct, float clock, inout vec3 alb, inout float spec, inout float gloss) {
    float k = 8.0 + 10.0 * fract(seed * 13.0), t = clock * 0.35;
    // Each latitude drifts at its own rate, so belts shear past each other as the sim runs.
    float shear = t * sin(p.y * 7.0 + seed * 9.0), c = cos(shear), s = sin(shear);
    vec3 q = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
    float warp = fbm(vec3(q.x * 2.6, q.y * 8.0, q.z * 2.6) + seed * 41.0, oct), curl = fbm(vec3(q.x * 7.0, q.y * 21.0, q.z * 7.0) + 2.0 * warp + seed, oct);
    float y = q.y + 0.05 * warp + 0.016 * curl;
    float wide = sin(y * k + 3.0 * noise(vec3(y * 2.4, seed * 17.0, 0.0))), fine = fbm(vec3(q.x * 1.2, y * 26.0, q.z * 1.2) + seed * 3.0, oct);
    float b = clamp(0.5 + 0.42 * wide + 0.5 * fine + 0.3 * curl, 0.0, 1.0);
    vec3 pale = mix(tint, vec3(0.8, 0.84, 0.8), 0.42) * 0.82, belt = mix(tint * vec3(0.44, 0.5, 0.6), vec3(0.26, 0.17, 0.12), 0.24), zone = tint * 0.82 + 0.015;
    alb = mix(belt, zone, smoothstep(0.1, 0.55, b));
    alb = mix(alb, pale, smoothstep(0.55, 0.92, b));
    // One long-lived storm at a seeded latitude.
    vec3 sc = normalize(vec3(cos(seed * 40.0), sin(seed * 11.0) * 0.5, sin(seed * 40.0))), d = q - sc;
    float e = length(vec3(d.x, d.y * 2.3, d.z)), storm = smoothstep(0.26, 0.15, e + 0.05 * warp);
    alb = mix(alb, mix(vec3(0.74, 0.38, 0.12), pale, smoothstep(0.17, 0.0, e)), storm * 0.85);
    alb *= 1.0 - 0.3 * pow(abs(p.y), 3.0);
    spec = 0.02; gloss = 12.0;
  }`;
const PLANET_FS = `
  uniform float uOct, uSpin;
  varying vec3 vW, vN, vO;
  flat varying vec3 vTint, vX, vY, vZ; flat varying vec4 vA, vD; flat varying float vPx;
  ${LIGHTING}
  ${NOISE}
  ${SURFACES}
  void main() {
    vec3 p = normalize(vO), Ng = normalize(vN), V = normalize(cameraPosition - vW), tint = vTint;
    float seed = vA.x, type = vA.y, px = vPx, oct = clamp(1.2 + log2(max(px, 1.0) / 4.0), 0.0, uOct), mu = max(dot(Ng, V), 0.0);
    vec3 alb = tint, G = vec3(0.0); float spec = 0.04, gloss = 24.0, land = 0.0, cloud = 0.0, atm = 0.08;
    vec3 atmC = mix(tint, vec3(0.5, 0.7, 1.0), 0.35);
    if (px > 2.5) {
      if (type < 0.5) { rocky(p, seed, tint, oct, px, alb, G, spec, gloss); atm = 0.06; }
      else if (type < 1.5) { ocean(p, seed, tint, oct, px, uSpin, alb, G, spec, gloss, land, cloud); atm = 0.8; atmC = mix(vec3(0.3, 0.62, 1.0), tint, 0.3); }
      else { giant(p, seed, tint, oct, uSpin, alb, spec, gloss); atm = 0.5; atmC = mix(tint, vec3(0.95, 0.82, 0.62), 0.4); }
      alb = mix(tint * 0.75, alb, smoothstep(2.5, 7.0, px));
    }
    vec3 No = normalize(p - 0.9 * (G - dot(G, p) * p)), N = normalize(vX * No.x + vY * No.y + vZ * No.z);
    vec3 col = alb * 0.012 + tint * 0.003, A = normalize(vY);
    float day = 0.0;
    for (int i = 0; i < uLN; i++) {
      vec3 Lv = uL[i].xyz - vW; float dist = length(Lv); vec3 L = Lv / dist, lc = uLC[i].rgb * uL[i].w / (1.0 + dist / uFall);
      float ng = dot(Ng, L), nl = dot(N, L), lit = smoothstep(-0.12, 0.34, ng), dif = max(nl * 0.92 + 0.08, 0.0) * lit;
      if (vA.z > 0.5) {
        // The ring's shadow, found by following the light ray to the ring plane.
        float dn = dot(L, A);
        if (abs(dn) > 1e-3) { float t = -dot(Ng, A) / dn; if (t > 0.0) lc *= 1.0 - 0.62 * ringBand(length(Ng + L * t), seed); }
      }
      // A neighbour's shadow, its penumbra as wide as the star looks from behind that neighbour.
      if (vD.w > 0.0) {
        vec3 oc = vD.xyz - vW; float tc = dot(oc, L);
        if (tc > 0.0 && tc < dist) { float w = max(uLC[i].w * tc / dist, vD.w * 0.03); lc *= smoothstep(vD.w - w, vD.w + w, length(oc - L * tc)); }
      }
      vec3 surface = alb * (1.0 - 0.8 * cloud) * lc * dif;
      // Cloud tops scatter almost white and sit above the surface bumps.
      surface += vec3(0.6, 0.62, 0.65) * cloud * lc * max(ng * 0.92 + 0.08, 0.0) * lit;
      vec3 H = normalize(L + V);
      surface += lc * spec * (1.0 - cloud) * pow(max(dot(N, H), 0.0), gloss) * lit * (0.5 + 0.5 * pow(1.0 - max(dot(H, V), 0.0), 3.0));
      // Light bent through the air along the terminator, warm where it has crossed the most of it.
      surface += atm * alb * vec3(1.0, 0.5, 0.26) * lc * exp(-ng * ng * 16.0) * 0.1 * lit;
      // Fresnel rim in the planet's tint, carried a little past the terminator.
      float rimL = smoothstep(-0.28, 0.4, ng);
      surface += atm * atmC * lc * pow(1.0 - mu, 3.4) * rimL * 0.42;
      col += surface; day = max(day, lit);
    }
    // The night side: dark, but for city light on land under oceanic skies.
    if (land > 0.0 && px > 30.0) { float c = smoothstep(0.42, 0.62, noise(p * 44.0 + seed)) * smoothstep(-0.05, 0.3, noise(p * 7.0 + seed * 5.0)); col += vec3(1.0, 0.62, 0.26) * 0.09 * c * land * (1.0 - cloud) * (1.0 - day); }
    // At a few pixels a body is a coloured point: its tint must survive any phase.
    float tiny = 1.0 - smoothstep(3.0, 9.0, px);
    col = max(col, (tint * 1.15 + 0.03) * (0.5 + 0.8 * day) * tiny);
    gl_FragColor = vec4(col, 1.0);
    ${OUTPUT}
  }`;
/* A shell of lit air outside the silhouette of close worlds, its depth found from the ray's height above the surface. */
const ATMO_VS = `
  attribute vec4 aA, aB; attribute vec3 aC;
  varying vec3 vW, vN; flat varying vec3 vTint; flat varying vec4 vA;
  void main() {
    float k = aA.y < 0.5 ? 1.0 : aA.y < 1.5 ? 1.05 : 1.035;
    vec4 w = instanceMatrix * vec4(position * k, 1.0);
    vW = w.xyz; vN = position; vTint = aC; vA = aA;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const ATMO_FS = `
  varying vec3 vW, vN; flat varying vec3 vTint; flat varying vec4 vA;
  ${LIGHTING}
  void main() {
    float type = vA.y;
    if (type < 0.5) discard;
    float K = type < 1.5 ? 1.05 : 1.035;
    vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
    float mu = abs(dot(N, V)), h = K * sqrt(max(1.0 - mu * mu, 0.0)), t = clamp((h - 1.0) / (K - 1.0), 0.0, 1.0);
    float dens = exp(-t * 4.2) * (1.0 - t) * (1.0 - t);
    vec3 atmC = type < 1.5 ? mix(vec3(0.3, 0.62, 1.0), vTint, 0.3) : mix(vTint, vec3(0.95, 0.82, 0.62), 0.4), col = vec3(0.0);
    for (int i = 0; i < uLN; i++) {
      vec3 Lv = uL[i].xyz - vW; float dist = length(Lv); vec3 L = Lv / dist, lc = uLC[i].rgb * uL[i].w / (1.0 + dist / uFall);
      float ng = dot(N, L), lit = smoothstep(-0.32, 0.3, ng), edge = exp(-ng * ng * 12.0), fwd = pow(max(dot(V, -L), 0.0), 7.0);
      col += lc * lit * (1.0 + 3.5 * fwd) * mix(atmC, vec3(1.0, 0.5, 0.24), 0.6 * edge * (1.0 - smoothstep(0.0, 0.3, ng)));
    }
    gl_FragColor = vec4(col * dens * 0.8, 1.0);
    ${OUTPUT}
  }`;
const RING_VS = `
  attribute vec4 aA; attribute vec3 aC;
  varying vec3 vR, vW; varying vec2 vP; flat varying vec3 vC, vTint; flat varying vec4 vA;
  void main() {
    float s = length(instanceMatrix[0].xyz);
    vec4 w = instanceMatrix * vec4(position, 1.0);
    vW = w.xyz; vC = instanceMatrix[3].xyz; vR = (w.xyz - vC) / s; vP = position.xz; vTint = aC; vA = aA;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const RING_FS = `
  varying vec3 vR, vW; varying vec2 vP; flat varying vec3 vC, vTint; flat varying vec4 vA;
  ${LIGHTING}
  void main() {
    float r = length(vP), seed = vA.x, px = vA.w, d = ringBand(r, seed);
    d = mix(0.5 * smoothstep(RING_IN, RING_IN + 0.08, r) * smoothstep(RING_OUT, RING_OUT - 0.08, r), d, smoothstep(5.0, 30.0, px));
    if (d <= 0.002) discard;
    vec3 V = normalize(cameraPosition - vW), base = mix(vTint, vec3(0.8, 0.74, 0.62), 0.55), col = base * 0.004;
    for (int i = 0; i < uLN; i++) {
      vec3 Lv = uL[i].xyz - vC; float dist = length(Lv); vec3 L = Lv / dist, lc = uLC[i].rgb * uL[i].w / (1.0 + dist / uFall);
      // The planet's shadow falls across the ring, with a soft edge.
      float tca = dot(-vR, L), sh = 1.0;
      if (tca > 0.0) sh = smoothstep(0.96, 1.04, sqrt(max(dot(vR, vR) - tca * tca, 0.0)));
      float back = pow(max(dot(V, -L), 0.0), 5.0);
      col += base * lc * sh * (0.5 + 1.1 * back);
    }
    gl_FragColor = vec4(col, d * 0.9 * smoothstep(3.0, 9.0, px));
    ${OUTPUT}
  }`;

/* ---------- stars ---------- */
const STAR_VS = `
  attribute vec4 aA; attribute vec3 aC;
  uniform float uClock;
  varying vec3 vW, vN, vO; flat varying vec3 vTint; flat varying vec4 vA;
  void main() {
    float a = aA.x * 6.2831853 + uClock * 0.018, c = cos(a), s = sin(a);
    vO = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
    vec4 w = instanceMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = position; vTint = aC; vA = aA;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const STAR_FS = `
  uniform float uClock, uOct;
  varying vec3 vW, vN, vO; flat varying vec3 vTint; flat varying vec4 vA;
  ${NOISE}
  void main() {
    vec3 p = normalize(vO), N = normalize(vN), V = normalize(cameraPosition - vW), tint = vTint;
    float seed = vA.x * 91.0, px = vA.w, t = uClock * 0.06, mu = max(dot(N, V), 0.0);
    float oct = clamp(1.6 + log2(max(px, 1.0) / 5.0), 1.0, uOct);
    // Convection flows through itself: the coordinates are warped by a field that is itself moving.
    vec3 q = p * 2.1 + seed;
    vec3 w = vec3(fbm(q + vec3(t, 1.7, -t), 3.0), fbm(q + vec3(5.2, -t * 0.8, 1.3), 3.0), fbm(q + vec3(-t * 0.6, 8.3, 2.8), 3.0));
    float flow = fbm(p * 3.2 + 1.9 * w + seed + vec3(0.0, t * 0.5, 0.0), oct);
    float cells = 1.0 - 2.0 * abs(fbm(p * 13.0 + 2.2 * w - vec3(t * 1.4), max(oct - 1.0, 1.0)));
    float fil = pow(max(1.0 - 2.4 * abs(fbm(p * 4.6 + 2.6 * w + 3.0, oct)), 0.0), 3.0);
    float spots = smoothstep(0.3, 0.46, fbm(p * 2.3 - seed + vec3(t * 0.2), 3.0) + 0.25 * w.x);
    // A distant star is a smooth bright disc; the convection resolves as it grows on screen.
    float heat = mix(0.78, 0.6 + 0.8 * flow + 0.2 * (cells - 0.5) + 0.4 * fil - 0.56 * spots, smoothstep(10.0, 70.0, px));
    // Limb darkening with the second-order term; the limb also reddens, since it shows cooler, higher gas.
    float m1 = 1.0 - mu, limb = 1.0 - 0.56 * m1 - 0.26 * m1 * m1;
    vec3 cool = tint * vec3(0.92, 0.3, 0.1), hot = mix(tint, vec3(1.0, 0.88, 0.62), 0.3);
    vec3 c = mix(cool, tint, smoothstep(0.1, 0.56, heat));
    c = mix(c, hot, smoothstep(0.56, 1.05, heat));
    c = mix(c, c * vec3(1.0, 0.7, 0.46), smoothstep(0.35, 1.0, m1));
    gl_FragColor = vec4(c * limb * (0.72 + 0.5 * smoothstep(0.15, 1.05, heat)), 1.0);
    ${OUTPUT}
  }`;
const CORONA_VS = `
  attribute vec4 aA; attribute vec3 aC;
  flat varying vec3 vTint; flat varying vec4 vA;
  ${BILLBOARD}
  void main() { vTint = aC; vA = aA; billboard(1.0); }`;
const CORONA_FS = `
  uniform float uClock, uGain, uK;
  flat varying vec3 vTint; flat varying vec4 vA; varying vec2 vQ;
  ${NOISE}
  void main() {
    float r = length(vQ) * uK, rr = max(r - 1.0, 0.0), a = atan(vQ.y, vQ.x), seed = vA.x * 91.0, t = uClock * 0.05;
    vec3 ang = vec3(cos(a), sin(a), 0.0);
    // Streamers: noise around the limb, slowly evolving and stretching outward.
    float s = fbm(ang * 1.7 + vec3(seed, -t * 1.1 + rr * 0.12, t), 3.0), s2 = fbm(ang * 5.2 + vec3(seed * 1.7, t * 1.6 - rr * 0.5, -t), 3.0);
    float reach = 2.5 - 1.5 * s - 0.5 * s2;
    float inner = exp(-rr * 5.4 * (1.0 - 0.3 * s2)), mid = exp(-rr * reach) * (0.42 + 0.5 * s + 0.2 * s2), far = 0.07 * exp(-rr * 0.7);
    vec3 col = vTint * (0.34 * mid + far) + mix(vTint, vec3(1.0, 0.92, 0.8), 0.14) * inner * 0.46;
    float edge = smoothstep(uK, uK * 0.45, r);
    gl_FragColor = vec4(col * edge * uGain, 1.0);
    ${OUTPUT}
  }`;
const GLARE_VS = `
  attribute vec4 aA; attribute vec3 aC;
  flat varying vec3 vTint; flat varying vec4 vA;
  ${BILLBOARD}
  void main() { vTint = aC; vA = aA; billboard(1.0); gl_Position.z = 0.0; }`;
const GLARE_FS = `
  uniform float uGain;
  flat varying vec3 vTint; flat varying vec4 vA; varying vec2 vQ;
  void main() {
    vec2 q = vQ; float r = length(q), vis = vA.y;
    // A thin anamorphic streak and a faint six-point burst, as a real lens makes of a point this bright.
    float streak = exp(-abs(q.y) * 90.0) * pow(max(1.0 - abs(q.x), 0.0), 3.0);
    float ang = atan(q.y, q.x), burst = pow(abs(cos(ang * 3.0 + 0.5)), 120.0) * exp(-r * 11.0);
    vec3 c = mix(vTint, vec3(0.75, 0.86, 1.0), 0.45) * streak * 0.16 + vTint * burst * 0.16;
    gl_FragColor = vec4(c * vis * uGain * smoothstep(vA.z, vA.z * 1.25, r), 1.0);
    ${OUTPUT}
  }`;
const FLASH_VS = `
  attribute vec4 aA; attribute vec3 aC;
  flat varying vec3 vTint; flat varying vec4 vA;
  ${BILLBOARD}
  void main() { vTint = aC; vA = aA; billboard(1.0); }`;
const FLASH_FS = `
  flat varying vec3 vTint; flat varying vec4 vA; varying vec2 vQ;
  void main() {
    float r = length(vQ), age = vA.x, gain = vA.y;
    float core = exp(-r * r * 34.0) * pow(1.0 - age, 3.0), front = 0.06 + age * 0.8, ring = exp(-pow((r - front) / (0.025 + 0.04 * age), 2.0)) * pow(1.0 - age, 2.5);
    gl_FragColor = vec4(mix(vTint, vec3(1.0, 0.95, 0.88), 0.6) * (core * 3.2 + ring * 0.55) * gain * smoothstep(1.0, 0.8, r), 1.0);
    ${OUTPUT}
  }`;

/* ---------- orbital plane ---------- */
const GRID_FS = `
  uniform vec3 uCol; uniform float uR, uS, uFade, uGain;
  varying vec3 vW; varying vec2 vP;
  float lineAt(float r, float s, float w) { float d = abs(fract(r / s - 0.5) - 0.5) * s; return (1.0 - smoothstep(0.4, 1.3, d / w)) * (1.0 - smoothstep(0.12, 0.34, w / s)); }
  void main() {
    float r = length(vP), a = atan(vP.y, vP.x), w = max(fwidth(r), 1e-4);
    float rings = lineAt(r, uS * 2.0, w) * 0.85 + lineAt(r, uS, w) * 0.5 * (1.0 - uFade);
    float seg = 6.2831853 / 12.0, spoke = abs(fract(a / seg - 0.5) - 0.5) * seg * r;
    float spokes = (1.0 - smoothstep(0.4, 1.3, spoke / w)) * smoothstep(uS * 0.5, uS * 1.2, r) * 0.5;
    float top = abs(normalize(cameraPosition - vW).y);
    float k = smoothstep(uR, uR * 0.3, r) * smoothstep(0.02, 0.26, top) * uGain;
    gl_FragColor = vec4(uCol * max(rings, spokes) * k, 1.0);
    ${OUTPUT}
  }`;

/* ---------- body identity ---------- */
const hash01 = n => { let x = Math.imul(n + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
/* The sequence of a star by mass: ember, amber, gold, then white and blue-white at the top. */
const STAR_RAMP = [[150, 1, 0.36, 0.1], [300, 1, 0.45, 0.12], [1000, 1, 0.56, 0.17], [2000, 0.92, 0.90, 0.96], [5000, 0.62, 0.76, 1]];
function starTint(m, out) {
  const R = STAR_RAMP; let i = 0;
  while (i < R.length - 2 && m > R[i + 1][0]) i++;
  const a = R[i], b = R[i + 1], t = Math.min(1, Math.max(0, Math.log(m / a[0]) / Math.log(b[0] / a[0])));
  out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t;
  // Even luminance: a hot star is told by its colour, not by blowing out the bloom.
  const k = Math.pow(0.72 / (0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]), 0.7);
  out[0] *= k; out[1] *= k; out[2] *= k;
  return out;
}

export function createScene(E, lab) {
  const scene = new THREE.Scene(), CAP = lab.BODY_CAP, TRAIL_CAP = lab.TRAIL_CAP;
  const fgeo = new THREE.PlaneGeometry(2, 2);

  /* Sky. The bake is sized by tier and only ever grows. */
  const skySize = t => (t.detail >= 0.85 ? 2048 : t.detail >= 0.65 ? 1536 : t.detail >= 0.5 ? 1024 : 768);
  let sky = bakeSky(E.renderer, skySize(E.tier)), skyBuilt = skySize(E.tier), skyDirty = false, skyLost = false;
  const dome = createSkyDome(sky.texture), starfield = createStarfield();
  scene.add(dome, starfield);
  const onRestored = () => { skyDirty = skyLost = true; };
  E.renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  /* Light and time, shared by reference with every lit material. */
  const L = {
    uL: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) }, uLC: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) }, uLN: { value: 0 }, uFall: { value: FALL },
    uClock: { value: 0 }, uSpin: { value: 0 }, uOct: { value: 7 },
  };

  /* Instanced batches: planets far and close, stars, and the sprites around them. */
  const instanced = (geo, mat, cap) => {
    const g = geo.clone(), A = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage), C = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aA', A); g.setAttribute('aC', C);
    const mesh = new THREE.InstancedMesh(g, mat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false;
    return { mesh, A, C, g, cap, n: 0, B: null, D: null };
  };
  const withAxis = batch => {
    for (const k of ['B', 'D']) { batch[k] = new THREE.InstancedBufferAttribute(new Float32Array(batch.cap * 4), 4).setUsage(THREE.DynamicDrawUsage); batch.g.setAttribute('a' + k, batch[k]); }
    return batch;
  };
  const put = (b, x, y, z, s) => {
    const m = b.mesh.instanceMatrix.array, o = b.n * 16;
    m[o] = s; m[o + 1] = 0; m[o + 2] = 0; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = 0; m[o + 9] = 0; m[o + 10] = s; m[o + 11] = 0; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
    return b.n++;
  };
  const flush = b => {
    b.mesh.count = b.n; b.mesh.visible = b.n > 0;
    if (!b.n) return;
    b.mesh.instanceMatrix.clearUpdateRanges(); b.mesh.instanceMatrix.addUpdateRange(0, b.n * 16); b.mesh.instanceMatrix.needsUpdate = true;
    b.A.clearUpdateRanges(); b.A.addUpdateRange(0, b.n * 4); b.A.needsUpdate = true;
    b.C.clearUpdateRanges(); b.C.addUpdateRange(0, b.n * 3); b.C.needsUpdate = true;
    if (b.B) { b.B.clearUpdateRanges(); b.B.addUpdateRange(0, b.n * 4); b.B.needsUpdate = true; }
    if (b === nearPlanets) { b.D.clearUpdateRanges(); b.D.addUpdateRange(0, b.n * 4); b.D.needsUpdate = true; }
  };
  const planetMat = new THREE.ShaderMaterial({ uniforms: L, vertexShader: PLANET_VS, fragmentShader: PLANET_FS });
  const farPlanets = withAxis(instanced(new THREE.SphereGeometry(1, 28, 18), planetMat, CAP));
  const nearPlanets = withAxis(instanced(new THREE.SphereGeometry(1, 112, 72), planetMat, HERO_CAP));
  const atmoMat = new THREE.ShaderMaterial({ uniforms: L, vertexShader: ATMO_VS, fragmentShader: ATMO_FS, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const atmo = new THREE.InstancedMesh(nearPlanets.g, atmoMat, HERO_CAP);
  atmo.instanceMatrix = nearPlanets.mesh.instanceMatrix; atmo.frustumCulled = false; atmo.renderOrder = 2;
  const ringGeo = new THREE.RingGeometry(RING_IN - 0.01, RING_OUT + 0.01, 128, 1).rotateX(-Math.PI / 2);
  const ringMat = new THREE.ShaderMaterial({ uniforms: L, vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const rings = instanced(ringGeo, ringMat, RING_CAP); rings.mesh.renderOrder = 3;
  const starMat = new THREE.ShaderMaterial({ uniforms: L, vertexShader: STAR_VS, fragmentShader: STAR_FS });
  const stars = instanced(new THREE.SphereGeometry(1, 96, 64), starMat, CAP);
  const CORONA_K = 9;
  const coronaMat = new THREE.ShaderMaterial({ uniforms: { uClock: L.uClock, uGain: { value: 1 }, uK: { value: CORONA_K } }, vertexShader: CORONA_VS, fragmentShader: CORONA_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const corona = instanced(fgeo, coronaMat, CAP); corona.mesh.renderOrder = 6;
  const glareMat = new THREE.ShaderMaterial({ uniforms: { uGain: coronaMat.uniforms.uGain }, vertexShader: GLARE_VS, fragmentShader: GLARE_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const glare = instanced(fgeo, glareMat, MAX_LIGHTS); glare.mesh.renderOrder = 8;
  const flashMat = new THREE.ShaderMaterial({ vertexShader: FLASH_VS, fragmentShader: FLASH_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = instanced(fgeo, flashMat, FLASH_CAP); flash.mesh.renderOrder = 7;
  scene.add(farPlanets.mesh, nearPlanets.mesh, atmo, rings.mesh, stars.mesh, corona.mesh, glare.mesh, flash.mesh);

  /* The Details card's small stage: one body at full detail, whatever its size in the main view, lit by the real stars. */
  const solo = { scene: new THREE.Scene(), planet: withAxis(instanced(new THREE.SphereGeometry(1, 96, 64), planetMat, 1)), star: instanced(new THREE.SphereGeometry(1, 64, 44), starMat, 1), ring: instanced(ringGeo, ringMat, 1) };
  solo.atmo = new THREE.InstancedMesh(solo.planet.g, atmoMat, 1);
  solo.atmo.instanceMatrix = solo.planet.mesh.instanceMatrix; solo.atmo.frustumCulled = false; solo.atmo.renderOrder = 2; solo.ring.mesh.renderOrder = 3;
  solo.scene.background = new THREE.Color(0x02030a);
  solo.scene.add(solo.planet.mesh, solo.star.mesh, solo.atmo, solo.ring.mesh);
  const writeRing = (batch, X, Y, Z, s2, f, c, rPx) => {
    const j = put(batch, X, Y, Z, s2), m = batch.mesh.instanceMatrix.array, o = j * 16, ax = f.ax, ay = f.ay, az = f.az;
    // The same basis the planet's vertex shader builds, so ring and spin share one axis.
    const up = Math.abs(ay) < 0.9, cx = up ? -az : 0, cy = up ? 0 : az, cz = up ? ax : -ay, cl = Math.hypot(cx, cy, cz) || 1, qx = cx / cl, qy = cy / cl, qz = cz / cl;
    const wx = qy * az - qz * ay, wy = qz * ax - qx * az, wz = qx * ay - qy * ax;
    m[o] = qx * s2; m[o + 1] = qy * s2; m[o + 2] = qz * s2; m[o + 4] = ax * s2; m[o + 5] = ay * s2; m[o + 6] = az * s2; m[o + 8] = wx * s2; m[o + 9] = wy * s2; m[o + 10] = wz * s2;
    batch.A.array[j * 4] = f.seed; batch.A.array[j * 4 + 3] = rPx; batch.C.array[j * 3] = c[0]; batch.C.array[j * 3 + 1] = c[1]; batch.C.array[j * 3 + 2] = c[2];
  };
  /* Three-quarter lit by the brightest star, so the terminator shows. */
  function portrait(l) {
    const b = l.bodies.find(q => q.id === l.track); if (!b) return null;
    const X = b.x, Y = b.z, Z = b.y, r = b.r, f = faceOf(b.id), star = b.kind === 'star', RPX = 220;
    solo.planet.n = solo.star.n = solo.ring.n = 0;
    let ringed = false;
    if (star) {
      const c = starTint(b.m, rgb), i = put(solo.star, X, Y, Z, r);
      solo.star.A.array[i * 4] = f.seed; solo.star.A.array[i * 4 + 3] = RPX; solo.star.C.array.set(c.slice(0, 3), i * 3);
    } else {
      const type = l.surfaceOf(b), c = tintOf(l.bodyColor3(b)), i = put(solo.planet, X, Y, Z, r), P = solo.planet;
      ringed = b.kind === 'gas' && b.m >= RING_MASS && f.ring;
      P.A.array[0] = f.seed; P.A.array[1] = type; P.A.array[2] = ringed ? 1 : 0; P.A.array[3] = f.rate;
      P.B.array[0] = f.ax; P.B.array[1] = f.ay; P.B.array[2] = f.az; P.B.array[3] = RPX;
      P.C.array[i * 3] = c[0]; P.C.array[i * 3 + 1] = c[1]; P.C.array[i * 3 + 2] = c[2];
      if (ringed) writeRing(solo.ring, X, Y, Z, r, f, c, RPX);
    }
    flush(solo.planet); flush(solo.star); flush(solo.ring);
    solo.atmo.count = solo.planet.n; solo.atmo.visible = solo.planet.n > 0;
    let s = null;
    for (const q of l.bodies) if (q !== b && q.kind === 'star' && (!s || q.m > s.m)) s = q;
    const dx = s ? s.x - b.x : 1, dz = s ? s.y - b.y : 0.6, c = Math.cos(0.95), n = Math.sin(0.95), ex = dx * c - dz * n, ez = dx * n + dz * c, len = Math.hypot(ex, ez) || 1, d = r * (ringed ? 10.5 : 7.4);
    return { scene: solo.scene, eye: [X + ex / len * d * 0.96, Y + d * 0.27, Z + ez / len * d * 0.96], at: [X, Y, Z], near: Math.max(0.01, d * 0.05), far: d * 4 };
  }

  /* The orbital plane and everything drawn as ribbons. */
  const gridU = { uCol: { value: new THREE.Color(0.014, 0.024, 0.035) }, uR: { value: 800 }, uS: { value: 100 }, uFade: { value: 0 }, uGain: { value: 1 } };
  const gridMat = new THREE.ShaderMaterial({
    uniforms: gridU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; varying vec2 vP; uniform float uR; void main(){ vP = position.xz * uR; vec4 w = modelMatrix * vec4(position.x * uR, 0.0, position.z * uR, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: GRID_FS,
  });
  const grid = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), gridMat);
  grid.frustumCulled = false; grid.renderOrder = 1;
  const trails = createRibbons(TRAIL_POINTS, { width: 1.05 }), marks = createRibbons(MARK_POINTS, { width: 1.2 });
  trails.mesh.renderOrder = 4; marks.mesh.renderOrder = 5;
  scene.add(grid, trails.mesh, marks.mesh);

  /* Per-body identity, derived once from the id; rewind restores ids, so a body keeps its face. */
  const ids = new Map();
  const faceOf = id => {
    let f = ids.get(id);
    if (!f) {
      if (ids.size > 4096) ids.clear();
      const s = hash01(id), u = hash01(id + 7001), a = hash01(id + 8111) * TAU, tilt = 0.08 + 0.55 * u * u, st = Math.sin(tilt);
      f = { seed: s, rate: 0.14 + 0.26 * hash01(id + 4111), ax: st * Math.cos(a), ay: Math.cos(tilt), az: st * Math.sin(a), ring: id % 4 !== 3 };
      ids.set(id, f);
    }
    return f;
  };
  const tints = new Map();
  const tintOf = css => {
    let c = tints.get(css);
    if (!c) { const q = new THREE.Color(css); c = [q.r, q.g, q.b]; tints.set(css, c); }
    return c;
  };

  /* Merges are watched, not told: the survivor's mass jumps while the lab's merge count rises. */
  const flashes = Array.from({ length: FLASH_CAP }, () => ({ id: -1, age: 1, gain: 0, x: 0, y: 0, z: 0, r: 1 })), lastM = new Map();
  let lastMerged = 0, pulse = 0;
  const spawnFlash = (b, gain) => {
    let f = flashes[0];
    for (const q of flashes) if (q.age > f.age) f = q;
    Object.assign(f, { id: b.id, age: 0, gain, x: b.x, y: b.z, z: b.y, r: b.r });
    pulse = Math.max(pulse, Math.min(0.3, 0.1 * gain));
  };
  function watchMerges(B, dt) {
    if (lab.merged < lastMerged) { for (const f of flashes) f.age = 1; pulse = 0; }
    if (lab.merged > lastMerged && !reduceMotion) for (const b of B) { const m0 = lastM.get(b.id); if (m0 !== undefined && b.m > m0) spawnFlash(b, Math.min(2.4, 0.7 + 0.5 * Math.log10(1 + (b.m - m0) * 40))); }
    lastMerged = lab.merged;
    if (lastM.size > B.length * 2 + 32) lastM.clear();
    for (const b of B) lastM.set(b.id, b.m);
    pulse *= Math.exp(-dt * 6);
    flash.n = 0;
    for (const f of flashes) {
      if (f.age >= 1) continue;
      f.age = Math.min(1, f.age + dt / 0.9);
      const R = (f.r + 3) * (3.5 + 3 * f.gain), i = put(flash, f.x, f.y, f.z, R), c = flash.C.array, a = flash.A.array;
      a[i * 4] = f.age; a[i * 4 + 1] = f.gain; c[i * 3] = 1; c[i * 3 + 1] = 0.72; c[i * 3 + 2] = 0.42;
    }
  }

  const lit = [{ b: null, c: [1, 1, 1] }, { b: null, c: [1, 1, 1] }, { b: null, c: [1, 1, 1] }], rgb = [0, 0, 0];
  const FW = new THREE.Vector3(), RT = new THREE.Vector3(), UP = new THREE.Vector3();
  let gridR = 0, starPx = 0;
  const heroes = new Array(HERO_CAP).fill(null);

  /* A drop line and a small foot ring on the plane, sized in stage pixels. */
  function dropMark(b, plane, depth, px, c) {
    const X = b.x, Y = b.z, Z = b.y, h = Y - plane;
    if (Math.abs(h) < 0.6) return;
    const r = c[0] * 0.5 + 0.24, g = c[1] * 0.5 + 0.28, bl = c[2] * 0.5 + 0.34;
    marks.point(X, Y, Z, r, g, bl, 0.46, 0.55); marks.point(X, plane + h * 0.5, Z, r, g, bl, 0.3, 0.55); marks.point(X, plane, Z, r, g, bl, 0.2, 0.55); marks.strip();
    const rad = 3.2 * depth / px;
    for (let k = 0; k <= 10; k++) { const a = k / 10 * TAU; marks.point(X + rad * Math.cos(a), plane, Z + rad * Math.sin(a), r, g, bl, 0.4, 0.5); }
    marks.strip();
  }
  /* A velocity arrow: one strip whose width flares at the neck and closes at the tip. */
  function arrow(b, depth, px) {
    const k = 0.3, X = b.x, Y = b.z, Z = b.y, tx = X + b.vx * k, ty = Y + b.vz * k, tz = Z + b.vy * k, len = Math.hypot(tx - X, ty - Y, tz - Z);
    if (len * px / depth < 3) return;
    const hd = Math.min(0.42, 9 * depth / px / len), nx = tx + (X - tx) * hd, ny = ty + (Y - ty) * hd, nz = tz + (Z - tz) * hd;
    const r = 0.22, g = 0.72, bl = 0.82;
    marks.point(X, Y, Z, r, g, bl, 0.75, 0.75); marks.point(nx, ny, nz, r, g, bl, 0.85, 0.75); marks.point(nx, ny, nz, r, g, bl, 0.9, 3.6); marks.point(tx, ty, tz, r, g, bl, 0.9, 0.05);
    marks.strip();
  }

  function syncBodies(B, view) {
    const cam = view.camera, ex = cam.position.x, ey = cam.position.y, ez = cam.position.z, px = view.px, e = cam.matrixWorld.elements;
    FW.set(-e[8], -e[9], -e[10]); RT.set(e[0], e[1], e[2]); UP.set(e[4], e[5], e[6]);
    const fx = FW.x, fy = FW.y, fz = FW.z, vectors = lab.p.vectors, plane = grid.position.y;
    farPlanets.n = nearPlanets.n = rings.n = stars.n = corona.n = 0;
    lit[0].b = lit[1].b = lit[2].b = null; starPx = 0;
    marks.setResolution(view.w, view.h); marks.begin();
    for (const b of B) {
      const X = b.x, Y = b.z, Z = b.y, front = (X - ex) * fx + (Y - ey) * fy + (Z - ez) * fz, depth = Math.max(1e-3, front), star = b.kind === 'star';
      const s = Math.max(b.r, (star ? MIN_STAR_PX : MIN_BODY_PX) * depth / px), rPx = front > 0 ? s * px / depth : 0, f = faceOf(b.id);
      if (star) {
        const c = starTint(b.m, rgb);
        starPx = Math.max(starPx, rPx);
        if (front > 0) {
          let i = put(stars, X, Y, Z, s), A = stars.A.array, C = stars.C.array;
          A[i * 4] = f.seed; A[i * 4 + 3] = rPx; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2];
          i = put(corona, X, Y, Z, s * coronaMat.uniforms.uK.value); A = corona.A.array; C = corona.C.array;
          A[i * 4] = f.seed; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2];
        }
        for (let k = 0; k < MAX_LIGHTS; k++) if (!lit[k].b || b.m > lit[k].b.m) { for (let j = MAX_LIGHTS - 1; j > k; j--) { lit[j].b = lit[j - 1].b; lit[j].c[0] = lit[j - 1].c[0]; lit[j].c[1] = lit[j - 1].c[1]; lit[j].c[2] = lit[j - 1].c[2]; } lit[k].b = b; lit[k].c[0] = c[0]; lit[k].c[1] = c[1]; lit[k].c[2] = c[2]; break; }
      } else {
        const type = lab.surfaceOf(b), c = tintOf(lab.bodyColor3(b)), ring = b.kind === 'gas' && b.m >= RING_MASS && f.ring && rings.n < RING_CAP ? 1 : 0;
        const close = rPx >= HERO_PX && nearPlanets.n < HERO_CAP, batch = close ? nearPlanets : farPlanets;
        if (close) heroes[nearPlanets.n] = b;
        const i = put(batch, X, Y, Z, s), A = batch.A.array, Bx = batch.B.array, C = batch.C.array;
        A[i * 4] = f.seed; A[i * 4 + 1] = type; A[i * 4 + 2] = ring; A[i * 4 + 3] = f.rate;
        Bx[i * 4] = f.ax; Bx[i * 4 + 1] = f.ay; Bx[i * 4 + 2] = f.az; Bx[i * 4 + 3] = rPx;
        C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2];
        if (ring) {
          writeRing(rings, X, Y, Z, s, f, c, rPx);
        }
        dropMark(b, plane, depth, px, c);
      }
      if (vectors) arrow(b, depth, px);
    }
    marks.end();
    atmo.count = nearPlanets.n; atmo.visible = nearPlanets.n > 0;
  }
  /* For each close world, the largest body between it and the main star. Only close worlds can show a shadow's edge. */
  function syncEclipses(B) {
    const sun = lit[0].b, D = nearPlanets.D.array;
    for (let i = 0; i < nearPlanets.n; i++) {
      const o = i * 4, h = heroes[i];
      let best = null;
      if (sun) {
        const sx = sun.x - h.x, sy = sun.z - h.z, sz = sun.y - h.y, dist = Math.hypot(sx, sy, sz) || 1, lx = sx / dist, ly = sy / dist, lz = sz / dist;
        for (const q of B) {
          if (q === h || q === sun || q.kind === 'star' || (best && q.r <= best.r)) continue;
          const ox = q.x - h.x, oy = q.z - h.z, oz = q.y - h.y, t = ox * lx + oy * ly + oz * lz;
          if (t <= 0 || t >= dist) continue;
          const rx = ox - lx * t, ry = oy - ly * t, rz = oz - lz * t, reach = q.r + h.r + sun.r * t / dist;
          if (rx * rx + ry * ry + rz * rz < reach * reach) best = q;
        }
      }
      D[o] = best ? best.x : 0; D[o + 1] = best ? best.z : 0; D[o + 2] = best ? best.y : 0; D[o + 3] = best ? best.r : 0;
    }
  }

  function syncLights(view, B) {
    const cam = view.camera;
    let n = 0;
    while (n < MAX_LIGHTS && lit[n].b) n++;
    glare.n = 0;
    L.uFall.value = n ? FALL : 1e9;
    if (!n) {
      // An empty sky still needs a sun: a soft lamp above the camera's shoulder.
      L.uLN.value = 1;
      L.uL.value[0].set(cam.position.x + UP.x * 400 - RT.x * 300, cam.position.y + UP.y * 400 - RT.y * 300, cam.position.z + UP.z * 400 - RT.z * 300, 1.5);
      L.uLC.value[0].set(0.95, 0.97, 1, 1);
      return;
    }
    L.uLN.value = n;
    const share = 1 / Math.sqrt(n);
    for (let k = 0; k < n; k++) {
      const b = lit[k].b, c = lit[k].c, X = b.x, Y = b.z, Z = b.y;
      L.uL.value[k].set(X, Y, Z, 2.3 * Math.min(1.35, Math.max(0.8, Math.pow(b.m / 1000, 0.25))) * share);
      L.uLC.value[k].set(0.62 + 0.38 * c[0], 0.62 + 0.38 * c[1], 0.62 + 0.38 * c[2], b.r);
      // Lens glare: gone behind the camera, and hidden in step with how much of the disc a body covers.
      const dx = X - cam.position.x, dy = Y - cam.position.y, dz = Z - cam.position.z, depth = dx * FW.x + dy * FW.y + dz * FW.z;
      if (depth < 1) continue;
      const rS = b.r * view.px / depth, sx = (dx * RT.x + dy * RT.y + dz * RT.z) * view.px / depth, sy = (dx * UP.x + dy * UP.y + dz * UP.z) * view.px / depth;
      let vis = 1;
      for (const q of B) {
        if (q === b) continue;
        const ex = q.x - cam.position.x, ey = q.z - cam.position.y, ez = q.y - cam.position.z, dq = ex * FW.x + ey * FW.y + ez * FW.z;
        if (dq <= 1 || dq >= depth) continue;
        const rq = q.r * view.px / dq, qx = (ex * RT.x + ey * RT.y + ez * RT.z) * view.px / dq, qy = (ex * UP.x + ey * UP.y + ez * UP.z) * view.px / dq, sep = Math.hypot(qx - sx, qy - sy);
        if (sep < rS + rq) vis = Math.min(vis, 1 - Math.min(1, (rq * rq) / (rS * rS)) * Math.min(1, (rq - sep) / rS * 0.5 + 0.5));
      }
      if (vis <= 0.01) continue;
      const size = Math.max(rS * 9, 90), i = put(glare, X, Y, Z, size * depth / view.px), a = glare.A.array, C = glare.C.array;
      a[i * 4 + 1] = vis; a[i * 4 + 2] = rS / size; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2];
    }
  }

  function syncTrails(B, view) {
    trails.setResolution(view.w, view.h); trails.begin();
    if (lab.p.trails && B.length) {
      const N = B.length, cam = view.camera, ex = cam.position.x, ey = cam.position.y, ez = cam.position.z, near = cam.near * 3, fx = FW.x, fy = FW.y, fz = FW.z;
      const len0 = Math.round(lab.p.trailLen), budget = Math.max(8, Math.floor(TRAIL_POINTS * E.tier.detail / N)), glow = N > 40 ? 0.42 : 0.72, keep = N > 40 ? Math.max(90, 3600 / Math.sqrt(N) * E.tier.detail) : Infinity;
      for (const b of B) {
        const len = Math.min(b.tn, len0, keep); if (len < 2) continue;
        const stride = Math.max(1, Math.ceil(len / budget)), star = b.kind === 'star', c = star ? starTint(b.m, rgb) : tintOf(lab.bodyColor3(b)), k = star ? 1.1 : 1.3, cl = b.r * b.r * 1.7;
        const r = c[0] * k, g = c[1] * k, bl = c[2] * k;
        for (let i = (len - 1) % stride; i < len; i += stride) {
          const idx = (b.th - len + i + TRAIL_CAP) % TRAIL_CAP, X = b.trail[idx * 2], Y = b.trailZ[idx], Z = b.trail[idx * 2 + 1], f = i / (len - 1);
          // A strip must not cross the camera plane: the screen-space ribbon has no meaning behind it.
          if ((X - ex) * fx + (Y - ey) * fy + (Z - ez) * fz < near || (X - b.x) ** 2 + (Y - b.z) ** 2 + (Z - b.y) ** 2 < cl) { trails.strip(); continue; }
          trails.point(X, Y, Z, r, g, bl, glow * f * Math.sqrt(f) + 0.012, 0.45 + 0.95 * f);
        }
        trails.strip();
      }
    }
    trails.end();
  }

  function syncGrid(B, view) {
    let M = 0, cx = 0, cy = 0, cz = 0, R = 260;
    for (const b of B) { M += b.m; cx += b.m * b.x; cy += b.m * b.y; cz += b.m * b.z; }
    if (M) { cx /= M; cy /= M; cz /= M; }
    for (const b of B) { const d = Math.hypot(b.x - cx, b.y - cy); if (d < 4000 && d > R) R = d; }
    grid.position.set(cx, cz, cy);
    const dist = view.camera.position.distanceTo(grid.position), want = Math.max(R * 1.42, 560);
    gridR = gridR && !reduceMotion ? gridR + (want - gridR) * Math.min(1, view.dt * 3) : want;
    const l = Math.log2(Math.max(dist, 1) * 0.085 / 12.5), o = Math.floor(l);
    gridU.uR.value = gridR; gridU.uS.value = 12.5 * Math.pow(2, o); gridU.uFade.value = l - o;
  }

  const api = {
    portrait, scene, studio: null, exposure: 1, bloom: { strength: BLOOM, radius: 0.42, threshold: 1.05 },
    sync(l, view) {
      const B = lab.bodies;
      L.uClock.value = reduceMotion ? 0 : view.t; L.uSpin.value = reduceMotion ? 0 : lab.t;
      starfield.material.uniforms.uPR.value = view.pr;
      syncGrid(B, view);
      syncBodies(B, view);
      syncLights(view, B);
      syncEclipses(B);
      syncTrails(B, view);
      watchMerges(B, view.dt);
      flush(farPlanets); flush(nearPlanets); flush(rings); flush(stars); flush(corona); flush(glare); flush(flash);
      api.bloom.strength = (BLOOM + pulse) / (1 + (starPx / 150) ** 2);
    },
    prepare(renderer) {
      if (!skyDirty) return;
      skyDirty = false;
      // A lost context took the old target with it; its handles are not this context's to delete.
      if (!skyLost) sky.dispose();
      skyLost = false;
      sky = bakeSky(renderer, skyBuilt); dome.material.uniforms.tSky.value = sky.texture;
    },
    onTier(tier) {
      L.uOct.value = tier.detail >= 0.85 ? 7 : tier.detail >= 0.65 ? 6 : tier.detail >= 0.5 ? 5 : 4;
      starfield.geometry.setDrawRange(0, Math.round(SKY_STARS * Math.min(1, tier.detail + 0.25)));
      // With no post stack the blend happens in display space, where the same sprite reads far brighter.
      coronaMat.uniforms.uGain.value = tier.bloom || tier.grade || tier.msaa ? 1 : 0.45;
      const want = skySize(tier);
      if (want > skyBuilt) { skyBuilt = want; skyDirty = true; }
    },
    dispose() {
      E.renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      sky.dispose(); dome.geometry.dispose(); dome.material.dispose(); starfield.geometry.dispose(); starfield.material.dispose();
      for (const b of [farPlanets, nearPlanets, rings, stars, corona, glare, flash]) { b.g.dispose(); b.mesh.dispose(); }
      atmo.dispose();
      for (const m of [planetMat, atmoMat, ringMat, starMat, coronaMat, glareMat, flashMat, gridMat]) m.dispose();
      ringGeo.dispose(); fgeo.dispose(); grid.geometry.dispose(); trails.dispose(); marks.dispose();
    },
  };
  return api;
}
