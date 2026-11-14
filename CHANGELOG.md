<!--
✒ Metadata
    - Title: Changelog (digiSpace Edition - v2.9)
    - File Name: CHANGELOG.md
    - Relative Path: CHANGELOG.md
    - Artifact Type: docs
    - Version: 2.9.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.9.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.9.0 release.
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.8.0 release.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.7.0 release.
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.6.0 release.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.5.0 release.
    - 2.4.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.4.1 release.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.4.0 release.
    - 2.3.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.3.1 release.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.3.0 release.
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.2.0 release and the navigation line shared with the other
      documents.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      2.1.0 release.
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

[README](README.md) ✦ [Architecture](ARCHITECTURE.md) ✦ **Changelog** ✦
[Third-party](vendor/VENDOR.md) ✦ [Live lab](https://dnoice.github.io/physics-playground/)

The complete release history of the physics playground. Browser-delivered
files carry only their latest entries in their headers; every entry lives
here in full, newest first.

## 2.9.0 (11/14/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Gravity's planet types, on Dennis's research. "By mass" had called every body
under 1.1 Jupiter masses a rocky or an ocean world, alternating by id, so a
Saturn could be "rocky". His research reference,
`docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md`, now in the
repository, sets out the five planet classes with the firmest footing, their
physics and their data. Gravity now uses them.

### Planet classes

- **Five classes**, from the reference's taxonomy:
  - terrestrial (0.02–1.5 Earth masses);
  - super-Earth (1.5–10);
  - sub-Neptune (3–15);
  - ice giant (10–40);
  - gas giant (0.15–13 Jupiter masses).

  Then brown dwarfs, from the 13 Jupiter-mass deuterium limit, and stars,
  from 0.08 solar masses. Rocky and ocean worlds retire as classes: the
  reference folds ocean worlds into the super-Earth and sub-Neptune
  profiles. Earth keeps its ocean look as a world of its own.
- **By mass** follows the reference's boundaries: 1.5 Earth masses; 4.37,
  where measured worlds turn from bare rock to gas envelopes (Müller et al.
  2024); 10; 50; and 13 Jupiter masses.
  - It classes 19 of the reference's 22 benchmark planets as the reference
    does.
  - The other three are rocky super-Earths of 4.8 to 8 Earth masses, where
    mass alone cannot tell rock from an envelope. Super-Earth can still be
    chosen up to 10.
  - The threshold now sits at 13 Jupiter masses exactly. It had been 13
    simulation masses, which is 13.6 Jupiter masses.
- **Random** draws a class (sub-Neptunes and super-Earths most often, after
  the reference's occurrence rates), then a mass across the class's range.
- **Type and mass stay consistent**, as the reference asks of its controls:
  - choosing a class moves the mass to a typical member's (Earth, LHS 1140 b,
    GJ 1214 b, Neptune, Jupiter);
  - a mass dialled out of the class's range hands the type back to By mass;
  - a body placed with a class always lands inside its range.

  The mass dial now reaches 0.02 Earth masses, so terrestrial planets can be
  made by hand.
- **Mergers keep their composition.** Rocky worlds stay rocky, so two
  super-Earths make a heavier super-Earth, not an ice giant. A world with an
  envelope keeps it, and the class follows the new mass, never down.
- **The Solar System** takes the classes too. Mercury, Venus, Earth and Mars
  are terrestrial, Jupiter and Saturn gas giants, Uranus and Neptune ice
  giants, and the large moons are moons.
- **Old saved states.** Bodies typed rocky or ocean are classed again by
  mass, and moons as moons.

### Physical models in Inspect

- **Radius.** The real radius in the Solar System. Elsewhere, an estimate
  from the mass along the class's branch of the reference's mass–radius
  relation (Model 4.4.3):
  - rock, 1.03 M^0.29 (Otegi et al. 2020);
  - envelopes, 0.56 M^0.67 (Müller et al. 2024);
  - gas giants on a cold-giant curve: Müller's slope, through Jupiter, held
    to the 0.9–1.15 Jupiter radii the reference keeps mature cold giants in.
    Müller's own height fits hot, inflated giants and would make Jupiter 15 %
    too large.
- **Density, gravity and escape speed** from that radius (Model 4.1.2).
  Gravity is at the surface for rocky worlds and at the cloud tops for
  giants. The units are SI, or US customary in US.
  - In the Solar System they match the reference's Table 5.1: Jupiter
    1326 kg/m³, 25.9 m/s² and 60.2 km/s; Earth 5514 kg/m³, 9.82 m/s² and
    11.2 km/s.
  - A sandbox Jupiter comes out at 71,500 km and 59.5 km/s.
- **Hill sphere** at periapsis (Model 4.1.4). The formula reproduces the
  reference's 53.1 Gm for Jupiter.
- **Roche limit** of what a Solar System body orbits, with a note when the
  body is inside it, as Phobos is inside Mars's.
- **IAU mass ratio.** A world of a planet class heavier than 1/25 of its
  star is flagged as a binary companion, not a planet.
- The Guide explains the classes.

### Fixes

- **Stale host on a paused selection.** The body a selected body orbits was
  chosen from a source list that only rebuilt on the next step. While paused,
  a body selected right after a heavier one was added could be measured
  against the wrong host. `pullHost` now rebuilds the list first.

### Tests

- **New `tests/planets.py`** (20 checks), against the reference's own data:
  - the 22 benchmark planets by mass;
  - every class boundary;
  - the rocky branch within 3 % of the rocky worlds' radii, the volatile
    branch on the ice giants, and the cold-giant curve through Jupiter;
  - Inspect's density, gravity and escape speed for six planets and the Sun;
  - Jupiter's Hill sphere and the reference's 53.1 Gm;
  - Phobos inside Mars's Roche limit and the Moon outside Earth's;
  - US units;
  - the Solar System's and Star system's classes;
  - the IAU flag;
  - eight mergers;
  - the seven type buttons, the mass dial's reach, and type and mass kept
    consistent;
  - old saved states.

  `run_all.py` runs it.
- **`tests/placement.py`**:
  - random draws now cover the six classes;
  - a new check that a chosen class keeps the body's mass in range.

## 2.8.0 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

Our own Solar System as a Gravity scene, on Dennis's call to put our home in
the lab: from the Sun to the moons of Jupiter, the Kuiper belt and beyond,
with real orbits, masses and sizes, started at noon on 1 January 2000.

### Our Solar System

- **The scene** (`js/labs/solarsystem.js`), in the ecliptic and seen from
  the north, every body at its real mass and radius:
  - the Sun;
  - the eight planets and Pluto, from JPL's J2000 elements, each placed as
    the barycentre of itself and its moons;
  - 17 moons in their planets' equatorial planes, set from the IAU poles:
    the Moon; Phobos and Deimos; Io, Europa, Ganymede and Callisto, in the
    Laplace resonance; Enceladus, Rhea, Titan and Iapetus; Miranda, Ariel,
    Titania and Oberon, which go round with Uranus on its side; Triton,
    which goes backwards; and Charon;
  - Ceres, Haumea, Makemake and Eris, Sedna, and Halley's comet with its
    backward orbit;
  - seeded belts: 80 main-belt asteroids with the Kirkwood gaps left open,
    30 Jupiter Trojans at L4 and L5, 24 plutinos in the 3:2 resonance with
    Neptune, 70 classical Kuiper belt objects and 10 scattered-disc objects.
- **The Moon starts from its true state.** Its mean elements, started as
  they are, ran the month 1.1 % long, because the Sun swings the real orbit
  thousands of km about the mean one. It now starts from its geocentric
  position and velocity at J2000.0 by Meeus's lunar theory (*Astronomical
  Algorithms*, ch. 47, all 120 terms). The tables were checked against the
  book's worked example to the last digit, and the month now runs 0.07 %
  short.
- **Moons on their own clock.** The integrator splits the forces (r-RESPA).
  Every pull but a moon's and its planet's is applied in two half kicks per
  step. In between, each moon and its planet take as many substeps as the
  fastest moon needs, under their mutual pull alone: Phobos, which turns in
  under two steps, sets 80. Every other body drifts once per step as
  before.
- **Moon links are checked.** A moon's host must be another live body,
  heavier than the moon, that is not itself a moon. `prepare()` cuts any
  other link, from a tampered saved state or a merge. Without the check, a
  self-host held the substeps at their 256 cap, and a cycle pulled the pair
  twice per substep.
- **Test bodies.** The belts, Sedna and Halley have no mass. They feel every
  pull and pull nothing, so their 216 bodies cost 216 × 31 pulls a step, not
  a share of 247².
- **Faithful over a simulated year**, as `tests/solar.py` measures:
  - ten periods within 0.07 % of the real ones, from Mercury to Charon;
  - the energy error never above 8e-8 (it swings with Mercury's perihelion
    passages and returns);
  - Phobos's orbit unchanged to 4e-5;
  - the Trojans still at L4 and L5;
  - nothing merged or lost.
- **Drawn to scale, and findable.** Each world is drawn at its real radius
  but never smaller than a few pixels, so it is true to size up close and
  still a dot from afar.
  - A moon waits inside its planet's disc until a zoom draws them apart, in
    2D and 3D, and cannot be picked until then.
  - The zoom reaches from Sedna's orbit to Charon beside Pluto, and in 3D
    the near plane follows the camera in to a moon.
  - Saturn's rings sit at their real tilt in 3D.
  - Moons drop no depth mark in 3D, and the belts' bodies drop none. A
    mark taller than most of the stage, with its foot out of sight, is
    left out, so a close look at Jupiter has no line rising from it.
- **Orbits and Names** switches under Display:
  - each named body's present (osculating) ellipse about what it circles,
    drawn in 3D as ribbons that a planet can hide;
  - names placed so that a moon's never covers its planet's;
  - the head-up display's callout keeps clear of the names, through a new
    lab hook, `hudClear`, the boxes of what a lab drew and wants left
    visible.
- **Readouts**:
  - Inspect names what a body circles ("Distance from Jupiter", "Bound to
    the Sun"), gives its real radius, and measures its tilt from the
    ecliptic;
  - the clock reads the date the run has reached;
  - the hover readout names the body;
  - the Math page's Kepler check says when a moon turns too fast to follow
    at the chosen speed.
- **Speed fix**: when the run falls behind, the offered fix removes the
  belts' 214 bodies. The general fix, deleting the lightest half, would have
  taken the small moons with them.

### Fixes

- **Controls**: a quantity on a log scale now shows three significant
  figures. Fixed decimals showed Gravity's softening as 0.00 AU; it now
  reads 7.41e-7 AU.

### README pictures

- New `sol-system.webp` for the README's Our Solar System section: the
  planets out to Saturn in 3D, beside Jupiter followed up close with its
  moons. `tools/media.py --only sol` captures it.

### Tests

- New `tests/solar.py` (28 checks):
  - the scene's bodies, its moons' links and substeps, and its sources and
    test bodies;
  - orbits and tilts from the elements;
  - a simulated year stepped one step at a time: ten periods counted by
    whole turns, so eccentric orbits count true, plus energy, Phobos, the
    Trojans and nothing lost;
  - names, moons and floors through rewind and a saved state, and a
    tampered state's metadata and host links checked;
  - the date, the softening readout, the hover names, the hidden moons, the
    head-up display's callout clear of the names, and the switches;
  - the speed fix;
  - in 3D: the first frame, the orbits in the scene, moons appearing when
    apart, the target box and the near plane.

  `run_all.py` runs it.
- `tests/world.py`: the scene menu check now expects Gravity's eight
  scenes. The frame key check waits up to 8 s for the camera to arrive
  home, instead of reading it after a fixed 0.9 s.
  - Cause: the camera eases on frame time, which the loop caps at 0.05 s a
    frame, and software WebGL can draw the Waves view at 4 frames a second.
    Main behaves the same way, reading 104.8 to 109.1 % after 0.9 s.
  - The bound itself is unchanged: within 8 % of home.

## 2.7.0 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

A head-up display over the stage, on Dennis's call: the stage is the biggest
thing on the page, but reading any number meant looking away from it, to the
deck below or the inspector beside it. Now the numbers that matter sit on the
run itself, like a cockpit HUD, in thin phosphor-cyan lines at an opacity of
his choosing.

### Head-up display

- **Readings tape** down the left edge (`js/shell/headsup.js`): four key
  readings per lab under short names (Gravity's energy, drift and virial
  ratio, Collisions' kinetic energy, RMS speed and PA / NkT, and so on), each
  with a trend arrow and a short trace from the same samples Telemetry keeps.
  The text is the very text Telemetry shows at the same tick: one reading of
  the lab feeds both. States keep their colours: amber for warn, red for crit.
- **Caution lights** near the top: the warnings and critical notices by
  title, two on a wide stage and one on a narrow one, with a count of the
  rest; a critical light's marker blinks unless reduced motion is asked for.
  They step down when an experiment's banner is showing.
- **Target box and callout**: selecting an object (a body, a ball, a post, a
  source, a pendulum or a particle) puts a corner-bracket box on it that
  follows it each frame, in 2D and 3D, with a leader to a callout of its name,
  kind and three figures, the one the lab follows first. The callout picks
  the free side of the box, keeping off the object, the tape, the lights and
  the overview map; an object off the stage gets a dashed box waiting at the
  nearest edge. Each lab reports where its object is drawn with `hudTarget()`.
- **HUD menu** in the top bar, beside Graphics and Units: on or off, opacity
  at 40, 60, 80 or 100 %, and each part on or off, remembered per browser.
  **Shift+H** shows or hides the display from anywhere, ahead of the tool
  letters, so a lab whose tool is H keeps it on the plain key. The keyboard
  sheet lists it.
- The display is one layer under every control and never takes a click; it
  is hidden from screen readers, which get the same figures from Telemetry,
  Insights and Inspect.
- On a phone the tape slims, the callout keeps two figures and one caution
  light shows with its count; a short stage keeps two readings.

### Frame rate

- Every part of the display is its own compositor layer and carries its own
  opacity. Measured without a GPU: opacity on the whole stage-sized display
  cost 6 to 9 % of the frame rate; the tape painted together with the status
  chips, which tick ten times a second, about 5 %; the target box without its
  own layer, 16 %. As shipped the display costs 1.4 to 3.3 % (Gravity 3D,
  Collisions, Fluid, over six alternating rounds). No backdrop blur is used;
  ARCHITECTURE.md records the convention.

### Fixes

- **Collisions**: a scene's balls are numbered from 1 again on every build.
  The stable ball numbers added in 2.6.0 ran on across scenes, so a 16-ball
  table could show Ball 276 in Inspect and on the display's callout.

### README pictures

- The hero and the Collisions picture are recaptured, showing the readings
  tape, and in Collisions the target box and callout on the cue ball.

### Tests

- New `tests/hud.py` (21 checks): the tape against Telemetry in all seven
  labs, the target box on the object in six labs in 2D and in Gravity in 3D,
  the off-stage box, a caution light by title, the menu's opacity steps and
  parts, Escape, Shift+H and its tool letter, settings across a reload, the
  keyboard sheet, and the phone layout. `run_all.py` runs it.
- `tests/world.py`: the 3D pick round trip in Collisions failed now and then
  since 2.4 (errors of 6 to 11, against a limit of 2.5). Its root cause: the
  Grab tool picks the balls' spheres before the table, so whenever a ball of
  the moving gas lay under the test point, the pick landed on that ball's
  surface, a radius away. The check is about the table, so it now measures
  with the Heat tool, which picks the table, then restores Grab for the
  checks after it; the limit is unchanged, and the error is now 0.0.

## 2.6.0 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

A refinement release on Dennis's brief for an application-wide sweep and an
audit of every simulation, one at a time, putting scientific correctness
first. Each lab was read against its equations, run in the browser and
fixed where a check, readout or text claimed more than the run showed.
Nothing visual was added: the frame-rate work of 2.5.0 stands, and the
glass blur stays out.

### Application-wide sweep

- **Lab tabs on phones.** The tab strip was centred with
  `justify-content` inside a scroller, so once the tabs overflowed, the
  first ones (Gravity, Collisions) could not be scrolled to, and at 390 px
  the strip had 77 px. It is centred by auto margins now, takes its own
  row at 560 px and below, and keeps the selected tab in view.
- **Live Math dial ids.** A parameter in two formulas (Gravity's G, Waves'
  f, Chaos' g, Fields' B and E₀) made two dials with one id; later ones
  are numbered, so each symbol's label focuses its own dial.
- **Tool bar on phones.** On a narrow stage the rail becomes a sideways
  scroller, and at 390 px six labs' bars overflow (by up to 196 px in
  Waves) with nothing to show it. The side with more tools beyond it now
  fades out, as the bar scrolls, resizes or changes lab.
- **Keyboard sheet.** Adds `?` and `Esc`, and how to work the dials.
- **Dead code.** Removed CSS no markup used (the old slider rows,
  `.tile-meta`, the icon size modifiers) and the unused `deckPane()`
  export; comments say dials where they said sliders.
- Checked and found sound: no unnamed control in any lab or tab, no
  horizontal scroll or off-screen content at 1440, 1024 or 390 px, and no
  DOM nodes, listeners or GPU objects leaked across lab and mode switches.

### Gravity

- **Kepler's third law is measured.** The panel restated the period with a
  permanent "ok". It now times a full turn of the followed planet, in its
  own orbital plane so tilted orbits count, against 2π√(a³/G(M + m)), and
  the formula shows M + m as the panel computes it. Measured: 0.006 % from
  the law in the Kepler scene, under 1 % in the Star system and Tilted
  orbits, where the other planets perturb the orbit.
- **The virial check averages over time.** It compared 2K/|U| at one
  instant, which an eccentric orbit swings far from 1; it now averages K
  and U over the energy chart's window, as the theorem holds only on
  average (0.995 to 0.999 over 44 s in three scenes). The experiment
  averages the same way.
- **Centre-of-mass frame.** The virial ratio (readout, check, Insight,
  dataset column, experiment) and whether the system is bound use the
  kinetic energy in the centre-of-mass frame, so a throw that sets the
  whole system drifting no longer reads as unbalanced motion.
- **Circular speed.** The check compares with the softened speed the run
  uses, and names an eccentric orbit as an ellipse (e = 0.45, 0.75 in the
  Kepler scene) rather than a miss.
- Insights give lengths in the chosen units.

### Collisions

- **Inspect stays on its ball.** Erasing a ball moves the last one into
  its slot, and the selection was an index, so Inspect could show another
  ball's figures under the old number. Balls carry a stable identity
  through removals and rewinds; the selection follows its ball, lets go
  when it is erased and clears on a rebuild.
- **No more flipping between panes.** A press on empty table added a ball
  and cleared the selection, so adding and throwing in turn flipped the
  instruments between Telemetry and Inspect. Adding a ball now leaves the
  selection alone.
- **Hard-disc pressure.** A sweep of the running box from φ = 0.015 to
  0.53 found PA / NkT within 1 % of Henderson's equation of state,
  (1 + φ²/8) / (1 − φ)², up to φ = 0.18 and 4 % up to 0.53, mixed ball
  sizes included, where the old 1 + 2φ was 4 % short at φ = 0.12 and 21 %
  short at 0.26. The check, Insight and Math page use it, and the reading
  averages about five seconds of wall impacts instead of two.

### Fluid

- **Density checks what the method promises.** A settled tank rests at
  about 0.90 ρ₀ throughout, with gravity or without, because near-pressure
  holds neighbours apart; the old check set the mean against ρ₀ and passed
  only on a 12 % tolerance. It now sets the densest tenth against the
  median, the evenness that incompressible means here (1.05 settled).
- The pressure check says when nothing is squeezed or the liquid foams,
  instead of giving a negative excess, and both checks wait for liquid.
- An idle re-measure found the solver step allocates nothing; the earlier
  reading was warm-up under load.

### Waves

- The phased-array formula, its readout, Insight and check apply only to a
  row of like sources, evenly spaced and started together, and say so when
  sources placed by hand or with Random sources break the row.
- The fringe check asks for the scene's lone plane wave.
- A beam angle near zero is judged in degrees: Live Math checks can name a
  scale for a theory that may be zero, where a share of zero means nothing.

### Chaos

- **The horizon is forecast, not fitted.** The check took λ from the same
  separation at the moment the copies parted, so its prediction equalled
  the measurement by construction. λ is now the least-squares growth rate
  of ln δ; halfway to parting on a log scale the horizon is forecast and
  kept, and the check sets that forecast beside the moment the copies part
  (7 to 26 % apart in the chaotic scenes at small δ₀, tolerance 35 %).
  Regular motion gets no forecast. Rewind and saved states keep it.
- Energy values say they are per kilogram of the upper bob.

### Cloth

- The Wind control says the push averages 0.62 of the setting, with gusts
  about it; the speed-cap Insight gives its limit in the chosen units.
- The stretch check gives the mean beside the peak and says the peak
  gathers where the cloth hangs from a pin.

### Fields

- The E × B check measures the drift by guiding centres, x + v_y / ω, so
  particles of other charge-to-mass ratios count too (39.98 against
  40.00 px/s with a mixed set).
- The cyclotron and drift experiments give distances in the chosen units.

### Tests

- `tests/shell.py`: `fps_recovers` waited a fixed 3 s and asked for 1.5
  times the loaded rate, which an idle renderer without a GPU could not
  reach in time. It counts a hundred frames after the load stops and holds
  the meter to the rate those frames ran at.

## 2.5.0 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

A notebook wired to the simulations, and a page with light in it, on
Dennis's call for more interactive Math and Guide pages, less empty space,
new features where they help, and a subtle sheen, texture and glass. Then,
on his further call: compact dials in place of the long sliders, random
placement in every lab that places things, and new parameters.

### Live Math

- Formula cards carry live panels (`js/shell/livemath.js`): the values
  their symbols have in the run now, sliders for the parameters they contain
  (the same settings as Controls, which follow along), a check that sets the
  formula's prediction beside what the simulation measures, and plots.
- Every lab is wired. Among the checks: Collisions' mean speed against the
  Rayleigh curve's σ√(π/2) and PA / NkT against 1 + 2φ; Gravity's circular
  speed and the virial ratio; the double slit's fringe spacing against
  λL/d, measured on the detector; the phased array's beam angle; the
  pendulums' predictability horizon against when the copies actually part;
  the E × B drift, measured as displacement over a full cyclotron period.
- Plots: the speed histogram against Maxwell–Boltzmann, the fluid's
  densities around rest, the detector's intensity, the pendulums'
  separation.

### Guide

- The lab's tools and views as cards (icon, key, what a click does) that
  pick them, and its scenes as cards that load them, marked as they change
  however they were chosen (`js/shell/guide.js`); the lab's notes and the
  navigation help follow.

### Library

- Capture cards at the top: record a clip, record a dataset or save the
  state with one press. Each says what it will keep for the lab (the
  dataset's columns, the video quality) and shows its progress while
  recording.

### Inspect

- Every figure keeps its history since the selection began, as a
  sparkline, and a focus chart fills the rest of the pane with one figure
  over time: the one the lab names (a ball's speed, a body's distance, a
  pendulum's lower angle), or whichever is clicked.

### Controls: thumbwheel dials

- Every number on the Controls page is a compact dial instead of a long
  slider (`js/shell/dial.js`): a ridged wheel with the value set in its
  middle, a chevron at each end and a hairline for the range with the
  scene's mark. Drag the wheel sideways (Shift for fine), tap either side or
  hold a chevron to nudge it, scroll once it has focus, use the arrow keys,
  or click the value to type one.
- Dials sit in a grid of cards, two across in the inspector, with each note
  held to two lines and given in full as its tooltip. The Math page's
  parameters use the same dial.
- A native range input stays under each wheel, so the keyboard, screen
  readers and every listener work as before; a control that restarts the run
  restarts it once per gesture.

### Random placement

- A **Random** dice under the tools on the stage rail, a switch in
  Controls and a card in the Guide, in every lab that places things, all in
  step.
- **Gravity**: every body now has a planet type (rocky, ocean, ice giant,
  gas giant, brown dwarf or star) with its own colour in 2D and its surface
  in 3D, kept through mergers (which grow into a heavier class when they
  cross its mass), rewind and saved states. Random draws a type by its odds
  and a mass in its range; the throw preview shows the body that will fly.
- **Collisions**: random ball sizes, 4 to 24 px, and so random masses.
- **Fluid**: random post sizes; the ring under the pointer shows the next
  post.
- **Waves**: each new source gets its own frequency, from half to twice f,
  and a random phase; Inspect shows a source's own frequency.
- **Fields**: each charge gets 1 to 4 units, and each launched particle a
  random charge-to-mass ratio and sign.

### New parameters

- Gravity: **Type of new bodies** (by mass, or any planet type) and **Speed
  of dropped bodies**, in times the circular speed (1× circles, √2 escapes),
  also a dial on the Math page's circular-speed formula.
- Fluid: **Radius of new posts**, in a new New posts section.
- Fields: **Size of new charges**, 1 to 5 units.
- Cloth: **Gustiness**, how much the wind rises and falls about its mean, and
  **Ball size** for the Ball tool.

### Design

- The page has a fine grain and soft cool, warm and violet light behind
  everything; tiles carry a faint cool light at the top and a sheen along
  their top edge, and cards inside them catch a faint highlight.
- The tiles are opaque and unblurred. A backdrop blur, translucency and a
  diagonal sheen were measured at under half the frame rate where the page is
  drawn without a GPU (5 fps against 11 for 2.4.1 in the test browser), for a
  difference the soft light behind them barely showed. Each tile is one
  gradient with its sheen as an inset shadow, and the tiles, gauges and
  Inspect rows use plain-colour stops: a `color-mix()` stop sends the
  gradient through Oklab interpolation, which cost another tenth of the frame
  rate. The page now draws as fast as 2.4.1.

### Fixes in this release

- The site check (`npm run site`) read the `url(#n)` filter reference inside
  the grain's inline SVG as a missing file; quoted CSS `url()` values are now
  read whole.
- Choosing a tool or view, by key, rail or card, marks the Guide's cards at
  once instead of at the next panel refresh, which could lag by a second
  where frames are slow.

### New test suites

- New `tests/notebook.py`: live panels in every lab, live dials kept in step
  with Controls, Collisions' and Gravity's checks agreeing with the run, the
  Guide's cards, the Library's dataset card, and the Inspect focus chart.
- New `tests/placement.py`: the dials' drag, tap, chevron, wheel, keys and
  typing, one restart per gesture; the dice, switch and Guide card in step;
  random draws in every lab within their ranges; Gravity's chosen type, drop
  speed and types kept through rewind and saved states; the new parameters.
- `tests/shell.py` taps the thumbwheels where it used to click the sliders.
- `tests/nav.py` and `tests/capture.py` wait for the end state of the wheel
  zoom, the frame animation, the camera follow and the rewind history
  (`view.get().moving` now says when the 2D camera is still easing) instead
  of a fixed time; on a renderer without a GPU the fixed waits could run out a frame
  early, on 2.4.1 as well (key 0 failed there in the test browser). The
  assertions are unchanged.

## 2.4.1 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

The README's badges regrouped on Dennis's report that they broke up its
flow: ten badges in two rows under the tagline wrapped unevenly on GitHub,
leaving the coffee badge alone on a third line between the tagline and the
links.

- One row of four under the tagline: live demo, Pages status, release and
  licence, the badges about the project itself.
- The stack badges (ES modules, three.js, KaTeX, Playwright) open the Stack
  section they describe; the Node.js badge is dropped, since Quick start
  already states the version.
- The coffee badge signs off the Credits section, above the signature.
- Release 2.4.1 in the badge, `package.json` and `package-lock.json`.

## 2.4.0 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

One interaction architecture for the whole workspace, on Dennis's brief for
viewport navigation, the Chaos views and an exploration workspace, plus the
real-world units he asked for with simulation pixels kept as an option.

### Stage rail

- The gizmo moved around between labs because the rail was centred on the
  stage edge and its length depends on the lab's tools. It now hangs from the
  top-right corner at a fixed offset: **Camera** (axis ball, zoom, pan,
  frame) sits in the same place in every lab and view, followed by the lab's
  **Tools**, **View** and **This scene** groups.
- Tools (what a click does) and views (what the stage shows) are separate
  radio groups with separate state keys, each with the full keyboard
  contract: one tab stop, arrows move and select, Home and End jump. **V**
  steps through a lab's views. View options carry their names; at 720 px and
  below the rail becomes a bottom bar of icons, and short stages drop the
  captions and then the axis ball.
- Axis dots keep their size and gain larger hit targets; there is no −Z dot
  because the camera never goes below the floor every scene stands on.
- Waves' Displacement and Intensity are now the rail's **Height** and
  **Intensity** views.

### Chaos views

- **Pendulum**, **Phase map** and **Both**, switched from the rail or with V,
  never restart the run or clear its trails; each view lays itself out at
  once and frames the camera for its own composition.
- The map is labelled for what it is: the (θ₁, θ₂) projection of the 4-D
  state (θ₁, θ₂, ω₁, ω₂), on which paths may cross. The Math page says the
  same.
- The floating torus was the configuration space the square wraps onto, with
  the same paths; it was meaningful but sat on the screen's frame as an
  unexplained ornament. It is now the Phase map view's companion, in 2D and
  3D: a labelled torus beside the map with a faint lattice, the two seams
  where the map's edges were glued (θ₁ = ±180° in amber, θ₂ = ±180° in
  cyan), and every copy's path, unbroken. In 3D it stands on its own turned
  column, its glass toned down so it no longer glares. Both drops it, since
  the pendulum fills that place.
- Clicking a dot on the map or a pendulum on the stage selects that copy in
  every view (dashed ring and number on the map, the pendulum and the
  torus) and inspects it: angles, spins, energy, position, its starting
  offset and its distance from the front copy. A front bob still drags; a
  click without moving selects it. In the Phase map view the start preview
  shows the pose itself.

### Instruments deck

- Three panes over one header: **Telemetry** (gauges and the scope),
  **Inspect** (the selected object) and **Insights** (diagnostics with fixes
  and the frame-timing strip, in place of the floating sheet). The top alert
  and its fix stay in the header in every pane.
- Compact, standard and tall presets on one button, and a grip on the top
  edge that drags, or steps with the arrow keys, to any height; Enter
  restores the standard height. A deck too short for a plot keeps its
  readings.
- The first readings of each lab lead with larger figures, a row may be
  marked derived, and units sit in a smaller face, so a narrow gauge keeps
  both the figure and its unit.

### Inspection

- Inspect is read-only: figures update live and settings stay in Controls.
  The card offers only actions on the object itself. A new selection opens
  the pane; clearing it returns to the pane that was open.
- Any numeric figure plots under Telemetry as that object's own series, in
  its own lane beside the readings; history is never presented as replay
  beyond what the rewind keeps.
- New: Fluid's posts (any tool but Obstacle selects one; figures measured
  from the liquid around it; remove) and Waves' sources (a click selects
  instead of deleting; frequency, wavelength, phase, drive, intensity;
  remove). Every lab's empty pane says how to select in it.

### Units

- A **Units** menu (button or **U**): Metric (SI, the default), US customary
  or Simulation. Readings, controls, typed values, inspected figures, chart
  labels and the scale bar follow it; the simulations never change.
- Scales: Fluid, Collisions, Cloth and Fields share 1 px = 1.09 cm, so the
  default gravity of 900 px/s² is 9.81 m/s². Waves uses 4 mm per cell, a
  ripple-tank scale (60 cells/s is 24 cm/s). Chaos computes in metres
  already. Gravity is astronomical: 1 AU is the Star system's third orbit
  around a one-solar-mass star, so a year is 4.4 simulated seconds at G = 1×,
  speeds read in km/s and masses in solar, Jupiter or Earth masses, and the
  HUD clock adds days or years.
- Datasets keep the lab's own units and record the scale beside them.

### Tests and tools

- New `tests/workspace.py`: the rail, views, Chaos's three views and shared
  selection, the deck's panes, sizes and grip, post and source inspection,
  and the unit systems. The other suites follow the new deck and units.
- `tools/media.py` captures Chaos in its Both view.

## 2.3.1 (11/10/2026)

[dendogg + Anthropic - Claude Opus 5.5]

The README's pictures, captured on Dennis's call in the cloud session he
switched to for it, rather than on his own machine as 2.3.0 planned.

- All nine pictures are in `docs/media/`: the banner, the workspace hero,
  six labs in 3D (Chaos in its new phase view) and the 2D and 3D pair of
  the double slit, 840 KB in all. `MANIFEST.md` gives each one's size and
  records the run.
- The software renderer was never the obstacle: 2.3.0 had already fixed
  the screenshots that hung. Two things remained. `tools/media.py` settles
  each picture on 0.6 s of frames instead of 1.2 s, which halves the time
  every 3D page takes in software WebGL, and the Chaos setup script, whose
  second line was not an f-string, no longer reaches the browser with
  doubled braces. `--only` now takes single gallery labs, which let the run
  resume at Chaos instead of starting over.

## 2.3.0 (11/09/2026)

[dendogg + Anthropic - Claude Opus 5.5]

An interaction pass on Dennis's direction: make the Chaos phase space
something you can see and use, give the controls a more intuitive and
cohesive structure, stop Fluid's obstacles vanishing when a parameter
changes, and smooth out the quirks found along the way.

### Chaos: the phase space, rebuilt

Dennis found the Phase Space view extremely hard to read or use. It
replaced the pendulum with a flat plate of faint dots, the 3D torus beside
it was a ghost, and nothing tied a dot to a pose.

- **The pendulum stays.** The view is now split: the pendulum on one side,
  its map on the other. Arcs on the pendulum draw θ₁ in amber at the pivot
  and θ₂ in cyan at the elbow, the same colours as the map's axes, which
  read in degrees.
- **The energy landscape.** Behind the map is the potential energy
  V(θ₁, θ₂): a dark basin where both arms hang, lighter where they stand
  up. A glowing curve marks V = E, the fence the front pendulum's energy
  cannot cross, traced by marching squares, and the region beyond it is
  hatched. Regular motion now visibly traces a figure inside its fence;
  chaos fills it. With enough energy to flip both arms the map says the
  whole torus is open.
- **A preview before you click.** Pointing at the map shows a dashed ghost
  of that pose on the pendulum, the energy curve that start would have, and
  its angles. A click or drag starts every copy there, and the bobs can be
  dragged in both views.
- **Readable paths.** Trails are lines that fade with age and break where a
  path wraps across an edge; the front copy is a large ringed dot; matching
  arrows on opposite edges show that the square is a torus.
- **In 3D**, the dial follows the pendulum and stays live, the map is a
  brass-framed screen on its own walnut stand, and a glass torus rests on
  top with the same paths turning slowly around it. The screen's face lies
  exactly over the map on the simulation plane, so clicks and the preview
  work as in 2D.

### Controls in sections

On Dennis's call for a more intuitive, elegant and cohesive layout, the
Controls page is no longer one long list of sliders.

- Each lab declares its sections: Setup or Starting conditions, Physics,
  Forces or Medium, New bodies, balls or particles, Sources, Fabric,
  Display, View. Each has a glyph and folds away, remembered per lab.
- A section shows **Reset** as soon as one of its values leaves the
  scene's, and sets them all back in one step.
- A section whose changes restart the run says so once, replacing the
  "Restarts the scene when released" note under individual sliders.
- Switches share a grid under their section with shorter names, the full
  wording kept as a tooltip.
- Actions such as Shake the box, Clear trails or Restart from these angles
  are quick actions at the top, instead of below every slider.

### Fluid keeps its posts

Dennis reported that placing obstacles in the 3D tank and then changing
Particles removed them. Every rebuild started from the scene as written,
discarding anything placed by hand. A rebuild a parameter asks for now
carries the user's edits through the lab's `keep()` hook, and Fluid places
the kept posts before it pours the liquid, so no particle starts inside
one. Loading a scene, Reset and recovery still start clean. Rewind is
unchanged: going back to before a post was placed removes it, because a
replay restores the world as it was.

### Smoothed along the way

- Rounded rectangles on the canvas (the scope's lanes, the map's preview
  label) fall back to plain ones where the browser lacks `roundRect`, as
  Firefox did before 112, inside the supported range.
- `tools/media.py` frames each picture after its app page closes and clips
  page screenshots instead of waiting for elements to settle, which never
  happens under a fake clock on a busy software renderer. A headless
  software capture of the Ultra tier still proved too slow to finish in the
  session that built this release, so on Dennis's call the pictures are
  captured on a machine with a GPU: `--headed` renders there, and
  `docs/media/MANIFEST.md` lists every picture and how to make it. The
  Chaos picture shows the new phase view.

## 2.2.0 (11/09/2026)

[dendogg + Anthropic - Claude Opus 5.5]

A presentation and delivery pass on Dennis's direction: lift the look of
the documentation with screenshots, thematic borders and badges, verify and
harden the GitHub Pages build, and credit digiSpace Studio in the page. The
simulations are unchanged.

### Documentation

- The README opens with a banner built from a live 3D render, two rows of
  badges in the playground's palette, and a framed screenshot of the
  workspace. A gallery shows six labs in 3D, a pair shows one moment of
  the double slit in 2D and 3D, and new sections cover deploying, the
  documentation set and the credits.
- Every picture is captured from the playground itself by the new
  `tools/media.py` (`npm run media`) and framed in the app's own tokens:
  an amber-to-cyan border, a title bar in Raleway with the lab's glyph and
  the status colours as window dots, and transparent rounded corners. They
  are WebP files in `docs/media/`.
- The documents share a navigation line. ARCHITECTURE.md gains a
  Deployment section with a diagram of the pipeline, and recipes for the
  README pictures and for new CDN hosts.
- Corrected along the way: `package.metadata.md` still gave the version as
  2.0.0 and the Node.js floor as 18; the workspace and responsive
  stylesheet headers described the pre-2.1 bento grid and breakpoints that
  no longer exist.

### GitHub Pages

The site was published by GitHub's branch deploy, which ran the whole
repository through Jekyll and served the tests, tools and package files
beside the page, with nothing checked first.

- `.nojekyll` makes the branch deploy publish files as they are.
- `tools/site.mjs` (`npm run site`) stages only what the browser loads into
  `_site/` and walks every reference from `index.html` through the
  stylesheets and modules. It fails on a missing file, a letter-case slip,
  a root-absolute path that would break under the `/physics-playground/`
  project path, an unpinned import map entry, or a CDN host that
  `vendor/VENDOR.md` does not list. Its first run found that
  `js/render/gl.js`, a WebGL program helper, was never loaded:
  `fluid-gl.js` compiles its own shaders. The dead module is removed.
- `.github/workflows/pages.yml` runs `npm ci`, lint, check and site on every
  push and pull request, and deploys the verified `_site/` from `main` once
  the repository's Pages source is set to GitHub Actions. Until then it
  verifies, and its run summary says how to switch. Permissions are
  read-only except in the deploy job, deploys never cancel each other, and
  every job has a timeout.
- `package-lock.json` pins the dev tools, so the workflow installs exactly
  what was tested, with the npm cache keyed to it.
- `npm run verify` now includes the site check, so the local gate and the
  workflow's are the same.

### The colophon

On Dennis's request the page now credits its makers: "Brought to you by
digiSpace Studio ✦ Made with epic amounts of coffee by Dennis Smaltz",
with the orbit mark and a coffee cup from the same Material Symbols set as
every other icon. It sits in its own row under the console, so it never
overlaps the stage; it stacks on phones and steps aside in focus mode.

## 2.1.0 (11/06/2026)

[dendogg + Anthropic - Claude Opus 5.5]

An audit of the whole project, then a 3D mode on Dennis's direction: two
global modes, a realistic rendered environment for every lab held to his
standard that beautiful blobs are fine and amateur ones are not, and a
graphics tier system. Every finding was fixed, on his standing instruction
not to pause for permission or leave open flags.

### Two modes

- **2D** is the flat view of every lab. **3D** stands each lab in a studio as
  a physical apparatus. The switch is global, on key Z, and is remembered. It
  replaces the per-lab 3D orbit view and Relief 3D.
- The simulation does not change between modes. Tools, rewind, video, datasets
  and saved states work in both: a click travels by ray onto the simulation
  plane, and a frame is composited into the same stage canvas.
- If 3D cannot run, the workspace stays in 2D and says why. A lost WebGL
  context drops to 2D until it returns; a scene that throws sends only its own
  lab back.

### The world

- One three.js engine shared by all seven labs: HDR target with MSAA, bloom,
  ACES tone mapping and a film grade. No model or texture is downloaded: the
  softbox lighting, wood, stone and brushed metal are all generated.
- A studio with soft shadows, a polished floor with a real blurred planar
  reflection, and a backdrop the floor dissolves into.
- **Gravity**: open space with a baked nebula, plasma stars with coronas, and
  procedural rocky, ocean and ringed gas worlds.
- **Collisions**: a slate air table in a walnut and brass frame, which tilts
  with gravity so the pile has a reason to pile.
- **Fluid**: a glass aquarium. Particles become a density field, ray marched as
  a thick bead with refraction, absorption, meniscus, foam and caustics.
- **Waves**: a walnut ripple tank with projected caustics, slits that rise out
  of the water, brass dippers, and a screen that graphs the fringes.
- **Chaos**: a slate dial in a brass bezel. The phase view threads the same
  paths around a glass torus, which is what the wrapped square really is.
- **Cloth**: woven fabric on a gantry, posts, a flagpole or a rail. The solver
  stays planar; the folds are a stated visual relief.
- **Fields**: a black glass bench with the potential as a relief of light.

### Instruments

On Dennis's call that the chart, readouts and diagnostics took more room than
they gave back, the three tiles became one, and the stage grew.

- Every reading is a tile with a sparkline. Clicking one plots it, up to four
  together, on a shared time axis.
- The plot is live: hover to read any moment, click or drag to rewind to it,
  wheel to zoom the time window.
- Diagnostics are a status pill. The top alert and its fix stay in the header,
  and the full list opens on demand.

### The console

On Dennis's call that the workspace was mostly empty boxes and read as
underdeveloped, the layout was rebuilt around the stage.

- One large stage, an instruments deck beneath it and a full-height Inspector
  beside them, replacing the Scene, Tools, Parameters and notebook tiles.
- Scenes are a dropdown in the stage title. Tools moved into a rebuilt gizmo,
  grouped with the view controls and given room, with tooltips naming each tool
  and its key.
- Transport, speed, the rewind timeline and capture share one player bar.
- The Inspector holds Controls, Experiments, Guide, Math and Library as tabs.
- **Details card**: clicking a body shows it with live stats. Gravity adds its
  orbit, computed as two-body elements about the heaviest other body, and a
  portrait rendered at full detail by the scene.
- Readings are stat tiles with larger values, room to breathe and sparklines.
- The scope draws each reading in its own lane on one time axis, in a palette
  validated for colour-blind separation on the dark surface, and a reading keeps
  its colour when another is removed.

### Type and labels

On Dennis's call that the old stack read as elongated, Raleway and JetBrains
Mono replace Instrument Serif and IBM Plex. Raleway is set with lining figures,
because its default numerals bounce on the baseline, and JetBrains ligatures are
off, so symbols stay as typed. Faces load before a 3D scene paints text into its
textures.

Also on his call, labels now name what they measure: Distance became Distance
from the star, and Speed became Speed relative to the star. Orbit figures read in
plain terms, with the formal name in a hover: Time for one orbit, Orbit size,
Orbit shape, Orbit tilt.

### Moving around in 3D

Dennis reported the Collisions camera as all over the place. The cause was
shared by every plane lab, and the tall, wide table showed it worst.

- Zooming out pushed the orbit pivot away from the cursor with no limit, so a
  few wheel moves left it far off the apparatus and an orbit swung the scene
  across the stage. The pivot now stays on the apparatus, and zooming out
  retraces to the home view.
- The first pan jumped, because the home target sat outside the pan limits.
- Panning a tilted view lagged the pointer; the plane now slides one to one.
- Any resize threw away the user's angle; now it only rescales the view.
- Dragging the empty space around an apparatus orbits, as a 3D viewer should.
- Chaos orbits all the way around, on Dennis's call to see the model front and
  back.

### Graphics tiers

- Ultra, High, Medium, Low and Lite set resolution, antialiasing, shadows,
  reflections, post effects and mesh detail, on Dennis's call for a tier
  system. A Graphics menu shows the detected device and what a tier costs.
- Auto starts from the GPU and adapts to the frame rate. A step down that buys
  nothing is undone, because the limit is then the solver or the display.

### Fixes from the audit

No integrator was wrong: leapfrog, Boris, Verlet, the SPH relaxation, the wave
equation and the pendulum equations all checked out against analytic results.

- Replay is now exact. Float32 snapshots and an unseeded random stream in the
  fluid walls let a rewound run drift by hundreds of pixels; every scene now
  replays to zero difference.
- A stage resize silently restarted Waves, Fluid and Cloth, erasing painted
  walls, obstacles, tears and rewind history. Worlds now keep their size.
- Datasets kept discarded rows across a rewind and could be filed under the
  wrong scene. They are now one timeline with their true scene and rate.
- Experiments could finish themselves: two were timers, one completed from the
  cloth's own weight, others read sliders instead of the waves. Each now
  measures its claim, and each was driven to completion through the interface.
- The wave absorbers leaked enough to dim the central double-slit fringe.
- Energy readouts no longer divide by an arbitrary zero, follow edits to the
  charges, survive a rewind across changed parameters, or lose numerical gain
  when bodies are culled. Inclination no longer folds retrograde orbits.
- The FPS and real-time meters capped their own reading, so a slow machine
  reported itself healthy.
- Shift-drag pans in 3D as documented; Space plays and pauses after a mouse
  click; held keys act once; CapsLock no longer swaps b and Shift+B; pressing a
  lab key mid-throw cancels the throw instead of committing it.
- Sliders refresh the controls that depend on them; keyboard focus survives
  rebuilt lists; saved states restore the right scene header and world size.
- Stored clips leave memory once persisted, failed uploads leave no orphaned
  assets, and read-only artifacts no longer report a delete that did not
  happen.
- The shell no longer names a lab anywhere, which the architecture always
  claimed.

### Tests

Four of the six browser suites had no assertions and could only fail on a
crash. All now assert, a suite with no marks fails, and two suites are new:
`shell` for these regressions, and `world` for the 3D mode, its failure paths
and a resource soak.

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
