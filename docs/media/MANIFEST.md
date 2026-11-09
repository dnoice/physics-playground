<!--
✒ Metadata
    - Title: README Media Manifest (digiSpace Edition - v2.3)
    - File Name: MANIFEST.md
    - Relative Path: docs/media/MANIFEST.md
    - Artifact Type: docs
    - Version: 2.3.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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

`--only banner,hero,labs,modes` captures part of the set, for example
`--only labs` after a change to one lab's scene. Commit the WebP files with
the change that made them necessary.

If this folder holds only this manifest, the pictures have not been
captured yet.

## The pictures

| File | Shows | Used in |
| --- | --- | --- |
| `banner.webp` | The title, tagline and the seven labs over a live 3D render of Gravity's star system | README title |
| `hero-workspace.webp` | The whole workspace in 3D at the Ultra tier: Gravity's star system after 7 simulated seconds, with the instruments, the sectioned Controls page and the colophon | README, under the badges |
| `lab-collisions.webp` | Collisions, Billiard break, 1.6 s in | Lab gallery |
| `lab-fluid.webp` | Fluid, Dam break, 1.4 s in | Lab gallery |
| `lab-waves.webp` | Waves, Double slit, 6 s in | Lab gallery |
| `lab-chaos.webp` | Chaos, Sensitive start in the phase view, 9 s in, with a start previewed on the map | Lab gallery |
| `lab-cloth.webp` | Cloth, Flag in wind, 4 s in | Lab gallery |
| `lab-fields.webp` | Fields, Cyclotron motion, 3 s in | Lab gallery |
| `modes-2d-3d.webp` | Waves, Double slit, 6 s in and paused, in 2D and then in 3D at the same moment | "Two modes: 2D and 3D" |

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
