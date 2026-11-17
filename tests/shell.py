"""
✒ Metadata
    - Title: Shell Regression Test (digiSpace Edition - v2.18)
    - File Name: shell.py
    - Relative Path: tests/shell.py
    - Artifact Type: test
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — On
      Dennis's call for one settings dialog: each opener opens its section
      with focus on its current choice; the nav's arrows, the focus trap, the
      workspace's keys held behind it, its own keys, Shift+S beside Fluid's S
      tool, the close button and the backdrop; a centred panel on a desktop
      and the whole screen on a phone. The selection sweep opens each section.
    - 2.14.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Nothing in
      the workspace selects, on any page, pane, sheet or menu in 2D or 3D;
      real drags and double-clicks select nothing, short labels included; text
      fields still select and edit; .selectable opts in.
    - 2.6.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      fps_recovers counts a hundred frames after the load stops, however long
      a renderer without a GPU takes to draw them, and holds the meter to the
      rate those frames actually ran at, where before it waited a fixed 3 s
      and asked for 1.5 times the loaded rate, which an idle software renderer
      could not reach in time.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The B and
      Particles checks tap the controls' thumbwheels, which replaced the
      sliders.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Chaos
      split-view checks select the Both view by name, now that Phase map shows
      the map alone.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added
      checks for Fluid's posts across a Particles rebuild and Reset, the
      control sections (order, quick actions, one restart note, section
      Reset, focus, remembered fold) and the Chaos phase view (split layout,
      reach curve, hover preview, click to start, bob drag).
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      as regression tests for the shell fixes: layout keys, held keys, Space
      after a mouse click, resizing, datasets across a rewind, the B gradient
      control, cancelled throws, saved-state headers, keyboard focus, the
      remembered lab and the frame-rate meter.

✒ Description:
    Drives the real interface with the keyboard and mouse to pin down shell
    behaviour that has broken before. Each section opens its own page and
    storage, so no check depends on what another one left behind.

✒ Key Features:
    - Layout keys: F, Shift+B, and b as a tool key, with CapsLock semantics.
    - Held keys send real repeat events and still act once.
    - Space plays and pauses after a mouse click on a button, and reaches a
      button that holds keyboard focus.
    - Resizes from F, Shift+B and the viewport keep edits and rewind history.
    - A dataset across a rewind is one timeline, named for its own scene.
    - Enabled controls, cancelled throws, saved-state headers, keyboard
      focus and the remembered lab.
    - The frame-rate meter follows slow frames with the page thread loaded.
    - Fluid's posts outlast a Particles rebuild; Reset starts clean.
    - Control sections: order, quick actions, one restart note, section
      Reset with focus kept, and a remembered fold.
    - The Chaos phase view: split layout, reach curve, hover preview, click
      to start, and a bob that still drags.
    - Settings: every entry point at its section, the nav, the focus trap,
      Escape, the backdrop and focus handed back; the workspace's keys held
      behind it; centred on a desktop and the whole screen on a phone.

✒ Usage Instructions:
    $ python tests/shell.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import re
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, scene

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
WALLS = P + ".labs.waves.wall.reduce((a, b) => a + b, 0)"
LINKS = P + ".labs.cloth.alive.subarray(0, " + P + ".labs.cloth.L).reduce((a, b) => a + b, 0)"
OBSTACLES = "JSON.stringify(" + P + ".labs.fluid.obs)"
# A paused run takes no snapshots, so anything that pauses must first wait for this.
HISTORY = P + ".history.size() >= 2"
ACTIVE = "(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, fk: a.dataset.fk || null, text: a.textContent.trim(), ring: a.matches(':focus-visible') } })()"
NEWEST_RUN = """async () => { const C = PhysicsPlayground.capture, run = C.vault.list().find(i => i.kind === 'run');
  return { title: run.title, preset: run.preset, names: run.files.map(f => f.name), csv: await (await C.vault.blob(run, 0)).text(), tracks: run.files[1] ? await (await C.vault.blob(run, 1)).text() : '' } }"""
# Every helper below acts on `pg`, the page of the current section.
state = lambda expr: pg.evaluate(P + "." + expr)
running = lambda: state("state.running")
lab_t = lambda: state("active.t")
tool = lambda: state("active.p.tool")
snapshots = lambda: state("history.size()")
in_focus = lambda: pg.evaluate("document.getElementById('bento').classList.contains('focus')")
has_bay = lambda: not pg.evaluate("document.getElementById('bento').classList.contains('no-bay')")
stage_size = lambda: (lambda r: (round(r["width"]), round(r["height"])))(pg.locator("#stage").bounding_box())
blur = lambda: pg.evaluate("document.activeElement && document.activeElement.blur()")
times = lambda text: [float(line.split(",")[0]) for line in text.strip().split("\n")[1:]]

with sync_playwright() as p:
    b = launch(p)

    def fresh(lab):
        """A new page with its own storage, ready on the given lab."""
        ctx = b.new_context(viewport=VIEW, accept_downloads=True)
        page = open_page(ctx)
        page.goto(URL + "#" + lab)
        page.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.capture.vault.mode === 'local'")
        page.wait_for_timeout(500)
        return page

    def stage_point(fx, fy):
        """Screen coordinates of a fraction of the stage canvas."""
        r = pg.locator("#stage-canvas").bounding_box()
        return r["x"] + r["width"] * fx, r["y"] + r["height"] * fy

    def resize_cycle(name, keep):
        """F, Shift+B and a viewport change each resize the stage. The edit read by
        keep(), the clock and the rewind history must come through all three."""
        kept0, n0, t0 = keep(), snapshots(), lab_t()
        ok(name + "_history_to_keep", n0 >= 2, n0)
        steps = [("focus", lambda: pg.keyboard.press("f"), lambda: pg.keyboard.press("f")),
                 ("bay", lambda: pg.keyboard.press("Shift+B"), lambda: pg.keyboard.press("Shift+B")),
                 ("viewport", lambda: pg.set_viewport_size({"width": 1200, "height": 760}), lambda: pg.set_viewport_size(VIEW))]
        for how, change, undo in steps:
            s0 = stage_size(); change(); pg.wait_for_timeout(400); s1 = stage_size()
            ok(f"{name}_{how}_resizes_stage", s1 != s0, (s0, s1))
            ok(f"{name}_{how}_keeps_edit", keep() == kept0, str(keep())[:60])
            ok(f"{name}_{how}_keeps_history", snapshots() == n0, (n0, snapshots()))
            ok(f"{name}_{how}_keeps_clock", abs(lab_t() - t0) < 1e-9, round(lab_t(), 3))
            undo(); pg.wait_for_timeout(400)
        # The kept history must still restore at the new layout, not just be counted.
        pg.keyboard.press(",")
        label = pg.inner_text("#rewind-out")
        ok(name + "_rewind_after_resize", label.endswith("s back"), label)

    # ---- layout keys: F, Shift+B, and b as a tool key
    pg = fresh("fluid"); blur()
    pg.keyboard.press("f")
    ok("f_enters_focus", in_focus() and pg.get_attribute("#btn-focus", "aria-pressed") == "true")
    pg.keyboard.press("f")
    ok("f_leaves_focus", not in_focus() and pg.get_attribute("#btn-focus", "aria-pressed") == "false")
    pg.keyboard.press("Shift+B")
    ok("shift_b_hides_bay", not has_bay() and pg.get_attribute("#btn-bay", "aria-pressed") == "false")
    ok("shift_b_is_not_a_tool_key", tool() == "stir", tool())
    pg.keyboard.press("Shift+B")
    ok("shift_b_shows_bay", has_bay() and pg.get_attribute("#btn-bay", "aria-pressed") == "true")
    pg.evaluate("window.keysSeen = []; addEventListener('keydown', e => keysSeen.push([e.key, e.code, e.shiftKey]), true)")
    for lab_key, lab, start, sel, want in [("3", "fluid", "s", "#dock-fluid-obstacle", "obstacle"), ("6", "cloth", "g", "#dock-cloth-ball", "ball")]:
        pg.keyboard.press(lab_key); pg.wait_for_timeout(200)
        pg.keyboard.press("b")
        ok(lab + "_b_selects_tool", tool() == want and pg.get_attribute(sel, "aria-checked") == "true", tool())
        ok(lab + "_b_leaves_bay", has_bay())
        pg.keyboard.press(start); pg.evaluate("keysSeen.length = 0")
        pg.keyboard.press("B")
        ok(lab + "_capslock_event_shape", pg.evaluate("keysSeen[0]") == ["B", "KeyB", False], pg.evaluate("keysSeen[0]"))
        ok(lab + "_capslock_b_selects_tool", tool() == want and pg.get_attribute(sel, "aria-checked") == "true", tool())
        ok(lab + "_capslock_b_leaves_bay", has_bay())
    pg.context.close()

    # ---- holding a key acts once. Four downs would end back where they started if each one toggled.
    pg = fresh("collisions"); blur()
    # Recorders are counted where they are built, so these checks need no working video encoder.
    pg.evaluate("""() => { window.repeats = 0; addEventListener('keydown', e => { if (e.repeat) repeats++; }, true);
      window.recorders = 0; const Native = MediaRecorder;
      window.MediaRecorder = class extends Native { constructor(...args) { super(...args); recorders++; } }; }""")
    for _ in range(4): pg.keyboard.down("d")
    pg.keyboard.up("d")
    ok("hold_events_repeat", pg.evaluate("repeats") == 3, pg.evaluate("repeats"))
    ok("hold_d_starts_once", state("capture.dataRec.on") is True and pg.get_attribute("#btn-data", "aria-pressed") == "true")
    settle(pg, P + ".capture.dataRec.rows.length >= 2")
    pg.keyboard.press("d")
    settle(pg, P + ".capture.vault.list().some(i => i.kind === 'run' && !i.saving)")
    ok("hold_d_one_dataset", pg.evaluate(P + ".capture.vault.list().filter(i => i.kind === 'run').length") == 1)
    for _ in range(4): pg.keyboard.down("m")
    pg.keyboard.up("m"); pg.wait_for_timeout(400)
    ok("hold_m_starts_once", pg.evaluate(P + ".capture.vrec.mr && " + P + ".capture.vrec.mr.state") == "recording" and pg.get_attribute("#btn-rec", "aria-pressed") == "true")
    ok("hold_m_builds_one_recorder", pg.evaluate("recorders") == 1, pg.evaluate("recorders"))
    pg.keyboard.press("m"); pg.wait_for_timeout(400)
    ok("press_m_stops_recording", pg.evaluate("!" + P + ".capture.vrec.mr") and pg.get_attribute("#btn-rec", "aria-pressed") == "false")
    for _ in range(4): pg.keyboard.down("f")
    pg.keyboard.up("f")
    ok("hold_f_toggles_once", in_focus())
    pg.context.close()

    # ---- Space after a mouse click belongs to play and pause; a keyboard-focused button keeps it
    pg = fresh("gravity")
    for name, pick in [("reset", lambda: pg.click("#btn-reset")), ("scene_chip", lambda: scene(pg, "#preset-gravity-figure8"))]:
        pick(); pg.wait_for_timeout(700)
        t0, run0 = lab_t(), running()
        pg.keyboard.press("Space")
        ok(f"{name}_click_then_space_toggles", running() != run0, running())
        ok(f"{name}_click_then_space_no_restart", lab_t() >= t0, (round(t0, 3), round(lab_t(), 3)))
        ok(f"{name}_click_then_space_frees_focus", pg.evaluate(ACTIVE)["tag"] == "BODY", pg.evaluate(ACTIVE)["tag"])
        pg.keyboard.press("Space")
        ok(f"{name}_click_then_space_toggles_back", running() == run0, running())
    # Tab from the neighbouring control, so focus really does arrive by keyboard.
    pg.focus("#btn-step"); pg.keyboard.press("Tab"); pg.wait_for_timeout(700)
    a = pg.evaluate(ACTIVE)
    ok("tab_reaches_reset_with_ring", a["id"] == "btn-reset" and a["ring"], a)
    t0, run0 = lab_t(), running()
    pg.keyboard.press("Space"); pg.wait_for_timeout(50)
    ok("space_on_focused_reset_restarts", lab_t() < t0, (round(t0, 3), round(lab_t(), 3)))
    ok("space_on_focused_reset_leaves_play", running() == run0, running())
    # Tab onto the scene button from behind, open it with Space, and Space again reloads the scene.
    pg.focus("#nav-out"); pg.keyboard.press("Shift+Tab"); pg.wait_for_timeout(700)
    a = pg.evaluate(ACTIVE)
    ok("tab_reaches_scene_button_with_ring", a["id"] == "scene-btn" and a["ring"], a)
    pg.keyboard.press("Space"); pg.wait_for_timeout(100)
    a = pg.evaluate(ACTIVE)
    ok("space_opens_the_scene_menu", a["id"] == "preset-gravity-figure8", a)
    t0, run0 = lab_t(), running()
    pg.keyboard.press("Space"); pg.wait_for_timeout(50)
    ok("keyboard_pick_returns_to_the_button", pg.evaluate(ACTIVE)["id"] == "scene-btn", pg.evaluate(ACTIVE))
    ok("space_on_focused_chip_reloads_scene", lab_t() < t0, (round(t0, 3), round(lab_t(), 3)))
    ok("space_on_focused_chip_leaves_play", running() == run0, running())
    pg.context.close()

    # ---- resizing the stage keeps what was drawn on it
    pg = fresh("waves"); scene(pg, "#preset-waves-ripple"); blur(); pg.wait_for_timeout(1300)
    pg.keyboard.press("w")
    pg.mouse.move(*stage_point(0.3, 0.5)); pg.mouse.down(); pg.mouse.move(*stage_point(0.7, 0.5), steps=12); pg.mouse.up()
    settle(pg, HISTORY); pg.keyboard.press("Space")
    ok("waves_wall_painted", pg.evaluate(WALLS) > 0, pg.evaluate(WALLS))
    resize_cycle("waves", lambda: pg.evaluate(WALLS))
    pg.context.close()

    pg = fresh("fluid"); blur(); pg.wait_for_timeout(1000)
    pg.keyboard.press("b"); pg.mouse.click(*stage_point(0.5, 0.3)); settle(pg, HISTORY); pg.keyboard.press("Space")
    ok("fluid_obstacle_placed", pg.evaluate(P + ".labs.fluid.obs.length") == 1)
    resize_cycle("fluid", lambda: pg.evaluate(OBSTACLES))
    pg.context.close()

    pg = fresh("cloth"); blur(); settle(pg, HISTORY)
    pg.keyboard.press("Space"); pg.keyboard.press("c")
    links0 = pg.evaluate(LINKS)
    pg.mouse.move(*stage_point(0.25, 0.4)); pg.mouse.down(); pg.mouse.move(*stage_point(0.75, 0.42), steps=20); pg.mouse.up()
    ok("cloth_tear_made", pg.evaluate(LINKS) < links0, (links0, pg.evaluate(LINKS)))
    resize_cycle("cloth", lambda: pg.evaluate(LINKS))
    pg.context.close()

    # ---- a dataset recorded across a rewind is one continuous timeline
    pg = fresh("gravity"); scene(pg, "#preset-gravity-figure8"); blur()
    pg.keyboard.press("d"); pg.wait_for_timeout(2600)
    for _ in range(6): pg.keyboard.press(",")
    back_to, reached = lab_t(), pg.evaluate(P + ".capture.dataRec.rows.at(-1)[0]")
    ok("rewind_went_back_while_recording", reached - back_to > 0.5, (round(back_to, 3), round(reached, 3)))
    pg.keyboard.press("Space"); pg.wait_for_timeout(500)
    pg.keyboard.press("d"); pg.wait_for_timeout(500)
    run = pg.evaluate(NEWEST_RUN)
    ts, track_ts = times(run["csv"]), times(run["tracks"])
    gaps = [y - x for x, y in zip(ts, ts[1:])]
    ok("rewind_dataset_t_increases", min(gaps) > 0, min(gaps))
    ok("rewind_dataset_discards_future", ts[-1] < reached, (round(ts[-1], 3), round(reached, 3)))
    ok("rewind_dataset_runs_past_rewind_point", ts[0] <= back_to < ts[-1], (round(ts[0], 3), round(back_to, 3), round(ts[-1], 3)))
    ok("rewind_dataset_has_no_gap", max(gaps) < 0.25, max(gaps))
    ok("rewind_tracks_stay_in_order", all(y >= x for x, y in zip(track_ts, track_ts[1:])))
    # A scene change ends the recording, but the dataset still belongs to the scene it recorded.
    scene(pg, "#preset-gravity-figure8"); blur()
    pg.keyboard.press("d"); pg.wait_for_timeout(2000)
    scene(pg, "#preset-gravity-binary"); pg.wait_for_timeout(500)
    run = pg.evaluate(NEWEST_RUN)
    ok("scene_change_stops_recording", state("capture.dataRec.on") is False)
    ok("scene_change_header_moves_on", pg.inner_text("#stage-scene") == "Binary star", pg.inner_text("#stage-scene"))
    ok("dataset_title_names_its_scene", run["title"] == "Gravity · Figure-eight data", run["title"])
    ok("dataset_preset_names_its_scene", run["preset"] == "figure8", run["preset"])
    ok("dataset_files_name_their_scene", all(re.match(r"physics-gravity-figure8-", n) for n in run["names"]) and len(run["names"]) == 2, run["names"])
    pg.context.close()

    # ---- Fields, Dipole: the B slider enables the B gradient control at once
    pg = fresh("fields"); scene(pg, "#preset-fields-dipole")
    ok("gradb_locked_at_zero_b", pg.is_disabled("#ctl-fields-gradB") and state("labs.fields.p.B") == 0)
    ok("gradb_says_why", "magnetic field" in pg.inner_text("#ctl-fields-gradB-note"), pg.inner_text("#ctl-fields-gradB-note"))
    pg.focus("#ctl-fields-B"); pg.keyboard.press("ArrowRight")
    ok("gradb_unlocks_from_keyboard", pg.is_enabled("#ctl-fields-gradB"), state("labs.fields.p.B"))
    pg.keyboard.press("ArrowLeft")
    ok("gradb_locks_again_at_zero_b", pg.is_disabled("#ctl-fields-gradB"), state("labs.fields.p.B"))
    r = pg.locator("#ctl-fields-B-wheel").bounding_box()
    pg.mouse.click(r["x"] + r["width"] * 0.8, r["y"] + r["height"] / 2)
    ok("gradb_unlocks_from_mouse", pg.is_enabled("#ctl-fields-gradB"), state("labs.fields.p.B"))
    pg.context.close()

    # ---- switching labs mid-throw cancels the throw
    pg = fresh("gravity"); blur(); pg.keyboard.press("Space")
    n0 = pg.evaluate(P + ".labs.gravity.bodies.length")
    pg.mouse.move(*stage_point(0.8, 0.2)); pg.mouse.down(); pg.mouse.move(*stage_point(0.7, 0.35), steps=6)
    ok("throw_is_aiming", state("labs.gravity.aim") is not None)
    pg.keyboard.press("2")
    ok("key_2_mid_throw_switches_lab", state("active.id") == "collisions", state("active.id"))
    pg.mouse.up(); pg.wait_for_timeout(100)
    ok("mid_throw_adds_no_ball", state("labs.collisions.n") == state("labs.collisions.p.count"), state("labs.collisions.n"))
    pg.keyboard.press("1"); pg.wait_for_timeout(100)
    ok("mid_throw_adds_no_body", pg.evaluate(P + ".labs.gravity.bodies.length") == n0, (n0, pg.evaluate(P + ".labs.gravity.bodies.length")))
    ok("mid_throw_clears_aim", state("labs.gravity.aim") is None)
    pg.context.close()

    # ---- loading a saved state moves the stage header to the saved scene
    pg = fresh("gravity"); scene(pg, "#preset-gravity-figure8"); pg.wait_for_timeout(200)
    pg.click("#btn-state"); pg.wait_for_timeout(400)
    scene(pg, "#preset-gravity-binary"); pg.wait_for_timeout(100)
    ok("header_before_load", pg.inner_text("#stage-scene") == "Binary star", pg.inner_text("#stage-scene"))
    pg.click("#nt-library"); pg.wait_for_timeout(200)
    pg.locator(".lib-item[data-kind=state] [data-fk=load]").click(); pg.wait_for_timeout(400)
    ok("load_updates_header", pg.inner_text("#stage-scene") == "Figure-eight", pg.inner_text("#stage-scene"))
    ok("load_updates_scene_chip", pg.get_attribute("#preset-gravity-figure8", "aria-checked") == "true")
    pg.keyboard.press("4"); pg.wait_for_timeout(200)
    ok("header_in_other_lab", pg.inner_text("#stage-lab") == "Waves", pg.inner_text("#stage-lab"))
    pg.click("#libf-all"); pg.wait_for_timeout(200)
    pg.locator(".lib-item[data-kind=state] [data-fk=load]").click(); pg.wait_for_timeout(400)
    ok("load_from_other_lab_header", (pg.inner_text("#stage-lab"), pg.inner_text("#stage-scene")) == ("Gravity", "Figure-eight"), pg.inner_text("#stage-scene"))
    pg.context.close()

    # ---- keyboard activation leaves focus on a control, never on body
    pg = fresh("gravity")
    pg.click("#btn-state"); pg.wait_for_timeout(300)
    # These checks need a clip in the list, not a working encoder; capture.py covers real recording.
    pg.evaluate("""() => PhysicsPlayground.capture.vault.add({ kind: 'clip', lab: 'gravity', preset: 'solar', title: 'Seeded clip', duration: 1 },
      [{ name: 'seeded.webm', type: 'video/webm', blob: new Blob(['seed'], { type: 'video/webm' }) }]).then(() => null)""")
    pg.wait_for_timeout(300)
    pg.click("#nt-library"); pg.wait_for_timeout(200)
    clip, st = pg.locator(".lib-item[data-kind=clip]").first, pg.locator(".lib-item[data-kind=state]").first
    clip.locator("[data-fk=open]").focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    a = pg.evaluate(ACTIVE)
    ok("preview_keeps_focus", a["fk"] == "open" and a["text"] == "Hide", a)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    a = pg.evaluate(ACTIVE)
    ok("hide_keeps_focus", a["fk"] == "open" and a["text"] == "Preview", a)
    for key in ["Enter", "Space"]:
        st.locator("[data-fk=del]").focus(); pg.keyboard.press(key); pg.wait_for_timeout(200)
        a = pg.evaluate(ACTIVE)
        ok(f"delete_{key.lower()}_moves_to_keep", a["fk"] == "no" and a["text"] == "Keep", a)
        pg.keyboard.press(key); pg.wait_for_timeout(200)
        a = pg.evaluate(ACTIVE)
        ok(f"keep_{key.lower()}_returns_to_delete", a["fk"] == "del" and a["text"] == "Delete", a)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200); pg.keyboard.press("Shift+Tab")
    ok("tab_reaches_confirm_delete", pg.evaluate(ACTIVE)["fk"] == "yes", pg.evaluate(ACTIVE))
    pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    a = pg.evaluate(ACTIVE)
    ok("confirmed_delete_moves_to_tab", a["id"] == "nt-library", a)
    pg.click("#nt-experiments"); pg.wait_for_timeout(100)
    pg.locator("#experiments [data-exp=virial] button").focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    a = pg.evaluate(ACTIVE)
    ok("experiment_start_keeps_focus", a["fk"] == "virial" and a["text"] == "Stop", a)
    # The live card ticks four times a second; focus has to survive that as well.
    pg.wait_for_timeout(800)
    ok("experiment_focus_survives_ticks", pg.evaluate(ACTIVE)["fk"] == "virial", pg.evaluate(ACTIVE))
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    a = pg.evaluate(ACTIVE)
    ok("experiment_stop_keeps_focus", a["fk"] == "virial" and a["text"] != "Stop", a)
    pg.context.close()

    # ---- the last lab comes back on a reload with no hash, and a hash outranks it
    pg = fresh("gravity"); blur()
    pg.keyboard.press("5"); pg.wait_for_timeout(200)
    pg.evaluate("history.replaceState(null, '', location.pathname + location.search)")
    ok("hash_removed_before_reload", pg.evaluate("location.hash") == "")
    pg.reload(); pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active")
    ok("reload_reopens_last_lab", state("active.id") == "chaos", state("active.id"))
    ok("reload_restores_hash", pg.evaluate("location.hash") == "#chaos", pg.evaluate("location.hash"))
    pg.evaluate("localStorage.setItem('psp:lab', JSON.stringify('cloth')); location.replace('#waves')"); pg.wait_for_timeout(100)
    pg.reload(); pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active")
    ok("hash_outranks_last_lab", state("active.id") == "waves", state("active.id"))
    pg.context.close()

    # ---- Fluid: posts placed by hand outlast a rebuild that Particles asks for, and no particle starts inside one;
    # Reset starts the scene clean.
    pg = fresh("fluid")
    pg.evaluate(P + ".tool('obstacle')")
    for fx in (0.35, 0.6):
        x, y = stage_point(fx, 0.5); pg.mouse.click(x, y); pg.wait_for_timeout(150)
    placed, n0 = pg.evaluate(OBSTACLES), state("labs.fluid.n")
    ok("fluid_posts_placed", placed.count('"r"') == 2, placed)
    r = pg.locator("#ctl-fluid-count-wheel").bounding_box()
    pg.mouse.click(r["x"] + r["width"] * 0.3, r["y"] + r["height"] / 2); pg.wait_for_timeout(300)
    ok("fluid_particles_rebuilt", state("labs.fluid.n") != n0 and lab_t() < 0.5, (n0, state("labs.fluid.n")))
    ok("fluid_posts_survive_particles", pg.evaluate(OBSTACLES) == placed, pg.evaluate(OBSTACLES))
    inside = pg.evaluate("(() => { const L = PhysicsPlayground.labs.fluid; let k = 0; for (let i = 0; i < L.n; i++) for (const o of L.obs) if ((L.x[i] - o.x) ** 2 + (L.y[i] - o.y) ** 2 < o.r * o.r) k++; return k; })()")
    ok("fluid_no_particle_inside_a_post", inside == 0, inside)
    pg.evaluate(P + ".reset()"); pg.wait_for_timeout(150)
    ok("fluid_reset_starts_clean", pg.evaluate(OBSTACLES) == "[]", pg.evaluate(OBSTACLES))
    pg.context.close()

    # ---- Control sections: in the lab's order after the quick actions, one restart note, a Reset that appears
    # when a value leaves the scene's and sets the section back, and a fold that is remembered.
    pg = fresh("chaos")
    groups = pg.evaluate("[...document.querySelectorAll('#params-body .pgroup')].map(s => s.dataset.group)")
    ok("sections_in_lab_order", groups == ["start", "physics", "display"], groups)
    ok("quick_actions_first", pg.evaluate("document.querySelector('#params-body .params').firstElementChild.classList.contains('quick')"))
    ok("restart_note_once", pg.locator("#params-body .pgroup-note").count() == 1 and "restart" in pg.inner_text("[data-group='start'] .pgroup-note"))
    ok("no_restart_note_per_slider", pg.inner_text("#ctl-chaos-copies-note") == "", pg.inner_text("#ctl-chaos-copies-note"))
    reset = pg.locator("[data-group='physics'] .pgroup-reset")
    ok("section_reset_hidden_at_scene_values", reset.is_hidden())
    pg.focus("#ctl-chaos-g")
    for _ in range(3): pg.keyboard.press("ArrowRight")
    ok("section_reset_appears", reset.is_visible() and state("labs.chaos.p.g") != 9.81, state("labs.chaos.p.g"))
    reset.click(); pg.wait_for_timeout(100)
    ok("section_reset_restores", state("labs.chaos.p.g") == 9.81 and reset.is_hidden(), state("labs.chaos.p.g"))
    ok("section_reset_keeps_focus", pg.evaluate("document.activeElement.id") == "pg-chaos-physics", pg.evaluate("document.activeElement.id"))
    pg.click("#pg-chaos-display")
    ok("section_folds", pg.is_hidden("#pg-chaos-display-body") and pg.get_attribute("#pg-chaos-display", "aria-expanded") == "false")
    pg.reload(); pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active"); pg.wait_for_timeout(300)
    ok("section_fold_remembered", pg.is_hidden("#pg-chaos-display-body") and pg.is_visible("#pg-chaos-physics-body"))
    pg.context.close()

    # ---- Chaos phase view: the pendulum beside its map, the reach curve, a hover that previews a start, a click
    # that starts every copy there, and a bob that still drags.
    pg = fresh("chaos")

    def to_screen(wx, wy):
        """Screen coordinates of a world point, from two samples of the camera's own toWorld."""
        r = pg.locator("#stage-canvas").bounding_box()
        a, c = state("view.toWorld(0, 0)"), state("view.toWorld(100, 100)")
        return r["x"] + (wx - a["x"]) * 100 / (c["x"] - a["x"]), r["y"] + (wy - a["y"]) * 100 / (c["y"] - a["y"])

    pg.evaluate(P + ".viewMode('both')"); pg.wait_for_timeout(300)
    q, piv = state("labs.chaos.sq"), state("labs.chaos.pivot")
    ok("phase_pendulum_beside_map", piv["x"] < q["x0"], (round(piv["x"]), round(q["x0"])))
    ok("phase_reach_curve_drawn", pg.evaluate(P + ".labs.chaos.edgeE.seg.length") > 40)
    pg.mouse.move(*to_screen(q["x0"] + q["S"] * 0.3, q["y0"] + q["S"] * 0.7)); pg.wait_for_timeout(300)
    ok("phase_hover_previews", pg.evaluate(P + ".labs.chaos.inSquare(PhysicsPlayground.labs.chaos.hover)") and pg.evaluate("!!" + P + ".labs.chaos.edgeH"))
    pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(200)
    t1, t2 = state("labs.chaos.p.theta1"), state("labs.chaos.p.theta2")
    ok("phase_click_starts_there", t1 == -72 and abs(t2 + 72) < 0.6, (t1, t2))
    ok("phase_click_restarts_the_run", lab_t() < 0.3, lab_t())
    pg.evaluate(P + ".pause()")
    b2 = state("labs.chaos.bobs(0)")
    pg.mouse.move(*to_screen(b2["x2"], b2["y2"])); pg.mouse.down()
    pg.mouse.move(*to_screen(b2["x1"] + 60, b2["y1"] + 5), steps=6); pg.mouse.up(); pg.wait_for_timeout(150)
    ok("phase_bob_drags", state("labs.chaos.p.theta2") != t2 and state("labs.chaos.p.theta1") == t1, (state("labs.chaos.p.theta1"), state("labs.chaos.p.theta2")))
    pg.context.close()

    # ---- the frame-rate meter reports slow frames. A 100 ms burn sits past the 50 ms cap on the
    # simulation step, so a meter fed the capped time would read 20 fps however slow the page was.
    # The meter averages over frames, not seconds, so the wait is counted in frames too: 90 settle it
    # whatever else the machine is doing, and the true rate is timed over the last 40 of them.
    pg = fresh("collisions")
    pg.evaluate("""() => { window.burning = true; window.burnTimes = [];
      const burn = () => { const t = performance.now(); burnTimes.push(t); while (performance.now() - t < 100); if (window.burning) requestAnimationFrame(burn); };
      requestAnimationFrame(burn); }""")
    pg.wait_for_function("burnTimes.length >= 90", polling=250, timeout=60000)
    fps, true_fps = pg.evaluate("""() => { const t = burnTimes, n = t.length - 1; return [PhysicsPlayground.perf.fps, 40000 / (t[n] - t[n - 40])] }""")
    ok("fps_true_rate_is_slow", true_fps < 12, round(true_fps, 1))
    ok("fps_tracks_slow_frames", abs(fps - true_fps) / true_fps < 0.3, (round(fps, 1), round(true_fps, 1)))
    ok("fps_below_step_cap", fps < 18, round(fps, 1))
    slow = fps
    # Recovery is counted in frames as well, and the meter is held to the true rate it recovers to, rather than to a
    # fixed multiple of the slow rate that a page drawn without a GPU, at 11 to 13 fps, can only just reach.
    pg.evaluate("""() => { window.burning = false; window.recTimes = [];
      const rec = () => { recTimes.push(performance.now()); if (recTimes.length < 100) requestAnimationFrame(rec); }; requestAnimationFrame(rec); }""")
    pg.wait_for_function("recTimes.length >= 100", polling=250, timeout=60000)
    fps, true_after = pg.evaluate("""() => { const t = recTimes, n = t.length - 1; return [PhysicsPlayground.perf.fps, 40000 / (t[n] - t[n - 40])] }""")
    ok("fps_recovers", fps > slow * 1.2 and abs(fps - true_after) / true_after < 0.3, (round(slow, 1), round(fps, 1), round(true_after, 1)))
    pg.wait_for_timeout(200)
    ok("hud_fps_shows_meter", abs(float(pg.inner_text("#hud-fps").split()[0]) - state("perf.fps")) < 8, pg.inner_text("#hud-fps"))
    pg.context.close()

    # ---- Settings: one modal dialog. Each entry point opens it at its own section with focus on that section's current
    # choice; Tab never leaves it; Escape, the close button and the backdrop close it and hand focus back to what opened
    # it; the workspace's keys wait behind it, and a phone gets the whole screen.
    SET = """(() => { const d = document.getElementById('settings'), a = document.activeElement, sec = PhysicsPlayground.settings.section();
      const want = { graphics: '#gfx-list [aria-checked="true"]', units: '#units-list [aria-checked="true"]', hud: '#hud-on', keys: '#st-keys' }[sec];
      return { open: d.open, modal: d.matches(':modal'), section: sec, panes: [...d.querySelectorAll('[role=tabpanel]')].filter(p => !p.hidden).map(p => p.id),
        tab: d.querySelector('[role=tab][aria-selected=true]').id, focus: a.id, inside: d.contains(a), onChoice: a === document.querySelector(want),
        expanded: [...document.querySelectorAll('[aria-controls=settings]')].filter(b => b.getAttribute('aria-expanded') === 'true').map(b => b.id) }; })()"""
    st = lambda: pg.evaluate(SET)
    pg = fresh("fluid")
    # Two openers in the top bar, not five: the Settings button and Graphics, which shows the tier. The Units, HUD and
    # keyboard buttons are gone, markup and all.
    openers = pg.evaluate("[...document.querySelectorAll('[aria-controls=settings]')].map(b => b.id).sort()")
    gone = pg.evaluate("['btn-units', 'btn-hud', 'btn-keys', 'btn-units-label', 'btn-hud-label'].filter(i => document.getElementById(i))")
    ok("settings_two_openers", openers == ["btn-gfx", "btn-settings"] and not gone, (openers, gone))
    # Graphics opens at its section on its current choice. Every other section is one press of its tab away from the
    # Settings button, and one Tab more lands on its current choice, where the removed buttons put focus.
    at = {}
    pg.click("#btn-gfx"); pg.wait_for_timeout(200); s = st()
    good = (s["open"] and s["modal"] and s["section"] == "graphics" and s["panes"] == ["sp-graphics"] and s["tab"] == "st-graphics" and s["inside"] and s["onChoice"]
            and s["expanded"] == ["btn-settings", "btn-gfx"])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200); back = st()
    at["graphics"] = True if good and not back["open"] and back["focus"] == "btn-gfx" and not back["expanded"] else (s, back)
    for sec in ["units", "hud", "keys"]:
        pg.click("#btn-settings"); pg.wait_for_timeout(200); pg.click("#st-" + sec); pg.wait_for_timeout(150); s = st()
        good = (s["open"] and s["modal"] and s["section"] == sec and s["panes"] == ["sp-" + sec] and s["tab"] == "st-" + sec and s["focus"] == "st-" + sec
                and s["expanded"] == ["btn-settings"])
        if sec != "keys":
            pg.keyboard.press("Tab"); s2 = st(); good = good and s2["onChoice"] and s2["section"] == sec
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200); back = st()
        at[sec] = True if good and not back["open"] and back["focus"] == "btn-settings" and not back["expanded"] else (s, back)
    ok("settings_openers_open_their_section", all(v is True for v in at.values()), at)
    pg.click("#btn-settings"); pg.wait_for_timeout(200); s = st()
    ok("settings_button_opens_where_it_was_left", s["open"] and s["modal"] and s["section"] == "keys" and s["focus"] == "st-keys" and s["expanded"] == ["btn-settings"], s)
    keys = pg.evaluate("[...document.querySelectorAll('#sp-keys .keys-list dt')].map(d => d.textContent.replace(/\\s+/g, ' ').trim())")
    ok("settings_lists_the_keys", len(keys) >= 19 and "Shift+S" in keys and "Shift+H" in keys and "? Esc" in keys and ". ," in keys, keys)
    # A letter means one thing: no lab's tool takes a plain key the list gives the workspace (Fields' Move was V, which
    # is Next view), and no lab gives two tools one key.
    plain = pg.evaluate("""[...document.querySelectorAll('#sp-keys .keys-list dt kbd')].filter(k => !/^Shift$/.test(k.textContent) && !(k.previousSibling && /\\+$/.test(k.previousSibling.textContent || ''))).map(k => k.textContent.toLowerCase())""")
    tool_keys = pg.evaluate("Object.values(PhysicsPlayground.labs).filter(L => L.dock).map(L => [L.id, L.dock.options.map(o => o.key)])")
    clash = [(lab, k) for lab, ks in tool_keys for k in ks if k in plain] + [(lab, "twice") for lab, ks in tool_keys if len(set(ks)) != len(ks)]
    ok("tool_keys_are_their_own", "v" in plain and "r" in plain and len(tool_keys) == 6 and not clash and dict(tool_keys)["fields"][2] == "g", (clash, plain))
    # Look-alikes: restarting the run has its own glyph, kept apart from the resets that set a value back; Graphics has
    # its own, apart from the Controls tab's; and the stage's status chips are not a second "HUD".
    glyphs = pg.evaluate("""(() => { const g = s => document.querySelector(s + ' .ms').textContent; const all = [...document.querySelectorAll('.ms')].map(e => e.textContent);
      return { reset: g('#btn-reset'), speed: g('#speed-reset'), gfx: g('#btn-gfx'), gfxTab: g('#st-graphics'), controls: g('#nt-controls'), replays: all.filter(t => t === 'replay').length,
        status: document.querySelector('.hud').getAttribute('aria-label'), hudTab: document.getElementById('st-hud').textContent.trim(), name: document.querySelector('#btn-reset .sr-only').textContent,
        saysHud: /\\bHUD\\b/.test(document.body.innerText) }; })()""")
    ok("look_alikes_apart", glyphs["reset"] == "replay" and glyphs["replays"] == 1 and glyphs["speed"] == "restart_alt" and glyphs["gfx"] == glyphs["gfxTab"] != glyphs["controls"] == "tune"
       and glyphs["status"] == "Run status" and glyphs["hudTab"] == "Head-up display" and glyphs["name"] == "Restart the run" and not glyphs["saysHud"], glyphs)
    pg.keyboard.press("ArrowUp"); s1 = st(); pg.keyboard.press("Home"); s2 = st(); pg.keyboard.press("End"); s3 = st()
    ok("settings_nav_arrows", s1["section"] == "hud" and s1["focus"] == "st-hud" and s1["panes"] == ["sp-hud"] and s2["section"] == "graphics" and s2["focus"] == "st-graphics"
       and s3["section"] == "keys" and s3["panes"] == ["sp-keys"], (s1, s2, s3))
    # Tab and Shift+Tab go round the Graphics section's controls and come back to where they began, never outside.
    pg.click("#st-graphics"); pg.wait_for_timeout(150)
    fwd, back = [], []
    for _ in range(40):
        pg.keyboard.press("Tab"); s = st(); fwd.append((s["inside"], s["focus"] or "?"))
    for _ in range(40):
        pg.keyboard.press("Shift+Tab"); s = st(); back.append((s["inside"], s["focus"] or "?"))
    stops = len({f for _, f in fwd})
    ok("settings_traps_focus", all(i for i, _ in fwd + back) and 12 <= stops < 40 and fwd[stops][1] == fwd[0][1] and back[stops][1] == back[0][1], (stops, fwd[:3], back[:3]))
    # The workspace's keys wait: no restart, no lab, mode or focus change, and Space presses the focused button.
    t0, run0, mode0 = state("active.t"), running(), state("mode.get()")
    pg.focus("#st-graphics")
    for k in ["r", "2", "z", "f", "Space", "m"]:
        pg.keyboard.press(k)
    pg.wait_for_timeout(200)
    ok("settings_holds_the_workspace_keys", st()["open"] and state("active.id") == "fluid" and state("active.t") >= t0 and running() == run0 and state("mode.get()") == mode0
       and not in_focus() and not state("capture.vrec.mr"), (state("active.t"), t0, running(), state("mode.get()")))
    # Its own keys: U and ? move to their section, and a second press there closes the dialog, as the sheets they
    # opened used to; from the workspace they open it again. Shift+S closes, and each close hands focus back to the
    # Settings button, which opened it.
    pg.keyboard.press("u"); s1 = st(); pg.keyboard.press("?"); s2 = st(); pg.keyboard.press("?"); pg.wait_for_timeout(150); s3 = st()
    pg.keyboard.press("u"); pg.wait_for_timeout(150); s4 = st(); pg.keyboard.press("u"); pg.wait_for_timeout(150); s5 = st()
    pg.keyboard.press("?"); pg.wait_for_timeout(150); s6 = st(); pg.keyboard.press("Shift+S"); pg.wait_for_timeout(150); s7 = st()
    ok("settings_own_keys", s1["open"] and s1["section"] == "units" and s1["onChoice"] and s2["open"] and s2["section"] == "keys" and s2["focus"] == "st-keys"
       and not s3["open"] and s3["focus"] == "btn-settings" and s4["open"] and s4["section"] == "units" and s4["onChoice"] and not s5["open"] and s5["focus"] == "btn-settings"
       and s6["open"] and s6["section"] == "keys" and s6["focus"] == "st-keys" and not s7["open"] and s7["focus"] == "btn-settings", (s1, s2, s3, s4, s5, s6, s7))
    # Shift+S opens it from anywhere and leaves Fluid's S tool (Stir) on the plain key; U and ? open their own sections.
    pg.evaluate(P + ".tool('push')"); blur()
    pg.keyboard.press("Shift+S"); pg.wait_for_timeout(150); s = st()
    shift_s = s["open"] and s["section"] == "keys" and s["focus"] == "st-keys" and tool() == "push"
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    pg.keyboard.press("s")
    ok("shift_s_opens_settings", shift_s and tool() == "stir" and not st()["open"], (s, tool()))
    pg.keyboard.press("u"); pg.wait_for_timeout(150); s1 = st(); pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    pg.keyboard.press("?"); pg.wait_for_timeout(150); s2 = st(); pg.keyboard.press("Escape"); pg.wait_for_timeout(150); s3 = st()
    ok("u_and_question_open_their_sections", s1["open"] and s1["section"] == "units" and s1["onChoice"] and s2["open"] and s2["section"] == "keys" and not s3["open"] and s3["focus"] == "", (s1, s2, s3))
    # The close button and a click on the backdrop close it too; on a desktop it is a centred panel, not the whole page.
    pg.click("#btn-settings"); settle(pg, "document.getElementById('settings').getAnimations().length === 0", 3000)
    geo = pg.evaluate("(() => { const r = document.getElementById('settings').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; })()")
    pg.click("#settings-close"); pg.wait_for_timeout(150); s1 = st()
    pg.click("#btn-gfx"); pg.wait_for_timeout(150)
    # A press that begins inside the panel and is let go over the backdrop is a drag off, not a click outside.
    pg.mouse.move(geo["l"] + geo["w"] / 2, geo["t"] + 20); pg.mouse.down(); pg.mouse.move(geo["l"] / 2, geo["vh"] / 2, steps=4); pg.mouse.up(); pg.wait_for_timeout(150); s0 = st()
    pg.mouse.click(geo["l"] / 2, geo["vh"] / 2); pg.wait_for_timeout(150); s2 = st()
    ok("settings_close_and_backdrop", not s1["open"] and s1["focus"] == "btn-settings" and not s2["open"] and s2["focus"] == "btn-gfx", (s1, s2))
    ok("settings_drag_off_stays_open", s0["open"] and s0["section"] == "graphics", s0)
    ok("settings_centred_on_desktop", geo["w"] < geo["vw"] - 40 and geo["h"] < geo["vh"] - 40 and abs(geo["l"] - (geo["vw"] - geo["w"]) / 2) < 2 and abs(geo["t"] - (geo["vh"] - geo["h"]) / 2) < 2, geo)
    pg.context.close()

    # A phone: the Settings button in the top bar, and the dialog fills the screen with the sections across its top,
    # all four in view, and nothing wider than the screen in any section.
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = open_page(ctx); pg.goto(URL + "#gravity")
    pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active"); pg.wait_for_timeout(400)
    btn = pg.locator("#btn-settings").bounding_box()
    pg.click("#btn-settings"); pg.wait_for_timeout(250)
    phone = {}
    for sec in ["graphics", "units", "hud", "keys"]:
        pg.click("#st-" + sec); pg.wait_for_timeout(120)
        phone[sec] = pg.evaluate("""(() => { const d = document.getElementById('settings').getBoundingClientRect(), b = document.getElementById('settings-body'), t = [...document.querySelectorAll('#settings-tabs [role=tab]')].map(e => e.getBoundingClientRect());
          return { d: [d.left, d.top, d.width, d.height].map(Math.round), over: b.scrollWidth - b.clientWidth, tabs: t.every(r => r.left >= 0 && r.right <= innerWidth && Math.abs(r.top - t[0].top) < 1),
            orient: document.getElementById('settings-tabs').getAttribute('aria-orientation'), page: document.documentElement.scrollWidth - innerWidth }; })()""")
    ok("settings_phone_fills_the_screen", btn is not None and btn["x"] + btn["width"] <= 390 and all(v["d"] == [0, 0, 390, 844] and v["over"] <= 0 and v["tabs"] and v["orient"] == "horizontal" and v["page"] <= 0 for v in phone.values()), phone)
    ctx.close()

    # ---- Selection: the workspace is an instrument, not a document. A click, drag or double-click never paints a
    # highlight over its words, on any page, pane, sheet or menu, in 2D or 3D; text fields still select, as typing
    # needs; and .selectable is the one way to let a block be copied.
    pg = fresh("gravity")
    selected = "(() => { const s = getSelection(); s.removeAllRanges(); s.selectAllChildren(document.body); const t = s.toString().replace(/\\s+/g, ' ').trim(); s.removeAllRanges(); return t; })()"
    leaks = {}
    def sweep(where):
        t = pg.evaluate(selected)
        if t: leaks[where] = t[:120]
    pg.evaluate("PhysicsPlayground.pause()")
    sweep("controls")
    for tab in ["experiments", "guide", "math", "library"]:
        pg.click("#nt-" + tab); pg.wait_for_timeout(400); sweep(tab)
    pg.evaluate("PhysicsPlayground.capture.saveState()"); pg.wait_for_timeout(600); sweep("library_with_an_item")
    pg.click("#nt-controls"); pg.wait_for_timeout(200)
    pg.evaluate("(() => { const L = PhysicsPlayground.active; L.track = L.bodies[1].id; })()"); pg.wait_for_timeout(600)
    for pane in ["inspect", "insights", "telemetry"]:
        pg.click("#dt-" + pane); pg.wait_for_timeout(300); sweep("deck_" + pane)
    for sec, where in [("keys", "settings_keyboard"), ("units", "settings_units"), ("hud", "settings_hud")]:
        pg.click("#btn-settings"); pg.wait_for_timeout(200); pg.click("#st-" + sec); pg.wait_for_timeout(300); sweep(where); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    for btn, where in [("#btn-gfx", "settings_graphics"), ("#btn-settings", "settings"), ("#scene-btn", "scene_menu")]:
        pg.click(btn); pg.wait_for_timeout(300); sweep(where); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    pg.click("#mode-3d"); settle(pg, "PhysicsPlayground.mode.is3D()", 30000); pg.wait_for_timeout(800); sweep("3d")
    ok("nothing_in_the_workspace_selects", not leaks, leaks)
    # Real gestures: a drag across the Guide's prose, a double-click on a dial's name, a triple-click on a gauge.
    pg.click("#nt-guide"); pg.wait_for_timeout(300)
    g = pg.locator("#guide p").first.bounding_box()
    pg.mouse.move(g["x"] + 2, g["y"] + 6); pg.mouse.down(); pg.mouse.move(g["x"] + g["width"] - 2, g["y"] + g["height"] - 4, steps=6); pg.mouse.up()
    drag = pg.evaluate("getSelection().toString()")
    pg.click("#nt-controls"); pg.wait_for_timeout(300)
    pg.dblclick("#params-body .dial-name >> nth=0")
    dbl = pg.evaluate("getSelection().toString()")
    pg.click(".gauge >> nth=0", click_count=3)
    tri = pg.evaluate("getSelection().toString()")
    # Short labels too: the stage header's lab name, and a drag from it across its scene name ("Collisions · Ideal gas").
    pg.click("#tab-collisions"); pg.wait_for_timeout(500); pg.evaluate("PhysicsPlayground.preset('gas')"); pg.wait_for_timeout(300)
    pg.dblclick("#stage-lab")
    head = pg.evaluate("getSelection().toString()")
    h1, h2 = pg.locator("#stage-lab").bounding_box(), pg.locator("#stage-scene").bounding_box()
    pg.mouse.move(h1["x"] + 2, h1["y"] + h1["height"] / 2); pg.mouse.down(); pg.mouse.move(h2["x"] + h2["width"] - 2, h2["y"] + h2["height"] / 2, steps=6); pg.mouse.up()
    head += pg.evaluate("getSelection().toString()")
    pg.click("#tab-gravity"); pg.wait_for_timeout(500)
    ok("gestures_select_nothing", drag == "" and dbl == "" and tri == "" and head == "", (drag[:40], dbl[:40], tri[:40], head[:40]))
    # A dial's value, opened for typing, selects and edits as any text field does.
    pg.click("#params-body .dial-val >> nth=0"); pg.wait_for_timeout(150)
    pg.dblclick("#params-body .ctl-edit")
    sel = pg.evaluate("(() => { const e = document.querySelector('#params-body .ctl-edit'); return e ? [e.selectionStart, e.selectionEnd] : null; })()")
    pg.keyboard.press("Escape")
    # And the Library's rename field: it opens on the item's title, selects a word, and takes a new name.
    pg.click("#nt-library"); pg.wait_for_timeout(300)
    pg.click("#lib-list .lib-title >> nth=0"); pg.wait_for_timeout(200)
    pg.dblclick("#lib-list .lib-rename")
    ren = pg.evaluate("(() => { const e = document.querySelector('#lib-list .lib-rename'); return e ? [e.selectionStart, e.selectionEnd] : null; })()")
    pg.keyboard.press("Control+A"); pg.keyboard.type("Renamed orbit"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    named = pg.inner_text("#lib-list .lib-title >> nth=0")
    ok("text_fields_still_select", sel is not None and sel[1] > sel[0] and ren is not None and ren[1] > ren[0] and named == "Renamed orbit", (sel, ren, named))
    opt = pg.evaluate("(() => { const d = document.createElement('div'); d.className = 'selectable'; d.textContent = 'Copy this line'; document.body.append(d); const s = getSelection(); s.selectAllChildren(document.body); const t = s.toString().trim(); s.removeAllRanges(); d.remove(); return t; })()")
    ok("selectable_opts_in", opt == "Copy this line", opt)
    pg.context.close()

    b.close()
finish()
