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

It helps to split the work by area, because areas are different folders and conflicts become rare:
- driving, traffic and police: the C++ in `unreal/NeonTorino/Source/`
- city and realism: `tools/` (data and exporter), `unreal/scripts/`, the city materials
- interface, missions and money: their own C++ classes and the UI assets

Unreal assets (`.uasset`, `.umap`) cannot be merged: before changing a shared one (a level, a material), say so in
your draft pull request or lock it (`git lfs lock <file>`), and unlock it after merging.

You need: Unreal Engine 5.8 (Epic Games Launcher), Visual Studio 2022 with "Game development with C++", Git with
Git LFS (`git lfs install` once) or GitHub Desktop, and Node.js for `npm test` and the exporter.

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
