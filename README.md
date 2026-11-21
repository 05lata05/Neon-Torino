# Neon Torino

Open-world 3D nel quartiere **Santa Rita di Torino**, nel browser. Strade, palazzi, parchi e linee del tram
vengono dai dati veri di **OpenStreetMap**; i landmark del quartiere sono modellati a mano sulle loro forme reali.

Motore: [Three.js](https://threejs.org) 0.160, JavaScript moderno (moduli ES), nessun passaggio di build.

## Avvio rapido

```bash
npm run dev          # server locale su http://localhost:8080
```

Serve un server, non basta aprire `index.html` con doppio clic: il gioco carica `data/torino.json` e i moduli ES.

Comandi: **WASD** guida/cammina · **Spazio** freno a mano · **Shift** nitro/corsa · **E** sali/scendi/ruba ·
**M** mappa · **R** radio · **C** telecamera · **H** clacson · **V** audio · **Q** grafica · **P** pausa.

## Landmark di Santa Rita

Tutti costruiti sull'impronta OSM reale (id OSM in `tools/build_map.py`, voce `LANDMARKS`).

| Landmark | Dati reali usati | Aggiunte di contorno |
|---|---|---|
| **Stadio Olimpico Grande Torino** | anello esterno e interno, campo (sintetico) | altezze di tribune e copertura stimate, LED a bordo campo, maxischermo |
| **Torre Maratona** | impronta, altezza 40 m | bandiera |
| **Braciere Olimpico** (Torino 2006) | posizione, altezza 57 m | forma del traliccio stilizzata |
| **Inalpi Arena** (ex Palasport Olimpico) | impronta, altezza 12 m | impianti sul tetto |
| **Piscine**: Stadio Monumentale, Nuova Piscina Olimpica, Aquatica, vasca esterna, Piscina Sebastopoli, Torino Nuoto | impronte, piani | insegne, pensiline, corsie della vasca |
| **Centrale del Latte di Torino** | area, 7 edifici con piani e tetti, capannone a volta da 18 m, torre dell'acqua da 22 m | recinzione, insegne, autocisterne nel piazzale |
| **Scuola di Management ed Economia** (UniTo) | area, edifici con piani, colori e tetti | piazza, pennoni, rastrelliere |
| **Parco Rignon** e **Villa Amoretti** | perimetro, 36 sentieri, filari di tigli, 25 alberi, 94 panchine e cestini, area giochi, area cani, pista di pattinaggio, giostra, edifici storici con colori e tetti | facciata barocca disegnata, alberi in più sui prati, giochi dell'area bimbi |

## Struttura

```
index.html                 pagina: canvas, import map di Three.js, carica src/main.js
src/main.js                motore di gioco (mondo, veicoli, pedoni, polizia, missioni, HUD, audio)
src/landmarks/             landmark modellati a mano, uno per modulo
  index.js                 registro dei moduli
  kit.js                   kit comune: geometrie, texture su canvas, collisioni, minimappa, giorno/notte
  stadio.js                stadio, Torre Maratona, Braciere, Inalpi Arena
  piscine.js · centrale-latte.js · sme.js · rignon.js
data/torino.json           mappa generata (non modificarla a mano)
tools/fetch_osm.py         scarica i dati OSM della zona
tools/build_map.py         OSM -> data/torino.json (strade, edifici, aree, tram, landmark)
tools/serve.mjs            server statico per sviluppo e test
tests/smoke.mjs            test: avvia il gioco, verifica che non ci siano errori, fotografa i landmark
docs/ARCHITETTURA.md       come è fatto il motore e come farlo crescere
```

## Rigenerare la mappa

```bash
python3 tools/fetch_osm.py     # scarica i tasselli OSM in .osm-cache/ (ignorata da git)
python3 tools/build_map.py     # scrive data/torino.json
```

Per allargare la zona di gioco cambia `CLIP` in `tools/build_map.py` (metri da un'origine fissa, x verso est
e y verso sud): il motore ricava da lì i confini del mondo.

## Test

```bash
npm install          # solo la prima volta: scarica three in locale per i test offline
npm test             # richiede Playwright con Chromium
```

Le foto finiscono in `tests/out/` (una per landmark, di giorno e di notte per stadio, arena e parco).

## Aggiungere un landmark

1. Trova gli id su openstreetmap.org (way `w…`, relation `r…`, node `n…`) e aggiungili a `LANDMARKS` in `tools/build_map.py`.
2. Rigenera la mappa: l'edificio sparisce dalla lista generica e le sue forme finiscono in `DATA.L.<id>`.
3. Crea `src/landmarks/<nome>.js` con `export default function build(kit, L) { … }` e registralo in `src/landmarks/index.js`.
4. Usa il kit: `kit.tagBuilding()` costruisce un edificio intero dai tag OSM; per i dettagli ci sono `walls`, `roof`,
   `insetRoof`, `box`, `sign`, `fence`, `trees`, `solid` (collisioni), `mini` (minimappa), `onTick`, `lit` (finestre di notte).
5. `npm test` e controlla la foto in `tests/out/`.

## Dati e licenze

Dati mappa © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licenza ODbL.
`data/torino.json` è un'opera derivata da quei dati e resta sotto ODbL.
