# Architettura di Neon Torino

## Il flusso

```
OpenStreetMap ──fetch_osm.py──▶ .osm-cache/*.osm ──build_map.py──▶ data/torino.json ──▶ src/main.js ──▶ src/landmarks/*
```

1. **Dati** (`tools/`): il generatore trasforma i dati OSM in un JSON compatto (polilinee codificate a interi).
   Le regole di classificazione (strade P/S/T/R/X, edifici chiesa/stadio/garage/scuola, aree verde/campo/parcheggio/acqua)
   sono ricavate dalla prima versione della mappa e documentate in testa a `build_map.py`.
2. **Mondo** (`src/main.js`): costruisce griglia di collisione, grafo stradale, palazzi con facciate generate, alberi,
   lampioni, semafori, tram; poi gira il ciclo di gioco.
3. **Landmark** (`src/landmarks/`): moduli indipendenti che ricevono un `kit` e le forme reali (`DATA.L`), e aggiungono
   geometrie, collisioni, insegne ed etichette. Vengono costruiti prima di alberi e lampioni, così questi ne evitano le impronte.

## Coordinate

| Spazio | Unità | Uso |
|---|---|---|
| metri mappa | 1 m, x verso est, y verso sud, origine fissa (`ORIGIN` in `build_map.py`) | `torino.json` |
| mondo | 5 unità = 1 m, traslato di `(clip.x0 - 50, clip.y0 - 50)` | tutto il gioco; in Three.js `x = est`, `z = sud`, `y = alto` |
| griglia | celle da 10 unità (2 m) | collisioni (`grid`) e altezze per la telecamera (`hgrid`) |

`toW([x, y])` converte da metri mappa a mondo. Nei landmark le altezze si scrivono in metri e si moltiplicano per `M = 5`.

## Il ciclo di gioco (src/main.js)

`frame()` → `update(dt)` (giocatore, traffico, polizia, missioni, meteo) → `syncScene(dt)` (mesh di auto e pedoni,
effetti, `LMX.tick`) → `updateCamera` → `updateEnv` (ora del giorno, nebbia, luci, `envHooks`) → `render` → `drawHUD`.

Ganci per i moduli:
- `envHooks`: funzioni `dk => …` chiamate a ogni frame con il buio (0 giorno, 1 notte), per finestre e luci.
- `kit.onTick((dt, t) => …)`: animazioni (LED dello stadio, bandiere, giostra, acqua).
- `window.__nr`: stato del gioco per test e debug (`cam` per una telecamera libera, `setHour(h)`, `startGame()`, `L`, `toW`).

## Come far crescere il progetto

`src/main.js` è ancora un file unico (circa 1450 righe) perché è nato come artefatto a pagina singola.
Il piano è spezzarlo un pezzo alla volta, senza riscritture, sempre con `npm test` verde a ogni passo:

1. `src/core/` utilità, griglia, grafo stradale (sono funzioni pure: si spostano facilmente).
2. `src/world/` costruzione della città (`buildCity`, facciate, tram, orizzonte).
3. `src/vehicles/`, `src/peds/`, `src/police/` con lo stato condiviso passato in un oggetto `game`.
4. `src/ui/` HUD, mappa, garage. `src/audio/` effetti e radio.
5. `src/missions/` missioni come dati (JSON + piccoli script), per poter scrivere una storia.

Quando i file diventano tanti conviene introdurre Vite (bundling e ricarica a caldo); finché sono moduli ES
il gioco gira così com'è, anche pubblicato come pagina statica.

## Cosa manca per un gioco "alla GTA"

- Gioco a piedi completo: vita, pugni, armi, morte e ospedale.
- Bande rivali e zone della città.
- Missioni con trama scritte come dati.
- Personaggi animati (rig e animazioni al posto dei blocchi).
- Altri quartieri: basta allargare `CLIP` e aggiungere landmark (es. Stadio Filadelfia, Lingotto, Mirafiori).
