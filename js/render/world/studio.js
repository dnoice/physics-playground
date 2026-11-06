/*
✒ Metadata
    - Title: World Studio (digiSpace Edition - v2.1)
    - File Name: studio.js
    - Relative Path: js/render/world/studio.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the shared photo studio every apparatus stands in.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The room around an apparatus: a dark sweep that fades into a graded
    backdrop, softboxes that give metal and glass something to reflect, a key
    light with soft shadows, and a polished floor with a real, blurred planar
    reflection. Scenes ask for a studio and add their apparatus to it.

✒ Key Features:
    - Image-based light from softboxes on every side, so an apparatus reads
      from any angle, rendered once through PMREM and tinted per scene with
      no downloaded HDRI.
    - Spot key with soft shadows; rim light comes from coloured softbox
      strips, so it edges the apparatus without a streak across the floor.
    - Polished floor: a mirrored camera pass into a mipmapped target, blurred
      by a disc of taps that grows with the roughness map, fresnel weighted.
    - Backdrop dome with a glow behind the subject; floor and fog dissolve
      into it, so the room has no visible edge.
    - Every expensive part reads the active graphics tier.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';

/* ---------- image-based light: a room of softboxes, baked once ---------- */
function softbox(room, x, y, z, w, h, color, power) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.lookAt(0, 1, 0);
  room.add(m);
}
export function bakeEnvironment(renderer, { top = 0xfff4e6, left = 0x8fc8ff, right = 0xffb46b, wall = 0x0a0e15, power = 1 } = {}) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(wall);
  softbox(room, 0, 16, 0, 22, 14, top, 2.6 * power);
  softbox(room, -18, 6, 4, 3, 16, left, 3.4 * power);
  softbox(room, 18, 5, -2, 2.4, 14, right, 3 * power);
  softbox(room, 0, 4, 20, 26, 2, 0xdfe8f4, 0.9 * power);
  softbox(room, 0, 11, -20, 24, 9, 0xcfdcec, 1.5 * power);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(room, 0.018, 0.1, 80);
  pm.dispose();
  room.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return rt.texture;
}

/* ---------- backdrop ---------- */
function createDome(o) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true,
    uniforms: { uLow: { value: new THREE.Color(o.low) }, uHigh: { value: new THREE.Color(o.high) }, uGlow: { value: new THREE.Color(o.glow) }, uDir: { value: new THREE.Vector3(...o.glowDir).normalize() }, uPow: { value: o.glowPow } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }',
    fragmentShader: `varying vec3 vD; uniform vec3 uLow, uHigh, uGlow, uDir; uniform float uPow;
      void main(){ vec3 d = normalize(vD); float h = smoothstep(-0.05, 0.55, d.y);
        vec3 c = mix(uLow, uHigh, h) + uGlow * pow(max(dot(d, uDir), 0.0), uPow) * smoothstep(-0.01, 0.16, d.y);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

/* ---------- polished floor with a planar reflection ---------- */
const clipBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function createFloor(E, o, env) {
  const smudge = E.mats.map('smudge', 1024, { repeat: o.repeat || 5 }), U = {
    tRefl: { value: null }, uMirror: { value: new THREE.Matrix4() }, uReflect: { value: 0 }, uBlur: { value: o.blur ?? 0.012 }, uF0: { value: o.f0 ?? 0.06 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0x171c24, roughness: o.roughness ?? 0.42, metalness: o.metalness ?? 0.25, roughnessMap: smudge, envMap: env, envMapIntensity: o.env ?? 0.2 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWorld; uniform sampler2D tRefl; uniform mat4 uMirror; uniform float uReflect, uBlur, uF0;`)
      .replace('#include <opaque_fragment>', `
      if (uReflect > 0.0) {
        vec4 rc = uMirror * vec4(vWorld, 1.0); vec2 uv = rc.xy / rc.w;
        float rough = roughnessFactor, k = uBlur * (0.35 + 2.2 * rough), rim = 1.0 - saturate(dot(normalize(vViewPosition), normal));
        uv += (normal.xz) * 0.015;
        vec3 sum = vec3(0.0);
        for (int i = 0; i < 12; i++) { float a = float(i) * 2.399963, r = sqrt((float(i) + 0.5) / 12.0); sum += textureLod(tRefl, uv + vec2(cos(a), sin(a)) * r * k, 1.0 + rough * 2.5).rgb; }
        float F = uF0 + (1.0 - uF0) * pow(rim, 3.5);
        outgoingLight += sum / 12.0 * F * uReflect;
      }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'world-floor';
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(150, 96), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;

  const mirror = new THREE.PerspectiveCamera();
  const eye = new THREE.Vector3(), look = new THREE.Vector3(), N = new THREE.Vector3(0, 1, 0), rot = new THREE.Matrix4();
  let rt = null;
  const setResolution = (w, h, share) => {
    if (rt) { rt.dispose(); rt = null; }
    U.uReflect.value = 0; U.tRefl.value = null;
    if (!(share > 0)) return;
    rt = new THREE.WebGLRenderTarget(Math.max(2, Math.round(w * share)), Math.max(2, Math.round(h * share)), { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    U.tRefl.value = rt.texture; U.uReflect.value = o.reflect ?? 0.9;
  };
  /* The Reflector construction: a camera mirrored in y = 0 sharing the main projection. */
  const pass = (renderer, scene, camera) => {
    if (!rt) return;
    camera.getWorldPosition(eye);
    if (eye.y <= 0.001) return;
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(eye);
    mirror.position.set(eye.x, -eye.y, eye.z);
    mirror.up.set(0, 1, 0).applyMatrix4(rot).reflect(N);
    mirror.lookAt(look.x, -look.y, look.z);
    mirror.near = camera.near; mirror.far = camera.far;
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    U.uMirror.value.copy(clipBias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    const shadows = renderer.shadowMap.autoUpdate, fog = scene.fog;
    mesh.visible = false; scene.fog = null; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirror); renderer.setRenderTarget(null);
    mesh.visible = true; scene.fog = fog; renderer.shadowMap.autoUpdate = shadows;
  };
  return { mesh, mat, setResolution, pass, dispose() { if (rt) rt.dispose(); mesh.geometry.dispose(); mat.dispose(); } };
}

/* ---------- the studio ---------- */
export function createStudio(E, o = {}) {
  const O = {
    bg: 0x05070b, fog: 0.032, envIntensity: 1, key: 620, keyColor: 0xfff0dd, keyPos: [-5.5, 15, 8.5], keyTarget: [0, 1.5, 0], keyAngle: 0.56, keyPenumbra: 0.85, shadowSpan: 34, ...o,
    floor: { ...o.floor }, envLook: { ...o.envLook },
  };
  O.dome = { low: O.bg, high: 0x020305, glow: 0x162436, glowDir: [0, 0.14, -1], glowPow: 7, ...o.dome };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(O.bg);
  scene.fog = new THREE.FogExp2(O.bg, O.fog);
  const env = bakeEnvironment(E.renderer, O.envLook);
  scene.environment = env; scene.environmentIntensity = O.envIntensity;
  const dome = createDome(O.dome);

  const key = new THREE.SpotLight(O.keyColor, O.key, 0, O.keyAngle, O.keyPenumbra, 2);
  key.position.set(...O.keyPos); key.target.position.set(...O.keyTarget);
  key.shadow.camera.near = 2; key.shadow.camera.far = O.shadowSpan; key.shadow.bias = -0.00025; key.shadow.normalBias = 0.018; key.shadow.radius = 5;
  const floor = O.floor === false ? null : createFloor(E, O.floor, env);
  scene.add(dome, key, key.target);
  if (floor) scene.add(floor.mesh);

  const applyTier = (tier, w, h) => {
    key.castShadow = tier.shadow > 0;
    if (tier.shadow > 0 && key.shadow.mapSize.x !== tier.shadow) {
      key.shadow.mapSize.set(tier.shadow, tier.shadow);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    }
    if (floor) floor.setResolution(w, h, tier.reflect);
  };
  return {
    scene, key, floor, dome, env, applyTier,
    prepare(renderer, camera) { if (floor) floor.pass(renderer, scene, camera); },
    dispose() {
      if (floor) floor.dispose();
      env.dispose(); dome.geometry.dispose(); dome.material.dispose(); key.dispose();
    },
  };
}
