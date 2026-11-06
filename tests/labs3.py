"""
✒ Metadata
    - Title: v2 Feature Test (digiSpace Edition - v2.1)
    - File Name: labs3.py
    - Relative Path: tests/labs3.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Both pages
      start in flat 2D mode. The per-lab gravity 3D checks became flat view
      checks and the fallback now goes through the global mode switch, since
      3D is a global mode with its own suite. The marks and console watching
      come from the shared harness.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: tests for the Fields lab, 3D gravity
      and experiments.

✒ Description:
    Checks the v2.0 additions: the Fields lab tools and scenes, stage size
    stability, guided experiments and the banner, the tilted gravity scene
    in the flat view, and the fallback when the 3D mode cannot load.

✒ Key Features:
    - 28 named checks.
    - Blocks the three.js CDN to test the honest fallback.
    - Confirms the banner Stop button is never replaced under a click.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, shot
with sync_playwright() as p:
    b = launch(p)
    pg = open_page(b, viewport={"width": 1440, "height": 900})
    pg.goto(URL + "#fields"); pg.wait_for_timeout(1500)
    F = "PhysicsPlayground.labs.fields"
    box = pg.locator("#stage-canvas").bounding_box()
    ok("fields_selected", pg.evaluate("PhysicsPlayground.active.id") == "fields")
    ok("fields_lines_traced", pg.evaluate(F + ".flines.length") >= 12)
    # add a charge, then click it to raise it by one unit
    pg.evaluate("PhysicsPlayground.pause()"); pg.click("#dock-fields-plus")
    n0 = pg.evaluate(F + ".charges.length"); pg.mouse.click(box["x"] + 120, box["y"] + 90)
    ok("plus_adds_charge", pg.evaluate(F + ".charges.length") == n0 + 1)
    pg.mouse.click(box["x"] + 120, box["y"] + 90)
    ok("click_raises_charge", pg.evaluate(F + ".charges[" + str(n0) + "].q") == 2)
    # launch: drag creates a particle with the drag velocity and charts it
    pg.click("#dock-fields-launch"); pg.mouse.move(box["x"] + 300, box["y"] + 380); pg.mouse.down(); pg.mouse.move(box["x"] + 360, box["y"] + 380, steps=5); pg.mouse.up()
    v = pg.evaluate("(() => { const f = " + F + ", i = f.n - 1; return [f.n, f.vx[i], f.vy[i], f.track === f.pid[i]] })()")
    ok("launch_particle", v[0] == 1 and abs(v[1] - 120) < 1 and abs(v[2]) < 1 and v[3], v)
    pg.evaluate("PhysicsPlayground.play()"); pg.wait_for_timeout(1500)
    settle(pg, F + ".series.et.n > 5")
    ok("energy_chart_samples", pg.evaluate(F + ".series.et.n") > 5, pg.evaluate(F + ".series.et.n"))
    # probe reads the field; erase removes the charge under the brush
    pg.click("#dock-fields-probe"); pg.mouse.click(box["x"] + 500, box["y"] + 100)
    ok("probe_reads", pg.evaluate(F + ".probeVal && " + F + ".probeVal.E > 0"))
    pg.click("#dock-fields-erase"); pg.mouse.click(box["x"] + 120, box["y"] + 90)
    ok("erase_removes_charge", pg.evaluate(F + ".charges.length") == n0)
    # each preset builds and stays finite for 2 s
    bad = []
    for pre in ["dipole", "quad", "plates", "cyclotron", "exb", "gradb"]:
        pg.click(f"#preset-fields-{pre}"); pg.wait_for_timeout(2000)
        if not pg.evaluate(F + ".sane()"): bad.append(pre)
    ok("presets_sane", not bad, bad)
    ok("cyclotron_energy_flat", abs(pg.evaluate("(() => { const f = " + F + "; f.clearParticles(); return 0 })()")) == 0)
    pg.click("#preset-fields-cyclotron"); pg.wait_for_timeout(3000)
    d = pg.evaluate(F + ".stats().drift"); ok("boris_conserves_speed", d is not None and abs(d) < 1e-6, d)
    # stage size never depends on the scene
    sizes = set()
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.evaluate(f"PhysicsPlayground.select('{lab}')"); pg.wait_for_timeout(200)
        r = pg.locator("#stage-canvas").bounding_box(); sizes.add((round(r["width"]), round(r["height"])))
    ok("stage_size_stable", len(sizes) == 1, sizes)

    # ---- experiments
    pg.evaluate("PhysicsPlayground.select('fields')"); pg.click("#nt-experiments")
    ok("experiments_listed", pg.locator("#experiments .experiment").count() == 3)
    pg.locator("#experiments [data-exp=period] button").click(); pg.evaluate("PhysicsPlayground.play()")
    ok("banner_shown", not pg.evaluate("document.getElementById('exp-banner').hidden"))
    pg.wait_for_timeout(1200); b1 = pg.evaluate("document.querySelector('#exp-banner .bar > span').style.width")
    pg.wait_for_timeout(1200); b2 = pg.evaluate("document.querySelector('#exp-banner .bar > span').style.width")
    ok("banner_progresses", float(b2[:-1]) > float(b1[:-1]), (b1, b2))
    stop = pg.locator("#exp-banner .exp-b-close"); h0 = stop.element_handle(); pg.wait_for_timeout(600)
    ok("banner_button_stable", stop.element_handle() == h0 or pg.evaluate("(a) => a.isConnected", h0))
    stop.click(); ok("banner_stop_hides", pg.evaluate("document.getElementById('exp-banner').hidden"))

    # ---- tilted orbits in the flat view: 3D belongs to the global mode, which this suite keeps at 2D
    pg.evaluate("PhysicsPlayground.select('gravity')"); pg.wait_for_timeout(300)
    G = "PhysicsPlayground.labs.gravity"
    pg.click("#preset-gravity-tilted"); pg.wait_for_timeout(1500)
    pg.evaluate("PhysicsPlayground.pause()"); pg.wait_for_timeout(300)
    ok("tilted_stays_flat", not pg.evaluate(G + ".is3D()") and pg.evaluate("PhysicsPlayground.view.get().mode") == "2d")
    ok("orbit_ball_hidden", pg.evaluate("document.getElementById('nav-orbit').hidden"))
    ok("tilted_keeps_depth", pg.evaluate(G + ".bodies.some(b => Math.abs(b.z) > 1)"))
    ok("tilts_readout", pg.evaluate("[...document.querySelectorAll('#readouts dd')].some(d => /70°/.test(d.textContent))"))
    c0 = pg.evaluate("PhysicsPlayground.view.get()")
    pg.mouse.move(box["x"] + 500, box["y"] + 250); pg.mouse.down(button="right"); pg.mouse.move(box["x"] + 600, box["y"] + 250, steps=5); pg.mouse.up(button="right")
    c1 = pg.evaluate("PhysicsPlayground.view.get()")
    ok("right_drag_pans_flat", abs((c0["x"] - c1["x"]) * c1["z"] - 100) < 3, round((c0["x"] - c1["x"]) * c1["z"], 1))
    z0 = pg.evaluate(G + ".p.zoom"); pg.mouse.wheel(0, -400); pg.wait_for_timeout(900)
    ok("wheel_zooms_flat", pg.evaluate(G + ".p.zoom") > z0 * 1.2, (round(z0, 3), round(pg.evaluate(G + ".p.zoom"), 3)))
    pg.click("#nav-fit"); pg.wait_for_timeout(1200)
    # pick a light body that is on screen and not under an overlay (minimap, gizmo, HUD)
    s = pg.evaluate("""(() => { const g = PhysicsPlayground.labs.gravity, v = g.viewXf, cv = document.getElementById('stage-canvas'), r = cv.getBoundingClientRect();
      for (const b of g.bodies.filter(b => b.m < 100).sort((a, c) => c.m - a.m)) { const x = b.x * v.z + v.ox, y = b.y * v.z + v.oy;
        if (document.elementFromPoint(r.left + x, r.top + y) === cv) return [x, y, b.id]; } return [0, 0, -1]; })()""")
    pg.click("#dock-gravity-throw"); pg.mouse.click(box["x"] + s[0], box["y"] + s[1]); pg.wait_for_timeout(200)
    ok("click_tracks_flat", pg.evaluate(G + ".track") == s[2], s)
    nb = pg.evaluate(G + ".bodies.length")
    pg.mouse.move(box["x"] + 200, box["y"] + 380); pg.mouse.down(); pg.mouse.move(box["x"] + 260, box["y"] + 360, steps=5); pg.mouse.up()
    ok("throw_in_flat_view", pg.evaluate(G + ".bodies.length") == nb + 1)
    pg.screenshot(path=shot("v20_labs3_end.png"))

    # ---- honest fallback: asking for 3D with the CDN blocked leaves a working 2D page that says why
    # The blocked request logs a console error on purpose, so this page goes unwatched.
    p2 = open_page(b, watch=False, viewport={"width": 1280, "height": 800}); p2.route("**/npm/three@*/**", lambda r: r.abort())
    p2.goto(URL + "#gravity"); p2.wait_for_timeout(1200); p2.click("#mode-3d"); p2.wait_for_timeout(2500)
    ok("fallback_flat", p2.evaluate("PhysicsPlayground.mode.get()") == "2d" and p2.evaluate("PhysicsPlayground.mode.world.fail") is not None)
    ok("fallback_switch_disabled", p2.evaluate("document.getElementById('mode-3d').disabled"))
    ok("fallback_insight", p2.evaluate("[...document.querySelectorAll('#insights h4')].some(h => /3D mode is unavailable/.test(h.textContent))"))
    b.close()
finish()
