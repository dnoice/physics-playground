/*
✒ Metadata
    - Title: Collisions Narrator (digiSpace Edition - v2.19)
    - File Name: collisions.js
    - Relative Path: js/labs/story/collisions.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one way to select: Show me selects a ball by its own
      number, through the lab's select().
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: the gas relaxing to
      Maxwell–Boltzmann, energy bleeding away against Haff's law, a pile
      forming, the wall pressure against the hard-disc law, the break and
      the Brownian walk.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Collisions lab by the registry: narrate(N) looks at the
    discs four times a second and tells the Story what the gas is doing,
    measured against the law it should follow.

✒ Key Features:
    - Relaxation: ⟨v⁴⟩/⟨v²⟩² climbing from 1 (one shared speed) to 2, the
      2-D Maxwell–Boltzmann value, with the collisions per ball it took.
    - Cooling: the halving of kinetic energy, then a tenth, with Haff's law
      fitted at the half and tested at the tenth.
    - A pile at rest and its packing fraction; the wall pressure against
      Henderson's equation; the break; the tracer's random walk.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { henderson } from '../collisions.js';

let S = null;
const pc = x => `${sig(x * 100, 2)} %`;
const len = (L, px) => fmtQ(L, 'len', px, { prefix: true });
const secs = t => `${sig(t, 2)} s`;
const listed = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

function start(L, t) {
  S = { t0: t, t, hits: 0, ref: 0, refT: t, refK: L.KE0, half: NaN, tau: NaN, tenth: false, R0: NaN, relaxN: 0, pileN: 0, zN: 0, broke: false, p0: 0, still: false,
    wx: 0, wy: 0, path: 0, tracer: -1, lx: 0, ly: 0, walked: false };
  const s = L.stats();
  S.ref = s.etot; S.p0 = s.p;
  if (L.tracer >= 0) { S.tracer = L.uid[L.tracer]; S.wx = S.lx = L.x[L.tracer]; S.wy = S.ly = L.y[L.tracer]; }
}
/* The spread of speeds as one number, ⟨v⁴⟩/⟨v²⟩² over the balls of the gas (not the tracer, not one in hand), and
   whether they all share one size, without which Maxwell–Boltzmann's single curve does not apply. */
function spread(L) {
  let s2 = 0, s4 = 0, n = 0, r0 = -1, same = true;
  for (let i = 0; i < L.n; i++) {
    if (i === L.tracer || (L.grab && L.grab.i === i)) continue;
    const v2 = L.vx[i] * L.vx[i] + L.vy[i] * L.vy[i]; s2 += v2; s4 += v2 * v2; n++;
    if (r0 < 0) r0 = L.r[i]; else if (Math.abs(L.r[i] - r0) > 1e-6) same = false;
  }
  return n > 0 && s2 > 0 ? (same ? s4 * n / (s2 * s2) : -1) : NaN;
}
/* A ball's speed against the speed that would lift it a fifth of its radius: below it, it is at rest in the pile. */
function resting(L) {
  const g = L.p.gravity; let k = 0;
  for (let i = 0; i < L.n; i++) if (L.vx[i] * L.vx[i] + L.vy[i] * L.vy[i] < 0.1 * g * L.r[i]) k++;
  return L.n ? k / L.n : 0;
}
/* Show me selects a ball by its own number, which outlasts its slot in the arrays. */
function select(L, i) { const id = L.uid[i]; return { label: i === L.tracer ? 'Select the tracer' : 'Select it', can: () => L.slot(id) >= 0, run() { L.select(id); } }; }

export const collisionsStory = {
  storyHint: 'Let the gas run, or change restitution, gravity or friction: relaxation to Maxwell–Boltzmann, cooling, piling, the wall pressure and the tracer\'s random walk are told here as they happen.',
  narrate(N) {
    const L = this, t = N.t;
    if (N.fresh || !S) start(L, t);
    const dt = t - S.t; S.t = t;
    if (!L.n) return;
    const s = L.stats(), e = L.p.e, g = L.p.gravity;
    S.hits += L.hitRate * dt;
    // The lab moves its energy baseline when restitution, gravity, drag or friction change, or a brush heats or cools.
    if (L.KE0 !== S.refK) { S.refK = L.KE0; S.ref = s.etot; S.refT = t; S.half = NaN; S.tau = NaN; S.tenth = false; S.still = false; }

    // 1. Relaxation: from one shared speed to the Maxwell–Boltzmann spread.
    const R = g === 0 && e >= 0.98 && L.n >= 30 ? spread(L) : NaN;
    if (!Number.isFinite(S.R0) && R > 0) S.R0 = R;
    if (S.R0 < 1.6 && R >= 1.9) S.relaxN++; else S.relaxN = 0;
    if (S.relaxN >= 2 && !N.said('relax')) {
      const per = 2 * S.hits / L.n;
      N.add({ kind: 'relax', key: 'relax', tone: 'key', title: 'Speeds have relaxed to Maxwell–Boltzmann',
        body: `In ${secs(t - S.t0)}, about <b>${Math.round(per)} collisions per ball</b>, the gas has gone from one shared speed to the 2-D Maxwell–Boltzmann spread: ⟨v⁴⟩/⟨v²⟩² is now <b>${R.toFixed(2)}</b>, against 2 for that law and ${S.R0.toFixed(2)} at the start. Collisions only trade energy between balls, so the total holds while the shares spread: this is the sharing with by far the most ways to happen. The speed chart in Telemetry sets the bars beside the curve.` });
    }

    // 2. Energy bleeding away: the half, fitted to Haff's law in a free gas, and the tenth, tested against it.
    if (S.ref > 0 && t > S.refT) {
      const k = s.etot / S.ref, free = g === 0 && L.p.drag === 0 && L.p.mu === 0 && e < 1;
      const why = [e < 1 ? `each impact keeps only e² = ${(e * e).toFixed(2)} of the energy along the line of centres` : '', L.p.drag > 0 ? `rolling drag of ${L.p.drag}/s takes a share 2·drag of the energy every second` : '', L.p.mu > 0 ? 'friction at contacts heats as surfaces slide' : ''].filter(Boolean);
      if (!Number.isFinite(S.half) && k <= 0.5 && why.length) {
        S.half = t - S.refT;
        // Haff's law, T = T₀ / (1 + t/τ)², fixed by the half: τ = t½ / (√2 − 1).
        if (free) S.tau = S.half / (Math.SQRT2 - 1);
        N.add({ kind: 'cooling', group: 'energy losses', title: 'Half the kinetic energy is gone',
          body: `It took <b>${secs(S.half)}</b>: ${listed(why)}.${free ? ` A freely cooling granular gas follows Haff's law, T = T₀/(1 + t/τ)², which this halving fixes at τ = ${secs(S.tau)}, and so predicts the energy reaches a tenth at ${secs(S.tau * (Math.sqrt(10) - 1))}.` : ''}${L.p.drag > 0 && e > 0.95 ? ` Drag alone halves it in ln 2 / (2·drag) = ${secs(Math.LN2 / (2 * L.p.drag))}.` : ''}` });
      }
      if (Number.isFinite(S.half) && !S.tenth && k <= 0.1) {
        S.tenth = true;
        const tt = t - S.refT, pred = S.tau * (Math.sqrt(10) - 1);
        N.add({ kind: 'cooling', group: 'energy losses', title: 'Nine-tenths of the energy is gone',
          body: `After <b>${secs(tt)}</b> the balls keep a tenth of their kinetic energy.${L.p.drag > 0 ? ` Drag alone would take ln 10 / (2·drag) = ${secs(Math.log(10) / (2 * L.p.drag))}; the impacts took the rest.` : ''}${Number.isFinite(pred) ? ` Haff's law, fitted at the half, predicted ${secs(pred)}: ${Math.abs(tt / pred - 1) < 0.15 ? `within ${pc(Math.abs(tt / pred - 1))}` : `${pc(Math.abs(tt / pred - 1))} off, as slow balls start to clump and collide less often than the law assumes (inelastic clustering)`}.` : ''}` });
      }
    }

    // 3. A pile at rest under gravity, and how tightly it packs.
    if (g > 0 && L.n >= 20) {
      const k = resting(L);
      S.pileN = k >= 0.85 ? S.pileN + 1 : 0;
      if (S.pileN >= 3 && !N.said('pile')) {
        let top = Infinity, area = 0;
        for (let i = 0; i < L.n; i++) { top = Math.min(top, L.y[i] - L.r[i]); area += Math.PI * L.r[i] * L.r[i]; }
        const H = Math.max(1, L.h - top), phi = area / (L.w * H);
        N.add({ kind: 'pile', key: 'pile', tone: 'key', title: 'A pile has formed',
          body: `${pc(k)} of the balls have come to rest in a heap <b>${len(L, H)}</b> deep, ${secs(t - S.t0)} in. Every bounce kept e² = ${(e * e).toFixed(2)} of its energy along the impact, so gravity's pull wins and the gas collapses. Discs fill about <b>${pc(Math.min(phi, 0.95))}</b> of the box up to the heap's top, near random close packing for discs (about 82 to 84 %, more with mixed sizes); the top is ragged, so the figure deep inside is higher.` });
      }
    }

    // 4. The wall pressure, once it has settled, set beside Henderson's hard-disc equation of state.
    if (g === 0 && L.n > 30 && Number.isFinite(L.Z) && t - S.t0 > 6) {
      const th = henderson(s.phi), off = Math.abs(L.Z / th - 1);
      S.zN = off < 0.06 ? S.zN + 1 : 0;
      if (S.zN >= 4 && !N.said('pressure')) N.add({ kind: 'pressure', key: 'pressure', title: 'The walls feel the gas law',
        body: `Momentum handed to the walls gives PA/NkT = <b>${L.Z.toFixed(2)}</b>, and Henderson's equation of state for hard discs at this packing (φ = ${pc(s.phi)}) gives (1 + φ²/8)/(1 − φ)² = <b>${th.toFixed(2)}</b>: within ${pc(off)}. An ideal gas of points would give 1; discs push harder because each one blocks space the others cannot use.` });
    }

    // 5. The break: the cue ball's momentum shared across the rack, and the table falling still.
    if (L.presetId === 'pool') {
      let moving = 0; for (let i = 0; i < L.n; i++) if (L.vx[i] * L.vx[i] + L.vy[i] * L.vy[i] > 400) moving++;
      if (!S.broke && moving >= Math.min(10, L.n - 1)) {
        S.broke = true;
        N.add({ kind: 'break', key: 'break', tone: 'key', title: 'The break',
          body: `${moving} balls are rolling ${secs(t - S.t0)} after the cue ball struck. Momentum passed along the rack in a chain of near-elastic impacts (e = ${e}): the balls together now carry <b>${pc(s.p / S.p0)}</b> of the cue ball's momentum, the rest taken by drag so far. Equal masses meeting head-on swap velocities, which is why the cue ball nearly stops.` });
      }
      if (S.broke && !S.still && s.etot < 0.01 * S.ref) {
        S.still = true;
        N.add({ kind: 'still', key: 'still', title: 'The table is still',
          body: `After ${secs(t - S.t0)} the balls keep under 1 % of the break's energy. Rolling drag of ${L.p.drag}/s alone would take ln 100 / (2·drag) = ${secs(Math.log(100) / (2 * L.p.drag))} to do that; each impact (e = ${e}) took its share too.` });
      }
    }

    // 6. The tracer's random walk: far less net distance than path, the signature of diffusion.
    const ti = L.tracer;
    if (ti >= 0 && S.tracer === L.uid[ti]) {
      S.path += Math.hypot(L.x[ti] - S.lx, L.y[ti] - S.ly); S.lx = L.x[ti]; S.ly = L.y[ti];
      if (!S.walked && t - S.t0 >= 10 && S.path > 0) {
        S.walked = true;
        const net = Math.hypot(L.x[ti] - S.wx, L.y[ti] - S.wy);
        N.add({ kind: 'walk', key: 'walk', show: select(L, ti), title: 'The tracer is on a random walk',
          body: `In ${secs(t - S.t0)} the heavy tracer has wandered <b>${len(L, net)}</b> from where it started, though its path is ${len(L, S.path)} long: kicks from the small balls come from every side and mostly cancel, so its distance grows only as √t, not t. That is Brownian motion, which Einstein explained in 1905 as just these molecular kicks.` });
      }
    }
  },
};
