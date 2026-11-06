<!--
✒ Metadata
    - Title: Physics Playground Readme (digiSpace Edition - v2.1)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Documented the two modes and the graphics tiers; corrected the
      keyboard table and the Node.js floor.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: documentation for the formal stack.

✒ Description:
    What the playground is, how to run it, how to use the workspace, the
    keyboard, the stack and the project layout.

✒ Key Features:
    - Lab table with keys and scenes.
    - Quick start, development commands and browser support.
    - Workspace, capture and keyboard reference.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer; written for
      GitHub-flavoured Markdown
---------
-->
# Physics Playground

An interactive physics laboratory in the browser. Seven live simulations
share one workspace, one capture system and one set of tools, and each can
be seen in two modes: a flat 2D view, or a rendered 3D world where every lab
is a physical apparatus. The project is plain ES modules with no build step:
open it through any static web server and it runs.

## The labs

| Key | Lab | What it simulates | Scenes |
| --- | --- | --- | --- |
| 1 | Gravity | N-body Newtonian gravity in 3D, leapfrog integrator | Star system, Kepler ellipses, Binary star, Figure-eight, Accretion disk, Tilted orbits, Empty sky |
| 2 | Collisions | Hard discs with restitution and contact friction | Ideal gas, Gravity pile, Billiard break, Brownian motion |
| 3 | Fluid | Smoothed-particle hydrodynamics with a GPU liquid surface | Dam break, Obstacle course, Droplet splash, Twin columns, Zero-g collision |
| 4 | Waves | The 2-D wave equation on a grid | Open tank, Double slit, Single slit, Two sources, Phased array, Glass lens, Moving source |
| 5 | Chaos | Double pendulums started a hair apart | Sensitive start, Near inverted, Small swing, Normal mode |
| 6 | Cloth | Verlet cloth that stretches, tears and can be cut | Curtain, Hammock, Flag in wind, Fragile net |
| 7 | Fields | Point charges, potential, field lines and the Lorentz force | Dipole, Quadrupole, Parallel plates, Cyclotron motion, E × B drift, Grad-B drift |

Every lab has live readouts, diagnostics that explain extreme settings
and offer one-click fixes, a page of the maths behind it, and two or
three guided experiments with live progress checks. All but Cloth also
keep a running chart.

## Quick start

The modules load over HTTP only (a `file://` page cannot import them).
With Node.js 20.19 or later:

```bash
npm run dev
```

Then open <http://localhost:5173/>. Add a lab name to the address to open
it directly, for example <http://localhost:5173/#fields>. Any other static
server works too, for example `python -m http.server 5173`.

## Two modes: 2D and 3D

The **2D | 3D** switch in the top bar, or the **Z** key, changes the whole
workspace. Your choice is remembered.

- **2D** is the flat view of each lab: clear, fast and exact.
- **3D** stands each lab in a studio as a physical apparatus, lit with real
  shadows and reflections. The simulation is the same in both, so a run
  carries on when you switch, and every tool, rewind, recording and saved
  state works in either.

If 3D cannot run, because the browser lacks WebGL 2 or three.js could not
load, the workspace stays in 2D and says why.

| Lab | In 3D |
| --- | --- |
| Gravity | Open space: a nebula, plasma stars, and rocky, ocean and ringed gas worlds |
| Collisions | A slate air table in walnut and brass, which tilts when gravity is on |
| Fluid | A glass aquarium of real-looking liquid, with refraction and caustics |
| Waves | A walnut ripple tank with projected caustics and a screen graphing the fringes |
| Chaos | A slate dial in a brass bezel, with a glass torus in the phase view |
| Cloth | Woven fabric on a gantry, hammock posts, a flagpole or a net rail |
| Fields | A black glass bench with the potential as a relief of light |

No model or texture is downloaded: the lighting, wood, stone, brushed metal
and planets are all generated in the browser.

### Graphics tiers

The **Graphics** button beside the switch sets how much the 3D mode asks of
your machine.

| Tier | Resolution | Antialiasing | Shadows | Reflections | Meant for |
| --- | --- | --- | --- | --- | --- |
| Ultra | up to 2× | 4× | 4096 | sharp | Strong dedicated GPUs |
| High | up to 1.5× | 4× | 2048 | soft | Dedicated GPUs, recent Apple silicon |
| Medium | up to 1.25× | 2× | 1536 | softer | Recent integrated graphics |
| Low | 1× | none | 1024 | none | Older laptops and phones |
| Lite | 0.75× | none | none | none | Software rendering |

**Auto**, the default, starts from your GPU and adjusts to the frame rate. It
steps down when frames run long and back up when there is room. If a step
down buys nothing, it undoes it and stops adapting, because the limit is then
the solver or the display rather than the GPU. The Diagnostics tile says when
Auto changes tier, and offers a cheaper tier when a fixed one runs slowly.

## Using the workspace

The workspace is a bento grid of tiles around the stage.

- **Stage** (large, top left): the simulation, with play, step, reset,
  speed, and capture buttons in its header and the rewind timeline below.
  The gizmo on the right zooms, pans, frames the view and holds lab extras
  such as Follow.
- **Scene**: the lab's scenes as chips. Loading one restarts the run.
- **Tools**: what the pointer does on the stage, each with a letter key.
- **Parameters**: sliders, choices and switches. A disabled control says
  why underneath.
- **Instruments**: every reading as a live gauge beside the lab's chart.
  Click a gauge to plot it, up to four at once. Hover the plot to read any
  moment, click or drag along it to rewind to that moment, and use the wheel
  to zoom the time window. The pill shows the simulation's health, with the
  top alert and its fix beside it; click it for the full list.
- **Notebook**: Experiments, Guide, Math and Library pages.

Press **F** to give the stage the whole window and **Shift+B** to hide the
bottom bay. The layout reflows to two columns below 1180 px and to one
column below 760 px.

### Mouse and touch

- Wheel zooms at the cursor. Middle-drag, right-drag or Space-drag pans.
- In 3D mode, right-drag orbits and Shift-drag pans. Dragging the empty space
  around the apparatus orbits too, and so does the axis ball; click an axis to
  look along it. Z on the ball looks straight at the simulation plane. In
  Cloth the right button is a tool, so middle-drag orbits.
- Zooming in follows the cursor and zooming back out returns to the home
  view, so you can always find your way back.
- On touch screens, pinch zooms and two fingers pan.

### Keyboard

| Keys | Action |
| --- | --- |
| Space | Play or pause (hold and drag to pan) |
| . and , | Step forward one frame, step back through the rewind history |
| R | Reset the scene |
| 1–7 | Switch lab |
| Z | Switch between 2D and 3D |
| Letters | Pick a tool (shown on each tool button) |
| + − 0 | Zoom in, zoom out, frame the view |
| Arrow keys | Pan, or orbit in 3D mode |
| [ and ] | Halve or double the speed |
| M and D | Record a video clip, record a dataset |
| F and Shift+B | Focus the stage, hide the bottom bay |
| ? | Keyboard reference |

## Capturing runs

- **Rewind**: drag the timeline back to replay recent history. Playing
  from the past starts a new branch.
- **Video**: records the stage as a WebM clip.
- **Data**: records a CSV dataset of the lab's quantities, plus per-body
  tracks where the lab has them.
- **Save state**: stores the exact state of the scene to restore later.

Everything saved appears in the **Library** page of the notebook. The
Library tab shows how many items are saved and marks new ones. When the
page runs as a published artifact, the library syncs with the artifact;
otherwise it lives in this browser.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Code | Native ES modules, no bundler | Nothing to build; every file is the file that runs |
| Icons | Material Symbols Rounded (Google Fonts) | One cohesive icon family, subset to the glyphs used |
| Maths | KaTeX 0.19.1 | Real typesetting for formula cards; module from jsDelivr, CSS and fonts vendored |
| 3D | three.js 0.187.0 | The whole 3D mode, one renderer shared by every lab; loaded only when 3D is first used |
| 2D fluid surface | Hand-written WebGL | A small, fast shader for the flat view |
| Tooling | Node.js scripts, ESLint, Playwright tests | Dev server, checks and browser tests with no runtime dependencies |

The third-party pieces and their licences are listed in
[vendor/VENDOR.md](vendor/VENDOR.md). If a CDN cannot be reached, the
playground keeps working: formulas fall back to their TeX source, icon
names hide, and the workspace says 3D is unavailable and stays in 2D.

## Project layout

```text
index.html            page, tiles, CDN links and import map
css/                  tokens, icons, workspace, controls, stage, tiles, library, responsive
js/main.js            boot sequence
js/core/              pure helpers: DOM, colour, charts, drawing, maths, icons, TeX, graphics tiers
js/render/            the 2D fluid surface shader
js/render/world/      the 3D mode: engine, studio, materials, shapes, ribbons
js/render/world/scenes/  one three.js scene per lab
js/labs/              one module per lab, the plane camera, the gravity camera, the experiments curriculum, the registry
js/shell/             workspace: state, panel, tools, camera, stage input, loop, modes, capture, library, experiments
tools/                dev server and project checker
tests/                Playwright browser suites and their runner
vendor/katex/         KaTeX stylesheet, fonts and licence
```

[ARCHITECTURE.md](ARCHITECTURE.md) explains how the pieces fit together
and how to add a lab, a tool or an experiment.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Serve the project on port 5173 (`node tools/serve.mjs 8080` for another port) |
| `npm run lint` | ESLint over the modules and tools |
| `npm run check` | Headers, changelog bounds, icon subset and module syntax |
| `npm run verify` | Lint, then check |
| `npm test` | Run every browser suite against the running dev server |

The tests need Python 3 with Playwright (`pip install playwright` and
`playwright install chromium`). Start the dev server first, then run
`npm test`. Set `PP_URL` to test another address and `PP_SHOTS` to choose
where screenshots go.

## Browser support

Chrome and Edge 105+, Firefox 110+ and Safari 16.4+: the page needs ES
modules, import maps and container queries. The 2D fluid surface uses WebGL 2
or WebGL 1 and draws as particles without either. The 3D mode needs WebGL 2;
without it the workspace says so and stays in 2D.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
