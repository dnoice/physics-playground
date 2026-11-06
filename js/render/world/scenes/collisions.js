/*
✒ Metadata
    - Title: Collisions Scene (digiSpace Edition - v2.1)
    - File Name: collisions.js
    - Relative Path: js/render/world/scenes/collisions.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the collisions lab as a tilting laboratory air table.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The collisions lab in the 3D mode: a slate air table in a walnut frame
    with brass corners, carried on trunnions by a blackened steel stand. The
    table tilts as the lab's gravity rises, like a bagatelle board, and a
    brass pointer reads the angle off a quadrant on the stand. Balls are
    resin spheres of the sim's own radii, so they touch when the discs touch.

✒ Key Features:
    - Slate bed painted once for each world size, with its air holes and a
      graticule ruled in the lab's own pixels.
    - One instanced draw for the balls and one for their contact decals,
      which ground every ball at every tier; sphere detail follows the tier.
    - Balls take the lab's heat ramp in every colour mode, with the spin mark
      of the 2D view and a faint glow from kinetic energy.
    - The Brownian tracer is a brass ball with its path in one ribbon batch.
    - Where the tier has reflections, the balls mirror in the bed at any tilt.
    - Wall hits glint on the steel liner, read from each ball's position and
      velocity, and the heat and cool brushes warm or chill the bed.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { reduceMotion } from '../../../core/util.js';
import { COLL_CAP, COLL_RGB } from '../../../labs/collisions.js';
import { canvasTexture } from '../materials.js';
import { createRibbons } from '../ribbons.js';
import { ringFrame, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

/* The rail in section, in scene units measured out from the sim's wall. */
const LINER = 0.05, RAIL = 0.42, STEP = 0.12, TOP = 0.18, SKIRT = 0.3, CORNER = 0.06, OUT = LINER + RAIL + STEP;
const TRAIL_POINTS = 910, DECAL_REACH = 1.8, GLINTS = 96, GLINT_LIFE = 0.24;
const LINER_TOP = TOP - 0.03;
const LOD = [6, 8, 10, 12, 16, 20, 24, 32];

const place = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
/* Parts that share a material become one mesh, so the stand costs a draw call and not thirty. */
function bake(parts) {
  const out = parts.map(([g, m]) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    n.clearGroups();
    return m ? n.applyMatrix4(m) : n;
  });
  const merged = mergeGeometries(out, false);
  for (const g of out) g.dispose();
  return merged;
}
const rail = (w, h, band, y0, y1, corner, bevel) => ringFrame(w, h, band, y1 - y0, corner, bevel);
const flag = (a, len) => { a.clearUpdateRanges(); a.addUpdateRange(0, len); a.needsUpdate = true; };
/* ExtrudeGeometry runs its UVs one way across the whole frame; joined rails run with the grain along each side, mitred at the corners. */
function mitreGrain(g, w, h) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    let cx = 0, cy = 0;
    for (let k = 0; k < 3; k++) { cx += p.getX(i + k) / 3; cy += p.getY(i + k) / 3; }
    const long = Math.abs(cy) / h > Math.abs(cx) / w, seed = (long ? 0.13 : 0.57) + (cx + cy > 0 ? 0.31 : 0);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      uv.setXY(i + k, (long ? x : y) * 0.11 + seed, (long ? y : x) * 2.1 + z * 2.1 + seed);
    }
  }
  return g;
}
/* A domed screw head, a few pixels across at most, so it stays light. */
const screw = r => turned([[0, r * 0.5], [r * 0.82, r * 0.46], [r, r * 0.22], [r * 1.02, 0]], 10, 3);
const frameAt = (y0, y1) => place(0, (y0 + y1) / 2, 0, -Math.PI / 2);

/* One brass corner: an L of plate following the frame's outer radius, around its arc centre. */
function capShape(R, ri, leg) {
  const s = new THREE.Shape();
  s.moveTo(R, -leg); s.lineTo(R, 0); s.absarc(0, 0, R, 0, Math.PI / 2, false); s.lineTo(-leg, R);
  s.absarc(-leg, (R + ri) / 2, (R - ri) / 2, Math.PI / 2, Math.PI * 1.5, false);
  s.absarc(0, 0, ri, Math.PI / 2, 0, true);
  s.absarc((R + ri) / 2, -leg, (R - ri) / 2, Math.PI, Math.PI * 2, false);
  return s;
}
/* An end standard: a flared casting in the (z, y) plane, with a window through it. */
function trestle(H) {
  const b = 1.66, y0 = 0.27, t = 0.37, s = new THREE.Shape();
  s.moveTo(-b, y0); s.lineTo(b, y0); s.lineTo(b, y0 + 0.13);
  s.bezierCurveTo(b - 1.05, y0 + 0.22, t, H - 1.15, t, H);
  s.absarc(0, H, t, 0, Math.PI, false);
  s.bezierCurveTo(-t, H - 1.15, -(b - 1.05), y0 + 0.22, -b, y0 + 0.13);
  s.closePath();
  const w = new THREE.Path(), yw = y0 + 0.34, top = H - 0.74;
  w.moveTo(-0.98, yw); w.lineTo(0.98, yw);
  w.bezierCurveTo(0.56, yw + 0.1, 0.17, top - 0.8, 0.13, top);
  w.absarc(0, top, 0.13, 0, Math.PI, false);
  w.bezierCurveTo(-0.17, top - 0.8, -0.56, yw + 0.1, -0.98, yw);
  s.holes.push(w);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelOffset: -0.03, bevelSegments: 3, curveSegments: 28 });
  g.translate(0, 0, -0.11); g.rotateY(Math.PI / 2);
  return g;
}

/* The bed: honed slate with its air holes, and a graticule ruled every 50 of the lab's pixels. */
function paintBed(renderer, stone, W) {
  const S = 2048 / Math.max(W.w, W.h), cw = Math.round(W.w * S), ch = Math.round(W.h * S);
  const sheet = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
  const c = sheet(), l = sheet(), g = c.getContext('2d'), e = l.getContext('2d');
  // Stretched once for the broad cloud, then tiled faintly for grit, so the tile never repeats visibly.
  g.drawImage(stone.image, 0, 0, cw, ch); g.globalAlpha = 0.35;
  for (let y = 0; y < ch; y += 700) for (let x = 0; x < cw; x += 700) g.drawImage(stone.image, x, y, 700, 700);
  g.globalAlpha = 1;
  const wash = g.createRadialGradient(cw / 2, ch * 0.46, ch * 0.1, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.56);
  wash.addColorStop(0, 'rgba(84,100,124,0.62)'); wash.addColorStop(0.7, 'rgba(50,62,78,0.6)'); wash.addColorStop(1, 'rgba(10,13,19,0.72)');
  g.fillStyle = wash; g.fillRect(0, 0, cw, ch);
  const pitch = 20 * S, rise = pitch * 0.866;
  for (let row = 0, y = rise / 2; y < ch; row++, y += rise) for (let x = row % 2 ? pitch : pitch / 2; x < cw; x += pitch) {
    g.fillStyle = 'rgba(190,205,225,0.13)'; g.beginPath(); g.arc(x + 0.5, y + 1, 2.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(3,5,8,0.92)'; g.beginPath(); g.arc(x, y, 2.3, 0, Math.PI * 2); g.fill();
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, cw, ch);
  const rule = (x0, y0, x1, y1, a, w) => { e.strokeStyle = `rgba(214,184,130,${a})`; e.lineWidth = w; e.beginPath(); e.moveTo(x0, y0); e.lineTo(x1, y1); e.stroke(); };
  for (let x = 50; x < W.w; x += 50) { const major = x % 100 === 0; rule(x * S, 0, x * S, ch, major ? 0.16 : 0.07, major ? 1.6 : 1); }
  for (let y = 50; y < W.h; y += 50) { const major = y % 100 === 0; rule(0, y * S, cw, y * S, major ? 0.16 : 0.07, major ? 1.6 : 1); }
  for (let x = 10; x < W.w; x += 10) { const t = (x % 100 === 0 ? 26 : x % 50 === 0 ? 18 : 10), a = x % 50 === 0 ? 0.7 : 0.4; rule(x * S, 0, x * S, t, a, 1.5); rule(x * S, ch, x * S, ch - t, a, 1.5); }
  for (let y = 10; y < W.h; y += 10) { const t = (y % 100 === 0 ? 26 : y % 50 === 0 ? 18 : 10), a = y % 50 === 0 ? 0.7 : 0.4; rule(0, y * S, t, y * S, a, 1.5); rule(cw, y * S, cw - t, y * S, a, 1.5); }
  g.globalCompositeOperation = 'lighter'; g.drawImage(l, 0, 0); g.globalCompositeOperation = 'source-over';
  // The figures are cut into the stone rather than lit, so they stay quiet until the camera comes close.
  g.fillStyle = 'rgba(214,190,146,0.46)'; g.font = '500 20px "JetBrains Mono", monospace'; g.textBaseline = 'top';
  g.textAlign = 'center'; for (let x = 200; x < W.w; x += 200) g.fillText(String(x), x * S, 32);
  g.textAlign = 'left'; g.textBaseline = 'middle'; for (let y = 200; y < W.h; y += 200) g.fillText(String(y), 32, y * S);
  const tex = (cv, srgb) => { const t = canvasTexture(cv, { renderer, srgb }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  return { map: tex(c, true), lines: tex(l, true) };
}

/* The balls' shared shading: the 2D view's spin dot, set on the sphere where that dot sits, and a glow fed per instance. */
function shadeBall(mat, U) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uMark = U.uMark;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vBall; varying float vGlow;
      #ifdef USE_INSTANCING
      attribute float aGlow;
      #endif`).replace('#include <begin_vertex>', `#include <begin_vertex>
      vBall = position;
      #ifdef USE_INSTANCING
      vGlow = aGlow;
      #else
      vGlow = 0.0;
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vBall; varying float vGlow; uniform float uMark;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float markD = distance(normalize(vBall), vec3(0.5199, 0.8542, 0.0)), markW = fwidth(markD) + 0.008;
      float markOn = uMark * (1.0 - smoothstep(0.2 - markW, 0.2 + markW, markD));
      // A billiard spot: cream on the dark end of the ramp, ink on the light end.
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.9, 0.82, 0.68), vec3(0.012, 0.016, 0.024), smoothstep(0.34, 0.52, dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1)))), markOn);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * vGlow;`);
  };
}

export function createScene(E, lab) {
  const studio = createStudio(E, {
    keyPos: [9.5, 12, -5], keyTarget: [0, 2.2, 0], key: 880, keyAngle: 0.58, keyPenumbra: 0.9, shadowSpan: 36, fog: 0.016, envIntensity: 1.2, envLook: { top: 0xb4bac4, wall: 0x22262d },
    dome: { glowDir: [0.1, 0.2, -1], glow: 0x22364e, glowPow: 4 }, floor: { repeat: 6, reflect: 1, f0: 0.09, color: 0x2b323d, roughness: 0.62, env: 0.035 },
  });
  const { scene } = studio, M = E.mats, H = lab.rig3.height;
  // Lean the softboxes back, so flat brass and rail tops have something to reflect from the home camera.
  scene.environmentRotation.x = -0.32;
  // The key rakes in from behind so the table's sheen never swings into the home camera as it tilts; a hemisphere lifts the near side and leaves no highlight of its own.
  const fill = new THREE.HemisphereLight(0x9dbbdc, 0x241c16, 0.55); scene.add(fill);
  /* Local axes follow the sim: x along its x, z along its y, y out of the bed; the origin is the trunnion axis. */
  const table = new THREE.Group(), stand = new THREE.Group();
  scene.add(table, stand);
  const solid = o => { o.castShadow = true; o.receiveShadow = true; return o; };
  const blacked = new THREE.MeshPhysicalMaterial({ color: 0x2c3139, metalness: 0.72, roughness: 0.46, roughnessMap: M.map('smudge', 512, { repeat: 2 }), clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const none = new THREE.BufferGeometry();
  const walnut = M.walnut().clone(); walnut.clearcoat = 0.42; walnut.clearcoatRoughness = 0.44; walnut.roughness = 0.54;
  // Flat brass mirrors a dark room as black, so the trim keeps a little of its own colour at every angle.
  const trimBrass = M.brass().clone(); trimBrass.roughnessMap = null; trimBrass.roughness = 0.34; trimBrass.envMapIntensity = 1.3; trimBrass.emissive.set(0x4a3212); trimBrass.emissiveIntensity = 0.32;
  const woodMesh = solid(new THREE.Mesh(none, walnut)), trimMesh = solid(new THREE.Mesh(none, trimBrass)), steelMesh = solid(new THREE.Mesh(none, blacked));
  const bedMat = new THREE.MeshPhysicalMaterial({ emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.68, metalness: 0.05, specularIntensity: 0.16, envMapIntensity: 0.7 });
  const bed = new THREE.Mesh(none, bedMat); bed.receiveShadow = true;
  table.add(woodMesh, trimMesh, steelMesh, bed);
  const standSteel = solid(new THREE.Mesh(none, blacked)), standBrass = solid(new THREE.Mesh(none, trimBrass));
  stand.add(standSteel, standBrass);
  // A soft pool under the stand, so it stands on the floor with or without a shadow map.
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.6, 'rgba(0,0,0,0.42)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: poolTex, transparent: true, depthWrite: false });
  const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.position.y = 0.004; stand.add(pool);

  const bedTex = { map: null, lines: null };
  let layoutKey = '';
  function layout() {
    const W = { w: lab.w, h: lab.h }, key = `${W.w}x${W.h}`;
    if (key === layoutKey) return;
    layoutKey = key;
    const P = lab.plane3(), hw = P.hw, hh = P.hh, w = 2 * hw, h = 2 * hh, wi = w + 2 * LINER, hi = h + 2 * LINER;
    for (const m of [woodMesh, trimMesh, steelMesh, bed, standSteel, standBrass]) if (m.geometry !== none) m.geometry.dispose();
    if (bedTex.map) { bedTex.map.dispose(); bedTex.lines.dispose(); }
    Object.assign(bedTex, paintBed(E.renderer, M.map('stone', 1024, { srgb: true }), W));
    bedMat.map = bedTex.map; bedMat.emissiveMap = bedTex.lines; bedMat.needsUpdate = true;
    bed.geometry = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);

    const top = mitreGrain(rail(wi, hi, RAIL, -0.02, TOP, CORNER, 0.036), wi, hi), skirt = mitreGrain(rail(wi, hi, RAIL + STEP, -SKIRT, 0.03, CORNER, 0.04), wi, hi);
    woodMesh.geometry = bake([[top, frameAt(-0.02, TOP)], [skirt, frameAt(-SKIRT, 0.03)]]);
    top.dispose(); skirt.dispose();

    const Rc = CORNER + RAIL + STEP + 0.014, cx = wi / 2 - CORNER, cz = hi / 2 - CORNER, Xp = hw + OUT, Xt = Xp + 0.34;
    const cap = new THREE.ExtrudeGeometry(capShape(Rc, 0.3, 0.42), { depth: TOP + SKIRT + 0.012 - 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelOffset: -0.012, bevelSegments: 3, curveSegments: 20 });
    cap.translate(0, 0, -SKIRT);
    const inlay = rail(wi + 2 * RAIL * 0.46, hi + 2 * RAIL * 0.46, 0.04, TOP - 0.012, TOP + 0.002, CORNER + RAIL * 0.46, 0.002), head = screw(0.03);
    const plate = roundedBox(0.03, 0.36, 1.02, 0.012, 3), trim = [[inlay, frameAt(TOP - 0.012, TOP + 0.002)]];
    // The cap's shape lies in +x, +y, which lands on the table's +x, -z corner; each corner turns it about the normal.
    for (const [sx, sz, a] of [[1, -1, 0], [1, 1, -Math.PI / 2], [-1, 1, Math.PI], [-1, -1, Math.PI / 2]]) {
      trim.push([cap, place(cx * sx, 0, cz * sz, 0, a, 0).multiply(place(0, 0, 0, -Math.PI / 2))]);
      for (const [dx, dz] of [[0.34, 0.34], [0.46, 0.07], [0.07, 0.46]]) trim.push([head, place(sx * (cx + dx), TOP + 0.003, sz * (cz + dz))]);
    }
    for (const s of [-1, 1]) {
      trim.push([plate, place(s * (Xp + 0.012), 0, 0)]);
      for (const [y, z] of [[-0.12, -0.42], [0.12, -0.42], [-0.12, 0.42], [0.12, 0.42]]) trim.push([head, place(s * (Xp + 0.028), y, z, 0, 0, -s * Math.PI / 2)]);
    }

    const liner = rail(w, h, LINER, -0.03, LINER_TOP, 0.014, 0.008), pan = roundedBox(w + 2 * (OUT - 0.08), 0.1, h + 2 * (OUT - 0.08), 0.04, 3);
    const ribX = roundedBox(w + 2 * OUT - 0.5, 0.12, 0.14, 0.03, 2), ribZ = roundedBox(0.14, 0.12, h + 2 * OUT - 0.5, 0.03, 2), boss = turned([[0.3, 0], [0.31, 0.02], [0.24, 0.05], [0.16, 0.08], [0.15, 0.2], [0.17, 0.22], [0.17, 0.27], [0.12, 0.29], [0, 0.29]], 28, 4);
    const axle = new THREE.CylinderGeometry(0.1, 0.1, 0.82, 28), dome = turned([[0.13, 0], [0.135, 0.03], [0.11, 0.07], [0.06, 0.1], [0, 0.11]], 28, 5), needle = roundedBox(0.02, 0.036, 0.72, 0.008, 2);
    const steel = [[liner, frameAt(-0.03, LINER_TOP)], [pan, place(0, -SKIRT - 0.03, 0)]];
    for (const z of [-0.5, 0, 0.5]) steel.push([ribX, place(0, -SKIRT - 0.13, z * h * 0.92)]);
    for (const x of [-0.5, -0.25, 0.25, 0.5]) steel.push([ribZ, place(x * w * 0.96, -SKIRT - 0.13, 0)]);
    trim.push([boss, place(0, -SKIRT - 0.08, 0, Math.PI)]);
    for (const s of [-1, 1]) { steel.push([axle, place(s * (Xp + 0.4), 0, 0, 0, 0, Math.PI / 2)]); trim.push([dome, place(s * (Xt + 0.42), 0, 0, 0, 0, -s * Math.PI / 2)]); }
    trim.push([needle, place(Xt + 0.3, 0, 0.42)]);
    steelMesh.geometry = bake(steel); trimMesh.geometry = bake(trim);
    for (const g of [cap, inlay, head, plate, liner, pan, ribX, ribZ, boss, axle, dome, needle]) g.dispose();

    // The stand: two end castings on foot beams, tied by two tubes, with a quadrant on the right bearing.
    const cast = trestle(H), beam = roundedBox(0.52, 0.2, 3.5, 0.05, 4), tube = new THREE.CylinderGeometry(0.085, 0.085, 2 * Xt, 24);
    const stud = new THREE.CylinderGeometry(0.042, 0.042, 0.16, 16), pad = turned([[0, 0], [0.17, 0], [0.18, 0.022], [0.15, 0.05], [0.06, 0.075], [0.046, 0.09]], 32, 5);
    const nut = new THREE.CylinderGeometry(0.085, 0.085, 0.036, 6), collar = turned([[0.09, 0], [0.135, 0.008], [0.14, 0.03], [0.14, 0.09], [0.135, 0.112], [0.09, 0.12]], 28, 4);
    const bush = turned([[0.11, 0], [0.2, 0.004], [0.22, 0.02], [0.22, 0.05], [0.2, 0.066], [0.11, 0.07]], 32, 4), flange = turned([[0.16, 0], [0.33, 0.004], [0.345, 0.02], [0.345, 0.05], [0.33, 0.066], [0.16, 0.07]], 40, 4);
    const standBolt = screw(0.03), sector = new THREE.Shape(), tick = roundedBox(0.01, 0.012, 0.09, 0.003, 1), ticks = [];
    sector.absarc(0, 0, 0.84, -0.86, 0.1, false); sector.absarc(0, 0, 0.42, 0.1, -0.86, true);
    const plateQ = new THREE.ExtrudeGeometry(sector, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelOffset: -0.008, bevelSegments: 2, curveSegments: 24 }).rotateY(-Math.PI / 2);
    const standS = [], standB = [];
    for (const s of [-1, 1]) {
      standS.push([cast, place(s * Xt, 0, 0)], [beam, place(s * Xt, 0.22, 0)], [flange, place(s * (Xt + 0.14), H, 0, 0, 0, -Math.PI / 2)], [flange, place(s * (Xt - 0.14), H, 0, 0, 0, Math.PI / 2)]);
      standB.push([bush, place(s * (Xt + 0.19), H, 0, 0, 0, -Math.PI / 2)], [bush, place(s * (Xt - 0.19), H, 0, 0, 0, Math.PI / 2)]);
      for (const z of [-1.5, 1.5]) { standS.push([pad, place(s * Xt, 0, z)], [stud, place(s * Xt, 0.09, z)]); standB.push([nut, place(s * Xt, 0.092, z)]); }
      for (let k = 0; k < 6; k++) { const a = (k + 0.5) * Math.PI / 3; standB.push([standBolt, place(s * (Xt + 0.21), H + 0.265 * Math.sin(a), 0.265 * Math.cos(a), 0, 0, -Math.PI / 2)]); }
    }
    for (const z of [-0.56, 0.56]) { standS.push([tube, place(0, 0.98, z, 0, 0, Math.PI / 2)]); for (const s of [-1, 1]) standB.push([collar, place(s * (Xt - 0.11), 0.98, z, 0, 0, s * Math.PI / 2)]); }
    standB.push([plateQ, place(Xt + 0.27, H, 0)]);
    // Degrees of tilt, from level down to 45, read by the needle on the axle.
    for (let d = 0; d <= 45; d += 5) { const a = d * Math.PI / 180, r = d % 15 === 0 ? 0.74 : 0.77; ticks.push([tick, place(Xt + 0.274, H - Math.sin(a) * r, Math.cos(a) * r, a, 0, 0, 1, 1, d % 15 === 0 ? 1.5 : 0.8)]); }
    for (const a of [0.2, 0.62]) standB.push([standBolt, place(Xt + 0.276, H - Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0, 0, -Math.PI / 2)]);
    standSteel.geometry = bake([...standS, ...ticks]);
    standBrass.geometry = bake(standB);
    for (const g of [cast, beam, tube, stud, pad, nut, collar, bush, flange, standBolt, plateQ, tick]) g.dispose();
    pool.scale.set(2 * Xt + 3.4, 1, 6.4);
  }

  /* ---------- balls ---------- */
  const U = { uMark: { value: 0 } };
  const resin = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, specularIntensity: 0.6, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.95 });
  shadeBall(resin, U); resin.customProgramCacheKey = () => 'collisions-resin';
  const glow = new Float32Array(COLL_CAP), aGlow = new THREE.InstancedBufferAttribute(glow, 1).setUsage(THREE.DynamicDrawUsage);
  const spheres = new Map(), sphere = seg => {
    if (!spheres.has(seg)) { const g = new THREE.SphereGeometry(1, seg * 2, seg); g.setAttribute('aGlow', aGlow); spheres.set(seg, g); }
    return spheres.get(seg);
  };
  const balls = solid(new THREE.InstancedMesh(sphere(16), resin, COLL_CAP));
  balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage); balls.frustumCulled = false; balls.count = 0;
  balls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COLL_CAP * 3), 3).setUsage(THREE.DynamicDrawUsage);
  table.add(balls);

  const brassBall = M.brass().clone(); brassBall.color.set(0xe0b463); brassBall.roughness = 0.17; brassBall.clearcoat = 0.7; brassBall.clearcoatRoughness = 0.05; brassBall.envMapIntensity = 1.5;
  shadeBall(brassBall, U); brassBall.customProgramCacheKey = () => 'collisions-brass';
  const heroGeo = new THREE.SphereGeometry(1, 72, 48), hero = solid(new THREE.Mesh(heroGeo, brassBall)); hero.visible = false; table.add(hero);

  /* Contact decals: dark at the touch point, with the ball's colour bouncing off the bed around it. */
  const decalMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: { uBleed: { value: 0 } },
    vertexShader: 'varying vec2 vQ; varying vec3 vC; void main(){ vQ = uv * 2.0 - 1.0; vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vQ; varying vec3 vC; uniform float uBleed;
      void main(){
        float d = length(vQ), f = 1.0 - smoothstep(0.72, 1.0, d);
        float a = (0.72 * exp(-d * d * 16.0) + 0.5 * exp(-d * d * 4.5)) * f;
        vec3 c = vC * uBleed * exp(-pow((d - 0.42) * 4.2, 2.0)) * f;
        gl_FragColor = vec4(c, min(a, 0.92));
        #include <colorspace_fragment>
      }`,
  });
  const decalGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const decals = new THREE.InstancedMesh(decalGeo, decalMat, COLL_CAP);
  decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); decals.frustumCulled = false; decals.count = 0; decals.renderOrder = 1;
  decals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COLL_CAP * 3), 3).setUsage(THREE.DynamicDrawUsage);
  table.add(decals);

  /* The bed's reflection of the balls: each ball mirrored in the bed, then slid along the view ray onto it, so it
     lands exactly where a mirror would show it, tilted or not, and takes its depth from the bed. */
  const ghostMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uEye: { value: new THREE.Vector3() }, uGain: { value: 2.4 } },
    vertexShader: `uniform vec3 uEye; varying vec3 vC, vV; varying float vH;
      void main(){
        vec4 p = instanceMatrix * vec4(position, 1.0);
        vec3 m = vec3(p.x, -p.y, p.z), q = uEye + (m - uEye) * (uEye.y - 0.002) / (uEye.y - m.y);
        vC = instanceColor; vV = uEye - q; vH = p.y / instanceMatrix[1][1];
        gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
      }`,
    fragmentShader: `uniform float uGain; varying vec3 vC, vV; varying float vH;
      void main(){
        float F = 0.05 + 0.95 * pow(1.0 - clamp(normalize(vV).y, 0.0, 1.0), 4.0);
        gl_FragColor = vec4(vC * min(0.3, uGain * F) * pow(smoothstep(1.7, 0.1, vH), 1.6), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const ghosts = new THREE.InstancedMesh(sphere(10), ghostMat, 1);
  ghosts.instanceMatrix = balls.instanceMatrix; ghosts.instanceColor = balls.instanceColor;
  const heroGhost = new THREE.InstancedMesh(sphere(16), ghostMat, 1); heroGhost.count = 0;
  heroGhost.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
  for (const g of [ghosts, heroGhost]) { g.frustumCulled = false; g.renderOrder = 0.5; table.add(g); }
  const eye = new THREE.Vector3();

  /* A wall hit shows as a glint on the steel liner, sized by the speed the ball took off the wall. */
  const glintMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vQ; varying vec3 vC; void main(){ vQ = uv * 2.0 - 1.0; vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vQ; varying vec3 vC;
      void main(){
        float f = exp(-dot(vQ, vQ) * 5.0) - exp(-5.0);
        gl_FragColor = vec4(vC * max(f, 0.0), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const glints = new THREE.InstancedMesh(decalGeo, glintMat, GLINTS);
  glints.instanceMatrix.setUsage(THREE.DynamicDrawUsage); glints.frustumCulled = false; glints.count = 0; glints.renderOrder = 2;
  glints.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GLINTS * 3), 3).setUsage(THREE.DynamicDrawUsage);
  table.add(glints);
  const spark = new Float32Array(GLINTS * 5);    // x, z, x reach, z reach, life
  let sparkAt = 0, simT = 0;
  const emit = (x, z, along, p) => {
    const o = sparkAt * 5, L = 0.1 + 0.2 * p, W = 0.05;
    spark[o] = x; spark[o + 1] = z; spark[o + 2] = along ? L : W; spark[o + 3] = along ? W : L; spark[o + 4] = 0.35 + 0.65 * p;
    sparkAt = (sparkAt + 1) % GLINTS;
  };
  function syncGlints(P, dt) {
    const n = lab.n, X = lab.x, Y = lab.y, R = lab.r, VX = lab.vx, VY = lab.vy, k = P.k, w = lab.w, h = lab.h, step = lab.t - simT;
    simT = lab.t;
    if (!reduceMotion && step > 0 && step < 0.2) {
      let vs = 0;
      for (let i = 0; i < n; i++) vs += VX[i] * VX[i] + VY[i] * VY[i];
      const ref = 2.2 * Math.sqrt(vs / Math.max(1, n)) || 1, floor = Math.max(30, ref * 0.2), hw = P.hw + LINER / 2, hh = P.hh + LINER / 2;
      for (let i = 0; i < n; i++) {
        const r = R[i], vx = VX[i], vy = VY[i], x = (X[i] - P.cx) * k, z = (Y[i] - P.cy) * k;
        // Moving off a wall it could have reached since the last frame: the bounce itself is not recorded.
        if (vx > floor && X[i] - r < vx * step) emit(-hw, z, false, Math.min(1, vx / ref));
        else if (-vx > floor && w - X[i] - r < -vx * step) emit(hw, z, false, Math.min(1, -vx / ref));
        if (vy > floor && Y[i] - r < vy * step) emit(x, -hh, true, Math.min(1, vy / ref));
        else if (-vy > floor && h - Y[i] - r < -vy * step) emit(x, hh, true, Math.min(1, -vy / ref));
      }
    }
    const m = glints.instanceMatrix.array, c = glints.instanceColor.array;
    let live = 0;
    for (let g = 0; g < GLINTS; g++) {
      const o = g * 5;
      if (spark[o + 4] <= 0) continue;
      spark[o + 4] = Math.max(0, spark[o + 4] - dt / GLINT_LIFE);
      const a = spark[o + 4], b = a * a * 1.1, q = live * 16;
      m[q] = spark[o + 2]; m[q + 5] = 1; m[q + 10] = spark[o + 3]; m[q + 12] = spark[o]; m[q + 13] = LINER_TOP + 0.002; m[q + 14] = spark[o + 1]; m[q + 15] = 1;
      c[live * 3] = b; c[live * 3 + 1] = b * 0.82; c[live * 3 + 2] = b * 0.55;
      live++;
    }
    // The heat and cool brushes warm or chill the bed under them while they are held.
    const B = lab.brush, tool = lab.p.tool;
    if (B && (tool === 'heat' || tool === 'cool') && live < GLINTS) {
      const q = live * 16, s = 92 * k;
      m[q] = s; m[q + 5] = 1; m[q + 10] = s; m[q + 12] = (B.x - P.cx) * k; m[q + 13] = 0.006; m[q + 14] = (B.y - P.cy) * k; m[q + 15] = 1;
      if (tool === 'heat') { c[live * 3] = 0.34; c[live * 3 + 1] = 0.15; c[live * 3 + 2] = 0.03; } else { c[live * 3] = 0.05; c[live * 3 + 1] = 0.2; c[live * 3 + 2] = 0.27; }
      live++;
    }
    glints.count = live;
    flag(glints.instanceMatrix, live * 16); flag(glints.instanceColor, live * 3);
  }

  const trail = createRibbons(TRAIL_POINTS, { width: 1.7 }); trail.mesh.renderOrder = 2; table.add(trail.mesh);

  /* The lab's 24 heat bins as linear colours, and the bins themselves: draw() is not called here, so nothing it writes can be read. */
  const BINS = COLL_RGB.length, rampL = new Float32Array(BINS * 3), c0 = new THREE.Color();
  COLL_RGB.forEach((c, i) => { c0.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); rampL[i * 3] = c0.r; rampL[i * 3 + 1] = c0.g; rampL[i * 3 + 2] = c0.b; });
  const heroL = c0.setRGB(242 / 255, 165 / 255, 65 / 255, THREE.SRGBColorSpace).toArray([]);
  let seg = 0, reflective = false;
  function pickDetail(n, rmax) {
    const want = (rmax * 0.6 + 7.5) * (0.4 + 0.75 * E.tier.detail), cap = Math.sqrt(300000 * E.tier.detail / Math.max(40, n) / 4);
    let s = LOD[0];
    for (const v of LOD) if (v <= Math.min(want, cap)) s = v;
    if (s !== seg) { seg = s; balls.geometry = sphere(s); ghosts.geometry = sphere(Math.min(s, 12)); }
  }
  function syncBalls(P) {
    const n = lab.n, X = lab.x, Y = lab.y, R = lab.r, VX = lab.vx, VY = lab.vy, OM = lab.om, A = lab.ang, tr = lab.tracer, mode = lab.p.colorBy, k = P.k, cx = P.cx, cy = P.cy;
    let rmin = Infinity, rmax = 0, rtop = 1, v2 = 0, s2 = 0, ke = 0;
    for (let i = 0; i < n; i++) {
      const r = R[i], sp = VX[i] * VX[i] + VY[i] * VY[i];
      if (r < rmin) rmin = r;
      if (r > rmax) rmax = r;
      if (i !== tr && r > rtop) rtop = r;
      v2 += sp; s2 += (OM[i] * r) ** 2; ke += r * r * sp;
    }
    pickDetail(n, rtop);
    const vref = 2.2 * Math.sqrt(v2 / Math.max(1, n)) || 1, sref = 2.2 * Math.sqrt(s2 / Math.max(1, n)) || 1, eref = 5 * ke / Math.max(1, n) || 1;
    U.uMark.value = lab.p.mu > 0 || s2 / Math.max(1, n) > 4 ? 1 : 0;
    const mb = balls.instanceMatrix.array, cb = balls.instanceColor.array, md = decals.instanceMatrix.array, cd = decals.instanceColor.array;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const r = R[i] * k, x = (X[i] - cx) * k, z = (Y[i] - cy) * k, sp = Math.hypot(VX[i], VY[i]);
      const t = mode === 'speed' ? sp / vref : mode === 'spin' ? Math.abs(OM[i] * R[i]) / sref : (rmax > rmin ? (R[i] - rmin) / (rmax - rmin) : 0.5);
      const b = Math.min(BINS - 1, (t * BINS) | 0) * 3, hot = i === tr, cr = hot ? heroL[0] : rampL[b], cg = hot ? heroL[1] : rampL[b + 1], cl = hot ? heroL[2] : rampL[b + 2];
      const q = i * 16, s = r * DECAL_REACH;
      md[q] = s; md[q + 5] = 1; md[q + 10] = s; md[q + 12] = x - 0.1 * r; md[q + 13] = 0.004; md[q + 14] = z + 0.06 * r; md[q + 15] = 1;
      cd[i * 3] = cr; cd[i * 3 + 1] = cg; cd[i * 3 + 2] = cl;
      if (hot) { hero.position.set(x, r, z); hero.scale.setScalar(r); hero.rotation.y = -A[i]; continue; }
      const cs = Math.cos(A[i]) * r, sn = Math.sin(A[i]) * r, o = c * 16;
      mb[o] = cs; mb[o + 1] = 0; mb[o + 2] = sn; mb[o + 3] = 0; mb[o + 4] = 0; mb[o + 5] = r; mb[o + 6] = 0; mb[o + 7] = 0;
      mb[o + 8] = -sn; mb[o + 9] = 0; mb[o + 10] = cs; mb[o + 11] = 0; mb[o + 12] = x; mb[o + 13] = r; mb[o + 14] = z; mb[o + 15] = 1;
      cb[c * 3] = cr; cb[c * 3 + 1] = cg; cb[c * 3 + 2] = cl;
      glow[c] = Math.min(1, R[i] * R[i] * sp * sp / eref) * 0.32;
      c++;
    }
    hero.visible = tr >= 0;
    balls.count = ghosts.count = c; decals.count = n;
    if (tr >= 0) {
      heroGhost.count = 1; hero.updateMatrix(); heroGhost.instanceMatrix.array.set(hero.matrix.elements); heroGhost.instanceMatrix.needsUpdate = true;
      heroGhost.instanceColor.array.set(heroL); heroGhost.instanceColor.needsUpdate = true;
    } else heroGhost.count = 0;
    flag(balls.instanceMatrix, c * 16); flag(balls.instanceColor, c * 3); flag(aGlow, c); flag(decals.instanceMatrix, n * 16); flag(decals.instanceColor, n * 3);
  }
  function syncTrail(view, P) {
    trail.setResolution(view.w * view.pr, view.h * view.pr); trail.begin();
    const tn = lab.tn, T = lab.trail, k = P.k;
    if (lab.tracer >= 0 && tn > 1) {
      for (let c = 0; c < tn; c++) {
        const i = (lab.th - tn + c + 900) % 900, f = c / (tn - 1);
        trail.point((T[i * 2] - P.cx) * k, 0.012, (T[i * 2 + 1] - P.cy) * k, 1.1, 0.62, 0.2, 0.2 + 0.65 * f * f, 0.7 + 0.8 * f);
      }
      trail.point((lab.x[lab.tracer] - P.cx) * k, 0.012, (lab.y[lab.tracer] - P.cy) * k, 1.1, 0.62, 0.2, 0.85, 1.5);
      trail.strip();
    }
    trail.end();
  }

  return {
    scene, studio, exposure: 1, bloom: { strength: 0.12, radius: 0.5, threshold: 1 },
    sync(l, view) {
      lab.ease3(view.dt);
      layout();
      const P = lab.plane3();
      table.position.set(P.o[0], P.o[1], P.o[2]); table.rotation.x = P.a; table.updateMatrixWorld();
      eye.copy(view.camera.position); table.worldToLocal(eye); ghostMat.uniforms.uEye.value.copy(eye);
      ghosts.visible = heroGhost.visible = reflective && eye.y > 0.05;
      syncBalls(P); syncGlints(P, view.dt); syncTrail(view, P);
    },
    onTier(tier) { reflective = tier.reflect > 0; decalMat.uniforms.uBleed.value = reflective ? 0.22 : 0.14; },
    dispose() {
      studio.dispose(); fill.dispose(); trail.dispose(); resin.dispose(); brassBall.dispose(); blacked.dispose(); bedMat.dispose(); walnut.dispose(); trimBrass.dispose(); decalMat.dispose(); glintMat.dispose(); ghostMat.dispose(); poolMat.dispose(); poolTex.dispose();
      for (const g of spheres.values()) g.dispose();
      for (const m of [woodMesh, trimMesh, steelMesh, bed, standSteel, standBrass]) if (m.geometry !== none) m.geometry.dispose();
      heroGeo.dispose(); decalGeo.dispose(); poolGeo.dispose(); none.dispose();
      if (bedTex.map) { bedTex.map.dispose(); bedTex.lines.dispose(); }
      heroGhost.dispose(); balls.dispose(); decals.dispose(); glints.dispose();
    },
  };
}
