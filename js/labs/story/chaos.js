/*
✒ Metadata
    - Title: Chaos Narrator (digiSpace Edition - v2.19)
    - File Name: chaos.js
    - Relative Path: js/labs/story/chaos.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one way to select: Show me selects a copy through the
      lab's select().
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: the copies'
      exponential parting with a measured Lyapunov time, the forecast that
      came true or not, flips over the top against the energy they need,
      energy holding, regular motion, the normal modes and damping.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Chaos lab by the registry: narrate(N) reads the copies
    four times a second, and the front pendulum's angle history, and tells
    the Story how predictability is lost or kept.

✒ Key Features:
    - Lyapunov time from the lab's fitted λ, and the moment the copies
      part set beside the forecast made halfway there.
    - Flips of either arm over the top, with the energy each needs and how
      many copies have flipped; energy held by RK4 when nothing damps it.
    - Small swings timed from the angle history against the two normal
      modes; damping's half-life; regular motion on an island.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { TAU } from '../../core/util.js';
import { PEND_TRAIL } from '../chaos.js';

let S = null;
const secs = t => `${sig(t, 3)} s`;
const spec = (L, e) => fmtQ(L, 'spec', e, { digits: 2 });
const turns = a => Math.floor((a + Math.PI) / TAU);
const select = (L, i, label) => ({ label, can: () => i < L.N, run() { L.select(i); } });
const POWERS = { 2: 'a hundred', 3: 'a thousand', 4: 'ten thousand', 5: 'a hundred thousand', 6: 'a million', 7: 'ten million', 8: 'a hundred million' };
const times = k => { const p = Math.round(Math.log10(k)); return POWERS[p] || `10^${p}`; };

function start(L, t) {
  S = { t0: t, up: new Int32Array(L.N), lo: new Int32Array(L.N), flipped: new Uint8Array(L.N), flips: 0, Ehalf: false, E0: L.N ? L.energy(0) : 0 };
  for (let i = 0; i < L.N; i++) { S.up[i] = turns(L.s[i * 4]); S.lo[i] = turns(L.s[i * 4 + 1]); }
}
/* The small-swing normal modes of this pendulum (upper arm 1 m and 1 kg, lower L and M): ω² = g/2L [(1+M)(1+L) ∓ √((1+M)²(1+L)² − 4(1+M)L)]. */
function modes(L) {
  const M = L.p.mass, l = L.p.len, g = L.p.g, a = (1 + M) * (1 + l), r = Math.sqrt(a * a - 4 * (1 + M) * l);
  return [TAU / Math.sqrt(g / (2 * l) * (a - r)), TAU / Math.sqrt(g / (2 * l) * (a + r))];
}
/* The front pendulum's period from its angle history (sampled at 60 Hz): the time between its last two upward
   crossings of θ₁ = 0, placed by interpolation. NaN with fewer than two in the trail. */
function period(L) {
  const P = L.phist, n = L.tn, th = L.th;
  let last = NaN, prev = NaN;
  for (let j = 1; j < n; j++) {
    const k0 = ((th - n + j - 1 + PEND_TRAIL) % PEND_TRAIL) * 2, k1 = ((th - n + j + PEND_TRAIL) % PEND_TRAIL) * 2, a = P[k0], b = P[k1];
    if (a < 0 && b >= 0 && b - a < 1) { prev = last; last = (j - 1 + -a / (b - a)) / 60; }
  }
  return last - prev;
}

export const chaosStory = {
  storyHint: 'Let the copies swing: their parting, the Lyapunov time, flips over the top and the normal modes of a small swing are told here as they happen.',
  narrate(N) {
    const L = this, t = N.t, n = L.N, s = L.s;
    if (N.fresh || !S || S.up.length !== n) start(L, t);
    if (!n) return;
    const damped = L.p.damp > 0, E = L.energy(0), M = L.p.mass, g = L.p.g, l = L.p.len;

    // 1. The copies part: first the growth rate, then the moment they disagree, against the forecast.
    // Told when the lab makes its forecast, halfway to parting on a log scale, from the growth measured so far.
    if (n >= 2 && Number.isFinite(L.predAt) && L.lyap > 0.2 && !N.said('lyapunov')) {
      const lam = L.lyap;
      N.add({ kind: 'lyapunov', key: 'lyapunov', tone: 'key', t: Number.isFinite(L.predFrom) ? L.predFrom : t, title: 'The copies drift apart exponentially',
        body: `The gap between the copies grows as e^(λt) with λ = <b>${lam.toFixed(2)} s⁻¹</b>: it multiplies by e every 1/λ = <b>${secs(1 / lam)}</b>, the Lyapunov time, and by ten every ${secs(Math.LN10 / lam)}. They started ${L.p.delta.toExponential(0)} rad apart and are halfway, on a log scale, to disagreeing completely (a gap of 0.1); at this rate they get there at about <b>t = ${secs(L.predAt)}</b>. Cutting the starting error a thousandfold would buy only ${secs(Math.log(1000) / lam)} more.` });
    }
    if (n >= 2 && Number.isFinite(L.divergeAt) && !N.said('parted')) {
      const f = L.predAt;
      N.add({ kind: 'parted', key: 'parted', tone: 'key', show: select(L, n - 1, 'Select the last copy'), t: L.divergeAt, title: `The copies have parted at t = ${secs(L.divergeAt)}`,
        body: `Started ${L.p.delta.toExponential(0)} rad apart, the copies are now ${times(0.1 / L.p.delta)} times further apart and share nothing but their energy. ${Number.isFinite(f) ? `Halfway there, at t = ${secs(L.predFrom)}, the measured growth forecast <b>${secs(f)}</b>: ${Math.abs(L.divergeAt / f - 1) < 0.15 ? `within ${sig(Math.abs(L.divergeAt / f - 1) * 100, 2)} %` : 'the growth rate itself wanders as the pendulum visits calmer and wilder regions'}.` : ''} Deterministic laws, and still no forecast beyond a few Lyapunov times: that is chaos.` });
    }

    // 2. Flips over the top, by the front pendulum and across the copies, with the energy a flip needs.
    for (let i = 0; i < n; i++) {
      const u = turns(s[i * 4]), w = turns(s[i * 4 + 1]);
      const lower = w !== S.lo[i], upper = u !== S.up[i];
      if ((lower || upper) && !S.flipped[i]) { S.flipped[i] = 1; S.flips++; }
      if ((lower || upper) && i === 0) {
        const need = upper ? (1 + M) * g - M * g * l : -(1 + M) * g + M * g * l, rest = -(1 + M) * g - M * g * l;
        N.add({ kind: 'flip', group: 'flips', show: select(L, 0, 'Select the front pendulum'), title: upper ? 'The whole pendulum went over the top' : 'The lower arm flipped over the top',
          body: `${upper ? 'The upper arm swung right over the pivot' : 'The lower arm swung over its elbow'}. That takes at least ${spec(L, need - rest)} above hanging still, ${upper ? 'enough to carry the upper bob over the pivot' : `enough to lift the lower bob 2L₂ = ${(2 * l).toFixed(2)} m`}; the front pendulum has ${spec(L, E - rest)}. ${n > 1 ? `So far <b>${S.flips} of ${n}</b> copies have flipped at least once: which ones, and when, turns on the tiniest difference in how they started.` : ''}` });
      }
      S.up[i] = u; S.lo[i] = w;
    }

    // 3. Energy held: with nothing damping it, any drift would be the integrator's, and there is almost none.
    if (!damped && t - S.t0 >= 20 && !N.said('energy')) {
      const d = Math.abs(L.driftPct(E));
      if (d < 1e-3) N.add({ kind: 'energy', key: 'energy', title: 'Energy is holding',
        body: `After ${secs(t - S.t0)} of chaotic swinging, the front pendulum's energy has moved by only <b>${d < 1e-6 ? 'less than 0.000001' : sig(d, 2)} %</b>. Fourth-order Runge–Kutta at 1/600 s follows the motion this closely, so the copies' parting is the physics, not rounding error.` });
    }

    // 4. Regular motion: some starts lie on islands where nothing grows.
    if (n >= 2 && t - S.t0 > 15 && !Number.isFinite(L.divergeAt) && (!Number.isFinite(L.lyap) || L.lyap < 0.2) && !N.said('regular')) {
      N.add({ kind: 'regular', key: 'regular', title: 'Still together: regular motion',
        body: `After ${secs(t - S.t0)} the copies have barely separated, growing slowly rather than exponentially${Number.isFinite(L.lyap) ? ` (λ ≈ ${L.lyap.toFixed(2)} s⁻¹)` : ''}. This start lies on a quasi-periodic island in the phase map, where nearby motions stay nearby; a larger swing would carry it into the chaotic sea around it.` });
    }

    // 5. Small swings: the two normal modes, and the front pendulum's period timed against them.
    let amp = 0; for (let k = 0; k < Math.min(L.tn, 300); k++) { const j = ((L.th - 1 - k + PEND_TRAIL) % PEND_TRAIL) * 2; amp = Math.max(amp, Math.abs(L.phist[j]), Math.abs(L.phist[j + 1])); }
    if (L.tn > 240 && amp < 0.45 && !damped && !N.said('mode')) {
      const T = period(L), [slow, fast] = modes(L), near = Math.abs(T / slow - 1) < Math.abs(T / fast - 1) ? slow : fast, off = Math.abs(T / near - 1);
      if (Number.isFinite(T)) N.add({ kind: 'mode', key: 'mode', title: off < 0.03 ? `Swinging in a normal mode: ${secs(T)} a swing` : 'Two normal modes beat together',
        body: off < 0.03
          ? `The front pendulum's swing repeats every <b>${secs(T)}</b>. For small angles a double pendulum has exactly two ways to swing at one frequency, its normal modes, here ${secs(slow)} (arms together) and ${secs(fast)} (arms opposed); this one is the ${near === slow ? 'slow, in-step' : 'fast, opposed'} mode, within ${sig(off * 100, 2)} %.`
          : `For small angles a double pendulum has two normal modes: the arms swinging together every ${secs(slow)}, or against each other every ${secs(fast)}. This start mixes both, so the motion beats: the timing from one swing to the next (${secs(T)} just now) wanders as the two modes drift in and out of step.` });
    }

    // 6. Damping: the energy above hanging still halves.
    if (damped && !S.Ehalf) {
      const rest = -(1 + M) * g - M * g * l, above = E - rest, above0 = S.E0 - rest;
      if (above0 > 0 && above < 0.5 * above0) {
        S.Ehalf = true;
        N.add({ kind: 'damped', key: 'damped', title: 'Damping has taken half the energy',
          body: `In ${secs(t - S.t0)} the swing lost half its energy above hanging still. Damping of ${L.p.damp}/s brakes each arm in proportion to its spin, so for small swings the energy falls as e^(−bt), halving every ln 2 / b = ${secs(Math.LN2 / L.p.damp)}. The chaos is transient: every copy ends hanging straight down, together again.` });
      }
    }
  },
};
