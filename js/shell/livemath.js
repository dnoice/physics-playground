/*
✒ Metadata
    - Title: Live Math (digiSpace Edition - v2.5)
    - File Name: livemath.js
    - Relative Path: js/shell/livemath.js
    - Artifact Type: javascript
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for a Math page wired to the simulations: each formula
      can carry the running numbers, sliders for its parameters, a check of
      theory against the run and a plot of both.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Turns the Math page's formula cards into instruments. A formula element
    marked data-live="name" gets a panel from the lab's mathLive[name]: the
    values of its symbols in the running simulation, sliders for the
    parameters it contains (the same parameters as the Controls page, kept in
    step with it), a check that sets the formula's prediction beside what the
    simulation measures, and a small plot.

✒ Key Features:
    - Symbols with live values, refreshed with the readouts while the Math
      page is open, and paused otherwise.
    - Parameter sliders that change the run as the Controls page does,
      through setParam, so both stay in step; only parameters that do not
      restart the run are offered.
    - A check line: theory, simulation and how far apart, coloured by how
      well they agree, or a note when the run cannot show it yet.
    - An optional plot drawn by the lab, at the device's pixel ratio.

✒ Usage Instructions:
    In a lab's math HTML:  <div class="f" data-tex="..." data-live="kepler"></div>
    In the lab:  mathLive: { kepler: { params: ['G'], vars: L => [['a', '1.0 AU', 'tip']],
                 check: L => ({ what: 'Period', theory, sim, fmt }), plot: (c, L) => {} } }

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { canvasContext } from '../core/chart.js';
import { $, clamp, el } from '../core/util.js';
import { setParam } from './lifecycle.js';
import { controlFormat, rangeMap } from './panel.js';
import { announce } from './state.js';

let panels = [], shownLab = null;

/* One slider for a parameter the formula contains, a compact twin of the one on the Controls page. The symbol is
   given, or the label's last word when that is a symbol (Restitution e), or else the whole label. */
function param(lab, spec) {
  const [key, given] = Array.isArray(spec) ? spec : [spec, null];
  const c = lab.controls.find(k => k.key === key && k.type === 'range');
  if (!c || c.rebuild) return null;
  const { toS, fromS } = rangeMap(c), fmt = controlFormat(lab, c), id = `fl-${lab.id}-${key}`;
  const input = el('input', { type: 'range', id, min: c.log ? 0 : c.min, max: c.log ? 1000 : c.max, step: c.log ? 1 : (c.step || 'any'), 'aria-label': c.label });
  const out = el('output', { for: id });
  const last = (c.label.match(/\s([^\s]+)$/) || [, c.label])[1], sym = given || (last.length <= 3 ? last : c.label);
  const node = el('label', { class: 'fl-param', title: `${c.label}: the same setting as on the Controls page` }, el('span', { class: 'fl-sym', text: sym }), input, out);
  const show = v => { out.textContent = fmt(v); input.style.setProperty('--fill', `${(toS(v) - +input.min) / (+input.max - +input.min) * 100}%`); input.setAttribute('aria-valuetext', fmt(v)); };
  input.addEventListener('input', () => {
    let v = clamp(fromS(+input.value), c.min, c.max);
    if (c.log) v = Number(v.toPrecision(3)); else if (c.step) v = Math.round(v / c.step) * c.step;
    setParam(lab, key, v); show(v);
  });
  input.addEventListener('change', () => announce(`${c.label} ${fmt(lab.p[key])}`));
  return { node, sync() { if (document.activeElement === input) return; input.value = toS(lab.p[key]); show(lab.p[key]); } };
}

/* Build a panel under every formula the lab wires up; formulas without a binding stay as they are. */
export function buildLiveMath(lab, root = $('#math')) {
  panels = []; shownLab = lab;
  const spec = lab.mathLive || {};
  for (const f of root.querySelectorAll('[data-live]')) {
    const s = spec[f.dataset.live]; if (!s) continue;
    const vars = el('dl', { class: 'fl-vars' }), check = el('p', { class: 'fl-check', hidden: true });
    const params = (s.params || []).map(k => param(lab, k)).filter(Boolean);
    const plot = s.plot ? el('canvas', { class: 'fl-plot', role: 'img', 'aria-label': s.plotLabel || 'Plot from the running simulation' }) : null;
    const head = el('div', { class: 'fl-head' }, el('span', { class: 'fl-dot', 'aria-hidden': 'true' }), el('span', { text: 'Live' }), el('span', { class: 'fl-note', text: s.note || 'from the running simulation' }));
    const box = el('div', { class: 'f-live' }, head, vars);
    if (params.length) box.append(el('div', { class: 'fl-params' }, ...params.map(p => p.node)));
    box.append(check);
    if (plot) box.append(plot);
    f.after(box);
    panels.push({ s, vars, check, params, plot, rows: [] });
  }
  updateLiveMath(lab, true);
}

/* Panel rate, and only while the Math page shows: values, sliders, the check and the plot. */
export function updateLiveMath(lab, force = false) {
  if (!lab || lab !== shownLab || !panels.length) return;
  if (!force && $('#np-math').hidden) return;
  for (const P of panels) {
    const rows = P.s.vars ? P.s.vars(lab) || [] : [];
    if (P.rows.length !== rows.length) {
      P.rows = rows.map(() => { const dt = el('dt'), dd = el('dd'); return { dt, dd, root: el('div', { class: 'fl-var' }, dt, dd) }; });
      P.vars.replaceChildren(...P.rows.map(r => r.root));
    }
    rows.forEach(([sym, val, tip], i) => {
      const r = P.rows[i];
      if (r.dt.textContent !== sym) { r.dt.textContent = sym; r.dt.classList.toggle('word', [...sym].length > 3); }
      if (r.dd.textContent !== val) r.dd.textContent = val;
      r.root.title = tip || '';
    });
    P.vars.hidden = !rows.length;
    for (const p of P.params) p.sync();
    const ch = P.s.check ? P.s.check(lab) : null;
    P.check.hidden = !ch;
    if (ch) {
      let text = ch.text, state = ch.state || 'idle';
      if (text == null) {
        const f = ch.fmt || (v => v.toPrecision(3)), gap = Math.abs(ch.sim - ch.theory) / Math.max(Math.abs(ch.theory), 1e-12);
        if (Number.isFinite(ch.sim) && Number.isFinite(ch.theory)) {
          const tol = ch.tol || 0.05;
          state = gap <= tol ? 'ok' : gap <= tol * 3 ? 'warn' : 'crit';
          text = `${ch.what}: theory ${f(ch.theory)} · simulation ${f(ch.sim)} · ${(gap * 100).toFixed(gap < 0.1 ? 1 : 0)} % apart`;
        } else { text = ch.wait || `${ch.what}: waiting for the run to show it`; state = 'idle'; }
      }
      if (P.check.textContent !== text) P.check.textContent = text;
      P.check.dataset.state = state;
    }
    if (P.plot) { const c = canvasContext(P.plot); if (c) P.s.plot(c, lab); }
  }
}
