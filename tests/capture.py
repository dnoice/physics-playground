"""
✒ Metadata
    - Title: Capture Test (digiSpace Edition - v2.0)
    - File Name: capture.py
    - Relative Path: tests/capture.py
    - Artifact Type: test
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0; checks the Library tab marker and full
      renames.

✒ Description:
    Records a dataset and a video, saves and deletes states, previews,
    downloads and renames library items, reloads, and rewinds.

✒ Key Features:
    - Dataset columns and track rows.
    - Library tab count and new-item marker.
    - Persistence across reload and rewind labels.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot
errs=[]
out={}
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL + "#gravity"); pg.wait_for_timeout(1500)
    out["vault_mode"] = pg.evaluate("PhysicsPlayground.capture.vault.mode")
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
    out["rewind_determinism"] = r
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
    out["state_roundtrip"] = r
    # --- data recording with tracks
    pg.evaluate("() => { const P = PhysicsPlayground; P.preset('figure8'); P.capture.toggleData(); P.play(); }")
    pg.wait_for_timeout(3200)
    pg.evaluate("() => PhysicsPlayground.capture.toggleData()")
    pg.wait_for_timeout(600)
    r = pg.evaluate("""async () => { const C = PhysicsPlayground.capture, run = C.vault.list().find(i => i.kind === 'run');
      const csv = await (await C.vault.blob(run, 0)).text(), tr = run.files[1] ? await (await C.vault.blob(run, 1)).text() : '';
      return { title: run.title, rows: run.rows, files: run.files.map(f => f.name), header: csv.split('\\n')[0], line2: csv.split('\\n')[1], trackHeader: tr.split('\\n')[0], trackLines: tr.split('\\n').length - 2, summary0: run.summary[4] }; }""")
    out["dataset"] = r
    # --- video recording
    pg.evaluate("() => { PhysicsPlayground.capture.toggleVideo(); }")
    pg.wait_for_timeout(2600)
    out["rec_chip"] = pg.inner_text("#hud-rec")
    pg.evaluate("() => PhysicsPlayground.capture.toggleVideo()")
    pg.wait_for_timeout(1500)
    r = pg.evaluate("() => { const c = PhysicsPlayground.capture.vault.list().find(i => i.kind === 'clip'); return c ? { title: c.title, size: c.sizeBytes, type: c.files[0].type, name: c.files[0].name, dur: +c.duration.toFixed(2) } : null; }")
    out["clip"] = r
    # --- library UI: preview, download, rename, delete
    out["library_tab_flagged"] = pg.evaluate("document.getElementById('nt-library').classList.contains('has-new')")
    out["library_tab_count"] = pg.inner_text("#nt-library-count")
    pg.click("#nt-library"); pg.wait_for_timeout(200)
    out["library_tab_cleared"] = not pg.evaluate("document.getElementById('nt-library').classList.contains('has-new')")
    pg.click("#libf-all") if pg.locator("#libf-all").count() else None
    items = pg.locator(".lib-item")
    out["lib_items"] = items.count()
    clip = pg.locator(".lib-item[data-kind=clip]").first
    clip.locator("button", has_text="Preview").click(); pg.wait_for_timeout(800)
    out["preview_src"] = pg.evaluate("(() => { const v = document.querySelector('.lib-preview video'); return v ? (v.src.slice(0, 5) + ' readyState=' + v.readyState) : null })()")
    pg.screenshot(path=shot("library.png"), full_page=False)
    run = pg.locator(".lib-item[data-kind=run]").first
    with pg.expect_download() as dl:
        run.locator("button", has_text="Save CSV").first.click()
    d = dl.value; out["download_name"] = d.suggested_filename
    run.locator(".lib-title").click(); pg.keyboard.press("Control+A"); pg.keyboard.type("Wild three-body figure-eight"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    out["renamed"] = pg.evaluate("PhysicsPlayground.capture.vault.list().find(i => i.kind === 'run').title")
    st = pg.locator(".lib-item[data-kind=state]").first
    st.locator("button", has_text="Delete").click(); pg.wait_for_timeout(100)
    st.locator(".lib-confirm button", has_text="Delete").click(); pg.wait_for_timeout(400)
    out["after_delete_states"] = pg.evaluate("PhysicsPlayground.capture.vault.list().filter(i => i.kind === 'state').length")
    # --- persistence across reload (IndexedDB)
    pg.reload(); pg.wait_for_timeout(2000)
    out["after_reload"] = pg.evaluate("PhysicsPlayground.capture.vault.list().map(i => i.kind + ':' + i.title)")
    # --- rewind UI via keyboard comma
    pg.evaluate("() => { PhysicsPlayground.select('chaos'); PhysicsPlayground.play(); }"); pg.wait_for_timeout(2500)
    pg.evaluate("() => document.activeElement && document.activeElement.blur()")
    for _ in range(5): pg.keyboard.press(",")
    out["rewind_label"] = pg.inner_text("#rewind-out"); out["running_after_rewind"] = pg.evaluate("PhysicsPlayground.state.running")
    pg.keyboard.press("Space"); pg.wait_for_timeout(300)
    out["after_play_label"] = pg.inner_text("#rewind-out")
    out["errors"] = errs
    b.close()
print(json.dumps(out, indent=1))
