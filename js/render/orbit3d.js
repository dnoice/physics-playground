/*
✒ Metadata
    - Title: Orbit View Renderer (digiSpace Edition - v2.0)
    - File Name: orbit3d.js
    - Relative Path: js/render/orbit3d.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 for the 3D gravity with orbital tilt that Dennis asked to
      implement; it gives the tilted orbits real depth.
    Earlier entries: see CHANGELOG.md

✒ Description:
    three.js renderer for the gravity lab's 3D orbit view: lit spheres,
    glowing stars with bloom, fading trails, drop lines to the orbital plane
    and a polar grid. The gravity lab owns the camera; this module mirrors
    it and returns a canvas the stage composites.

✒ Key Features:
    - Loaded on demand with a dynamic import, so three.js costs nothing
      until the 3D view opens.
    - Stars (mass ≥ 150) glow through an UnrealBloom pass and light the
      planets with point lights.
    - Bodies keep a minimum on-screen size at any distance; trails fade into
      the background colour.
    - Returns false on a lost WebGL context so the lab can fall back
      honestly.

✒ Other Important Information:
    - Dependencies: three@0.187.0 (core, EffectComposer, RenderPass,
      UnrealBloomPass, OutputPass) from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ================================================================== */
/*  3D orbit view for the gravity lab (three.js, loaded on demand)     */
/* ================================================================== */
/* Simulation (x, y, z) maps to three.js (X, Z, Y): the orbital plane is
   horizontal and z is height, so looking straight down reproduces the
   flat view. The lab owns the camera (yaw, pitch, distance, target); this
   module only mirrors it, renders lit spheres, glowing stars with bloom,
   fading trails, drop lines to the plane and a polar grid, and hands back
   a canvas the stage composites. Nothing here changes the simulation. */
const STAR_MASS = 150;          // bodies at least this heavy glow and cast light
const MAX_LIGHTS = 3;
const SEG = { w: 28, h: 18 };

export function createOrbitView(TRAIL_CAP) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  let lost = false;
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 2e5);
  const ambient = new THREE.AmbientLight(0xbcc8d8, 0.16);
  const head = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(ambient, head, head.target);
  const lights = Array.from({ length: MAX_LIGHTS }, () => { const L = new THREE.PointLight(0xffe2b0, 0, 0, 0); scene.add(L); return L; });

  // Starfield on a large shell around the target.
  const starGeo = new THREE.BufferGeometry(), N = 1800, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), k = 0.35 + 0.65 * Math.random() ** 3;
    sp.set([r * Math.cos(a), u, r * Math.sin(a)], i * 3); sc.set([k * 0.86, k * 0.9, k], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
  scene.add(starfield);

  let grid = null, gridR = 0;
  const sphere = new THREE.SphereGeometry(1, SEG.w, SEG.h);
  const entries = new Map();
  const dropGeo = new THREE.BufferGeometry(), dropPos = new Float32Array(600 * 6);
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
  const drops = new THREE.LineSegments(dropGeo, new THREE.LineBasicMaterial({ color: 0x8a96a8, transparent: true, opacity: 0.35, depthWrite: false }));
  const vecGeo = new THREE.BufferGeometry(), vecPos = new Float32Array(600 * 6);
  vecGeo.setAttribute('position', new THREE.BufferAttribute(vecPos, 3));
  const vecs = new THREE.LineSegments(vecGeo, new THREE.LineBasicMaterial({ color: 0x5fd0e6, transparent: true, opacity: 0.85 }));
  scene.add(drops, vecs);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.95, 0.45, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let size = { w: 0, h: 0, dpr: 0 };
  const bg = new THREE.Color(), tmp = new THREE.Color();

  function entryFor(b, colorOf) {
    let e = entries.get(b.id);
    const star = b.m >= STAR_MASS;
    if (e && e.star === star) return e;
    if (e) drop(b.id);
    const col = new THREE.Color(colorOf(b));
    const mat = star ? new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.6) })
      : new THREE.MeshStandardMaterial({ color: col, roughness: 0.62, metalness: 0.05, emissive: col, emissiveIntensity: 0.22 });
    const mesh = new THREE.Mesh(sphere, mat);
    const tg = new THREE.BufferGeometry(), tpos = new Float32Array(TRAIL_CAP * 3), tcol = new Float32Array(TRAIL_CAP * 3);
    tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    trail.frustumCulled = false;
    scene.add(mesh, trail);
    e = { mesh, trail, tpos, tcol, star, col }; entries.set(b.id, e);
    return e;
  }
  function drop(id) {
    const e = entries.get(id); if (!e) return;
    scene.remove(e.mesh, e.trail); e.mesh.material.dispose(); e.trail.geometry.dispose(); e.trail.material.dispose(); entries.delete(id);
  }
  function setGrid(R, cx, cz) {
    if (!grid || Math.abs(R - gridR) / gridR > 0.3) {
      if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      gridR = R; grid = new THREE.PolarGridHelper(R, 12, 8, 96, 0x3a4658, 0x232c39);
      grid.material.transparent = true; grid.material.opacity = 0.55; grid.material.depthWrite = false;
      scene.add(grid);
    }
    grid.position.set(cx, 0, cz);
  }

  return {
    canvas: renderer.domElement,
    /* Render the lab's current state. Returns false if WebGL is gone. */
    render(lab, w, h, dpr, theme) {
      if (lost) return false;
      try {
        if (w !== size.w || h !== size.h || dpr !== size.dpr) {
          // Bloom runs at full resolution, so cap the pixel ratio for the 3D pass.
          const pr = Math.min(dpr, 1.5);
          renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
          bloom.resolution.set(w * pr, h * pr); size = { w, h, dpr };
        }
        bg.set(theme.ink); scene.background = bg;
        const c = lab.c3(), V = lab.view3;
        camera.fov = V.fovDeg; camera.aspect = w / Math.max(1, h); camera.near = Math.max(0.5, c.dist * 0.004); camera.far = c.dist * 40 + 2e4;
        camera.position.set(V.eye[0], V.eye[1], V.eye[2]); camera.up.set(0, 1, 0); camera.lookAt(c.tx, c.ty, c.tz);
        camera.updateProjectionMatrix();
        starfield.position.set(c.tx, c.ty, c.tz); starfield.scale.setScalar(camera.far * 0.6);
        setGrid(lab.dist0() * 0.62, c.tx, c.tz);
        grid.visible = lab.p.grid3 !== false;

        const B = lab.bodies, seen = new Set(), stars = [], len0 = Math.round(lab.p.trailLen);
        bg.set(theme.ink);
        let nd = 0, nv = 0;
        const pxK = h / (2 * Math.tan(camera.fov * Math.PI / 360));
        for (const b of B) {
          seen.add(b.id);
          const e = entryFor(b, lab.bodyColor3), X = b.x, Y = b.z, Z = b.y;
          // Keep every body at least a few pixels across, however far the camera is.
          e.mesh.position.set(X, Y, Z);
          const depth = Math.max(1e-3, camera.position.distanceTo(e.mesh.position));
          e.mesh.scale.setScalar(Math.max(b.r, (e.star ? 4 : 2.6) * depth / pxK));
          if (e.star) stars.push(b);
          const len = lab.p.trails ? Math.min(b.tn, len0) : 0;
          e.trail.visible = len > 1;
          if (len > 1) {
            for (let k = 0; k < len; k++) {
              const idx = (b.th - len + k + TRAIL_CAP) % TRAIL_CAP, f = 0.08 + 0.92 * (k / (len - 1)) ** 1.4;
              e.tpos[k * 3] = b.trail[idx * 2]; e.tpos[k * 3 + 1] = b.trailZ[idx]; e.tpos[k * 3 + 2] = b.trail[idx * 2 + 1];
              tmp.copy(bg).lerp(e.col, f); e.tcol[k * 3] = tmp.r; e.tcol[k * 3 + 1] = tmp.g; e.tcol[k * 3 + 2] = tmp.b;
            }
            const g = e.trail.geometry; g.setDrawRange(0, len); g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
          }
          if (!e.star && Math.abs(b.z) > 0.5 && nd < 600) { dropPos.set([X, Y, Z, X, 0, Z], nd * 6); nd++; }
          if (lab.p.vectors && nv < 600) { const k = 0.35; vecPos.set([X, Y, Z, X + b.vx * k, Y + b.vz * k, Z + b.vy * k], nv * 6); nv++; }
        }
        for (const id of [...entries.keys()]) if (!seen.has(id)) drop(id);
        dropGeo.setDrawRange(0, nd * 2); dropGeo.attributes.position.needsUpdate = true; drops.visible = nd > 0;
        vecGeo.setDrawRange(0, nv * 2); vecGeo.attributes.position.needsUpdate = true; vecs.visible = nv > 0;

        stars.sort((a, b2) => b2.m - a.m);
        lights.forEach((L, i) => { const s = stars[i]; L.intensity = s ? 2.6 / Math.min(stars.length, MAX_LIGHTS) + 0.6 : 0; if (s) L.position.set(s.x, s.z, s.y); });
        head.intensity = stars.length ? 0 : 1.6; head.position.copy(camera.position); head.target.position.set(c.tx, c.ty, c.tz);
        composer.render();
        return true;
      } catch (err) {
        console.warn('3D orbit view failed', err);
        return false;
      }
    },
    dispose() {
      for (const id of [...entries.keys()]) drop(id);
      sphere.dispose(); starGeo.dispose(); dropGeo.dispose(); vecGeo.dispose(); composer.dispose(); renderer.dispose();
    },
  };
}
