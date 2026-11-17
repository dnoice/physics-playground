/*
✒ Metadata
    - Title: Shaded Drawing (digiSpace Edition - v2.19)
    - File Name: draw.js
    - Relative Path: js/core/draw.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for easier selection: followRing, hoverTag and segDist, so
      Gravity's flat and 3D views draw the followed body's ring and the hover
      tag from one place and pick a drawn line by its distance.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added
      rrect(), a rounded-rectangle path with a plain fallback for Firefox
      before 112.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Canvas drawing for bodies with volume: lit spheres, cached sphere
    sprites, star glows, brush rings, and the rings and tags that show what
    is selected and what a click would take.

✒ Key Features:
    - drawSphere and drawLit shade discs as spheres from a fixed light
      direction.
    - sphereSprite caches pre-rendered spheres for scenes with hundreds of
      balls.
    - zoomOf reads the current canvas zoom so strokes stay one screen pixel
      wide.
    - rrect draws rounded rectangles wherever the browser lacks roundRect.
    - followRing, hoverTag and segDist: the selected object's ring, the
      hover ring with its tag, and the distance to a drawn line for picking.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { THEME } from './color.js';
import { TAU, clamp, reduceMotion } from './util.js';
import { view } from './view.js';

/* Screen pixels per world unit under the context's current transform. */
export function zoomOf(g) { const t = g.getTransform(); return Math.hypot(t.a, t.b) / view.dpr || 1; }
export function brushRing(g, p, r, color = THEME.text) {
  if (!p) return;
  const k = 1 / zoomOf(g);
  g.save(); g.strokeStyle = color; g.globalAlpha = 0.55; g.lineWidth = k; g.setLineDash([3 * k, 4 * k]);
  g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke(); g.restore();
}
/* The selected object's ring: amber and dashed, its dashes running so it reads as live (still for reduced motion). */
export function followRing(g, x, y, r) {
  g.save(); g.strokeStyle = THEME.amber; g.globalAlpha = 0.85; g.lineWidth = 1.3; g.setLineDash([4, 4]); g.lineDashOffset = reduceMotion ? 0 : -performance.now() / 60;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore();
}
/* What a click would take: a ring round the object at (x, y), drawn r pixels across, and a one-line tag beside it,
   kept on a stage w × h. Shared by Gravity's flat and 3D views. */
export function hoverTag(g, x, y, r, label, w, h, color = THEME.text) {
  const R = r + 5;
  g.strokeStyle = color; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  g.font = `400 11px ${THEME.mono}`; const tw = g.measureText(label).width;
  const lx = clamp(x + R + 6, 4, w - tw - 14), ly = clamp(y - R - 6, 16, h - 6);
  g.fillStyle = 'rgba(10,14,20,0.82)'; g.fillRect(lx - 5, ly - 13, tw + 10, 18);
  g.fillStyle = THEME.text; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(label, lx, ly);
}
/* How far a point lies from the segment a–b, all in stage pixels: the test for a click on a drawn line. */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
export const WHITE = [255, 250, 240], BLACK = [4, 6, 10];
export const mixRgb = (c, t, f) => [c[0] + (t[0] - c[0]) * f, c[1] + (t[1] - c[1]) * f, c[2] + (t[2] - c[2]) * f];
export const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const rampRgb = (R, i) => [R.rgb[i * 3], R.rgb[i * 3 + 1], R.rgb[i * 3 + 2]];
/* A lit sphere seen from the front: key light from the upper left, a darkened limb. */
/* A rounded rectangle path; a plain one where the context lacks roundRect (Firefox before 112). */
export function rrect(g, x, y, w, h, r) { if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
export function drawSphere(g, x, y, r, c, alpha = 1, lx = -0.45, ly = -0.55) {
  const grd = g.createRadialGradient(x + lx * r * 0.62, y + ly * r * 0.62, r * 0.03, x + lx * r * 0.2, y + ly * r * 0.2, r * 1.06);
  grd.addColorStop(0, css(mixRgb(c, WHITE, 0.74), alpha));
  grd.addColorStop(0.16, css(mixRgb(c, WHITE, 0.3), alpha));
  grd.addColorStop(0.5, css(c, alpha));
  grd.addColorStop(0.84, css(mixRgb(c, BLACK, 0.48), alpha));
  grd.addColorStop(1, css(mixRgb(c, BLACK, 0.74), alpha));
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
/* Pre-rendered spheres for scenes with hundreds of balls; drawn with drawImage. */
export const spriteCache = new Map();
export function sphereSprite(c) {
  const key = c.join(',');
  let s = spriteCache.get(key);
  if (!s) { s = document.createElement('canvas'); s.width = s.height = 128; drawSphere(s.getContext('2d'), 64, 64, 63.5, c); spriteCache.set(key, s); }
  return s;
}
/* A body seen from above, lit in its own plane: the terminator is a straight
   diameter and Lambert shading rises linearly toward the limb facing the light. */
export function drawLit(g, x, y, r, c, lx, ly) {
  g.fillStyle = css(mixRgb(c, BLACK, 0.8)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  const grd = g.createLinearGradient(x - lx * r * 0.06, y - ly * r * 0.06, x + lx * r, y + ly * r);
  grd.addColorStop(0, css(c, 0)); grd.addColorStop(0.12, css(mixRgb(c, BLACK, 0.35), 0.92));
  grd.addColorStop(0.6, css(c)); grd.addColorStop(1, css(mixRgb(c, WHITE, 0.42)));
  g.fillStyle = grd; g.fill();
  if (r > 6) {
    const a = Math.atan2(ly, lx), lw = Math.max(1, r * 0.07);
    g.strokeStyle = css(mixRgb(c, WHITE, 0.55), 0.42); g.lineWidth = lw;
    g.beginPath(); g.arc(x, y, r - lw / 2, a - 1.3, a + 1.3); g.stroke();
  }
}
/* A star: hot white core darkening to an orange limb. */
export function drawStar(g, x, y, r) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, '#fffbf0'); grd.addColorStop(0.5, '#ffe9b8'); grd.addColorStop(0.86, '#f7b25a'); grd.addColorStop(1, '#d97a2c');
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
