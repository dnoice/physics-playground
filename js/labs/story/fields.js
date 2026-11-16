/*
✒ Metadata
    - Title: Fields Narrator (digiSpace Edition - v2.18)
    - File Name: fields.js
    - Relative Path: js/labs/story/fields.js
    - Artifact Type: javascript
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: each gyration
      timed against 2πm/|q|B, the period's indifference to speed, the E × B
      and grad-B drifts measured against theory, particles trapped by or
      falling into a charge, the beam's bend between the plates and
      particles leaving the bench.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Fields lab by the registry: narrate(N) follows the test
    particles four times a second and tells the Story what the Lorentz
    force does to them, measured against the textbook formula.

✒ Key Features:
    - A full turn of a particle's velocity timed against the cyclotron
      period, and, over that turn, the guiding centre's drift against E/B
      or the grad-B formula.
    - Particles bound to a charge (energy below the escape level), falling
      into one, or leaving the bench; the beam's exit angle between the
      plates against a uniform field's.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - At most 24 particles are timed; records persist between looks.
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { TAU, fmtSI } from '../../core/util.js';

let S = null;
const secs = t => `${sig(t, 3)} s`;
const spd = (L, v) => fmtQ(L, 'speed', v, { prefix: true });
const pc = x => `${sig(x * 100, 2)} %`;
const TRACK = 24;
const choose = (L, pid) => ({ label: `Select particle ${pid}`, can: () => L.indexOf(pid) >= 0, run() { L.setTrack(pid); L.picked = true; } });

function start(L, t) { S = { t0: t, t, look: 0, recs: new Map(), absorbed: L.absorbed, escaped: L.escaped, periods: [], same: false, drifted: false, bent: false, hits: [] }; }
/* A particle's record: its velocity in the frame drifting at E/B (so a cycloid from rest still turns evenly), where
   it began its turn, and what has been told about it. */
function rec(L, i, t, vE) {
  const pid = L.pid[i];
  let r = S.recs.get(pid);
  if (!r && S.recs.size < TRACK) { r = { pid, ux: L.vx[i] - vE, uy: L.vy[i], x0: L.x[i], y0: L.y[i], t0: t, turn: 0, done: false, trapped: false, lx: L.x[i], ly: L.y[i], speed: Math.hypot(L.vx[i] - vE, L.vy[i]), q: L.qm[i], seen: 0, ys: 0, yn: 0 }; S.recs.set(pid, r); }
  return r;
}

export const fieldsStory = {
  storyHint: 'Launch particles, place charges or switch on a magnetic field: gyrations, drifts, trapped orbits and the beam\'s bend are timed and measured here against the formulas.',
  narrate(N) {
    const L = this, t = N.t;
    if (N.fresh || !S) start(L, t);
    const dt = t - S.t; S.t = t; S.look++;
    const B0 = L.p.B, E0 = L.p.E0, pure = !L.charges.length, vE = pure && B0 !== 0 ? E0 / B0 : 0;
    for (let i = 0; i < L.n; i++) {
      const r = rec(L, i, t, vE); if (!r) continue;
      r.seen++; r.look = S.look;
      const vx = L.vx[i], vy = L.vy[i], q = L.qm[i], ux = vx - vE, uy = vy;

      // 1. Gyration: one full turn of the velocity (in the frame drifting at E/B), timed against 2πm/|q|B, and the
      //    circle's drift over that turn, from where the particle was when the turn began and ended.
      // The field at the circle's centre, the mean height over the turn so far, sets the period it should keep.
      if (!r.done) { r.ys += L.y[i]; r.yn++; }
      const Bc = L.Bz(r.ys / r.yn), w = Math.abs(q * Bc);
      if (pure && B0 !== 0 && !r.done && w * dt < 2.4 && Math.hypot(ux, uy) > 1) {
        const d = Math.atan2(r.ux * uy - r.uy * ux, r.ux * ux + r.uy * uy);
        r.turn += Math.abs(d);
        if (r.turn >= TAU && Math.abs(d) > 0) {
          r.done = true;
          const back = (r.turn - TAU) / Math.abs(d) * dt, T = t - back - r.t0, th = TAU / w;
          const dx = L.x[i] - vx * back - r.x0, dy = L.y[i] - vy * back - r.y0, vd = Math.hypot(dx, dy) / T;
          S.periods.push(r.speed);
          N.add({ kind: 'gyration', group: 'gyrations', show: choose(L, r.pid), title: `Particle ${r.pid} went once round in ${secs(T)}`,
            body: `Its velocity turned through a full circle in <b>${secs(T)}</b>. The magnetic force, qv × B, always pushes at right angles to the motion, so it bends the path into a circle without changing the speed, and the time round is 2πm/|q|B = <b>${secs(th)}</b> for q/m = ${q.toFixed(2)} in ${Math.abs(Bc).toFixed(2)} T: ${pc(Math.abs(T / th - 1))} apart. Its circle's radius, v/ω, is ${fmtQ(L, 'len', r.speed / w, { prefix: true })}.` });
          // The drift across a turn: the circle's centre moving, set beside E/B or the grad-B formula.
          if (!S.drifted && vd > 0.5) {
            if (E0 !== 0 && L.p.gradB === 0) {
              const th2 = Math.abs(E0 / B0);
              S.drifted = true;
              N.add({ kind: 'drift', key: 'drift|exb', tone: 'key', show: choose(L, r.pid), title: 'Crossed fields: the circles drift sideways',
                body: `Over that turn the circle's centre moved <b>${spd(L, vd)}</b> ${dx > 0 ? 'to the right' : 'to the left'}, along E × B. On the half of each circle where it moves with the electric push it speeds up and its curve widens; against it, it slows and tightens, so the circles walk sideways at E/B = <b>${spd(L, th2)}</b> (${pc(Math.abs(vd / th2 - 1))} apart). Charge, mass and speed all drop out: every particle drifts the same way at the same speed.` });
            } else if (E0 === 0 && L.p.gradB > 0) {
              const g = L.p.gradB * B0 / (L.h / 2), v2 = r.speed * r.speed, th2 = v2 / (2 * Math.abs(q * Bc)) * Math.abs(g / Bc), off = Math.abs(vd / th2 - 1);
              const span = Math.abs(g) * r.speed / w / Math.abs(Bc);
              S.drifted = true;
              N.add({ kind: 'drift', key: 'drift|gradb', tone: 'key', show: choose(L, r.pid), title: 'A stronger field below: the circles drift',
                body: `Over that turn the circle's centre moved <b>${spd(L, vd)}</b> ${dx > 0 ? 'to the right' : 'to the left'}. B grows down the screen, so each circle is tighter on its lower side than its upper, and the loop does not close: the gradient drift, v = (v⊥²/2ω)(∇B/B) = <b>${spd(L, th2)}</b> here, ${off < 0.15 ? `within ${pc(off)}` : `${pc(off)} apart, because that formula assumes the field barely changes across one circle, and here it changes by ±${pc(span)}`}. Its direction depends on the sign of the charge, so positive and negative particles drift apart: that separation is how currents arise in the Earth's radiation belts.` });
            }
          }
        }
      }
      r.ux = ux; r.uy = uy;

      // 2. Trapped by a charge: total energy below the level needed to reach far away, with no field to carry it off.
      if (!r.trapped && B0 === 0 && E0 === 0 && L.charges.length && r.seen > 2) {
        const en = L.energyOf(i);
        if (en.et < 0) {
          r.trapped = true;
          let best = null, bd = Infinity; for (const c of L.charges) { const dd = Math.hypot(c.x - L.x[i], c.y - L.y[i]); if (c.q * q < 0 && dd < bd) { bd = dd; best = c; } }
          N.add({ kind: 'trapped', group: 'trapped particles', show: choose(L, r.pid), title: `Particle ${r.pid} is trapped`,
            body: `Its energy per kilogram, ½v² + (q/m)V = <b>${fmtSI(en.et)}</b>, is below zero, the level it would need to get far away from every charge, so it cannot leave${best ? ` the ${best.q > 0 ? '+' : '−'}${Math.abs(best.q)} charge` : ''}: an inverse-square attraction holds it on an orbit, the electrical twin of a planet's.` });
        }
      }
      r.lx = L.x[i]; r.ly = L.y[i];
    }

    // 3. A gyration's period does not depend on speed: told once three particles at different speeds have been timed.
    if (!S.same && S.periods.length >= 3) {
      let lo = Infinity, hi = 0; for (const v of S.periods) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (hi > 1.4 * lo) {
        S.same = true;
        N.add({ kind: 'gyration', key: 'isochronous', tone: 'key', title: 'Fast or slow, the same time round',
          body: `Particles from ${spd(L, lo)} to ${spd(L, hi)} each took the same time to go round: a faster one runs a wider circle (radius v/ω) at the same angular rate, ω = |q|B/m. That independence is what lets a cyclotron accelerate particles with a fixed-frequency voltage: they stay in step however fast they get.` });
      }
    }

    // 4. Falling into a charge, or leaving the bench: the particles that are gone. One erased by hand, or cleared,
    //    goes without a word, and its record with it, so the next particles are timed in its place.
    const absorbed = L.absorbed - S.absorbed, escaped = L.escaped - S.escaped;
    for (const [pid, r] of S.recs) {
      if (r.look === S.look) continue;
      S.recs.delete(pid);
      if (absorbed > 0 || escaped > 0) {
        let best = null, bd = Infinity; for (const c of L.charges) { const dd = Math.hypot(c.x - r.lx, c.y - r.ly); if (c.q * r.q < 0 && dd < bd) { bd = dd; best = c; } }
        if (absorbed > 0 && best && bd < L.chargeR(best) * 3 && L.presetId === 'plates' && L.p.beam) { if (S.hits.length < 3) S.hits.push(r.lx); }
        else if (absorbed > 0 && best && bd < L.chargeR(best) * 3) N.add({ kind: 'absorbed', group: 'particles absorbed', title: `Particle ${pid} fell into a charge`,
          body: `It was ${r.q > 0 ? 'positive' : 'negative'}, and the ${best.q > 0 ? '+' : '−'}${Math.abs(best.q)} charge pulled it in: opposite charges attract, with a force growing as 1/r² as they close. A particle aimed slightly to one side would have swung round it instead.` });
        else if (escaped > 0) N.add({ kind: 'escape', group: 'particles gone', title: `Particle ${pid} left the bench`,
          body: `It crossed the edge of the bench and was taken out of the run.${B0 !== 0 ? ' A magnetic field can bend a path into a circle but never stop it, so a particle whose circle is wider than the bench runs off it.' : ' With nothing to turn it back, it simply kept going.'}` });
      }
    }
    S.absorbed = L.absorbed; S.escaped = L.escaped;

    // 5. Between the plates: the beam is pulled into the plate of opposite sign, as a ball thrown sideways falls to the
    //    floor. How far in it lands, set beside a uniform field's projectile: across the gap at (q/m)E, along at v₀.
    if (L.presetId === 'plates' && L.p.beam && !S.bent && S.hits.length >= 3 && L.probeVal && L.charges.length) {
      let x0 = Infinity, ytop = Infinity, ybot = -Infinity; for (const c of L.charges) { x0 = Math.min(x0, c.x); ytop = Math.min(ytop, c.y); ybot = Math.max(ybot, c.y); }
      const run = S.hits.reduce((s, x) => s + x, 0) / S.hits.length - x0, gap = (ybot - ytop) / 2, a = L.p.qm * L.probeVal.E, v0 = L.p.v0, land = v0 * Math.sqrt(2 * gap / a);
      S.bent = true;
      N.add({ kind: 'deflect', key: 'deflect', title: 'The beam falls into the plate',
        body: `The ${L.p.sign > 0 ? 'positive' : 'negative'} particles, fired along the middle at ${spd(L, v0)}, are pulled sideways by the field between the plates and strike the ${L.p.sign > 0 ? 'negative' : 'positive'} row about <b>${fmtQ(L, 'len', Math.max(0, run), { prefix: true })}</b> past its start. A ball thrown sideways falls to the floor the same way: in a uniform field of the strength at the centre, crossing the half-gap of ${fmtQ(L, 'len', gap, { prefix: true })} takes √(2d/a), in which time it runs v₀√(2d/a) = <b>${fmtQ(L, 'len', land, { prefix: true })}</b>. ${run < land ? 'They land sooner, as the field of the rows already bends them before the plates begin.' : 'They land later, as the field of rows of charges is weaker than a solid plate\'s.'} A faster beam, or a weaker field, would carry them through.` });
    }
    // 5b. Should the beam get through, the bend it leaves with.
    if (L.presetId === 'plates' && L.p.beam && !S.bent && L.probeVal && L.charges.length) {
      let x1 = 0, x0 = Infinity; for (const c of L.charges) { x1 = Math.max(x1, c.x); x0 = Math.min(x0, c.x); }
      // The particle that has got furthest between the plates, a quarter of their length in at least.
      let far = -1;
      for (let i = 0; i < L.n; i++) if (L.x[i] > x0 + 0.25 * (x1 - x0) && L.x[i] < x1 && (far < 0 || L.x[i] > L.x[far])) far = i;
      if (far >= 0) {
        const i = far, ang = Math.atan2(L.vy[i], L.vx[i]), v0 = L.p.v0, E = L.probeVal.E, run = L.x[i] - x0, th = Math.atan(Math.abs(L.qm[i]) * E * run / (v0 * v0));
        const deg = a => `${(Math.abs(a) * 180 / Math.PI).toFixed(1)}°`;
        S.bent = true;
        N.add({ kind: 'deflect', key: 'deflect', show: choose(L, L.pid[i]), title: `The beam bends ${deg(ang)} between the plates`,
          body: `Each particle enters the plates at ${spd(L, v0)} and feels a steady sideways push from the field between them, so its path bends into a parabola, as a ball thrown sideways falls. ${fmtQ(L, 'len', run, { prefix: true })} in, it is heading <b>${deg(ang)}</b> off its first line, toward the plate of opposite sign. A uniform field of the strength at the centre, acting over that run, gives atan((q/m)EL/v²) = <b>${deg(th)}</b>; the rows of charges make a field that ${Math.abs(ang) < th * 0.9 ? 'is weaker near their ends' : 'is close to uniform'}${Math.abs(ang) > th * 1.1 ? ', and stronger close to each row of charges, where the beam now runs' : ''}.` });
      }
    }
  },
};
