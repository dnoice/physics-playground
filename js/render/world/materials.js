/*
✒ Metadata
    - Title: World Materials (digiSpace Edition - v2.1)
    - File Name: materials.js
    - Relative Path: js/render/world/materials.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: procedural textures and a shared shop of materials.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Every surface of the 3D mode that is not a one-off shader. Textures are
    painted once into canvases from seeded noise, so nothing is downloaded and
    each run looks the same. Materials are physically based and shared.

✒ Key Features:
    - Seeded, tileable value noise and fBm painted into canvases.
    - Brushed-metal, smudge, walnut, stone and felt maps.
    - steel, gunmetal, brass, copper, walnut, slate, felt and glass presets.
    - Every material is cached, so scenes never duplicate GPU state.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';

/* ---------- seeded, tileable noise ---------- */
function lattice(size, seed) {
  const a = new Float32Array(size * size);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < a.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; a[i] = s / 4294967296; }
  return a;
}
const fade = t => t * t * (3 - 2 * t);
function value(a, n, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = fade(x - x0), fy = fade(y - y0);
  const X0 = ((x0 % n) + n) % n, Y0 = ((y0 % n) + n) % n, X1 = (X0 + 1) % n, Y1 = (Y0 + 1) % n;
  const v00 = a[Y0 * n + X0], v10 = a[Y0 * n + X1], v01 = a[Y1 * n + X0], v11 = a[Y1 * n + X1];
  return (v00 + (v10 - v00) * fx) * (1 - fy) + (v01 + (v11 - v01) * fx) * fy;
}
/* Tiling fBm over the unit square; base is the lattice cell count of the first octave. */
export function fbmField(seed, base = 4, octaves = 5) {
  const nets = [];
  for (let o = 0, n = base; o < octaves; o++, n *= 2) nets.push({ n, a: lattice(n, seed * 31 + o * 977 + 7) });
  return (u, v) => {
    let sum = 0, amp = 0.5, norm = 0;
    for (const { n, a } of nets) { sum += value(a, n, u * n, v * n) * amp; norm += amp; amp *= 0.5; }
    return sum / norm;
  };
}

/* Paint a canvas one pixel at a time; shade(u, v) returns [r, g, b] in 0–255. */
export function paint(size, shade) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0, i = 0; y < size; y++) for (let x = 0; x < size; x++, i += 4) {
    const [r, gr, b] = shade(x / size, y / size);
    d[i] = r; d[i + 1] = gr; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
export function canvasTexture(canvas, { repeat = 1, srgb = false, renderer = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}

/* ---------- procedural maps ---------- */
const MAPS = {
  /* Fine horizontal streaks in the green (roughness) and blue (metalness) channels. */
  brushed(size) {
    const f = fbmField(11, 4, 3), col = lattice(size, 91);
    return paint(size, (u, v) => {
      const k = Math.floor(v * size), streak = col[k] * 0.6 + col[(k + 3) % size] * 0.4, w = f(u, v) * 0.5 + streak * 0.5;
      return [255, 120 + w * 110, 255];
    });
  },
  /* Soft blotches, for floors and worn lacquer. */
  smudge(size) {
    const a = fbmField(23, 3, 6), b = fbmField(41, 9, 4);
    return paint(size, (u, v) => { const w = a(u, v) * 0.75 + b(u, v) * 0.25, s = Math.pow(w, 1.6); return [255, 60 + s * 195, 255]; });
  },
  /* Walnut: warped rings stretched along the grain. */
  walnut(size) {
    const warp = fbmField(5, 3, 4), fine = fbmField(17, 28, 3);
    return paint(size, (u, v) => {
      const w = warp(u, v), ring = 0.5 + 0.5 * Math.sin((v + w * 0.55) * 46 + 3 * warp(v, u)), g = fine(u * 0.2, v) * 0.5 + ring * 0.5;
      const t = Math.pow(g, 1.35);
      return [58 + t * 72, 34 + t * 44, 22 + t * 24];
    });
  },
  /* Honed dark stone with pale flecks. */
  stone(size) {
    const a = fbmField(31, 5, 5), b = fbmField(67, 40, 2);
    return paint(size, (u, v) => {
      const w = a(u, v), fleck = b(u, v) > 0.72 ? 18 : 0, t = 20 + w * 30 + fleck;
      return [t * 0.92, t * 0.97, t * 1.08];
    });
  },
  /* Felt: dense high-frequency nap, centred on mid grey so it can tint a colour. */
  felt(size) {
    const a = fbmField(53, 64, 3), b = fbmField(29, 6, 3);
    return paint(size, (u, v) => { const t = 150 + (a(u, v) - 0.5) * 120 + (b(u, v) - 0.5) * 40; return [t, t, t]; });
  },
};

/* ---------- the shop ---------- */
export function createMaterials(renderer) {
  const maps = new Map(), mats = new Map();
  const map = (name, size, opts) => {
    const key = `${name}:${size}:${opts && opts.repeat}`;
    if (!maps.has(key)) maps.set(key, canvasTexture(MAPS[name](size), { renderer, ...opts }));
    return maps.get(key);
  };
  const shop = (name, make) => () => { if (!mats.has(name)) mats.set(name, make()); return mats.get(name); };
  const metal = (color, roughness, extra = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, ...extra });

  return {
    map,
    steel: shop('steel', () => metal(0xc9d0d8, 0.42, { roughnessMap: map('brushed', 512, { repeat: 1 }), clearcoat: 0.2, clearcoatRoughness: 0.3 })),
    polished: shop('polished', () => metal(0xe2e6ea, 0.12)),
    gunmetal: shop('gunmetal', () => metal(0x20252c, 0.5, { roughnessMap: map('smudge', 512, { repeat: 2 }) })),
    brass: shop('brass', () => metal(0xc99a4b, 0.3, { roughnessMap: map('smudge', 512, { repeat: 3 }), clearcoat: 0.35, clearcoatRoughness: 0.2 })),
    copper: shop('copper', () => metal(0xc06a3b, 0.32, { roughnessMap: map('smudge', 512, { repeat: 3 }) })),
    walnut: shop('walnut', () => new THREE.MeshPhysicalMaterial({ map: map('walnut', 1024, { srgb: true }), roughness: 0.46, clearcoat: 0.8, clearcoatRoughness: 0.24 })),
    slate: shop('slate', () => new THREE.MeshStandardMaterial({ map: map('stone', 1024, { srgb: true, repeat: 2 }), roughnessMap: map('smudge', 512, { repeat: 2 }), roughness: 0.82, metalness: 0.1 })),
    felt: (color = 0x17394a) => shop(`felt:${color}`, () => new THREE.MeshStandardMaterial({ color, map: map('felt', 512, { srgb: true, repeat: 6 }), roughness: 0.96, metalness: 0 }))(),
    /* Thin-walled glass: blended, not transmissive, so it costs no extra scene pass. */
    glass: shop('glass', () => new THREE.MeshPhysicalMaterial({ color: 0xe6f2f6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false })),
    dispose() { for (const m of mats.values()) m.dispose(); for (const t of maps.values()) t.dispose(); mats.clear(); maps.clear(); },
  };
}
