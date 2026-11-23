# Neon Torino — notes for whoever works on it

- Language: code, comments, documentation, commit messages and pull requests in English.
- Player-facing text is bilingual (Italian and English): never write it inline, add a key to `src/i18n/strings.js`
  with both `it` and `en` and use `t('key')`. Real Italian names stay Italian in both languages: shop signs,
  landmark lettering, street names, radio station names.
- No build: ES modules loaded by the browser, Three.js 0.160 from the import map (index.html).
- `data/torino.json` is generated with `python3 tools/build_map.py`, never edited by hand.
- Units: 1 m = 5 game units (`M` in the landmark kit); world x = east, z = south.
- New landmarks: module in `src/landmarks/`, OSM shapes in `LANDMARKS` of `tools/build_map.py` (see README).
- Before delivering: `npm test` (Playwright) and look at the pictures in `tests/out/`.
- Realism: every new or changed zone must follow `docs/REALISM.md` (sources, checklist, rules on real shops).
- Invented details (not in OSM) must be declared in the comment at the top of the module.
- What to do: the first unchecked box in `ROADMAP.md`; tick it when done.
- One branch per feature (`feature/<name>`), then a pull request into `main`.
- Modules: read `docs/ARCHITECTURE.md` (rules on `init()`, `export let` and `set…()` functions for state) before adding any.
- Balance numbers (rewards, prices, speeds, difficulty) only in `src/config.js`.
- Performance: `npm test` checks the limits; do not raise them without writing the reason in `tests/smoke.mjs`.
- After changes: `npm run format`.
