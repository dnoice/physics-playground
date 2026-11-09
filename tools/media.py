"""
✒ Metadata
    - Title: README Media Capture (digiSpace Edition - v2.2)
    - File Name: media.py
    - Relative Path: tools/media.py
    - Artifact Type: CLI
    - Version: 2.2.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's direction to give the README real screenshots with
      thematic borders.

✒ Description:
    Captures the README's banner and screenshots from a running dev server
    and frames them in the playground's own palette: an amber-to-cyan
    border, a title bar in the app's type with the lab's glyph, and rounded
    corners on a transparent background. Run it after a visible change so
    the README keeps showing the playground as it is.

✒ Key Features:
    - Real captures: every lab is loaded, its scene run and rendered by the
      app itself in 3D at the Ultra tier.
    - A fake page clock drives the frame loop, so each frame is simulated
      and drawn in full, and timing readouts show what a machine with a GPU
      shows instead of the software renderer's crawl.
    - Frames use the app's tokens: ink and bench surfaces, amber and cyan
      accents, the status colours as window dots, Raleway and JetBrains
      Mono, Material Symbols for the lab glyphs.
    - A banner built from a live 3D render of the Gravity lab.
    - A 2D and 3D pair of the same moment, showing the mode switch leaves
      the simulation alone.
    - WebP output with alpha, encoded by the browser itself: no image
      library to install, and pages stay light to load.
    - Writes to docs/media/ by default, with the names the README and
      docs/media/MANIFEST.md use: banner, hero-workspace (Gravity),
      lab-<id> for the six other labs, and modes-2d-3d.
    - --only captures a subset while iterating on one picture.

✒ Usage Instructions:
    Start the dev server (npm run dev), then run this from the project root
    with the same Python and Playwright that npm test uses.

✒ Examples:
    $ npm run media
    $ python tools/media.py
    $ python tools/media.py http://localhost:8080/
    $ python tools/media.py --only banner,hero
    $ python tools/media.py --only labs
    $ PP_MEDIA=/tmp/pp-media python tools/media.py
    $ PP_CHROME=/usr/bin/chromium python tools/media.py

✒ Command-Line Arguments:
    Input:
        URL                    Dev server address (default PP_URL, then
                               http://localhost:5173/).
    Processing:
        --only NAMES           Comma-separated subset of banner, hero, labs,
                               modes.
    Output:
        PP_MEDIA (environment) Output folder (default docs/media).
        PP_CHROME (environment) Browser binary (default Playwright's own).

✒ Other Important Information:
    - Dependencies: Python 3.9+ and Playwright for Python with Chromium (as
      for npm test); Google Fonts reachable for the frame type and glyphs;
      the dev server reachable, with jsDelivr reachable from the browser
    - Compatible platforms: Windows, macOS and Linux
    - Performance: software WebGL (SwiftShader), so results do not depend
      on the GPU; the full set takes a few minutes.
    - Output is deterministic in layout but not bit for bit: the scenes
      seed some motion from the clock.
"""
import argparse
import base64
import html
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('PP_MEDIA', os.path.join(ROOT, 'docs', 'media'))
VIEW = {'width': 1440, 'height': 900}
PP = 'PhysicsPlayground'

# lab id, rail name, scene id, scene label, glyph, simulated seconds before the picture
LABS = [
    ('gravity', 'Gravity', 'solar', 'Star system', 'orbit', 7.0),
    ('collisions', 'Collisions', 'pool', 'Billiard break', 'bubble_chart', 1.6),
    ('fluid', 'Fluid', 'dam', 'Dam break', 'water_drop', 1.4),
    ('waves', 'Waves', 'double', 'Double slit', 'airwave', 6.0),
    ('chaos', 'Chaos', 'chaos', 'Sensitive start', 'cyclone', 9.0),
    ('cloth', 'Cloth', 'flag', 'Flag in wind', 'texture', 4.0),
    ('fields', 'Fields', 'cyclotron', 'Cyclotron motion', 'electric_bolt', 3.0),
]
GLYPHS = 'airwave,bubble_chart,coffee,cyclone,electric_bolt,orbit,texture,water_drop'
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600'
         '&family=Raleway:ital,wght@0,500;0,600;0,700;1,500&display=block">'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:'
         f'opsz,wght,FILL,GRAD@20..48,500,1,0&icon_names={GLYPHS}&display=block">')
TOKENS = """
:root { --ink: #080b11; --bench: #0c1118; --tile: #0e131b; --tile-hi: #131a24; --rule: #232c39;
  --text: #e8edf3; --muted: #8f9cad; --amber: #f2a541; --cyan: #5fd0df; --ok: #6fcf97; --warn: #f2c94c; --crit: #ef6461; }
html, body { margin: 0; background: transparent; }
body { -webkit-font-smoothing: antialiased; font-variant-numeric: lining-nums; }
.ms { font-family: 'Material Symbols Rounded'; font-weight: 500; font-style: normal; line-height: 1; letter-spacing: normal;
  text-transform: none; white-space: nowrap; direction: ltr; font-feature-settings: 'liga'; font-variation-settings: 'FILL' 1; }
"""
FRAME_CSS = TOKENS + """
#shot { display: inline-flex; gap: 34px; align-items: center; padding: 26px 26px 34px; }
.frame { padding: 2px; border-radius: 20px;
  background: linear-gradient(135deg, var(--amber) 0%, color-mix(in oklab, var(--amber) 55%, var(--cyan)) 38%, var(--cyan) 100%);
  box-shadow: 0 0 0 1px rgba(4, 7, 12, 0.35), 0 26px 50px -26px rgba(4, 7, 12, 0.85), 0 0 42px -14px color-mix(in oklab, var(--cyan) 60%, transparent); }
.win { border-radius: 18px; overflow: hidden; background: var(--ink); }
.bar { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 18px; border-bottom: 1px solid var(--rule);
  background: linear-gradient(180deg, var(--tile-hi), var(--bench)); font: 500 15px/1 Raleway, sans-serif; color: var(--muted); }
.dots { display: flex; gap: 7px; margin-right: 6px; } .dots i { display: block; width: 11px; height: 11px; border-radius: 50%; }
.bar .ms { font-size: 21px; color: var(--amber); filter: drop-shadow(0 0 8px color-mix(in oklab, var(--amber) 45%, transparent)); }
.name { color: var(--text); font-weight: 700; } .name em { color: var(--amber); font-style: normal; font-weight: 500; }
.sep { color: color-mix(in oklab, var(--cyan) 80%, transparent); font-size: 10px; }
.tag { margin-left: auto; font: 600 12px/1 'JetBrains Mono', monospace; letter-spacing: 0.06em; padding: 6px 9px; border-radius: 8px;
  color: #17120a; background: var(--amber); box-shadow: 0 1px 10px color-mix(in oklab, var(--amber) 40%, transparent); }
.tag.flat { color: var(--cyan); background: transparent; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--cyan) 55%, transparent); }
.win img { display: block; }
.key { font: 600 20px/1 'JetBrains Mono', monospace; color: var(--text); background: var(--ink); border: 1px solid var(--rule);
  border-bottom-width: 3px; border-radius: 9px; padding: 11px 14px; box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.8); }
"""


def log(msg):
    print(msg, flush=True)


def b64(data):
    return base64.b64encode(data).decode('ascii')


class Studio:
    """Pages for capturing the app and for framing and encoding pictures."""

    def __init__(self, p, url):
        self.url = url
        self.browser = p.chromium.launch(executable_path=os.environ.get('PP_CHROME') or None,
                                         args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        self.framer = self.browser.new_page(device_scale_factor=1)

    # ---------- the app ----------
    def app(self, lab, mode='3d'):
        """A page on the lab, clock faked from the first script, ready to tick."""
        ctx = self.browser.new_context(viewport=VIEW, device_scale_factor=2)
        ctx.add_init_script(f"""try {{ localStorage.setItem('psp:mode', '"{mode}"'); localStorage.setItem('psp:tier', '"ultra"');
          localStorage.setItem('psp:lab', '"{lab}"'); }} catch (_) {{ /* no storage */ }}""")
        pg = ctx.new_page()
        pg.clock.install()
        pg.goto(self.url + '#' + lab)
        self.until(pg, f"window.{PP} && {PP}.active && {PP}.active.id === '{lab}'", 'the workspace')
        if mode == '3d':
            self.until(pg, f'{PP}.mode.is3D()', 'the 3D world')
        self.until(pg, "document.fonts.status === 'loaded' && document.fonts.check('20px \"Material Symbols Rounded\"')", 'the fonts')
        return pg

    @staticmethod
    def until(pg, expr, what, limit=90):
        """Tick the fake clock until expr holds; boot work that is not timer-driven runs in real time meanwhile."""
        t0 = time.time()
        while not pg.evaluate(f'(() => {{ try {{ return !!({expr}); }} catch (_) {{ return false; }} }})()'):
            if time.time() - t0 > limit:
                raise RuntimeError(f'timed out waiting for {what}')
            pg.clock.run_for(100)
            time.sleep(0.15)

    @staticmethod
    def run(pg, scene, seconds):
        """Load a scene, simulate it, then let the frame loop draw and the readouts catch up."""
        pg.evaluate(f"{PP}.preset('{scene}')")
        pg.clock.run_for(200)
        # advance() takes at most maxSteps steps a call and drops the rest, as the frame loop does, so feed it in chunks.
        pg.evaluate(f"""s => {{ const L = {PP}.active, end = L.t + s, chunk = L.dt() * (L.maxSteps || 32);
          while (L.t < end - 1e-9) if (!{PP}.advance(Math.min(chunk, end - L.t))) break; }}""", seconds)
        pg.clock.run_for(1200)

    # ---------- framing ----------
    def frame(self, shots, scale):
        """One or more framed windows side by side, as PNG bytes with alpha. shots: (png, css width, name, scene, glyph, tag)."""
        wins = []
        for i, (png, width, name, scene, glyph, tag) in enumerate(shots):
            if i:
                wins.append('<span class="key">Z</span>')
            wins.append(f"""<div class="frame"><div class="win"><div class="bar">
              <span class="dots"><i style="background:var(--crit)"></i><i style="background:var(--warn)"></i><i style="background:var(--ok)"></i></span>
              <span class="ms" aria-hidden="true">{glyph}</span><span class="name">{name}</span>
              {f'<span class="sep">✦</span><span>{html.escape(scene)}</span>' if scene else ''}
              <span class="tag{' flat' if tag == '2D' else ''}">{tag}</span></div>
              <img src="data:image/png;base64,{b64(png)}" width="{width}" alt=""></div></div>""")
        return self.render(f'<!DOCTYPE html><html><head>{FONTS}<style>{FRAME_CSS}</style></head><body><div id="shot">{"".join(wins)}</div></body></html>', scale)

    def render(self, doc, scale, viewport=None):
        pg = self.browser.new_page(device_scale_factor=scale, viewport=viewport or {'width': 3200, 'height': 1600})
        pg.set_content(doc, wait_until='load')
        pg.evaluate('document.fonts.ready')
        pg.wait_for_function("document.fonts.check('20px \"Material Symbols Rounded\"') && document.fonts.check('700 20px Raleway')")
        pg.evaluate("Promise.all([...document.images].map(i => i.decode()))")
        png = pg.locator('#shot').screenshot(omit_background=True)
        pg.close()
        return png

    def webp(self, png, name, quality=0.9):
        """Encode in the browser and write docs/media/<name>.webp."""
        data = self.framer.evaluate("""async ([src, q]) => {
          const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + src)).blob());
          const c = new OffscreenCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0);
          const out = await c.convertToBlob({ type: 'image/webp', quality: q });
          if (out.type !== 'image/webp') throw new Error('this browser cannot encode WebP');
          const bytes = new Uint8Array(await out.arrayBuffer()); let s = '';
          for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return [btoa(s), bmp.width, bmp.height]; }""", [b64(png), quality])
        path = os.path.join(OUT, name + '.webp')
        with open(path, 'wb') as fh:
            fh.write(base64.b64decode(data[0]))
        log(f'wrote {os.path.relpath(path, ROOT)}  {data[1]}×{data[2]}  {os.path.getsize(path) // 1024} KB')

    def close(self):
        self.browser.close()


def element_width(pg, selector):
    return round(pg.locator(selector).bounding_box()['width'])


def capture_labs(st, want):
    """Hero (the whole workspace on Gravity), banner art, and the stage of each other lab for the gallery."""
    art = None
    for lab, name, scene, label, glyph, seconds in LABS:
        if not ({'labs', 'hero', 'banner'} & want) or (lab != 'gravity' and 'labs' not in want):
            continue
        log(f'{name}: {label}')
        pg = st.app(lab)
        st.run(pg, scene, seconds)
        if lab == 'gravity' and 'hero' in want:
            st.webp(st.frame([(pg.screenshot(), VIEW['width'], 'Physics <em>Playground</em>', f'{name} · {label}', 'orbit', '3D · ULTRA')], 1.5), 'hero-workspace')
        if lab == 'gravity' and 'banner' in want:
            pg.add_style_tag(content='#stage > :not(canvas) { visibility: hidden !important; }')
            pg.clock.run_for(100)
            art = pg.locator('#stage-canvas').screenshot()
        if 'labs' in want and lab != 'gravity':
            png = pg.locator('#stage').screenshot()
            st.webp(st.frame([(png, element_width(pg, '#stage'), name, label, glyph, '3D')], 1), f'lab-{lab}')
        pg.context.close()
    return art


def capture_modes(st):
    """The same moment of the double slit in 2D, then in 3D: the switch leaves the run alone."""
    log('Waves: 2D and 3D')
    pg = st.app('waves', mode='2d')
    st.run(pg, 'double', 6.0)
    pg.evaluate(f'{PP}.pause()')
    pg.clock.run_for(300)
    flat, width = pg.locator('#stage').screenshot(), element_width(pg, '#stage')
    pg.evaluate(f"{PP}.mode.set('3d')")
    st.until(pg, f'{PP}.mode.is3D()', 'the 3D world')
    pg.clock.run_for(1200)
    deep = pg.locator('#stage').screenshot()
    pg.context.close()
    st.webp(st.frame([(flat, width * 0.62, 'Waves', 'Double slit', 'airwave', '2D'),
                      (deep, width * 0.62, 'Waves', 'Double slit', 'airwave', '3D')], 1), 'modes-2d-3d')


def capture_banner(st, art):
    """Title, tagline and the seven labs over a live 3D render of Gravity."""
    log('Banner')
    rail = ''.join(f'<span class="lab{" on" if i == 0 else ""}"><span class="ms">{g}</span>{n}</span>' for i, (_, n, _, _, g, _) in enumerate(LABS))
    css = TOKENS + """
    #shot { position: relative; width: 1280px; height: 400px; border-radius: 22px; overflow: hidden; background: var(--ink);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06); }
    #shot::before { content: ''; position: absolute; inset: 0; padding: 2px; border-radius: 22px; z-index: 3; pointer-events: none;
      background: linear-gradient(120deg, var(--amber), color-mix(in oklab, var(--amber) 50%, var(--cyan)) 40%, var(--cyan));
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
    .art { position: absolute; right: -40px; top: -30px; height: 470px;
      -webkit-mask-image: radial-gradient(70% 82% at 64% 52%, #000 40%, transparent 78%); mask-image: radial-gradient(70% 82% at 64% 52%, #000 40%, transparent 78%); }
    .glow { position: absolute; inset: 0; background: radial-gradient(620px 300px at 6% -10%, color-mix(in oklab, var(--cyan) 13%, transparent), transparent 70%),
      linear-gradient(90deg, var(--ink) 30%, color-mix(in oklab, var(--ink) 55%, transparent) 52%, transparent 70%); }
    .copy { position: absolute; left: 64px; top: 58px; z-index: 2; width: 720px; }
    .mark { display: flex; align-items: center; gap: 16px; }
    .mark .ms { font-size: 58px; color: var(--amber); filter: drop-shadow(0 0 22px color-mix(in oklab, var(--amber) 55%, transparent)); }
    h1 { margin: 0; font: 700 62px/1 Raleway, sans-serif; letter-spacing: -0.015em; color: var(--text); }
    h1 em { color: var(--amber); font-style: normal; font-weight: 500; }
    p { margin: 22px 0 0; max-width: 600px; font: 500 21px/1.45 Raleway, sans-serif; color: color-mix(in oklab, var(--text) 78%, var(--muted)); }
    .rail { display: inline-flex; gap: 3px; margin-top: 34px; padding: 5px; border-radius: 15px;
      background: color-mix(in oklab, var(--bench) 86%, transparent); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07); }
    .lab { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 12px; border-radius: 10px;
      font: 600 13.5px/1 Raleway, sans-serif; color: var(--muted); }
    .lab .ms { font-size: 19px; }
    .lab.on { color: var(--text); background: color-mix(in oklab, var(--amber) 16%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--amber) 36%, transparent); }
    .lab.on .ms { color: var(--amber); }
    .studio { position: absolute; right: 30px; bottom: 24px; z-index: 2; font: 600 12px/1 'JetBrains Mono', monospace;
      letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in oklab, var(--text) 70%, transparent); }
    .studio b { color: var(--amber); font-weight: 600; }
    """
    doc = f"""<!DOCTYPE html><html><head>{FONTS}<style>{css}</style></head><body><div id="shot">
      <img class="art" src="data:image/png;base64,{b64(art)}" alt=""><div class="glow"></div>
      <div class="copy"><div class="mark"><span class="ms">orbit</span><h1>Physics <em>Playground</em></h1></div>
      <p>Seven live physics labs in one browser workspace: exact in 2D, rendered as real apparatus in 3D.</p>
      <div class="rail">{rail}</div></div>
      <div class="studio"><b>digiSpace</b> Studio</div></div></body></html>"""
    st.webp(st.render(doc, 2, {'width': 1400, 'height': 520}), 'banner', 0.92)


def main():
    ap = argparse.ArgumentParser(description='Capture the README banner and screenshots.')
    ap.add_argument('url', nargs='?', default=os.environ.get('PP_URL', 'http://localhost:5173/'))
    ap.add_argument('--only', default='banner,hero,labs,modes')
    a = ap.parse_args()
    want = set(a.only.split(','))
    unknown = want - {'banner', 'hero', 'labs', 'modes'}
    if unknown:
        sys.exit(f'unknown picture set: {", ".join(sorted(unknown))}')
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        st = Studio(p, a.url.rstrip('/') + '/')
        try:
            art = capture_labs(st, want)
            if 'banner' in want:
                capture_banner(st, art)
            if 'modes' in want:
                capture_modes(st)
        finally:
            st.close()


if __name__ == '__main__':
    main()
