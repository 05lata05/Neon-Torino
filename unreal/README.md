# Neon Torino in Unreal Engine

The game, made with Unreal Engine 5.8 for PC (Windows). Game logic in C++, the city generated from real data.
- `NeonTorino/`: the C++ project (Vehicle template, C++). Level `Content/Maps/SantaRita` (World Partition, one file
  per actor) with the city in `Content/SantaRita`, vehicle GameMode and Player Start at `0, 0, 100`.
- `import/santa_rita.glb`: Santa Rita as a 3D file (roads, sidewalks, parks, water, pitches, buildings with their
  real footprints, courtyards and heights, the landmarks). Generated from `data/torino.json` by
  `tools/export_gltf.mjs` (`npm run unreal`): never edit it by hand, regenerate it when the map data changes.
- `scripts/build_level.py`: editor script that rebuilds the city in the SantaRita level in one go (steps 4–6 below):
  imports the .glb, sets collision, places one actor per mesh, sets the game mode and the Player Start, saves.
  Tried in Unreal Engine 5.8. When the .glb has not changed it changes no file, so Git sees nothing to commit.
- `scripts/setup_collision.py`: editor script that gives the imported meshes their collision.
- `scripts/facade_materials.py`: procedural facade materials (`/Game/NeonTorino/Facades`): the master `M_Facade`
  draws a window per bay and per floor from the facade UVs (frame, sill, roller shutter, floor line; shop windows or
  a garage door on the ground floor), one instance `MI_Facade_*` per facade type. `build_level.py` runs it and puts
  the instances on the facade slots of the city meshes. Change the look by editing the `TYPES` table and running
  `build_level.py` again. Tried in Unreal Engine 5.8.
- `scripts/import_art.py`: editor script that imports the art track's Blender exports (`art/exports/<Category>/SM_*.fbx`
  and `art/textures/<Set>/T_<Set>_<Map>.png`) into `/Game/Art/` with fixed settings: scale 1, axes converted,
  collision from the `UCX_` meshes, normal maps with the green channel flipped, ORM as linear masks, one material
  instance `MI_<Set>` per texture set from the master `/Game/Art/Materials/M_ArtPBR`, put on the matching mesh
  slots. The Output Log lists the names that break `art/ASSETS.md` and the size in metres of every mesh. Run it after
  `git lfs pull`; it re-imports only the files that changed. The name rules are in `scripts/art_contract.py`
  (tested by `tests/test_art_contract.py`). Written without Unreal: not tried in the editor yet (box ⇄ A0).

Roofs: the OpenStreetMap roof shapes (gabled, hipped, pyramidal, skillion) where mapped, gabled roofs on small
untagged houses, flat elsewhere; the rules and what is invented are at the top of `tools/roofs.mjs`.

Facades: one material per facade type, so each can get its own texture: `Facade_Block_*` (1950s–70s apartment
blocks: ochre, yellow, cream, grey plaster and brick), `Facade_Historic_*` (older low houses), `Facade_Industrial`,
`Facade_Commercial`, `Facade_Public`, `Facade_Church`, `Facade_Garage`. The type comes from the OSM building tag or
the Arpa Piemonte use; the rules and what is guessed are at the top of `tools/facades.mjs`. Facade UVs count
**window bays and floors**: one texture tile = one bay (about 3 m, a whole number per wall) × one floor; V goes from
0 to 1 on the ground floor (4 m on apartment blocks), then +1 per floor, so a facade texture lines up with the floors.

Units: metres in the file, converted by Unreal to centimetres. The origin (0, 0, 0) is on the street next to
piazza Santa Rita, where the browser game starts. Meshes are split in 250 m tiles, one material per surface type
(asphalt, sidewalk, grass, facades…); UVs are in metres ready for real textures, except the facades (above).

## Gameplay data for traffic, transit and street furniture

`npm run unreal` also writes `import/santa_rita_data.json`. All positions are ground-plane
`[east, south]` metres relative to the **same origin as the GLB**, recorded in `coordinates.originMapMetres`.
For a point `[e, s]`, the matching glTF point is `[e, 0, s]`. Apply the same axis and unit conversion
as the city import when placing it in Unreal.

- `roadGraph.nodes` stores positions. Each directed edge `[from, to, street]` indexes the two nodes
  and one entry in `roadGraph.streets`. Follow edges in the listed direction. Two-way segments have two edges.
  Shared mapped vertices connect streets. A crossing drawn without a shared vertex creates no junction.
- Street records retain the map class and name, total mapped lane count (`null` if unknown), and the original
  one-way flag (`1` forward, `-1` reverse, `0` both). Pedestrian-only ways are excluded from the vehicle graph.
  `maxSpeedKmh` is the numeric OpenStreetMap `maxspeed` in km/h for the whole way. It is `null` when a
  supported numeric value is unavailable. Directional, conditional and symbolic limits are outside this export.
  Lane-by-lane movements and turn restrictions are outside the source data.
- `tramTracks` contains track polylines. `tramLines` keeps each route variant with its line number and ordered points.
  `tramStops` and `busStops` keep the source names and positions, including separate platforms with the same name.
- `streetFurniture` contains `trees`, `streetLamps`, `benches` and `wasteBins`. Each entry has an
  `osmNodeId` string and a `position` in the same local metres as the stops, rounded to the map's 0.5 m resolution.
  Only individually mapped nodes inside the playable bounds are included. Tree rows and unmapped objects produce no points.
  Use the existing stop arrays for GTT stops. This export provides positions for a future placement pass.

- `shopSigns` contains named shops and venues as visual references for signs. Each entry contains the original
  `name`, the OSM `category` (for example `shop=bakery`), an `osmId` with an `n`, `w` or `r` prefix,
  `level` (0 if ground floor is tagged, otherwise `null`), and its local `position`.
  A point is the mapped location or a marker derived from the mapped outline. Confirm the floor, storefront and
  orientation in the editor before placing a sign. The data is for scenery, as described in [the realism standard](../docs/REALISM.md).
  To refresh `data/santa_rita_shop_signs.json` from the map tiles, run `npm run map`, then `npm run unreal`.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.

## Playing

Double-click `play.bat` at the repository root: it pulls the latest changes (Git and Git LFS), builds the C++ module
if it changed and starts the game in a window (`UnrealEditor.exe … -game`), without opening the editor.

## Opening the project (Unreal Engine 5.8)

Needs Visual Studio 2022 with the "Game development with C++" workload, Git LFS (`git lfs install` before cloning,
or `git lfs pull` after) and Unreal Engine 5.8. Double-click `NeonTorino/NeonTorino.uproject`; the first time Unreal
asks to build the `NeonTorino` module: answer yes (a few minutes), then it opens the SantaRita level.
Alt+P (or the ▶ button) to play: WASD to drive, mouse to look around, Esc to stop.

## How the level was built

For reference and to rebuild it by hand. Steps 4–6 are done by `scripts/build_level.py`: after `npm run unreal`,
open the project, Tools → **Execute Python Script…** → `unreal/scripts/build_level.py`. It can be run again
whenever the map data changes: it replaces the city actors, it does not duplicate them.

1. **Project.** Unreal Engine 5.8 → **Games** → **Vehicle** template → **C++**, target **Desktop**, quality
   **Maximum**, no Starter Content, location this `unreal/` folder, name `NeonTorino`.
2. **Python.** The "Python Editor Script Plugin" and "Editor Scripting Utilities" are enabled in `NeonTorino.uproject`.
3. **Level.** An empty World Partition level `Content/Maps/SantaRita` (one file per actor) with Directional Light
   (atmosphere sun), Sky Atmosphere, Sky Light (real-time capture), Exponential Height Fog and Volumetric Cloud.
   It is the editor and game default map (`Config/DefaultEngine.ini`).
4. **Import.** `unreal/import/santa_rita.glb` imported into `/Game/SantaRita` with the default options; one Static
   Mesh Actor per mesh at the origin (the glTF vertices are already in world space), in the outliner folder
   `SantaRita`. The city is about 2 km wide: press F on the selection to frame it.
5. **Collision.** Tools → **Execute Python Script…** → `unreal/scripts/setup_collision.py`. The Output Log says how
   many meshes were set. If it fails: select the meshes in the Content Browser → right click → Asset Actions →
   Bulk Edit via Property Matrix → Collision Complexity = "Use Complex Collision As Simple".
6. **The car.** World Settings → **GameMode Override** → `VehicleTemplate/Blueprints/BP_VehicleAdvGameMode`.
   **Player Start** at `0, 0, 100`.

## What is real and what is not

Real (OpenStreetMap, Arpa Piemonte): positions and shapes of roads, buildings, courtyards, parks, water, pitches,
building heights, landmark shapes. Invented: 3 m sidewalks along every road, the stadium stands as one 28 m block,
levels of the 94 buildings without data, the period and colour of the facades, the shapes of the Parco Rignon trees. Flat roofs everywhere.

## Working with Git

- Unreal assets (`.uasset`, `.umap`) are binary: they go through **Git LFS** (`.gitattributes` at the repository
  root). Install it once with `git lfs install`. Two people cannot merge changes to the same asset: agree on who
  edits which level or asset.
- `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` are rebuilt by the editor and are not committed.
- Prefer things generated from data and scripts (text) over hand-placed assets: they merge, and they update when
  the map data improves.
