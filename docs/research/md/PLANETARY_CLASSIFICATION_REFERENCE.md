<!--
✒ Metadata
    - Title: Planetary Classification Reference (Physics Playground Edition - v1.0)
    - File Name: PLANETARY_CLASSIFICATION_REFERENCE.md
    - Relative Path: docs/research/md/PLANETARY_CLASSIFICATION_REFERENCE.md
    - Artifact Type: docs
    - Version: 1.0.0
    - Date: 11/10/2026
    - Update: Tuesday, November 10, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Description:
    Scientific reference behind the Physics Playground gravity work: the
    five planetary classes, their governing physics, thirteen worked
    mathematical models, the comparative dataset, and the simulation
    translation, followed by the register of cited sources. This Markdown
    edition is the canonical source; the Word edition is generated from it.

✒ Key Features:
    - Five-class taxonomy (Terrestrial, Super-Earth, Sub-Neptune, Ice
      Giant, Gas Giant) with scope rules and the rejected candidates
    - Thirteen physical models, each with expression, variables, units,
      principle, validity, worked example, limits, and category relevance
    - Equations in LaTeX: `math` fenced blocks for display, `$...$` inline,
      renderable on GitHub and by the Playground's KaTeX
    - Normalized dataset of 8 Solar System planets and 14 exoplanets
    - Six hard boundary constraints and per-category simulation guardrails
    - Cited Sources: 45 primary works and 156 web sources in six tiers
    - Word build hints carried in HTML comments (docx-table, docx-para,
      md-only) that Markdown renderers ignore

✒ Usage Instructions:
    Read on GitHub, in the VS Code preview, or any renderer with LaTeX
    math. Edit the part files in src/, then regenerate both editions:
        python3 build/assemble_md.py --src src --out md
        python3 build/build_article.py
    Keep each docx-* comment directly above the table it configures.

✒ Other Important Information:
    - Dependencies: none to read; the Word build needs pandoc, Node 18+,
      and the docx npm package
    - Compatible platforms: GitHub Flavored Markdown with math, KaTeX,
      MathJax, VS Code preview
    - Provenance: research text supplied by Dennis as a copy-paste export
      in which every equation had been flattened; the equations were
      rebuilt in LaTeX from the surviving fragments. The platform that
      generated the original research is not recorded in the export.
    - Editorial changes from the supplied text, content otherwise intact:
      (1) a research-tool artifact ("snippet 286") in Model 4.3.3 replaced
      with a plain attribution; (2) Section 5.1 count corrected from
      thirteen to fourteen exoplanets to match Table 5.1; (3) run-on
      lists set as lists (exoplanet conditions, Sub-Neptune paradigms,
      six constraints, simulation tiers, priority areas); (4) the
      Section 4 constants paragraph set as Table 4.1; (5) Section 3.5
      polar radius written R_pole to match Model 4.1.1; (6) the Section
      7.2 table numbered 7.1.
    - Companion: word/PLANETARY_CLASSIFICATION_SOURCE_MATRIX.docx maps
      every claim to its sources and records the verification pass
---------
-->

# Planetary Classification and Governing Physics: Scientific Reference for Physics Playground

*Research reference for the Physics Playground gravity module — Markdown edition 1.0.0, 11/10/2026. Companion: Planetary Classification Source Matrix.*

## Contents

- [Overview](#overview)
- [1. Executive Research Summary](#1-executive-research-summary)
  - [1.1 The Five Selected Planetary Types and Core Rationale](#11-the-five-selected-planetary-types-and-core-rationale)
  - [1.2 Synthesis of Major Scientific Advances (2018–2026)](#12-synthesis-of-major-scientific-advances-20182026)
  - [1.3 Limitations of Ranking by Research Volume](#13-limitations-of-ranking-by-research-volume)
- [2. Planetary Classification Analysis](#2-planetary-classification-analysis)
  - [2.1 Formal Definitions of "Planet" and Scope Boundaries](#21-formal-definitions-of-planet-and-scope-boundaries)
  - [2.2 Disentangling Overlapping Classification Taxonomies](#22-disentangling-overlapping-classification-taxonomies)
  - [2.3 Evaluation of Candidate Categories and Selection of the Final Five](#23-evaluation-of-candidate-categories-and-selection-of-the-final-five)
- [3. Comprehensive Scientific Profiles of the Five Planet Types](#3-comprehensive-scientific-profiles-of-the-five-planet-types)
  - [3.1 Profile 1: Terrestrial Planets](#31-profile-1-terrestrial-planets)
  - [3.2 Profile 2: Super-Earths](#32-profile-2-super-earths)
  - [3.3 Profile 3: Sub-Neptunes (Mini-Neptunes)](#33-profile-3-sub-neptunes-mini-neptunes)
  - [3.4 Profile 4: Ice Giants (Neptunian Worlds)](#34-profile-4-ice-giants-neptunian-worlds)
  - [3.5 Profile 5: Gas Giants (Jovian Worlds)](#35-profile-5-gas-giants-jovian-worlds)
- [4. Mathematical and Physical Model Reference](#4-mathematical-and-physical-model-reference)
  - [4.1 Gravitational and Orbital Mechanics](#41-gravitational-and-orbital-mechanics)
    - [Model 4.1.1: Axisymmetric Multipole Gravitational Potential and Rotating Effective Gravity](#model-411-axisymmetric-multipole-gravitational-potential-and-rotating-effective-gravity)
    - [Model 4.1.2: Escape Velocity and Polytropic Gravitational Binding Energy](#model-412-escape-velocity-and-polytropic-gravitational-binding-energy)
    - [Model 4.1.3: Two-Body Keplerian Motion, Vis-Viva Velocity, and N-Body Perturbation Limits](#model-413-two-body-keplerian-motion-vis-viva-velocity-and-n-body-perturbation-limits)
    - [Model 4.1.4: Eccentricity Tidal Dissipation, Hill Sphere, and Fluid Roche Limit](#model-414-eccentricity-tidal-dissipation-hill-sphere-and-fluid-roche-limit)
  - [4.2 Thermodynamics and Energy Transfer](#42-thermodynamics-and-energy-transfer)
    - [Model 4.2.1: Orbit-Averaged Insolation, Equilibrium Temperature, and Effective Temperature](#model-421-orbit-averaged-insolation-equilibrium-temperature-and-effective-temperature)
    - [Model 4.2.2: Semi-Gray Greenhouse Profile, Adiabatic Lapse Rate, and Radiative Relaxation Timescale](#model-422-semi-gray-greenhouse-profile-adiabatic-lapse-rate-and-radiative-relaxation-timescale)
  - [4.3 Fluid Mechanics and Atmospheric Dynamics](#43-fluid-mechanics-and-atmospheric-dynamics)
    - [Model 4.3.1: Hydrostatic Equilibrium, Ideal Gas Scale Height, and Transmission Spectral Depth](#model-431-hydrostatic-equilibrium-ideal-gas-scale-height-and-transmission-spectral-depth)
    - [Model 4.3.2: Rotating Fluid Dynamics — Rossby Number and Rhines Zonal Jet Scale](#model-432-rotating-fluid-dynamics--rossby-number-and-rhines-zonal-jet-scale)
    - [Model 4.3.3: Atmospheric Escape — Jeans Parameter and Energy-Limited XUV Photoevaporation](#model-433-atmospheric-escape--jeans-parameter-and-energy-limited-xuv-photoevaporation)
  - [4.4 Planetary Structure and Material Physics](#44-planetary-structure-and-material-physics)
    - [Model 4.4.1: Coupled 1D Interior Structure Equations and Polytropic Compression](#model-441-coupled-1d-interior-structure-equations-and-polytropic-compression)
    - [Model 4.4.2: Third-Order Birch–Murnaghan Solid Equation of State](#model-442-third-order-birchmurnaghan-solid-equation-of-state)
    - [Model 4.4.3: Empirical Piecewise and Compositional Mass–Radius Scaling Relations](#model-443-empirical-piecewise-and-compositional-massradius-scaling-relations)
    - [Model 4.4.4: Rotational Oblateness, Darwin–Radau Moment-of-Inertia Relation, and Dynamo Scaling](#model-444-rotational-oblateness-darwinradau-moment-of-inertia-relation-and-dynamo-scaling)
- [5. Comparative Planetary Dataset, Parameter Couplings, and Cross-Category Matrix](#5-comparative-planetary-dataset-parameter-couplings-and-cross-category-matrix)
  - [5.1 Normalized Reference Dataset (Solar System and Benchmark Exoplanets)](#51-normalized-reference-dataset-solar-system-and-benchmark-exoplanets)
  - [5.2 Parameter Couplings and Physically Invalid Combinations](#52-parameter-couplings-and-physically-invalid-combinations)
  - [5.3 Cross-Category Scientific Comparison Matrix](#53-cross-category-scientific-comparison-matrix)
- [6. Physics Playground Research Translation](#6-physics-playground-research-translation)
  - [6.1 Modular State Contract and Constraint Pipeline](#61-modular-state-contract-and-constraint-pipeline)
  - [6.2 Category-Specific Parameter Mapping and Guardrails](#62-category-specific-parameter-mapping-and-guardrails)
  - [6.3 Three-Level Simulation Architecture for Physics Playground](#63-three-level-simulation-architecture-for-physics-playground)
    - [Foundational Tier: Closed-Form Analytical Physics](#foundational-tier-closed-form-analytical-physics)
    - [Intermediate Tier: Coupled Numerical ODE & Symplectic Solvers](#intermediate-tier-coupled-numerical-ode--symplectic-solvers)
    - [Advanced Tier: Tabulated Ab Initio Grids & GPU Continuum Physics](#advanced-tier-tabulated-ab-initio-grids--gpu-continuum-physics)
- [7. Scientific Sources and Verification Record](#7-scientific-sources-and-verification-record)
  - [7.1 Primary Archives, Standards, and Peer-Reviewed Foundations](#71-primary-archives-standards-and-peer-reviewed-foundations)
  - [7.2 Reconciliation of Reference Discrepancies](#72-reconciliation-of-reference-discrepancies)
  - [7.3 Priority Areas Requiring Ongoing Scientific Investigation](#73-priority-areas-requiring-ongoing-scientific-investigation)
- [Cited Sources](#cited-sources)
  - [Evidence Tiers](#evidence-tiers)
  - [Primary Literature and Standards Cited in Text](#primary-literature-and-standards-cited-in-text)
  - [Web Sources Consulted](#web-sources-consulted)
    - [Tier A: Peer-reviewed research & preprints](#tier-a-peer-reviewed-research--preprints)
    - [Tier B: Agency data, standards & catalogs](#tier-b-agency-data-standards--catalogs)
    - [Tier C: Institutional & agency communications](#tier-c-institutional--agency-communications)
    - [Tier D: Science journalism & popular media](#tier-d-science-journalism--popular-media)
    - [Tier E: Tertiary references & mirrors](#tier-e-tertiary-references--mirrors)
    - [Tier F: Project & software references](#tier-f-project--software-references)

## Overview

Across Solar System geophysics and extrasolar demographics, the five planetary categories with the strongest empirical, theoretical, and observational foundation—excluding dwarf planets entirely—are **Terrestrial Planets**, **Super-Earths**, **Sub-Neptunes** (Mini-Neptunes), **Ice Giants** (Neptunian Worlds), and **Gas Giants** (Jovian Worlds, encompassing Cold Jovians and Irradiated Hot Jupiters). Constructing a scientifically defensible classification requires separating three overlapping taxonomic axes: bulk interior composition, demographic size–mass regimes bounded by evolutionary phase transitions, and stellar irradiation environments. Public outreach catalogs such as NASA's Exoplanet Catalog group 6,153 confirmed exoplanets (as of March 30, 2026) into four broad bins—2,076 Neptune-like, 2,065 Gas Giant, 1,782 Super-Earth, 223 Terrestrial, and 7 Unknown—but peer-reviewed interior physics and Kepler/TESS occurrence statistics demonstrate that "Neptune-like" conflates two distinct populations separated by the radius cliff near 3.0–3.5 Earth radii. Dividing volatile-enveloped Sub-Neptunes (1.8–3.5 Earth radii, ~1–5% hydrogen–helium by mass) from heavy-element-dominated Ice Giants (3.5–6.0 Earth radii, 80–90% high-pressure ices and rock with 10–20% hydrogen–helium) alongside Terrestrial Planets (≤1.2 Earth radii), Super-Earths (1.2–1.8 Earth radii, below the Fulton radius valley), and Gas Giants (≥6 Earth radii up to the 13-Jupiter-mass deuterium-burning limit) yields five contiguous, physically grounded regimes spanning four orders of magnitude in planetary mass.

Physically credible simulation of these five classes in Physics Playground cannot treat planetary mass, radius, density, and surface gravity as independent sliders, nor can it apply uniform-sphere Newtonian formulas universally across solid and fluid worlds. Across the planetary mass spectrum, empirical and theoretical equations of state enforce three distinct mass–radius scaling regimes: self-compressed silicate–iron worlds follow $R_p \propto M_p^{0.27}$ up to approximately 4.4 Earth masses (and up to ~8–10 Earth masses along the extended rocky branch for stripped Super-Earths), volatile-enveloped Sub-Neptunes and Ice Giants follow a steep $R_p \propto M_p^{0.67}$ relation driven by low-density gaseous envelopes, and degenerate metallic-hydrogen Gas Giants above ~127 Earth masses exhibit nearly mass-independent radii ($R_p \propto M_p^{-0.06}$) modulated primarily by stellar irradiation and internal entropy. Furthermore, on rapidly rotating fluid giants such as Jupiter and Saturn, equatorial centrifugal acceleration and quadrupole gravitational harmonics ($J_2$) alter effective 1-bar gravity by more than 15–25% relative to spherical $GM/R^2$ approximations.

> [!NOTE]
> **Research Access Note**
>
> Because the [live Physics Playground web deployment](https://dnoice.github.io/physics-playground/#gravity) was inaccessible during research compilation, Section 6 translates these physical laws into an implementation-agnostic, three-tier simulation architecture (Foundational, Intermediate, and Advanced) designed around modular `#gravity` state variables without assuming undocumented repository internals.

## 1. Executive Research Summary

### 1.1 The Five Selected Planetary Types and Core Rationale

To establish a lasting computational physics reference while adhering strictly to the exclusion of dwarf planets (Pluto, Ceres, Eris, Haumea, and Makemake), this investigation evaluates planetary categories across seven dimensions: historical depth, peer-reviewed literature volume, in situ spacecraft mission archives, confirmed exoplanet demographics, measurement precision, maturity of mathematical equations of state (EOS), and theoretical leverage over planetary formation and evolution. Five planetary types emerge as the co-equal cornerstones of modern planetary science:

- **Terrestrial Planets:** Compact silicate–iron worlds up to ~1.2 Earth radii and ~1.5 Earth masses, anchored by Mercury, Venus, Earth, and Mars, alongside extrasolar analogues such as TRAPPIST-1 b–h and GJ 367 b.
- **Super-Earths:** High-density rocky–metallic worlds between ~1.2 and ~1.8 Earth radii and ~1.5–10 Earth masses lying below the exoplanet radius valley, absent in the Solar System yet numbering 1,782 confirmed exoplanets, exemplified by LHS 1140 b and 55 Cancri e.
- **Sub-Neptunes (Mini-Neptunes):** Intermediate volatile-rich worlds between the radius valley at ~1.8 Earth radii and the radius cliff at ~3.5 Earth radii (~3–15 Earth masses), hosting ~1–5 wt% hydrogen–helium envelopes or supercritical water layers over silicate–magma cores; the most abundant planet class inside 100-day orbits around Sun-like stars, exemplified by GJ 1214 b, K2-18 b, and TOI-270 d.
- **Ice Giants (Neptunian Worlds):** Heavy-element-dominated giant planets of ~3.5–6.0 Earth radii and ~10–40 Earth masses whose interiors consist of 80–90 wt% water, methane, ammonia, and rock–iron under ionic and superionic pressures beneath a 10–20 wt% hydrogen–helium envelope, anchored by Uranus, Neptune, GJ 436 b, and HAT-P-11 b.
- **Gas Giants (Jovian Worlds):** Hydrogen–helium-dominated giant planets of ~6–20 Earth radii and ~50–4,130 Earth masses (~0.15–13 Jupiter masses), governed by liquid metallic hydrogen and electron degeneracy pressure, spanning cold Solar System archetypes Jupiter and Saturn as well as strongly irradiated Hot Jupiters and inflated Hot Saturns such as 51 Pegasi b, HD 209458 b, HD 189733 b, WASP-12 b, and WASP-39 b.

### 1.2 Synthesis of Major Scientific Advances (2018–2026)

Spacecraft geodesy, planetary seismology, high-pressure laser-shock experiments, and James Webb Space Telescope (JWST) spectroscopy between 2018 and 2026 have substantially revised classical textbook models of planetary interiors and energy budgets. At Jupiter and Saturn, high-precision zonal gravity harmonics ($J_2$ through $J_8$) from Juno and C-ring normal-mode seismology from Cassini indicate that neither gas giant possesses a sharp, compact rock–ice core boundary; instead, heavy elements are distributed across a stably stratified, compositionally graded "dilute" or "diffuse" core extending to ~30–50% of Jupiter's radius and ~60% of Saturn's radius. Among terrestrial worlds, NASA's InSight seismic recordings of diffracted P-waves from a farside meteorite impact on Mars revealed in 2023 that the Martian liquid iron-alloy core is ~30% smaller by volume than initially inferred (1,650 ± 20 km radius rather than 1,830 ± 40 km) because it is surrounded by an ~150 km thick basal molten silicate layer enriched in iron and heat-producing elements. Meanwhile, MESSENGER radio-tracking and libration analyses provided geodetic evidence that Mercury possesses a solid inner metallic core roughly comparable in size to Earth's inside a liquid outer core occupying nearly 85% of the planet's volume.

In parallel, dynamic laser-driven shock-compression and nanosecond X-ray diffraction experiments demonstrated that above 70–100 GPa and 2,000 K, water transitions into superionic ice (Ice XVIII), in which oxygen ions form a face-centered cubic crystalline lattice while hydrogen protons diffuse like a charged liquid, yielding high ionic electrical conductivity (>100 S/cm) consistent with thin-shell dynamo models for the strongly tilted, multipolar magnetic fields of Uranus and Neptune. For exoplanets, mass and radius measurements alone remain degenerate across Super-Earths, Sub-Neptunes, and Ice Giants. Recent JWST campaigns (2023–2026) show that warm Sub-Neptunes frequently exhibit elevated atmospheric mean molecular weights (5.37–5.5 u on TOI-270 d and >15 u on GJ 1214 b) and depleted ammonia, which can arise either from water-rich accretion beyond the snow line or from chemical equilibration between a hydrogen envelope and a deep silicate magma ocean. Finally, Solar System radiant energy budgets have been recalibrated: Cassini multi-instrument flyby photometry revised Jupiter's Bond albedo upward from the Voyager-era 0.343 to 0.503 ± 0.012 and increased its internal heat flux to 7.485 ± 0.163 W/m², while full-orbit seasonal radiative analyses of Uranus published in 2025 detected a statistically significant internal heat flux of 0.078 ± 0.018 W/m² (emitted-to-absorbed power ratio 1.15 ± 0.06), resolving a four-decade debate over whether Uranus retains primordial heat.

### 1.3 Limitations of Ranking by Research Volume

Constructing an exact cardinal ranking (1st through 5th) of planetary types by cumulative publication count is scientifically ill-posed for three reasons. First, bibliometric indexing across geophysics and astrophysics is structurally asymmetric: vast bodies of Earth-science, lunar/Martian geology, and atmospheric literature investigate individual Terrestrial planets without using exoplanet classification labels, whereas exoplanet studies routinely combine Super-Earths and Sub-Neptunes under umbrella phrases like "close-in small planets". Second, raw exoplanet discovery counts reflect geometric transit probabilities ($\propto R_\star/a$) and Doppler semi-amplitudes ($\propto M_p\,a^{-1/2}$) rather than cosmic occurrence or scientific weight; Terrestrial exoplanets constitute just 3.6% of confirmed catalog entries (223 of 6,153) because current surveys struggle to detect Earth-sized transits around Sun-like stars. Third, archive data volume in NASA's Planetary Data System (PDS)—where single orbital missions such as the Lunar Reconnaissance Orbiter or Mars Reconnaissance Orbiter deliver hundreds of terabytes—dwarfs exoplanet photometry in byte volume, whereas exoplanet catalogs provide the statistical sample sizes ($N > 6{,}000$) unreachable in an eight-planet Solar System. Consequently, this report uses multi-proxy evidence—combining Solar System spacecraft heritage, NASA Exoplanet Archive population tallies as of March 2026, JWST spectroscopic target focus, and equation-of-state distinctiveness—to establish the five categories as an unranked, co-equal foundational set.

## 2. Planetary Classification Analysis

### 2.1 Formal Definitions of "Planet" and Scope Boundaries

Planetary science currently operates under two complementary International Astronomical Union (IAU) definitions that bound the domain of this study. For the Solar System, IAU 2006 Resolution B5 (5A) defines a planet as a celestial body that (a) orbits the Sun, (b) has sufficient mass for its self-gravity to overcome rigid-body forces so that it assumes a hydrostatic equilibrium (nearly round) shape, and (c) has cleared the neighborhood around its orbit. Companion Resolution 5B, which proposed an umbrella grouping over classical and dwarf planets, was defeated; the IAU explicitly resolved that planets and dwarf planets are two distinct classes of objects. Among icy trans-Neptunian bodies, the empirical threshold for compact hydrostatic equilibrium lies near radii of ~400–425 km and masses of ~0.5 × 10²¹ kg, whereas dynamical neighborhood clearing requires masses above roughly 10²³ kg. Under this resolution and assignment scope, all dwarf planets (Pluto, Ceres, Eris, Haumea, and Makemake) are excluded entirely.

For extrasolar systems, IAU Commission F2 ("Exoplanets and the Solar System") adopted an official working definition in 2018, documented by Lecavelier des Etangs & Lissauer (2022) and reaffirmed through the 2021–2024 triennium. An object is an exoplanet if it satisfies four conditions:

- **(a) Mass ceiling:** true mass below the limiting mass for thermonuclear fusion of deuterium (~13 Jupiter masses, or ~2.5 × 10²⁸ kg, for solar metallicity), regardless of how it formed.
- **(b) Bound orbit:** a bound orbit around one or more stars, brown dwarfs, or stellar remnants.
- **(c) Mass ratio:** a companion-to-central-object mass ratio below the $L_4/L_5$ Lagrange linear stability threshold, $M_p/M_\text{central} < 2/(25+\sqrt{621}) \approx 1/25$.
- **(d) Mass floor:** minimum mass and size meeting the Solar System criteria for hydrostatic equilibrium and local dynamical dominance.

Substellar objects above 13 Jupiter masses are brown dwarfs, bound companions with $M_p/M_\text{central} \ge 1/25$ are sub-brown-dwarf binary components, and unbound free-floating objects below 13 Jupiter masses in young star clusters are sub-brown dwarfs rather than planets. Although newer quantitative proposals (e.g., Margot et al. 2024) have advocated unifying Solar System and extrasolar definitions via strict mass bounds ($10^{23}\ \text{kg} < M_p < 2.5\times10^{28}\ \text{kg}$) around any star, brown dwarf, or stellar remnant, IAU Resolution B5 and the Commission F2 working definition remain the governing standards as of 2026.

### 2.2 Disentangling Overlapping Classification Taxonomies

Misleading rankings in popular astronomy arise when three orthogonal physical classification schemes are mixed indiscriminately.

**Geophysical composition taxonomies** classify worlds by the dominant material governing their interior equation of state: refractory rocky/metallic worlds (iron–nickel + magnesium/iron silicates), ice-dominated worlds (water, methane, and ammonia ices/fluids + rock), and gas-dominated worlds (hydrogen–helium metallic/molecular envelopes). Early NASA summary notes historically grouped Jupiter, Saturn, Uranus, and Neptune together as "gas giants", whereas modern interior physics strictly separates hydrogen-dominated Gas Giants (Jupiter, Saturn) from heavy-element-dominated Ice Giants (Uranus, Neptune).

By contrast, **observational demographic taxonomies** classify exoplanets by empirical features in the radius–mass plane measured via transit photometry ($R_p/R_\star$) and radial velocities or transit-timing variations ($M_p$). Precision Kepler and TESS radius distributions revealed a pronounced bimodal distribution among close-in planets between 1 and 4 Earth radii (R⊕): a lower peak near 1.3–1.5 R⊕ (Super-Earths), a paucity of worlds near 1.6–1.8 R⊕ termed the radius valley or Fulton gap, an upper peak near 2.4–2.5 R⊕ (Sub-Neptunes), and an abrupt radius cliff at 3.0–3.5 R⊕ above which planetary occurrence drops by nearly an order of magnitude—from ~0.60 planets per FGK star (1–4 R⊕) to ~0.08 planets per star (>4 R⊕) inside 0.5 au.

Finally, **thermal and orbital environment modifiers**—such as Hot Jupiter, Ultra-Hot Jupiter, Warm Neptune, Ultra-Short-Period (USP) Lava World, or Habitable-Zone Eyeball Planet—describe stellar insolation and orbital period rather than bulk elemental inventory. A Hot Jupiter shares its bulk hydrogen–helium composition with Jupiter, differing in radiative inflation, synchronous tidal locking, and atmospheric photochemistry.

### 2.3 Evaluation of Candidate Categories and Selection of the Final Five

Table 2.1 evaluates the principal candidate classifications recognized across planetary science against our seven selection proxies, demonstrating why Terrestrial Planets, Super-Earths, Sub-Neptunes, Ice Giants, and Gas Giants form the most defensible five-category scientific foundation.

**Table 2.1.** Candidate planetary categories evaluated against the seven selection proxies.

<!-- docx-table widths="1500,1450,1650,1700,1750,1670" -->

| Candidate Category | Taxonomic Basis | Solar System In Situ Data | Confirmed Exoplanet Sample (2026) | Distinct Governing Physics / EOS | Decision & Scientific Justification |
| --- | --- | --- | --- | --- | --- |
| Terrestrial Planets | Bulk composition & size (≤1.2 R⊕) | 4 planets; Apollo & InSight seismology, landers, rovers, MESSENGER, hundreds of TB in PDS | 223 confirmed (e.g., TRAPPIST-1 b–h, GJ 367 b); heavily prioritized by JWST | Moderate-pressure Fe core + silicate mantle; plate/stagnant-lid tectonics; N₂/CO₂/O₂ secondary atmospheres | **Selected (Type 1).** Unmatched empirical precision and direct geophysical truth; baseline for habitability and comparative planetology. |
| Super-Earths | Size/mass demographic (1.2–1.8 R⊕, below Radius Valley) | 0 planets (absent in Solar System) | 1,782 confirmed; peak near 1.3–1.5 R⊕; major Kepler/TESS/JWST sample | Multi-hundred-GPa to TPa silicate & Fe compression; XUV/core-powered stripping; magma-ocean outgassing | **Selected (Type 2).** Probes solid-state compression well beyond Earth's interior and anchors the lower peak of the bimodal exoplanet distribution. |
| Sub-Neptunes (Mini-Neptunes) | Size/mass demographic (1.8–3.5 R⊕, Valley to Cliff) | 0 planets (absent in Solar System) | Majority of NASA's 2,076 "Neptune-like" bin; most abundant close-in planet class (~0.4–0.6 per FGK star) | Steep $R \propto M^{0.67}$ scaling; ~1–5 wt% H₂–He or supercritical H₂O envelope chemically coupled to silicate magma core | **Selected (Type 3).** Most common known planet class in the inner galaxy; focus of intensive JWST atmospheric retrieval campaigns. |
| Ice Giants (Neptunian Worlds) | Bulk composition & size (3.5–6.0 R⊕, above Radius Cliff) | 2 planets (Uranus, Neptune); Voyager 2 flybys, HST/JWST monitoring, NIF shock-compression labs | Remainder of 2,076 "Neptune-like" bin (e.g., GJ 436 b, HAT-P-11 b, GJ 3470 b); defines "Neptune desert" | 80–90 wt% heavy elements; ionic ice X and superionic ice XVIII mantles (>70 GPa); multipolar thin-shell dynamos | **Selected (Type 4).** Physically distinct from both Gas Giants and Sub-Neptunes in bulk heavy-element mass (10–30 M⊕) and superionic interior physics. |
| Gas Giants (Jovian Worlds) | Bulk composition & mass (≥6 R⊕, 0.15–13 $M_J$) | 2 planets (Jupiter, Saturn); Pioneer, Voyager, Galileo probe, Cassini, Juno | 2,065 confirmed; first exoplanets around Sun-like stars (51 Peg b); richest JWST spectral sample | Liquid metallic hydrogen; electron degeneracy ($R \propto M^{-0.06}$); dilute fuzzy cores; helium depletion/semiconvection | **Selected (Type 5).** Dominates planetary system angular momentum and mass budgets; encompasses both Cold Jovians and irradiated Hot Jupiters. |
| Hot Jupiters (as separate 5th class) | Insolation / orbital regime ($P \le 10$ d, $T_\text{eq} \ge 1{,}000$ K) | 0 planets | Hundreds within the 2,065 Gas Giant count | Same H₂–He bulk EOS as Gas Giants, modified by radiative inflation and tidal/magnetic heating | **Subsumed into Gas Giants.** Treating an orbital irradiation regime as a peer to bulk compositional classes mixes orthogonal axes; analyzed in Section 3.5. |
| Ocean / Hycean Worlds | Hypothesized phase layer | 0 classical planets (only icy moons) | Candidate interpretations only (e.g., K2-18 b, LHS 1140 b); debated against magma-ocean models | Liquid H₂O ocean over high-pressure ice VI/VII beneath H₂ or N₂ atmosphere | **Subsumed as interior sub-models.** Currently degenerate with magma-ocean gas dwarfs in JWST spectra; treated inside Sections 3.2 and 3.3. |
| Lava / Carbon / Rogue Worlds | Thermal extreme, rare C/O ratio, or unbound | 0 planets | USP lava worlds are hot Super-Earths/Terrestrials; carbon worlds hypothetical; rogues excluded by IAU F2 | Silicate vapor/magma outgassing (USP) or SiC/graphite EOS (theoretical) | **Excluded / subsumed.** Free-floating sub-brown dwarfs fail IAU bound-orbit rules; carbon planets remain theoretical; USP lava worlds are treated in Section 3.2. |

## 3. Comprehensive Scientific Profiles of the Five Planet Types

Across these five categories, radial internal phase architecture and the physical meaning of "surface" and "radius" evolve systematically. Terrestrial Planets progress outward from a solid/liquid iron–nickel core through a silicate mantle to a rigid crust, and Super-Earths compress that iron-core and deep-silicate-mantle architecture to multi-megabar pressures beneath either a solid surface or an outgassed envelope atop a silicate magma ocean. By contrast, Sub-Neptunes (rock–iron core overlain by a molten magma or supercritical fluid layer and a hydrogen–helium gas envelope), Ice Giants (compact or graded rock–iron core surrounded by a deep ionic and superionic water–ammonia–methane mantle beneath a hydrogen–helium–methane cloud deck), and Gas Giants (stably stratified dilute heavy-element core grading continuously into liquid metallic hydrogen and an outer molecular hydrogen–helium envelope) possess no solid outer surface. Consequently, for fluid-enveloped worlds, "planetary radius" and "surface gravity" must always be referenced to an explicit atmospheric pressure level—conventionally the 1-bar (10⁵ Pa) isobar for Solar System giants and the slant optical/infrared transit photosphere (~0.1–100 mbar) for transiting exoplanets.

### 3.1 Profile 1: Terrestrial Planets

#### 3.1-A Terrestrial Physical Properties and Fundamental Metrics

Terrestrial planets are compact, refractory-dominated worlds characterized by radii ≤1.2 R⊕ (7.6 × 10⁶ m) and masses spanning the dynamical clearing limit (~10²³ kg, or ~0.02 M⊕) up to ~1.5 M⊕ (~9 × 10²⁴ kg). Within the Solar System, Mercury (0.33010 × 10²⁴ kg, volumetric mean radius 2.4397 × 10⁶ m), Mars (0.64169 × 10²⁴ kg, 3.3895 × 10⁶ m), Venus (4.8673 × 10²⁴ kg, 6.0518 × 10⁶ m), and Earth (5.9722 × 10²⁴ kg, 6.3710 × 10⁶ m) span an order of magnitude in mass. Extrasolar terrestrial benchmarks such as the seven transiting worlds of the M8V star TRAPPIST-1 (masses 0.326 to 1.374 M⊕; radii 0.755 to 1.129 R⊕) and the ultra-dense sub-Earth GJ 367 b (0.55 M⊕, 0.72 R⊕) extend empirical characterization to compact extrasolar systems.

Standard gravitational parameters ($GM$, in m³ s⁻²) for Solar System terrestrials are directly measured to 10⁻⁸–10⁻¹⁰ relative precision via spacecraft radio Doppler tracking (e.g., Mercury $GM = 2.2031874\times10^{13}\ \text{m}^3\,\text{s}^{-2}$ from MESSENGER; Earth nominal $(GM)^{\mathcal{N}}_\text{E} = 3.986004\times10^{14}\ \text{m}^3\,\text{s}^{-2}$), whereas absolute masses ($M = GM/G$, in kg) carry the ~2.2–4.7 × 10⁻⁵ uncertainty of Newton's constant $G$. For exoplanets, masses are derived via Doppler radial velocities or transit-timing variations (TTVs, yielding 3–5% uncertainty in TRAPPIST-1). Radii and volumes (6.083 × 10¹⁹ m³ for Mercury to 1.08321 × 10²¹ m³ for Earth) are directly measured via spacecraft laser/radar altimetry in the Solar System and derived to 1–3% precision via transit photometry around nearby M-dwarfs.

Bulk densities ($\bar{\rho}$, in kg m⁻³) span 3,934 kg m⁻³ (Mars) to 5,513 kg m⁻³ (Earth) in the Solar System, reaching ~8,000 kg m⁻³ in iron-rich extrasolar "super-Mercuries" such as GJ 367 b. Crucially, gravitational self-compression separates observed bulk density from uncompressed material density: Mercury's bulk density (5,429 kg m⁻³) nearly matches Earth's (5,513 kg m⁻³) despite Mercury having 18× less mass, reflecting a metallic core that fills nearly 85% of Mercury's volume. Solid-surface gravities ($g$, in m s⁻²) span 3.70 m s⁻² (Mercury) and 3.73 m s⁻² (Mars) to 8.87 m s⁻² (Venus), 9.820 m s⁻² (Earth mean; 9.780 m s⁻² equator, 9.83 m s⁻² pole), and 10.81 m s⁻² (TRAPPIST-1 b), corresponding to surface gravitational potentials $\lvert\Phi_s\rvert = GM/R$ of 9.0 × 10⁶ to 6.26 × 10⁷ J kg⁻¹ and escape velocities of 4.3 to 12.4 km s⁻¹.

Rotational dynamics vary widely: Earth ($P_\text{rot} = 23.9345$ h, $\omega = 7.292\times10^{-5}$ rad s⁻¹, obliquity 23.44°) and Mars (24.6229 h, obliquity 25.19°) exhibit modest polar flattening ($f = 0.003353$ and $0.00589$), whereas tidally evolved Mercury (1,407.6 h in a 3:2 spin–orbit state, obliquity 0.034°, $f = 0.0009$) and Venus (−5,832.6 h retrograde, obliquity 177.36°, $f = 0.000$) are virtually spherical. Normalized polar moments of inertia ($C/MR^2$, dimensionless) are measured via precession and libration: Earth (0.3308), Venus (0.337 ± 0.024 from radar speckle tracking), Mercury (0.3434 ± 0.0102 from MESSENGER radio/laser geodesy), and Mars (0.366)—all well below the 0.400 uniform-sphere ceiling, demonstrating central metallic core differentiation. Surface pressures span ~0 Pa (Mercury) to 9.2 × 10⁶ Pa (Venus, 92 bar), while internal core–mantle and central pressures span tens to hundreds of GPa (~140 GPa at Earth's core–mantle boundary and >172.5 GPa at Earth's center).

#### 3.1-B Terrestrial Internal Structure and Composition

Terrestrial planets share a three-tier differentiated architecture—crust, silicate mantle, and iron-alloy core—established during early magma-ocean metal–silicate separation, yet in situ geophysical missions show that their deep evolutionary states diverge dramatically. Earth (mapped seismically via PREM) comprises a thin crust, a convecting Mg/Fe-silicate mantle transitioning to post-perovskite near the core–mantle boundary ($R_c = 3{,}485$ km, $P_\text{CMB} \approx 140$ GPa), a convecting liquid outer core (~90 wt% Fe–Ni and ~10 wt% light elements), and a crystallizing solid inner core that powers the geodynamo. On Mars, initial 2021 InSight core-reflected shear-wave ($ScS$) inversions assuming a homogeneous mantle yielded a large, low-density liquid core ($R_c = 1{,}830 \pm 40$ km). In October 2023, farside meteorite-impact diffracted P-waves ($P_\text{diff}$) and Phobos tidal dissipation ($Q \approx 95 \pm 10$ vs. seismic shear $Q > 1{,}000$) indicated instead that Mars's liquid Fe-alloy core is smaller and denser ($R_c = 1{,}650 \pm 20$ km, density ~6,500 kg m⁻³) and is overlain by an ~150 km thick molten silicate basal mantle layer enriched in iron and radiogenic elements beneath a 20–37 km layered crust. That basal magma blanket thermally insulates the core, suppressing thermal core convection and explaining the demise of Mars's global magnetic field.

Mercury occupies an opposite compositional extreme: MESSENGER gravity ($J_2 = 50.3\times10^{-6}$, Love number $k_2 = 0.53 \pm 0.03$) and libration measurements show a metallic core filling nearly 85% of the planet's volume, containing a solid inner core ($r_\text{ic}/r_\text{oc} \approx 0.3$–$0.7$, with dynamo models favoring $\le 0.5$, or ~1,000 km radius) whose crystallization drives compositional buoyancy for Mercury's weak, northward-offset ($0.17\,R_M$) dipole field. Venus exhibits an Earth-like moment of inertia ($0.337 \pm 0.024$) but lacks mobile-lid plate tectonics and has no intrinsic global magnetosphere, consistent with stagnant- or episodic-lid mantle heat transport failing to cool its core rapidly enough for dynamo convection.

#### 3.1-C Terrestrial Atmospheric and Environmental Physics

Terrestrial atmospheres are secondary envelopes generated by interior outgassing, impact volatile delivery, and surface geochemical weathering. Environmental states depend acutely on planetary mass, escape history, and insolation rather than category membership alone. Across the Solar System, conditions span Mercury's surface-bounded exosphere (~0 bar), Mars's thin seasonally condensing CO₂ envelope (95.1% CO₂, 2.59% N₂, 1.94% Ar; mean molecular weight $\mu = 43.49$; 4.0–8.7 mbar seasonal surface pressure; scale height $H = 11.0$ km; mean temperature ~214 K with 184–242 K diurnal swings), Earth's ocean-buffered nitrogen–oxygen biosphere (mean molecular weight $\mu = 28.97$, 420 ppm CO₂; 1.014 bar; $H = 8.5$ km; mean temperature 288 K), and Venus's supercritical runaway-greenhouse envelope (96.5% CO₂; $\mu = 43.45$; 92 bar, surface density ~65 kg m⁻³; $H = 15.9$ km). Notably, Venus's sulfuric-acid cloud deck reflects 77% of sunlight ($A_B = 0.77$, solar irradiance 2,601.3 W m⁻²), yielding a blackbody equilibrium temperature of just 226.6 K—colder than Earth's 254.0 K—yet extreme CO₂ infrared opacity elevates Venus's surface temperature by >510 K to 737 K (464 °C). Around cool M-dwarf stars such as TRAPPIST-1, intense stellar winds and XUV irradiation challenge atmospheric survival; despite ongoing JWST transmission and thermal-emission campaigns on TRAPPIST-1 b, c, and e, definitive detection of an atmosphere around a rocky planet orbiting a cool star remains elusive as of 2026.

#### 3.1-D Terrestrial Formation and Planetary Evolution

Terrestrial planets assemble inside the protoplanetary snow line through planetesimal and radial pebble accretion into lunar-to-Martian-mass embryos, culminating in a 10–100 Myr giant-impact stage that drives magma-ocean core differentiation and late crustal/mantle erosion. Major unresolved questions include:

1. How radial pebble flux determines whether an inner disk forms low-mass terrestrials like the Solar System or massive Super-Earths.
1. Whether Mercury's oversized core arose from giant-impact mantle stripping or inner-disk iron fractionation.
1. Whether M-dwarf terrestrial worlds can retain or volcanic-outgas secondary atmospheres against prolonged pre-main-sequence XUV stripping.

### 3.2 Profile 2: Super-Earths

#### 3.2-A Super-Earth Physical Properties and Fundamental Metrics

In demographic and geophysical usage, Super-Earths are predominantly rocky–metallic planets larger and more massive than Earth that lie below the exoplanet radius valley: $1.2\,R_\oplus \le R_p \le 1.8\,R_\oplus$ (7.6 × 10⁶ to 1.15 × 10⁷ m, peaking near 1.3–1.5 R⊕) and $1.5\,M_\oplus \lesssim M_p \lesssim 10\,M_\oplus$ (9 × 10²⁴ to 6 × 10²⁵ kg). Because the Solar System lacks any planet between Earth and Uranus, all Super-Earth metrics are derived from remote transit photometry, extreme-precision radial velocities (EPRV), and interior EOS models. Radii are measured to 1.5–4% uncertainty on bright nearby hosts (e.g., LHS 1140 b: 1.730 ± 0.025 R⊕; 55 Cancri e: 1.88 ± 0.03 R⊕, or 1.856 R⊕) and masses to 3–15% (LHS 1140 b: 5.60 ± 0.19 M⊕; 55 Cancri e: 7.99 ± 0.30 M⊕; TOI-1452 b: 4.82 ± 1.30 M⊕). Claims of bare rocky "mega-Earths" above 10–20 M⊕ require caution: recent radial-velocity reanalyses indicate that several purported mega-Earth masses are artifacts of stellar magnetic activity, while piecewise statistical fits to 688 PlanetS exoplanets place the natural population transition from bare rocky worlds to volatile-accreting worlds at 4.37 ± 0.72 M⊕ (1.64 ± 0.05 R⊕), with stripped close-in cores extending the rocky branch to ~8–10 M⊕.

Gravitational self-compression drives Super-Earth bulk densities to 5,000–8,500 kg m⁻³ (e.g., ~5,900 kg m⁻³ on LHS 1140 b, ~6,250 kg m⁻³ on 55 Cancri e, and ~8,000 kg m⁻³ on super-Mercury K2-229 b). Surface gravities reach 12–30 m s⁻² (18.4 m s⁻² on LHS 1140 b; 22.2 m s⁻² on 55 Cancri e) and escape velocities reach 13–26 km s⁻¹. Spin rates, axial tilts, and moments of inertia ($C/MR^2 \approx 0.31$–$0.35$, theoretical) cannot yet be measured directly, though short-period Super-Earths are dynamically inferred to be tidally locked. Internal core–mantle and central pressures span ~0.3 to >3 TPa (3–30+ Mbar), with core–mantle boundary temperatures scaling via Stixrude's relation ($T_\text{CMB} \propto P_\text{CMB}^{0.48}$) to 6,000–10,000 K.

#### 3.2-B Super-Earth Internal Structure and Composition

Super-Earths compress differentiated iron–nickel cores and MgSiO₃ bridgmanite/post-perovskite mantles into multi-hundred-GPa and terapascal regimes. Interior modeling shows that ultra-high-pressure post-perovskite phase transformations alter total planetary radius only minutely compared to the iron core mass fraction ($\mathrm{CMF}$). However, near the upper radius boundary (1.6–1.8 R⊕), mass and radius measurements alone suffer from severe compositional degeneracy: LHS 1140 b (5.60 M⊕, 1.730 R⊕), for instance, is slightly less dense than a pure Earth-composition rock, admitting either a 9–19 wt% water layer ("water world") or a thin gaseous envelope, while underdense hot Super-Earths can alternatively be modeled as "puffy Venuses" hosting thick CO/CO₂ atmospheres over molten silicate interiors.

#### 3.2-C Super-Earth Atmospheric and Environmental Physics

Super-Earths lack voluminous primordial H₂–He envelopes ($f_\text{env} \lesssim 0.01$–$0.1$ wt%), bifurcating environmentally by stellar irradiation. On Ultra-Short-Period (USP) Lava Worlds ($P_\text{orb} < 1$ d, dayside temperatures >2,000–3,700 K) such as 55 Cancri e ($P = 0.7365$ d), early models predicted bare molten rock or tenuous SiO/MgO mineral vapor. In 2024, JWST NIRCam/MIRI secondary-eclipse spectroscopy ruled out a bare rock-vapor-only scenario and provided evidence for a volatile secondary CO/CO₂ atmosphere sustained by outgassing from a dayside magma ocean—though multi-visit JWST occultations reveal strong temporal variability across visits that may reflect episodic outgassing, cloud effects, or circumstellar dust. On temperate habitable-zone Super-Earths such as LHS 1140 b ($T_\text{eq} = 226$ K), JWST transmission spectra rule out cloud-free H₂-dominated atmospheres up to 1,000× solar metallicity and suggest a possible N₂-dominated atmosphere, while 2024 Magellan WINERED 10,833 Å spectroscopy detected an XUV-driven hydrodynamic outflow of metastable helium enriching heavy volatiles behind.

#### 3.2-D Super-Earth Formation and Planetary Evolution

Around 30–50% of FGKM stars host close-in Super-Earths and Sub-Neptunes, nearly independent of host-star metallicity. Two established mass-loss mechanisms carve Super-Earths out of initially gas-enveloped protoplanets across the radius valley (slope $d\log R_p/d\log P \approx -0.09$ to $-0.11$): XUV photoevaporation driven by early stellar high-energy radiation (Lopez & Fortney 2013; Owen & Wu 2013/2017) and core-powered mass loss driven over Gyr timescales by the cooling luminosity of the planet's own silicate–iron core (Ginzburg et al. 2018). Active debates persist between these atmospheric-stripping models and gas-depleted formation scenarios in dissipating disks, alongside the question of why our Solar System lacks any Super-Earth.

### 3.3 Profile 3: Sub-Neptunes (Mini-Neptunes)

#### 3.3-A Sub-Neptune Physical Properties and Fundamental Metrics

Sub-Neptunes occupy the radius regime between the radius valley (~1.8 R⊕) and the radius cliff (~3.0–3.5 R⊕, or 1.15 × 10⁷ to 2.23 × 10⁷ m), with masses typically between 3 and 15 M⊕ (1.8 × 10²⁵ to 9 × 10²⁵ kg). Completely absent from the Solar System, Sub-Neptunes are the most prevalent planet type inside 100-day orbits, with occurrence $dN/d\ln a \approx 0.20$ per FGK star (double that of Super-Earths). Transit radii and EPRV/TTV masses are well constrained for benchmark systems including TOI-270 d (4.78 ± 0.43 M⊕ in Van Eylen et al. 2021 or 4.20 ± 0.16 M⊕ in Kaye et al. 2022; 2.133 ± 0.058 R⊕), GJ 1214 b (8.17 ± 0.43 M⊕, 2.74 R⊕ in Cloutier et al. 2021; 8.41 M⊕, 2.733 R⊕ in updated compilations), and K2-18 b (8.63 ± 1.35 M⊕; 2.610 ± 0.087 R⊕).

Crucially, Sub-Neptunes overlap Super-Earths directly in the 4–9 M⊕ mass band (compare TOI-270 d at 4.78 M⊕ and GJ 1214 b at 8.17–8.41 M⊕ against LHS 1140 b at 5.60 M⊕ and 55 Cancri e at 7.99 M⊕), yet their gaseous/volatile envelopes inflate their radii by ~1.5–2× and drop their bulk densities by ~3× to 600–3,500 kg m⁻³ (typically 2,200–2,720 kg m⁻³, down to ~650 kg m⁻³ in puffy LP 791-18 c). Photospheric gravities remain remarkably Earth-like at 6–14 m s⁻² (9.1–10.3 m s⁻² on TOI-270 d; 10.65 m s⁻² on GJ 1214 b; 12.4 m s⁻² on K2-18 b), while escape velocities span 15–22 km s⁻¹ and orbital eccentricities in multi-planet chains remain low. Moments of inertia ($C/MR^2 \approx 0.18$–$0.28$, theoretical) are strongly centrally concentrated because 90–98% of the planet's mass resides in its dense core.

#### 3.3-B Sub-Neptune Internal Structure and Composition

Sub-Neptune mass–radius coordinates admit three competing interior paradigms currently under intense JWST scrutiny:

- **Gas Dwarf models:** An Earth-like rock–iron core (~90–98 wt% of total mass) is blanketed by a 1–5 wt% H₂–He envelope whose opacity traps primordial heat, maintaining core–envelope boundary pressures above >10³–10⁵ bar and temperatures sufficient to sustain a long-lived basal silicate magma ocean where H₂ chemically reacts with silicate melt to produce endogenous H₂O and enrich the envelope in metals (though recent 2025 studies note that not all older or cooler Sub-Neptunes retain magma oceans).
- **Migrated Water/Steam World models:** Planets accrete 20–50 wt% H₂O ice beyond the snow line and migrate inward, forming supercritical steam envelopes miscible with H₂ above high-pressure ices.
- **Candidate Hycean models** (Madhusudhan et al. 2021/2023): The coldest Sub-Neptunes ($T_\text{eq} \lesssim 250$–$300$ K with sufficiently high Bond albedo) could host liquid water oceans beneath thin H₂-rich atmospheres, though runaway greenhouse transitions to supercritical steam remain a severe physical hurdle.

#### 3.3-C Sub-Neptune Atmospheric and Environmental Physics

JWST spectroscopy (2023–2026) overcame the aerosol-muted flat spectra of the Hubble era to reveal striking high-metallicity chemistry in Sub-Neptunes. On temperate TOI-270 d ($T_\text{eq} \approx 354$–$387$ K), JWST NIRISS + NIRSpec G395H detected strong CH₄ and CO₂ absorption with no NH₃ and a high mean molecular weight $\mu \approx 5.37$–$5.5$ u, modeled by Benneke et al. (2024) as a miscible metal-rich envelope atop a 90 wt% rock–iron core. On warm GJ 1214 b ($T_{\text{eq},A=0} \approx 600$ K), a JWST MIRI phase curve measured a high Bond albedo of 0.51 ± 0.06 ($T_\text{day} = 553 \pm 9$ K, $T_\text{night} = 437 \pm 19$ K) and constrained $\mu > 15$ u (>100× solar hazy, potentially CO₂-rich envelope), while warmer GJ 9827 d exhibited a steam-dominated atmosphere (>31.6% H₂O by volume, $\mu \approx 9.84$ u). On cold K2-18 b ($T_\text{eq} \approx 250$–$284$ K), JWST detected ~1% CH₄ and CO₂ without NH₃—plus contested 1–3σ inferences of dimethyl sulfide/disulfide (DMS/DMDS) in NIRSpec and MIRI LRS that independent data-reduction pipelines (e.g., Schmidt et al. 2025) and photochemical/magma-ocean mini-Neptune models (Wogan et al. 2024; Shorttle et al. 2024) vigorously debate.

#### 3.3-D Sub-Neptune Formation and Planetary Evolution

Sub-Neptunes assemble in gas-rich disks via pebble/planetesimal core growth coupled with inward Type I migration into compact multi-planet chains. To explain the sharp radius cliff near 3.0–3.5 R⊕, Kite et al. (2019) demonstrated that once envelope base pressures reach several GPa (~3 R⊕), Henry's-law dissolution of H₂ into the underlying magma ocean sequestered newly accreted gas into the interior rather than expanding the radius—reinforced by boil-off during disk dispersal and late embryo collisions.

### 3.4 Profile 4: Ice Giants (Neptunian Worlds)

#### 3.4-A Ice Giant Physical Properties and Fundamental Metrics

Ice Giants (and extrasolar Neptunian Worlds above the 3.5 R⊕ cliff) span ~3.5–6.0 R⊕ (2.2 × 10⁷ to 3.8 × 10⁷ m) and ~10–40 M⊕ (6 × 10²⁵ to 2.4 × 10²⁶ kg), defined compositionally by heavy elements comprising 80–90% of planetary mass beneath a 10–20 wt% H₂–He envelope. Solar System archetypes Uranus (86.811 × 10²⁴ kg = 14.54 M⊕; 1-bar volumetric mean radius 25,362 ± 7 km = 3.981 R⊕) and Neptune (102.409 × 10²⁴ kg = 17.15 M⊕; 24,622 ± 19 km = 3.865 R⊕) display an inverted mass–radius pair: Neptune is 18% more massive yet 2.9% smaller in radius, giving a 29% higher bulk density (1,638 ± 4 kg m⁻³ vs. Uranus's 1,270 ± 1 kg m⁻³). Extrasolar transiting Neptunes such as GJ 436 b (22.2 M⊕, 4.1–4.3 R⊕) and HAT-P-11 b (25.7 M⊕, 4.73 R⊕) show wide structural diversity—contrast Kepler-30 d at 23.1 M⊕ but 8.8 R⊕, which is ~70% H/He gas despite its Neptunian mass.

Masses and low-degree zonal harmonics ($J_2$, $J_4$) of Uranus and Neptune were directly measured by Voyager 2 radio tracking and satellite astrometry ($J_{2,U} = 3{,}510.68 \pm 0.70\times10^{-6}$ at $R_\text{ref} = 25{,}559$ km; $J_{2,N} = 3{,}408.43 \pm 4.50\times10^{-6}$ at $R_\text{ref} = 25{,}225$ km), while radio occultations measured 1-bar oblateness ($f_U = 0.02293$; $f_N = 0.01708$). Reference 1-bar gravities are close to Earth's ($g_{m,U} = 9.01$ m s⁻², $g_{\text{eq},U} = 8.69$ m s⁻²; $g_{m,N} = 11.27$ m s⁻², $g_{\text{eq},N} = 11.00$ m s⁻²), while escape velocities double Earth's (21.3 and 23.5 km s⁻¹). Crucially, bulk interior rotation periods and moments of inertia of Uranus and Neptune remain uncertain: Voyager 2 radio periods (−17.24 h retrograde with 97.77° axial tilt on Uranus; 16.11 h with 28.32° tilt on Neptune) may not track the deep interior (dynamical height minimizations suggest ~15 h interior periods are possible), and $C/MR^2$ is model-inferred (~0.22–0.225 for Uranus vs. 0.23–0.25 for Neptune, indicating Uranus is more centrally concentrated).

#### 3.4-B Ice Giant Internal Structure and Composition

"Ice Giant" denotes nebular volatile origin rather than cold solid ice inside present-day Uranus and Neptune. Beneath an outer molecular H₂–He–CH₄ fluid envelope (~0.8–1.0 $R_p$, where differential zonal winds penetrate ~1,000 km deep and pressures never reach hydrogen metallization), water, ammonia, and methane compress at 10–30 GPa and ~2,000 K into an electrically conducting ionic fluid ($\sigma_\text{el} \approx 10$–$30$ S cm⁻¹). Above 70–100 GPa and 2,000–5,000 K, LLNL/NIF laser-shock and X-ray diffraction experiments by Millot et al. (2018, 2019) provided direct experimental evidence that H₂O transforms into Superionic Ice XVIII, featuring liquid-like H⁺ protons diffusing rapidly through a solid fcc oxygen crystal lattice ($\sigma_\text{el} > 100$ S cm⁻¹, with further transitions to orthorhombic Ice XXII above 308 GPa and predicted superionic carbon–hydride states reported in 2026). Dynamo generation within a relatively thin convecting ionic shell above a stably stratified or superionic core accounts for the strongly tilted, offset multipolar magnetic fields measured by Voyager 2 (Uranus: 58.6° tilt, 0.352 $R_U$ offset; Neptune: 46.9° tilt, 0.485 $R_N$ offset). Deep rock–iron cores may be either compact or smeared into continuous rock–ice composition gradients.

#### 3.4-C Ice Giant Atmospheric and Environmental Physics

Uranus (82.5% H₂, 15.2% He, 2.3% CH₄; $\mu = 2.64$; $T_\text{1bar} = 76$ K; $H = 27.7$ km) and Neptune (80.0% H₂, 19.0% He, 1.5% CH₄; $\mu = 2.53$–$2.69$; $T_\text{1bar} = 72$ K; $H = 19.1$–$20.3$ km) contain methane, ammonia ice, ammonium hydrosulfide, and deep water-ice aerosol layers. Despite receiving 2.45× less sunlight than Uranus (1.508 vs. 3.69 W m⁻²), Neptune exhibits virtually the same effective temperature (59.3 ± 0.8 K vs. 59.1 ± 0.3 K) because Neptune radiates an intense internal heat flux of 0.433 ± 0.046 W m⁻² ($P_\text{out}/P_\text{in} = 2.61 \pm 0.28$), whereas Uranus's newly resolved orbital-average internal flux is only 0.078 ± 0.018 W m⁻² ($P_\text{out}/P_\text{in} = 1.15 \pm 0.06$, varying seasonally from 1.03 to 1.24 across its extreme 97.77° obliquity cycle). Close-in exo-Neptunes reveal clear upper-atmosphere H₂O vapor on HAT-P-11 b, tidally heated disequilibrium chemistry on eccentric GJ 436 b, and rapid atmospheric photoevaporation on GJ 3470 b at the edge of the Hot Neptune Desert—suggesting that strongly irradiated Neptunes erode into bare Super-Earth cores.

#### 3.4-D Ice Giant Formation and Planetary Evolution

Forming 14–17 M⊕ cores at 19–30 au within disk lifetimes requires pebble accretion and/or formation closer to the Sun followed by planetesimal-driven outward migration (potentially switching Uranus and Neptune's orbital order). Key open questions include why Uranus's interior heat is trapped by composition gradients or H₂–H₂O demixing relative to Neptune, what their true deep spin rates are, and why cold Neptunes appear rarer in some microlensing analyses than inner Sub-Neptunes.

### 3.5 Profile 5: Gas Giants (Jovian Worlds)

#### 3.5-A Gas Giant Physical Properties and Fundamental Metrics

Gas Giants are hydrogen–helium-dominated planets spanning ~50 to 4,130 M⊕ (~0.15 to 13 $M_J$, or 3 × 10²⁶ to 2.5 × 10²⁸ kg; statistical H–He dominance breakpoint fitted at 127 ± 7 M⊕ by Müller et al. 2024, with Saturn at 95.16 M⊕). Because degenerate electron pressure balances self-gravity ($R \propto M^{-0.06}$), cold Gas Giants across nearly two orders of magnitude in mass share radii near ~9–11 R⊕ (Saturn $R_m = 58{,}232 \pm 6$ km = 9.140 R⊕; Jupiter $R_m = 69{,}911 \pm 6$ km = 10.973 R⊕), whereas strongly irradiated Hot Jupiters and Hot Saturns inflate up to 1.2–2.0 $R_J$ (~13–22 R⊕, e.g., WASP-39 b at 0.28 $M_J$ and 1.27 $R_J$; HD 209458 b at 0.685 $M_J$ and 1.359 $R_J$; HD 189733 b at 1.144 $M_J$ and 1.138 $R_J$; WASP-12 b at 1.47 $M_J$ and 1.90 $R_J$).

Juno at Jupiter ($M_J = 1{,}898.125 \pm 0.088\times10^{24}$ kg, $J_2 = 14{,}696.5735 \pm 0.00056\times10^{-6}$) and Cassini Grand Finale orbits at Saturn ($M_S = 568.317 \pm 0.026\times10^{24}$ kg, $J_2 = 16{,}290.573 \pm 0.0093\times10^{-6}$) measured zonal harmonics through $J_{10}$. Fast spin—9.9250 h on Jupiter (obliquity 3.13°) and 10 h 33 m 38 s on Saturn (measured via C-ring seismology, revising Voyager's drifting 10.656 h radio period; obliquity 26.73°)—drives pronounced 1-bar flattening: 6.487% on Jupiter ($R_\text{eq} = 71{,}492$ km vs. $R_\text{pole} = 66{,}854$ km) and 9.796% on Saturn ($R_\text{eq} = 60{,}268$ km vs. $R_\text{pole} = 54{,}364$ km). Bulk densities span ~175 kg m⁻³ (WASP-39 b) and 687.1 kg m⁻³ (Saturn—both less dense than liquid water at 1,000 kg m⁻³) to 1,326.2 kg m⁻³ (Jupiter) and >10,000 kg m⁻³ in massive cold super-Jupiters. Reference 1-bar gravities on Saturn ($g_\text{eq} = 8.96$ m s⁻², $g_\text{pole} = 12.14$ m s⁻²) and WASP-39 b (~4.3 m s⁻²) are Earth-like or lower, whereas Jupiter reaches $g_\text{eq} = 23.12$ m s⁻² ($g_\text{pole} = 27.01$ m s⁻²) and escape velocities reach 35.5 km s⁻¹ (Saturn) and 59.5 km s⁻¹ (Jupiter). Normalized polar moments of inertia constrained by gravity+wind models are $C/MR_\text{eq}^2 = 0.26393 \pm 0.00001$ for Jupiter and $0.2181 \pm 0.0002$ for Saturn (legacy NSSDC values: 0.254 and 0.210), with differential zonal winds (~3,000 km deep on Jupiter; ~9,000–10,000 km deep on Saturn) dominating MoI uncertainty.

#### 3.5-B Gas Giant Internal Structure and Composition

Gas Giants transition continuously from ~0.16–0.19 kg m⁻³ molecular gas at 1 bar to multi-thousand kg m⁻³ degenerate metallic interiors without any solid surface. Jupiter's outer ~20% by radius consists of molecular H₂–He rotating differentially on cylinders before pressure-ionizing inward into electrically conducting liquid metallic hydrogen, which drives Jupiter's intense magnetosphere (4.30 Gauss·$R_J^3$ dipole, 9.4° tilt, 4–13 Gauss at 1 $R_J$). In cooler Saturn, severe atmospheric helium depletion (3.25% ± 2.4% by volume vs. Jupiter's 10.2% ± 2.0%) reflects interior helium phase separation/semiconvection, releasing gravitational heat and helping axisymmetrize Saturn's magnetic dipole (0.0° tilt, with strong quadrupole/octupole moments). Crucially, Juno's smaller-than-predicted $\lvert J_4\rvert$ and $\lvert J_6\rvert$ moments at Jupiter (Wahl et al. 2017; Militzer et al. 2022) and Cassini C-ring detections of $g$-mode gravity pulsations at Saturn (Mankovich & Fuller 2021) indicate that both giants host diffuse, stably stratified heavy-element cores extending to ~30–50% of Jupiter's radius (total heavy-element budget ~24–46 M⊕ depending on EOS) and ~60% of Saturn's radius (~17 M⊕ of rock and ice in the diffuse core).

#### 3.5-C Gas Giant Atmospheric and Environmental Physics

Cold Gas Giants Jupiter ($T_\text{1bar} = 165$ K, $\mu = 2.22$, $H = 27$ km, equatorial winds up to 150 m s⁻¹) and Saturn ($T_\text{1bar} = 134$ K, $\mu = 2.07$, $H = 59.5$ km, equatorial winds up to 400 m s⁻¹) host ammonia-ice, ammonium-hydrosulfide, and water-ice cloud decks and radiate roughly twice the power they absorb from the Sun ($P_\text{out}/P_\text{in} = 2.132$ on Jupiter; 1.775 on Saturn). By contrast, close-in Hot Jupiters ($T_\text{eq} \sim 1{,}000$–$4{,}000$ K, with KELT-9 b hotter than many stars) exhibit low optical geometric albedos (~0.10) alongside higher Bond albedos (~0.35) and strong zonal advection. On benchmark inflated Hot Saturn WASP-39 b ($T_\text{eq} \approx 1{,}100$ K), JWST Early Release Science across 0.5–5.5 µm detected H₂O, CO₂, H₂S, and photochemically produced SO₂ at ~10–100× solar metallicity.

#### 3.5-D Gas Giant Formation and Planetary Evolution

Gas Giant occurrence around solar-type stars (~10–15%, rising steeply with host metallicity $Z_\star$ and stellar mass $M_\star$) supports core accretion of supercritical solid cores within the <10 Myr gas-disk lifetime followed by runaway gas accretion. Major unresolved problems include the origin of fuzzy dilute cores (concurrent early gas+solid accretion vs. giant impacts vs. convective erosion), disk migration versus high-eccentricity tidal migration for Hot Jupiters (tested by young close-in giants like HIP 67522 b), and the physical mechanism driving Hot Jupiter radius inflation.

## 4. Mathematical and Physical Model Reference

All equations and worked calculations below adopt CODATA 2018/2022 SI constants and IAU 2012 Resolution B2 / IAU 2015 Resolution B3 exact nominal conversion constants, listed in Table 4.1. Spacecraft radio science measures $GM$ five orders of magnitude more precisely than $G$, so every worked example works from $GM$ wherever a measured value exists.

**Table 4.1.** Adopted physical constants and IAU nominal conversion constants.

<!-- docx-table widths="3300,1700,2900,1820" mono="2" -->

| Quantity | Symbol | Value | Standard |
| --- | --- | --- | --- |
| Newtonian constant of gravitation | $G$ | 6.67430 × 10⁻¹¹ m³ kg⁻¹ s⁻² | CODATA 2018/2022 |
| Stefan–Boltzmann constant | $\sigma_\text{SB}$ | 5.670374419 × 10⁻⁸ W m⁻² K⁻⁴ | CODATA 2018/2022 |
| Boltzmann constant | $k_B$ | 1.380649 × 10⁻²³ J K⁻¹ | CODATA 2018/2022 |
| Molar gas constant | $R_\text{gas}$ | 8.314462618 J mol⁻¹ K⁻¹ | CODATA 2018/2022 |
| Atomic mass constant | $u$ | 1.66053906660 × 10⁻²⁷ kg | CODATA 2018/2022 |
| Standard acceleration of gravity | $g_0$ | 9.80665 m s⁻² | Conventional (exact) |
| Astronomical unit | au | 1.495978707 × 10¹¹ m | IAU 2012 Res. B2 |
| Nominal solar mass parameter | $(GM)^{\mathcal{N}}_\odot$ | 1.3271244 × 10²⁰ m³ s⁻² | IAU 2015 Res. B3 |
| Nominal solar luminosity | $L^{\mathcal{N}}_\odot$ | 3.828 × 10²⁶ W | IAU 2015 Res. B3 |
| Nominal solar radius | $R^{\mathcal{N}}_\odot$ | 6.957 × 10⁸ m | IAU 2015 Res. B3 |
| Nominal total solar irradiance | $S^{\mathcal{N}}_\odot$ | 1,361 W m⁻² | IAU 2015 Res. B3 |
| Nominal terrestrial mass parameter | $(GM)^{\mathcal{N}}_\text{E}$ | 3.986004 × 10¹⁴ m³ s⁻² | IAU 2015 Res. B3 |
| Nominal terrestrial equatorial radius | $R^{\mathcal{N}}_\text{eE}$ | 6.3781 × 10⁶ m | IAU 2015 Res. B3 |
| Nominal Jovian mass parameter | $(GM)^{\mathcal{N}}_\text{J}$ | 1.2668653 × 10¹⁷ m³ s⁻² | IAU 2015 Res. B3 |
| Nominal Jovian equatorial radius | $R^{\mathcal{N}}_\text{eJ}$ | 7.1492 × 10⁷ m | IAU 2015 Res. B3 |

### 4.1 Gravitational and Orbital Mechanics

#### Model 4.1.1: Axisymmetric Multipole Gravitational Potential and Rotating Effective Gravity

**Mathematical expression:**

```math
\Phi(r,\theta) = -\frac{GM}{r}\left[1 - \sum_{k=1}^{\infty} J_{2k}\left(\frac{R_\text{eq}}{r}\right)^{2k} P_{2k}(\cos\theta)\right]
```

```math
U_\text{eff}(r,\theta) = \Phi(r,\theta) - \frac{1}{2}\,\omega^2 r^2 \sin^2\theta
```

```math
g_\text{eq} \approx \frac{GM}{R_\text{eq}^2}\left(1 + \frac{3}{2}J_2 - \frac{15}{8}J_4\right) - \omega^2 R_\text{eq}
```

```math
g_\text{pole} \approx \frac{GM}{R_\text{pole}^2}\left[1 - 3J_2\left(\frac{R_\text{eq}}{R_\text{pole}}\right)^2 - 5J_4\left(\frac{R_\text{eq}}{R_\text{pole}}\right)^4\right]
```

For a non-rotating spherical body ($J_{2k} = 0$, $\omega = 0$, $R_\text{eq} = R_\text{pole} = R$), this reduces to Newton's monopole acceleration $g = GM/R^2$.

**Variable definitions:**

- $\Phi$ — gravitational potential.
- $U_\text{eff}$ — co-rotating geopotential.
- $GM$ — standard gravitational parameter.
- $r$ — planetocentric radius.
- $\theta$ — colatitude from the spin pole.
- $R_\text{eq}$, $R_\text{pole}$ — equatorial and polar reference radii.
- $J_{2k}$ — dimensionless zonal gravity harmonics.
- $P_{2k}$ — Legendre polynomials.
- $\omega = 2\pi/P_\text{rot}$ — spin angular speed.
- $g_\text{eq}$, $g_\text{pole}$ — effective downward accelerations.

**SI units:** $\Phi$, $U_\text{eff}$ in m² s⁻² (or J kg⁻¹); $g_\text{eq}$, $g_\text{pole}$ in m s⁻²; $GM$ in m³ s⁻²; $r$, $R_\text{eq}$, $R_\text{pole}$ in m; $\omega$ in rad s⁻¹; $J_{2k}$ dimensionless.

**Physical principle:** Exterior to an axisymmetric body, $\nabla^2\Phi = 0$ expands in zonal harmonics; equatorial mass bulging ($J_2 > 0$) enhances radial gravitational attraction at the equator while spin introduces outward centrifugal relief $\omega^2 R_\text{eq}$.

**Validity assumptions:** Axisymmetry, rigid rotation at $\omega$, and small-to-moderate oblateness ($f \lesssim 0.1$) for asymptotic evaluation at $r = R_\text{pole} < R_\text{eq}$.

**Worked numerical example (Saturn at 1 bar):** Using documented Saturn parameters $GM = 3.7931\times10^{16}$ m³ s⁻², $R_\text{eq} = 6.0268\times10^{7}$ m, $R_\text{pole} = 5.4364\times10^{7}$ m, $J_2 = 1.6298\times10^{-2}$, $J_4 = -9.353\times10^{-4}$, and $P_\text{rot} = 10.656\ \text{h} = 38{,}361.6\ \text{s}$ ($\omega = 1.63788\times10^{-4}$ rad s⁻¹), monopole equatorial gravity is $GM/R_\text{eq}^2 = 10.4429$ m s⁻², the multipole factor is $1 + 1.5(0.016298) - 1.875(-0.0009353) = 1.02620$, and centrifugal relief is $\omega^2 R_\text{eq} = 1.6168$ m s⁻², yielding $g_\text{eq} = 10.4429(1.02620) - 1.6168 = 9.10$ m s⁻² (and adding centrifugal relief $2\omega u + u^2/R_\text{eq} \approx 0.13$ m s⁻² from Saturn's 400 m s⁻¹ prograde equatorial jet gives 8.97 m s⁻², matching NASA's 8.96 m s⁻² to 0.1%). At the pole, $GM/R_\text{pole}^2 = 12.8343$ m s⁻² multiplied by harmonic factor $1 - 3(0.016298)(1.2290) - 5(-0.0009353)(1.5105) = 0.94697$ yields $g_\text{pole} = 12.15$ m s⁻², matching NASA's 12.14 m s⁻² to 0.08%. Dimensional check: $[\text{m}^3\,\text{s}^{-2}/\text{m}^2] - [\text{s}^{-2}\cdot\text{m}] = \text{m}\,\text{s}^{-2}$.

**Limitations and numerical error:** Spherical $g = GM/R_m^2$ (11.19 m s⁻²) overpredicts Saturn's equatorial effective gravity by 24.9% and underpredicts polar gravity by 7.8%.

**Category relevance:** Mandatory for Gas Giants and Ice Giants; ~0.3–0.5% effect on fast-rotating Terrestrials (Earth, Mars); negligible on slow rotators (Venus, Mercury).

#### Model 4.1.2: Escape Velocity and Polytropic Gravitational Binding Energy

**Mathematical expression:**

```math
v_\text{esc} = \sqrt{\frac{2GM}{R}}
```

```math
E_\text{bind} = \frac{3}{5-n}\,\frac{GM^2}{R}
```

**Variable definitions:**

- $v_\text{esc}$ — ballistic escape speed from radius $R$.
- $E_\text{bind}$ — total gravitational self-binding energy.
- $n$ — effective polytropic index ($P = K\rho^{1+1/n}$, $n < 5$): $n = 0$ for an incompressible uniform sphere ($3/5 = 0.60$) and $n \approx 1.0$ for Gas Giants ($3/4 = 0.75$).

**SI units:** $v_\text{esc}$ in m s⁻¹; $E_\text{bind}$ in J (kg m² s⁻²); $n$ dimensionless.

**Physical principle:** Zero total mechanical energy at infinity sets $\tfrac{1}{2}m v_\text{esc}^2 = GMm/R$, while integrating shell assembly work $\int_0^M \frac{G m(r)}{r}\,dm$ across a Lane–Emden polytrope yields concentration factor $3/(5-n)$.

**Validity assumptions:** Isolated spherical body neglecting atmospheric drag, rotational launch velocity $\omega R\cos\phi$, and stellar Roche-lobe lowering.

**Worked numerical example (Jupiter):** Using $(GM)^{\mathcal{N}}_\text{J} = 1.2668653\times10^{17}$ m³ s⁻², $M_J = 1.898125\times10^{27}$ kg, $R_{\text{eq},J} = 7.1492\times10^{7}$ m, $R_{m,J} = 6.9911\times10^{7}$ m, and $n = 1$, $v_\text{esc}(R_{\text{eq},J}) = \sqrt{2(1.2668653\times10^{17})/(7.1492\times10^{7})} = 59{,}532\ \text{m s}^{-1} = 59.53\ \text{km s}^{-1}$ (matching NASA's 59.5 km s⁻¹), and $E_\text{bind}(n=1) = \frac{3}{4}\,\frac{(1.2668653\times10^{17})(1.898125\times10^{27})}{6.9911\times10^{7}} = 2.580\times10^{36}$ J (25% larger than the uniform-sphere $n = 0$ estimate of $2.064\times10^{36}$ J). Independent verification: Evaluating $v_\text{esc}(R_m) = 60{,}201$ m s⁻¹ confirms the identity $E_\text{bind} = \frac{3}{2(5-n)}\,M_J\,v_\text{esc}(R_m)^2 = \frac{3}{8}(1.898125\times10^{27})(3.6242\times10^{9}) = 2.580\times10^{36}$ J. Dimensional check: $[GM^2/R] = (\text{m}^3\,\text{kg}^{-1}\,\text{s}^{-2})(\text{kg}^2)\,\text{m}^{-1} = \text{J}$.

**Limitations and numerical error:** For layered Sub-Neptunes, total $E_\text{bind}$ is dominated by the rocky core, whereas atmospheric stripping depends on the much smaller envelope binding energy $\sim G M_\text{core} M_\text{env}/R_\text{core}$.

**Category relevance:** Universal across all five planet types; governs giant-impact disruption in Terrestrials/Super-Earths and contraction heat in Gas/Ice Giants.

#### Model 4.1.3: Two-Body Keplerian Motion, Vis-Viva Velocity, and N-Body Perturbation Limits

**Mathematical expression:**

```math
P^2 = \frac{4\pi^2 a^3}{G(M_\star + M_p)}
```

```math
r(\nu) = \frac{a(1-e^2)}{1 + e\cos\nu}, \qquad v(r) = \sqrt{G(M_\star + M_p)\left(\frac{2}{r} - \frac{1}{a}\right)}
```

```math
\epsilon_\text{orb} = -\frac{G(M_\star + M_p)}{2a}, \qquad h = \sqrt{G(M_\star + M_p)\,a(1-e^2)}
```

**Variable definitions:**

- $P$ — sidereal orbital period.
- $a$ — semi-major axis.
- $e$ — eccentricity ($0 \le e < 1$).
- $\nu$ — true anomaly.
- $r$ — star–planet distance.
- $v$ — relative orbital speed.
- $M_\star$, $M_p$ — host and planet masses.
- $\epsilon_\text{orb}$, $h$ — specific orbital energy and specific angular momentum.

**SI units:** $P$ in s; $a$, $r$ in m; $v$ in m s⁻¹; $\epsilon_\text{orb}$ in J kg⁻¹; $h$ in m² s⁻¹; $e$ dimensionless; $\nu$ in rad.

**Physical principle:** Conservation of mechanical energy and angular momentum in an isolated inverse-square central force constrains bound orbits to ellipses sweeping equal areas in equal times ($dA/dt = h/2$).

**Validity assumptions:** Isolated two-point-mass Newtonian system without third-body tugs, tidal dissipation, or post-Newtonian relativistic precession.

**Worked numerical example (Mercury):** With $(GM)^{\mathcal{N}}_\odot + GM_\text{Merc} = 1.3271246\times10^{20}$ m³ s⁻², $a = 5.7909\times10^{10}$ m, and $e = 0.20563$, $P = 2\pi\sqrt{a^3/G(M_\odot + M_p)} = 7.6005\times10^{6}\ \text{s} = 87.969$ d (NASA: 87.969 d). At perihelion $r_p = a(1-e) = 4.6001\times10^{10}$ m and aphelion $r_a = a(1+e) = 6.9817\times10^{10}$ m, the vis-viva equation gives $v_\text{max} = 58.98$ km s⁻¹ (NASA: 58.97 km s⁻¹) and $v_\text{min} = 38.86$ km s⁻¹ (NASA: 38.86 km s⁻¹). Independent verification: Kepler's Second Law requires $r_p v_\text{max} = r_a v_\text{min} = h$; evaluating all three expressions yields $2.7130\times10^{15}$ m² s⁻¹. Dimensional check: $[a^3/GM]^{1/2} = (\text{m}^3/\text{m}^3\,\text{s}^{-2})^{1/2} = \text{s}$.

**Limitations and numerical error:** In compact resonant multi-planet systems (TRAPPIST-1, TOI-270, Kepler-289), mutual planet–planet interactions violate two-body periodicity, producing Transit Timing Variations (TTVs) that require direct symplectic $N$-body integration. General relativity also adds 1pN pericenter precession.

**Category relevance:** Universal orbital baseline across all five planet types.

#### Model 4.1.4: Eccentricity Tidal Dissipation, Hill Sphere, and Fluid Roche Limit

**Mathematical expression:**

```math
\dot{E}_\text{tide} = \frac{21}{2}\,\frac{k_2}{Q}\,\frac{G M_\star^2 R_p^5\, n_\text{orb}\, e^2}{a^6}
```

```math
R_H = a(1-e)\left[\frac{M_p}{3(M_\star + M_p)}\right]^{1/3}, \qquad d_\text{Roche} \approx 2.456\,R_\star\left(\frac{\rho_\star}{\bar{\rho}_p}\right)^{1/3}
```

**Variable definitions:**

- $\dot{E}_\text{tide}$ — tidal heating power inside a synchronous planet.
- $k_2$ — potential degree-2 tidal Love number.
- $Q$ — tidal quality factor.
- $n_\text{orb} = 2\pi/P$ — mean motion.
- $R_H$ — Hill sphere radius.
- $d_\text{Roche}$ — fluid Roche disruption distance.

**SI units:** $\dot{E}_\text{tide}$ in W; $R_H$, $d_\text{Roche}$ in m; $n_\text{orb}$ in rad s⁻¹; $k_2$, $Q$ dimensionless.

**Physical principle:** Periodic radial and librational flexing of the stellar tidal bulge along an eccentric orbit ($e > 0$) dissipates orbital energy via internal anelastic phase lag ($\sim 1/Q$), heating the interior and circularizing the orbit, while inside $d_\text{Roche}$ differential stellar gravity overcomes planetary self-gravity.

**Validity assumptions:** Synchronous spin, zero obliquity, small eccentricity ($e \lesssim 0.2$), and constant-$Q$ rheology.

**Worked numerical example (Warm Ice Giant GJ 436 b & Jupiter's Hill radius):** For GJ 436 b ($a = 0.02872\ \text{au} = 4.2965\times10^{9}$ m, $P = 2.6439\ \text{d} \Rightarrow n_\text{orb} = 2.7506\times10^{-5}$ rad s⁻¹, $M_\star = 0.452\,M_\odot = 8.99\times10^{29}$ kg, $R_p = 0.366\,R_\text{eJ} = 2.6166\times10^{7}$ m, $e = 0.1616$) with representative Neptunian $k_2/Q = 1.0\times10^{-5}$, $\dot{E}_\text{tide} = 7.94\times10^{18}$ W, corresponding to a surface heat flux $F_\text{tide} = \dot{E}_\text{tide}/(4\pi R_p^2) = 923$ W m⁻²—over 2,100× Neptune's intrinsic flux (0.433 W m⁻²), driving strong atmospheric disequilibrium. Independent Hill-radius check on Jupiter ($a_J = 5.20285\ \text{au} = 7.78335\times10^{11}$ m, circular reference): $R_{H,J} = 7.78335\times10^{11}\left[1.266865\times10^{17}/\left(3 \times 1.328391\times10^{20}\right)\right]^{1/3} = 5.312\times10^{10}\ \text{m} = 53.1\ \text{Gm} = 743\,R_\text{eJ}$, matching the documented benchmark identically. Dimensional check: $[\dot{E}_\text{tide}] = (\text{m}^3\,\text{kg}^{-1}\,\text{s}^{-2})(\text{kg}^2)(\text{m}^5)(\text{s}^{-1})\,\text{m}^{-6} = \text{W}$.

**Limitations and numerical error:** Real viscoelastic mantles exhibit strong frequency-dependent $Q(\omega)$—Mars has seismic $Q > 1{,}000$ at ~1 Hz yet tidal $Q \approx 95$ at Phobos's 5 h 55 m period due to its deep molten silicate layer.

**Category relevance:** Critical for close-in Terrestrials, Super-Earths, Sub-Neptunes (e.g., TOI-1266, TRAPPIST-1 moon limits), Warm Neptunes, and Hot Jupiters.

### 4.2 Thermodynamics and Energy Transfer

#### Model 4.2.1: Orbit-Averaged Insolation, Equilibrium Temperature, and Effective Temperature

**Mathematical expression:**

```math
\langle S\rangle_t = \frac{L_\star}{4\pi a^2\sqrt{1-e^2}}
```

```math
T_\text{eq} = \left[\frac{f_r\,\langle S\rangle_t\,(1-A_B)}{\sigma_\text{SB}}\right]^{1/4}, \qquad \sigma_\text{SB}\,T_\text{eff}^4 = \frac{1}{4}\langle S\rangle_t\,(1-A_B) + F_\text{int}
```

**Variable definitions:**

- $\langle S\rangle_t$ — time-averaged top-of-atmosphere stellar irradiance.
- $L_\star = 4\pi R_\star^2\,\sigma_\text{SB}\,T_{\star,\text{eff}}^4$ — stellar bolometric luminosity.
- $A_B$ — Bond albedo ($0 \le A_B \le 1$).
- $f_r$ — heat-redistribution factor ($1/4$ for uniform global redistribution, $1/2$ for uniform dayside-only reradiation).
- $T_\text{eq}$ — solar-only radiative equilibrium temperature.
- $F_\text{int}$ — intrinsic internal heat flux.
- $T_\text{eff}$ — total bolometric effective emission temperature.

**SI units:** $\langle S\rangle_t$, $F_\text{int}$ in W m⁻²; $L_\star$ in W; $T_\text{eq}$, $T_\text{eff}$ in K; $A_B$, $f_r$ dimensionless.

**Physical principle:** Angular-momentum conservation weights inverse-square flux over true anomaly to give $(1-e^2)^{-1/2}$, while global conservation of energy equates thermal infrared emission to absorbed starlight plus internal heat loss.

**Validity assumptions:** Spherical intercepting cross-section $\pi R_p^2$ and steady-state radiative balance.

**Worked numerical example (Jupiter & Neptune):** Using Cassini-calibrated Jupiter measurements $F_\text{abs} = \tfrac{1}{4}\langle S\rangle_t(1-A_B) = 6.613$ W m⁻² ($A_B = 0.503$) and $F_\text{int} = 7.485$ W m⁻² ($F_\text{out} = 14.098$ W m⁻²), solar-only $T_\text{eq} = (6.613/5.670374\times10^{-8})^{1/4} = 103.9$ K, whereas true effective temperature is $T_\text{eff} = (14.098/5.670374\times10^{-8})^{1/4} = 125.6$ K ($P_\text{out}/P_\text{in} = 2.132$). Independent check on Neptune: With $S_N = 1.508$ W m⁻², $A_B = 0.290$, and $F_\text{int} = 0.433$ W m⁻², $F_\text{abs} = 0.2677$ W m⁻² gives $T_\text{eq} = 46.6$ K (matching NASA's 46.6 K) and $F_\text{out} = 0.7007$ W m⁻² gives $T_\text{eff} = 59.3$ K (matching 59.3 ± 0.8 K). Dimensional check: $[(\text{W}\,\text{m}^{-2})/(\text{W}\,\text{m}^{-2}\,\text{K}^{-4})]^{1/4} = \text{K}$.

**Limitations and numerical error:** $T_\text{eq}$ is a top-of-atmosphere radiative temperature, never a surface temperature on worlds with greenhouse atmospheres (e.g., Venus $T_\text{eq} = 226.6$ K vs. $T_\text{surf} = 737$ K). Also avoid substituting optical geometric albedo $A_g$ for bolometric Bond albedo $A_B$.

**Category relevance:** Universal radiative boundary condition across all five planetary classes.

#### Model 4.2.2: Semi-Gray Greenhouse Profile, Adiabatic Lapse Rate, and Radiative Relaxation Timescale

**Mathematical expression:**

```math
T_\text{rad}(\tau) = T_\text{eff}\left(\frac{1}{2} + \frac{3}{4}\tau\right)^{1/4}
```

```math
\left(\frac{dT}{dr}\right)_\text{ad} = -\frac{\alpha_V\,g\,T}{c_p} \;\stackrel{\text{ideal gas}}{=}\; -\frac{g}{c_p}
```

```math
\tau_\text{rad} \approx \frac{c_p\,P_\text{phot}}{4\,g\,\sigma_\text{SB}\,T_\text{eff}^3}
```

**Variable definitions:**

- $\tau$ — thermal infrared optical depth.
- $\alpha_V$ — volumetric thermal expansion coefficient ($1/T$ for an ideal gas).
- $c_p$ — specific isobaric heat capacity.
- $P_\text{phot}$ — photospheric pressure.
- $\tau_\text{rad}$ — radiative thermal inertia timescale.

**SI units:** $T$ in K; $dT/dr$ in K m⁻¹; $\alpha_V$ in K⁻¹; $c_p$ in J kg⁻¹ K⁻¹; $P_\text{phot}$ in Pa; $\tau_\text{rad}$ in s; $\tau$ dimensionless.

**Physical principle:** Eddington two-stream radiative transfer warms optically thick layers as $(1/2 + 3\tau/4)^{1/4}$ until $\lvert dT/dr\rvert_\text{rad}$ exceeds $\lvert dT/dr\rvert_\text{ad}$, triggering convective heat transport along an adiabat.

**Validity assumptions:** Gray infrared opacity, shortwave-transparent upper layers, no latent heat condensation, and chemically uniform layers (composition gradients $\nabla_\mu > 0$ stabilize deep layers against convection as in Saturn's diffuse core).

**Worked numerical example (Earth vs. Uranus):** On Earth ($g = 9.81$ m s⁻², $c_p = 1{,}004$ J kg⁻¹ K⁻¹, $P_\text{phot} = 1.014\times10^{5}$ Pa, $T_\text{eff} = 255.1$ K), dry lapse rate $g/c_p = 9.77$ K km⁻¹ and $\tau_\text{rad} = 2.76\times10^{6}\ \text{s} \approx 31.9$ d, buffering diurnal swings to 283–293 K. On Uranus ($g = 9.01$ m s⁻², $T_\text{eff} = 59.1$ K, $c_p \approx 1.1\times10^{4}$ J kg⁻¹ K⁻¹, $P_\text{phot} = 2\times10^{5}$ Pa), $\tau_\text{rad} = 5.22\times10^{9}\ \text{s} \approx 165$ yr, independently verifying why Uranus's upper tropospheric relaxation time (>160 yr) exceeds its 84-year orbital period and suppresses seasonal emission swings. Dimensional check: $[\tau_\text{rad}] = (\text{m}^2\,\text{s}^{-2}\,\text{K}^{-1})(\text{kg}\,\text{m}^{-1}\,\text{s}^{-2})/[(\text{m}\,\text{s}^{-2})(\text{kg}\,\text{s}^{-3}\,\text{K}^{-4})(\text{K}^3)] = \text{s}$.

**Limitations and numerical error:** Gray opacity ignores molecular spectral windows and pressure-induced continuum opacity needed for exact runaway-greenhouse modeling on Venus, Super-Earths, and Sub-Neptunes.

**Category relevance:** Governs surface greenhouses on Terrestrials/Super-Earths, magma-ocean blanketing on Sub-Neptunes, and radiative–convective boundaries on Ice/Gas Giants.

### 4.3 Fluid Mechanics and Atmospheric Dynamics

#### Model 4.3.1: Hydrostatic Equilibrium, Ideal Gas Scale Height, and Transmission Spectral Depth

**Mathematical expression:**

```math
\frac{dP}{dz} = -\rho g, \qquad P = \frac{\rho\,R_\text{gas}\,T}{M_\text{mol}}
```

```math
H = \frac{k_B T}{\mu\,u\,g} = \frac{R_\text{gas}\,T}{M_\text{mol}\,g}, \qquad \Delta D(\lambda) \approx \frac{2 N_H R_p H}{R_\star^2}
```

**Variable definitions:**

- $P$ — gas pressure.
- $z$ — altitude.
- $\rho$ — gas density.
- $\mu$ — dimensionless mean molecular weight (in u).
- $M_\text{mol} = \mu\times10^{-3}$ kg mol⁻¹ — molar mass.
- $H$ — pressure scale height.
- $\Delta D(\lambda)$ — transit-depth modulation across $N_H$ scale heights.

**SI units:** $P$ in Pa; $z$, $H$ in m; $\rho$ in kg m⁻³; $M_\text{mol}$ in kg mol⁻¹; $\mu$, $N_H$, $\Delta D$ dimensionless.

**Physical principle:** Vertical force balance between pressure gradient and gravity in an ideal gas yields exponential barometric decay $P(z) = P_0\,e^{-z/H}$, setting the annulus thickness $N_H H$ probed during stellar transits.

**Validity assumptions:** Ideal gas ($Z_\text{gas} \approx 1$), locally isothermal layer, $H \ll R_p$, and hydrostatic bound state.

**Worked numerical example (Sub-Neptune TOI-270 d & Saturn):** For TOI-270 d ($R_p = 2.133\,R_\oplus = 1.359\times10^{7}$ m, $g = 10.31$ m s⁻², $T = 354$ K, $R_\star = 0.38\,R_\odot = 2.644\times10^{8}$ m, JWST-retrieved $\mu = 5.37$), $H = \frac{8.31446\times354}{0.00537\times10.31} = 53.2$ km, giving a $3H$ spectral transit feature $\Delta D \approx \frac{2(3)(1.359\times10^{7})(5.32\times10^{4})}{(2.644\times10^{8})^2} = 6.2\times10^{-5} = 62$ ppm (compared to $H = 124$ km and 145 ppm for a solar-metallicity $\mu = 2.3$ envelope). Independent check on Saturn ($T_\text{1bar} = 134$ K, $\mu = 2.07$, $g_\text{eq} = 8.96$ m s⁻²): $H = 60.1$ km (NASA: 59.5 km) and $\rho_\text{1bar} = 0.186$ kg m⁻³ (NASA: 0.19 kg m⁻³). Dimensional check: $[H] = (\text{J}\,\text{mol}^{-1}\,\text{K}^{-1})(\text{K})/[(\text{kg}\,\text{mol}^{-1})(\text{m}\,\text{s}^{-2})] = \text{m}$.

**Limitations and numerical error:** Breaks down in supercritical/high-pressure interiors ($P \gtrsim 10$–$100$ bar, such as Venus's surface or deep giant envelopes) where non-ideal equations of state are required.

**Category relevance:** Fundamental observable link across all atmosphere-bearing planets.

#### Model 4.3.2: Rotating Fluid Dynamics — Rossby Number and Rhines Zonal Jet Scale

**Mathematical expression:**

```math
f_c = 2\omega\sin\phi, \qquad \mathrm{Ro} = \frac{U}{2\omega L}
```

```math
\beta = \frac{2\omega\cos\phi}{R_p}, \qquad L_\beta = \pi\sqrt{\frac{U}{\beta}}
```

**Variable definitions:**

- $f_c$ — Coriolis parameter at latitude $\phi$.
- $\mathrm{Ro}$ — Rossby number.
- $U$, $L$ — characteristic horizontal wind speed and length scale.
- $\beta$ — meridional gradient of $f_c$.
- $L_\beta$ — Rhines turbulent arrest half-wavelength.

**SI units:** $f_c$ in s⁻¹; $\beta$ in m⁻¹ s⁻¹; $U$ in m s⁻¹; $L$, $L_\beta$ in m; $\mathrm{Ro}$ dimensionless.

**Physical principle:** When $\mathrm{Ro} \ll 1$, Coriolis forces balance pressure gradients geostrophically and 2D turbulence organizes into multiple alternating east–west jets of width $\sim 2L_\beta$; when $\mathrm{Ro} \gg 1$, slow rotation yields global cyclostrophic overturning; on synchronous Hot Jupiters, planetary-scale equatorial Rossby/Kelvin waves drive superrotating eastward jets.

**Validity assumptions:** Shallow barotropic/quasi-geostrophic weather layer; in deep convective giant interiors, flows align on cylinders parallel to the spin axis until Lorentz drag brakes them in semiconducting layers.

**Worked numerical example (Jupiter vs. Venus):** On Jupiter ($\omega_J = 1.7585\times10^{-4}$ rad s⁻¹, $R_\text{eJ} = 7.1492\times10^{7}$ m, $U \approx 100$ m s⁻¹, $L \approx 10^{7}$ m), $\mathrm{Ro} = 0.0284 \ll 1$ and equatorial $\beta_J = 4.919\times10^{-12}$ m⁻¹ s⁻¹, giving full jet wavelength $2L_\beta = 2.83\times10^{7}$ m (~8 jet pairs pole-to-pole). On Venus ($\omega_V = 2.992\times10^{-7}$ rad s⁻¹, $L = R_V = 6.0518\times10^{6}$ m), any global flow of $U \sim 50$–$100$ m s⁻¹ gives $\mathrm{Ro} = 13.8$–$27.6 \gg 1$ (cyclostrophic). Dimensional check: $\left[\sqrt{U/\beta}\right] = \left[(\text{m}\,\text{s}^{-1})/(\text{m}^{-1}\,\text{s}^{-1})\right]^{1/2} = \text{m}$.

**Limitations and numerical error:** 2D Rhines scaling cannot predict prograde vs. retrograde equatorial jet sign without 3D convective/radiative forcing.

**Category relevance:** Governs circulation regimes across all five categories.

#### Model 4.3.3: Atmospheric Escape — Jeans Parameter and Energy-Limited XUV Photoevaporation

**Mathematical expression:**

```math
\lambda_J = \frac{G M_p\, m_s}{k_B\, T_\text{exo}\, R_\text{exo}}
```

```math
\dot{M}_\text{XUV} = \frac{\epsilon_\text{XUV}\,\pi R_\text{XUV}^2\, R_p\, F_\text{XUV}}{G M_p\, K_\text{tide}}, \qquad K_\text{tide} = 1 - \frac{3}{2\xi} + \frac{1}{2\xi^3}, \quad \xi = \frac{R_H}{R_p}
```

**Variable definitions:**

- $\lambda_J$ — Jeans escape parameter for molecule mass $m_s = \mu_s u$ at the exobase ($R_\text{exo}$, $T_\text{exo}$).
- $\dot{M}_\text{XUV}$ — hydrodynamic photoevaporative mass-loss rate.
- $\epsilon_\text{XUV}$ — heating efficiency (~0.10–0.20).
- $R_\text{XUV}$ — effective XUV absorption radius.
- $F_\text{XUV}$ — stellar X-ray + EUV irradiance.
- $K_\text{tide}$ — Roche-lobe reduction factor.

**SI units:** $\dot{M}_\text{XUV}$ in kg s⁻¹; $F_\text{XUV}$ in W m⁻²; $m_s$ in kg; $\lambda_J$, $\epsilon_\text{XUV}$, $K_\text{tide}$ dimensionless.

**Physical principle:** $\lambda_J \gtrsim 15$–$20$ suppresses thermal Jeans escape over Gyr timescales, whereas intense stellar XUV photoionization drives bulk hydrodynamic outflows at rate $\dot{M}_\text{XUV}$ governed by gravitational lifting work.

**Validity assumptions:** Energy-limited hydrodynamic wind (at extreme $F_\text{XUV}$, radiative recombination caps $\dot{M} \propto F_\text{XUV}^{1/2}$).

**Worked numerical example (LHS 1140 b & Earth):** For LHS 1140 b ($M_p = 5.60\,M_\oplus \Rightarrow GM_p = 2.232\times10^{15}$ m³ s⁻², $R_p = 1.730\,R_\oplus = 1.102\times10^{7}$ m, observed opaque He transit radius $R_\text{XUV} = 1.52\,R_p = 1.675\times10^{7}$ m) under early M-dwarf saturated $F_\text{XUV} \approx 0.57$ W m⁻² ($\epsilon_\text{XUV} = 0.15$, $K_\text{tide} = 0.95$), $\dot{M}_\text{XUV} = 3.92\times10^{5}$ kg s⁻¹ ($3.92\times10^{8}$ g s⁻¹; and with young inflated $R_\text{XUV} \approx 3R_p$, $\dot{M}$ reaches the $\gtrsim 5\times10^{9}$ g s⁻¹ rate that the consulted helium-escape literature reports as sufficient to strip a 1.5 wt% primordial envelope). Independent Jeans check on Earth ($T_\text{exo} = 1{,}000$ K, $R_\text{exo} = 6.87\times10^{6}$ m): atomic H gives $\lambda_J = 7.0$ (escapes), whereas N₂ gives $\lambda_J = 195 \gg 20$ (retained). Dimensional check: $[\dot{M}_\text{XUV}] = \text{m}^3(\text{kg}\,\text{s}^{-3})/(\text{m}^3\,\text{s}^{-2}) = \text{kg}\,\text{s}^{-1}$.

**Limitations and numerical error:** Line cooling in secondary N₂/CO₂ atmospheres lowers $\epsilon_\text{XUV}$ sharply relative to H/He envelopes.

**Category relevance:** Sculpts the Super-Earth / Sub-Neptune Radius Valley and Hot Neptune Desert.

### 4.4 Planetary Structure and Material Physics

Across four orders of magnitude in planetary mass, coupled interior structure integrations and empirical exoplanet catalogs demonstrate that planets break into three distinct equation-of-state scaling regimes rather than following constant-density $R_p \propto M_p^{1/3}$ geometry: self-compressed rocky worlds ($R_p \propto M_p^{0.27\text{–}0.29}$), volatile-envelope-inflated intermediate worlds ($R_p \propto M_p^{0.67}$), and electron-degenerate gas giants ($R_p \propto M_p^{-0.06}$).

#### Model 4.4.1: Coupled 1D Interior Structure Equations and Polytropic Compression

**Mathematical expression:**

```math
\frac{dm}{dr} = 4\pi r^2 \rho(r), \qquad \frac{dP}{dr} = -\frac{G\,m(r)\,\rho(r)}{r^2}
```

```math
\Longleftrightarrow \qquad \frac{dr}{dm} = \frac{1}{4\pi r^2 \rho}, \qquad \frac{dP}{dm} = -\frac{G m}{4\pi r^4}
```

These are coupled with the energy-transport equation and closed by an equation of state $\rho = \rho(P, T, \text{composition})$:

```math
\frac{dT}{dm} = -\frac{G\,m\,T}{4\pi r^4 P}\,\nabla
```

Analytical benchmarks:

```math
P_{c,\text{unif}}(n=0) = \frac{3}{8\pi}\,\frac{GM^2}{R^4}, \qquad P_{c,n=1}\left(P = K\rho^2\right) = \frac{\pi}{8}\,\frac{GM^2}{R^4}, \qquad R_{n=1} = \sqrt{\frac{\pi K}{2G}}
```

**Variable definitions:**

- $m(r)$ — enclosed mass.
- $P(r)$ — interior pressure.
- $\nabla = d\ln T/d\ln P$ — temperature gradient.
- $K$ — $n = 1$ polytropic constant.
- $P_c$ — central pressure.

**SI units:** $dm/dr$ in kg m⁻¹; $dP/dr$ in Pa m⁻¹; $P_c$ in Pa; $K$ in Pa m⁶ kg⁻².

**Physical principle:** Hydrostatic shell support balances inward self-gravity. In cold H–He Gas Giants, combined Coulomb and non-relativistic electron-degeneracy pressure ($P_e \propto \rho^{5/3}$) yields an effective $n \approx 1$ barotrope ($P = K\rho^2$) whose exact Lane–Emden solution $\rho(r) = \rho_c\,\frac{\sin(\pi r/R)}{\pi r/R}$ makes total radius $R = \sqrt{\pi K/2G}$ independent of mass.

**Validity assumptions:** Spherical hydrostatic equilibrium with negligible shear strength (satisfied above ~0.1 GPa in all classical planets).

**Worked numerical example (Earth & Jupiter central pressures):** For Earth ($M_E = 5.9722\times10^{24}$ kg, $R_E = 6.3710\times10^{6}$ m), uniform-density $P_{c,\text{unif}} = 172.5$ GPa provides a strict mathematical lower bound to Earth's differentiated iron-core central pressure. For Jupiter ($M_J = 1.89813\times10^{27}$ kg, $R_{m,J} = 6.9911\times10^{7}$ m), $P_{c,\text{unif}} = 1.202$ TPa, whereas the $n = 1$ polytrope gives $P_{c,n=1} = \frac{\pi}{8}\,\frac{(1.266865\times10^{17})(1.89813\times10^{27})}{(6.9911\times10^{7})^4} = 3.953$ TPa (39.5 Mbar) and $\rho_c = \frac{\pi^2}{3}\,\bar{\rho} = 4{,}362$ kg m⁻³ (rising further inside Jupiter's dilute heavy-element core). Independent check: $P_{c,n=1}/P_{c,\text{unif}} = \pi^2/3 = 3.2899$, and $1.2016\times3.2899 = 3.953$ TPa. Dimensional check: $[GM^2/R^4] = (\text{m}^3\,\text{kg}^{-1}\,\text{s}^{-2})(\text{kg}^2)\,\text{m}^{-4} = \text{Pa}$.

**Limitations and numerical error:** Never apply $P_{c,\text{unif}}$ to differentiated or compressible giants except as an explicit lower bound.

**Category relevance:** Exact 1D interior ODE framework across all five planetary categories.

#### Model 4.4.2: Third-Order Birch–Murnaghan Solid Equation of State

**Mathematical expression:**

```math
P(\rho) = \frac{3}{2}K_0\left[\left(\frac{\rho}{\rho_0}\right)^{7/3} - \left(\frac{\rho}{\rho_0}\right)^{5/3}\right]\left\{1 + \frac{3}{4}\left(K_0' - 4\right)\left[\left(\frac{\rho}{\rho_0}\right)^{2/3} - 1\right]\right\} + \gamma_\text{th}\,\rho\,c_V\,(T - T_0)
```

**Variable definitions:**

- $\rho_0$ — zero-pressure reference density.
- $K_0$ — isothermal bulk modulus.
- $K_0' = (\partial K/\partial P)_0$ — pressure derivative of the bulk modulus.
- $\gamma_\text{th}$ — Mie–Grüneisen thermal parameter.
- $c_V$ — specific isochoric heat capacity.

**SI units:** $P$, $K_0$ in Pa; $\rho$, $\rho_0$ in kg m⁻³; $c_V$ in J kg⁻¹ K⁻¹; $K_0'$, $\gamma_\text{th}$ dimensionless.

**Physical principle:** Finite Eulerian strain expansion captures nonlinear interatomic stiffening under megabar compression.

**Validity assumptions:** Single crystal phase per parameter set and compression $\rho/\rho_0 \lesssim 2.0$–$2.5$.

**Worked numerical example (silicate bridgmanite in a Super-Earth):** For lower-mantle bridgmanite ($\rho_0 = 4{,}100$ kg m⁻³, $K_0 = 260$ GPa, $K_0' = 4.0$) compressed 1.50× to $\rho = 6{,}150$ kg m⁻³ along $T = T_0$, $P = 1.5(260\ \text{GPa})\left[(1.50)^{7/3} - (1.50)^{5/3}\right] = 390(2.57625 - 1.96556) = 238.17$ GPa, whereas naive Hookean elasticity $K_0(\rho/\rho_0 - 1) = 130.0$ GPa errs by 45.4%. Dimensional check: $[K_0]\times[1] = \text{Pa}$.

**Limitations and numerical error:** Requires phase-specific parameters across silicate, iron, and high-pressure water-ice transitions (e.g., Ice VII → X → Superionic XVIII).

**Category relevance:** Core and mantle EOS for Terrestrials, Super-Earths, and the heavy-element interiors of Sub-Neptunes, Ice Giants, and Gas Giants.

#### Model 4.4.3: Empirical Piecewise and Compositional Mass–Radius Scaling Relations

**Mathematical expression:**

PREM-based rocky scaling (Zeng, Sasselov & Jacobsen 2016; $1 \lesssim M_p/M_\oplus \lesssim 8$, $0 \le \mathrm{CMF} \le 0.4$):

```math
\frac{R_p}{R_\oplus} = (1.07 - 0.21\,\mathrm{CMF})\left(\frac{M_p}{M_\oplus}\right)^{1/3.7}
```

Three-regime piecewise exoplanet scaling (Müller et al. 2024; 688 PlanetS exoplanets):

```math
\frac{R_p}{R_\oplus} =
\begin{cases}
(1.02 \pm 0.03)\left(\dfrac{M_p}{M_\oplus}\right)^{0.27 \pm 0.04}, & \dfrac{M_p}{M_\oplus} < 4.37 \pm 0.72 \\
(0.56 \pm 0.03)\left(\dfrac{M_p}{M_\oplus}\right)^{0.67 \pm 0.05}, & 4.37 \le \dfrac{M_p}{M_\oplus} \le 127 \pm 7 \\
(18.6 \pm 6.7)\left(\dfrac{M_p}{M_\oplus}\right)^{-0.06 \pm 0.07}, & \dfrac{M_p}{M_\oplus} > 127 \pm 7
\end{cases}
```

Extended rocky branch (Otegi et al. 2020) and radius-valley slope (Van Eylen et al. 2018; Ginzburg et al. 2018):

```math
\frac{R_\text{rocky}}{R_\oplus} = (1.03 \pm 0.02)\left(\frac{M_p}{M_\oplus}\right)^{0.29 \pm 0.01}, \qquad R_\text{valley}(P) \approx 1.85\,R_\oplus\left(\frac{P}{10\ \text{d}}\right)^{-0.10}
```

**Variable definitions:**

- $\mathrm{CMF} = M_\text{core}/M_p$ — iron core mass fraction.
- $M_\oplus$, $R_\oplus$ — Earth mass and volumetric mean radius.
- $P$ — orbital period in days.

**SI units:** Dimensionless Earth-normalized ratios, convertible via $1\,M_\oplus = 5.9722\times10^{24}$ kg and $1\,R_\oplus = 6.3710\times10^{6}$ m.

**Physical principle:** Self-compression flattens rocky scaling from $M^{1/3}$ to $M^{0.27}$; volatile envelope accretion above ~4.4 M⊕ steepens scaling to $M^{0.67}$; electron degeneracy above ~127 M⊕ flattens giant radii to $M^{-0.06}$.

**Validity assumptions:** Population-median empirical fits; stripped rocky Super-Earths between 4.4 and 10 M⊕ follow Otegi's rocky $M^{0.29}$ branch rather than Müller's volatile $M^{0.67}$ branch, while Hot Jupiters inflate with temperature ($R \propto M^{0.00}\,T_\text{eq}^{0.35}$).

**Worked numerical example (LHS 1140 b composition diagnostic):** At $M_p = 5.60\,M_\oplus$ ($5.60^{1/3.7} = 1.5930$), Zeng's formula predicts $R_p = 1.596\,R_\oplus$ for an Earth-like $\mathrm{CMF} = 0.325$ and $1.705\,R_\oplus$ even for a coreless pure-silicate sphere ($\mathrm{CMF} = 0$), whereas Müller's volatile branch predicts $0.56(5.60)^{0.67} = 1.776\,R_\oplus$. Because observed $R_p = 1.730 \pm 0.025\,R_\oplus$ exceeds even an iron-free rock, LHS 1140 b requires ~9–19 wt% water or a light gas layer. Dimensional check: dimensionless ratios on both sides.

**Limitations and numerical error:** Ignores age-dependent cooling and irradiation inflation unless paired with $T_\text{eq}$.

**Category relevance:** Fast analytical backbone for all five planet types.

#### Model 4.4.4: Rotational Oblateness, Darwin–Radau Moment-of-Inertia Relation, and Dynamo Scaling

**Mathematical expression:**

```math
q = \frac{\omega^2 R_\text{eq}^3}{GM}, \qquad f = \frac{R_\text{eq} - R_\text{pole}}{R_\text{eq}} \approx \frac{3}{2}J_2 + \frac{1}{2}q
```

```math
\frac{C}{M R_\text{eq}^2} = \frac{2}{3}\left(1 - \frac{2}{5}\sqrt{\frac{5q}{2f} - 1}\right)
```

```math
R_m = \mu_0\,\sigma_\text{el}\,U_\text{conv}\,L_\text{conv} \gtrsim R_{m,\text{crit}} \approx 10\text{–}40
```

**Variable definitions:**

- $q$ — rotational-to-gravitational acceleration ratio.
- $f$ — geometric flattening.
- $C/MR_\text{eq}^2$ — normalized polar moment of inertia.
- $R_m$ — magnetic Reynolds number.
- $\mu_0 = 4\pi\times10^{-7}$ N A⁻² — vacuum permeability.
- $\sigma_\text{el}$, $U_\text{conv}$, $L_\text{conv}$ — electrical conductivity, convective speed, and dynamo shell thickness.

**SI units:** $q$, $f$, $C/MR_\text{eq}^2$, $R_m$ dimensionless; $\sigma_\text{el}$ in S m⁻¹; $U_\text{conv}$ in m s⁻¹; $L_\text{conv}$ in m.

**Physical principle:** Hydrostatic equipotential figures link $f$, $J_2$, $q$, and $C/MR_\text{eq}^2$; self-excited dynamos require inductive stretching to exceed Ohmic diffusion ($R_m \gtrsim 10$–$40$).

**Validity assumptions:** Strict hydrostatic equilibrium and small $q \lesssim 0.1$ under rigid rotation.

**Worked numerical example (Earth hydrostatic figure & Ice Giant ionic dynamo):** For Earth ($q_E = 3.4614\times10^{-3}$, $J_{2,E} = 1.08263\times10^{-3}$), $f_\text{calc} = 0.003355$ (observed 0.003353, 0.05% error) and Darwin–Radau gives $C/MR_\text{eq}^2 = 0.3314$ (observed 0.3308, 0.18% error). For an Ice Giant ionic-water shell ($\sigma_\text{el} \approx 2{,}000$ S m⁻¹ measured at 20 GPa, $L_\text{conv} = 5\times10^{6}$ m, $U_\text{conv} = 10^{-2}$ m s⁻¹), $R_m = 125.7 > R_{m,\text{crit}}$, sustaining a thin-shell dynamo without metallic hydrogen. Dimensional check: $[R_m] = (\text{kg}\,\text{m}\,\text{s}^{-2}\,\text{A}^{-2})(\text{A}^2\,\text{s}^3\,\text{kg}^{-1}\,\text{m}^{-3})(\text{m}\,\text{s}^{-1})(\text{m}) = 1$.

**Limitations and numerical error:** On slowly rotating Venus ($q \approx 6.1\times10^{-8}$, $J_2 = 4.458\times10^{-6}$), $5q/2f \approx 0.023 < 1$ yields an imaginary radical, demonstrating that Venus's shape is non-hydrostatic; on Jupiter/Saturn, deep zonal winds require higher-order Theory of Figures.

**Category relevance:** Links spin, shape, interior concentration, and magnetism across Terrestrials, Ice Giants, and Gas Giants.

## 5. Comparative Planetary Dataset, Parameter Couplings, and Cross-Category Matrix

### 5.1 Normalized Reference Dataset (Solar System and Benchmark Exoplanets)

Across the eight classical Solar System planets, joint inspection of moment of inertia ($C/MR^2$), polar flattening ($f$), and emitted-to-absorbed radiant power ratio ($P_\text{out}/P_\text{in}$) cleanly separates solid from fluid interiors: differentiated Terrestrials exhibit $C/MR^2$ of 0.331–0.366 (below the 0.400 uniform-sphere ceiling), low flattening (0.00% on Venus to 0.589% on Mars), and solar-balanced thermal emission ($P_\text{out}/P_\text{in} \approx 1.00$), whereas Gas and Ice Giants exhibit strongly centrally condensed $C/MR^2$ of 0.210–0.264, pronounced rotational flattening (1.71% on Neptune, 2.29% on Uranus, 6.49% on Jupiter, and 9.80% on Saturn), and substantial primordial internal heat ($P_\text{out}/P_\text{in} = 1.15 \pm 0.06$ on Uranus, 1.775 on Saturn, 2.132 on Jupiter, and 2.61 ± 0.28 on Neptune).

Table 5.1 compiles a homogeneous, machine-readable reference dataset spanning all eight Solar System planets and fourteen benchmark exoplanets (1 M⊕ = 5.9722 × 10²⁴ kg, 1 R⊕ = 6.3710 × 10⁶ m volumetric mean). Provenance tags denote [Obs] direct spacecraft/geodetic/photometric measurements, [Der] multi-observable derived quantities, and [Mod] theoretical/interior-model estimates.

**Table 5.1.** Normalized reference dataset for the Solar System planets and benchmark exoplanets.

<!-- docx-table split="0,1,2,3,4,5,6|0,7,8,9,10" widths="1500,1250,1500,1450,1420,1350,1250|1500,2150,1950,1950,2170" captions="Physical properties|Rotation, orbit, figure, thermal state, and provenance" -->

| Planet | Category | Mass (M⊕) | Mean Radius (R⊕) | Bulk Density (kg m⁻³) | Mean Gravity (m s⁻²) | Escape Velocity (km s⁻¹) | Spin or Orbit Period | Flattening / MoI (C/MR²) | Equilibrium / 1-bar or Surface Temperature (K) | Provenance & Primary Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mercury | Terrestrial | 0.0553 (±10⁻⁵) | 0.3829 | 5,429 | 3.70 | 4.30 | $P_\text{rot}$ = 1,407.6 h ($a$ = 0.387 au) | 0.0009 / 0.3434 ± 0.0102 | 439.6 / ~100–700 | [Obs] NASA NSSDC; MESSENGER (Genova et al. 2019; 2024) |
| Venus | Terrestrial | 0.8150 (±10⁻⁵) | 0.9499 | 5,243 | 8.87 | 10.36 | $P_\text{rot}$ = −5,832.6 h ($a$ = 0.723 au) | 0.0000 / 0.337 ± 0.024 | 226.6 / 737 (92 bar) | [Obs] NASA NSSDC; radar precession (Margot et al. 2021) |
| Earth | Terrestrial | 1.0000 | 1.0000 | 5,513 | 9.82 (eq 9.78) | 11.19 | $P_\text{rot}$ = 23.9345 h ($a$ = 1.000 au) | 0.003353 / 0.3308 | 254.0 / 288 (1.014 bar) | [Obs] NASA NSSDC; IAU 2015 Res. B3 |
| Mars | Terrestrial | 0.1074 (±10⁻⁵) | 0.5320 | 3,934 | 3.73 (eq 3.69) | 5.03 | $P_\text{rot}$ = 24.6229 h ($a$ = 1.524 au) | 0.00589 / 0.366 | 209.8 / 214 (6.36 mbar) | [Obs] NASA NSSDC (2025); InSight SEIS (Samuel et al. 2023) |
| TRAPPIST-1 d | Terrestrial | 0.388 ± 0.012 | 0.770 ± 0.011 | 4,690 ± 220 | 6.12 ± 0.19 | 6.87 | $P_\text{orb}$ = 4.0492 d ($a$ = 0.0223 au) | Sync. [Mod] / ~0.34 [Mod] | 286.2 ± 2.8 ($A_B = 0$) / Unk. | [Der] TTV + Transit (Agol et al. 2021) |
| TRAPPIST-1 e | Terrestrial | 0.692 ± 0.022 | 0.920 ± 0.013 | 4,900 ± 220 | 8.01 ± 0.24 | 9.69 | $P_\text{orb}$ = 6.1010 d ($a$ = 0.0293 au) | Sync. [Mod] / ~0.33 [Mod] | 249.7 ± 2.4 ($A_B = 0$) / Unk. | [Der] TTV + Transit (Agol et al. 2021) |
| TRAPPIST-1 b | Terrestrial | 1.374 ± 0.069 | 1.116 ± 0.014 | 5,445 ± 310 | 10.81 ± 0.51 | 12.43 | $P_\text{orb}$ = 1.5108 d ($a$ = 0.0115 au) | Sync. [Mod] / ~0.33 [Mod] | 397.6 ± 3.8 ($A_B = 0$) / Unk. | [Der] TTV + Transit (Agol et al. 2021) |
| TOI-1452 b | Super-Earth | 4.82 ± 1.30 | 1.672 ± 0.071 | 5,570 ± 1,760 | 16.9 ± 4.8 | 19.0 | $P_\text{orb}$ = 11.06 d ($a$ = 0.061 au) | Sync. [Mod] / ~0.32 [Mod] | 326 ± 7 / Unk. | [Der] RV + Transit compilation (2025) |
| LHS 1140 b | Super-Earth | 5.60 ± 0.19 | 1.730 ± 0.025 | 5,900 ± 190 | 18.37 ± 0.80 | 20.12 | $P_\text{orb}$ = 24.73 d ($a$ = 0.094 au) | Slow/Sync. [Mod] / ~0.32 [Mod] | 226 ± 4 / Unk. (N₂/He cand.) | [Der] EPRV + JWST/WINERED (Cadieux et al. 2024; 2026) |
| 55 Cancri e | Super-Earth | 7.99 ± 0.30 | 1.88 ± 0.03 | 6,250 ± 720 | 22.2 ± 1.1 | 23.1 | $P_\text{orb}$ = 0.7365 d ($a$ = 0.0160 au) | Sync. [Mod] / ~0.32 [Mod] | ~1,950 / $T_\text{day}$ ~2,300–3,770 | [Der] RV + Transit + JWST CO/CO₂ (Hu et al. 2024) |
| TOI-270 d | Sub-Neptune | 4.78 ± 0.43 (4.20) | 2.133 ± 0.058 | 2,720 ± 320 | 10.31 ± 1.1 | 16.7 | $P_\text{orb}$ = 11.380 d ($a$ = 0.072 au) | Sync. [Mod] / ~0.23 [Mod] | 354 ($A_B = 0.3$) / 385 (1 mbar) | [Der] RV + TTV + JWST ($\mu = 5.4$; Van Eylen 2021; Benneke 2024) |
| GJ 1214 b | Sub-Neptune | 8.17 ± 0.43 (8.41) | 2.74 (2.733) | 2,200 ± 170 | 10.65 ± 0.70 | 19.31 | $P_\text{orb}$ = 1.5804 d ($a$ = 0.0151 au) | Sync. [Mod] / ~0.22 [Mod] | ~490 ($A_B = 0.51$) / $T_\text{day}$ 553 | [Der] RV + JWST MIRI Phase Curve (Cloutier 2021; Kempton 2023) |
| K2-18 b | Sub-Neptune | 8.63 ± 1.35 | 2.610 ± 0.087 | 2,650 ± 520 | 12.44 ± 2.1 | 20.3 | $P_\text{orb}$ = 32.94 d ($a$ = 0.159 au) | Sync./Slow [Mod] / ~0.23 [Mod] | 284 ± 15 ($A_B = 0$) / Unk. | [Der] RV + JWST NIRISS/NIRSpec (Madhusudhan et al. 2023) |
| Uranus | Ice Giant | 14.536 ± 0.001 | 3.981 ± 0.001 | 1,270 ± 1 | 9.01 (eq 8.69) | 21.3 | $P_\text{rot}$ = −17.24 h ($a$ = 19.19 au) | 0.02293 / 0.225 [Mod] | 58.1 ($T_\text{eff}$ 59.1) / 76 (1 bar) | [Obs] Voyager 2; 2025 REB ($F_\text{int}$ = 0.078 W/m²) |
| Neptune | Ice Giant | 17.148 ± 0.001 | 3.865 ± 0.003 | 1,638 ± 4 | 11.27 (eq 11.00) | 23.5 | $P_\text{rot}$ = 16.11 h ($a$ = 30.07 au) | 0.01708 / 0.23–0.25 [Mod] | 46.6 ($T_\text{eff}$ 59.3) / 72 (1 bar) | [Obs] Voyager 2; Neuenschwander & Helled (2022) |
| GJ 436 b | Ice Giant | 22.2 ± 1.0 | 4.10 ± 0.10 | ~1,800 | ~12.8 | 25.9 | $P_\text{orb}$ = 2.6439 d ($e$ = 0.162) | Pseudo-sync. [Mod] / ~0.23 [Mod] | ~686 / Tidally heated | [Der] RV + Transit + HST/JWST |
| HAT-P-11 b | Ice Giant | 25.7 ± 1.5 | 4.73 ± 0.10 | ~1,330 | ~11.3 | 26.1 | $P_\text{orb}$ = 4.8878 d ($e$ = 0.198) | Pseudo-sync. [Mod] / ~0.22 [Mod] | ~870 / Clear upper sky | [Der] RV + Transit + HST/JWST |
| WASP-39 b | Gas Giant | 89.0 ± 9.0 (0.28 $M_J$) | 14.23 ± 0.40 (1.27 $R_J$) | ~175 | ~4.30 | 27.9 | $P_\text{orb}$ = 4.0553 d ($a$ = 0.0486 au) | Sync. [Mod] / ~0.20 [Mod] | ~1,100 / ~1,100–1,200 | [Der] RV + JWST ERS (SO₂, CO₂, H₂O; 2023–2024) |
| Saturn | Gas Giant | 95.16 ± 0.004 | 9.140 ± 0.001 | 687.1 ± 0.2 | 11.19 (eq 8.96) | 35.5 | $P_\text{rot}$ = 10.561 h ($a$ = 9.537 au) | 0.09796 / 0.2181 (0.210) | 81.0 / 134 (1 bar) | [Obs] Cassini Grand Finale & Ring Seismology (2019–2023) |
| HD 209458 b | Gas Giant | 217.7 (0.685 $M_J$) | 15.23 (1.359 $R_J$) | ~340 | ~9.2 | 39.8 | $P_\text{orb}$ = 3.5247 d ($a/R_\star$ = 8.76) | Sync. [Mod] / ~0.22 [Mod] | ~1,450 / Inflated Hot Jupiter | [Der] RV + HST/JWST Transit |
| Jupiter | Gas Giant | 317.83 ± 0.015 | 10.973 ± 0.001 | 1,326.2 ± 0.4 | 25.92 (eq 23.12) | 59.5 | $P_\text{rot}$ = 9.9250 h ($a$ = 5.204 au) | 0.06487 / 0.26393 (0.254) | 103.9 ($T_\text{eff}$ 125.6) / 165 (1 bar) | [Obs] Juno Gravity + Cassini REB (Li et al. 2018; Militzer 2022) |
| HD 189733 b | Gas Giant | 363.6 (1.144 $M_J$) | 12.75 (1.138 $R_J$) | ~960 | ~21.9 | 59.7 | $P_\text{orb}$ = 2.2186 d ($a/R_\star$ = 8.81) | Sync. [Mod] / ~0.25 [Mod] | ~1,200 / Hot Jupiter | [Der] RV + HST/JWST Transit |

### 5.2 Parameter Couplings and Physically Invalid Combinations

In computational planetary modeling, variables separate strictly into three groups:

- **Independent primary inputs:** planetary mass $M_p$, bulk compositional mass fractions ($\mathrm{CMF}$, $f_\text{water}$, $f_\text{H-He}$), host-star parameters ($M_\star$, $R_\star$, $T_{\star,\text{eff}}$, $L_\text{XUV}$), orbital elements ($a$, $e$, $i$), spin angular momentum (or spin period $P_\text{rot}$ and obliquity $\varepsilon$), and system age $t_\text{age}$.
- **Coupled interior/atmospheric state variables:** $R_p$, $J_{2k}$, $f$, $A_B$, $P_\text{surf}$, and $\mu$.
- **Algebraically derived outputs:** $\bar{\rho}$, $g_\text{mean}$, $g_\text{eq}$, $g_\text{pole}$, $v_\text{esc}$, $P_\text{orb}$, $v(r)$, $R_H$, $d_\text{Roche}$, $T_\text{eq}$, and $H$.

Notice how nonlinearly these relationships interact: increasing mass $M_p$ along the rocky branch ($R_p \propto M_p^{0.27}$) raises surface gravity as $g \propto M_p^{0.46}$, whereas adding mass via a volatile Sub-Neptune envelope ($R_p \propto M_p^{0.67}$) actually decreases photospheric gravity as $g \propto M_p^{-0.34}$ until degenerate compression sets in above 127 M⊕ ($R_p \propto M_p^{-0.06} \Rightarrow g \propto M_p^{1.12}$).

> [!WARNING]
> **Six Hard Boundary Constraints**
>
> To prevent unphysical states, any simulation must enforce six hard boundary constraints:
>
> 1. **Collisional iron stripping floor:** block radii smaller than pure iron or the Marcus et al. (2010) giant-impact stripping curve.
> 1. **Centrifugal breakup ceiling:** block spin periods where $q = \omega^2 R_\text{eq}^3/GM \ge 0.30$–$0.50$ ($g_\text{eq} \le 0$).
> 1. **Roche tidal disruption limit:** flag orbits with periapsis $a(1-e) \le d_\text{Roche}$.
> 1. **Hot-desert evaporation forbidden zone:** disallow low-mass cores ($M_p \lesssim 3\,M_\oplus$) from retaining bloated H₂–He envelopes ($R_p \gtrsim 2.5$–$5\,R_\oplus$) inside $P_\text{orb} \lesssim 2$–$3$ d, where $\lambda_J < 2$ and $\dot{M}_\text{XUV}$ strips the gas in <10 Myr.
> 1. **Cold inflated giant exclusion:** prevent mature (>1 Gyr), cold ($T_\text{eq} < 500$ K) Gas Giants from exceeding ~1.15 $R_J$.
> 1. **IAU substellar ceiling:** cap planetary mass at $M_p < 13\,M_J$ and $M_p/M_\star < 1/25$.

### 5.3 Cross-Category Scientific Comparison Matrix

Table 5.2 synthesizes universal versus regime-specific physics across all five categories.

**Table 5.2.** Cross-category scientific comparison matrix.

<!-- docx-table widths="1420,1660,1660,1660,1660,1660" -->

| Scientific Dimension | 1. Terrestrial Planets | 2. Super-Earths | 3. Sub-Neptunes | 4. Ice Giants | 5. Gas Giants |
| --- | --- | --- | --- | --- | --- |
| Mass & Radius Regimes | 0.02–1.5 M⊕; 0.3–1.2 R⊕ | 1.5–10 M⊕; 1.2–1.8 R⊕ (below Radius Valley) | 3–15 M⊕; 1.8–3.5 R⊕ (Valley to Cliff) | 10–40 M⊕; 3.5–6.0 R⊕ | 50–4,130 M⊕ (0.15–13 $M_J$); 8–22 R⊕ |
| Bulk Density & Scaling | 3,800–8,000 kg m⁻³; $R \propto M^{0.27}$ | 5,000–8,500 kg m⁻³; $R \propto M^{0.27\text{–}0.29}$ | 600–3,500 kg m⁻³; steep $R \propto M^{0.67}$ | 1,100–2,200 kg m⁻³; $R \propto M^{0.55\text{–}0.67}$ | 150–15,000 kg m⁻³; degenerate $R \propto M^{-0.06}$ |
| Reference Gravity & Escape Velocity | Solid surface: 3.7–11 m s⁻²; 4–12.5 km s⁻¹ | Solid/magma surface: 12–30 m s⁻²; 13–26 km s⁻¹ | Transit/1-bar isobar: 6–14 m s⁻²; 15–22 km s⁻¹ | 1-bar/transit isobar: 8.5–15 m s⁻²; 21–28 km s⁻¹ | 1-bar/transit isobar: 4–300 m s⁻²; 25–200 km s⁻¹ |
| Internal Composition & EOS | Fe–Ni core + silicate mantle; $C/MR^2 \approx 0.33$–$0.37$; Mars basal magma layer | Multi-Mbar Fe + post-perovskite silicates; $C/MR^2 \approx 0.31$–$0.35$ | 90–98 wt% rock/magma core + 1–5 wt% H₂–He or supercritical H₂O | 80–90 wt% heavy elements; ionic fluid & Superionic Ice XVIII (>70 GPa); $C/MR^2 \approx 0.22$–$0.25$ | 70–95 wt% H₂–He; liquid metallic H; diffuse core (0.3–0.6 R); $C/MR^2 \approx 0.21$–$0.26$ |
| Thermal & Magnetic Behavior | Solar-dominated ($P_\text{out}/P_\text{in} \approx 1.00$); core dipolar dynamo (Earth, Mercury) or none (Venus, Mars) | Radiogenic + tidal heat; dayside magma oceans on USPs | Envelope opacity sustains basal magma oceans; H₂–magma chemical coupling | Heat dichotomy (Neptune 2.61 vs. Uranus 1.15); tilted multipolar ionic-shell dynamos | Strong internal heat (1.78–2.13); dipolar metallic-H dynamos; Hot Jupiter inflation |
| Atmospheric Physics | Secondary N₂/O₂, CO₂, or exosphere; $\mu \approx 28$–$44$; $H \approx 8$–$16$ km | Stripped or secondary CO/CO₂, N₂, escaping He; $\mu \approx 4$–$44$; $H \approx 5$–$50$ km | Metal-enriched H₂–He (CH₄, CO₂, H₂O; $\mu \approx 2.3$–$18$; $H \approx 40$–$250$ km); hazes | H₂–He + 1.5–2.3% CH₄ ($\mu \approx 2.6$; $H \approx 20$–$28$ km cold); deep ~1,000 km winds | H₂–He ($\mu \approx 2.1$–$2.3$; $H \approx 27$–$60$ km cold, >500 km hot); NH₃/H₂O clouds or SO₂ photochemistry |
| Formation & Evolution | Planetesimal/pebble embryos + giant impacts inside snow line | XUV/core-powered stripped cores or gas-depleted growth | Core accretion + Type I migration; capped at 3.5 R⊕ cliff by magma H₂ solubility | Pebble growth + outer-disk migration; Neptune desert erosion close-in | Rapid >10 M⊕ core + runaway gas (<10 Myr); Type II or high-$e$ migration |
| Empirical Quality & Uncertainties | Highest in situ fidelity; M-dwarf exo-atmosphere survival unresolved | 1,782 exoplanets, 0 local analogues; rock vs. water-world degeneracy | Most common inner exoplanet; Hycean vs. magma-ocean mini-Neptune debate | Single 1986/1989 flybys; bulk spin, rock–ice mixing, and Uranus heat trap open | Juno/Cassini geodesy + JWST; fuzzy-core origin & Hot Jupiter inflation debated |

## 6. Physics Playground Research Translation

### 6.1 Modular State Contract and Constraint Pipeline

Because the [live Physics Playground application](https://dnoice.github.io/physics-playground/#gravity) was unreachable during compilation, this translation avoids assuming undocumented UI components and instead specifies a modular constraint-first state pipeline adaptable to any interactive `#gravity` module. Exposing independent physical boundary conditions (mass, composition, stellar/orbital parameters, spin) while routing them through conservation and EOS guardrails upstream of three progressive solver tiers guarantees that derived observables ($R_p$, $\bar{\rho}$, $g_\text{eq}$, $g_\text{pole}$, $v_\text{esc}$, $T_\text{eq}$, $H$) recalculate automatically without permitting physically nonsensical states.

### 6.2 Category-Specific Parameter Mapping and Guardrails

Table 6.1 maps observable quantities, safe user controls, automatic derived outputs, and active physical constraints across each planetary category.

**Table 6.1.** Category-specific parameter mapping and guardrails for Physics Playground.

<!-- docx-table widths="1300,2000,2100,2120,2200" -->

| Planetary Category | Observable & Displayable Quantities | Safe Controllable User Inputs | Automatically Recalculated Derived Values | Active Physical Constraints & Guardrails |
| --- | --- | --- | --- | --- |
| 1. Terrestrial Planets | Solid radius $R_p$, $\bar{\rho}$, surface $g$, $v_\text{esc}$, ballistic arc, $P_\text{orb}$, $T_\text{eq}$ vs. $T_\text{surf}$, $H$, $\lambda_J$ | $M_p \in [0.02, 1.5]\,M_\oplus$; $\mathrm{CMF} \in [0.0, 0.75]$; $a$, $e$; $P_\text{rot} \ge 2.5$ h; $A_B$; IR optical depth $\tau$; gas preset (N₂/O₂, CO₂, Airless) | $R_p(M_p, \mathrm{CMF})$, $\bar{\rho}$, $g_\text{eq}$, $g_\text{pole}$, $v_\text{esc}$, $v_\text{min/max}$, $\langle S\rangle_t$, $T_\text{eq}$, $T_\text{surf}(\tau)$, $H$, $\lambda_J$ | Hydrostatic floor $M_p \ge 10^{23}$ kg; giant-impact iron ceiling $\mathrm{CMF} \le 0.75$; runaway greenhouse warning above ~300 W m⁻² absorbed flux with liquid H₂O; hide $H$ when $\lambda_J < 5$. |
| 2. Super-Earths | Compressed $R_p$, $\bar{\rho}$, high $g$, $P_\text{CMB}$, $T_\text{CMB}$, dayside lava state, XUV stripping rate $\dot{M}_\text{XUV}$ | $M_p \in [1.5, 10.0]\,M_\oplus$; Dry Rocky ($\mathrm{CMF} \in [0, 0.70]$) vs. Water World ($f_\text{H2O} \in [0.05, 0.25]$); $a$, $e$; star preset (M8V–G2V) | $R_p$ (Zeng PREM / Otegi rocky branch), $\bar{\rho}$, $g$, $v_\text{esc}$, $P_\text{CMB}$, $T_\text{CMB}$, $T_\text{eq}$, $T_\text{day}$, $\dot{M}_\text{XUV}$ | Trigger "Magma Ocean / Lava World" state for $T_\text{day} > 1{,}500$ K and lock spin synchronously inside $P_\text{orb} < 15$ d; block thick H₂ envelopes below $R_\text{valley}(P)$. |
| 3. Sub-Neptunes | Photospheric $R_p$, low $\bar{\rho}$, Earth-like $g_\text{phot}$, $H$, transit feature $\Delta D$ (ppm), evaporation lifetime | $M_\text{core} \in [2.5, 14.0]\,M_\oplus$; $f_\text{env} \in [0.005, 0.08]$; $\mu \in [2.3, 18.0]$; $a$, $e$; $A_B \in [0.05, 0.65]$ | Total $R_p$, $\bar{\rho}$, $g_\text{phot}$, $v_\text{esc}$, $T_\text{eq}$, $H$, transit depth $\Delta D(\lambda)$, XUV lifetime $M_\text{env}/\dot{M}_\text{XUV}$ | Enforce Radius Cliff cap ($f_\text{env} \lesssim 0.08$–$0.10$, noting H₂ magma dissolution above 3.5 R⊕); block dynamically unstable hot puffs where $\lambda_J < 2$. |
| 4. Ice Giants | 1-bar $R_\text{eq}$, $R_\text{pole}$, $f$, $g_\text{eq}$, $g_\text{pole}$, $T_\text{eq}$ vs. $T_\text{eff}$, tidal power $\dot{E}_\text{tide}$, superionic zone | $M_p \in [10, 40]\,M_\oplus$; $f_\text{env} \in [0.08, 0.25]$; $P_\text{rot} \ge 6$ h; obliquity $\varepsilon \in [0^\circ, 180^\circ]$; $a$, $e$; $F_\text{int}$ | 1-bar $R_m$, $R_\text{eq}$, $R_\text{pole}$, $f$, $J_2$, $g_\text{eq}$, $g_\text{pole}$, $T_\text{eq}$, $T_\text{eff}$, $\tau_\text{rad}$, $\dot{E}_\text{tide}$ | Enforce Roche limit $a(1-e) > d_\text{Roche}$; flag Hot Neptune Desert erosion at $P_\text{orb} < 4$ d; highlight Superionic Ice XVIII mantle layer at $P > 70$ GPa, $T > 2{,}000$ K. |
| 5. Gas Giants | Degenerate vs. inflated $R_p$, extreme $f$, $J_2$, $g_\text{eq}$ vs. $g_\text{pole}$, $v_\text{esc}$, $E_\text{bind}$, Hill sphere $R_H$, Rhines jets | $M_p \in [50, 4130]\,M_\oplus$ (0.15–13 $M_J$); heavy-element mass $M_Z \in [5, 50]\,M_\oplus$; $P_\text{rot} \ge 3.5$ h; $a$, $e$, $A_B$ | $R_m(M_p, M_Z, T_\text{eq})$, $R_\text{eq}$, $R_\text{pole}$, $f$, $J_2$, $g_\text{eq}$, $g_\text{pole}$, $v_\text{esc}$, $E_\text{bind}$, $R_H$, $\mathrm{Ro}$, $L_\beta$ | Hard IAU ceiling $M_p < 13.0\,M_J$ and $M_p/M_\star < 1/25$; breakup ceiling $q < 0.30$; lock cold giants ($T_\text{eq} < 500$ K) onto degenerate ~0.9–1.15 $R_J$ curve. |

### 6.3 Three-Level Simulation Architecture for Physics Playground

Structuring future Physics Playground enhancements into three explicit complexity tiers ensures transparent pedagogy at the entry level and research-grade fidelity at advanced levels without ever relying on unacknowledged shortcuts.

#### Foundational Tier: Closed-Form Analytical Physics

Simulations execute instantaneously at 60 fps using exact algebraic equations paired with visible assumption badges (e.g., "Spherical non-rotating body; isolated two-body Keplerian orbit; isothermal ideal gas"). Core modules include:

- **Mass–Radius & Gravity Explorer:** implements Zeng's PREM rocky formula and Müller's three-regime power laws, demonstrating why Saturn's 1-bar equatorial gravity of 8.96 m s⁻² is weaker than Earth's 9.78 m s⁻² even though Saturn's escape velocity of 35.5 km s⁻¹ is 3.2× Earth's.
- **Exact Two-Body Keplerian & Vis-Viva Sandbox:** solves Kepler's equation to machine precision alongside Hill and Roche boundaries.
- **Radiative Equilibrium & Scale-Height Transit Calculator:** links $a$, $e$, $A_B$, $F_\text{int}$, and $\mu$ to $T_\text{eq}$, $T_\text{eff}$, $H$, and JWST transit feature amplitude $\Delta D(\lambda)$.

#### Intermediate Tier: Coupled Numerical ODE & Symplectic Solvers

WebWorker routines solve coupled differential equations in ~1–10 ms per parameter change. Core modules include:

- **1D Hydrostatic Interior RK4 Shooting Solver:** integrates $dm/dr = 4\pi r^2\rho$ and $dP/dr = -Gm\rho/r^2$ across third-order Birch–Murnaghan iron/silicate/ice layers and polytropic gas envelopes to plot live internal profiles $P(r)$, $\rho(r)$, $g(r)$ and exact moments of inertia $C/MR^2$.
- **Oblate Multipole Gravity & Ring/Satellite Precession Simulator:** couples Darwin–Radau flattening ($f$, $J_2$, $q$) to Model 4.1.1 so users observe $J_2$-driven nodal regression and apsidal precession around oblate giants.
- **Symplectic Multi-Planet N-Body & TTV Integrator:** models resonant chains like TRAPPIST-1 and TOI-270 alongside eccentricity-driven tidal heating $\dot{E}_\text{tide}$.
- **Radius Valley Evolution Integrator:** time-steps $\dot{M}_\text{XUV}(t)$ across a grid of close-in protoplanets to watch the Fulton gap emerge dynamically between stripped Super-Earths and surviving Sub-Neptunes.

#### Advanced Tier: Tabulated Ab Initio Grids & GPU Continuum Physics

Demanding thermodynamic and fluid-dynamical phenomena are modeled via WebGL2/WebGPU shaders and bicubic interpolation over precomputed research tables rather than ad hoc approximations. Core modules include:

- **2D Rotating Spherical Shallow-Water Fluid Solver:** contrasts low-Rossby multi-jet banding on fast-spinning cold giants against Matsuno–Gill equatorial superrotation and eastward hotspot offsets on tidally locked Hot Jupiters like WASP-39 b.
- **Concentric Maclaurin Spheroid / Theory of Figures & Normal-Mode Ring Seismology:** models diffuse heavy-element cores and Saturnian C-ring gravity waves.
- **Precomputed Non-Gray Radiative–Convective & Magma–Envelope Chemical Equilibrium Grids:** capture supercritical CO₂ runaway greenhouses and H₂–magma-ocean water production on Sub-Neptunes.

## 7. Scientific Sources and Verification Record

### 7.1 Primary Archives, Standards, and Peer-Reviewed Foundations

Every classification boundary, physical constant, and benchmark value in this reference traces to authoritative astronomical standards, space-agency repositories, and peer-reviewed studies:

- **Classification & constants:** IAU 2006 Resolution B5/5A (Solar System planet definition and dwarf-planet exclusion); IAU Commission F2 Official Working Definition of an Exoplanet (2018; Lecavelier des Etangs & Lissauer 2022, *New Astronomy Reviews* 94, 101641; 2021–2024 Triennial Report); IAU 2015 Resolution B3 Nominal Solar and Planetary Conversion Constants (Prša et al. 2016, *AJ* 152, 41).
- **Solar System mission data & high-pressure experiments:** NASA GSFC / NSSDC Planetary Fact Sheets (curated by Dr. D. R. Williams, updated through March–May 2025); NASA Planetary Data System (PDS) archives; MESSENGER geodesy (Genova et al. 2019, *GRL*; 2024 Cassini-state refinements); Venus radar precession (Margot et al. 2021); InSight Mars seismology (Stähler et al. 2021, *Science*; Samuel et al. 2023 and Khan et al. 2023, *Nature* 622); Juno & Cassini interior, ring-seismology, and energy-budget studies (Wahl et al. 2017; Li et al. 2018, *Nature Communications*; Mankovich et al. 2019; Mankovich & Fuller 2021, *Nature Astronomy*; Militzer et al. 2022; Neuenschwander & Helled 2022; 2025 Uranus seasonal REB studies); LLNL/NIF superionic water shock compression (Millot et al. 2018, *Nature Physics*; Millot et al. 2019, *Nature*) and 2026 superionic carbon–hydride simulations.
- **Exoplanet catalogs, mass–radius scaling & JWST spectroscopy:** NASA Exoplanet Archive / NExScI confirmed census as of September 2025 (6,000 milestone) and March 30, 2026 (6,153 confirmed exoplanets); NCCR PlanetS transiting catalog and empirical M–R fits (Otegi et al. 2020; Müller et al. 2024, *A&A* 686, A296; Parc et al. 2024); PREM rocky scaling and giant-impact limits (Marcus et al. 2010, *ApJL*; Zeng, Sasselov & Jacobsen 2016, *ApJ* 819, 127); Radius Valley, Radius Cliff, and occurrence theory (Fulton et al. 2017; Van Eylen et al. 2018; Ginzburg et al. 2018; Kite et al. 2019; Zeng et al. 2026); and system-specific studies for TRAPPIST-1 (Agol et al. 2021, *PSJ*), LHS 1140 b (Cadieux et al. 2024; 2024–2026 JWST/WINERED), 55 Cancri e (Bourrier et al. 2018; Hu et al. 2024, *Nature* 630; NIRCam multi-visit occultations), TOI-270 d (Van Eylen et al. 2021; Kaye et al. 2022; Benneke et al. 2024), GJ 1214 b (Cloutier et al. 2021; Kempton et al. 2023), K2-18 b (Madhusudhan et al. 2023; Wogan et al. 2024; Schmidt et al. 2025), and WASP-39 b (JWST ERS 2023–2024).

<!-- markdownlint-disable MD051 -->

<!-- md-only -->

The full register of consulted web sources, grouped by evidence tier, follows in [Cited Sources](#cited-sources).

<!-- markdownlint-enable MD051 -->

<!-- docx-para: The full register of consulted web sources, their evidence tiers, and the claim-to-source relationships are documented in the companion Source Matrix (DS-PPG-PCR-001-SM). -->

### 7.2 Reconciliation of Reference Discrepancies

Where authoritative tables report conflicting figures, Physics Playground should adopt the calibrated physical values below while documenting the underlying cause.

**Table 7.1.** Reconciliation of discrepant reference values.

<!-- docx-table widths="1700,2300,2500,3220" -->

| Discrepant Parameter | Legacy / Alternate Reference Value | Updated / Calibrated Physical Value | Physical & Methodological Cause of Discrepancy |
| --- | --- | --- | --- |
| Jupiter Bond Albedo & Internal Flux | $A_B = 0.343$, $T_\text{eq} = 109.9$ K (NSSDC / Voyager) | $A_B = 0.503 \pm 0.012$, $T_\text{eq} = 103.9$ K, $F_\text{int} = 7.485 \pm 0.163$ W m⁻² (Li et al. 2018) | Cassini ISS+VIMS filled full phase-angle (0°–180°) and 0.2–4 µm spectral gaps with superior radiometric calibration. |
| Mars Metallic Core Radius | $R_c = 1{,}830 \pm 40$ km (2021 InSight ScS; NSSDC main row) | $R_c = 1{,}650 \pm 20$ km (1,650–1,675 km NSSDC footnote; Samuel / Khan 2023) | 2021 inversions assumed a homogeneous solid mantle; 2023 farside impact $P_\text{diff}$ waves indicated ScS reflected off an ~150 km basal molten silicate layer. |
| Saturn Deep Rotation Period | 10.656 h (10 h 39 m 22 s, Voyager SKR System III) | 10 h 33 m 38 s (~10.561 h, Cassini C-ring seismology & gravity) | Saturn's aligned magnetic pole causes radio emissions to slip with magnetospheric plasma; ring wave resonances directly measure interior normal modes. |
| Giant Planet $J_2$ & MoI Normalizations | Jupiter $I/MR^2 = 0.254$ (or 0.2756); Uranus $J_2 = 3{,}343.43\times10^{-6}$ | Jupiter $C/MR_\text{eq}^2 = 0.26393 \pm 0.00001$; Uranus $J_2 = 3{,}510.68 \pm 0.70\times10^{-6}$ at $R_\text{ref} = 25{,}559$ km | Dimensionless $J_{2k}$ and $C/MR^2$ scale as $(R_\text{ref})^{-2k}$ and $(R_\text{ref})^{-2}$; shifting between mean radius $R_m$, equatorial $R_\text{eq}$, and historical model radii alters numbers by 4–5% without changing physics. |
| Uranus Internal Heat Flux | $P_\text{out}/P_\text{in} = 1.06 \pm 0.08$ (~0 W m⁻², 1986 Voyager solstice) | $F_\text{int} = 0.078 \pm 0.018$ W m⁻², $P_\text{out}/P_\text{in} = 1.15 \pm 0.06$ (2025 full-orbit REB) | Multi-decade HST/ground seasonal albedo integration raised Uranus's orbital-mean Bond albedo from 0.300 to 0.349 ± 0.016, revealing net heat loss. |
| Terrestrial Exoplanet Count | ~223 Terrestrial (March 2026 NASA catalog) vs. ~700 in press summaries | 223 at strict catalog cutoff ($R_p \lesssim 1.25\,R_\oplus$) vs. larger rocky sample up to $1.6\,R_\oplus$ | Public outreach summaries vary radius cutoffs between 1.25 R⊕ and the ~1.6–1.8 R⊕ rocky-to-volatile transition; explicit physical radius thresholds resolve all ambiguity. |

### 7.3 Priority Areas Requiring Ongoing Scientific Investigation

Four active observational and theoretical frontiers merit ongoing tracking across future Physics Playground release cycles:

1. **JWST Rocky Worlds observations:** testing whether M-dwarf terrestrial exoplanets (TRAPPIST-1 e, LHS 1140 b) retain high-mean-molecular-weight secondary atmospheres.
1. **Sub-Neptune interior degeneracy:** resolving whether temperate CH₄ + CO₂ detections and NH₃ depletions on K2-18 b and TOI-270 d reflect liquid-water Hycean oceans or magma-equilibrated mini-Neptunes.
1. **BepiColombo orbital geodesy at Mercury:** expected to refine Mercury's polar moment of inertia to ≤0.3% precision and map inner-core gravity signals.
1. **Dedicated Uranus orbiter and atmospheric probe concepts:** needed to measure higher-order harmonics ($J_6$, $J_8$), bulk interior rotation, and deep volatile abundances in an Ice Giant for the first time.

## Cited Sources

The research export behind this reference preserved two citation layers: the primary literature and standards named in the article text, and a list of 156 web sources consulted during research. Both are reproduced below. Primary works carry IDs P01–P45; web sources carry IDs S001–S156 in the order the export listed them. The companion Source Matrix maps each claim to these IDs.

> [!NOTE]
> **What the export did and did not preserve**
>
> The export kept each web source's host and page title but no URLs, and many titles arrived truncated (marked here with a closing "…" where the cut is evident). It also dropped the in-text citation anchors, so the links between primary works and web sources are inferred from titles and hosts and labeled by confidence: **Copy** (the web source hosts the work), **Coverage** (it reports on that work), or **Topical** (it corroborates the same finding).

### Evidence Tiers

| Tier | Category | What it includes | How to use it |
| --- | --- | --- | --- |
| A (88) | Peer-reviewed research & preprints | Journal articles, arXiv preprints, theses, conference abstracts, and repository or ResearchGate copies of them. | May carry a decisive claim; prefer the publisher or arXiv copy over a ResearchGate or mirror copy. |
| B (17) | Agency data, standards & catalogs | NSSDC fact sheets, IAU documents, NASA archives and exoplanet catalogs. | May carry a decisive claim; cite the version date. |
| C (22) | Institutional & agency communications | Agency explainers, news releases, program reports, university and laboratory news. | Corroborates and dates a finding; pair with Tier A/B for numbers. |
| D (15) | Science journalism & popular media | News sites, magazines, forums, popular infographics. | Context only; never the sole support for a quantitative claim. |
| E (12) | Tertiary references & mirrors | Wikipedia, open textbooks, researcher profile pages, Scribd and other uncontrolled mirrors. | Safety net only; always sit beside a stronger citation. |
| F (2) | Project & software references | The Physics Playground deployment and comparable simulators. | Documents the target system, not the physics. |

### Primary Literature and Standards Cited in Text

- **P01.** IAU (2006). *Resolution B5 (5A): Definition of a Planet in the Solar System*. IAU General Assembly. Topic: Solar System planet definition; dwarf-planet exclusion. Cited in §2.1, §7.1. Web sources: S066 (Coverage); S001 (Topical); S070 (Topical).
- **P02.** IAU Commission F2 (2018); Lecavelier des Etangs & Lissauer (2022). *The IAU Working Definition of an Exoplanet*. New Astronomy Reviews 94, 101641; 2021–2024 Triennial Report. Topic: Exoplanet definition: deuterium-burning ceiling, 1/25 mass ratio. Cited in §2.1, §7.1. Web sources: S010 (Copy); S067 (Coverage); S068 (Coverage); S003 (Topical).
- **P03.** Margot et al. (2024). Topic: Quantitative mass-bound planet definition proposal. Cited in §2.1. Web sources: S065 (Coverage); S064 (Coverage).
- **P04.** Prša et al. (2016). *IAU 2015 Resolution B3 Nominal Solar and Planetary Conversion Constants*. AJ 152, 41. Topic: Nominal solar and planetary constants. Cited in §4, §7.1. Web sources: S094 (Copy).
- **P05.** IAU (2012). *Resolution B2*. IAU General Assembly. Topic: Exact astronomical unit. Cited in §4. Web sources: S066 (Topical).
- **P06.** CODATA (2018/2022). *Recommended values of the fundamental physical constants*. Topic: Gravitational, Stefan–Boltzmann, Boltzmann and molar gas constants; atomic mass constant. Cited in §4. No web source captured.
- **P07.** NASA GSFC / NSSDC, curated by D. R. Williams. *Planetary Fact Sheets*. Updated through March–May 2025. Topic: Solar System planetary parameters. Cited in §3, §4, §5, §7.1, §7.2. Web sources: S024 (Copy); S096 (Copy); S097 (Copy); S078 (Copy); S016 (Copy); S031 (Copy); S032 (Copy); S070 (Copy); S015 (Copy); S079 (Copy).
- **P08.** NASA. *Planetary Data System (PDS) archives*. Topic: Archive data volume. Cited in §1.3, §7.1. Web sources: S019 (Copy); S148 (Topical); S058 (Topical); S061 (Topical).
- **P09.** NASA Exoplanet Archive / NExScI. *Confirmed exoplanet census*. September 2025 (6,000); March 30, 2026 (6,153). Topic: Census totals and category bins. Cited in Overview, §1.3, §7.1, §7.2. Web sources: S076 (Coverage); S150 (Coverage); S063 (Coverage); S059 (Topical); S006 (Topical).
- **P10.** Genova et al. (2019; 2024). GRL (2019). Topic: Mercury solid inner core; Cassini-state refinements. Cited in §1.2, §3.1, §5.1, §7.1. Web sources: S156 (Copy); S046 (Copy); S149 (Coverage); S044 (Coverage); S045 (Coverage); S104 (Coverage); S098 (Topical); S101 (Topical).
- **P11.** Margot et al. (2021). *Spin State and Moment of Inertia of Venus*. Topic: Venus C/MR² = 0.337 ± 0.024. Cited in §3.1, §5.1, §7.1. Web sources: S099 (Copy).
- **P12.** Stähler et al. (2021). Science. Topic: First seismic Mars core radius (1,830 ± 40 km). Cited in §3.1, §7.1, §7.2. Web sources: S103 (Coverage); S100 (Coverage).
- **P13.** Samuel et al. (2023); Khan et al. (2023). *Geophysical evidence for an enriched molten silicate layer … (Samuel et al.)*. Nature 622. Topic: Mars basal molten layer; core 1,650 ± 20 km. Cited in §1.2, §3.1, §7.1, §7.2. Web sources: S043 (Copy); S041 (Coverage); S105 (Coverage); S042 (Coverage); S077 (Coverage).
- **P14.** Agol et al. (2021). PSJ. Topic: TRAPPIST-1 TTV masses and transit radii. Cited in §3.1, §5.1, §7.1. Web sources: S106 (Topical); S153 (Topical); S025 (Topical); S075 (Topical).
- **P15.** Cadieux et al. (2024; 2026). Topic: LHS 1140 b mass, radius, and atmosphere. Cited in §3.2, §5.1, §7.1. Web sources: S026 (Topical); S155 (Topical).
- **P16.** Hu et al. (2024). Nature 630. Topic: 55 Cancri e secondary CO/CO₂ atmosphere. Cited in §3.2, §5.1, §7.1. Web sources: S092 (Topical); S114 (Topical); S091 (Topical).
- **P17.** Bourrier et al. (2018). Topic: 55 Cancri e system parameters. Cited in §7.1. Web sources: S091 (Topical).
- **P18.** Fulton et al. (2017). Topic: Radius valley. Cited in §2.2, §7.1. Web sources: S060 (Topical); S082 (Topical).
- **P19.** Van Eylen et al. (2018). Topic: Radius-valley slope. Cited in §4.4, §7.1. Web sources: S082 (Topical).
- **P20.** Ginzburg et al. (2018). Topic: Core-powered mass loss. Cited in §3.2, §4.4, §7.1. Web sources: S116 (Topical); S113 (Topical).
- **P21.** Lopez & Fortney (2013); Owen & Wu (2013/2017). Topic: XUV photoevaporation. Cited in §3.2. Web sources: S082 (Topical); S060 (Topical).
- **P22.** Kite et al. (2019). Topic: Radius cliff via H₂ dissolution into magma. Cited in §3.3, §7.1. Web sources: S060 (Topical).
- **P23.** Van Eylen et al. (2021); Kaye et al. (2022). Topic: TOI-270 d mass. Cited in §3.3, §5.1, §7.1. Web sources: S138 (Topical).
- **P24.** Benneke et al. (2024). *JWST Reveals CH4, CO2, and H2O in a Metal-rich Miscible …* Topic: TOI-270 d miscible metal-rich envelope. Cited in §1.2, §3.3, §4.3, §5.1, §7.1. Web sources: S053 (Copy); S095 (Topical); S121 (Topical).
- **P25.** Cloutier et al. (2021). Topic: GJ 1214 b mass and radius. Cited in §3.3, §5.1, §7.1. Web sources: S118 (Topical).
- **P26.** Kempton et al. (2023). Topic: GJ 1214 b MIRI phase curve. Cited in §1.2, §3.3, §5.1, §7.1. Web sources: S054 (Topical); S118 (Topical).
- **P27.** Madhusudhan et al. (2021/2023). Topic: Hycean hypothesis; K2-18 b JWST spectrum. Cited in §3.3, §5.1, §7.1. Web sources: S122 (Topical); S052 (Topical).
- **P28.** Schmidt et al. (2025). *A Comprehensive Reanalysis of K2-18 b's JWST NIRISS+NIRSpec …* Topic: Contested DMS/DMDS inferences. Cited in §3.3, §7.1. Web sources: S052 (Copy); S122 (Topical).
- **P29.** Wogan et al. (2024); Shorttle et al. (2024). Topic: Magma-ocean mini-Neptune models for K2-18 b. Cited in §3.3, §7.1. Web sources: S120 (Topical); S083 (Topical); S089 (Topical).
- **P30.** Millot et al. (2018). *Experimental evidence for superionic water ice using shock …* Nature Physics. Topic: Superionic water ice. Cited in §1.2, §3.4, §7.1. Web sources: S033 (Copy); S048 (Coverage); S047 (Coverage); S130 (Topical); S071 (Topical); S008 (Topical).
- **P31.** Millot et al. (2019). *Nanosecond X-ray diffraction of shock-compressed superionic water …* Nature. Topic: Ice XVIII fcc oxygen lattice. Cited in §1.2, §3.4, §7.1. Web sources: S049 (Copy); S050 (Topical).
- **P32.** Neuenschwander & Helled (2022). Topic: Uranus and Neptune interior models. Cited in §3.4, §5.1, §7.1. Web sources: S072 (Topical); S021 (Topical); S129 (Topical).
- **P33.** 2025 Uranus seasonal REB studies. *Internal Heat Flux and Energy Imbalance of Uranus*. Topic: Uranus internal heat flux 0.078 ± 0.018 W m⁻². Cited in §1.2, §3.4, §5.1, §7.1, §7.2. Web sources: S085 (Copy); S056 (Copy); S057 (Copy).
- **P34.** Li et al. (2018). *Less absorbed solar energy and more internal heat for Jupiter*. Nature Communications. Topic: Jupiter Bond albedo 0.503; internal heat flux 7.485 W m⁻². Cited in §1.2, §4.2, §5.1, §7.1, §7.2. Web sources: S055 (Copy).
- **P35.** Wahl et al. (2017). *Comparing Jupiter interior structure models to Juno gravity …* Topic: Jupiter dilute core. Cited in §1.2, §3.5, §7.1. Web sources: S035 (Copy); S038 (Copy).
- **P36.** Militzer et al. (2022). Topic: Jupiter dilute-core extent. Cited in §1.2, §3.5, §5.1, §7.1. Web sources: S013 (Topical); S021 (Topical); S129 (Topical).
- **P37.** Mankovich et al. (2019). Topic: Saturn rotation from ring seismology. Cited in §3.5, §7.1, §7.2. Web sources: S128 (Topical); S016 (Topical).
- **P38.** Mankovich & Fuller (2021). *A diffuse core in Saturn revealed by ring seismology*. Nature Astronomy. Topic: Saturn diffuse core to ~60% of radius. Cited in §1.2, §3.5, §7.1. Web sources: S039 (Copy); S040 (Coverage); S086 (Topical).
- **P39.** Müller et al. (2024). *The mass-radius relation of exoplanets, revisited*. A&A 686, A296. Topic: Three-regime M–R scaling; breaks at 4.37 and 127 M⊕. Cited in Overview, §3.2, §3.5, §4.4, §7.1. Web sources: S007 (Copy); S011 (Copy); S143 (Copy); S073 (Coverage).
- **P40.** Otegi et al. (2020). Topic: Extended rocky branch, radius exponent 0.29 (PlanetS catalog). Cited in §4.4, §7.1. Web sources: S151 (Copy).
- **P41.** Parc et al. (2024). Topic: PlanetS catalog analysis. Cited in §7.1. No web source captured.
- **P42.** Zeng, Sasselov & Jacobsen (2016). *Mass-Radius Relation for Rocky Planets based on PREM*. ApJ 819, 127. Topic: PREM rocky mass–radius relation. Cited in §4.4, §6.3, §7.1. Web sources: S014 (Copy).
- **P43.** Marcus et al. (2010). ApJL. Topic: Giant-impact iron-stripping limit. Cited in §5.2, §7.1. Web sources: S108 (Topical); S152 (Topical); S109 (Topical).
- **P44.** Zeng et al. (2026). Topic: Radius valley and cliff occurrence theory. Cited in §7.1. No web source captured.
- **P45.** JWST Early Release Science (2023–2024). *WASP-39 b program papers*. Topic: WASP-39 b H₂O, CO₂, H₂S, photochemical SO₂. Cited in §3.5, §5.1, §7.1. Web sources: S135 (Copy); S087 (Copy); S037 (Copy).

### Web Sources Consulted

Grouped by evidence tier; within each tier, sources keep their export order.

#### Tier A: Peer-reviewed research & preprints

- **S002** — *The Compositional Diversity of Small Planets Orbiting Low-Mass Stars* — thesis.caltech.edu. Doctoral thesis.
- **S004** — *The Structure of Exoplanets - arXiv* — arxiv.org. Probable same work as S069 (W08).
- **S005** — *Diversities and similarities exhibited by multi-planetary systems and …* — scholarlypublications.universiteitleiden.nl
- **S007** — *The mass-radius relation of exoplanets, revisited - arXiv* — arxiv.org. Müller et al. 2024 (W01); preferred open copy.
- **S010** — *(PDF) The IAU Working Definition of an Exoplanet - ResearchGate* — researchgate.net. Lecavelier des Etangs & Lissauer 2022; ResearchGate copy.
- **S011** — *The mass-radius relation of exoplanets revisited - Unige* — access.archive-ouverte.unige.ch. Müller et al. 2024 (W01); institutional repository copy.
- **S013** — *(PDF) Relation of Gravity, Winds, and the Moment of Inertia of …* — researchgate.net
- **S014** — *Mass-Radius Relation for Rocky Planets based on PREM - arXiv* — arxiv.org. Zeng, Sasselov & Jacobsen 2016.
- **S020** — *Origin and characterization of super-Earths and sub-Neptunes* — researchgate.net. W02; ResearchGate copy of S028.
- **S021** — *Chapter 0 Giant planet interiors and atmospheres - arXiv* — arxiv.org. W04; book chapter preprint.
- **S026** — *Helium escaping from the atmosphere of a nearby rocky exoplanet* — researchgate.net. LHS 1140 b metastable-He outflow; probable basis of the Model 4.3.3 envelope-stripping rate.
- **S027** — *Mantle convection and nightside volcanism on lava world K2-141 b* — academic.oup.com
- **S028** — *Origin and characterization of super-Earths and sub-Neptunes - arXiv* — arxiv.org. W02; preferred open copy.
- **S029** — *TOI-421 b: A Hot Sub-Neptune with a Haze-Free, Low Mean ... - arXiv* — arxiv.org
- **S033** — *Experimental evidence for superionic water ice using shock …* — researchgate.net. Millot et al. 2018
- **S035** — *Comparing Jupiter interior structure models to Juno gravity ... - arXiv* — arxiv.org. Wahl et al. 2017 (W03); preferred open copy.
- **S036** — *A population study of gaseous exoplanets - arXiv* — arxiv.org
- **S037** — *Inhomogeneous terminators on the exoplanet WASP-39 b - PMC - NIH* — pmc.ncbi.nlm.nih.gov. JWST ERS program paper.
- **S038** — *Comparing Jupiter interior structure models to Juno gravity* — repository.arizona.edu. Wahl et al. 2017 (W03); repository copy.
- **S039** — *A diffuse core in Saturn revealed by ring seismology - ResearchGate* — researchgate.net. Mankovich & Fuller 2021; ResearchGate copy.
- **S043** — *(PDF) Geophysical evidence for an enriched molten silicate layer …* — researchgate.net. Samuel et al. 2023
- **S046** — *A Large Solid Inner Core at Mercury. A. Genova1,2, S. Goossens2,3* — hou.usra.edu. Conference abstract by the Genova team.
- **S049** — *Nanosecond X-ray diffraction of shock-compressed superionic water …* — osti.gov. Millot et al. 2019
- **S051** — *Interior Structure and Chemistry of Solid Exoplanets - DASH (Harvard)* — dash.harvard.edu. Doctoral thesis.
- **S052** — *A Comprehensive Reanalysis of K2-18 b's JWST NIRISS+NIRSpec …* — research-portal.st-andrews.ac.uk. Schmidt et al. 2025
- **S053** — *JWST Reveals CH4, CO2, and H2O in a Metal-rich Miscible ... - arXiv* — arxiv.org. Benneke et al. 2024.
- **S054** — *New insights into the internal structure of GJ 1214 b informed by JWST* — researchgate.net
- **S055** — *Less absorbed solar energy and more internal heat for Jupiter* — ps.phys.uh.edu. Li et al. 2018.
- **S056** — *(PDF) Internal Heat and Energy Imbalance of Uranus - ResearchGate* — researchgate.net. W06; ResearchGate copy of S085.
- **S057** — *The bolometric Bond albedo and energy balance of Uranus* — ntrs.nasa.gov. Companion to the 2025 Uranus energy-budget study.
- **S060** — *The nature and origins of sub-Neptune size planets - arXiv* — arxiv.org
- **S069** — *Structure of exoplanets - PMC - NIH* — pmc.ncbi.nlm.nih.gov. Probable same work as S004 (W08).
- **S072** — *The interiors of Uranus and Neptune: current understanding and …* — royalsocietypublishing.org
- **S074** — *Exoplanet Orbital Distribution around FGK Sun-⊙-like Host Stars* — arxiv.org
- **S080** — *Fundamentals of Interior Modelling and Challenges in the ... - PMC* — pmc.ncbi.nlm.nih.gov
- **S081** — *Beyond the mass–radius plane: integrated radiative–convective and …* — academic.oup.com
- **S082** — *On the road to the radius valley: distinguishing between gas dwarfs …* — api.repository.cam.ac.uk
- **S083** — *Not All Sub-Neptune Exoplanets Have Magma Oceans* — researchgate.net
- **S084** — *Exploring the sub-Neptune frontier with JWST - PNAS* — pnas.org
- **S085** — *Internal Heat Flux and Energy Imbalance of Uranus* — ntrs.nasa.gov. W06; preferred copy.
- **S086** — *(PDF) Saturn's Interior After the Cassini Grand Finale - ResearchGate* — researchgate.net
- **S087** — *(PDF) A benchmark JWST near-infrared spectrum for the exoplanet …* — researchgate.net. JWST ERS program paper
- **S088** — *JWST NIRSpec finds no clear signs of an atmosphere on TOI-1685 b* — academic.oup.com
- **S089** — *University of Groningen Most rocky sub-Neptunes are molten* — research.rug.nl. Repository copy.
- **S092** — *JWST reveals a rapid and strong day side variability of 55 Cancri e* — arxiv.org
- **S094** — *IAU 2015 Resolution B3 on Recommended Nominal Conversion …* — researchgate.net. Prša et al. 2016
- **S095** — *surface and interior conditions of temperate sub-Neptune TOI-270 d* — academic.oup.com. W05; publisher copy.
- **S098** — *Mercury's gravity, tides, and spin from MESSENGER radio science …* — researchgate.net
- **S099** — *Spin State and Moment of Inertia of Venus* — ntrs.nasa.gov. Margot et al. 2021.
- **S102** — *Melting and density of MgSiO3 determined by shock compression of …* — pmc.ncbi.nlm.nih.gov
- **S107** — *Evolution and Observable Properties of Rocky Planet Atmospheres* — ntrs.nasa.gov
- **S109** — *A Collisional Origin to Earth's Non-chondritic Composition? - arXiv* — arxiv.org
- **S110** — *Exploring the habitability and interior composition of exoplanets …* — arxiv.org
- **S111** — *“Mega-Earths” are Likely an Artifact of Stellar Activity - ResearchGate* — researchgate.net
- **S112** — *Radius Impact of Carbon-Rich Atmospheres on Lava Worlds - arXiv* — arxiv.org
- **S113** — *the core-powered mass-loss mechanism - PMC …* — pmc.ncbi.nlm.nih.gov. Probable same work as S116 (W09)
- **S114** — *Extreme weather variability on hot rocky exoplanet 55 Cancri e* — pmc.ncbi.nlm.nih.gov
- **S115** — *III. Mass and Metallicity Dependence for FGKM Main-sequence Stars …* — core.ac.uk
- **S116** — *Signatures of the core-powered mass-loss mechanism in the …* — academic.oup.com. W09; publisher copy
- **S117** — *Gas-depleted planet formation occurred in the four-planet system …* — research-portal.st-andrews.ac.uk
- **S119** — *Revisiting Atmospheric Feature Trends in Neptune-size Exoplanets* — repository.arizona.edu
- **S120** — *University of Groningen Magma Ocean Interactions Can Explain …* — research.rug.nl
- **S121** — *The surface and interior conditions of temperate sub-Neptune TOI* — researchgate.net. W05; ResearchGate copy of S095.
- **S122** — *New Constraints on DMS and DMDS in the Atmosphere of K2-18 b* — researchgate.net
- **S123** — *JWST Unveils a High Mean Molecular Weight Atmosphere for Mini …* — research.usq.edu.au
- **S124** — *Silane–methane competition in sub-Neptune atmospheres as a …* — academic.oup.com
- **S125** — *A generalized Bayesian inference method for constraining the …* — researchgate.net
- **S126** — *Using Real Data from the Kepler Mission to Find Potentially …* — pubs.aip.org. Education-journal article
- **S127** — *Phase-curve Pollution of Exoplanet Transmission Spectra* — research.unipd.it. W07; repository copy.
- **S128** — *Saturn/'s fast spin determined from its gravitational field and …* — researchgate.net
- **S129** — *Giant planet interiors and atmospheres - arXiv* — arxiv.org. W04.
- **S132** — *Pilot detection of cloudy/hazy atmospheres in Warm Jupiters* — research.almagesto.org
- **S133** — *Probing Exoplanetary Chemistry with Ariel: Scientific Priorities and …* — arxiv.org
- **S134** — *The Albedo Problem and Cloud Cover on Hot Jupiters - ResearchGate* — researchgate.net
- **S135** — *Photochemically produced SO2 in the atmosphere of WASP-39b* — pmc.ncbi.nlm.nih.gov. JWST ERS program paper.
- **S136** — *Io and the Minor Jovian Moons – Prospects for JUICE* — elib.dlr.de
- **S137** — *The I-Love Universal Relation for Polytropic Stars Under Newtonian …* — riunet.upv.es
- **S139** — *arXiv:2303.00812v3 [gr-qc] 11 May 2023* — arxiv.org. Export kept the identifier only.
- **S140** — *Orbital stability of moons around the TRAPPIST-1 planets - arXiv* — arxiv.org
- **S141** — *Estimations for strong and weak hot Jupiter magnetism - arXiv* — arxiv.org
- **S142** — *ORCHARD: A General Planetary Evolution Code - arXiv* — arxiv.org
- **S145** — *Phase curve pollution of exoplanet transmission spectra - arXiv* — arxiv.org. W07; preferred open copy.
- **S146** — *A Population Analysis of 20 Exoplanets Observed from the Optical to …* — arxiv.org
- **S151** — *Our sample of planets from the PlanetS catalog (JF Otegi et al. 2020* — researchgate.net. Figure page from Otegi et al. 2020.
- **S152** — *The Role of Giant Impacts in Planet Formation - Annual Reviews* — annualreviews.org
- **S153** — *Compositional variations within the TRAPPIST-1 planets* — presentations.copernicus.org. Conference presentation.
- **S155** — *A first look at rocky exoplanets with JWST - PMC - NIH* — pmc.ncbi.nlm.nih.gov
- **S156** — *(a) Mercuryʼs interior structure (from Genova et al. 2019). (b) Crustal* — researchgate.net. Figure page from Genova et al. 2019.

#### Tier B: Agency data, standards & catalogs

- **S015** — *(title not captured)* — nssdc.gsfc.nasa.gov. NSSDC page; export kept the host only.
- **S016** — *Saturn Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S019** — *PLANETARY DATA SYSTEM - PDS Engineering Node - NASA* — pds-engineering.jpl.nasa.gov
- **S024** — *Planetary Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S031** — *Uranus Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S032** — *Neptune Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S066** — *Documents - International Astronomical Union (IAU)* — iau.org
- **S067** — *commission f2 exoplanets and the solar system* — iau.org
- **S068** — *Commission F2: News - International Astronomical Union | IAU* — iauarchive.eso.org
- **S070** — *Planetary Fact Sheet Notes - NASA* — nssdc.gsfc.nasa.gov
- **S076** — *Exoplanet Catalog - NASA Science* — science.nasa.gov. Basis of the 6,153 census and category bins.
- **S078** — *Earth Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S079** — *(title not captured)* — nssdc.gsfc.nasa.gov. NSSDC page; export kept the host only.
- **S096** — *Mercury Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S097** — *Venus Fact Sheet - NASA* — nssdc.gsfc.nasa.gov
- **S106** — *Planet TRAPPIST-1 b - exoplanet.eu* — exoplanet.eu
- **S138** — *Planet TOI-270 d - exoplanet.eu* — exoplanet.eu

#### Tier C: Institutional & agency communications

- **S003** — *What is an Exoplanet? - NASA Science* — science.nasa.gov
- **S006** — *Weird Worlds? Yes — by the Trillion - NASA Science* — science.nasa.gov
- **S008** — *LABORATORY ASTROPHYSICS Newsletter | NASA* — nasa.gov
- **S018** — *Exoplanet Science Strategy* — science.nasa.gov
- **S022** — *Terrestrial - NASA Science* — science.nasa.gov
- **S023** — *TESS (Transiting Exoplanet Survey Satellite) - eoPortal* — eoportal.org
- **S030** — *What Are Neptunian Planets? - NASA Science* — science.nasa.gov
- **S034** — *Gas Giant - NASA Science* — science.nasa.gov
- **S041** — *Mystery of the Martian core solved | ETH Zurich* — ethz.ch. Covers Khan et al. 2023.
- **S048** — *Newly Created Water Phase* — str.llnl.gov. LLNL Science & Technology Review.
- **S058** — *Final Report Package 2022 NASA Planetary Mission Senior Review* — lpi.usra.edu
- **S062** — *Publications - Lowell Observatory* — www2.lowell.edu. Index page; no specific claim maps to it.
- **S065** — *Scientific definition of a planet says it must orbit our sun. A new …* — universityofcalifornia.edu. Covers Margot et al. 2024
- **S073** — *The Mass-Radius Relation of Exoplanets - Department of Astrophysics* — astro.uzh.ch. Institutional summary of the W01 work.
- **S093** — *Session 6: Beyond the Heliosphere - NASA* — assets.science.nasa.gov. No specific claim maps to it.
- **S100** — *NASA's InSight Reveals the Deep Interior of Mars* — jpl.nasa.gov
- **S101** — *MESSENGER Provides New Look at Mercury's Surprising Core and …* — nasa.gov
- **S103** — *Seismic detection of the martian core* — ipgp.fr. Covers Stähler et al. 2021.
- **S130** — *The depths of Neptune and Uranus may be “superionic”* — carnegiescience.edu
- **S148** — *Planetary Data System Roadmap Study for 2017 – 2026* — pds.nasa.gov
- **S149** — *Geodetic Evidence that Mercury has a Solid Inner Core - PGDA* — pgda.gsfc.nasa.gov. Covers Genova et al. 2019.
- **S150** — *NASA's Tally of Planets Outside Our Solar System Reaches 6000* — nasa.gov

#### Tier D: Science journalism & popular media

- **S040** — *Saturn Has Diffuse, Stably Stratified Core, New Study Says - Sci.News* — sci.news
- **S042** — *Thanks to a layer of molten rock, Mars' core appears bigger than it is* — space.com
- **S044** — *Mystery solved: Mercury has a solid heart | Space - EarthSky* — earthsky.org
- **S045** — *Mercury Has Solid Inner Core, Planetary Scientists Say - Sci.News* — sci.news
- **S047** — *Scientists Made Ice Stay Solid Above 2,000°C. The 'Superionic Ice …* — zmescience.com
- **S059** — *How many exoplanets have been discovered so far?* — skyatnightmagazine.com
- **S061** — *NASA Spacecraft Reveals Moon As Never Before | Space* — space.com. Supports the PDS data-volume point (LRO).
- **S063** — *We've officially found 6000 exoplanets, NASA says - Space* — space.com
- **S064** — *Astronomers Propose We Change The Definition of 'Planet'* — cloudynights.com. Forum post.
- **S071** — *Researchers recreate the ice giants' interiors - Astronomy Magazine* — astronomy.com
- **S075** — *TRAPPIST-1 - Star Facts* — star-facts.com
- **S077** — *Uncovering the molten mantle of Mars - Physics Today* — physicstoday.aip.org
- **S090** — *PLANET TYPES - Pablo Carlos Budassi* — pablocarlosbudassi.com. Popular infographic.
- **S104** — *Planet Mercury Has Solid Inner Core About the Same Size as Earth's* — gizmodo.com
- **S105** — *InSight Finds Evidence for Molten Silicate Layer above Martian …* — sci.news

#### Tier E: Tertiary references & mirrors

- **S001** — *IAU definition of planet - Wikipedia* — en.wikipedia.org
- **S009** — *Sub-Neptune - Wikipedia* — en.wikipedia.org
- **S012** — *Searching for Habitable Planets – Cosmic Origins* — wisconsin.pressbooks.pub. Open textbook.
- **S025** — *TRAPPIST-1 - Wikipedia* — en.wikipedia.org
- **S050** — *Phases of ice - Wikipedia* — en.wikipedia.org
- **S091** — *55 Cancri Ae - Wikipedia* — en.wikipedia.org
- **S108** — *Robert MARCUS | Research profile - ResearchGate* — researchgate.net. Researcher profile page, not a work.
- **S118** — *GJ 1214 b - Wikipedia* — en.wikipedia.org
- **S131** — *The Exoplanet Handbook - AWS* — drupal-s3fs-prod.s3.eu-west-1.amazonaws.com. Textbook hosted in a storage bucket.
- **S143** — *The Mass-Radius Relation of Exoplanets Revisited | PDF | Planets* — scribd.com. Uncontrolled mirror of the W01 work; cite S007 or S011.
- **S144** — *Introducory Notes On Planetary Science Colette Salyk Kevin Lewis* — scribd.com. Uncontrolled mirror of course notes.
- **S154** — *Jupiter - Wikipedia* — en.wikipedia.org

#### Tier F: Project & software references

- **S017** — *(title not captured — Physics Playground deployment)* — dnoice.github.io. Reported unreachable during research compilation.
- **S147** — *What Gravitas Has Been Checked Against* — gravitas-sim.online. Comparable simulator's validation page.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
