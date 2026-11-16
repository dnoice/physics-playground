/*
✒ Metadata
    - Title: Cloth Narrator (digiSpace Edition - v2.18)
    - File Name: cloth.js
    - Relative Path: js/labs/story/cloth.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: the first tear and
      where it starts, a rip running, the cloth settling, its lean in the
      wind against tan θ = 0.62·wind/g, its flutter against the gusts, and a
      free fall when the last pin lets go.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Cloth lab by the registry: narrate(N) reads the points
    and links four times a second and tells the Story what the fabric is
    doing and why.

✒ Key Features:
    - Tears located by row, with why the threads by the pins go first, and
      the cascade when tearing runs on.
    - Settling against the damping, the lean of a sheet in a steady wind
      against the combined pull, and the swing timed against the gusts.
    - A free fall once nothing holds the cloth.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - A look counts the links and points once each, allocating nothing.
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { setParam } from '../../shell/lifecycle.js';

let S = null;
const secs = t => `${sig(t, 2)} s`;
const spd = (L, v) => fmtQ(L, 'speed', v, { prefix: true }), acc = (L, a) => fmtQ(L, 'acc', a);
const deg = r => `${(r * 180 / Math.PI).toFixed(1)}°`;

function start(L, t) {
  let alive = 0; for (let k = 0; k < L.L; k++) alive += L.alive[k];
  S = { t0: t, t, alive, tore: false, rip: false, vMax: 0, still: false, pins: L.pins(), sum: 0, cnt: 0, leanT: NaN, swing: false, cx: NaN, mean: NaN, up: [], fell: 0 };
}
/* The free points' centre and typical speed, and the pins' centre, written into one object kept between looks. */
const SH = { fx: NaN, fy: NaN, px: NaN, py: NaN, v: 0, pins: 0 };
function shape(L) {
  const X = L.x, Y = L.y, OX = L.ox, OY = L.oy, P = L.pin, dt = L.dt();
  let fx = 0, fy = 0, fn = 0, px = 0, py = 0, pn = 0, v2 = 0;
  for (let i = 0; i < L.n; i++) {
    if (P[i]) { px += X[i]; py += Y[i]; pn++; continue; }
    fx += X[i]; fy += Y[i]; fn++; v2 += ((X[i] - OX[i]) ** 2 + (Y[i] - OY[i]) ** 2) / (dt * dt);
  }
  SH.fx = fn ? fx / fn : NaN; SH.fy = fn ? fy / fn : NaN; SH.px = pn ? px / pn : NaN; SH.py = pn ? py / pn : NaN; SH.v = fn ? Math.sqrt(v2 / fn) : 0; SH.pins = pn;
  return SH;
}

export const clothStory = {
  storyHint: 'Let the cloth hang, blow on it, tear it or let it go: tears, rips, settling, its lean and flutter in the wind and its fall are told here as they happen.',
  narrate(N) {
    const L = this, t = N.t;
    if (N.fresh || !S) start(L, t);
    S.t = t;
    if (!L.n) return;
    const g = L.p.gravity, w = L.p.wind, sh = shape(L);

    // 1. Tearing: the first thread, and where, then a rip that runs on its own.
    let alive = 0, row = Infinity;
    for (let k = 0; k < L.L; k++) { if (L.alive[k]) alive++; }
    if (alive < S.alive && !L.cutting && L.p.tearable) {
      if (!S.tore) {
        for (let k = 0; k < L.L; k++) if (!L.alive[k]) row = Math.min(row, Math.floor(L.la[k] / L.cols));
        S.tore = true;
        N.add({ kind: 'tear', key: 'tear', tone: 'key', title: `The first thread tore, in row ${row + 1}`,
          body: `${S.alive - alive} link${S.alive - alive === 1 ? '' : 's'} broke ${secs(t - S.t0)} in, ${row <= 1 ? 'right beside the pins' : `${row} rows below the top`}. A link tears once it is stretched past ${L.p.tear.toFixed(2)} times its rest length; the threads nearest the pins hold up the weight of all the cloth below them${w ? ' and take the wind\'s push on all of it too' : ''}, so they are stretched furthest and go first.` });
      }
    }
    if (!S.rip && L.tearRate > 40 && L.p.tearable) {
      S.rip = true;
      N.add({ kind: 'rip', key: 'rip', tone: 'warn', title: 'A rip is running',
        body: `<b>${Math.round(L.tearRate)} links a second</b> are tearing. Each torn link hands its load to its neighbours, which are stretched past the limit in turn, so the tear runs on by itself: a small nick in paper does the same. Tougher fabric, torn only at a larger stretch, stops the run sooner.`,
        fixes: L.p.tear < 5.5 ? [{ label: `Tear at ${Math.min(6, L.p.tear + 1).toFixed(2)}× rest`, run() { setParam(L, 'tear', Math.min(6, +(L.p.tear + 1).toFixed(2))); } }] : null });
    }
    S.alive = alive;

    // 2. The last pin let go: free fall.
    if (S.pins > 0 && sh.pins === 0) {
      N.add({ kind: 'fall', group: 'falls', title: 'Nothing holds the cloth: it falls',
        body: `With no pin left, every point accelerates together at g = ${acc(L, g)}, so the threads go slack: nothing pulls one point back from another. Free fall looks like a cloth losing all its tension, which is exactly what it is.` });
    }
    S.pins = sh.pins;

    // 3. Settling: with no wind the swing dies away under the damping.
    S.vMax = Math.max(S.vMax, sh.v);
    if (!S.still && !w && g > 0 && sh.pins && S.vMax > 30 && sh.v < 0.03 * S.vMax && t - S.t0 > 1.5) {
      S.still = true;
      N.add({ kind: 'settle', key: 'settle', title: 'The cloth has come to rest',
        body: `${secs(t - S.t0)} in, its points move at <b>${spd(L, sh.v)}</b> on average, down from ${spd(L, S.vMax)} at the height of the swing. The damping (${(L.p.damping * 100).toFixed(1)} % of each point's velocity, every step) bled the motion away, and the fabric now hangs where gravity's pull on each point is balanced by the tension in the threads above it.${sh.pins < L.cols / 2 ? ' Between its pins the top edge sags in the curve of a hanging chain, the catenary.' : ''}` });
    }

    // 4. In the wind: the sheet leans along the combined pull, tan θ = 0.62·wind/g (the gusts' mean push), and swings with them.
    if (w && g > 0 && sh.pins && Number.isFinite(sh.fx)) {
      const dx = sh.fx - sh.px, dy = sh.fy - sh.py, ang = Math.atan2(dx, dy);
      if (t - S.t0 > 3) { S.sum += ang; S.cnt++; }
      if (S.cnt >= 16 && !N.said('lean')) {
        const m = S.sum / S.cnt, th = Math.atan2(0.62 * w, g);
        if (Math.abs(m - th) < 0.17) N.add({ kind: 'lean', key: 'lean', title: `The ${L.presetId === 'flag' ? 'flag' : 'cloth'} leans ${deg(Math.abs(m))} in the wind`,
          body: `Averaged over the gusts, the cloth hangs <b>${deg(Math.abs(m))}</b> from vertical. The wind pushes every point on average with 0.62 × ${acc(L, Math.abs(w))} while gravity pulls with ${acc(L, g)}, and a sheet hanging from its pins settles along the sum of the two, at tan θ = 0.62·wind/g, which is <b>${deg(Math.abs(th))}</b>. A plumb line in a steadily accelerating car leans the same way.` });
      }
      // The swing of its centre about the average, timed from upward crossings.
      if (!Number.isFinite(S.mean)) S.mean = sh.fx; else S.mean += (sh.fx - S.mean) * 0.05;
      if (!S.swing && Number.isFinite(S.cx) && S.cx < S.mean && sh.fx >= S.mean && t - S.t0 > 4) S.up.push(t);
      S.cx = sh.fx;
      if (S.up.length >= 3 && !S.swing) {
        S.swing = true;
        const T = (S.up[S.up.length - 1] - S.up[0]) / (S.up.length - 1), slow = 2 * Math.PI / 1.9, fast = 2 * Math.PI / 5.3, near = Math.abs(T - slow) < Math.abs(T - fast) ? slow : fast;
        N.add({ kind: 'flutter', key: 'flutter', title: `It sways every ${secs(T)}`,
          body: `The cloth's centre swings to and fro once every <b>${secs(T)}</b>. The wind's gusts rise and fall on two clocks, every ${secs(slow)} and every ${secs(fast)}, and ${Math.abs(T / near - 1) < 0.2 ? `the sway follows the ${near === slow ? 'slow' : 'quick'} one: a cloth this soft does not ring at a frequency of its own but moves as it is pushed, a forced oscillation` : 'the sway mixes them with the cloth\'s own slow swing about its pins'}. Gustiness is ${L.p.gust.toFixed(2)}×; at 0 the push is steady and the sway dies.` });
      }
    }
  },
};
