<!--
✒ Metadata
    - Title: Third-Party Register (digiSpace Edition - v2.0)
    - File Name: VENDOR.md
    - Relative Path: vendor/VENDOR.md
    - Artifact Type: docs
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: the CDN-backed stack he asked for.

✒ Description:
    Lists every third-party package the playground uses, its pinned version,
    where it is loaded from, its licence, and what happens when it cannot
    load.

✒ Key Features:
    - Vendored KaTeX files and why they are vendored.
    - CDN packages with versions and licences.
    - Offline behaviour for each dependency.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# Third-party code

Everything the playground uses that it did not write, where it comes from,
and under which licence. Versions are pinned; upgrade them deliberately
(see "Add or upgrade a third-party library" in
[ARCHITECTURE.md](../ARCHITECTURE.md)).

## Vendored in this folder

| Package | Version | Files | Licence | Why vendored |
| --- | --- | --- | --- | --- |
| KaTeX | 0.19.1 | `katex/katex.min.css`, `katex/fonts/*.woff2` (20 faces), `katex/LICENSE` | MIT | The artifact host allows stylesheets only from Google Fonts or the page itself, and fonts only from Google, the page, or data URIs |

Vendored files are kept exactly as published in the `katex@0.19.1` npm
package (checked byte for byte on 11/05/2026). They carry no digiSpace
header and are skipped by `npm run check` and ESLint. The stylesheet also
names `.woff` and `.ttf` fallbacks, which are not vendored: every
supported browser loads the `.woff2` faces first. The published artifact
serves the licence as `vendor/katex/LICENSE.txt`, because the artifact
host only serves files that have an extension.

## Loaded from a CDN

| Package | Version | Source | Licence | Used by |
| --- | --- | --- | --- | --- |
| KaTeX module | 0.19.1 | jsDelivr, `katex@0.19.1/dist/katex.mjs` (import map `katex`) | MIT | `js/core/tex.js`, loaded on first formula |
| three.js | 0.187.0 | jsDelivr, `three@0.187.0/build/three.module.js` and `examples/jsm/` (import map `three`, `three/addons/`) | MIT | `js/render/orbit3d.js`, loaded when the 3D orbit view opens |
| Material Symbols Rounded | Google Fonts, variable | `fonts.googleapis.com/css2?family=Material+Symbols+Rounded…&icon_names=…` | Apache-2.0 | Every icon; the request is subset to the glyphs in use |
| IBM Plex Sans, IBM Plex Mono | Google Fonts | `fonts.googleapis.com/css2?family=IBM+Plex+…` | SIL OFL 1.1 | Interface and numeric text |
| Instrument Serif | Google Fonts | `fonts.googleapis.com/css2?family=Instrument+Serif…` | SIL OFL 1.1 | Headings |

## When a CDN is unreachable

- **KaTeX**: formula cards show their TeX source as readable text.
- **three.js**: the gravity lab announces that the 3D view is unavailable,
  disables its switch with the reason, adds a diagnostics insight, and
  keeps simulating in three dimensions in the flat view.
- **Material Symbols**: after 6 seconds without the font, glyph names are
  hidden so no raw words like `play_arrow` appear; every icon button keeps
  its text label or accessible name.
- **Text faces**: the page falls back to system fonts.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
