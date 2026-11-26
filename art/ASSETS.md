# Asset contract

What the code expects from every model. The code builds against this table with placeholder boxes; a model that
respects it replaces the placeholder without code changes. Change a row only in a pull request (see `docs/TEAM.md`).

Conventions (details in `docs/ART_PIPELINE.md`): metres, real size; **pivot** as written; **front** = the side
that faces Unreal's +X (Blender's −Y with the Neon Torino export preset, to be confirmed by A0).
Detail: **S** seen from a moving car (silhouette + material), **M** seen on foot, **L** seen up close (hero).
Status: `placeholder` (code boxes) → `blockout` → `model` → `in game`.

## Pipeline test (A0)

| Asset | Size (m) | Pivot / front | Budget | Detail | Status | Used by |
|---|---|---|---|---|---|---|
| `SM_Calibration_Arrow` | 1 × 1 × 2, arrow pointing front, letter "F" on the front, "R" on the right | base centre / arrow tip | 1k tris | S | — | import test |

## Materials (A1) — tileable, world-scale UVs (1 UV = 1 m)

| Material | What | Where in game | Status |
|---|---|---|---|
| `M_Plaster_Ochre`, `M_Plaster_Yellow`, `M_Plaster_Cream`, `M_Plaster_Grey`, `M_Plaster_White` | painted plaster, slightly dirty at the base | facades (exporter materials `Facade_*`) | placeholder |
| `M_Brick_Turin` | exposed brick | facades `Facade_Brick`, industrial buildings | placeholder |
| `M_RoofTiles_Coppi` | curved clay tiles | pitched roofs `Roof_Tiles` | placeholder |
| `M_Roof_Flat` | bitumen / gravel flat roof | flat roofs `Roof` | placeholder |
| `M_Asphalt_City`, `M_Asphalt_Sidewalk` | road and sidewalk asphalt with patches | `Asphalt`, `Sidewalk` | placeholder |
| `M_Porphyry_Cobbles` | porphyry setts (tram stops, squares) | `Path`, squares | placeholder |
| `M_Luserna_Stone` | Luserna stone kerbs and slabs | kerbs, bases | placeholder |
| `M_Grass_Park`, `M_Gravel_Park` | park lawn, park paths | `Grass`, `Path` | placeholder |
| `M_Concrete_Stadium` | weathered concrete | stadium, `Concrete` | placeholder |

## Street furniture (A2) — placed by `City/CityProps` from OpenStreetMap

| Asset | Size (m) | Pivot / front | Budget | Detail | Status | Count in game |
|---|---|---|---|---|---|---|
| `SM_Tree_Tilia_A`, `_B` (lime) | ~10 tall (code scales 0.7–1.2) | base of the trunk | 20k tris + leaf cards | S | placeholder | 666 (species from OSM `genus` when mapped) |
| `SM_Tree_Platanus_A` (plane tree) | ~14 tall | base of the trunk | 20k | S | placeholder | boulevards |
| `SM_Lamp_Turin_A` | pole 7.0, arm 1.3 towards front | base of the pole / arm side | 3k | S | placeholder | 34 |
| `SM_Bench_Turin` | 1.8 long, 0.5 deep, seat 0.45 high | centre of the base / seat side | 2k | M | placeholder | 256 |
| `SM_Bin_Street` | Ø 0.5, 0.9 tall | base centre / opening side | 1k | S | placeholder | 52 |
| `SM_GTT_StopPole` | 2.8 tall, sign 0.5 × 0.35 | base / sign face | 1.5k | M | placeholder | 120 |
| `SM_GTT_TramShelter` | 4.0 wide, 1.6 deep, 2.6 tall | centre of the base / open side | 6k | M | placeholder | 31 |

## GTT tram — Hitachi series 8000 (A3) — `Transit/GttTram`

Real: 28 m, 2.40 wide, 3.48 tall, five modules on three bogies, single-ended, two double doors (1.30 m) on the
**right side** of each suspended module, yellow and blue livery (design Giugiaro). One mesh per module:

| Asset | Length (m) | Pivot / front | Budget | Detail | Status |
|---|---|---|---|---|---|
| `SM_GTT8000_Module0` (cab, on bogie) | 7.0 | centre of the module at rail-top height / cab end | 60k | L | placeholder |
| `SM_GTT8000_Module1` (suspended, 2 doors) | 4.4 | same | 30k | L | placeholder |
| `SM_GTT8000_Module2` (on bogie, pantograph) | 5.6 | same | 40k | L | placeholder |
| `SM_GTT8000_Module3` (suspended, 2 doors) | 4.4 | same | 30k | L | placeholder |
| `SM_GTT8000_Module4` (rear, lounge, on bogie) | 6.2 | same | 50k | L | placeholder |

Doors as separate objects named `SM_GTT8000_DoorLeaf` (one leaf, 0.65 × 2.1 m, pivot at its hinge side) so the code
can open them later. The line-number display is a flat face named `Display` with its own material slot.

## Facade kit (A4) — 1950s–70s blocks of Santa Rita

Grid: floor height 3.0 m (ground floor 4.0 m), bay widths 1.5 / 3.0 / 4.5 m, wall plane at y = 0, pivot at the
bottom-left corner, front = street side. One trim sheet for all pieces.

| Asset | Bay (m) | Budget | Detail | Status |
|---|---|---|---|---|
| `SM_Facade_Window_Shutter` (window + roller shutter, half down) | 1.5 | 2k | M | placeholder (procedural material today) |
| `SM_Facade_FrenchWindow_Balcony` (door + slab + railing) | 3.0 | 5k | M | placeholder |
| `SM_Facade_Ground_Shop` (shop front with sign band 0.6 m) | 4.5 | 4k | L | placeholder |
| `SM_Facade_Ground_Entrance` (building entrance) | 3.0 | 3k | L | placeholder |
| `SM_Facade_Blank`, `SM_Facade_Corner`, `SM_Facade_Cornice` | 1.5 / – / per metre | 0.5k | S | placeholder |

## Landmarks (A5)

| Asset | Based on | Detail | Status |
|---|---|---|---|
| `SM_Santuario_SantaRita` | OSM footprint (exported for the artist to `art/refs/Santuario/`), photos | L | placeholder (generated volume) |
| `SM_Stadio_Grande_Torino_Details` (stands, roof, Maratona tower) | OSM shapes, photos | M | generated volumes |

## Vehicles and people (A6)

Cars of typical Italian city shapes **without real brands or logos**; pedestrians via MetaHuman (code track) or
simple low-poly people. Rows added when the milestone starts.
