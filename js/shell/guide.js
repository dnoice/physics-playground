/*
✒ Metadata
    - Title: Guide Page (digiSpace Edition - v2.5)
    - File Name: guide.js
    - Relative Path: js/shell/guide.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created on
      Dennis's call for a Guide wired to the simulation: the lab's tools,
      views and scenes as cards that pick them, beside the lab's own notes. A
      lab that places things shows a Random card with its tools, which turns
      random placement on and off as the rail's dice does.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Builds the Guide page from what the lab declares: what it shows, its
    pointer tools and views as cards that select them, its scenes as cards
    that load them, its own interaction notes, and how to move around. The
    cards mark the tool, view and scene in use, whichever way they were
    chosen.

✒ Key Features:
    - Tool and view cards with icon, name, key and what a click on the stage
      does; a click picks it, the same as on the stage rail.
    - A Random card beside the tools in labs that place things, reading On or
      Off, the same switch as the rail's dice.
    - Scene cards that load a scene, marked when it is the current one.
    - The lab's own notes and the navigation help keep their place below.
    - syncGuide() keeps the marks current at panel rate and after every
      setting change.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { icon } from '../core/icons.js';
import { $, el } from '../core/util.js';
import { selectDock, selectView, toggleRandom } from './dock.js';
import { applyPreset } from './lifecycle.js';
import { navHelp } from './panel.js';
import { announce } from './state.js';

let cards = [];
const section = (title, ...children) => el('section', { class: 'g-sec' }, el('h4', { class: 'g-title', text: title }), ...children);

export function buildGuide(lab) {
  cards = [];
  const parts = [el('p', { class: 'blurb', text: lab.blurb })];
  // Tools: what a click on the stage does. Each card picks its tool, as the rail and the keyboard do.
  if (lab.dock) {
    const list = el('div', { class: 'g-cards', role: 'group', 'aria-label': 'Pointer tools' }, ...lab.dock.options.map(o => {
      const b = el('button', { type: 'button', class: 'g-card', 'aria-pressed': 'false', html: `${icon(o.icon)}<span class="g-name">${o.label}</span><kbd>${o.key.toUpperCase()}</kbd><span class="g-hint">${o.hint || ''}</span>` });
      b.addEventListener('click', () => { selectDock(o.id); syncGuide(); });
      cards.push({ b, on: () => lab.p[lab.dock.key] === o.id });
      return b;
    }));
    // Random placement modifies every tool that places something, so it sits with them, as on the rail.
    if (lab.random) {
      const R = lab.random, b = el('button', { type: 'button', class: 'g-card g-switch', 'aria-pressed': 'false', html: `${icon('dice')}<span class="g-name">Random</span><span class="g-state" aria-hidden="true"></span><span class="g-hint">${R.tip || R.label}</span>` });
      b.addEventListener('click', () => { toggleRandom(); syncGuide(); });
      cards.push({ b, on: () => !!lab.p[R.key] });
      list.append(b);
    }
    parts.push(section('Tools', list));
  }
  if (lab.views) {
    const list = el('div', { class: 'g-cards', role: 'group', 'aria-label': 'Views' }, ...lab.views.options.map(o => {
      const b = el('button', { type: 'button', class: 'g-card', 'aria-pressed': 'false', html: `${icon(o.icon)}<span class="g-name">${o.label}</span><kbd>V</kbd><span class="g-hint">${o.tip || ''}</span>` });
      b.addEventListener('click', () => { selectView(o.id); syncGuide(); });
      cards.push({ b, on: () => lab.p[lab.views.key] === o.id });
      return b;
    }));
    parts.push(section('Views', list));
  }
  // Scenes: each loads at once and restarts the run, as the scene menu does.
  const scenes = el('div', { class: 'g-scenes', role: 'group', 'aria-label': 'Scenes' }, ...lab.presets.map(pr => {
    const b = el('button', { type: 'button', class: 'g-scene', 'aria-pressed': 'false', html: `<span class="ms" aria-hidden="true">play_circle</span>${pr.label}` });
    b.addEventListener('click', () => { applyPreset(lab, pr.id); announce(`${pr.label} loaded`); syncGuide(); });
    cards.push({ b, on: () => lab.presetId === pr.id });
    return b;
  }));
  parts.push(section('Scenes', scenes));
  parts.push(section('How it works', el('ul', { class: 'interact', html: lab.interact.map(s => `<li>${s}</li>`).join('') })));
  parts.push(section('Moving around', el('p', { class: 'g-nav', html: navHelp(lab) })));
  $('#guide').replaceChildren(el('div', { class: 'guide' }, ...parts));
  syncGuide();
}
/* Panel rate: mark the tool, view and scene in use, however they were chosen. */
export function syncGuide() {
  for (const c of cards) { const on = String(!!c.on()); if (c.b.getAttribute('aria-pressed') !== on) c.b.setAttribute('aria-pressed', on); }
}
