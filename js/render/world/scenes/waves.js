/*
✒ Metadata
    - Title: Waves Scene (digiSpace Edition - v2.1)
    - File Name: waves.js
    - Relative Path: js/render/world/scenes/waves.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: the wave grid as a real ripple tank on a stand.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The waves lab in the 3D mode: a walnut-clad tray with a ceramic bed on
    brass legs and a slate plinth, filled with clear teal water. The solver's
    grid displaces the water and lights the bed through it, as a real ripple
    tank projects its waves.
    Everything the lab simulates exists as an object: barriers stand in the
    water, glass is a shallow slab on the bed, sources are brass dippers.

✒ Key Features:
    - Water displaced in the vertex shader from a float texture, normals per
      fragment, the studio's light and environment on top, the bed refracted
      through it with Beer-Lambert absorption.
    - Caustics by the area ratio of refracted grid cells, added into a small
      target; a Laplacian estimate on the low tier and none on lite.
    - A planar mirror pass of everything above the water, on tiers with floor
      reflections.
    - Barriers traced from the wall mask into one bevelled solid, rebuilt only
      when the mask changes.
    - Foam on the absorbing band is part of the water sheet, so it rides the
      waves that die in it.
    - A detector rail in the water and a screen on the rim that shows the
      time-averaged intensity as glowing bars.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map; WebGL 2
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { RAMP_GLOW } from '../../../core/color.js';
import { reduceMotion } from '../../../core/util.js';
import { canvasTexture, fbmField, paint } from '../materials.js';
import { bolt, ringFrame, rodGeometry, rodMatrix, roundedBox, turned } from '../shapes.js';
import { createStudio } from '../studio.js';

const RIM = 0.42, ARM = 0.7, BOARD = 1.3, KEY = [3.2, 13.5, -11], THROW = 2.4;

/* ---------- barriers: the wall mask traced into one bevelled solid ---------- */
/* Closed loops along cell borders, solid on the right, as flat [x, y, …] lists of corners. */
function traceLoops(mask, Nx, Ny) {
  const W = Nx + 1, n = W * (Ny + 1), a = new Int8Array(n).fill(-1), b = new Int8Array(n).fill(-1), loops = [];
  const put = (v, d) => { if (a[v] < 0) a[v] = d; else b[v] = d; };
  const solid = (x, y) => x >= 0 && y >= 0 && x < Nx && y < Ny && mask[y * Nx + x];
  for (let y = 0; y < Ny; y++) for (let x = 0; x < Nx; x++) {
    if (!mask[y * Nx + x]) continue;
    const v = y * W + x;
    if (!solid(x, y - 1)) put(v, 0);
    if (!solid(x + 1, y)) put(v + 1, 1);
    if (!solid(x, y + 1)) put(v + W + 1, 2);
    if (!solid(x - 1, y)) put(v + W, 3);
  }
  const step = [1, W, -1, -W];
  for (let s = 0; s < n; s++) while (a[s] >= 0 || b[s] >= 0) {
    const pts = [];
    let v = s, d = -1;
    do {
      let nd = a[v];
      if (nd < 0) { nd = b[v]; b[v] = -1; if (nd < 0) break; }
      else if (b[v] >= 0 && b[v] === ((d + 1) & 3)) { nd = b[v]; b[v] = -1; } // a saddle: keep to the same cell
      else { a[v] = b[v]; b[v] = -1; }
      if (nd !== d) pts.push(v % W, (v - v % W) / W);
      d = nd; v += step[d];
    } while (v !== s);
    if (pts.length >= 6) loops.push(pts);
  }
  return loops;
}
/* Douglas-Peucker on a closed loop: stair steps collapse to their diagonal, real corners stay. */
function simplify(p, eps) {
  const n = p.length / 2;
  if (n < 5) return p;
  let far = 0, top = -1;
  for (let i = 1; i < n; i++) { const d = (p[i * 2] - p[0]) ** 2 + (p[i * 2 + 1] - p[1]) ** 2; if (d > top) { top = d; far = i; } }
  const keep = new Uint8Array(n), stack = [0, far, far, n];
  keep[0] = keep[far] = 1;
  while (stack.length) {
    const e = stack.pop(), s = stack.pop();
    if (e - s < 2) continue;
    const ax = p[s * 2], ay = p[s * 2 + 1], bx = p[(e % n) * 2], by = p[(e % n) * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let at = -1, best = eps;
    for (let i = s + 1; i < e; i++) { const d = Math.abs((p[i * 2] - ax) * dy - (p[i * 2 + 1] - ay) * dx) / L; if (d > best) { best = d; at = i; } }
    if (at >= 0) { keep[at] = 1; stack.push(s, at, at, e); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(p[i * 2], p[i * 2 + 1]);
  return out;
}
/* Replace each corner with a short curve, so no edge of the solid is a knife. */
function roundLoop(p, r, seg = 3) {
  const n = p.length / 2, out = [];
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, c = (i + 1) % n, x = p[i * 2], y = p[i * 2 + 1];
    const ux = p[a * 2] - x, uy = p[a * 2 + 1] - y, vx = p[c * 2] - x, vy = p[c * 2 + 1] - y, L1 = Math.hypot(ux, uy), L2 = Math.hypot(vx, vy), d = Math.min(r, L1 * 0.45, L2 * 0.45);
    const ax = x + ux / L1 * d, ay = y + uy / L1 * d, bx = x + vx / L2 * d, by = y + vy / L2 * d;
    for (let k = 0; k <= seg; k++) { const t = k / seg, s = 1 - t; out.push(s * s * ax + 2 * s * t * x + t * t * bx, s * s * ay + 2 * s * t * y + t * t * by); }
  }
  return out;
}
const loopArea = p => { let s = 0; for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; s += p[i] * p[j + 1] - p[j] * p[i + 1]; } return s / 2; };
function insideLoop(x, y, p) {
  let on = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) on = !on;
  return on;
}
/* A profile swept around every loop (flank, then a rolled bevel), capped by triangulating the top ring. */
function wallGeometry(mask, Nx, Ny, hw, hh, floor, top, bevel) {
  const cx = 2 * hw / Nx, cz = 2 * hh / Ny;
  const loops = traceLoops(mask, Nx, Ny).map(raw => {
    const p = roundLoop(simplify(raw, 0.72), 0.85);
    for (let i = 0; i < p.length; i += 2) { p[i] = (p[i] - 0.5) * cx - hw; p[i + 1] = (p[i + 1] - 0.5) * cz - hh; }
    return { p, area: loopArea(p), holes: [], base: 0 };
  });
  const outers = loops.filter(l => l.area > 0);
  for (const h of loops) {
    if (h.area > 0) continue;
    let best = null;
    for (const o of outers) if ((!best || o.area < best.area) && insideLoop(h.p[0], h.p[1], o.p)) best = o;
    if (best) best.holes.push(h);
  }
  const pos = [], nor = [], uv = [], idx = [];
  const rings = [[0, floor, 1, 0], [0, top - bevel, 1, 0]];
  for (let k = 1; k <= 3; k++) { const a = k / 3 * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); rings.push([bevel * (c - 1), top - bevel + bevel * s, c, s]); }
  const R = rings.length;
  for (const l of loops) {
    const p = l.p, n = p.length / 2;
    l.base = pos.length / 3;
    let run = 0;
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, c = (i + 1) % n, x = p[i * 2], z = p[i * 2 + 1];
      const e1x = x - p[a * 2], e1z = z - p[a * 2 + 1], e2x = p[c * 2] - x, e2z = p[c * 2 + 1] - z, L1 = Math.hypot(e1x, e1z) || 1, L2 = Math.hypot(e2x, e2z) || 1;
      // Solid lies right of travel, so outward is the left-hand normal.
      let nx = e1z / L1 + e2z / L2, nz = -e1x / L1 - e2x / L2; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
      for (const [off, y, ns, ny] of rings) {
        pos.push(x + nx * off, y, z + nz * off); nor.push(nx * ns, ny, nz * ns);
        if (ny > 0.999) uv.push(x * 0.4, z * 0.4); else uv.push(run * 0.4, y * 0.4);
      }
      run += L2;
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      for (let r = 0; r < R - 1; r++) {
        const a = l.base + i * R + r, b = l.base + j * R + r, c = b + 1, d = a + 1;
        idx.push(a, c, b, a, d, c);
      }
    }
  }
  const capV = q => {
    const out = [], n = q.p.length / 2;
    for (let i = 0; i < n; i++) { const v = q.base + i * R + R - 1; out.push(new THREE.Vector2(pos[v * 3], pos[v * 3 + 2])); }
    return out;
  };
  for (const o of outers) {
    const contour = capV(o), holes = o.holes.map(capV), map = [];
    const push = q => { const n = q.p.length / 2; for (let i = 0; i < n; i++) map.push(q.base + i * R + R - 1); };
    push(o); o.holes.forEach(push);
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, holes)) {
      const A = map[a], B = map[b], C = map[c], ax = pos[A * 3], az = pos[A * 3 + 2];
      const up = (pos[B * 3 + 2] - az) * (pos[C * 3] - ax) - (pos[B * 3] - ax) * (pos[C * 3 + 2] - az);
      if (up > 0) idx.push(A, B, C); else idx.push(A, C, B);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* ---------- surfaces painted once ---------- */
/* Pale glazed ceramic with an etched cell grid. Lines fall on the lab's own cells, so the bed is a ruler. */
function paintBed(Nx, Ny, renderer) {
  const W = 2048, H = Math.max(64, Math.round(W * Ny / Nx)), c = document.createElement('canvas'), g = c.getContext('2d'), sx = W / Nx, sy = H / Ny;
  c.width = W; c.height = H;
  g.fillStyle = '#ece7db'; g.fillRect(0, 0, W, H);
  const f = fbmField(61, 5, 5), mottle = paint(256, (u, v) => { const t = 214 + f(u, v) * 62; return [t, t * 0.985, t * 0.96]; });
  g.globalCompositeOperation = 'multiply'; g.drawImage(mottle, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
  const line = (x0, y0, x1, y1, w, a) => { g.strokeStyle = `rgba(52,74,88,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  for (let i = 0; i <= Nx; i += 10) { const major = i % 50 === 0; line(i * sx, 0, i * sx, H, major ? 2.4 : 1, major ? 0.62 : 0.3); }
  for (let j = 0; j <= Ny; j += 10) { const major = j % 50 === 0; line(0, j * sy, W, j * sy, major ? 2.4 : 1, major ? 0.62 : 0.3); }
  g.fillStyle = 'rgba(52,74,88,0.62)'; g.font = `500 ${Math.round(sy * 3.4)}px "IBM Plex Mono", monospace`; g.textBaseline = 'top';
  for (let i = 50; i < Nx; i += 50) for (let j = 50; j < Ny; j += 50) g.fillText(`${i}·${j}`, i * sx + sx, j * sy + sy);
  const t = canvasTexture(c, { renderer, srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false;
  return t;
}
/* Open cells: tiling Worley noise, pale on the cell walls and dark in the pores. */
function paintFoam(renderer) {
  const n = 22, pts = new Float32Array(n * n * 2);
  let s = 9731;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < pts.length; i++) pts[i] = rnd();
  const c = paint(384, (u, v) => {
    const x = u * n, y = v * n, cx = Math.floor(x), cy = Math.floor(y);
    let d1 = 9, d2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const X = (cx + i + n) % n, Y = (cy + j + n) % n, px = cx + i + pts[(Y * n + X) * 2], py = cy + j + pts[(Y * n + X) * 2 + 1], d = (px - x) ** 2 + (py - y) ** 2;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const t = 255 * Math.min(1, Math.max(0, 1.5 - (Math.sqrt(d2) - Math.sqrt(d1)) * 3.4));
    return [t, t, t];
  });
  return canvasTexture(c, { renderer });
}
/* An engraved scale in cells, for the rim. */
function paintRuler(cells, renderer) {
  const W = 2048, H = 72, c = document.createElement('canvas'), g = c.getContext('2d'), sx = W / cells;
  c.width = W; c.height = H;
  g.strokeStyle = g.fillStyle = 'rgba(231,204,150,1)'; g.font = '500 30px "IBM Plex Mono", monospace'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
  for (let i = 0; i <= cells; i += 5) {
    const major = i % 50 === 0, mid = i % 10 === 0;
    g.lineWidth = major ? 3 : 1.6; g.beginPath(); g.moveTo(i * sx, 0); g.lineTo(i * sx, major ? 30 : mid ? 20 : 12); g.stroke();
    if (major && i > 0 && i < cells) g.fillText(String(i), i * sx, 66);
  }
  const t = canvasTexture(c, { renderer, srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- shaders ---------- */
const SURFACE = `
  uniform sampler2D tU; uniform vec2 uK, uO, uHalf, uCell; uniform float uH, uGain, uFoam, uFoamW;
  float wave(vec2 q) { float v = texture2D(tU, q * uK + uO).r * uGain; return uH * v / (1.0 + abs(v)); }
  /* 0 on open water, 1 past the lip of the foam; the lip wanders so it never reads as ruled. */
  float lipOf(vec2 q) {
    vec2 d = uHalf - abs(q);
    float e = min(d.x, d.y) + 0.012 * sin(q.x * 9.0 + 1.7 * sin(q.y * 5.0)) + 0.01 * sin(q.y * 11.0 + 1.3 * sin(q.x * 7.0));
    return clamp((uFoamW * uFoam - e) / 0.13, 0.0, 1.0);
  }
  float srf(vec2 q) { float t = lipOf(q); return wave(q) * (1.0 - 0.6 * t) + 0.085 * t * t * (3.0 - 2.0 * t); }`;

const WATER_PARS = `
  varying vec3 vW;
  uniform sampler2D tMask, tBed, tInt, tRamp, tFoam;
  #if CAUSTIC == 2
    uniform sampler2D tCau;
  #endif
  #if MIRROR
    uniform sampler2D tMir; uniform mat4 uMirM;
  #endif
  uniform float uY0, uDepth, uShallow, uInt, uLap, uAmb, uSun;
  uniform vec3 uSigma, uSky, uSlant;
  vec3 nW; float foam, frez;
  vec3 litBed(vec2 q) {
    vec2 uv = q * uK + 0.5, c = q * uK + uO;
    float light = uSun;
    #if CAUSTIC == 2
      light *= pow(texture2D(tCau, uv).r, 1.3);
    #else
      light *= 1.0 - 0.75 * smoothstep(0.05, 0.6, texture2D(tMask, (q + uSlant.xz) * uK + uO).b);
    #endif
    #if CAUSTIC == 1
      vec2 e = uCell * uK;
      float l = texture2D(tU, c + vec2(e.x, 0.0)).r + texture2D(tU, c - vec2(e.x, 0.0)).r + texture2D(tU, c + vec2(0.0, e.y)).r + texture2D(tU, c - vec2(0.0, e.y)).r - 4.0 * texture2D(tU, c).r;
      float x = uLap * l;
      light *= pow(clamp(1.0 - x / (1.0 + 0.35 * abs(x)), 0.05, 3.0), 1.4);
    #endif
    vec2 d = uHalf - abs(q);
    float ao = smoothstep(-0.02, 0.5, min(d.x, d.y));
    float pool = 1.0 - 0.34 * smoothstep(0.15, 1.15, length(q * uK * 2.0));
    return texture2D(tBed, uv).rgb * (uAmb + light * pool) * (0.5 + 0.5 * ao);
  }
  /* Follow the refracted ray down: a barrier's flank, the slab's top or edge, or the bed. */
  vec3 below(vec3 p, vec3 r) {
    float down = max(-r.y, 0.1), tBed = (p.y - uY0 + uDepth) / down, tTop = (p.y - uY0 + uShallow) / down, t = tBed, wall = 0.0;
    for (int i = 1; i <= STEPS; i++) {
      float s = tBed * float(i) / float(STEPS);
      if (texture2D(tMask, (p.xz + r.xz * s) * uK + uO).r > 0.5) { wall = 1.0; t = s; break; }
    }
    vec3 c;
    if (wall > 0.5) c = vec3(0.035, 0.045, 0.052) * (0.6 + 2.2 * smoothstep(uDepth, 0.0, r.y * -t)) * (uAmb + uSun);
    else {
      vec3 top = p + r * tTop;
      float g = smoothstep(0.46, 0.54, texture2D(tMask, top.xz * uK + uO).a), side = smoothstep(0.46, 0.54, texture2D(tMask, (p.xz + r.xz * tBed) * uK + uO).a) * (1.0 - g);
      c = litBed(p.xz + r.xz * tBed);
      if (g + side > 0.0) {
        vec3 r2 = refract(r, vec3(0.0, 1.0, 0.0), 0.875);
        vec3 slab = litBed(top.xz + r2.xz * (uDepth - uShallow) / max(-r2.y, 0.1)) * vec3(0.74, 0.96, 0.9);
        c = mix(c, vec3(0.32, 0.88, 0.76) * (uAmb + uSun) * 0.7, side);
        c = mix(c, slab, g) + vec3(0.16, 0.42, 0.36) * (uAmb + uSun) * 4.0 * g * (1.0 - g);
        t = mix(t, tTop, g);
      }
    }
    return c * exp(-uSigma * t) + uSky * (1.0 - exp(-t * 1.6));
  }`;

const FRAG_SURFACE = `
  vec2 q = vW.xz;
  { float hL = srf(q - vec2(uCell.x, 0.0)), hR = srf(q + vec2(uCell.x, 0.0)), hB = srf(q - vec2(0.0, uCell.y)), hT = srf(q + vec2(0.0, uCell.y));
    nW = normalize(vec3((hL - hR) / (2.0 * uCell.x), 1.0, (hB - hT) / (2.0 * uCell.y))); }
  foam = smoothstep(0.02, 0.5, lipOf(q));
  if (foam > 0.0) {
    vec2 f = q * 1.9, ep = vec2(0.004, 0.0);
    float a = texture2D(tFoam, f).r * 0.6 + texture2D(tFoam, f * 2.6 + 0.37).r * 0.4;
    float ax = texture2D(tFoam, f + ep.xy).r * 0.6 + texture2D(tFoam, (f + ep.xy) * 2.6 + 0.37).r * 0.4;
    float ay = texture2D(tFoam, f + ep.yx).r * 0.6 + texture2D(tFoam, (f + ep.yx) * 2.6 + 0.37).r * 0.4;
    diffuseColor.rgb = vec3(0.016, 0.02, 0.024) * (1.4 - a) * foam;
    nW = normalize(mix(nW, normalize(nW + vec3(a - ax, 0.0, a - ay) * 5.0), foam));
  }`;

const FRAG_LIGHT = `
  reflectedLight.directSpecular = mix(min(reflectedLight.directSpecular * 0.3, vec3(0.9)), reflectedLight.directSpecular, foam);
  // The warm softbox would stain the dark troughs rust, so the water mirrors the room as a cool tone.
  reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, dot(reflectedLight.indirectSpecular, vec3(0.3, 0.6, 0.1)) * vec3(0.72, 0.9, 1.0), 1.0 - foam);
  vec3 eyeW = normalize(cameraPosition - vW);
  frez = 0.02 + 0.98 * pow(1.0 - clamp(dot(nW, eyeW), 0.0, 1.0), 5.0);
  #if MIRROR
    vec4 mc = uMirM * vec4(vW.x, uY0, vW.z, 1.0);
    vec4 ms = texture2D(tMir, mc.xy / mc.w + nW.xz * vec2(0.09, 0.05));
    reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, ms.rgb * min(frez * 1.6 + 0.05, 1.0), ms.a * (1.0 - foam));
  #endif`;

const FRAG_LIGHT_OUT = `
  { vec3 sub = below(vW, refract(-eyeW, nW, 0.7519));
    if (uInt > 0.002) {
      float I = texture2D(tInt, q * uK + uO).r, a = pow(1.0 - exp(-sqrt(max(I, 0.0)) * uGain * 1.4), 0.7);
      vec3 g = texture2D(tRamp, vec2(a, 0.5)).rgb;
      sub = mix(sub, sub * 0.05 + g * (0.85 + 0.4 * a), uInt);
    }
    float near = 1.0 - 0.55 * smoothstep(0.1, 0.9, texture2D(tMask, q * uK + uO).b);
    outgoingLight += sub * near * (1.0 - frez) * (1.0 - foam); }`;

const CAUSTIC_VERT = `${SURFACE}
  uniform sampler2D tMask; uniform float uDepth, uShallow, uThrow; uniform vec3 uL;
  varying vec3 vOld, vNew; varying float vLit;
  void main() {
    vec2 q = position.xy * uHalf * 1.12, b = abs(q) - uHalf;
    float h = wave(q), hx = wave(q + vec2(uCell.x, 0.0)) - wave(q - vec2(uCell.x, 0.0)), hz = wave(q + vec2(0.0, uCell.y)) - wave(q - vec2(0.0, uCell.y));
    vec3 N = normalize(vec3(-hx / (2.0 * uCell.x), 1.0, -hz / (2.0 * uCell.y)));
    vec4 m = texture2D(tMask, q * uK + uO);
    float D = mix(uDepth, uShallow, smoothstep(0.4, 0.6, m.a));
    vec3 flat0 = refract(-uL, vec3(0.0, 1.0, 0.0), 0.7519), bent = refract(-uL, N, 0.7519);
    vOld = vec3(q.x, 0.0, q.y) + flat0 * (D / -flat0.y);
    vNew = vec3(q.x, h, q.y) + bent * ((D + h) / -bent.y);
    vNew = vOld + (vNew - vOld) * uThrow;
    vLit = (1.0 - smoothstep(0.3, 0.7, m.r)) * step(max(b.x, b.y), 0.0);
    gl_Position = vec4(vNew.xz / uHalf, 0.0, 1.0);
  }`;
const CAUSTIC_FRAG = `
  varying vec3 vOld, vNew; varying float vLit;
  void main() {
    vec2 ox = dFdx(vOld.xz), oy = dFdy(vOld.xz), nx = dFdx(vNew.xz), ny = dFdy(vNew.xz);
    float c = abs(ox.x * oy.y - ox.y * oy.x) / max(abs(nx.x * ny.y - nx.y * ny.x), 1e-10);
    gl_FragColor = vec4(vec3(min(c, 10.0) * vLit), 1.0);
  }`;
/* A small Gaussian softens the fold lines, which would otherwise show the grid's own triangles. */
const BLUR_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BLUR_FRAG = `
  varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uStep;
  void main() {
    float c = texture2D(tSrc, vUv).r * 0.227;
    c += (texture2D(tSrc, vUv + uStep * 1.385).r + texture2D(tSrc, vUv - uStep * 1.385).r) * 0.316;
    c += (texture2D(tSrc, vUv + uStep * 3.231).r + texture2D(tSrc, vUv - uStep * 3.231).r) * 0.07;
    gl_FragColor = vec4(vec3(c), 1.0);
  }`;

const SCREEN_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SCREEN_FRAG = `
  varying vec2 vUv; uniform sampler2D tDet, tRamp; uniform float uBars, uTicks;
  void main() {
    vec2 uv = vUv; uv.y = (uv.y - 0.06) / 0.88;
    float b = uv.x * uBars, i = floor(b), f = fract(b), aa = fwidth(b) + 1e-4;
    float v = texture2D(tDet, vec2((i + 0.5) / uBars, 0.5)).r, curve = texture2D(tDet, vec2(uv.x, 0.5)).r;
    float bar = step(uv.y, v) * smoothstep(0.0, aa * 1.5, f - 0.1) * smoothstep(0.0, aa * 1.5, 0.9 - f) * step(0.0, uv.y);
    float seg = 0.72 + 0.28 * smoothstep(0.1, 0.25, fract(uv.y * 30.0));
    float tone = 0.3 + 0.7 * (0.35 * uv.y + 0.65 * v);
    vec3 col = texture2D(tRamp, vec2(tone, 0.5)).rgb * (0.7 + 1.7 * uv.y * uv.y + 0.9 * v);
    float wd = fwidth(uv.y) * 1.2 + fwidth(curve) * 0.7, trace = 1.0 - smoothstep(0.0, wd + 0.002, abs(uv.y - curve));
    float halo = exp(-max(uv.y - curve, 0.0) * 16.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    vec2 g = abs(fract(vec2(uv.x * uTicks, uv.y * 5.0) + 0.5) - 0.5) / max(fwidth(vec2(uv.x * uTicks, uv.y * 5.0)), vec2(1e-4));
    float grid = 1.0 - min(min(g.x, g.y), 1.0);
    vec3 c = vec3(0.012, 0.017, 0.024) + vec3(0.09, 0.2, 0.24) * grid * 0.22;
    c += col * bar * seg + vec3(0.95, 0.55, 0.2) * halo * 0.1 * curve + vec3(1.05, 0.86, 0.6) * trace * step(0.004, curve);
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const fieldTexture = (data, w, h) => {
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType);
  // R16F takes float uploads and, unlike R32F, filters on every WebGL 2 device.
  t.internalFormat = 'R16F'; t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
};

/* The Reflector's oblique near plane: keeps what lies under the water out of the mirror. */
const clipBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const plane4 = new THREE.Vector4(), qv = new THREE.Vector4(), N_UP = new THREE.Vector3(0, 1, 0), mPlane = new THREE.Plane();

export function createScene(E, lab) {
  const studio = createStudio(E, {
    keyPos: KEY, keyColor: 0xf3f1ea, keyTarget: [0, 1.2, 0], key: 560, keyAngle: 0.5, shadowSpan: 40, fog: 0.02,
    dome: { glowDir: [0.25, 0.16, -1], glow: 0x14283a, glowPow: 6 }, envLook: { power: 1.1 }, floor: { color: 0x090b0f, repeat: 6, reflect: 0.9, f0: 0.07, env: 0.035, roughness: 0.8, metalness: 0.05 },
  });
  const { scene } = studio, M = E.mats, T3 = lab.tank3;
  const above = new THREE.Group(), below = new THREE.Group(); scene.add(above, below);
  const lightDir = new THREE.Vector3(KEY[0], KEY[1] - 1.2, KEY[2]).normalize();
  // The key is behind the tank for the glints on the water; this fills the side that faces the viewer.
  const fill = new THREE.SpotLight(0xdce8f4, 210, 0, 0.9, 1, 2);
  fill.position.set(-7, 7, 12); fill.target.position.set(0, 1, 0);
  scene.add(fill, fill.target);

  /* Shared uniforms: the water and the caustic pass read the same grid. */
  const U = {
    tU: { value: null }, tMask: { value: null }, tBed: { value: null }, tInt: { value: null }, tRamp: { value: null }, tFoam: { value: null }, tCau: { value: null }, tMir: { value: null },
    uMirM: { value: new THREE.Matrix4() }, uK: { value: new THREE.Vector2() }, uO: { value: new THREE.Vector2() }, uHalf: { value: new THREE.Vector2() }, uCell: { value: new THREE.Vector2() },
    uH: { value: 0.05 }, uGain: { value: 1 }, uFoam: { value: 1 }, uFoamW: { value: 0.5 }, uY0: { value: 0 }, uDepth: { value: T3.depth }, uShallow: { value: T3.shallow }, uThrow: { value: THROW }, uInt: { value: 0 }, uLap: { value: 1 },
    uAmb: { value: 0.1 }, uSun: { value: 0.46 }, uSigma: { value: new THREE.Vector3(4.6, 1.3, 1.05) }, uSky: { value: new THREE.Vector3(0.005, 0.03, 0.04) }, uSlant: { value: new THREE.Vector3() }, uL: { value: lightDir },
  };
  const rampData = new Uint8Array(RAMP_GLOW.n * 4);
  for (let i = 0; i < RAMP_GLOW.n; i++) { rampData[i * 4] = RAMP_GLOW.rgb[i * 3]; rampData[i * 4 + 1] = RAMP_GLOW.rgb[i * 3 + 1]; rampData[i * 4 + 2] = RAMP_GLOW.rgb[i * 3 + 2]; rampData[i * 4 + 3] = 255; }
  const ramp = new THREE.DataTexture(rampData, RAMP_GLOW.n, 1, THREE.RGBAFormat);
  ramp.colorSpace = THREE.SRGBColorSpace; ramp.minFilter = ramp.magFilter = THREE.LinearFilter; ramp.wrapS = ramp.wrapT = THREE.ClampToEdgeWrapping; ramp.needsUpdate = true;
  U.tRamp.value = ramp;
  const foamTex = U.tFoam.value = paintFoam(E.renderer);

  /* The water. */
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.07, ior: 1.33, envMap: studio.env, envMapIntensity: 0.6 });
  // The softboxes tip toward the far side for the water alone, so it has something bright to mirror at the usual view.
  waterMat.envMapRotation.set(-0.62, 0, 0);
  waterMat.defines = { ...waterMat.defines, CAUSTIC: 2, MIRROR: 1, STEPS: 5 };
  waterMat.customProgramCacheKey = () => 'waves-water';
  waterMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${SURFACE}\nvarying vec3 vW;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += srf(position.xz);\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${SURFACE}\n${WATER_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_SURFACE}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.88, foam);')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); nonPerturbedNormal = normal;')
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${FRAG_LIGHT}`)
      .replace('#include <opaque_fragment>', `${FRAG_LIGHT_OUT}\n#include <opaque_fragment>`);
  };
  const water = new THREE.Mesh(new THREE.BufferGeometry(), waterMat);
  water.frustumCulled = false; water.receiveShadow = true;
  scene.add(water);

  /* The caustic pass: its own little scene, one grid drawn in bed coordinates. */
  const cauMat = new THREE.ShaderMaterial({ vertexShader: CAUSTIC_VERT, fragmentShader: CAUSTIC_FRAG, uniforms: U, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const cauGrid = new THREE.Mesh(new THREE.BufferGeometry(), cauMat);
  cauGrid.frustumCulled = false;
  const cauScene = new THREE.Scene(), cauCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  cauScene.add(cauGrid);
  const blurU = { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } };
  const blurMat = new THREE.ShaderMaterial({ vertexShader: BLUR_VERT, fragmentShader: BLUR_FRAG, uniforms: blurU, depthTest: false, depthWrite: false, toneMapped: false });
  const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat), blurScene = new THREE.Scene();
  blurQuad.frustumCulled = false; blurScene.add(blurQuad);
  let cauRT = null, cauRT2 = null, mirRT = null;

  // Thin trim catches the lamp along its whole length, so it is rougher than the shop's brass.
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc99a4b, metalness: 1, roughness: 0.62 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0x3b424b, metalness: 0.82, roughness: 0.85, roughnessMap: M.map('brushed', 512, { repeat: 1 }) });
  /* Barriers. */
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0x3f4852, metalness: 0.55, roughness: 0.62, roughnessMap: M.map('smudge', 512, { repeat: 2 }), clearcoat: 0.3, clearcoatRoughness: 0.32 });
  const walls = new THREE.Mesh(new THREE.BufferGeometry(), wallMat);
  walls.castShadow = walls.receiveShadow = true; walls.frustumCulled = false;
  above.add(walls);

  /* Dippers: one bar for a line source, and a brass plunger on a cantilever for each point source. */
  const dipGeo = turned([[0, -0.052], [0.03, -0.046], [0.05, -0.02], [0.052, 0.006], [0.04, 0.036], [0.018, 0.06], [0.0125, 0.08], [0.0125, ARM - 0.12], [0.02, ARM - 0.1], [0.021, ARM - 0.075], [0.0125, ARM - 0.06], [0.0125, ARM + 0.09], [0.024, ARM + 0.1], [0.024, ARM + 0.125], [0.012, ARM + 0.14], [0, ARM + 0.143]], 20, 5);
  const collarGeo = turned([[0.016, -0.04], [0.04, -0.04], [0.045, -0.03], [0.045, 0.03], [0.04, 0.04], [0.016, 0.04]], 20, 3);
  const blockGeo = roundedBox(0.24, 0.17, 0.11, 0.024, 3), rodGeo = rodGeometry(10);
  let dippers = null, collars = null, rods = null, blocks = null, cap = 0;
  const growDippers = n => {
    if (n <= cap) return;
    for (const o of [dippers, collars, rods, blocks]) if (o) { above.remove(o); o.dispose(); }
    cap = Math.max(16, n * 2);
    const inst = (g, mt) => { const o = new THREE.InstancedMesh(g, mt, cap); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; above.add(o); return o; };
    dippers = inst(dipGeo, M.brass()); collars = inst(collarGeo, M.gunmetal()); rods = inst(rodGeo, M.steel()); blocks = inst(blockGeo, M.gunmetal());
  };
  growDippers(8);

  /* Detector data, the screen and its rail. */
  const screenU = { tDet: { value: null }, tRamp: { value: ramp }, uBars: { value: 64 }, uTicks: { value: 10 } };
  const screenMat = new THREE.ShaderMaterial({ vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG, uniforms: screenU, toneMapped: true });
  let detData = null, detTex = null, detPeak = 1e-3;

  /* Parts rebuilt with the tank's proportions. */
  let geos = [], owned = [], P = null, texU = null, texInt = null, texMask = null, maskData = null, blurA = null, blurB = null;
  let fineTrim = null, paddle = null, bar = null, hangers = [], rail = null, wallKey = -1, maskVer = -1, wallsDirty = false, wallClock = 0, layoutKey = '';
  const m4 = new THREE.Matrix4();
  const piece = (geo, mat, x, y, z, parent) => {
    geos.push(geo);
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z); o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const clear = g => { for (let i = g.children.length - 1; i >= 0; i--) { const o = g.children[i]; if (o !== walls && !o.isInstancedMesh) g.remove(o); } };

  function buildStand() {
    const hw = P.hw, hh = P.hh, y0 = P.o[1], D = T3.depth, X = hw + RIM, Z = hh + RIM, bodyTop = y0 - 0.06, bodyLow = y0 - D - 0.2, deckTop = 0.33;
    // The tray is a hollow frame: anything solid across it would show through the troughs of a strong wave.
    const tray = piece(ringFrame(2 * hw, 2 * hh, RIM - 0.02, bodyTop - bodyLow, 0.03, 0.02), M.walnut(), 0, (bodyTop + bodyLow) / 2, 0, below);
    tray.rotation.x = -Math.PI / 2;
    // The frame's UVs are in scene units, far too tight for this grain; stretched, it runs the length of the rail.
    const tuv = tray.geometry.attributes.uv;
    for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * 0.14, tuv.getY(i) * 0.34);
    piece(roundedBox(2 * hw + 0.3, 0.05, 2 * hh + 0.3, 0.02, 3), M.gunmetal(), 0, bodyLow + 0.025, 0, below);
    const bead = piece(ringFrame(2 * X - 0.1, 2 * Z - 0.1, 0.05, 0.03, 0.4, 0.01), trimMat, 0, bodyLow + 0.035, 0, below);
    bead.rotation.x = -Math.PI / 2;
    piece(roundedBox(2 * X + 0.5, 0.27, 2 * Z + 0.5, 0.05, 5), M.slate(), 0, 0.195, 0, below);
    const edge = piece(ringFrame(2 * X + 0.36, 2 * Z + 0.36, 0.02, 0.012, 0.06, 0.004), trimMat, 0, deckTop, 0, below);
    edge.rotation.x = -Math.PI / 2;
    for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      piece(turned([[0, 0], [0.13, 0], [0.15, 0.03], [0.09, 0.06]], 28), M.brass(), fx * (X + 0.08), 0, fz * (Z + 0.08), below);
      const h = bodyLow - deckTop, leg = turned([[0.17, 0], [0.165, 0.03], [0.09, 0.07], [0.062, 0.14], [0.052, h * 0.46], [0.082, h * 0.5], [0.052, h * 0.54], [0.066, h - 0.13], [0.13, h - 0.05], [0.17, h]], 32, 6);
      piece(leg, M.brass(), fx * (X - 0.5), deckTop, fz * (Z - 0.5), below);
    }
    // Stretchers tie the legs, and show there is air under the tank.
    const y = (bodyLow + deckTop) / 2, rx = X - 0.5, rz = Z - 0.5, rod = (ax, az, bx, bz) => {
      const o = piece(rodGeometry(12), M.steel(), 0, 0, 0, below);
      o.matrixAutoUpdate = false; rodMatrix(ax, y, az, bx, y, bz, o.matrix, 0.02);
    };
    rod(-rx, -rz, -rx, rz); rod(rx, -rz, rx, rz); rod(-rx, -rz, rx, -rz); rod(-rx, rz, rx, rz);
  }
  function buildTank() {
    const hw = P.hw, hh = P.hh, y0 = P.o[1], X = hw + RIM, Z = hh + RIM;
    const rim = piece(ringFrame(2 * hw, 2 * hh, RIM, 0.26, 0.03, 0.024), rimMat, 0, y0 + 0.03, 0, above);
    rim.rotation.x = -Math.PI / 2;
    const inlay = piece(ringFrame(2 * hw + 0.1, 2 * hh + 0.1, 0.034, 0.02, 0.05, 0.007), trimMat, 0, y0 + 0.16, 0, above);
    inlay.rotation.x = -Math.PI / 2;
    fineTrim = piece(ringFrame(2 * X - 0.12, 2 * Z - 0.12, 0.024, 0.014, 0.39, 0.005), trimMat, 0, y0 + 0.16, 0, above);
    fineTrim.rotation.x = -Math.PI / 2;
    const screw = bolt(0.03);
    geos.push(screw);
    for (const [x, z] of [[-X + 0.25, -Z + 0.25], [X - 0.25, -Z + 0.25], [-X + 0.25, Z - 0.25], [X - 0.25, Z - 0.25], [0, -Z + 0.13], [0, Z - 0.13]]) {
      const b = new THREE.Mesh(screw, M.brass());
      b.position.set(x, y0 + 0.163, z); b.castShadow = true; above.add(b);
    }
    // The engraved scales on the near and left rims.
    const rulerMat = (cells, len) => {
      const t = paintRuler(cells, E.renderer); owned.push(t);
      const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, metalness: 0.5, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
      owned.push(mat);
      const o = piece(new THREE.PlaneGeometry(len, 0.13), mat, 0, y0 + 0.1625, 0, above);
      o.castShadow = false; o.rotation.x = -Math.PI / 2;
      return o;
    };
    rulerMat(lab.Nx, 2 * hw).position.z = hh + 0.15;
    const side = rulerMat(lab.Ny, 2 * hh);
    side.rotation.set(-Math.PI / 2, 0, Math.PI / 2); side.position.x = -hw - 0.15;
  }
  /* The wave bar and the bridge that hangs it, at the line source. */
  function buildPaddle() {
    const hh = P.hh, y0 = P.o[1];
    paddle = new THREE.Group(); above.add(paddle);
    bar = piece(new THREE.CapsuleGeometry(0.03, 2 * hh - 0.16, 6, 14), M.brass(), 0, y0, 0, paddle); bar.rotation.x = Math.PI / 2;
    const beamY = y0 + ARM;
    piece(roundedBox(0.075, 0.05, 2 * hh + RIM * 1.25, 0.018, 3), M.gunmetal(), 0, beamY, 0, paddle);
    hangers = [];
    for (const z of [-0.62, 0, 0.62]) {
      const h = piece(new THREE.CylinderGeometry(0.0125, 0.0125, ARM, 12), M.polished(), 0, y0 + ARM / 2, z * hh, paddle);
      hangers.push(h);
      piece(turned([[0.012, -0.025], [0.03, -0.022], [0.034, 0], [0.03, 0.022], [0.012, 0.025]], 18, 3), M.brass(), 0, y0, z * hh, paddle).name = 'foot';
    }
    for (const s of [-1, 1]) {
      piece(turned([[0.075, 0], [0.07, 0.02], [0.035, 0.05], [0.026, 0.1], [0.024, ARM - 0.24], [0.04, ARM - 0.19], [0.042, ARM - 0.16]], 18, 4), M.brass(), 0, y0 + 0.165, s * (hh + RIM * 0.55), paddle);
      piece(turned([[0, 0.04], [0.05, 0.036], [0.06, 0.012], [0.06, -0.02], [0.03, -0.04]], 20, 3), M.brass(), 0, beamY + 0.075, s * (hh + RIM * 0.55), paddle);
    }
  }
  function buildScreen() {
    const hh = P.hh, hw = P.hw, y0 = P.o[1], L = 2 * hh - 0.18;
    const stand = new THREE.Group();
    stand.position.set(hw + RIM * 0.62, y0 + 0.17, 0); stand.rotation.z = -0.3; above.add(stand);
    const face = new THREE.Group(); face.rotation.y = -Math.PI / 2; face.position.y = BOARD / 2 + 0.05; stand.add(face);
    const back = piece(roundedBox(L + 0.14, BOARD + 0.14, 0.09, 0.03, 3), M.gunmetal(), 0, 0, -0.05, face); back.castShadow = true;
    const frame = piece(ringFrame(L, BOARD, 0.04, 0.05, 0.02, 0.012), trimMat, 0, 0, 0, face);
    const glass = piece(new THREE.PlaneGeometry(L, BOARD), screenMat, 0, 0, 0.002, face); glass.castShadow = false; glass.receiveShadow = false; frame.castShadow = false;
    for (const s of [-1, 1]) {
      const post = piece(roundedBox(0.15, 0.2, 0.2, 0.03, 3), M.gunmetal(), 0.03, 0.02, s * (L / 2 - 0.34), stand);
      post.castShadow = true;
    }
  }
  function buildRail() {
    const hh = P.hh, y0 = P.o[1];
    rail = new THREE.Group(); above.add(rail);
    piece(roundedBox(0.045, 0.03, 2 * hh + 0.3, 0.012, 2), M.gunmetal(), 0, y0 + 0.11, 0, rail);
    const pins = Math.round(hh * 7), geo = new THREE.CylinderGeometry(0.0065, 0.0035, 0.14, 8);
    geos.push(geo);
    const o = new THREE.InstancedMesh(geo, M.polished(), pins);
    for (let i = 0; i < pins; i++) { m4.makeTranslation(0, y0 + 0.04, -hh + (i + 0.5) / pins * 2 * hh); o.setMatrixAt(i, m4); }
    o.castShadow = true; rail.add(o); rail.userData.pins = o;
    const led = piece(new THREE.BoxGeometry(0.01, 0.006, 2 * hh + 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.42, 0.5), toneMapped: true }), 0, y0 + 0.127, 0, rail);
    owned.push(led.material); led.castShadow = led.receiveShadow = false;
  }
  function buildWaterMesh() {
    const d = E.tier.detail, nx = Math.max(48, Math.round(Math.min(lab.Nx * 1.1, 340) * d)), ny = Math.max(16, Math.round(nx * P.hh / P.hw));
    water.geometry.dispose();
    water.geometry = new THREE.PlaneGeometry(2 * P.hw, 2 * P.hh, nx, ny).rotateX(-Math.PI / 2).translate(0, P.o[1], 0);
    const cx = Math.max(64, Math.round(Math.min(lab.Nx * 1.25, 420) * d)), cy = Math.max(32, Math.round(cx * P.hh / P.hw));
    cauGrid.geometry.dispose();
    cauGrid.geometry = new THREE.PlaneGeometry(2, 2, cx, cy);
  }
  function layout() {
    P = lab.plane3();
    if (rail && rail.userData.pins) rail.userData.pins.dispose();
    clear(above); clear(below); if (paddle) paddle.clear();
    for (const g of geos) g.dispose();
    for (const t of owned) t.dispose();
    geos = []; owned = [];
    const Nx = lab.Nx, Ny = lab.Ny, N = Nx * Ny;
    for (const t of [texU, texInt, texMask, detTex]) if (t) t.dispose();
    texU = U.tU.value = fieldTexture(lab.u, Nx, Ny); texInt = U.tInt.value = fieldTexture(lab.inten, Nx, Ny);
    maskData = new Uint8Array(N * 4); blurA = new Float32Array(N); blurB = new Float32Array(N);
    texMask = U.tMask.value = new THREE.DataTexture(maskData, Nx, Ny, THREE.RGBAFormat);
    texMask.minFilter = texMask.magFilter = THREE.LinearFilter; texMask.wrapS = texMask.wrapT = THREE.ClampToEdgeWrapping;
    detData = new Float32Array(Ny); detTex = screenU.tDet.value = fieldTexture(detData, Ny, 1);
    owned.push(U.tBed.value = paintBed(Nx, Ny, E.renderer));
    U.uHalf.value.set(P.hw, P.hh); U.uK.value.set(0.5 / P.hw, 0.5 / P.hh); U.uO.value.set(0.5 + 0.5 / Nx, 0.5 + 0.5 / Ny);
    U.uCell.value.set(2 * P.hw / Nx, 2 * P.hh / Ny); U.uY0.value = P.o[1]; U.uFoamW.value = lab.Ls * 2 * P.hw / Nx;
    U.uLap.value = 0.25 * T3.depth * T3.amp / U.uCell.value.x ** 2;
    const sl = T3.depth / lightDir.y; U.uSlant.value.set(lightDir.x * sl * 0.6, 0, lightDir.z * sl * 0.6);
    screenU.uBars.value = Math.max(24, Math.min(64, Math.round(Ny / 3))); screenU.uTicks.value = Ny / 50;
    buildStand(); buildTank(); buildPaddle(); buildScreen(); buildRail();
    maskVer = -1; wallKey = -1;
  }

  /* R wall, G glass, softened a touch so their contours are smooth; B and A wide blurs for contact shade and rims. */
  function writeMask() {
    const Nx = lab.Nx, Ny = lab.Ny, W = lab.wall, G = lab.glass, d = maskData, N = Nx * Ny;
    const wide = (src, ch) => {
      const a = blurA, b = blurB, r = 3, k = 1 / (2 * r + 1);
      for (let i = 0; i < N; i++) a[i] = src[i];
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < Ny; y++) { let s = 0; const row = y * Nx; for (let x = -r; x <= r; x++) s += a[row + Math.min(Nx - 1, Math.max(0, x))]; for (let x = 0; x < Nx; x++) { b[row + x] = s * k; s += a[row + Math.min(Nx - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
        for (let x = 0; x < Nx; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(Ny - 1, Math.max(0, y)) * Nx + x]; for (let y = 0; y < Ny; y++) { a[y * Nx + x] = s * k; s += b[Math.min(Ny - 1, y + r + 1) * Nx + x] - b[Math.max(0, y - r) * Nx + x]; } }
      }
      for (let i = 0; i < N; i++) d[i * 4 + ch] = a[i] * 255;
    };
    const soft = (src, ch) => {
      for (let y = 0; y < Ny; y++) for (let x = 0; x < Nx; x++) {
        const l = x > 0 ? x - 1 : 0, r = x < Nx - 1 ? x + 1 : x, u = (y > 0 ? y - 1 : 0) * Nx, m = y * Nx, v = (y < Ny - 1 ? y + 1 : y) * Nx;
        const s = 4 * src[m + x] + 2 * (src[m + l] + src[m + r] + src[u + x] + src[v + x]) + src[u + l] + src[u + r] + src[v + l] + src[v + r];
        d[(m + x) * 4 + ch] = s * 255 / 16;
      }
    };
    soft(W, 0); soft(G, 1); wide(W, 2); wide(G, 3);
    texMask.needsUpdate = true;
    let h = 0;
    for (let i = 0; i < N; i++) if (W[i]) h = (Math.imul(h, 31) + i) | 0;
    if (h !== wallKey) { wallKey = h; wallsDirty = true; }
  }
  function syncSources() {
    const y0 = P.o[1], hw = P.hw, k = P.k, cs = lab.cs;
    let n = 0, line = null, lineVal = 0, idx = 0;
    growDippers(lab.sources.length);
    for (const s of lab.sources) {
      if (s.type === 'line') { line = s; lineVal = lab.signal3(s, 0); continue; }
      const val = lab.signal3(s, idx++), x = (s.x * cs - P.cx) * k, z = (s.y * cs - P.cy) * k, y = y0 + lab.height3(val) * 1.25, armY = y0 + ARM, bx = -hw - RIM * 0.55;
      m4.makeTranslation(x, y, z); dippers.setMatrixAt(n, m4);
      m4.makeTranslation(x, armY, z); collars.setMatrixAt(n, m4);
      rodMatrix(bx, armY, z, x, armY, z, m4, 0.0125); rods.setMatrixAt(n, m4);
      m4.makeTranslation(bx, y0 + 0.23, z); blocks.setMatrixAt(n, m4);
      n++;
    }
    for (const o of [dippers, collars, rods, blocks]) { o.count = n; o.instanceMatrix.needsUpdate = true; }
    paddle.visible = !!line;
    if (line) {
      const x = (Math.round(line.x) * cs - P.cx) * k, h = lab.height3(lineVal) * 1.15;
      paddle.position.x = x; bar.position.y = y0 + h;
      for (const c of paddle.children) if (c.name === 'foot') c.position.y = y0 + h;
      for (const c of hangers) { c.position.y = y0 + ARM / 2 + h / 2; c.scale.y = 1 - h / ARM; }
    }
  }
  function syncDetector(dt) {
    const Nx = lab.Nx, Ny = lab.Ny, xd = lab.detectorX(), I = lab.inten;
    let hi = 0;
    for (let y = 0; y < Ny; y++) { const v = I[y * Nx + xd]; if (v > hi) hi = v; }
    // The full scale eases, so the bars settle rather than jump with every new peak.
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * (hi > detPeak ? 7 : 1.6));
    detPeak = Math.max(1e-3, detPeak + (hi - detPeak) * k);
    for (let y = 0; y < Ny; y++) detData[y] = Math.min(1.05, I[y * Nx + xd] / (detPeak * 1.08));
    detTex.needsUpdate = true;
    rail.position.x = (xd * lab.cs - P.cx) * P.k;
  }
  const mirror = new THREE.PerspectiveCamera(), eye = new THREE.Vector3(), look = new THREE.Vector3(), rot = new THREE.Matrix4(), mirPos = new THREE.Vector3();
  function mirrorPass(renderer, camera) {
    const y0 = P.o[1];
    camera.getWorldPosition(eye);
    if (eye.y <= y0 + 0.01) return;
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(eye);
    mirror.position.set(eye.x, 2 * y0 - eye.y, eye.z);
    mirror.up.set(0, 1, 0).applyMatrix4(rot).reflect(N_UP);
    mirror.lookAt(look.x, 2 * y0 - look.y, look.z);
    mirror.near = camera.near; mirror.far = camera.far;
    mirror.updateMatrixWorld(); mirror.matrixWorldInverse.copy(mirror.matrixWorld).invert();
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    U.uMirM.value.copy(clipBias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    mPlane.setFromNormalAndCoplanarPoint(N_UP, mirPos.set(0, y0, 0)).applyMatrix4(mirror.matrixWorldInverse);
    plane4.set(mPlane.normal.x, mPlane.normal.y, mPlane.normal.z, mPlane.constant);
    const pm = mirror.projectionMatrix, e = pm.elements;
    qv.set((Math.sign(plane4.x) + e[8]) / e[0], (Math.sign(plane4.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    plane4.multiplyScalar(2 / plane4.dot(qv));
    e[2] = plane4.x; e[6] = plane4.y; e[10] = plane4.z + 1 - 0.002; e[14] = plane4.w;
    const bg = scene.background, fog = scene.fog, shadows = renderer.shadowMap.autoUpdate, alpha = renderer.getClearAlpha(), floor = studio.floor;
    water.visible = false; below.visible = false; studio.dome.visible = false; if (floor) floor.mesh.visible = false;
    scene.background = null; scene.fog = null; renderer.shadowMap.autoUpdate = false; renderer.setClearAlpha(0);
    renderer.setRenderTarget(mirRT); renderer.clear(); renderer.render(scene, mirror); renderer.setRenderTarget(null);
    water.visible = true; below.visible = true; studio.dome.visible = true; if (floor) floor.mesh.visible = true;
    scene.background = bg; scene.fog = fog; renderer.shadowMap.autoUpdate = shadows; renderer.setClearAlpha(alpha);
  }

  return {
    scene, studio, exposure: 1, bloom: { strength: 0.16, radius: 0.55, threshold: 1 },
    onTier(tier, w, h) {
      const caustic = tier.id === 'lite' ? 0 : tier.id === 'low' ? 1 : 2, mirrorOn = tier.reflect > 0 ? 1 : 0, steps = Math.max(1, Math.round(tier.detail * 6));
      if (cauRT) { cauRT.dispose(); cauRT2.dispose(); cauRT = cauRT2 = null; }
      if (mirRT) { mirRT.dispose(); mirRT = null; }
      const a = lab.Ny / lab.Nx;
      if (caustic === 2) {
        const cw = Math.round(1280 * tier.detail);
        cauRT = new THREE.WebGLRenderTarget(cw, Math.max(32, Math.round(cw * a)), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
        cauRT2 = cauRT.clone();
        U.tCau.value = cauRT.texture;
      } else U.tCau.value = null;
      if (mirrorOn) {
        mirRT = new THREE.WebGLRenderTarget(Math.max(2, Math.round(w * tier.reflect)), Math.max(2, Math.round(h * tier.reflect)), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
        U.tMir.value = mirRT.texture;
      } else U.tMir.value = null;
      const D = waterMat.defines;
      if (D.CAUSTIC !== caustic || D.MIRROR !== mirrorOn || D.STEPS !== steps) { D.CAUSTIC = caustic; D.MIRROR = mirrorOn; D.STEPS = steps; waterMat.needsUpdate = true; }
      if (P) { buildWaterMesh(); fineTrim.visible = tier.msaa > 0; } // A line thinner than a pixel breaks into dashes without MSAA.
    },
    sync(l, view) {
      const key = `${lab.Nx}x${lab.Ny}:${lab.cs}:${lab.Ls}`;
      if (key !== layoutKey) { layoutKey = key; layout(); this.onTier(E.tier, view.w * view.pr, view.h * view.pr); }
      texU.image.data = lab.u; texU.needsUpdate = true;
      if (lab.geomVer !== maskVer) { maskVer = lab.geomVer; writeMask(); }
      if (wallsDirty && view.t - wallClock >= 0.05) {
        wallsDirty = false; wallClock = view.t;
        walls.geometry.dispose();
        walls.geometry = wallGeometry(lab.wall, lab.Nx, lab.Ny, P.hw, P.hh, P.o[1] - T3.depth, P.o[1] + T3.wall, 0.018);
      }
      const ease = reduceMotion ? 1 : 1 - Math.exp(-view.dt * 5), intensity = lab.p.view === 'int';
      U.uInt.value += ((intensity ? 1 : 0) - U.uInt.value) * ease;
      U.uFoam.value += ((lab.p.absorb ? 1 : 0) - U.uFoam.value) * ease;
      if (U.uInt.value > 0.002) { texInt.image.data = lab.inten; texInt.needsUpdate = true; }
      U.uH.value = T3.amp * lab.p.relief; U.uGain.value = lab.p.gain;
      syncSources(); syncDetector(view.dt);
    },
    prepare(renderer, camera) {
      if (cauRT) {
        renderer.setRenderTarget(cauRT); renderer.clear(); renderer.render(cauScene, cauCam);
        blurU.tSrc.value = cauRT.texture; blurU.uStep.value.set(0.55 / cauRT.width, 0);
        renderer.setRenderTarget(cauRT2); renderer.render(blurScene, cauCam);
        blurU.tSrc.value = cauRT2.texture; blurU.uStep.value.set(0, 0.55 / cauRT.height);
        renderer.setRenderTarget(cauRT); renderer.render(blurScene, cauCam);
        renderer.setRenderTarget(null);
      }
      if (mirRT) mirrorPass(renderer, camera);
    },
    dispose() {
      studio.dispose();
      for (const g of geos) g.dispose();
      for (const t of owned) t.dispose();
      for (const t of [texU, texInt, texMask, detTex, ramp, foamTex]) if (t) t.dispose();
      if (cauRT) { cauRT.dispose(); cauRT2.dispose(); }
      if (mirRT) mirRT.dispose();
      for (const o of [dippers, collars, rods, blocks]) if (o) o.dispose();
      if (rail && rail.userData.pins) rail.userData.pins.dispose();
      for (const g of [water.geometry, cauGrid.geometry, blurQuad.geometry, walls.geometry, dipGeo, collarGeo, blockGeo, rodGeo]) g.dispose();
      for (const m of [waterMat, cauMat, blurMat, wallMat, rimMat, trimMat, screenMat]) m.dispose();
      fill.dispose();
    },
  };
}
