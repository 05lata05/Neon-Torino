# How the work is split: code and art

Two people, two tracks that move in parallel:

| | **Code track** | **Art track** |
|---|---|---|
| Who | the owner (with Claude Code, locally and in the nightly session) | the friend with Blender |
| Tools | Unreal Engine 5.8, C++, Python editor scripts, the data tools in `tools/` | Blender, photo references, CC0 texture libraries (Unreal not required) |
| Roadmap | [`ROADMAP.md`](../ROADMAP.md) (milestones U0–U6) | [`ROADMAP-ART.md`](../ROADMAP-ART.md) (milestones A0–A6) |
| Folders | `unreal/NeonTorino/Source/`, `unreal/scripts/`, `tools/`, `data/`, `unreal/import/` | `art/` (Blender sources, textures, exports) |
| Delivers | systems that place things and make them work (trams, traffic, props, signs, facades) | the models and materials those systems show |

The two meet in one place: the **asset contract** ([`art/ASSETS.md`](../art/ASSETS.md)). For every asset it fixes
the name, the real size, the pivot, the parts and the materials. The code track builds against the contract with
placeholder boxes; the art track delivers a model that respects it; when the model arrives the code swaps it in
without changes. Neither track waits for the other.

## Feasibility: does this split make sense?

Checked before adopting it (November 2026).

**Why it is efficient**
- **Almost no overlap.** Code lives in `Source/`, `scripts/`, `tools/`; art lives in `art/`. Different files means
  no merge conflicts, and each person owns their binary files (`.blend`, textures) so Git LFS's "cannot merge" limit
  never bites.
- **The city is generated from data.** The artist never places buildings, trees or lamps by hand: the code places
  the 1827 buildings, 666 trees, 417 signs and hundreds of props from OpenStreetMap. One good model of a tree, a lamp
  or a balcony is reused hundreds or thousands of times: every hour in Blender has a large effect on screen.
- **Placeholders already exist.** Trams, trees, lamps, benches, bins, stops and signs are on screen today as boxes
  (`Transit/`, `City/CityProps`). Swapping them for real meshes is a small, known step for each.
- **The artist does not need Unreal.** Exports go to `art/exports/`; an editor script on the code side imports them
  with fixed settings. Blender runs well on modest PCs.
- **Claude helps both.** The code track is mostly C++ and scripts; for the art track Claude can write Blender Python
  tools (export, checks, generators), but it cannot model or look at the result: the artist does that.

**Risks and how they are handled**

| Risk | Mitigation |
|---|---|
| Waiting on each other | the contract first, placeholders always; sync points at the end of each pair of milestones, not before |
| Wrong scale, orientation or pivot on import | milestone A0 starts with a calibration asset checked in Unreal; fixed export settings in `docs/ART_PIPELINE.md` |
| Too much detail for too little effect | a detail budget per asset (how close the player sees it from a car at 30–50 km/h); the art roadmap is ordered by visual impact per hour |
| Git LFS space (`.blend` and textures are big) | 2K textures by default, CC0 libraries instead of hand-painted maps, one `.blend` per asset, nothing exported twice |
| Realism drifting into "generic Europe" | every asset starts from photos of the real thing in Santa Rita (taken on site or from Mapillary) and real measurements |
| Legal: real brands and people | no real logos or trademarks on shops, cars or signs beyond the names already in OpenStreetMap; no real people (see `docs/REALISM.md`) |

**Verdict: yes.** The split is efficient as long as the contract comes first and every asset follows the same
export pipeline. The first art milestone (A0) proves the pipeline on one small asset before any big model is made.

## Rhythm

- **Weekly:** each person picks the next box of their own roadmap. A box in the art roadmap is claimed the same way
  as a code box: a draft pull request (see `CONTRIBUTING.md`).
- **Sync points** (`⇄` in both roadmaps): when an art milestone delivers, the matching code box imports and
  integrates it. Try the result together (play.bat) and adjust the contract if needed.
- **Contract changes** go through `art/ASSETS.md` in a pull request: never change a size or a pivot silently.

## Who reviews what

- Art pull requests: the owner tries them in game (import script + play) before merging.
- Code pull requests that change how an asset is used: the artist checks the screenshot in the pull request.
