/*
✒ Metadata
    - Title: Cloth Scene (digiSpace Edition - v2.1)
    - File Name: cloth.js
    - Relative Path: js/render/world/scenes/cloth.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the Verlet sheet as woven fabric on real hanging gear.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The cloth lab in the 3D mode. The solver is planar, so depth comes from a
    render-only relief: every live link is a 3D spring whose in-plane span the
    solver dictates, with bending stiffness on top. Compression makes it
    buckle into folds whose wavelength the bending picks, tension pulls them
    flat, wind drives travelling billows, and the ball and the grab press and
    lift it. Nothing here feeds back into the simulation.

✒ Key Features:
    - One sheet geometry, rewritten in place, with normals recomputed from
      the mesh and triangles dropped with their links, so tears open.
    - Woven twill and hem drawn in the shader, stress as heat in the threads,
      and a warm lining on the back and on flipped panels.
    - Curtain gantry, hammock posts, flagpole and hook rail in bevelled parts,
      with a physical fixing at every pinned node, moved as pins change.
    - A polished ball that presses the relief, and cords for the net and the
      threads left hanging at a tear.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { RAMP_HEAT } from '../../../core/color.js';
import { clamp, reduceMotion } from '../../../core/util.js';
import { canvasTexture, fbmField, paint } from '../materials.js';
import { bolt, rodGeometry, rodMatrix, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

const WALL_Z = -2.3, TILE = 0.28, RATE = 180, PINS_MAX = 1400;
/* Relief, per solver iteration, in world pixels. KS and BEND are bounded by the
   explicit step: 8·KS + 64·BEND must stay under 4. */
const KS = 0.2, BEND = 0.018, DAMP = 0.045, ANCHOR = 0.0012, BLEND = 0.34;
/* Spare width and drop each hanging holds, which is what a still cloth folds with; drop
   is the pull of gravity down the cloth that keeps folds plumb, sway the alternating
   offset of the rail's rings, lift how far flipped panels ride over the rest (negative
   tucks them behind), belly a steady outward pressure. */
const HANG = {
  curtain: { fullH: 1.55, fullV: 1, drop: 0.05, sway: 1.6, lift: 0.1, belly: 0, plan: 0 },
  hammock: { fullH: 1.05, fullV: 1.32, drop: 0, sway: 0, lift: -0.2, belly: 0.02, plan: 1 },
  flag: { fullH: 1.26, fullV: 1.02, drop: 0, sway: 0, lift: 0.16, belly: 0, plan: 2 },
  net: { fullH: 1.05, fullV: 1.05, drop: 0.03, sway: 0, lift: 0.06, belly: 0.012, plan: 0 },
};

/* A 2/2 twill: threads rounded across their width, rising and diving at each crossing. */
function paintWeave(renderer) {
  const S = 512, N = 16, H = new Float32Array(S * S), T = new Float32Array(S * S), jitter = new Float32Array(N * 2);
  let seed = 90371;
  for (let i = 0; i < N * 2; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; jitter[i] = seed / 4294967296; }
  const up = (i, j) => (((i + j) % 4 + 4) % 4 < 2 ? 1 : -1), crown = d => Math.sqrt(Math.max(0, 1 - 4 * d * d)), ease = t => t * t * (3 - 2 * t);
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) {
    const fu = x / S * N, fv = y / S * N, i = Math.floor(fu), j = Math.floor(fv), du = fu - i - 0.5, dv = fv - j - 0.5, c = up(i, j);
    const warp = (c + (up(i, dv < 0 ? j - 1 : j + 1) - c) * ease(Math.abs(dv))) * 0.5 + crown(du) * 0.6;
    const weft = -(c + (up(du < 0 ? i - 1 : i + 1, j) - c) * ease(Math.abs(du))) * 0.5 + crown(dv) * 0.6;
    const top = warp >= weft;
    H[p] = Math.max(warp, weft);
    T[p] = (top ? 0.92 + 0.08 * jitter[i] : 0.88 + 0.08 * jitter[N + j]) * (0.84 + 0.16 * (top ? crown(du) : crown(dv)));
  }
  const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const ca = canvas(), cn = canvas(), ga = ca.getContext('2d'), gn = cn.getContext('2d'), ia = ga.createImageData(S, S), inn = gn.createImageData(S, S);
  const at = (x, y) => H[((y + S) % S) * S + (x + S) % S], Kn = 1.5;
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) {
    const q = p * 4, nx = -(at(x + 1, y) - at(x - 1, y)) * Kn, ny = (at(x, y + 1) - at(x, y - 1)) * Kn, l = 1 / Math.hypot(nx, ny, 1), t = 255 * T[p];
    ia.data[q] = ia.data[q + 1] = ia.data[q + 2] = t; ia.data[q + 3] = 255;
    inn.data[q] = (nx * l * 0.5 + 0.5) * 255; inn.data[q + 1] = (ny * l * 0.5 + 0.5) * 255; inn.data[q + 2] = (l * 0.5 + 0.5) * 255; inn.data[q + 3] = 255;
  }
  ga.putImageData(ia, 0, 0); gn.putImageData(inn, 0, 0);
  return { albedo: canvasTexture(ca, { renderer, srgb: true, repeat: 1 / TILE }), normal: canvasTexture(cn, { renderer, repeat: 1 / TILE }) };
}

/* Soft creases, too fine for the mesh to carry: ridged fBm turned into a normal map. */
function paintCrinkle(renderer) {
  const S = 512, a = fbmField(83, 5, 4), b = fbmField(19, 3, 3), H = new Float32Array(S * S);
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) {
    const u = x / S, v = y / S, r = 1 - Math.abs(2 * a(u, v) - 1);
    H[p] = r * r * 0.7 + b(u, v) * 0.5;
  }
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S), at = (x, y) => H[((y + S) % S) * S + (x + S) % S], K = 7;
  for (let y = 0, p = 0; y < S; y++) for (let x = 0; x < S; x++, p++) {
    const q = p * 4, nx = -(at(x + 2, y) - at(x - 2, y)) * K, ny = (at(x, y + 2) - at(x, y - 2)) * K, l = 1 / Math.hypot(nx, ny, 1);
    img.data[q] = (nx * l * 0.5 + 0.5) * 255; img.data[q + 1] = (ny * l * 0.5 + 0.5) * 255; img.data[q + 2] = (l * 0.5 + 0.5) * 255; img.data[q + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvasTexture(c, { renderer });
}

/* The lab's stress ramp, as a lookup for the shader and as linear floats for the cords. */
function heatRamp() {
  const d = new Uint8Array(1024), lin = new Float32Array(768), c = new THREE.Color();
  for (let i = 0; i < 256; i++) {
    for (let k = 0; k < 3; k++) d[i * 4 + k] = RAMP_HEAT.rgb[i * 3 + k];
    d[i * 4 + 3] = 255;
    c.setRGB(RAMP_HEAT.rgb[i * 3] / 255, RAMP_HEAT.rgb[i * 3 + 1] / 255, RAMP_HEAT.rgb[i * 3 + 2] / 255, THREE.SRGBColorSpace);
    lin[i * 3] = c.r; lin[i * 3 + 1] = c.g; lin[i * 3 + 2] = c.b;
  }
  const tex = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, lin };
}

function fabricMaterial(weave, heat, crinkle) {
  const U = {
    tHeat: { value: heat }, tCrinkle: { value: crinkle }, uFront: { value: new THREE.Color(0x1b416f) }, uLining: { value: new THREE.Color(0xb06a30) },
    uSheenF: { value: new THREE.Color(0x7aa6da) }, uSheenL: { value: new THREE.Color(0xffc486) }, uRough: { value: new THREE.Vector2(0.6, 0.4) },
    uSheet: { value: new THREE.Vector2(1, 1) }, uPlan: { value: 0 },
  };
  const mat = new THREE.MeshPhysicalMaterial({ map: weave.albedo, normalMap: weave.normal, normalScale: new THREE.Vector2(0.42, 0.42), roughness: 0.6, metalness: 0, sheen: 1, sheenRoughness: 0.36, sheenColor: 0x7aa6da, envMapIntensity: 0.78, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aFold; varying vec3 vFold; varying vec2 vCloth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFold = aFold; vCloth = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vFold; varying vec2 vCloth;
      uniform sampler2D tHeat, tCrinkle; uniform vec3 uFront, uLining, uSheenF, uSheenL; uniform vec2 uRough, uSheet; uniform float uPlan;
      float thread(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
      /* Woven in: stripes along the hammock's span, a signal band across the flag. */
      vec3 frontCloth() {
        if (uPlan < 0.5) return uFront;
        vec2 q = vCloth / uSheet;
        if (uPlan < 1.5) {
          float y = abs(q.y - 0.5) * 2.0, st = smoothstep(0.52, 0.525, y) * (1.0 - smoothstep(0.62, 0.625, y)), fine = smoothstep(0.7, 0.705, y) * (1.0 - smoothstep(0.725, 0.73, y));
          return mix(mix(uFront, vec3(0.86, 0.5, 0.14), st), vec3(0.85, 0.78, 0.66), fine);
        }
        float d = q.x * 0.62 + q.y * 0.38, band = smoothstep(0.455, 0.46, d) * (1.0 - smoothstep(0.585, 0.59, d)), edge = smoothstep(0.43, 0.435, d) * (1.0 - smoothstep(0.61, 0.615, d));
        return mix(mix(mix(uFront, uFront * vec3(0.5, 0.82, 1.0), step(0.5, d)), vec3(0.85, 0.8, 0.7), edge), vec3(0.86, 0.48, 0.1), band);
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      float clothFace = gl_FrontFacing ? 1.0 : 0.0;
      if (vFold.z > 0.9 + 0.1 * thread(vCloth * 120.0)) discard;
      float clothLip = clothFace * smoothstep(0.62, 0.82, vFold.z);
      vec3 clothBase = mix(mix(uLining, frontCloth(), clothFace), uLining, clothLip);
      float hemD = min(min(vCloth.x, uSheet.x - vCloth.x), min(vCloth.y, uSheet.y - vCloth.y));
      float hem = 1.0 - smoothstep(0.06, 0.066, hemD), stitch = smoothstep(0.012, 0.0, abs(hemD - 0.047)) * step(0.42, fract((vCloth.x + vCloth.y) * 17.0));
      clothBase *= 1.0 - 0.2 * hem;
      clothBase = mix(clothBase, clothBase * 1.7 + 0.03, stitch * 0.7);
      float clothHeatAt = clamp(vFold.x, 0.0, 1.0);
      vec3 clothHeat = texture2D(tHeat, vec2(0.274 + 0.726 * clothHeatAt, 0.5)).rgb;
      float clothHot = smoothstep(0.006, 0.17, clothHeatAt);
      diffuseColor.rgb = mix(clothBase * diffuseColor.rgb, clothHeat * diffuseColor.rgb * 1.15, clothHot * 0.92);
      float clothCav = vFold.y * (gl_FrontFacing ? 1.0 : -1.0);
      diffuseColor.rgb *= 1.0 - 0.46 * smoothstep(0.0, 1.0, clothCav) + 0.16 * smoothstep(0.0, 1.0, -clothCav);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(uRough.y, uRough.x, clothFace * (1.0 - clothLip));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec2 clothNap = texture2D(tCrinkle, vCloth * 0.42).xy * 2.0 - 1.0 + (texture2D(tCrinkle, vCloth * 1.3).xy * 2.0 - 1.0) * 0.5;
      normal = normalize(normal + (tbn[0] * clothNap.x + tbn[1] * clothNap.y) * 0.09);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += clothHeat * clothHot * (0.05 + 0.4 * clothHeatAt) * (0.55 + 0.45 * length(diffuseColor.rgb));`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #ifdef USE_SHEEN
        material.sheenColor = mix(uSheenL, uSheenF, clothFace * (1.0 - clothLip)) * (1.0 - clothHot * 0.5);
      #endif`);
  };
  mat.customProgramCacheKey = () => 'world-cloth';
  return { mat, U };
}

export function createScene(E, lab) {
  const studio = createStudio(E, {
    keyPos: [-8.4, 10, 9.4], keyTarget: [0.3, 2.4, 0], key: 1000, keyAngle: 0.5, keyPenumbra: 0.9, shadowSpan: 38, envIntensity: 0.85,
    dome: { glowDir: [0.05, 0.25, -1], glow: 0x182638, glowPow: 5 }, floor: { repeat: 6, reflect: 1, f0: 0.1, color: 0x1d232c, roughness: 0.38 },
  });
  const { scene } = studio, M = E.mats;
  studio.key.shadow.radius = 4.5;
  const CAP_N = lab.x.length, CAP_L = lab.la.length;
  const rig = new THREE.Group(); scene.add(rig);
  const shadow = o => { o.castShadow = true; o.receiveShadow = true; return o; };
  const fill = new THREE.DirectionalLight(0x9dbcf0, 0.3); fill.position.set(9, 4.5, 9); scene.add(fill);
  // A background light hung between the cloth and the wall: it opens the wall without flattening the folds.
  const wash = new THREE.SpotLight(0xa9c4ee, 60, 0, 0.8, 1, 2); wash.position.set(0.4, 9, -0.7); wash.target.position.set(0.4, 2.6, WALL_Z); scene.add(wash, wash.target);

  /* Materials made here for this scene alone. */
  const weave = paintWeave(E.renderer), crinkle = paintCrinkle(E.renderer), heat = heatRamp(), fabric = fabricMaterial(weave, heat.tex, crinkle);
  const black = new THREE.MeshPhysicalMaterial({ color: 0x2a2f38, metalness: 1, roughness: 0.42, roughnessMap: M.map('smudge', 512, { repeat: 2 }), clearcoat: 0.4, clearcoatRoughness: 0.34, envMapIntensity: 1.5 });
  const blackRail = new THREE.MeshPhysicalMaterial({ color: 0x333943, metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.6 });
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, envMapIntensity: 0.7 });
  cordMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
        totalEmissiveRadiance += vColor * 0.2;
      #endif`);
  };

  /* The sheet: one geometry, positions, normals and folds rewritten in place. */
  const pos = new Float32Array(CAP_N * 3), nor = new Float32Array(CAP_N * 3), uvs = new Float32Array(CAP_N * 2), fold = new Float32Array(CAP_N * 3), tris = new Uint32Array(CAP_N * 6);
  const dyn = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
  const aPos = dyn(pos, 3), aNor = dyn(nor, 3), aUv = dyn(uvs, 2), aFold = dyn(fold, 3), aIdx = dyn(tris, 1), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', aPos); geo.setAttribute('normal', aNor); geo.setAttribute('uv', aUv); geo.setAttribute('aFold', aFold); geo.setIndex(aIdx);
  const sheet = shadow(new THREE.Mesh(geo, fabric.mat));
  sheet.frustumCulled = false; sheet.visible = false; rig.add(sheet);

  /* Relief state, in world pixels along the plane normal. The lab reads Z for its overlay. */
  const Z = new Float32Array(CAP_N), ZO = new Float32Array(CAP_N), ZH = new Float32Array(CAP_N), DOWN = new Float32Array(CAP_N), LAY = new Float32Array(CAP_N), HEAP = new Float32Array(CAP_N), FZ = new Float32Array(CAP_N), LAP = new Float32Array(CAP_N), WF = new Float32Array(CAP_N), SEED = new Float32Array(CAP_N), FLIP = new Float32Array(CAP_N), ST = new Float32Array(CAP_N), HOT = new Float32Array(CAP_N), EDGE = new Uint8Array(CAP_N);
  const NL = new Int32Array(CAP_N), NR = new Int32Array(CAP_N), NU = new Int32Array(CAP_N), ND = new Int32Array(CAP_N);
  const used = new Uint8Array(CAP_L), loose = new Int32Array(CAP_L);
  lab.relief3 = Z;

  /* Everything that holds or crosses the cloth. */
  const pool = (g, m, cap, casts = true) => {
    const o = new THREE.InstancedMesh(g, m, cap);
    o.frustumCulled = false; o.castShadow = casts; o.receiveShadow = true; o.count = 0; o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rig.add(o); return o;
  };
  const threadGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), knotGeo = new THREE.SphereGeometry(1, 8, 6), ringGeo = new THREE.TorusGeometry(0.075, 0.012, 12, 40), eyeGeo = new THREE.TorusGeometry(0.026, 0.0085, 10, 24), capGeo = turned([[0, 0.06], [0.028, 0.056], [0.042, 0.04], [0.046, 0.012], [0.03, 0.004], [0.03, 0]], 24, 6);
  const plateGeo = turned([[0, 0.022], [0.05, 0.02], [0.07, 0.012], [0.072, 0]], 24, 6), rodGeo = rodGeometry(10);
  const hookGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, -0.012, 0.05], [0, 0.03, 0.044], [0, 0.05, 0], [0, 0.03, -0.044], [0, -0.012, -0.046], [0, -0.05, -0.02], [0, -0.09, 0], [0, -0.18, 0], [0, -0.218, 0.022], [0, -0.25, 0], [0, -0.228, -0.028], [0, -0.2, -0.024]].map(p => new THREE.Vector3(...p))), 54, 0.0058, 7);
  const threads = pool(threadGeo, cordMat, CAP_L), knots = pool(knotGeo, cordMat, CAP_N);
  threads.setColorAt(0, new THREE.Color(1, 1, 1)); knots.setColorAt(0, new THREE.Color(1, 1, 1));
  const rings = pool(ringGeo, M.brass(), PINS_MAX), eyes = pool(eyeGeo, M.brass(), PINS_MAX), hooks = pool(hookGeo, M.steel(), PINS_MAX), rods = pool(rodGeo, M.steel(), PINS_MAX * 2), caps = pool(capGeo, M.brass(), PINS_MAX), plates = pool(plateGeo, M.gunmetal(), PINS_MAX);
  const ball = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 54), M.polished())); ball.visible = false; rig.add(ball);

  /* A dark wall that dissolves at its edges, so shadows land on something and the room stays open. */
  const wallFade = canvasTexture(paint(256, (u, v) => {
    const d = Math.hypot((u - 0.5) * 2.1, (v - 0.74) * 2.6), t = clamp((1 - d) / 0.8, 0, 1), a = t * t * (3 - 2 * t) * 255;
    return [a, a, a];
  }), { renderer: E.renderer });
  wallFade.wrapS = wallFade.wrapT = THREE.ClampToEdgeWrapping;
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a3442, alphaMap: wallFade, transparent: true, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallMat);
  wall.position.set(0, 7, WALL_Z); wall.receiveShadow = true; wall.renderOrder = -2; rig.add(wall);

  /* Apparatus, rebuilt when the preset or the sheet changes. */
  const parts = new THREE.Group(); rig.add(parts);
  const geos = [], rodUnit = rodGeometry(14);
  const part = (g, m, x = 0, y = 0, z = 0) => { if (!geos.includes(g)) geos.push(g); const o = shadow(new THREE.Mesh(g, m)); o.position.set(x, y, z); parts.add(o); return o; };
  const strut = (ax, ay, az, bx, by, bz, r, m) => { const o = shadow(new THREE.Mesh(rodUnit, m)); o.matrixAutoUpdate = false; rodMatrix(ax, ay, az, bx, by, bz, o.matrix, r); parts.add(o); return o; };
  const R = { kind: 'rail', railY: 0, poleX: 0, postL: 0, postR: 0 };

  function buildCurtain(A) {
    const brass = M.brass(), rail = A.top + 0.27, H = rail + 0.3, xL = A.left - 0.62, xR = A.right + 0.62, W = xR - xL, mid = (xL + xR) / 2, boltG = bolt(0.034), pad = roundedBox(0.24, 0.024, 0.34, 0.01, 3);
    R.kind = 'rings'; R.railY = rail;
    for (const x of [xL, xR]) {
      part(roundedBox(0.15, H, 0.15, 0.03, 4), black, x, H / 2 + 0.05, 0);
      part(roundedBox(0.36, 0.08, 2.3, 0.035, 5), black, x, 0.04, 0);
      part(roundedBox(0.205, 0.06, 0.205, 0.024, 4), brass, x, 0.112, 0);
      part(roundedBox(0.2, 0.09, 0.2, 0.026, 4), brass, x, rail, 0);
      for (const z of [-1, 1]) {
        strut(x, 0.08, z * 0.86, x, 1.05, z * 0.02, 0.017, black);
        part(pad, brass, x, 0.08, z * 1).scale.set(1, 1, 0.6);
        for (const d of [-0.07, 0.07]) part(boltG, brass, x + d, 0.09, z * 1.03);
      }
    }
    part(roundedBox(W + 0.15, 0.13, 0.17, 0.034, 5), black, mid, H + 0.03, 0);
    const bar = part(new THREE.CylinderGeometry(0.034, 0.034, W, 32), blackRail, mid, rail, 0); bar.rotation.z = Math.PI / 2;
    const hangers = Math.max(2, Math.round(W / 1.7));
    for (let k = 1; k < hangers; k++) {
      const x = xL + W * k / hangers;
      strut(x, rail, 0, x, H + 0.03, 0, 0.016, black);
      part(roundedBox(0.09, 0.05, 0.09, 0.018, 3), brass, x, H - 0.06, 0);
    }
  }
  function buildHammock(A) {
    const brass = M.brass(), H = A.top + 0.66, plinth = roundedBox(1.02, 0.1, 1.02, 0.04, 5), step = roundedBox(0.66, 0.07, 0.66, 0.03, 4), boltG = bolt(0.036);
    const shaft = turned([[0.205, 0], [0.215, 0.05], [0.16, 0.13], [0.14, 0.22], [0.172, 0.3], [0.128, 0.42], [0.1, H * 0.46], [0.088, H * 0.8], [0.116, H - 0.36], [0.086, H - 0.29], [0.086, H - 0.2], [0.122, H - 0.15], [0.058, H - 0.075], [0.094, H - 0.04], [0.06, H - 0.004], [0, H]], 48, 8);
    const collar = turned([[0.124, 0], [0.142, 0.012], [0.142, 0.04], [0.124, 0.052]], 40, 4);
    R.kind = 'posts'; R.postL = A.left - 0.36; R.postR = A.right + 0.36;
    for (const [x, s] of [[R.postL, 1], [R.postR, -1]]) {
      part(plinth, M.slate(), x, 0.05, 0); part(step, M.walnut(), x, 0.135, 0);
      part(shaft, M.walnut(), x, 0.17, 0);
      part(collar, brass, x, A.top - 0.62, 0); part(collar, brass, x, 0.72, 0).scale.setScalar(1.28);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(boltG, brass, x + dx * 0.42, 0.1, dz * 0.42);
      // The eye the hanging ties to: a shank through the post and a ring facing the span.
      strut(x, A.top, 0, x + s * 0.2, A.top, 0, 0.016, M.steel());
      const eye = part(new THREE.TorusGeometry(0.052, 0.012, 12, 32), brass, x + s * 0.25, A.top, 0); eye.rotation.y = 0;
      part(new THREE.TorusGeometry(0.11, 0.016, 12, 36), brass, x + s * 0.05, A.top, 0).rotation.x = Math.PI / 2;
    }
  }
  function buildFlag(A) {
    const brass = M.brass(), r = 0.062, H = A.top + 0.7, x = A.left - r - 0.13, tx = A.left - 0.036;
    R.kind = 'pole'; R.poleX = tx;
    part(roundedBox(1.14, 0.1, 1.14, 0.04, 5), M.slate(), x, 0.05, 0);
    part(roundedBox(0.76, 0.1, 0.76, 0.036, 5), M.walnut(), x, 0.15, 0);
    part(turned([[0.27, 0], [0.27, 0.03], [0.2, 0.07], [0.15, 0.1], [0.12, 0.17], [0.092, 0.22], [0.11, 0.25], [0.092, 0.29]], 48, 6), brass, x, 0.2, 0);
    part(turned([[0.086, 0], [0.076, H * 0.3], [r, A.top - 0.1], [r * 0.82, H]], 40, 6), M.steel(), x, 0.2, 0);
    part(turned([[0.07, 0], [0.09, 0.02], [0.09, 0.05], [0.05, 0.08], [0.052, 0.1], [0.11, 0.16], [0.128, 0.215], [0.104, 0.275], [0.042, 0.33], [0.016, 0.42], [0, 0.52]], 40, 8), brass, x, H + 0.18, 0);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(bolt(0.04), brass, x + dx * 0.47, 0.1, dz * 0.47);
    // The hoist: a fine track carried off the pole on three arms, with a slider at each pinned node.
    strut(tx, A.bottom - 0.16, 0, tx, A.top + 0.16, 0, 0.0115, M.polished());
    for (const f of [-0.1, 0.5, 1.1]) {
      const y = A.bottom + (A.top - A.bottom) * f;
      strut(x, y, 0, tx, y, 0, 0.012, brass);
      part(new THREE.CylinderGeometry(0.02, 0.02, 0.036, 16), brass, tx, y, 0);
    }
  }
  function buildNet(A) {
    const brass = M.brass(), rail = A.top + 0.25, H = rail + 0.2, xL = A.left - 0.52, xR = A.right + 0.52, W = xR - xL;
    R.kind = 'hooks'; R.railY = rail;
    const foot = turned([[0.34, 0], [0.34, 0.04], [0.26, 0.075], [0.09, 0.11], [0.05, 0.16]], 48, 6), stem = turned([[0.042, 0], [0.034, 0.3], [0.03, H * 0.6], [0.028, H]], 24, 4), head = turned([[0.05, 0], [0.056, 0.012], [0.056, 0.05], [0.074, 0.075], [0.08, 0.12], [0.06, 0.17], [0.02, 0.2], [0, 0.22]], 32, 6);
    for (const x of [xL, xR]) {
      part(foot, M.slate(), x, 0, 0); part(stem, M.steel(), x, 0.14, 0);
      part(head, brass, x, H + 0.14, 0);
      part(new THREE.CylinderGeometry(0.058, 0.058, 0.09, 24), brass, x, rail, 0).rotation.z = Math.PI / 2;
    }
    const bar = part(new THREE.CylinderGeometry(0.026, 0.026, W, 24), M.polished(), (xL + xR) / 2, rail, 0); bar.rotation.z = Math.PI / 2;
  }

  /* State read once per layout. */
  const home = new Int32Array(PINS_MAX), isHome = new Uint8Array(CAP_N), hx = new Float32Array(PINS_MAX), hy = new Float32Array(PINS_MAX);
  let homes = 0, layoutKey = '', P = null, hang = HANG.curtain, cx = 0, cy = 0, kk = 0.01, y0 = 0, spc = 14, B0 = BEND, topo = 0, fresh = false, looseN = 0, acc = 0, lastT = -1, settle = 0;
  let ballS = 0, ballZ = 0, bx = 0, by = 0, bR = 40;

  function layout() {
    const key = `${lab.presetId}:${lab.w}x${lab.h}:${lab.cols}x${lab.rows}:${lab.sp0}`;
    if (key === layoutKey) return;
    layoutKey = key; fresh = true;
    P = lab.plane3(); hang = HANG[lab.presetId] || HANG.curtain;
    cx = P.cx; cy = P.cy; kk = P.k; y0 = P.o[1]; spc = lab.sp0;
    B0 = Math.min(0.036, BEND * (14 / spc) ** 2);
    const { cols, rows, w, h } = lab, s = spc, flag = lab.presetId === 'flag', x0 = flag ? w * 0.18 : (w - (cols - 1) * s) / 2, yTop = flag ? h * 0.14 : h * 0.08;
    const A = { left: (x0 - cx) * kk, right: (x0 + (cols - 1) * s - cx) * kk, top: y0 - (yTop - cy) * kk, bottom: y0 - (yTop + (rows - 1) * s - cy) * kk };
    parts.clear(); for (const g of geos) g.dispose(); geos.length = 0;
    ({ curtain: buildCurtain, hammock: buildHammock, flag: buildFlag, net: buildNet }[lab.presetId] || buildCurtain)(A);
    fabric.U.uSheet.value.set((cols - 1) * s * kk, (rows - 1) * s * kk); fabric.U.uPlan.value = hang.plan;
    const fbm = fbmField(47, 5, 3);
    Z.fill(0); ZO.fill(0); DOWN.fill(0); isHome.fill(0); homes = 0;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      uvs[i * 2] = c * s * kk; uvs[i * 2 + 1] = r * s * kk;
      SEED[i] = (fbm(c / cols, r / rows) - 0.5) * 0.008;
      Z[i] = ZO[i] = (fbm(c / cols, r / rows) - 0.5) * s;
      // Where this node comes to rest once it reaches the floor: rolled forward from the hem, row by row.
      const n1 = fbm(c / cols + 0.4, r / rows + 0.3), roll = Math.sin(r * 0.62 + n1 * 5 + c * 0.05);
      LAY[i] = (rows - 1 - r) * s * 0.5 + roll * s * 1.1 + (n1 - 0.5) * s * 2;
      HEAP[i] = (0.3 + roll * roll * 1.5 + n1 * 0.7) * s * kk;
      if (lab.pin[i] && homes < PINS_MAX) { home[homes] = i; hx[homes] = (lab.x[i] - cx) * kk; hy[homes] = y0 - (lab.y[i] - cy) * kk; isHome[i] = 1; homes++; }
    }
    ZH.fill(0);
    for (let h2 = 0; h2 < homes; h2++) { const i = home[h2]; ZH[i] = Z[i] = ZO[i] = (h2 & 1 ? -1 : 1) * hang.sway * s; }
    aUv.needsUpdate = true;
  }

  /* Stretch per node, the way draw() colours links, and a fingerprint of which links live. */
  function readLinks() {
    const { x: X, y: Y, la, lb, rest, alive: A, L, n } = lab;
    ST.fill(0, 0, n);
    let h = L | 0;
    for (let k = 0; k < L; k++) {
      if (!A[k]) { h = (Math.imul(h, 31) + k) | 0; continue; }
      const a = la[k], b = lb[k], dx = X[b] - X[a], dy = Y[b] - Y[a], s = Math.sqrt(dx * dx + dy * dy) / rest[k] - 1;
      if (s > ST[a]) ST[a] = s;
      if (s > ST[b]) ST[b] = s;
    }
    if (h !== topo || fresh) { topo = h; topology(); settle = 90; }
  }
  /* Neighbours through live links, and triangles for the panels that still have theirs. */
  function topology() {
    const { cols, rows, alive: A, hL, vL, L } = lab;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      NL[i] = c > 0 && A[hL[i - 1]] ? i - 1 : i; NR[i] = c < cols - 1 && A[hL[i]] ? i + 1 : i;
      NU[i] = r > 0 && A[vL[i - cols]] ? i - cols : i; ND[i] = r < rows - 1 && A[vL[i]] ? i + cols : i;
      EDGE[i] = (c > 0 && NL[i] === i) || (c < cols - 1 && NR[i] === i) || (r > 0 && NU[i] === i) || (r < rows - 1 && ND[i] === i) ? 1 : 0;
    }
    used.fill(0, 0, L);
    let t = 0;
    const tri = (p, q, s, l1, l2) => { tris[t++] = p; tris[t++] = q; tris[t++] = s; used[l1] = used[l2] = 1; };
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1, top = hL[a], bot = hL[d], lft = vL[a], rgt = vL[b];
      if ((c + r) & 1) { if (A[lft] && A[bot]) tri(a, d, e, lft, bot); if (A[top] && A[rgt]) tri(a, e, b, top, rgt); }
      else { if (A[lft] && A[top]) tri(a, d, b, lft, top); if (A[rgt] && A[bot]) tri(b, d, e, rgt, bot); }
    }
    aIdx.clearUpdateRanges(); aIdx.addUpdateRange(0, t); aIdx.needsUpdate = true; geo.setDrawRange(0, t);
    looseN = 0;
    for (let k = 0; k < L; k++) if (A[k] && !used[k]) loose[looseN++] = k;
  }

  /* Driving terms held for one frame: wind, flipped panels and torn lips. */
  function drive() {
    const { x: X, y: Y, cols, rows, n } = lab, t = reduceMotion ? 0 : lab.t, wd = lab.p.wind, a = Math.min(1.8, Math.abs(wd) / 520), dir = Math.sign(wd), s = spc;
    FLIP.fill(0, 0, n);
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c, b = i + 1, d = i + cols, e = d + 1;
      if ((X[e] - X[i]) * (Y[d] - Y[b]) - (Y[e] - Y[i]) * (X[d] - X[b]) < 0) { FLIP[i] += 0.25; FLIP[b] += 0.25; FLIP[d] += 0.25; FLIP[e] += 0.25; }
    }
    const cross = 0.033, along = 0.014, drift = 8.5, lift = hang.lift, belly = hang.belly, layer = s * 2.8;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      const px = c * s, py = r * s;
      const riding = Math.abs(Z[i]) / layer;
      let f = belly + FLIP[i] * lift * (riding < 1 ? 1 - riding : 0) + EDGE[i] * 0.05;
      if (a) {
        const gust = 0.62 + 0.38 * Math.sin(t * 1.9 + py * 0.017) + 0.25 * Math.sin(t * 5.3 + px * 0.031 + py * 0.011);
        f += a * gust * (0.09 * Math.sin(dir * px * cross - t * drift + Math.sin(py * along + t * 0.7) * 1.5) + 0.035 * Math.sin(dir * px * cross * 1.7 + py * along * 2 - t * drift * 1.4) + 0.01);
      }
      WF[i] = f;
    }
  }

  /* The relief itself: 3D springs across the solver's positions, bending, damped steps. */
  function solve(iters) {
    const { x: X, y: Y, la, lb, rest, alive: A, L, n, pin } = lab, fH = hang.fullH, fV = hang.fullV - hang.drop * lab.p.gravity / 900, G = lab.grab, gi = G ? G.i : -1, Bk = B0, cap = spc * 0.6, lift = spc * 3.1;
    const press = ballS > 0.4, Rc2 = bR * bR * 1.1, near = bR * bR * 1.1;
    for (let it = 0; it < iters; it++) {
      FZ.fill(0, 0, n);
      for (let k = 0; k < L; k++) {
        if (!A[k]) continue;
        const a = la[k], b = lb[k], dx = X[b] - X[a], dy = Y[b] - Y[a], dz = Z[b] - Z[a], len = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
        const f = KS * (len - rest[k] * (b === a + 1 ? fH : fV)) / len * dz;
        FZ[a] += f; FZ[b] -= f;
      }
      for (let i = 0; i < n; i++) LAP[i] = Z[NL[i]] + Z[NR[i]] + Z[NU[i]] + Z[ND[i]] - 4 * Z[i];
      for (let i = 0; i < n; i++) {
        if (pin[i]) { if (isHome[i]) Z[i] += (ZH[i] - Z[i]) * 0.2; ZO[i] = Z[i]; continue; }
        const bend = Bk * (4 * LAP[i] - LAP[NL[i]] - LAP[NR[i]] - LAP[NU[i]] - LAP[ND[i]]);
        let v = (Z[i] - ZO[i]) * (1 - DAMP) + FZ[i] + bend + WF[i] + SEED[i] - ANCHOR * Z[i];
        if (v > cap) v = cap; else if (v < -cap) v = -cap;
        ZO[i] = Z[i]; Z[i] += v;
        if (DOWN[i] > 0.01) Z[i] += (LAY[i] - Z[i]) * 0.07 * DOWN[i];
      }
      if (gi >= 0) { Z[gi] += (lift - Z[gi]) * 0.22; ZO[gi] = Z[gi]; }
      if (press) for (let i = 0; i < n; i++) {
        const dx = X[i] - bx, dy = Y[i] - by, rr = dx * dx + dy * dy;
        if (rr >= near || pin[i]) continue;
        const lim = ballZ - Math.sqrt(Rc2 - rr);
        if (Z[i] > lim) { Z[i] = lim; ZO[i] = lim; }
      }
    }
  }

  /* World to scene, smooth normals through live links, and the per-node shading terms. */
  function writeSheet() {
    const { x: X, y: Y, n, pin } = lab, cav = 1.5 / spc, sc = 2, ground = lab.h - 3 - spc * 0.5;
    for (let i = 0; i < n; i++) {
      // A node on the floor is on the heap: its zigzag along the column evens out and it rises onto the pile.
      const D = DOWN[i] += ((Y[i] > ground && !pin[i] ? 1 : 0) - DOWN[i]) * 0.09, o = i * 3;
      pos[o] = ((D > 0.01 ? X[i] + (X[NU[i]] + X[ND[i]] - 2 * X[i]) * 0.25 * D : X[i]) - cx) * kk;
      pos[o + 1] = y0 - (Y[i] - cy) * kk + HEAP[i] * D; pos[o + 2] = Z[i] * kk;
    }
    for (let i = 0; i < n; i++) {
      const o = i * 3, l = NL[i] * 3, r = NR[i] * 3, u = NU[i] * 3, d = ND[i] * 3;
      const tx = pos[r] - pos[l], ty = pos[r + 1] - pos[l + 1], tz = pos[r + 2] - pos[l + 2], sx = pos[d] - pos[u], sy = pos[d + 1] - pos[u + 1], sz = pos[d + 2] - pos[u + 2];
      const nx = sy * tz - sz * ty, ny = sz * tx - sx * tz, nz = sx * ty - sy * tx, m = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      nor[o] = nx * m; nor[o + 1] = ny * m; nor[o + 2] = nz * m;
      HOT[i] += (ST[i] * sc - HOT[i]) * BLEND;
      fold[o] = HOT[i] < 1 ? HOT[i] : 1;
      const v = (LAP[i] * 2 + LAP[NL[i]] + LAP[NR[i]] + LAP[NU[i]] + LAP[ND[i]]) * cav / 6; fold[o + 1] = v > 1 ? 1 : v < -1 ? -1 : v;
      fold[o + 2] = EDGE[i];
    }
    if (ballS > 0.05) {
      const reach = bR * 1.9, r2 = reach * reach, near = clamp(1 - (ballZ - bR) / (bR * 1.4), 0, 1) * ballS;
      for (let i = 0; i < n; i++) { const dx = X[i] - bx, dy = Y[i] - by, rr = dx * dx + dy * dy; if (rr < r2) { const o = i * 3 + 1, q = 0.75 * near * (1 - rr / r2) ** 2; if (fold[o] < q) fold[o] = q; } }
    }
    aPos.needsUpdate = aNor.needsUpdate = aFold.needsUpdate = true;
  }

  /* A cord between two nodes, written straight into the instance matrix. */
  const write = (o, A2, ax, ay, az, bx2, by2, bz2, r) => {
    const m = o.instanceMatrix.array, vx = bx2 - ax, vy = by2 - ay, vz = bz2 - az, len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-6, ix = vx / len, iy = vy / len, iz = vz / len;
    let ux = iy, uy = -ix, ul = Math.sqrt(ux * ux + uy * uy);
    if (ul < 1e-4) { ux = 1; uy = 0; ul = 1; }
    ux /= ul; uy /= ul;
    const wx = uy * iz, wy = -ux * iz, wz = ux * iy - uy * ix, j = A2 * 16;
    m[j] = ux * r; m[j + 1] = uy * r; m[j + 2] = 0; m[j + 3] = 0;
    m[j + 4] = vx; m[j + 5] = vy; m[j + 6] = vz; m[j + 7] = 0;
    m[j + 8] = wx * r; m[j + 9] = wy * r; m[j + 10] = wz * r; m[j + 11] = 0;
    m[j + 12] = (ax + bx2) / 2; m[j + 13] = (ay + by2) / 2; m[j + 14] = (az + bz2) / 2; m[j + 15] = 1;
  };
  /* Hand a pool its live instances: only those are uploaded, and never more than it holds. */
  const publish = (o, c) => {
    const n = Math.min(c, o.instanceMatrix.count), m = o.instanceMatrix, k = o.instanceColor;
    o.count = n; m.clearUpdateRanges(); m.addUpdateRange(0, n * 16); m.needsUpdate = true;
    if (k) { k.clearUpdateRanges(); k.addUpdateRange(0, n * 3); k.needsUpdate = true; }
  };
  const ramp = (arr, j, s) => {
    const t = Math.round(70 + 185 * (s < 0 ? 0 : s > 1 ? 1 : s)) * 3;
    arr[j] = heat.lin[t]; arr[j + 1] = heat.lin[t + 1]; arr[j + 2] = heat.lin[t + 2];
  };
  /* Every live link as a cord: the net itself, or the whole sheet with the fabric off. */
  function writeCords(all, tied) {
    const { la, lb, alive: A, L, n, sp0 } = lab, tc = threads.instanceColor.array, r = all ? clamp(sp0 * 0.00062, 0.0075, 0.016) : 0.0065;
    let c = 0;
    if (all) {
      for (let k = 0; k < L; k++) {
        if (!A[k]) continue;
        const a = la[k] * 3, b = lb[k] * 3;
        write(threads, c, pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], r);
        ramp(tc, c * 3, Math.max(fold[a], fold[b])); c++;
      }
    } else {
      for (let q = 0; q < looseN; q++) {
        const k = loose[q], a = la[k] * 3, b = lb[k] * 3;
        write(threads, c, pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], r);
        ramp(tc, c * 3, Math.max(fold[a], fold[b]) + 0.1); c++;
      }
    }
    publish(threads, c); knotted(tied, r, n);
  }
  function knotted(tied, r, n) {
    let q = 0;
    if (tied) {
      const km = knots.instanceMatrix.array, kc = knots.instanceColor.array, s = r * 1.75;
      for (let i = 0; i < n; i++) {
        if (NL[i] === i && NR[i] === i && NU[i] === i && ND[i] === i) continue;
        const o = i * 3, j = q * 16;
        km[j] = s; km[j + 5] = s; km[j + 10] = s; km[j + 15] = 1; km[j + 12] = pos[o]; km[j + 13] = pos[o + 1]; km[j + 14] = pos[o + 2];
        ramp(kc, q * 3, fold[o]); q++;
      }
    }
    publish(knots, q);
  }

  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), q4 = new THREE.Quaternion(), q5 = new THREE.Quaternion();
  const axisZ = new THREE.Vector3(0, 0, 1), axisX = new THREE.Vector3(1, 0, 0), nrm = new THREE.Vector3();
  const qRail = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), qPole = new THREE.Quaternion().setFromAxisAngle(axisX, Math.PI / 2), qFace = new THREE.Quaternion().setFromAxisAngle(axisX, Math.PI / 2);
  let nRing = 0, nEye = 0, nHook = 0, nRod = 0, nCap = 0, nPlate = 0;

  const eyelet = i => {
    if (nEye >= PINS_MAX) return;
    const o = i * 3;
    q4.setFromUnitVectors(axisZ, nrm.set(nor[o], nor[o + 1], nor[o + 2]));
    v3.set(pos[o], pos[o + 1], pos[o + 2]); m4.compose(v3, q4, s3); eyes.setMatrixAt(nEye++, m4);
  };
  /* A ring or hook on the rail, swung about it toward the node it carries. */
  const onRail = (x, nodeY, nodeZ, attached) => {
    const drop = R.railY - nodeY, a = attached ? Math.atan2(nodeZ, drop) : 0, sa = Math.sin(a), ca = Math.cos(a);
    q4.setFromAxisAngle(axisX, a);
    if (R.kind === 'hooks') {
      if (nHook < PINS_MAX) { v3.set(x, R.railY, 0); m4.compose(v3, q4, s3); hooks.setMatrixAt(nHook++, m4); }
      return;
    }
    if (nRing >= PINS_MAX) return;
    const h = 0.075 - 0.034 - 0.012, cz = sa * h, cy2 = R.railY - ca * h;
    v3.set(x, cy2, cz); m4.compose(v3, q5.copy(q4).multiply(qRail), s3); rings.setMatrixAt(nRing++, m4);
    if (attached && nRod < PINS_MAX * 2) { write(rods, nRod++, x, cy2 - ca * 0.078, cz + sa * 0.078, x, nodeY, nodeZ, 0.0095); }
  };
  const slider = y => { if (nEye < PINS_MAX) { v3.set(R.poleX, y, 0); m4.compose(v3, qPole, s3); eyes.setMatrixAt(nEye++, m4); } };
  const fixed = (i, attached) => {
    const o = i * 3, X = pos[o], Y = pos[o + 1], Zp = pos[o + 2];
    if ((R.kind === 'rings' || R.kind === 'hooks') && Math.abs(R.railY - Y) < 0.62) { onRail(X, Y, Zp, attached); if (attached) eyelet(i); return true; }
    if (R.kind === 'pole' && Math.abs(X - R.poleX) < 0.5) { slider(Y); if (Math.abs(X - R.poleX) > 0.06) write(rods, nRod++, R.poleX + 0.024, Y, 0, X, Y, Zp, 0.0065); return true; }
    if (R.kind === 'posts') {
      const left = Math.abs(X - R.postL) < 0.72, right = Math.abs(X - R.postR) < 0.72;
      if (left || right) { write(rods, nRod++, left ? R.postL + 0.3 : R.postR - 0.3, Y, 0, X, Y, Zp, 0.012); eyelet(i); return true; }
    }
    return false;
  };
  const stud = i => {
    if (nCap >= PINS_MAX) return;
    const o = i * 3, X = pos[o], Y = pos[o + 1], Zp = pos[o + 2];
    v3.set(X, Y, Zp + 0.004); m4.compose(v3, qFace, s3); caps.setMatrixAt(nCap++, m4);
    write(rods, nRod++, X, Y, Zp, X, Y, WALL_Z, 0.011);
    v3.set(X, Y, WALL_Z); m4.compose(v3, qFace, s3); plates.setMatrixAt(nPlate++, m4);
  };
  /* Every pinned node gets hardware: the preset's own, or a brass stud on a standoff from the wall. */
  function writeFixings() {
    const { pin, n } = lab;
    nRing = nEye = nHook = nRod = nCap = nPlate = 0;
    for (let h = 0; h < homes; h++) {
      const i = home[h];
      if (pin[i]) { if (!fixed(i, true)) stud(i); }
      else if (R.kind === 'rings' || R.kind === 'hooks') onRail(hx[h], R.railY - 0.25, 0, false);
      else if (R.kind === 'pole') slider(hy[h]);
    }
    for (let i = 0; i < n; i++) {
      if (pin[i] && !isHome[i] && !fixed(i, true)) stud(i);
    }
    publish(rings, nRing); publish(eyes, nEye); publish(hooks, nHook); publish(rods, nRod); publish(caps, nCap); publish(plates, nPlate);
  }

  /* The ball hangs in front of the cloth under the pointer and drives in while it is pressed. */
  function syncBall(dt) {
    const held = lab.ball, tool = lab.p.tool === 'ball', H = lab.hover, show = !!held || (tool && !!H), ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 14);
    bR = lab.ballR();
    if (held) { bx = held.x; by = held.y; } else if (show) { bx = H.x; by = H.y; }
    ballS += ((show ? 1 : 0) - ballS) * ease;
    ballZ += ((held ? -0.36 : 1.5) * bR - ballZ) * ease;
    ball.visible = ballS > 0.02;
    if (ball.visible) { ball.position.set((bx - cx) * kk, y0 - (by - cy) * kk, ballZ * kk); ball.scale.setScalar(bR * kk * ballS); }
  }

  return {
    scene, studio, exposure: 1, bloom: { strength: 0.1, radius: 0.5, threshold: 1 },
    sync(l, view) {
      layout();
      syncBall(view.dt);
      readLinks();
      // A paused sim holds still: the relief only runs while something is moving it, and settles briefly after.
      if (lab.t !== lastT || lab.grab || lab.ball || fresh) { settle = 90; lastT = lab.t; }
      if (fresh) { drive(); fresh = false; solve(260); }
      acc = Math.min(acc + view.dt * RATE, 8);
      const most = E.tier.detail >= 0.6 ? 4 : E.tier.detail >= 0.45 ? 3 : 2, iters = Math.min(most, Math.floor(acc));
      if (iters > 0 && settle > 0) { drive(); solve(iters); acc -= iters; settle -= iters; }
      writeSheet();
      const net = lab.presetId === 'net', fabricOn = lab.p.fabric && !net, cords = !lab.p.fabric || net;
      sheet.visible = fabricOn;
      threads.visible = cords || looseN > 0; knots.visible = net && lab.p.fabric;
      if (threads.visible) writeCords(cords, knots.visible);
      writeFixings();
    },
    dispose() {
      lab.relief3 = null;
      parts.clear(); for (const g of geos) g.dispose();
      studio.dispose(); fill.dispose(); wash.dispose(); geo.dispose(); fabric.mat.dispose(); weave.albedo.dispose(); weave.normal.dispose(); crinkle.dispose(); heat.tex.dispose();
      black.dispose(); blackRail.dispose(); cordMat.dispose(); wallMat.dispose(); wallFade.dispose(); wall.geometry.dispose();
      for (const g of [threadGeo, knotGeo, ringGeo, eyeGeo, capGeo, plateGeo, rodGeo, hookGeo, rodUnit, ball.geometry]) g.dispose();
      for (const o of [threads, knots, rings, eyes, hooks, rods, caps, plates]) o.dispose();
    },
  };
}
