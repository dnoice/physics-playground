<!--
✒ Metadata
    - Title: Physics Playground Readme (digiSpace Edition - v2.11)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 2.11.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.11.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.11.0: the release badge.
    - 2.10.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.10.0: Our Solar System's orbits fade back from each body and stay
      smooth in 3D, and it zooms anywhere, from a few thousand km to all of
      Sedna's orbit; the release badge.
    - 2.9.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.9.0: the Planet classes section (the five classes, By mass, the
      coupled controls, Random, Inspect's physical figures and mergers), the
      research reference in the layout and Documentation, the Gravity 3D row
      and the Random rail note, and the release badge.
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.8.0: Our Solar System in the highlights, the labs table and its own
      section with its picture (how to explore it, how faithful it is, how it
      is built and what it leaves out), and the release badge.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.7.0: the head-up display in the highlights, the workspace guide, the
      keyboard table and the project layout.
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.6.0: the release badge.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.5.0: live maths in the highlights, and the notebook's tabs described
      one by one (Controls, Experiments, Guide, Math, Library), with Inspect's
      history and focus chart and the Library's capture cards. Then the dials
      that replaced the sliders, and random placement with Gravity's planet
      types.
    - 2.4.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Badges
      regrouped on Dennis's report that they broke up the flow: one row of
      four project badges under the tagline, the stack badges at the head of
      Stack, the coffee badge signing off Credits, and the Node.js badge
      dropped; release badge 2.4.1.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      2.4.0 on Dennis's brief for one interaction architecture: the stage
      rail, the deck's Telemetry, Inspect and Insights panes, selecting and
      inspecting objects in every lab that has them, Chaos's three views, and
      the Units section with its scales; V and U join the keyboard table.
    - 2.3.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Release
      badge 2.3.1, now that the pictures it shows are in docs/media.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Described the sectioned Controls page and the new Chaos phase view,
      with its gallery picture; release badge 2.3.0.
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Rebuilt
      the presentation on Dennis's direction: a banner, themed badges,
      framed screenshots of the workspace, a gallery of the labs and the
      2D and 3D pair, plus sections on deploying to GitHub Pages, the
      documentation set, and the digiSpace Studio credit.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Documented the two modes and the graphics tiers; corrected the
      keyboard table and the Node.js floor.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: documentation for the formal stack.

✒ Description:
    The front page of the project: what the playground is, what it looks
    like, how to run, use, develop and deploy it, and where the rest of
    the documentation lives.

✒ Key Features:
    - Banner, badges and a framed hero screenshot of the 3D workspace.
    - Lab gallery with framed 3D captures and a reference table of keys
      and scenes.
    - Side-by-side 2D and 3D capture of one moment.
    - Quick start, workspace, keyboard and capture reference.
    - Development commands, the GitHub Pages pipeline and browser support.
    - Documentation map and credits.

✒ Other Important Information:
    - Dependencies: docs/media/*.webp (tools/media.py) and shields.io for
      the badges
    - Compatible platforms: Any Markdown viewer; written for
      GitHub-flavoured Markdown, where the centred blocks and badge rows
      render as designed
---------
-->
<p align="center">
  <img src="docs/media/banner.webp" width="100%"
    alt="Physics Playground: seven live physics labs in one browser workspace">
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#the-labs">Explore the labs</a> ·
  <a href="#our-solar-system">Our Solar System</a> ·
  <a href="#deploying-to-github-pages">Deploy</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

![The Physics Playground workspace in 3D: the Gravity lab's star system on
the stage with the stage rail at its top right, the player bar beneath it,
the instruments deck with live readings, and the inspector with the lab's
controls](docs/media/hero-workspace.webp)

<p align="center">
  <a href="https://dnoice.github.io/physics-playground/">
    <img src="https://img.shields.io/badge/live_demo-open_the_lab-f2a541?style=flat-square&labelColor=0c1118&logo=githubpages&logoColor=f2a541"
      alt="Live demo: open the lab">
  </a>
  <a href="https://github.com/dnoice/physics-playground/actions/workflows/pages.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/dnoice/physics-playground/pages.yml?branch=main&style=flat-square&label=pages&labelColor=0c1118&logo=githubactions&logoColor=5fd0df"
      alt="Pages workflow status">
  </a>
  <a href="CHANGELOG.md">
    <img src="https://img.shields.io/badge/release-v2.11.0-5fd0df?style=flat-square&labelColor=0c1118"
      alt="Release 2.11.0">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-Apache_2.0-5fd0df?style=flat-square&labelColor=0c1118&logo=apache&logoColor=5fd0df"
      alt="License: Apache 2.0">
  </a>
</p>

<h3 align="center">
  Seven live physics labs. One browser workspace.
</h3>

<p align="center">
  Exact simulations in 2D; physical, rendered apparatus in 3D.
  No build step required.
</p>

---

Physics Playground is an interactive physics laboratory that runs in your
browser. Explore seven simulations in one workspace, switch between 2D and
3D without interrupting a run, and use shared tools to inspect, measure and
capture what happens.

### What you can do

- **Explore seven labs**, from N-body gravity to the Lorentz force, with
  multiple scenes, live readings and interactive maths.
- **Switch between 2D and 3D** at any time. Both modes show the same
  simulation, and tools, rewind and recordings work in either mode.
- **Measure and inspect the run.** Plot readings, select objects to see
  their live figures, and use insights to understand unusual settings and
  apply suggested fixes.
- **See key information on the stage.** The head-up display shows readings,
  warnings and details for the selected object without covering the
  simulation controls.
- **Run guided experiments** with live checks of the claims they test.
- **Capture and revisit results** with rewind, WebM video, CSV datasets and
  saved states in the library.
- **Choose your units**: metric, US customary or the simulation’s own
  units.

Gravity also includes **Our Solar System**, a scene with real planetary
masses, sizes and orbits, plus moons, dwarf planets, Halley’s comet and
samples from the asteroid and Kuiper belts. The run begins at noon on
1 January 2000. Every world in Gravity belongs to one of the five
[planet classes](#planet-classes) of its research reference.

## The labs

Gravity is shown in the workspace image above. The other six labs are
pictured below; each image is a 3D capture from the playground.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/lab-collisions.webp" width="100%"
        alt="Collisions in 3D: a billiard break on a slate air table">
      <br><b>2 · Collisions</b><br>
      Hard discs with restitution and contact friction on a slate air table.
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/lab-fluid.webp" width="100%"
        alt="Fluid in 3D: a dam break in a glass aquarium">
      <br><b>3 · Fluid</b><br>
      Smoothed-particle hydrodynamics in a glass aquarium, with refraction
      and caustics.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/lab-waves.webp" width="100%"
        alt="Waves in 3D: double-slit interference in a walnut ripple tank">
      <br><b>4 · Waves</b><br>
      The 2D wave equation in a ripple tank, with a screen that graphs the
      interference fringes.
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/lab-chaos.webp" width="100%"
        alt="Chaos in 3D: a double pendulum beside its phase screen">
      <br><b>5 · Chaos</b><br>
      Double pendulums, explored through the pendulum, phase map or both
      views together.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/lab-cloth.webp" width="100%"
        alt="Cloth in 3D: woven fabric streaming from a flagpole">
      <br><b>6 · Cloth</b><br>
      Verlet cloth that stretches, tears and can be cut, woven and hung.
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/lab-fields.webp" width="100%"
        alt="Fields in 3D: charged particles in cyclotron motion over a glass bench">
      <br><b>7 · Fields</b><br>
      Point charges, electric potential, field lines and the Lorentz force.
    </td>
  </tr>
</table>

| Key | Lab | What it simulates | Scenes |
| --- | --- | --- | --- |
| 1 | Gravity | 3D Newtonian N-body gravity with a leapfrog integrator and substepped moons | Star system, Our Solar System, Kepler ellipses, Binary star, Figure-eight, Accretion disk, Tilted orbits, Empty sky |
| 2 | Collisions | Hard discs with restitution and contact friction | Ideal gas, Gravity pile, Billiard break, Brownian motion |
| 3 | Fluid | Smoothed-particle hydrodynamics with a GPU liquid surface | Dam break, Obstacle course, Droplet splash, Twin columns, Zero-g collision |
| 4 | Waves | The 2D wave equation on a grid | Open tank, Double slit, Single slit, Two sources, Phased array, Glass lens, Moving source |
| 5 | Chaos | Double pendulums and their phase map | Sensitive start, Near inverted, Small swing, Normal mode |
| 6 | Cloth | Verlet cloth that stretches, tears and can be cut | Curtain, Hammock, Flag in wind, Fragile net |
| 7 | Fields | Point charges, electric potential, field lines and the Lorentz force | Dipole, Quadrupole, Parallel plates, Cyclotron motion, E × B drift, Grad-B drift |

Every lab includes live readings, diagnostics with suggested fixes, and a
Math page that connects its formulas to the simulation. Each also has
guided experiments with live progress checks. All labs except Cloth have
a running chart.

## Our Solar System

![Gravity's Our Solar System in 3D. Left: the Sun, the planets out to
Saturn, Halley's comet and the asteroid belt, with their orbits and names
over the ecliptic grid. Right: Jupiter followed up close, with its large
moons on their orbits and the head-up display's target box and callout on
the planet](docs/media/sol-system.webp)

Pick **Our Solar System** from Gravity's scene menu. The real system starts
at noon on 1 January 2000, the J2000.0 epoch that astronomers measure from,
at its real masses and sizes:

- **The Sun, the eight planets and Pluto**, from JPL's J2000 orbital
  elements.
- **17 moons**:
  - our Moon;
  - Phobos and Deimos;
  - Jupiter's Io, Europa, Ganymede and Callisto, in their Laplace
    resonance;
  - Saturn's Enceladus, Rhea, Titan and Iapetus;
  - Uranus's Miranda, Ariel, Titania and Oberon, going round with the planet
    on its side;
  - Neptune's backward Triton;
  - Pluto's Charon.
- **The dwarf planets** Ceres, Haumea, Makemake and Eris, then Sedna, and
  Halley's comet on its backward orbit.
- **The belts**:
  - the main asteroid belt with its Kirkwood gaps;
  - Jupiter's Trojans, 60° ahead of and behind the planet;
  - the plutinos, which share Pluto's resonance with Neptune;
  - the Kuiper belt and the scattered disc.

To explore it:

- **Click a planet** to follow it, then zoom in. Its moons appear as soon
  as the zoom draws them clear of the planet. Inspect gives the planet's
  distance from the Sun, its period and its tilt from the ecliptic, and its
  real radius, density, gravity, escape speed and Hill sphere. Click a moon
  to see its orbit about its planet, and the Roche limit it must keep clear
  of: Phobos is already inside Mars's.
- **Orbits** and **Names**, under Display, draw each named body's ellipse
  and name. Each orbit is brightest at its body and fades back round, so it
  shows which way the body goes. The orbits stay smooth even when the 3D
  camera sits inside them. They are drawn in depth, so a planet hides the
  far side of its moons' orbits.
- **The clock** reads the date the run has reached. A year takes 4.4
  simulated seconds.
- **Zoom anywhere.** The wheel zooms toward the cursor, and each notch goes
  twice as far as in the other scenes. It reaches from a few thousand
  kilometres, close enough to see the Earth and Moon without following
  either, out to the whole of Sedna's orbit, 936 AU at its far end. The rail
  shows deep zooms in short form, such as 125k%.

How faithful it is, as `tests/solar.py` measures over a simulated year:

- ten periods, from Mercury's to Charon's, within 0.07 % of the real ones;
- the energy error never above 8e-8;
- Jupiter's Trojans still at L4 and L5.

How it is built:

- **Moons** from Phobos, round Mars in under 8 hours, to Iapetus share one
  run: each moon and its planet take their own substeps inside every step.
- **The belts' bodies** have no mass, so they feel every pull and cost
  almost nothing.
- **Our Moon** starts from its true position and velocity, by Meeus's lunar
  theory.

What it leaves out:

- general relativity, which adds 43″ a century to Mercury's perihelion
  shift;
- the planets' bulges, which turn the moons' orbital planes over the years.

It also simplifies two things:

- **The other moons' starting positions.** They start at the right distance,
  shape and plane, but not where they were on that day. Jupiter's four start
  in their true resonance.
- **The belts** are seeded samples of the real populations, not catalogued
  asteroids.

## Planet classes

Gravity names its worlds by the five planet classes of its research
reference,
[Planetary Classification and Governing Physics](docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md).
They are the classes with the firmest footing in data and theory, and the
reference adds brown dwarfs and stars above them:

| Class | Mass | Radius | What it is |
| --- | --- | --- | --- |
| Terrestrial | 0.02–1.5 Earth masses | up to 1.2 Earth radii | Compact rock and iron, like Mercury, Venus, Earth and Mars |
| Super-Earth | 1.5–10 Earth masses | 1.2–1.8 Earth radii | Rock squeezed denser than Earth's, below the radius valley; none in our Solar System |
| Sub-Neptune | 3–15 Earth masses | 1.8–3.5 Earth radii | A rocky core under a few per cent of hydrogen and helium: the most common planet in close orbits about Sun-like stars |
| Ice giant | 10–40 Earth masses | 3.5–6 Earth radii | Water, ammonia and methane under a hydrogen envelope, like Uranus and Neptune |
| Gas giant | 0.15–13 Jupiter masses | over 6 Earth radii | Mostly hydrogen and helium, like Jupiter and Saturn |
| Brown dwarf | 13 Jupiter masses to 0.08 solar masses | — | Past the deuterium-burning limit that caps a planet, so not one; above 0.08 solar masses, hydrogen burns and it is a star |

- **By mass**, under Type of new bodies, gives the class a body of that mass
  usually is. The boundaries are the reference's: 1.5 Earth masses; 4.37, where
  measured worlds turn from bare rock to gas envelopes; 10; 50; and 13 Jupiter
  masses. Between 4.4 and 10 Earth masses, mass alone cannot tell a rocky
  super-Earth from a sub-Neptune, so choose Super-Earth to have one.
- **A chosen type keeps its mass in range.** Choosing one moves the mass to a
  typical member's (Earth, LHS 1140 b, GJ 1214 b, Neptune, Jupiter), and
  dialling the mass out of its range hands the type back to By mass.
- **Random** draws a class, sub-Neptunes and super-Earths most often, then a
  mass evenly across its range.
- **Inspect** gives a world's radius, density, gravity at its surface or
  cloud tops, escape speed and Hill sphere. In the Solar System these come
  from the real radius and match the reference's table. Elsewhere the radius
  is estimated from the mass, along the class's branch of the reference's
  mass–radius relation. Inspect also says when a "planet" outweighs 1/25 of
  its star, which makes it a binary companion under the IAU's definition.
- **Mergers keep their composition**: rocky worlds stay rocky, a world with
  an envelope keeps it, and the class follows the new mass.

The stage still draws every world larger than life, so it can be seen;
Inspect gives the size it would really have. `tests/planets.py` checks
each class and figure against the reference's own data.

## Quick start

The fastest way in is the **[live lab][demo]**, served by GitHub Pages.

To run it yourself: the modules load over HTTP only (a `file://` page
cannot import them). With Node.js 20.19 or later:

```bash
npm run dev
```

Then open <http://localhost:5173/>. Add a lab name to the address to open
it directly, for example <http://localhost:5173/#fields>. Any other static
server works too, for example `python -m http.server 5173`.

## Two modes: 2D and 3D

![The same moment of the Waves lab's double slit, in 2D on the left and in
3D on the right, with the Z key between them](docs/media/modes-2d-3d.webp)

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
| Gravity | Open space: a nebula, plasma stars, and worlds in their planet class's colours: rocky terrestrials and super-Earths, hazy sub-Neptunes, banded ice and gas giants, some ringed |
| Collisions | A slate air table in walnut and brass, which tilts when gravity is on |
| Fluid | A glass aquarium of real-looking liquid, with refraction and caustics |
| Waves | A walnut ripple tank with projected caustics and a screen graphing the fringes |
| Chaos | A slate dial in a brass bezel; the phase screen beside it, or beside a glass torus |
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
the solver or the display rather than the GPU. The Insights pane says when
Auto changes tier, and offers a cheaper tier when a fixed one runs slowly.

## Using the workspace

The workspace is one large stage, an Instruments deck beneath it and a
full-height Inspector beside them.

- **Stage**: the simulation. The lab's name in the top left holds the scene
  dropdown; loading a scene restarts the run.
- **Stage rail**: hangs from the top-right corner, in the same place in every
  lab. **Camera** comes first (the axis ball in 3D, zoom, pan and frame), then
  what belongs to this lab: its **Tools** (what a click does), its **View**
  (what the stage shows, in Chaos and Waves) and its scene extras, such as
  Gravity's Follow. Tools and views are radio groups: arrow keys move within
  one, and a view never restarts or rewinds the run. In the labs that place
  things (Gravity, Collisions, Fluid, Waves and Fields), the **Random** dice
  under the tools makes each new object different: a random planet class and
  a mass in its range, ball size, post size, source frequency and phase, or
  charge.
- **Head-up display**: the run's numbers on the stage itself, in thin cyan
  lines over the simulation. A tape down the left edge carries the lab's key
  readings, each with its trend and a short trace; caution lights near the
  top carry the warnings; and selecting an object puts a target box on it,
  following it in 2D and 3D, with a callout of its figures. The **HUD** menu
  in the top bar sets its opacity (40 %, 60 %, 80 % or 100 %) and turns each
  part on or off; **Shift+H** shows or hides it. Your choice is remembered.
  The display never takes a click, and screen readers get the same figures
  from Telemetry, Insights and Inspect.
- **Player bar**: play, step, reset, speed, the rewind timeline, and the video,
  data and save buttons.
- **Instruments**: three panes over one header.
  - **Telemetry**: every reading as a live gauge beside the lab's chart; the
    first ones lead with larger figures. Click a gauge to plot it, up to four
    at once, each in its own lane on one time axis. Hover the plot to read any
    moment, click or drag along it to rewind to that moment (as far back as
    the rewind history reaches), and use the wheel to zoom the time window.
  - **Inspect**: the object you clicked on the stage, with its live figures,
    read-only, each with a sparkline of its history since you selected it.
    A focus chart fills the rest of the pane with one figure over time (the
    one that matters most for that object, or whichever you click), and a
    figure's chart button plots it under Telemetry beside the readings.
    Settings stay in Controls; the card offers only actions on the object
    itself, such as remove or follow.
  - **Insights**: what the run is doing and why a setting misbehaves, each
    with its fix, beside the frame-timing strip. Its tab shows the count, and
    the top alert and its fix stay in the header whichever pane is open.

  The button at the right of the header steps the deck through compact,
  standard and tall, and the grip on its top edge drags it to any height
  (arrow keys on the grip step it; Enter restores the standard height).
- **Inspector**: the lab's formula above five tabs.
  - **Controls** opens with the lab's quick actions, then its settings in
    sections such as Setup, Physics and Display. Each number is a compact
    dial: drag its ridged wheel sideways (Shift for fine), tap either side or
    a chevron to nudge it, scroll once it has focus, use the arrow keys, or
    click the value to type one. Fold a section away, or use its **Reset** to
    return it to the scene's values; a section whose changes restart the run
    says so once. A disabled control says why underneath.
  - **Experiments**: guided experiments with live progress checks.
  - **Guide**: the lab's tools, views and scenes as cards that pick them,
    marked as they change, with the Random switch beside the tools, the lab's
    notes and how to move around.
  - **Math**: the formulas behind the lab, wired to the run. A formula shows
    the live values of its symbols, dials for the parameters it contains
    (the same settings as Controls, kept in step), a check that sets the
    formula's prediction beside what the simulation measures, and, where it
    helps, a plot: the speed distribution against Maxwell–Boltzmann, the
    double slit's fringes against λL/d, the pendulums' separation.
  - **Library**: one press records a clip or a dataset or saves the state,
    each card saying what it will keep for this lab; everything saved is
    listed below.
- **Selecting things**: click a body in Gravity, a ball in Collisions (with
  Grab), a particle in Fields (with Move), a post in Fluid (with any tool but
  Obstacle), a source in Waves, or a pendulum or a dot on the map in Chaos.
  Inspect opens on its own and returns to where you were when you clear the
  selection. Gravity shows a rendered portrait of the body and its orbit:
  distance, period, eccentricity and inclination.

### Units

The **Units** button in the top bar, or **U**, picks what every reading,
control, inspected figure and scale bar is shown in. The simulations always
compute in their own units, so switching never changes a run; typed values
are read in the units shown.

| System | Shows | Scale |
| --- | --- | --- |
| Metric (default) | metres, m/s, m/s², J/kg | Fluid, Collisions, Cloth and Fields: one pixel is 1.09 cm, so 900 px/s² of gravity is 9.81 m/s². Waves: one cell is 4 mm, a ripple-tank scale. Chaos computes in metres already. Gravity is astronomical: AU, km/s, days and years, solar, Jupiter and Earth masses. |
| US customary | feet, ft/s, ft/s², ft²/s² | The same scales, in feet and inches (miles per second in Gravity). |
| Simulation | px, px/s, cells | The labs' own units, exactly as computed. |

The menu states the current lab's scale. Datasets keep the lab's own units
and record that scale beside them. Masses, energies and charges in
Collisions and Fields stay in simulation units, since those labs define them
for the computation rather than from real materials.

Press **F** to give the stage the whole window and **Shift+B** to hide the
Instruments; with the head-up display on, the stage still shows the numbers
that matter. The layout reflows to one column below 1180 px.

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
| V | Next view, in Chaos and Waves |
| U | Units menu |
| + − 0 | Zoom in, zoom out, frame the view |
| Arrow keys | Pan, or orbit in 3D mode |
| [ and ] | Halve or double the speed |
| M and D | Record a video clip, record a dataset |
| F and Shift+B | Focus the stage, hide the Instruments |
| Shift+H | Show or hide the head-up display |
| ? | Keyboard reference |

## Capturing runs

- **Rewind**: drag the timeline back to replay recent history. Playing
  from the past starts a new branch.
- **Video**: records the stage as a WebM clip.
- **Data**: records a CSV dataset of the lab's quantities, plus per-body
  tracks where the lab has them.
- **Save state**: stores the exact state of the scene to restore later.

Each can also be started from the cards at the top of the **Library** page,
where everything saved is listed. The Library tab shows how many items are
saved and marks new ones. When the
page runs as a published artifact, the library syncs with the artifact;
otherwise it lives in this browser.

## Stack

<div align="center">

[![ES modules, no build step][badge-esm]](ARCHITECTURE.md#principles)
[![three.js 0.187.0][badge-three]](vendor/VENDOR.md)
[![KaTeX 0.19.1][badge-katex]](vendor/VENDOR.md)
[![Browser tests: Playwright][badge-tests]](#development)

</div>

| Layer | Choice | Why |
| --- | --- | --- |
| Code | Native ES modules, no bundler | Nothing to build; every file is the file that runs |
| Icons | Material Symbols Rounded (Google Fonts) | One cohesive icon family, subset to the glyphs used |
| Maths | KaTeX 0.19.1 | Real typesetting for formula cards; module from jsDelivr, CSS and fonts vendored |
| 3D | three.js 0.187.0 | The whole 3D mode, one renderer shared by every lab; loaded only when 3D is first used |
| 2D fluid surface | Hand-written WebGL | A small, fast shader for the flat view |
| Tooling | Node.js scripts, ESLint, Playwright tests | Dev server, checks, Pages staging and browser tests with no runtime dependencies |
| Hosting | GitHub Pages | Static files served as they are; see [Deploying](#deploying-to-github-pages) |

The third-party pieces and their licences are listed in
[vendor/VENDOR.md](vendor/VENDOR.md). If a CDN cannot be reached, the
playground keeps working: formulas fall back to their TeX source, icon
names hide, and the workspace says 3D is unavailable and stays in 2D.

## Project layout

```text
index.html            page, tiles, colophon, CDN links and import map
css/                  tokens, icons, workspace, controls, stage, head-up display, tiles, library, responsive
js/main.js            boot sequence
js/core/              pure helpers: DOM, colour, charts, drawing, maths, icons, TeX, graphics tiers, units
js/render/            the 2D fluid surface shader
js/render/world/      the 3D mode: engine, studio, materials, shapes, ribbons
js/render/world/scenes/  one three.js scene per lab
js/labs/              one module per lab, the plane camera, the gravity camera, the Solar System's data, the experiments curriculum, the registry
js/shell/             workspace: state, panel, rail, deck, head-up display, camera, stage input, loop, modes, units, capture, library, experiments
tools/                dev server, project checker, Pages stager, README media capture
tests/                Playwright browser suites and their runner
vendor/katex/         KaTeX stylesheet, fonts and licence
docs/media/           README banner and screenshots, with their manifest
docs/research/md/     the research reference behind Gravity's planet classes
.github/workflows/    the Pages verify-and-deploy workflow
.nojekyll             tells GitHub Pages to serve files as they are
```

[ARCHITECTURE.md](ARCHITECTURE.md) explains how the pieces fit together
and how to add a lab, a tool or an experiment.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Serve the project on port 5173 (`node tools/serve.mjs 8080` for another port) |
| `npm run lint` | ESLint over the modules and tools |
| `npm run check` | Headers, changelog bounds, icon subset and module syntax |
| `npm run site` | Stage the Pages site in `_site/` and prove every reference resolves |
| `npm run verify` | Lint, check and site: the same gate the Pages workflow runs |
| `npm test` | Run every browser suite against the running dev server |
| `npm run media` | Capture the README banner and screenshots from the running dev server; `npm run media -- --headed` renders on the GPU and is much faster |

Install the dev tools with `npm ci`, which installs exactly the versions in
`package-lock.json`. The browser suites and the media capture need Python 3
with Playwright (`pip install playwright` and `playwright install
chromium`). Start the dev server first, then run `npm test`. Set `PP_URL`
to test another address and `PP_SHOTS` to choose where screenshots go.

## Deploying to GitHub Pages

The [live lab][demo] is this repository served by GitHub Pages. There is
nothing to build: Pages serves the same files that run locally, and three
pieces keep that dependable.

- **`.nojekyll`** tells Pages to publish files as they are. Without it, a
  branch deploy runs the whole repository through Jekyll first.
- **`npm run site`** stages exactly what the browser loads (`index.html`,
  `LICENSE`, `css/`, `js/` and `vendor/katex/`) into `_site/`, then follows
  every reference from `index.html` through the stylesheets and modules. It
  fails on a missing file, a letter-case slip, a root-absolute path (which
  breaks under the `/physics-playground/` project path), an unpinned import
  map entry, or a CDN that [vendor/VENDOR.md](vendor/VENDOR.md) does not
  list.
- **[`.github/workflows/pages.yml`](.github/workflows/pages.yml)** runs
  `npm ci`, lint, check and site on every push and pull request. On `main`
  it deploys the verified `_site/` when the repository's Pages source is
  **GitHub Actions**, and its run summary says what it did.

| Pages source (Settings → Pages) | What publishes a push to `main` | What reaches the site |
| --- | --- | --- |
| Deploy from a branch | GitHub's own *pages build and deployment* run; the Pages workflow verifies alongside it | The whole branch, as it is |
| GitHub Actions (recommended) | The Pages workflow, only after every check passes | Only `_site/`: no tests, tools or docs |

To switch, open **Settings → Pages → Build and deployment** and set
**Source** to **GitHub Actions**. The next push to `main`, or **Run
workflow** on the Pages workflow in the Actions tab, deploys. To preview
the staged site, run `npm run site` and serve the folder:

```bash
python -m http.server 8080 --directory _site
```

## Browser support

Chrome and Edge 105+, Firefox 110+ and Safari 16.4+: the page needs ES
modules, import maps and container queries. The 2D fluid surface uses WebGL 2
or WebGL 1 and draws as particles without either. The 3D mode needs WebGL 2;
without it the workspace says so and stays in 2D.

## Documentation

| Document | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, boot order, the frame loop, the lab contract, the 3D mode, deployment, and recipes for extending the playground |
| [CHANGELOG.md](CHANGELOG.md) | Every release in full, newest first |
| [vendor/VENDOR.md](vendor/VENDOR.md) | Third-party code: versions, sources, licences and what happens offline |
| [package.metadata.md](package.metadata.md) | What `package.json` declares, and every npm script |
| [docs/media/MANIFEST.md](docs/media/MANIFEST.md) | The README pictures: what each shows, where it came from, how to recapture it |
| [docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md](docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md) | The research behind Gravity's planet classes: the five classes, their physics, the mass–radius relations and the reference dataset |

## Credits and license

Brought to you by **digiSpace Studio**, and made with epic amounts of
coffee by Dennis 'dendogg' Smaltz.

Physics Playground is licensed under the Apache License 2.0: see
[LICENSE](LICENSE). Third-party licences are listed in
[vendor/VENDOR.md](vendor/VENDOR.md).

<div align="center">

[![Brewed with epic amounts of coffee][badge-coffee]](#credits-and-license)

</div>

<p align="center"><sub>︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!</sub></p>

[demo]: https://dnoice.github.io/physics-playground/
[pages-workflow]: https://github.com/dnoice/physics-playground/actions/workflows/pages.yml
[badge-demo]: https://img.shields.io/badge/live_demo-open_the_lab-f2a541?style=flat-square&labelColor=0c1118&logo=githubpages&logoColor=f2a541
[badge-pages]: https://img.shields.io/github/actions/workflow/status/dnoice/physics-playground/pages.yml?branch=main&style=flat-square&label=pages&labelColor=0c1118&logo=githubactions&logoColor=5fd0df
[badge-release]: https://img.shields.io/badge/release-v2.11.0-5fd0df?style=flat-square&labelColor=0c1118
[badge-license]: https://img.shields.io/badge/license-Apache_2.0-5fd0df?style=flat-square&labelColor=0c1118&logo=apache&logoColor=5fd0df
[badge-esm]: https://img.shields.io/badge/ES_modules-no_build_step-232c39?style=flat-square&labelColor=0c1118&logo=javascript&logoColor=f2a541
[badge-three]: https://img.shields.io/badge/three.js-0.187.0-232c39?style=flat-square&labelColor=0c1118&logo=threedotjs&logoColor=5fd0df
[badge-katex]: https://img.shields.io/badge/KaTeX-0.19.1-232c39?style=flat-square&labelColor=0c1118&logo=latex&logoColor=5fd0df
[badge-tests]: https://img.shields.io/badge/tests-Playwright-232c39?style=flat-square&labelColor=0c1118&logo=playwright&logoColor=6fcf97
[badge-coffee]: https://img.shields.io/badge/brewed_with-epic_amounts_of_coffee-f2a541?style=flat-square&labelColor=0c1118
