/*
✒ Metadata
    - Title: Guide Page (digiSpace Edition - v2.19)
    - File Name: guide.js
    - Relative Path: js/shell/guide.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for a duplication sweep: the Guide becomes a static legend
      of the tools, Random and views (glyph, name, key and hint) with a line
      naming the scenes. Its tool, view, Random and scene buttons, which
      repeated the rail and the scene menu, are removed with syncGuide().
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created on
      Dennis's call for a Guide wired to the simulation: the lab's tools,
      views and scenes as cards that pick them, beside the lab's own notes. A
      lab that places things shows a Random card with its tools, which turns
      random placement on and off as the rail's dice does.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the Guide page from what the lab declares: what it shows, a
    legend of its pointer tools, Random placement and views (each glyph, name,
    key and what it does), where its scenes are, its own interaction notes,
    and how to move around. The Guide explains; the stage rail, the scene
    menu and Controls are where things are picked.

✒ Key Features:
    - A static legend: glyph, name, key and hint for each tool and view, the
      same glyphs the rail shows, with nothing to press and nothing to keep
      in step.
    - The Random row says where the dice and the Controls switch are.
    - The Scenes line names the lab's scenes and points to the menu beside
      the lab's name.
    - The lab's own notes and the navigation help keep their place below.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { icon } from '../core/icons.js';
import { $, el } from '../core/util.js';
import { navHelp } from './panel.js';

const section = (title, ...children) => el('section', { class: 'g-sec' }, el('h4', { class: 'g-title', text: title }), ...children);
/* One row of the legend: the rail's glyph, the name, the key that picks it and what it does. A legend explains; the rail,
   the scene menu and Controls are where things are picked, so nothing here is a control. */
const row = (glyph, name, key, hint) => el('div', { class: 'g-row' },
  el('dt', { html: `${icon(glyph)}<span class="g-name">${name}</span>${key ? `<kbd>${key}</kbd>` : ''}` }), el('dd', { class: 'g-hint', text: hint || '' }));
const legend = rows => el('dl', { class: 'g-legend' }, ...rows);
const listed = names => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export function buildGuide(lab) {
  const parts = [el('p', { class: 'blurb', text: lab.blurb })];
  // Tools: what a click on the stage does, picked on the rail or by its key.
  if (lab.dock) {
    const rows = lab.dock.options.map(o => row(o.icon, o.label, o.key.toUpperCase(), o.hint));
    // Random placement modifies every tool that places something, so it is told with them.
    if (lab.random) rows.push(row('dice', 'Random', '', `${lab.random.tip || lab.random.label}. The dice under the tools on the rail turns it on and off, as does its switch in Controls.`));
    parts.push(section('Tools', el('p', { class: 'g-lead', text: 'Pick one on the stage\'s rail, or press its key.' }), legend(rows)));
  }
  if (lab.views) parts.push(section('Views', el('p', { class: 'g-lead', text: 'What the stage shows, picked on the rail; V steps to the next, and the run carries on.' }), legend(lab.views.options.map(o => row(o.icon, o.label, 'V', o.tip)))));
  // Scenes load from the menu beside the lab's name; the Guide only says which there are.
  const names = lab.presets.map(pr => pr.label);
  parts.push(section('Scenes', el('p', { class: 'g-lead', text: `${names.length} scene${names.length === 1 ? '' : 's'}: ${listed(names)}. Pick one from the menu beside the lab's name above the stage; it loads at once and restarts the run.` })));
  parts.push(section('How it works', el('ul', { class: 'interact', html: lab.interact.map(s => `<li>${s}</li>`).join('') })));
  parts.push(section('Moving around', el('p', { class: 'g-nav', html: navHelp(lab) })));
  $('#guide').replaceChildren(el('div', { class: 'guide' }, ...parts));
}
