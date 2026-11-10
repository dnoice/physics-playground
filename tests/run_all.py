"""
✒ Metadata
    - Title: Test Runner (digiSpace Edition - v2.5)
    - File Name: run_all.py
    - Relative Path: tests/run_all.py
    - Artifact Type: test
    - Version: 2.5.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.5.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Runs the
      new notebook suite. Runs the new placement suite.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Runs the
      new workspace suite.
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — A suite
      with no PASS marks now fails, so one can never silently stop asserting.
      Registered the shell suite, reads marks by their JSON shape and names
      the failed checks.
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: portable tests for the formal stack.

✒ Description:
    Runs every browser suite in turn and prints one line per suite: passes,
    failures and console errors.

✒ Key Features:
    - Counts PASS and FAIL marks and filters driver noise from console
      errors.
    - A suite with no PASS marks, a non-zero exit or a timeout is a failure.
    - Prints the failed checks and the tail of a suite that crashed.
    - Exit code 0 only when every suite is clean.

✒ Usage Instructions:
    $ npm run dev   (in one terminal)
    $ npm test      (in another)

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
---------
"""
import json
import os
import re
import subprocess
import sys

from harness import NOISE, URL

HERE = os.path.dirname(os.path.abspath(__file__))
SUITES = ['boot', 'nav', 'check', 'capture', 'interact', 'labs3', 'shell', 'world', 'workspace', 'notebook', 'placement']
TIMEOUT_S = 600


def run(name):
    try:
        r = subprocess.run([sys.executable, os.path.join(HERE, name + '.py'), URL], capture_output=True, text=True, timeout=TIMEOUT_S)
    except subprocess.TimeoutExpired:
        print(f'FAIL  {name:<9} timed out after {TIMEOUT_S} s')
        return False
    out = r.stdout
    # A mark is a JSON value, so a quote escaped inside a reading cannot match.
    fails = len(re.findall(r'": "FAIL', out))
    passes = len(re.findall(r'": "PASS', out))
    errors = []
    k = out.rfind('"errors": [')
    if k >= 0:
        try:
            errors = [e for e in json.JSONDecoder().raw_decode(out, k + len('"errors": '))[0] if not NOISE.search(e)]
        except ValueError:
            errors = ['(could not parse the errors list)']
    ok = r.returncode == 0 and passes > 0 and fails == 0 and not errors
    detail = f'{passes} pass, {fails} fail, {len(errors)} console errors' if passes or fails else f'no PASS marks, exit {r.returncode}, {len(errors)} console errors'
    print(f"{'ok  ' if ok else 'FAIL'}  {name:<9} {detail}")
    if not ok:
        for line in re.findall(r'^\s*".*": "FAIL.*$', out, re.M):
            print('  ' + line.strip()[:300])
        for e in errors[:5]:
            print('  ' + e[:300])
        if r.stderr or not (fails or errors):
            print((r.stderr or out)[-1500:])
    return ok


if __name__ == '__main__':
    print(f'Physics Playground tests against {URL}')
    results = [run(s) for s in SUITES]
    sys.exit(0 if all(results) else 1)
