/*
✒ Metadata
    - Title: Experiment Runner (digiSpace Edition - v2.1)
    - File Name: experiments.js
    - Relative Path: js/shell/experiments.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — A rebuild
      restarts a running check, paused or not, and keyboard focus survives
      re-rendering.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: guided experiments.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Renders the Experiments page, runs the active experiment's check four
    times a second and drives the stage banner.

✒ Key Features:
    - One experiment at a time; starting one loads its scene.
    - Banner is built once per run and updated in place, so its Stop button
      never moves under a click.
    - Finished experiments are remembered in this browser; switching labs
      ends the run.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { msEl } from '../core/icons.js';
import { $, el, keepFocus, store } from '../core/util.js';
import { applyPreset } from './lifecycle.js';
import { active, announce, state } from './state.js';

/* ---------- guided experiments: notebook cards, live check, stage banner ----------
   One experiment runs at a time. Starting it loads its scene; from then on
   its check runs four times a second against the lab's own state, and the
   banner on the stage shows the goal's progress. Finished experiments are
   remembered in this browser. Switching labs ends the run. */
const done = store.get('expDone', {});
export const run = { lab: null, exp: null, ctx: null, lastT: 0, p: 0, note: '', finished: false, hideTimer: 0 };
const key = (lab, exp) => `${lab.id}:${exp.id}`;
const isDone = (lab, exp) => !!done[key(lab, exp)];

export function renderExperiments(lab) {
  const host = $('#experiments'); if (!host) return;
  const list = lab.experiments || [];
  const n = list.filter(e => isDone(lab, e)).length;
  const count = $('#nt-experiments-count');
  if (count) { count.textContent = list.length ? `${n}/${list.length}` : ''; count.hidden = !list.length; }
  if (!list.length) { host.replaceChildren(el('p', { class: 'exp-goal', text: 'This lab has no guided experiments yet.' })); return; }
  const kids = [el('div', { class: 'exp-summary' }, msEl('science'), el('span', { text: `${n} of ${list.length} experiments finished in ${lab.name}. Start one to load its scene; the stage banner tracks your progress.` }))];
  for (const exp of list) {
    const live = run.lab === lab && run.exp === exp, fin = isDone(lab, exp);
    const status = live ? 'active' : fin ? 'done' : 'idle';
    const scene = lab.presets.find(p => p.id === exp.scene);
    const meter = el('div', { class: 'exp-meter', role: 'progressbar', 'aria-label': `${exp.title} progress`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round((live ? run.p : fin ? 1 : 0) * 100) }, el('span', { style: `width: ${((live ? run.p : fin ? 1 : 0) * 100).toFixed(1)}%` }));
    const btn = el('button', { type: 'button', class: 'btn' + (live ? '' : ' btn-primary'), 'data-fk': exp.id, text: live ? 'Stop' : fin ? 'Run again' : 'Start', onclick: () => (live ? stopExperiment(true) : startExperiment(lab, exp)) });
    kids.push(el('article', { class: 'experiment', 'data-status': status, 'data-exp': exp.id },
      el('div', { class: 'exp-head' }, msEl(fin && !live ? 'check_circle' : live ? 'play_circle' : 'radio_button_unchecked'), el('h4', { text: exp.title })),
      el('p', { class: 'exp-goal', text: exp.goal }),
      el('ol', { class: 'exp-steps' }, ...exp.steps.map(s => el('li', { text: s }))),
      el('div', { class: 'exp-row' }, btn, meter),
      el('span', { class: 'exp-note', text: live ? run.note : `Scene: ${scene ? scene.label : exp.scene}${fin ? ' · finished' : ''}` })));
  }
  keepFocus(host, () => host.replaceChildren(...kids));
}

export function startExperiment(lab, exp) {
  if (run.exp) stopExperiment(false);
  if (lab.presetId !== exp.scene || lab.t > 0) applyPreset(lab, exp.scene);
  Object.assign(run, { lab, exp, ctx: exp.init ? exp.init(lab) : {}, lastT: lab.t, p: 0, note: 'Starting…', finished: false });
  clearTimeout(run.hideTimer);
  if (!state.running) announce(`${exp.title} started. Press play to run it.`); else announce(`${exp.title} started`);
  renderExperiments(lab); renderBanner();
}

export function stopExperiment(say) {
  const lab = run.lab;
  Object.assign(run, { lab: null, exp: null, ctx: null, finished: false });
  clearTimeout(run.hideTimer);
  renderBanner();
  if (lab && lab === active) renderExperiments(lab);
  if (say) announce('Experiment stopped');
}

/* The scene was rebuilt: whatever the check remembered belongs to the old run. */
export function experimentReset(lab) {
  if (run.lab !== lab || !run.exp || run.finished) return;
  run.ctx = run.exp.init ? run.exp.init(lab) : {};
  run.lastT = lab.t;
}

/* Called from the frame loop at panel rate. */
export function tickExperiment() {
  const { lab, exp } = run;
  if (!exp || run.finished) return;
  if (lab !== active) { stopExperiment(false); return; }
  if (lab.t < run.lastT - 1e-9) { run.ctx = exp.init ? exp.init(lab) : {}; run.lastT = lab.t; }
  let res;
  if (lab.presetId !== exp.scene) {
    const sc = lab.presets.find(p => p.id === exp.scene);
    res = { p: run.p, note: `Paused: load the ${sc ? sc.label : exp.scene} scene to continue` };
  } else res = exp.check(lab, run.ctx, Math.max(0, lab.t - run.lastT));
  run.lastT = lab.t; run.p = res.p; run.note = res.note;
  if (res.p >= 1) {
    run.finished = true; done[key(lab, exp)] = true; store.set('expDone', done);
    announce(`Experiment complete: ${exp.title}`);
    run.hideTimer = setTimeout(() => { if (run.exp === exp) stopExperiment(false); }, 6000);
  }
  renderBanner(); updateCard();
}

function updateCard() {
  const card = $(`#experiments [data-exp="${run.exp.id}"]`); if (!card) return;
  const bar = card.querySelector('.exp-meter'), note = card.querySelector('.exp-note');
  bar.firstChild.style.width = `${(run.p * 100).toFixed(1)}%`; bar.setAttribute('aria-valuenow', Math.round(run.p * 100));
  if (note.textContent !== run.note) note.textContent = run.note;
  if (run.finished) renderExperiments(run.lab);
}

/* The banner is built once per run and then only updated, so its Stop
   button is never swapped out from under a click. */
let banner = null;
function renderBanner() {
  const b = $('#exp-banner'); if (!b) return;
  if (!run.exp) { b.hidden = true; b.replaceChildren(); banner = null; return; }
  if (!banner || banner.exp !== run.exp) {
    const icon = msEl('science'), title = el('b'), note = el('span'), fill = el('span'), close = el('button', { type: 'button', class: 'icon-btn exp-b-close', onclick: () => stopExperiment(!run.finished) }, msEl('close'));
    b.replaceChildren(icon, el('div', { class: 'exp-b-text' }, title, note), el('span', { class: 'bar', 'aria-hidden': 'true' }, fill), close);
    banner = { exp: run.exp, icon, title, note, fill, close };
  }
  b.hidden = false; b.dataset.done = String(run.finished);
  banner.icon.textContent = run.finished ? 'task_alt' : 'science';
  const t = run.finished ? `Done: ${run.exp.title}` : run.exp.title;
  if (banner.title.textContent !== t) banner.title.textContent = t;
  if (banner.note.textContent !== run.note) banner.note.textContent = run.note;
  banner.fill.style.width = `${(run.p * 100).toFixed(1)}%`;
  const lbl = run.finished ? 'Close' : 'Stop the experiment';
  if (banner.close.getAttribute('aria-label') !== lbl) { banner.close.setAttribute('aria-label', lbl); banner.close.title = lbl; }
}
