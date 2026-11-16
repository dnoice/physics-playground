/*
✒ Metadata
    - Title: World Studio (digiSpace Edition - v2.18)
    - File Name: studio.js
    - Relative Path: js/render/world/studio.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for graphics settings of one's own: shadows switched off
      free their map, the floor's mirror pass gives the contact pools and the
      haze back as it found them, and a pool fitted later follows the budget,
      so contact shadows switched off stay off.
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call to polish every world: the backdrop's glow follows the
      camera; a shadowless fill follows it too, light-linked away from the
      floor, with a warm bounce; contact shadows on every tier; a polished
      concrete floor whose key glint is kept faint; a haze beam on High and
      Ultra; and the environment resolution and shadow penumbra from the tier.
      A rebaked environment frees its render target with its texture, where
      only the texture had been freed.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the shared photo studio every apparatus stands in.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The room around an apparatus: a dark sweep that fades into a graded
    backdrop, softboxes that give metal and glass something to reflect, a key
    light with soft shadows, and a polished floor with a real, blurred planar
    reflection. Scenes ask for a studio and add their apparatus to it.

✒ Key Features:
    - Image-based light from softboxes on every side, rendered once through
      PMREM at the tier's resolution and tinted per scene, with no downloaded
      HDRI.
    - Spot key with soft shadows, as soft on every tier; rim light comes from
      coloured softbox strips, so it edges the apparatus without a streak
      across the floor.
    - A backdrop glow and a soft fill that follow the camera, so any side of
      an apparatus reads; the fill is light-linked away from the floor, which
      keeps the key's shadows, and a warm bounce lights undersides.
    - Polished concrete floor: a mirrored camera pass into a mipmapped target,
      blurred by a disc of taps that grows with the roughness map, fresnel
      weighted, with only a faint glint from the key.
    - Contact shadows under every apparatus on every tier, fitted to it or
      given by the scene; a haze beam from the key on High and Ultra.
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
export function bakeEnvironment(renderer, { top = 0xfff4e6, left = 0x8fc8ff, right = 0xffb46b, wall = 0x0a0e15, power = 1 } = {}, size = 256) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(wall);
  softbox(room, 0, 16, 0, 22, 14, top, 2.6 * power);
  softbox(room, -18, 6, 4, 3, 16, left, 3.4 * power);
  softbox(room, 18, 5, -2, 2.4, 14, right, 3 * power);
  softbox(room, 0, 4, 20, 26, 2, 0xdfe8f4, 0.9 * power);
  softbox(room, 0, 11, -20, 24, 9, 0xcfdcec, 1.5 * power);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(room, 0.018, 0.1, 80, { size });
  pm.dispose();
  room.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  /* A render target's texture is freed only with its target, so the texture carries the way to free both. */
  rt.texture.userData.release = () => rt.dispose();
  rt.texture.userData.size = rt.width;
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
  /* The glow is a light on the backdrop behind the subject. glowDir places it for the home view, from +z; turned by the
     camera's heading about the subject, it stays behind the apparatus from wherever it is seen, so a silhouette always
     has something to stand against, as a photographer moves the background light with the camera. */
  const home = new THREE.Vector3(...o.glowDir).normalize();
  m.userData.follow = (eye, focus) => {
    if (o.follow === false) return;
    const yaw = Math.atan2(eye.x - focus.x, eye.z - focus.z), c = Math.cos(yaw), s = Math.sin(yaw);
    mat.uniforms.uDir.value.set(home.x * c + home.z * s, home.y, -home.x * s + home.z * c);
  };
  return m;
}

/* ---------- contact shadows ---------- */
/* The soft, dark pool under anything that stands on the floor: what the big top softbox and the room leave in shadow,
   whatever the key does. A rounded rectangle drawn analytically, so it fits any footprint; fogged like the floor. */
function createContact() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uHalf: { value: new THREE.Vector2(1, 1) }, uSoft: { value: 1 }, uRound: { value: 0.2 }, uOpacity: { value: 0.5 } }]),
    vertexShader: `varying vec2 vP;
      #include <fog_pars_vertex>
      void main(){ vP = position.xy; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vP; uniform vec2 uHalf; uniform float uSoft, uRound, uOpacity;
      #include <fog_pars_fragment>
      void main(){
        vec2 q = abs(vP) - uHalf + uRound; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRound;
        float a = 1.0 - smoothstep(-uSoft * 0.5, uSoft, d);
        gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * a * a);
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.uHalf.value = new THREE.Vector2(1, 1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.004; mesh.renderOrder = -1; mesh.frustumCulled = false;
  /* A footprint: its centre (x, z), its width w along x and depth d along z, how far its edge fades (soft), and opacity. */
  mesh.userData.fit = ({ x = 0, z = 0, w = 1, d = 1, soft = null, opacity = 0.5 }) => {
    const sf = soft ?? Math.min(2.2, 0.28 * Math.min(w, d) + 0.35);
    mesh.position.x = x; mesh.position.z = z;
    mesh.scale.set(w + sf * 2.2, d + sf * 2.2, 1);
    mat.uniforms.uHalf.value.set(w / 2 / mesh.scale.x, d / 2 / mesh.scale.y);
    mat.uniforms.uSoft.value = sf / Math.max(mesh.scale.x, mesh.scale.y);
    mat.uniforms.uRound.value = Math.min(w, d) * 0.12 / Math.max(mesh.scale.x, mesh.scale.y);
    mat.uniforms.uOpacity.value = opacity;
  };
  return mesh;
}

/* ---------- haze ---------- */
/* The key's beam through the studio air: an open cone from the lamp to the floor, brightest along the lines of sight
   that cross most of it, fading with distance from the lamp and into the floor. Added light, never drawn into depth. */
function createHaze(O) {
  const from = new THREE.Vector3(...O.keyPos), to = new THREE.Vector3(...O.keyTarget), dir = to.clone().sub(from).normalize();
  // Down to the floor along the beam, a little past the target.
  const len = Math.min(60, from.y / Math.max(0.2, -dir.y)) * 1.02, r1 = Math.tan(O.keyAngle) * len * 0.92;
  const geo = new THREE.CylinderGeometry(0.18, r1, len, 48, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uColor: { value: new THREE.Color(O.keyColor) }, uStrength: { value: O.haze ?? 0.05 }, uLen: { value: len } },
    vertexShader: `varying vec3 vN, vV; varying float vS, vY;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vS = -position.y;
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN, vV; varying float vS, vY; uniform vec3 uColor; uniform float uStrength, uLen;
      void main(){
        float facing = abs(dot(normalize(vN), normalize(vV))), t = vS / uLen;
        float a = pow(facing, 2.5) * smoothstep(0.0, 0.08, t) * (1.0 - t * 0.7) * smoothstep(0.0, 1.6, vY);
        gl_FragColor = vec4(uColor * a * uStrength, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  mesh.renderOrder = 6; mesh.frustumCulled = false;
  return mesh;
}

/* ---------- polished floor with a planar reflection ---------- */
const clipBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function createFloor(E, o, env) {
  const smudge = E.mats.map('smudge', 1024, { repeat: o.repeat || 5 }), concrete = E.mats.map('concrete', 1024, { srgb: true, repeat: o.repeat || 5 }), U = {
    tRefl: { value: null }, uMirror: { value: new THREE.Matrix4() }, uReflect: { value: 0 }, uBlur: { value: o.blur ?? 0.012 }, uF0: { value: o.f0 ?? 0.06 },
    uGlint: { value: o.glint ?? 0.08 }, uUnlit: { value: new THREE.Color(0, 0, 0) },
  };
  // The concrete's mean is about 0.73 in linear light, so the colour is lifted to keep the floor as light as it was.
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color ?? 0x171c24).multiplyScalar(1.37), map: concrete, roughness: o.roughness ?? 0.42, metalness: o.metalness ?? 0.25, roughnessMap: smudge, envMap: env, envMapIntensity: o.env ?? 0.2 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWorld; uniform sampler2D tRefl; uniform mat4 uMirror; uniform float uReflect, uBlur, uF0, uGlint; uniform vec3 uUnlit;`)
      /* The studio's lamps are softboxes: their reflection in the floor is the environment's and the mirror pass's broad
         shapes, so the hard glint a point light would leave, blown out by the bloom from many angles, is kept faint. */
      /* Light linking: the camera's fill models the apparatus, not the floor, which would lose the key's shadows under
         it. The floor faces straight up, so the fill's share of its diffuse light is exact (uUnlit, set each frame). */
      .replace('#include <aomap_fragment>', 'reflectedLight.directSpecular *= uGlint;\nreflectedLight.directDiffuse = max(reflectedLight.directDiffuse - uUnlit * BRDF_Lambert(diffuseColor.rgb), 0.0);\n#include <aomap_fragment>')
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
    // Each comes back as it was: a contact pool or the haze a budget has switched off stays off.
    for (const h of hide) { h.userData.was = h.visible; h.visible = false; }
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirror); renderer.setRenderTarget(null);
    for (const h of hide) h.visible = h.userData.was;
    mesh.visible = true; scene.fog = fog; renderer.shadowMap.autoUpdate = shadows;
  };
  // The studio's own floor-level and air effects stay out of the mirror.
  const hide = [];
  return { mesh, mat, hide, unlit: U.uUnlit.value, setResolution, pass, dispose() { if (rt) rt.dispose(); mesh.geometry.dispose(); mat.dispose(); } };
}

/* ---------- the studio ---------- */
/* Options beyond the room's colours: focus, the point the backdrop glow and the fill are aimed past (the key's target);
   fill and bounce, their strength as a share of the key's light at its target; haze, the beam's strength (false for
   none); contact, false for no contact shadow, or footprints for it (see ground()), else one fitted to the apparatus. */
export function createStudio(E, o = {}) {
  const O = {
    bg: 0x05070b, fog: 0.032, envIntensity: 1, key: 620, keyColor: 0xfff0dd, keyPos: [-5.5, 15, 8.5], keyTarget: [0, 1.5, 0], keyAngle: 0.56, keyPenumbra: 0.85, shadowSpan: 34,
    fill: 0.16, fillColor: 0xdbe5f2, bounce: 0.14, bounceColor: 0x8c6a4c, ...o,
    floor: { ...o.floor }, envLook: { ...o.envLook },
  };
  O.dome = { low: O.bg, high: 0x020305, glow: 0x162436, glowDir: [0, 0.14, -1], glowPow: 7, ...o.dome };
  const focus = new THREE.Vector3(...(O.focus || O.keyTarget));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(O.bg);
  scene.fog = new THREE.FogExp2(O.bg, O.fog);
  let envSize = Math.max(256, E.tier.env || 256), env = bakeEnvironment(E.renderer, O.envLook, envSize);
  scene.environment = env; scene.environmentIntensity = O.envIntensity;
  const dome = createDome(O.dome);

  const key = new THREE.SpotLight(O.keyColor, O.key, 0, O.keyAngle, O.keyPenumbra, 2);
  key.position.set(...O.keyPos); key.target.position.set(...O.keyTarget);
  key.shadow.camera.near = 2; key.shadow.camera.far = O.shadowSpan; key.shadow.bias = -0.00025; key.shadow.normalBias = 0.018; key.shadow.radius = 5;
  // The key's light where it lands, the measure for the fill and the bounce.
  const keyLux = O.key / key.position.distanceToSquared(key.target.position);
  /* The fill: a soft, shadowless light from above the camera and to its right, so whichever side of an apparatus faces
     the camera is modelled, the back as well as the front. Kept off the camera's line, its glint on the floor falls
     out of view. The bounce: warm light from the floor under the key, on the undersides the key and the softboxes miss.
     Both are always in the scene, at no strength on tiers without them, so a change of tier recompiles nothing. */
  const fill = new THREE.DirectionalLight(O.fillColor, 0), bounce = new THREE.HemisphereLight(0x000000, O.bounceColor, 0);
  fill.target.position.copy(focus);
  const floor = O.floor === false ? null : createFloor(E, O.floor, env);
  scene.add(dome, key, key.target, fill, fill.target, bounce);
  if (floor) scene.add(floor.mesh);
  const haze = O.haze === false ? null : createHaze(O);
  if (haze) { scene.add(haze); if (floor) floor.hide.push(haze); }

  /* Contact shadows: one pool per footprint. Without footprints from the scene, one is fitted on the first frame to
     everything that casts a shadow and is not the studio's own. */
  const contacts = [], own = new Set([dome, haze, floor && floor.mesh]);
  let fitted = O.contact === false || Array.isArray(O.contact), contactOn = E.tier.contact !== false;
  // userData.on marks a pool in use; it shows while the budget has contact shadows on.
  const ground = list => {
    while (contacts.length < list.length) { const c = createContact(); contacts.push(c); own.add(c); scene.add(c); if (floor) floor.hide.push(c); }
    contacts.forEach((c, i) => { c.userData.on = i < list.length; c.visible = c.userData.on && contactOn; if (c.userData.on) c.userData.fit(list[i]); });
    fitted = true;
  };
  if (Array.isArray(O.contact)) ground(O.contact);
  const fit = () => {
    scene.updateMatrixWorld();
    const box = new THREE.Box3(), b = new THREE.Box3();
    scene.traverse(x => {
      if (!x.isMesh || x.isInstancedMesh || !x.castShadow || !x.visible || own.has(x)) return;
      if (!x.geometry.boundingBox) x.geometry.computeBoundingBox();
      box.union(b.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld));
    });
    if (box.isEmpty()) return;
    // Darkest where the apparatus stands on the floor, fainter the higher its lowest part hangs.
    ground([{ x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, w: box.max.x - box.min.x, d: box.max.z - box.min.z, opacity: 0.5 * Math.max(0.35, 1 - Math.max(0, box.min.y) * 0.3) }]);
  };

  let fillOn = false;
  const applyTier = (tier, w, h) => {
    key.castShadow = tier.shadow > 0;
    if (tier.shadow > 0 && key.shadow.mapSize.x !== tier.shadow) {
      key.shadow.mapSize.set(tier.shadow, tier.shadow);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    }
    // Shadows switched off free their map, which on Ultra is 4096 texels a side; switched on again, three.js makes one.
    if (!(tier.shadow > 0) && key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    // The filter's radius is in texels of the map, so the same penumbra takes more of a larger one.
    if (tier.shadow > 0) key.shadow.radius = Math.max(1, (tier.soft ?? 5) * tier.shadow / 2048);
    const size = Math.max(256, tier.env || 256);
    if (size !== envSize) {
      const was = env;
      envSize = size; env = bakeEnvironment(E.renderer, O.envLook, size);
      scene.environment = env; if (floor) floor.mat.envMap = env;
      was.userData.release();
    }
    fillOn = !!tier.fill;
    fill.intensity = fillOn ? O.fill * keyLux : 0; bounce.intensity = fillOn ? O.bounce * keyLux : 0;
    if (haze) { haze.visible = !!tier.haze; haze.userData.on = haze.visible; }
    contactOn = tier.contact !== false;
    for (const c of contacts) c.visible = !!c.userData.on && contactOn;
    if (floor) floor.setResolution(w, h, tier.reflect);
  };
  const eye = new THREE.Vector3();
  return {
    scene, key, fill, bounce, haze, contacts, floor, dome, get env() { return env; }, applyTier,
    /* Footprints for the contact shadows: [{ x, z, w, d, soft, opacity }], for a scene whose apparatus changes size. */
    ground,
    prepare(renderer, camera) {
      camera.getWorldPosition(eye);
      dome.userData.follow(eye, focus);
      if (fillOn) {
        const yaw = Math.atan2(eye.x - focus.x, eye.z - focus.z) + 0.6, up = 0.8;
        fill.position.set(focus.x + Math.sin(yaw) * Math.cos(up) * 20, focus.y + Math.sin(up) * 20, focus.z + Math.cos(yaw) * Math.cos(up) * 20);
        if (floor) floor.unlit.copy(fill.color).multiplyScalar(fill.intensity * Math.sin(up));
      } else if (floor) floor.unlit.setRGB(0, 0, 0);
      if (!fitted) fit();
      if (floor) floor.pass(renderer, scene, camera);
    },
    dispose() {
      if (floor) floor.dispose();
      for (const c of contacts) { c.geometry.dispose(); c.material.dispose(); }
      if (haze) { haze.geometry.dispose(); haze.material.dispose(); }
      env.userData.release(); dome.geometry.dispose(); dome.material.dispose(); key.dispose(); fill.dispose(); bounce.dispose();
    },
  };
}
