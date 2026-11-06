"""
✒ Metadata
    - Title: Navigation Test (digiSpace Edition - v2.0)
    - File Name: nav.py
    - Relative Path: tests/nav.py
    - Artifact Type: test
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness; coordinates follow the
      bento stage size.

✒ Description:
    Checks the shared camera and gizmo: wheel zoom at the cursor, pans,
    frame, minimap, keys, tools in world coordinates, gravity follow and
    tracking, the relief 3D view, cloth cutting and pinch zoom.

✒ Key Features:
    - 40 named checks.
    - Coordinates are relative to the stage size.
    - Picks a body that is not under an overlay.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json, math
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot
errors, out = [], {}
def ok(name, cond, info=""):
    out[name] = ("PASS" if cond else "FAIL") + (f" {info}" if info != "" else "")
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL + "#collisions"); pg.wait_for_timeout(1500)
    V = lambda: pg.evaluate("PhysicsPlayground.view.get()")
    box = pg.locator("#stage-canvas").bounding_box()
    sx, sy = 300, 250
    # wheel zoom keeps the world point under the cursor fixed
    w0 = pg.evaluate(f"PhysicsPlayground.view.toWorld({sx},{sy})")
    pg.mouse.move(box["x"] + sx, box["y"] + sy); pg.mouse.wheel(0, -400); pg.wait_for_timeout(700)
    w1 = pg.evaluate(f"PhysicsPlayground.view.toWorld({sx},{sy})"); v = V()
    ok("wheel_zoom_in", v["z"] > 1.5, round(v["z"], 3))
    ok("wheel_anchor_fixed", math.hypot(w1["x"] - w0["x"], w1["y"] - w0["y"]) < 1.0, round(math.hypot(w1["x"] - w0["x"], w1["y"] - w0["y"]), 3))
    ok("minimap_visible_when_zoomed", pg.evaluate("!document.getElementById('minimap').hidden"))
    ok("zoom_readout", pg.inner_text("#nav-zoom").endswith("%"), pg.inner_text("#nav-zoom"))
    # middle-drag pan
    c0 = V(); pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.mouse.down(button="middle"); pg.mouse.move(box["x"] + 600, box["y"] + 450, steps=5); pg.mouse.up(button="middle")
    c1 = V(); ok("middle_drag_pan", abs((c0["x"] - c1["x"]) * c1["z"] - 100) < 2 and abs((c0["y"] - c1["y"]) * c1["z"] - 50) < 2, (round((c0["x"]-c1["x"])*c1["z"],1), round((c0["y"]-c1["y"])*c1["z"],1)))
    # right-drag pan does not add balls
    n0 = pg.evaluate("PhysicsPlayground.labs.collisions.n")
    pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.mouse.down(button="right"); pg.mouse.move(box["x"] + 450, box["y"] + 380, steps=4); pg.mouse.up(button="right")
    c2 = V(); ok("right_drag_pan", abs((c2["x"] - c1["x"]) * c2["z"] - 50) < 2 and pg.evaluate("PhysicsPlayground.labs.collisions.n") == n0)
    # space-drag pans and does not toggle play; space tap toggles play
    running0 = pg.evaluate("PhysicsPlayground.state.running")
    pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.keyboard.down("Space"); pg.mouse.down(); pg.mouse.move(box["x"] + 540, box["y"] + 400, steps=4); pg.mouse.up(); pg.keyboard.up("Space")
    c3 = V(); ok("space_drag_pan", abs((c2["x"] - c3["x"]) * c3["z"] - 40) < 2 and pg.evaluate("PhysicsPlayground.state.running") == running0 and pg.evaluate("PhysicsPlayground.labs.collisions.n") == n0)
    pg.keyboard.press("Space"); ok("space_tap_toggles", pg.evaluate("PhysicsPlayground.state.running") != running0); pg.keyboard.press("Space")
    # gizmo buttons
    z0 = V()["z"]; pg.click("#nav-in"); pg.wait_for_timeout(600); ok("nav_in", V()["z"] > z0 * 1.4)
    z1 = V()["z"]; pg.click("#nav-out"); pg.wait_for_timeout(600); ok("nav_out", V()["z"] < z1 * 0.75)
    pg.click("#nav-zoom"); pg.wait_for_timeout(700); ok("readout_click_100", abs(V()["z"] - 1) < 1e-6, V()["z"])
    pg.mouse.wheel(0, -300); pg.wait_for_timeout(400)
    zb = pg.locator("#nav-zoom").bounding_box(); zz = V()["z"]
    pg.mouse.move(zb["x"] + 20, zb["y"] + 10); pg.mouse.down(); pg.mouse.move(zb["x"] + 20, zb["y"] - 50, steps=6); pg.mouse.up()
    ok("readout_scrub_zooms", V()["z"] > zz * 1.5, (round(zz, 2), round(V()["z"], 2)))
    pg.click("#nav-fit"); pg.wait_for_timeout(900); v = V(); ok("frame_fits", v["fit"] and abs(v["z"] - 1) < 1e-6, v)
    ok("minimap_hidden_when_fit", pg.evaluate("document.getElementById('minimap').hidden"))
    # pan mode toggle: left drag pans, dock tool turns it off
    pg.mouse.wheel(0, -300); pg.wait_for_timeout(500)
    pg.click("#nav-pan"); ok("pan_mode_on", pg.get_attribute("#nav-pan", "aria-pressed") == "true" and "Pan mode" in pg.inner_text("#stage-hint"))
    c4 = V(); pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.mouse.down(); pg.mouse.move(box["x"] + 470, box["y"] + 400, steps=4); pg.mouse.up()
    c5 = V(); ok("pan_mode_drag", abs((c5["x"] - c4["x"]) * c5["z"] - 30) < 2 and pg.evaluate("PhysicsPlayground.labs.collisions.n") == n0)
    pg.click("#dock-collisions-heat"); ok("dock_ends_pan_mode", pg.get_attribute("#nav-pan", "aria-pressed") == "false")
    # dragging the hand button pans
    hb = pg.locator("#nav-pan").bounding_box(); c6 = V()
    pg.mouse.move(hb["x"] + 16, hb["y"] + 16); pg.mouse.down(); pg.mouse.move(hb["x"] - 34, hb["y"] + 16, steps=6); pg.mouse.up()
    c7 = V(); ok("hand_drag_pans", abs((c7["x"] - c6["x"]) * c7["z"] - 50) < 3 and pg.get_attribute("#nav-pan", "aria-pressed") == "false", round((c7["x"] - c6["x"]) * c7["z"], 1))
    # minimap click recentres
    mb = pg.locator("#minimap-canvas").bounding_box()
    pg.mouse.click(mb["x"] + mb["width"] * 0.25, mb["y"] + mb["height"] * 0.5); v = V(); W = pg.evaluate("PhysicsPlayground.labs.collisions.worldRect()")
    ok("minimap_click_centres", abs(v["x"] / W["w"] - 0.25) < 0.08, round(v["x"] / W["w"], 3))
    # keys: 0 frames, + zooms, arrows pan
    pg.click("body", position={"x": 5, "y": 5}) if False else None
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    pg.keyboard.press("0"); pg.wait_for_timeout(800); ok("key_0_frames", V()["fit"])
    pg.keyboard.press("+"); pg.wait_for_timeout(600); ok("key_plus", V()["z"] > 1.4)
    a0 = V(); pg.keyboard.press("ArrowRight"); a1 = V(); ok("arrow_pans", a1["x"] > a0["x"], (a0["x"], a1["x"]))
    # tools work in world coordinates while zoomed: grab-click adds a ball at the world point
    pg.click("#dock-collisions-grab"); pg.keyboard.press("0"); pg.wait_for_timeout(800)
    pg.evaluate("PhysicsPlayground.view.zoomBy(3, 400, 300)"); n1 = pg.evaluate("PhysicsPlayground.labs.collisions.n")
    TX, TY = int(box["width"] * 0.64), int(box["height"] * 0.78)
    wp = pg.evaluate(f"PhysicsPlayground.view.toWorld({TX}, {TY})")
    hit = pg.evaluate(f"PhysicsPlayground.labs.collisions.hit(PhysicsPlayground.view.toWorld({TX},{TY}))")
    pg.mouse.click(box["x"] + TX, box["y"] + TY)
    n2 = pg.evaluate("PhysicsPlayground.labs.collisions.n")
    if hit < 0:
        last = pg.evaluate("(() => { const c = PhysicsPlayground.labs.collisions, i = c.n - 1; return [c.x[i], c.y[i]] })()")
        ok("tool_world_coords", n2 == n1 + 1 and math.hypot(last[0] - wp["x"], last[1] - wp["y"]) < 3, (round(last[0],1), round(wp["x"],1)))
    else: ok("tool_world_coords", True, "hit an existing ball; skipped")
    pg.screenshot(path=shot("v13_coll_zoom.png"))
    # gravity: wheel changes p.zoom and the slider; follow button; click-to-track
    pg.keyboard.press("1"); pg.wait_for_timeout(800)
    z0 = pg.evaluate("PhysicsPlayground.labs.gravity.p.zoom")
    pg.mouse.move(box["x"] + 400, box["y"] + 300); pg.mouse.wheel(0, -300); pg.wait_for_timeout(700)
    ok("gravity_wheel_syncs_zoom", pg.evaluate("PhysicsPlayground.labs.gravity.p.zoom") > z0 * 1.3 and pg.inner_text("#ctl-gravity-zoom-out").endswith("×"), pg.inner_text("#ctl-gravity-zoom-out"))
    ok("follow_button_pressed", pg.get_attribute("#nav-follow", "aria-pressed") == "true")
    pg.click("#nav-follow"); ok("follow_button_frees", pg.evaluate("PhysicsPlayground.labs.gravity.p.follow") == False and pg.get_attribute("#nav-follow", "aria-pressed") == "false")
    pg.evaluate("PhysicsPlayground.pause()"); pg.wait_for_timeout(400)
    # pick a light body that is on screen and not under an overlay (minimap, gizmo, HUD)
    pos = pg.evaluate("""(() => { const g = PhysicsPlayground.labs.gravity, v = g.viewXf, cv = document.getElementById('stage-canvas'), r = cv.getBoundingClientRect();
      for (const b of g.bodies.filter(b => b.m < 80).sort((a, c) => c.m - a.m)) { const x = b.x * v.z + v.ox, y = b.y * v.z + v.oy;
        if (document.elementFromPoint(r.left + x, r.top + y) === cv) return [x, y, b.id]; } return [0, 0, -1]; })()""")
    nb = pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length")
    pg.mouse.click(box["x"] + pos[0], box["y"] + pos[1]); pg.wait_for_timeout(200)
    ok("click_body_tracks", pg.evaluate("PhysicsPlayground.labs.gravity.track") == pos[2] and pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length") == nb)
    pg.evaluate("PhysicsPlayground.play()"); pg.wait_for_timeout(1500)
    tr = pg.evaluate("(() => { const g = PhysicsPlayground.labs.gravity, b = g.bodies.find(b => b.id === g.track); return [b.x - g.cam.x, b.y - g.cam.y] })()")
    ok("tracked_body_centred", math.hypot(*tr) < 1.0, [round(t, 3) for t in tr])
    pg.evaluate("PhysicsPlayground.view.zoomBy(12, null, null)"); pg.wait_for_timeout(1200)
    pg.screenshot(path=shot("v13_gravity_planet.png"))
    pg.click("#nav-fit"); pg.wait_for_timeout(1000); ok("gravity_frame_releases_track", pg.evaluate("PhysicsPlayground.labs.gravity.track") is None)
    # middle-drag pan in gravity turns follow off (already off) and moves camera
    # waves 3D: orbit, snap, pick, tool in 3D
    pg.keyboard.press("4"); pg.wait_for_timeout(600); pg.evaluate("PhysicsPlayground.preset('ripple')")
    pg.click("#nav-relief"); pg.wait_for_timeout(1500)
    ok("relief_on", V()["mode"] == "3d" and not pg.evaluate("document.getElementById('nav-orbit').hidden") and pg.evaluate("document.getElementById('minimap').hidden && document.getElementById('scalebar').hidden"))
    y0 = V()["yaw"]; pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.mouse.down(button="right"); pg.mouse.move(box["x"] + 600, box["y"] + 420, steps=5); pg.mouse.up(button="right")
    v = V(); ok("right_drag_orbits", abs(v["yaw"] - y0 + 0.8) < 0.05 and v["pitch"] > 0.92, (round(v["yaw"], 3), round(v["pitch"], 3)))
    pg.click("#nav-fit"); pg.wait_for_timeout(1500); v = V(); ok("frame3_resets", abs(v["pitch"] - 0.92) < 0.02 and abs(v["tx"]) < 0.5, (round(v["pitch"],3), round(v["tx"],2)))
    ob = pg.locator("#nav-orbit").bounding_box(); y1 = V()["yaw"]
    oc = (ob["x"] + ob["width"] / 2, ob["y"] + ob["height"] / 2)
    pg.mouse.move(*oc); pg.mouse.down(); pg.mouse.move(oc[0] + 20, oc[1], steps=4); pg.mouse.up()
    ok("ball_drag_orbits", V()["yaw"] < y1 - 0.1, round(V()["yaw"] - y1, 3))
    pg.locator(".axis").nth(2).click(); pg.wait_for_timeout(1500); ok("axis_z_top_view", V()["pitch"] > 1.5)
    pg.click("#nav-fit"); pg.wait_for_timeout(1500)
    # pick: stage centre should map near the tank centre
    c = pg.evaluate(f"PhysicsPlayground.view.toWorld({box['width']/2}, {box['height']/2})"); W = pg.evaluate("PhysicsPlayground.labs.waves.worldRect()")
    ok("pick_centre", abs(c["x"] / W["w"] - 0.5) < 0.02 and abs(c["y"] / W["h"] - 0.5) < 0.02, (round(c["x"]/W["w"],3), round(c["y"]/W["h"],3)))
    pg.click("#dock-waves-source"); ns = pg.evaluate("PhysicsPlayground.labs.waves.sources.length")
    pg.mouse.click(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5)
    ok("source_in_3d", pg.evaluate("PhysicsPlayground.labs.waves.sources.length") == ns + 1)
    z3 = V()["dist"]; pg.mouse.move(box["x"] + 500, box["y"] + 400); pg.mouse.wheel(0, -400); pg.wait_for_timeout(900)
    ok("wheel_dolly_3d", V()["dist"] < z3 * 0.7, round(V()["dist"] / z3, 3))
    pg.wait_for_timeout(1500); pg.screenshot(path=shot("v13_relief_zoom.png"))
    pg.click("#nav-relief"); pg.wait_for_timeout(500); ok("relief_off", V()["mode"] == "2d" and pg.evaluate("document.getElementById('nav-orbit').hidden"))
    # cloth keeps right-drag for cutting, middle-drag pans
    pg.keyboard.press("6"); pg.wait_for_timeout(800)
    L = "PhysicsPlayground.labs.cloth.alive.subarray(0, PhysicsPlayground.labs.cloth.L).reduce((a,b)=>a+b,0)"
    cut = pg.evaluate("""(() => { const c = PhysicsPlayground.labs.cloth, V = PhysicsPlayground.view, a = V.toWorld(0, 0), b = V.toWorld(1, 1), sx = 1 / (b.x - a.x), sy = 1 / (b.y - a.y);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < c.n; i++) { x0 = Math.min(x0, c.x[i]); x1 = Math.max(x1, c.x[i]); y0 = Math.min(y0, c.y[i]); y1 = Math.max(y1, c.y[i]); }
      return [(x0 - a.x) * sx - 30, (x1 - a.x) * sx + 30, ((y0 + y1) / 2 - a.y) * sy]; })()""")
    a0 = pg.evaluate(L); pg.mouse.move(box["x"] + cut[0], box["y"] + cut[2]); pg.mouse.down(button="right"); pg.mouse.move(box["x"] + cut[1], box["y"] + cut[2] + 10, steps=16); pg.mouse.up(button="right")
    ok("cloth_right_drag_cuts", pg.evaluate(L) < a0 and V()["fit"])
    # touch pinch zoom via CDP
    cdp = pg.context.new_cdp_session(pg)
    def touch(kind, pts): cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": box["x"] + x, "y": box["y"] + y, "id": i} for i, (x, y) in enumerate(pts)]})
    z0 = V()["z"]
    touch("touchStart", [(400, 400)]); touch("touchStart", [(400, 400), (500, 400)])
    for k in range(1, 7): touch("touchMove", [(400 - 15 * k, 400), (500 + 15 * k, 400)])
    touch("touchEnd", [])
    pg.wait_for_timeout(200); ok("pinch_zoom", V()["z"] > z0 * 1.8, round(V()["z"], 2))
    print(json.dumps(out, indent=1)); print("errors", errors[:8])
    b.close()
