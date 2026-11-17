/*
✒ Metadata
    - Title: Diagnostics (digiSpace Edition - v2.18)
    - File Name: diagnostics.js
    - Relative Path: js/shell/diagnostics.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for Insights that narrate the run: the insights fill the
      pane's Now view, which counts them in the colour of the worst; the HUD's
      alert, or opening the pane while a warning stands, shows Now, and
      init() wires the Story's views.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      warnings and critical notices also light the head-up display's caution
      lights.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Insights
      render in the deck's Insights pane; the HUD alert opens that pane, and
      the summary on its tab is short: a count, or how many need checking.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Evaluates each lab's diagnose() and the frame budget, and shows insights
    with one-click fixes in the Insights pane's Now view and a HUD alert
    chip. The pane's other view, the Story, is js/shell/story.js.

✒ Key Features:
    - Severity levels with glyphs; insights appear and leave without
      flicker.
    - Frame-time strip and solver, drawing and real-time numbers.
    - The HUD alert opens the Insights pane on its Now view, as opening the
      pane does while a warning or critical notice stands.

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
import { restart } from './lifecycle.js';
import { cheaperTier, in3D, pickTier } from './mode.js';

import { syncPanel } from './panel.js';
import { BUDGET_MS, active, announce, perf, state, stickies } from './state.js';
import { setSpeed } from './transport.js';
import { showPane } from './deck.js';
import { showTopAlert } from './instruments.js';
import { ICON } from '../core/icons.js';
import { hudCautions } from './headsup.js';
import { initStory, openInsights, showView } from './story.js';

/* ---------- diagnostics ---------- */
export const insightsEl = $('#insights'), insightCards = new Map();
export const LEVEL_RANK = { crit: 0, warn: 1, info: 2 }, LEVEL_TAG = { crit: 'Critical', warn: 'Warning', info: 'Insight' };
export let lastAlertIds = new Set();
// Whether a warning or critical notice stands, as the Insights tab's summary says ("2 critical", "3 to check").
let alerting = false;
export function sticky(ins, seconds = 10) { stickies.push({ ...ins, until: performance.now() + seconds * 1000, lab: active && active.id }); }
export function globalInsights() {
  const out = [];
  if (state.running && perf.slow > 1) {
    const fixes = [];
    if (state.speed > 1) fixes.push({ label: 'Speed 1×', run() { setSpeed(1); } });
    if (active.perfFixes) fixes.push(...active.perfFixes());
    out.push({ id: 'perf-slow', level: 'warn', title: 'Running slower than requested', body: `The solver needs about <b>${perf.sim.toFixed(1)} ms</b> per frame, more than its ${BUDGET_MS} ms budget, so this lab is simulating <b>${perf.rate.toFixed(2)}×</b> real time instead of ${state.speed.toFixed(2)}×. The budget drops the backlog so the page stays responsive.`, fixes });
  }
  // Drawing is the bottleneck only when it is: slow in itself, costlier than the solver, and most of what a frame takes.
  // A frame stretched by something else (a busy machine, a throttled page) is not the display's doing.
  if (perf.fps < 40 && perf.draw > 12 && perf.draw > perf.sim && perf.draw * perf.fps > 500) out.push({ id: 'perf-draw', level: 'info', title: 'Drawing is the bottleneck', body: `Each frame spends <b>${perf.draw.toFixed(1)} ms</b> drawing, so the display rather than the physics limits the frame rate. Large windows and dense scenes cost the most.`, fixes: active.drawFixes ? active.drawFixes() : [] });
  if (in3D(active) && perf.fps < 30 && cheaperTier()) {
    const next = cheaperTier();
    out.push({ id: 'gfx-slow', level: 'info', title: 'This graphics tier is heavy here', body: `The 3D view is running at about <b>${Math.round(perf.fps)} fps</b>. A cheaper tier, or Auto in the Graphics section of Settings, keeps it smooth.`, fixes: [{ label: `Use ${next[0].toUpperCase()}${next.slice(1)}`, run() { pickTier(next); } }, { label: 'Use Auto', run() { pickTier('auto'); } }] });
  }
  const now = performance.now();
  for (let i = stickies.length - 1; i >= 0; i--) if (stickies[i].until < now) stickies.splice(i, 1);
  for (const s of stickies) if (s.lab === active.id) out.push(s);
  return out;
}
export function evaluateDiagnostics() {
  if (!active) return;
  if (active.watchDraw) active.watchDraw(perf);
  if (active.sane && !active.sane()) {
    restart(active);
    sticky({ id: 'nan', level: 'crit', title: 'The simulation blew up and was restarted', body: 'Some values became infinite or undefined, so the scene was rebuilt with the current settings. Pull the most extreme parameter back toward its notch to keep it stable.' }, 12);
  }
  let list = [...globalInsights(), ...(active.diagnose ? active.diagnose() : [])];
  list.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  renderInsights(list);
  const alerts = list.filter(i => i.level !== 'info'), worst = alerts.length ? alerts[0].level : null;
  alerting = alerts.length > 0;
  const btn = $('#hud-alert');
  btn.hidden = !alerts.length;
  if (alerts.length) { btn.textContent = `${alerts.length} ${alerts.length === 1 ? 'notice' : 'notices'}`; btn.dataset.level = worst; btn.setAttribute('aria-label', `${alerts.length} diagnostic ${alerts.length === 1 ? 'notice' : 'notices'}; show diagnostics`); }
  showTopAlert(alerts[0], applyFix);
  hudCautions(alerts);
  tabMark(worst, worst === 'crit' ? alerts.filter(a => a.level === 'crit').length : alerts.length);
  // The Now view counts what it holds, in the colour of the worst.
  const nowN = $('#iv-now-n'); nowN.textContent = list.length ? String(list.length) : ''; nowN.dataset.level = worst || 'ok';
  const ids = new Set(alerts.map(a => a.id));
  for (const a of alerts) if (!lastAlertIds.has(a.id)) { announce(`${LEVEL_TAG[a.level]}: ${a.title}`); break; }
  lastAlertIds = ids;
}
/* The Insights tab carries a mark only while a warning or critical notice stands: a dot in its colour and a few words.
   With none, it carries nothing, so a mark on a tab always means there is something to check. Insights that are only
   informative are counted inside the pane, on the Now view, and unseen moments on the Story's own count (story.js). */
let markKey = '';
function tabMark(worst, n) {
  const key = worst ? `${worst}${n}` : '';
  if (key === markKey) return;
  markKey = key;
  const sum = $('#diag-sum'), tab = $('#dt-insights');
  sum.hidden = !worst;
  if (!worst) { delete sum.dataset.level; sum.textContent = ''; sum.removeAttribute('title'); tab.removeAttribute('aria-description'); return; }
  sum.dataset.level = worst;
  sum.textContent = worst === 'crit' ? `${n} critical` : `${n} to check`;
  sum.title = worst === 'crit' ? 'Needs attention: see Insights, Now' : 'Worth checking: see Insights, Now';
  tab.setAttribute('aria-description', sum.title);
}
let quietEl = null;
function applyFix(ins, i) {
  const fx = ins.fixes && ins.fixes[i]; if (!fx) return;
  fx.run(); announce(`Applied: ${fx.label}`); syncPanel(); evaluateDiagnostics();
}
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
      (ins.fixes || []).forEach((f, i) => card.fixes.append(el('button', { type: 'button', class: 'btn btn-fix', text: f.label, onclick: () => applyFix(card.ins, i) })));
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
  // The alert chip is about the run's state now, so it opens the Now view.
  $('#hud-alert').addEventListener('click', () => { showView('now', { remember: false }); showPane('insights', { reveal: true }); });
  // So does opening Insights by its tab, the keys or any other way while a warning stands: Now is where it is. That is
  // not remembered as the view to open on, so with nothing to check Insights opens on the Story (or the view chosen).
  const deck = $('#tile-deck');
  new MutationObserver(recs => {
    if (deck.dataset.pane === 'insights' && recs.some(r => r.oldValue !== 'insights')) openInsights(alerting);
  }).observe(deck, { attributes: true, attributeFilter: ['data-pane'], attributeOldValue: true });
  initStory();
}
