"""
✒ Metadata
    - Title: Boot Test (digiSpace Edition - v2.0)
    - File Name: boot.py
    - Relative Path: tests/boot.py
    - Artifact Type: test
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Moved
      into the project in v2.0 with a shared harness; covers the Fields lab.

✒ Description:
    Opens the playground, visits every lab and reports console errors and
    page errors.

✒ Key Features:
    - Selects all seven labs.
    - Collects console errors and uncaught exceptions.
    - Saves a boot screenshot.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import sys
from playwright.sync_api import sync_playwright
from harness import URL, launch, shot
errs = []
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("console", lambda m: errs.append(m.type + ": " + m.text) if m.type in ("error",) else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.goto(URL + "#gravity"); pg.wait_for_timeout(2500)
    for lab in ["gravity", "collisions", "fluid", "waves", "chaos", "cloth", "fields"]:
        pg.evaluate(f"PhysicsPlayground.select('{lab}')"); pg.wait_for_timeout(900)
        print(lab, pg.evaluate("PhysicsPlayground.active.id"), round(pg.evaluate("PhysicsPlayground.active.t"), 2))
    pg.screenshot(path=shot("v20_boot.png"))
    print("errors", errs[:10])
    b.close()
