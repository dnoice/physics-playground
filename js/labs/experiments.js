/*
✒ Metadata
    - Title: Guided Experiments (digiSpace Edition - v2.0)
    - File Name: experiments.js
    - Relative Path: js/labs/experiments.js
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: guided experiments, one of the
      recommendations he asked to implement.
    Earlier entries: see CHANGELOG.md

✒ Description:
    The curriculum: two or three guided experiments per lab, each with a
    scene, a goal, steps and a live check against the lab's own state.

✒ Key Features:
    - 15 experiments across the seven labs, from the virial theorem to E × B
      drift.
    - Checks read lab state (energy, peaks, counts), never formatted
      readouts.
    - Each check returns progress and a one-line reading for the banner and
      card.

✒ Usage Instructions:
    Add an entry under the lab id: { id, title, scene, goal, steps,
    init(lab), check(lab, ctx, dt) → { p, note } }.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import { TAU } from '../core/util.js';

/* ================================================================== */
/*  Guided experiments: the curriculum for every lab                   */
/* ================================================================== */
/* Each experiment names the scene it starts from, a goal, the steps, and
   a check the shell runs four times a second while the experiment is
   active. init(lab) returns the per-run memory; check(lab, ctx, dt) gets
   the simulated seconds since the last check and returns { p, note }:
   progress from 0 to 1 and a one-line reading. Checks read the lab's own
   state, never its formatted readouts. */
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const secs = v => `${v.toFixed(1)} s`;
/* The field settings a charged orbit depends on; a change starts its measurement over. */
const fieldKey = lab => [lab.p.B, lab.p.gradB, lab.p.E0, lab.p.k].join();

export const EXPERIMENTS = {
  gravity: [
    {
      id: 'virial', title: 'Check the virial theorem', scene: 'solar',
      goal: 'For a bound system of orbits, the time average of twice the kinetic energy equals minus the potential energy: ⟨2K⟩ = −⟨U⟩.',
      steps: ['Let the star system run for 20 simulated seconds.', 'Watch the virial ratio 2K / |U| in the readouts swing around 1.'],
      init: () => ({ sum: 0, time: 0 }),
      check(lab, c, dt) {
        if (lab.PE) { c.sum += dt * 2 * lab.KE / Math.abs(lab.PE); c.time += dt; }
        const avg = c.time ? c.sum / c.time : NaN, ok = Math.abs(avg - 1) < 0.15;
        return { p: clamp01(c.time / 20) * (c.time >= 20 && !ok ? 0.95 : 1), note: c.time ? `⟨2K/|U|⟩ = ${avg.toFixed(3)} over ${secs(c.time)}` : 'Press play to start averaging' };
      },
    },
    {
      id: 'escape', title: 'Reach escape velocity', scene: 'solar',
      goal: 'A body escapes when its kinetic energy beats its binding energy, at speeds above √2 times the circular orbit speed.',
      steps: ['Pick the Throw tool.', 'Fling a body fast, away from the star.', 'Keep play running until it leaves the system.'],
      init: lab => ({ base: lab.escaped }),
      check(lab, c) { const k = lab.escaped - c.base; return { p: k > 0 ? 1 : 0, note: k > 0 ? 'A body escaped' : 'No escapes yet' }; },
    },
  ],
  collisions: [
    {
      id: 'thermal', title: 'Elastic gas keeps its energy', scene: 'gas',
      goal: 'With restitution e = 1 and no drag, collisions only trade energy between balls; the total stays fixed while speeds settle into the Maxwell–Boltzmann curve.',
      steps: ['Leave restitution at 1 and air drag at 0.', 'Run for 15 simulated seconds and watch the speed histogram fill in the curve.'],
      init: lab => ({ k0: lab.stats().etot, time: 0 }),
      check(lab, c, dt) {
        c.time += dt; const k = lab.stats().etot, d = c.k0 ? Math.abs(k / c.k0 - 1) : 0;
        if (d > 0.02) { c.k0 = k; c.time = 0; return { p: 0, note: 'Energy changed (a tool or setting); restarting the count' }; }
        return { p: clamp01(c.time / 15), note: `Energy within ${(d * 100).toFixed(2)}% for ${secs(c.time)}` };
      },
    },
    {
      id: 'drain', title: 'Drain the energy away', scene: 'gas',
      goal: 'Inelastic collisions (e < 1) turn kinetic energy into heat the simulation does not track, so the gas cools down.',
      steps: ['Lower restitution e to 0.6 or below.', 'Watch the kinetic energy fall until it is a quarter of where it started.'],
      init: lab => ({ k0: lab.stats().etot, KE0: lab.KE0, n: lab.n }),
      check(lab, c) {
        const k = lab.stats().etot, e = lab.p.e;
        // Freeze, Shake, a throw, the brushes and every physics slider reset KE0, and Erase changes the count: none of that is inelastic cooling.
        if (e > 0.6 || lab.p.drag > 0 || lab.KE0 !== c.KE0 || lab.n !== c.n || lab.grab || lab.brush) {
          Object.assign(c, { k0: k, KE0: lab.KE0, n: lab.n });
          return { p: 0, note: e > 0.6 ? `Lower restitution e to 0.6 or below; it is ${e.toFixed(2)}` : lab.p.drag > 0 ? 'Set air drag back to 0: only collisions may take the energy' : 'Energy changed by hand; restarting the count' };
        }
        if (!c.k0) return { p: 0, note: 'Nothing is moving; shake the box or Reset' };
        const f = k / c.k0;
        return { p: clamp01((1 - f) / 0.75), note: `${(f * 100).toFixed(0)}% of the starting energy left` };
      },
    },
  ],
  fluid: [
    {
      id: 'dam', title: 'Keep the water incompressible', scene: 'dam',
      goal: 'Real water barely compresses. The solver pushes particles apart wherever density rises above its rest value.',
      steps: ['Let the dam break and run for 8 simulated seconds.', 'Keep peak compression under 1.5×; stir gently if you stir at all.'],
      init: () => ({ time: 0 }),
      check(lab, c, dt) {
        if (lab.peak >= 1.5) { c.time = 0; return { p: 0, note: `Compressed to ${lab.peak.toFixed(2)}×; the count restarts` }; }
        c.time += dt; return { p: clamp01(c.time / 8), note: `Peak ${lab.peak.toFixed(2)}× for ${secs(c.time)}` };
      },
    },
    {
      id: 'posts', title: 'Build an obstacle course', scene: 'dam',
      goal: 'Obstacles split the flow, raise its local speed, and shed eddies behind them.',
      steps: ['Pick the Obstacle tool.', 'Click three times in the path of the water to place three obstacles.', 'Keep play running until moving water reaches all three.'],
      init: () => ({ wet: new Set() }),
      check(lab, c) {
        // A post counts once moving water touches it, so a click in dry air adds nothing.
        const v2 = (60 * lab.TICK / lab.U) ** 2;
        for (const o of lab.obs) {
          if (c.wet.has(o)) continue;
          const r2 = (o.r + 0.8) ** 2; let touching = 0;
          for (let i = 0; i < lab.n; i++) if ((lab.x[i] - o.x) ** 2 + (lab.y[i] - o.y) ** 2 < r2 && lab.vx[i] ** 2 + lab.vy[i] ** 2 > v2) touching++;
          if (touching >= 5) c.wet.add(o);
        }
        const k = lab.obs.filter(o => c.wet.has(o)).length;
        return { p: clamp01(k / 3), note: `${Math.min(k, 3)} of 3 obstacles in the flow · ${lab.obs.length} placed` };
      },
    },
  ],
  waves: [
    {
      id: 'fringes', title: 'Halve the fringe spacing', scene: 'double',
      goal: 'Bright fringes behind two slits sit at sin θ = mλ/d. Doubling the frequency halves the wavelength λ = c/f and packs the fringes twice as close.',
      steps: ['Note the fringe pattern on the detector chart.', 'Raise the source frequency f to at least twice its starting value.', 'Keep play running until the new fringes reach the detector.'],
      init: () => ({}),
      check(lab) {
        const f0 = lab.presets.find(p => p.id === this.scene).params.f, r = lab.p.f / f0, s = lab.fringeSpacing(), k = s / lab.fringeTheory(f0);
        if (!Number.isFinite(s)) return { p: 0, note: `f is ${r.toFixed(2)}× the scene's ${f0} Hz; fewer than two fringes on the detector so far` };
        return { p: Math.min(clamp01((1 - k) / 0.4), clamp01(r - 1)), note: `Fringes ${s.toFixed(0)} cells apart, ${k.toFixed(2)}× the spacing at ${f0} Hz; f is ${r.toFixed(2)}× that` };
      },
    },
    {
      id: 'steer', title: 'Steer the beam', scene: 'phased',
      goal: 'A phased array delays each source a little more than the last. The wavefronts tilt and the beam swings to sin θ = Δφ λ / (2π d).',
      steps: ['Change the source phase step Δφ.', 'Swing the main beam at least 20° off the axis.', 'Keep play running until the new beam reaches the far side of the tank.'],
      init: () => ({ since: 0, key: '', p: 0 }),
      check(lab, c) {
        const st = lab.steering(), key = [lab.p.phaseStep, lab.p.f, lab.p.c].join();
        if (!st) return { p: 0, note: 'Needs two or more point sources; Reset the scene' };
        if (Math.abs(st.s) > 1) return { p: 0, note: 'No main beam at this phase step' };
        // The arc reads true only once waves of this setting have crossed the tank and filled the 1.2 s intensity average.
        if (key !== c.key) { c.key = key; c.since = lab.t; }
        const ang = lab.t - c.since < lab.Nx * 0.6 / lab.p.c + 3 ? NaN : Math.abs(lab.beamAngle());
        if (!Number.isFinite(ang)) return { p: c.p, note: 'Waiting for the beam to cross the tank' };
        // The scene opens with its beam measured near 15°, so progress counts from just past there.
        c.p = ang >= 20 ? 1 : clamp01((ang - 16) / 4);
        return { p: c.p, note: `Beam measured at ${ang.toFixed(0)}°` };
      },
    },
  ],
  chaos: [
    {
      id: 'diverge', title: 'Time the butterfly effect', scene: 'chaos',
      goal: 'Copies that start 10⁻⁴ rad apart separate exponentially, δ(t) ≈ δ₀ e^{λt}, until the gap is as large as the motion itself.',
      steps: ['Run the sensitive start.', 'Watch the separation chart climb in a straight line on its log scale until the copies split.'],
      init: () => ({}),
      check(lab) {
        const s = lab.sep.last(), lo = Math.log10(lab.p.delta), p = Number.isFinite(lab.divergeAt) ? 1 : Number.isFinite(s) ? clamp01((s - lo) / (-1 - lo)) : 0;
        return { p, note: Number.isFinite(lab.divergeAt) ? `Diverged at t = ${lab.divergeAt.toFixed(2)} s, λ ≈ ${lab.lyap.toFixed(2)} s⁻¹` : `log₁₀ δ = ${Number.isFinite(s) ? s.toFixed(2) : '—'}` };
      },
    },
    {
      id: 'calm', title: 'Find the predictable regime', scene: 'calm',
      goal: 'At small swings the double pendulum is nearly linear: copies that start close stay close, and the motion is a sum of two normal modes.',
      steps: ['Run the small swing for 20 simulated seconds.', 'The copies should never diverge.'],
      init: () => ({ time: 0 }),
      check(lab, c, dt) {
        if (lab.N < 2) return { p: 0, note: 'One copy has nothing to diverge from; raise Copies to 2 or more' };
        if (Number.isFinite(lab.divergeAt)) return { p: 0, note: 'The copies diverged; lower the starting angles' };
        c.time += dt; return { p: clamp01(c.time / 20), note: `Still together after ${secs(c.time)}` };
      },
    },
  ],
  cloth: [
    {
      id: 'stretch', title: 'Stretch without tearing', scene: 'hammock',
      goal: 'Each link breaks past its tear stretch. Below that the cloth is elastic: pull it hard and let go, and it springs back.',
      steps: ['Pick the Grab tool.', 'Pull the hammock until some link stretches 40% past its rest length.', 'Do not tear a single link.'],
      init: lab => ({ base: lab.L - lab.aliveCount, best: 0 }),
      check(lab, c) {
        if (lab.L - lab.aliveCount > c.base) return { p: 0, note: 'A link tore; Reset to try again' };
        // The hammock's own weight stretches it too, so only a pull counts.
        if (lab.grab) c.best = Math.max(c.best, lab.maxStretch);
        return { p: clamp01(c.best / 0.4), note: lab.grab || c.best ? `Peak stretch while pulling ${(c.best * 100).toFixed(0)}%` : 'Grab the cloth and pull' };
      },
    },
    {
      id: 'tear', title: 'Tear the curtain apart', scene: 'curtain',
      goal: 'Tearing concentrates stress: once one link breaks, its neighbours carry the load and the rip runs along the cloth.',
      steps: ['Cut or pull the curtain.', 'Break at least 15% of all its links.'],
      init: lab => ({ base: lab.L - lab.aliveCount }),
      check(lab, c) { const k = lab.L - lab.aliveCount - c.base, f = lab.L ? k / lab.L : 0; return { p: clamp01(f / 0.15), note: `${(f * 100).toFixed(1)}% of links broken` }; },
    },
  ],
  fields: [
    {
      id: 'zero', title: 'Find a point of zero field', scene: 'quad',
      goal: 'Between four alternating charges the fields cancel at the centre. The potential there is flat, so no field line passes through it.',
      steps: ['Pick the Probe tool.', 'Drag the field meter until |E| falls below 2% of its starting reading.'],
      init: lab => { lab.probe = { x: lab.w * 0.25, y: lab.h * 0.3 }; lab.probeRead(); return { e0: Math.max(lab.probeVal.E, lab.K() / 2e4), built: lab.built }; },
      check(lab, c) {
        // A Reset at t = 0 rebuilds the scene without moving the clock, and the scene puts the probe on the very point being sought.
        if (lab.built !== c.built) Object.assign(c, this.init(lab));
        if (lab.charges.length < 4) return { p: 0, note: 'The four charges are gone; Reset the scene' };
        if (!lab.probeVal) return { p: 0, note: 'Place the probe' };
        const f = lab.probeVal.E / c.e0; return { p: f < 0.02 ? 1 : clamp01(0.95 * (1 - f)), note: `|E| at ${(f * 100).toFixed(1)}% of the start` };
      },
    },
    {
      id: 'period', title: 'One period for every speed', scene: 'cyclotron',
      goal: 'In a uniform magnetic field every particle circles in the same time T = 2πm/|q|B, however fast it goes. Faster particles only draw bigger circles.',
      steps: ['Watch the five particles for two cyclotron periods.', 'Each returns to its start together with the others, and no speed changes.'],
      init(lab) {
        const orbits = new Map(); let w = 0;
        for (let i = 0; i < lab.n; i++) { w = lab.qm[i] * lab.p.B; orbits.set(lab.pid[i], { x: lab.x[i], y: lab.y[i], rx: -lab.vy[i] / w, ry: lab.vx[i] / w, v: Math.hypot(lab.vx[i], lab.vy[i]), w }); }
        return { orbits, time: 0, T: TAU / Math.abs(w), key: fieldKey(lab) };
      },
      check(lab, c, dt) {
        if (fieldKey(lab) !== c.key) Object.assign(c, this.init(lab)); else c.time += dt;
        if (!Number.isFinite(c.T)) return { p: 0, note: 'Turn the magnetic field back on' };
        // The return error, sampled at any moment: how far each particle sits from the start point carried round a circle of period T.
        let worst = 0, off = 0, miss = 0, k = 0;
        for (let i = 0; i < lab.n; i++) {
          const s = c.orbits.get(lab.pid[i]); if (!s) continue;
          const a = s.w * c.time, ca = Math.cos(a), sa = Math.sin(a), d = Math.hypot(lab.x[i] - (s.x - s.rx + ca * s.rx + sa * s.ry), lab.y[i] - (s.y - s.ry - sa * s.rx + ca * s.ry));
          worst = Math.max(worst, Math.abs(Math.hypot(lab.vx[i], lab.vy[i]) / s.v - 1)); off = Math.max(off, d); miss = Math.max(miss, d / Math.hypot(s.rx, s.ry)); k++;
        }
        if (k < 2) return { p: 0, note: 'Needs at least two of the particles; Reset the scene' };
        return { p: clamp01(c.time / (2 * c.T)) * (worst < 0.01 && miss < 0.02 ? 1 : 0.9), note: `${(c.time / c.T).toFixed(2)} periods of ${c.T.toFixed(2)} s · return error ${off.toFixed(1)} px · speeds steady to ${(worst * 100).toFixed(3)}%` };
      },
    },
    {
      id: 'drift', title: 'Same drift for every charge', scene: 'exb',
      goal: 'In crossed fields every particle drifts at E/B in the direction of E × B. Positive and negative charges circle opposite ways but travel together.',
      steps: ['Run the crossed-field scene for two cyclotron periods.', 'Compare how far the amber and cyan particles have moved sideways.'],
      init(lab) {
        const x = new Map(); let w = 0;
        for (let i = 0; i < lab.n; i++) { w = lab.qm[i] * lab.p.B; x.set(lab.pid[i], [lab.x[i] + lab.vy[i] / w, lab.qm[i]]); }
        return { x, time: 0, T: TAU / Math.abs(w), vd: lab.p.E0 / lab.p.B, key: fieldKey(lab) };
      },
      check(lab, c, dt) {
        if (fieldKey(lab) !== c.key) Object.assign(c, this.init(lab)); else c.time += dt;
        if (!Number.isFinite(c.T)) return { p: 0, note: 'Turn the magnetic field back on' };
        if (!c.vd) return { p: 0, note: 'With E₀ = 0 nothing drifts; turn the electric field back on' };
        // Each particle's guiding centre, x + vy/ω, drifts without the cycloid's wobble, so this holds between whole periods too.
        const sum = { 1: [0, 0], '-1': [0, 0] };
        for (let i = 0; i < lab.n; i++) { const s = c.x.get(lab.pid[i]); if (s) { const k = s[1] > 0 ? 1 : '-1'; sum[k][0] += lab.x[i] + lab.vy[i] / (s[1] * lab.p.B) - s[0]; sum[k][1]++; } }
        const pos = sum[1][1] ? sum[1][0] / sum[1][1] : NaN, neg = sum['-1'][1] ? sum['-1'][0] / sum['-1'][1] : NaN, want = c.vd * c.time;
        if (!Number.isFinite(pos) || !Number.isFinite(neg)) return { p: 0, note: 'Needs particles of both signs; Reset the scene' };
        const miss = Math.max(Math.abs(pos - want), Math.abs(neg - want));
        return { p: clamp01(c.time / (2 * c.T)) * (miss < Math.max(2, 0.03 * Math.abs(want)) ? 1 : 0.9), note: `Moved: + ${pos.toFixed(0)} px · − ${neg.toFixed(0)} px · E/B × t = ${want.toFixed(0)} px` };
      },
    },
  ],
};
