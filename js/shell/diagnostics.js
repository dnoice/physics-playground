/*
✒ Metadata
    - Title: Diagnostics (digiSpace Edition - v2.0)
    - File Name: diagnostics.js
    - Relative Path: js/shell/diagnostics.js
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
    Evaluates each lab's diagnose() and the frame budget, and shows insights
    with one-click fixes in the Diagnostics tile and a HUD alert chip.

✒ Key Features:
    - Severity levels with glyphs; insights appear and leave without
      flicker.
    - Frame-time strip and solver, drawing and real-time numbers.
    - The HUD alert reveals and flashes the Diagnostics tile.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { canvasContext } from '../core/chart.js';

import { THEME } from '../core/color.js';
import { $, el } from '../core/util.js';
import { fluid } from '../labs/fluid.js';
import { rebuild, setParam } from './lifecycle.js';

import { syncPanel } from './panel.js';
import { BUDGET_MS, active, announce, perf, state, stickies } from './state.js';
import { setSpeed } from './transport.js';
import { revealTile } from './layout.js';
import { ICON } from '../core/icons.js';

/* ---------- diagnostics ---------- */
export const insightsEl = $('#insights'), insightCards = new Map();
export const LEVEL_RANK = { crit: 0, warn: 1, info: 2 }, LEVEL_TAG = { crit: 'Critical', warn: 'Warning', info: 'Insight' };
export let lastAlertIds = new Set();
export function sticky(ins, seconds = 10) { stickies.push({ ...ins, until: performance.now() + seconds * 1000, lab: active && active.id }); }
export function globalInsights() {
  const out = [];
  if (state.running && perf.slow > 1) {
    const fixes = [];
    if (state.speed > 1) fixes.push({ label: 'Speed 1×', run() { setSpeed(1); } });
    if (active.perfFixes) fixes.push(...active.perfFixes());
    out.push({ id: 'perf-slow', level: 'warn', title: 'Running slower than requested', body: `The solver needs about <b>${perf.sim.toFixed(1)} ms</b> per frame, more than its ${BUDGET_MS} ms budget, so this lab is simulating <b>${perf.rate.toFixed(2)}×</b> real time instead of ${state.speed.toFixed(2)}×. The budget drops the backlog so the page stays responsive.`, fixes });
  }
  if (perf.fps < 40 && perf.draw > 12) out.push({ id: 'perf-draw', level: 'info', title: 'Drawing is the bottleneck', body: `Each frame spends <b>${perf.draw.toFixed(1)} ms</b> drawing, so the display rather than the physics limits the frame rate. Large windows and dense scenes cost the most.`, fixes: active.drawFixes ? active.drawFixes() : [] });
  const now = performance.now();
  for (let i = stickies.length - 1; i >= 0; i--) if (stickies[i].until < now) stickies.splice(i, 1);
  for (const s of stickies) if (s.lab === active.id) out.push(s);
  return out;
}
export let slowSurface = 0;
export function evaluateDiagnostics() {
  if (!active) return;
  if (active === fluid && fluid.p.surface && fluid.renderer === 'gpu' && perf.draw > 40 && perf.fps < 24) {
    if ((slowSurface += 0.5) >= 4) {
      slowSurface = 0;
      setParam(fluid, 'surface', false);
      sticky({ id: 'f-gpu-slow', level: 'info', title: 'Switched to simple discs', body: `The liquid surface took about ${perf.draw.toFixed(0)} ms per frame on this device, so the tank now draws plain discs. Turn on Liquid surface rendering under Parameters to try it again.` }, 14);
    }
  } else slowSurface = 0;
  if (active.sane && !active.sane()) {
    rebuild(active);
    sticky({ id: 'nan', level: 'crit', title: 'The simulation blew up and was restarted', body: 'Some values became infinite or undefined, so the scene was rebuilt with the current settings. Pull the most extreme parameter back toward its notch to keep it stable.' }, 12);
  }
  let list = [...globalInsights(), ...(active.diagnose ? active.diagnose() : [])];
  list.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  renderInsights(list);
  const alerts = list.filter(i => i.level !== 'info'), worst = alerts.length ? alerts[0].level : null;
  const btn = $('#hud-alert'), sum = $('#diag-sum');
  btn.hidden = !alerts.length;
  if (alerts.length) { btn.textContent = `${alerts.length} ${alerts.length === 1 ? 'notice' : 'notices'}`; btn.dataset.level = worst; btn.setAttribute('aria-label', `${alerts.length} diagnostic ${alerts.length === 1 ? 'notice' : 'notices'}; show diagnostics`); }
  sum.dataset.level = worst || 'ok';
  sum.textContent = worst === 'crit' ? 'Needs attention' : worst === 'warn' ? 'Check settings' : list.length ? `Stable · ${list.length} insight${list.length === 1 ? '' : 's'}` : 'Stable';
  const ids = new Set(alerts.map(a => a.id));
  for (const a of alerts) if (!lastAlertIds.has(a.id)) { announce(`${LEVEL_TAG[a.level]}: ${a.title}`); break; }
  lastAlertIds = ids;
}
let quietEl = null;
export function renderInsights(list) {
  const seen = new Set();
  for (const ins of list) {
    seen.add(ins.id);
    let card = insightCards.get(ins.id);
    if (!card) {
      const h4 = el('h4'), p = el('p'), fixes = el('div', { class: 'insight-fixes' });
      card = { el: el('article', { class: 'insight' }, h4, p, fixes), h4, p, fixes, key: '' };
      insightCards.set(ins.id, card);
    }
    card.ins = ins;
    card.el.dataset.level = ins.level;
    const head = `<span class="ms" aria-hidden="true">${ICON[ins.level]}</span><span class="tag">${LEVEL_TAG[ins.level]}</span>${ins.title}`;
    if (card.h4.innerHTML !== head) card.h4.innerHTML = head;
    if (card.p.innerHTML !== ins.body) card.p.innerHTML = ins.body;
    const fk = (ins.fixes || []).map(f => f.label).join('|');
    if (card.key !== fk) {
      card.key = fk; card.fixes.replaceChildren();
      (ins.fixes || []).forEach((f, i) => card.fixes.append(el('button', { type: 'button', class: 'btn btn-fix', text: f.label, onclick: () => {
        const fx = card.ins.fixes && card.ins.fixes[i]; if (!fx) return;
        fx.run(); announce(`Applied: ${fx.label}`); syncPanel(); evaluateDiagnostics();
      } })));
    }
  }
  for (const [id, c] of insightCards) if (!seen.has(id)) { c.el.remove(); insightCards.delete(id); }
  const want = list.map(i => insightCards.get(i.id).el), have = [...insightsEl.children];
  if (!want.length) want.push(quietEl || (quietEl = el('p', { class: 'diag-ok', html: '<span class="ms" aria-hidden="true">check_circle</span>No warnings. Extreme settings show up here with an explanation and a fix.' })));
  if (want.length !== have.length || want.some((e, i) => e !== have[i])) insightsEl.replaceChildren(...want);
}
export function drawPerf() {
  const c = canvasContext($('#perf-spark')); if (!c) return;
  const { g, w, h } = c, N = perf.hist.length, bw = w / N, scale = h / 25;
  g.fillStyle = THEME.rule; g.globalAlpha = 0.9;
  const by = h - 16.7 * scale;
  g.fillRect(0, Math.round(by), w, 1);
  g.globalAlpha = 1;
  for (let i = 0; i < N; i++) {
    const k = (perf.hi + i) % N, tot = perf.hist[k], sim = perf.hsim[k];
    const ht = Math.min(h, tot * scale), hs = Math.min(h, sim * scale);
    g.fillStyle = tot > 16.7 ? THEME.crit : THEME.cyan; g.globalAlpha = 0.35;
    g.fillRect(i * bw, h - ht, Math.max(1, bw - 0.5), ht);
    g.globalAlpha = 0.85; g.fillStyle = tot > 16.7 ? THEME.crit : THEME.amber;
    g.fillRect(i * bw, h - hs, Math.max(1, bw - 0.5), hs);
  }
  g.globalAlpha = 1;
  g.font = `400 9px ${THEME.mono}`; g.fillStyle = THEME.muted; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.fillText('16.7 ms', w - 3, by - 1);
}
export function updatePerfNums() {
  $('#perf-sim').textContent = `${perf.sim.toFixed(1)} ms`;
  $('#perf-draw').textContent = `${perf.draw.toFixed(1)} ms`;
  $('#perf-steps').textContent = perf.steps.toFixed(perf.steps < 10 ? 1 : 0);
  const rate = state.running && !active.holding ? perf.rate : 0, slow = state.running && perf.slow > 1;
  const rt = $('#perf-rate'); rt.textContent = state.running ? `${rate.toFixed(2)}×` : 'paused';
  if (slow) rt.setAttribute('data-state', 'warn'); else rt.removeAttribute('data-state');
  const hr = $('#hud-rate'); hr.textContent = state.running ? `${rate.toFixed(2)}× real time` : 'paused';
  hr.dataset.state = slow ? 'warn' : 'ok';
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  $('#hud-alert').addEventListener('click', () => {
    const d = $('#diag');
    revealTile(d);
    d.focus({ preventScroll: true });
  });
}
