# Art for Neon Torino

Everything made in Blender lives here. Start with:
1. [`../docs/TEAM.md`](../docs/TEAM.md): how the work is split between code and art (5 minutes).
2. [`../ROADMAP-ART.md`](../ROADMAP-ART.md): what to make, in which order. Take the first free box.
3. [`../docs/ART_PIPELINE.md`](../docs/ART_PIPELINE.md): how to make an asset, step by step, and the export settings.
4. [`ASSETS.md`](ASSETS.md): the contract for every asset (name, real size, pivot, budget).

```
refs/<Asset>/        reference photos (small JPEGs)
source/<Asset>.blend Blender files, one per asset or kit
textures/<Asset>/    T_<Asset>_BaseColor / _Normal / _ORM .png
exports/<Category>/  SM_<Asset>.fbx: what the game imports
```

Binary files (`.blend`, `.fbx`, textures) go through Git LFS: run `git lfs install` once (GitHub Desktop asks for it).
You do not need Unreal: the code track imports `exports/` and replies with an in-game screenshot.
