/*
✒ Metadata
    - Title: Stage View Size (digiSpace Edition - v2.0)
    - File Name: view.js
    - Relative Path: js/core/view.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Holds the stage size in CSS pixels and the device pixel ratio, shared by
    the shell and the labs.

✒ Key Features:
    - One mutable record updated by measure() on resize.
    - Read by cameras, labs and renderers that need the stage size.
    - No dependencies, so any module can import it without cycles.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
export const view = { w: 0, h: 0, dpr: 1 };
