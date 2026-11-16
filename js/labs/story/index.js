/*
✒ Metadata
    - Title: Lab Narrators (digiSpace Edition - v2.18)
    - File Name: index.js
    - Relative Path: js/labs/story/index.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: one narrator per
      lab, keyed by the lab's id, which the registry mixes into the lab.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The narrators of the seven labs, keyed by lab id. Each is a small mixin,
    { storyHint, narrate(N) }, that js/labs/index.js copies onto its lab;
    js/shell/story.js calls narrate() a few times a second and keeps the
    Story it tells.

✒ Key Features:
    - One module per lab, beside the lab rather than inside it, so a
      narrator reads the lab's state and helpers without crowding its file.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { chaosStory } from './chaos.js';
import { clothStory } from './cloth.js';
import { collisionsStory } from './collisions.js';
import { fieldsStory } from './fields.js';
import { fluidStory } from './fluid.js';
import { gravityStory } from './gravity.js';
import { wavesStory } from './waves.js';

export const STORIES = { gravity: gravityStory, collisions: collisionsStory, fluid: fluidStory, waves: wavesStory, chaos: chaosStory, cloth: clothStory, fields: fieldsStory };
