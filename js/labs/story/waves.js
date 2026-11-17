/*
✒ Metadata
    - Title: Waves Narrator (digiSpace Edition - v2.19)
    - File Name: waves.js
    - Relative Path: js/labs/story/waves.js
    - Artifact Type: javascript
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one way to select: Show me selects a source through
      the lab's select().
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for Insights that narrate the run: the wavelength
      measured crest to crest against c/f, fringe spacing against the slit
      law, the steered beam, standing waves off reflecting edges, what the
      absorbing edges take, the Doppler squeeze and the lens's focus.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Mixed into the Waves lab by the registry: narrate(N) reads the wave
    field and the detector four times a second and tells the Story what the
    tank shows, measured, beside the law it should obey.

✒ Key Features:
    - Wavelength from the zero crossings along a row, with the cells per
      wavelength that set the grid's dispersion.
    - Double-slit fringes, the phased array's beam angle and the lens's
      brightest point on the axis, each against its formula.
    - Standing waves when the edges reflect; the share an absorbing edge
      removes; the Doppler wavelengths ahead of and behind a moving source,
      and the Mach cone past c.

✒ Other Important Information:
    - Dependencies: none beyond the modules it imports
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - A look reads a few rows of the grid, never the whole field.
---------
*/
import { fmtQ, sig } from '../../core/units.js';
import { selectView } from '../../shell/dock.js';

let S = null;
const len = (L, cells) => fmtQ(L, 'len', cells, { prefix: true }), spd = (L, v) => fmtQ(L, 'speed', v, { prefix: true });
const pc = x => `${sig(x * 100, 2)} %`;
const degs = r => `${(r * 180 / Math.PI).toFixed(1)}°`;
const intensity = L => ({ label: 'Show the intensity', can: () => L.p.view !== 'int', run() { selectView('int'); } });

function start(L, t) { S = { t0: t, holds: new Map(), filled: NaN }; }
/* A condition seen on n looks in a row, by key. */
function hold(key, ok, n) {
  if (!ok) { S.holds.delete(key); return false; }
  const k = (S.holds.get(key) || 0) + 1; S.holds.set(key, k); return k >= n;
}
/* The mean spacing of upward zero crossings of the displacement along row y, from x0 to x1 (cells), placed by linear
   interpolation; NaN with fewer than three crossings. */
function crestSpacing(L, y, x0, x1, dir = 1) {
  const u = L.u, Nx = L.Nx, row = Math.round(y) * Nx;
  let first = NaN, last = NaN, k = 0;
  for (let x = x0; dir > 0 ? x < x1 : x > x1; x += dir) {
    const a = u[row + x], b = u[row + x + dir];
    if (a < 0 && b >= 0) { const at = x + dir * (-a / (b - a)); if (!k) first = at; last = at; k++; }
  }
  return k >= 3 ? Math.abs(last - first) / (k - 1) : NaN;
}
/* The first wall or glass along row y to the right of x, or the absorbing edge. */
function clearTo(L, y, x) {
  const row = Math.round(y) * L.Nx, end = L.Nx - (L.p.absorb ? L.Ls : 2) - 2;
  for (; x < end; x++) if (L.wall[row + x] || L.glass[row + x]) return x - 2;
  return end;
}
function meanI(L, x, y0, y1) { let s = 0, n = 0; for (let y = y0; y <= y1; y++) { s += L.inten[y * L.Nx + x]; n++; } return n ? s / n : 0; }

export const wavesStory = {
  storyHint: 'Let the sources run, or change the frequency, the edges or the source\'s speed: the wavelength, fringes, beams, standing waves, the Doppler shift and the lens\'s focus are measured here as they form.',
  narrate(N) {
    const L = this, t = N.t, c = L.p.c, f = L.p.f, Nx = L.Nx, Ny = L.Ny, cy = Ny >> 1;
    if (N.fresh || !S) start(L, t);
    const pts = L.sources.filter(s => s.type === 'point'), line = L.sources.find(s => s.type === 'line');
    const src = line || pts[0];
    if (!src) return;
    const lam = c / (f * (src.fm || 1)), ran = L.time - src.t0, moving = L.p.srcSpeed > 0 && !line;

    // 1. The wavelength, crest to crest, against c/f; the grid's cells per wavelength set how true it holds.
    if (!moving) {
      const y = line ? cy : src.y, x0 = Math.round(src.x) + 4, x1 = clearTo(L, y, x0);
      if (x1 - x0 > 2.5 * lam && ran > (x1 - x0) / c + 1) {
        const m = crestSpacing(L, y, x0, x1), off = Math.abs(m / lam - 1);
        if (hold('lambda', Number.isFinite(m) && off < 0.08, 2)) {
          const cells = lam, slow = m < lam;
          N.add({ kind: 'arrive', group: 'wavelengths', key: `lambda|${f}|${c}`, title: `Crest to crest: ${len(L, m)}`,
            body: `The waves measure <b>${len(L, m)}</b> from one crest to the next, and c/f = ${spd(L, c)} ÷ ${(f * (src.fm || 1)).toFixed(2)} Hz gives <b>${len(L, lam)}</b>: ${pc(off)} apart. Each wavelength spans ${cells.toFixed(1)} grid cells${cells < 12 ? ', few enough that the grid slows short waves a little (numerical dispersion), so they come out short' : `, so the grid follows them closely${slow && off > 0.01 ? '; the small shortfall is its slight numerical dispersion' : ''}`}. Raise f and the crests crowd closer, λ = c/f.` });
        }
      }
    }

    // 2. Double-slit fringes on the detector line, against 2 L tan θ with sin θ = λ/2d.
    if (L.slits && line) {
      const m = L.fringeSpacing(), th = L.fringeTheory(f), settle = ran > (L.detectorX() - src.x) / c + 4;
      if (settle && hold('fringes', Number.isFinite(m) && Math.abs(m / th - 1) < 0.12, 3)) {
        const s = lam / (2 * L.slits.d);
        N.add({ kind: 'fringes', group: 'fringe patterns', key: `fringes|${f}|${c}`, tone: 'key', show: intensity(L), title: 'Interference fringes have formed',
          body: `On the detector line the dark bands either side of the centre lie <b>${len(L, m)}</b> apart. Waves from the two slits, d = ${len(L, L.slits.d)} apart, arrive in step where their paths differ by whole wavelengths and cancel where they differ by half of one: sin θ = λ/2d = ${s.toFixed(3)} puts the first dark bands ${len(L, th)} apart at ${len(L, L.detectorX() - L.slits.x)} from the slits. Measured against theory: ${pc(Math.abs(m / th - 1))}.` });
      }
    }

    // 3. The phased array's beam, against asin(Δφ λ / 2π d).
    const st = pts.length > 2 && L.p.phaseStep !== 0 && !moving ? L.steering() : null;
    if (st && st.row && Math.abs(st.s) <= 1 && ran > Nx / c + 3) {
      const a = L.beamAngle(), th = Math.asin(st.s) * 180 / Math.PI;
      if (hold('beam', Number.isFinite(a) && Math.abs(a - th) < 3, 3)) N.add({ kind: 'beam', group: 'beams', key: `beam|${L.p.phaseStep}|${f}|${c}`, show: intensity(L), title: `The beam is steered ${a.toFixed(1)}°`,
        body: `The array's main beam leaves at <b>${a.toFixed(1)}°</b> off its axis. Each source lags the one before by Δφ = ${L.p.phaseStep}°, so the wavefronts add up in step only along the angle where the path difference makes up that lag: sin θ = Δφ λ / 2πd with d = ${len(L, st.d)}, which gives <b>${th.toFixed(1)}°</b>. Radar and 5G antennas steer this way, with no moving parts.` });
    }

    // 4. The edges: reflecting ones build standing waves; absorbing ones swallow nearly everything.
    const cross = (Nx - src.x) / c;
    if (!L.p.absorb && ran > 3 * cross && hold('standing', L.maxU > 1.5, 2)) {
      N.add({ kind: 'standing', key: 'edges|reflect', title: 'Reflections build standing waves',
        body: `With the edges reflecting, every wave stays in the tank: in ${sig(ran, 2)} s the waves have crossed it about ${Math.floor(ran / cross)} times, and the displacement now peaks at <b>${L.maxU.toFixed(1)}</b>, ${L.maxU.toFixed(1)} times the source's own. Incoming and returning waves add into a pattern whose nodes stay still while the antinodes swing, half a wavelength (${len(L, lam / 2)}) apart. Only the damping γ = ${L.p.damp}/s limits how high it builds.` });
    }
    if (L.p.absorb && ran > cross + 2.5 && !N.said('edges|absorb')) {
      const y0 = L.Ls + 2, y1 = Ny - L.Ls - 3, inner = meanI(L, Nx - L.Ls - 1, y0, y1), outer = meanI(L, Nx - 4, y0, y1);
      if (inner > 1e-4) N.add({ kind: 'absorb', key: 'edges|absorb', title: 'The absorbing edges swallow the waves',
        body: `Of the wave intensity that enters the right-hand edge strip, only <b>${pc(Math.min(1, outer / inner))}</b> is left by the wall, and whatever reflects must cross the strip again, so about ${pc(Math.min(1, outer / inner) ** 2)} comes back into the tank. The damping rises gently over ${len(L, L.Ls)}, so a wave never meets a sudden change that it could reflect from: it fades away instead, as it would running out across an open sea.` });
    }

    // 5. A moving source: bunched waves ahead, stretched behind, or a Mach cone once it outruns them.
    if (moving && pts.length === 1 && ran > 2) {
      const s = pts[0], M = L.p.srcSpeed;
      if (M < 1) {
        const ahead = crestSpacing(L, s.y, Math.round(s.x) + 3 * s.dir, s.dir > 0 ? Nx - L.Ls - 3 : L.Ls + 3, s.dir), behind = crestSpacing(L, s.y, Math.round(s.x) - 3 * s.dir, s.dir > 0 ? L.Ls + 3 : Nx - L.Ls - 3, -s.dir);
        const ta = lam * (1 - M), tb = lam * (1 + M);
        if (hold('doppler', Math.abs(ahead / ta - 1) < 0.2 && Math.abs(behind / tb - 1) < 0.2, 2)) N.add({ kind: 'doppler', group: 'Doppler shifts', key: `doppler|${M}|${f}`, show: { label: 'Select the source', can: () => L.sources.includes(s), run() { L.select(s.id); } }, title: 'Waves bunch ahead, stretch behind',
          body: `Moving at ${M.toFixed(2)} c, the source chases the waves it sends forward and runs from those it sends back. Ahead they measure <b>${len(L, ahead)}</b> crest to crest, against λ(1 − M) = ${len(L, ta)}; behind, <b>${len(L, behind)}</b> against λ(1 + M) = ${len(L, tb)}. A listener ahead hears f/(1 − M) = ${(f / (1 - M)).toFixed(2)} Hz: the rising pitch of an approaching siren.` });
      } else if (!N.said(`mach|${M}`)) {
        N.add({ kind: 'doppler', group: 'Doppler shifts', key: `mach|${M}`, tone: 'key', title: `A Mach cone at ${M.toFixed(2)} c`,
          body: `The source now outruns its own waves, so none can travel ahead of it: they pile up along a cone whose half-angle is asin(1/M) = <b>${degs(Math.asin(1 / M))}</b>. That pile-up is a shock front, the sonic boom of an aircraft or the bow wave of a fast boat.` });
      }
    }

    // 6. The glass lens: the brightest point on the axis, against a thin lens's focal length R / 2(n − 1).
    if (L.presetId === 'lens' && line && ran > Nx / c + 4) {
      const row = cy * Nx; let xl = -1, xr = -1;
      for (let x = 0; x < Nx; x++) if (L.glass[row + x]) { if (xl < 0) xl = x; xr = x; }
      if (xl >= 0) {
        let best = 0, at = -1; for (let x = xr + 3; x < Nx - L.Ls - 2; x++) { const v = L.inten[row + x]; if (v > best) { best = v; at = x; } }
        const R = Ny * 0.75, fl = R / (2 * (L.p.glassN - 1)), mid = (xl + xr) / 2;
        if (hold('focus', at > 0, 3)) N.add({ kind: 'focus', group: 'foci', key: `focus|${L.p.glassN}|${f}|${c}`, show: intensity(L), title: 'The lens brings the waves to a focus',
          body: `The brightest point on the axis lies <b>${len(L, at - mid)}</b> beyond the middle of the lens. Waves cross the glass at c/n = ${spd(L, c / L.p.glassN)}, slowest where it is thickest, so the middle of each front falls behind its edges and the front curves toward a point. A thin lens of these surfaces (radius ${len(L, R)}, n = ${L.p.glassN}) focuses at R/2(n − 1) = ${len(L, fl)}${at - mid < fl * 0.8 ? '. The peak sits nearer: this lens is wide for its curvature, so waves through its outer parts cross the axis sooner (spherical aberration), and at a focus only a few wavelengths across, diffraction pulls the peak toward the lens as well' : ''}.` });
      }
    }
  },
};
