/*
✒ Metadata
    - Title: Fields Scene (digiSpace Edition - v2.1)
    - File Name: fields.js
    - Relative Path: js/render/world/scenes/fields.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the potential as a relief of light over black glass.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Fields lab in the 3D mode: an electrostatics bench of black polished
    glass with a brass edge. Over it floats the potential as a translucent
    membrane, amber peaks at positive charges and cyan wells at negative ones,
    with its equipotentials ruled in the fragment shader. Charges are orbs of
    light seated on the sheet; field lines ride it with pulses running in the
    field direction; test particles are comets on its surface.

✒ Key Features:
    - Potential grid uploaded as a half-float texture only when the lab marks
      it dirty, read through a cubic filter so the relief stays smooth.
    - Contours from screen-space derivatives, crisp at every distance.
    - A mirror pass on the glass; a parallax lookup stands in for it on tiers
      with no reflections.
    - Field-line ribbons rebuilt only on change; their pulses are a uniform.
    - Rows of like charges read as brushed plates, derived from the charges.
    - B as a grid of soft glyphs on the glass, E0 as chevrons flowing under it.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { RAMP_WAVE } from '../../../core/color.js';
import { clamp, reduceMotion } from '../../../core/util.js';
import { FIELD_P_CAP, FIELD_Q_CAP, FIELD_TRAIL } from '../../../labs/fields.js';
import { createRibbons } from '../ribbons.js';
import { rodGeometry, rodMatrix, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

const SLAB_TOP = 0.34, SLAB_T = 0.17, LINE_POINTS = 42000, TRAIL_POINTS = 52000, MAX_ARROWS = 2600, MAX_DOTS = 2400, MAX_BARS = 8, MAX_GLOW = FIELD_Q_CAP + FIELD_P_CAP + 4;
const PULSE_GAP = 190, PULSE_SPEED = 95, AMBER = new THREE.Color(0xf2a541), CYAN = new THREE.Color(0x5fd0df);
const RAMP_N = RAMP_WAVE.rgb.length / 3;

/* Cubic B-spline lookup in four bilinear taps: the 4 px grid reads as a smooth surface at any zoom. */
const FIELD_GLSL = `
  uniform sampler2D tField; uniform vec2 uGrid;
  vec4 fieldAt(vec2 st) {
    vec2 p = clamp(st, 0.0, 1.0) * (uGrid - 1.0), i = floor(p), f = p - i, f2 = f * f, f3 = f2 * f;
    vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0, w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0, w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0, w3 = f3 / 6.0;
    vec2 g0 = w0 + w1, g1 = w2 + w3, a = (i - 0.5 + w1 / g0) / uGrid, b = (i + 1.5 + w3 / g1) / uGrid;
    return g0.y * (g0.x * texture2D(tField, a) + g1.x * texture2D(tField, vec2(b.x, a.y))) + g1.y * (g0.x * texture2D(tField, vec2(a.x, b.y)) + g1.x * texture2D(tField, b));
  }`;

/* The lab's potential ramp, so colour means the same thing in both modes. */
function rampTexture() {
  const d = new Uint8Array(RAMP_N * 4);
  for (let i = 0; i < RAMP_N; i++) { d[i * 4] = RAMP_WAVE.rgb[i * 3]; d[i * 4 + 1] = RAMP_WAVE.rgb[i * 3 + 1]; d[i * 4 + 2] = RAMP_WAVE.rgb[i * 3 + 2]; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, RAMP_N, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

/* Translucent glass: the standard material supplies the studio's reflections, this supplies the rest.
   rgb is premultiplied by hand, so highlights stay at full strength over a body that is mostly clear. */
function sheetMaterial(U, env) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.24, metalness: 0, ior: 1.7, envMap: env, envMapIntensity: 0.8, transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${FIELD_GLSL}\nuniform float uRelief; varying vec2 vSt;`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); vSt = position.xz + 0.5; transformed.y += fieldAt(vSt).g * uRelief;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FIELD_GLSL}
      uniform sampler2D tRamp; uniform float uRelief, uMap, uEquip, uPx, uCell, uGain; uniform vec2 uSpan; varying vec2 vSt;`)
      .replace('#include <normal_fragment_maps>', `
      vec4 Fv = fieldAt(vSt);
      normal = normalize(mat3(viewMatrix) * normalize(vec3(-Fv.b * uRelief, 1.0, -Fv.a * uRelief))) * faceDirection;`)
      .replace('#include <emissivemap_fragment>', `
      float sv = Fv.r, av = abs(sv), hv = abs(Fv.g), rimv = pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 3.0);
      float xv = pow(hv, 0.55);
      vec3 nwv = normalize(vec3(-Fv.b * uRelief, 1.0, -Fv.a * uRelief)), tintv = texture2D(tRamp, vec2(0.5 + sign(Fv.g) * (0.26 * smoothstep(0.0, 0.74, xv) + 0.22 * smoothstep(0.74, 1.0, xv)), 0.5)).rgb;
      float litv = 0.5 + 0.62 * saturate(dot(nwv, normalize(vec3(-0.5, 0.66, 0.56)))), bodyv = uMap * (0.05 + 0.5 * pow(hv, 1.3));
      totalEmissiveRadiance += (tintv + vec3(0.008, 0.012, 0.02)) * bodyv * litv * (0.95 + 2.6 * hv * hv * hv * hv);
      totalEmissiveRadiance += (tintv * (0.3 + 1.2 * hv) + vec3(0.04, 0.055, 0.08)) * rimv * (0.3 + 0.6 * uMap);
      vec2 gc = vSt * uSpan / uCell * 2.0, gw = fwidth(gc), gd = abs(fract(gc - 0.5) - 0.5) / max(gw, vec2(1e-4));
      float mesh = uMap * (1.0 - min(min(gd.x, gd.y), 1.0)) * (1.0 - smoothstep(0.1, 0.26, max(gw.x, gw.y)));
      totalEmissiveRadiance += (vec3(0.1, 0.13, 0.18) + tintv * 0.5) * mesh * 0.17;
      float L = sv * 8.0, fw = fwidth(L), near = abs(fract(L + 0.5) - 0.5), line = 1.0 - smoothstep(uPx - 0.6, uPx + 0.6, near / max(fw, 1e-5));
      line *= (1.0 - smoothstep(0.91, 0.95, av)) * (1.0 - smoothstep(0.3, 0.7, fw)) * smoothstep(1e-5, 8e-5, fw);
      if (abs(L) < 0.5) {
        vec2 tg = abs(vec2(Fv.a, Fv.b));
        float q = (tg.x > tg.y ? vSt.x * uSpan.x : vSt.y * uSpan.y) * 7.0, dq = fract(q);
        line *= 0.4 + 0.6 * smoothstep(0.2, 0.26, abs(dq - 0.5));
      }
      line *= uEquip;
      totalEmissiveRadiance += mix(tintv * 1.5, vec3(1.0, 0.95, 0.86), 0.3 + 0.4 * (1.0 - uMap)) * line * (0.3 + 0.32 * av);`)
      .replace('#include <aomap_fragment>', `reflectedLight.directSpecular *= 0.15;
      #include <aomap_fragment>`)
      .replace('#include <opaque_fragment>', `
      vec2 eg = min(vSt, 1.0 - vSt) * uSpan;
      float edge = smoothstep(0.0, 0.1, min(eg.x, eg.y));
      vec3 specv = outgoingLight - totalEmissiveRadiance;
      outgoingLight = totalEmissiveRadiance * uGain + specv * mix(0.1, 1.0, saturate(rimv * 1.6 + (1.0 - nwv.y) * 2.5));
      gl_FragColor = vec4(outgoingLight * edge, saturate(bodyv + rimv * 0.2 + line * 0.5) * edge);`)
      .replace('#include <premultiplied_alpha_fragment>', '');
  };
  mat.customProgramCacheKey = () => 'fields-sheet';
  return mat;
}

/* Black glass. On top: light falling from the sheet, a mirror of everything above it, the ruled scale and the tint of B. */
function slabMaterial(M, U, env) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x030407, roughness: 0.2, roughnessMap: M.map('smudge', 1024, { repeat: 4 }), metalness: 0, specularIntensity: 0.3, envMap: env, envMapIntensity: 0.3 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWorld; uniform sampler2D tField, tRamp, tRefl; uniform mat4 uMirror; uniform float uReflect, uMap, uRest, uCell, uGrad; uniform vec2 uSpan; uniform vec3 uWash;`)
      .replace('#include <aomap_fragment>', `reflectedLight.directSpecular *= 0.06;
      #include <aomap_fragment>`)
      .replace('#include <opaque_fragment>', `
      float isTop = smoothstep(0.97, 0.999, inverseTransformDirection(normal, viewMatrix).y);
      if (isTop > 0.0) {
        vec3 R = reflect(normalize(vWorld - cameraPosition), vec3(0.0, 1.0, 0.0));
        float F = 0.13 + 0.87 * pow(1.0 - saturate(R.y), 4.0);
        vec2 st = vWorld.xz / uSpan + 0.5;
        vec3 pool = vec3(0.0);
        for (int i = 0; i < 6; i++) { float a = float(i) * 2.399963, r = sqrt((float(i) + 0.5) / 6.0) * 0.05; float s = texture2D(tField, st + vec2(cos(a), sin(a) * uSpan.x / uSpan.y) * r).r; pool += texture2D(tRamp, vec2(0.5 + 0.5 * s, 0.5)).rgb * s * s; }
        vec2 inside = smoothstep(vec2(-0.04), vec2(0.02), st) * smoothstep(vec2(-0.04), vec2(0.02), 1.0 - st);
        outgoingLight += pool / 6.0 * uMap * 0.16 * inside.x * inside.y * isTop;
        if (uReflect > 0.0) {
          vec4 rc = uMirror * vec4(vWorld, 1.0); vec2 uv = rc.xy / rc.w;
          vec3 sum = vec3(0.0);
          for (int i = 0; i < 8; i++) { float a = float(i) * 2.399963, r = sqrt((float(i) + 0.5) / 8.0) * 0.0022; sum += textureLod(tRefl, uv + vec2(cos(a), sin(a)) * r, 0.7).rgb; }
          outgoingLight += sum / 8.0 * F * uReflect * isTop;
        } else {
          vec2 hit = (vWorld.xz + R.xz * (uRest - vWorld.y) / max(R.y, 0.08)) / uSpan + 0.5;
          vec2 keep = smoothstep(vec2(0.0), vec2(0.08), hit) * smoothstep(vec2(0.0), vec2(0.08), 1.0 - hit);
          vec4 m = texture2D(tField, hit);
          outgoingLight += texture2D(tRamp, vec2(0.5 + 0.5 * m.r, 0.5)).rgb * abs(m.g) * abs(m.g) * F * uMap * 0.7 * keep.x * keep.y * isTop;
        }
        vec2 cell = vWorld.xz / uCell, d = abs(fract(cell - 0.5) - 0.5) / max(fwidth(cell), vec2(1e-4));
        vec2 frame = abs(abs(st - 0.5) - 0.5) * uSpan / max(fwidth(vWorld.xz), vec2(1e-5));
        float rule = (1.0 - min(min(d.x, d.y), 1.0)) * inside.x * inside.y * smoothstep(0.0, 0.4, 1.0 - max(fwidth(cell).x, fwidth(cell).y) * 6.0);
        float rim = 1.0 - min(min(frame.x, frame.y) / 1.2, 1.0);
        outgoingLight += (vec3(0.42, 0.31, 0.16) * (rule * 0.03 + rim * 0.2) + uWash * (1.0 + uGrad * (2.0 * clamp(st.y, 0.0, 1.0) - 1.0)) + vec3(0.012, 0.018, 0.028) * F) * isTop;
      }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'fields-slab';
  return mat;
}

/* Orbs: a hot core behind a coloured shell, with the charge's sign standing on the side facing the camera. */
const orbMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uPos: { value: AMBER.clone() }, uNeg: { value: CYAN.clone() } },
  vertexShader: `attribute vec4 aOrb; attribute float aSign; varying vec3 vN, vV; varying float vS;
    void main() { vec4 mv = modelViewMatrix * vec4(aOrb.xyz + position * aOrb.w, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; vS = aSign; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `#ifndef saturate
    #define saturate(a) clamp(a, 0.0, 1.0)
    #endif
    varying vec3 vN, vV; varying float vS; uniform vec3 uPos, uNeg;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV), base = vS > 0.0 ? uPos : uNeg;
      float nv = saturate(dot(n, v)), core = pow(nv, 3.0), rim = pow(1.0 - nv, 2.5);
      vec3 c = base * (0.8 + 1.5 * core) + mix(base, vec3(1.0), 0.6) * pow(nv, 12.0) * 1.4 + base * rim * 1.1;
      c += vec3(1.0, 0.97, 0.92) * pow(saturate(dot(n, normalize(v + vec3(-0.35, 0.8, 0.3)))), 90.0) * 1.2;
      vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), v)), b = cross(v, t);
      vec2 p = abs(vec2(dot(n, t), dot(n, b)));
      float L = 0.5, w = 0.115, bar = max(p.x - L, p.y - w), d = vS > 0.0 ? min(bar, max(p.y - L, p.x - w)) : bar, aa = fwidth(p.x + p.y) * 0.8;
      c = mix(c, vec3(0.012, 0.016, 0.026), 1.0 - smoothstep(-aa, aa, d));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

/* Camera-facing light: a soft halo, with a hard core for the beads. */
const glowMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uMin: { value: 0.002 }, uDim: { value: 1 } },
  vertexShader: `attribute vec4 aGlow, aTint; uniform float uMin; varying vec2 vP; varying vec4 vT;
    void main() { vec4 mv = modelViewMatrix * vec4(aGlow.xyz, 1.0); mv.xy += position.xy * max(aGlow.w, uMin * -mv.z); vP = position.xy; vT = aTint; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec2 vP; varying vec4 vT; uniform float uDim;
    void main() {
      float r = length(vP), h = pow(max(0.0, 1.0 - r), 2.8), core = (1.0 - smoothstep(0.1, 0.17, r)) * vT.a;
      gl_FragColor = vec4((vT.rgb * h + mix(vT.rgb, vec3(1.0), 0.6) * core * 2.5) * uDim, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

/* B on the glass: ⊗ or ⊙ as a soft ring. */
const dotMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uInto: { value: 1 }, uTint: { value: new THREE.Color() }, uY: { value: 0 } },
  vertexShader: `attribute vec4 aDot; uniform float uY; varying vec2 vP; varying float vB;
    void main() { vP = position.xy; vB = aDot.w; gl_Position = projectionMatrix * modelViewMatrix * vec4(aDot.x + position.x * aDot.z, uY, aDot.y + position.y * aDot.z, 1.0); }`,
  fragmentShader: `varying vec2 vP; varying float vB; uniform float uInto; uniform vec3 uTint;
    void main() {
      float r = length(vP), aa = fwidth(r), ring = 1.0 - smoothstep(0.05, 0.05 + aa * 1.4, abs(r - 0.62)), mark;
      if (uInto > 0.5) { vec2 q = abs(vec2(vP.x + vP.y, vP.x - vP.y)) * 0.7071; mark = (1.0 - smoothstep(0.045, 0.045 + aa * 1.4, min(q.x, q.y))) * (1.0 - smoothstep(0.42, 0.46, r)); }
      else mark = 1.0 - smoothstep(0.17, 0.17 + aa * 1.4, r);
      gl_FragColor = vec4(uTint * ((ring + mark) * 0.8 + exp(-r * r * 3.5) * 0.1) * vB, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

/* E0 under the sheet: chevrons that flow, moved only by a uniform. */
const chevronMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uFlow: { value: 0 }, uLen: { value: 1 }, uDir: { value: 1 }, uSize: { value: 0.12 }, uY: { value: 0 }, uGain: { value: 0 } },
  vertexShader: `attribute vec2 aC; uniform float uFlow, uLen, uDir, uSize, uY; varying vec2 vP; varying float vF;
    void main() {
      float z = mod(aC.y + uFlow, uLen), t = z / uLen;
      vF = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.9, 1.0, t)); vP = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(aC.x + position.x * uSize, uY, z - uLen * 0.5 + position.y * uSize * uDir, 1.0);
    }`,
  fragmentShader: `varying vec2 vP; varying float vF; uniform float uGain;
    void main() {
      float d = abs(vP.y + abs(vP.x) * 0.85 - 0.2), aa = fwidth(d) * 1.4, a = (1.0 - smoothstep(0.1, 0.1 + aa, d)) * (1.0 - smoothstep(0.7, 0.9, abs(vP.x)));
      gl_FragColor = vec4(vec3(1.0, 0.72, 0.36) * a * vF * uGain, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

/* A ribbon batch whose fragment shader runs comet pulses along an arc-length attribute. */
function pulsedRibbons(cap) {
  const R = createRibbons(cap, { width: 3 }), arc = new THREE.BufferAttribute(new Float32Array(cap * 2), 1).setUsage(THREE.DynamicDrawUsage);
  R.mesh.geometry.setAttribute('arc', arc);
  const mat = R.mesh.material;
  Object.assign(mat.uniforms, { uPhase: { value: 0 }, uGap: { value: PULSE_GAP }, uDim: { value: 1 } });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('attribute vec3 prev;', 'attribute float arc; varying float vArc; attribute vec3 prev;').replace('vTint = tint;', 'vTint = tint; vArc = arc;');
    sh.fragmentShader = `varying vec4 vTint; varying float vSide, vArc; uniform float uPhase, uGap, uDim;
      void main() {
        float s = abs(vSide), u = fract(vArc / uGap - uPhase), head = pow(u, 22.0) * (1.0 - smoothstep(0.975, 1.0, u)), a = max(vTint.a, 0.0);
        vec3 c = vTint.rgb * a * exp(-s * s * 14.0) + (vTint.rgb * 1.2 + vec3(0.5, 0.48, 0.44)) * head * (1.0 - smoothstep(0.15, 1.0, s)) * 1.6 * sqrt(a);
        gl_FragColor = vec4(c * uDim, 1.0);
        #include <colorspace_fragment>
      }`;
  };
  return { ...R, arc, dispose() { R.dispose(); } };
}

export function createScene(E, lab) {
  const studio = createStudio(E, {
    bg: 0x05070c, fog: 0.018, envIntensity: 0.7, key: 300, keyColor: 0xfff0e0, keyPos: [-5.5, 15, 7], keyTarget: [0, 0.6, 0], keyAngle: 0.6, shadowSpan: 36,
    envLook: { power: 0.75 }, dome: { glow: 0x1b2e48, glowDir: [0.1, 0.12, -1], glowPow: 5 }, floor: { color: 0x0a0d12, roughness: 0.92, metalness: 0, repeat: 6 },
  });
  const { scene } = studio, M = E.mats, rig = new THREE.Group(); scene.add(rig);
  const shadow = o => { o.castShadow = true; o.receiveShadow = true; return o; };

  /* ---------- the potential, as a texture ---------- */
  const U = {
    tField: { value: null }, tRamp: { value: rampTexture() }, uGrid: { value: new THREE.Vector2(2, 2) }, uSpan: { value: new THREE.Vector2(10, 7) }, uRelief: { value: 0 }, uMap: { value: 1 }, uEquip: { value: 1 }, uPx: { value: 1 },
    tRefl: { value: null }, uMirror: { value: new THREE.Matrix4() }, uReflect: { value: 0 }, uRest: { value: 1 }, uCell: { value: 1 }, uWash: { value: new THREE.Color(0, 0, 0) }, uGrad: { value: 0 }, uGain: { value: 1 },
  };
  let fieldData = null, fieldTex = null;
  function uploadField() {
    const gw = lab.gw, gh = lab.gh, S = lab.V, H = lab.H3, half = THREE.DataUtils.toHalfFloat, k = lab.plane3().k, dx = 2 * (lab.w / (gw - 1)) * k, dy = 2 * (lab.h / (gh - 1)) * k;
    if (!fieldTex || fieldTex.image.width !== gw || fieldTex.image.height !== gh) {
      if (fieldTex) fieldTex.dispose();
      fieldData = new Uint16Array(gw * gh * 4);
      fieldTex = new THREE.DataTexture(fieldData, gw, gh, THREE.RGBAFormat, THREE.HalfFloatType);
      fieldTex.magFilter = fieldTex.minFilter = THREE.LinearFilter; fieldTex.wrapS = fieldTex.wrapT = THREE.ClampToEdgeWrapping;
      U.tField.value = fieldTex; U.uGrid.value.set(gw, gh);
    }
    const d = fieldData;
    for (let j = 0, o = 0, q = 0; j < gh; j++) for (let i = 0; i < gw; i++, o++, q += 4) {
      const l = i ? o - 1 : o, r = i < gw - 1 ? o + 1 : o, t = j ? o - gw : o, b = j < gh - 1 ? o + gw : o;
      d[q] = half(S[o]); d[q + 1] = half(H[o]); d[q + 2] = half(clamp((H[r] - H[l]) / dx, -64, 64)); d[q + 3] = half(clamp((H[b] - H[t]) / dy, -64, 64));
    }
    fieldTex.needsUpdate = true;
  }

  /* ---------- the bench ---------- */
  const glassMat = slabMaterial(M, U, studio.env), bench = new THREE.Group(); rig.add(bench);
  const trayMat = M.brass().clone(), tray = shadow(new THREE.Mesh(new THREE.BufferGeometry(), trayMat)), slab = new THREE.Mesh(new THREE.BufferGeometry(), glassMat), plinth = shadow(new THREE.Mesh(new THREE.BufferGeometry(), M.gunmetal()));
  slab.receiveShadow = true; trayMat.envMap = studio.env; trayMat.envMapIntensity = 2.4;
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.9); fill.position.set(9, 4, -7); scene.add(fill, fill.target);
  bench.add(tray, slab, plinth);

  /* ---------- the sheet ---------- */
  const sheet = new THREE.Mesh(new THREE.BufferGeometry(), sheetMaterial(U, studio.env));
  sheet.frustumCulled = false; sheet.renderOrder = 2; rig.add(sheet);
  function buildSheet(P) {
    const n = Math.max(110, Math.round(340 * E.tier.detail)), long = Math.max(P.hw, P.hh), g = new THREE.PlaneGeometry(1, 1, Math.round(n * P.hw / long), Math.round(n * P.hh / long));
    g.rotateX(-Math.PI / 2); sheet.geometry.dispose(); sheet.geometry = g;
  }

  /* ---------- light ---------- */
  const sphere = new THREE.SphereGeometry(1, 36, 26), orbGeo = new THREE.InstancedBufferGeometry().copy(sphere), orbA = new Float32Array(FIELD_Q_CAP * 4), signA = new Float32Array(FIELD_Q_CAP);
  orbGeo.setAttribute('aOrb', new THREE.InstancedBufferAttribute(orbA, 4).setUsage(THREE.DynamicDrawUsage));
  orbGeo.setAttribute('aSign', new THREE.InstancedBufferAttribute(signA, 1).setUsage(THREE.DynamicDrawUsage));
  orbGeo.instanceCount = 0;
  const orbMat = orbMaterial(), orbs = new THREE.Mesh(orbGeo, orbMat); orbs.frustumCulled = false; rig.add(orbs);

  const quad = new THREE.PlaneGeometry(2, 2), glowGeo = new THREE.InstancedBufferGeometry().copy(quad), glowA = new Float32Array(MAX_GLOW * 4), tintA = new Float32Array(MAX_GLOW * 4);
  glowGeo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(glowA, 4).setUsage(THREE.DynamicDrawUsage));
  glowGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tintA, 4).setUsage(THREE.DynamicDrawUsage));
  glowGeo.instanceCount = 0;
  const glowMat = glowMaterial(), glow = new THREE.Mesh(glowGeo, glowMat); glow.frustumCulled = false; glow.renderOrder = 6; rig.add(glow);
  let glowN = 0;
  const addGlow = (x, y, z, size, c, gain, core) => {
    if (glowN >= MAX_GLOW) return;
    const o = glowN++ * 4;
    glowA[o] = x; glowA[o + 1] = y; glowA[o + 2] = z; glowA[o + 3] = size;
    tintA[o] = c.r * gain; tintA[o + 1] = c.g * gain; tintA[o + 2] = c.b * gain; tintA[o + 3] = core;
  };

  /* ---------- field lines and comets ---------- */
  const lines = pulsedRibbons(LINE_POINTS), trails = createRibbons(TRAIL_POINTS, { width: 1.5 });
  lines.mesh.renderOrder = 3; trails.mesh.renderOrder = 4; rig.add(lines.mesh, trails.mesh);
  let linesLive = false;
  const eOut = [0, 0];
  function buildLines(P) {
    const F = lab.flines, Y0 = P.o[1] + 0.02, k = P.k, arcs = lines.arc.array;
    let total = 0, nv = 0;
    for (const L of F) total += L.length / 2;
    const stride = Math.max(2, Math.ceil(total / Math.max(1000, LINE_POINTS * E.tier.detail - F.length * 2)));
    lines.begin();
    F.forEach((L, li) => {
      const n = L.length / 2, m = (n >> 1) * 2;
      lab.E(L[m], L[m + 1], eOut);
      // Lines are traced from whichever sign leads, so the direction of travel is read back from the field.
      const forward = (L[m + 2] - L[m]) * eOut[0] + (L[m + 3] - L[m + 1]) * eOut[1] >= 0, seed = (li * 0.618034 % 1) * PULSE_GAP, ds = 3;
      for (let i = 0; ; i = Math.min(n - 1, i + stride)) {
        if (nv >= LINE_POINTS) break;
        const x = L[i * 2], y = L[i * 2 + 1], s = lab.height3(x, y), c = s > 0 ? AMBER : CYAN, q = Math.min(1, Math.abs(s) * 2.2);
        const fade = Math.min(1, Math.min(i, n - 1 - i) / 6), lit = 0.6;
        lines.point((x - P.cx) * k, Y0 + lab.lift3(x, y), (y - P.cy) * k, lit + (c.r * 1.3 - lit) * q, lit * 1.05 + (c.g * 1.3 - lit * 1.05) * q, lit * 1.15 + (c.b * 1.3 - lit * 1.15) * q, (0.34 + 0.34 * q) * fade);
        arcs[nv * 2] = arcs[nv * 2 + 1] = (forward ? i : n - 1 - i) * ds + seed; nv++;
        if (i === n - 1) break;
      }
      lines.strip();
    });
    lines.end();
    lines.arc.clearUpdateRanges(); lines.arc.addUpdateRange(0, nv * 2); lines.arc.needsUpdate = true;
    linesLive = lines.mesh.visible;
  }
  function syncTrails(view, P) {
    trails.setResolution(view.w * view.pr, view.h * view.pr); trails.mesh.material.uniforms.uWidth.value = 1.5 * view.pr;
    trails.begin();
    const n = lab.n;
    if (lab.p.trails && n) {
      const T = lab.trail, TR = FIELD_TRAIL, k = P.k, Y0 = P.o[1] + 0.03, per = Math.floor(TRAIL_POINTS * E.tier.detail / n), step = Math.max(1, Math.ceil(TR / Math.max(4, per - 1)));
      for (let i = 0; i < n; i++) {
        const tn = lab.tn[i]; if (tn < 2 || !Number.isFinite(lab.x[i]) || !Number.isFinite(lab.y[i])) continue;
        const o = i * TR * 2, h0 = lab.th[i], c = lab.qm[i] > 0 ? AMBER : CYAN, on = lab.pid[i] === lab.track, a0 = on ? 1 : 0.6, g = on ? 1.5 : 1.15;
        for (let q = (tn - 1) % step; q < tn; q += step) {
          const j = ((h0 - tn + q + TR) % TR) * 2, x = T[o + j], y = T[o + j + 1], f = (q + 1) / tn;
          trails.point((x - P.cx) * k, Y0 + lab.lift3(x, y), (y - P.cy) * k, c.r * g, c.g * g, c.b * g, a0 * f * f, (on ? 0.8 : 0.5) + (on ? 1.1 : 0.8) * f);
        }
        const x = lab.x[i], y = lab.y[i];
        trails.point((x - P.cx) * k, Y0 + lab.lift3(x, y), (y - P.cy) * k, c.r * g, c.g * g, c.b * g, a0, on ? 1.9 : 1.3);
        trails.strip();
      }
    }
    trails.end();
  }

  /* ---------- vectors: small arrows that lie along the slope, which is the field's own direction ---------- */
  const arrowProfile = [[0.26, 0], [0.26, 0.62], [1, 0.6], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y - 0.5)), arrowGeo = new THREE.LatheGeometry(arrowProfile, 6);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff }), arrows = new THREE.InstancedMesh(arrowGeo, arrowMat, MAX_ARROWS);
  arrows.frustumCulled = false; arrows.count = 0; rig.add(arrows);
  arrows.setColorAt(0, AMBER);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  function buildArrows(P) {
    const sp = 34, k = P.k, Y0 = P.o[1] + 0.04, ref = lab.K() / 1600 + Math.abs(lab.p.E0) || 1, e = eOut;
    let n = 0;
    for (let y = sp / 2; y < lab.h; y += sp) for (let x = sp / 2; x < lab.w; x += sp) {
      lab.E(x, y, e); const m = Math.hypot(e[0], e[1]); if (m < 1e-9 || n >= MAX_ARROWS) continue;
      const L = clamp(10 * Math.log1p(m / ref * 4), 2, 15), ux = e[0] / m, uy = e[1] / m, ax = x - ux * L * 0.5, ay = y - uy * L * 0.5, bx = x + ux * L, by = y + uy * L, f = L / 15;
      rodMatrix((ax - P.cx) * k, Y0 + lab.lift3(ax, ay), (ay - P.cy) * k, (bx - P.cx) * k, Y0 + lab.lift3(bx, by), (by - P.cy) * k, m4, (1.5 * L) * k * 0.13);
      arrows.setMatrixAt(n, m4); arrows.setColorAt(n, col.copy(AMBER).multiplyScalar(0.5 + 1.1 * f * f)); n++;
    }
    arrows.count = n; arrows.instanceMatrix.needsUpdate = true; if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
  }

  /* ---------- B and E0 on the glass ---------- */
  const dotGeo = new THREE.InstancedBufferGeometry().copy(quad), dotA = new Float32Array(MAX_DOTS * 4);
  dotGeo.setAttribute('aDot', new THREE.InstancedBufferAttribute(dotA, 4).setUsage(THREE.DynamicDrawUsage)); dotGeo.instanceCount = 0;
  const dotMat = dotMaterial(), dots = new THREE.Mesh(dotGeo, dotMat); dots.frustumCulled = false; dots.renderOrder = 1; rig.add(dots);
  dotMat.uniforms.uY.value = SLAB_TOP + 0.004;
  let dotB = NaN, dotGrad = NaN, dotW = 0, dotH = 0;
  const TINT_INTO = new THREE.Color(0x8fb2e6), TINT_OUT = new THREE.Color(0xe6c38a);
  function buildDots(P) {
    const B = lab.p.B;
    if (B === dotB && lab.p.gradB === dotGrad && lab.w === dotW && lab.h === dotH) return;
    dotB = B; dotGrad = lab.p.gradB; dotW = lab.w; dotH = lab.h;
    const sp = 48, k = P.k, Bmax = Math.abs(B) * (1 + lab.p.gradB) || 1;
    let n = 0;
    if (B !== 0) for (let y = sp / 2; y < lab.h; y += sp) {
      const f = Math.abs(lab.Bz(y)) / Bmax;
      for (let x = sp / 2; x < lab.w && n < MAX_DOTS; x += sp, n++) {
        const o = n * 4; dotA[o] = (x - P.cx) * k; dotA[o + 1] = (y - P.cy) * k; dotA[o + 2] = (5.5 + 5 * f) * k; dotA[o + 3] = (0.05 + 0.5 * f * f) * (0.55 + 0.45 * Math.min(1, Math.abs(B) / 1.5));
      }
    }
    dotGeo.instanceCount = n; dotGeo.attributes.aDot.needsUpdate = true;
    dotMat.uniforms.uInto.value = B > 0 ? 1 : 0; dotMat.uniforms.uTint.value.copy(B > 0 ? TINT_INTO : TINT_OUT);
    const w = Math.min(1, Math.abs(B) / 3) * 0.02;
    U.uWash.value.copy(B > 0 ? TINT_INTO : TINT_OUT).multiplyScalar(w); U.uGrad.value = lab.p.gradB;
  }
  const chevGeo = new THREE.InstancedBufferGeometry().copy(quad), chevA = new Float32Array(400 * 2);
  chevGeo.setAttribute('aC', new THREE.InstancedBufferAttribute(chevA, 2)); chevGeo.instanceCount = 0;
  const chevMat = chevronMaterial(), chevrons = new THREE.Mesh(chevGeo, chevMat); chevrons.frustumCulled = false; chevrons.renderOrder = 1; rig.add(chevrons);
  chevMat.uniforms.uY.value = SLAB_TOP + 0.006;
  let chevFlow = 0;

  /* ---------- plates: brushed bars derived from rows of charges ---------- */
  const barRod = rodGeometry(12), bars = [], plateMat = M.steel().clone(); plateMat.envMap = studio.env; plateMat.envMapIntensity = 1.3; plateMat.color.set(0xd6dbe2); plateMat.roughness = 0.95; plateMat.clearcoat = 0;
  const seamMat = sign => new THREE.MeshBasicMaterial({ color: (sign > 0 ? AMBER : CYAN).clone().multiplyScalar(2.2) });
  const seamPos = seamMat(1), seamNeg = seamMat(-1);
  function bar(i) {
    if (bars[i]) return bars[i];
    const body = shadow(new THREE.Mesh(new THREE.BufferGeometry(), plateMat)), seam = new THREE.Mesh(new THREE.BufferGeometry(), seamPos);
    const a = shadow(new THREE.Mesh(barRod, M.brass())), b = shadow(new THREE.Mesh(barRod, M.brass()));
    a.matrixAutoUpdate = b.matrixAutoUpdate = false;
    rig.add(body, seam, a, b);
    return (bars[i] = { body, seam, a, b, len: 0 });
  }
  function buildBars(P) {
    const R = lab.runs, k = P.k, t = 26 * k, H = lab.bar3;
    for (let i = 0; i < MAX_BARS; i++) {
      const run = R[i];
      if (!run) { if (bars[i]) for (const o of [bars[i].body, bars[i].seam, bars[i].a, bars[i].b]) o.visible = false; continue; }
      const b = bar(i), L = (Math.hypot(run.bx - run.ax, run.by - run.ay) + 30) * k, y = P.o[1] + lab.runLift3(run), mx = ((run.ax + run.bx) / 2 - P.cx) * k, mz = ((run.ay + run.by) / 2 - P.cy) * k, along = run.ax !== run.bx, c = along ? 1 : 0, s = along ? 0 : 1;
      if (Math.abs(b.len - L) > 1e-4) {
        b.len = L; b.body.geometry.dispose(); b.body.geometry = roundedBox(L, H, t, 0.03, 3);
        b.seam.geometry.dispose(); b.seam.geometry = roundedBox(L - 0.05, 0.012, 0.02, 0.005, 1);
      }
      b.body.position.set(mx, y, mz); b.seam.position.set(mx + (t / 2 + 0.003) * s, y + H / 2 - 0.016, mz + (t / 2 + 0.003) * c);
      b.body.rotation.y = b.seam.rotation.y = along ? 0 : Math.PI / 2;
      b.seam.material = run.sign > 0 ? seamPos : seamNeg;
      const dx = (L / 2 - 0.16) * c, dz = (L / 2 - 0.16) * s;
      rodMatrix(mx - dx, SLAB_TOP, mz - dz, mx - dx, y - H / 2 + 0.01, mz - dz, b.a.matrix, 0.03); rodMatrix(mx + dx, SLAB_TOP, mz + dz, mx + dx, y - H / 2 + 0.01, mz + dz, b.b.matrix, 0.03);
      b.a.matrixWorldNeedsUpdate = b.b.matrixWorldNeedsUpdate = true;
      for (const o of [b.body, b.seam, b.a, b.b]) o.visible = true;
    }
  }

  /* ---------- probe and beam gun ---------- */
  const probe = new THREE.Group(); rig.add(probe);
  const foot = shadow(new THREE.Mesh(turned([[0.09, 0], [0.09, 0.012], [0.062, 0.03], [0.022, 0.06], [0.014, 0.1]], 32, 6), M.brass()));
  const stalk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12), M.polished()));
  const head = new THREE.Group();
  const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.0085, 14, 48), M.brass())); ring.rotation.x = Math.PI / 2;
  const yoke = shadow(new THREE.Mesh(turned([[0.012, -0.09], [0.022, -0.075], [0.02, -0.03], [0.009, -0.01], [0, 0]], 16, 6), M.brass()));
  const spokeA = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.15, 8), M.polished())), spokeB = spokeA.clone(); spokeA.rotation.z = Math.PI / 2; spokeB.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2a541).multiplyScalar(3) }));
  head.add(ring, yoke, spokeA, spokeB, tip); probe.add(foot, stalk, head);
  const probeArrowMat = new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(1.5) }), probeArrow = new THREE.Mesh(arrowGeo, probeArrowMat); probeArrow.matrixAutoUpdate = false; rig.add(probeArrow);
  function syncProbe(P) {
    const Q = lab.probe, v = lab.probeVal;
    probe.visible = !!(Q && v); probeArrow.visible = false;
    if (!probe.visible) return;
    const k = P.k, X = (Q.x - P.cx) * k, Z = (Q.y - P.cy) * k, y = P.o[1] + lab.probeLift3();
    probe.position.set(X, SLAB_TOP, Z);
    stalk.position.y = (y - SLAB_TOP) / 2; stalk.scale.set(0.0065, y - SLAB_TOP, 0.0065);
    head.position.y = y - SLAB_TOP;
    if (v.E > 1e-9) {
      const L = clamp(14 * Math.log1p(v.E / (lab.K() / 1600 + 1) * 4), 8, 60), ux = v.ex / v.E, uy = v.ey / v.E;
      rodMatrix(X, y, Z, X + ux * L * k, y, Z + uy * L * k, probeArrow.matrix, 0.042);
      probeArrow.matrixWorldNeedsUpdate = true; probeArrow.visible = true;
    }
  }
  const gun = new THREE.Group(); rig.add(gun);
  const barrel = shadow(new THREE.Mesh(turned([[0, -0.2], [0.05, -0.2], [0.06, -0.17], [0.05, -0.08], [0.036, -0.02], [0.036, 0.1], [0.05, 0.13], [0.052, 0.16], [0.03, 0.17], [0.022, 0.15], [0, 0.15]], 28, 5), M.brass())); barrel.rotation.z = -Math.PI / 2;
  const gunStalk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12), M.steel())), gunFoot = shadow(new THREE.Mesh(turned([[0.1, 0], [0.1, 0.014], [0.05, 0.04], [0.02, 0.07]], 28, 5), M.brass()));
  gun.add(barrel, gunStalk, gunFoot);

  /* ---------- layout ---------- */
  let layoutW = 0, layoutH = 0, P = null;
  function layout() {
    if (lab.w === layoutW && lab.h === layoutH) return;
    layoutW = lab.w; layoutH = lab.h;
    P = lab.plane3();
    const m = 66 * P.k + 0.06, W = 2 * (P.hw + m), D = 2 * (P.hh + m), b = 0.06;
    for (const o of [tray, slab, plinth]) o.geometry.dispose();
    tray.geometry = roundedBox(W + 2 * b, SLAB_T, D + 2 * b, 0.05, 4); tray.position.y = SLAB_TOP - 0.007 - SLAB_T / 2;
    slab.geometry = roundedBox(W, SLAB_T * 0.7, D, 0.018, 3); slab.position.y = SLAB_TOP - SLAB_T * 0.35;
    plinth.geometry = roundedBox(W - 1.4, SLAB_TOP, D - 1.4, 0.04, 3); plinth.position.y = SLAB_TOP / 2 - 0.05;
    U.uSpan.value.set(2 * P.hw, 2 * P.hh); U.uRest.value = P.o[1]; U.uCell.value = 100 * P.k;
    sheet.position.set(0, P.o[1], 0); sheet.scale.set(2 * P.hw, 1, 2 * P.hh);
    buildSheet(P);
    // E0 chevrons: a loose lattice wrapped along the field.
    const cols = Math.max(4, Math.round(P.hw * 2 / 1.25)), rows = Math.max(3, Math.round(P.hh * 2 / 1.1)), L = 2 * P.hh;
    let n = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols && n < 400; i++, n++) { chevA[n * 2] = -P.hw + (i + 0.5 + (j % 2) * 0.5 - 0.25) * 2 * P.hw / cols; chevA[n * 2 + 1] = (j + 0.5) * L / rows; }
    chevGeo.instanceCount = n; chevGeo.attributes.aC.needsUpdate = true; chevMat.uniforms.uLen.value = L;
  }

  /* ---------- the mirror in the glass ---------- */
  const mirror = new THREE.PerspectiveCamera(), eye = new THREE.Vector3(), look = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), rot = new THREE.Matrix4();
  const clipBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  let rt = null;
  function setMirror(w, h, share) {
    if (rt) { rt.dispose(); rt = null; }
    U.uReflect.value = 0; U.tRefl.value = null;
    if (!(share > 0)) return;
    rt = new THREE.WebGLRenderTarget(Math.max(2, Math.round(w * share)), Math.max(2, Math.round(h * share)), { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    U.tRefl.value = rt.texture; U.uReflect.value = 1;
  }
  const hideInMirror = [bench, studio.floor.mesh, dots, chevrons, arrows], shownInMain = hideInMirror.map(() => true);

  /* ---------- per frame ---------- */
  let rev = -1, linesRev = -1, linesRelief = -1, linesDetail = -1, arrowRev = -1, arrowRelief = -1;
  function syncCharges(P) {
    const Q = lab.charges, n = Math.min(Q.length, FIELD_Q_CAP), k = P.k, Y0 = P.o[1];
    for (let i = 0; i < n; i++) {
      const c = Q[i], r = lab.orbR3(c, k), y = Y0 + lab.seat3(c, r), o = i * 4, x = (c.x - P.cx) * k, z = (c.y - P.cy) * k, stud = lab.runOf.has(c.id), base = c.q > 0 ? AMBER : CYAN;
      orbA[o] = x; orbA[o + 1] = y; orbA[o + 2] = z; orbA[o + 3] = r; signA[i] = c.q > 0 ? 1 : -1;
      addGlow(x, y, z, stud ? 0.14 : r * 5.5, base, stud ? 0.12 : 0.34, 0);
    }
    orbGeo.instanceCount = n; orbGeo.attributes.aOrb.needsUpdate = true; orbGeo.attributes.aSign.needsUpdate = true;
  }
  function syncBeads(P) {
    const n = lab.n, k = P.k, Y0 = P.o[1] + 0.035;
    for (let i = 0; i < n; i++) {
      const x = lab.x[i], y = lab.y[i]; if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const on = lab.pid[i] === lab.track;
      addGlow((x - P.cx) * k, Y0 + lab.lift3(x, y), (y - P.cy) * k, on ? 0.24 : 0.17, lab.qm[i] > 0 ? AMBER : CYAN, on ? 1.5 : 1.1, 1);
    }
  }
  function syncGun(P) {
    const on = lab.p.beam; gun.visible = on;
    if (!on) return;
    const k = P.k, x = (6 - P.cx) * k - 0.2, y = P.o[1] + lab.lift3(6, lab.h / 2) + 0.03, z = (lab.h / 2 - P.cy) * k;
    gun.position.set(x, 0, z); barrel.position.y = y;
    gunStalk.position.y = (y + SLAB_TOP) / 2; gunStalk.scale.set(0.012, y - SLAB_TOP, 0.012); gunFoot.position.y = SLAB_TOP;
    addGlow(x + 0.17, y, z, 0.2, lab.p.sign > 0 ? AMBER : CYAN, 0.8, 1);
  }

  return {
    scene, studio, exposure: 1, bloom: { strength: 0.2, radius: 0.55, threshold: 0.95 },
    sync(l, view) {
      if (lab.dirty) lab.rebuildGeometry();
      layout();
      const p = lab.p, relief = lab.reliefNow3();
      if (rev !== lab.geoRev) { rev = lab.geoRev; uploadField(); }
      U.uRelief.value = relief; U.uMap.value = lab.relief3; U.uEquip.value = p.equip && (lab.charges.length || p.E0 !== 0) ? 1 : 0; U.uPx.value = 0.5 * view.pr;

      if (linesRev !== rev || linesRelief !== relief || linesDetail !== E.tier.detail) { linesRev = rev; linesRelief = relief; linesDetail = E.tier.detail; buildLines(P); buildBars(P); }
      if (p.vectors && (arrowRev !== rev || arrowRelief !== relief)) { arrowRev = rev; arrowRelief = relief; buildArrows(P); }
      lines.mesh.visible = linesLive && p.lines; arrows.visible = p.vectors;
      lines.setResolution(view.w * view.pr, view.h * view.pr); lines.mesh.material.uniforms.uWidth.value = 3 * view.pr;
      lines.mesh.material.uniforms.uPhase.value = reduceMotion ? 0 : view.t * PULSE_SPEED / PULSE_GAP;

      buildDots(P);
      dots.visible = p.B !== 0;
      const E0 = p.E0;
      chevrons.visible = E0 !== 0;
      if (E0 !== 0) {
        if (!reduceMotion) chevFlow += view.dt * Math.sign(E0) * (0.16 + Math.abs(E0) / 150 * 0.5);
        chevMat.uniforms.uFlow.value = chevFlow; chevMat.uniforms.uDir.value = Math.sign(E0); chevMat.uniforms.uGain.value = 0.1 + 0.26 * Math.min(1, Math.abs(E0) / 150);
      }

      glowN = 0;
      syncCharges(P); syncBeads(P); syncGun(P);
      glowGeo.instanceCount = glowN; glowGeo.attributes.aGlow.needsUpdate = true; glowGeo.attributes.aTint.needsUpdate = true;
      glowMat.uniforms.uMin.value = 2.5 / view.px;
      syncTrails(view, P); syncProbe(P);
    },
    prepare(renderer, camera) {
      if (!rt) return;
      camera.getWorldPosition(eye);
      if (eye.y <= SLAB_TOP + 0.001) return;
      rot.extractRotation(camera.matrixWorld);
      look.set(0, 0, -1).applyMatrix4(rot).add(eye);
      mirror.position.set(eye.x, 2 * SLAB_TOP - eye.y, eye.z);
      mirror.up.set(0, 1, 0).applyMatrix4(rot).reflect(UP);
      mirror.lookAt(look.x, 2 * SLAB_TOP - look.y, look.z);
      mirror.near = camera.near; mirror.far = camera.far; mirror.updateMatrixWorld();
      mirror.projectionMatrix.copy(camera.projectionMatrix);
      U.uMirror.value.copy(clipBias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
      const auto = renderer.shadowMap.autoUpdate, fog = scene.fog;
      for (let i = 0; i < hideInMirror.length; i++) { shownInMain[i] = hideInMirror[i].visible; hideInMirror[i].visible = false; }
      scene.fog = null; renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirror); renderer.setRenderTarget(null);
      for (let i = 0; i < hideInMirror.length; i++) hideInMirror[i].visible = shownInMain[i];
      scene.fog = fog; renderer.shadowMap.autoUpdate = auto;
    },
    onTier(tier, w, h) {
      const direct = !tier.bloom && !tier.grade && !tier.msaa;
      U.uGain.value = direct ? 0.4 : 1; lines.mesh.material.uniforms.uDim.value = direct ? 0.55 : 1; glowMat.uniforms.uDim.value = direct ? 0.6 : 1; trayMat.roughness = tier.msaa ? 0.3 : 0.62;
      studio.floor.setResolution(w, h, 0);
      setMirror(w, h, tier.reflect);
      if (P) buildSheet(P);
    },
    dispose() {
      studio.dispose(); lines.dispose(); trails.dispose(); if (rt) rt.dispose(); if (fieldTex) fieldTex.dispose();
      U.tRamp.value.dispose();
      for (const o of [tray, slab, plinth, sheet]) o.geometry.dispose();
      for (const g of [sphere, orbGeo, quad, glowGeo, arrowGeo, dotGeo, chevGeo, barRod]) g.dispose();
      for (const b of bars) { b.body.geometry.dispose(); b.seam.geometry.dispose(); }
      for (const m of [glassMat, trayMat, sheet.material, orbMat, glowMat, arrowMat, dotMat, chevMat, seamPos, seamNeg, plateMat, probeArrowMat, tip.material]) m.dispose();
      for (const o of [foot, stalk, ring, yoke, spokeA, tip, barrel, gunStalk, gunFoot]) o.geometry.dispose();
    },
  };
}
