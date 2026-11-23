# Lavoro automatico

Ogni notte parte da sola una sessione cloud di Claude che segue queste istruzioni.
Le regole servono a tre cose: **avanzare ogni notte**, **tenere sotto controllo il consumo di token** e
**lasciare al proprietario le scelte visive**.

In breve: una casella per notte; se il test su GitHub è verde la sessione fa merge da sola, tranne per le caselle
marcate `(da rivedere)` (grafica e nuove zone), che restano aperte finché il proprietario non le approva.
La domenica la sessione manda anche un riepilogo della settimana.

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
   Se ce n'è almeno una, **non lavorare**: "C'è una pull request da approvare: <link>" (di solito una casella
   `(da rivedere)` o una bozza `[DA SISTEMARE]`). Vai direttamente al punto 6 (riepilogo della domenica) e chiudi.
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

### 5. Chiusura e merge
1. Spunta la casella in `ROADMAP.md` (nello stesso ramo).
2. Commit e push del ramo, poi apri la pull request verso `main`: titolo = la casella; descrizione in italiano con
   cosa cambia, come provarlo e il risultato di `npm test`. Se la casella cambia l'aspetto del gioco, allega nella
   descrizione cosa guardare nelle foto del test (l'artefatto `foto-test` del controllo su GitHub).
3. Aspetta il controllo automatico di GitHub sulla pull request (al massimo 20 minuti), controllando ogni minuto:
   `gh api "repos/05lata05/Neon-Torino/actions/runs?branch=<ramo>&event=pull_request&per_page=1" --jq '.workflow_runs[0] | "\(.status) \(.conclusion)"'`
4. Decidi:
   - controllo **verde** e casella **senza** `(da rivedere)` → **fai merge**:
     `gh api -X PUT repos/05lata05/Neon-Torino/pulls/<numero>/merge -f merge_method=squash`, poi cancella il ramo
     (`gh api -X DELETE repos/05lata05/Neon-Torino/git/refs/heads/<ramo>`);
   - controllo verde ma casella `(da rivedere)` → **non fare merge**: lascia la pull request aperta per il proprietario;
   - controllo **rosso** o non concluso entro 20 minuti → come al punto 4 (al massimo due correzioni), poi trasforma
     la pull request in bozza con titolo `[DA SISTEMARE] …` e non fare merge.
5. Non scrivere mai direttamente su `main`: le modifiche entrano solo con il merge di una pull request verde.

### 6. Riepilogo della domenica
Se oggi è domenica (ora di Shanghai), aggiungi al messaggio finale un riepilogo della settimana:
le pull request unite negli ultimi 7 giorni (`gh api "repos/05lata05/Neon-Torino/pulls?state=closed&per_page=30"`,
filtrando `merged_at`), quelle aperte che aspettano il proprietario, la casella successiva della roadmap.

### 7. Messaggio finale
Una o due righe: cosa è entrato in `main` (con il link), oppure la pull request che aspetta il proprietario,
oppure il motivo per cui non hai lavorato. La domenica, poi, il riepilogo.

### Divieti
- Non cambiare queste istruzioni, l'interruttore in `ROADMAP.md`, i marcatori `(da rivedere)` e `(manuale)` o le attività programmate.
- Non fare merge di pull request che non hai aperto tu in questa sessione.
- Non toccare segreti, impostazioni del repository o dell'ambiente cloud.
- Non scaricare dati da servizi nuovi oltre a OpenStreetMap e ai registri dei pacchetti.
