# Neon Torino roadmap — code track

Two tracks run in parallel (`docs/TEAM.md`): **this file is the code track** (Unreal, C++, data, scripts); the art
track (Blender models and materials) is **[`ROADMAP-ART.md`](ROADMAP-ART.md)**. They meet at the sync points `⇄`,
through the asset contract `art/ASSETS.md`: the code works with placeholder boxes until the art arrives.

| Code milestone | Waits for art? | Sync point with the art track |
|---|---|---|
| U1 foundations | no | ⇄ A0: the art import script tested with the calibration asset |
| U2 believable Santa Rita | no (placeholders) | ⇄ A1 materials, ⇄ A2 street furniture, ⇄ A4 facade kit, ⇄ A5 Santuario |
| U3 driving and chases | no (placeholders) | ⇄ A3 GTT tram 8000, ⇄ A6 cars |
| U4–U6 | no | ⇄ A5 landmarks, ⇄ A6 people |

Automatic work: ON

> Every night a Claude session does the first free box it can do in the cloud and, if the GitHub test is green,
> merges it into `main` by itself (rules in `docs/AUTOMATION.md`). It cannot run Unreal Engine, so it skips boxes
> marked `(local)`. Boxes marked `(needs review)` stay in a pull request that you approve; boxes marked `(manual)`
> are skipped. To stop it write `PAUSED` instead of `ON` above.

How to use it: each work session takes **the first free box** of the current milestone (a box with an open pull
request is taken), claims it with a draft pull request, works on a dedicated branch (`feature/<name>`), passes
`npm test` and ticks the box here. Details in `CONTRIBUTING.md`.
A finished milestone = a Windows build in the GitHub Releases, with something new to try.

Legend: `[x]` done · `[ ]` to do · `(~N sessions)` rough estimate · `(needs review)` changes how the game looks: the owner does the merge.
Who can do a box (roles in `CONTRIBUTING.md`): no marker = data and tools, any PC or the nightly session ·
`(local)` = needs Unreal Engine on a PC · `(osm)` = edits on openstreetmap.org · `(manual)` = the owner ·
`⇄ A…` = integrates a delivery of the art roadmap (`ROADMAP-ART.md`). Blender work is only in the art roadmap.

## Vision

**Neon Torino is a GTA-style crime open world set in the real Turin.** You drive a lot, escape the police, discover
the city's landmarks and build a small empire of businesses starting from Santa Rita. It is made with
**Unreal Engine 5** for PC (Windows); friends play the builds published in the GitHub Releases.

Pillars, in order of importance:
1. **Recognisable Turin**: every zone follows the realism standard (`docs/REALISM.md`), built from real data.
2. **Driving and chases**: the heart of the fun.
3. **Money and empire**: buying and growing businesses in the district.
4. **GTA-style crime**: police, gangs, weapons, with Turin irony. The story is light, tied to the businesses.
5. **Play with friends**: a Windows build at the end of every milestone.

How it is built: the city is **generated from data** (OpenStreetMap, Arpa Piemonte → `tools/` → `unreal/import/`),
never drawn by hand; game logic in **C++** (text: it merges in Git and Claude can write it), Blueprints only to wire
things up; special models (landmarks, trams, cars) made in **Blender** on the real footprints.

---

## U0 · Unreal prototype — done
- [x] Santa Rita exported to glTF for Unreal (`tools/export_gltf.mjs` → `unreal/import/santa_rita.glb`) and first-run guide in `unreal/README.md`
- [x] Opened in Unreal 5.8 with the Vehicle template and driven around Santa Rita (manual)
- [x] Decision: Unreal becomes the game, PC only, logic in C++; the browser game is frozen (manual)

## U1 · Unreal foundations — in progress
Goal: a C++ project in the repository that everyone can open, and a level rebuilt from data with one command.
- [x] C++ project `unreal/NeonTorino` from the Vehicle template (C++), committed with Git LFS; World Partition with "one file per actor" (local) (~1)
- [x] `npm test` also checks the exporter: `unreal/import/santa_rita.glb` is valid and up to date with `data/torino.json` (~1)
- [x] Editor script `unreal/scripts/build_level.py`: imports the city, sets collision, game mode and Player Start in one go (~1)
- [x] Try `build_level.py` in the editor and fix it (local) (~1)
- [x] Gameplay data export: road graph with lanes and one-ways, tram tracks and lines, tram and bus stops → `unreal/import/santa_rita_data.json` (~1)
- [x] Art import script `unreal/scripts/import_art.py`: imports `art/exports/**` into `/Game/Art/` with fixed settings (scale, axes, collision from `UCX_`, normal maps, material instances from a master PBR material); reports names that break `art/ASSETS.md` (~1)
- [ ] ⇄ A0: try it with `SM_Calibration_Arrow`, confirm the axes, fix the pipeline doc if needed (local) (~0.5)
- [ ] Automated Unreal check run before every Unreal pull request: the level loads, the car drives (Unreal automation test from the command line) (local) (~1)
- [ ] First Windows build in the GitHub Releases and a "how to play" page for friends (manual) (~1)

## U2 · Believable Santa Rita
Goal: anyone who knows Santa Rita recognises it. Everything according to `docs/REALISM.md`.
- [ ] OpenStreetMap check of Santa Rita: missing building levels and roof shapes, shops, trees, bus and tram stops; then a data refresh (osm) (~2)
- [x] Exporter: real roof shapes and heights from OSM (`roof:shape`, `roof:height`) where mapped, pitched roofs on small buildings (needs review) (~1)
- [x] Exporter: facade types by period and use (1950s–70s blocks, historic, industrial, churches) as separate materials, UVs per floor (needs review) (~1)
- [x] Procedural facade material in Unreal: windows per floor and bay for every facade type, from an editor Python script (local) (needs review) (~1)
- [ ] ⇄ A1: the art materials (`M_Plaster_*`, `M_Asphalt_*`, `M_RoofTiles_Coppi`…) applied to the exporter's material slots, world-scale UVs (local) (needs review) (~1)
- [x] Data export of the 666 real trees, GTT stops, street lamps, bins and benches with their positions (~1)
- [x] Place them in Unreal from that export, in C++ (`City/CityProps`): trees, lamps, benches, bins, bus stops and tram shelters as placeholder shapes (~1)
- [ ] Try the street props in Unreal and fix them (local) (~1)
- [x] Mesh slots in `CityProps` for every prop of `art/ASSETS.md` (lamp, bench, bin, stop pole, shelter, tree species by OSM `genus`), placeholders when empty (~1)
- [ ] ⇄ A2: the art street furniture in the slots (local) (needs review) (~0.5)
- [ ] Day and night, rain and the Turin haze with Lumen; street lights on at night (local) (needs review) (~1)
- [ ] Landmark footprints for the art track: the Santuario's and the stadium's OSM outlines exported as `.obj` to `art/refs/<Landmark>/` (~0.5)
- [ ] Facade kit assembly: the pieces of `art/ASSETS.md` placed along the real footprints, floor by floor, shop fronts where there are shops, signs on the sign band (~2)
- [ ] ⇄ A4: the art facade kit in the assembly (local) (needs review) (~0.5)
- [ ] ⇄ A5: the Santuario and its square placed in Unreal (local) (needs review) (~1)
- [x] Data export for real signs of mapped Santa Rita shops and venues
- [x] Real shop and venue signs in C++: a board with the real name on the facade facing the nearest street, colour by category (~1)
- [ ] Check the signs in Unreal (right wall, readable from the street) and fix them (local) (needs review) (~1)

## U3 · Driving and chases
Goal: driving around Santa Rita must be fun on its own. Numbers from the browser game's `src/config.js` as a start.
- [ ] Vehicle types (sedan, compact, sports, van, taxi, police, bus) with their own handling (local) (~2)
- [ ] Traffic: compare City Sample's MassTraffic with a simpler traffic of our own on `santa_rita_data.json`, write down the choice (see `docs/REFERENCES.md`) (local) (~1)
- [x] Speed limits (`maxspeed`) from OpenStreetMap in the gameplay data export (~1)
- [ ] Traffic on the real road graph, with traffic lights at junctions (local) (~2)
- [ ] Pedestrians on the sidewalks (MassCrowd from City Sample or our own, see `docs/REFERENCES.md`) (local) (~1)
- [ ] Police and wanted level, chases, helicopter: port the browser game's rules (`src/entities/police.js`, `POLICE` in `src/config.js`) to C++ (local) (~2)
- [ ] Mesh slots in `GttTram` (one per module, door leaves that open at stops), boxes when empty (~1)
- [ ] ⇄ A3: the art tram 8000 in the slots (local) (needs review) (~0.5)
- [x] GTT trams 4 and 10 on the real tracks in C++: rails drawn from `santa_rita_data.json`, Hitachi series 8000 shape (5 modules, 28 m, doors on the right, yellow and blue), stops, braking for obstacles (rules from the browser game's `src/entities/trams.js`) (~1)
- [ ] Try the trams in Unreal and fix them (local) (~1)
- [ ] Damage, street races, rewarded stunts (local) (~2)

## U4 · Game, money and empire
Goal: a reason to drive around and a district to conquer.
- [ ] HUD, minimap, money; text in Italian and English (Unreal localisation) (local) (~2)
- [ ] Missions from the browser game: delivery, race, taxi, heist (local) (~2)
- [ ] Garage, businesses to buy (invented), saving (local) (~2)

## U5 · GTA-style crime
- [ ] Player health and armour, getting out of the car, on foot (local) (~2)
- [ ] Punches, weapons, gun shop (local) (~2)
- [ ] Hospital and police station, rival gangs and racket (local) (~2)

## U6 · Iconic Turin
Goal: the map grows along the boulevards. **Every zone passes the `docs/REALISM.md` checklist.**
- [ ] Larger map in the exporter, loaded in pieces with World Partition (~1)
- [ ] Borgo Filadelfia and Stadio Filadelfia (needs review) (~1–2)
- [ ] Lingotto, with the track on the roof of the former factory (needs review) (~2)
- [ ] Porta Nuova and the centre up to piazza Castello and the Mole (needs review) (~3)
- [ ] The Po and the Murazzi, with the bridges (needs review) (~2)
- [ ] Superga and the hill, with real terrain from Regione Piemonte (needs review) (~2)

---

## Browser game (frozen)
The first version, in Three.js, still playable from its link and still tested by `npm test`. It is the reference
for the rules and numbers to port to Unreal (`src/config.js`, `src/gameplay/`). No new work on it.
- [x] M0 · Project base: Santa Rita from OpenStreetMap; driving, traffic, pedestrians, police with helicopter, 4 mission types, garage, radio, weather, day and night; the real landmarks; the map generator and the GitHub repository
- [x] M1 · Foundations: modules, simulated-play test, GitHub Actions, state ownership, balance in `src/config.js`, performance limits, English code with Italian and English game text
- [x] M2 (part): real building heights from Arpa Piemonte; realistic sky and horizon haze

## Ideas on hold (not yet in a milestone)
- Radio with hosts and neighbourhood news
- Sunday matches at the stadium, with crowds and traffic
- Neighbourhood market in piazza Santa Rita with animated stalls
- Drivable GTT trams
- Online play with friends (Unreal multiplayer)
- Packaged builds: add `/Game/Art` to "Additional Asset Directories to Cook", since `CityProps` finds the art models by name at run time
