<!--
✒ Metadata
    - Title: Security Policy (digiSpace Edition - v2.13)
    - File Name: SECURITY.md
    - Relative Path: SECURITY.md
    - Artifact Type: docs
    - Version: 2.13.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.13.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for the community documents a public project needs.

✒ Description:
    Which versions are supported, what counts as a security problem in a
    static browser app, how to report one privately, and what happens after
    a report.

✒ Key Features:
    - Private reporting through GitHub's vulnerability reporting, with a
      fallback that discloses nothing in public.
    - Scope written for this project: the saved states it loads, rendered
      text, browser and artifact storage, pinned CDN code and the Pages
      workflow.
    - What to include in a report, and what to expect afterwards.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Any Markdown viewer
---------
-->
# Security policy

Physics Playground is a static site that runs in your browser. It has no
server of its own, no accounts and no analytics. It fetches its libraries
from jsDelivr and its fonts from Google Fonts. Your runs, saved states and
datasets stay in your browser, unless you download them or the page runs
as a published artifact, whose storage keeps the Library. Even so, we take
security seriously, and we are grateful for reports that help keep it
safe.

## Supported versions

Fixes go into the next release on `main`, which the
[live lab](https://dnoice.github.io/physics-playground/) serves. Older
releases are not patched.

| Version | Supported |
| --- | --- |
| The latest release on `main` and the live lab | Yes |
| Earlier releases | No: please update |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it
privately:

1. Open the repository's **Security** tab and choose **Report a
   vulnerability**, when it is offered. GitHub keeps the report private
   between you and the maintainer.
2. If that button is not there, open an issue titled "Private security
   report" containing **no details**. The maintainer will reply with a
   private way to send them.

A helpful report includes:

- what the problem is, and what an attacker could do with it;
- the steps to reproduce it, or a proof of concept;
- the browser and operating system you used;
- a suggested fix, if you have one.

## What to expect

- The maintainer aims to acknowledge your report within a few days.
- We will confirm the problem, decide on a fix, and keep you informed.
- Once the fix is released we will credit you in the release notes, unless
  you would rather stay anonymous.

Please give us a reasonable chance to release a fix before you share
details publicly.

## Scope

In scope:

- **Saved states it loads.** A crafted or tampered saved state in the
  Library, for example in a shared artifact's storage, that runs script,
  corrupts other saved items or locks up the page when loaded.
- **Text it shows.** Script injected through anything a person can name or
  load, such as a Library item's title or a saved state's contents.
- **Storage.** The Library's IndexedDB, or its artifact storage, and the
  settings kept in `localStorage`.
- **Third-party code.** The pinned three.js and KaTeX that the import map
  loads, and the copies in `vendor/`.
- **The Pages workflow.** `.github/workflows/pages.yml`, its permissions and
  how it deploys.

Out of scope:

- Problems that need an already compromised device or browser.
- Code you paste into your own browser console.
- Running very large simulations until your own tab slows down.
- Problems in GitHub, GitHub Pages, jsDelivr or Google Fonts themselves.
  Please report those to the service concerned.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
