/*
✒ Metadata
    - Title: Icon Glyphs (digiSpace Edition - v2.19)
    - File Name: icons.js
    - Relative Path: js/core/icons.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for a duplication sweep: the pan entry, left over from
      Gravity's removed Pan tool, is gone; the view controls' hand keeps its
      glyph.
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for Insights that narrate the run: STORY_ICON, the glyph
      of each kind of moment, all from glyphs the font subset already carries.
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Glyphs for
      the Library's actions: download, rename, preview, details and load.
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
  throw: 'arrow_outward', erase: 'delete', grab: 'back_hand', heat: 'local_fire_department', cool: 'ac_unit',
  stir: 'cyclone', push: 'open_in_full', pull: 'close_fullscreen', pour: 'water_drop', obstacle: 'radio_button_checked',
  drain: 'format_color_reset', pulse: 'radar', wall: 'view_column', eraser: 'ink_eraser', source: 'adjust', glass: 'lens_blur',
  pend: 'linear_scale', phase: 'scatter_plot', both: 'vertical_split', disp: 'waves', int: 'blur_on', cut: 'content_cut', pin: 'keep', ball: 'sports_baseball',
  plus: 'add_circle', minus: 'do_not_disturb_on', move: 'open_with', launch: 'rocket_launch', probe: 'point_scan',
  clip: 'movie', data: 'monitoring', state: 'bookmark', follow: 'my_location', cube: 'deployed_code', dice: 'casino',
  crit: 'error', warn: 'warning', info: 'info',
  download: 'download', rename: 'edit', preview: 'play_arrow', details: 'visibility', load: 'history',
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
/* The glyph of each kind of moment in Insights · Story (story.js writes it into the moment's icon span). Kinds are
   shared across labs where the meaning is: a settling liquid and a settling cloth both settle. */
export const STORY_ICON = {
  added: 'add_circle', pass: 'radar', merge: 'bubble_chart', infall: 'local_fire_department', plunge: 'local_fire_department', escape: 'rocket_launch',
  capture: 'my_location', loss: 'open_in_full', binary: 'adjust', bary: 'balance', perturb: 'orbit', orbit: 'task_alt', resonance: 'linear_scale',
  cross: 'warning', packed: 'warning', scale: 'straighten', momentum: 'arrow_outward', energy: 'check_circle', empty: 'radio_button_unchecked',
  relax: 'scatter_plot', cooling: 'ac_unit', pile: 'bubble_chart', pressure: 'monitoring', break: 'sports_baseball', walk: 'point_scan', still: 'check_circle',
  surge: 'waves', runup: 'view_column', squash: 'close_fullscreen', settle: 'check_circle', splash: 'water_drop', blobs: 'lens_blur', round: 'radio_button_unchecked', wake: 'radio_button_checked',
  arrive: 'radar', fringes: 'blur_on', beam: 'arrow_outward', standing: 'airwave', absorb: 'format_color_reset', doppler: 'speed', focus: 'center_focus_strong',
  lyapunov: 'show_chart', parted: 'vertical_split', flip: 'cyclone', regular: 'linear_scale', mode: 'airwave', damped: 'monitoring',
  tear: 'content_cut', rip: 'content_cut', flutter: 'flag', lean: 'arrow_outward', fall: 'keep',
  gyration: 'orbit', drift: 'arrow_outward', absorbed: 'radio_button_checked', trapped: 'my_location', deflect: 'electric_bolt',
};
