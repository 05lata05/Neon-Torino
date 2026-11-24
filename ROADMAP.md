# Neon Torino roadmap

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
`(local)` = needs Unreal Engine on a PC · `(blender)` = 3D model in Blender · `(osm)` = edits on openstreetmap.org ·
`(manual)` = the owner

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
- [ ] Editor script `unreal/scripts/build_level.py`: imports the city, sets collision, game mode and Player Start in one go (~1)
- [ ] Try `build_level.py` in the editor and fix it (local) (~1)
- [ ] Gameplay data export: road graph with lanes and one-ways, tram tracks and lines, tram and bus stops → `unreal/import/santa_rita_data.json` (~1)
- [ ] Automated Unreal check run before every Unreal pull request: the level loads, the car drives (Unreal automation test from the command line) (local) (~1)
- [ ] First Windows build in the GitHub Releases and a "how to play" page for friends (manual) (~1)

## U2 · Believable Santa Rita
Goal: anyone who knows Santa Rita recognises it. Everything according to `docs/REALISM.md`.
- [ ] OpenStreetMap check of Santa Rita: missing building levels and roof shapes, shops, trees, bus and tram stops; then a data refresh (osm) (~2)
- [ ] Exporter: real roof shapes and heights from OSM (`roof:shape`, `roof:height`) where mapped, pitched roofs on small buildings (needs review) (~1)
- [ ] Exporter: facade types by period and use (1950s–70s blocks, historic, industrial, churches) as separate materials, UVs per floor (needs review) (~1)
- [ ] CC0 photographic materials in Unreal (plaster, asphalt, sidewalks, porphyry, stone) and `docs/CREDITS.md` (local) (needs review) (~1)
- [ ] Data export of the 666 real trees, GTT stops, street lamps, bins and benches with their positions (~1)
- [ ] Place them in Unreal with PCG (procedural content) from that export (local) (needs review) (~1)
- [ ] Day and night, rain and the Turin haze with Lumen; street lights on at night (local) (needs review) (~1)
- [ ] Santuario di Santa Rita da Cascia modelled in Blender on the OSM footprint (blender) (needs review) (~2)
- [ ] Santuario and its square placed in Unreal (local) (needs review) (~1)
- [ ] Real signs of the OSM shops and venues on the ground floor: data export, then signs in Unreal (local) (needs review) (~2)

## U3 · Driving and chases
Goal: driving around Santa Rita must be fun on its own. Numbers from the browser game's `src/config.js` as a start.
- [ ] Vehicle types (sedan, compact, sports, van, taxi, police, bus) with their own handling (local) (~2)
- [ ] Traffic on the real road graph, with traffic lights at junctions (local) (~2)
- [ ] Pedestrians on the sidewalks (local) (~1)
- [ ] Police and wanted level, chases, helicopter (local) (~2)
- [ ] GTT tram (Sirio / series 2800) and bus models (blender) (~2)
- [ ] GTT trams 4 and 10 on the real tracks (local) (~1)
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
