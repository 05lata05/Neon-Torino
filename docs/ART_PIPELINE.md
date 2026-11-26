# Art pipeline: from Blender to Neon Torino

How to make an asset that looks real and goes into the game without rework. Read once fully; afterwards the
checklist at the end is enough.

## 0. Principles

1. **Real first.** Every asset starts from the real object in Santa Rita: photos you take on site (front, sides,
   details, a known object for scale) or Mapillary, plus real measurements (`art/ASSETS.md` gives the ones we know).
2. **Effort where the player looks.** The player mostly drives at 30–50 km/h. A bin seen for half a second needs a
   good silhouette and a good material, not bolts. The tram, the shop fronts at street level and the facades are
   seen up close: they deserve detail. `art/ASSETS.md` gives a detail level for each asset.
3. **Materials before models.** Photographic materials on simple shapes beat detailed shapes with flat colours.
4. **Reuse.** One asset is placed hundreds of times by the code. Make it modular (kits) and let the code vary it.
5. **One asset end-to-end before many.** Finish, export, import and see one asset in game before starting the next.

## 1. Blender setup (once)

- Blender 4.2 LTS or newer.
- Scene → Units: **Metric**, Unit Scale **1.0**, Length **Meters**. Model at real size: a 28 m tram is 28 m.
- Axes: Blender is Z up. **The front of an asset faces Blender's −Y** (the "Front" view looks at it), unless
  `art/ASSETS.md` says otherwise. Milestone A0 checks that this front arrives as Unreal's +X with the export settings
  below; if it does not, this page is corrected once for everybody.
- Useful built-in/free add-ons: **Node Wrangler** (textures in one click), **Geometry Nodes** (variations of windows,
  balconies, railings), **Sapling Tree Gen** or a free tree generator, **TexTools** or the built-in UV tools.

## 2. Folders and names

```
art/
  ASSETS.md                 the contract: every asset, its size, pivot, parts, status
  refs/<Asset>/             reference photos (small JPEGs, max ~1600 px)
  source/<Asset>.blend      the Blender file (one per asset or kit)
  textures/<Asset>/         T_<Asset>_BaseColor.png, _Normal.png, _ORM.png (Occlusion, Roughness, Metallic)
  exports/<Category>/       SM_<Asset>.fbx (what Unreal imports)
```

- Meshes `SM_`, collision meshes `UCX_SM_<Asset>_01`, materials `M_<Name>`, textures `T_<Asset>_<Map>`.
- Names in English, CamelCase, no spaces: `SM_GTT8000_Module1`, `SM_Lamp_Turin_A`, `M_Plaster_Ochre`.
- Real Italian names stay as they are only in text the player reads (signs), never in file names.

## 3. Making an asset: the steps

1. **References** → `art/refs/<Asset>/`. Note the measurements (count tiles, doors, steps; a door is about 2.1 m).
2. **Blockout** at real size: simple boxes for the main volumes, pivot as in the contract. Export it (step 8) and
   ask the code side to try it in game: proportions are judged in game, not in Blender.
3. **Model** the silhouette and the details the player sees. Bevel edges that catch light (a 1–2 cm bevel makes
   boxes look real). Static meshes can be dense (Unreal's Nanite handles them), but keep to the budget in the
   contract; no hidden faces inside.
4. **UVs**: unwrap with a consistent **texel density** (about 512 px per metre for props, 1024 for the tram and
   facades at street level). Tileable materials on big surfaces (walls, roofs, roads) use world-scale UVs:
   1 UV unit = 1 metre, so the code's procedural UVs and yours match.
5. **Materials**: start from CC0 photographic materials (ambientCG, Poly Haven), adjust colour to your photos.
   For repeated details (window frames, railings, shutters) use a **trim sheet**: one texture strip shared by many
   pieces. Keep materials few (1–3 per asset).
6. **Textures**: 2048×2048 by default (1024 for small props, 4096 only for the tram livery if needed). PNG,
   BaseColor in sRGB; Normal (OpenGL in Blender, Unreal converts on import with "flip green" — the import script
   does it), ORM packed (R occlusion, G roughness, B metallic).
7. **Collision**: for things the car can hit, add simple `UCX_` boxes around the main volumes (not the visual mesh).
   Trees: a cylinder for the trunk only. Tram: one box per module.
8. **Export** (File → Export → FBX), select only the asset's objects:
   - Include: Selected Objects; Object Types: Mesh (and Empty for sockets)
   - Transform: Scale 1.00, **Apply Scalings: FBX Units Scale**, Forward **−Y Forward**, Up **Z Up**,
     Apply Unit on, Use Space Transform on
   - Geometry: Smoothing **Face**, Apply Modifiers on, Tangent Space on
   - Armature: Add Leaf Bones **off** (for animated assets later)
   - Path: `art/exports/<Category>/SM_<Asset>.fbx`
   Save these as an operator preset called **Neon Torino** and always use it.
9. **Check** with the list below, commit the `.blend`, textures and export in a pull request with a screenshot.
   The code side runs the import script and replies with an in-game screenshot.

## 4. Kits (facades and street furniture)

The facades of Santa Rita's 1950s–70s blocks repeat a few elements: ground-floor shop front, entrance door, window
with roller shutter, French window with balcony slab and railing, corner pieces, cornice. Build them as a **kit**:
each piece on a fixed grid (one floor 3.0 m tall, bays 1.5 / 3.0 / 4.5 m wide, wall plane at y = 0), pivot at the
bottom-left of the piece, same trim sheet for all. The code assembles them on the real building footprints and
floors. Variety comes from combining pieces and colours, not from modelling more buildings.

## 5. Where to save time

- **Photogrammetry** for small real objects (a bench, a bollard, a piece of facade): Epic's RealityScan (free, on the
  phone) gives a textured mesh; clean and decimate it in Blender, then treat it as a normal asset.
- **Free assets** with a clear licence (CC0, or Fab's standard licence) for generic things (grass, gravel, car
  interiors): record each one in `docs/CREDITS.md`. Never use assets without a licence or ripped from other games.
- **Geometry Nodes** for anything with repetition (railings, shutters, rows of windows): change one parameter
  instead of remodelling.
- Do not model what the code generates: roads, sidewalks, building volumes, roof shapes, tram rails.

## 6. Checklist for every asset

- [ ] Reference photos in `art/refs/<Asset>/`, measurements noted in `art/ASSETS.md`
- [ ] Real scale (check with a 1.8 m human box next to it), pivot and front as in the contract
- [ ] Transforms applied (Ctrl+A → All Transforms), no negative scale, normals facing out
- [ ] Triangles within the budget in the contract
- [ ] UVs with the right texel density, no overlaps (except mirrored/tiling on purpose)
- [ ] 1–3 materials, textures named `T_<Asset>_<Map>`, 2K by default
- [ ] `UCX_` collision if the car can hit it
- [ ] Exported with the **Neon Torino** preset to `art/exports/<Category>/`
- [ ] Pull request with a Blender screenshot; status updated in `art/ASSETS.md`
