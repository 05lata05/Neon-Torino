# Roadmap di Neon Torino

Lavoro automatico: ATTIVO

> Ogni notte una sessione di Claude fa la prima casella libera e apre una pull request (regole in
> `docs/LAVORO-AUTOMATICO.md`). Per fermarla scrivi `IN PAUSA` qui sopra. Le caselle marcate `(manuale)` le salta.

Come si usa: ogni sessione di lavoro prende **la prima casella libera** della tappa in corso, lavora su un ramo
dedicato (`feature/<nome>`), passa `npm test`, apre una pull request e spunta la casella qui.
Una tappa finita = una versione giocabile con qualcosa di nuovo da provare.

Legenda: `[x]` fatto · `[ ]` da fare · `(~N sessioni)` stima indicativa

---

## M0 · Base del progetto — fatto
- [x] Città di Santa Rita dai dati OpenStreetMap (strade, palazzi, parchi, tram 4 e 10)
- [x] Guida, traffico, pedoni, polizia con elicottero, 4 tipi di missione, garage, radio, meteo, giorno e notte
- [x] Landmark reali: Stadio Olimpico Grande Torino, Torre Maratona, Braciere, Inalpi Arena, piscine, Centrale del Latte, Economia (SME), Parco Rignon e Villa Amoretti
- [x] Generatore della mappa da OSM (`tools/build_map.py`) e repository GitHub

## M1 · Fondamenta — in corso
Obiettivo: poter far crescere il gioco senza romperlo.
- [x] Dividere `src/main.js` in moduli per argomento (`core`, `world`, `entities`, `gameplay`, `render`, `ui`, `audio`)
- [x] Test con partita simulata (camminare, guidare, scendere, mappa, pausa, ricercato)
- [x] Test automatico su GitHub a ogni push (GitHub Actions + Playwright) (~1)
- [ ] Ridurre l'oggetto condiviso `G`: ogni modulo espone funzioni (`setState()`, `addMoney()`…) invece di variabili scritte da fuori (~1–2)
- [ ] Spostare le costanti di bilanciamento (velocità auto, premi, tempi) in `src/config.js` (~1)

## M2 · A piedi — prossima tappa
Obiettivo: giocare anche fuori dall'auto, come in GTA.
- [ ] Vita e armatura del giocatore, barra nell'HUD (~1)
- [ ] Pugni e mira automatica sul bersaglio più vicino (~1)
- [ ] Prima arma: pistola con munizioni, proiettili e colpi su auto e pedoni (~1–2)
- [ ] Morte → risveglio all'ospedale (Ospedale Mauriziano, vicino) con perdita di soldi; arresto → caserma (~1)
- [ ] La polizia a piedi scende dalle volanti e insegue (~1)
- [ ] Negozio di armi (Ammu-Nation all'italiana) (~1)

## M3 · Quartiere vivo
- [ ] Due bande rivali con zone sul territorio (es. via Filadelfia vs corso Orbassano) (~2)
- [ ] Pedoni che reagiscono a spari e incidenti, chiamano la polizia (~1)
- [ ] Missioni secondarie: ambulanza, vigile del fuoco, vigilante (~2)
- [ ] Personaggi con animazioni vere al posto dei blocchi (~2)

## M4 · Storia
- [ ] Formato delle missioni come dati (`data/missioni/*.json`): obiettivi, dialoghi, condizioni (~1–2)
- [ ] Primo capitolo: 5 missioni collegate con personaggi di Santa Rita (~3)
- [ ] Dialoghi a schermo e brevi scene con telecamera guidata (~1)
- [ ] Salvataggio dei progressi della storia (~1)

## M5 · Più Torino
- [ ] Allargare la mappa: Borgo Filadelfia e Stadio Filadelfia (~1–2)
- [ ] Lingotto (ex fabbrica con la pista sul tetto) (~2)
- [ ] Mirafiori (~2)
- [ ] Passare a Vite quando i file e le risorse diventano tanti (caricamento a pezzi della città) (~1)

---

## Idee in attesa (non ancora in una tappa)
- Moto e biciclette
- Radio con conduttori e notiziario di quartiere
- Partite allo stadio la domenica, con folla e traffico
- Mercato rionale in piazza Santa Rita
