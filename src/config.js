// Bilanciamento del gioco: tutti i numeri da regolare stanno qui.
// Unità: velocità e distanze in unità di gioco (5 unità = 1 m), tempi in secondi reali, soldi in euro.

// Tempo del gioco: la partita comincia alle 17:00 e un'ora di gioco dura 15 secondi reali.
export const TEMPO = { oraInizio: 17, secondiPerOra: 15 };

// Veicoli: dimensioni, velocità massima (max), accelerazione (acc), aderenza (grip), sterzo (turn),
// resistenza ai danni (hp), velocità di crociera nel traffico (cruise), colori possibili, massa relativa.
export const VEICOLI = {
  berlina: {
    name: 'Berlina',
    len: 34,
    wid: 17,
    max: 330,
    acc: 260,
    grip: 7,
    turn: 2.7,
    hp: 100,
    cruise: 165,
    cols: ['#a9adb3', '#eceef0', '#1c1f24', '#2b4c7e', '#a3262a', '#5b6169', '#2f5d50', '#8c7b6b'],
  },
  utilitaria: {
    name: 'Utilitaria',
    len: 28,
    wid: 15,
    max: 290,
    acc: 230,
    grip: 7,
    turn: 3.0,
    hp: 90,
    cruise: 160,
    cols: ['#e9ecef', '#b3202a', '#9aa3ab', '#2d3436', '#e1b12c', '#5d7f99', '#7a8f4a', '#d9d4c7'],
  },
  sportiva: {
    name: 'Sportiva',
    len: 35,
    wid: 16,
    max: 480,
    acc: 430,
    grip: 6.5,
    turn: 3.0,
    hp: 80,
    cruise: 205,
    cols: ['#ff3f6c', '#feca57', '#00d2d3', '#ff9f43', '#1e272e'],
  },
  furgone: {
    name: 'Furgone',
    len: 44,
    wid: 20,
    max: 250,
    acc: 170,
    grip: 8,
    turn: 2.1,
    hp: 160,
    cruise: 140,
    cols: ['#dfe4ea', '#a4b0be', '#e1b12c', '#6ab04c'],
  },
  taxi: { name: 'Taxi', len: 34, wid: 17, max: 345, acc: 280, grip: 7, turn: 2.7, hp: 100, cruise: 195, cols: ['#f4f4f2'] },
  polizia: {
    name: 'Polizia',
    len: 36,
    wid: 17,
    max: 430,
    acc: 370,
    grip: 7.5,
    turn: 2.9,
    hp: 150,
    cruise: 170,
    cols: ['#1f4e96', '#16213e'],
  },
  fulmine: {
    name: 'Fulmine',
    len: 36,
    wid: 17,
    max: 600,
    acc: 560,
    grip: 7.4,
    turn: 3.1,
    hp: 90,
    cruise: 220,
    cols: ['#7c3aed', '#00e5ff', '#ff2e88', '#f8fafc'],
  },
  corazzato: {
    name: 'Corazzato',
    len: 46,
    wid: 22,
    max: 320,
    acc: 240,
    grip: 8.5,
    turn: 2.2,
    hp: 500,
    cruise: 140,
    cols: ['#2f3b2f', '#1f2937'],
    mass: 2.2,
  },
  autobus: {
    name: 'Autobus',
    len: 66,
    wid: 21,
    max: 230,
    acc: 150,
    grip: 8,
    turn: 1.7,
    hp: 320,
    cruise: 140,
    cols: ['#ff8c1a'],
    mass: 3,
  },
};

// Nitro: secondi per svuotare il serbatoio e per riempirlo di nuovo.
export const NITRO = { durata: 3.2, ricarica: 9 };

// Traffico: quante auto e pedoni attorno al giocatore, velocità di crociera per tipo di strada
// (P primaria, S secondaria, T terziaria, R residenziale, V servizio, X pedonale).
export const TRAFFICO = { auto: 30, pedoni: 40, velocita: { P: 205, S: 185, T: 165, R: 135, V: 90, X: 60 } };

// Polizia: volanti per livello di ricercato (0–5), secondi fuori vista per scendere di un livello
// (base + perLivello × livello), secondi fermi vicino a una volante per l'arresto, multa all'arresto.
export const POLIZIA = {
  volantiPerLivello: [0, 1, 2, 3, 5, 6],
  seminareBase: 7,
  seminarePerLivello: 2.5,
  secondiArresto: 1.5,
  multaBase: 200,
  multaPerLivello: 150,
};

// Premi in euro.
export const PREMI = {
  gettone: 50,
  tuttiIGettoni: 5000,
  saltoPerSecondoInVolo: 150,
};

// Missioni: premio = base + perUnita × distanza (arrotondato a 10 €); tempo = distanza / velocità + margine.
export const MISSIONI = {
  consegna: { premioBase: 150, premioPerUnita: 0.12, velocita: 180, margine: 18 },
  corsa: { premio: 700, velocita: 230, margine: 8, bonusCheckpoint: 2.5 },
  taxi: { premioBase: 220, premioPerUnita: 0.1, velocita: 170, margine: 22, penalitaPerDanno: 4, premioMinimo: 60 },
  colpo: { premio: 900, calore: 3 },
};

// Garage: prezzi.
export const GARAGE_PREZZI = { riparazione: 100, fulmine: 1500, corazzato: 2500, sportiva: 0 };

// Meteo: secondi prima del primo cambio e intervallo (minimo, massimo) tra un cambio e l'altro.
export const METEO = { primoCambio: 75, intervalloMin: 80, intervalloMax: 180 };
