/*
✒ Metadata
    - Title: Chaos Scene (digiSpace Edition - v2.3)
    - File Name: chaos.js
    - Relative Path: js/render/world/scenes/chaos.js
    - Artifact Type: javascript
    - Version: 2.3.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — The phase
      view keeps the pendulum live on its dial, which follows the pivot, and
      puts the map on a brass-framed screen on its own stand whose face lies
      over the map's world rectangle, so clicks and the hover preview land as
      in 2D. The torus rests on the frame, with its paths turning slowly. The
      stand is shared by dial and screen.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the double pendulums as a brass and slate instrument.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The chaos lab in the 3D mode: a slate dial in a brass bezel, standing in a
    cradle on a walnut base. The front pendulum is polished steel; the other
    copies are light, and their trails burn onto the dial. The phase view
    keeps the pendulum live and sets the lab's map beside it on a framed
    screen, with a glass torus on top that shows what the wrapped square
    really is.

✒ Key Features:
    - Engraved dial painted once into a texture from the pendulum's reach.
    - Real-time shadows of the arms on the dial, under a tier-sized map.
    - Copies drawn as instanced light in the lab's own heat colours.
    - Phase screen painted from the lab's own drawing, aligned with the plane
      so picking needs no 3D code.
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
// The screen face spans the map plus room for its axes: FACE times its side, starting FACE_L left of and FACE_T above it.
const PLATE_PX = 1280, FACE = 1.24, FACE_L = 0.18, FACE_T = 0.08;

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
  g.fillStyle = 'rgba(226,200,150,0.8)'; g.font = '500 44px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
  // The back of the instrument, which can be walked around: a ribbed casting, a bearing housing and a maker's plate.
  const rear = new THREE.Group(); rear.position.z = -0.095; dialGroup.add(rear);
  for (const [r, w, m] of [[0.94, 0.014, M.brass()], [0.64, 0.018, M.steel()], [0.3, 0.016, M.brass()]]) rear.add(shadow(new THREE.Mesh(new THREE.TorusGeometry(r, w, 16, 180), m)));
  const ribGeo = roundedBox(0.034, 0.62, 0.04, 0.014, 3), screwGeo = bolt(0.017);
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) * TAU / 8, rib = shadow(new THREE.Mesh(ribGeo, M.steel()));
    rib.position.set(Math.sin(a) * 0.61, Math.cos(a) * 0.61, -0.012); rib.rotation.z = -a; rear.add(rib);
    for (const r of [0.94, 0.3]) { const b = shadow(new THREE.Mesh(screwGeo, M.brass())); b.rotation.x = -Math.PI / 2; b.position.set(Math.sin(a) * r, Math.cos(a) * r, -0.02); rear.add(b); }
  }
  const housing = shadow(new THREE.Mesh(turned([[0.2, 0], [0.19, 0.03], [0.12, 0.05], [0.11, 0.12], [0.07, 0.15], [0.03, 0.17], [0, 0.175]], 48), M.brass()));
  housing.rotation.x = -Math.PI / 2; rear.add(housing);
  const plateCanvas2 = document.createElement('canvas'); plateCanvas2.width = 512; plateCanvas2.height = 160;
  const pg = plateCanvas2.getContext('2d');
  pg.fillStyle = '#7a5a2a'; pg.fillRect(0, 0, 512, 160); pg.strokeStyle = 'rgba(40,26,8,0.8)'; pg.lineWidth = 5; pg.strokeRect(12, 12, 488, 136);
  pg.fillStyle = 'rgba(30,18,4,0.92)'; pg.textAlign = 'center'; pg.font = '600 46px "Raleway", sans-serif'; pg.fillText('Double Pendulum', 256, 82); pg.font = '500 24px "JetBrains Mono", monospace'; pg.fillText('DETERMINISTIC · UNPREDICTABLE', 256, 124);
  const plateTex2 = canvasTexture(plateCanvas2, { renderer: E.renderer, srgb: true });
  const maker = shadow(new THREE.Mesh(roundedBox(0.44, 0.14, 0.012, 0.005, 2), new THREE.MeshStandardMaterial({ map: plateTex2, emissive: 0xffffff, emissiveMap: plateTex2, emissiveIntensity: 0.55, metalness: 0.5, roughness: 0.42 })));
  maker.rotation.y = Math.PI; maker.position.set(0, -0.46, -0.03); rear.add(maker);
  // Cradle: an arc under the dial, on a walnut base with brass feet.
  const cradle = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.038, 24, 90, Math.PI * 0.62), M.gunmetal()));
  cradle.rotation.z = Math.PI + Math.PI * 0.19; cradle.position.z = -0.02; dialGroup.add(cradle);
  const hub = shadow(new THREE.Mesh(turned([[0, 0.2], [0.036, 0.196], [0.054, 0.17], [0.05, 0.14], [0.08, 0.12], [0.09, 0.05], [0.13, 0.02], [0.135, 0]], 48), M.brass()));
  hub.rotation.x = Math.PI / 2; dialGroup.add(hub);
  // A stand: walnut plinth, gunmetal plate, two brass posts and four feet. The dial has one, and so does the phase screen.
  const postGeo = turned([[0.05, 0], [0.04, 0.02], [0.022, 0.05], [0.02, 0.5], [0.02, 1]], 24), footGeo = turned([[0, 0], [0.05, 0], [0.058, 0.02], [0.03, 0.05]], 24);
  const plinthGeo = roundedBox(1.9, 0.11, 0.62, 0.035, 5), plateGeo = roundedBox(1.72, 0.018, 0.5, 0.008, 3);
  function stand() {
    const group = new THREE.Group(); rig.add(group);
    group.add(shadow(new THREE.Mesh(plinthGeo, M.walnut())));
    const top = shadow(new THREE.Mesh(plateGeo, M.gunmetal())); top.position.y = 0.062; group.add(top);
    const posts = [-0.42, 0.42].map(x => { const p = shadow(new THREE.Mesh(postGeo, M.brass())); p.position.set(x, 0.07, -0.02); group.add(p); return p; });
    for (const [x, z] of [[-0.85, -0.22], [0.85, -0.22], [-0.85, 0.22], [0.85, 0.22]]) { const f = shadow(new THREE.Mesh(footGeo, M.brass())); f.position.set(x, -0.098, z); group.add(f); }
    return { group, posts };
  }
  const { group: base, posts } = stand();

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

  /* The phase screen: the lab's own map painted onto a face that lies exactly over the map's world rectangle (axes
     included), so a click or hover on it lands on the same angles as in 2D. Brass frame, dark back, its own stand. */
  const plateCanvas = document.createElement('canvas'); plateCanvas.width = plateCanvas.height = PLATE_PX;
  const plateTex = new THREE.CanvasTexture(plateCanvas); plateTex.colorSpace = THREE.SRGBColorSpace; plateTex.anisotropy = 4;
  const phaseFrame = shadow(new THREE.Mesh(roundedBox(1, 1, 0.05, 0.02, 4), M.brass()));
  const phaseBack = shadow(new THREE.Mesh(roundedBox(1, 1, 0.06, 0.016, 3), M.gunmetal()));
  const phaseFace = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }));
  rig.add(phaseFrame, phaseBack, phaseFace);
  const { group: screenBase, posts: screenPosts } = stand();
  /* The torus the map wraps onto, resting on top of the screen's frame: glass with the same paths threaded around it,
     turning slowly so its shape reads. */
  const torus = new THREE.Group(); rig.add(torus);
  const glassMat = M.glass().clone(); glassMat.opacity = 0.16;
  const glass = new THREE.Mesh(new THREE.TorusGeometry(1, 0.42, 40, 96), glassMat); glass.rotation.x = Math.PI / 2; torus.add(glass);
  const rimGeo = new THREE.TorusGeometry(1.42, 0.012, 8, 160), rim = new THREE.Mesh(rimGeo, M.brass()); rim.rotation.x = Math.PI / 2; torus.add(rim);
  let plateClock = 1, spin = 0;

  const colors = [], tmp = new THREE.Color(), m4 = new THREE.Matrix4();
  let layoutKey = '', colorKey = -1, stride = 1, reach = 1, P = null;
  const colorFor = i => colors[i] || new THREE.Color(1, 1, 1);

  function layout(W) {
    const phase = lab.p.view === 'phase', key = `${W.w}x${W.h}:${lab.scale}:${phase}`;
    if (key === layoutKey) return;
    layoutKey = key;
    P = lab.plane3();
    reach = lab.scale * (1 + lab.p.len) * P.k;
    // Alone, the dial fills the stage; beside the map it hugs the pendulum's reach. Either way it centres on the pivot.
    const R = (phase ? reach : Math.max(0.9 * Math.min(W.w, W.h) / 2 * P.k, reach)) * 1.09, dx = px(lab.pivot.x, P), dy = py(lab.pivot.y, P);
    dialGroup.position.set(dx, dy, 0); dialGroup.scale.setScalar(R);
    const bottom = dy - R * 1.14;
    base.position.set(dx, Math.max(0.098 * R * 0.62, 0.06), 0); base.scale.setScalar(R * 0.62);
    for (const p of posts) p.scale.y = Math.max(0.2, (bottom + R * 0.3) / (R * 0.62));
    const q = lab.sq, F = q.S * FACE * P.k, cx = px(q.x0 + q.S * (FACE / 2 - FACE_L), P), cy = py(q.y0 + q.S * (FACE / 2 - FACE_T), P);
    phaseFace.scale.set(F, F, 1); phaseFace.position.set(cx, cy, 0.02);
    phaseBack.scale.set(F * 1.025, F * 1.025, 1); phaseBack.position.set(cx, cy, -0.02);
    phaseFrame.scale.set(F * 1.06, F * 1.06, 1); phaseFrame.position.set(cx, cy, -0.04);
    const Rs = F * 0.5, low = cy - F * 0.53;
    screenBase.position.set(cx, Math.max(0.098 * Rs, 0.06), 0); screenBase.scale.setScalar(Rs);
    for (const p of screenPosts) p.scale.y = Math.max(0.2, (low - screenBase.position.y + F * 0.06) / Rs);
    const tr = Math.min(F * 0.075, 0.55);
    torus.scale.setScalar(tr); torus.position.set(cx + F * 0.27, cy + F * 0.53 + tr * 0.44, 0);
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
      const g = plateCanvas.getContext('2d'), q = lab.sq, K = PLATE_PX / (q.S * FACE);
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0a0e14'; g.fillRect(0, 0, PLATE_PX, PLATE_PX);
      g.setTransform(K, 0, 0, K, (q.S * FACE_L - q.x0) * K, (q.S * FACE_T - q.y0) * K);
      lab.drawPhase(g, { px: 1 });
      plateTex.needsUpdate = true;
    }
    tube.setResolution(view.w * view.pr, view.h * view.pr); tube.begin();
    const N = lab.N, s = torus.scale.x, tx = torus.position.x, ty = torus.position.y, tz = torus.position.z;
    spin = (spin + view.dt * 0.25) % TAU;
    if (lab.tn > 1) {
      const len = Math.min(lab.tn, Math.round(lab.p.trailLen)), per = Math.floor(TORUS_POINTS * E.tier.detail / Math.max(1, N)), step = Math.max(1, Math.ceil(len / Math.max(2, per)));
      for (let i = N - 1; i >= 0; i--) {
        const col = colorFor(i);
        for (let c = 0; c < len; c += step) {
          const idx = (lab.th - len + c + 900) % 900, o = (i * 900 + idx) * 2, a = lab.phist[o], b = lab.phist[o + 1], f = c / Math.max(1, len - 1), r = 1 + 0.425 * Math.cos(b);
          tube.point(tx + s * r * Math.cos(a + spin), ty + s * 0.425 * Math.sin(b), tz + s * r * Math.sin(a + spin), col.r * 1.1, col.g * 1.1, col.b * 1.1, 0.75 * f + 0.06, 0.8 + f);
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
      // The pendulum stays live in the phase view; the screen, its stand and the torus join it.
      const phase = lab.p.view === 'phase';
      for (const o of [phaseFrame, phaseBack, phaseFace, screenBase, torus, tube.mesh]) o.visible = phase;
      syncPendulum(view);
      if (phase) syncPhase(view);
      if (lab.N < 2) { ghostArms.count = ghostBobs.count = 0; }
    },
    dispose() {
      studio.dispose(); trails.dispose(); tube.dispose(); armGeo.dispose(); bobGeo.dispose(); plateTex.dispose(); lightMat.dispose();
      postGeo.dispose(); footGeo.dispose(); plinthGeo.dispose(); plateGeo.dispose(); rimGeo.dispose();
      face.map.dispose(); face.lines.dispose(); dialMat.dispose(); plateTex2.dispose(); ribGeo.dispose(); screwGeo.dispose(); glassMat.dispose();
    },
  };
}
