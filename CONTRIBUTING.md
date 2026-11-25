# Contributing to Neon Torino

A small team (2–3 friends plus a nightly Claude session) working on the same game. The rules are few and
exist so that nobody breaks the game for everyone else and two people never do the same thing.

## The branches

- **`main`** is always a working game: it is what gets published as the link to play. Nobody pushes to it
  directly; everything goes in through a pull request with a green test.
- **One short branch per piece of work**, created from an up-to-date `main`:
  - `feature/<name>` for something new (e.g. `feature/touch-controls`)
  - `fix/<name>` for a bug (e.g. `fix/police-stuck`)
  - `auto/<name>` is reserved for the nightly Claude session
- Keep branches short (a few days). The longer a branch lives, the more it diverges from the others.

## Who does what

The plan is `ROADMAP.md`: pick **the first free box** of the current milestone (or another one you like).

**A box is taken when it has an open pull request.** So the first thing you do when you start is open a
**draft** pull request whose title is the box text. Everybody (and the nightly session) sees it and leaves
that box alone. If you give up, close the draft so the box is free again.

## Roles: who can do what

Not everybody needs Unreal Engine. Pick the role that fits your PC and your interests; every roadmap box says
which role it needs with a marker at the end.

| Role | Roadmap marker | What you do | What you need |
|---|---|---|---|
| **Unreal developer** | `(local)` | Game logic in C++ (driving, traffic, police, missions, money), levels, lights, materials, effects; tries the scripts and C++ written in the cloud | Windows PC with a recent graphics card (RTX 3060/4060 or similar), 16–32 GB RAM, ~150 GB free; Unreal Engine 5.8, Visual Studio 2022 with "Game development with C++", Git LFS |
| **Data and city** | no marker | The tools in `tools/` that turn real data into the city: roofs, facades, trees, shop signs, new Turin zones, the exporter to Unreal | Any PC or Mac with Python 3 and Node.js |
| **Mapper** | `(osm)` | Completes and corrects OpenStreetMap in the game area on openstreetmap.org (building levels, roof shapes, shops, trees, street furniture): the game takes everything from there | A browser and a free OpenStreetMap account; knowing the district |
| **3D artist** | `(blender)` | Models in Blender what the data cannot describe: the Santuario, trams, cars, street lamps, landmark details, always on the real OSM footprint | Blender (free), any decent PC or Mac |
| **Tester** | `(manual)` | Plays the Windows builds from the GitHub Releases, reports bugs and ideas as GitHub issues | A Windows gaming PC |
| **Nightly Claude session** | no marker | One data or tooling box per night (it cannot run Unreal or Blender, and never edits OpenStreetMap) | — |

`(manual)` boxes are decided or done by the owner. `(needs review)` can be added to any role: it changes how the
game looks, so the owner does the merge.

In a group of 2–3, a natural split: whoever has the strongest PC is the Unreal developer, the others take data,
mapping and Blender, and everybody tests the builds. Roles are not fixed: change whenever you like.

Areas are different folders, so working in parallel rarely conflicts:
- driving, traffic and police: the C++ in `unreal/NeonTorino/Source/`
- city and realism: `tools/` (data and exporter), `unreal/scripts/`, the city materials
- interface, missions and money: their own C++ classes and the UI assets
- models: `unreal/NeonTorino/Content/Models/` (one person per model)

Unreal assets (`.uasset`, `.umap`) cannot be merged: before changing a shared one (a level, a material), say so in
your draft pull request or lock it (`git lfs lock <file>`), and unlock it after merging.

Everybody uses Git (GitHub Desktop is the simplest) and follows the same flow below. Contributions on
openstreetmap.org follow OpenStreetMap's own rules (map only what really exists; no copying from Google Maps):
then run `python3 tools/fetch_osm.py --force && python3 tools/build_map.py && npm run unreal` (or ask for a data box)
to bring the changes into the game.

Before writing something big (traffic, pedestrians, police, menus), look at [`docs/REFERENCES.md`](docs/REFERENCES.md):
existing code that can help, and what each licence lets us do with it.

## Step by step

```bash
git checkout main && git pull                 # start from the latest main
git checkout -b feature/my-thing              # your branch
git commit --allow-empty -m "Start: <box text>" && git push -u origin feature/my-thing
```

Then open a **draft** pull request on GitHub titled like the box (this claims it). Work, commit and push as often
as you like. When you are done:

```bash
npm run format                                # formatting (Prettier)
npm test                                      # browser game and exporter checks
```

For Unreal changes, play the level in the editor (▶) before delivering. Look at the pictures in `tests/out/`, tick the box in `ROADMAP.md` on your branch, mark the pull request
**Ready for review** and, once the GitHub test is green, **Squash and merge** it. No approval is needed: we trust
each other, the test is the gatekeeper. Ask a friend to have a look anyway when you change how the game looks.

If `main` moved meanwhile and GitHub reports a conflict: `git pull origin main` on your branch, fix the
conflicting files, commit, push.

## Rules of the project

Everything is in [`CLAUDE.md`](CLAUDE.md) (it is short, and Claude Code reads it too), in particular:
- code, comments, docs, commits and pull requests in English; player-facing text in Italian **and** English
  through `src/i18n/strings.js`;
- new modules follow [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
- new or changed zones follow [`docs/REALISM.md`](docs/REALISM.md);
- balance numbers only in `src/config.js`.

## The nightly session

Every night a Claude session does one box by itself (rules in [`docs/AUTOMATION.md`](docs/AUTOMATION.md)).
It skips boxes that have an open pull request, boxes marked `(manual)`, and does not work while one of its own
`auto/` pull requests is still open. Boxes marked `(needs review)` wait for the owner before being merged.

## Using Claude Code

Claude Code works well on this project: open it in the repository and ask for a roadmap box, it will follow
`CLAUDE.md`. Remember to claim the box with a draft pull request first.
