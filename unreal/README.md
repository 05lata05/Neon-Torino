# Neon Torino in Unreal Engine

The game, made with Unreal Engine 5.8 for PC (Windows). Game logic in C++, the city generated from real data.
The project goes in `unreal/NeonTorino/` (roadmap U1); until then this folder holds the city and the scripts.

- `import/santa_rita.glb`: Santa Rita as a 3D file (roads, sidewalks, parks, water, pitches, buildings with their
  real footprints, courtyards and heights, the landmarks). Generated from `data/torino.json` by
  `tools/export_gltf.mjs` (`npm run unreal`): never edit it by hand, regenerate it when the map data changes.
- `scripts/setup_collision.py`: editor script that gives the imported meshes their collision.

Units: metres in the file, converted by Unreal to centimetres. The origin (0, 0, 0) is on the street next to
piazza Santa Rita, where the browser game starts. Meshes are split in 250 m tiles, one material per surface type
(asphalt, sidewalk, grass, facades…), with UVs in metres ready for real textures.

## First run (Unreal Engine 5.8)

1. **Project.** Needs Visual Studio 2022 with the "Game development with C++" workload. In the Epic Games Launcher
   start Unreal Engine 5.8 → **Games** → **Vehicle** template → **C++**, target **Desktop**, quality **Maximum**,
   **Starter Content** off (it would bloat the repository). Location: this `unreal/` folder of your clone of the
   repository, name `NeonTorino`. (For a first look only, the Blueprint version and any folder are fine.)
2. **Python.** Edit → Plugins → search "Python Editor Script Plugin" → enabled (restart the editor if asked).
3. **Level.** File → New Level → **Basic** (sky, sun, fog, Lumen lighting) → save it as `Content/Maps/SantaRita`.
4. **Import.** File → **Import Into Level…** → `unreal/import/santa_rita.glb` → choose a folder such as
   `/Game/SantaRita` → keep the default options → Import. The city appears around the origin (it is about 2 km wide:
   press F on the selection to frame it).
5. **Collision.** Tools → **Execute Python Script…** → `unreal/scripts/setup_collision.py`. The Output Log says how
   many meshes were set. If it fails: select the meshes in the Content Browser → right click → Asset Actions →
   Bulk Edit via Property Matrix → Collision Complexity = "Use Complex Collision As Simple".
6. **The car.** Window → World Settings → **GameMode Override** → the template's vehicle GameMode
   (in the `VehicleTemplate` folder). Place Actors → Basic → **Player Start**, location `0, 0, 100`.
7. **Play.** Alt+P (or the ▶ button): WASD to drive, mouse to look around. Esc to stop.

Remove the floor that the Basic level brings, or move it below 0, if it covers the city.

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
