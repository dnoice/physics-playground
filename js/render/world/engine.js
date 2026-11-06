/*
✒ Metadata
    - Title: World Engine (digiSpace Edition - v2.1)
    - File Name: engine.js
    - Relative Path: js/render/world/engine.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: one renderer and post stack shared by every lab.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The renderer behind the 3D mode. One WebGL context, one post-processing
    chain and one set of materials are shared by the seven lab scenes, which
    are built the first time their lab is shown and then kept. It renders off
    screen; the shell composites the result into the stage canvas, so video
    capture, pointer input and overlays work in both modes.

✒ Key Features:
    - HDR scene target with MSAA, bloom, ACES tone mapping and a film grade.
    - Graphics tiers applied live: resolution, MSAA, shadows, reflections,
      bloom and grade, with scenes told so they can thin their own meshes.
    - Scene modules load on demand; a failed module is reported, not fatal.
    - Reports a lost WebGL context and resumes when it is restored.

✒ Other Important Information:
    - Dependencies: three@0.187.0 (core, EffectComposer, RenderPass,
      ShaderPass, UnrealBloomPass, OutputPass) from jsDelivr via the import
      map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createMaterials } from './materials.js';

/* The last pass, in display space: lens vignette and a little fine grain,
   which also dithers the dark gradients that would otherwise band. */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.42 }, uGrain: { value: 0.022 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain;
    float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - 0.5;
      c *= 1.0 - uVignette * smoothstep(0.32, 0.92, length(d) * 1.25);
      float n = hash(gl_FragCoord.xy + fract(uTime) * 311.0) - 0.5;
      c += n * uGrain * (0.45 + 0.55 * (1.0 - dot(c, vec3(0.3, 0.6, 0.1))));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const LOADERS = {
  gravity: () => import('./scenes/gravity.js'), collisions: () => import('./scenes/collisions.js'), fluid: () => import('./scenes/fluid.js'),
  waves: () => import('./scenes/waves.js'), chaos: () => import('./scenes/chaos.js'), cloth: () => import('./scenes/cloth.js'), fields: () => import('./scenes/fields.js'),
};

export function createEngine(tier) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;

  const E = { renderer, tier, mats: createMaterials(renderer), canvas: renderer.domElement, lost: false, time: 0 };
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500), portraitCam = new THREE.PerspectiveCamera(22, 1, 0.05, 500);
  const factories = new Map(), scenes = new Map();
  let composer = null, bloom = null, grade = null, render0 = null, size = { w: 0, h: 0, dpr: 0, pr: 0 };
  let onLost = null, onRestored = null;

  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); E.lost = true; if (onLost) onLost(); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { E.lost = false; size.w = 0; if (onRestored) onRestored(); });

  function buildPost(w, h, pr) {
    if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer.dispose(); composer = null; bloom = grade = render0 = null; }
    const t = E.tier;
    if (!t.bloom && !t.grade && !t.msaa) return;
    const target = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: t.msaa });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    render0 = new RenderPass(new THREE.Scene(), camera);
    composer.addPass(render0);
    if (t.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(w * pr, h * pr), 0.35, 0.6, 0.9); composer.addPass(bloom); }
    composer.addPass(new OutputPass());
    if (t.grade) { grade = new ShaderPass(GRADE); composer.addPass(grade); }
  }
  function resize(w, h, dpr) {
    const pr = Math.min(dpr, E.tier.scale);
    if (w === size.w && h === size.h && pr === size.pr) return;
    size = { w, h, dpr, pr };
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    buildPost(w, h, pr);
    for (const s of scenes.values()) applyTier(s);
  }
  const applyTier = s => {
    if (s.studio) s.studio.applyTier(E.tier, size.w * size.pr, size.h * size.pr);
    if (s.onTier) s.onTier(E.tier, size.w * size.pr, size.h * size.pr);
  };

  /* Shoot the corner of the default framebuffer and copy it out; the main pass then draws over it. */
  function shootPortrait(s, lab) {
    const c = E.portraitTo, aim = s.portrait(lab), S = Math.min(144, size.h);
    E.portraitTo = null;
    if (!aim) return;
    portraitCam.near = aim.near; portraitCam.far = aim.far; portraitCam.position.set(...aim.eye); portraitCam.up.set(0, 1, 0);
    portraitCam.lookAt(...aim.at); portraitCam.updateProjectionMatrix(); portraitCam.updateMatrixWorld();
    renderer.setRenderTarget(null); renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S); renderer.setScissorTest(true);
    renderer.toneMappingExposure = s.exposure ?? 1;
    renderer.render(aim.scene || s.scene, portraitCam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, size.w, size.h);
    const px = S * size.pr;
    c.getContext('2d').drawImage(E.canvas, 0, E.canvas.height - px, px, px, 0, 0, c.width, c.height);
  }
  function sceneFor(lab) {
    let s = scenes.get(lab.id);
    if (s) return s;
    const f = factories.get(lab.id);
    if (!f) return null;
    s = f(E, lab);
    scenes.set(lab.id, s);
    applyTier(s);
    return s;
  }

  return Object.assign(E, {
    /* Load a lab's scene module. Resolves true when the lab can render in 3D. */
    prepare(id) {
      if (factories.has(id)) return Promise.resolve(true);
      const load = LOADERS[id];
      if (!load) return Promise.resolve(false);
      return load().then(m => { factories.set(id, m.createScene); return true; });
    },
    ready: id => factories.has(id),
    canPortrait(lab) { const s = scenes.get(lab.id); return !!(s && s.portrait); },
    onContext(lost, restored) { onLost = lost; onRestored = restored; },
    setTier(t) {
      E.tier = t;
      const w = size.w, h = size.h;
      size.w = 0;
      if (w) resize(w, h, size.dpr);
    },
    /* Draw the lab. V is its camera (eye, right, up, forward, fovDeg). Returns false when it could not. */
    render(lab, V, w, h, dpr, dt) {
      if (E.lost) return false;
      resize(w, h, dpr);
      const s = sceneFor(lab);
      if (!s) return false;
      E.time += dt;
      camera.fov = V.fovDeg; camera.aspect = w / Math.max(1, h); camera.near = V.near ?? 0.05; camera.far = V.far ?? 500;
      camera.position.set(V.eye[0], V.eye[1], V.eye[2]); camera.up.set(V.u[0], V.u[1], V.u[2]);
      camera.lookAt(V.eye[0] + V.f[0], V.eye[1] + V.f[1], V.eye[2] + V.f[2]);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      s.sync(lab, { t: E.time, dt, w, h, pr: size.pr, camera, px: h / (2 * Math.tan(V.fovDeg * Math.PI / 360)) });
      if (E.portraitTo && s.portrait) shootPortrait(s, lab);
      if (s.prepare) s.prepare(renderer, camera);
      if (s.studio) s.studio.prepare(renderer, camera);
      renderer.toneMappingExposure = s.exposure ?? 1;
      if (composer) {
        render0.scene = s.scene;
        if (bloom) { const b = s.bloom || {}; bloom.strength = b.strength ?? 0.35; bloom.radius = b.radius ?? 0.6; bloom.threshold = b.threshold ?? 0.9; }
        if (grade) grade.uniforms.uTime.value = E.time;
        composer.render(dt);
      } else renderer.render(s.scene, camera);
      return true;
    },
    info() { const i = renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0 }; },
    dispose() { for (const s of scenes.values()) if (s.dispose) s.dispose(); scenes.clear(); E.mats.dispose(); if (composer) composer.dispose(); renderer.dispose(); },
  });
}
