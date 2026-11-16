/*
✒ Metadata
    - Title: Graphics Tiers (digiSpace Edition - v2.15)
    - File Name: tiers.js
    - Relative Path: js/core/tiers.js
    - Artifact Type: javascript
    - Version: 2.15.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for tiers that weigh the whole machine: the suggestion is
      the cheapest of four verdicts, on the GPU by name, the CPU by threads
      and a 16 ms benchmark, the memory the browser reports and the GPU's
      texture limit. Each tier is a fuller budget: texture size and filtering,
      the environment's resolution, a shadow penumbra kept equal on every
      tier, and the fill, haze and contact shadows.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: named graphics tiers and device detection, on
      Dennis's call for a tier system.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The graphics tiers of the 3D mode, cheapest last, and the device probe
    that suggests one. Pure data, a throwaway WebGL query and a short CPU
    benchmark, so the shell can show the choice before three.js has loaded.

✒ Key Features:
    - Five tiers from Ultra to Lite, each a budget: resolution, antialiasing,
      shadow map and penumbra, floor reflections, bloom, film grade, mesh
      detail, texture size and filtering, environment resolution, and the
      studio's fill, haze and contact shadows.
    - probeDevice() reads the GPU name, threads, memory and limits (texture
      size, samples, anisotropy) and times the CPU.
    - gpuVerdict(), cpuVerdict(), memoryVerdict() and limitsVerdict() each
      name the tier their part can carry; suggestTier() takes the cheapest,
      with the part that set it. Software renderers always land on Lite.
    - tierStep() walks up or down the ladder for the automatic mode.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* Costliest first. Each tier is a budget the 3D mode spends:
   - scale caps the render resolution against the device pixel ratio;
   - msaa is samples on the scene target (never more than the GPU offers);
   - shadow is the map edge in texels (0 turns shadows off), and soft its penumbra in texels of a 2048 map, so a shadow
     is as soft on every tier and only its edge grows finer with the map;
   - reflect is the floor reflection's share of full resolution (0 turns it off);
   - bloom and grade switch the post passes;
   - detail scales mesh grids, ribbon density and anything else a scene can thin out;
   - tex is the largest edge, in pixels, of the painted textures (wood, stone, brushed metal, felt, the floor); above
     1024 they are first painted at 1024 and refined in idle time, so a lab never waits on its paint;
   - aniso is the texture filtering across a surface seen at a slant;
   - env is the cube size of the studio's baked environment light (three.js takes 256 at least);
   - fill switches the fill light that follows the camera, so whichever side of an apparatus faces you is modelled,
     and the warm bounce from the floor under it;
   - haze switches the key light's soft beam through the studio air;
   - contact is the soft shadow pooled under every apparatus, kept on every tier, so even Lite stands on its floor. */
export const TIERS = [
  { id: 'ultra', label: 'Ultra', scale: 2, msaa: 4, shadow: 4096, soft: 5, reflect: 0.75, bloom: true, grade: true, detail: 1, tex: 2048, aniso: 16, env: 512, fill: true, haze: true, contact: true,
    blurb: 'Full resolution, 2048 textures, 4096 shadows, sharp reflections, studio haze. For strong dedicated GPUs.' },
  { id: 'high', label: 'High', scale: 1.5, msaa: 4, shadow: 2048, soft: 5, reflect: 0.5, bloom: true, grade: true, detail: 0.85, tex: 1024, aniso: 8, env: 256, fill: true, haze: true, contact: true,
    blurb: 'The intended look at 1.5× resolution, with fill light and haze. For dedicated GPUs and recent Apple silicon.' },
  { id: 'medium', label: 'Medium', scale: 1.25, msaa: 2, shadow: 1536, soft: 5, reflect: 0.33, bloom: true, grade: true, detail: 0.65, tex: 1024, aniso: 4, env: 256, fill: true, haze: false, contact: true,
    blurb: 'Softer reflections and lighter meshes, no haze. For recent integrated graphics.' },
  { id: 'low', label: 'Low', scale: 1, msaa: 0, shadow: 1024, soft: 6, reflect: 0, bloom: true, grade: false, detail: 0.5, tex: 512, aniso: 2, env: 256, fill: false, haze: false, contact: true,
    blurb: 'No floor reflections, antialiasing or extra lights; shadows and glow kept. For older laptops and phones.' },
  { id: 'lite', label: 'Lite', scale: 0.75, msaa: 0, shadow: 0, soft: 0, reflect: 0, bloom: false, grade: false, detail: 0.35, tex: 256, aniso: 1, env: 256, fill: false, haze: false, contact: true,
    blurb: 'Lit shapes with soft contact shadows only, at reduced resolution. For software rendering.' },
];
export const tierById = id => TIERS.find(t => t.id === id) || null;
const rank = id => TIERS.findIndex(t => t.id === id);
/* The cheaper of two tiers. */
export const cheaperOf = (a, b) => (rank(a) >= rank(b) ? a : b);

/* The neighbouring tier: dir +1 is cheaper, -1 is costlier; null at either end. */
export function tierStep(id, dir) {
  const i = TIERS.findIndex(t => t.id === id), next = TIERS[i + dir];
  return i < 0 || !next ? null : next.id;
}

/* ---------- what each part of the machine can carry ---------- */
/* The GPU by name: its class, and the tier that class carries. Software renderers always land on Lite. */
export function gpuVerdict({ name = '', mobile = false }) {
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(n)) return { tier: 'lite', kind: 'software renderer' };
  if (mobile) return /apple|adreno \(tm\) (7|8)|mali-g7|immortalis/.test(n) ? { tier: 'medium', kind: 'high-end mobile GPU' } : { tier: 'low', kind: 'mobile GPU' };
  if (/rtx [2-9]\d|geforce rtx|radeon rx [5-9]\d{3}|radeon pro|arc\(tm\) a|arc a\d|apple m[3-9]/.test(n)) return { tier: 'ultra', kind: 'high-end GPU' };
  if (/apple m[12]|apple gpu/.test(n)) return { tier: 'high', kind: 'Apple silicon GPU' };
  if (/gtx|geforce|radeon rx|rx \d{3}/.test(n)) return { tier: 'high', kind: 'dedicated GPU' };
  if (/iris xe|iris\(r\) xe|radeon 7\d\dm|radeon 8\d\dm|arc\(tm\) graphics|arc graphics/.test(n)) return { tier: 'medium', kind: 'modern integrated GPU' };
  if (/iris|uhd|radeon(\(tm\))? graphics|vega/.test(n)) return { tier: 'low', kind: 'integrated GPU' };
  if (/intel.*hd|hd graphics/.test(n)) return { tier: 'low', kind: 'older integrated GPU' };
  return { tier: 'medium', kind: 'unrecognised GPU' };
}
/* The CPU by its threads and its measured speed: score 1 is one core of a recent laptop. It runs the physics and
   feeds the GPU, so a slow or two-thread CPU caps the tier however good the GPU is. */
export function cpuVerdict({ cores = 4, cpu = 1 }) {
  let tier = cores <= 2 ? 'low' : cores <= 4 ? 'high' : 'ultra';
  if (cpu < 0.3) tier = cheaperOf(tier, 'low');
  else if (cpu < 0.5) tier = cheaperOf(tier, 'medium');
  else if (cpu < 0.8) tier = cheaperOf(tier, 'high');
  return { tier };
}
/* Memory as the browser reports it (rounded, and at most 8 GB in Chromium; other browsers do not say). The richer
   tiers hold larger textures, shadow maps and render targets. */
export function memoryVerdict({ memory = null }) {
  if (memory == null) return { tier: 'ultra', unknown: true };
  return { tier: memory <= 2 ? 'low' : memory <= 4 ? 'medium' : 'ultra' };
}
/* The GPU's hard limits: the largest texture it takes. */
export function limitsVerdict({ maxTexture = 0 }) {
  return { tier: maxTexture && maxTexture < 4096 ? 'low' : maxTexture && maxTexture < 8192 ? 'high' : 'ultra' };
}
/* The suggested starting tier: the cheapest of the four verdicts, with the part that set it. The automatic mode then
   corrects it from measured frame times, so this only has to land near the right rung. */
export function suggestTier(device) {
  const parts = [['GPU', gpuVerdict(device)], ['CPU', cpuVerdict(device)], ['Memory', memoryVerdict(device)], ['GPU limits', limitsVerdict(device)]];
  let tier = 'ultra', by = null;
  for (const [what, v] of parts) if (rank(v.tier) > rank(tier)) { tier = v.tier; by = what; }
  return { tier, by, parts };
}
/* Kept for callers that classify by GPU alone. */
export const classifyGPU = device => cheaperOf(gpuVerdict(device).tier, memoryVerdict(device).tier);

/* A short, fixed sum of floating-point work, timed: its best of three 4 ms runs after a warm-up, over the rate of one
   core of a recent laptop (30 000 steps a millisecond). About 16 ms, once, at start-up. */
export function benchCPU() {
  const run = ms => { let x = 0.5, n = 0; const t0 = performance.now(); let t = t0;
    while ((t = performance.now()) - t0 < ms) { for (let i = 0; i < 2000; i++) x = Math.sin(x * 1.0001 + i) * Math.sqrt(i + x * x + 1); n++; }
    return Number.isFinite(x) ? n * 2000 / (t - t0) : 0; };
  run(4);
  return Math.max(run(4), run(4), run(4)) / 30000;
}

/* What this machine reports, and what it can carry. The context is released at once, so the probe does not count
   against the browser's limit on live contexts. */
export function probeDevice() {
  const device = { webgl2: false, name: 'Unknown GPU', cores: navigator.hardwareConcurrency || 4, memory: navigator.deviceMemory ?? null,
    mobile: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), maxTexture: 0, maxSamples: 0, maxAniso: 1, cpu: 1, suggest: 'lite', verdict: null };
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return device;
    const info = gl.getExtension('WEBGL_debug_renderer_info'), aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    device.webgl2 = true;
    device.name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    device.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    device.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    if (aniso) device.maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch (_) { return device; /* no WebGL 2: the mode stays 2D */ }
  try { device.cpu = benchCPU(); } catch (_) { device.cpu = 1; }
  device.verdict = suggestTier(device);
  device.suggest = device.verdict.tier;
  return device;
}
