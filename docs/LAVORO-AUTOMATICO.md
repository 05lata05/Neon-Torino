# Lavoro automatico

Ogni notte parte da sola una sessione cloud di Claude che segue queste istruzioni.
Le regole servono a due cose: **tenere basso il consumo di token** e **farti vedere tutto prima che entri in `main`**.

Per mettere in pausa: in `ROADMAP.md` scrivi `Lavoro automatico: IN PAUSA`.
Per cambiare cosa fa: riordina o modifica le caselle di `ROADMAP.md`.

---

## Istruzioni per la sessione automatica

Segui i passi in ordine. Se un passo dice di fermarti, chiudi la sessione con un breve messaggio finale che spiega il motivo.

### 0. Note sull'ambiente
- Il repository è già nella cartella di lavoro della sessione (ambiente cloud "Neon-Torino"); se non c'è, clonalo.
- `gh auth status` può dire che il token non è valido: ignoralo. `gh api repos/05lata05/Neon-Torino/...` funziona
  lo stesso, attraverso il proxy della sessione. Le pull request si aprono con
  `gh api repos/05lata05/Neon-Torino/pulls -f title=... -f head=<ramo> -f base=main -f body=...`.

### 1. Controlli iniziali (costo minimo)
1. Leggi la riga `Lavoro automatico:` in cima a `ROADMAP.md`. Se non dice `ATTIVO`, **fermati**: "Lavoro automatico in pausa".
2. Controlla le pull request aperte del repository:
   `gh api repos/05lata05/Neon-Torino/pulls?state=open --jq '.[].html_url'`.
   Se ce n'è almeno una, **fermati**: "C'è una pull request da approvare: <link>". Non si lavora finché il proprietario non ha fatto merge.
3. Trova la tappa in corso (la prima con caselle `[ ]`) e la **prima casella libera** che non sia marcata `(manuale)`.
   Se non ce ne sono, **fermati**: "Roadmap completata: aggiungi nuovi obiettivi".

### 2. Misura del lavoro
- Fai **una sola casella** per sessione.
- Se la casella è troppo grande per una sessione (stima oltre `(~1)`), non farla tutta: in `ROADMAP.md` dividila in
  sottocaselle più piccole e fai **solo la prima**.
- Non fare lavoro extra non richiesto dalla casella (niente riscritture "già che ci sono"). Se noti altro da fare,
  aggiungilo in fondo a `ROADMAP.md`, sotto "Idee in attesa".

### 3. Lavoro
1. Prepara l'ambiente: `npm install`.
2. Crea il ramo `auto/<nome-breve-della-casella>` a partire da `main` aggiornato.
3. Segui `CLAUDE.md` e `docs/ARCHITETTURA.md`.
4. Prima di finire: `npm run format`, poi `npm test`. Guarda almeno una foto in `tests/out/` se la casella cambia la grafica.
5. Se il gioco ha una funzione nuova, aggiungi un controllo nella partita simulata di `tests/smoke.mjs`.

### 4. Se i test falliscono
- Correggi e riprova **al massimo due volte**.
- Se fallisce ancora: apri comunque la pull request come **bozza** (draft), con titolo che inizia per `[DA SISTEMARE]`,
  e scrivi nella descrizione cosa non va e cosa hai provato. Poi fermati.

### 5. Chiusura
1. Spunta la casella in `ROADMAP.md` (nello stesso ramo).
2. Commit e push del ramo, poi apri la pull request verso `main`: titolo = la casella; descrizione in italiano con
   cosa cambia, come provarlo e il risultato di `npm test`.
3. **Non fare mai merge** e non scrivere direttamente su `main`.
4. Messaggio finale della sessione: una riga con il link della pull request.

### Divieti
- Non cambiare queste istruzioni, l'interruttore in `ROADMAP.md` o le attività programmate.
- Non toccare segreti, impostazioni del repository o dell'ambiente cloud.
- Non scaricare dati da servizi nuovi oltre a OpenStreetMap e ai registri dei pacchetti.
