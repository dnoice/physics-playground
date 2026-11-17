"""
✒ Metadata
    - Title: Notebook Tests (digiSpace Edition - v2.19)
    - File Name: notebook.py
    - Relative Path: tests/notebook.py
    - Artifact Type: test
    - Version: 2.19.0
    - Date: 11/17/2026
    - Update: Tuesday, November 17, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.19.0 (11/17/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      Inspect focus check selects its ball through select(). On Dennis's call
      for one timeline: the Library's capture-card checks became checks of the
      player bar's cluster: Record data starts and stops a recording, its line
      counts rows and its tooltip follows, the stage's light is status and the
      timeline marks it, and the Library keeps the dataset with no capture
      cards of its own. On Dennis's call for drag handles: the deck goes tall
      from its grip's End key, the size button being gone. On Dennis's call
      for a duplication sweep: the Guide holds no buttons, its legend matches
      the rail glyph for glyph and key for key, and the scene menu loads
      scenes.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created for
      release 2.5.0: the Math page's live panels, the Guide's cards, the
      Library's capture cards and the Inspect pane's focus chart. The Guide's
      Tools now include the Random card.

✒ Description:
    Checks that the notebook is wired to the simulation in the flat view:
    live formulas read the run and their sliders change it in step with
    Controls, theory checks agree with what the run measures, the Guide's
    cards pick tools and load scenes, the player bar's capture cluster
    starts and stops a recording that the Library then keeps, and the
    Inspect pane follows a figure over time.

✒ Key Features:
    - Every lab's Math page builds live panels without errors.
    - A live slider changes the parameter and the Controls value with it.
    - Collisions: the speed check and the ideal-gas check agree with the run.
    - Gravity: the circular-speed check agrees for a planet of the Star
      system.
    - Guide: a tool card selects the tool and marks it; a keyboard change
      moves the mark; a scene card loads the scene.
    - Capture: Record data in the player bar starts and stops a recording,
      its line counts the rows, the stage's recording light (status, not a
      button) and the timeline show it, and the Library keeps the dataset
      but no capture cards of its own.
    - Inspect: the focus chart sits inside the pane and follows the figure
      that is clicked.

✒ Usage Instructions:
    $ python tests/notebook.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import re
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, scene, settle

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
state = lambda expr: pg.evaluate(P + "." + expr)
ADVANCE = "(s => { const P = PhysicsPlayground, L = P.active, end = L.t + s; while (L.t < end - 1e-9) if (!P.advance(Math.min(1 / 60, end - L.t))) break; })(%s)"
CHECKS = "[...document.querySelectorAll('#math .fl-check:not([hidden])')].map(c => [c.dataset.state, c.textContent])"

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

    # ---- Math: every lab builds its live panels, and Collisions' checks agree with the run
    pg = fresh("collisions")
    counts = {}
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.click("#tab-" + lab); pg.wait_for_timeout(250)
        counts[lab] = pg.locator("#math .f-live").count()
    ok("every_lab_has_live_math", all(n >= 2 for n in counts.values()), counts)
    pg.click("#tab-collisions"); pg.wait_for_timeout(300)
    pg.evaluate(ADVANCE % 8)
    pg.click("#nt-math")
    settle(pg, "document.querySelectorAll('#math .fl-check[data-state=ok]').length >= 2", 10000)
    checks = pg.evaluate(CHECKS)
    ok("collisions_speed_check_agrees", any(s == "ok" and "Mean speed" in t for s, t in checks), checks)
    ok("collisions_gas_check_agrees", any(s in ("ok", "warn") and "PA / NkT" in t for s, t in checks), checks)
    ok("live_values_shown", pg.locator("#math .fl-var").count() >= 8)
    slider = pg.locator("#fl-collisions-e")
    slider.focus(); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(300)
    e = state("active.p.e")
    ok("live_slider_sets_parameter", abs(e - 0.98) < 1e-9, e)
    ok("controls_follow_live_slider", pg.inner_text("#ctl-collisions-e-out").strip() == "0.98", pg.inner_text("#ctl-collisions-e-out"))
    settle(pg, "[...document.querySelectorAll('#math .fl-check')].some(c => /drains away/.test(c.textContent))", 5000)
    ok("impulse_check_explains_loss", any("drains away" in t for _, t in pg.evaluate(CHECKS)))
    pg.context.close()

    pg = fresh("gravity")
    pg.evaluate(ADVANCE % 3)
    pg.click("#nt-math")
    settle(pg, "[...document.querySelectorAll('#math .fl-check')].some(c => /circular speed/.test(c.textContent))", 10000)
    vc = [c for c in pg.evaluate(CHECKS) if "circular speed" in c[1]]
    ok("gravity_circular_speed_agrees", bool(vc) and vc[0][0] == "ok", vc)
    ok("gravity_live_has_plot_free_panels", pg.locator("#math .f-live").count() == 5)
    pg.context.close()

    # ---- Guide: a static legend of what the rail picks; the rail, its keys and the scene menu do the picking
    pg = fresh("waves")
    pg.click("#nt-guide"); pg.wait_for_timeout(300)
    # Nothing in the Guide is a control: no scene, tool or Random buttons, nothing pressed, nothing to tab to.
    live = pg.evaluate("[...document.querySelectorAll('#guide button, #guide [role=button], #guide [aria-pressed], #guide [tabindex], #guide a[href], #guide input')].length")
    ok("guide_has_no_buttons", live == 0 and pg.locator("#guide .g-card, #guide .g-scene, #guide .g-switch").count() == 0, live)
    # Five tools, the Random row that sits with them, and two views: each the rail's glyph, its name and its key.
    rows = pg.evaluate("[...document.querySelectorAll('#guide .g-row')].map(r => [r.querySelector('.ms').textContent, r.querySelector('.g-name').textContent, (r.querySelector('kbd') || {}).textContent || '', r.querySelector('.g-hint').textContent.length > 0])")
    rail = pg.evaluate("[...document.querySelectorAll('#dock .dock-btn, #views .view-btn')].map(b => [b.querySelector('.ms').textContent, b.dataset.tip.split(' · ')[1]])")
    legend = [r for r in rows if r[1] != "Random"]
    ok("guide_legend_matches_rail", len(rows) == 8 and [[r[0], r[2]] for r in legend] == rail and all(r[3] for r in rows)
       and [r[1] for r in rows if r[1] == "Random"] == ["Random"] and rows[5][0] == "casino", (rows, rail))
    # The rail and the keys pick; the legend stays as it was, since it marks nothing.
    before = pg.inner_html("#guide")
    pg.click("#dock-waves-wall"); pg.evaluate("document.activeElement.blur()"); pg.keyboard.press("e"); pg.wait_for_timeout(600)
    ok("rail_and_keys_pick_tools", state("active.p.tool") == "erase" and pg.inner_html("#guide") == before, state("active.p.tool"))
    # The Scenes line names every scene and points to the menu, which loads one.
    names = pg.evaluate("PhysicsPlayground.active.presets.map(p => p.label)")
    line = pg.inner_text("#guide .g-sec:nth-of-type(3) .g-lead")
    scene(pg, "#preset-waves-twosrc"); pg.wait_for_timeout(500)
    ok("scene_menu_loads_scene", state("active.presetId") == "twosrc" and all(n in line for n in names) and "menu" in line and pg.inner_text("#stage-scene").strip() == "Two sources", line)
    pg.context.close()

    # ---- Capture: one cluster in the player bar records and saves; the Library keeps only what was saved. Record data
    # starts and stops a recording, its line counts the rows, the stage's light and the timeline show it while it runs.
    pg = fresh("collisions")
    pg.click("#nt-library"); pg.wait_for_timeout(300)
    names = pg.evaluate("[...document.querySelectorAll('.player .capture .cap-btn')].map(b => [b.id, b.querySelector('.cap-name').textContent])")
    ok("capture_cluster_in_player", names == [["btn-rec", "Record clip"], ["btn-data", "Record data"], ["btn-state", "Save state"]]
       and re.fullmatch(r"\d+ cols · \d+ Hz", pg.inner_text("#btn-data-sub")) is not None and pg.locator("#btn-cap-settings").is_visible(), (names, pg.inner_text("#btn-data-sub")))
    ok("library_has_no_capture_cards", pg.locator(".cap-card, #lib-capture, #np-library .lib-tog").count() == 0 and pg.locator("#np-library .lib-sec").count() == 1
       and "player bar" in pg.inner_text("#lib-empty"), pg.inner_text("#lib-empty"))
    run = pg.locator("#btn-data")
    run.click(); pg.wait_for_timeout(1200)
    light = pg.evaluate("(() => { const r = document.getElementById('hud-rec'); return { tag: r.tagName, shown: !r.hidden, text: r.textContent, cursor: getComputedStyle(r).cursor, tab: r.tabIndex }; })()")
    ok("dataset_button_starts", state("capture.dataRec.on") is True and run.get_attribute("aria-pressed") == "true" and pg.inner_text("#btn-data-label") == "Stop data"
       and run.get_attribute("title") == "Stop the dataset and keep it in the Library (D)"
       and re.fullmatch(r"[\d,]+ rows", pg.inner_text("#btn-data-sub")) is not None, pg.inner_text("#btn-data-sub"))
    ok("recording_light_is_status_not_a_button", light["tag"] == "SPAN" and light["shown"] and re.fullmatch(r"REC [\d,]+ rows", light["text"]) is not None
       and light["cursor"] != "pointer" and light["tab"] < 0, light)
    ok("timeline_marks_the_recording", pg.evaluate("!document.getElementById('tl-data').hidden && document.getElementById('tl-clip').hidden"))
    run.click()
    settle(pg, "!PhysicsPlayground.capture.dataRec.on && PhysicsPlayground.capture.vault.list().some(i => i.kind === 'run')", 10000)
    pg.wait_for_timeout(300)
    ok("dataset_button_stops_and_saves", not state("capture.dataRec.on") and pg.evaluate("PhysicsPlayground.capture.vault.list().some(i => i.kind === 'run')")
       and run.get_attribute("aria-pressed") == "false" and pg.inner_text("#btn-data-label") == "Record data" and run.get_attribute("title").endswith("(D)")
       and pg.evaluate("document.getElementById('hud-rec').hidden && document.getElementById('tl-data').hidden") and pg.locator("#lib-list .lib-item[data-kind=run]").count() == 1)
    pg.context.close()

    # ---- Inspect: the focus chart sits inside the pane and follows the clicked figure
    pg = fresh("collisions")
    # The deck's grip picks the tall preset with End (the size button it replaced stepped standard to tall).
    pg.focus("#deck-grip"); pg.keyboard.press("End"); pg.wait_for_timeout(400)
    pg.evaluate("(() => { const L = PhysicsPlayground.active; L.select(L.uid[5]); })()")
    settle(pg, "document.getElementById('tile-deck').dataset.pane === 'inspect'", 5000)
    pg.wait_for_timeout(2500)
    deck, plot = pg.locator("#tile-deck").bounding_box(), pg.locator("#details-plot").bounding_box()
    ok("focus_chart_inside_pane", plot and plot["height"] > 80 and plot["y"] + plot["height"] <= deck["y"] + deck["height"] + 1, (round(plot["height"]) if plot else None, round(deck["height"])))
    ok("focus_starts_on_a_moving_figure", "Speed" in pg.inner_text("#details-focus-cap") or "Energy" in pg.inner_text("#details-focus-cap"), pg.inner_text("#details-focus-cap"))
    pg.locator(".drow-pick").nth(3).click(); pg.wait_for_timeout(400)
    ok("clicked_figure_takes_focus", pg.locator(".drow.focus").count() == 1 and pg.locator(".drow").nth(3).evaluate("e => e.classList.contains('focus')"))
    ok("figures_have_sparklines", pg.locator(".drow-spark path[d^=M]").count() >= 2)
    pg.context.close()

    b.close()
finish()
