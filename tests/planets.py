"""
✒ Metadata
    - Title: Planet Classes Tests (digiSpace Edition - v2.9)
    - File Name: planets.py
    - Relative Path: tests/planets.py
    - Artifact Type: test
    - Version: 2.9.0
    - Date: 11/14/2026
    - Update: Saturday, November 14, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
from harness import URL, finish, launch, ok, open_page

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
    star = pg.evaluate(f"{G}.bodies.filter(b => b.m >= 0.3 && b.kind !== 'star').map(b => b.kind)")
    ok("star_system_planets_are_gas_giants", star == ["gas"] * 6, star)
    iau = pg.evaluate(f"""(() => {{ const L = {G}, flag = M => {{ const s = L.body(5000, 0, 0, 0, M); L.bodies.push(s); const g = L.orbit(s, 120, 0, 12); L.track = g.id;
      const r = L.inspect().rows.find(x => x[0] === 'Planet by IAU rules'); L.bodies = L.bodies.filter(q => q !== s && q !== g); L.track = null; L.accDirty = true; return [g.kind, r ? r[1] : null]; }};
      return [flag(250), flag(1000)]; }})()""")
    ok("iau_mass_ratio_flag", iau[0][0] == "gas" and iau[0][1] == "no: 4.8 % of its star's mass" and iau[1][1] is None, iau)
    mg = pg.evaluate(f"""(() => {{ const L = {G}, E = L.EARTH, m = (k1, m1, k2, m2) => {{ const a = {{ kind: k1, m: m1 * E }}, b = {{ kind: k2, m: m2 * E }}, [big, small] = a.m >= b.m ? [a, b] : [b, a]; return L.mergedKind(big, small, a.m + b.m); }};
      return [m('superEarth', 7, 'superEarth', 6), m('terrestrial', 1, 'terrestrial', 0.8), m('terrestrial', 1, 'subNeptune', 5), m('subNeptune', 8, 'subNeptune', 7), m('ice', 30, 'ice', 25),
        m('gas', 4000, 'gas', 1000), m('brown', 25000, 'brown', 4000), m('gas', 300, 'terrestrial', 1)]; }})()""")
    ok("mergers_keep_their_composition", mg == ["superEarth", "superEarth", "subNeptune", "ice", "gas", "brown", "star", "gas"], mg)

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

    b.close()
finish()
