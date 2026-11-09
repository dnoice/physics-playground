<!--
✒ Metadata
    - Title: Package Metadata (digiSpace Edition - v2.3)
    - File Name: package.metadata.md
    - Relative Path: package.metadata.md
    - Artifact Type: docs
    - Version: 2.3.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Version
      2.3.0.
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Version
      2.2.0; the site and media scripts, verify's new site step, and the
      lockfile. Corrected the version and Node.js floor, which still read
      2.0.0 and 18.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Version
      2.1.0; the Node.js floor follows ESLint 10.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: a formal stack.

✒ Description:
    Documents package.json, which as strict JSON cannot carry a comment
    header: its fields and its npm scripts.

✒ Key Features:
    - Field-by-field meaning.
    - Every npm script and when to use it.
    - Test and media prerequisites.
    - What package-lock.json pins and who reads it.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# package.json metadata

[README](README.md) ✦ [Architecture](ARCHITECTURE.md) ✦
[Changelog](CHANGELOG.md) ✦ [Third-party](vendor/VENDOR.md)

`package.json` is strict JSON and cannot carry a comment header, so its
documentation lives here.

## What it declares

| Field | Value | Meaning |
| --- | --- | --- |
| `name` | `physics-playground` | Package name; `private` keeps it off the npm registry |
| `version` | `2.3.0` | Project release, matching [CHANGELOG.md](CHANGELOG.md) |
| `type` | `module` | Every `.js` file is an ES module, in Node as in the browser |
| `engines.node` | `>=20.19` | ESLint 10 needs Node.js 20.19 or later; the dev server, checker and stager use only the standard library |
| `devDependencies` | `eslint`, `globals` | Linting only; the playground itself installs nothing |

## Scripts

| Script | Runs | Use it to |
| --- | --- | --- |
| `npm run dev` | `node tools/serve.mjs` | Serve the project on <http://localhost:5173/> |
| `npm run lint` | `eslint .` | Catch undefined names, reassigned imports and unused variables |
| `npm run check` | `node tools/check.mjs` | Check headers, changelog bounds, the icon subset and module syntax |
| `npm run site` | `node tools/site.mjs` | Stage the GitHub Pages site in `_site/` and prove every reference resolves |
| `npm run verify` | lint, check, then site | Run every static check before a release; the Pages workflow runs the same |
| `npm test` | `python tests/run_all.py` | Run the Playwright browser suites against the running dev server |
| `npm run media` | `python tools/media.py` | Capture the README banner and screenshots into `docs/media/`; add `-- --headed` to render on the GPU |

`npm test` and `npm run media` need Python 3 with Playwright (`pip install
playwright`, then `playwright install chromium`) and a dev server already
running. Pass a different address as an argument or in `PP_URL`.

## package-lock.json

The lockfile pins every dev tool and its dependencies to an exact version
and checksum. `npm ci` installs exactly that set, which is what the Pages
workflow does, and `actions/setup-node` keys its npm cache to the file.
Update it by changing `devDependencies` and running `npm install`, then
commit both files together.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
