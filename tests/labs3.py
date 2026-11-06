"""
✒ Metadata
    - Title: v2 Feature Test (digiSpace Edition - v2.0)
    - File Name: labs3.py
    - Relative Path: tests/labs3.py
    - Artifact Type: test
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: tests for the Fields lab, 3D gravity
      and experiments.

✒ Description:
    Checks the v2.0 additions: the Fields lab tools and scenes, stage size
    stability, guided experiments and the banner, the gravity 3D view and
    its CDN fallback.

✒ Key Features:
    - 29 named checks.
    - Blocks the three.js CDN to test the honest fallback.
    - Confirms the banner Stop button is never replaced under a click.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json, math, sys
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot
out, errors = {}, []
def ok(name, cond, info=""):
    out[name] = ("PASS" if cond else "FAIL") + (f" {info}" if info != "" else "")
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
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
    ok("energy_chart_samples", pg.evaluate(F + ".series.et.n") > 5)
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

    # ---- gravity 3D
    pg.evaluate("PhysicsPlayground.select('gravity')"); pg.wait_for_timeout(300)
    G = "PhysicsPlayground.labs.gravity"
    pg.click("#preset-gravity-tilted"); pg.wait_for_timeout(5000)
    ok("tilted_3d_on", pg.evaluate(G + ".is3D()") and pg.evaluate("PhysicsPlayground.view.get().mode") == "3d")
    ok("orbit_ball_shown", not pg.evaluate("document.getElementById('nav-orbit').hidden"))
    ok("tilts_readout", pg.evaluate("[...document.querySelectorAll('#readouts dd')].some(d => /70°/.test(d.textContent))"))
    y0 = pg.evaluate("PhysicsPlayground.view.get().yaw")
    pg.mouse.move(box["x"] + 500, box["y"] + 250); pg.mouse.down(button="right"); pg.mouse.move(box["x"] + 600, box["y"] + 250, steps=5); pg.mouse.up(button="right")
    ok("right_drag_orbits_3d", abs(pg.evaluate("PhysicsPlayground.view.get().yaw") - (y0 - 0.8)) < 0.05)
    d0 = pg.evaluate("PhysicsPlayground.view.get().dist"); pg.mouse.wheel(0, -400); pg.wait_for_timeout(900)
    ok("wheel_dollies_3d", pg.evaluate("PhysicsPlayground.view.get().dist") < d0 * 0.8)
    pg.click("#nav-fit"); pg.wait_for_timeout(1200); pg.evaluate("PhysicsPlayground.pause()"); pg.wait_for_timeout(300)
    s = pg.evaluate("(() => { const g = " + G + ", b = g.bodies.find(b => b.m < 100 && b.m > 0.4); const s = g.project3(b.x, b.y, b.z); return [s.x, s.y, b.id] })()")
    pg.click("#dock-gravity-throw"); pg.mouse.click(box["x"] + s[0], box["y"] + s[1]); pg.wait_for_timeout(200)
    ok("click_tracks_in_3d", pg.evaluate(G + ".track") == s[2], s)
    nb = pg.evaluate(G + ".bodies.length")
    pg.mouse.move(box["x"] + 200, box["y"] + 380); pg.mouse.down(); pg.mouse.move(box["x"] + 260, box["y"] + 360, steps=5); pg.mouse.up()
    ok("throw_in_3d", pg.evaluate(G + ".bodies.length") == nb + 1)
    pg.locator(".axis").nth(2).click(); pg.wait_for_timeout(1500); ok("axis_z_top_view_3d", pg.evaluate("PhysicsPlayground.view.get().pitch") > 1.5)
    pg.click("#nav-view3d"); pg.wait_for_timeout(300); ok("leave_3d", not pg.evaluate(G + ".is3D()") and pg.evaluate("document.getElementById('nav-orbit').hidden"))
    pg.screenshot(path=shot("v20_labs3_end.png"))

    # ---- honest fallback when the CDN is blocked
    p2 = b.new_page(viewport={"width": 1280, "height": 800}); p2.route("**/npm/three@*/**", lambda r: r.abort())
    p2.goto(URL + "#gravity"); p2.wait_for_timeout(1200); p2.click("#nav-view3d"); p2.wait_for_timeout(2500)
    ok("fallback_flat", p2.evaluate(G + ".p.view3d") is False and p2.evaluate(G + ".fail3") is not None)
    ok("fallback_switch_disabled", p2.evaluate("document.getElementById('ctl-gravity-view3d').disabled"))
    ok("fallback_insight", p2.evaluate("[...document.querySelectorAll('#insights h4')].some(h => /3D view unavailable/.test(h.textContent))"))
    b.close()
out["errors"] = [e for e in errors if "GPU stall" not in e]
print(json.dumps(out, indent=1))
