"""
✒ Metadata
    - Title: README Media Capture (digiSpace Edition - v2.8)
    - File Name: media.py
    - Relative Path: tools/media.py
    - Artifact Type: CLI
    - Version: 2.8.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — New picture
      set sol: Gravity's Solar System in 3D, the planets out to Saturn beside
      Jupiter followed up close with its moons. frame() takes the keycap shown
      between windows, or none.
    - 2.7.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      Collisions picture selects the cue ball, so the gallery shows the
      head-up display's target box and callout.
    - 2.4.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Chaos is
      captured in its Both view, which shows the pendulum beside its map.
    - 2.3.1 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Settles
      each picture on 0.6 s of frames instead of 1.2 s: the readouts refresh
      within 0.25 s, and every frame costs seconds in software WebGL. Fixed
      the Chaos setup script, whose second line was not an f-string and
      reached the browser with doubled braces. --only accepts single gallery
      labs by id, so a run can resume or refresh one picture.
    - 2.3.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Added
      --headed, which renders on the GPU, after the headless software run
      proved too slow to finish in Dennis's session. Frames each picture only
      after its app page closes, and clips page screenshots instead of waiting
      for elements to settle, which never happens under a fake clock on a busy
      software renderer. The Chaos picture shows the new phase view.
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
    - Gravity's Solar System in 3D as a pair: the planets out to Saturn,
      and Jupiter followed close enough to part its moons.
    - WebP output with alpha, encoded by the browser itself: no image
      library to install, and pages stay light to load.
    - Writes to docs/media/ by default, with the names the README and
      docs/media/MANIFEST.md use: banner, hero-workspace (Gravity),
      lab-<id> for the six other labs, modes-2d-3d and sol-system.
    - --only captures a subset, down to a single gallery lab, while
      iterating on one picture.

✒ Usage Instructions:
    Start the dev server (npm run dev), then run this from the project root
    with the same Python and Playwright that npm test uses.

✒ Examples:
    $ npm run media
    $ python tools/media.py
    $ python tools/media.py http://localhost:8080/
    $ python tools/media.py --only banner,hero
    $ python tools/media.py --only labs
    $ python tools/media.py --only chaos,banner
    $ python tools/media.py --only sol
    $ python tools/media.py --headed
    $ PP_MEDIA=/tmp/pp-media python tools/media.py
    $ PP_CHROME=/usr/bin/chromium python tools/media.py

✒ Command-Line Arguments:
    Input:
        URL                    Dev server address (default PP_URL, then
                               http://localhost:5173/).
    Processing:
        --only NAMES           Comma-separated subset of banner, hero, labs,
                               modes, sol, or single gallery labs by id
                               (chaos, cloth, collisions, fields, fluid,
                               waves).
        --headed               Open a visible browser that renders on the
                               GPU; much faster than the default headless
                               software rendering.
    Output:
        PP_MEDIA (environment) Output folder (default docs/media).
        PP_CHROME (environment) Browser binary (default Playwright's own).

✒ Other Important Information:
    - Dependencies: Python 3.9+ and Playwright for Python with Chromium (as
      for npm test); Google Fonts reachable for the frame type and glyphs;
      the dev server reachable, with jsDelivr reachable from the browser
    - Compatible platforms: Windows, macOS and Linux
    - Performance: headless runs use software WebGL (SwiftShader), so they
      work anywhere, but the Ultra tier at twice the pixel density is slow:
      tens of minutes on a laptop CPU. --headed uses the GPU and is the
      practical choice on a desktop. Leave the window alone while it runs.
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
# Fake-clock frames rendered after a scene runs, before the picture; each costs seconds in software WebGL.
SETTLE_MS = 600
PP = 'PhysicsPlayground'

# lab id, rail name, scene id, scene label, glyph, simulated seconds before the picture, and a setup script run after
# the scene loads. Chaos shows its phase view with the pointer resting on the map, so the start preview is in frame.
CHAOS_SETUP = (f"{PP}.viewMode('both'); (() => {{ const L = {PP}.active; L.layout(L.size.w, L.size.h); "
               f"const q = L.sq; L.hover = {{ x: q.x0 + q.S * 0.34, y: q.y0 + q.S * 0.64 }}; }})()")
# The cue ball (the last one racked) selected, so the picture shows the head-up display's target box and callout on it.
POOL_SETUP = f"{PP}.active.picked = 15"
LABS = [
    ('gravity', 'Gravity', 'solar', 'Star system', 'orbit', 7.0, None),
    ('collisions', 'Collisions', 'pool', 'Billiard break', 'bubble_chart', 1.6, POOL_SETUP),
    ('fluid', 'Fluid', 'dam', 'Dam break', 'water_drop', 1.4, None),
    ('waves', 'Waves', 'double', 'Double slit', 'airwave', 6.0, None),
    ('chaos', 'Chaos', 'chaos', 'Sensitive start · Pendulum and phase map', 'cyclone', 9.0, CHAOS_SETUP),
    ('cloth', 'Cloth', 'flag', 'Flag in wind', 'texture', 4.0, None),
    ('fields', 'Fields', 'cyclotron', 'Cyclotron motion', 'electric_bolt', 3.0, None),
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

    def __init__(self, p, url, headed=False):
        self.url = url
        # Headless runs use software WebGL, so they work anywhere but render the Ultra tier slowly; a headed window
        # uses the machine's GPU.
        args = ['--no-sandbox'] if headed else ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        self.browser = p.chromium.launch(executable_path=os.environ.get('PP_CHROME') or None, headless=not headed, args=args)
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
        # The rail glyphs animate on CSS time, which the fake clock does not hold; pausing them keeps the software
        # compositor from redrawing a 2880-pixel page while nothing in the picture is moving.
        pg.add_style_tag(content='*, *::before, *::after { animation-play-state: paused !important; }')
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
    def run(pg, scene, seconds, setup=None):
        """Load a scene, simulate it, then let the frame loop draw and the readouts catch up."""
        pg.evaluate(f"{PP}.preset('{scene}')")
        if setup:
            pg.evaluate(setup)
        pg.clock.run_for(200)
        # advance() takes at most maxSteps steps a call and drops the rest, as the frame loop does, so feed it in chunks.
        pg.evaluate(f"""s => {{ const L = {PP}.active, end = L.t + s, chunk = L.dt() * (L.maxSteps || 32);
          while (L.t < end - 1e-9) if (!{PP}.advance(Math.min(chunk, end - L.t))) break; }}""", seconds)
        # 0.6 s of frames: the HUD refreshes every 0.1 s and the readouts every 0.25 s, so this settles them all.
        pg.clock.run_for(SETTLE_MS)

    # ---------- framing ----------
    def frame(self, shots, scale, key='Z'):
        """One or more framed windows side by side, as PNG bytes with alpha. shots: (png, css width, name, scene, glyph,
        tag). key is the keycap shown between windows (the mode switch's Z), or None for none."""
        wins = []
        for i, (png, width, name, scene, glyph, tag) in enumerate(shots):
            if i and key:
                wins.append(f'<span class="key">{key}</span>')
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
        png = pg.screenshot(clip=pg.locator('#shot').bounding_box(), omit_background=True, timeout=180000)
        pg.context.close()
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


def grab(pg, selector=None):
    """A page screenshot, clipped to an element when given one. Element screenshots wait for the element to hold
    still across animation frames, and with the page clock faked those frames never come, so clip instead."""
    clip = pg.locator(selector).bounding_box() if selector else None
    return pg.screenshot(clip=clip, timeout=180000)


def capture_labs(st, want):
    """Hero (the whole workspace on Gravity), banner art, and the stage of each other lab for the gallery. Each app
    page is closed before its pictures are framed, so the framing never competes with a live 3D page."""
    art = None
    for lab, name, scene, label, glyph, seconds, setup in LABS:
        gallery = lab != 'gravity' and ('labs' in want or lab in want)
        if not (gallery or (lab == 'gravity' and {'hero', 'banner'} & want)):
            continue
        log(f'{name}: {label}')
        pg = st.app(lab)
        st.run(pg, scene, seconds, setup)
        hero = grab(pg) if lab == 'gravity' and 'hero' in want else None
        if lab == 'gravity' and 'banner' in want:
            pg.add_style_tag(content='#stage > :not(canvas) { visibility: hidden !important; }')
            pg.clock.run_for(100)
            art = grab(pg, '#stage-canvas')
        tile = (grab(pg, '#stage'), element_width(pg, '#stage')) if gallery else None
        pg.context.close()
        if hero:
            st.webp(st.frame([(hero, VIEW['width'], 'Physics <em>Playground</em>', f'{name} · {label}', 'orbit', '3D · ULTRA')], 1.5), 'hero-workspace')
        if tile:
            st.webp(st.frame([(tile[0], tile[1], name, label, glyph, '3D')], 1), f'lab-{lab}')
    return art


def capture_modes(st):
    """The same moment of the double slit in 2D, then in 3D: the switch leaves the run alone."""
    log('Waves: 2D and 3D')
    pg = st.app('waves', mode='2d')
    st.run(pg, 'double', 6.0)
    pg.evaluate(f'{PP}.pause()')
    pg.clock.run_for(300)
    flat, width = grab(pg, '#stage'), element_width(pg, '#stage')
    pg.evaluate(f"{PP}.mode.set('3d')")
    st.until(pg, f'{PP}.mode.is3D()', 'the 3D world')
    pg.clock.run_for(SETTLE_MS)
    deep = grab(pg, '#stage')
    pg.context.close()
    st.webp(st.frame([(flat, width * 0.62, 'Waves', 'Double slit', 'airwave', '2D'),
                      (deep, width * 0.62, 'Waves', 'Double slit', 'airwave', '3D')], 1), 'modes-2d-3d')


def capture_sol(st):
    """Gravity's Solar System in 3D: the planets out to Saturn a few months in (the run also ticks while the page
    boots), then Jupiter followed close enough that its moons stand clear of it, with the head-up display's target
    box and callout on the planet."""
    log('Gravity: Our Solar System')
    pg = st.app('gravity')
    st.run(pg, 'sol', 0.75)
    wide, width = grab(pg, '#stage'), element_width(pg, '#stage')
    pg.evaluate(f"""(() => {{ const L = {PP}.active, J = L.bodies.find(b => b.name === 'Jupiter');
      L.track = J.id; L.trackEase = 0; {PP}.view.zoomBy(420); }})()""")
    # The camera eases in on real frame time: 0.9 s of frames brings it to within a fraction of a percent.
    pg.clock.run_for(900)
    close = grab(pg, '#stage')
    pg.context.close()
    st.webp(st.frame([(wide, width * 0.62, 'Gravity', 'Our Solar System', 'orbit', '3D'),
                      (close, width * 0.62, 'Gravity', 'Jupiter and its moons', 'orbit', '3D')], 1, key=None), 'sol-system')


def capture_banner(st, art):
    """Title, tagline and the seven labs over a live 3D render of Gravity."""
    log('Banner')
    rail = ''.join(f'<span class="lab{" on" if i == 0 else ""}"><span class="ms">{g}</span>{n}</span>' for i, (_, n, _, _, g, _, _) in enumerate(LABS))
    css = TOKENS + """
    #shot { position: relative; width: 1280px; height: 400px; border-radius: 22px; overflow: hidden; background: var(--ink);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06); }
    #shot::before { content: ''; position: absolute; inset: 0; padding: 2px; border-radius: 22px; z-index: 3; pointer-events: none;
      background: linear-gradient(120deg, var(--amber), color-mix(in oklab, var(--amber) 50%, var(--cyan)) 40%, var(--cyan));
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
    .art { position: absolute; right: -120px; top: -60px; height: 520px; filter: brightness(1.22) saturate(1.1);
      -webkit-mask-image: radial-gradient(70% 82% at 64% 52%, #000 40%, transparent 78%); mask-image: radial-gradient(70% 82% at 64% 52%, #000 40%, transparent 78%); }
    .glow { position: absolute; inset: 0; background: radial-gradient(620px 300px at 6% -10%, color-mix(in oklab, var(--cyan) 13%, transparent), transparent 70%),
      linear-gradient(90deg, var(--ink) 30%, color-mix(in oklab, var(--ink) 55%, transparent) 52%, transparent 70%); }
    .copy { position: absolute; left: 64px; top: 0; bottom: 6px; z-index: 2; width: 720px;
      display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
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
    ap.add_argument('--only', default='banner,hero,labs,modes,sol')
    ap.add_argument('--headed', action='store_true', help='open a visible browser that renders on the GPU (much faster)')
    a = ap.parse_args()
    want = set(a.only.split(','))
    unknown = want - {'banner', 'hero', 'labs', 'modes', 'sol'} - {lab[0] for lab in LABS if lab[0] != 'gravity'}
    if unknown:
        sys.exit(f'unknown picture set: {", ".join(sorted(unknown))}')
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        st = Studio(p, a.url.rstrip('/') + '/', a.headed)
        try:
            art = capture_labs(st, want)
            if 'banner' in want:
                capture_banner(st, art)
            if 'modes' in want:
                capture_modes(st)
            if 'sol' in want:
                capture_sol(st)
        finally:
            st.close()


if __name__ == '__main__':
    main()
