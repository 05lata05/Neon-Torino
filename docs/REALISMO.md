# Standard di realismo

Neon Torino deve far capire **dove sei**: chi conosce Santa Rita deve riconoscere le sue strade. Questo standard vale
per Santa Rita e per **ogni zona nuova** che entra nella mappa. Una zona è "finita" solo quando passa tutta la lista
di controllo qui sotto.

## Fonti dei dati (in ordine di priorità)

| Cosa | Fonte | Note |
|---|---|---|
| Strade, edifici, aree, tram, negozi, alberi | **OpenStreetMap** | base di tutto, licenza ODbL |
| Altezze degli edifici mancanti | open data **Città di Torino / Regione Piemonte**, poi **Overture Maps** | OSM ha i piani solo per circa il 58% degli edifici |
| Terreno (collina, Superga, rive del Po) | modello del terreno della **Regione Piemonte** (o Copernicus) | Santa Rita è in piano |
| Materiali (intonaco, asfalto, porfido, pietra) | texture **CC0** da ambientCG o Poly Haven | nessun obbligo di licenza; elencarle comunque in `docs/CREDITI.md` |
| Monumenti difficili (Mole, Superga…) | modello fatto a mano sull'impronta OSM; modelli esterni solo con licenza libera verificata | citare l'autore in `docs/CREDITI.md` |
| Colori, insegne, dettagli di una via | foto di **Mapillary** come riferimento visivo | solo riferimento: le foto non entrano nel gioco |

Da non usare: Google Earth / Photorealistic 3D Tiles (condizioni d'uso), copie di mappe a pagamento, modelli senza licenza chiara.

## Lista di controllo di una zona

**Forma**
- [ ] Strade, edifici e aree generati da `tools/build_map.py` (niente geometria inventata dove esiste il dato vero).
- [ ] Altezze reali: piani da OSM; dove mancano, dagli open data o da Overture; inventate solo come ultima risorsa.
- [ ] Il terreno segue le quote reali se la zona non è in piano.

**Riconoscibilità**
- [ ] I landmark della zona (chiese, piazze, monumenti, impianti) modellati sulle loro forme reali in `src/landmarks/`.
- [ ] Insegne vere dei negozi e locali OSM al piano terra, nella loro posizione.
- [ ] Alberi veri (alberi singoli e filari OSM) e viali alberati dove esistono.
- [ ] Arredo urbano torinese: fermate GTT, lampioni, cassonetti, edicole, targhe delle vie, auto parcheggiate.

**Aspetto**
- [ ] Facciate coerenti con l'epoca e il tipo di edifici della zona (es. Santa Rita: condomini anni '50–'70, balconi
  continui, tapparelle, intonaci ocra, gialli e grigi; centro: palazzi ottocenteschi e portici).
- [ ] Materiali con texture fotografiche, luce e atmosfera del livello grafico alto.

**Gioco e prestazioni**
- [ ] Gira a 30 fps o più sul livello grafico basso in emulazione telefono (`npm test`).
- [ ] Nessun calo evidente sul PC rispetto alle zone esistenti.

**Prove e crediti**
- [ ] Foto di confronto dei punti principali della zona in `tests/out/` (il test le scatta da solo).
- [ ] Fonti e licenze aggiunte a `docs/CREDITI.md`.

## Regole fisse

- **Negozi reali:** le insegne vere servono solo a riconoscere il quartiere. Missioni crime (rapine, racket, attacchi)
  solo su attività **inventate**, mai su un'attività reale con il suo nome.
- **Persone reali:** nessun personaggio del gioco porta il nome o l'aspetto di una persona reale.
- **Dettagli inventati:** quando un dettaglio non viene dai dati (es. le autocisterne della Centrale del Latte),
  va scritto nel commento in testa al modulo.
