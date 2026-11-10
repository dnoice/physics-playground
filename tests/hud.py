"""
✒ Metadata
    - Title: Head-Up Display Tests (digiSpace Edition - v2.7)
    - File Name: hud.py
    - Relative Path: tests/hud.py
    - Artifact Type: test
    - Version: 2.7.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for release 2.7.0: the head-up display over the stage.

✒ Description:
    Checks the head-up display (js/shell/headsup.js) in the real interface:
    its readings agree with Telemetry, the target box sits on the selected
    object in 2D and 3D and its callout names it, caution lights carry the
    notices, and the HUD menu, Shift+H and the remembered settings work.

✒ Key Features:
    - Readings: every lab's tape carries the readings it names, with the same
      text Telemetry shows at the same tick, under the title and its chips.
    - Target: the box is centred on hudTarget() in six labs in 2D and in
      Gravity in 3D, the callout carries the inspected name and keeps off the
      object, an object off the stage gets a dashed box at the edge, and
      clearing the selection clears both.
    - Cautions: an under-resolved wave lights a warning by its title.
    - Menu and keys: opacity steps, parts, Escape, Shift+H (which leaves a
      lab's H tool alone), the keys sheet, and settings kept across a reload.
    - Phone: one caution light and two callout figures on a 390 px stage.

✒ Usage Instructions:
    $ python tests/hud.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
    - The display is never clickable, so the checks drive it through the
      automation surface and the keyboard, and read it from the DOM.
---------
"""
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
SELECT = {
    "gravity": "(() => { const L = PhysicsPlayground.labs.gravity, o = L.orbitOf(); L.track = o.b.id; })()",
    "collisions": "(() => { PhysicsPlayground.labs.collisions.picked = 7; })()",
    "fluid": "(() => { PhysicsPlayground.preset('posts'); const L = PhysicsPlayground.labs.fluid, o = L.obs[0]; L.selAt = { x: o.x, y: o.y }; })()",
    "waves": "(() => { PhysicsPlayground.preset('twosrc'); const L = PhysicsPlayground.labs.waves; L.selSrc = L.sources[0].id; })()",
    "chaos": "(() => { PhysicsPlayground.labs.chaos.sel = 3; })()",
    "fields": "(() => { PhysicsPlayground.preset('exb'); const L = PhysicsPlayground.labs.fields; L.picked = true; L.setTrack(L.pid[0]); })()",
}
# Where the box is, where the lab says the object is, the callout's box and name, and the inspected name.
TARGET = """(() => {
  const L = PhysicsPlayground.active, t = L.hudTarget(PhysicsPlayground.mode.is3D()), s = document.getElementById('stage').getBoundingClientRect();
  const box = e => { if (e.hidden) return null; const r = e.getBoundingClientRect(); return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top }; };
  const g = box(document.getElementById('hu-tgt')), c = box(document.getElementById('hu-card')), info = L.inspect();
  return { t: t && { x: t.x, y: t.y }, g, c, name: document.getElementById('hu-card-name').textContent, want: info && (info.short || info.kicker),
           off: document.getElementById('hu-tgt').classList.contains('off'), vis: getComputedStyle(document.getElementById('hu-card')).visibility, w: s.width, h: s.height };
})()"""

with sync_playwright() as p:
    b = launch(p)

    def fresh(lab, mode="2d", view=VIEW, ctx=None):
        """A new page with its own storage (unless a context is given), ready on the given lab."""
        ctx = ctx or b.new_context(viewport=view)
        page = open_page(ctx, mode=mode)
        page.goto(URL + "#" + lab)
        page.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === '%s'" % lab)
        page.wait_for_timeout(400)
        return page

    def centred(r):
        return r["g"] and r["t"] and abs((r["g"]["l"] + r["g"]["r"]) / 2 - r["t"]["x"]) < 1.5 and abs((r["g"]["t"] + r["g"]["b"]) / 2 - r["t"]["y"]) < 1.5

    def clear_of(a, b2):
        return a["r"] <= b2["l"] or a["l"] >= b2["r"] or a["b"] <= b2["t"] or a["t"] >= b2["b"]

    # ---- Readings: on by default, under the title, the same text as Telemetry, never in the way of a click
    pg = fresh("gravity")
    ok("hud_on_by_default", pg.is_visible("#hu") and pg.inner_text("#btn-hud-label") == "HUD 80%" and pg.get_attribute("#hu", "aria-hidden") == "true")
    same = {}
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.evaluate(P + ".select('%s')" % lab)
        settle(pg, "document.querySelectorAll('#hu-tape .hu-read').length === %s.active.hud.length" % P, 8000)
        pg.evaluate(P + ".pause()"); pg.wait_for_timeout(700)
        rows = pg.evaluate("""(() => { const g = new Map([...document.querySelectorAll('#readouts .gauge')].map(n => [n.querySelector('dt').textContent, n.querySelector('dd').textContent]));
          return PhysicsPlayground.active.hud.map(([label], i) => { const r = document.querySelectorAll('#hu-tape .hu-read')[i]; return [label, r && r.querySelector('dd').textContent, g.get(label)]; }); })()""")
        same[lab] = all(r[1] is not None and r[1] == r[2] for r in rows) and len(rows) == 4
        pg.evaluate(P + ".play()")
    ok("hud_tape_matches_telemetry", all(same.values()), same)
    geo = pg.evaluate("""(() => { const t = document.getElementById('hu-tape').getBoundingClientRect(), top = document.querySelector('.stage-top').getBoundingClientRect(), c = document.getElementById('stage-canvas');
      return { below: t.top >= top.bottom, through: document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2) === c }; })()""")
    ok("hud_tape_below_title", geo["below"], geo)
    ok("hud_clicks_pass_through", geo["through"], geo)
    pg.context.close()

    # ---- Target: the box on the object, the callout naming it and keeping off it, in six labs in 2D
    pg = fresh("gravity")
    res = {}
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "fields"]:
        pg.evaluate(P + ".select('%s')" % lab); pg.wait_for_timeout(300)
        pg.evaluate(SELECT[lab]); pg.evaluate(P + ".pause()")
        settle(pg, "!document.getElementById('hu-card').hidden && getComputedStyle(document.getElementById('hu-card')).visibility === 'visible'", 8000)
        pg.wait_for_timeout(300)
        r = pg.evaluate(TARGET)
        res[lab] = bool(centred(r) and r["c"] and r["name"] == r["want"] and clear_of(r["c"], r["g"]))
        if not res[lab]: res[lab] = r
        pg.evaluate(P + ".play()")
    ok("target_on_object_2d", all(v is True for v in res.values()), res)
    pg.evaluate(P + ".active.deselect()")
    settle(pg, "document.getElementById('hu-tgt').hidden && document.getElementById('hu-card').hidden", 5000)
    ok("target_clears_with_selection", pg.evaluate("document.getElementById('hu-tgt').hidden && document.getElementById('hu-card').hidden"))
    # An object panned off the stage waits at the edge, dashed.
    pg.evaluate(P + ".select('collisions')"); pg.wait_for_timeout(300); pg.evaluate(SELECT["collisions"]); pg.evaluate(P + ".pause()")
    pg.evaluate("(() => { const L = PhysicsPlayground.active, i = L.picked; L.x[i] = 20; L.y[i] = 200; })()")
    pg.evaluate(P + ".view.zoomBy(3, 1000, 250)"); pg.wait_for_timeout(1200)
    r = pg.evaluate(TARGET)
    inside = r["g"] and r["g"]["l"] >= 0 and r["g"]["t"] >= 0 and r["g"]["r"] <= r["w"] and r["g"]["b"] <= r["h"]
    ok("target_off_stage_waits_at_edge", r["off"] and bool(inside) and (r["t"]["x"] < 0 or r["t"]["y"] < 0 or r["t"]["x"] > r["w"] or r["t"]["y"] > r["h"]), r)
    pg.context.close()

    pg = fresh("gravity", mode="3d")
    settle(pg, P + ".mode.is3D()", 15000)
    pg.evaluate(SELECT["gravity"]); pg.evaluate(P + ".pause()")
    settle(pg, "!document.getElementById('hu-card').hidden && getComputedStyle(document.getElementById('hu-card')).visibility === 'visible'", 8000)
    pg.wait_for_timeout(400)
    r = pg.evaluate(TARGET)
    ok("target_on_object_3d", bool(centred(r) and r["name"] == r["want"]), r)
    pg.context.close()

    # ---- Cautions: an under-resolved wave lights a warning by its title; the part can be turned off
    pg = fresh("waves")
    pg.evaluate(P + ".setParam('f', 9)")
    settle(pg, "[...document.querySelectorAll('#hu-caution .hu-ann')].some(a => /under-resolved/i.test(a.textContent))", 8000)
    lit = pg.evaluate("[...document.querySelectorAll('#hu-caution .hu-ann')].map(a => [a.textContent, a.dataset.level])")
    ok("caution_lights_warning", any("under-resolved" in t and lv in ("warn", "crit") for t, lv in lit), lit)
    pg.evaluate(P + ".hud.set({ caution: false })"); pg.wait_for_timeout(200)
    ok("caution_part_off", not pg.is_visible("#hu-caution") and pg.evaluate("document.querySelectorAll('#hu-caution .hu-ann').length") == 0)
    pg.context.close()

    # ---- Menu, keys and memory
    ctx = b.new_context(viewport=VIEW)
    pg = fresh("gravity", ctx=ctx)
    pg.click("#btn-hud"); pg.wait_for_timeout(200)
    ok("menu_opens_on_switch", pg.is_visible("#hud-sheet") and pg.evaluate("document.activeElement.id") == "hud-on" and pg.get_attribute("#btn-hud", "aria-expanded") == "true")
    pg.click("#hud-alpha-40"); pg.wait_for_timeout(150)
    ok("menu_opacity_step", pg.evaluate("getComputedStyle(document.getElementById('hu')).getPropertyValue('--hu-a').trim()") == "0.4" and pg.inner_text("#btn-hud-label") == "HUD 40%"
       and pg.get_attribute("#hud-alpha-40", "aria-checked") == "true")
    pg.click("#hud-part-read"); pg.wait_for_timeout(150)
    ok("menu_part_readings", not pg.is_visible("#hu-tape") and pg.get_attribute("#hud-part-read", "aria-checked") == "false")
    pg.click("#hud-part-read"); pg.click("#hud-part-target"); pg.wait_for_timeout(150)
    pg.evaluate(SELECT["gravity"]); pg.wait_for_timeout(900)
    ok("menu_part_target", pg.evaluate("document.getElementById('hu-tgt').hidden && document.getElementById('hu-card').hidden"))
    pg.click("#hud-part-target")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    ok("menu_escape_returns_focus", pg.evaluate("document.getElementById('hud-sheet').hidden") and pg.evaluate("document.activeElement.id") == "btn-hud")
    tool = pg.evaluate(P + ".active.p.tool")
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press("Shift+H"); pg.wait_for_timeout(200)
    ok("shift_h_hides", not pg.is_visible("#hu") and pg.inner_text("#btn-hud-label") == "HUD off")
    ok("shift_h_leaves_h_tool", pg.evaluate(P + ".active.p.tool") == tool, (tool, pg.evaluate(P + ".active.p.tool")))
    pg.reload(); pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active"); pg.wait_for_timeout(400)
    ok("settings_kept_on_reload", not pg.is_visible("#hu") and pg.evaluate(P + ".hud.get()")["alpha"] == 40)
    pg.keyboard.press("Shift+H"); pg.wait_for_timeout(200)
    ok("shift_h_shows", pg.is_visible("#hu") and pg.inner_text("#btn-hud-label") == "HUD 40%")
    pg.keyboard.press("?"); pg.wait_for_timeout(150)
    ok("keys_sheet_lists_shift_h", "head-up display" in pg.inner_text("#keys-sheet"))
    ctx.close()

    # ---- Phone: one light and its count, two callout figures
    pg = fresh("waves", view={"width": 390, "height": 844})
    # The scene first: loading it sets its own frequency. Then a wave too short for the grid, and reflecting edges.
    pg.evaluate(SELECT["waves"]); pg.evaluate(P + ".setParam('f', 9)"); pg.evaluate(P + ".setParam('absorb', false)")
    settle(pg, "[...document.querySelectorAll('#hu-caution .hu-ann')].some(a => /under-resolved/i.test(a.textContent)) && !document.getElementById('hu-card').hidden", 10000)
    pg.wait_for_timeout(600)
    n = pg.evaluate("""(() => ({ lights: [...document.querySelectorAll('#hu-caution .hu-ann:not(.hu-more)')].length,
      rows: [...document.querySelectorAll('#hu-card-rows dd')].filter(e => getComputedStyle(e).display !== 'none').length,
      tape: [...document.querySelectorAll('#hu-tape .hu-read')].filter(e => getComputedStyle(e).display !== 'none').length }))()""")
    ok("phone_one_light_two_figures", n["lights"] == 1 and n["rows"] == 2 and n["tape"] >= 2, n)
    pg.context.close()

    b.close()
finish()
