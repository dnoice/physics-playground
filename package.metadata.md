<!--
✒ Metadata
    - Title: Package Metadata (digiSpace Edition - v2.1)
    - File Name: package.metadata.md
    - Relative Path: package.metadata.md
    - Artifact Type: docs
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
    - Test prerequisites.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# package.json metadata

`package.json` is strict JSON and cannot carry a comment header, so its
documentation lives here.

## What it declares

| Field | Value | Meaning |
| --- | --- | --- |
| `name` | `physics-playground` | Package name; `private` keeps it off the npm registry |
| `version` | `2.0.0` | Project release, matching [CHANGELOG.md](CHANGELOG.md) |
| `type` | `module` | Every `.js` file is an ES module, in Node as in the browser |
| `engines.node` | `>=18` | The dev server and checker use only the Node 18 standard library |
| `devDependencies` | `eslint`, `globals` | Linting only; the playground itself installs nothing |

## Scripts

| Script | Runs | Use it to |
| --- | --- | --- |
| `npm run dev` | `node tools/serve.mjs` | Serve the project on <http://localhost:5173/> |
| `npm run lint` | `eslint .` | Catch undefined names, reassigned imports and unused variables |
| `npm run check` | `node tools/check.mjs` | Check headers, changelog bounds, the icon subset and module syntax |
| `npm run verify` | lint, then check | Run both static checks before a release |
| `npm test` | `python tests/run_all.py` | Run the Playwright browser suites against the running dev server |

`npm test` needs Python 3 with Playwright (`pip install playwright`, then
`playwright install chromium`) and a dev server already running. Pass a
different address as an argument or in `PP_URL`.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
