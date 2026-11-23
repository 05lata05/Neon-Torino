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
src/main.js                avvio e ciclo di gioco
src/core/ world/ entities/ gameplay/ render/ ui/ audio/   il motore, diviso per argomento
src/landmarks/             landmark modellati a mano (kit comune + un modulo per zona)
data/torino.json           mappa generata (non modificarla a mano)
tools/                     download OSM, generatore della mappa, server di sviluppo
tests/smoke.mjs            test: avvio, foto dei landmark, partita simulata
docs/ARCHITETTURA.md       come sono fatti i moduli e dove mettere le cose nuove
ROADMAP.md                 le tappe del progetto e cosa fare dopo
```

## Rigenerare la mappa

```bash
python3 tools/fetch_osm.py     # scarica i tasselli OSM in .osm-cache/ (ignorata da git)
python3 tools/fetch_heights.py # altezze reali degli edifici da Arpa Piemonte
python3 tools/build_map.py     # scrive data/torino.json
```

Per allargare la zona di gioco cambia `CLIP` in `tools/build_map.py` (metri da un'origine fissa, x verso est
e y verso sud): il motore ricava da lì i confini del mondo.

## Test

```bash
npm install          # solo la prima volta: three in locale per i test offline, Prettier
npm test             # richiede Playwright con Chromium
```

Formattazione del codice: `npm run format`.

Le foto finiscono in `tests/out/` (una per landmark, di giorno e di notte per stadio, arena e parco).

Su GitHub lo stesso test parte da solo a ogni push e a ogni pull request (`.github/workflows/test.yml`,
con controllo di Prettier); le foto si scaricano dall'artefatto `foto-test` della corsa.

## Aggiungere un landmark

1. Trova gli id su openstreetmap.org (way `w…`, relation `r…`, node `n…`) e aggiungili a `LANDMARKS` in `tools/build_map.py`.
2. Rigenera la mappa: l'edificio sparisce dalla lista generica e le sue forme finiscono in `DATA.L.<id>`.
3. Crea `src/landmarks/<nome>.js` con `export default function build(kit, L) { … }` e registralo in `src/landmarks/index.js`.
4. Usa il kit: `kit.tagBuilding()` costruisce un edificio intero dai tag OSM; per i dettagli ci sono `walls`, `roof`,
   `insetRoof`, `box`, `sign`, `fence`, `trees`, `solid` (collisioni), `mini` (minimappa), `onTick`, `lit` (finestre di notte).
5. `npm test` e controlla la foto in `tests/out/`.

## Dati e licenze

Dati mappa © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licenza ODbL. Altezze degli edifici: Arpa Piemonte - Geoportale, CC BY 2.5 Italia. Elenco completo in `docs/CREDITI.md`.
`data/torino.json` è un'opera derivata da quei dati e resta sotto ODbL.
