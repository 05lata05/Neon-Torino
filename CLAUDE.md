# Neon Torino — notes for whoever works on it

- The game is made with **Unreal Engine 5.8** (PC, Windows) in `unreal/`; read `unreal/README.md`. The Three.js
  browser game (`src/`, `index.html`) is frozen: it stays playable and tested, but gets no new work unless asked.
- Language: code, comments, documentation, commit messages and pull requests in English. Player-facing text in
  Italian and English (Unreal localisation; in the browser game `src/i18n/strings.js`). Real Italian names stay
  Italian in both languages: shop signs, landmark lettering, street names, radio station names.
- The city is generated from data, never drawn by hand: OpenStreetMap and Arpa Piemonte → `tools/build_map.py` →
  `data/torino.json` → `tools/export_gltf.mjs` (`npm run unreal`) → `unreal/import/`. Generated files are never edited by hand.
- Units: data in metres, x = east, y = south; glTF in metres (x east, y up, z south); Unreal in centimetres, Z up.
- Game logic in C++ (`unreal/NeonTorino/Source/`): it is text, it merges in Git and Claude can write it. Blueprints
  only to wire things up. `.uasset`/`.umap` go through Git LFS and cannot be merged: one person per asset.
- Prefer data and scripts (exporter, editor Python scripts, PCG) to hand-placed assets.
- Before writing a system from scratch, check `docs/REFERENCES.md` for existing code (and what its licence allows);
  never copy code without a licence, record what you reuse in `docs/CREDITS.md`.
- Unreal does not run in the cloud: work that needs the editor is a `(local)` roadmap box. Scripts or C++ written
  without trying them in Unreal must say so in the pull request.
- Before delivering: `npm test` (browser game and exporter); for Unreal changes, play the level in the editor.
- Realism: every new or changed zone must follow `docs/REALISM.md` (sources, checklist, rules on real shops).
- Invented details (not in the data) must be declared in the comment at the top of the file that adds them.
- What to do: the first free box in `ROADMAP.md`; tick it when done.
- Two tracks (`docs/TEAM.md`): code (`ROADMAP.md`) and art in Blender (`ROADMAP-ART.md`, `art/`). Code that shows a
  model builds against the contract in `art/ASSETS.md` with placeholders and mesh slots; never edit files in `art/`
  unless the box asks for it (they belong to the artist).
- Teamwork (see `CONTRIBUTING.md`): one short branch per piece of work (`feature/<name>`, `fix/<name>`; `auto/` is the
  nightly session's), claim the box first with a draft pull request, merge into `main` only through a green pull request.
- A roadmap box with an open pull request is taken: do not work on it.
- After changes: `npm run format`.
