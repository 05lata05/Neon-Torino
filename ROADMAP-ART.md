# Neon Torino art roadmap (Blender)

The art track, done in parallel with the code track (`ROADMAP.md`). How the two work together: `docs/TEAM.md`.
How to make an asset: `docs/ART_PIPELINE.md`. What each asset must be: `art/ASSETS.md`.

Rules: one box at a time, claimed with a draft pull request (`CONTRIBUTING.md`); every asset follows the pipeline
checklist; `⇄` marks a **sync point**: the code track imports the delivery and replies with an in-game screenshot.
The nightly Claude session does not work on this roadmap.

Order: **visual impact per hour of work.** Materials cover most of the screen; small props are repeated hundreds of
times; the tram is the hero object; facades and landmarks come once the basics look right.

| Art milestone | Delivers | Meets the code milestone |
|---|---|---|
| A0 Pipeline | export preset, calibration asset, references | U1 (import script) |
| A1 Materials | the city's surfaces | U2 (materials applied by the exporter) |
| A2 Street furniture | trees, lamps, benches, bins, stops | U2 (`CityProps` mesh slots) |
| A3 GTT tram 8000 | the tram, module by module | U3 (`GttTram` mesh slots) |
| A4 Facade kit | Santa Rita's 1950s–70s facades | U2/U3 (facade assembly) |
| A5 Landmarks | Santuario, stadium details | U2/U6 |
| A6 Vehicles and people | cars, pedestrians | U3/U4 |

Legend: `[x]` done · `[ ]` to do · `(~N days)` rough estimate for one person in spare time · `(needs review)` the
owner checks it in game before merging (all art does).

---

## A0 · Pipeline — first, and short
Goal: prove that an asset goes from Blender to the game with the right size, orientation and materials.
- [ ] Blender set up as in `docs/ART_PIPELINE.md` §1, the **Neon Torino** FBX export preset saved (~0.5)
- [ ] `SM_Calibration_Arrow` (1 × 1 × 2 m, "F" on the front, "R" on the right) exported to `art/exports/Test/` ⇄ code imports it: check size, front = Unreal +X, right = +Y; fix §1/§3 of the pipeline if needed (~0.5)
- [ ] Reference walk in Santa Rita: photos of a lamp, a bench, a bin, a GTT stop, a tram shelter, a tram 8000 (front, side, rear, doors), 3 typical facades, shop fronts, pavement and kerbs → `art/refs/` (~1)
- [ ] Texture library: pick the CC0 materials from ambientCG / Poly Haven for each row of A1, note them in `docs/CREDITS.md` (~0.5)

## A1 · Materials — the biggest gain for the time
Goal: the city's surfaces look photographic. Little or no modelling.
- [ ] Plasters (ochre, yellow, cream, grey, white) with dirt at the base, tuned to the facade photos (~1)
- [ ] Roofs: curved clay tiles (coppi), flat bitumen/gravel (~0.5)
- [ ] Ground: city asphalt with patches, sidewalk asphalt, porphyry setts, Luserna stone kerbs (~1)
- [ ] Parks and others: lawn, gravel paths, brick, stadium concrete (~0.5)
- [ ] ⇄ Code applies them (exporter materials → Unreal material instances) and posts before/after screenshots (needs review)

## A2 · Street furniture — small, repeated hundreds of times
Goal: the street feels like Turin. Each asset at detail **S/M** (`art/ASSETS.md`).
- [ ] `SM_Bin_Street` and `SM_Bench_Turin` (first, to practise the full checklist) (~1)
- [ ] `SM_Lamp_Turin_A`, the street lamp of Santa Rita's streets (~1)
- [ ] `SM_GTT_StopPole` and `SM_GTT_TramShelter` (~1.5)
- [ ] Trees: `SM_Tree_Tilia_A/B` (lime) and `SM_Tree_Platanus_A` (plane), with leaf cards and a trunk collision (~2)
- [ ] ⇄ Code puts them in the `CityProps` mesh slots (needs review)

## A3 · GTT tram, Hitachi series 8000 — the hero
Goal: the tram on lines 4 and 10 as it is. Detail **L**. Photos from A0 are essential.
- [ ] Blockout of the five modules at the contract lengths (7.0 / 4.4 / 5.6 / 4.4 / 6.2 m, 2.40 × 3.48 m) ⇄ code swaps the boxes, check proportions in game (~1)
- [ ] Cab module: Giugiaro front, windscreen, lights, display face (~2)
- [ ] Door modules with the door leaves as separate objects; middle module with the pantograph; rear module (~2)
- [ ] Livery (yellow and blue) and materials: paint, glass, rubber, metal; bogie skirts (~1.5)
- [ ] ⇄ Code uses the meshes in `GttTram`, doors open at stops (needs review)

## A4 · Facade kit — Santa Rita's buildings
Goal: the 1950s–70s blocks of Santa Rita: balconies, roller shutters, shop fronts at street level.
- [ ] Trim sheet for frames, sills, shutters, railings (~1)
- [ ] Window with roller shutter, French window with balcony and railing (Geometry Nodes for variations) (~2)
- [ ] Ground floor: shop front with sign band, entrance door, blank and corner pieces, cornice (~2)
- [ ] ⇄ Code assembles the kit on the real footprints and floors; shop signs go on the sign band (needs review)

## A5 · Landmarks
- [ ] Santuario di Santa Rita da Cascia on its OSM footprint (the code track exports it to `art/refs/Santuario/`) (~4)
- [ ] Stadio Olimpico Grande Torino: stands, roof, Torre Maratona details (~3)
- [ ] ⇄ Code places them in place of the generated volumes (needs review)

## A6 · Vehicles and people
- [ ] Three city cars of typical Italian shapes, **no real brands or logos** (~4)
- [ ] GTT bus (no ad wraps from real brands) (~2)
- [ ] Pedestrians: decide with the code track between MetaHuman (Unreal) and simple low-poly people (~0.5)
- [ ] ⇄ Code uses them for traffic and pedestrians (needs review)

---

## Ideas on hold
- Shop interiors seen through the windows (one generic "interior card" texture per shop type)
- Night versions of the materials (lit windows, neon signs)
- Graffiti and posters (invented, no real brands)
