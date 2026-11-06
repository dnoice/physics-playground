"""
✒ Metadata
    - Title: 3D Mode Test (digiSpace Edition - v2.1)
    - File Name: world.py
    - Relative Path: tests/world.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      with the 3D mode: rendering, the mode switch, picking, the camera,
      capture, graphics tiers, every failure path and a resource soak.

✒ Description:
    Drives the 3D mode through the real interface. It checks that each lab
    renders, that the simulation does not notice a change of mode, that a
    click lands where it points, and that every way 3D can fail ends in a
    working 2D stage that says why.

✒ Key Features:
    - Every lab draws lit pixels with no console messages.
    - Switching modes neither resets nor pauses the run, and is remembered.
    - Ray picking round-trips within two world units on every plane lab.
    - Orbit, Shift-drag pan, wheel zoom and the floor limit on the camera;
      the pivot stays on the apparatus, zooming out returns home, the first
      pan does not jump, a resize keeps the angle, and dragging the space
      around the apparatus orbits.
    - Instruments: a reading plots, the plot rewinds and scrubs, plotted
      readings are remembered, and diagnostics open on demand.
    - Rewind and video capture work on the 3D stage.
    - All five tiers apply; Auto lands on Lite under software rendering and
      steps down from a tier the machine cannot hold.
    - No three.js, no WebGL 2, a lost context and a scene that throws each
      leave a working workspace.
    - A soak through every scene of every lab, twice, finds growth in GPU
      resources and JavaScript heap, and any crash.

✒ Usage Instructions:
    $ python tests/world.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle

VIEW = {"width": 1100, "height": 700}
P = "PhysicsPlayground"
LABS = ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]
PLANES = ["collisions", "fluid", "waves", "chaos", "cloth", "fields"]
IS3D = "window.PhysicsPlayground && PhysicsPlayground.mode.is3D()"
# Read a small copy: reading the stage itself would push it onto a slow software path and starve the recorder.
LIT = """(() => { const t = document.createElement('canvas'); t.width = 96; t.height = 60; const g = t.getContext('2d', { willReadFrequently: true });
  g.drawImage(document.getElementById('stage-canvas'), 0, 0, 96, 60); const d = g.getImageData(0, 0, 96, 60).data;
  let lit = 0, n = 0; for (let i = 0; i < d.length; i += 4) { n++; if (d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1 > 24) lit++; } return lit / n; })()"""


def page(owner, tier="lite", mode="3d", lab="chaos", **kw):
    pg = open_page(owner, mode=mode, **kw)
    pg.add_init_script(f"try {{ localStorage.setItem('psp:tier', '\"{tier}\"'); }} catch (_) {{ /* no storage here */ }}")
    pg.goto(URL + "#" + lab)
    return pg


with sync_playwright() as p:
    b = launch(p)

    # Every lab renders.
    ctx = b.new_context(viewport=VIEW)
    pg = page(ctx)
    ok("engine_ready", settle(pg, IS3D, 30000))
    for lab in LABS:
        pg.evaluate(f"{P}.select('{lab}')")
        up = settle(pg, IS3D, 20000)
        pg.wait_for_timeout(700)
        ok(f"{lab}_renders", up and pg.evaluate(LIT) > 0.02, round(pg.evaluate(LIT), 3))
    ok("orbit_ball_shown", not pg.evaluate("document.getElementById('nav-orbit').hidden"))
    ok("stage_marked_3d", pg.evaluate("document.getElementById('stage').dataset.mode") == "3d")

    # The mode switch leaves the simulation alone, and is remembered.
    pg.evaluate(f"{P}.select('chaos')"); settle(pg, IS3D)
    pg.wait_for_timeout(400)
    t0 = pg.evaluate(f"{P}.active.t")
    pg.click("#mode-2d"); pg.wait_for_timeout(500)
    ok("switch_to_2d", pg.evaluate(f"{P}.mode.get()") == "2d" and not pg.evaluate(f"{P}.mode.is3D()"))
    ok("orbit_ball_hidden_in_2d", pg.evaluate("document.getElementById('nav-orbit').hidden"))
    ok("run_survives_switch", pg.evaluate(f"{P}.active.t") >= t0, t0)
    ok("flat_view_draws", pg.evaluate(LIT) > 0.005)
    pg.keyboard.press("z")
    ok("z_returns_to_3d", settle(pg, IS3D))
    pg.reload()
    ok("mode_remembered", settle(pg, IS3D, 30000))
    ok("switch_state_true", pg.evaluate("document.getElementById('mode-3d').getAttribute('aria-checked')") == "true")
    ctx.close()

    ctx = b.new_context(viewport=VIEW)
    pg = ctx.new_page()
    pg.goto(URL)
    ok("3d_is_the_default", pg.evaluate(f"{P}.mode.get()") == "3d")
    ctx.close()

    # A click lands where it points, from any angle.
    ctx = b.new_context(viewport=VIEW)
    pg = page(ctx)
    settle(pg, IS3D, 30000)
    for lab in PLANES:
        pg.evaluate(f"{P}.select('{lab}')"); settle(pg, IS3D, 20000); pg.wait_for_timeout(300)
        pg.evaluate(f"{P}.view.orbit(70, -30)"); pg.wait_for_timeout(200)
        err = pg.evaluate("""(() => { const L = PhysicsPlayground.active, W = L.plane3(), x = W.cx * 0.3, y = W.cy * 1.6, s = L.project3(x, y, L.lift3 ? L.lift3(x, y) : 0), q = s && L.pick3(s); return q ? Math.hypot(q.x - x, q.y - y) : 1e9; })()""")
        ok(f"{lab}_pick_round_trip", err < 2.5 / pg.evaluate("Math.min(1, PhysicsPlayground.active.plane3().k * 96)"), round(err, 3))

    # The camera.
    pg.evaluate(f"{P}.select('waves')"); settle(pg, IS3D); pg.wait_for_timeout(300)
    box = pg.locator("#stage-canvas").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    V = lambda: pg.evaluate(f"{P}.view.get()")
    v0 = V()
    pg.mouse.move(cx, cy); pg.mouse.down(button="right"); pg.mouse.move(cx + 100, cy, steps=5); pg.mouse.up(button="right")
    ok("right_drag_orbits", abs(V()["yaw"] - (v0["yaw"] - 0.8)) < 0.06, round(V()["yaw"] - v0["yaw"], 3))
    v1 = V()
    pg.keyboard.down("Shift"); pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx - 60, cy + 30, steps=5); pg.mouse.up(); pg.keyboard.up("Shift")
    v2 = V()
    ok("shift_left_drag_pans", abs(v2["tx"] - v1["tx"]) + abs(v2["tz"] - v1["tz"]) > 0.05 and abs(v2["yaw"] - v1["yaw"]) < 1e-6)
    d0 = V()["dist"]
    pg.mouse.move(cx, cy); pg.mouse.wheel(0, -300); pg.wait_for_timeout(500)
    ok("wheel_zooms", V()["dist"] < d0, round(V()["dist"] / d0, 3))
    pg.evaluate(f"{P}.view.orbit(0, -2000)"); pg.wait_for_timeout(300)
    ok("camera_stays_above_floor", pg.evaluate("PhysicsPlayground.active.camMatrices(800, 500).eye[1]") > 0.05)
    pg.keyboard.press("0"); pg.wait_for_timeout(900)
    ok("frame_key_returns_home", abs(V()["zoom"] - 100) < 8, round(V()["zoom"], 1))

    # The pivot stays on the apparatus, however the wheel wanders.
    pg.evaluate(f"{P}.select('collisions')"); settle(pg, IS3D); pg.wait_for_timeout(400)
    pg.evaluate(f"{P}.view.frame()"); pg.wait_for_timeout(700)
    home = V()
    for fx, fy in [(0.92, 0.1), (0.06, 0.9), (0.95, 0.92), (0.05, 0.08)]:
        pg.mouse.move(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
        for _ in range(4): pg.mouse.wheel(0, -240); pg.wait_for_timeout(40)
        for _ in range(2): pg.mouse.wheel(0, 240); pg.wait_for_timeout(40)
    pg.wait_for_timeout(600)
    off = pg.evaluate("""(() => { const L = PhysicsPlayground.active, c = L.c3(), P = L.plane3(), H = L.home3(); return Math.max(Math.abs(c.tx - H.tx) / P.hw, Math.abs(c.tz - H.tz) / P.hh); })()""")
    ok("wheel_keeps_pivot_on_apparatus", off <= 1.02, round(off, 3))
    for _ in range(14): pg.mouse.wheel(0, 240); pg.wait_for_timeout(30)
    pg.wait_for_timeout(700)
    v = V()
    ok("zooming_out_returns_home", abs(v["tx"] - home["tx"]) < 0.02 and abs(v["tz"] - home["tz"]) < 0.02, (round(v["tx"], 3), round(v["tz"], 3)))
    pg.evaluate(f"{P}.view.frame()"); pg.wait_for_timeout(700)
    v1 = V()
    pg.keyboard.down("Shift"); pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 4, cy, steps=2); pg.mouse.up(); pg.keyboard.up("Shift")
    v2 = V()
    ok("first_pan_does_not_jump", abs(v2["tx"] - v1["tx"]) + abs(v2["tz"] - v1["tz"]) < 0.25, round(abs(v2["tx"] - v1["tx"]) + abs(v2["tz"] - v1["tz"]), 3))
    pg.evaluate(f"{P}.view.orbit(120, 0)"); pg.wait_for_timeout(200)
    yaw = V()["yaw"]
    pg.keyboard.press("Shift+B"); pg.wait_for_timeout(700); pg.keyboard.press("Shift+B"); pg.wait_for_timeout(700)
    ok("resize_keeps_the_angle", abs(V()["yaw"] - yaw) < 1e-6, round(V()["yaw"] - yaw, 6))
    pg.evaluate(f"{P}.view.frame()"); pg.wait_for_timeout(700)
    n0 = pg.evaluate(f"{P}.labs.collisions.n"); y0 = V()["yaw"]
    pg.mouse.move(box["x"] + 14, box["y"] + box["height"] - 14); pg.mouse.down(); pg.mouse.move(box["x"] + 90, box["y"] + box["height"] - 14, steps=5); pg.mouse.up()
    ok("drag_around_apparatus_orbits", abs(V()["yaw"] - y0) > 0.2 and pg.evaluate(f"{P}.labs.collisions.n") == n0, round(V()["yaw"] - y0, 3))

    # Tools reach the simulation through the ray.
    n0 = pg.evaluate(f"{P}.labs.gravity.bodies.length")
    pg.evaluate(f"{P}.select('gravity')"); settle(pg, IS3D); pg.wait_for_timeout(300)
    pg.mouse.move(cx + 120, cy - 60); pg.mouse.down(); pg.mouse.move(cx + 60, cy, steps=6); pg.mouse.up()
    pg.wait_for_timeout(200)
    ok("throw_works_in_3d", pg.evaluate(f"{P}.labs.gravity.bodies.length") > n0)

    # Capture works on the 3D stage.
    pg.evaluate(f"{P}.select('chaos')"); settle(pg, IS3D); pg.wait_for_timeout(1400)
    size = pg.evaluate(f"{P}.history.size()")
    pg.evaluate(f"{P}.history.back()"); pg.wait_for_timeout(300)
    ok("rewind_in_3d", size > 1 and pg.evaluate(LIT) > 0.02, size)
    pg.evaluate(f"{P}.play()")
    pg.evaluate(f"{P}.capture.toggleVideo()"); pg.wait_for_timeout(3000); pg.evaluate(f"{P}.capture.toggleVideo()")
    ok("video_saves_from_3d", settle(pg, f"{P}.capture.vault.list().some(i => i.kind === 'clip' && !i.saving && i.sizeBytes > 0)", 10000))
    ctx.close()

    # Instruments: a reading plots, the plot rewinds, diagnostics open on demand.
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = page(ctx, lab="chaos")
    settle(pg, IS3D, 30000); pg.wait_for_timeout(2600)
    hits = pg.locator("#readouts .gauge-hit")
    ok("readings_are_gauges", hits.count() >= 4 and pg.locator("#readouts dd").count() == hits.count(), hits.count())
    ok("lab_chart_shows_first", pg.inner_text("#chart-title").upper() != "SCOPE")
    hits.nth(0).click()
    ok("reading_plots", settle(pg, "document.getElementById('chart-title').textContent === 'Scope'", 4000) and pg.locator(".scope-chip").count() == 1)
    ok("gauge_shows_pressed", hits.nth(0).get_attribute("aria-pressed") == "true")
    cb = pg.locator("#chart").bounding_box()
    t0 = pg.evaluate(f"{P}.active.t")
    pg.mouse.click(cb["x"] + cb["width"] * 0.3, cb["y"] + cb["height"] * 0.5); pg.wait_for_timeout(400)
    ok("plot_click_rewinds", pg.evaluate(f"{P}.active.t") < t0 and pg.evaluate(f"{P}.active.hist.pos") >= 0 and pg.evaluate(f"!{P}.state.running"), round(pg.evaluate(f"{P}.active.t"), 2))
    pg.mouse.move(cb["x"] + cb["width"] * 0.3, cb["y"] + cb["height"] * 0.5); pg.mouse.down(); pg.mouse.move(cb["x"] + cb["width"] * 0.8, cb["y"] + cb["height"] * 0.5, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    t1 = pg.evaluate(f"{P}.active.t")
    ok("plot_drag_scrubs_forward", pg.evaluate(f"{P}.active.hist.pos") >= 0 and t1 > t0 * 0.45, round(t1, 2))
    pg.reload(); settle(pg, IS3D, 30000); pg.wait_for_timeout(1400)
    ok("plotted_readings_remembered", pg.locator(".scope-chip").count() == 1)
    pg.locator(".scope-x").first.click(); pg.wait_for_timeout(300)
    ok("removing_the_last_returns_to_lab_chart", pg.inner_text("#chart-title").upper() != "SCOPE")
    pg.click("#diag-toggle")
    ok("diagnostics_open_on_demand", not pg.evaluate("document.getElementById('diag').hidden"))
    pg.keyboard.press("Escape")
    ok("escape_closes_diagnostics", pg.evaluate("document.getElementById('diag').hidden") and pg.evaluate("document.activeElement.id") == "diag-toggle")
    pg.click("#btn-deck-tall"); pg.wait_for_timeout(500)
    tall = pg.locator("#tile-deck").bounding_box()["height"]
    pg.click("#btn-deck-tall"); pg.wait_for_timeout(500)
    ok("deck_grows_and_shrinks", tall > pg.locator("#tile-deck").bounding_box()["height"] + 40, round(tall))
    ctx.close()

    # Graphics tiers.
    ctx = b.new_context(viewport=VIEW)
    pg = page(ctx, tier="auto")
    settle(pg, IS3D, 30000)
    ok("auto_finds_lite_on_software_gl", pg.evaluate(f"{P}.mode.world.engine.tier.id") == "lite")
    for tier in ["ultra", "high", "medium", "low", "lite"]:
        pg.evaluate(f"{P}.mode.tier('{tier}')"); pg.wait_for_timeout(600)
        ok(f"tier_{tier}_applies", pg.evaluate(f"{P}.mode.world.engine.tier.id") == tier and pg.evaluate(LIT) > 0.02)
    pg.click("#btn-gfx")
    ok("menu_opens", not pg.evaluate("document.getElementById('gfx-sheet').hidden"))
    ok("menu_lists_all_tiers", pg.evaluate("document.querySelectorAll('#gfx-list [role=radio]').length") == 6)
    pg.keyboard.press("Escape")
    ok("escape_closes_menu", pg.evaluate("document.getElementById('gfx-sheet').hidden") and pg.evaluate("document.activeElement.id") == "btn-gfx")
    pg.evaluate(f"{P}.mode.tier('auto')")
    pg.evaluate(f"{P}.mode.world.autoTier = 'ultra'; {P}.mode.world.engine.setTier({{ ...{P}.mode.world.engine.tier, id: 'ultra', scale: 2, msaa: 4, shadow: 4096, reflect: 0.75, bloom: true, grade: true, detail: 1 }})")
    ok("auto_steps_down_when_slow", settle(pg, f"{P}.mode.world.autoTier !== 'ultra'", 30000), pg.evaluate(f"{P}.mode.world.autoTier"))
    ctx.close()

    # Every way 3D can fail ends in a working 2D stage that says why.
    ctx = b.new_context(viewport=VIEW)
    pg = open_page(ctx, mode="3d", watch=False)
    pg.route("**/three@*/**", lambda r: r.abort())
    pg.goto(URL + "#chaos")
    ok("no_three_falls_back", settle(pg, f"window.PhysicsPlayground && {P}.mode.get() === '2d' && !!{P}.mode.world.fail", 20000))
    ok("no_three_switch_disabled", pg.evaluate("document.getElementById('mode-3d').disabled"))
    ok("no_three_says_why", "three.js" in pg.evaluate("document.getElementById('mode-3d').title"))
    t0 = pg.evaluate(f"{P}.active.t"); pg.wait_for_timeout(500)
    ok("no_three_still_runs", pg.evaluate(f"{P}.active.t") > t0)
    ctx.close()

    ctx = b.new_context(viewport=VIEW)
    pg = open_page(ctx, mode="3d", watch=False)
    pg.add_init_script("const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return t === 'webgl2' ? null : g.call(this, t, o); };")
    pg.goto(URL + "#chaos"); pg.wait_for_timeout(1200)
    ok("no_webgl2_stays_2d", pg.evaluate(f"{P}.mode.get()") == "2d" and pg.evaluate("document.getElementById('mode-3d').disabled"))
    ctx.close()

    ctx = b.new_context(viewport=VIEW)
    pg = open_page(ctx, mode="3d", watch=False)
    pg.add_init_script("try { localStorage.setItem('psp:tier', '\"lite\"'); } catch (_) { /* no storage here */ }")
    pg.goto(URL + "#chaos"); settle(pg, IS3D, 30000)
    pg.evaluate(f"window.__lose = {P}.mode.world.engine.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext()")
    ok("lost_context_drops_to_2d", settle(pg, f"!{P}.mode.is3D()", 8000))
    ok("lost_context_keeps_the_mode", pg.evaluate(f"{P}.mode.get()") == "3d")
    pg.evaluate("window.__lose.restoreContext()")
    ok("restored_context_returns", settle(pg, IS3D, 12000))
    pg.wait_for_timeout(600)
    ok("restored_context_draws", pg.evaluate(LIT) > 0.02)
    pg.evaluate(f"void ({P}.labs.chaos.bobR = () => {{ throw new Error('planted') }})")
    ok("broken_scene_goes_to_2d", settle(pg, f"!{P}.mode.is3D()", 8000))
    pg.evaluate(f"{P}.select('cloth')")
    ok("other_labs_unaffected", settle(pg, IS3D, 20000))
    ctx.close()

    # Soak: every scene of every lab, twice, drawn each time so its resources exist. The second lap must not grow.
    ctx = b.new_context(viewport=VIEW)
    pg = page(ctx, tier="high")
    crashed = []
    pg.on("crash", lambda *_: crashed.append(1))
    settle(pg, IS3D, 30000)
    lap = f"""async () => {{
      const frames = n => new Promise(r => {{ const f = () => n-- > 0 ? requestAnimationFrame(f) : r(); f(); }});
      for (const id of {LABS!r}) {{
        {P}.select(id);
        while (!{P}.mode.is3D()) await new Promise(r => setTimeout(r, 50));
        for (const q of {P}.active.presets) {{ {P}.preset(q.id); await frames(3); }}
      }}
      const i = {P}.mode.info();
      return {{ geo: i.geometries, tex: i.textures, heap: (performance.memory || {{}}).usedJSHeapSize || 0 }};
    }}"""
    pg.set_default_timeout(170000)
    one = pg.evaluate(lap)
    two = pg.evaluate(lap)
    ok("soak_no_crash", not crashed)
    ok("soak_geometry_stable", two["geo"] <= one["geo"] + 40, (one["geo"], two["geo"]))
    ok("soak_textures_stable", two["tex"] <= one["tex"] + 8, (one["tex"], two["tex"]))
    ok("soak_heap_stable", two["heap"] <= one["heap"] * 1.4, (one["heap"] >> 20, two["heap"] >> 20))
    ok("soak_still_renders", pg.evaluate(LIT) > 0.02)
    ctx.close()
    b.close()

finish()
