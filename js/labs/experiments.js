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
      init: lab => ({ k0: lab.stats().etot }),
      check(lab, c) {
        const k = lab.stats().etot, f = c.k0 ? k / c.k0 : 1;
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
      steps: ['Pick the Obstacle tool.', 'Click three times in the path of the water to place three obstacles.'],
      init: lab => ({ base: lab.obs.length }),
      check(lab, c) { const k = Math.max(0, lab.obs.length - c.base); return { p: clamp01(k / 3), note: `${Math.min(k, 3)} of 3 obstacles placed` }; },
    },
  ],
  waves: [
    {
      id: 'fringes', title: 'Halve the fringe spacing', scene: 'double',
      goal: 'Bright fringes behind two slits sit at sin θ = mλ/d. Doubling the frequency halves the wavelength λ = c/f and packs the fringes twice as close.',
      steps: ['Note the fringe pattern on the detector chart.', 'Raise the source frequency f to at least twice its starting value.'],
      init: lab => ({ f0: lab.p.f }),
      check(lab, c) { const r = lab.p.f / c.f0; return { p: clamp01(r - 1), note: `f is ${r.toFixed(2)}× its starting value; λ = ${(lab.p.c / lab.p.f).toFixed(1)} cells` }; },
    },
    {
      id: 'steer', title: 'Steer the beam', scene: 'phased',
      goal: 'A phased array delays each source a little more than the last. The wavefronts tilt and the beam swings to sin θ = Δφ λ / (2π d).',
      steps: ['Change the source phase step Δφ.', 'Swing the main beam at least 20° off the axis.'],
      init: () => ({}),
      check(lab) {
        const st = lab.steering(), ang = st && Math.abs(st.s) <= 1 ? Math.abs(Math.asin(st.s)) * 180 / Math.PI : 0;
        return { p: clamp01(ang / 20), note: st && Math.abs(st.s) > 1 ? 'No main beam at this phase step' : `Beam at ${ang.toFixed(1)}°` };
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
        c.best = Math.max(c.best, lab.maxStretch); return { p: clamp01(c.best / 0.4), note: `Peak stretch ${(c.best * 100).toFixed(0)}%` };
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
      init: lab => { lab.probe = { x: lab.w * 0.25, y: lab.h * 0.3 }; lab.probeRead(); return { e0: Math.max(lab.probeVal.E, lab.K() / 2e4) }; },
      check(lab, c) {
        if (!lab.probeVal) return { p: 0, note: 'Place the probe' };
        const f = lab.probeVal.E / c.e0; return { p: f < 0.02 ? 1 : clamp01(0.95 * (1 - f)), note: `|E| at ${(f * 100).toFixed(1)}% of the start` };
      },
    },
    {
      id: 'period', title: 'One period for every speed', scene: 'cyclotron',
      goal: 'In a uniform magnetic field every particle circles in the same time T = 2πm/|q|B, however fast it goes. Faster particles only draw bigger circles.',
      steps: ['Watch the five particles for two cyclotron periods.', 'Each returns to its start together with the others, and no speed changes.'],
      init(lab) {
        const v = new Map(); for (let i = 0; i < lab.n; i++) v.set(lab.pid[i], Math.hypot(lab.vx[i], lab.vy[i]));
        return { v, time: 0, T: TAU / Math.abs(lab.p.qm * lab.p.B) };
      },
      check(lab, c, dt) {
        c.time += dt; let worst = 0;
        for (let i = 0; i < lab.n; i++) { const v0 = c.v.get(lab.pid[i]); if (v0) worst = Math.max(worst, Math.abs(Math.hypot(lab.vx[i], lab.vy[i]) / v0 - 1)); }
        if (!Number.isFinite(c.T)) return { p: 0, note: 'Turn the magnetic field back on' };
        return { p: clamp01(c.time / (2 * c.T)) * (worst < 0.01 ? 1 : 0.9), note: `${(c.time / c.T).toFixed(2)} periods · speeds steady to ${(worst * 100).toFixed(3)}%` };
      },
    },
    {
      id: 'drift', title: 'Same drift for every charge', scene: 'exb',
      goal: 'In crossed fields every particle drifts at E/B in the direction of E × B. Positive and negative charges circle opposite ways but travel together.',
      steps: ['Run the crossed-field scene for two cyclotron periods.', 'Compare how far the amber and cyan particles have moved sideways.'],
      init(lab) {
        const x = new Map(); for (let i = 0; i < lab.n; i++) x.set(lab.pid[i], [lab.x[i], lab.qm[i]]);
        return { x, time: 0, T: TAU / Math.abs(lab.p.qm * lab.p.B), vd: lab.p.E0 / lab.p.B };
      },
      check(lab, c, dt) {
        c.time += dt; const sum = { 1: [0, 0], '-1': [0, 0] };
        for (let i = 0; i < lab.n; i++) { const s = c.x.get(lab.pid[i]); if (s) { const k = s[1] > 0 ? 1 : '-1'; sum[k][0] += lab.x[i] - s[0]; sum[k][1]++; } }
        const pos = sum[1][1] ? sum[1][0] / sum[1][1] : NaN, neg = sum['-1'][1] ? sum['-1'][0] / sum['-1'][1] : NaN;
        if (!Number.isFinite(pos) || !Number.isFinite(neg)) return { p: 0, note: 'Needs particles of both signs; Reset the scene' };
        return { p: clamp01(c.time / (2 * c.T)), note: `Moved: + ${pos.toFixed(0)} px · − ${neg.toFixed(0)} px · E/B × t = ${(c.vd * c.time).toFixed(0)} px` };
      },
    },
  ],
};
