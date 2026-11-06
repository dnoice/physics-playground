/*
✒ Metadata
    - Title: Lab Registry (digiSpace Edition - v2.0)
    - File Name: index.js
    - Relative Path: js/labs/index.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single file; v2.0 adds the Fields lab and attaches the
      experiments curriculum.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Lists the labs in rail order and gives each lab object its shared
    runtime fields and its guided experiments.

✒ Key Features:
    - labs (ordered) and labsById for lookup.
    - Seeds t, size, sceneP and experiments on every lab.
    - Imported first by main.js so every lab exists before the shell wires
      up.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { pendulum } from './chaos.js';
import { cloth } from './cloth.js';
import { collisions } from './collisions.js';
import { EXPERIMENTS } from './experiments.js';
import { fields } from './fields.js';
import { fluid } from './fluid.js';
import { gravity } from './gravity.js';
import { waves } from './waves.js';

/* ================================================================== */
/*  Shell: registry, panel, diagnostics, loop                           */
/* ================================================================== */
export const labs = [gravity, collisions, fluid, waves, pendulum, cloth, fields];
export const labsById = Object.fromEntries(labs.map(l => [l.id, l]));
for (const l of labs) Object.assign(l, { t: 0, _acc: 0, ready: false, holding: l.holding || false, size: { w: 0, h: 0 }, hover: null, sceneP: { ...l.p }, experiments: EXPERIMENTS[l.id] || [] });
