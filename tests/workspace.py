"""
✒ Metadata
    - Title: Workspace Tests (digiSpace Edition - v2.4)
    - File Name: workspace.py
    - Relative Path: tests/workspace.py
    - Artifact Type: test
    - Version: 2.4.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the unified interaction architecture of release 2.4.0: the stage
      rail, view modes, Chaos's three views, the deck workspace, object
      inspection and unit systems.

✒ Description:
    Drives the 2.4.0 workspace in the flat view: the rail that keeps its
    camera group in one place, view modes that never restart a run, Chaos's
    Pendulum, Phase map and Both views with a selection shared between them,
    the deck's panes and sizes, inspection of posts and sources, and the
    Metric, US and Simulation unit systems.

✒ Key Features:
    - Rail: the camera group sits at the same height in every lab; tools
      and views are radio groups with arrow keys, Home and End.
    - Views: V and the View group switch without touching time or trails.
    - Chaos: map-only layout with the torus, no pendulum to grab, a dot
      click that selects, Inspect opening on its own, and a figure plotted.
    - Deck: Insights pane, size presets, the grip on the keyboard.
    - Inspection: a Fluid post and a Waves source, each removable.
    - Units: readings, controls, typed values and the scale bar follow the
      system; the simulation does not change.

✒ Usage Instructions:
    $ python tests/workspace.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, scene

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
state = lambda expr: pg.evaluate(P + "." + expr)
pane = lambda: pg.evaluate("document.getElementById('tile-deck').dataset.pane")
ADVANCE = "(s => {{ const P = PhysicsPlayground, L = P.active, end = L.t + s; while (L.t < end - 1e-9) if (!P.advance(Math.min(1 / 60, end - L.t))) break; }})({})"

with sync_playwright() as p:
    b = launch(p)

    def fresh(lab):
        """A new page with its own storage, ready on the given lab."""
        ctx = b.new_context(viewport=VIEW)
        page = open_page(ctx)
        page.goto(URL + "#" + lab)
        page.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === '%s'" % lab)
        page.wait_for_timeout(500)
        return page

    def to_screen(wx, wy):
        """Screen coordinates of a world point, from two samples of the camera's own toWorld."""
        r = pg.locator("#stage-canvas").bounding_box()
        a, c = state("view.toWorld(0, 0)"), state("view.toWorld(100, 100)")
        return r["x"] + (wx - a["x"]) * 100 / (c["x"] - a["x"]), r["y"] + (wy - a["y"]) * 100 / (c["y"] - a["y"])

    # ---- the rail: the camera group sits in one place whatever the lab's tools and views
    pg = fresh("gravity")
    tops = {}
    for lab in ["gravity", "fluid", "waves", "chaos", "fields"]:
        pg.click("#tab-" + lab); pg.wait_for_timeout(300)
        tops[lab] = round(pg.locator("#nav-zoom").bounding_box()["y"])
    ok("rail_camera_group_fixed", len(set(tops.values())) == 1, tops)
    pg.click("#tab-chaos"); pg.wait_for_timeout(300)
    ok("rail_tools_and_views_split", pg.is_visible("#nav-views") and not pg.is_visible("#nav-tools") and pg.locator("#views [role=radio]").count() == 3)
    pg.click("#tab-waves"); pg.wait_for_timeout(300)
    ok("rail_waves_has_both", pg.is_visible("#nav-tools") and pg.is_visible("#nav-views"))
    pg.focus("#dock-waves-pulse"); pg.keyboard.press("ArrowRight")
    ok("tools_arrow_selects", state("active.p.tool") == "wall" and pg.evaluate("document.activeElement.id") == "dock-waves-wall")
    pg.keyboard.press("End")
    ok("tools_end_selects_last", state("active.p.tool") == "glass")
    ok("tools_roving_tabindex", pg.locator("#dock [tabindex='0']").count() == 1)
    pg.focus("#view-waves-disp"); pg.keyboard.press("ArrowDown")
    ok("views_arrow_selects", state("active.p.view") == "int" and pg.get_attribute("#view-waves-int", "aria-checked") == "true")
    pg.context.close()

    # ---- Chaos views: switching keeps the run; the map-only view has the torus and no pendulum to grab
    pg = fresh("chaos")
    # Nine seconds in, the copies have spread apart, so a dot on the map stands on its own.
    pg.evaluate(ADVANCE.format(9)); pg.evaluate(P + ".pause()")
    t0, tn0 = state("active.t"), state("active.tn")
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    for _ in range(3):
        pg.keyboard.press("v"); pg.wait_for_timeout(150)
    ok("v_cycles_views", state("active.p.view") == "pend", state("active.p.view"))
    ok("views_keep_the_run", state("active.t") == t0 and state("active.tn") == tn0)
    pg.click("#view-chaos-phase"); pg.wait_for_timeout(300)
    q, tor = state("active.sq"), state("active.tor")
    ok("phase_view_has_torus", tor is not None and tor["x"] > q["x0"] + q["S"], tor)
    ok("phase_view_no_pendulum", state("active.hitBob(PhysicsPlayground.active.pivot)") is None)
    ok("phase_view_keeps_the_run", state("active.t") == t0)
    pg.click("#view-chaos-both"); pg.wait_for_timeout(300)
    ok("both_view_pendulum_beside_map", state("active.pivot.x") < state("active.sq.x0"))
    k = pg.evaluate("""(() => { const L = PhysicsPlayground.active, D = [...Array(L.N).keys()].map(i => L.dotAt(i));
      let best = 1, far = -1;
      for (let i = 1; i < L.N; i++) { let m = Infinity; for (let j = 0; j < L.N; j++) if (j !== i) m = Math.min(m, Math.hypot(D[i].x - D[j].x, D[i].y - D[j].y)); if (m > far) { far = m; best = i; } }
      return best; })()""")
    d = state("active.dotAt(%d)" % k)
    pg.mouse.click(*to_screen(d["x"], d["y"])); pg.wait_for_timeout(700)
    ok("dot_click_selects_copy", state("active.sel") == k and state("active.t") == t0, (state("active.sel"), k))
    ok("selection_opens_inspect", pane() == "inspect" and pg.is_visible("#details") and ("Copy %d" % (k + 1)) in pg.inner_text("#details-kicker"), pane())
    ok("inspect_is_read_only", pg.locator("#dp-inspect input, #dp-inspect [role=slider]").count() == 0)
    pg.locator(".drow-plot").first.click(); pg.wait_for_timeout(200)
    ok("object_figure_plots", pg.locator(".drow-plot[aria-pressed=true]").count() == 1 and state("active.inst.pins.size") == 1)
    pg.click("#details-close"); pg.wait_for_timeout(500)
    ok("clearing_returns_to_telemetry", pane() == "telemetry" and state("active.sel") == -1, pane())
    ok("object_series_in_scope", pg.locator(".scope-chip").count() == 1 and ("Copy %d" % (k + 1)) in pg.inner_text("#scope-legend"))
    pg.context.close()

    # ---- the deck: Insights in place of a floating sheet, size presets, and the grip on the keyboard
    pg = fresh("fluid")
    pg.click("#dt-insights"); pg.wait_for_timeout(300)
    ok("insights_pane_shows", pane() == "insights" and pg.is_visible("#insights") and pg.is_visible("#perf-spark"))
    pg.keyboard.press("ArrowLeft")
    ok("deck_tabs_arrow_keys", pane() == "inspect" and pg.evaluate("document.activeElement.id") == "dt-inspect")
    ok("inspect_empty_says_how", "post" in pg.inner_text("#inspect-empty").lower())
    h = lambda: pg.locator("#tile-deck").bounding_box()["height"]
    std = h(); pg.click("#btn-deck-size"); pg.wait_for_timeout(400); tall = h()
    pg.click("#btn-deck-size"); pg.wait_for_timeout(400); compact = h()
    ok("deck_size_presets", tall > std + 40 and compact < std - 40, (round(compact), round(std), round(tall)))
    ok("compact_hides_the_plot", not pg.is_visible("#chart") or pane() != "telemetry")
    pg.click("#btn-deck-size"); pg.wait_for_timeout(400)
    pg.focus("#deck-grip"); pg.keyboard.press("ArrowUp"); pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(400)
    ok("grip_steps_taller", abs(h() - (std + 48)) < 4 and "deck-sized" in pg.get_attribute("#bento", "class"), round(h()))
    pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    ok("grip_enter_restores", abs(h() - std) < 4)

    # ---- inspecting a Fluid post: any tool but Obstacle selects it, and the card can remove it
    scene(pg, "#preset-fluid-posts"); pg.wait_for_timeout(500)
    n0 = state("active.obs.length")
    o = pg.evaluate("(() => { const L = PhysicsPlayground.active, o = L.obs[0]; return { x: o.x * L.U, y: o.y * L.U }; })()")
    pg.mouse.click(*to_screen(o["x"], o["y"])); pg.wait_for_timeout(700)
    ok("post_click_selects", pane() == "inspect" and "Post 1" in pg.inner_text("#details-kicker") and state("active.obs.length") == n0)
    pg.click("#details-actions button"); pg.wait_for_timeout(400)
    ok("post_removed_from_card", state("active.obs.length") == n0 - 1 and pg.is_hidden("#details"))
    pg.context.close()

    # ---- inspecting a Waves source: a click on it selects instead of removing it
    pg = fresh("waves")
    scene(pg, "#preset-waves-twosrc"); pg.wait_for_timeout(500)
    s = pg.evaluate("(() => { const L = PhysicsPlayground.active, s = L.sources[0]; return { x: s.x * L.cs, y: s.y * L.cs }; })()")
    pg.click("#dock-waves-source")
    pg.mouse.click(*to_screen(s["x"], s["y"])); pg.wait_for_timeout(700)
    ok("source_click_selects", state("active.sources.length") == 2 and "Source 1" in pg.inner_text("#details-kicker"))
    ok("source_rows_in_units", " m" in pg.inner_text("#details-rows") and "Hz" in pg.inner_text("#details-rows"))
    pg.context.close()

    # ---- units: readings, controls and typed values follow the system; the physics does not
    pg = fresh("fluid")
    ok("units_default_metric", state("units.get()") == "si" and pg.inner_text("#btn-units-label") == "Metric")
    g_label = lambda: pg.inner_text("#ctl-fluid-gravity-out")
    ok("control_in_metric", g_label().endswith("m/s²") and g_label().startswith("9.8"), g_label())
    pg.keyboard.press("u"); pg.wait_for_timeout(200)
    ok("u_opens_units", pg.is_visible("#units-sheet") and "1.09 cm" in pg.inner_text("#units-scale"))
    pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(300)
    ok("arrow_picks_us", state("units.get()") == "us" and g_label().endswith("ft/s²") and g_label().startswith("32.2"), g_label())
    pg.keyboard.press("Escape")
    ok("escape_closes_units", pg.is_hidden("#units-sheet"))
    pg.evaluate(P + ".units.set('si')"); pg.wait_for_timeout(300)
    pg.click("#ctl-fluid-gravity-out"); pg.keyboard.press("Control+A"); pg.keyboard.type("4.905"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok("typed_value_in_display_units", abs(state("active.p.gravity") - 450) < 0.6, state("active.p.gravity"))
    pg.evaluate(P + ".units.set('sim')"); pg.wait_for_timeout(300)
    ok("simulation_units_are_pixels", g_label().endswith("px/s²") and pg.inner_text("#scalebar-lbl").endswith("px"), (g_label(), pg.inner_text("#scalebar-lbl")))
    pg.click("#tab-gravity"); pg.wait_for_timeout(300)
    pg.evaluate(P + ".units.set('si')"); pg.wait_for_timeout(400)
    ok("gravity_is_astronomical", "AU" in pg.inner_text("#scalebar-lbl") and ("days" in pg.inner_text("#hud-time") or "yr" in pg.inner_text("#hud-time")), (pg.inner_text("#scalebar-lbl"), pg.inner_text("#hud-time")))
    pg.click("#tab-chaos"); pg.wait_for_timeout(300)
    ok("chaos_energy_in_si", "J/kg" in pg.inner_text("#readouts"))
    pg.evaluate(P + ".units.set('us')"); pg.wait_for_timeout(400)
    ok("chaos_energy_in_us", "ft²/s²" in pg.inner_text("#readouts") and abs(state("active.p.g") - 9.81) < 1e-9)
    pg.context.close()

    b.close()
finish()
