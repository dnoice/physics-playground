<!--
✒ Metadata
    - Title: Third-Party Register (digiSpace Edition - v2.2)
    - File Name: VENDOR.md
    - Relative Path: vendor/VENDOR.md
    - Artifact Type: docs
    - Version: 2.2.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added the
      tools and actions used only in development and CI, the README badge
      service, the rule that tools/site.mjs enforces this register's CDN
      hosts, and the navigation line shared with the other documents.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — three.js
      now serves the whole 3D mode.
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
    - Development and CI tools, which never reach the browser.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# Third-party code

[README](../README.md) ✦ [Architecture](../ARCHITECTURE.md) ✦
[Changelog](../CHANGELOG.md) ✦ **Third-party** ✦
[Live lab](https://dnoice.github.io/physics-playground/)

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
| three.js | 0.187.0 | jsDelivr, `three@0.187.0/build/three.module.js` and `examples/jsm/` (import map `three`, `three/addons/`) | MIT | `js/render/world/*`, loaded when the 3D mode is first used |
| Material Symbols Rounded | Google Fonts, variable | `fonts.googleapis.com/css2?family=Material+Symbols+Rounded…&icon_names=…` | Apache-2.0 | Every icon; the request is subset to the glyphs in use |
| Raleway | Google Fonts | `fonts.googleapis.com/css2?family=Raleway…` | SIL OFL 1.1 | Headings and interface text, set with lining figures |
| JetBrains Mono | Google Fonts | `fonts.googleapis.com/css2?family=JetBrains+Mono…` | SIL OFL 1.1 | Numbers and data, with ligatures off |

These hosts (`cdn.jsdelivr.net`, `fonts.googleapis.com` and the
`fonts.gstatic.com` it serves faces from) are the only external origins the
page may load from. `HOSTS` in `tools/site.mjs` mirrors this table, and
`npm run site` fails on any other, so a new CDN is recorded here before it
can ship.

## Used only in development and CI

None of these reach the browser or the deployed site.

| Package | Version | Source | Licence | Used by |
| --- | --- | --- | --- | --- |
| ESLint | 10.14.0 | npm, pinned in `package-lock.json` | MIT | `npm run lint` |
| globals | 17.14.0 | npm, pinned in `package-lock.json` | MIT | ESLint's browser and Node.js globals |
| Playwright for Python | as installed | PyPI | Apache-2.0 | `npm test` and `npm run media` |
| actions/checkout | v7 | GitHub Actions | MIT | Pages workflow |
| actions/setup-node | v5 | GitHub Actions | MIT | Pages workflow |
| actions/upload-pages-artifact | v3 | GitHub Actions | MIT | Pages workflow |
| actions/deploy-pages | v5 | GitHub Actions | MIT | Pages workflow |

The README's badges are images served by
[shields.io](https://shields.io/); nothing from it runs in the playground
or in the workflow.

## When a CDN is unreachable

- **KaTeX**: formula cards show their TeX source as readable text.
- **three.js**: the workspace announces that 3D is unavailable, disables the
  3D switch with the reason, adds a diagnostics insight, and stays in 2D.
- **Material Symbols**: after 6 seconds without the font, glyph names are
  hidden so no raw words like `play_arrow` appear; every icon button keeps
  its text label or accessible name.
- **Text faces**: the page falls back to system fonts.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
