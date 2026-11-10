<!--
✒ Metadata
    - Title: README Media Manifest (digiSpace Edition - v2.5)
    - File Name: MANIFEST.md
    - Relative Path: docs/media/MANIFEST.md
    - Artifact Type: docs
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The hero,
      the Collisions, Fluid, Waves and Fields pictures and the 2D and 3D pair
      are recaptured from release 2.5.0, showing the Controls page's dials and
      the Random dice on the stage rail; the hero's planets show their type
      colours.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The hero,
      gallery and 2D and 3D pair are recaptured from release 2.4.0, showing
      the anchored stage rail, the deck's panes and metric units; Chaos is
      shown in its Both view.
    - 2.3.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The set is
      captured, on Dennis's call to do it in the cloud session: added each
      picture's size and a record of the run in place of the note that said
      the folder was waiting for them.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      with the README pictures Dennis asked for: what each shows, how it is
      made, and its format and licence.

✒ Description:
    Lists every picture the README shows, what each one captures, how to
    make or refresh them with tools/media.py, and their format, provenance
    and licence. The pictures are binary files, so this manifest carries
    their documentation.

✒ Key Features:
    - The commands to capture the full set, or one part of it.
    - One row per picture: file, what it shows, where the README uses it.
    - Capture settings, encoding and licences for the fonts and renderer
      that appear in the frames.

✒ Other Important Information:
    - Dependencies: tools/media.py, a running dev server, and Python 3 with
      Playwright for Python
    - Compatible platforms: Any Markdown viewer
---------
-->
# README media

[README](../../README.md) ✦ [Architecture](../../ARCHITECTURE.md) ✦
[Changelog](../../CHANGELOG.md) ✦ [Third-party](../../vendor/VENDOR.md)

The banner and screenshots the README shows. Every one is captured from the
playground itself by [`tools/media.py`](../../tools/media.py) and framed in
the playground's own palette: an amber-to-cyan border, a title bar in
Raleway with the lab's glyph and the status colours as window dots, and
rounded corners on a transparent background.

## Making them

Start the dev server, then run the capture from the project root in a
second terminal. `--headed` opens a visible browser that renders on the GPU
and takes a few minutes; leave the window alone while it works. Without it,
the capture runs headless on software WebGL, which works anywhere but takes
much longer at the Ultra tier.

```bash
npm run dev
```

```bash
python tools/media.py --headed
```

`--only` captures part of the set: any of `banner`, `hero`, `labs` and
`modes`, or single gallery labs by id, for example `--only chaos` after a
change to that lab's scene. Commit the WebP files with
the change that made them necessary.

The hero, the Collisions, Fluid, Waves and Fields pictures and the 2D and
3D pair were captured from release 2.5.0 on 11/10/2026, headless in
software WebGL on four CPU cores, in metric units, so they show the
Controls page's dials and the Random dice on the stage rail. Chaos and
Cloth, whose rails have no dice, stand from release 2.4.0, and the banner,
which shows no interface, from release 2.3.0.

## The pictures

| File | Size (px) | Shows | Used in |
| --- | --- | --- | --- |
| `banner.webp` | 2560 × 800 | The title, tagline and the seven labs over a live 3D render of Gravity's star system | README title |
| `hero-workspace.webp` | 2244 × 1517 | The whole workspace in 3D at the Ultra tier: Gravity's star system after 8 simulated seconds (about 1.8 years), its ocean worlds and gas giants in their type colours, with the stage rail and its Random dice, the instruments deck on Telemetry, the Controls page's dials and the colophon | README, under the badges |
| `lab-collisions.webp` | 1106 × 610 | Collisions, Billiard break, 1.6 s in | Lab gallery |
| `lab-fluid.webp` | 1106 × 610 | Fluid, Dam break, 1.4 s in | Lab gallery |
| `lab-waves.webp` | 1106 × 610 | Waves, Double slit, 6 s in | Lab gallery |
| `lab-chaos.webp` | 1106 × 610 | Chaos, Sensitive start in the Both view (the pendulum beside its phase map), 9 s in, with a start previewed on the map | Lab gallery |
| `lab-cloth.webp` | 1106 × 610 | Cloth, Flag in wind, 4 s in | Lab gallery |
| `lab-fields.webp` | 1106 × 610 | Fields, Cyclotron motion, 3 s in | Lab gallery |
| `modes-2d-3d.webp` | 1472 × 420 | Waves, Double slit, 6 s in and paused, in 2D and then in 3D at the same moment | "Two modes: 2D and 3D" |

Gravity is not in the gallery because the hero already shows it.

## Format and provenance

- **Capture**: Chromium at 1440 × 900 CSS pixels and device scale 2, with
  the Ultra graphics tier. A fake page clock drives the frame loop, so each
  frame is simulated and drawn in full, and the timing readouts show what a
  machine with a GPU shows.
- **Framing**: the hero at 1.5×, the banner at 2× (2560 × 800), the gallery
  and the 2D and 3D pair at 1×, so each picture has about twice the pixels
  the README displays it at.
- **Encoding**: WebP with an alpha channel, quality 0.9 (0.92 for the
  banner), encoded by the browser itself. `.gitattributes` marks `*.webp`
  binary.
- **Licence**: Apache-2.0, as the project. The frames render Raleway and
  JetBrains Mono (SIL OFL 1.1) and Material Symbols Rounded (Apache-2.0)
  from Google Fonts, and three.js (MIT) renders the 3D scenes; see
  [vendor/VENDOR.md](../../vendor/VENDOR.md).

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
