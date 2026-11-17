/*
✒ Metadata
    - Title: Story Narrator (digiSpace Edition - v2.18)
    - File Name: story.js
    - Relative Path: js/shell/story.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call to turn Insights from factoids into a narrator: the
      Story of a run, a timeline of the moments each lab's narrator finds,
      stamped with simulated time, newest first, repeats grouped, with Show me
      and fixes, an unread count and polite announcements.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The Insights pane's Story: each lab's narrate() hook watches the run a
    few times a second and adds moments, each a title and an explanation of
    what happened and why, with real numbers. This module keeps one story
    per lab, groups repeats, renders the timeline and the Now and Story
    views, and counts what has not been read.

✒ Key Features:
    - Moments stamped with simulated time and the lab's own time note,
      newest first, at most 60; a repeat folds into the newest entry of its
      kind when that is among the newest three or came within 5 s of
      simulated time, which lists the earlier ones ("3 more close passes").
    - A story per lab: it resets when the scene loads or restarts, survives
      pause and a switch to another lab, and drops what a rewind undid.
    - Show me (follow, select or frame what the moment is about) while that
      object still exists, and one-click fixes.
    - An unread count on the Insights tab and the Story view; important
      moments are announced politely, at most one every four seconds.
    - Now and Story views as a tablist with arrows, Home and End; the
      choice is remembered, though Insights opens on Now while a warning
      stands; new moments fade in unless motion is reduced; a moment's
      buttons keep keyboard focus when a repeat folds in.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { $, el, keepFocus, reduceMotion, store } from '../core/util.js';
import { STORY_ICON, msEl } from '../core/icons.js';
import { syncPanel } from './panel.js';
import { active, announce } from './state.js';

/* ---------- the story: one per lab ---------- */
export const STORY_CAP = 60;
// A repeat folds into the newest entry of its kind if that is among the newest three or within 5 s of simulated time;
// each entry remembers up to a dozen earlier ones.
const EARLIER_CAP = 12, GROUP_REACH = 3, FOLD_SPAN = 5, SAY_GAP = 4000;
const books = new Map();
let seq = 0, said = -Infinity;
function book(lab) {
  let b = books.get(lab.id);
  if (!b) books.set(lab.id, b = { list: [], keys: new Set(), unread: 0, lastT: NaN, fresh: true, ver: 0, broken: false });
  return b;
}

/* The narrator's handle, one object for every call: the time, whether the story just began (a lab rebuilds its watch
   then), add() for a moment and said() for one that should only ever be told once. A moment is { kind, title, body,
   tone ('event', 'key' or 'warn'), group (a plural noun, so repeats fold into one entry), key (told once per story),
   show ({ label, run, can }), fixes ([{ label, run }]), t (when it happened, if not now) }. */
let cur = null;
export const narrator = {
  t: 0, fresh: false, lab: null,
  add(m) { return cur ? addMoment(cur, m) : null; },
  said(key) { return !!cur && cur.keys.has(key); },
};
function addMoment(b, m) {
  if (m.key && b.keys.has(m.key)) return null;
  if (m.key) b.keys.add(m.key);
  const now = { t: m.t != null ? m.t : narrator.t, title: m.title, body: m.body, tone: m.tone || 'event', show: m.show || null, fixes: m.fixes || null, key: m.key || null };
  let e = null, i = 0;
  // The newest entry of the same kind takes the repeat if it is among the newest few, or came within FOLD_SPAN of
  // simulated time: a burst of mergers in a crowded disk reads as one entry, not a page of them.
  if (m.group) for (; i < b.list.length; i++) {
    const g = b.list[i];
    if (g.kind === m.kind && g.group === m.group) { if (i < GROUP_REACH || now.t - g.now.t < FOLD_SPAN) e = g; break; }
  }
  if (e) {
    e.earlier.unshift(e.now); if (e.earlier.length > EARLIER_CAP) e.earlier.pop();
    e.now = now; e.n++; e.rev++; e.born = performance.now();
    if (i) { b.list.splice(i, 1); b.list.unshift(e); }
  } else {
    e = { id: ++seq, kind: m.kind, group: m.group || '', now, earlier: [], n: 1, rev: 1, born: performance.now() };
    b.list.unshift(e);
    if (b.list.length > STORY_CAP) b.list.pop();
  }
  if (!viewing()) b.unread++;
  b.ver++;
  // Important moments are spoken, politely and never in a rush: the first of a group, or any warning.
  const t = performance.now();
  if (now.tone !== 'event' && (e.n === 1 || now.tone === 'warn') && t - said >= SAY_GAP && narrator.lab === active) { said = t; announce(`Story: ${now.title}`); }
  return e;
}
/* A rewind undid everything after t: those moments go, and grouped entries fall back to their earlier selves. */
function trim(b, t) {
  let changed = false;
  for (let i = b.list.length - 1; i >= 0; i--) {
    const e = b.list[i];
    while (e.now.t > t + 1e-9) {
      if (e.now.key) b.keys.delete(e.now.key);
      changed = true;
      if (!e.earlier.length) { b.list.splice(i, 1); break; }
      e.now = e.earlier.shift(); e.n--; e.rev++;
    }
  }
  if (!changed) return;
  b.list.sort((x, y) => y.now.t - x.now.t || y.id - x.id);
  b.unread = Math.min(b.unread, b.list.length); b.ver++;
}
/* The scene loaded or restarted: the story starts over. */
export function storyReset(lab) {
  const b = book(lab);
  b.list.length = 0; b.keys.clear(); b.unread = 0; b.lastT = NaN; b.fresh = true; b.broken = false; b.ver++;
}
/* A few times a second from the frame loop: the lab's narrator looks at the run if time moved (or the story just
   began), then the timeline catches up. A pause leaves the story as it is; a rewind trims it. */
export function tickStory(lab) {
  if (!lab) return;
  const b = book(lab);
  if (lab.t < b.lastT - 1e-9) { trim(b, lab.t); b.fresh = true; }
  if (lab.narrate && !b.broken && (b.fresh || lab.t !== b.lastT)) {
    cur = b; narrator.t = lab.t; narrator.fresh = b.fresh; narrator.lab = lab; b.fresh = false;
    // A narrator that fails stops for this story rather than stopping the frame loop; the error is still reported.
    try { lab.narrate(narrator); } catch (err) { b.broken = true; console.error(err); }
    cur = null; b.lastT = lab.t;
  }
  refresh(lab);
}
function refresh(lab) { const b = book(lab); if (viewing()) b.unread = 0; render(lab, b); }
/* The story as plain data, for the automation surface. */
export function storyOf(lab) {
  return book(lab).list.map(e => ({ kind: e.kind, title: e.now.title, body: e.now.body, t: e.now.t, tone: e.now.tone, n: e.n, group: e.group, show: !!e.now.show, earlier: e.earlier.map(p => p.title) }));
}
export const storyUnread = lab => book(lab).unread;

/* ---------- the Now and Story views ---------- */
const VIEWS = ['now', 'story'], VIEW_NAME = { now: 'Now', story: 'Story' };
// The view chosen last with the Now and Story tabs, which Insights opens on when no warning stands.
const chosen = () => { const v = store.get('insightsView', 'story'); return VIEWS.includes(v) ? v : 'story'; };
let shown = chosen();
const deck = $('#tile-deck'), listEl = $('#story'), emptyEl = $('#story-empty'), howEl = $('#story-how'), tabNew = $('#dt-story-n'), ivNew = $('#iv-story-n');
/* Whether the story is on screen to be read now: the Story view of the Insights pane, in a deck that shows. */
function viewing() { return shown === 'story' && deck.dataset.pane === 'insights' && document.visibilityState === 'visible' && deck.getClientRects().length > 0; }
/* remember: false shows a view without making it the one Insights opens on next time (the Now view a warning brings). */
export function showView(id, { focus = false, remember = true } = {}) {
  if (!VIEWS.includes(id)) return;
  shown = id; if (remember) store.set('insightsView', id);
  for (const v of VIEWS) {
    const t = $(`#iv-${v}`), on = v === id;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $(`#ip-${v}`).hidden = !on;
    if (on && focus) t.focus();
  }
  if (active) refresh(active);
}
/* Insights just opened: on Now while a warning stands, without taking that for the choice, else on the view chosen. */
export function openInsights(warned) { showView(warned ? 'now' : chosen(), { remember: false }); }

/* ---------- the timeline ---------- */
const nodes = new Map();
let shownLab = null, shownVer = -1, badgeK = -1, badgeN = -1;
const stamp = (lab, t) => `t = ${t.toFixed(2)} s${lab.timeNote ? lab.timeNote(t) : ''}`;
function makeNode() {
  const ico = msEl('info', 'moment-ico'), time = el('p', { class: 'moment-time' }), h = el('h4', { class: 'moment-title' }), body = el('p', { class: 'moment-body' });
  const acts = el('div', { class: 'moment-acts' }), sum = el('summary', { 'data-fk': 'more' }), ul = el('ul'), more = el('details', { class: 'moment-more' }, sum, ul);
  return { li: el('li', { class: 'moment' }, ico, el('div', { class: 'moment-main' }, el('div', { class: 'moment-head' }, h, time), body, acts, more)), ico, time, h, body, acts, sum, ul, more, rev: 0, show: null, fixes: [], showBtn: null, actsKey: null };
}
function applyFix(f) { f.run(); announce(`Applied: ${f.label}`); syncPanel(); }
function fill(n, e, lab) {
  const v = e.now;
  n.rev = e.rev; n.show = v.show; n.fixes = v.fixes || [];
  n.li.dataset.tone = v.tone; n.li.dataset.kind = e.kind;
  n.ico.textContent = STORY_ICON[e.kind] || 'info';
  n.time.textContent = stamp(lab, v.t);
  n.h.textContent = v.title;
  n.body.innerHTML = v.body;
  // The buttons act on whatever the entry shows now and are rebuilt only when their labels change, under stable keys,
  // so a repeat folding in keeps keyboard focus where it was.
  const key = JSON.stringify([v.show && v.show.label, ...n.fixes.map(f => f.label)]);
  if (key !== n.actsKey) {
    n.actsKey = key;
    n.showBtn = v.show ? el('button', { type: 'button', class: 'btn btn-fix btn-show', 'data-fk': 'show', onclick: () => n.show && n.show.run() }, msEl('my_location'), v.show.label) : null;
    const kids = n.fixes.map((f, i) => el('button', { type: 'button', class: 'btn btn-fix', 'data-fk': `fix-${i}`, text: f.label, onclick: () => n.fixes[i] && applyFix(n.fixes[i]) }));
    keepFocus(n.li, () => n.acts.replaceChildren(...(n.showBtn ? [n.showBtn] : []), ...kids), listEl);
  }
  n.more.hidden = e.n < 2;
  if (e.n > 1) {
    n.sum.textContent = e.n === 2 ? '1 more like this' : `${e.n - 1} more ${e.group}`;
    n.ul.replaceChildren(...e.earlier.map(p => el('li', { text: `${stamp(lab, p.t)} · ${p.title}` })));
  }
  // A moment that just arrived fades in; with reduced motion it simply appears.
  if (!reduceMotion && performance.now() - e.born < 1000) { n.li.classList.remove('fresh'); void n.li.offsetWidth; n.li.classList.add('fresh'); }
}
/* Show me stays only while what it shows still exists: a body merged away or a particle gone takes its button with it. */
function refreshShow() { for (const n of nodes.values()) if (n.showBtn) n.showBtn.hidden = !!(n.show.can && !n.show.can()); }
function render(lab, b) {
  badge(b);
  if (lab === shownLab && b.ver === shownVer) { refreshShow(); return; }
  shownLab = lab; shownVer = b.ver;
  const keep = new Set();
  let ref = listEl.firstChild;
  for (const e of b.list) {
    keep.add(e.id);
    let n = nodes.get(e.id);
    if (!n) { n = makeNode(); nodes.set(e.id, n); }
    if (n.rev !== e.rev) fill(n, e, lab);
    // Moving an entry blurs whatever inside it held focus; keepFocus gives it back.
    if (n.li === ref) ref = ref.nextSibling; else keepFocus(n.li, () => listEl.insertBefore(n.li, ref), document.activeElement);
  }
  for (const [id, n] of nodes) if (!keep.has(id)) { n.li.remove(); nodes.delete(id); }
  emptyEl.hidden = b.list.length > 0;
  if (!b.list.length) howEl.textContent = lab.storyHint || 'Moments appear here as the run unfolds, newest first, each with what happened and why.';
  refreshShow();
}
/* The unread count rides on the Insights tab, and the Story view shows it, or how many moments there are. */
function badge(b) {
  const k = b.unread;
  if (k === badgeK && b.list.length === badgeN) return;
  badgeK = k; badgeN = b.list.length;
  tabNew.hidden = !k; tabNew.firstChild.textContent = k > 99 ? '99+' : String(k);
  ivNew.hidden = !b.list.length; ivNew.textContent = k ? String(k) : String(b.list.length);
  if (k) ivNew.dataset.new = ''; else delete ivNew.dataset.new;
  ivNew.title = k ? `${k} new` : `${b.list.length} moment${b.list.length === 1 ? '' : 's'}`;
}

/* Wiring: run once, from diagnostics.init. */
export function initStory() {
  // Opening the Insights pane (by click, arrow keys or the alert chip) reads the story at once, not at the next tick.
  new MutationObserver(() => { if (active) refresh(active); }).observe(deck, { attributes: true, attributeFilter: ['data-pane'] });
  tabNew.append(document.createTextNode(''), el('span', { class: 'sr-only', text: ' new in the story' }));
  const tabs = VIEWS.map(v => $(`#iv-${v}`));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { showView(VIEWS[i]); announce(`${VIEW_NAME[VIEWS[i]]} view`); });
    t.addEventListener('keydown', e => {
      const n = tabs.length, j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (j >= 0) { e.preventDefault(); showView(VIEWS[j], { focus: true }); }
    });
  });
  showView(shown);
}
