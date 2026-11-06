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
    - Orbit, Shift-drag pan, wheel zoom and the floor limit on the camera.
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
LIT = """(() => { const c = document.getElementById('stage-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let lit = 0, n = 0; for (let i = 0; i < d.length; i += 256) { n++; if (d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1 > 24) lit++; } return lit / n; })()"""


def page(owner, tier="lite", mode="3d", lab="chaos", **kw):
    pg = open_page(owner, mode=mode, viewport=VIEW, **kw)
    pg.add_init_script(f"try {{ localStorage.setItem('psp:tier', '\"{tier}\"'); }} catch (_) {{ /* no storage here */ }}")
    pg.goto(URL + "#" + lab)
    return pg


with sync_playwright() as p:
    b = launch(p)

    # Every lab renders.
    ctx = b.new_context()
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

    ctx = b.new_context()
    pg = ctx.new_page(); pg.set_viewport_size(VIEW)
    pg.goto(URL)
    ok("3d_is_the_default", pg.evaluate(f"{P}.mode.get()") == "3d")
    ctx.close()

    # A click lands where it points, from any angle.
    ctx = b.new_context()
    pg = page(ctx)
    settle(pg, IS3D, 30000)
    for lab in PLANES:
        pg.evaluate(f"{P}.select('{lab}')"); settle(pg, IS3D, 20000); pg.wait_for_timeout(300)
        pg.evaluate(f"{P}.view.orbit(70, -30)"); pg.wait_for_timeout(200)
        err = pg.evaluate("""(() => { const L = PhysicsPlayground.active, W = L.plane3(), x = W.cx * 0.6, y = W.cy * 1.3, s = L.project3(x, y), q = s && L.pick3(s); return q ? Math.hypot(q.x - x, q.y - y) : 1e9; })()""")
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
    pg.evaluate(f"{P}.capture.toggleVideo()"); pg.wait_for_timeout(1500); pg.evaluate(f"{P}.capture.toggleVideo()")
    ok("video_saves_from_3d", settle(pg, f"{P}.capture.vault.list().some(i => i.kind === 'clip' && !i.saving && i.sizeBytes > 0)", 10000))
    ctx.close()

    # Graphics tiers.
    ctx = b.new_context()
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
    ctx = b.new_context()
    pg = open_page(ctx, mode="3d", watch=False, viewport=VIEW)
    pg.route("**/three@*/**", lambda r: r.abort())
    pg.goto(URL + "#chaos")
    ok("no_three_falls_back", settle(pg, f"window.PhysicsPlayground && {P}.mode.get() === '2d' && !!{P}.mode.world.fail", 20000))
    ok("no_three_switch_disabled", pg.evaluate("document.getElementById('mode-3d').disabled"))
    ok("no_three_says_why", "three.js" in pg.evaluate("document.getElementById('mode-3d').title"))
    t0 = pg.evaluate(f"{P}.active.t"); pg.wait_for_timeout(500)
    ok("no_three_still_runs", pg.evaluate(f"{P}.active.t") > t0)
    ctx.close()

    ctx = b.new_context()
    pg = open_page(ctx, mode="3d", watch=False, viewport=VIEW)
    pg.add_init_script("const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return t === 'webgl2' ? null : g.call(this, t, o); };")
    pg.goto(URL + "#chaos"); pg.wait_for_timeout(1200)
    ok("no_webgl2_stays_2d", pg.evaluate(f"{P}.mode.get()") == "2d" and pg.evaluate("document.getElementById('mode-3d').disabled"))
    ctx.close()

    ctx = b.new_context()
    pg = open_page(ctx, mode="3d", watch=False, viewport=VIEW)
    pg.add_init_script("try { localStorage.setItem('psp:tier', '\"lite\"'); } catch (_) { /* no storage here */ }")
    pg.goto(URL + "#chaos"); settle(pg, IS3D, 30000)
    pg.evaluate(f"window.__lose = {P}.mode.world.engine.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext()")
    ok("lost_context_drops_to_2d", settle(pg, f"!{P}.mode.is3D()", 8000))
    ok("lost_context_keeps_the_mode", pg.evaluate(f"{P}.mode.get()") == "3d")
    pg.evaluate("window.__lose.restoreContext()")
    ok("restored_context_returns", settle(pg, IS3D, 12000))
    pg.wait_for_timeout(600)
    ok("restored_context_draws", pg.evaluate(LIT) > 0.02)
    pg.evaluate(f"{P}.labs.chaos.bobR = () => {{ throw new Error('planted') }}")
    ok("broken_scene_goes_to_2d", settle(pg, f"!{P}.mode.is3D()", 8000))
    pg.evaluate(f"{P}.select('cloth')")
    ok("other_labs_unaffected", settle(pg, IS3D, 20000))
    ctx.close()

    # Soak: every scene of every lab, twice. The second lap must not grow.
    ctx = b.new_context()
    pg = page(ctx, tier="high")
    crashed = []
    pg.on("crash", lambda *_: crashed.append(1))
    settle(pg, IS3D, 30000)
    lap = f"""async () => {{
      for (const id of {LABS!r}) {{
        {P}.select(id);
        const L = {P}.active;
        for (const q of L.presets) {{ {P}.preset(q.id); await new Promise(r => setTimeout(r, 250)); }}
      }}
      await new Promise(r => setTimeout(r, 600));
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
