/*
✒ Metadata
    - Title: Graphics Tiers (digiSpace Edition - v2.1)
    - File Name: tiers.js
    - Relative Path: js/core/tiers.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: named graphics tiers and device detection, on
      Dennis's call for a tier system.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The graphics tiers of the 3D mode, cheapest last, and the device probe
    that suggests one. Pure data and a throwaway WebGL query, so the shell can
    show the choice before three.js has loaded.

✒ Key Features:
    - Five tiers from Ultra to Lite: resolution, antialiasing, shadow map
      size, floor reflections, bloom, film grade and mesh detail.
    - probeDevice() reads the GPU name, threads, memory and sample limits.
    - classifyGPU() turns those into a suggested tier; software renderers
      always land on Lite.
    - tierStep() walks up or down the ladder for the automatic mode.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* Costliest first. scale caps the render resolution against the device pixel
   ratio; msaa is samples on the scene target; shadow is the map edge in texels
   (0 turns shadows off); reflect is the floor reflection's share of full
   resolution (0 turns it off); bloom and grade switch the post passes; detail
   scales mesh grids, ribbon density and anything else a scene can thin out. */
export const TIERS = [
  { id: 'ultra', label: 'Ultra', scale: 2, msaa: 4, shadow: 4096, reflect: 0.75, bloom: true, grade: true, detail: 1,
    blurb: 'Full resolution, 4096 shadows, sharp reflections. For strong dedicated GPUs.' },
  { id: 'high', label: 'High', scale: 1.5, msaa: 4, shadow: 2048, reflect: 0.5, bloom: true, grade: true, detail: 0.85,
    blurb: 'The intended look at 1.5× resolution. For dedicated GPUs and recent Apple silicon.' },
  { id: 'medium', label: 'Medium', scale: 1.25, msaa: 2, shadow: 1536, reflect: 0.33, bloom: true, grade: true, detail: 0.65,
    blurb: 'Softer reflections and lighter meshes. For recent integrated graphics.' },
  { id: 'low', label: 'Low', scale: 1, msaa: 0, shadow: 1024, reflect: 0, bloom: true, grade: false, detail: 0.5,
    blurb: 'No floor reflections or antialiasing, shadows and glow kept. For older laptops and phones.' },
  { id: 'lite', label: 'Lite', scale: 0.75, msaa: 0, shadow: 0, reflect: 0, bloom: false, grade: false, detail: 0.35,
    blurb: 'Lit shapes with no shadows or post effects, at reduced resolution. For software rendering.' },
];
export const tierById = id => TIERS.find(t => t.id === id) || null;

/* The neighbouring tier: dir +1 is cheaper, -1 is costlier; null at either end. */
export function tierStep(id, dir) {
  const i = TIERS.findIndex(t => t.id === id), next = TIERS[i + dir];
  return i < 0 || !next ? null : next.id;
}

/* Suggest a starting tier. The automatic mode corrects it from measured frame
   times, so this only has to land near the right rung. */
export function classifyGPU({ name = '', cores = 4, memory = 8, mobile = false }) {
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(n)) return 'lite';
  if (mobile) return /apple|adreno \(tm\) (7|8)|mali-g7|immortalis/.test(n) ? 'medium' : 'low';
  if (/rtx [2-9]\d|geforce rtx|radeon rx [5-9]\d{3}|radeon pro|arc\(tm\) a|arc a\d|apple m[3-9]/.test(n)) return cores >= 8 && memory >= 8 ? 'ultra' : 'high';
  if (/gtx|geforce|radeon rx|rx \d{3}|apple m[12]|apple gpu/.test(n)) return 'high';
  if (/iris xe|iris\(r\) xe|radeon 7\d\dm|radeon 8\d\dm|arc\(tm\) graphics|arc graphics/.test(n)) return 'medium';
  if (/iris|uhd|radeon(\(tm\))? graphics|vega/.test(n)) return cores >= 8 ? 'medium' : 'low';
  if (/intel.*hd|hd graphics/.test(n)) return 'low';
  return cores >= 8 && memory >= 8 ? 'medium' : 'low';
}

/* What this machine reports. The context is released at once, so the probe
   does not count against the browser's limit on live contexts. */
export function probeDevice() {
  const device = { webgl2: false, name: 'Unknown GPU', cores: navigator.hardwareConcurrency || 4, memory: navigator.deviceMemory || 8,
    mobile: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), maxTexture: 0, maxSamples: 0, suggest: 'lite' };
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return device;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    device.webgl2 = true;
    device.name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    device.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    device.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    device.suggest = classifyGPU(device);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch (_) { /* no WebGL 2: the mode stays 2D */ }
  return device;
}
