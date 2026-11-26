# Existing code that can help

Before writing a system from scratch, look here: someone may already have solved it. Each entry says what it
is good for, its licence and **how** we may use it. Last checked: November 2026.

## How to use outside code

| Licence | What we may do |
|---|---|
| MIT, Apache 2.0, BSD, zlib | copy or adapt it; keep the licence notice in the copied files and add a row to `docs/CREDITS.md` |
| Epic samples (City Sample, Lyra, templates) | use them in this Unreal project (Unreal Engine EULA); note what was taken in `docs/CREDITS.md` |
| GPL | read only: copying it would force the whole game under GPL |
| no licence | read only, never copy: without a licence nobody may reuse it |
| paid assets (Fab) | only with the owner's agreement; Blueprint-only assets are hard for Claude to read or change |

Write in the pull request which reference you used and how (copied, adapted, only studied).

## By roadmap area

### Traffic and pedestrians (U3)
- **City Sample** (Epic, free on Fab) — contains **MassTraffic** (hundreds of cars following lanes, junctions,
  traffic lights on a ZoneGraph) and **MassCrowd** (pedestrians). The closest thing to what we need.
  Caveats: not an official plugin, works best inside City Sample, Epic no longer develops it, ZoneGraph is in
  maintenance mode and cannot be generated at runtime. **Use:** take the code from the official City Sample, not
  from third-party extracts. First box: evaluate it against a simpler traffic of our own.
- [Myxcil/MassTraffic-Test](https://github.com/Myxcil/MassTraffic-Test) — MassTraffic extracted from City Sample and
  ported to UE 5.7. **No licence: read only**, useful to see what changes between engine versions.
- [CARLA](https://github.com/carla-simulator/carla) (MIT, Unreal-based driving simulator) — its C++ Traffic Manager
  (lanes, right of way, realistic behaviour) is the best reference for writing our own traffic. **Use:** study and
  adapt ideas; it is too big and too tied to CARLA to drop in.
- Our own data: `unreal/import/santa_rita_data.json` (road graph with lanes and one-ways, tram lines and stops,
  from OpenStreetMap) — whatever traffic system we pick must run on it.

### Trams (U3)
- **The browser game** (`src/entities/trams.js`) — trams on the real tracks with stops, dwell times, braking
  curves and obstacle checks. **Use:** ported to C++ in `unreal/NeonTorino/Source/NeonTorino/Transit/` (rules
  kept, numbers changed to real-world values: see the header of `GttTram.h`).
- **Unreal's Spline Component** — the standard way to move trains and trams along a path; each line's track
  from `santa_rita_data.json` becomes one spline.
- No useful outside code: City Sample's MassTraffic only drives cars; tram packs on Fab are paid Blueprints.

### Police, wanted level, chases (U3, U5)
- **The browser game** (`src/entities/police.js`, `src/entities/heli.js`, `src/config.js` → `POLICE`) — already
  working rules and numbers: cars per wanted level, losing the police, fines, helicopter. **Use:** port the rules to C++.
- Gorka Games' "GTA in Unreal Engine 5" tutorial series — [wanted level](https://forums.unrealengine.com/t/community-tutorial-unreal-engine-5-gta-6-tutorial-series-27-wanted-level/1851010),
  [police chasing](https://forums.unrealengine.com/t/community-tutorial-unreal-engine-5-gta-6-tutorial-series-24-police-ai-chasing/1773020).
  Videos in Blueprint. **Use:** ideas only; we write it in C++.

### Vehicles (U3)
- **Vehicle template** already in `unreal/NeonTorino` (Chaos Vehicles, C++): sports car and off-road car with
  their wheels. **Use:** start every vehicle type from it, with numbers from the browser game's `VEHICLES`.

### City from real data (U2, U6)
- **Our pipeline** (`tools/build_map.py`, `tools/export_gltf.mjs`, `unreal/scripts/`) does more than the public
  OpenStreetMap importers (real Arpa heights, courtyards, landmarks, tests): keep it.
- [StreetMap](https://github.com/MikeFricker/StreetMap) (MIT) and [UnrealOSM](https://github.com/ln-12/UnrealOSM)
  (GPL-3.0) — older Unreal 4 OpenStreetMap importers. **Use:** StreetMap's OSM parsing can be read for ideas; do not
  add either as a plugin.
- **PCG** (Procedural Content Generation, built into Unreal 5) — to place trees, lamps and street furniture from our
  data export. Epic's documentation and the City Sample show how.
- [Landscape Combinator](https://forums.unrealengine.com/t/plugin-landscape-combinator-a-plugin-to-create-real-world-landscapes-free-for-personal-use/772305)
  — real terrain in Unreal; possible help for Superga and the hill (U6). Free for personal use only: check the
  licence before using it.

### Game structure, UI, saving (U4)
- **Lyra** (Epic, free sample game in C++) — reference for menus, settings, input, game features and saving.
  **Use:** study and adapt pieces; it is too big to use as our base.

## Adding a reference

Found something useful? Add it under its area with: what it is good for, licence, how we may use it, date checked.
