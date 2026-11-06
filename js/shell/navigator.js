/*
✒ Metadata
    - Title: Stage Gizmo (digiSpace Edition - v2.1)
    - File Name: navigator.js
    - Relative Path: js/shell/navigator.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — The axis
      ball compares against what it wrote, so it no longer reparses every
      frame.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Split out
      of the v1.3 single-file playground when Dennis asked for a proper
      separation of concerns so the stack can keep growing; behaviour
      unchanged.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The view gizmo on the stage: zoom buttons and readout, pan mode, frame,
    lab extras, the 3D axis ball, the overview map and the scale bar.

✒ Key Features:
    - Axis ball for 3D views: drag to orbit, click an axis to look along it.
    - Overview map with a draggable view box when zoomed in.
    - Scale bar in the lab's own units.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { canvasContext } from '../core/chart.js';
import { THEME } from '../core/color.js';
import { icon } from '../core/icons.js';
import { v3dot } from '../core/math3d.js';
import { $, el } from '../core/util.js';
import { view } from '../core/view.js';
import { camOf, is3D, navActual, navCenter, navFrame, navPan, navZoomBy, toWorld, worldOf, zoomPct } from './camera.js';
import { updateDock } from './dock.js';
import { ptr, refreshCursor } from './stage.js';
import { active, announce } from './state.js';

/* ---------- view gizmo, scale bar and overview ---------- */
export const navZoomEl = $('#nav-zoom'), navPanEl = $('#nav-pan'), navExtraEl = $('#nav-extra'), orbitEl = $('#nav-orbit');
export const miniEl = $('#minimap'), miniCanvas = $('#minimap-canvas'), scaleEl = $('#scalebar');
export const mini = { k: 1, ox: 0, oy: 0 };
export let navExtras = [], orbitAxes = [];
let orbitHtml = '';
/* A button that can be dragged (onDrag gets screen deltas) or clicked (pointer or keyboard). */
export function dragButton(btn, onDrag, onClick) {
  let st = null;
  btn.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    st = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    try { btn.setPointerCapture(e.pointerId); } catch (_) { /* capture is best-effort */ }
  });
  btn.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) < 4) return;
    st.moved = true; st.x = e.clientX; st.y = e.clientY;
    onDrag(dx, dy); updateNav();
  });
  const end = e => { if (st && e.pointerId === st.id) { btn.dataset.dragged = st.moved ? '1' : ''; st = null; } };
  btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
  btn.addEventListener('click', e => { if (btn.dataset.dragged === '1') { btn.dataset.dragged = ''; return; } onClick(e); updateNav(); });
}
export function setPanMode(on) {
  ptr.panMode = on; updateNav(); updateDock(); refreshCursor();
  announce(on ? 'Pan mode on: drag the stage to move the view' : 'Pan mode off');
}
export function buildNav(lab) {
  navExtraEl.replaceChildren();
  navExtras = (lab.navExtras || []).map(o => {
    const b = el('button', { type: 'button', class: 'nav-btn', id: `nav-${o.id}`, 'aria-pressed': 'false', 'aria-label': o.label, 'data-tip': o.tip || o.label, html: icon(o.icon) });
    b.addEventListener('click', () => { o.run(); updateNav(); });
    navExtraEl.append(b);
    return { o, b };
  });
  updateNav();
}
/* Axis ball for the 3D view: X red, Y green, Z (up) blue; hollow dots are the negative ends. */
export const AXES = [
  { id: 'x', label: 'X', v: [1, 0, 0], c: '#ef6461', name: 'right' },
  { id: 'y', label: 'Y', v: [0, 0, -1], c: '#6fcf97', name: 'back' },
  { id: 'z', label: 'Z', v: [0, 1, 0], c: '#5fa8ef', name: 'top' },
  { id: '-x', label: '', v: [-1, 0, 0], c: '#ef6461', name: 'left', neg: true },
  { id: '-y', label: '', v: [0, 0, 1], c: '#6fcf97', name: 'front', neg: true },
];
export function buildOrbit() {
  orbitAxes = AXES.map(a => {
    const b = el('button', { type: 'button', class: 'axis' + (a.neg ? ' neg' : ''), text: a.label, 'aria-label': `View from the ${a.name}`, title: `View from the ${a.name}`, style: `--c: ${a.c}` });
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', () => { if (active.snap3) { active.snap3(a.id); announce(`View from the ${a.name}`); } });
    orbitEl.append(b);
    return { a, b };
  });
  let st = null;
  orbitEl.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { orbitEl.setPointerCapture(e.pointerId); } catch (_) { /* best-effort */ } });
  orbitEl.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id || !active.orbit3) return;
    active.orbit3((e.clientX - st.x) * 1.6, (e.clientY - st.y) * 1.6); st.x = e.clientX; st.y = e.clientY;
  });
  const end = e => { if (st && e.pointerId === st.id) st = null; };
  orbitEl.addEventListener('pointerup', end); orbitEl.addEventListener('pointercancel', end);
}
export function updateOrbit() {
  const lab = active; if (!is3D(lab) || !orbitAxes.length) return;
  const B = lab.basis3(), R = 25, lines = [];
  for (const { a, b } of orbitAxes) {
    const sx = v3dot(a.v, B.r) * R, sy = -v3dot(a.v, B.u) * R, front = v3dot(a.v, B.f) < 0;
    b.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    b.style.zIndex = front ? '3' : '1';
    if (!a.neg) lines.push(`<line x1="0" y1="0" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${a.c}" opacity="${front ? 1 : 0.5}"/>`);
  }
  const html = lines.join('');
  if (html !== orbitHtml) { orbitHtml = html; $('#orbit-lines').innerHTML = html; }
}
export function updateNav() {
  const lab = active; if (!lab) return;
  const three = is3D(lab), z = zoomPct(lab), txt = (z >= 9.95 ? Math.round(z) : z.toFixed(1)) + '%';
  if (navZoomEl.textContent !== txt) { navZoomEl.textContent = txt; navZoomEl.setAttribute('aria-label', `Zoom ${txt}. Drag up or down to zoom, or press for 100%.`); }
  navPanEl.setAttribute('aria-pressed', String(ptr.panMode));
  for (const x of navExtras) x.b.setAttribute('aria-pressed', String(!!x.o.pressed()));
  orbitEl.hidden = !three;
  if (three) updateOrbit();
  updateScale(lab, three);
  drawMinimap(lab, three);
}
export function updateScale(lab, three) {
  scaleEl.hidden = three;
  if (three) return;
  const u = lab.unit ? lab.unit() : { name: 'px', k: 1 }, z = camOf(lab).z, want = 90 / z * u.k;
  if (!(want > 0) || !Number.isFinite(want)) return;
  const p10 = Math.pow(10, Math.floor(Math.log10(want)));
  let nice = p10;
  for (const m of [2, 5]) if (m * p10 <= want) nice = m * p10;
  $('#scalebar-bar').style.width = `${(nice / u.k * z).toFixed(1)}px`;
  $('#scalebar-lbl').textContent = `${Number(nice.toPrecision(3))} ${u.name}`;
}
export function drawMinimap(lab, three) {
  if (three) { miniEl.hidden = true; return; }
  const a = toWorld(lab, { x: 0, y: 0 }), b = toWorld(lab, { x: view.w, y: view.h });
  let R;
  if (lab.selfCam) { R = lab.extent ? lab.extent() : null; if (!R) { miniEl.hidden = true; return; } }
  else { const W = worldOf(lab); R = { x0: 0, y0: 0, x1: W.w, y1: W.h }; }
  const inside = a.x <= R.x0 + 1 && a.y <= R.y0 + 1 && b.x >= R.x1 - 1 && b.y >= R.y1 - 1;
  if (inside && miniDrag == null) { miniEl.hidden = true; return; }
  miniEl.hidden = false;
  if (lab.selfCam) R = { x0: Math.min(R.x0, a.x), y0: Math.min(R.y0, a.y), x1: Math.max(R.x1, b.x), y1: Math.max(R.y1, b.y) };
  const c = canvasContext(miniCanvas); if (!c) return;
  const { g, w: cw, h: ch } = c, pad = 4, k = Math.min((cw - 2 * pad) / (R.x1 - R.x0), (ch - 2 * pad) / (R.y1 - R.y0));
  const ox = (cw - (R.x1 - R.x0) * k) / 2 - R.x0 * k, oy = (ch - (R.y1 - R.y0) * k) / 2 - R.y0 * k;
  Object.assign(mini, { k, ox, oy });
  g.fillStyle = '#070a0f'; g.fillRect(0, 0, cw, ch);
  if (!lab.selfCam) { g.fillStyle = THEME.ink; g.fillRect(ox, oy, (R.x1 - R.x0) * k, (R.y1 - R.y0) * k); }
  if (lab.mini) { g.save(); g.setTransform(view.dpr * k, 0, 0, view.dpr * k, view.dpr * ox, view.dpr * oy); lab.mini(g, k); g.restore(); }
  const vx = a.x * k + ox, vy = a.y * k + oy, vw = (b.x - a.x) * k, vh = (b.y - a.y) * k;
  g.fillStyle = 'rgba(242,165,65,0.12)'; g.fillRect(vx, vy, vw, vh);
  g.strokeStyle = THEME.amber; g.lineWidth = 1.5; g.strokeRect(vx + 0.75, vy + 0.75, Math.max(1, vw - 1.5), Math.max(1, vh - 1.5));
}
export let miniDrag = null;
export function miniJump(e) {
  const r = miniCanvas.getBoundingClientRect();
  navCenter((e.clientX - r.left - mini.ox) / mini.k, (e.clientY - r.top - mini.oy) / mini.k);
  updateNav();
}
export const miniEnd = e => { if (miniDrag === e.pointerId) { miniDrag = null; updateNav(); } };

/* Wiring: run once from main.js after every module has evaluated. */
export function init() {
  $('#nav-in').addEventListener('click', () => { navZoomBy(1.5, null); updateNav(); });
  $('#nav-out').addEventListener('click', () => { navZoomBy(1 / 1.5, null); updateNav(); });
  $('#nav-fit').addEventListener('click', () => { navFrame(); announce('View framed'); });
  dragButton(navZoomEl, (dx, dy) => navZoomBy(Math.exp(-dy * 0.012), null, true), () => { navActual(); announce('Zoom 100%'); });
  navZoomEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); navZoomBy(1.25, null); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); navZoomBy(0.8, null); }
  });
  dragButton(navPanEl, (dx, dy) => navPan(dx, dy), () => setPanMode(!ptr.panMode));
  miniCanvas.addEventListener('pointerdown', e => { miniDrag = e.pointerId; try { miniCanvas.setPointerCapture(e.pointerId); } catch (_) { /* best-effort */ } miniJump(e); });
  miniCanvas.addEventListener('pointermove', e => { if (miniDrag === e.pointerId) miniJump(e); });
  miniCanvas.addEventListener('pointerup', miniEnd); miniCanvas.addEventListener('pointercancel', miniEnd);
}
