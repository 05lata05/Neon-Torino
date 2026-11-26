# Neon Torino

GTA-style open-world game in the **Santa Rita district of Turin**, made with **Unreal Engine 5** for PC. Streets,
buildings, parks and tram lines come from real **OpenStreetMap** data and Arpa Piemonte building heights; the city
is generated from that data, and the district's landmarks are modelled on their real shapes.

- **Unreal version (the game):** `unreal/`, start from [`unreal/README.md`](unreal/README.md).
  To play the latest version on Windows: double-click **`play.bat`** in the repository folder (it updates from
  GitHub, builds the C++ if needed and starts the game; needs Unreal Engine 5.8 and Visual Studio 2022).
- **Browser version (first prototype, frozen):** Three.js 0.160, ES modules, no build step; Italian and English
  (**L** switches language). Described below.

## Quick start (browser game)

```bash
npm run dev          # local server on http://localhost:8080
```

A server is needed, double-clicking `index.html` is not enough: the game loads `data/torino.json` and ES modules.

Controls: **WASD** drive/walk · **Space** handbrake · **Shift** nitro/run · **E** get in/out/steal ·
**M** map · **R** radio · **C** camera · **H** horn · **V** audio · **Q** graphics · **I** performance · **L** language · **P** pause.

## Santa Rita landmarks

All built on the real OSM footprint (OSM ids in `tools/build_map.py`, `LANDMARKS`).

| Landmark | Real data used | Added details |
|---|---|---|
| **Stadio Olimpico Grande Torino** | outer and inner ring, pitch (artificial turf) | estimated stand and roof heights, pitch-side LEDs, big screen |
| **Torre Maratona** | footprint, 40 m height | flag |
| **Braciere Olimpico** (Turin 2006 cauldron) | position, 57 m height | stylised lattice shape |
| **Inalpi Arena** (former Palasport Olimpico) | footprint, 12 m height | rooftop plant |
| **Pools**: Stadio Monumentale, Nuova Piscina Olimpica, Aquatica, outdoor pool, Piscina Sebastopoli, Torino Nuoto | footprints, levels | signs, canopies, pool lanes |
| **Centrale del Latte di Torino** | area, 7 buildings with levels and roofs, 18 m barrel-vault shed, 22 m water tower | fence, signs, tankers in the yard |
| **Scuola di Management ed Economia** (UniTo) | area, buildings with levels, colours and roofs | plaza, flagpoles, bike racks |
| **Parco Rignon** and **Villa Amoretti** | boundary, 36 paths, lime-tree rows, 25 trees, 94 benches and bins, playground, dog area, skating rink, carousel, historic buildings with colours and roofs | painted baroque façade, extra trees on the lawns, playground equipment |

## Layout

```
index.html                 page: canvases, Three.js import map, loads src/main.js
src/main.js                start-up and game loop
src/core/ world/ entities/ gameplay/ render/ ui/ audio/   the engine, split by topic
src/i18n/                  player-facing text in Italian and English
src/landmarks/             hand-modelled landmarks (shared kit + one module per area)
src/config.js              balance numbers (rewards, prices, speeds, difficulty)
data/torino.json           generated map (do not edit by hand)
tools/                     OSM download, map generator, dev server
tests/smoke.mjs            test: start-up, landmark pictures, simulated play, performance
docs/ARCHITECTURE.md       how modules are built and where new things go
docs/REALISM.md            rules for realistic zones (sources, checklist, real shops)
docs/AUTOMATION.md         how the nightly automatic work runs
unreal/                    Unreal Engine prototype: Santa Rita as glTF, import guide and editor scripts
ROADMAP.md                 project milestones and what to do next
```

## Regenerating the map

```bash
python3 tools/fetch_osm.py     # downloads OSM tiles into .osm-cache/ (ignored by git)
python3 tools/fetch_heights.py # real building heights from Arpa Piemonte
python3 tools/build_map.py     # writes data/torino.json
```

To enlarge the play area change `CLIP` in `tools/build_map.py` (metres from a fixed origin, x towards east
and y towards south): the engine derives the world bounds from it.

## Tests

```bash
npm install          # first time only: local three for offline tests, Prettier
npm test             # needs Playwright with Chromium
```

Code formatting: `npm run format`.

Pictures end up in `tests/out/` (one per landmark, day and night for stadium, arena and park, plus the
performance views `perf-*.png` and the numbers in `perf.json`).

On GitHub the same test runs by itself on every push and pull request (`.github/workflows/test.yml`,
with a Prettier check); the pictures can be downloaded from the run's `test-pictures` artifact.

## Adding a landmark

1. Find the ids on openstreetmap.org (way `w…`, relation `r…`, node `n…`) and add them to `LANDMARKS` in `tools/build_map.py`.
2. Regenerate the map: the building disappears from the generic list and its shapes end up in `DATA.L.<id>`.
3. Create `src/landmarks/<name>.js` with `export default function build(kit, L) { … }` and register it in `src/landmarks/index.js`.
4. Use the kit: `kit.tagBuilding()` builds a whole building from OSM tags; for details there are `walls`, `roof`,
   `insetRoof`, `box`, `sign`, `fence`, `trees`, `solid` (collisions), `mini` (minimap), `onTick`, `lit` (windows at night).
5. Run `npm test` and check the picture in `tests/out/`.

## Working together

Not everybody needs Unreal: there are roles for Unreal developers, data and tools, OpenStreetMap mappers, Blender
artists and testers. Roles, branches, how to claim a roadmap box and how to merge: see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Data and licences

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL licence. Building heights: Arpa Piemonte - Geoportale, CC BY 2.5 Italia. Full list in `docs/CREDITS.md`.
`data/torino.json` is a derivative work of that data and stays under ODbL.
