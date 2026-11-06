"""
✒ Metadata
    - Title: Shell Regression Test (digiSpace Edition - v2.1)
    - File Name: shell.py
    - Relative Path: tests/shell.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
from harness import URL, finish, launch, ok, open_page

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
WALLS = P + ".labs.waves.wall.reduce((a, b) => a + b, 0)"
LINKS = P + ".labs.cloth.alive.subarray(0, " + P + ".labs.cloth.L).reduce((a, b) => a + b, 0)"
OBSTACLES = "JSON.stringify(" + P + ".labs.fluid.obs)"
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
    pg.wait_for_timeout(700); pg.keyboard.press("d"); pg.wait_for_timeout(400)
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
    for name, sel in [("reset", "#btn-reset"), ("scene_chip", "#preset-gravity-figure8")]:
        pg.click(sel); pg.wait_for_timeout(700)
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
    pg.focus("#dock-gravity-throw"); pg.keyboard.press("Shift+Tab"); pg.wait_for_timeout(700)
    a = pg.evaluate(ACTIVE)
    ok("tab_reaches_scene_chip_with_ring", a["id"] == "preset-gravity-figure8" and a["ring"], a)
    t0, run0 = lab_t(), running()
    pg.keyboard.press("Space"); pg.wait_for_timeout(50)
    ok("space_on_focused_chip_reloads_scene", lab_t() < t0, (round(t0, 3), round(lab_t(), 3)))
    ok("space_on_focused_chip_leaves_play", running() == run0, running())
    pg.context.close()

    # ---- resizing the stage keeps what was drawn on it
    pg = fresh("waves"); pg.click("#preset-waves-ripple"); blur(); pg.wait_for_timeout(1300)
    pg.keyboard.press("w")
    pg.mouse.move(*stage_point(0.3, 0.5)); pg.mouse.down(); pg.mouse.move(*stage_point(0.7, 0.5), steps=12); pg.mouse.up()
    pg.keyboard.press("Space")
    ok("waves_wall_painted", pg.evaluate(WALLS) > 0, pg.evaluate(WALLS))
    resize_cycle("waves", lambda: pg.evaluate(WALLS))
    pg.context.close()

    pg = fresh("fluid"); blur(); pg.wait_for_timeout(1000)
    pg.keyboard.press("b"); pg.mouse.click(*stage_point(0.5, 0.3)); pg.keyboard.press("Space")
    ok("fluid_obstacle_placed", pg.evaluate(P + ".labs.fluid.obs.length") == 1)
    resize_cycle("fluid", lambda: pg.evaluate(OBSTACLES))
    pg.context.close()

    pg = fresh("cloth"); blur(); pg.wait_for_timeout(1000)
    pg.keyboard.press("Space"); pg.keyboard.press("c")
    links0 = pg.evaluate(LINKS)
    pg.mouse.move(*stage_point(0.25, 0.4)); pg.mouse.down(); pg.mouse.move(*stage_point(0.75, 0.42), steps=20); pg.mouse.up()
    ok("cloth_tear_made", pg.evaluate(LINKS) < links0, (links0, pg.evaluate(LINKS)))
    resize_cycle("cloth", lambda: pg.evaluate(LINKS))
    pg.context.close()

    # ---- a dataset recorded across a rewind is one continuous timeline
    pg = fresh("gravity"); pg.click("#preset-gravity-figure8"); blur()
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
    ok("rewind_dataset_runs_past_rewind_point", ts[0] < back_to < ts[-1], (round(ts[0], 3), round(back_to, 3), round(ts[-1], 3)))
    ok("rewind_dataset_has_no_gap", max(gaps) < 0.25, max(gaps))
    ok("rewind_tracks_stay_in_order", all(y >= x for x, y in zip(track_ts, track_ts[1:])))
    # A scene change ends the recording, but the dataset still belongs to the scene it recorded.
    pg.click("#preset-gravity-figure8"); blur()
    pg.keyboard.press("d"); pg.wait_for_timeout(2000)
    pg.click("#preset-gravity-binary"); pg.wait_for_timeout(500)
    run = pg.evaluate(NEWEST_RUN)
    ok("scene_change_stops_recording", state("capture.dataRec.on") is False)
    ok("scene_change_header_moves_on", pg.inner_text("#stage-scene") == "Binary star", pg.inner_text("#stage-scene"))
    ok("dataset_title_names_its_scene", run["title"] == "Gravity · Figure-eight data", run["title"])
    ok("dataset_preset_names_its_scene", run["preset"] == "figure8", run["preset"])
    ok("dataset_files_name_their_scene", all(re.match(r"physics-gravity-figure8-", n) for n in run["names"]) and len(run["names"]) == 2, run["names"])
    pg.context.close()

    # ---- Fields, Dipole: the B slider enables the B gradient control at once
    pg = fresh("fields"); pg.click("#preset-fields-dipole")
    ok("gradb_locked_at_zero_b", pg.is_disabled("#ctl-fields-gradB") and state("labs.fields.p.B") == 0)
    ok("gradb_says_why", "magnetic field" in pg.inner_text("#ctl-fields-gradB-note"), pg.inner_text("#ctl-fields-gradB-note"))
    pg.focus("#ctl-fields-B"); pg.keyboard.press("ArrowRight")
    ok("gradb_unlocks_from_keyboard", pg.is_enabled("#ctl-fields-gradB"), state("labs.fields.p.B"))
    pg.keyboard.press("ArrowLeft")
    ok("gradb_locks_again_at_zero_b", pg.is_disabled("#ctl-fields-gradB"), state("labs.fields.p.B"))
    r = pg.locator("#ctl-fields-B").bounding_box()
    pg.locator("#ctl-fields-B").click(position={"x": r["width"] * 0.8, "y": r["height"] / 2})
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
    pg = fresh("gravity"); pg.click("#preset-gravity-figure8"); pg.wait_for_timeout(200)
    pg.click("#btn-state"); pg.wait_for_timeout(400)
    pg.click("#preset-gravity-binary"); pg.wait_for_timeout(100)
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
    pg.evaluate("window.burning = false"); pg.wait_for_timeout(3000)
    fps = state("perf.fps")
    ok("fps_recovers", fps > slow * 1.5, (round(slow, 1), round(fps, 1)))
    pg.wait_for_timeout(200)
    ok("hud_fps_shows_meter", abs(float(pg.inner_text("#hud-fps").split()[0]) - state("perf.fps")) < 8, pg.inner_text("#hud-fps"))
    pg.context.close()

    b.close()
finish()
