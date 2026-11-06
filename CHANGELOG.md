<!--
✒ Metadata
    - Title: Changelog (digiSpace Edition - v2.0)
    - File Name: CHANGELOG.md
    - Relative Path: CHANGELOG.md
    - Artifact Type: docs
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: the changelog companion the shipped
      headers point to.

✒ Description:
    Complete release history, newest first. Browser-delivered files keep
    only their latest entries in their headers and point here.

✒ Key Features:
    - Every entry in full, with the reasoning behind it.
    - v1.0 to v1.3 entries moved verbatim from the single-file header.
    - Release 2.0.0 broken down by structure, layout, features and fixes.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# Changelog

The complete release history of the physics playground. Browser-delivered
files carry only their latest entries in their headers; every entry lives
here in full, newest first.

## 2.0.0 (11/05/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Fourth pass, on Dennis's direction to implement the recommendations from
the previous review, give the growing codebase a proper separation of
concerns and a formal stack, bring in third-party CDNs for the heavy
lifting, use Google icons for a cohesive look, and consolidate the page
into a sectioned layout. He chose the bento workspace and the project
folder.

### Stack and structure

- The 5,300-line single file becomes `index.html`, 42 ES modules and 8
  stylesheets, with no build step: `js/core` (pure helpers), `js/render`
  (GPU renderers), `js/labs` (one module per lab), `js/shell` (the
  workspace) and `js/main.js`, which wires the shell in a fixed order.
  Physics is unchanged: a parity run after the split matched the single
  file exactly (gravity, collisions and capture datasets).
- Third-party code through an import map, pinned: three.js 0.187.0 and
  KaTeX 0.19.1 from jsDelivr, Material Symbols Rounded and the text faces
  from Google Fonts. KaTeX's stylesheet and fonts are vendored because the
  artifact host only allows fonts from Google or the page itself.
- Tooling: `package.json` scripts, a zero-dependency dev server, ESLint,
  `tools/check.mjs` (headers, changelog bounds, icon subset, syntax) and
  the Playwright suites with a runner.

### Layout and look

- Bento workspace: the stage tile with its transport and rewind timeline;
  Scene, Tools and Parameters tiles; a bottom bay with the chart,
  readouts, diagnostics and a notebook (Experiments, Guide, Math,
  Library). Focus mode (F) and a hideable bay (Shift+B).
- Material Symbols Rounded throughout: lab glyphs with small animations,
  tool, transport, capture and alert icons. The font request is subset to
  the 69 glyphs in use.
- Formula cards typeset with KaTeX instead of hand-built HTML.
- The stage keeps one size whatever lab or scene is loaded. Before, a long
  scene name could wrap the stage header, and the seven-lab rail could
  widen the page at 1280 px; both changed the simulation's world size.

### New features

- **Fields & charges lab** (key 7): point charges with a potential map,
  marching-squares equipotentials, traced field lines and a vector grid;
  test particles under the Lorentz force with the Boris pusher; uniform
  electric and magnetic fields with a gradient; six scenes (dipole,
  quadrupole, parallel plates with a beam, cyclotron motion, E × B drift,
  grad-B drift); add, move, launch, probe and erase tools; a particle
  energy chart; full rewind, datasets, tracks and saved states.
- **3D gravity with orbital tilt**: the N-body solver carries z and vz in
  every sum, and flat scenes still step bit-for-bit as before (checked to
  zero difference). A Tilted orbits scene, a tilt control for new orbits,
  an inclination readout, and z columns in datasets and tracks.
- **3D orbit view** for gravity with three.js, loaded on demand: lit
  spheres, glowing stars with bloom, fading trails, drop lines to the
  orbital plane, a polar grid and a starfield, on the same orbit camera,
  axis ball and tools as the wave relief. If three.js cannot load, the lab
  says so, disables the switch with the reason and stays flat.
- **Guided experiments**: 15 experiments across the seven labs, each with
  a scene, goal, steps and a live check; a stage banner tracks progress
  and finished experiments are remembered.

### Fixes

- New captures were filed into a Library page that might be hidden; the
  Library tab now shows a count and marks new items.
- Renaming a library item could send the first keys typed to the stage
  shortcuts, because the field took focus a frame late.
- Switches could not show why they were disabled; they now carry the
  reason underneath, as sliders already did.
- Material Symbols are shipped as decorative glyphs with their names
  hidden if the font cannot load.

## 1.3.0 (11/05/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Third pass on Dennis's call for mass and geometry in the bodies and
controls in the canvas. Adds a shared camera for every lab (wheel zoom at
the cursor, middle, right or Space-drag pan, pinch on touch), a stage
gizmo with zoom, pan, frame, an overview map and a scale bar, and a WebGL
2 Relief 3D view of the ripple tank with an orbit axis ball and picking.
Bodies gain volume: star-lit planets with click-to-follow, spinning discs
with Coulomb friction, steel pendulum bobs sized by mass, and shaded cloth
that shows folds and its lining.

## 1.2.0 (11/05/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Sidebar restyle on Dennis's call that it read too dense: roomier spacing
and line height, equations typeset as stacked fractions in their own
scrollable formula cards, ruled readout wells, a tiered transport with a
contextual rewind hint, and a storage meter in the Library.

## 1.1.0 (11/05/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Second pass on Dennis's direction: usability, interaction, features,
styling and performance. Adds a frame-time budget, live diagnostics with
one-click fixes, a stage tool dock, resettable and typeable sliders, a
resizable panel, gravity field view, gas pressure, fluid obstacles, a
phased array, phase space and a cloth collider. Mid-pass, Dennis asked to
capture runs he could not get back: added rewind history, video clips,
datasets, saved states and a durable library. On his call that the fluid
read as a pixelated blob, it now renders as a GPU liquid surface. Fixes
the cloth runaway he caught at extreme wind. The header follows the
doctype because the artifact host rejects pages that do not begin with it.

## 1.0.0 (11/05/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Initial build to Dennis's brief: six interactive labs (gravity,
collisions, fluid, waves, chaos, cloth) on one shared loop, panel and
chart layer.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
