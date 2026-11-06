/*
✒ Metadata
    - Title: State Codec (digiSpace Edition - v2.0)
    - File Name: codec.js
    - Relative Path: js/core/codec.js
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
    Turns lab snapshots that hold typed arrays into plain JSON and back, for
    saved states.

✒ Key Features:
    - plain() tags typed arrays with their constructor name.
    - typed() restores them on load.
    - genericState gives a lab serialize/deserialize from its
      snapshot/restore pair.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* ================================================================== */
/*  Capture hooks per lab: rewind snapshots, datasets, saved states    */
/* ================================================================== */
export const TA = { Float64Array, Float32Array, Uint8Array, Int32Array };
export function plain(o) {
  if (ArrayBuffer.isView(o)) return { __ta: o.constructor.name, v: Array.from(o) };
  if (Array.isArray(o)) return o.map(plain);
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = plain(v); return r; }
  return o;
}
export function typed(o) {
  if (o && typeof o === 'object' && o.__ta && TA[o.__ta]) return new TA[o.__ta](o.v);
  if (Array.isArray(o)) return o.map(typed);
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = typed(v); return r; }
  return o;
}
export const genericState = {
  serialize() { return plain(this.snapshot()); },
  deserialize(o) { try { return this.restore(typed(o)) !== false; } catch (_) { return false; } },
};
