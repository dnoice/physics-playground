"""
✒ Metadata
    - Title: Test Harness (digiSpace Edition - v2.1)
    - File Name: harness.py
    - Relative Path: tests/harness.py
    - Artifact Type: python
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Took over
      the ok() marks, console watching and suite exit codes from the suites,
      and added open_page() so every page starts in a chosen global mode, and
      settle() for conditions that take longer on a busy machine.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: portable tests for the formal stack.

✒ Description:
    Shared settings and helpers for the browser suites: base URL, screenshot
    folder, a Chromium launcher with software WebGL, the page opener that
    fixes the global mode, and the PASS and FAIL marks with the exit code
    they lead to.

✒ Key Features:
    - URL from the first argument, PP_URL or localhost:5173.
    - Screenshots in ./shots unless PP_SHOTS is set.
    - PP_CHROME selects a browser binary; software WebGL keeps results
      GPU-independent.
    - open_page() writes psp:mode before any page script runs and watches
      the console and uncaught exceptions.
    - ok() records a named mark and refuses a reused name, which would hide
      the earlier result.
    - settle() waits on a page condition and reports the outcome, so a late
      condition ends as a FAIL mark rather than a crash that loses every mark.
    - finish() prints the marks and console errors as JSON and exits non-zero
      unless a check ran, none failed and the console stayed clean.

✒ Usage Instructions:
    from harness import URL, finish, launch, ok, open_page
    with sync_playwright() as p:
        b = launch(p)
        pg = open_page(b, viewport={"width": 1440, "height": 900})
        pg.goto(URL + "#fluid")
        ok("fluid_selected", pg.evaluate("PhysicsPlayground.active.id") == "fluid")
        b.close()
    finish()

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json
import os
import re
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeout

# Base URL of the running dev server: first argument, PP_URL, or the default port.
URL = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('PP_URL', 'http://localhost:5173/')).rstrip('/') + '/'
# Screenshots land in ./shots unless PP_SHOTS says otherwise.
SHOTS = os.environ.get('PP_SHOTS', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots'))
os.makedirs(SHOTS, exist_ok=True)
# Console lines from software WebGL rather than from the app.
NOISE = re.compile(r'GPU stall due to ReadPixels')

out, errors = {}, []


def shot(name):
    """Path for a screenshot file."""
    return os.path.join(SHOTS, name)


def launch(p):
    """Chromium with software WebGL, so results do not depend on the GPU.
    PP_CHROME points at a specific browser binary; otherwise Playwright's own."""
    return p.chromium.launch(executable_path=os.environ.get('PP_CHROME') or None,
                             args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])


def open_page(owner, mode='2d', watch=True, **options):
    """A new page on a Browser or BrowserContext, in the global mode '2d' or '3d'.
    The init script stores the mode as the app does, as a JSON string, before any
    page script runs and again on every navigation. It skips documents with no
    storage, such as about:blank. Options go to new_page(). watch=False leaves the
    console unwatched, for a page that blocks a request on purpose."""
    if mode not in ('2d', '3d'):
        raise ValueError(f'unknown mode: {mode}')
    pg = owner.new_page(**options)
    pg.add_init_script('try { localStorage.setItem(%s, %s); } catch (_) { /* no storage here */ }' % (json.dumps('psp:mode'), json.dumps(json.dumps(mode))))
    if watch:
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    return pg


def settle(pg, expression, timeout=15000):
    """Wait for a page expression to become true and return whether it did. The check
    that follows records the outcome, so a late condition fails one mark, not the suite."""
    try:
        pg.wait_for_function(expression, timeout=timeout)
        return True
    except PlaywrightTimeout:
        return False


def scene(pg, preset):
    """Pick a scene from the dropdown in the stage title."""
    pg.click("#scene-btn")
    pg.click(preset)


def ok(name, cond, info=''):
    """Record a named check as a PASS or FAIL mark, with an optional reading."""
    if name in out:
        raise ValueError(f'check name used twice: {name}')
    out[name] = ('PASS' if cond else 'FAIL') + (f' {info}' if info != '' else '')


def finish():
    """Print the marks and console errors as JSON and end the suite. The exit code
    is 0 only when at least one check ran, none failed and the console stayed clean."""
    marks = list(out.values())
    out['errors'] = [e for e in errors if not NOISE.search(e)]
    print(json.dumps(out, indent=1))
    sys.exit(0 if marks and all(m.startswith('PASS') for m in marks) and not out['errors'] else 1)
