"""
✒ Metadata
    - Title: Solar System Tests (digiSpace Edition - v2.8)
    - File Name: solar.py
    - Relative Path: tests/solar.py
    - Artifact Type: test
    - Version: 2.8.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.8.0 (11/10/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for release 2.8.0: Gravity's Our Solar System scene.

✒ Description:
    Checks Gravity's Our Solar System scene (js/labs/solarsystem.js and the
    multi-scale machinery in js/labs/gravity.js) in the real interface: what
    the scene builds, how faithfully it runs for a simulated year, that its
    names and moons survive rewind and saved states, and how it is drawn in
    2D and 3D.

✒ Key Features:
    - Setup: the Sun, eight planets, Pluto, 17 moons, the dwarf planets,
      Sedna, Halley and 214 belt bodies; 31 bodies with mass, 216 without;
      each moon linked to its planet and given its own substeps.
    - Orbits from the elements: Earth's year and size, Jupiter's tilt,
      Pluto–Charon's 17.14°, the Moon's 5.24°, the Uranian moons' 98° and
      Triton's and Halley's backward orbits.
    - One simulated year: ten real periods within 0.2 %, counted by whole
      turns so eccentric orbits count true; Phobos's orbit unchanged;
      Jupiter's Trojans still at L4 and L5; energy within 2e-7 all year;
      nothing merged or lost.
    - Rewind and saved states keep every name, moon link, radius and floor;
      a tampered state's self-host, cycle, chain or massless host is cut.
    - Display: the date beside the clock, the softening in significant
      figures, the names in the hover readout, moons hidden inside their
      planet until a zoom draws them apart, the head-up display's callout
      clear of the names, and the Orbits and Names switches.
    - Speed: when the run falls behind, the offered fix removes the belts'
      unnamed bodies and keeps every moon.
    - 3D: the first frame reaches Saturn, the near plane follows the camera
      in to a moon, moons hide and appear as in 2D, the target box sits on
      the followed planet, and the orbits are drawn in the scene.

✒ Usage Instructions:
    $ python tests/solar.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
    - The year is stepped in the page, one step at a time, so a moon that
      turns in ten steps is still counted turn by turn.
---------
"""
from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
G = P + ".labs.gravity"
# Real sidereal periods in days (JPL), against which the simulated ones are measured.
PERIODS = {"Mercury": 87.969, "Earth": 365.256, "Moon": 27.3217, "Io": 1.769138, "Europa": 3.551181, "Ganymede": 7.154553,
           "Callisto": 16.689017, "Titan": 15.945, "Triton": 5.876854, "Charon": 6.387221}
MOONS = ["Moon", "Phobos", "Deimos", "Io", "Europa", "Ganymede", "Callisto", "Enceladus", "Rhea", "Titan", "Iapetus",
         "Miranda", "Ariel", "Titania", "Oberon", "Triton", "Charon"]
NAMED = ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
         "Ceres", "Haumea", "Makemake", "Eris", "Sedna", "Halley"] + MOONS
# A body by name, and the tilt of its orbit to the ecliptic about what it circles, in degrees.
HELP = f"""const L = {G}, by = n => L.bodies.find(b => b.name === n);
  const tilt = b => {{ const H = L.pullHost(b), rx = b.x - H.x, ry = b.y - H.y, rz = b.z - H.z, vx = b.vx - H.vx, vy = b.vy - H.vy, vz = b.vz - H.vz;
    const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx; return Math.acos(L.pole() * hz / Math.hypot(hx, hy, hz)) * 180 / Math.PI; }};
  const osc = b => {{ const H = b.host, mu = 5000 * L.p.G * (H.m + b.m), rx = b.x - H.x, ry = b.y - H.y, rz = b.z - H.z, vx = b.vx - H.vx, vy = b.vy - H.vy, vz = b.vz - H.vz;
    const r = Math.hypot(rx, ry, rz), v2 = vx * vx + vy * vy + vz * vz, a = 1 / (2 / r - v2 / mu), h2 = (ry * vz - rz * vy) ** 2 + (rz * vx - rx * vz) ** 2 + (rx * vy - ry * vx) ** 2;
    return {{ a, e: Math.sqrt(Math.max(0, 1 - h2 / (mu * a))) }}; }};"""

with sync_playwright() as p:
    b = launch(p)

    def fresh(mode="2d"):
        """A new page on Gravity's Solar System, paused, in the given mode."""
        pg = open_page(b, mode=mode, viewport=VIEW)
        pg.goto(URL + "#gravity")
        pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === 'gravity'")
        pg.wait_for_timeout(400)
        return pg

    # ---- The scene is offered in the stage's scene menu and builds the whole system
    pg = fresh()
    pg.click("#scene-btn"); pg.click("#preset-gravity-sol"); pg.wait_for_timeout(300)
    pg.evaluate(P + ".pause()")
    s = pg.evaluate(f"""(() => {{ {HELP}
      const B = L.bodies, moons = {MOONS!r};
      return {{ n: B.length, srcs: L.srcs.length, tests: L.tests.length, sub: L.sub, sky: L.sky, missing: {NAMED!r}.filter(n => !by(n)),
        hosts: moons.every(n => by(n).host && by(n).host.name === ({{ Moon: 'Earth', Phobos: 'Mars', Deimos: 'Mars', Io: 'Jupiter', Europa: 'Jupiter', Ganymede: 'Jupiter', Callisto: 'Jupiter',
          Enceladus: 'Saturn', Rhea: 'Saturn', Titan: 'Saturn', Iapetus: 'Saturn', Miranda: 'Uranus', Ariel: 'Uranus', Titania: 'Uranus', Oberon: 'Uranus', Triton: 'Neptune', Charon: 'Pluto' }})[n]),
        moonsListed: L.moons.length, belts: B.filter(b => b.m === 0 && !b.name).length, sunAtCentre: Math.hypot(by('Sun').x, by('Sun').y, by('Sun').z) < 2,
        real: B.every(b => b.real), ringed: B.filter(b => b.ring).map(b => b.name), trails: B.filter(b => b.trail.length).map(b => b.name) }}; }})()""")
    ok("sol_builds_every_body", s["n"] == 247 and not s["missing"] and s["belts"] == 214 and s["real"], s)
    ok("sol_sources_and_test_bodies", s["srcs"] == 31 and s["tests"] == 216 and s["sky"] is True, (s["srcs"], s["tests"]))
    ok("sol_moons_linked_and_substepped", s["hosts"] and s["moonsListed"] == 17 and 2 <= s["sub"] <= 256, (s["moonsListed"], s["sub"]))
    ok("sol_sun_ring_trails", s["sunAtCentre"] and s["ringed"] == ["Saturn"] and "Sun" not in s["trails"] and "Io" not in s["trails"] and "Earth" in s["trails"] and "Halley" in s["trails"],
       (s["ringed"], s["trails"]))

    # ---- Orbits from the elements: sizes, periods and tilts as Inspect reports them
    rows = pg.evaluate(f"""(() => {{ {HELP} L.track = by('Earth').id; const r = Object.fromEntries(L.inspect().rows.map(q => [q[0], q[1]])), i = L.inspect(); L.track = null;
      return {{ r, title: i.title, short: i.short, focus: i.focus }}; }})()""")
    ok("sol_earth_inspect", rows["short"] == "Earth" and rows["focus"] == "Distance from the Sun" and rows["r"].get("Orbit size") == "1.00 AU"
       and rows["r"].get("Time for one orbit") == "1.00 yr" and rows["r"].get("Radius") == "6371 km" and rows["r"].get("Orbit tilt") == "0.0°", rows)
    io = pg.evaluate(f"""(() => {{ {HELP} L.track = by('Io').id; const i = L.inspect(); L.track = null; return {{ title: i.title, focus: i.focus }}; }})()""")
    ok("sol_moon_inspects_about_its_planet", io == {"title": "Moon of Jupiter", "focus": "Distance from Jupiter"}, io)
    # Pluto's own orbit wobbles as it swings round Charon; the elements are the pair's, so its barycentre is measured.
    t = pg.evaluate(f"""(() => {{ {HELP} const pl = by('Pluto'), ch = by('Charon'), M = pl.m + ch.m, w = (k) => (pl[k] * pl.m + ch[k] * ch.m) / M;
      const pc = {{ x: w('x'), y: w('y'), z: w('z'), vx: w('vx'), vy: w('vy'), vz: w('vz'), m: M }};
      const out = Object.fromEntries(['Jupiter', 'Miranda', 'Oberon', 'Triton', 'Halley', 'Moon'].map(n => [n, +tilt(by(n)).toFixed(2)]));
      out.Pluto = +tilt(pc).toFixed(2); return out; }})()""")
    ok("sol_tilts_to_the_ecliptic", abs(t["Jupiter"] - 1.30) < 0.05 and abs(t["Pluto"] - 17.14) < 0.05 and 97 < t["Miranda"] < 99.5 and 97 < t["Oberon"] < 99.5
       and t["Triton"] > 120 and abs(t["Halley"] - 162.26) < 0.2 and abs(t["Moon"] - 5.24) < 0.05, t)

    # ---- One simulated year, stepped one step at a time
    yr = pg.evaluate(f"""(() => {{ {HELP}
      const REAL = {PERIODS!r}, sun = by('Sun'), yr = 2 * Math.PI * Math.sqrt(135 ** 3 / (5000 * 1000));
      const W = Object.keys(REAL).map(n => {{ const q = by(n); return {{ n, b: q, h: q.host || sun, acc: 0, prev: null, turns: 0, tTurn: 0 }}; }});
      const rel = w => [w.b.x - w.h.x, w.b.y - w.h.y, w.b.z - w.h.z];
      for (const w of W) w.prev = rel(w);
      const lon = q => Math.atan2(-(q.y - sun.y), q.x - sun.x) * 180 / Math.PI, J = by('Jupiter');
      const troj = L.bodies.filter(q => q.desc && q.desc.startsWith('Jupiter Trojan')), side = () => troj.map(q => ((lon(q) - lon(J) + 540) % 360) - 180);
      const at0 = side(), ph0 = osc(by('Phobos')), E0 = L.energy(), t0 = L.t; let k = 0, worst = 0;
      while (L.t - t0 < yr * 1.03) {{
        L.step(L.dt()); L.t += L.dt(); k++;
        if (k % 48 === 0) L.after();
        if (k % 24 === 0) {{ const d = (L.energy() - E0) / Math.abs(E0); if (Math.abs(d) > Math.abs(worst)) worst = d; }}
        for (const w of W) {{ const r = rel(w), q = w.prev, cx = q[1] * r[2] - q[2] * r[1], cy = q[2] * r[0] - q[0] * r[2], cz = q[0] * r[1] - q[1] * r[0];
          const d = Math.atan2(Math.hypot(cx, cy, cz), q[0] * r[0] + q[1] * r[1] + q[2] * r[2]);
          // A completed turn is placed inside the step by the share of the step's angle it needed.
          if (w.acc + d >= 2 * Math.PI * (w.turns + 1)) {{ w.tTurn = L.t - t0 - L.dt() * (1 - (2 * Math.PI * (w.turns + 1) - w.acc) / d); w.turns++; }}
          w.acc += d; w.prev = r; }}
      }}
      const err = {{}};
      for (const w of W) err[w.n] = +((w.tTurn / w.turns / yr * 365.25 / REAL[w.n] - 1) * 100).toFixed(3);
      const at1 = side(), ph1 = osc(by('Phobos'));
      return {{ err, drift: (L.energy() - E0) / Math.abs(E0), worst, n: L.bodies.length, merged: L.merged, escaped: L.escaped,
        start: [Math.min(...at0), Math.max(...at0)], L4: at1.filter(d => d > 0).length, L5: at1.filter(d => d < 0).length,
        lo4: Math.min(...at1.filter(d => d > 0)), hi4: Math.max(...at1.filter(d => d > 0)), lo5: Math.min(...at1.filter(d => d < 0)), hi5: Math.max(...at1.filter(d => d < 0)),
        phobos: [ph1.a / ph0.a - 1, ph1.e - ph0.e] }}; }})()""")
    ok("sol_year_periods_within_0p2pct", all(abs(v) < 0.2 for v in yr["err"].values()), yr["err"])
    # Leapfrog's energy swings and returns rather than drifting; here the swing is Mercury's perihelion passage, about
    # 8e-8 of the total. The largest error sampled through the year must stay inside it, and the error at the end too.
    ok("sol_year_energy_kept", abs(yr["worst"]) < 2e-7 and abs(yr["drift"]) <= abs(yr["worst"]), (yr["worst"], yr["drift"]))
    ok("sol_year_nothing_lost", yr["n"] == 247 and yr["merged"] == 0 and yr["escaped"] == 0, (yr["n"], yr["merged"], yr["escaped"]))
    ok("sol_year_phobos_orbit_holds", abs(yr["phobos"][0]) < 1e-3 and abs(yr["phobos"][1]) < 2e-3, yr["phobos"])
    ok("sol_year_trojans_at_L4_L5", yr["L4"] == 16 and yr["L5"] == 14 and 25 < yr["lo4"] and yr["hi4"] < 95 and -95 < yr["lo5"] and yr["hi5"] < -25,
       {k: yr[k] for k in ("L4", "L5", "lo4", "hi4", "lo5", "hi5")})

    # ---- Rewind and saved states keep names, moons, radii and floors
    keep = pg.evaluate(f"""(() => {{ {HELP}
      const sig = () => L.bodies.map(q => [q.id, q.name || '', q.desc || '', q.host ? q.host.id : 0, q.r, q.px || 0, q.real, q.label, q.ring, q.noTrail, q.m].join('|')).join(';');
      const before = sig(), E = L.energy(), snap = L.snapshot();
      for (let k = 0; k < 40; k++) {{ L.step(L.dt()); L.t += L.dt(); }}
      L.restore(snap); const rewound = sig() === before && L.moons.length === 17 && L.tests.length === 216 && L.sub > 1;
      const text = JSON.stringify(L.serialize()); L.bodies = []; L.accDirty = true;
      L.deserialize(JSON.parse(text));
      return {{ rewound, saved: sig() === before, moons: L.moons.length, tests: L.tests.length, sub: L.sub, dE: Math.abs(L.energy() - E) / Math.abs(E) }}; }})()""")
    ok("sol_rewind_keeps_names_and_moons", keep["rewound"], keep)
    ok("sol_saved_state_round_trip", keep["saved"] and keep["moons"] == 17 and keep["tests"] == 216 and keep["sub"] > 1 and keep["dE"] < 1e-12, keep)
    bad = pg.evaluate(f"""(() => {{ const o = {G}.serialize(), q = o.bodies.find(d => d.meta && d.meta.name === 'Io');
      Object.assign(q.meta, {{ name: 'x'.repeat(500), px: 1e9, r: -4, hostId: 'Jupiter', tint: [1, 2], extra: 'nope' }});
      {G}.deserialize(o); const io = {G}.bodies.find(b => b.id === q.id);
      return {{ name: io.name.length, px: io.px ?? null, host: io.host ?? null, meta: Object.keys(io.meta).includes('extra') }}; }})()""")
    ok("sol_saved_state_meta_checked", bad == {"name": 40, "px": None, "host": None, "meta": False}, bad)
    # Host links in a tampered state: Io its own host, Europa and Ganymede each other's, Jupiter a moon of the Sun
    # (which would make Callisto a moon's moon), Titan a moon of a massless belt body. Only valid links survive.
    pg.evaluate(P + ".preset('sol')"); pg.evaluate(P + ".pause()")
    links = pg.evaluate(f"""(() => {{ const L = {G}, o = L.serialize(), by = n => o.bodies.find(d => d.meta && d.meta.name === n), belt = o.bodies.find(d => d.m === 0 && !(d.meta && d.meta.name));
      by('Io').meta.hostId = by('Io').id; by('Europa').meta.hostId = by('Ganymede').id; by('Ganymede').meta.hostId = by('Europa').id;
      by('Jupiter').meta.hostId = by('Sun').id; by('Titan').meta.hostId = belt.id;
      L.deserialize(o); const B = L.bodies, named = n => B.find(b => b.name === n), host = n => (named(n).host || {{}}).name || null;
      for (let k = 0; k < 20; k++) {{ L.step(L.dt()); L.t += L.dt(); }}
      return {{ self: B.some(b => b.host === b), chain: B.some(b => b.host && b.host.host), heavier: B.every(b => !b.host || b.host.m > b.m),
        io: host('Io'), europa: host('Europa'), ganymede: host('Ganymede'), jupiter: host('Jupiter'), callisto: host('Callisto'), titan: host('Titan'),
        moon: host('Moon'), sub: L.sub, finite: L.sane() && Number.isFinite(L.energy()) }}; }})()""")
    ok("sol_saved_state_host_links_checked", links["self"] is False and links["chain"] is False and links["heavier"] is True and links["io"] is None
       and links["ganymede"] is None and links["europa"] == "Ganymede" and links["jupiter"] == "Sun" and links["callisto"] is None
       and links["titan"] is None and links["moon"] == "Earth" and links["sub"] == 80 and links["finite"] is True, links)

    # ---- Display: the date, the softening, the hover readout, moons hidden in their planet, the switches
    pg.evaluate(P + ".preset('sol')"); pg.evaluate(P + ".pause()"); pg.wait_for_timeout(300)
    note = pg.evaluate(f"[{G}.timeNote(0), {G}.timeNote(4.5)]")
    # The chip refreshes every 0.1 s of frame time; after a long in-page computation, wait for the reloaded run's.
    settle(pg, "document.getElementById('hud-time').textContent.startsWith('t = 0.00 s')", 8000)
    clock = pg.inner_text("#hud-time")
    ok("sol_clock_reads_the_date", note[0].endswith("Jan 2000") and note[1].endswith("Jan 2001") and "Jan 2000" in clock, (note, clock))
    soft = [pg.inner_text("#ctl-gravity-soft-out")]
    pg.evaluate(P + ".units.set('sim')"); pg.wait_for_timeout(200); soft.append(pg.inner_text("#ctl-gravity-soft-out")); soft.append(pg.evaluate(f"{G}.timeNote(1)"))
    pg.evaluate(P + ".units.set('si')"); pg.wait_for_timeout(200)
    ok("sol_softening_in_significant_figures", soft[:2] == ["7.41e-7 AU", "0.000100 px"] and soft[2] == "", soft)
    hov = pg.evaluate(f"""(() => {{ {HELP} const belt = L.bodies.find(q => q.m === 0 && !q.name); return [L.hoverText(by('Io')), L.hoverText(belt)]; }})()""")
    ok("sol_hover_names_the_body", hov[0].startswith("Io · ") and "Jupiter masses" not in hov[1] and hov[1].count("·") == 0 and hov[1].endswith("km/s"), hov)
    hid = pg.evaluate(f"""(async () => {{ {HELP} const io = by('Io'), J = by('Jupiter'), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await frame(); const z0 = L.viewXf.z, far = L.apart(io, z0), {{ ox, oy }} = L.viewXf, pick = L.bodyAt({{ x: io.x * z0 + ox, y: io.y * z0 + oy }}, 10);
      L.track = J.id; L.trackEase = 1; {P}.view.zoomBy(400); await frame(); await new Promise(r => setTimeout(r, 900)); await frame();
      const z1 = L.viewXf.z, near = L.apart(io, z1), o = L.viewXf, pick2 = L.bodyAt({{ x: io.x * z1 + o.ox, y: io.y * z1 + o.oy }}, 4);
      return {{ far, picked: pick && pick.name, near, picked2: pick2 && pick2.name, z0, z1 }}; }})()""")
    ok("sol_moon_hidden_in_planet_until_apart", hid["far"] is False and hid["picked"] != "Io" and hid["near"] is True and hid["picked2"] == "Io", hid)
    # Still on Jupiter with its moons named: the head-up display's callout sits clear of every name drawn.
    clear = pg.evaluate(f"""(async () => {{ const L = {G}; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = document.getElementById('stage').getBoundingClientRect(), c = document.getElementById('hu-card').getBoundingClientRect();
      const box = {{ l: c.left - s.left, t: c.top - s.top, r: c.right - s.left, b: c.bottom - s.top }}, N = L.hudClear || [];
      const hit = N.filter(q => Math.min(q.r, box.r) > Math.max(q.l, box.l) && Math.min(q.b, box.b) > Math.max(q.t, box.t)).length;
      return {{ names: N.length, hit, shown: getComputedStyle(document.getElementById('hu-card')).visibility }}; }})()""")
    ok("sol_hud_callout_clear_of_names", clear["names"] >= 3 and clear["hit"] == 0 and clear["shown"] == "visible", clear)
    fix = pg.evaluate(f"""(() => {{ {HELP} const f = L.perfFixes(); f[0].run(); L.computeAcc();
      return {{ labels: f.map(q => q.label), n: L.bodies.length, named: {NAMED!r}.every(n => by(n)), tests: L.tests.length, moons: L.moons.length }}; }})()""")
    ok("sol_speed_fix_keeps_every_named_body", fix == {"labels": ["Remove the 214 belt bodies"], "n": 33, "named": True, "tests": 2, "moons": 17}, fix)
    pg.evaluate(P + ".preset('sol')"); pg.wait_for_timeout(200)
    sw = pg.evaluate("""(() => ['orbits', 'labels'].map(k => document.getElementById('ctl-gravity-' + k)).map(e => e && [e.getAttribute('aria-checked'), e.textContent.trim()]))()""")
    pg.click("#ctl-gravity-orbits"); off = pg.evaluate(f"{G}.p.orbits"); pg.click("#ctl-gravity-orbits")
    pg.evaluate(P + ".preset('kepler')"); pg.wait_for_timeout(200); other = pg.evaluate(f"[{G}.p.orbits, {G}.sky, {G}.sub]")
    ok("sol_orbits_and_names_switches", sw == [["true", "Orbits"], ["true", "Names"]] and off is False and other == [False, False, 0], (sw, off, other))
    pg.close()

    # ---- 3D: framing, the near plane, hidden moons, the target box and orbits in the scene
    pg = fresh("3d")
    pg.evaluate(P + ".preset('sol')"); pg.wait_for_timeout(300)
    settle(pg, f"{P}.mode.world.engine && {P}.mode.world.engine.info().calls > 0")
    pg.wait_for_timeout(1500)
    f3 = pg.evaluate(f"""(() => {{ {HELP} const W = innerWidth, H = innerHeight;
      const on = n => {{ const q = by(n), s = L.project3(q.x, q.y, q.z); return !!s && s.x > 0 && s.y > 0 && s.x < L.basis3().w && s.y < L.basis3().h; }};
      return {{ inner: ['Mercury', 'Earth', 'Mars', 'Jupiter', 'Saturn'].map(on), io: L.apart3(by('Io')), near: L.camMatrices(800, 600).near }}; }})()""")
    ok("sol_3d_first_frame_reaches_saturn", all(f3["inner"]) and f3["io"] is False, f3)
    tri = [pg.evaluate(f"{P}.mode.world.engine.info().triangles")]
    pg.evaluate(f"{P}.setParam('orbits', false)"); pg.wait_for_timeout(400); tri.append(pg.evaluate(f"{P}.mode.world.engine.info().triangles"))
    pg.evaluate(f"{P}.setParam('orbits', true)"); pg.wait_for_timeout(300)
    ok("sol_3d_orbits_drawn_in_scene", tri[0] - tri[1] > 2000, tri)
    # Close enough to Jupiter that Io is on the stage and drawn apart, then all the way in.
    ZOOM = f"""async n => {{ {HELP} for (let k = 0; k < n; k++) {{ {P}.view.zoomBy(3); await new Promise(r => setTimeout(r, 120)); }}
      await new Promise(r => setTimeout(r, 1500)); const J = by('Jupiter'), io = by('Io'), t = L.hudTarget(true), s = L.project3(J.x, J.y, J.z), si = L.project3(io.x, io.y, io.z), V = L.basis3();
      return {{ near: V.near, dist: L.c3().dist, apart: L.apart3(io), ioOn: !!si && si.x > 0 && si.y > 0 && si.x < V.w && si.y < V.h,
        box: t && Math.hypot(t.x - s.x, t.y - s.y), r: t && t.r, px: J.px }}; }}"""
    pg.evaluate(f"(() => {{ const L = {G}, J = L.bodies.find(b => b.name === 'Jupiter'); L.track = J.id; L.trackEase = 0; }})()")
    z = pg.evaluate(ZOOM, 6)
    ok("sol_3d_moons_appear_when_apart", z["apart"] is True and z["ioOn"] is True, z)
    ok("sol_3d_target_on_followed_planet", z["box"] is not None and z["box"] < 1 and z["r"] >= z["px"], z)
    z = pg.evaluate(ZOOM, 8)
    ok("sol_3d_near_plane_follows_in", z["near"] < 1e-2 and z["near"] <= z["dist"] * 0.0041, z)
    pg.close()

    b.close()
finish()
