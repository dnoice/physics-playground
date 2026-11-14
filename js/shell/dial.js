/*
✒ Metadata
    - Title: Thumbwheel Dial (digiSpace Edition - v2.11)
    - File Name: dial.js
    - Relative Path: js/shell/dial.js
    - Artifact Type: javascript
    - Version: 2.11.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.11.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call to calm the dials: text() shows the value as its number
      with its unit set back, the ridges part round it at its measured width
      (re-measured as a wheel first shows or resizes), and the focus ring is
      for the keyboard, not after a pointer took the wheel.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call to replace the long horizontal sliders with something
      more compact and refined: a ridged thumbwheel with the value set into
      it, used by the Controls page and the Math page alike.
    Earlier entries: see CHANGELOG.md

✒ Description:
    A compact control for a number: a ridged wheel seen edge-on, with the
    value set into its middle, a step chevron at each end, and a hairline
    along its foot that shows where the value sits in its range and where
    the scene put it. A native range input underneath stays the single
    source of truth, so the keyboard, screen readers and every listener work
    as they do for a slider; the wheel only drives it.

✒ Key Features:
    - Drag the wheel sideways to scrub; the ridges move with the pointer, and
      Shift scrubs ten times finer.
    - Tap either side of the value to nudge it one notch that way; hold a
      chevron to repeat, faster after a moment.
    - The mouse wheel turns it once it has focus, so scrolling past a dial
      never changes a setting by accident.
    - Keyboard: arrows, Page Up and Down, Home and End, as on any slider.
    - A drag, nudge or wheel burst ends with one change event, and only when
      the value moved, so controls that restart the run restart it once.
    - The value reads as its number with the unit set back, and the ridges
      part around it at its measured width, so no box is drawn round it.
    - The focus ring is for the keyboard: a wheel the pointer took shows none
      until a key is pressed in it.

✒ Usage Instructions:
    const W = makeWheel({ id, min, max, step, editable: true });
    W.input.addEventListener('input', ...);   // the value moved
    W.input.addEventListener('change', ...);  // a gesture finished
    W.text('9.81 m/s²');                      // the value as read
    W.paint(sceneS);                          // after setting W.input.value

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { ms } from '../core/icons.js';
import { clamp, el } from '../core/util.js';

/* Pixels of drag that sweep the whole range, and of wheel scroll per notch. */
const TRAVEL = 320, WHEEL_NOTCH = 80;

/* A value's number, with a sign or field mark before it (−, ±, ⊗), and what follows it: its unit, or a suffix
   such as × or %. A value that does not start with a number stays whole. */
const SPLIT = /^([⊗⊙±−+-]?\s?\d[\d.,]*(?:e[+−-]?\d+)?)(\s?)(\S.*)$/u;

/* One observer for every wheel: when a wheel first shows, or changes width, its ridges part again around the value. */
const parting = new WeakMap();
const sized = typeof ResizeObserver === 'function' ? new ResizeObserver(list => { for (const e of list) parting.get(e.target)?.(); }) : null;

/* A wheel for a range input with these bounds, in the input's own units (a log control passes 0 to 1000). With
   editable, the value is a button the caller turns into a text box; otherwise it is a read-only output. */
export function makeWheel({ id, min, max, step = 'any', label = null, describedby = null, valLabel = null, editable = true }) {
  const input = el('input', { type: 'range', id, class: 'dial-input', min, max, step, 'aria-label': label, 'aria-describedby': describedby });
  const val = editable
    ? el('button', { type: 'button', class: 'ctl-val dial-val', id: `${id}-out`, 'aria-label': valLabel })
    : el('output', { class: 'dial-val', for: id });
  const chevron = dir => el('button', { type: 'button', class: 'dial-step', tabindex: '-1', 'aria-hidden': 'true', 'data-dir': dir, html: dir < 0 ? ms('chevron_left') : ms('chevron_right') });
  const wheel = el('div', { class: 'dial-wheel', id: `${id}-wheel` }, input, chevron(-1), el('span', { class: 'dial-ridges', 'aria-hidden': 'true' }), val, chevron(1), el('span', { class: 'dial-bar', 'aria-hidden': 'true' }));

  // The ridges fall away for the value's half-width either side of the middle, measured once the wheel is laid out.
  const part = () => {
    const w = val.isConnected ? val.offsetWidth : 0;
    if (w && wheel.clientWidth) wheel.style.setProperty('--gap', `${(w / 2).toFixed(1)}px`);
  };
  parting.set(wheel, part); sized?.observe(wheel);

  const lo = () => +input.min, span = () => +input.max - +input.min;
  const fine = () => (input.step === 'any' || !+input.step ? span() / 1000 : +input.step);
  const notch = () => Math.max(fine(), span() / 100);
  let gesture = null, drag = null, repeat = null, wheelTimer = 0, wheelAcc = 0, swallowClick = false;
  const begin = () => { if (!gesture) gesture = { s0: +input.value }; };
  const setS = s => {
    const before = input.value;
    input.value = String(clamp(s, lo(), lo() + span()));
    if (input.value !== before) input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const nudge = (dir, small) => setS(+input.value + dir * (small ? fine() : notch()));
  const finish = () => {
    const g = gesture; gesture = null;
    if (g && +input.value !== g.s0) input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const stopRepeat = () => { if (repeat == null) return; clearTimeout(repeat); repeat = null; finish(); };

  // The focus ring is for the keyboard: a wheel the pointer took shows none until a key is pressed in it.
  wheel.addEventListener('keydown', () => wheel.classList.remove('by-pointer'));
  wheel.addEventListener('focusout', e => { if (!wheel.contains(e.relatedTarget)) wheel.classList.remove('by-pointer'); });
  wheel.addEventListener('pointerdown', e => {
    swallowClick = false; wheel.classList.add('by-pointer');
    if (input.disabled || e.button !== 0) return;
    const step = e.target.closest('.dial-step'), onVal = !!e.target.closest('.dial-val') && editable;
    // A press anywhere but the editable value keeps focus on the input, so the wheel and arrow keys follow on.
    if (!onVal) { e.preventDefault(); input.focus({ preventScroll: true }); }
    if (step) {
      const dir = +step.dataset.dir;
      stopRepeat(); begin(); nudge(dir, e.shiftKey);
      let n = 0;
      repeat = setTimeout(function tick() { nudge(dir * (++n > 12 ? 4 : 1), e.shiftKey); repeat = setTimeout(tick, 70); }, 380);
      return;
    }
    drag = { id: e.pointerId, x0: e.clientX, s0: +input.value, moved: false, onVal };
  });
  wheel.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 4) return;
      // Capture only once it is a drag, so a plain click on the value still reaches the value.
      drag.moved = true; begin(); wheel.setPointerCapture(e.pointerId); wheel.classList.add('is-turning');
    }
    setS(drag.s0 + dx * span() / TRAVEL * (e.shiftKey ? 0.1 : 1));
  });
  const release = e => {
    stopRepeat();
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; wheel.classList.remove('is-turning');
    if (d.moved) { swallowClick = true; finish(); return; }
    // A tap on the ridges nudges one notch toward that side.
    if (e.type === 'pointerup' && !d.onVal) {
      const r = wheel.getBoundingClientRect();
      begin(); nudge(e.clientX < r.left + r.width / 2 ? -1 : 1, e.shiftKey); finish();
    }
  };
  wheel.addEventListener('pointerup', release);
  wheel.addEventListener('pointercancel', release);
  wheel.addEventListener('lostpointercapture', release);
  wheel.addEventListener('pointerleave', () => stopRepeat());
  // A drag that ends over the value must not open its editor; this runs before the caller's own click handler.
  val.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); } });
  wheel.addEventListener('wheel', e => {
    if (input.disabled || !wheel.contains(document.activeElement)) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
    wheelAcc += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY) * scale;
    begin();
    while (Math.abs(wheelAcc) >= WHEEL_NOTCH) { const dir = Math.sign(wheelAcc); nudge(dir, e.shiftKey); wheelAcc -= dir * WHEEL_NOTCH; }
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheelAcc = 0; finish(); }, 280);
  }, { passive: false });

  /* Show the value as read: the number, then its unit or suffix in a quieter tone, the space between kept as text. */
  function text(s) {
    const m = SPLIT.exec(s);
    if (m) val.replaceChildren(el('span', { class: 'dial-num', text: m[1] }), m[2], el('span', { class: 'dial-unit', text: m[3] }));
    else val.textContent = s;
    part();
  }

  /* Draw the input's current value: the ridges' turn, the range hairline and, when given, the scene's mark. */
  function paint(sceneS = null) {
    const f = span() ? clamp((+input.value - lo()) / span(), 0, 1) : 0;
    wheel.style.setProperty('--fill', `${(f * 100).toFixed(2)}%`);
    wheel.style.setProperty('--turn', `${(f * TRAVEL).toFixed(1)}px`);
    wheel.classList.toggle('no-notch', sceneS == null);
    if (sceneS != null) wheel.style.setProperty('--notch', clamp((sceneS - lo()) / span(), 0, 1).toFixed(4));
  }
  return { wheel, input, val, text, paint };
}
