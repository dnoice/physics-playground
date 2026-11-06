"""
✒ Metadata
    - Title: Boot Test (digiSpace Edition - v2.1)
    - File Name: boot.py
    - Relative Path: tests/boot.py
    - Artifact Type: test
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added real
      assertions on every lab it visits, started the page in flat 2D mode
      and moved the marks to the shared harness.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness; covers the Fields lab.

✒ Description:
    Opens the playground in flat 2D mode, visits every lab and checks that
    each one takes over the shell and runs, with no console or page errors.

✒ Key Features:
    - Selects all seven labs; each must become active, take the hash, the
      tab and the stage title, and advance its clock.
    - Confirms the stored mode reaches the app as flat 2D.
    - Fails on console errors and uncaught exceptions.
    - Saves a boot screenshot and checks it was written.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import os
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle, shot
with sync_playwright() as p:
    b = launch(p)
    pg = open_page(b, viewport={"width": 1440, "height": 900})
    pg.goto(URL + "#gravity"); pg.wait_for_timeout(2500)
    ok("mode_stored_2d", pg.evaluate("localStorage.getItem('psp:mode')") == '"2d"')
    ok("app_in_2d", pg.evaluate("PhysicsPlayground.mode.get()") == "2d", pg.evaluate("PhysicsPlayground.mode.get()"))
    ok("lab_count", pg.evaluate("Object.keys(PhysicsPlayground.labs).length") == 7)
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.evaluate(f"PhysicsPlayground.select('{lab}')"); pg.wait_for_timeout(900)
        settle(pg, "PhysicsPlayground.active.t > 0")
        s = pg.evaluate("""(id) => { const P = PhysicsPlayground, tab = document.getElementById('tab-' + id);
          return { id: P.active.id, t: P.active.t, name: P.labs[id].name, hash: location.hash, tab: tab.getAttribute('aria-selected'), title: document.getElementById('stage-lab').textContent } }""", lab)
        ok(f"{lab}_selected", s["id"] == lab, s["id"])
        ok(f"{lab}_clock_runs", s["t"] > 0, round(s["t"], 2))
        ok(f"{lab}_hash", s["hash"] == "#" + lab, s["hash"])
        ok(f"{lab}_tab_selected", s["tab"] == "true")
        ok(f"{lab}_stage_title", s["title"] == s["name"], s["title"])
    pg.screenshot(path=shot("v20_boot.png"))
    ok("screenshot_saved", os.path.getsize(shot("v20_boot.png")) > 1000)
    b.close()
finish()
