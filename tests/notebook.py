"""
✒ Metadata
    - Title: Notebook Tests (digiSpace Edition - v2.5)
    - File Name: notebook.py
    - Relative Path: tests/notebook.py
    - Artifact Type: test
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for release 2.5.0: the Math page's live panels, the Guide's cards, the
      Library's capture cards and the Inspect pane's focus chart.

✒ Description:
    Checks that the notebook is wired to the simulation in the flat view:
    live formulas read the run and their sliders change it in step with
    Controls, theory checks agree with what the run measures, the Guide's
    cards pick tools and load scenes, the Library's cards start and stop a
    capture, and the Inspect pane follows a figure over time.

✒ Key Features:
    - Every lab's Math page builds live panels without errors.
    - A live slider changes the parameter and the Controls value with it.
    - Collisions: the speed check and the ideal-gas check agree with the run.
    - Gravity: the circular-speed check agrees for a planet of the Star
      system.
    - Guide: a tool card selects the tool and marks it; a keyboard change
      moves the mark; a scene card loads the scene.
    - Library: the dataset card starts and stops a recording.
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
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle

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

    # ---- Guide: cards pick tools, follow the keyboard and load scenes
    pg = fresh("waves")
    pg.click("#nt-guide"); pg.wait_for_timeout(300)
    cards = pg.locator("#guide .g-card")
    ok("guide_has_tool_and_view_cards", cards.count() == 7, cards.count())
    cards.nth(1).click(); pg.wait_for_timeout(300)
    ok("tool_card_selects_tool", state("active.p.tool") == "wall" and cards.nth(1).get_attribute("aria-pressed") == "true")
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press("e"); pg.wait_for_timeout(600)
    ok("guide_follows_keyboard", cards.nth(2).get_attribute("aria-pressed") == "true" and cards.nth(1).get_attribute("aria-pressed") == "false")
    pg.locator("#guide .g-scene", has_text="Two sources").click(); pg.wait_for_timeout(500)
    ok("scene_card_loads_scene", state("active.presetId") == "twosrc" and pg.locator("#guide .g-scene[aria-pressed=true]").inner_text().strip().endswith("Two sources"))
    pg.context.close()

    # ---- Library: the dataset card starts and stops a recording
    pg = fresh("collisions")
    pg.click("#nt-library"); pg.wait_for_timeout(300)
    ok("capture_cards_shown", pg.locator("#lib-capture .cap-card").count() == 3 and "columns" in pg.inner_text("#lib-capture"))
    run = pg.locator("#lib-capture .cap-card[data-kind=run]")
    run.click(); pg.wait_for_timeout(1200)
    ok("dataset_card_starts", state("capture.dataRec.on") is True and run.get_attribute("aria-pressed") == "true" and "Stop" in run.inner_text())
    run.click()
    settle(pg, "!PhysicsPlayground.capture.dataRec.on && PhysicsPlayground.capture.vault.list().some(i => i.kind === 'run')", 10000)
    ok("dataset_card_stops_and_saves", not state("capture.dataRec.on") and pg.evaluate("PhysicsPlayground.capture.vault.list().some(i => i.kind === 'run')"))
    pg.context.close()

    # ---- Inspect: the focus chart sits inside the pane and follows the clicked figure
    pg = fresh("collisions")
    pg.click("#btn-deck-size"); pg.wait_for_timeout(400)
    pg.evaluate("PhysicsPlayground.active.picked = 5")
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
