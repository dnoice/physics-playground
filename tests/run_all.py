"""
✒ Metadata
    - Title: Test Runner (digiSpace Edition - v2.0)
    - File Name: run_all.py
    - Relative Path: tests/run_all.py
    - Artifact Type: test
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
    Runs every browser suite in turn and prints one line per suite: passes,
    failures and console errors.

✒ Key Features:
    - Counts PASS and FAIL marks and filters driver noise from console
      errors.
    - Prints the tail of a failing suite.
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

from harness import URL

HERE = os.path.dirname(os.path.abspath(__file__))
SUITES = ['boot', 'nav', 'check', 'capture', 'interact', 'labs3']
NOISE = re.compile(r'GPU stall due to ReadPixels')


def run(name):
    r = subprocess.run([sys.executable, os.path.join(HERE, name + '.py'), URL], capture_output=True, text=True, timeout=600)
    out = r.stdout
    fails = len(re.findall(r'"FAIL', out))
    passes = len(re.findall(r'"PASS', out))
    errors = []
    k = out.rfind('"errors": [')
    if k >= 0:
        try:
            errors = [e for e in json.JSONDecoder().raw_decode(out, k + len('"errors": '))[0] if not NOISE.search(e)]
        except ValueError:
            errors = ['(could not parse the errors list)']
    ok = r.returncode == 0 and fails == 0 and not errors
    detail = f'{passes} pass, {fails} fail, {len(errors)} console errors' if passes or fails else f'exit {r.returncode}, {len(errors)} console errors'
    print(f"{'ok  ' if ok else 'FAIL'}  {name:<9} {detail}")
    if not ok:
        print((r.stderr or out)[-1500:])
    return ok


if __name__ == '__main__':
    print(f'Physics Playground tests against {URL}')
    results = [run(s) for s in SUITES]
    sys.exit(0 if all(results) else 1)
