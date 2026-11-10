/*
✒ Metadata
    - Title: Head-Up Display (digiSpace Edition - v2.8)
    - File Name: headsup.js
    - Relative Path: js/shell/headsup.js
    - Artifact Type: javascript
    - Version: 2.8.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The callout
      also keeps off what the lab drew and asks to keep visible, its hudClear
      boxes, such as Gravity's names beside bodies in the Solar System.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created on
      Dennis's call for a cockpit-style head-up display, so the run's numbers
      sit on the stage instead of pulling the eye away from it: a readings
      tape, caution lights and a target box with a callout on the selected
      object, at an opacity he chooses.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Lays the lab's key figures over the stage like a pilot's head-up display.
    A tape down the left edge carries the readings the lab names in `hud`,
    each with its trend and a short trace; caution lights across the top
    carry the warnings and critical insights; and the selected object gets a
    target box that follows it in 2D and 3D, with a callout of its figures.
    Everything here repeats the Telemetry, Insights and Inspect panes, so the
    display is hidden from assistive technology and never takes a click.

✒ Key Features:
    - Readings tape: value, unit, trend arrow and trace from the same history
      Telemetry samples, coloured by the reading's own state.
    - Caution lights: the two most severe notices by title, and a count of
      the rest, moved clear of an experiment's banner.
    - Target box and callout, placed each frame from the lab's hudTarget(),
      clamped to the stage edge with a dashed box when the object is off it,
      and kept clear of the title, the rail and the tape.
    - A Head-up display menu in the top bar: on or off (Shift+H), opacity in
      four steps, and each part on or off, remembered per browser.

✒ Usage Instructions:
    In a lab:  hud: [['Total energy E', 'ENERGY E'], ...]   readout labels and their short HUD names
               hudTarget(three) { return { x, y, r } }       the inspected object in stage pixels, or null
    In the shell:  hudReadings(lab, rows) at panel rate, hudInspect(lab) at panel rate,
                   trackHud(lab) each frame after drawing, hudCautions(alerts) with the insights

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - No backdrop blur anywhere: the display sits over a canvas that redraws
      every frame, and a blur would cost that frame rate (see ARCHITECTURE.md).
---------
*/
import { view } from '../core/view.js';
import { $, clamp, el, store } from '../core/util.js';
import { is3D } from './camera.js';
import { readingSeries, setValue, sparkPath } from './instruments.js';
import { radioGroup } from './panel.js';
import { announce, stageEl } from './state.js';

/* Opacity steps in per cent, the parts that can be turned off, and the remembered choice. */
const LEVELS = [[40, 'Faint'], [60, 'Soft'], [80, 'Clear'], [100, 'Bright']];
const PARTS = [
  ['read', 'Readings', 'The lab\'s key figures down the left edge, with their trend'],
  ['target', 'Target', 'A box on the selected object, with its figures beside it'],
  ['caution', 'Cautions', 'Warnings and critical notices, near the top of the stage'],
];
const saved = store.get('hud', {});
const cfg = {
  on: saved.on !== false,
  alpha: LEVELS.some(l => l[0] === saved.alpha) ? saved.alpha : 80,
  read: saved.read !== false, target: saved.target !== false, caution: saved.caution !== false,
};
const save = () => store.set('hud', { ...cfg });

const root = $('#hu'), tape = $('#hu-tape'), lights = $('#hu-caution'), tgt = $('#hu-tgt'), lead = $('#hu-lead');
const card = $('#hu-card'), cardName = $('#hu-card-name'), cardKind = $('#hu-card-kind'), cardRows = $('#hu-card-rows');

/* ---------- readings tape ---------- */
let tapeLab = null, tapeRows = [];
function buildTape(lab) {
  tapeLab = lab;
  // A lab without its own list shows its primary readings under their full names.
  const spec = lab.hud || (Array.isArray(lab.primary) ? lab.primary.map(l => [l, l]) : []);
  tapeRows = spec.map(([label, short]) => {
    const dt = el('dt', { text: short }), trend = el('span', { class: 'hu-trend', 'data-dir': 'flat' }), dd = el('dd', { class: 'hu-val' });
    const trace = el('span', { class: 'hu-trace', html: '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path/></svg>' });
    return { label, dd, trend, path: trace.querySelector('path'), root: el('div', { class: 'hu-read' }, el('div', { class: 'hu-key' }, dt, trend), dd, trace), text: null, state: null, dir: null };
  });
  tape.replaceChildren(...tapeRows.map(r => r.root));
}
/* Up, down or level over the last couple of seconds, judged against the reading's recent range so a figure that
   barely wanders reads as level. */
function trendOf(s) {
  if (!s || s.n < 6) return 'flat';
  const at = k => s.v[s.idx(s.n - 1 - k)], span = Math.min(s.n, 64);
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < span; k++) { const v = at(k); if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  const now = at(0), then = at(Math.min(8, s.n - 1));
  if (!(hi > lo) || !Number.isFinite(now) || !Number.isFinite(then)) return 'flat';
  const d = (now - then) / (hi - lo);
  return d > 0.08 ? 'up' : d < -0.08 ? 'down' : 'flat';
}
/* Panel rate, with the rows Telemetry just read, so nothing is computed twice. */
export function hudReadings(lab, rows) {
  if (!cfg.on || !cfg.read || !lab) return;
  if (lab !== tapeLab) buildTape(lab);
  for (const r of tapeRows) {
    const row = rows.find(x => x[0] === r.label);
    r.root.hidden = !row; if (!row) continue;
    if (r.text !== row[1]) { r.text = row[1]; setValue(r.dd, row[1]); }
    const st = row[2] || 'none'; if (r.state !== st) { r.state = st; r.root.dataset.state = st; }
    const s = readingSeries(lab, r.label), dir = trendOf(s);
    if (r.dir !== dir) { r.dir = dir; r.trend.dataset.dir = dir; }
    r.path.setAttribute('d', sparkPath(s));
  }
}

/* ---------- caution lights ---------- */
let lastAlerts = [], lightKey = '';
export function hudCautions(alerts) {
  lastAlerts = alerts;
  // Two lights on a wide stage, one on a narrow one, and a count of the rest.
  const max = view.w > 720 ? 2 : 1, key = cfg.on && cfg.caution && alerts.length ? `${max}#${alerts.map(a => `${a.id}:${a.level}`).join('|')}` : '';
  if (key === lightKey) return;
  lightKey = key;
  if (!key) { lights.replaceChildren(); return; }
  const shown = alerts.slice(0, max).map(a => el('span', { class: 'hu-ann', 'data-level': a.level, text: a.title }));
  if (alerts.length > max) shown.push(el('span', { class: 'hu-ann hu-more', 'data-level': alerts[max].level, text: `+${alerts.length - max}` }));
  lights.replaceChildren(...shown);
}

/* ---------- target box and callout ---------- */
let info = null, cardKey = '', cardW = 0, cardH = 0, safe = null, blocks = [];
const T = { x: NaN, y: NaN, s: NaN, off: null, shown: false }, C = { x: NaN, y: NaN, shown: false }, L = { k: '' };
/* The figures the callout carries: the one the lab follows first, then the next two. */
function pickRows(inf) {
  const rows = inf.rows || [], first = rows.find(r => r[0] === inf.focus);
  return [...(first ? [first] : []), ...rows.filter(r => r !== first)].slice(0, 3);
}
/* Panel rate: what the callout says, its size, and the parts of the stage it must keep clear of. */
export function hudInspect(lab) {
  info = cfg.on && cfg.target && lab && lab.hudTarget && lab.inspect ? lab.inspect() : null;
  if (!info) { if (!card.hidden) card.hidden = true; return; }
  const rows = pickRows(info), name = info.short || info.kicker || '', kind = info.title || '';
  const key = `${name}|${kind}|${rows.map(r => `${r[0]}=${r[1]}`).join('|')}`;
  if (key !== cardKey) {
    cardKey = key;
    if (cardName.textContent !== name) cardName.textContent = name;
    if (cardKind.textContent !== kind) cardKind.textContent = kind;
    if (cardRows.childElementCount !== rows.length * 2) cardRows.replaceChildren(...rows.flatMap(() => [el('dt'), el('dd')]));
    rows.forEach((r, i) => { const dt = cardRows.children[i * 2], dd = cardRows.children[i * 2 + 1]; if (dt.textContent !== r[0]) dt.textContent = r[0]; if (dd.textContent !== r[1]) dd.textContent = r[1]; });
  }
  // A callout appearing is measured unseen and shown once the next frame has placed it, never where it last was.
  if (card.hidden) { card.style.visibility = 'hidden'; card.hidden = false; C.shown = false; }
  cardW = card.offsetWidth; cardH = card.offsetHeight;
  // Keep clear of the title and its chips, the rail (beside the stage when wide, along its foot when narrow) and the tape.
  const sr = stageEl.getBoundingClientRect(), top = $('.stage-top').getBoundingClientRect(), nav = $('#nav').getBoundingClientRect(), wide = nav.height > nav.width;
  safe = { l: 10, t: top.bottom - sr.top + 8, r: (wide ? nav.left - sr.left : sr.width) - 10, b: (wide ? sr.height - 44 : nav.top - sr.top) - 8 };
  // What the callout should not cover: the tape, the caution lights, and the scale bar and overview map.
  blocks = [];
  for (const e of [tape, lights, $('#nav-foot')]) {
    if (e.hidden || !e.childElementCount) continue;
    const b = e.getBoundingClientRect();
    if (b.width && b.height) blocks.push({ l: b.left - sr.left - 8, t: b.top - sr.top - 8, r: b.right - sr.left + 8, b: b.bottom - sr.top + 8 });
  }
}
function hideTarget() {
  if (T.shown) { tgt.hidden = true; T.shown = false; }
  if (L.k) { lead.hidden = true; L.k = ''; }
  if (info && !card.hidden) { card.hidden = true; C.shown = false; }
}
const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
/* The callout's corner. Each quarter around the box, then each side, is clamped into the free part of the stage and
   scored by what it would still cover: the object itself counts most, then the tape, lights and map, and anything
   the lab has drawn and asks to keep clear (hudClear: names beside bodies); the first quarter, up and to the right,
   wins a tie. */
function placeCard(x, y, half, clear) {
  const g = 22, w = cardW, h = cardH, S = safe, aim = { l: x - half - 4, t: y - half - 4, r: x + half + 4, b: y + half + 4 };
  const tries = [[x + half + g, y - half - g - h], [x + half + g, y + half + g], [x - half - g - w, y - half - g - h], [x - half - g - w, y + half + g],
    [x + half + g, y - h / 2], [x - half - g - w, y - h / 2], [x - w / 2, y - half - g - h], [x - w / 2, y + half + g]];
  let best = null, score = Infinity;
  for (const [tx, ty] of tries) {
    const cx = clamp(tx, S.l, Math.max(S.l, S.r - w)), cy = clamp(ty, S.t, Math.max(S.t, S.b - h)), box = { l: cx, t: cy, r: cx + w, b: cy + h };
    let k = 6 * overlap(box, aim) + Math.hypot(cx - tx, cy - ty);
    for (const b of blocks) k += overlap(box, b);
    if (clear) for (const b of clear) k += overlap(box, b);
    if (k < score - 1e-6) { score = k; best = [cx, cy]; }
  }
  return best;
}
/* Each frame, after the stage is drawn, so the box sits on the object as it is shown. */
export function trackHud(lab) {
  const t = cfg.on && cfg.target && lab && lab.hudTarget ? lab.hudTarget(is3D(lab)) : null;
  if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) { hideTarget(); return; }
  const W = view.w, H = view.h, s = clamp(2 * (t.r || 0) + 16, 26, 180), half = s / 2;
  // On the stage the box stays centred on the object, even at the edge; off it, the box waits whole inside the edge
  // nearest the object, dashed.
  const off = t.x < 0 || t.y < 0 || t.x > W || t.y > H, m = half + 2;
  const x = off ? clamp(t.x, m, Math.max(m, W - m)) : t.x, y = off ? clamp(t.y, m, Math.max(m, H - m)) : t.y;
  if (!T.shown) { tgt.hidden = false; T.shown = true; T.x = NaN; }
  if (Math.abs(x - T.x) > 0.25 || Math.abs(y - T.y) > 0.25 || s !== T.s) {
    if (s !== T.s) { tgt.style.width = tgt.style.height = `${s}px`; T.s = s; }
    tgt.style.transform = `translate(${(x - half).toFixed(1)}px, ${(y - half).toFixed(1)}px)`; T.x = x; T.y = y;
  }
  if (off !== T.off) { tgt.classList.toggle('off', off); T.off = off; }
  if (!info || card.hidden || !safe) { if (L.k) { lead.hidden = true; L.k = ''; } return; }
  const [cx, cy] = placeCard(x, y, half, lab.hudClear);
  if (!C.shown || Math.abs(cx - C.x) > 0.25 || Math.abs(cy - C.y) > 0.25) {
    card.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`; C.x = cx; C.y = cy;
    if (!C.shown) { card.style.visibility = ''; C.shown = true; }
  }
  // The leader runs from the box's corner nearest the callout to the callout's nearest edge.
  const mx = cx + cardW / 2, my = cy + cardH / 2, sx = x + Math.sign(mx - x) * half * 0.72, sy = y + Math.sign(my - y) * half * 0.72;
  const ex = clamp(sx, cx, cx + cardW), ey = clamp(sy, cy, cy + cardH), len = Math.hypot(ex - sx, ey - sy);
  const k = len > 6 ? `${sx.toFixed(1)},${sy.toFixed(1)},${ex.toFixed(1)},${ey.toFixed(1)}` : '';
  if (k === L.k) return;
  L.k = k; lead.hidden = !k;
  if (k) { lead.style.width = `${len.toFixed(1)}px`; lead.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) rotate(${Math.atan2(ey - sy, ex - sx).toFixed(4)}rad)`; }
}

/* ---------- settings: the top-bar menu, Shift+H and the automation surface ---------- */
let alphaUpdate = () => {};
const partSwitches = new Map();
const sheetOpen = () => !$('#hud-sheet').hidden;
function apply() {
  root.hidden = !cfg.on;
  root.style.setProperty('--hu-a', String(cfg.alpha / 100));
  tape.hidden = !cfg.read; lights.hidden = !cfg.caution;
  if (!cfg.read) { tapeLab = null; tape.replaceChildren(); }
  if (!cfg.target) { info = null; hideTarget(); card.hidden = true; }
  lightKey = null; hudCautions(lastAlerts);
  const pct = `${cfg.alpha}%`;
  $('#btn-hud-label').textContent = cfg.on ? `HUD ${pct}` : 'HUD off';
  $('#btn-hud').title = `Head-up display: ${cfg.on ? `on, ${pct}` : 'off'} (Shift+H)`;
  $('#hud-on').setAttribute('aria-checked', String(cfg.on));
  for (const [k, b] of partSwitches) { b.setAttribute('aria-checked', String(cfg[k])); b.disabled = !cfg.on; }
  alphaUpdate();
}
export const hudState = () => ({ ...cfg });
export function setHud(on, quiet) { cfg.on = !!on; save(); apply(); if (!quiet) announce(on ? 'Head-up display on' : 'Head-up display off'); }
export const toggleHud = () => setHud(!cfg.on);
/* For the automation surface and tests: any of on, alpha (a step in per cent), read, target, caution. */
export function configureHud(o) {
  for (const k of ['on', 'read', 'target', 'caution']) if (typeof o[k] === 'boolean') cfg[k] = o[k];
  if (LEVELS.some(l => l[0] === o.alpha)) cfg.alpha = o.alpha;
  save(); apply();
}
export function setHudSheet(on) {
  $('#hud-sheet').hidden = !on;
  $('#btn-hud').setAttribute('aria-expanded', String(on));
  if (on) $('#hud-on').focus();
}
export function closeHudSheet() { if (!sheetOpen()) return false; setHudSheet(false); $('#btn-hud').focus(); return true; }
/* The tape starts under the title and its chips, however they wrap. */
function placeTape() {
  const top = $('.stage-top');
  root.style.setProperty('--hu-top', `${Math.round(top.offsetTop + top.offsetHeight + 14)}px`);
}

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  const on = $('#hud-on');
  on.addEventListener('click', () => setHud(!cfg.on));
  const steps = LEVELS.map(([a, name]) => [a, `${name} ${a}%`]);
  const { group, update } = radioGroup('Opacity', steps, () => cfg.alpha, a => { cfg.alpha = a; save(); apply(); announce(`Head-up display at ${a}%`); }, 'hud-alpha');
  group.id = 'hud-alpha'; group.removeAttribute('aria-label'); group.setAttribute('aria-labelledby', 'hud-alpha-key');
  $('#hud-alpha').replaceWith(group); alphaUpdate = update;
  const parts = $('#hud-parts');
  for (const [k, label, note] of PARTS) {
    const b = el('button', { type: 'button', role: 'switch', class: 'switch', id: `hud-part-${k}` },
      el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })),
      el('span', { class: 'switch-text' }, el('span', { text: label }), el('span', { class: 'switch-note', text: note })));
    b.addEventListener('click', () => { cfg[k] = !cfg[k]; save(); apply(); announce(`${label} ${cfg[k] ? 'shown' : 'hidden'} on the head-up display`); });
    partSwitches.set(k, b); parts.append(b);
  }
  $('#btn-hud').addEventListener('click', () => setHudSheet(!sheetOpen()));
  $('#hud-close').addEventListener('click', closeHudSheet);
  document.addEventListener('pointerdown', e => {
    if (sheetOpen() && !$('#hud-sheet').contains(e.target) && !$('#btn-hud').contains(e.target)) setHudSheet(false);
  });
  new ResizeObserver(placeTape).observe($('.stage-top'));
  placeTape(); apply();
}
