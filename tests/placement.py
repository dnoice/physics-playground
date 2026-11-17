"""
✒ Metadata
    - Title: Dials and Placement Tests (digiSpace Edition - v2.13)
    - File Name: placement.py
    - Relative Path: tests/placement.py
    - Artifact Type: test
    - Version: 2.13.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.13.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Gravity's
      throws follow the orbit, not the zoom, and stay in the system; a drop
      beside a giant makes a moon. A drag begun on a planet launches from its
      surface.
    - 2.11.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The dials'
      new look: value without a box and unit set back, the degree sign, the
      ridges parted round the value, wheels level past a two-line name and
      beside a note, the focus ring for the keyboard only, the wheel as the
      field when typing, and the Math page's wheels equal and side by side.
    - 2.9.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Random
      draws cover the research reference's six classes, and a chosen class
      keeps the placed body's mass in its range.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for release 2.5.0: the thumbwheel dials, random placement in every lab
      that places things, and the new placement parameters.

✒ Description:
    Checks the controls added in 2.5.0 in the flat view: the dials turn by
    drag, tap, chevron, wheel, keys and typing, and a control that restarts
    the run restarts it once per gesture; the dice on the stage rail, the
    switch in Controls and the Guide's card agree on Random; and with Random
    on, each lab draws what it places from the stated ranges, which survive
    rewind and saved states.

✒ Key Features:
    - Dials: a 64 px drag moves Restitution e by 64/320 of its range; taps
      and chevrons move one notch; the wheel turns a focused dial only.
    - Dial look: the value without a box and its unit set back, the degree
      sign against its number, the ridges parted round the value, a row's
      wheels level past a two-line name or a note, the focus ring for the
      keyboard only, the wheel as the field when typing, and the Math page's
      wheels equal and side by side.
    - Random: the dice shows only in labs that place things, and its three
      switches stay in step.
    - Gravity: random bodies come in every planet type within its mass range;
      a chosen type and the drop speed apply to a dropped body; types survive
      a rewind snapshot and a saved state.
    - Collisions, Fluid, Waves and Fields: random sizes, frequencies, phases,
      charges and charge-to-mass ratios within their ranges.
    - New parameters: Fluid's post radius, Fields' charge size, Cloth's
      gustiness and ball size.
    - Gravity's throws and drops: a short drag throws at the same share of
      the circular speed at any zoom and stays in the system, a drop beside a
      giant becomes its moon, and a drag begun on a planet launches from its
      surface.

✒ Usage Instructions:
    $ python tests/placement.py
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

with sync_playwright() as p:
    b = launch(p)

    def fresh(lab):
        """A new page with its own storage, ready on the given lab."""
        ctx = b.new_context(viewport=VIEW)
        page = open_page(ctx)
        page.goto(URL + "#" + lab)
        page.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === '%s'" % lab)
        page.wait_for_timeout(400)
        return page

    def stage_at(page, fx, fy):
        s = page.locator("#stage").bounding_box()
        return s["x"] + s["width"] * fx, s["y"] + s["height"] * fy

    # ---- Dials: drag, tap, chevron, wheel, keys, typing; one restart per gesture
    pg = fresh("collisions")
    st = lambda e: pg.evaluate(P + ".active.p." + e)
    w = pg.locator("#ctl-collisions-e-wheel").bounding_box(); cy = w["y"] + w["height"] / 2
    x0 = w["x"] + w["width"] * 0.75
    pg.mouse.move(x0, cy); pg.mouse.down(); pg.mouse.move(x0 - 32, cy, steps=4); pg.mouse.move(x0 - 64, cy, steps=4); pg.mouse.up()
    ok("dial_drag_scrubs", abs(st("e") - 0.8) < 1e-9 and pg.inner_text("#ctl-collisions-e-out") == "0.80", st("e"))
    ok("dial_drag_keeps_focus", pg.evaluate("document.activeElement.id") == "ctl-collisions-e")
    pg.mouse.click(w["x"] + w["width"] * 0.85, cy); r1 = st("e")
    pg.mouse.click(w["x"] + w["width"] * 0.15, cy); r2 = st("e")
    ok("dial_tap_nudges", abs(r1 - 0.81) < 1e-9 and abs(r2 - 0.8) < 1e-9, (r1, r2))
    pg.click("#ctl-collisions-e-wheel .dial-step[data-dir='1']")
    ok("dial_chevron_steps", abs(st("e") - 0.81) < 1e-9, st("e"))
    pg.mouse.move(w["x"] + w["width"] * 0.3, cy); pg.mouse.wheel(0, -100); pg.wait_for_timeout(400)
    ok("dial_wheel_turns_when_focused", abs(st("e") - 0.82) < 1e-9, st("e"))
    pg.keyboard.press("ArrowLeft")
    ok("dial_keyboard", abs(st("e") - 0.81) < 1e-9, st("e"))
    pg.click("#ctl-collisions-e-out"); pg.keyboard.press("Control+A"); pg.keyboard.type("0.5"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    ok("dial_typed_value", st("e") == 0.5 and pg.evaluate("document.activeElement.id") == "ctl-collisions-e-out", st("e"))
    pg.evaluate("document.activeElement.blur()")
    g = pg.locator("#ctl-collisions-gravity-wheel").bounding_box()
    pg.mouse.move(g["x"] + 20, g["y"] + 10); pg.mouse.wheel(0, -100); pg.wait_for_timeout(300)
    ok("dial_wheel_ignored_unfocused", st("gravity") == 0, st("gravity"))
    # Ends in 0: Playwright calls a string that evaluates to a function, which would count a build of its own.
    pg.evaluate("window.rebuilds = 0; const L = PhysicsPlayground.active, f = L.build.bind(L); L.build = (...a) => { window.rebuilds++; return f(...a); }; 0")
    c = pg.locator("#ctl-collisions-count-wheel").bounding_box(); cyc = c["y"] + c["height"] / 2
    pg.mouse.move(c["x"] + c["width"] * 0.5, cyc); pg.mouse.down(); pg.mouse.move(c["x"] + c["width"] * 0.5 + 40, cyc, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
    ok("dial_restart_once_per_drag", pg.evaluate("window.rebuilds") == 1 and st("count") > 260 and pg.evaluate(P + ".active.n") == st("count"), (pg.evaluate("window.rebuilds"), st("count")))
    ok("dial_cards_in_grid", pg.locator("#params-body .dial-grid .dial").count() >= 5)
    pg.context.close()

    # ---- Dial look (2.11.0): the value without a box, its unit set back, the ridges parted round it, wheels in line,
    # the focus ring for the keyboard only, the wheel as the field when typing, and the Math page's wheels in line
    pg = fresh("chaos")
    parts = pg.evaluate("[...document.querySelectorAll('#ctl-chaos-g-out > span')].map(s => [s.className, s.textContent])")
    ok("dial_unit_set_back", parts == [["dial-num", "9.81"], ["dial-unit", "m/s²"]] and pg.inner_text("#ctl-chaos-g-out") == "9.81 m/s²", parts)
    ok("dial_degree_against_number", pg.inner_text("#ctl-chaos-theta1-out") == "120°", pg.inner_text("#ctl-chaos-theta1-out"))
    gap = pg.evaluate("(() => { const w = document.querySelector('#ctl-chaos-g-wheel'), v = document.querySelector('#ctl-chaos-g-out'); return [parseFloat(w.style.getPropertyValue('--gap')), v.offsetWidth / 2, getComputedStyle(v).backgroundColor, getComputedStyle(v).boxShadow]; })()")
    ok("dial_ridges_part_round_value", gap[0] > 10 and abs(gap[0] - gap[1]) < 0.6 and gap[2] == "rgba(0, 0, 0, 0)" and gap[3] == "none", gap)
    top = lambda sel: pg.locator(sel).bounding_box()["y"]
    ok("dial_wheels_level_past_two_line_name", abs(top("#ctl-chaos-copies-wheel") - top("#ctl-chaos-delta-wheel")) < 0.5, (top("#ctl-chaos-copies-wheel"), top("#ctl-chaos-delta-wheel")))
    ring = lambda: pg.evaluate("(() => { const w = document.querySelector('#ctl-chaos-len-wheel'); return [w.classList.contains('by-pointer'), getComputedStyle(w).boxShadow.includes('0px 0px 0px 2px')]; })()")
    w = pg.locator("#ctl-chaos-len-wheel").bounding_box(); cy = w["y"] + w["height"] / 2
    pg.mouse.move(w["x"] + 40, cy); pg.mouse.down(); pg.mouse.move(w["x"] + 70, cy, steps=4); pg.mouse.up(); pg.wait_for_timeout(250)
    # The ring eases in over 0.2 s, so the keyboard's ring is awaited (up to 2 s) rather than read mid-transition.
    r_ptr = ring(); pg.keyboard.press("ArrowRight")
    try:
        pg.wait_for_function("getComputedStyle(document.querySelector('#ctl-chaos-len-wheel')).boxShadow.includes('0px 0px 0px 2px')", timeout=2000)
    except Exception:
        pass
    r_key = ring()
    ok("dial_focus_ring_for_keyboard_only", r_ptr == [True, False] and r_key == [False, True], (r_ptr, r_key))
    pg.click("#ctl-chaos-damp-out"); pg.wait_for_timeout(150)
    fld = pg.evaluate("(() => { const w = document.querySelector('#ctl-chaos-damp-wheel'), e = w.querySelector('.ctl-edit'); return e && [e.offsetWidth, w.clientWidth - 40, getComputedStyle(w.querySelector('.dial-ridges')).visibility]; })()")
    pg.keyboard.press("Escape")
    ok("dial_wheel_is_the_field_when_typing", fld and abs(fld[0] - fld[1]) <= 1 and fld[2] == "hidden" and pg.is_visible("#ctl-chaos-damp-out"), fld)
    pg.click("#nt-math"); pg.wait_for_timeout(600)
    boxes = pg.evaluate("[...document.querySelector('#math .fl-params').querySelectorAll('.dial-wheel')].map(w => { const r = w.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })")
    ok("math_wheels_equal_side_by_side", len(boxes) == 4 and len({b[2] for b in boxes}) == 1 and len({b[0] for b in boxes}) == 2 and len({b[1] for b in boxes}) == 2, boxes)
    pg.context.close()
    pg = fresh("gravity")
    ok("dial_wheels_level_beside_a_note", abs(pg.locator("#ctl-gravity-G-wheel").bounding_box()["y"] - pg.locator("#ctl-gravity-soft-wheel").bounding_box()["y"]) < 0.5)
    pg.context.close()

    # ---- Random: the dice and the Controls switch agree; the dice shows where things are placed, named for that lab
    pg = fresh("gravity")
    shown, named = {}, {}
    DICE = "(() => { const d = document.getElementById('dock-dice'), L = PhysicsPlayground.active; return [d.getAttribute('aria-label'), d.dataset.tip || null, d.getAttribute('aria-pressed'), L.random ? L.random.label : null]; })()"
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.click("#tab-" + lab); pg.wait_for_timeout(200)
        shown[lab] = pg.is_visible("#dock-dice")
        named[lab] = pg.evaluate(DICE)
    ok("dice_only_where_placing", shown == {"gravity": True, "collisions": True, "fluid": True, "waves": True, "chaos": False, "cloth": False, "fields": True}, shown)
    # The dice names the current lab's thing, and a lab without Random leaves no other lab's name on it (Chaos, after
    # Waves, read "Random sources").
    ok("dice_names_the_current_lab", all((v[0] == v[3] and v[1] and v[2] == "false") if v[3] else v[:3] == [None, None, "false"] for v in named.values())
       and named["waves"][0] == "Random sources" and named["chaos"][0] is None, named)
    pg.click("#tab-gravity"); pg.wait_for_timeout(200)
    pg.click("#dock-dice"); pg.wait_for_timeout(300)
    ok("dice_turns_random_on", pg.evaluate(P + ".active.p.rand") is True and pg.get_attribute("#dock-dice", "aria-pressed") == "true" and pg.get_attribute("#ctl-gravity-rand", "aria-checked") == "true")
    ok("random_disables_fixed_mass", pg.is_disabled("#ctl-gravity-launchMass") and "Random" in pg.inner_text("#ctl-gravity-launchMass-note"))
    pg.click("#ctl-gravity-rand"); pg.wait_for_timeout(400)
    ok("controls_switch_moves_dice", pg.get_attribute("#dock-dice", "aria-pressed") == "false" and pg.evaluate(P + ".active.p.rand") is False)
    # Every other way the setting changes moves the dice in the same task, with no frame between: the Guide has no
    # switch of its own any more, and the dice no longer waits for a panel tick. The section's Reset sets it back to the
    # scene's value (through syncPanel), and a setting made by code goes through setParam (syncControl).
    pg.evaluate(P + ".pause()")
    now = "[PhysicsPlayground.active.p.rand, document.getElementById('dock-dice').getAttribute('aria-pressed'), document.getElementById('ctl-gravity-rand').getAttribute('aria-checked')]"
    by_code = pg.evaluate("(() => { PhysicsPlayground.setParam('rand', true); return %s; })()" % now)
    reset = pg.evaluate("(() => { document.querySelector('[data-group=spawn] .pgroup-reset').click(); return %s; })()" % now)
    ok("dice_follows_every_change", by_code == [True, "true", "true"] and reset == [False, "false", "false"] and pg.locator("#guide .g-switch").count() == 0, (by_code, reset))
    pg.evaluate(P + ".play()")

    # ---- Gravity: random bodies in every type and its range; chosen type and drop speed; types survive rewind
    draws = pg.evaluate("(() => { const L = PhysicsPlayground.active, out = []; for (let i = 0; i < 400; i++) out.push(L.drawNew()); return out; })()")
    kinds = pg.evaluate("Object.fromEntries(Object.entries(PhysicsPlayground.labs.gravity.KINDS).filter(([, v]) => v.m).map(([k, v]) => [k, v.m]))")
    seen = sorted({d["kind"] for d in draws})
    ok("random_draws_every_planet_type", seen == ["brown", "gas", "ice", "subNeptune", "superEarth", "terrestrial"], seen)
    ok("random_masses_in_type_range", all(kinds[d["kind"]][0] * 0.995 <= d["m"] <= kinds[d["kind"]][1] * 1.005 for d in draws), kinds)
    n0 = pg.evaluate(P + ".active.bodies.length")
    for fx, fy in [(0.25, 0.3), (0.7, 0.3), (0.3, 0.7), (0.65, 0.72)]:
        x, y = stage_at(pg, fx, fy); pg.mouse.click(x, y); pg.wait_for_timeout(80)
    added = pg.evaluate(P + ".active.bodies.slice(%d).map(b => [b.kind, b.m])" % n0)
    ok("clicks_place_random_bodies", len(added) >= 3 and all(k in kinds and kinds[k][0] * 0.995 <= m <= kinds[k][1] * 1.005 for k, m in added), added)
    pg.evaluate(P + ".active.p.rand = false"); pg.evaluate(P + ".active.p.kind = 'ice'"); pg.evaluate(P + ".active.p.orbitK = 1.25")
    # Dropped and measured in one call, before a frame can move it.
    b1 = pg.evaluate("""(() => { const L = PhysicsPlayground.active, H = L.heaviest(); L.dropOrbit(H.x + 200, H.y); const b = L.bodies.at(-1);
      const v = Math.hypot(b.vx - H.vx, b.vy - H.vy), vc = L.vCirc(H.m + b.m, Math.hypot(b.x - H.x, b.y - H.y)); return [b.kind, v / vc]; })()""")
    ok("chosen_type_and_drop_speed", b1[0] == "ice" and abs(b1[1] - 1.25) < 1e-6, b1)
    # The fixed mass (2) is far above an ice giant's range, so the body takes the top of it: class and mass agree.
    ok("chosen_type_keeps_its_mass_range", pg.evaluate("(() => { const L = PhysicsPlayground.active, b = L.bodies.at(-1), [lo, hi] = L.KINDS.ice.m; return b.m >= lo && b.m <= hi * 1.000001; })()"))
    kinds_before = pg.evaluate(P + ".active.bodies.map(b => b.kind)")
    snap = pg.evaluate("(() => { const L = PhysicsPlayground.active, s = L.snapshot(); L.bodies.forEach(b => b.kind = 'terrestrial'); L.restore(s); return L.bodies.map(b => b.kind); })()")
    ok("types_survive_rewind", snap == kinds_before, (kinds_before[-4:], snap[-4:]))
    ser = pg.evaluate("(() => { const L = PhysicsPlayground.active, o = JSON.parse(JSON.stringify(L.serialize())); L.deserialize(o); return L.bodies.map(b => b.kind); })()")
    ok("types_survive_saved_state", ser == kinds_before)
    pg.click("#nt-controls"); pg.wait_for_timeout(200)
    pg.evaluate("PhysicsPlayground.active.track = PhysicsPlayground.active.bodies.at(-1).id"); pg.wait_for_timeout(600)
    pg.click("#btn-deck-size"); pg.wait_for_timeout(300)
    settle(pg, "document.getElementById('tile-deck').dataset.pane === 'inspect'", 5000)
    ok("inspector_names_the_type", "Ice giant" in pg.inner_text("#tile-deck"))
    pg.context.close()

    # ---- Gravity (2.13.0): a throw is measured against the orbit it goes into, so a short drag stays in the system at
    # any zoom (it used to leave at several times escape speed zoomed out), and a drop beside a giant becomes its moon
    pg = fresh("gravity")
    pg.evaluate("PhysicsPlayground.preset('solar')"); pg.evaluate("PhysicsPlayground.pause()"); pg.wait_for_timeout(300)
    # Speed against the body that holds the throw's start, over the circular speed there, and over the escape speed.
    ratio = """(id) => { const L = PhysicsPlayground.active, b = L.bodies.find(q => q.id === id), H = L.hostAt(b.x, b.y, b.z) === b ? L.heaviest() : L.hostAt(b.x, b.y, b.z);
      const d = Math.hypot(b.x - H.x, b.y - H.y), v = Math.hypot(b.vx - H.vx, b.vy - H.vy), vc = L.vCirc(H.m + b.m, d); return [v / vc, v / (vc * Math.SQRT2)]; }"""
    throws = []
    for zoom in (1, 0.25):
        if zoom != 1:
            pg.evaluate(f"PhysicsPlayground.view.zoomBy({zoom})"); pg.wait_for_timeout(1500)
        box = pg.locator("#stage-canvas").bounding_box(); x0, y0 = box["x"] + box["width"] * 0.62, box["y"] + box["height"] * 0.5
        before = pg.evaluate("PhysicsPlayground.active.uid")
        pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0, y0 - 30, steps=3); pg.mouse.move(x0, y0 - 60, steps=3); pg.mouse.up(); pg.wait_for_timeout(150)
        new = pg.evaluate(f"PhysicsPlayground.active.bodies.filter(b => b.id > {before}).map(b => b.id)")
        throws.append(pg.evaluate(ratio, new[0]) if new else None)
    ok("throw_speed_follows_the_orbit_not_the_zoom", all(t and abs(t[0] - 60 / 90) < 0.04 and t[1] < 1 for t in throws), throws)
    pg.evaluate("PhysicsPlayground.advance(10)")
    ok("thrown_bodies_stay_in_the_system", pg.evaluate("PhysicsPlayground.active.escaped") == 0)
    moon = pg.evaluate("""(() => { const L = PhysicsPlayground.active; L.build('solar'); const J = L.bodies.find(b => b.kind === 'gas' && b.m > 0.5), n = L.bodies.length;
      L.p.launchMass = 0.001; L.p.kind = 'auto'; const host = L.hostAt(J.x + 6, J.y); L.dropOrbit(J.x + 6, J.y); if (L.bodies.length === n) return null;
      const m = L.bodies.at(-1), h = L.dt(); let lo = Infinity, hi = 0;
      for (let i = 0; i < 480 * 8; i++) { L.step(h); L.t += h; const d = Math.hypot(m.x - J.x, m.y - J.y); lo = Math.min(lo, d); hi = Math.max(hi, d); }
      return [host === J, L.bodies.includes(m), +lo.toFixed(2), +hi.toFixed(2)]; })()""")
    ok("drop_beside_a_giant_makes_a_moon", moon and moon[0] and moon[1] and 4 < moon[2] and moon[3] < 8.5, moon)
    # A drag that starts on a planet launches from its surface rather than merging into it at once.
    pg.evaluate("PhysicsPlayground.preset('solar')"); pg.evaluate("PhysicsPlayground.pause()"); pg.wait_for_timeout(300)
    at = pg.evaluate("""(() => { const L = PhysicsPlayground.active, J = L.bodies.find(b => b.kind === 'gas' && b.m > 0.5), v = L.viewXf, r = document.getElementById('stage-canvas').getBoundingClientRect();
      L.p.launchMass = 0.001; L.p.kind = 'auto';
      return { x: r.left + J.x * v.z + v.ox, y: r.top + J.y * v.z + v.oy, uid: L.uid, jm: J.m }; })()""")
    pg.mouse.move(at["x"], at["y"]); pg.mouse.down(); pg.mouse.move(at["x"] + 20, at["y"] - 20, steps=3); pg.mouse.move(at["x"] + 40, at["y"] - 40, steps=3); pg.mouse.up(); pg.wait_for_timeout(150)
    # Placed outside the planet's merge distance, and still its own body a few frames on, the planet's mass unchanged.
    launch = pg.evaluate(f"""(() => {{ const L = PhysicsPlayground.active, J = L.bodies.find(b => b.kind === 'gas' && Math.abs(b.m - {at['jm']}) < 1e-12), b = L.bodies.find(q => q.id > {at['uid']});
      if (!b || !J) return null; const gap = Math.hypot(b.x - J.x, b.y - J.y) / (0.7 * (J.r + b.r)); L.step(L.dt()); L.step(L.dt()); L.step(L.dt());
      return [+gap.toFixed(2), L.bodies.includes(b), J.m === {at['jm']}]; }})()""")
    ok("throw_from_a_planet_launches_from_its_surface", launch and launch[0] > 1 and launch[1] and launch[2], launch)
    pg.context.close()

    # ---- Collisions, Fluid, Waves, Fields: random sizes, frequencies, phases and charges
    pg = fresh("collisions")
    pg.evaluate(P + ".active.p.rand = true")
    # A press on empty table adds a ball, one on a ball grabs it; only the added ones count.
    radii = pg.evaluate("""(() => { const L = PhysicsPlayground.active, out = [];
      for (let i = 0; i < 120 && out.length < 24; i++) { const n = L.n; L.pointerDown({ x: 20 + (i * 37) % 700, y: 20 + (i * 53) % 400 }); L.pointerUp({ x: 0, y: 0 }); if (L.n > n) out.push(L.r[L.n - 1]); }
      return out; })()""")
    ok("collisions_random_radii", len(radii) >= 10 and all(4 <= r <= 24 for r in radii) and len(set(radii)) > 4, radii)
    pg.context.close()

    pg = fresh("fluid")
    pg.evaluate(P + ".tool('obstacle')")
    x, y = stage_at(pg, 0.35, 0.3); pg.mouse.click(x, y); pg.wait_for_timeout(100)
    pg.evaluate(P + ".active.p.postR = 2.5")
    x, y = stage_at(pg, 0.6, 0.3); pg.mouse.click(x, y); pg.wait_for_timeout(100)
    pg.evaluate(P + ".active.p.rand = true")
    for fx in (0.2, 0.45, 0.75):
        x, y = stage_at(pg, fx, 0.15); pg.mouse.click(x, y); pg.wait_for_timeout(100)
    radii = pg.evaluate(P + ".active.obs.slice(-5).map(o => o.r)")
    ok("fluid_post_radius_and_random", radii[0] == 1.5 and radii[1] == 2.5 and all(0.8 <= r <= 2.6 for r in radii[2:]) and len(radii) == 5, radii)
    pg.context.close()

    pg = fresh("waves")
    pg.evaluate(P + ".tool('source')"); pg.evaluate(P + ".active.p.rand = true")
    for fx in (0.3, 0.5, 0.7):
        x, y = stage_at(pg, fx, 0.4); pg.mouse.click(x, y); pg.wait_for_timeout(80)
    srcs = pg.evaluate(P + ".active.sources.slice(-3).map(s => [s.fm, s.phase])")
    ok("waves_random_sources", len(srcs) == 3 and all(0.5 <= f <= 2 and 0 <= ph <= 6.2832 for f, ph in srcs), srcs)
    pg.evaluate(P + ".active.selSrc = PhysicsPlayground.active.sources.at(-1).id"); pg.wait_for_timeout(300)
    f_row = pg.evaluate("(r => r && r.rows.find(x => x[0] === 'Frequency f'))(PhysicsPlayground.active.inspect())")
    ok("waves_source_shows_own_frequency", f_row and "Random" in f_row[2], f_row)
    pg.context.close()

    pg = fresh("fields")
    pg.evaluate(P + ".tool('plus')"); pg.evaluate(P + ".active.p.qNew = 3")
    x, y = stage_at(pg, 0.3, 0.25); pg.mouse.click(x, y); pg.wait_for_timeout(80)
    q_fixed = pg.evaluate(P + ".active.charges.at(-1).q")
    pg.evaluate(P + ".active.p.rand = true")
    for fx in (0.45, 0.6, 0.75):
        x, y = stage_at(pg, fx, 0.25); pg.mouse.click(x, y); pg.wait_for_timeout(80)
    qs = pg.evaluate(P + ".active.charges.slice(-3).map(c => c.q)")
    pg.evaluate(P + ".tool('launch')")
    qms = []
    for i in range(4):
        x, y = stage_at(pg, 0.2, 0.55 + i * 0.06); pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 50, y, steps=3); pg.mouse.up(); pg.wait_for_timeout(60)
        qms.append(pg.evaluate("(L => L.qm[L.n - 1])(PhysicsPlayground.active)"))
    ok("fields_charge_size", q_fixed == 3, q_fixed)
    ok("fields_random_charges", all(1 <= q <= 4 for q in qs), qs)
    ok("fields_random_particles", all(0.2 <= abs(v) <= 4 for v in qms), qms)
    pg.context.close()

    # ---- Cloth: gustiness and ball size
    pg = fresh("cloth")
    r1 = pg.evaluate(P + ".active.ballR()"); pg.evaluate(P + ".active.p.ballK = 1.5"); r2 = pg.evaluate(P + ".active.ballR()")
    ok("cloth_ball_size", abs(r2 / r1 - 1.5) < 1e-9, (r1, r2))
    ok("cloth_gust_control", pg.locator("#ctl-cloth-gust-wheel").count() == 1 and pg.evaluate(P + ".active.p.gust") == 1)
    pg.context.close()

    b.close()
finish()
