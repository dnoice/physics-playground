/*
✒ Metadata
    - Title: Chaos Scene (digiSpace Edition - v2.1)
    - File Name: chaos.js
    - Relative Path: js/render/world/scenes/chaos.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the double pendulums as a brass and slate instrument.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The chaos lab in the 3D mode: a slate dial in a brass bezel, standing in a
    cradle on a walnut base. The front pendulum is polished steel; the other
    copies are light, and their trails burn onto the dial. The phase view
    mounts a lit plate on the dial and threads the same paths around a glass
    torus, which is what the wrapped square really is.

✒ Key Features:
    - Engraved dial painted once into a texture from the pendulum's reach.
    - Real-time shadows of the arms on the dial, under a tier-sized map.
    - Copies drawn as instanced light in the lab's own heat colours.
    - Trails and torus paths in one ribbon batch each, thinned by tier.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { canvasTexture } from '../materials.js';
import { createRibbons } from '../ribbons.js';
import { bolt, rodGeometry, rodMatrix, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

const TAU = Math.PI * 2, MAX_COPIES = 60, TRAIL_POINTS = 26000, TORUS_POINTS = 9000;

/* The dial face: stone with engraved rings and a degree scale. */
function paintDial(renderer, slate) {
  const S = 2048, c = document.createElement('canvas'), l = document.createElement('canvas'); c.width = c.height = l.width = l.height = S;
  const face = c.getContext('2d'), g = l.getContext('2d'), C = S / 2, R = C * 0.985;
  face.drawImage(slate.image, 0, 0, S, S);
  const wash = face.createRadialGradient(C, C, R * 0.1, C, C, R);
  wash.addColorStop(0, 'rgba(92,110,132,0.62)'); wash.addColorStop(0.75, 'rgba(58,70,86,0.5)'); wash.addColorStop(1, 'rgba(10,14,20,0.7)');
  face.fillStyle = wash; face.fillRect(0, 0, S, S);
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.translate(C, C);
  const ring = (r, w, a) => { g.strokeStyle = `rgba(214,184,130,${a})`; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r * R, 0, TAU); g.stroke(); };
  ring(0.94, 4, 0.8); ring(0.915, 1.5, 0.55); ring(0.62, 1.5, 0.32); ring(0.31, 1.5, 0.28);
  for (let d = 0; d < 360; d++) {
    const major = d % 30 === 0, mid = d % 10 === 0, a = d * Math.PI / 180, r0 = major ? 0.875 : mid ? 0.892 : 0.903;
    g.strokeStyle = `rgba(214,184,130,${major ? 0.85 : mid ? 0.6 : 0.34})`; g.lineWidth = major ? 3.2 : 1.6;
    g.beginPath(); g.moveTo(Math.sin(a) * r0 * R, -Math.cos(a) * r0 * R); g.lineTo(Math.sin(a) * 0.915 * R, -Math.cos(a) * 0.915 * R); g.stroke();
  }
  g.fillStyle = 'rgba(226,200,150,0.8)'; g.font = '500 44px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 0; d < 360; d += 30) { const a = d * Math.PI / 180; g.fillText(String(d), Math.sin(a) * 0.82 * R, -Math.cos(a) * 0.82 * R); }
  g.strokeStyle = 'rgba(214,184,130,0.14)'; g.lineWidth = 1.4;
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.beginPath(); g.moveTo(Math.sin(a) * 0.08 * R, -Math.cos(a) * 0.08 * R); g.lineTo(Math.sin(a) * 0.86 * R, -Math.cos(a) * 0.86 * R); g.stroke(); }
  face.globalCompositeOperation = 'lighter'; face.drawImage(l, 0, 0);
  return { map: canvasTexture(c, { renderer, srgb: true }), lines: canvasTexture(l, { renderer, srgb: true }) };
}

export function createScene(E, lab) {
  const studio = createStudio(E, {
    keyPos: [-5.5, 9.5, 13], keyTarget: [0, 2.8, 0], key: 520, keyAngle: 0.5, shadowSpan: 34,
    dome: { glowDir: [0.12, 0.2, -1], glow: 0x1a2a3e }, floor: { repeat: 6, reflect: 1, f0: 0.08 },
  });
  const { scene } = studio, M = E.mats;
  const rig = new THREE.Group(); scene.add(rig);

  /* Apparatus, in units of the dial radius, rebuilt when the stage changes the reach. */
  const face = paintDial(E.renderer, M.map('stone', 1024, { srgb: true }));
  const dialMat = new THREE.MeshStandardMaterial({ map: face.map, emissive: 0xffffff, emissiveMap: face.lines, emissiveIntensity: 0.55, roughnessMap: M.map('smudge', 512), roughness: 0.62, metalness: 0.15 });
  const shadow = o => { o.castShadow = true; o.receiveShadow = true; return o; };
  const dial = shadow(new THREE.Mesh(new THREE.CircleGeometry(1, 128), dialMat));
  const back = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.01, 1.01, 0.09, 128), M.gunmetal())); back.rotation.x = Math.PI / 2; back.position.z = -0.05;
  const bezel = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.012, 0.034, 28, 220), M.brass()));
  const lip = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.965, 0.008, 12, 200), M.brass())); lip.position.z = 0.006;
  const dialGroup = new THREE.Group(); dialGroup.add(back, dial, bezel, lip); rig.add(dialGroup);
  for (let k = 0; k < 12; k++) {
    const a = (k + 0.5) * TAU / 12, b = shadow(new THREE.Mesh(bolt(0.016), M.brass()));
    b.rotation.x = Math.PI / 2; b.position.set(Math.sin(a) * 0.986, Math.cos(a) * 0.986, 0.02); dialGroup.add(b);
  }
  // Cradle: an arc under the dial, on a walnut base with brass feet.
  const cradle = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.038, 24, 90, Math.PI * 0.62), M.gunmetal()));
  cradle.rotation.z = Math.PI + Math.PI * 0.19; cradle.position.z = -0.02; dialGroup.add(cradle);
  const hub = shadow(new THREE.Mesh(turned([[0, 0.2], [0.036, 0.196], [0.054, 0.17], [0.05, 0.14], [0.08, 0.12], [0.09, 0.05], [0.13, 0.02], [0.135, 0]], 48), M.brass()));
  hub.rotation.x = Math.PI / 2; dialGroup.add(hub);
  const base = new THREE.Group(); rig.add(base);
  const plinth = shadow(new THREE.Mesh(roundedBox(1.9, 0.11, 0.62, 0.035, 5), M.walnut())); base.add(plinth);
  const plate = shadow(new THREE.Mesh(roundedBox(1.72, 0.018, 0.5, 0.008, 3), M.gunmetal())); plate.position.y = 0.062; base.add(plate);
  const posts = [-0.42, 0.42].map(x => { const p = shadow(new THREE.Mesh(turned([[0.05, 0], [0.04, 0.02], [0.022, 0.05], [0.02, 0.5], [0.02, 1]], 24), M.brass())); p.position.set(x, 0.07, -0.02); base.add(p); return p; });
  for (const [x, z] of [[-0.85, -0.22], [0.85, -0.22], [-0.85, 0.22], [0.85, 0.22]]) { const f = shadow(new THREE.Mesh(turned([[0, 0], [0.05, 0], [0.058, 0.02], [0.03, 0.05]], 24), M.brass())); f.position.set(x, -0.098, z); base.add(f); }

  /* Front pendulum in steel. */
  const armGeo = rodGeometry(20), bobGeo = new THREE.SphereGeometry(1, 48, 32);
  const arm1 = shadow(new THREE.Mesh(armGeo, M.steel())), arm2 = shadow(new THREE.Mesh(armGeo, M.steel()));
  arm1.matrixAutoUpdate = arm2.matrixAutoUpdate = false;
  const bob1 = shadow(new THREE.Mesh(bobGeo, M.polished())), bob2 = shadow(new THREE.Mesh(bobGeo, M.polished()));
  const pin = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), M.brass())); pin.rotation.x = Math.PI / 2;
  rig.add(arm1, arm2, bob1, bob2, pin);

  /* The other copies are light. */
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const ghostArms = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), lightMat, MAX_COPIES * 2);
  const ghostBobs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), lightMat, MAX_COPIES * 2);
  ghostArms.frustumCulled = ghostBobs.frustumCulled = false;
  for (let i = 0; i < MAX_COPIES * 2; i++) { ghostArms.setColorAt(i, new THREE.Color(1, 1, 1)); ghostBobs.setColorAt(i, new THREE.Color(1, 1, 1)); }
  rig.add(ghostArms, ghostBobs);

  const trails = createRibbons(TRAIL_POINTS, { width: 1.5 }), tube = createRibbons(TORUS_POINTS, { width: 1.3 });
  rig.add(trails.mesh, tube.mesh);

  /* Phase plate, painted from the lab's own 2D phase drawing, and the torus it wraps onto. */
  const plateCanvas = document.createElement('canvas'); plateCanvas.width = plateCanvas.height = 1024;
  const plateTex = new THREE.CanvasTexture(plateCanvas); plateTex.colorSpace = THREE.SRGBColorSpace;
  const phaseBack = shadow(new THREE.Mesh(roundedBox(1, 1, 0.03, 0.01, 3), M.gunmetal()));
  const phaseFace = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }));
  rig.add(phaseBack, phaseFace);
  const torus = new THREE.Group(); rig.add(torus);
  const glassMat = M.glass().clone(); glassMat.opacity = 0.07;
  const glass = new THREE.Mesh(new THREE.TorusGeometry(1, 0.42, 40, 96), glassMat); glass.rotation.x = Math.PI / 2; torus.add(glass);
  let plateClock = 1;

  const colors = [], tmp = new THREE.Color(), m4 = new THREE.Matrix4();
  let layoutKey = '', colorKey = -1, stride = 1, reach = 1, P = null;
  const colorFor = i => colors[i] || new THREE.Color(1, 1, 1);

  function layout(W) {
    const key = `${W.w}x${W.h}:${lab.scale}`;
    if (key === layoutKey) return;
    layoutKey = key;
    P = lab.plane3();
    reach = lab.scale * (1 + lab.p.len) * P.k;
    const R = Math.max(0.9 * Math.min(W.w, W.h) / 2 * P.k, reach) * 1.09;
    dialGroup.position.set(0, P.o[1], 0); dialGroup.scale.setScalar(R);
    const bottom = P.o[1] - R * 1.14;
    base.position.y = Math.max(0.098 * R * 0.62, 0.06); base.scale.setScalar(R * 0.62);
    base.position.z = 0;
    for (const p of posts) p.scale.y = Math.max(0.2, (bottom + R * 0.3) / (R * 0.62));
    const s = lab.sq, S = s.S * P.k, tall = S * 1.1;
    phaseBack.scale.set(tall, tall, 1); phaseBack.position.set(0, P.o[1], 0.1);
    phaseFace.scale.set(S * 1.08, S * 1.08, 1); phaseFace.position.set(0, P.o[1], 0.118);
    torus.position.set(-P.hw * 0.74, P.o[1] + 0.2, 0.3); torus.scale.setScalar(Math.min(P.hw * 0.17, 1.15));
  }
  const px = (x, Pl) => (x - Pl.cx) * Pl.k, py = (y, Pl) => Pl.o[1] - (y - Pl.cy) * Pl.k;

  function syncPendulum(view) {
    const N = lab.N, Pl = P, [r1, r2] = lab.bobR(), Sc = lab.scale, pivot = lab.pivot;
    const X0 = px(pivot.x, Pl), Y0 = py(pivot.y, Pl), z1 = 0.19, z2 = 0.15, thick = 0.042;
    if (N) {
      const b = lab.bobs(0), x1 = px(b.x1, Pl), y1 = py(b.y1, Pl), x2 = px(b.x2, Pl), y2 = py(b.y2, Pl), a = 1.5 * r1 * Pl.k, c = 1.5 * r2 * Pl.k;
      rodMatrix(X0, Y0, z1, x1, y1, z1, arm1.matrix, thick); rodMatrix(x1, y1, z2, x2, y2, z2, arm2.matrix, thick);
      arm1.matrixWorldNeedsUpdate = arm2.matrixWorldNeedsUpdate = true;
      bob1.position.set(x1, y1, (z1 + z2) / 2); bob1.scale.setScalar(a);
      bob2.position.set(x2, y2, z2); bob2.scale.setScalar(c);
      pin.position.set(x1, y1, (z1 + z2) / 2); pin.scale.set(a * 0.4, a * 2.45, a * 0.4);
    }
    let k = 0, j = 0;
    for (let i = 1; i < N; i++) {
      const b = lab.bobs(i), z = 0.07 + i * 0.0018, x1 = px(b.x1, Pl), y1 = py(b.y1, Pl), x2 = px(b.x2, Pl), y2 = py(b.y2, Pl), col = colorFor(i);
      for (const [ax, ay, bx, by] of [[X0, Y0, x1, y1], [x1, y1, x2, y2]]) {
        rodMatrix(ax, ay, z, bx, by, z, m4, 0.0085); ghostArms.setMatrixAt(k, m4); ghostArms.setColorAt(k, tmp.copy(col).multiplyScalar(0.8)); k++;
      }
      for (const [x, y, r] of [[x1, y1, r1], [x2, y2, r2]]) {
        m4.makeScale(r * Pl.k * 0.72, r * Pl.k * 0.72, r * Pl.k * 0.72).setPosition(x, y, z); ghostBobs.setMatrixAt(j, m4); ghostBobs.setColorAt(j, tmp.copy(col).multiplyScalar(1.15)); j++;
      }
    }
    ghostArms.count = k; ghostBobs.count = j;
    ghostArms.instanceMatrix.needsUpdate = ghostBobs.instanceMatrix.needsUpdate = true;
    if (k) ghostArms.instanceColor.needsUpdate = true;
    if (j) ghostBobs.instanceColor.needsUpdate = true;

    trails.setResolution(view.w * view.pr, view.h * view.pr); trails.begin();
    if (lab.p.trails && lab.tn > 1) {
      const len = Math.min(lab.tn, Math.round(lab.p.trailLen)), per = Math.floor(TRAIL_POINTS * E.tier.detail / Math.max(1, N));
      stride = Math.max(1, Math.ceil(len / Math.max(2, per)));
      const glow = N > 8 ? 0.3 : 0.6;
      for (let i = N - 1; i >= 0; i--) {
        const col = i === 0 && N === 1 ? tmp.setRGB(0.9, 0.82, 0.62) : colorFor(i), r = col.r * 1.1, g = col.g * 1.1, bl = col.b * 1.1;
        for (let c = 0; c < len; c += stride) {
          const idx = (lab.th - len + c + 900) % 900, o = (i * 900 + idx) * 2, f = c / Math.max(1, len - 1);
          trails.point(X0 + Sc * Pl.k * lab.trails[o], Y0 - Sc * Pl.k * lab.trails[o + 1], 0.012, r, g, bl, glow * f * f, 0.6 + 0.8 * f);
        }
        trails.strip();
      }
    }
    trails.end();
  }
  function syncPhase(view) {
    if ((plateClock += view.dt) > 0.07) {
      plateClock = 0;
      const g = plateCanvas.getContext('2d'), q = lab.sq, S = 1024 / (q.S * 1.08), m = q.S * 0.04;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0a0e14'; g.fillRect(0, 0, 1024, 1024);
      g.setTransform(S, 0, 0, S, (-q.x0 + m) * S, (-q.y0 + m) * S);
      lab.drawPhase(g, lab.size.w, lab.size.h);
      plateTex.needsUpdate = true;
    }
    tube.setResolution(view.w * view.pr, view.h * view.pr); tube.begin();
    const N = lab.N, s = torus.scale.x, tx = torus.position.x, ty = torus.position.y, tz = torus.position.z;
    if (lab.tn > 1) {
      const len = Math.min(lab.tn, Math.round(lab.p.trailLen)), per = Math.floor(TORUS_POINTS * E.tier.detail / Math.max(1, N)), step = Math.max(1, Math.ceil(len / Math.max(2, per)));
      for (let i = N - 1; i >= 0; i--) {
        const col = colorFor(i);
        for (let c = 0; c < len; c += step) {
          const idx = (lab.th - len + c + 900) % 900, o = (i * 900 + idx) * 2, a = lab.phist[o], b = lab.phist[o + 1], f = c / Math.max(1, len - 1), r = 1 + 0.425 * Math.cos(b);
          tube.point(tx + s * r * Math.cos(a), ty + s * 0.425 * Math.sin(b), tz + s * r * Math.sin(a), col.r * 1.05, col.g * 1.05, col.b * 1.05, 0.55 * f + 0.04, 0.7 + f);
        }
        tube.strip();
      }
    }
    tube.end();
  }

  return {
    scene, studio, exposure: 1, bloom: { strength: 0.13, radius: 0.5, threshold: 1 },
    sync(l, view) {
      const W = { w: lab.size.w, h: lab.size.h };
      lab.layout(W.w, W.h);
      layout(W);
      if (colorKey !== lab.N) { colorKey = lab.N; colors.length = 0; for (let i = 0; i < lab.N; i++) colors.push(new THREE.Color(lab.colorOf(i)).convertSRGBToLinear()); }
      const phase = lab.p.view === 'phase';
      for (const o of [arm1, arm2, bob1, bob2, pin, ghostArms, ghostBobs, trails.mesh]) o.visible = !phase;
      for (const o of [phaseBack, phaseFace, torus, tube.mesh]) o.visible = phase;
      hub.visible = !phase;
      if (phase) syncPhase(view); else syncPendulum(view);
      if (!phase && lab.N < 2) { ghostArms.count = ghostBobs.count = 0; }
    },
    dispose() {
      studio.dispose(); trails.dispose(); tube.dispose(); armGeo.dispose(); bobGeo.dispose(); plateTex.dispose(); lightMat.dispose();
      face.map.dispose(); face.lines.dispose(); dialMat.dispose(); glassMat.dispose();
    },
  };
}
