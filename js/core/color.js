/*
✒ Metadata
    - Title: Colour Ramps (digiSpace Edition - v2.0)
    - File Name: color.js
    - Relative Path: js/core/color.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the 256 and 512-step colour ramps the labs draw with and reads
    the theme colours from CSS custom properties.

✒ Key Features:
    - RAMP_HEAT, RAMP_WAVE, RAMP_GLOW and RAMP_DENS as CSS strings and
      packed RGB.
    - readTheme() copies --ink, --amber, --cyan and friends into THEME for
      canvas drawing.
    - hexToRgb and makeRamp for new ramps.

✒ Usage Instructions:
    import { THEME, RAMP_HEAT } from '../core/color.js';

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/

import { clamp } from './util.js';

/* Colour ramps shared by every lab. */
export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function makeRamp(stops, n) {
  const rgb = new Uint8ClampedArray(n * 3), css = new Array(n);
  const s = stops.map(([t, h]) => [t, hexToRgb(h)]);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let k = 0;
    while (k < s.length - 2 && t > s[k + 1][0]) k++;
    const [t0, c0] = s[k], [t1, c1] = s[k + 1];
    const f = clamp((t - t0) / ((t1 - t0) || 1), 0, 1);
    const r = c0[0] + (c1[0] - c0[0]) * f, g = c0[1] + (c1[1] - c0[1]) * f, b = c0[2] + (c1[2] - c0[2]) * f;
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
    css[i] = `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  return { rgb, css, n };
}
export const RAMP_HEAT = makeRamp([[0, '#1f3f61'], [0.34, '#2fa6c8'], [0.68, '#f2a541'], [1, '#fff4dc']], 256);
export const RAMP_WAVE = makeRamp([[0, '#b4f0f7'], [0.24, '#2b86ad'], [0.5, '#0a0e14'], [0.76, '#b8692b'], [1, '#ffd690']], 512);
export const RAMP_GLOW = makeRamp([[0, '#0a0e14'], [0.28, '#4a2a10'], [0.66, '#e08b2e'], [1, '#fff3d2']], 256);
export const RAMP_DENS = makeRamp([[0, '#173550'], [0.45, '#2fa6c8'], [0.55, '#9fd9b8'], [0.75, '#f2a541'], [1, '#ef6461']], 256);

export const THEME = {};
export function readTheme() {
  const s = getComputedStyle(document.documentElement);
  for (const k of ['ink', 'bench', 'rule', 'text', 'muted', 'amber', 'cyan', 'ok', 'warn', 'crit']) THEME[k] = s.getPropertyValue('--' + k).trim();
  THEME.mono = s.getPropertyValue('--font-mono').trim();
}
