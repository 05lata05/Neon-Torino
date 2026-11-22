// Tastiera e mouse, avvio della partita.
import { RADIO } from '../audio/radio.js';
import { AC, initAudio, master } from '../audio/sfx.js';
import { G } from './game.js';
import { glc } from './render.js';
import { player } from './state.js';
import { blockedN, makeCar } from '../entities/vehicles.js';
import { garageKey } from '../gameplay/garage.js';
import { newOffer } from '../gameplay/missions.js';
import { exitCar, honk, tryEnterCar } from '../gameplay/player.js';
import { updateCamera } from '../render/camera.js';
import { quality, setQuality } from '../render/quality.js';
import { toast } from '../world/effects.js';
import { SPAWN } from '../world/map.js';

export let keys;

export function onPress(k) {
  initAudio();
  if (G.state === 'title') {
    if (k === 'Enter' || k === 'Space') startGame();
    return;
  }
  if (G.state === 'garage') {
    garageKey(k);
    return;
  }
  if (G.state === 'map') {
    if (k === 'KeyM' || k === 'Escape') G.state = 'play';
    return;
  }
  if (k === 'KeyP' || k === 'Escape') {
    G.state = G.state === 'pause' ? 'play' : 'pause';
    return;
  }
  if (k === 'KeyV') {
    G.audioOn = !G.audioOn;
    if (master) master.gain.setTargetAtTime(G.audioOn ? 0.8 : 0, AC.currentTime, 0.05);
    toast(G.audioOn ? 'Audio attivo' : 'Audio disattivato', 1.2);
    return;
  }
  if (k === 'KeyQ') {
    setQuality(1 - quality);
    G.perfDone = true;
    toast('Grafica ' + (quality ? 'alta (ombre attive)' : 'bassa (più fluida)'), 1.6);
    return;
  }
  if (G.state !== 'play') return;
  if (k === 'KeyM') {
    G.state = 'map';
    return;
  }
  if (G.bustT > 0) return;
  if (k === 'KeyE' || k === 'KeyF') {
    if (player.car) exitCar(false);
    else if (player.stun <= 0) tryEnterCar();
  }
  if (k === 'KeyH' && player.car) honk();
  if (k === 'KeyC') {
    G.camMode = 1 - G.camMode;
    updateCamera(0, true);
  }
  if (k === 'KeyR') {
    G.radioStation = (G.radioStation + 1) % RADIO.length;
    G.nextNoteT = 0;
    toast(G.radioStation ? 'Radio: ' + RADIO[G.radioStation].name : 'Radio spenta', 1.5);
  }
}
export function startGame() {
  initAudio();
  G.state = 'play';
  G.introT = 0;
  if (!G.started) {
    G.started = true;
    player.x = SPAWN.x;
    player.y = SPAWN.y;
    player.a = SPAWN.a;
    let s = null;
    for (const dd of [45, -45, 70, -70, 30, 95]) {
      const x = SPAWN.x + Math.cos(SPAWN.a) * dd,
        y = SPAWN.y + Math.sin(SPAWN.a) * dd,
        t = makeCar('sportiva', x, y, SPAWN.a);
      if (blockedN(t, x, y, SPAWN.a) === 0) {
        s = t;
        break;
      }
    }
    if (!s) s = makeCar('sportiva', SPAWN.x, SPAWN.y, SPAWN.a);
    s.col = '#ff2e88';
    s.keep = true;
    G.cars.push(s);
    for (let i = G.cars.length - 2; i >= 0; i--) {
      const c = G.cars[i];
      if (Math.hypot(c.x - s.x, c.y - s.y) < 70) G.cars.splice(i, 1);
    }
    newOffer('consegna');
    newOffer('corsa');
    newOffer('colpo');
    newOffer('taxi');
    toast("Benvenuto a Santa Rita, Torino! C'è una sportiva rosa qui accanto…", 4);
    updateCamera(0, true);
  }
}

export function init() {
  // ---------------- input ----------------
  keys = {};
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (!e.repeat) onPress(e.code);
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    if (G.state === 'play') G.state = 'pause';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') G.state = 'pause';
  });
  glc.addEventListener('pointerdown', () => {
    glc.focus();
    initAudio();
    if (G.state === 'title') startGame();
    else if (G.state === 'pause' || G.state === 'map') G.state = 'play';
  });
}
