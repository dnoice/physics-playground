/*
✒ Metadata
    - Title: Icon Glyphs (digiSpace Edition - v2.0)
    - File Name: icons.js
    - Relative Path: js/core/icons.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0: Dennis asked for Google icons so the playground has one
      cohesive look; replaces the hand-drawn SVG icon set.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Maps every tool, lab and alert to a Material Symbols Rounded glyph and
    builds the decorative icon spans.

✒ Key Features:
    - ICON and LAB_ICON name each glyph once; tools/check.mjs confirms the
      font subset carries them.
    - ms() returns markup and msEl() a DOM node, both aria-hidden.
    - SWAPPED_GLYPHS lists glyphs code writes into an existing span (play,
      pause, focus).

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { el } from './util.js';
/* Material Symbols Rounded glyph names for every tool, lab and action. The
   font is subset by the icon_names list in index.html; tools/check.mjs keeps
   that list and these names in step. */
export const ICON = {
  throw: 'arrow_outward', erase: 'delete', pan: 'pan_tool', grab: 'back_hand', heat: 'local_fire_department', cool: 'ac_unit',
  stir: 'cyclone', push: 'open_in_full', pull: 'close_fullscreen', pour: 'water_drop', obstacle: 'radio_button_checked',
  drain: 'format_color_reset', pulse: 'radar', wall: 'view_column', eraser: 'ink_eraser', source: 'adjust', glass: 'lens_blur',
  pend: 'linear_scale', phase: 'scatter_plot', cut: 'content_cut', pin: 'keep', ball: 'sports_baseball',
  plus: 'add_circle', minus: 'do_not_disturb_on', move: 'open_with', launch: 'rocket_launch', probe: 'point_scan',
  clip: 'movie', data: 'monitoring', state: 'bookmark', follow: 'my_location', cube: 'deployed_code',
  crit: 'error', warn: 'warning', info: 'info',
};
/* Lab glyph and the CSS animation it plays on the selected tab. */
export const LAB_ICON = {
  gravity: ['orbit', 'spin'], collisions: ['bubble_chart', 'bob'], fluid: ['water_drop', 'bob'], waves: ['airwave', 'pulse'],
  chaos: ['cyclone', 'spin'], cloth: ['texture', 'sway'], fields: ['electric_bolt', 'flash'],
};
/* Markup for a decorative glyph; screen readers rely on the surrounding label. */
export const ms = (name, cls = '') => `<span class="ms${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
export const icon = k => ms(ICON[k] || k);
/* The same glyph as a DOM node, for code that builds elements with el(). */
export const msEl = (name, cls = '') => el('span', { class: 'ms' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', text: name });
/* Glyphs that code writes into an existing icon span (play/pause, focus,
   experiment banner). Listed so tools/check.mjs can confirm the font subset
   in index.html carries them. */
export const SWAPPED_GLYPHS = ['pause', 'play_arrow', 'fullscreen', 'fullscreen_exit', 'task_alt', 'science'];
