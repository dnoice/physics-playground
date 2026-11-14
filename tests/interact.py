"""
✒ Metadata
    - Title: Interaction Test (digiSpace Edition - v2.11)
    - File Name: interact.py
    - Relative Path: tests/interact.py
    - Artifact Type: test
    - Version: 2.11.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.11.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Chaos
      start-angle dial reads its degrees against the number (35.1°), as the
      controls now write a degree sign.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Waves'
      Intensity view is picked from the stage rail, where it moved from the
      Controls page.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Every tool
      result is now checked against what it should be, both pages start in
      flat 2D mode and the marks come from the shared harness.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness.

✒ Description:
    Drives tools in each lab and checks what they did: throwing, spawning,
    sources, bob dragging, cloth cutting, tab focus and the mobile layout.

✒ Key Features:
    - Gravity throw and drop each add a body; the wheel syncs the zoom
      slider.
    - Collisions spawn with the drag speed; the pool rack locks its count.
    - Waves frequency control enables with a source.
    - Chaos bob drag syncs its slider.
    - Mobile page has no horizontal overflow.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import re
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, shot, scene
with sync_playwright() as p:
    b = launch(p)
    pg = open_page(b, viewport={"width": 1440, "height": 900})
    pg.goto(URL + "#fluid"); pg.wait_for_timeout(5000)
    ok("boot_lab", pg.evaluate("PhysicsPlayground.active.id") == "fluid", pg.evaluate("PhysicsPlayground.active.id"))
    pg.screenshot(path=shot("fluid2.png"))
    r = pg.inner_text("#readouts")
    ok("fluid_readouts", re.search(r"Particles\s+\d+ / \d+", r) is not None and "Obstacles" in r, r[:40])
    box = pg.locator("#stage-canvas").bounding_box()
    cx, cy = box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5
    # gravity: drag to launch, click to orbit. Paused for the count, because the random orbits of the
    # running scene can merge two bodies at any moment.
    pg.keyboard.press("1"); pg.wait_for_timeout(300)
    pg.evaluate("PhysicsPlayground.pause()")
    n0 = pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length")
    z0 = pg.evaluate("PhysicsPlayground.labs.gravity.p.zoom")
    pg.mouse.move(cx + 250, cy - 200); pg.mouse.down(); pg.mouse.move(cx + 200, cy - 120, steps=8)
    pg.wait_for_timeout(200); pg.screenshot(path=shot("gravity_aim.png")); pg.mouse.up()
    # A click within reach of a body follows it instead of dropping a new one, so aim at clear sky.
    spots = [[box["width"] * 0.5 - 150 + 40 * k, box["height"] * 0.5 + 60] for k in range(6)]
    spot = pg.evaluate("(spots) => spots.find(([x, y]) => !PhysicsPlayground.labs.gravity.bodyAt({ x, y }))", spots)
    pg.mouse.click(box["x"] + spot[0], box["y"] + spot[1])
    r = pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length") - n0
    ok("gravity_throw_and_drop_add_bodies", r == 2, r)
    pg.evaluate("PhysicsPlayground.play()")
    pg.mouse.wheel(0, -300); pg.wait_for_timeout(700)
    settle(pg, f"PhysicsPlayground.labs.gravity.p.zoom > {z0 * 1.2}")
    r = pg.evaluate("[PhysicsPlayground.labs.gravity.p.zoom, document.getElementById('ctl-gravity-zoom-out').textContent]")
    ok("gravity_wheel_zooms", r[0] > z0 * 1.2, (round(z0, 3), round(r[0], 3)))
    ok("zoom_slider_follows", r[1] == f"{r[0]:.2f}×", r[1])
    # collisions: click empty -> spawn, drag throw
    pg.keyboard.press("2"); pg.wait_for_timeout(200)
    scene(pg, "#preset-collisions-pool"); pg.wait_for_timeout(100)
    ok("pool_count_disabled", pg.evaluate("document.getElementById('ctl-collisions-count').disabled"))
    r = pg.inner_text("#ctl-collisions-count-note")
    ok("pool_count_note", "15-ball rack" in r, r)
    n0 = pg.evaluate("PhysicsPlayground.labs.collisions.n")
    pg.mouse.move(box["x"] + 60, box["y"] + 80); pg.mouse.down(); pg.mouse.move(box["x"] + 300, box["y"] + 200, steps=6); pg.mouse.up()
    r = pg.evaluate("PhysicsPlayground.labs.collisions.n") - n0
    ok("collisions_spawned", r == 1, r)
    r = pg.evaluate("(() => { const c = PhysicsPlayground.labs.collisions, i = c.n - 1; return Math.round(Math.hypot(c.vx[i], c.vy[i])) })()")
    ok("thrown_ball_has_speed", r > 100, r)
    # waves: source tool adds a source, enabling f
    pg.keyboard.press("4"); pg.wait_for_timeout(200)
    scene(pg, "#preset-waves-ripple"); pg.wait_for_timeout(100)
    ok("f_disabled_without_source", pg.evaluate("document.getElementById('ctl-waves-f').disabled"))
    pg.click("#dock-waves-source"); pg.mouse.click(cx, cy)
    r = pg.evaluate("PhysicsPlayground.labs.waves.sources.length")
    ok("source_added", r == 1, r)
    ok("f_enabled_with_source", not pg.evaluate("document.getElementById('ctl-waves-f').disabled"))
    pg.click("#view-waves-int"); scene(pg, "#preset-waves-lens"); pg.wait_for_timeout(7000)
    pg.screenshot(path=shot("waves_lens_int.png"))
    # chaos: drag bob 2, paused so it is still where it was read when the mouse goes down
    pg.keyboard.press("5"); pg.wait_for_timeout(300)
    pg.evaluate("PhysicsPlayground.pause()")
    bob = pg.evaluate("(() => { const c = PhysicsPlayground.labs.chaos, b = c.bobs(0); return [b.x2, b.y2] })()")
    t0 = pg.evaluate("PhysicsPlayground.labs.chaos.p.theta2")
    pg.mouse.move(box["x"] + bob[0], box["y"] + bob[1]); pg.mouse.down(); pg.mouse.move(box["x"] + bob[0] + 80, box["y"] + bob[1] - 60, steps=5); pg.mouse.up()
    r = pg.evaluate("PhysicsPlayground.labs.chaos.p.theta2")
    ok("bob_drag_sets_theta2", abs(r - t0) > 5, (t0, r))
    ok("theta2_slider_follows", pg.inner_text("#ctl-chaos-theta2-out") == f"{r:.1f}°", pg.inner_text("#ctl-chaos-theta2-out"))
    pg.evaluate("PhysicsPlayground.play()")
    pg.wait_for_timeout(9000); pg.screenshot(path=shot("chaos2.png"))
    # cloth: cut across
    pg.keyboard.press("6"); pg.wait_for_timeout(500)
    alive0 = pg.evaluate("PhysicsPlayground.labs.cloth.alive.subarray(0, PhysicsPlayground.labs.cloth.L).reduce((a,b)=>a+b,0)")
    pg.keyboard.down("Shift"); pg.mouse.move(cx - 300, cy - 50); pg.mouse.down(); pg.mouse.move(cx + 300, cy - 30, steps=20); pg.mouse.up(); pg.keyboard.up("Shift")
    pg.wait_for_timeout(2500)
    r = alive0 - pg.evaluate("PhysicsPlayground.labs.cloth.alive.subarray(0, PhysicsPlayground.labs.cloth.L).reduce((a,b)=>a+b,0)")
    ok("cloth_links_cut", r >= 10, r)
    pg.screenshot(path=shot("cloth_cut.png"))
    # focus ring visibility: Tab leaves the rail for the workspace controls, with a visible ring
    pg.focus("#tab-cloth"); pg.keyboard.press("Tab"); pg.keyboard.press("Tab")
    r = pg.evaluate("(() => { const a = document.activeElement; return [a.id || a.textContent, !!a.closest('.top-actions'), a.matches(':focus-visible')] })()")
    ok("tab_reaches_workspace_controls", r[1] and r[2], r)
    # narrow viewport
    m = open_page(b, viewport={"width": 390, "height": 844}, device_scale_factor=2)
    m.goto(URL + "#waves"); m.wait_for_timeout(3000)
    m.screenshot(path=shot("mobile_top.png"))
    r = m.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    ok("mobile_no_horizontal_overflow", r[0] <= r[1], r)
    m.evaluate("window.scrollTo(0, 900)"); m.wait_for_timeout(500)
    m.screenshot(path=shot("mobile_panel.png"))
    b.close()
finish()
