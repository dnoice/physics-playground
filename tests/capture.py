"""
✒ Metadata
    - Title: Capture Test (digiSpace Edition - v2.1)
    - File Name: capture.py
    - Relative Path: tests/capture.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Every
      reading from the recorders, the library and rewind is now checked, the
      page starts in flat 2D mode and the marks come from the shared harness.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0; checks the Library tab marker and full
      renames.

✒ Description:
    Records a dataset and a video, saves and deletes states, previews,
    downloads and renames library items, reloads, and rewinds, checking each
    result against what it should be.

✒ Key Features:
    - Rewind and saved states replay the exact trajectory.
    - Dataset columns, track rows and a conserved energy summary.
    - Library tab count and new-item marker.
    - Persistence across reload and rewind labels.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import re
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, shot
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = open_page(ctx)
    pg.goto(URL + "#gravity"); pg.wait_for_timeout(1500)
    ok("vault_is_local", pg.evaluate("PhysicsPlayground.capture.vault.mode") == "local", pg.evaluate("PhysicsPlayground.capture.vault.mode"))
    # --- determinism through rewind (gravity figure-eight)
    pg.evaluate("() => { const P = PhysicsPlayground; P.preset('figure8'); P.play(); }")
    pg.wait_for_timeout(3000)
    r = pg.evaluate("""() => { const P = PhysicsPlayground, g = P.labs.gravity; P.pause();
      const live = { t: g.t, pos: g.bodies.map(b => [b.x, b.y, b.vx, b.vy]) };
      const n = P.history.size(); const k = n - 6; P.history.seek(k);
      const tk = g.t, steps = Math.round((live.t - tk) / g.dt());
      for (let i = 0; i < steps; i++) { g.step(g.dt()); g.t += g.dt(); }
      const again = g.bodies.map(b => [b.x, b.y, b.vx, b.vy]);
      let maxd = 0; for (let i = 0; i < again.length; i++) for (let j = 0; j < 4; j++) maxd = Math.max(maxd, Math.abs(again[i][j] - live.pos[i][j]));
      return { snaps: n, rewound_s: +(live.t - tk).toFixed(3), steps, maxdiff: maxd, tmatch: Math.abs(g.t - live.t) < 1e-9 }; }""")
    ok("rewind_history_kept", r["snaps"] >= 6, r["snaps"])
    ok("rewind_went_back", r["rewound_s"] > 0 and r["steps"] > 0, (r["rewound_s"], r["steps"]))
    ok("rewind_replays_exactly", r["maxdiff"] < 1e-9, r["maxdiff"])
    ok("rewind_time_matches", r["tmatch"])
    # --- saved state round trip
    r = pg.evaluate("""async () => { const P = PhysicsPlayground, g = P.labs.gravity, C = P.capture;
      P.preset('empty'); for (const [x,y,vx,vy,m] of [[-120,0,0,-60,300],[120,0,0,60,300],[0,40,90,0,40]]) g.addBody(g.body(x,y,vx,vy,m));
      for (let i=0;i<480;i++){ g.step(g.dt()); g.t+=g.dt(); }
      await C.saveState(); const item = C.vault.list().find(i => i.kind === 'state');
      for (let i=0;i<1440;i++){ g.step(g.dt()); g.t+=g.dt(); }
      const ref = g.bodies.map(b => [b.x, b.y]);
      await C.loadState(item);
      for (let i=0;i<1440;i++){ g.step(g.dt()); g.t+=g.dt(); }
      const got = g.bodies.map(b => [b.x, b.y]);
      let maxd = 0; got.forEach((p, i) => { maxd = Math.max(maxd, Math.abs(p[0]-ref[i][0]), Math.abs(p[1]-ref[i][1])); });
      return { title: item.title, bodies: got.length, maxdiff: maxd, items: C.vault.list().length }; }""")
    ok("state_title", r["title"].startswith("Gravity · Empty sky at t = "), r["title"])
    ok("state_body_count", r["bodies"] == 3, r["bodies"])
    ok("state_replays_exactly", r["maxdiff"] < 1e-6, r["maxdiff"])
    ok("state_filed_once", r["items"] == 1, r["items"])
    # --- data recording with tracks
    pg.evaluate("() => { const P = PhysicsPlayground; P.preset('figure8'); P.capture.toggleData(); P.play(); }")
    pg.wait_for_timeout(3200)
    pg.evaluate("() => PhysicsPlayground.capture.toggleData()")
    pg.wait_for_timeout(600)
    r = pg.evaluate("""async () => { const C = PhysicsPlayground.capture, run = C.vault.list().find(i => i.kind === 'run');
      const csv = await (await C.vault.blob(run, 0)).text(), tr = run.files[1] ? await (await C.vault.blob(run, 1)).text() : '';
      return { title: run.title, rows: run.rows, csvRows: csv.split('\\n').length - 2, files: run.files.map(f => f.name), header: csv.split('\\n')[0], line2: csv.split('\\n')[1], trackHeader: tr.split('\\n')[0], trackLines: tr.split('\\n').length - 2, summary0: run.summary[4] }; }""")
    columns = r["header"].split(",")
    ok("dataset_title", r["title"] == "Gravity · Figure-eight data", r["title"])
    ok("dataset_rows", r["rows"] >= 10 and r["rows"] == r["csvRows"], (r["rows"], r["csvRows"]))
    ok("dataset_files", len(r["files"]) == 2 and re.fullmatch(r"physics-gravity-figure8-[\d-]+\.csv", r["files"][0]) and r["files"][1].endswith("-tracks.csv"), r["files"])
    ok("dataset_header", columns[0] == "t_s" and "total_energy" in columns and "energy_drift_pct" in columns, len(columns))
    ok("dataset_first_row", len(r["line2"].split(",")) == len(columns) and r["line2"].startswith("0,3,"), r["line2"][:30])
    ok("dataset_track_header", r["trackHeader"].startswith("t_s,body_id,mass,x,y,vx,vy"), r["trackHeader"])
    ok("dataset_track_rows", r["trackLines"] == r["rows"] * 3, (r["trackLines"], r["rows"]))
    e = r["summary0"]
    ok("dataset_summary_column", e["column"] == "total_energy" and e["min"] <= e["mean"] <= e["max"], e["column"])
    ok("dataset_energy_conserved", abs((e["max"] - e["min"]) / e["mean"]) < 1e-4, abs((e["max"] - e["min"]) / e["mean"]))
    # --- video recording
    pg.evaluate("() => { PhysicsPlayground.capture.toggleVideo(); }")
    pg.wait_for_timeout(2600)
    # A cold software encoder can take seconds to start, and stopping sooner saves nothing.
    settle(pg, "PhysicsPlayground.capture.vrec.bytes > 0", 30000)
    ok("rec_chip_counts", re.match(r"REC \d", pg.inner_text("#hud-rec")) is not None, pg.inner_text("#hud-rec"))
    pg.evaluate("() => PhysicsPlayground.capture.toggleVideo()")
    pg.wait_for_timeout(1500)
    r = pg.evaluate("() => { const c = PhysicsPlayground.capture.vault.list().find(i => i.kind === 'clip'); return c ? { title: c.title, size: c.sizeBytes, type: c.files[0].type, name: c.files[0].name, dur: +c.duration.toFixed(2) } : null; }")
    ok("clip_saved", r is not None, r)
    if r:
        ok("clip_title", r["title"] == "Gravity · Figure-eight clip", r["title"])
        ok("clip_has_bytes", r["size"] > 1000, r["size"])
        ok("clip_type_matches_name", (r["type"], r["name"].rsplit(".", 1)[1]) in [("video/webm", "webm"), ("video/mp4", "mp4")], (r["type"], r["name"]))
        ok("clip_duration", 2 < r["dur"] < 35, r["dur"])
    # --- library UI: preview, download, rename, delete
    ok("library_tab_flagged", pg.evaluate("document.getElementById('nt-library').classList.contains('has-new')"))
    ok("library_tab_count", pg.inner_text("#nt-library-count") == "3", pg.inner_text("#nt-library-count"))
    pg.click("#nt-library"); pg.wait_for_timeout(200)
    ok("library_tab_cleared", not pg.evaluate("document.getElementById('nt-library').classList.contains('has-new')"))
    pg.click("#libf-all") if pg.locator("#libf-all").count() else None
    items = pg.locator(".lib-item")
    ok("library_lists_all", items.count() == 3, items.count())
    clip = pg.locator(".lib-item[data-kind=clip]").first
    clip.locator("button", has_text="Preview").click(); pg.wait_for_timeout(800)
    r = pg.evaluate("(() => { const v = document.querySelector('.lib-preview video'); return v ? [v.src.slice(0, 5), v.readyState] : null })()")
    ok("preview_plays_blob", r is not None and r[0] == "blob:" and r[1] >= 1, r)
    pg.screenshot(path=shot("library.png"), full_page=False)
    run = pg.locator(".lib-item[data-kind=run]").first
    with pg.expect_download() as dl:
        run.locator("button", has_text="Save CSV").first.click()
    d = dl.value
    ok("download_name", re.fullmatch(r"physics-gravity-figure8-[\d-]+\.csv", d.suggested_filename) is not None, d.suggested_filename)
    run.locator(".lib-title").click(); pg.keyboard.press("Control+A"); pg.keyboard.type("Wild three-body figure-eight"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    r = pg.evaluate("PhysicsPlayground.capture.vault.list().find(i => i.kind === 'run').title")
    ok("rename_applied", r == "Wild three-body figure-eight", r)
    st = pg.locator(".lib-item[data-kind=state]").first
    st.locator("button", has_text="Delete").click(); pg.wait_for_timeout(100)
    st.locator(".lib-confirm button", has_text="Delete").click(); pg.wait_for_timeout(400)
    r = pg.evaluate("PhysicsPlayground.capture.vault.list().filter(i => i.kind === 'state').length")
    ok("delete_removes_state", r == 0, r)
    # --- persistence across reload (IndexedDB)
    pg.reload(); pg.wait_for_timeout(2000)
    r = pg.evaluate("PhysicsPlayground.capture.vault.list().map(i => i.kind + ':' + i.title)")
    ok("library_survives_reload", sorted(r) == ["clip:Gravity · Figure-eight clip", "run:Wild three-body figure-eight"], r)
    # --- rewind UI via keyboard comma
    pg.evaluate("() => { PhysicsPlayground.select('chaos'); PhysicsPlayground.play(); }"); pg.wait_for_timeout(2500)
    pg.evaluate("() => document.activeElement && document.activeElement.blur()")
    for _ in range(5): pg.keyboard.press(",")
    r = pg.inner_text("#rewind-out")
    ok("rewind_label_shows_seek", re.fullmatch(r"t = [\d.]+ s · [\d.]+ s back", r) is not None, r)
    ok("rewind_pauses", pg.evaluate("PhysicsPlayground.state.running") is False)
    pg.keyboard.press("Space"); pg.wait_for_timeout(300)
    r = pg.inner_text("#rewind-out")
    ok("play_returns_to_live", r.startswith("live"), r)
    b.close()
finish()
