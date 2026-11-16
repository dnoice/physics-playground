<!--
✒ Metadata
    - Title: Contributing Guide (digiSpace Edition - v2.13)
    - File Name: CONTRIBUTING.md
    - Relative Path: CONTRIBUTING.md
    - Artifact Type: docs
    - Version: 2.13.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.13.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call, as the repository began to draw stars and forks, for
      a welcoming, intuitive guide to contributing.

✒ Description:
    How to contribute to Physics Playground: the ways to help, a five-minute
    start, the checks a change passes, a tour of the code, the house style
    for code, physics and words, the ✒ file headers, and what happens to a
    pull request.

✒ Key Features:
    - A first contribution in five steps, from fork to pull request.
    - The commands for every check, matched to what CI runs.
    - The file header rules spelled out, with a worked example.
    - Physics contributions held to sources and tests.
    - Links to the code of conduct, the security policy and the issue
      forms.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# Contributing to Physics Playground

Thank you for being here. Physics Playground is seven live physics labs in
one browser workspace, and it gets better every time someone tries it,
questions it or improves it. Whether you fix a typo, report a planet that
flies off into space, or build a whole new lab, you are welcome.

This guide takes you from a fresh clone to a merged pull request, and
explains the few house rules that keep the project consistent. Please also
read the [code of conduct](CODE_OF_CONDUCT.md): it applies everywhere the
project lives.

- [Ways to help](#ways-to-help)
- [Your first contribution in five steps](#your-first-contribution-in-five-steps)
- [Checking your change](#checking-your-change)
- [A tour of the code](#a-tour-of-the-code)
- [House style](#house-style)
- [File headers](#file-headers)
- [Pull requests and review](#pull-requests-and-review)
- [Licence](#licence)
- [Getting help](#getting-help)

## Ways to help

You do not need to write code to make a difference.

| You can | How |
| --- | --- |
| Report a bug | Open a [bug report](https://github.com/dnoice/physics-playground/issues/new?template=bug_report.yml). Steps to reproduce and a screenshot help most. |
| Report physics that looks wrong | Use the [physics accuracy form](https://github.com/dnoice/physics-playground/issues/new?template=physics_accuracy.yml): what the playground shows, what you expected, and a formula or source if you have one. |
| Suggest an idea | Open a [feature request](https://github.com/dnoice/physics-playground/issues/new?template=feature_request.yml): a new scene, a new tool, a lab you would love to see. |
| Improve the docs | Fix anything unclear in the README, this guide or [ARCHITECTURE.md](ARCHITECTURE.md). Docs pull requests are always welcome. |
| Write code | Pick an open issue, or propose your own. Issues labelled `good first issue` are a gentle place to start. |
| Add tests | The browser suites in `tests/` can always cover more. A test that pins down a bug is a gift. |

Before a larger piece of work, such as a new lab, a new dependency, a change
to a physics model or a redesign of part of the interface, please open an
issue first. A short conversation up front saves you from building something
that has to change course in review.

## Your first contribution in five steps

You need [Node.js](https://nodejs.org/) 20.19 or newer and Git. There is no
build step: the browser runs the same files you edit.

1. **Fork and clone.** Fork the repository on GitHub, then clone your fork.

   ```bash
   git clone https://github.com/YOUR-USERNAME/physics-playground.git
   ```

   ```bash
   cd physics-playground
   ```

2. **Install the dev tools.** This installs ESLint at the exact versions in
   `package-lock.json`.

   ```bash
   npm ci
   ```

3. **Run it.** Start the dev server and open <http://localhost:5173/>.
   Edit a file, reload the page, and you will see your change.

   ```bash
   npm run dev
   ```

4. **Make your change on a branch.** Name it after what it does, such as
   `fix/gravity-throw-label`, `feat/fields-dipole-scene` or
   `docs/units-table`.

   ```bash
   git switch -c fix/your-change
   ```

5. **Check it and open a pull request.** Run the checks below, push your
   branch and open a pull request. The template walks you through the rest.

## Checking your change

Every pull request runs one gate on GitHub, "Verify and stage". Run the same
gate locally before you push:

```bash
npm run verify
```

| Command | What it checks | When to run it |
| --- | --- | --- |
| `npm run verify` | Lint, file headers and the staged site: exactly what CI runs | Before every push |
| `npm run lint` | ESLint over the modules and tools | While you work |
| `npm run check` | ✒ headers, changelog bounds, the icon subset and module syntax | After touching any file's header |
| `npm run site` | Stages the Pages site in `_site/` and proves every reference resolves | After adding, moving or renaming a file |
| `npm test` | Every browser suite against the running dev server | When you change how anything behaves |

### The browser tests

The suites in `tests/` drive the real app in Chromium through Playwright for
Python. CI does not run them, so please run them yourself when you change
behaviour. Set up once:

```bash
python -m venv .venv
```

```bash
source .venv/bin/activate
```

On Windows, activate with `.venv\Scripts\activate` instead. Then install
Playwright and its browser:

```bash
pip install playwright
```

```bash
playwright install chromium
```

With the dev server running in another terminal, run every suite, or just
the one you need:

```bash
npm test
```

```bash
python tests/placement.py
```

A suite prints a JSON record of its checks and exits non-zero if any fail or
the browser console logged an error. To add a check, use `ok()` from
`tests/harness.py` with a name that reads as a sentence about the behaviour:

```python
ok("throw_speed_follows_the_orbit_not_the_zoom", abs(ratio - 2 / 3) < 0.04, ratio)
```

A good check fails without your fix and passes with it. If you can, run it
both ways before you push.

## A tour of the code

The playground is plain ES modules with no framework and no bundler.
[ARCHITECTURE.md](ARCHITECTURE.md) explains it in depth, including recipes to
add a lab, an icon or a library. The short version:

| Folder | What lives there |
| --- | --- |
| `js/core/` | Pure helpers: DOM, colour, charts, 3D maths, units, the state codec |
| `js/labs/` | One module per lab. A lab is a plain object that implements the lab contract. |
| `js/shell/` | Everything around a lab: panels, dials, the stage rail, camera, deck, head-up display, Library |
| `js/render/` | The 2D liquid surface, and `world/`, the 3D mode with one scene per lab |
| `css/` | Styles, one file per area of the workspace |
| `tests/` | Browser suites (Python and Playwright) |
| `tools/` | The dev server, the project checker, site staging and picture capture |
| `docs/` | The research reference behind Gravity's planet classes, and the README pictures |
| `vendor/` | Third-party code kept exactly as published, with its licences |

To find your way around a lab, open its module in `js/labs/` and look for
`presets` (its scenes), `controls` (its dials and switches) and `step(dt)`
(its physics). In the browser, `window.PhysicsPlayground` exposes the active
lab and the app's controls for exploring in the console.

## House style

### Code

- **Plain modules, no build step.** Third-party code arrives through the
  import map in `index.html`, pinned to an exact version. Please open an
  issue before adding a runtime dependency.
- **Follow the principles** in [ARCHITECTURE.md](ARCHITECTURE.md#principles):
  labs are data plus behaviour, a 3D scene only reads its lab, and the
  interface tells the truth. A control that cannot act is disabled and says
  why.
- **Accessible by default.** Every control is reachable by keyboard and has
  a label, and motion respects `prefers-reduced-motion`.
- **Cheap to paint.** Tiles that repaint as readings change keep one
  gradient layer and no backdrop blur. The
  [conventions](ARCHITECTURE.md#conventions) explain why.
- **ESLint has the final word on formatting.** If `npm run lint` is happy,
  so are we.

### Physics

The playground's promise is that what you see is real physics.

- **Cite your sources.** A new constant, model or formula comes with where
  it came from: a paper, a textbook or a data set such as NASA JPL's.
- **Units change the display, never the physics.** Switching between
  metric, US customary and simulation units converts what is shown; the
  simulation underneath is untouched.
- **Back it with a check.** Where you can, add a test, or a Math page check
  that sets the theory beside what the simulation measures.

### Words

- **Plain and specific.** Say what something does, in everyday words.
- **British spelling**, to match the interface and docs: colour, centre,
  metre.
- **Dates as MM/DD/YYYY**, as in the file headers.
- **Markdown prose wraps at 80 characters**, as `.markdownlint.jsonc` sets
  out. Tables and code blocks may run longer.

## File headers

Every file the project owns starts with a ✒ Metadata header: JavaScript,
CSS, HTML, Markdown, Python, YAML and JSONC files, and the `.gitignore`,
`.gitattributes` and `.nojekyll` dotfiles. `npm run check` fails without it,
so CI does too.

A few files carry no header:

- third-party files in `vendor/katex/`, kept exactly as published;
- strict JSON such as `package.json`, which cannot hold a comment;
  [package.metadata.md](package.metadata.md) documents it instead;
- the pull request template, whose text is copied into every pull request.

**When you create a file**, copy the header from a file of the same type
and fill it in:

- the Title, ending `(digiSpace Edition - vX.Y)`;
- the File Name, and the Relative Path, which must match where the file
  lives;
- the Artifact Type, Version, Date and Update;
- you as the Author;
- the A.I. Acknowledgement: the AI tool you used, or `None`.

Keep the Signature line exactly as it is.

**When you change a file**, add an entry at the top of its Changelog and
update the Version, Date and Update lines to match:

```text
    - 2.14.0 (12/01/2026) [your-handle] — What changed, and why.
```

If an AI tool helped, name it in the brackets:
`[your-handle + Tool Name]`. Use the version of the next release if you know
it, or the next minor version if you don't. The maintainer settles the
number when releasing.

Files the browser loads (`js/`, `css/` and `index.html`) keep at most three
changelog entries, followed by `Earlier entries: see CHANGELOG.md`. When you
add a fourth, drop the oldest; the full history lives in
[CHANGELOG.md](CHANGELOG.md).

Here is a complete header for a JavaScript file:

```js
/*
✒ Metadata
    - Title: Dipole Scene (digiSpace Edition - v2.14)
    - File Name: dipole.js
    - Relative Path: js/labs/dipole.js
    - Artifact Type: javascript
    - Version: 2.14.0
    - Date: 12/01/2026
    - Update: Tuesday, December 01, 2026
    - Author: Your Name
    - A.I. Acknowledgement: None
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.14.0 (12/01/2026) [your-handle] — Created: an electric dipole
      scene for the Fields lab.
    Earlier entries: see CHANGELOG.md

✒ Description:
    One or two sentences on what the file is for.

✒ Key Features:
    - What it does, one line each.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules
---------
*/
```

Markdown files wrap the same header in `<!-- -->`, Python files carry it as
the module docstring, and YAML files as `#` comments. Copy a neighbouring
file to see each one.

## Pull requests and review

- **One change per pull request.** A focused pull request is quicker to
  review and safer to merge.
- **Fill in the template.** Say what changed and why, and link the issue,
  for example with `Fixes #42`.
- **Show visible changes.** A screenshot or a short clip helps a reviewer
  most. If your change shows in both views, show it in 2D and in 3D.
- **Write commits that explain themselves.** Use a short summary in the
  imperative ("Fix the throw label in 3D"), then a body that says why.
- **Leave CHANGELOG.md to the maintainer.** Describe your change in the
  pull request, and it will be folded into the next release's notes.

After you open a pull request, "Verify and stage" runs on it. The
maintainer reviews it, may suggest changes, and merges it once it is ready.
Feedback is about the code, never about you. If something in a review is
unclear, ask.

## Licence

Physics Playground is licensed under the [Apache License 2.0](LICENSE). By
contributing, you agree that your contribution is licensed the same way,
as Section 5 of the licence describes. Third-party code needs a compatible
licence, and is recorded in [vendor/VENDOR.md](vendor/VENDOR.md).

## Getting help

- **Questions** are welcome as issues. Choose "Blank issue" and say what you
  are trying to do. No question is too small.
- **Security problems** should never go in a public issue. Follow the
  [security policy](SECURITY.md) instead.
- **Conduct concerns** go to the maintainer privately, as the
  [code of conduct](CODE_OF_CONDUCT.md#reporting) describes.

Thank you for helping make physics something people can play with.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
