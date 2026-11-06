/*
✒ Metadata
    - Title: Time Series Ring (digiSpace Edition - v2.0)
    - File Name: series.js
    - Relative Path: js/core/series.js
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
    A fixed-capacity ring buffer of (t, value) samples used by every running
    chart.

✒ Key Features:
    - O(1) push with automatic overwrite of the oldest sample.
    - truncateAfter(t) cuts the future away when the rewind timeline seeks
      back.
    - idx(i) maps chronological index to storage slot for drawing.

✒ Usage Instructions:
    const s = new Series(600); s.push(t, energy);

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/


export class Series {
  constructor(cap) { this.cap = cap; this.t = new Float64Array(cap); this.v = new Float64Array(cap); this.n = 0; this.head = 0; }
  push(t, v) { this.t[this.head] = t; this.v[this.head] = v; this.head = (this.head + 1) % this.cap; if (this.n < this.cap) this.n++; }
  clear() { this.n = 0; this.head = 0; }
  idx(i) { return (this.head - this.n + i + this.cap) % this.cap; }
  last() { return this.n ? this.v[this.idx(this.n - 1)] : NaN; }
  truncateAfter(t) { while (this.n && this.t[this.idx(this.n - 1)] > t + 1e-9) { this.head = (this.head - 1 + this.cap) % this.cap; this.n--; } }
}
