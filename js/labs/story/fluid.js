/*
✒ Metadata
    - Title: Fluid Narrator (digiSpace Edition - v2.19)
    - File Name: fluid.js
    - Relative Path: js/labs/story/fluid.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one way to select: Show me selects a post by its
      number, through the lab's select().
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: the dam-break
      front against Ritter's 2√(gh₀), the run-up against v²/2g, the squash
      at the bottom, a drop's impact and splash, surges meeting, blobs
      merging and rounding, the wake behind a post and the settling.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Fluid lab by the registry: narrate(N) looks at the
    particles four times a second and tells the Story what the liquid is
    doing, each moment measured and set beside the law it follows.

✒ Key Features:
    - The surge front's speed, the wall it hits and how high it climbs.
    - Squashing at depth, settling, a falling drop's impact speed and the
      spray it throws, two surges meeting, zero-g blobs merging and
      rounding, the pile-up in front of a post and the wake behind it.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - A look scans the particles a few times, a few thousand at most, and
      allocates nothing.
---------
*/
import { fmtQ, sig } from '../../core/units.js';

let S = null;
const len = (L, px) => fmtQ(L, 'len', px, { prefix: true }), spd = (L, v) => fmtQ(L, 'speed', v, { prefix: true }), acc = (L, a) => fmtQ(L, 'acc', a);
const secs = t => `${sig(t, 2)} s`;
const pc = x => `${sig(x * 100, 2)} %`;
/* Particle speed in px/s from the solver's units per tick. */
const pxs = (L, v) => v * L.U / L.TICK;

/* At the start, which particles belong to which body of liquid: they were filled in order, so one uid splits them. */
function start(L, t) {
  S = { t0: t, t, split: Infinity, h0: 0, x0: 0, front: NaN, fT: NaN, fX: NaN, vFront: NaN, surged: false, hit: NaN, runup: 0, vHit: NaN, ran: false,
    keMax: 0, settled: false, impact: false, spray: 0, sprayT: NaN, met: NaN, jet: 0, merged: false, round: false, posts: new Set(), squash: false, cy0: NaN, v0: 0, vPre: 0, hPre: 0, vMeet: 0 };
  const mid = L.Wu / 2, n = L.n, X = L.x, Y = L.y, Hu = L.Hu;
  if (L.presetId === 'drop') {
    let top = Infinity; for (let i = 0; i < n; i++) if (Y[i] > Hu * 0.5) top = Math.min(top, Y[i]);
    for (let i = 0; i < n; i++) if (Y[i] < top - 1) S.split = Math.min(S.split, L.uid[i]);
    S.surf = top; let c = 0, lo = 0; for (let i = 0; i < n; i++) if (L.uid[i] >= S.split) { c++; lo = Math.max(lo, Y[i]); }
    S.dropN = c; S.dropLow = lo;
  } else if (L.presetId === 'twin' || L.presetId === 'zerog') {
    for (let i = 0; i < n; i++) if (X[i] > mid) S.split = Math.min(S.split, L.uid[i]);
  }
  if (L.presetId === 'dam' || L.presetId === 'posts') {
    let top = Infinity, right = 0; for (let i = 0; i < n; i++) { top = Math.min(top, Y[i]); right = Math.max(right, X[i]); }
    S.h0 = (Hu - top) * L.U; S.x0 = right;
  }
}
/* The front of the liquid along the floor: the farthest particle in the bottom layer. */
function frontOf(L) {
  let f = 0; const floor = L.Hu - 1.5;
  for (let i = 0; i < L.n; i++) if (L.y[i] > floor && L.x[i] > f) f = L.x[i];
  return f;
}

export const fluidStory = {
  storyHint: 'Let the liquid move, pour or stir it, or place posts in its way: surges, splashes, squashing, wakes and settling are told here with the numbers behind them.',
  narrate(N) {
    const L = this, t = N.t, U = L.U, X = L.x, Y = L.y, VX = L.vx, VY = L.vy, n = L.n;
    if (N.fresh || !S) start(L, t);
    S.t = t;
    if (n < 20) return;
    const g = L.p.gravity, upright = g > 0 && L.p.tilt === 0;

    // 1. The dam-break surge: its front's speed against Ritter's 2√(g h₀), then the far wall and the run-up.
    if (upright && (L.presetId === 'dam' || L.presetId === 'posts') && S.h0 > 0) {
      const f = frontOf(L), W = L.Wu;
      // Timed over the middle of its run, once it has stopped accelerating: from a third of the way to two-thirds.
      if (!Number.isFinite(S.fT) && f > S.x0 + (W - S.x0) / 3) { S.fT = t; S.fX = f; }
      if (Number.isFinite(S.fT) && !S.surged && f > S.x0 + 2 * (W - S.x0) / 3 && t > S.fT) {
        S.surged = true; S.vFront = (f - S.fX) * U / (t - S.fT);
        const ritter = 2 * Math.sqrt(g * S.h0);
        N.add({ kind: 'surge', key: 'surge', tone: 'key', title: 'The surge runs across the floor',
          body: `The front of the collapsing column is moving at <b>${spd(L, S.vFront)}</b>. Ritter's solution for a dam break gives 2√(g h₀) = <b>${spd(L, ritter)}</b> for a column h₀ = ${len(L, S.h0)} tall under ${acc(L, g)}: the whole height falling to the floor's speed. The real tip runs slower (${pc(S.vFront / ritter)} of it here), held back by the floor, by how thin it is and by the liquid's viscosity.` });
      }
      if (S.surged && !Number.isFinite(S.hit) && f > W - 1.6) { S.hit = t; S.vHit = S.vFront; }
      if (Number.isFinite(S.hit) && !S.ran) {
        let top = Infinity; for (let i = 0; i < n; i++) if (X[i] > W - 2.5 && Y[i] < top) top = Y[i];
        S.runup = Math.max(S.runup, (L.Hu - top) * U);
        if (t - S.hit > 1.2) {
          S.ran = true;
          N.add({ kind: 'runup', key: 'runup', title: 'The surge hits the far wall and climbs it',
            body: `It reached the wall ${secs(S.hit - S.t0)} after the column let go and ran up it to <b>${len(L, S.runup)}</b>. Kinetic energy turning into height would lift water arriving at ${spd(L, S.vHit)} to v²/2g = ${len(L, S.vHit * S.vHit / (2 * g))}; the climb is ${S.runup > S.vHit * S.vHit / (2 * g) ? 'higher, because the water behind keeps pushing' : 'lower, as viscosity and the jostle of particles take their share'}.` });
        }
      }
    }

    // 2. Squashing at depth: pressure must hold up the weight above.
    if (!S.squash && L.peak > 1.5 && g > 0) {
      S.squash = true;
      N.add({ kind: 'squash', key: 'squash', tone: 'warn', title: 'The bottom layers are squashing',
        body: `The densest particles are at <b>${L.peak.toFixed(2)}×</b> rest density. Pressure here is k(ρ − ρ₀), so the liquid must compress to push back, and the deepest layers carry the weight of all the water above them (hydrostatic pressure, p = ρgh). Real water barely compresses; raising the stiffness k brings this closer to it.` });
    }

    // 3. A falling drop: its impact speed against free fall, then the spray it throws.
    if (L.presetId === 'drop' && g > 0 && S.dropN) {
      let vy = 0, cy = 0, c = 0, low = 0;
      for (let i = 0; i < n; i++) if (L.uid[i] >= S.split) { vy += VY[i]; cy += Y[i]; c++; low = Math.max(low, Y[i]); }
      if (c) { vy /= c; cy /= c; }
      if (!Number.isFinite(S.cy0)) { S.cy0 = cy; S.v0 = pxs(L, vy); }
      // Its speed and fall at the last look before it touched, for the free-fall check: v² = v₀² + 2gh.
      if (!S.impact && c && low < S.surf - 0.3) { S.vPre = pxs(L, vy); S.hPre = (cy - S.cy0) * U; }
      if (!S.impact && c && low >= S.surf - 0.3) {
        S.impact = true; S.sprayT = t;
        if (S.hPre > 0) {
          const free = Math.sqrt(S.v0 * S.v0 + 2 * g * S.hPre), off = Math.abs(S.vPre / free - 1);
          N.add({ kind: 'splash', key: 'impact', tone: 'key', title: 'The drop hits the pool',
            body: `Just before it touched, the drop had fallen ${len(L, S.hPre)} and was moving at <b>${spd(L, S.vPre)}</b>. Free fall gives v² = v₀² + 2gh, so <b>${spd(L, free)}</b>: ${off < 0.05 ? `within ${pc(off)}, as nothing but gravity acted on the way down` : `${pc(off)} apart, as the drop wobbles and its particles jostle while it falls`}. Then the pool stops it in a fraction of a second, and that sudden loss of momentum is the splash.` });
        }
      }
      if (S.impact && Number.isFinite(S.sprayT)) {
        let top = Infinity; for (let i = 0; i < n; i++) if (Y[i] < top) top = Y[i];
        S.spray = Math.max(S.spray, (S.surf - top) * U);
        if (t - S.sprayT > 1.5) {
          S.sprayT = NaN;
          if (S.spray > 0.5 * U) N.add({ kind: 'splash', key: 'spray', title: 'A crown of spray',
            body: `The impact threw water up to <b>${len(L, S.spray)}</b> above the pool's surface. The drop's momentum is shoved sideways and up by the pressure spike where it lands, the same jet that makes a crown when a drop falls into milk.` });
        }
      }
    }

    // 4. Two bodies of liquid meeting: twin surges throwing up a jet, or zero-g blobs merging and rounding.
    if ((L.presetId === 'twin' || L.presetId === 'zerog') && Number.isFinite(S.split)) {
      let av = 0, an = 0, bv = 0, bn = 0, aR = -Infinity, bL = Infinity;
      for (let i = 0; i < n; i++) {
        if (L.uid[i] < S.split) { av += VX[i]; an++; if (X[i] > aR) aR = X[i]; } else { bv += VX[i]; bn++; if (X[i] < bL) bL = X[i]; }
      }
      if (an && bn && !Number.isFinite(S.met) && bL - aR < 0.6) {
        S.met = t;
        const vrel = pxs(L, Math.abs(av / an - bv / bn)); S.vMeet = vrel;
        N.add(L.presetId === 'twin'
          ? { kind: 'surge', key: 'met', tone: 'key', title: 'The two surges meet', body: `The fronts of the two collapsing columns collided in the middle ${secs(t - S.t0)} in. Their momenta cancel there, so the water has nowhere to go but up: a jet rises where they meet.` }
          : { kind: 'blobs', key: 'met', tone: 'key', title: 'The blobs touch', body: `The two blobs, closing at about ${spd(L, vrel)} with no gravity to pull them down, touched ${secs(t - S.t0)} in. Where they meet, the cohesion that gives each its surface tension now pulls them into one.` });
      }
      if (L.presetId === 'twin' && Number.isFinite(S.met)) {
        let top = Infinity; for (let i = 0; i < n; i++) if (Math.abs(X[i] - L.Wu / 2) < 3 && Y[i] < top) top = Y[i];
        S.jet = Math.max(S.jet, (L.Hu - top) * U);
        if (t - S.met > 1.5 && !N.said('jet')) N.add({ kind: 'splash', key: 'jet', title: 'The jet peaks',
          body: `The jet where the surges met climbed to <b>${len(L, S.jet)}</b> above the floor, as high as the momentum of both fronts could lift it before gravity (${acc(L, g)}) pulled it back.` });
      }
      if (L.presetId === 'zerog' && Number.isFinite(S.met) && !S.round && t - S.met > 2.5) {
        // The merged blob: its centre's speed (what is left of the two momenta) and its shape from its second moments.
        let mx = 0, my = 0, vx = 0, vy = 0, ke = 0; for (let i = 0; i < n; i++) { mx += X[i]; my += Y[i]; vx += VX[i]; vy += VY[i]; ke += VX[i] * VX[i] + VY[i] * VY[i]; } mx /= n; my /= n; vx /= n; vy /= n;
        let sxx = 0, syy = 0, sxy = 0; for (let i = 0; i < n; i++) { const dx = X[i] - mx, dy = Y[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
        const tr = (sxx + syy) / 2, det = Math.sqrt(Math.max(0, ((sxx - syy) / 2) ** 2 + sxy * sxy)), ratio = Math.sqrt((tr + det) / Math.max(1e-9, tr - det));
        S.round = true;
        N.add({ kind: 'round', key: 'round', title: 'One blob, at rest where they met',
          body: `The joined blob's centre moves at ${pxs(L, Math.hypot(vx, vy)) < 0.01 * S.vMeet ? '<b>practically nothing</b>' : `only <b>${spd(L, pxs(L, Math.hypot(vx, vy)))}</b>`}, though its halves closed at ${spd(L, S.vMeet)}: their momenta were equal and opposite, so they cancel, and the blob stays where they met. Their energy of motion did not vanish: it went into sloshing, which viscosity has damped to a typical particle speed of ${spd(L, pxs(L, Math.sqrt(ke / n)))}. The blob holds an oval ${ratio.toFixed(2)} times as long as it is wide, the shape the collision squeezed it into; surface tension pulls toward a circle, the least boundary for its area, but here it is too weak to finish the job.` });
      }
    }

    // 5. A surge meeting a post: water piles on the upstream face, and the lee behind it is a sheltered wake.
    if (L.obs.length && g > 0) {
      for (let k = 0; k < L.obs.length; k++) {
        const o = L.obs[k], key = `${o.x.toFixed(2)}|${o.y.toFixed(2)}`;
        if (S.posts.has(key)) continue;
        let fx = 0, fy = 0, c = 0, sp = 0;
        const R2 = (o.r + 1.6) ** 2;
        for (let i = 0; i < n; i++) { const dx = X[i] - o.x, dy = Y[i] - o.y; if (dx * dx + dy * dy < R2) { fx += VX[i]; fy += VY[i]; sp += Math.hypot(VX[i], VY[i]); c++; } }
        if (c < 12 || pxs(L, sp / c) < 60) continue;
        const v = Math.hypot(fx, fy) / c || 1e-9, ux = fx / (c * v), uy = fy / (c * v);
        let up = 0, un = 0, dn = 0, dd = 0, us = 0, ds = 0;
        for (let i = 0; i < n; i++) {
          const dx = X[i] - o.x, dy = Y[i] - o.y; if (dx * dx + dy * dy >= R2) continue;
          const along = dx * ux + dy * uy, rho = L.rho[i] / L.rho0, sp = Math.hypot(VX[i], VY[i]);
          if (along < -0.3) { up += rho; un++; us += sp; } else if (along > 0.3) { dn += rho; dd++; ds += sp; }
        }
        if (un < 4) continue;
        const ru = up / un, rd = dd ? dn / dd : 0, su = us / un, sd = dd ? ds / dd : 0, dry = dd < 4, piled = ru > 1.02 && ru > rd + 0.03, wake = dry || sd < 0.8 * su;
        S.posts.add(key);
        N.add({ kind: 'wake', group: 'posts struck', show: { label: 'Select the post', can: () => L.obs.includes(o), run() { L.select(o.id); } }, title: 'The flow strikes a post',
          body: `Water reaches the post at ${spd(L, pxs(L, su))}.${piled ? ` On its upstream face it piles up to <b>${ru.toFixed(2)}×</b> rest density${dd ? `, against ${rd.toFixed(2)}× behind` : ''}: there the flow is stopped and its momentum becomes pressure, about ½ρv² above the rest.` : ''}${dry ? ' The stream parts round it and leaves the space just behind it empty: a sheltered pocket in its lee.' : wake ? ` Behind it the water moves at only <b>${spd(L, pxs(L, sd))}</b>: a sheltered wake, where the stream parts round the post and leaves a slower pocket.` : ` The stream parts round it and closes again behind, still moving at ${spd(L, pxs(L, sd))}: a post this small in a flow this fast barely shelters its lee.`}` });
      }
    }

    // 6. Settling: the sloshing dies away as viscosity turns it into heat.
    let ke = 0; for (let i = 0; i < n; i++) ke += VX[i] * VX[i] + VY[i] * VY[i];
    ke = pxs(L, Math.sqrt(ke / n));
    if (ke > S.keMax) S.keMax = ke;
    if (!S.settled && g > 0 && S.keMax > 40 && ke < 0.08 * S.keMax && t - S.t0 > 2) {
      S.settled = true;
      N.add({ kind: 'settle', key: 'settle', title: 'The liquid has settled',
        body: `${secs(t - S.t0)} in, the particles' typical speed is down to <b>${spd(L, ke)}</b> from ${spd(L, S.keMax)} at the height of the motion. Viscosity (σ = ${L.p.visc}) damps the relative motion of neighbours, turning the sloshing into heat, until the surface lies level under gravity.` });
    }
  },
};
