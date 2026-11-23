# Neon Torino — note per chi ci lavora

- Lingua: testi del gioco, commenti e documentazione in italiano.
- Niente build: moduli ES caricati dal browser, Three.js 0.160 da import map (index.html).
- `data/torino.json` si genera con `python3 tools/build_map.py`, non si modifica a mano.
- Unità: 1 m = 5 unità di gioco (`M` nel kit dei landmark); mondo x = est, z = sud.
- Nuovi landmark: modulo in `src/landmarks/`, forme OSM in `LANDMARKS` di `tools/build_map.py` (vedi README).
- Prima di consegnare: `npm test` (Playwright) e guardare le foto in `tests/out/`.
- Realismo: ogni zona nuova o modificata deve rispettare `docs/REALISMO.md` (fonti, lista di controllo, regole sui negozi reali).
- Dettagli inventati (non presenti in OSM) vanno dichiarati nel commento in testa al modulo.
- Cosa fare: la prima casella libera di `ROADMAP.md`; a fine lavoro spuntala.
- Un ramo per funzionalità (`feature/<nome>`), poi pull request su `main`.
- Moduli: leggi `docs/ARCHITETTURA.md` (regole su `init()`, `export let` e funzioni `set…()` per lo stato) prima di aggiungerne.
- Numeri di bilanciamento (premi, prezzi, velocità, difficoltà) solo in `src/config.js`.
- Prestazioni: `npm test` controlla le soglie; non alzarle senza scrivere il motivo in `tests/smoke.mjs`.
- Dopo le modifiche: `npm run format`.
