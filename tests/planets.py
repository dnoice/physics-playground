"""
✒ Metadata
    - Title: Planet Classes Tests (digiSpace Edition - v2.18)
    - File Name: planets.py
    - Relative Path: tests/planets.py
    - Artifact Type: test
    - Version: 2.18.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.18.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Climate
      from starlight: luminosity from mass; a close-in rocky world molten and
      locked, a far one frozen, an Earth at 1 AU temperate, an eyeball world
      about a red dwarf and a hothouse; every star's light summed; the lag; an
      Earth pushed inward turning hothouse; Inspect's rows in each unit
      system; rewind, saved states and tracks; and in 3D the climate in the
      material, a locked face toward its star and lava in the portrait.
    - 2.14.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      mergers_keep_their_composition adds a moon that takes in a comet, which
      stays a moon, and one that takes in a planet, classed by mass.
    - 2.12.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Star
      system has every class, seven colours, every surface, rings on the pale
      giant only and a moon on each giant; random giants take several hues and
      some wear rings.
    - 2.9.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for release 2.9.0: Gravity's planet classes from the research
      reference.

✒ Description:
    Checks Gravity's planet classes and the physical models behind them
    against the research reference they come from
    (docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md): its dataset,
    its class boundaries and mass-radius relations, and its worked values.

✒ Key Features:
    - By mass: the reference's 22 benchmark planets (Table 5.1) take their
      own class, but for the three rocky super-Earths above 4.37 Earth
      masses, where mass alone cannot tell rock from an envelope; every
      boundary falls where the reference puts it.
    - Mass-radius (Model 4.4.3): the rocky, volatile and cold-giant branches
      against measured radii, and Jupiter's mass giving Jupiter's radius.
    - Inspect for the Solar System: density, gravity and escape speed
      against the reference's Table 5.1; Jupiter's Hill sphere against its
      53.1 Gm benchmark; Phobos inside Mars's Roche limit and the Moon
      outside Earth's.
    - The IAU mass ratio, mergers that keep their composition, the type
      and mass controls kept consistent, US units, old saved states, and the
      classes of the Solar System and the Star system.
    - Climate from starlight: molten and locked close in, frozen far out,
      temperate at 1 AU, an eyeball world and a hothouse; every star's light,
      the lag, a runaway greenhouse, Inspect's rows, rewind, saved states
      and tracks; in 3D the climate in the material, a locked face toward its
      star and lava in the portrait.

✒ Usage Instructions:
    $ python tests/planets.py
    Needs the dev server. run_all.py runs it with the other suites.

✒ Other Important Information:
    - Dependencies: playwright
    - Compatible platforms: Python 3.9+ with Playwright for Python on
      Windows, macOS and Linux
    - Reference values are copied from the reference's tables and worked
      examples, so a model change that drifts from the research fails here.
---------
"""
import re

from playwright.sync_api import sync_playwright
from harness import URL, finish, launch, ok, open_page, settle

VIEW = {"width": 1440, "height": 900}
P = "PhysicsPlayground"
G = P + ".labs.gravity"
# The reference's Table 5.1: mass in Earth masses, mean radius in Earth radii, and its class.
DATASET = [
    ("Mercury", 0.0553, 0.3829, "terrestrial"), ("Venus", 0.8150, 0.9499, "terrestrial"), ("Earth", 1.0, 1.0, "terrestrial"),
    ("Mars", 0.1074, 0.5320, "terrestrial"), ("TRAPPIST-1 d", 0.388, 0.770, "terrestrial"), ("TRAPPIST-1 e", 0.692, 0.920, "terrestrial"),
    ("TRAPPIST-1 b", 1.374, 1.116, "terrestrial"), ("TOI-1452 b", 4.82, 1.672, "superEarth"), ("LHS 1140 b", 5.60, 1.730, "superEarth"),
    ("55 Cancri e", 7.99, 1.88, "superEarth"), ("TOI-270 d", 4.78, 2.133, "subNeptune"), ("GJ 1214 b", 8.17, 2.74, "subNeptune"),
    ("K2-18 b", 8.63, 2.610, "subNeptune"), ("Uranus", 14.536, 3.981, "ice"), ("Neptune", 17.148, 3.865, "ice"),
    ("GJ 436 b", 22.2, 4.10, "ice"), ("HAT-P-11 b", 25.7, 4.73, "ice"), ("WASP-39 b", 89.0, 14.23, "gas"), ("Saturn", 95.16, 9.140, "gas"),
    ("HD 209458 b", 217.7, 15.23, "gas"), ("Jupiter", 317.83, 10.973, "gas"), ("HD 189733 b", 363.6, 12.75, "gas"),
]
# Rocky super-Earths heavier than the 4.37 Earth-mass turn to gas envelopes: by mass, the population's sub-Neptunes.
DEGENERATE = {"TOI-1452 b", "LHS 1140 b", "55 Cancri e"}
num = lambda text: float(re.sub(r"[^0-9.eE+-]", "", text.split(" ")[0] if not text.startswith("≈") else text.split(" ")[1]))
near = lambda v, want, tol: abs(v / want - 1) <= tol

with sync_playwright() as p:
    b = launch(p)
    pg = open_page(b, viewport=VIEW)
    pg.goto(URL + "#gravity")
    pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === 'gravity'")
    pg.wait_for_timeout(400)
    pg.evaluate(P + ".pause()")

    # ---- By mass, against the reference's dataset and boundaries
    got = pg.evaluate(f"rows => rows.map(([n, me]) => [n, {G}.kindOf(me * {G}.EARTH)])", DATASET)
    want = {n: ("subNeptune" if n in DEGENERATE else k) for n, _, _, k in DATASET}
    ok("by_mass_matches_reference_dataset", dict(got) == want, [g for g in got if want[g[0]] != g[1]])
    se = pg.evaluate(f"[{G}.KINDS.superEarth.me, {G}.KINDS.subNeptune.me]")
    ok("rocky_super_earths_remain_choosable", all(se[0][0] <= m <= se[0][1] for n, m, _, _ in DATASET if n in DEGENERATE) and se == [[1.5, 10], [3, 15]], se)
    edges = pg.evaluate(f"""(() => {{ const L = {G}, E = L.EARTH, J = L.JUP, k = m => L.kindOf(m);
      return [[1.5 * E * 0.999, 1.5 * E], [4.37 * E * 0.999, 4.37 * E], [10 * E * 0.999, 10 * E], [50 * E * 0.999, 50 * E], [13 * J * 0.999, 13 * J], [80, 80.01]].map(([a, b]) => [k(a), k(b)]); }})()""")
    ok("class_boundaries_where_the_reference_puts_them", edges == [["terrestrial", "superEarth"], ["superEarth", "subNeptune"], ["subNeptune", "ice"], ["ice", "gas"], ["gas", "brown"], ["brown", "star"]], edges)

    # ---- Mass-radius (Model 4.4.3)
    rad = pg.evaluate(f"rows => rows.map(([n, me, r, k]) => [n, {G}.planetRadius(me * {G}.EARTH, k), r])", DATASET)
    off = {n: round(v / r - 1, 3) for n, v, r in rad}
    rocky = [n for n, _, _, k in DATASET if k in ("terrestrial", "superEarth") and n != "Mercury"]
    ok("rocky_branch_fits_rocky_worlds", all(abs(off[n]) < 0.07 for n in rocky) and abs(off["55 Cancri e"]) < 0.01, {n: off[n] for n in rocky})
    ok("volatile_branch_fits_ice_giants", all(abs(off[n]) < 0.16 for n in ("Uranus", "Neptune", "GJ 436 b", "HAT-P-11 b")), {n: off[n] for n in ("Uranus", "Neptune", "GJ 436 b", "HAT-P-11 b")})
    giant = pg.evaluate(f"""(() => {{ const L = {G}, E = L.EARTH, J = L.JUP; return {{ jup: L.planetRadius(J, 'gas'), heavy: L.planetRadius(13 * J * 0.999, 'gas'), light: L.planetRadius(50 * E, 'gas'),
      brown: L.planetRadius(20, 'brown'), star: L.planetRadius(1000, 'star') }}; }})()""")
    rj = 71492 / 6371
    ok("cold_giant_curve_through_jupiter", abs(giant["jup"] - rj) < 1e-9 and abs(giant["heavy"] - 0.9 * rj) < 1e-9 and abs(giant["light"] - 0.56 * 50 ** 0.67) < 1e-9 and giant["brown"] is None and giant["star"] is None, giant)

    # ---- Inspect on the Solar System, against Table 5.1
    pg.evaluate(P + ".preset('sol')"); pg.evaluate(P + ".pause()"); pg.wait_for_timeout(200)
    ROWS = f"""n => {{ const L = {G}, b = L.bodies.find(q => q.name === n); L.track = b.id; const r = Object.fromEntries(L.inspect().rows.map(x => [x[0], x[1]])); L.track = null; return r; }}"""
    real = {n: pg.evaluate(ROWS, n) for n in ("Jupiter", "Saturn", "Earth", "Mars", "Uranus", "Neptune", "Phobos", "Moon", "Sun")}
    TABLE = {"Jupiter": (1326.2, 25.92, 60.2), "Saturn": (687.1, 11.19, None), "Earth": (5513, 9.82, 11.19), "Mars": (3934, 3.73, 5.03), "Uranus": (1270, 9.01, None), "Neptune": (1638, 11.27, None)}
    bad = {}
    for n, (rho, g, v) in TABLE.items():
        r = real[n]; gk = "Cloud-top gravity" if n in ("Jupiter", "Saturn", "Uranus", "Neptune") else "Surface gravity"
        if not (near(num(r["Density"]), rho, 0.006) and gk in r and near(num(r[gk]), g, 0.006) and (v is None or near(num(r["Escape speed"]), v, 0.006))):
            bad[n] = (r.get("Density"), r.get(gk), r.get("Escape speed"))
    ok("inspect_matches_reference_table", not bad, bad)
    ok("sun_from_its_real_radius", near(num(real["Sun"]["Density"]), 1408, 0.005) and near(num(real["Sun"]["Surface gravity"]), 274, 0.005) and "Radius of this body" not in real["Sun"], real["Sun"])
    hill = pg.evaluate(f"""(() => {{ const L = {G}, J = L.bodies.find(q => q.name === 'Jupiter'), S = L.bodies.find(q => q.name === 'Sun'), mu = 5000 * L.p.G * (S.m + J.m);
      const rx = J.x - S.x, ry = J.y - S.y, rz = J.z - S.z, vx = J.vx - S.vx, vy = J.vy - S.vy, vz = J.vz - S.vz, r = Math.hypot(rx, ry, rz), v2 = vx * vx + vy * vy + vz * vz, a = 1 / (2 / r - v2 / mu);
      const h2 = (ry * vz - rz * vy) ** 2 + (rz * vx - rx * vz) ** 2 + (rx * vy - ry * vx) ** 2, e = Math.sqrt(1 - h2 / (mu * a)), k = Math.cbrt(J.m / (3 * (S.m + J.m)));
      return {{ want: a * (1 - e) * k / 135, k, bench: 5.20285 * 1.495978707e11 * k / 1e9 }}; }})()""")
    ok("hill_sphere_jupiter", near(num(real["Jupiter"]["Hill sphere"]), hill["want"], 0.005) and near(hill["bench"], 53.1, 0.002), (real["Jupiter"]["Hill sphere"], hill))
    ok("roche_phobos_inside_moon_outside", real["Phobos"]["Roche limit of Mars"].endswith("and it is inside") and "inside" not in real["Moon"]["Roche limit of Earth"]
       and near(num(real["Moon"]["Roche limit of Earth"]), 2.456 * 6371 * (5514 / 3342) ** (1 / 3), 0.01), (real["Phobos"]["Roche limit of Mars"], real["Moon"]["Roche limit of Earth"]))
    pg.evaluate(P + ".units.set('us')"); pg.wait_for_timeout(150)
    us = pg.evaluate(ROWS, "Jupiter")
    pg.evaluate(P + ".units.set('si')"); pg.wait_for_timeout(150)
    ok("us_units", us["Radius"].endswith(" mi") and us["Density"].endswith(" lb/ft³") and near(num(us["Cloud-top gravity"]), 25.92 * 3.28084, 0.006) and us["Escape speed"].endswith(" mi/s"), us)
    cls = pg.evaluate(f"""(() => {{ const L = {G}, by = n => L.bodies.find(q => q.name === n);
      return Object.fromEntries(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Moon', 'Io', 'Enceladus'].map(n => [n, by(n).kind]).concat([['earthLook', L.surfaceOf(by('Earth'))], ['marsLook', L.surfaceOf(by('Mars'))]])); }})()""")
    ok("solar_system_classes", cls == {"Mercury": "terrestrial", "Venus": "terrestrial", "Earth": "terrestrial", "Mars": "terrestrial", "Jupiter": "gas", "Saturn": "gas", "Uranus": "ice",
                                       "Neptune": "ice", "Pluto": "dwarf", "Moon": "moon", "Io": "moon", "Enceladus": "icy", "earthLook": 1, "marsLook": 0}, cls)

    # ---- The sandbox: the Star system by mass, the IAU ratio, mergers
    pg.evaluate(P + ".preset('solar')"); pg.evaluate(P + ".pause()"); pg.wait_for_timeout(200)
    # Every class, each world its own: by distance, two rocky worlds either side of a super-Earth, a sub-Neptune, two
    # gas giants and an ice giant; seven colours, every surface (rock, ocean, banded, calm), rings on the pale giant
    # only, and a moon for each giant.
    star = pg.evaluate(f"""(() => {{ const L = {G}, S = L.bodies[0], d = b => Math.hypot(b.x - S.x, b.y - S.y), P = L.bodies.filter(b => !['star', 'moon', 'comet'].includes(b.kind)).sort((a, b) => d(a) - d(b));
      return {{ kinds: P.map(b => b.kind), colours: new Set(P.map(b => L.bodyColor3(b))).size, surfaces: [...new Set(P.map(b => L.surfaceOf(b)))].sort(), ringed: P.map(b => L.ringed(b)),
        moons: L.bodies.filter(b => b.kind === 'moon').map(m => P.reduce((a, b) => (Math.hypot(m.x - b.x, m.y - b.y) < Math.hypot(m.x - a.x, m.y - a.y) ? b : a)).kind), soft: L.p.soft }}; }})()""")
    ok("star_system_has_every_class", star["kinds"] == ["terrestrial", "superEarth", "terrestrial", "subNeptune", "gas", "gas", "ice"], star["kinds"])
    ok("star_system_worlds_look_different", star["colours"] == 7 and star["surfaces"] == [0, 1, 2, 3] and star["ringed"] == [False] * 5 + [True, False], star)
    ok("star_system_giants_have_moons", sorted(star["moons"]) == ["gas", "gas", "ice"] and star["soft"] == 1, star["moons"])
    # Random worlds vary too: the accretion disk's giants take several hues, and some wear rings.
    var = pg.evaluate(f"""(() => {{ const L = {G}, B = Array.from({{ length: 60 }}, () => L.body(0, 0, 0, 0, 1)), hues = new Set(B.map(b => L.KINDS.gas.hues.findIndex(h => {{ const c = L.bodyRgb(b), k = c[0] / h[0]; return Math.abs(c[1] / h[1] - k) < 0.02 && Math.abs(c[2] / h[2] - k) < 0.02; }})));
      return {{ hues: hues.size, unknown: hues.has(-1), ringed: B.filter(L.ringed).length }}; }})()""")
    ok("random_giants_vary", var["hues"] >= 4 and not var["unknown"] and 8 <= var["ringed"] <= 40, var)
    iau = pg.evaluate(f"""(() => {{ const L = {G}, flag = M => {{ const s = L.body(5000, 0, 0, 0, M); L.bodies.push(s); const g = L.orbit(s, 120, 0, 12); L.track = g.id;
      const r = L.inspect().rows.find(x => x[0] === 'Planet by IAU rules'); L.bodies = L.bodies.filter(q => q !== s && q !== g); L.track = null; L.accDirty = true; return [g.kind, r ? r[1] : null]; }};
      return [flag(250), flag(1000)]; }})()""")
    ok("iau_mass_ratio_flag", iau[0][0] == "gas" and iau[0][1] == "no: 4.8 % of its star's mass" and iau[1][1] is None, iau)
    mg = pg.evaluate(f"""(() => {{ const L = {G}, E = L.EARTH, m = (k1, m1, k2, m2) => {{ const a = {{ kind: k1, m: m1 * E }}, b = {{ kind: k2, m: m2 * E }}, [big, small] = a.m >= b.m ? [a, b] : [b, a]; return L.mergedKind(big, small, a.m + b.m); }};
      return [m('superEarth', 7, 'superEarth', 6), m('terrestrial', 1, 'terrestrial', 0.8), m('terrestrial', 1, 'subNeptune', 5), m('subNeptune', 8, 'subNeptune', 7), m('ice', 30, 'ice', 25),
        m('gas', 4000, 'gas', 1000), m('brown', 25000, 'brown', 4000), m('gas', 300, 'terrestrial', 1), m('moon', 0.1, 'comet', 0), m('moon', 0.1, 'terrestrial', 0.05)]; }})()""")
    # A small world keeps its class when it takes in another small world (a moon hit by a comet stays a moon), and is
    # classed by mass as before when it takes in a planet.
    ok("mergers_keep_their_composition", mg == ["superEarth", "superEarth", "subNeptune", "ice", "gas", "brown", "star", "gas", "moon", "terrestrial"], mg)

    # ---- The controls: seven types, a dial down to terrestrial masses, type and mass kept consistent
    pg.click("#tab-gravity"); pg.wait_for_timeout(200)
    seg = pg.evaluate("[...document.querySelectorAll('[id^=\"ctl-gravity-kind-\"]')].map(b => b.textContent)")
    ok("type_buttons", seg == ["By mass", "Terrestrial", "Super-Earth", "Sub-Neptune", "Ice giant", "Gas giant", "Brown dwarf"], seg)
    lo = pg.evaluate(f"{G}.controls.find(c => c.key === 'launchMass').min / {G}.EARTH")
    ok("mass_dial_reaches_terrestrial_masses", abs(lo - 0.02) < 1e-9, lo)
    pg.locator("#ctl-gravity-kind-terrestrial").scroll_into_view_if_needed()
    steps = []
    pg.click("#ctl-gravity-kind-terrestrial"); steps.append(pg.evaluate(f"[{G}.p.kind, +({G}.p.launchMass / {G}.EARTH).toFixed(2)]"))
    pg.evaluate(f"{P}.setParam('launchMass', 0.2)"); steps.append(pg.evaluate(f"[{G}.p.kind, {G}.p.launchMass]") + [pg.get_attribute("#ctl-gravity-kind-auto", "aria-checked")])
    pg.click("#ctl-gravity-kind-superEarth"); steps.append(pg.evaluate(f"[{G}.p.kind, +({G}.p.launchMass / {G}.EARTH).toFixed(2)]"))
    pg.evaluate(f"{P}.setParam('launchMass', 7 * {G}.EARTH)"); steps.append(pg.evaluate(f"[{G}.p.kind, +({G}.p.launchMass / {G}.EARTH).toFixed(2)]"))
    dropped = pg.evaluate(f"""(() => {{ const L = {G}, H = L.heaviest(); L.p.launchMass = 2; L.dropOrbit(H.x + 220, H.y); const b = L.bodies.at(-1); return [b.kind, +(b.m / L.EARTH).toFixed(3)]; }})()""")
    ok("type_and_mass_kept_consistent", steps == [["terrestrial", 1.0], ["auto", 0.2, "true"], ["superEarth", 5.59], ["superEarth", 7.0]] and dropped == ["superEarth", 10.0], (steps, dropped))
    pg.evaluate(f"{P}.setParam('kind', 'auto'); {P}.setParam('launchMass', 2)")

    # ---- Old saved states: rocky and ocean worlds are classed again, a moon as a moon
    legacy = pg.evaluate(f"""(() => {{ const L = {G}, E = L.EARTH, st = {{ id: 1, kind: 'star', m: 1000, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }};
      const pl = (id, kind, me, extra) => ({{ id, kind, m: me * E, x: 100 + id, y: 0, z: 0, vx: 0, vy: 30, vz: 0, ...extra }});
      L.deserialize({{ bodies: [st, pl(2, 'rocky', 0.5), pl(3, 'ocean', 6), pl(4, 'rocky', 160), pl(5, 'ocean', 0.01, {{ meta: {{ name: 'Old moon', hostId: 2 }} }})] }});
      return L.bodies.map(b => b.kind); }})()""")
    ok("old_saved_types_classed_again", legacy == ["star", "terrestrial", "subNeptune", "gas", "moon"], legacy)

    # ---- Climate from starlight: each world's warmth from every star, its air, ice and spin
    lum = pg.evaluate(f"[{G}.luminosity(1), {G}.luminosity(2), {G}.luminosity(0.3), {G}.luminosity(0.5)]")
    ok("climate_luminosity_from_mass", lum[0] == 1 and abs(lum[1] / (1.4 * 2 ** 3.5) - 1) < 1e-9 and abs(lum[2] / (0.23 * 0.3 ** 2.3) - 1) < 1e-9 and lum[3] == 0.0625, lum)
    # A world d px from the first of some stars (mass, x), in a scene of its own, paused, its climate read at once.
    WORLD = f"""(spec) => {{ const L = {G}; {P}.preset('empty'); {P}.pause(); L.bodies = [];
      const stars = spec.stars.map(([m, x]) => {{ const s = L.body(x, 0, 0, 0, m); L.bodies.push(s); return s; }});
      const w = L.orbit(stars[0], spec.d, 0, spec.me * L.EARTH, 1, spec.kind); L.accDirty = true; L.prepare(); L.climateAll(0, true);
      const c = L.climateOf(w);
      return {{ id: w.id, star: stars[0].id, S: c.S, T: c.T, Tday: c.Tday, Tss: c.Tss, Tn: c.Tn, air: c.air, cls: c.cls, spin: c.spin, toStar: c.toStar, lockTo: c.lock && c.lock.id,
        xIce: c.xIce, type: c.type, haze: c.haze, rgb: [...c.rgb] }}; }}"""
    hot = pg.evaluate(WORLD, {"stars": [[2000, 0]], "d": 30, "me": 1, "kind": "terrestrial"})
    ok("climate_close_rocky_scorched_and_locked", hot["cls"] == "molten" and hot["air"] == "none" and hot["spin"] == "locked" and hot["toStar"] and hot["lockTo"] == hot["star"]
       and hot["Tday"] > 1000 and hot["Tss"] > hot["Tday"] > hot["T"] > hot["Tn"] and hot["type"] == 0, hot)
    far = pg.evaluate(WORLD, {"stars": [[1000, 0]], "d": 675, "me": 1, "kind": "terrestrial"})
    ok("climate_far_rocky_frozen", far["cls"] == "frozen" and far["xIce"] == 0 and far["T"] < 200 and far["spin"] == "free" and min(far["rgb"]) > 185, far)
    home = pg.evaluate(WORLD, {"stars": [[1000, 0]], "d": 135, "me": 1, "kind": "terrestrial"})
    ok("climate_earth_like_at_1au_temperate", home["cls"] == "temperate" and home["air"] == "air" and 284 < home["T"] < 292 and home["type"] == 1 and 0.85 < home["xIce"] < 1
       and home["spin"] == "free" and abs(home["S"] - 1) < 1e-9, home)
    eye = pg.evaluate(WORLD, {"stars": [[300, 0]], "d": 19.4, "me": 1, "kind": "terrestrial"})
    ok("climate_eyeball_about_a_red_dwarf", eye["cls"] == "eyeball" and eye["toStar"] and eye["Tn"] < 263 < eye["Tss"] and eye["type"] == 1, eye)
    venus = pg.evaluate(WORLD, {"stars": [[1000, 0]], "d": 85, "me": 4, "kind": "superEarth"})
    ok("climate_inside_runaway_limit_is_hothouse", venus["cls"] == "hothouse" and venus["air"] == "thick" and venus["haze"] == 1 and venus["T"] > 700 and venus["type"] == 0, venus)
    # Every star's light counts, and a star taken away takes its light with it.
    two = pg.evaluate(f"""(() => {{ const L = {G}; {P}.preset('empty'); {P}.pause(); L.bodies = [];
      const a = L.body(0, 0, 0, 0, 1000), b2 = L.body(400, 0, 0, 0, 1000), w = L.body(135, 0, 0, 30, 0.003); L.bodies.push(a, b2, w); L.accDirty = true; L.prepare(); L.climateAll(0, true);
      const both = L.climateOf(w).S; L.bodies = L.bodies.filter(q => q !== b2); L.accDirty = true; L.climate(0.01); return [both, L.climateOf(w).S, 1 + (135 / 265) ** 2]; }})()""")
    ok("climate_sums_every_star", abs(two[0] / two[2] - 1) < 1e-9 and abs(two[1] - 1) < 1e-9, two)
    # A giant moved from 1 AU to 0.5 AU warms over months, not at once, and settles at the warmer equilibrium.
    lag = pg.evaluate(f"""(() => {{ const L = {G}, yr = 2 * Math.PI * Math.sqrt(135 ** 3 / (5000 * 1000)); {P}.preset('empty'); {P}.pause(); L.bodies = [];
      const s = L.body(0, 0, 0, 0, 1000); L.bodies.push(s); const g = L.orbit(s, 135, 0, 1, 1, 'gas'); L.accDirty = true; L.prepare(); L.climateAll(0, true);
      const T0 = g.clim.T; g.x = 67.5; g.y = 0; g.vx = 0; g.vy = L.vCirc(s.m + g.m, 67.5); L.accDirty = true; L.warm(g, 0, true); const goal = g.clim.T; g.clim.T = T0;
      const out = []; const t0 = L.t; let prev = T0, rising = true;
      while (L.t - t0 < 2.4 * yr) {{ L.step(L.dt()); L.t += L.dt(); L.after(L.dt()); if (g.clim.T < prev - 1e-9) rising = false; prev = g.clim.T; if (out.length < 1 && L.t - t0 >= 0.1 * yr) out.push(g.clim.T); }}
      return {{ T0, goal, early: out[0], end: g.clim.T, rising }}; }})()""")
    ok("climate_lags_behind_starlight", lag["goal"] > lag["T0"] * 1.35 and lag["T0"] * 1.05 < lag["early"] < lag["goal"] * 0.95 and abs(lag["end"] / lag["goal"] - 1) < 0.01 and lag["rising"], lag)
    # An Earth-like world pushed inside the runaway limit boils its oceans away within a few years.
    pushed = pg.evaluate(f"""(() => {{ const L = {G}, yr = 2 * Math.PI * Math.sqrt(135 ** 3 / (5000 * 1000)); {P}.preset('empty'); {P}.pause(); L.bodies = [];
      const s = L.body(0, 0, 0, 0, 1000); L.bodies.push(s); const w = L.orbit(s, 135, 0, L.EARTH, 1, 'terrestrial'); L.accDirty = true; L.prepare(); L.climateAll(0, true);
      const before = [w.clim.cls, w.clim.T]; w.x = 81; w.y = 0; w.vx = 0; w.vy = L.vCirc(s.m + w.m, 81); const t0 = L.t, seen = []; let quarter = 0;
      while (L.t - t0 < 4 * yr) {{ L.step(L.dt()); L.t += L.dt(); L.after(L.dt()); if (seen.at(-1) !== w.clim.cls) seen.push(w.clim.cls); if (!quarter && L.t - t0 >= 0.25 * yr) quarter = w.clim.T; }}
      return {{ before, quarter, after: [w.clim.cls, w.clim.air, w.clim.T], seen }}; }})()""")
    # Its oceans boil within weeks of the long-run starlight passing the runaway limit, and the surface then heats over
    # half a year or so: still on its way a quarter of a year in.
    ok("climate_pushed_earth_becomes_hothouse", pushed["before"][0] == "temperate" and pushed["seen"] == ["temperate", "hothouse"] and pushed["after"][:2] == ["hothouse", "thick"]
       and pushed["after"][2] > 750 and 320 < pushed["quarter"] < 650, pushed)
    # Inspect: starlight, temperatures in the chosen system, air, climate and spin; a giant's cloud tops; a star's light.
    INSPECT = f"""(id) => {{ const L = {G}; L.track = id; const r = Object.fromEntries(L.inspect().rows.map(x => [x[0], x[1]])); L.track = null; return r; }}"""
    pg.evaluate(WORLD, {"stars": [[1000, 0]], "d": 135, "me": 1, "kind": "terrestrial"})
    wid = pg.evaluate(f"{G}.bodies[1].id")
    sys_rows = {}
    for u in ("si", "us", "sim"):
        pg.evaluate(f"{P}.units.set('{u}')"); pg.wait_for_timeout(120)
        sys_rows[u] = pg.evaluate(INSPECT, wid)
    pg.evaluate(f"{P}.units.set('si')"); pg.wait_for_timeout(120)
    want = ("Starlight received", "Equilibrium temperature", "Surface temperature", "Air", "Climate", "Rotation")
    ok("climate_inspect_rows", all(k in sys_rows["si"] for k in want) and re.fullmatch(r"\d+ K \(−?\d+ °C\)", sys_rows["si"]["Surface temperature"]) is not None
       and re.fullmatch(r"\d+ K \(−?\d+ °F\)", sys_rows["us"]["Equilibrium temperature"]) is not None and re.fullmatch(r"\d+ K", sys_rows["sim"]["Surface temperature"]) is not None
       and sys_rows["si"]["Starlight received"] == "1.00 × Earth's · 1361 W/m²" and sys_rows["sim"]["Starlight received"] == "1.00 × Earth's"
       and sys_rows["si"]["Climate"] == "Temperate" and sys_rows["si"]["Rotation"] == "Spins freely", {u: {k: sys_rows[u].get(k) for k in want} for u in sys_rows})
    giant_rows = pg.evaluate(f"""(() => {{ const L = {G}, g = L.orbit(L.bodies[0], 250, 1, 1, 1, 'gas'); L.accDirty = true; L.track = g.id; const r = Object.fromEntries(L.inspect().rows.map(x => [x[0], x[1]]));
      L.track = L.bodies[0].id; const s = Object.fromEntries(L.inspect().rows.map(x => [x[0], x[1]])); L.track = null; return [r['Cloud-top temperature'] || null, r['Surface temperature'] || null, r['Air'], s['Luminosity'] || null]; }})()""")
    ok("climate_inspect_giant_and_star", giant_rows[0] is not None and giant_rows[1] is None and giant_rows[2].startswith("A deep envelope") and giant_rows[3] == "1.00 × the Sun's", giant_rows)
    # Rewind and saved states keep a world's warmth part-way to its goal, and the tracks carry temperature and starlight.
    kept = pg.evaluate(f"""(() => {{ const L = {G}, w = L.bodies[1]; w.clim.T = 250.5; w.clim.Sbar = 0.8; L.warm(w, 0, false); const snap = L.snapshot();
      w.clim.T = 300; L.restore(snap); const back = L.bodies.find(q => q.id === w.id).clim.T, saved = JSON.parse(JSON.stringify(L.serialize())); L.deserialize(saved);
      const loaded = L.bodies.find(q => q.id === w.id).clim.T, out = []; L.trackRows(out); return {{ back, loaded, rows: out.map(r => r.slice(-2)), cols: L.trackColumns.slice(-2), info: L.trackColumns.slice(-2).map(k => L.dataInfo[k]) }}; }})()""")
    ok("climate_kept_by_rewind_and_saved_states", kept["back"] == 250.5 and kept["loaded"] == 250.5, kept)
    ok("climate_in_the_tracks", kept["cols"] == ["temperature_K", "instellation_earth"] and kept["rows"][0] == [None, None] and kept["rows"][1][0] == 250.5 and abs(kept["rows"][1][1] - 1) < 1e-9
       and kept["info"][0][0] == "K" and kept["info"][1][2:] == ["W/m²", 1361], kept)
    b.close()

    # ---- In 3D: the climate reaches the planet material, and a locked world keeps one face to its star
    b = launch(p)
    pg = open_page(b, mode="3d", viewport=VIEW)
    pg.goto(URL + "#gravity")
    pg.wait_for_function("window.PhysicsPlayground && PhysicsPlayground.active && PhysicsPlayground.active.id === 'gravity'")
    settle(pg, f"{P}.mode.world.engine && {P}.mode.world.engine.info().calls > 0", 30000)
    pg.evaluate(f"""(() => {{ const L = {G}; {P}.preset('empty'); {P}.pause(); L.bodies = []; const s = L.body(0, 0, 0, 0, 2000); L.bodies.push(s);
      const hot = L.orbit(s, 30, 0.7, L.EARTH, 1, 'terrestrial'), haze = L.orbit(s, 400, 2.4, 4 * L.EARTH, 1, 'superEarth'), cold = L.orbit(s, 900, 4.4, L.EARTH, 1, 'terrestrial');
      L.accDirty = true; L.prepare(); L.climateAll(0, true); L.track = hot.id; L.trackEase = 1; }})()""")
    pg.wait_for_timeout(2500)
    mat = pg.evaluate(f"""(() => {{ const L = {G}, S = {P}.mode.world.engine.sceneOf('gravity'), out = [];
      S.scene.traverse(m => {{ if (!m.isInstancedMesh || !m.geometry.attributes.aK || !m.visible) return; const K = m.geometry.attributes.aK.array, H = m.geometry.attributes.aH.array, B = m.geometry.attributes.aB.array, M = m.instanceMatrix.array;
        for (let i = 0; i < m.count; i++) out.push({{ x: M[i * 16 + 12], y: M[i * 16 + 13], z: M[i * 16 + 14], K: [...K.slice(i * 4, i * 4 + 4)], H: [...H.slice(i * 4, i * 4 + 4)], B: [...B.slice(i * 4, i * 4 + 3)] }}); }});
      const star = L.bodies[0], res = L.bodies.slice(1).map(b => {{ const q = out.find(o => Math.hypot(o.x - b.x, o.y - b.z, o.z - b.y) < 1e-3), c = L.climateOf(b); if (!q) return null;
        let face = null;
        if (q.H[3] > -50) {{ const [ax, ay, az] = q.B, up = Math.abs(ay) < 0.9; let cx = up ? -az : 0, cy = up ? 0 : az, cz = up ? ax : -ay; const l = Math.hypot(cx, cy, cz); cx /= l; cy /= l; cz /= l;
          const zx = cy * az - cz * ay, zy = cz * ax - cx * az, zz = cx * ay - cy * ax, t = q.H[3], vx = Math.cos(t) * cx - Math.sin(t) * zx, vy = Math.cos(t) * cy - Math.sin(t) * zy, vz = Math.cos(t) * cz - Math.sin(t) * zz;
          const dx = star.x - b.x, dy = star.z - b.z, dz = star.y - b.y, d = Math.hypot(dx, dy, dz); face = (vx * dx + vy * dy + vz * dz) / d; }}
        return {{ cls: c.cls, T: [q.K[0], c.T], eps: [q.K[1], c.eps], ice: [q.K[2], c.xIce], lock: q.K[3], freeze: q.H[0], haze: q.H[1], face }}; }});
      return res; }})()""")
    ok("climate_reaches_3d_material", all(m is not None and abs(m["T"][0] / m["T"][1] - 1) < 1e-6 and abs(m["eps"][0] - m["eps"][1]) < 1e-6 for m in mat)
       and [m["cls"] for m in mat] == ["molten", "hothouse", "frozen"] and mat[1]["haze"] == 1 and mat[2]["freeze"] == 263 and mat[2]["ice"] == [0, 0], mat)
    ok("climate_locked_face_toward_star", mat[0]["lock"] == 1 and mat[0]["face"] is not None and mat[0]["face"] > 0.9999, mat[0])
    # The followed molten world's portrait shows lava: bright orange in the cracks of its day side.
    lava = pg.evaluate("""(() => { const src = document.getElementById('details-portrait'), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i] > 1.5 * d[i + 1] && d[i] > 2.2 * d[i + 2]) n++; return n; })()""")
    ok("climate_lava_glows_in_3d", lava > 40, lava)
    b.close()
finish()
