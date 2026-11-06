"""
✒ Metadata
    - Title: Interaction Test (digiSpace Edition - v2.0)
    - File Name: interact.py
    - Relative Path: tests/interact.py
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
    Drives tools in each lab: stirring, throwing, sources, bob dragging,
    cloth cutting, tab focus and the mobile layout.

✒ Key Features:
    - Waves frequency control enables with a source.
    - Chaos bob drag syncs its slider.
    - Mobile page has no horizontal overflow.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot
errors = []
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL + "#fluid"); pg.wait_for_timeout(5000)
    out = {"boot_lab": pg.evaluate("PhysicsPlayground.active.id")}
    pg.screenshot(path=shot("fluid2.png"))
    out["fluid_readouts"] = pg.inner_text("#readouts")
    box = pg.locator("#stage-canvas").bounding_box()
    cx, cy = box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5
    # gravity: drag to launch, click to orbit
    pg.keyboard.press("1"); pg.wait_for_timeout(300)
    n0 = pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length")
    pg.mouse.move(cx + 250, cy - 200); pg.mouse.down(); pg.mouse.move(cx + 200, cy - 120, steps=8)
    pg.wait_for_timeout(200); pg.screenshot(path=shot("gravity_aim.png")); pg.mouse.up()
    pg.mouse.click(cx - 150, cy + 60)
    out["gravity_bodies_added"] = pg.evaluate("PhysicsPlayground.labs.gravity.bodies.length") - n0
    pg.mouse.wheel(0, -300); pg.wait_for_timeout(100)
    out["gravity_zoom_after_wheel"] = pg.evaluate("PhysicsPlayground.labs.gravity.p.zoom")
    out["zoom_slider_text"] = pg.inner_text("#ctl-gravity-zoom-out")
    # collisions: click empty -> spawn, drag throw
    pg.keyboard.press("2"); pg.wait_for_timeout(200)
    pg.click("#preset-collisions-pool"); pg.wait_for_timeout(100)
    out["pool_count_disabled"] = pg.evaluate("document.getElementById('ctl-collisions-count').disabled")
    out["pool_count_note"] = pg.inner_text("#ctl-collisions-count-note")
    n0 = pg.evaluate("PhysicsPlayground.labs.collisions.n")
    pg.mouse.move(box["x"] + 60, box["y"] + 80); pg.mouse.down(); pg.mouse.move(box["x"] + 300, box["y"] + 200, steps=6); pg.mouse.up()
    out["collisions_spawned"] = pg.evaluate("PhysicsPlayground.labs.collisions.n") - n0
    out["thrown_speed"] = pg.evaluate("(() => { const c = PhysicsPlayground.labs.collisions, i = c.n - 1; return Math.round(Math.hypot(c.vx[i], c.vy[i])) })()")
    # waves: source tool adds a source, enabling f
    pg.keyboard.press("4"); pg.wait_for_timeout(200)
    pg.click("#preset-waves-ripple"); pg.wait_for_timeout(100)
    out["f_disabled_without_source"] = pg.evaluate("document.getElementById('ctl-waves-f').disabled")
    pg.click("#dock-waves-source"); pg.mouse.click(cx, cy)
    out["sources_after_click"] = pg.evaluate("PhysicsPlayground.labs.waves.sources.length")
    out["f_disabled_with_source"] = pg.evaluate("document.getElementById('ctl-waves-f').disabled")
    pg.click("#ctl-waves-view-int"); pg.click("#preset-waves-lens"); pg.wait_for_timeout(7000)
    pg.screenshot(path=shot("waves_lens_int.png"))
    # chaos: drag bob 2
    pg.keyboard.press("5"); pg.wait_for_timeout(300)
    bob = pg.evaluate("(() => { const c = PhysicsPlayground.labs.chaos, b = c.bobs(0); return [b.x2, b.y2] })()")
    pg.mouse.move(box["x"] + bob[0], box["y"] + bob[1]); pg.mouse.down(); pg.mouse.move(box["x"] + bob[0] + 80, box["y"] + bob[1] - 60, steps=5); pg.mouse.up()
    out["theta2_after_drag"] = pg.evaluate("PhysicsPlayground.labs.chaos.p.theta2")
    out["theta2_slider"] = pg.inner_text("#ctl-chaos-theta2-out")
    pg.wait_for_timeout(9000); pg.screenshot(path=shot("chaos2.png"))
    # cloth: cut across
    pg.keyboard.press("6"); pg.wait_for_timeout(500)
    alive0 = pg.evaluate("PhysicsPlayground.labs.cloth.alive.subarray(0, PhysicsPlayground.labs.cloth.L).reduce((a,b)=>a+b,0)")
    pg.keyboard.down("Shift"); pg.mouse.move(cx - 300, cy - 50); pg.mouse.down(); pg.mouse.move(cx + 300, cy - 30, steps=20); pg.mouse.up(); pg.keyboard.up("Shift")
    pg.wait_for_timeout(2500)
    out["cloth_links_cut"] = alive0 - pg.evaluate("PhysicsPlayground.labs.cloth.alive.subarray(0, PhysicsPlayground.labs.cloth.L).reduce((a,b)=>a+b,0)")
    pg.screenshot(path=shot("cloth_cut.png"))
    # focus ring visibility
    pg.focus("#tab-cloth"); pg.keyboard.press("Tab"); pg.keyboard.press("Tab")
    out["focus_after_tabs"] = pg.evaluate("document.activeElement.id || document.activeElement.textContent")
    # narrow viewport
    m = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    m.on("pageerror", lambda e: errors.append("mobile: " + str(e)))
    m.goto(URL + "#waves"); m.wait_for_timeout(3000)
    m.screenshot(path=shot("mobile_top.png"))
    out["mobile_scrollwidth"] = m.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    m.evaluate("window.scrollTo(0, 900)"); m.wait_for_timeout(500)
    m.screenshot(path=shot("mobile_panel.png"))
    out["errors"] = errors
    b.close()
print(json.dumps(out, indent=1))
