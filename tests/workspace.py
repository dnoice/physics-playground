"""
✒ Metadata
    - Title: Workspace Tests (digiSpace Edition - v2.18)
    - File Name: workspace.py
    - Relative Path: tests/workspace.py
    - Artifact Type: test
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for Insights that narrate the run: the Story's checks. A
      brown dwarf dropped at the Star system's edge moves the barycentre and
      reshapes orbits, and a star dropped there leaves the inner planets
      watched; three fast throws into Empty sky each get explained, then
      what follows, and two mergers in one look are both told; Collisions
      and Chaos tell their own moments; the unread count, the keyboard and
      focus through a fold, Show me, pause, rewind and a new scene. Insights
      now opens on its Story, or on Now while a warning stands, so the pane
      checks read both views. On Dennis's call for one settings dialog: U
      opens its Units section with focus on the current system, and Escape
      closes it.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the unified interaction architecture of release 2.4.0: the stage
      rail, view modes, Chaos's three views, the deck workspace, object
      inspection and unit systems.

✒ Description:
    Drives the 2.4.0 workspace in the flat view: the rail that keeps its
    camera group in one place, view modes that never restart a run, Chaos's
    Pendulum, Phase map and Both views with a selection shared between them,
    the deck's panes and sizes, inspection of posts and sources, the
    Metric, US and Simulation unit systems, and the Insights pane's Story
    told by each lab's narrator.

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
    - Story: Gravity's narrator explains a giant at the edge of the Star
      system, the inner planets of the binary a star there makes, three
      fast throws into Empty sky and two mergers in one look within a
      bounded run; Collisions and Chaos tell their own; the unread count,
      the keyboard, focus through a fold, Show me, pause, rewind and a new
      scene behave.

✒ Usage Instructions:
    $ python tests/workspace.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json

from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, scene, settle

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
state = lambda expr: pg.evaluate(P + "." + expr)
pane = lambda: pg.evaluate("document.getElementById('tile-deck').dataset.pane")
# The Inspect card refreshes at panel rate, which a loaded machine stretches; wait for it to name the selection.
card = lambda text: settle(pg, "document.getElementById('details-kicker').textContent.includes(%r)" % text, 10000)
WARNED = "['warn', 'crit'].includes(document.getElementById('diag-sum').dataset.level)"
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
    pg.mouse.click(*to_screen(d["x"], d["y"])); card("Copy %d" % (k + 1))
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
    # Insights opens on its Story, or on Now while a warning stands; the run's state (the insight cards) and the
    # frame-timing strip are its Now view. Paused, so a slow frame cannot raise a warning between the look and the click.
    pg.evaluate(P + ".pause()"); pg.wait_for_timeout(700)
    warned = pg.evaluate(WARNED)
    pg.click("#dt-insights"); pg.wait_for_timeout(300)
    first, other = ("now", "story") if warned else ("story", "now")
    ok("insights_pane_shows", pane() == "insights" and pg.is_visible("#ip-" + first) and pg.get_attribute("#iv-" + first, "aria-selected") == "true" and pg.is_hidden("#ip-" + other), warned)
    pg.click("#iv-now"); pg.wait_for_timeout(200)
    ok("insights_now_view", pg.is_visible("#insights") and pg.is_visible("#perf-spark") and pg.is_hidden("#ip-story"))
    pg.evaluate(P + ".play()")
    pg.focus("#dt-insights")
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
    pg.mouse.click(*to_screen(o["x"], o["y"])); card("Post 1")
    ok("post_click_selects", pane() == "inspect" and "Post 1" in pg.inner_text("#details-kicker") and state("active.obs.length") == n0)
    pg.click("#details-actions button"); pg.wait_for_timeout(400)
    ok("post_removed_from_card", state("active.obs.length") == n0 - 1 and pg.is_hidden("#details"))
    pg.context.close()

    # ---- inspecting a Waves source: a click on it selects instead of removing it
    pg = fresh("waves")
    scene(pg, "#preset-waves-twosrc"); pg.wait_for_timeout(500)
    s = pg.evaluate("(() => { const L = PhysicsPlayground.active, s = L.sources[0]; return { x: s.x * L.cs, y: s.y * L.cs }; })()")
    pg.click("#dock-waves-source")
    pg.mouse.click(*to_screen(s["x"], s["y"])); card("Source 1")
    ok("source_click_selects", state("active.sources.length") == 2 and "Source 1" in pg.inner_text("#details-kicker"))
    ok("source_rows_in_units", " m" in pg.inner_text("#details-rows") and "Hz" in pg.inner_text("#details-rows"))
    # While a warning stands (a wavelength too short for the grid), the Insights tab opens on Now, where it is; once it
    # clears, on the Story again, since the warning's Now is not remembered as the view chosen.
    pg.evaluate(P + ".pause()"); pg.evaluate(P + ".setParam('f', 9)")
    warned = settle(pg, WARNED, 8000)
    pg.click("#dt-insights"); pg.wait_for_timeout(200)
    ok("insights_open_on_now_when_warned", warned and pane() == "insights" and pg.get_attribute("#iv-now", "aria-selected") == "true" and pg.is_visible("#insights") and pg.is_hidden("#ip-story"))
    pg.click("#dt-telemetry"); pg.evaluate(P + ".setParam('f', 3)")
    calm = settle(pg, "!(" + WARNED + ")", 8000)
    pg.click("#dt-insights"); pg.wait_for_timeout(200)
    ok("insights_open_on_story_when_calm", calm and pg.get_attribute("#iv-story", "aria-selected") == "true" and pg.is_visible("#ip-story") and pg.is_hidden("#insights"))
    pg.context.close()

    # ---- units: readings, controls and typed values follow the system; the physics does not
    pg = fresh("fluid")
    ok("units_default_metric", state("units.get()") == "si" and pg.inner_text("#btn-units-label") == "Metric")
    g_label = lambda: pg.inner_text("#ctl-fluid-gravity-out")
    ok("control_in_metric", g_label().endswith("m/s²") and g_label().startswith("9.8"), g_label())
    pg.keyboard.press("u"); pg.wait_for_timeout(200)
    ok("u_opens_units", pg.is_visible("#sp-units") and pg.evaluate("document.getElementById('settings').matches(':modal')") and state("settings.section()") == "units"
       and pg.evaluate("document.activeElement === document.querySelector('#units-list [aria-checked=true]')") and "1.09 cm" in pg.inner_text("#units-scale"))
    pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(300)
    ok("arrow_picks_us", state("units.get()") == "us" and g_label().endswith("ft/s²") and g_label().startswith("32.2"), g_label())
    pg.keyboard.press("Escape")
    ok("escape_closes_units", pg.is_hidden("#sp-units") and not state("settings.isOpen()") and pg.evaluate("document.activeElement === document.body"))
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

    # ---- Insights: the Story, the lab's narrator telling the run as it happens
    STEP = "(s => {{ const P = PhysicsPlayground, L = P.active, end = L.t + s; while (L.t < end - 1e-9) {{ const e2 = Math.min(end, L.t + 0.25); while (L.t < e2 - 1e-9) if (!P.advance(Math.min(1 / 60, e2 - L.t))) break; P.story.tick(); }} }})({})"
    story = lambda: pg.evaluate(P + ".story.list()")
    kinds = lambda: {m["kind"] for m in story()}
    # Empty sky 520 px out from the star (3.85 AU, past the ice giant), within 30° of the stage's wide axis so the click
    # lands on the stage, at the angle there farthest from every body.
    EDGE = "(() => { const L = PhysicsPlayground.active, H = L.heaviest(); let best = null, far = -1; for (let k = 0; k < 26; k++) { const a = (k < 13 ? -Math.PI / 6 + k * Math.PI / 36 : 5 * Math.PI / 6 + (k - 13) * Math.PI / 36), x = H.x + 520 * Math.cos(a), y = H.y + 520 * Math.sin(a), d = Math.min(...L.bodies.map(b => Math.hypot(b.x - x, b.y - y))); if (d > far) { far = d; best = { x, y }; } } return best; })()"
    def drag(x0, y0, x1, y1):
        r = pg.locator("#stage-canvas").bounding_box()
        pg.mouse.move(r["x"] + x0, r["y"] + y0); pg.mouse.down()
        for k in range(1, 9): pg.mouse.move(r["x"] + x0 + (x1 - x0) * k / 8, r["y"] + y0 + (y1 - y0) * k / 8)
        pg.mouse.up()

    # Gravity: a brown dwarf dropped at the outer edge of the Star system pulls the barycentre out of the star.
    pg = fresh("gravity"); pg.evaluate(P + ".pause()")
    scene(pg, "#preset-gravity-solar"); pg.wait_for_timeout(300); pg.evaluate(P + ".story.tick()")
    ok("story_opens_with_the_scale", "scale" in kinds(), kinds())
    pg.evaluate(P + ".setParam('launchMass', 70)")
    spot = pg.evaluate(EDGE)
    n0 = state("active.bodies.length")
    pg.mouse.click(*to_screen(spot["x"], spot["y"])); pg.wait_for_timeout(200)
    ok("giant_dropped", state("active.bodies.length") == n0 + 1 and state("active.heaviest().m") == 1000 and state("active.bodies.some(b => b.kind === 'brown')"), state("active.bodies.length"))
    pg.evaluate(STEP.format(5))
    bary = [m for m in story() if m["kind"] == "bary"]
    ok("story_giant_moves_the_barycentre", {"added", "bary"} <= kinds() and bary and "barycentre" in bary[0]["body"] and "km/s" in bary[0]["body"], kinds())
    ok("story_explains_the_wobble", bool(bary) and "wobble" in bary[0]["body"] and bary[0]["show"])
    pg.evaluate(STEP.format(40))
    ok("story_giant_reshapes_orbits", bool(kinds() & {"perturb", "pass", "cross", "packed", "resonance", "capture", "loss", "merge"}), kinds())
    lst = story()
    ok("story_newest_first", all(lst[i]["t"] >= lst[i + 1]["t"] for i in range(len(lst) - 1)) and len(lst) <= 60, [round(m["t"], 2) for m in lst])
    ok("story_numbers_and_causes", all(any(c.isdigit() for c in m["body"]) for m in lst), [m["title"] for m in lst if not any(c.isdigit() for c in m["body"])])
    # The unread count rides on the Insights tab and clears when the Story is read.
    pg.wait_for_timeout(400)
    ok("story_unread_on_tab", pg.is_visible("#dt-story-n") and int(pg.inner_text("#dt-story-n").split()[0]) > 0, pg.inner_text("#dt-story-n"))
    # The run is paused, so whether a warning stands cannot change between the look and the click.
    warned = pg.evaluate(WARNED)
    pg.click("#dt-insights")
    ok("insights_view_follows_warnings", pg.get_attribute("#iv-now" if warned else "#iv-story", "aria-selected") == "true", warned)
    if warned: pg.click("#iv-story")
    ok("story_read_clears_unread", settle(pg, "document.getElementById('dt-story-n').hidden && " + P + ".story.unread() === 0", 5000))
    # Keyboard: the Now and Story views are a tablist; the list itself and every moment's buttons are tab stops.
    pg.focus("#iv-story"); pg.keyboard.press("Home")
    ok("story_views_keys", pg.evaluate("document.activeElement.id") == "iv-now" and pg.is_visible("#insights"))
    pg.keyboard.press("ArrowRight")
    ok("story_view_back", pg.evaluate("document.activeElement.id") == "iv-story" and pg.is_visible("#story"))
    reached = False
    for k in range(4):
        pg.keyboard.press("Tab")
        if pg.evaluate("document.activeElement.id") == "story": reached = True; break
    ok("story_list_keyboard_reachable", reached, pg.evaluate("document.activeElement.id || document.activeElement.className"))
    pg.keyboard.press("Tab")
    ok("story_moment_button_reachable", pg.evaluate("(e => !!e.closest('#story') && (e.tagName === 'BUTTON' || e.tagName === 'SUMMARY'))(document.activeElement)"))
    follow = pg.locator("#story .btn-show:visible", has_text="Follow").first
    follow.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok("story_show_me_follows", state("active.track") is not None)
    # Show me never offers a body that has merged away or left: its button goes with it.
    ok("story_show_me_only_live", pg.evaluate("[...document.querySelectorAll('#story .btn-show')].filter(b => b.offsetParent).every(b => { const m = b.textContent.match(/Follow Body (\\d+)/); return !m || PhysicsPlayground.active.bodies.some(q => q.id === +m[1]); })"))
    # The story survives a pause: played on a moment and paused, it keeps everything it had and holds still while the
    # frame loop goes on looking. One look after the pause takes in the last frames played.
    snap = lambda: [(m["kind"], m["title"], m["t"], m["n"]) for m in story()]
    n_kept, t_play = len(story()), state("active.t")
    pg.evaluate(P + ".play()"); played = settle(pg, P + ".active.t > %r" % (t_play + 0.5), 8000); pg.evaluate(P + ".pause()")
    pg.evaluate(P + ".story.tick()")
    held, t_held = snap(), state("active.t")
    pg.wait_for_timeout(800)
    ok("story_survives_pause", played and len(held) >= n_kept and snap() == held and state("active.t") == t_held and state("state.running") is False, (n_kept, len(held), len(story())))
    # A rewind drops what it undid.
    n_before = len(held)
    # Rewind needs recorded history, which only real playing captures: play a moment, then seek back to the start.
    pg.evaluate(P + ".play()"); settle(pg, P + ".history.size() >= 2", 8000); pg.evaluate(P + ".pause()")
    pg.evaluate(P + ".history.seek(0)"); pg.evaluate(P + ".story.tick()")
    t_now = state("active.t")
    ok("story_rewind_trims", t_now < 1 and len(story()) < n_before and all(m["t"] <= t_now + 1e-6 for m in story()), (t_now, n_before, [round(m["t"], 2) for m in story()]))
    # A new scene starts a new story. Before Kepler ellipses loads, the Star system's story holds its opening moment at
    # t = 0 and a body dropped after the rewind, told at its own time; afterwards neither is there. Time going back to 0
    # alone would trim only the second, so the first shows the story itself began again.
    pg.evaluate(STEP.format(2))
    drop = pg.evaluate("(() => { const L = PhysicsPlayground.active, H = L.heaviest(); let best = null, far = -1; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, x = H.x + 300 * Math.cos(a), y = H.y + 300 * Math.sin(a), d = Math.min(...L.bodies.map(b => Math.hypot(b.x - x, b.y - y))); if (d > far) { far = d; best = { x, y }; } } return best; })()")
    pg.evaluate("(s => PhysicsPlayground.active.dropOrbit(s.x, s.y, 0))(%s)" % json.dumps(drop)); pg.evaluate(STEP.format(0.5))
    held = story()
    early, late = [(m["title"], m["body"]) for m in held if m["t"] < 0.01], [m["title"] for m in held if m["t"] > 1]
    pg.evaluate(P + ".preset('kepler')"); pg.evaluate(P + ".story.tick()")
    told = {x for m in story() for x in [m["title"]] + m["earlier"]}
    ok("story_resets_on_scene", bool(early) and bool(late) and not told & set(late) and not {(m["title"], m["body"]) for m in story()} & set(early)
       and all(m["t"] < 0.01 for m in story()), ([e[0] for e in early], late, [(m["kind"], m["t"]) for m in story()]))
    pg.context.close()

    # A star as heavy as the Star system's own, dropped at the same edge, makes a binary with it. The planets close to the
    # star still circle it and are still watched about it: the companion's tide reshapes an inner orbit, and that is told.
    pg = fresh("gravity"); pg.evaluate(P + ".pause()")
    scene(pg, "#preset-gravity-solar"); pg.wait_for_timeout(300); pg.evaluate(P + ".story.tick()")
    inner = pg.evaluate("(() => { const L = PhysicsPlayground.active, H = L.heaviest(); return L.bodies.filter(b => b !== H && b.m > 0 && Math.hypot(b.x - H.x, b.y - H.y, b.z - H.z) < 150).map(b => b.id); })()")
    pg.evaluate(P + ".setParam('launchMass', 1000)")
    spot = pg.evaluate(EDGE)
    n0 = state("active.bodies.length")
    pg.mouse.click(*to_screen(spot["x"], spot["y"])); pg.wait_for_timeout(200)
    ok("companion_dropped", state("active.bodies.length") == n0 + 1 and state("active.bodies.filter(b => b.kind === 'star' && b.m === 1000).length") == 2, state("active.bodies.length"))
    # Seen within 10 s of simulated time in every trial run; 30 s is the bound.
    seen = None
    for k in range(30):
        pg.evaluate(STEP.format(1))
        changed = {x for m in story() if m["kind"] == "perturb" for x in [m["title"]] + m["earlier"]}
        seen = next((i for i in inner if "Body %d's orbit is changing" % i in changed), None)
        if seen: break
    ok("story_binary_inner_orbit_watched", len(inner) >= 2 and seen is not None, (inner, round(state("active.t"), 2), sorted(kinds())))
    pg.context.close()

    # Empty sky, three fast throws by hand: each throw is explained, then what follows from it.
    pg = fresh("gravity"); pg.evaluate(P + ".pause()")
    scene(pg, "#preset-gravity-empty"); pg.wait_for_timeout(300); pg.evaluate(P + ".story.tick()")
    r = pg.locator("#stage-canvas").bounding_box(); cx, cy = r["width"] / 2, r["height"] / 2
    drag(cx, cy, cx + 160, cy - 20); pg.evaluate(STEP.format(1))
    drag(cx - 160, cy + 30, cx + 140, cy + 30); pg.evaluate(STEP.format(1))
    drag(cx, cy - 120, cx + 70, cy - 120); pg.evaluate(STEP.format(40))
    total = sum(m["n"] for m in story())
    ok("empty_sky_three_bodies", state("active.bodies.length") == 3, state("active.bodies.length"))
    ok("empty_sky_steady_story", {"added", "momentum", "pass"} <= kinds() and total >= 6, (kinds(), total))
    added = [m for m in story() if m["kind"] == "added"]
    ok("empty_sky_throws_explained", bool(added) and added[0]["n"] == 3 and ("escape" in added[0]["body"] or "once every" in added[0]["body"]), added[0]["body"][:120] if added else None)
    pg.context.close()

    # Keyboard focus stays on a moment's button when a repeat folds into its entry, relabels it and moves it to the top.
    pg = fresh("gravity"); pg.evaluate(P + ".pause()")
    scene(pg, "#preset-gravity-empty"); pg.wait_for_timeout(300); pg.evaluate(P + ".story.tick()")
    pg.click("#dt-insights"); pg.click("#iv-story")
    ADD = "((x, y, vx, m) => { const L = PhysicsPlayground.active; L.addBody(L.body(x, y, vx, 0, m)); return L.uid; })(%s)"
    pg.evaluate(ADD % "0, 0, 30, 2"); pg.evaluate(STEP.format(0.5))
    before = pg.evaluate("[...document.querySelectorAll('#story > li')].map(li => li.dataset.kind)")
    pg.focus("#story li[data-kind=added] .btn-show")
    # Passing wide of the first, so its arrival is the only moment of the look.
    second = pg.evaluate(ADD % "160, 120, -30, 1"); pg.evaluate(STEP.format(0.25))
    f = pg.evaluate("(e => { const li = e.closest('#story > li'); return { fk: e.dataset.fk || null, kind: li && li.dataset.kind, first: !!li && li === document.querySelector('#story > li'), text: e.textContent }; })(document.activeElement)")
    ok("story_fold_keeps_focus", before[:2] == ["momentum", "added"] and f["fk"] == "show" and f["kind"] == "added" and f["first"] and ("Body %d" % second) in f["text"], (before, f))
    # Two bodies falling into one in the same look are both told as mergers into it, and neither as an escape.
    pg.evaluate(P + ".preset('empty')"); pg.evaluate(P + ".story.tick()")
    big = pg.evaluate(ADD % "0, 0, 0, 10"); pg.evaluate(STEP.format(0.5))
    pg.evaluate("(() => { const L = PhysicsPlayground.active, k = 0.7 * (L.bodies[0].r + 4) + 30; L.addBody(L.body(k - 8, 0, -40, 0, 1)); L.addBody(L.body(-k, 0, 40, 0, 2)); })()")
    pg.evaluate(STEP.format(0.25)); n_three = state("active.bodies.length"); pg.evaluate(STEP.format(1))
    merged = [m for m in story() if m["kind"] == "merge"]
    ok("story_tells_each_merger", n_three == 3 and state("active.bodies.length") == 1 and len(merged) == 1 and merged[0]["n"] == 2
       and all(x.endswith("merged into Body %d" % big) for x in [merged[0]["title"]] + merged[0]["earlier"]) and "escape" not in kinds(), [(m["kind"], m["n"], m["title"]) for m in story()])
    pg.context.close()

    # Other labs tell their own moments: the gas relaxing and pressing on its walls, the copies parting.
    pg = fresh("collisions"); pg.evaluate(P + ".pause()"); pg.evaluate(P + ".preset('gas')"); pg.evaluate(P + ".story.tick()")
    pg.evaluate(STEP.format(10))
    ok("collisions_story", {"relax", "pressure"} <= kinds(), kinds())
    pg.click("#tab-chaos"); pg.wait_for_timeout(300); pg.evaluate(P + ".pause()"); pg.evaluate(P + ".preset('chaos')"); pg.evaluate(P + ".story.tick()")
    pg.evaluate(STEP.format(12))
    ok("chaos_story", {"lyapunov", "parted"} <= kinds(), kinds())
    pg.click("#tab-collisions"); pg.wait_for_timeout(300)
    ok("story_kept_per_lab", {"relax", "pressure"} <= kinds(), kinds())
    pg.context.close()

    b.close()
finish()
