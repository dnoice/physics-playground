"""
✒ Metadata
    - Title: Test Harness (digiSpace Edition - v2.0)
    - File Name: harness.py
    - Relative Path: tests/harness.py
    - Artifact Type: python
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: portable tests for the formal stack.

✒ Description:
    Shared settings for the browser suites: base URL, screenshot folder and
    a Chromium launcher with software WebGL.

✒ Key Features:
    - URL from the first argument, PP_URL or localhost:5173.
    - Screenshots in ./shots unless PP_SHOTS is set.
    - PP_CHROME selects a browser binary; software WebGL keeps results
      GPU-independent.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import os
import sys

# Base URL of the running dev server: first argument, PP_URL, or the default port.
URL = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('PP_URL', 'http://localhost:5173/')).rstrip('/') + '/'
# Screenshots land in ./shots unless PP_SHOTS says otherwise.
SHOTS = os.environ.get('PP_SHOTS', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots'))
os.makedirs(SHOTS, exist_ok=True)


def shot(name):
    """Path for a screenshot file."""
    return os.path.join(SHOTS, name)


def launch(p):
    """Chromium with software WebGL, so results do not depend on the GPU.
    PP_CHROME points at a specific browser binary; otherwise Playwright's own."""
    return p.chromium.launch(executable_path=os.environ.get('PP_CHROME') or None,
                             args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
