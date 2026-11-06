<!--
✒ Metadata
    - Title: Architecture Guide (digiSpace Edition - v2.0)
    - File Name: ARCHITECTURE.md
    - Relative Path: ARCHITECTURE.md
    - Artifact Type: docs
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05,2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: documentation for the formal stack.

✒ Description:
    How the modules fit together: layers, boot order, the frame loop, the
    lab contract, 3D views, experiments, capture, styles, and recipes for
    extending the playground.

✒ Key Features:
    - Layer diagram and dependency rules.
    - Required and optional lab hooks in two tables.
    - Recipes for a new lab, icon or third-party library.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer; the layer diagram renders
      where Mermaid is supported
---------
-->
# Architecture

How the playground is put together, and how to extend it without fighting
it. The [README](README.md) covers what the playground does and how to run
it.

## Principles

- **No build step.** The browser loads the same files that sit in the
  repository. Third-party code comes through the import map in
  `index.html`, pinned to exact versions.
- **Labs are data plus behaviour.** Each lab is one plain object that
  implements the lab contract below. The shell never special-cases a lab
  by name; it asks the lab through optional hooks.
- **Modules wire themselves only when asked.** Importing a module never
  touches the page. Each shell module exports `init()`, and `js/main.js`
  calls them in one fixed order.
- **State has one owner.** Shared mutable state lives in
  `js/shell/state.js`. Bindings other modules must change (`active`,
  `pointerIsDown`) change only through setters (`setActive`,
  `setPointerDown`).
- **Interfaces tell the truth.** A control that cannot act is disabled and
  says why. A feature that cannot load says so and falls back. Nothing on
  screen claims a state the simulation is not in.

## Layers

```mermaid
flowchart TB
  main[js/main.js boot] --> labs[js/labs/* labs, experiments, registry]
  main --> shell[js/shell/* workspace]
  shell --> labs
  labs --> core[js/core/* pure helpers]
  shell --> core
  labs --> render[js/render/* WebGL and three.js]
  render --> core
  shell -. import map .-> cdn[(jsDelivr: three, katex)]
  render -. import map .-> cdn
```

| Layer | Folder | Depends on | Holds |
| --- | --- | --- | --- |
| Core | `js/core/` | nothing outside core | DOM helpers, colour ramps, series, chart and sphere drawing, 3D maths, state codec, icon names, KaTeX loader |
| Render | `js/render/` | core | GPU renderers: SPH liquid surface, wave relief, three.js orbit view |
| Labs | `js/labs/` | core, render, a few shell services | One module per lab, the gravity 3D view, the experiments curriculum, the registry |
| Shell | `js/shell/` | core, labs | Everything around a lab: panel, tools, camera, input, loop, capture, storage, layout, experiments |

Labs may call shell services that are part of their job: `announce`,
`syncControl`, `setParam`, `updateNav`. They never build shell UI
themselves.

## Boot order

`js/main.js` imports `js/labs/index.js` first, so every lab object exists
before anything else reads it. Then `boot()` runs:

1. `layout.init` restores focus mode, the bay and the notebook tab.
2. `diagnostics.init`, `transport.init` (buttons and every keyboard
   shortcut), `stage.init` (pointer input), `navigator.init` (gizmo),
   `loop.init` (resize observer), `capture.init`, `workspace.init` (lab
   rail), `automation.init` (`window.PhysicsPlayground`).
3. `start()` reads the theme, sizes the stage, applies saved parameters
   and presets, builds the orbit ball and library controls, selects the
   lab from the address hash or the last visit, starts the frame loop and
   finally opens storage.

## The frame loop

`js/shell/loop.js` runs one `requestAnimationFrame` loop for the active
lab:

- **Simulation**: an accumulator feeds `lab.step(lab.dt())` in fixed steps,
  capped by `lab.maxSteps` and by a frame-time budget, then calls
  `lab.after(simulatedSeconds)`.
- **Drawing**: `drawStage` applies the camera and calls `lab.draw`.
- **Rates**: HUD and gizmo every 0.1 s; readouts, chart, capture chips and
  the experiment check every 0.25 s; diagnostics every 0.5 s.

## The lab contract

A lab is an object registered in `js/labs/index.js`. The registry adds
`t`, `size`, `ready`, `sceneP` and `experiments` to it.

### Required

| Member | Purpose |
| --- | --- |
| `id`, `name`, `title`, `aria` | Identity, rail label, scene heading, stage label for screen readers |
| `eq`, `eqTex` | Equation for the rail (HTML) and the Scene tile (TeX) |
| `blurb`, `interact[]` | Guide page text: what the lab shows and how to interact |
| `p`, `presetId`, `presets[]` | Parameters, the current scene, and scenes as `{ id, label, params }` |
| `controls[]` | `range`, `seg` and `toggle` controls bound to keys of `p` |
| `dt()`, `maxSteps` | Fixed time step and the per-frame step cap |
| `build(presetId, w, h)` | Create the scene for a stage of size w × h |
| `step(dt)` | Advance one fixed step |
| `draw(g, w, h)` | Draw onto the stage 2D context |
| `readouts()` | Rows of `[label, value, state?]`, with state `ok`, `warn`, `crit` or `idle` |
| `chart` | `{ title, caption, draw(c) }`, or `null` for no chart |
| `math` | HTML for the Math page; `[data-tex]` elements are typeset with KaTeX |

### Optional hooks

| Hook | Purpose |
| --- | --- |
| `dock`, `pointerDown`, `pointerMove`, `pointerUp`, `pointerCancel`, `cursorAt` | Tools on the stage; points arrive in world units unless `screenInput` is set |
| `actions[]` | Buttons under the parameters |
| `enabled(key)` | `true`, or a sentence saying why a control is disabled right now |
| `onParam(key, value)`, `onResize(w, h, ow, oh)`, `after(simDt)` | React to changes |
| `worldRect()`, `mini(g, k)`, `unit()` | Camera world size, overview map, scale bar units |
| `selfCam`, `camLocked()`, `onUserPan()`, `onCamZoom()`, `frameView()`, `navExtras[]` | Labs with their own camera (gravity) and extra gizmo buttons |
| `diagnose()`, `perfFixes()`, `sane()` | Insights with fixes, frame-budget fixes, a NaN guard |
| `snapshot()`, `restore(s)`, `histBudget`, `histInterval` | Rewind history |
| `serialize()`, `deserialize(o)` | Saved states (`genericState` from `core/codec.js` derives them from snapshot and restore) |
| `dataColumns[]`, `dataRow()`, `trackColumns[]`, `trackRows(out)`, `trackLabel` | Datasets and per-object tracks |

### 3D views

A lab with a 3D view returns `true` from `is3D()` while the view is live,
and implements the camera hooks the shell calls: `c3()` (yaw, pitch,
distance, target), `basis3()` (camera right, up, forward and eye),
`pick3(screenPoint)`, `orbit3(dx, dy)`, `pan3(dx, dy)`,
`zoom3(f, screenPoint, instant)`, `frame3()`, `actual3()`, `zoomPct3()`,
`snap3(axisId)` and `tick3(realSeconds)`. The waves relief
(`js/labs/waves.js` with `js/render/relief-gl.js`) and the gravity orbit
view (`js/labs/gravity3d.js` with `js/render/orbit3d.js`) both follow it,
so the axis ball, wheel, pan and frame behave the same in each.

The gravity view imports three.js only when it first opens. If the import
fails or WebGL is lost, `leave3D()` switches back to the flat view,
announces why, disables the switch with that reason, and adds an insight.

## Guided experiments

`js/labs/experiments.js` holds the curriculum, keyed by lab id:

```js
{
  id: 'drift', title: 'Same drift for every charge', scene: 'exb',
  goal: 'In crossed fields every particle drifts at E/B …',
  steps: ['Run the crossed-field scene for two cyclotron periods.', '…'],
  init(lab) { return { time: 0 }; },               // per-run memory
  check(lab, ctx, dt) { return { p: 0.4, note: '…' }; }, // progress 0–1 and a reading
}
```

`js/shell/experiments.js` runs one experiment at a time. Starting one
loads its scene. The check runs four times a second with the simulated
seconds since the last check. A reset re-runs `init`; leaving the scene
pauses progress; reaching `p = 1` marks the experiment finished in local
storage. Checks read lab state directly, never the formatted readouts.

## Capture and storage

`js/shell/capture.js` keeps the rewind history (snapshots every
`histInterval` seconds within `histBudget` bytes), records WebM clips of
the stage canvas, samples datasets at a fixed rate, and saves states.
`js/shell/vault.js` stores them: artifact storage when the page runs as a
published artifact, IndexedDB in a plain browser, memory as a last resort.
`js/shell/library.js` lists them in the notebook.

## Styles

The stylesheets load in this order, each building on the last:

| File | Holds |
| --- | --- |
| `tokens.css` | Colours, type, spacing, radius, the page grid |
| `icons.css` | Material Symbols styling and tab glyph animations |
| `workspace.css` | Top bar, lab rail, bento grid, tile chrome, keys sheet |
| `controls.css` | Buttons, segmented choices, sliders, switches |
| `stage.css` | Stage header, HUD, experiment banner, gizmo, timeline |
| `tiles.css` | Scene, tools, chart, readouts, diagnostics, notebook |
| `library.css` | Library page |
| `responsive.css` | Reflow and rail compaction for narrow screens |

Tiles are size containers, so their contents adapt with container queries
to the tile's width, not the window's. Grid tracks use `minmax(0, …)` and
the body grid is pinned to the viewport width, so no content can resize
the stage.

## Recipes

### Add a lab

1. Create `js/labs/<id>.js` exporting the lab object (start from
   `fields.js`, the newest and most complete example).
2. Register it in `js/labs/index.js`; its position sets its number key.
3. Add its glyph to `LAB_ICON` in `js/core/icons.js`, its tool glyphs to
   `ICON`, and any new glyph names to `icon_names` in `index.html`
   (sorted).
4. Give it a zoom range in `ZOOM_RANGE` in `js/shell/camera.js`.
5. Add its experiments under its id in `js/labs/experiments.js`.
6. Run `npm run verify` and `npm test`.

### Add an icon

Name it once in `js/core/icons.js` (or write it into markup with the `ms`
class), add it to the sorted `icon_names` list in the Material Symbols
link in `index.html`, and run `npm run check`. The checker fails if a
glyph the code uses is missing from the font subset.

### Add or upgrade a third-party library

Pin the exact version in the import map in `index.html`, record it in
`vendor/VENDOR.md`, and load it with a dynamic `import()` where it is not
needed at start-up. Stylesheets and fonts must come from Google Fonts or
the project itself (the artifact host's content policy), so vendor them
under `vendor/`.

## Conventions

- Every project file starts with the digiSpace ✒ header.
  Browser-delivered files keep at most three changelog entries in 40
  lines; the full history is in [CHANGELOG.md](CHANGELOG.md).
- Dates are written MM/DD/YYYY.
- `npm run verify` and `npm test` pass before a release.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
