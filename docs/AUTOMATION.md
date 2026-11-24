# Automatic work

Every night a Claude cloud session starts by itself and follows these instructions.
The rules serve three purposes: **make progress every night**, **keep token use under control** and
**leave visual decisions to the owner**.

In short: one box per night; if the GitHub test is green the session merges by itself, except for boxes
marked `(needs review)` (graphics and new zones), which stay open until the owner approves them.
The game is made with Unreal Engine, which does not run in the cloud: the session works on what does not need it
(map data, the exporter in `tools/`, editor scripts, C++ that a `(local)` box will then try) and skips `(local)` boxes.
On Sundays the session also sends a summary of the week.

To pause: in `ROADMAP.md` write `Automatic work: PAUSED`.
To change what it does: reorder or edit the boxes in `ROADMAP.md`.

---

## Instructions for the automatic session

Follow the steps in order. If a step says to stop, end the session with a short final message explaining why.
Write everything in English: branches, commits, pull requests, the final message.

### 0. Environment notes
- The repository is already in the session's working folder (cloud environment "Neon-Torino"); if not, clone it.
- `gh auth status` may say the token is invalid: ignore it. `gh api repos/05lata05/Neon-Torino/...` works
  anyway, through the session proxy. Pull requests are opened with
  `gh api repos/05lata05/Neon-Torino/pulls -f title=... -f head=<branch> -f base=main -f body=...`.

### 1. Initial checks (minimum cost)
1. Read the `Automatic work:` line at the top of `ROADMAP.md`. If it does not say `ON`, **stop**: "Automatic work paused".
2. List the repository's open pull requests:
   `gh api "repos/05lata05/Neon-Torino/pulls?state=open&per_page=100" --jq '.[] | "\(.head.ref) | \(.title) | \(.html_url)"'`.
   If one of them comes from an `auto/` branch (yours, from a previous night), **do not work**: "A pull request is
   waiting for approval: <link>" (usually a `(needs review)` box or a `[NEEDS FIX]` one). Go straight to step 6
   (Sunday summary) and stop. Pull requests from other branches belong to the owner's friends: they do not stop you.
3. Go through the milestones in order (skip the "Browser game (frozen)" section) and take the **first unchecked
   box** that is free:
   - not marked `(manual)` or `(local)` (they need the owner or Unreal Engine on a PC);
   - not **taken**: a box is taken when an open pull request (draft or not, from any branch) has a title that
     matches the box or clearly refers to it. Leave taken boxes to whoever is working on them.
   If there is none, **stop**: "Nothing free in the roadmap: add new goals or wait for the open pull requests".

### 2. Sizing the work
- Do **only one box** per session.
- If the box is too big for one session (estimate above `(~1)`), do not do all of it: in `ROADMAP.md` split it into
  smaller sub-boxes and do **only the first**.
- Do no extra work the box does not ask for (no "while I'm here" rewrites). If you notice something else to do,
  add it at the bottom of `ROADMAP.md`, under "Ideas on hold".

### 3. Work
1. Prepare the environment: `npm install`.
2. Create the branch `auto/<short-box-name>` from an up-to-date `main`, push it with a first commit and open the
   pull request right away (title = the box, **not** a draft: a draft cannot be merged through the API), so the
   owner's friends see the box is taken. Do not merge it before step 5.
3. Follow `CLAUDE.md` and `unreal/README.md`.
4. If the box changes the exporter or the map data, regenerate the Unreal files with `npm run unreal` and commit them.
5. Before finishing: `npm run format`, then `npm test`. If the box changes how the city looks, render the exported
   file and look at it (e.g. with three.js's GLTFLoader in Playwright, as `tests/` does for the browser game).
6. Unreal files you cannot open here (`.uasset`, `.umap`, `.uproject`) are never created or changed by the session.
   Editor scripts and C++ written without trying them in Unreal must say so in the pull request, and a `(local)` box
   to try them must exist in the roadmap (add one if missing).

### 4. If the tests fail
- Fix and retry **at most twice**.
- If it still fails: push anyway, rename the pull request so its title starts with `[NEEDS FIX]`
  (`gh api -X PATCH repos/05lata05/Neon-Torino/pulls/<number> -f title=...`) and write in the description what is
  wrong and what you tried. Do not merge it. Then stop.

### 5. Wrap-up and merge
1. Tick the box in `ROADMAP.md` (on the same branch).
2. Commit and push the branch, then update the pull request's description
   (`gh api -X PATCH repos/05lata05/Neon-Torino/pulls/<number> -f body=...`): description in English with
   what changes, how to try it and the `npm test` result. If the box changes how the game looks, say in the
   description what to look at in the test pictures (the `test-pictures` artifact of the GitHub check).
3. Wait for the GitHub check on the pull request (at most 20 minutes), checking every minute:
   `gh api "repos/05lata05/Neon-Torino/actions/runs?branch=<branch>&event=pull_request&per_page=1" --jq '.workflow_runs[0] | "\(.status) \(.conclusion)"'`
4. Decide:
   - check **green** and box **without** `(needs review)` → **merge**:
     `gh api -X PUT repos/05lata05/Neon-Torino/pulls/<number>/merge -f merge_method=squash` (GitHub deletes the
     branch by itself after the merge);
   - check green but box `(needs review)` → **do not merge**: leave the pull request open for the owner;
   - check **red** or not finished within 20 minutes → as in step 4 (at most two fixes), then rename the pull request
     `[NEEDS FIX] …` and do not merge.
5. Never write directly to `main`: changes only get in by merging a green pull request.

### 6. Sunday summary
If today is Sunday (Shanghai time), add a summary of the week to the final message:
the pull requests merged in the last 7 days (`gh api "repos/05lata05/Neon-Torino/pulls?state=closed&per_page=30"`,
filtering on `merged_at`), the open ones waiting for the owner, the next roadmap box.

### 7. Final message
One or two lines: what got into `main` (with the link), or the pull request waiting for the owner,
or the reason you did not work. On Sundays, then, the summary.

### Don'ts
- Do not change these instructions, the switch in `ROADMAP.md`, the `(needs review)`, `(manual)` and `(local)` markers or the scheduled tasks.
- Do not work on the frozen browser game (`src/`, `index.html`) unless a box asks for it.
- Do not merge, close or edit pull requests you did not open in this session (the friends' ones above all).
- Do not touch secrets, repository settings or cloud environment settings.
- Do not download data from new services beyond OpenStreetMap, Arpa Piemonte and the package registries.
