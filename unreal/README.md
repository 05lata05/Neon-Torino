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

Units: metres in the file, converted by Unreal to centimetres. The origin (0, 0, 0) is on the street next to
piazza Santa Rita, where the browser game starts. Meshes are split in 250 m tiles, one material per surface type
(asphalt, sidewalk, grass, facades…), with UVs in metres ready for real textures.

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
levels of the 94 buildings without data, facade colours, the shapes of the Parco Rignon trees. Flat roofs everywhere.

## Working with Git

- Unreal assets (`.uasset`, `.umap`) are binary: they go through **Git LFS** (`.gitattributes` at the repository
  root). Install it once with `git lfs install`. Two people cannot merge changes to the same asset: agree on who
  edits which level or asset.
- `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` are rebuilt by the editor and are not committed.
- Prefer things generated from data and scripts (text) over hand-placed assets: they merge, and they update when
  the map data improves.
