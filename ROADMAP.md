# Roadmap di Neon Torino

Lavoro automatico: ATTIVO

> Ogni notte una sessione di Claude fa la prima casella libera e, se il test su GitHub è verde, la unisce a `main` da
> sola (regole in `docs/LAVORO-AUTOMATICO.md`). Le caselle `(da rivedere)` restano in una pull request che approvi tu.
> Le caselle `(manuale)` le salta. Per fermarla scrivi `IN PAUSA` qui sopra.

Come si usa: ogni sessione di lavoro prende **la prima casella libera** della tappa in corso, lavora su un ramo
dedicato (`feature/<nome>`), passa `npm test`, apre una pull request e spunta la casella qui.
Una tappa finita = una versione giocabile con qualcosa di nuovo da provare.

Legenda: `[x]` fatto · `[ ]` da fare · `(~N sessioni)` stima indicativa · `(manuale)` la fa una sessione con il proprietario · `(da rivedere)` cambia l'aspetto del gioco: il merge lo fa il proprietario

## Visione

**Neon Torino è un crime open-world alla GTA nella Torino vera.** Guidi tanto, scappi dalla polizia, scopri i luoghi
simbolo della città e costruisci un piccolo impero di attività partendo da Santa Rita. Si gioca nel browser, su PC e
telefono, e si condivide con un link.

Pilastri, in ordine di importanza:
1. **Torino riconoscibile**: ogni zona rispetta lo standard di realismo (`docs/REALISMO.md`).
2. **Guida e inseguimenti**: il cuore del divertimento.
3. **Soldi e impero**: comprare e far crescere attività nel quartiere.
4. **Crime alla GTA**: polizia, bande, armi, con ironia torinese. La storia è leggera, legata alle attività.
5. **Gioca ovunque**: anche sul telefono degli amici.

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
- [ ] Misura delle prestazioni nel test: fps e chiamate di disegno su PC e in emulazione telefono, con soglia minima (~1)

## M2 · Santa Rita verosimile
Obiettivo: chi conosce Santa Rita la riconosce. Tutto secondo `docs/REALISMO.md`.
- [x] Fonti dati: altezze reali da Arpa Piemonte "Edifici 3D 2017" (quota di gronda del Comune di Torino); Overture scartata (in Italia ha poche altezze); modello del terreno rimandato a M7 per Superga
- [x] Altezze reali degli edifici nel generatore: edifici senza dato da 625 a 94
- [ ] Luce e atmosfera: occlusione ambientale, cielo realistico, foschia, asfalto bagnato che riflette; livelli grafici alto e basso (da rivedere) (~2)
- [ ] Materiali con texture fotografiche CC0 (intonaci, asfalto, marciapiedi, porfido, pietra) e `docs/CREDITI.md` (da rivedere) (~1)
- [ ] Palazzi di Santa Rita: facciate per tipo ed epoca (condomini anni '50–'70, balconi continui in rilievo, tapparelle, colori reali) (da rivedere) (~2)
- [ ] Santuario di Santa Rita da Cascia e la piazza con il mercato (da rivedere) (~1)
- [ ] Insegne vere dei negozi e locali OSM (circa 390) al piano terra, nella loro posizione (da rivedere) (~1)
- [ ] Arredo urbano: i 666 alberi veri, fermate GTT, cassonetti, edicole, targhe delle vie, auto parcheggiate (da rivedere) (~2)
- [ ] Foto prima/dopo di 5 punti del quartiere nel README (~1)

## M3 · Guida e inseguimenti
Obiettivo: guidare a Santa Rita deve essere divertente da solo.
- [ ] Fisica delle auto più credibile: peso, trasferimento di carico, derapate controllabili, sospensioni (~2)
- [ ] Danni visibili: ammaccature, vetri rotti, fumo, ruote che si staccano (~1)
- [ ] Moto e nuovi veicoli, anche tipici torinesi (furgoni, utilitarie d'epoca, bus GTT da rubare) (~1–2)
- [ ] Polizia più furba: posti di blocco, accerchiamenti, volanti che speronano a 4–5 stelle (~1–2)
- [ ] Gare clandestine con percorsi fissi e record da battere (~1)
- [ ] Acrobazie premiate: salti, derapate lunghe, quasi-incidenti (~1)

## M4 · Gioca ovunque
Obiettivo: mandare il link agli amici e farli giocare, anche dal telefono.
- [ ] Comandi touch: levetta virtuale, pulsanti per freno a mano, nitro, sali/scendi (~1–2)
- [ ] Interfaccia che si adatta allo schermo del telefono (HUD, mappa, menu) (~1)
- [ ] Grafica che si regola da sola in base alle prestazioni (~1)
- [ ] Menu iniziale con opzioni (audio, grafica, comandi) e salvataggio affidabile (~1)
- [ ] Link pubblico aggiornato a ogni versione e istruzioni per gli amici (manuale) (~1)

## M5 · Soldi e impero
Obiettivo: un motivo per fare soldi e un quartiere da conquistare.
- [ ] Economia: entrate, spese, prezzi bilanciati in `src/config.js` (~1)
- [ ] Attività da comprare (inventate): bar, officina, autolavaggio, edicola; rendono ogni giorno di gioco (~2)
- [ ] Ogni attività porta 2–3 missioni del suo "capo" (la storia leggera del gioco) (~2)
- [ ] Officina: elaborare le auto (motore, freni, gomme, colori, neon) (~1)
- [ ] Casa a Santa Rita con salvataggio e garage personale (~1)

## M6 · Crime alla GTA
Obiettivo: il lato criminale.
- [ ] Vita e armatura del giocatore, barra nell'HUD (~1)
- [ ] Pugni e mira automatica sul bersaglio più vicino (~1)
- [ ] Armi (pistola, poi altre) con munizioni e armeria (~2)
- [ ] Morte → ospedale, arresto → caserma, con perdita di soldi o armi (~1)
- [ ] Polizia a piedi che scende dalle volanti e insegue (~1)
- [ ] Bande rivali che si contendono le zone e attaccano le tue attività; racket (~2)

## M7 · Torino iconica
Obiettivo: la mappa cresce lungo i corsi verso i luoghi simbolo. **Ogni zona passa la lista di controllo di `docs/REALISMO.md`.**
- [ ] Borgo Filadelfia e Stadio Filadelfia (da rivedere) (~1–2)
- [ ] Lingotto, con la pista sul tetto dell'ex fabbrica (da rivedere) (~2)
- [ ] Porta Nuova e il centro fino a piazza Castello e la Mole (da rivedere) (~3)
- [ ] Po e Murazzi, con i ponti (da rivedere) (~2)
- [ ] Superga e la collina, con il terreno reale (da rivedere) (~2)
- [ ] Segreti e collezionabili in ogni zona (~1)
- [ ] Caricamento della città a pezzi (ed eventuale passaggio a Vite) quando la mappa diventa grande (~1)

---

## Idee in attesa (non ancora in una tappa)
- Radio con conduttori e notiziario di quartiere
- Partite allo stadio la domenica, con folla e traffico
- Mercato rionale in piazza Santa Rita con bancarelle animate
- Tram GTT guidabili
