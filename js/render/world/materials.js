/*
✒ Metadata
    - Title: World Materials (digiSpace Edition - v2.15)
    - File Name: materials.js
    - Relative Path: js/render/world/materials.js
    - Artifact Type: javascript
    - Version: 2.15.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — The shop
      follows the tier: textures painted at its size and filtered at its
      anisotropy, Ultra's 2048 maps painted in idle time after a first copy at
      1024, and every change of tier repainted the same way. New: polished
      concrete for the floor, stove enamel for backs, and a maker's plaque.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: procedural textures and a shared shop of materials.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Every surface of the 3D mode that is not a one-off shader. Textures are
    painted once into canvases from seeded noise, so nothing is downloaded and
    each run looks the same. Materials are physically based and shared.

✒ Key Features:
    - Seeded, tileable value noise and fBm painted into canvases, at once or a
      few rows at a time in idle moments.
    - Brushed-metal, smudge, walnut, stone, felt and polished concrete maps,
      sized and filtered by the graphics tier.
    - steel, polished, gunmetal, brass, copper, walnut, slate, felt, enamel,
      glass and maker's plaque presets.
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

/* Paint rows y0 to y1 of a size × size image; shade(u, v) returns [r, g, b] in 0–255. */
function rows(d, size, shade, y0, y1) {
  for (let y = y0, i = y0 * size * 4; y < y1; y++) for (let x = 0; x < size; x++, i += 4) {
    const [r, gr, b] = shade(x / size, y / size);
    d[i] = r; d[i + 1] = gr; d[i + 2] = b; d[i + 3] = 255;
  }
}
/* Paint a canvas one pixel at a time. */
export function paint(size, shade) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  rows(img.data, size, shade, 0, size);
  g.putImageData(img, 0, 0);
  return c;
}
/* The same, a few rows at a time in the browser's idle moments, so a large map never holds up a frame: done(canvas)
   when it is finished. Returns a function that cancels it. */
const idle = f => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 16));
export function paintLater(size, shade, done) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  let y = 0, live = true;
  const work = dl => {
    if (!live) return;
    // The idle time the browser offers, when it offers some; a slice of 6 ms when the call came by its timeout.
    const t0 = performance.now(), slice = dl && !dl.didTimeout && dl.timeRemaining ? Math.min(12, Math.max(4, dl.timeRemaining() - 1)) : 6;
    while (y < size && performance.now() - t0 < slice) { const n = Math.min(size, y + 8); rows(img.data, size, shade, y, n); y = n; }
    if (y < size) idle(work);
    else { g.putImageData(img, 0, 0); live = false; done(c); }
  };
  idle(work);
  return () => { live = false; };
}

/* Every painted texture, so a change of tier can sharpen or soften them all: anisotropy is the filtering of a surface
   seen at a slant, from the tier's budget (never more than the GPU offers; see mode.js). */
const painted = new Set();
let aniso = 4;
export function canvasTexture(canvas, { repeat = 1, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  painted.add(t);
  t.addEventListener('dispose', () => { if (!t.userData.reimage) painted.delete(t); });
  return t;
}
/* Give a texture an image of another size. Its GPU storage is fixed at the first upload, so it is released first. */
function reimage(t, canvas) {
  t.userData.reimage = true; t.dispose(); t.userData.reimage = false;
  t.image = canvas; t.needsUpdate = true;
}

/* ---------- procedural maps: each returns its shade(u, v) for a given size ---------- */
const MAPS = {
  /* Fine horizontal streaks in the green (roughness) and blue (metalness) channels. */
  brushed(size) {
    const f = fbmField(11, 4, 3), col = lattice(size, 91);
    return (u, v) => {
      const k = Math.floor(v * size), streak = col[k] * 0.6 + col[(k + 3) % size] * 0.4, w = f(u, v) * 0.5 + streak * 0.5;
      return [255, 120 + w * 110, 255];
    };
  },
  /* Soft blotches, for floors and worn lacquer. */
  smudge() {
    const a = fbmField(23, 3, 6), b = fbmField(41, 9, 4);
    return (u, v) => { const w = a(u, v) * 0.75 + b(u, v) * 0.25, s = Math.pow(w, 1.6); return [255, 60 + s * 195, 255]; };
  },
  /* Walnut: warped rings stretched along the grain. */
  walnut() {
    const warp = fbmField(5, 3, 4), fine = fbmField(17, 28, 3);
    return (u, v) => {
      const w = warp(u, v), ring = 0.5 + 0.5 * Math.sin((v + w * 0.55) * 46 + 3 * warp(v, u)), g = fine(u * 0.2, v) * 0.5 + ring * 0.5;
      const t = Math.pow(g, 1.35);
      return [58 + t * 72, 34 + t * 44, 22 + t * 24];
    };
  },
  /* Honed dark stone with pale flecks. */
  stone() {
    const a = fbmField(31, 5, 5), b = fbmField(67, 40, 2);
    return (u, v) => {
      const w = a(u, v), fleck = b(u, v) > 0.72 ? 18 : 0, t = 20 + w * 30 + fleck;
      return [t * 0.92, t * 0.97, t * 1.08];
    };
  },
  /* Felt: dense high-frequency nap, centred on mid grey so it can tint a colour. */
  felt() {
    const a = fbmField(53, 64, 3), b = fbmField(29, 6, 3);
    return (u, v) => { const t = 150 + (a(u, v) - 0.5) * 120 + (b(u, v) - 0.5) * 40; return [t, t, t]; };
  },
  /* Polished concrete: broad, quiet clouding over a fine sand of aggregate, centred near white so it tints a floor's
     colour (its mean is about 0.73 in linear light; the floor lifts its colour to match). */
  concrete(size) {
    const a = fbmField(73, 3, 5), b = fbmField(19, 12, 3), grit = lattice(size, 7);
    return (u, v) => {
      const s = grit[Math.min(size - 1, Math.floor(v * size)) * size + Math.min(size - 1, Math.floor(u * size))];
      const t = 222 + (a(u, v) - 0.5) * 46 + (b(u, v) - 0.5) * 18 + (s > 0.985 ? 24 : s < 0.012 ? -28 : 0);
      return [t, t * 0.995, t * 0.985];
    };
  },
};

/* ---------- the shop ---------- */
/* Maps are painted at the size a material asks for, never above the tier's tex; on a tier above 1024 (Ultra) at twice
   that size, first at 1024 and then refined in idle time. A change of tier repaints in idle time too, keeping the old
   image until the new one is ready, so neither a lab's start nor a step of the automatic mode waits on its paint. */
export function createMaterials(renderer, tier) {
  const maps = new Map(), mats = new Map();
  let T = tier;
  aniso = T.aniso || 4;
  const want = size => Math.min(T.tex > 1024 ? size * 2 : size, T.tex || size);
  const refine = e => {
    if (e.cancel) { e.cancel(); e.cancel = null; }
    const to = want(e.size);
    if (to !== e.at) e.cancel = paintLater(to, MAPS[e.name](to), c => { reimage(e.tex, c); e.at = to; e.cancel = null; });
  };
  const map = (name, size, opts) => {
    const key = `${name}:${size}:${opts && opts.repeat}`;
    if (!maps.has(key)) {
      const at = Math.min(want(size), 1024), e = { name, size, at, cancel: null, tex: canvasTexture(paint(at, MAPS[name](at)), opts) };
      maps.set(key, e);
      refine(e);
    }
    return maps.get(key).tex;
  };
  const shop = (name, make) => () => { if (!mats.has(name)) mats.set(name, make()); return mats.get(name); };
  const metal = (color, roughness, extra = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, ...extra });

  return {
    map,
    /* A new budget: every painted texture takes its anisotropy at once, and the shop's maps repaint in idle time. */
    setTier(t) {
      T = t; aniso = t.aniso || 1;
      for (const x of painted) if (x.anisotropy !== aniso) { x.anisotropy = aniso; x.needsUpdate = true; }
      for (const e of maps.values()) refine(e);
    },
    /* What the shop holds: each map's painted edge, and whether a repaint is under way. */
    budget: () => ({ aniso, maps: [...maps.values()].map(e => ({ name: e.name, size: e.size, at: e.at, painting: !!e.cancel })) }),
    steel: shop('steel', () => metal(0xc9d0d8, 0.42, { roughnessMap: map('brushed', 512, { repeat: 1 }), clearcoat: 0.2, clearcoatRoughness: 0.3 })),
    polished: shop('polished', () => metal(0xe2e6ea, 0.12)),
    gunmetal: shop('gunmetal', () => metal(0x20252c, 0.5, { roughnessMap: map('smudge', 512, { repeat: 2 }) })),
    brass: shop('brass', () => metal(0xc99a4b, 0.3, { roughnessMap: map('smudge', 512, { repeat: 3 }), clearcoat: 0.35, clearcoatRoughness: 0.2 })),
    copper: shop('copper', () => metal(0xc06a3b, 0.32, { roughnessMap: map('smudge', 512, { repeat: 3 }) })),
    walnut: shop('walnut', () => new THREE.MeshPhysicalMaterial({ map: map('walnut', 1024, { srgb: true }), roughness: 0.46, clearcoat: 0.8, clearcoatRoughness: 0.24 })),
    slate: shop('slate', () => new THREE.MeshStandardMaterial({ map: map('stone', 1024, { srgb: true, repeat: 2 }), roughnessMap: map('smudge', 512, { repeat: 2 }), roughness: 0.82, metalness: 0.1 })),
    felt: (color = 0x17394a) => shop(`felt:${color}`, () => new THREE.MeshStandardMaterial({ color, map: map('felt', 512, { srgb: true, repeat: 6 }), roughness: 0.96, metalness: 0 }))(),
    /* Stove enamel: baked paint over steel. A dielectric, so a back panel takes the fill and the room's light from any
       side instead of mirroring the dark studio behind the camera as bare metal would. */
    enamel: (color = 0x1e2833) => shop(`enamel:${color}`, () => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.48, roughnessMap: map('smudge', 512, { repeat: 2 }), clearcoat: 0.55, clearcoatRoughness: 0.28 }))(),
    /* A maker's plaque in engraved brass: a title and a line of small capitals, lit faintly from within so it reads in
       the dark at the back of an apparatus. Cached by its text. */
    plaque: (title, line) => shop(`plaque:${title}|${line}`, () => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 160;
      const g = c.getContext('2d');
      g.fillStyle = '#7a5a2a'; g.fillRect(0, 0, 512, 160); g.strokeStyle = 'rgba(40,26,8,0.8)'; g.lineWidth = 5; g.strokeRect(12, 12, 488, 136);
      g.fillStyle = 'rgba(30,18,4,0.92)'; g.textAlign = 'center';
      g.font = '600 46px "Raleway", sans-serif'; g.fillText(title, 256, 82, 460);
      g.font = '500 24px "JetBrains Mono", monospace'; g.fillText(line, 256, 124, 460);
      const t = canvasTexture(c, { srgb: true });
      const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55, metalness: 0.5, roughness: 0.42 });
      m.userData.ownMap = true;
      return m;
    })(),
    /* Thin-walled glass: blended, not transmissive, so it costs no extra scene pass. */
    glass: shop('glass', () => new THREE.MeshPhysicalMaterial({ color: 0xe6f2f6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false })),
    dispose() {
      for (const e of maps.values()) { if (e.cancel) e.cancel(); e.tex.dispose(); }
      for (const m of mats.values()) { if (m.userData.ownMap) m.map.dispose(); m.dispose(); }
      mats.clear(); maps.clear();
    },
  };
}
