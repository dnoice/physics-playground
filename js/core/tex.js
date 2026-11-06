/*
✒ Metadata
    - Title: TeX Typesetting (digiSpace Edition - v2.0)
    - File Name: tex.js
    - Relative Path: js/core/tex.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 when Dennis asked for third-party CDNs to take over heavy
      lifting; the formula cards switch from hand-built HTML to KaTeX.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Renders LaTeX in formula cards and inline equations with KaTeX, loaded
    on first use from the import map.

✒ Key Features:
    - typeset(root) renders every [data-tex] element under root;
      data-inline="true" for inline maths.
    - Falls back to the TeX source as readable text if KaTeX cannot load.
    - Never blocks the stage: the import is dynamic.

✒ Other Important Information:
    - Dependencies: KaTeX 0.19.1 (katex.mjs from jsDelivr via the import
      map; CSS and fonts vendored)
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
/* KaTeX typesetting for formula cards. KaTeX loads from jsDelivr through the
   import map; its stylesheet and fonts are vendored under vendor/katex because
   the artifact host only accepts stylesheets from its own files. If the
   library cannot load, each card shows its LaTeX source instead. */
let katex = null, loading = null;
export function loadTex() {
  if (!loading) loading = import('katex').then(m => { katex = m.default || m; return katex; }).catch(() => null);
  return loading;
}
export function renderTex(el, tex, display = true) {
  if (katex) {
    try { katex.render(tex, el, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' }); el.classList.remove('tex-fallback'); return; }
    catch { /* fall through to the source text */ }
  }
  el.textContent = tex; el.classList.add('tex-fallback');
}
/* Typeset every [data-tex] node under root once KaTeX is ready. */
export function typeset(root) {
  const nodes = [...root.querySelectorAll('[data-tex]')];
  const run = () => { for (const n of nodes) renderTex(n, n.dataset.tex, n.dataset.inline !== 'true'); };
  if (katex) run(); else { run(); loadTex().then(k => { if (k) run(); }); }
}
