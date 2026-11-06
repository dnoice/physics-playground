"""
✒ Metadata
    - Title: Physics Check (digiSpace Edition - v2.1)
    - File Name: check.py
    - Relative Path: tests/check.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Every
      physical reading is now checked against what it should be instead of
      printed, the page starts in flat 2D mode and the marks come from the
      shared harness.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness.

✒ Description:
    Runs named scenes headless and checks their physics: figure-eight
    energy, the Kepler period, gas and pile statistics, fluid density, the
    wave Mach cone, chaos, the normal mode and the cloth flag, plus keyboard
    lab switching.

✒ Key Features:
    - Limits drawn from the physics: conservation, Maxwell thermalisation,
      fringe counts, the Lyapunov exponent and the normal-mode period.
    - Wall-clock limits only catch a hang: a shared machine can slow unchanged
      code dozens of times. Each mark carries the reading.
    - Keyboard lab switching, Space and tab focus.
    - Screenshots of every lab, with a floor under the live frame rate.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import math
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, shot

RUN = """
([id, preset, seconds, params]) => {
  const P = window.PhysicsPlayground; P.pause(); P.select(id); if (preset) P.preset(preset);
  const lab = P.active; if (params) { Object.assign(lab.p, params); }
  const h = lab.dt(); const n = Math.round(seconds / h); const t0 = performance.now();
  for (let i = 0; i < n; i++) { lab.step(h); lab.t += h; if (lab.after) lab.after(h); }
  return { steps: n, ms: performance.now() - t0 };
}
"""

def wrap(a):
    """An angle folded into -pi..pi."""
    return (a + math.pi) % (2 * math.pi) - math.pi

with sync_playwright() as p:
    b = launch(p)
    pg = open_page(b, viewport={"width": 1440, "height": 900})
    pg.goto(URL); pg.wait_for_timeout(1500)

    def run(name, lab, preset, seconds, params=None):
        """Run a scene headless and catch a hung solver. The limit is deliberately loose:
        unchanged code has measured 66 times slower while other jobs shared the machine."""
        r = pg.evaluate(RUN, [lab, preset, seconds, params])
        ok(name + "_finishes_in_time", r["ms"] < seconds * 20000, f"{r['ms']:.1f} ms, {r['ms'] / r['steps']:.3f} ms per step")
        return r

    # ---- live screenshots of each lab at default scene
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth"]:
        pg.evaluate("id => { PhysicsPlayground.select(id); PhysicsPlayground.play(); }", lab)
        pg.wait_for_timeout(3000)
        pg.screenshot(path=shot(f"{lab}.png"))
        fps = pg.evaluate("Math.round(PhysicsPlayground.perf.fps)")
        ok(lab + "_fps", 2 <= fps <= 130, fps)

    # ---- gravity: figure-eight energy + boundedness over 30 s
    run("fig8", "gravity", "figure8", 30)
    r = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity; const E = g.energy();
      return { n: g.bodies.length, drift_pct: (E - g.E0) / Math.abs(g.E0) * 100,
               maxR: Math.max(...g.bodies.map(b => Math.hypot(b.x, b.y))) } }""")
    ok("fig8_three_bodies", r["n"] == 3, r["n"])
    ok("fig8_energy_conserved", abs(r["drift_pct"]) < 1e-4, r["drift_pct"])
    ok("fig8_stays_bounded", r["maxR"] < 200, round(r["maxR"], 1))
    run("solar", "gravity", "solar", 30)
    r = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity; const E = g.energy();
      return { n: g.bodies.length, majors: g.bodies.filter(b => b.m >= 0.3).length, merged: g.merged, escaped: g.escaped, drift_pct: (E - g.E0) / Math.abs(g.E0) * 100 } }""")
    # Phases are random and the comet's orbit crosses the planets, so a run can rightly lose the comet
    # or the moon to a merge. The star and six planets must survive, and every body must be accounted for.
    ok("solar_bodies_accounted_for", r["n"] + r["merged"] + r["escaped"] == 9, (r["n"], r["merged"], r["escaped"]))
    ok("solar_star_and_planets_survive", r["majors"] == 7, r["majors"])
    ok("solar_nothing_escapes", r["escaped"] == 0, r["escaped"])
    ok("solar_energy_conserved", abs(r["drift_pct"]) < 0.01, r["drift_pct"])
    # One Kepler period brings every planet back to its start, so the phase error is the period error.
    # Each tolerance is about 20 ms of motion at periapsis, where an eccentric orbit sweeps fastest.
    run("kepler", "gravity", "kepler", 8.55)
    angles = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity;
      return g.bodies.slice(1).map(b => Math.atan2(b.y, b.x)) }""")
    ok("kepler_three_planets", len(angles) == 3, len(angles))
    for name, start, tol, a in zip(["kepler_circular", "kepler_e045", "kepler_e075"], [0, 2.1, 4.2], [0.02, 0.05, 0.16], angles):
        ok(name + "_period", abs(wrap(a - start)) < tol, round(wrap(a - start), 4))

    # ---- collisions: KE conservation + thermalisation
    pg.evaluate("() => { PhysicsPlayground.select('collisions'); PhysicsPlayground.preset('gas'); }")
    ke0 = pg.evaluate("PhysicsPlayground.labs.collisions.stats().ke")
    ratio0 = pg.evaluate("""() => { const c = PhysicsPlayground.labs.collisions; let s=0, s2=0;
      for (let i=0;i<c.n;i++){ const v=Math.hypot(c.vx[i],c.vy[i]); s+=v; s2+=v*v; } return (s/c.n)/Math.sqrt(s2/c.n) }""")
    run("gas", "collisions", None, 20)
    r = pg.evaluate("""(ke0) => { const c = PhysicsPlayground.labs.collisions; let s=0, s2=0;
      for (let i=0;i<c.n;i++){ const v=Math.hypot(c.vx[i],c.vy[i]); s+=v; s2+=v*v; }
      return { ke_change_pct: (c.stats().ke - ke0)/ke0*100, mean_over_rms: (s/c.n)/Math.sqrt(s2/c.n), rayleigh: Math.sqrt(Math.PI)/2 } }""", ke0)
    ok("gas_starts_single_speed", abs(ratio0 - 1) < 1e-9, ratio0)
    ok("gas_energy_conserved", abs(r["ke_change_pct"]) < 1e-6, r["ke_change_pct"])
    ok("gas_thermalises_to_rayleigh", abs(r["mean_over_rms"] - r["rayleigh"]) < 0.04, (round(r["mean_over_rms"], 4), round(r["rayleigh"], 4)))
    run("pile", "collisions", "pile", 8)
    r = pg.evaluate("""() => { const c = PhysicsPlayground.labs.collisions; let maxOv=0;
      for (let i=0;i<c.n;i++) for (let j=i+1;j<c.n;j++){ const d=Math.hypot(c.x[j]-c.x[i],c.y[j]-c.y[i]); maxOv=Math.max(maxOv,(c.r[i]+c.r[j]-d)); }
      return { n: c.n, rms: c.stats().vrms, max_overlap_px: maxOv } }""")
    ok("pile_ball_count", r["n"] == 200, r["n"])
    ok("pile_settles", r["rms"] < 60, round(r["rms"], 1))
    ok("pile_overlap_small", r["max_overlap_px"] < 3, round(r["max_overlap_px"], 2))

    # ---- waves: stability + fringes
    run("double", "waves", "double", 15)
    r = pg.evaluate("""() => { const w = PhysicsPlayground.labs.waves; let m=0, bad=0;
      for (const v of w.u) { if (!Number.isFinite(v)) bad++; else m=Math.max(m,Math.abs(v)); }
      const xd=w.detectorX(), prof=[]; for (let y=0;y<w.Ny;y++) prof.push(w.inten[y*w.Nx+xd]);
      const mx=Math.max(...prof); let peaks=0; for (let y=2;y<prof.length-2;y++) if (prof[y]>prof[y-1]&&prof[y]>=prof[y+1]&&prof[y]>0.25*mx) peaks++;
      return { maxU: m, nonFinite: bad, detectorPeaks: peaks, Nx: w.Nx, Ny: w.Ny } }""")
    ok("double_finite", r["nonFinite"] == 0, r["nonFinite"])
    ok("double_bounded", 0 < r["maxU"] < 10, round(r["maxU"], 3))
    ok("double_fringes", r["detectorPeaks"] >= 3, r["detectorPeaks"])
    ok("double_grid_size", r["Nx"] > 100 and r["Ny"] > 50, (r["Nx"], r["Ny"]))
    run("mach", "waves", "doppler", 10, {"srcSpeed": 1.4, "c": 120})
    r = pg.evaluate("""() => { const w = PhysicsPlayground.labs.waves; let m=0, bad=0;
      for (const v of w.u) { if (!Number.isFinite(v)) bad++; else m=Math.max(m,Math.abs(v)); } return { maxU: m, nonFinite: bad } }""")
    ok("mach_finite", r["nonFinite"] == 0, r["nonFinite"])
    ok("mach_bounded", 0 < r["maxU"] < 5, round(r["maxU"], 3))

    # ---- chaos
    run("chaos", "chaos", "chaos", 30)
    r = pg.evaluate("""() => { const c = PhysicsPlayground.labs.chaos; const E=c.energy(0);
      return { drift_pct: (E-c.E0)/Math.abs(c.E0)*100, lyap: c.lyap, divergeAt: c.divergeAt } }""")
    ok("chaos_energy_conserved", abs(r["drift_pct"]) < 1e-3, r["drift_pct"])
    ok("chaos_lyapunov_positive", r["lyap"] is not None and r["lyap"] > 0.3, r["lyap"])
    ok("chaos_copies_diverge", r["divergeAt"] is not None and 0 < r["divergeAt"] < 30, r["divergeAt"])
    pg.evaluate(RUN, ["chaos", "mode", 0.0, None])
    r = pg.evaluate("""() => { const c = PhysicsPlayground.labs.chaos; const h=c.dt(); let worst=0, t=0, T=2*Math.PI/Math.sqrt((2-Math.SQRT2)*c.p.g);
      for (let i=0;i<Math.round(3*T/h);i++){ c.step(h); t+=h; const r=c.s[1]/c.s[0]; if (Math.abs(c.s[0])>0.05) worst=Math.max(worst,Math.abs(r-Math.SQRT2)); }
      return { predictedPeriod: T, worstRatioErr: worst, theta1_after_3T_deg: c.s[0]*180/Math.PI } }""")
    ok("mode_predicted_period", abs(r["predictedPeriod"] - 2 * math.pi / math.sqrt((2 - math.sqrt(2)) * 9.81)) < 1e-6, round(r["predictedPeriod"], 4))
    ok("mode_shape_holds", r["worstRatioErr"] < 0.1, round(r["worstRatioErr"], 4))
    ok("mode_returns_after_3T", abs(r["theta1_after_3T_deg"] - 10) < 0.5, round(r["theta1_after_3T_deg"], 3))

    # ---- fluid
    run("dam", "fluid", "dam", 10)
    r = pg.evaluate("""() => { const f = PhysicsPlayground.labs.fluid; let bad=0, vmax=0, top=1e9;
      for (let i=0;i<f.n;i++){ if(!Number.isFinite(f.x[i])||!Number.isFinite(f.y[i])) bad++; vmax=Math.max(vmax,Math.hypot(f.vx[i],f.vy[i])); top=Math.min(top,f.y[i]); }
      f.after(); return { n: f.n, nonFinite: bad, peak: f.peak, mean: f.mean, vmax_px_s: vmax*f.U/f.TICK, depth_units: f.Hu-top, Hu: f.Hu, Wu: f.Wu, keLast: f.series.last() } }""")
    # At rest the column fills the tank floor to the depth its hexagonally packed particles cover.
    depth = r["n"] * 0.42 * 0.42 * 0.866 / r["Wu"]
    ok("dam_particle_count", r["n"] >= 300, r["n"])
    ok("dam_finite", r["nonFinite"] == 0, r["nonFinite"])
    ok("dam_not_compressed", r["peak"] < 1.5, round(r["peak"], 3))
    ok("dam_mean_density", 0.7 < r["mean"] < 1.2, round(r["mean"], 3))
    ok("dam_speed_sane", r["vmax_px_s"] < 800, round(r["vmax_px_s"], 1))
    ok("dam_depth_matches_volume", abs(r["depth_units"] - depth) < 1.5, (round(r["depth_units"], 2), round(depth, 2)))
    ok("dam_tank_size", r["Hu"] > 0 and r["Wu"] > r["Hu"], (round(r["Wu"], 1), round(r["Hu"], 1)))
    ok("dam_ke_recorded", r["keLast"] is not None and 0 <= r["keLast"] < 1e5, r["keLast"])
    run("zerog", "fluid", "zerog", 6)
    r = pg.evaluate("""() => { const f = PhysicsPlayground.labs.fluid; let cx=0, cy=0; for (let i=0;i<f.n;i++){cx+=f.x[i];cy+=f.y[i];} cx/=f.n; cy/=f.n;
      let r=0; for (let i=0;i<f.n;i++) r=Math.max(r,Math.hypot(f.x[i]-cx,f.y[i]-cy)); f.after(); return { maxRadius_units: r, expected_disc_R: Math.sqrt(f.n*0.42*0.42*0.866/Math.PI), peak: f.peak, mean: f.mean } }""")
    ok("zerog_forms_a_disc", 0.8 < r["maxRadius_units"] / r["expected_disc_R"] < 1.7, (round(r["maxRadius_units"], 2), round(r["expected_disc_R"], 2)))
    ok("zerog_not_compressed", r["peak"] < 1.5, round(r["peak"], 3))
    ok("zerog_mean_density", 0.7 < r["mean"] < 1.2, round(r["mean"], 3))

    # ---- cloth
    run("flag", "cloth", "flag", 10)
    r = pg.evaluate("""() => { const c = PhysicsPlayground.labs.cloth; let bad=0, alive=0;
      for (let i=0;i<c.n;i++) if(!Number.isFinite(c.x[i])) bad++; for (let k=0;k<c.L;k++) alive+=c.alive[k]; return { n:c.n, L:c.L, alive, nonFinite: bad } }""")
    ok("flag_finite", r["nonFinite"] == 0, r["nonFinite"])
    ok("flag_has_mesh", r["n"] > 0 and r["L"] > r["n"], (r["n"], r["L"]))
    ok("flag_stays_whole", r["alive"] == r["L"], (r["alive"], r["L"]))

    # ---- keyboard
    pg.evaluate("() => { PhysicsPlayground.select('gravity'); PhysicsPlayground.play(); document.activeElement && document.activeElement.blur(); }")
    pg.keyboard.press("2"); ok("key_2_selects_collisions", pg.evaluate("PhysicsPlayground.active.id") == "collisions")
    pg.keyboard.press("Space"); ok("space_pauses", pg.evaluate("PhysicsPlayground.state.running") is False)
    pg.focus("#tab-collisions"); pg.keyboard.press("ArrowRight")
    r = pg.evaluate("PhysicsPlayground.active.id + ' focus=' + document.activeElement.id")
    ok("arrow_moves_tab_and_focus", r == "fluid focus=tab-fluid", r)
    ok("hash_follows_tab", pg.evaluate("location.hash") == "#fluid", pg.evaluate("location.hash"))
    b.close()
finish()
