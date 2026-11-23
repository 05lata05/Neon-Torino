# Architettura di Neon Torino

## Il flusso

```
OpenStreetMap ──fetch_osm.py──▶ .osm-cache/*.osm ──build_map.py──▶ data/torino.json ──▶ src/ (moduli ES) ──▶ browser
```

1. **Dati** (`tools/`): il generatore trasforma i dati OSM in un JSON compatto (polilinee codificate a interi).
   Le regole di classificazione sono documentate in testa a `build_map.py`.
2. **Gioco** (`src/`): moduli ES caricati direttamente dal browser, niente build. Three.js 0.160 da import map.
3. **Landmark** (`src/landmarks/`): moduli che ricevono un `kit` e le forme reali (`DATA.L`).

## I moduli

```
src/
  config.js          bilanciamento: auto, premi, polizia, traffico, tempi, prezzi (tutti i numeri da regolare)
  main.js            avvio: chiama gli init() in ordine, popola la città, ciclo di gioco, strumenti di debug
  core/              render.js · util.js · state.js (stato della partita) · update.js · input.js
  world/             map.js (dati, griglia, grafo stradale) · ground.js · lights.js · city.js · skyline.js · weather.js · effects.js
  entities/          vehicles.js · traffic.js · peds.js · police.js · heli.js · trams.js · collisions.js · spawn.js
  gameplay/          player.js · missions.js · garage.js · tokens.js · ramps.js
  render/            models.js · sync.js · camera.js · quality.js
  ui/                hud.js · map.js · perf.js (indicatore prestazioni, tasto I)
  audio/             sfx.js · radio.js
  landmarks/         kit.js · stadio.js · piscine.js · centrale-latte.js · sme.js · rignon.js
```

Ogni file comincia con una riga che dice a cosa serve.

### Regole dei moduli

- **Funzioni esportate** (`export function …`): si possono chiamare da qualsiasi modulo, in qualsiasi momento.
- **`export let`**: valori creati all'avvio (texture, materiali, liste). Gli altri moduli li **leggono** soltanto.
- **`init()`**: il codice che costruisce il mondo. `main.js` chiama gli `init()` in un ordine preciso (lo stesso
  del vecchio file unico): un modulo può usare nel suo `init()` solo cose create dagli `init()` precedenti.
- **Stato condiviso**: ogni variabile che cambia durante la partita appartiene a **un solo modulo**, che la dichiara
  con `export let` e offre una funzione `set…()` per cambiarla (es. `money` e `setMoney()` in `core/state.js`,
  `rain` e `setRain()` in `world/weather.js`). Gli altri moduli la leggono importandola e la cambiano **solo** con il
  setter: `setMoney(money + 50)`. Così si vede subito chi possiede cosa e chi lo modifica.

Gli import circolari sono permessi e innocui: a livello di modulo ci sono solo dichiarazioni, il lavoro vero
avviene negli `init()` e nel ciclo di gioco.

### Dove mettere una cosa nuova

| Voglio aggiungere… | Dove |
|---|---|
| un nuovo tipo di veicolo | `entities/vehicles.js` (`CARS`) e il modello in `render/models.js` |
| una missione | `gameplay/missions.js` (in futuro: dati in `data/missioni/`) |
| un elemento dell'HUD | `ui/hud.js` |
| un edificio famoso | un modulo in `src/landmarks/` (vedi README) |
| una meccanica nuova (es. armi) | un modulo nuovo in `gameplay/` con il suo `init()`, registrato in `main.js` |

## Coordinate

| Spazio | Unità | Uso |
|---|---|---|
| metri mappa | 1 m, x verso est, y verso sud, origine fissa (`ORIGIN` in `build_map.py`) | `torino.json` |
| mondo | 5 unità = 1 m, traslato di `(clip.x0 - 50, clip.y0 - 50)` | tutto il gioco; in Three.js `x = est`, `z = sud`, `y = alto` |
| griglia | celle da 10 unità (2 m) | collisioni (`grid`) e altezze per la telecamera (`hgrid`) |

`toW([x, y])` converte da metri mappa a mondo.

## Il ciclo di gioco

`frame()` in `main.js` → `update(dt)` (`core/update.js`) → `syncScene(dt)` (`render/sync.js`) → `updateCamera` e
`updateEnv` (`render/camera.js`) → render → `drawHUD` (`ui/hud.js`) → audio.

Ganci: `envHooks` (funzioni `dk => …` col buio da 0 a 1) e `kit.onTick` per le animazioni dei landmark.

## Test e debug

`npm test` avvia il gioco in Chromium headless, controlla che non ci siano errori, fotografa i landmark e gioca
una breve partita (camminare, guidare, scendere, mappa, pausa, ricercato). `window.__nr` espone lo stato e alcuni
comandi: `step(secondi)` fa avanzare la simulazione a passi fissi, `cam = {x,y,z,lx,ly,lz}` una telecamera libera,
`setHour(h)`, `startGame()`.

**Prestazioni:** il test misura chiamate di disegno, triangoli e tempo di simulazione su PC (grafica alta) e su un
telefono emulato (grafica bassa) e fallisce se si superano le soglie scritte in `tests/smoke.mjs`; i valori finiscono
in `tests/out/prestazioni.json`. Senza scheda video gli fps non si possono misurare: si guardano nel gioco col tasto I.

**Bilanciamento:** per cambiare premi, prezzi, velocità o difficoltà si modifica solo `src/config.js`.

Formattazione: `npm run format` (Prettier, configurazione in `.prettierrc.json`).
