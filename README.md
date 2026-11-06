<!--
✒ Metadata
    - Title: Physics Playground Readme (digiSpace Edition - v2.0)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
share one workspace, one camera, one capture system and one set of tools.
The project is plain ES modules with no build step: open it through any
static web server and it runs.

## The labs

| Key | Lab | What it simulates | Scenes |
| --- | --- | --- | --- |
| 1 | Gravity | N-body Newtonian gravity in 3D, leapfrog integrator | Star system, Kepler ellipses, Binary star, Figure-eight, Accretion disk, Tilted orbits, Empty sky |
| 2 | Collisions | Hard discs with restitution and contact friction | Ideal gas, Gravity pile, Billiard break, Brownian motion |
| 3 | Fluid | Smoothed-particle hydrodynamics with a GPU liquid surface | Dam break, Obstacle course, Droplet splash, Twin columns, Zero-g collision |
| 4 | Waves | The 2-D wave equation on a grid, flat or as a 3D relief | Open tank, Double slit, Single slit, Two sources, Phased array, Glass lens, Moving source |
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

## Using the workspace

The workspace is a bento grid of tiles around the stage.

- **Stage** (large, top left): the simulation, with play, step, reset,
  speed, and capture buttons in its header and the rewind timeline below.
  The gizmo on the right zooms, pans, frames the view and holds lab extras
  such as Follow, Relief 3D and the 3D orbit view.
- **Scene**: the lab's scenes as chips. Loading one restarts the run.
- **Tools**: what the pointer does on the stage, each with a letter key.
- **Parameters**: sliders, choices and switches. A disabled control says
  why underneath.
- **Bottom bay**: the chart, readouts, diagnostics and a notebook with
  Experiments, Guide, Math and Library pages.

Press **F** to give the stage the whole window and **Shift+B** to hide the
bottom bay. The layout reflows to two columns below 1180 px and to one
column below 760 px.

### Mouse and touch

- Wheel zooms at the cursor. Middle-drag, right-drag or Space-drag pans.
- In a 3D view, right-drag orbits and Shift-drag pans. Drag the axis ball
  to orbit, or click an axis to look along it.
- On touch screens, pinch zooms and two fingers pan.

### Keyboard

| Keys | Action |
| --- | --- |
| Space | Play or pause (hold and drag to pan) |
| . and , | Step forward one frame, step back through the rewind history |
| R | Reset the scene |
| 1–7 | Switch lab |
| Letters | Pick a tool (shown on each tool button) |
| + − 0 | Zoom in, zoom out, frame the view |
| Arrow keys | Pan, or orbit in a 3D view |
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
| 3D | three.js 0.187.0 | Lit, bloomed 3D orbit view; loaded only when the view opens |
| Fluid and relief | Hand-written WebGL 2 | Small, fast shaders that predate the split |
| Tooling | Node.js scripts, ESLint, Playwright tests | Dev server, checks and browser tests with no runtime dependencies |

The third-party pieces and their licences are listed in
[vendor/VENDOR.md](vendor/VENDOR.md). If a CDN cannot be reached, the
playground keeps working: formulas fall back to their TeX source, icon
names hide, and the 3D orbit view says it is unavailable and stays flat.

## Project layout

```text
index.html            page, tiles, CDN links and import map
css/                  tokens, icons, workspace, controls, stage, tiles, library, responsive
js/main.js            boot sequence
js/core/              pure helpers: DOM, colour, charts, drawing, maths, icons, TeX
js/render/            WebGL renderers: fluid surface, wave relief, three.js orbit view
js/labs/              one module per lab, the 3D gravity view, the experiments curriculum, the registry
js/shell/             workspace: state, panel, tools, camera, stage input, loop, capture, library, experiments
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
modules, import maps and container queries. The fluid surface uses WebGL 2
or WebGL 1 and draws as particles without either. The wave relief and the
3D orbit view need WebGL 2; without it they say so and stay flat.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
