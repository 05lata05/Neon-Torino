# Neon Torino in Unreal Engine (prototype)

A test to see whether Unreal Engine's graphics are worth moving the game. The browser game goes on as before;
this folder only holds what the Unreal version needs.

- `import/santa_rita.glb`: Santa Rita as a 3D file (roads, sidewalks, parks, water, pitches, buildings with their
  real footprints, courtyards and heights, the landmarks). Generated from `data/torino.json` by
  `tools/export_gltf.mjs` (`npm run unreal`): never edit it by hand, regenerate it when the map data changes.
- `scripts/setup_collision.py`: editor script that gives the imported meshes their collision.

Units: metres in the file, converted by Unreal to centimetres. The origin (0, 0, 0) is on the street next to
piazza Santa Rita, where the browser game starts. Meshes are split in 250 m tiles, one material per surface type
(asphalt, sidewalk, grass, facades…), with UVs in metres ready for real textures.

## First run (Unreal Engine 5.8)

1. **Project.** In the Epic Games Launcher start Unreal Engine 5.8 → **Games** → **Vehicle** template →
   **Blueprint**, target **Desktop**, quality **Maximum**, **Starter Content** on. Location: this `unreal/`
   folder of the repository (or any folder for a first look), name `NeonTorino`.
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
