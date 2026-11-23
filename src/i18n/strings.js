// Player-facing text in Italian (it) and English (en).
// Placeholders like {n} are filled by t(key, { n: 3 }). Arrays are lists of alternatives picked at random.
// Not here on purpose: shop signs, landmark lettering, street and radio names. They are part of the real
// Turin the game reproduces and stay in Italian in both languages.
export const STRINGS = {
  // title, pause and overlays
  'title.subtitle': {
    it: 'Santa Rita e dintorni: strade e palazzi veri da OpenStreetMap.',
    en: 'Santa Rita and around: real streets and buildings from OpenStreetMap.',
  },
  'title.start': { it: 'Clicca o premi INVIO per giocare', en: 'Click or press ENTER to play' },
  'pause.title': { it: 'PAUSA', en: 'PAUSED' },
  'pause.resume': { it: 'Clicca o premi P per riprendere', en: 'Click or press P to resume' },
  'pause.stats': {
    it: 'Missioni completate: {done}   ·   Gettoni: {got}/{tot}',
    en: 'Missions completed: {done}   ·   Tokens: {got}/{tot}',
  },
  'credits.short': {
    it: 'Mappa © OpenStreetMap contributors · altezze Arpa Piemonte',
    en: 'Map © OpenStreetMap contributors · heights Arpa Piemonte',
  },
  'credits.full': {
    it: 'Dati mappa © OpenStreetMap contributors (ODbL) · Altezze edifici: Arpa Piemonte - Geoportale (CC BY 2.5 IT)',
    en: 'Map data © OpenStreetMap contributors (ODbL) · Building heights: Arpa Piemonte - Geoportale (CC BY 2.5 IT)',
  },

  // controls
  'controls.ws': { it: 'avanti · indietro (o frena)', en: 'forward · reverse (or brake)' },
  'controls.ad': { it: 'sterza · gira', en: 'steer · turn' },
  'controls.space.key': { it: 'Spazio', en: 'Space' },
  'controls.space': { it: 'freno a mano (derapate!)', en: 'handbrake (drift!)' },
  'controls.shift': { it: 'nitro in auto · corri a piedi', en: 'nitro in a car · run on foot' },
  'controls.e.key': { it: 'E oppure F', en: 'E or F' },
  'controls.e': { it: "sali · scendi · ruba un'auto", en: 'get in · get out · steal a car' },
  'controls.m': { it: 'mappa con GPS', en: 'map with GPS' },
  'controls.r': { it: 'cambia stazione radio', en: 'change radio station' },
  'controls.c': { it: 'cambia telecamera', en: 'change camera' },
  'controls.hvq': { it: 'clacson · audio · grafica', en: 'horn · audio · graphics' },
  'controls.i': { it: 'prestazioni (fps)', en: 'performance (fps)' },
  'controls.l': { it: 'lingua: italiano / inglese', en: 'language: Italian / English' },
  'controls.p': { it: 'pausa', en: 'pause' },

  // HUD
  'hud.heat': { it: 'CALORE', en: 'HEAT' },
  'hud.tokens': { it: 'GETTONI {got}/{tot}', en: 'TOKENS {got}/{tot}' },
  'hud.radioOff': { it: 'radio spenta', en: 'radio off' },
  'hud.hint': {
    it: '[C] telecamera: {cam}    [M] mappa    [R] radio    [V] audio {audio}    [Q] grafica {gfx}    [L] lingua',
    en: '[C] camera: {cam}    [M] map    [R] radio    [V] audio {audio}    [Q] graphics {gfx}    [L] language',
  },
  'hud.cam.follow': { it: 'inseguimento', en: 'chase' },
  'hud.cam.top': { it: "dall'alto", en: 'top-down' },
  'hud.yes': { it: 'sì', en: 'on' },
  'hud.no': { it: 'no', en: 'off' },
  'hud.gfx.high': { it: 'alta', en: 'high' },
  'hud.gfx.low': { it: 'bassa', en: 'low' },
  'hud.intro': {
    it: 'Raggiungi un fascio di luce missione (C · R · T · €) — li vedi sulla minimappa',
    en: 'Reach a mission light beam (C · R · T · €) — you can see them on the minimap',
  },
  'hud.heist.lose': { it: 'Semina la polizia! (resta fuori dalla loro vista)', en: 'Lose the police! (stay out of their sight)' },
  'hud.heist.done': { it: 'Fatto!', en: 'Done!' },
  'hud.stealPolice': { it: "[E] Ruba l'auto della polizia", en: '[E] Steal the police car' },
  'hud.steal': { it: "[E] Ruba l'auto", en: '[E] Steal the car' },
  'hud.getIn': { it: '[E] Sali', en: '[E] Get in' },

  // big map
  'map.title': { it: 'MAPPA: SANTA RITA, TORINO', en: 'MAP: SANTA RITA, TURIN' },
  'map.legend': {
    it: 'C consegna · R corsa · T taxi · € colpo · G garage · arancione = rampe    —    M per chiudere',
    en: 'C delivery · R race · T taxi · € heist · G garage · orange = ramps    —    M to close',
  },

  // performance overlay
  'perf.calls': { it: '{n} chiamate di disegno', en: '{n} draw calls' },
  'perf.tris': { it: '{n}k triangoli', en: '{n}k triangles' },
  'perf.gfx': { it: 'grafica {q}', en: 'graphics {q}' },

  // vehicles
  'car.sedan': { it: 'Berlina', en: 'Sedan' },
  'car.compact': { it: 'Utilitaria', en: 'Compact' },
  'car.sports': { it: 'Sportiva', en: 'Sports car' },
  'car.van': { it: 'Furgone', en: 'Van' },
  'car.taxi': { it: 'Taxi', en: 'Taxi' },
  'car.police': { it: 'Polizia', en: 'Police' },
  'car.carabinieri': { it: 'Carabinieri', en: 'Carabinieri' },
  'car.lightning': { it: 'Fulmine', en: 'Fulmine' },
  'car.armored': { it: 'Corazzato', en: 'Armored truck' },
  'car.bus': { it: 'Autobus', en: 'Bus' },
  'car.policeJoke': { it: ' — ottima idea…?', en: ' — great idea…?' },
  'car.destroyed': { it: 'AUTO DISTRUTTA', en: 'CAR DESTROYED' },
  'car.findAnother': { it: "Trovane un'altra…", en: 'Find another one…' },
  'car.slowDown': { it: 'Rallenta per scendere', en: 'Slow down to get out' },

  // world and settings messages
  'msg.welcome': {
    it: "Benvenuto a Santa Rita, Torino! C'è una sportiva rosa qui accanto…",
    en: "Welcome to Santa Rita, Turin! There's a pink sports car right here…",
  },
  'msg.mapEdge': { it: 'Confine della mappa: per ora Torino finisce qui!', en: 'Edge of the map: for now Turin ends here!' },
  'msg.rainStart': { it: 'Inizia a piovere: strade scivolose!', en: "It's starting to rain: slippery roads!" },
  'msg.fogStart': { it: 'Scende la nebbia: visibilità ridotta', en: 'Fog is rolling in: low visibility' },
  'msg.rainStop': { it: 'Smette di piovere.', en: 'The rain stops.' },
  'msg.fogStop': { it: 'La nebbia si dirada.', en: 'The fog clears.' },
  'msg.audioOn': { it: 'Audio attivo', en: 'Audio on' },
  'msg.audioOff': { it: 'Audio disattivato', en: 'Audio off' },
  'msg.gfxHigh': { it: 'Grafica alta (ombre attive)', en: 'High graphics (shadows on)' },
  'msg.gfxLow': { it: 'Grafica bassa (più fluida)', en: 'Low graphics (smoother)' },
  'msg.gfxAuto': { it: 'Grafica ridotta per andare più fluido (Q per cambiarla)', en: 'Graphics lowered to run smoother (Q to change)' },
  'msg.radio': { it: 'Radio: {name}', en: 'Radio: {name}' },
  'msg.radioOff': { it: 'Radio spenta', en: 'Radio off' },
  'msg.lang': { it: 'Lingua: italiano', en: 'Language: English' },

  // police
  'police.searching': { it: 'La polizia ti sta cercando!', en: 'The police are looking for you!' },
  'police.lost': { it: 'SEMINATI!', en: 'LOST THEM!' },
  'police.lostSub': { it: 'La polizia ha perso le tue tracce', en: 'The police lost your trail' },
  'police.cooling': { it: 'Calore in calo…', en: 'Heat is dropping…' },
  'police.busted': { it: 'ARRESTATO', en: 'BUSTED' },
  'police.fine': { it: 'Multa: -€{n}', en: 'Fine: -€{n}' },
  'police.noFine': { it: 'Niente multa: sei al verde', en: "No fine: you're broke" },
  'police.missionFailed': { it: 'Missione fallita', en: 'Mission failed' },
  'police.heli': { it: 'Elicottero della polizia in arrivo!', en: 'Police helicopter incoming!' },

  // missions
  'mission.delivery': { it: 'Consegna', en: 'Delivery' },
  'mission.race': { it: 'Corsa clandestina', en: 'Street race' },
  'mission.heist': { it: 'Il colpo', en: 'The heist' },
  'mission.taxi': { it: 'Taxi', en: 'Taxi' },
  'mission.needCarTaxi': { it: "Ti serve un'auto per fare il taxi!", en: 'You need a car to drive a taxi!' },
  'mission.needCarRace': { it: 'Ti serve un veicolo per la corsa!', en: 'You need a vehicle for the race!' },
  'mission.delivery.title': { it: 'CONSEGNA', en: 'DELIVERY' },
  'mission.delivery.intro': {
    it: 'Zio Tonino ha un pacco "delicato". Niente domande, niente ritardi.',
    en: 'Uncle Tonino has a "delicate" parcel. No questions, no delays.',
  },
  'mission.delivery.pickup': { it: 'Ritira il pacco', en: 'Pick up the parcel' },
  'mission.delivery.dropoff': { it: 'Consegna il pacco', en: 'Deliver the parcel' },
  'mission.delivery.picked': { it: 'Pacco ritirato! Ora consegnalo.', en: 'Parcel picked up! Now deliver it.' },
  'mission.race.title': { it: 'CORSA CLANDESTINA', en: 'STREET RACE' },
  'mission.race.intro': {
    it: 'Sette checkpoint per le strade della città. Il cronometro corre.',
    en: 'Seven checkpoints through the city streets. The clock is ticking.',
  },
  'mission.race.checkpoint': { it: 'Checkpoint {i}/{n}', en: 'Checkpoint {i}/{n}' },
  'mission.race.bonus': { it: 'Checkpoint! +{s}s', en: 'Checkpoint! +{s}s' },
  'mission.taxi.title': { it: 'TAXI', en: 'TAXI' },
  'mission.taxi.intro': {
    it: 'Un cliente ha fretta. Guida pulito: la mancia dipende dai danni.',
    en: 'A customer is in a hurry. Drive clean: the tip depends on the damage.',
  },
  'mission.taxi.reach': { it: 'Raggiungi il cliente e fermati accanto', en: 'Reach the customer and stop next to them' },
  'mission.taxi.drop': { it: 'Porta il cliente a destinazione', en: 'Take the customer to their destination' },
  'mission.taxi.stop': { it: 'Rallenta e fermati!', en: 'Slow down and stop!' },
  'mission.taxi.lines': {
    it: ['Al lungomare, e di corsa!', 'Svelto, sono in ritardo!', 'Vada pure, conosco la strada… più o meno.', 'Piano con le curve, eh!'],
    en: ['To the river, and quickly!', "Hurry, I'm late!", 'Go ahead, I know the way… more or less.', 'Easy on the corners, eh!'],
  },
  'mission.taxi.penalty': { it: '   (−€{n} per i danni)', en: '   (−€{n} for damage)' },
  'mission.taxi.fullTip': { it: '   (mancia piena!)', en: '   (full tip!)' },
  'mission.taxi.left': { it: "Il cliente è sceso dall'auto", en: 'The customer got out of the car' },
  'mission.heist.title': { it: 'IL COLPO', en: 'THE HEIST' },
  'mission.heist.intro': {
    it: 'Hai "preso in prestito" i gioielli della Contessa. Semina la polizia!',
    en: 'You "borrowed" the Countess\'s jewels. Lose the police!',
  },
  'mission.done': { it: 'MISSIONE COMPIUTA', en: 'MISSION COMPLETE' },
  'mission.failed': { it: 'MISSIONE FALLITA', en: 'MISSION FAILED' },
  'mission.timeUp': { it: 'Tempo scaduto!', en: "Time's up!" },

  // rewards
  'reward.allTokens': { it: 'TUTTI I GETTONI!', en: 'ALL TOKENS!' },
  'reward.allTokensSub': { it: 'Hai esplorato tutta la città: +€{n}', en: 'You explored the whole city: +€{n}' },
  'reward.token': { it: 'Gettone neon {got}/{tot}  (+€{n})', en: 'Neon token {got}/{tot}  (+€{n})' },
  'reward.jump': { it: 'SALTO!', en: 'JUMP!' },
  'reward.jumpSub': { it: '{s} s in volo   +€{n}', en: '{s} s airborne   +€{n}' },

  // garage
  'garage.title': { it: 'GARAGE NEON', en: 'NEON GARAGE' },
  'garage.money': { it: 'Hai € {n}', en: 'You have € {n}' },
  'garage.help': { it: 'Tasti 1–4 oppure ↑ ↓ e Invio   ·   Esc per uscire', en: 'Keys 1–4 or ↑ ↓ and Enter   ·   Esc to leave' },
  'garage.closed': { it: 'Il garage non apre con la polizia alle calcagna!', en: "The garage won't open with the police on your tail!" },
  'garage.repair': { it: "Ripara l'auto", en: 'Repair the car' },
  'garage.repair.desc': { it: 'Torna come nuova', en: 'Good as new' },
  'garage.lightning.desc': { it: 'Supercar: la più veloce della città', en: 'Supercar: the fastest in town' },
  'garage.armored.desc': { it: 'Blindato pesante: sfonda le volanti', en: 'Heavy armour: smashes through police cars' },
  'garage.sports': { it: 'Sportiva Neon', en: 'Neon sports car' },
  'garage.sports.desc': { it: 'La tua prima auto, sempre gratis', en: 'Your first car, always free' },
  'garage.needCar': { it: "Entra nel garage con l'auto da riparare", en: 'Drive into the garage with the car to repair' },
  'garage.alreadyFine': { it: "L'auto è già a posto", en: 'The car is already fine' },
  'garage.noMoney': { it: 'Non hai abbastanza soldi', en: "You don't have enough money" },
  'garage.repaired': { it: 'Auto riparata come nuova!', en: 'Car repaired, good as new!' },
  'garage.needMoney': { it: 'Ti servono €{n}', en: 'You need €{n}' },
  'garage.bought': { it: '{name} acquistata!', en: '{name} bought!' },
  'garage.delivered': { it: 'Ecco la tua {name}!', en: 'Here is your {name}!' },
  'garage.fine': { it: 'già a posto', en: 'already fine' },
  'garage.carNeeded': { it: "serve un'auto", en: 'car needed' },
  'garage.collect': { it: 'RITIRA', en: 'COLLECT' },

  // what people say (speech bubbles)
  'say.taxi': { it: ['Taxi!', 'Ehi, taxi!', 'Di qua!'], en: ['Taxi!', 'Hey, taxi!', 'Over here!'] },
  'say.hit': { it: ['Ahi!', 'Ouch!', 'Mamma mia!', 'Ma che fai?!'], en: ['Ow!', 'Ouch!', 'Mamma mia!', 'What are you doing?!'] },
  'say.dodge': {
    it: ['Ehi!', 'Attento!', 'Guarda dove vai!', 'Ma sei matto?!'],
    en: ['Hey!', 'Watch out!', 'Look where you are going!', 'Are you crazy?!'],
  },
  'say.stolen': {
    it: ['La mia macchina!', 'Al ladro!', 'Mamma mia!', 'Ma che fai?!'],
    en: ['My car!', 'Stop, thief!', 'Mamma mia!', 'What are you doing?!'],
  },
  'say.stolenPolice': { it: 'Ehi! Quella è dello Stato!', en: "Hey! That's government property!" },
  'say.honked': { it: ['Ehi!', 'Calma!', "Ma va' là!", 'Che fretta!'], en: ['Hey!', 'Calm down!', 'Oh come on!', "What's the rush!"] },
  'say.pullOver': { it: 'Accosti subito!', en: 'Pull over now!' },
  'say.crashed': {
    it: ['Ehi!!', 'La mia fiancata!', 'Assicurazione!', 'Ma dove guardi?!'],
    en: ['Hey!!', 'My door!', 'Insurance!', 'Where are you looking?!'],
  },
  'say.ouch': { it: 'Ahi!', en: 'Ow!' },
  'say.horn': { it: 'BEEP BEEP!', en: 'BEEP BEEP!' },
};
