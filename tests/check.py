"""
✒ Metadata
    - Title: Physics Check (digiSpace Edition - v2.0)
    - File Name: check.py
    - Relative Path: tests/check.py
    - Artifact Type: test
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness.

✒ Description:
    Runs named scenes headless and reports physical checks: figure-eight
    energy, the Kepler period, gas and pile statistics, fluid density, the
    wave Mach cone, chaos, the normal mode and the cloth flag, plus keyboard
    lab switching.

✒ Key Features:
    - Physical readings per scene, printed as JSON.
    - Keyboard lab switching, Space and tab focus.
    - Screenshots of every lab.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json, sys, time
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot

errors = []

RUN = """
([id, preset, seconds, params]) => {
  const P = window.PhysicsPlayground; P.pause(); P.select(id); if (preset) P.preset(preset);
  const lab = P.active; if (params) { Object.assign(lab.p, params); }
  const h = lab.dt(); const n = Math.round(seconds / h); const t0 = performance.now();
  for (let i = 0; i < n; i++) { lab.step(h); lab.t += h; if (lab.after) lab.after(h); }
  return { steps: n, ms: performance.now() - t0 };
}
"""

with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(URL); pg.wait_for_timeout(1500)
    out = {}

    # ---- live screenshots of each lab at default scene
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth"]:
        pg.evaluate("id => { PhysicsPlayground.select(id); PhysicsPlayground.play(); }", lab)
        pg.wait_for_timeout(3000)
        pg.screenshot(path=shot(f"{lab}.png"))
        out[lab + "_fps"] = pg.evaluate("Math.round(PhysicsPlayground.perf.fps)")

    # ---- gravity: figure-eight energy + boundedness over 30 s
    r = pg.evaluate(RUN, ["gravity", "figure8", 30, None])
    out["fig8"] = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity; const E = g.energy();
      return { n: g.bodies.length, drift_pct: (E - g.E0) / Math.abs(g.E0) * 100,
               maxR: Math.max(...g.bodies.map(b => Math.hypot(b.x, b.y))) } }""")
    out["fig8"]["ms"] = r["ms"]
    r = pg.evaluate(RUN, ["gravity", "solar", 30, None])
    out["solar"] = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity; const E = g.energy();
      return { n: g.bodies.length, merged: g.merged, escaped: g.escaped, drift_pct: (E - g.E0) / Math.abs(g.E0) * 100 } }""")
    out["solar"]["ms"] = r["ms"]
    r = pg.evaluate(RUN, ["gravity", "kepler", 8.55, None])
    out["kepler_period"] = pg.evaluate("""() => { const g = PhysicsPlayground.labs.gravity;
      return g.bodies.slice(1).map(b => Math.atan2(b.y, b.x).toFixed(3)) }""")

    # ---- collisions: KE conservation + thermalisation
    pg.evaluate("() => { PhysicsPlayground.select('collisions'); PhysicsPlayground.preset('gas'); }")
    ke0 = pg.evaluate("PhysicsPlayground.labs.collisions.stats().ke")
    ratio0 = pg.evaluate("""() => { const c = PhysicsPlayground.labs.collisions; let s=0, s2=0;
      for (let i=0;i<c.n;i++){ const v=Math.hypot(c.vx[i],c.vy[i]); s+=v; s2+=v*v; } return (s/c.n)/Math.sqrt(s2/c.n) }""")
    r = pg.evaluate(RUN, ["collisions", None, 20, None])
    out["gas"] = pg.evaluate("""(ke0) => { const c = PhysicsPlayground.labs.collisions; let s=0, s2=0;
      for (let i=0;i<c.n;i++){ const v=Math.hypot(c.vx[i],c.vy[i]); s+=v; s2+=v*v; }
      return { ke_change_pct: (c.stats().ke - ke0)/ke0*100, mean_over_rms: (s/c.n)/Math.sqrt(s2/c.n), rayleigh: Math.sqrt(Math.PI)/2 } }""", ke0)
    out["gas"]["start_mean_over_rms"] = ratio0; out["gas"]["ms"] = r["ms"]
    r = pg.evaluate(RUN, ["collisions", "pile", 8, None])
    out["pile"] = pg.evaluate("""() => { const c = PhysicsPlayground.labs.collisions; let maxOv=0;
      for (let i=0;i<c.n;i++) for (let j=i+1;j<c.n;j++){ const d=Math.hypot(c.x[j]-c.x[i],c.y[j]-c.y[i]); maxOv=Math.max(maxOv,(c.r[i]+c.r[j]-d)); }
      return { n: c.n, rms: c.stats().vrms, max_overlap_px: maxOv } }""")

    # ---- waves: stability + fringes
    r = pg.evaluate(RUN, ["waves", "double", 15, None])
    out["double"] = pg.evaluate("""() => { const w = PhysicsPlayground.labs.waves; let m=0, bad=0;
      for (const v of w.u) { if (!Number.isFinite(v)) bad++; else m=Math.max(m,Math.abs(v)); }
      const xd=w.detectorX(), prof=[]; for (let y=0;y<w.Ny;y++) prof.push(w.inten[y*w.Nx+xd]);
      const mx=Math.max(...prof); let peaks=0; for (let y=2;y<prof.length-2;y++) if (prof[y]>prof[y-1]&&prof[y]>=prof[y+1]&&prof[y]>0.25*mx) peaks++;
      return { maxU: m, nonFinite: bad, detectorPeaks: peaks, Nx: w.Nx, Ny: w.Ny } }""")
    out["double"]["ms"] = r["ms"]
    r = pg.evaluate(RUN, ["waves", "doppler", 10, {"srcSpeed": 1.4, "c": 120}])
    out["mach"] = pg.evaluate("""() => { const w = PhysicsPlayground.labs.waves; let m=0, bad=0;
      for (const v of w.u) { if (!Number.isFinite(v)) bad++; else m=Math.max(m,Math.abs(v)); } return { maxU: m, nonFinite: bad } }""")

    # ---- chaos
    r = pg.evaluate(RUN, ["chaos", "chaos", 30, None])
    out["chaos"] = pg.evaluate("""() => { const c = PhysicsPlayground.labs.chaos; const E=c.energy(0);
      return { drift_pct: (E-c.E0)/Math.abs(c.E0)*100, lyap: c.lyap, divergeAt: c.divergeAt } }""")
    out["chaos"]["ms"] = r["ms"]
    pg.evaluate(RUN, ["chaos", "mode", 0.0, None])
    out["mode"] = pg.evaluate("""() => { const c = PhysicsPlayground.labs.chaos; const h=c.dt(); let worst=0, t=0, T=2*Math.PI/Math.sqrt((2-Math.SQRT2)*c.p.g);
      for (let i=0;i<Math.round(3*T/h);i++){ c.step(h); t+=h; const r=c.s[1]/c.s[0]; if (Math.abs(c.s[0])>0.05) worst=Math.max(worst,Math.abs(r-Math.SQRT2)); }
      return { predictedPeriod: T, worstRatioErr: worst, theta1_after_3T_deg: c.s[0]*180/Math.PI } }""")

    # ---- fluid
    r = pg.evaluate(RUN, ["fluid", "dam", 10, None])
    out["dam"] = pg.evaluate("""() => { const f = PhysicsPlayground.labs.fluid; let bad=0, vmax=0, top=1e9;
      for (let i=0;i<f.n;i++){ if(!Number.isFinite(f.x[i])||!Number.isFinite(f.y[i])) bad++; vmax=Math.max(vmax,Math.hypot(f.vx[i],f.vy[i])); top=Math.min(top,f.y[i]); }
      f.after(); return { n: f.n, nonFinite: bad, peak: f.peak, mean: f.mean, vmax_px_s: vmax*f.U/f.TICK, depth_units: f.Hu-top, Hu: f.Hu, Wu: f.Wu, keLast: f.series.last() } }""")
    out["dam"]["ms_per_tick"] = r["ms"] / r["steps"]
    r = pg.evaluate(RUN, ["fluid", "zerog", 6, None])
    out["zerog"] = pg.evaluate("""() => { const f = PhysicsPlayground.labs.fluid; let cx=0, cy=0; for (let i=0;i<f.n;i++){cx+=f.x[i];cy+=f.y[i];} cx/=f.n; cy/=f.n;
      let r=0; for (let i=0;i<f.n;i++) r=Math.max(r,Math.hypot(f.x[i]-cx,f.y[i]-cy)); f.after(); return { maxRadius_units: r, expected_disc_R: Math.sqrt(f.n*0.42*0.42*0.866/Math.PI), peak: f.peak, mean: f.mean } }""")

    # ---- cloth
    r = pg.evaluate(RUN, ["cloth", "flag", 10, None])
    out["flag"] = pg.evaluate("""() => { const c = PhysicsPlayground.labs.cloth; let bad=0, alive=0;
      for (let i=0;i<c.n;i++) if(!Number.isFinite(c.x[i])) bad++; for (let k=0;k<c.L;k++) alive+=c.alive[k]; return { n:c.n, L:c.L, alive, nonFinite: bad } }""")
    out["flag"]["ms"] = r["ms"]

    # ---- keyboard
    pg.evaluate("() => { PhysicsPlayground.select('gravity'); PhysicsPlayground.play(); document.activeElement && document.activeElement.blur(); }")
    pg.keyboard.press("2"); out["key2"] = pg.evaluate("PhysicsPlayground.active.id")
    pg.keyboard.press("Space"); out["space_running"] = pg.evaluate("PhysicsPlayground.state.running")
    pg.focus("#tab-collisions"); pg.keyboard.press("ArrowRight"); out["arrow_tab"] = pg.evaluate("PhysicsPlayground.active.id + ' focus=' + document.activeElement.id")
    out["hash"] = pg.evaluate("location.hash")
    out["errors"] = errors
    b.close()
print(json.dumps(out, indent=1, default=str))
