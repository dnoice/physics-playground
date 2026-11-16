"""
✒ Metadata
    - Title: Capture Test (digiSpace Edition - v2.17)
    - File Name: capture.py
    - Relative Path: tests/capture.py
    - Artifact Type: test
    - Version: 2.17.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.17.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Every
      lab's dataset stands alone: tracks with unique ids that hold from first
      sample to last, a scene section, and every column described.
    - 2.16.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Datasets
      explain themselves: the ZIP is whole, the data package matches the CSVs
      and describes every field, the README covers scene, columns, settings
      and bodies, Gravity's context columns, every lab's dictionary complete,
      quoted CSV text and tracks that thin to the end of the run; the vault
      check waits for the vault to connect. A clip keeps its size and its
      frames through a mid-recording resize.
    - 2.15.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — The CSV
      download is pressed by its stable key (data-fk), as the restructured
      Library names it by its format.
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The rewind
      determinism check waits until eight history snapshots exist instead of a
      fixed three seconds, which a renderer without a GPU could need more
      than; the assertions are unchanged.
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
import json
import re
import zipfile
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, shot
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = open_page(ctx)
    pg.goto(URL + "#gravity"); pg.wait_for_timeout(1500)
    # The vault opens IndexedDB in the background; on a cold start it can still be connecting after the fixed wait.
    settle(pg, "PhysicsPlayground.capture.vault.mode !== 'connecting'", 10000)
    ok("vault_is_local", pg.evaluate("PhysicsPlayground.capture.vault.mode") == "local", pg.evaluate("PhysicsPlayground.capture.vault.mode"))
    # --- determinism through rewind (gravity figure-eight)
    pg.evaluate("() => { const P = PhysicsPlayground; P.preset('figure8'); P.play(); }")
    # History grows with simulated time; wait for enough of it rather than a fixed time a slow renderer may need.
    pg.wait_for_timeout(1000); settle(pg, "PhysicsPlayground.history.size() >= 8", 20000)
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
    # Gravity's files carry their own context: physical time in both, and who each tracked body is and what it orbits.
    ok("dataset_gravity_context_columns", columns[-1] == "t_years" and r["trackHeader"].endswith("t_years,name,kind,orbits_id"), (columns[-1], r["trackHeader"]))
    # Every column of every lab is in its dictionary, so no README ever says "not described".
    gaps = pg.evaluate("""Object.values(PhysicsPlayground.labs).flatMap(L => [...(L.dataColumns || []), ...(L.trackColumns || [])]
      .filter(c => !(L.dataInfo && L.dataInfo[c] && L.dataInfo[c][0] && L.dataInfo[c][1])).map(c => `${L.id}.${c}`))""")
    ok("dataset_every_column_described", gaps == [], gaps)
    q = pg.evaluate("import(new URL('js/shell/capture.js', location.href).href).then(m => m.toCSV(['a', 'b'], [[1.5, 'Body, \"the first\"'], [NaN, 'plain']]))")
    ok("dataset_csv_quotes_text", q == 'a,b\n1.5,"Body, ""the first"""\n,plain\n', q)
    # Tracks that fill up thin evenly instead of stopping: with room for only 24 rows, a run's tracks still reach its end.
    # The run is deleted afterwards, so the Library checks below see the items they expect.
    pg.evaluate("() => { const P = PhysicsPlayground; P.preset('figure8'); P.capture.dataRec.trackCap = 24; P.capture.toggleData(); P.play(); }")
    pg.wait_for_timeout(3200)
    pg.evaluate("() => { PhysicsPlayground.capture.toggleData(); PhysicsPlayground.capture.dataRec.trackCap = 400000; }")
    pg.wait_for_timeout(600)
    t = pg.evaluate("""async () => { const C = PhysicsPlayground.capture, run = C.vault.list().find(i => i.kind === 'run');
      const tr = (await (await C.vault.blob(run, 1)).text()).trim().split('\\n'), csv = (await (await C.vault.blob(run, 0)).text()).trim().split('\\n');
      const out = { stride: run.trackStride, rows: tr.length - 1, lastTrack: +tr[tr.length - 1].split(',')[0], lastData: +csv[csv.length - 1].split(',')[0], period: 1 / run.rateAsked };
      await C.vault.remove(run); return out; }""")
    ok("dataset_tracks_thin_to_the_end", t["stride"] > 1 and t["rows"] < 24 and t["lastData"] - t["lastTrack"] <= t["stride"] * t["period"] * 1.5, t)
    # Every lab's dataset stands on its own: tracks with stable ids, and the scene it was recorded in. A gas, a tank and a
    # cloth had kept no per-object record at all, and no lab said where its charges, sources, posts or copies began.
    labs_ok = {}
    for lab, preset, idcol in [("collisions", "gas", "ball_id"), ("fluid", "posts", "particle_id"), ("waves", "double", "y_cell"), ("chaos", "chaos", "copy"), ("cloth", "curtain", "point_id"), ("fields", "cyclotron", "particle_id")]:
        pg.evaluate(f"() => {{ const P = PhysicsPlayground; P.select('{lab}'); P.preset('{preset}'); P.capture.toggleData(); P.play(); }}")
        pg.wait_for_timeout(2200)
        pg.evaluate("() => PhysicsPlayground.capture.toggleData()"); pg.wait_for_timeout(500)
        labs_ok[lab] = pg.evaluate(f"""async () => {{ const C = PhysicsPlayground.capture, run = C.vault.list().find(i => i.kind === 'run');
          const m = await import(new URL('js/shell/dataset.js', location.href).href), d = m.describeRun(run);
          const tr = (await (await C.vault.blob(run, 1)).text()).trim().split('\\n'), h = tr[0].split(','), j = h.indexOf('{idcol}'), first = tr[1].split(',')[0], last = tr[tr.length - 1].split(',')[0];
          const ids = t => tr.slice(1).filter(l => l.split(',')[0] === t).map(l => l.split(',')[j]);
          const a = ids(first), z = ids(last), out = {{ lab: run.lab, tracks: run.trackRows, unique: new Set(a).size === a.length, steady: a.join() === z.join(),
            scene: d.readme.includes('## The scene at the start'), described: !d.readme.includes('not described') }};
          await C.vault.remove(run); return out; }}""")
    ok("every_lab_dataset_stands_alone", all(v["tracks"] > 0 and v["unique"] and v["scene"] and v["described"] for v in labs_ok.values())
       and all(labs_ok[k]["steady"] for k in ("collisions", "fluid", "waves", "chaos", "cloth")), labs_ok)
    pg.evaluate("PhysicsPlayground.select('gravity')"); pg.wait_for_timeout(600)
    # --- video recording
    pg.evaluate("() => { PhysicsPlayground.capture.toggleVideo(); }")
    pg.wait_for_timeout(2600)
    # A cold software encoder can take seconds to start, and stopping sooner saves nothing.
    settle(pg, "PhysicsPlayground.capture.vrec.bytes > 0", 30000)
    ok("rec_chip_counts", re.match(r"REC \d", pg.inner_text("#hud-rec")) is not None, pg.inner_text("#hud-rec"))
    # The clip keeps one size when the stage changes shape (here the window; the deck's charts do the same), and its
    # frames keep coming. Recording the stage canvas itself had frozen a clip at the first resize.
    rec = """(() => { const v = PhysicsPlayground.capture.vrec, s = v.stream.getVideoTracks()[0].getSettings(), d = v.rc.getContext('2d').getImageData(0, 0, v.rc.width, v.rc.height).data;
      let h = 0; for (let i = 0; i < d.length; i += 4097) h = (h * 31 + d[i] + d[i + 1] * 3) >>> 0;
      return { stream: [s.width, s.height], stage: document.getElementById('stage-canvas').width, hash: h }; })()"""
    v0 = pg.evaluate(rec); pg.set_viewport_size({"width": 1240, "height": 760}); pg.wait_for_timeout(1200)
    v1 = pg.evaluate(rec); pg.wait_for_timeout(800); v2 = pg.evaluate(rec)
    pg.set_viewport_size({"width": 1440, "height": 900}); pg.wait_for_timeout(600)
    ok("clip_keeps_its_size_through_a_resize", v0["stream"] == v1["stream"] == v2["stream"] and v0["stage"] != v1["stage"] and v1["hash"] != v2["hash"], (v0, v1, v2))
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
        run.locator("[data-fk=save-0]").click()
    d = dl.value
    ok("download_name", re.fullmatch(r"physics-gravity-figure8-[\d-]+\.csv", d.suggested_filename) is not None, d.suggested_filename)
    # The ZIP carries the dataset whole: both CSVs, the README that explains them and the data package.
    with pg.expect_download() as dl:
        run.locator("[data-fk=zip]").click()
    d = dl.value
    zf = zipfile.ZipFile(d.path()); names = zf.namelist()
    ok("dataset_zip_whole", zf.testzip() is None and d.suggested_filename.endswith(".zip") and len(names) == 4
       and sum(n.endswith(".csv") for n in names) == 2 and any(n.endswith("-README.md") for n in names) and any(n.endswith("-datapackage.json") for n in names), (d.suggested_filename, names))
    pkg = json.loads(zf.read(next(n for n in names if n.endswith("-datapackage.json"))))
    heads = {r["path"]: zf.read(r["path"]).decode().split("\n")[0].split(",") for r in pkg["resources"]}
    ok("dataset_package_matches_files", pkg["profile"] == "tabular-data-package" and all([f["name"] for f in r["schema"]["fields"]] == heads[r["path"]] for r in pkg["resources"])
       and all(f.get("description") and f.get("unit") for r in pkg["resources"] for f in r["schema"]["fields"]), [r["path"] for r in pkg["resources"]])
    readme = zf.read(next(n for n in names if n.endswith("-README.md"))).decode()
    ok("dataset_readme_explains", all(k in readme for k in ["scene **Figure-eight**", "## Columns of", "Multiply by", "## Bodies at the start", "## Settings", "Join it to the samples on `t_s`"]), len(readme))
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
