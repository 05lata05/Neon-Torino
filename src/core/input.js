// Tastiera e mouse, avvio della partita.
import { togglePerf } from '../ui/perf.js';
import { RADIO, radioStation, setNextNoteT, setRadioStation } from '../audio/radio.js';
import { AC, audioOn, initAudio, master, setAudioOn } from '../audio/sfx.js';
import { glc } from './render.js';
import { bustT, camMode, cars, player, setCamMode, setIntroT, setStarted, setState, started, state } from './state.js';
import { blockedN, makeCar } from '../entities/vehicles.js';
import { garageKey } from '../gameplay/garage.js';
import { newOffer } from '../gameplay/missions.js';
import { exitCar, honk, tryEnterCar } from '../gameplay/player.js';
import { updateCamera } from '../render/camera.js';
import { quality, setPerfDone, setQuality } from '../render/quality.js';
import { toast } from '../world/effects.js';
import { SPAWN } from '../world/map.js';

export let keys;

export function onPress(k) {
  initAudio();
  if (state === 'title') {
    if (k === 'Enter' || k === 'Space') startGame();
    return;
  }
  if (state === 'garage') {
    garageKey(k);
    return;
  }
  if (state === 'map') {
    if (k === 'KeyM' || k === 'Escape') setState('play');
    return;
  }
  if (k === 'KeyP' || k === 'Escape') {
    setState(state === 'pause' ? 'play' : 'pause');
    return;
  }
  if (k === 'KeyV') {
    setAudioOn(!audioOn);
    if (master) master.gain.setTargetAtTime(audioOn ? 0.8 : 0, AC.currentTime, 0.05);
    toast(audioOn ? 'Audio attivo' : 'Audio disattivato', 1.2);
    return;
  }
  if (k === 'KeyI') {
    togglePerf();
    return;
  }
  if (k === 'KeyQ') {
    setQuality(1 - quality);
    setPerfDone(true);
    toast('Grafica ' + (quality ? 'alta (ombre attive)' : 'bassa (più fluida)'), 1.6);
    return;
  }
  if (state !== 'play') return;
  if (k === 'KeyM') {
    setState('map');
    return;
  }
  if (bustT > 0) return;
  if (k === 'KeyE' || k === 'KeyF') {
    if (player.car) exitCar(false);
    else if (player.stun <= 0) tryEnterCar();
  }
  if (k === 'KeyH' && player.car) honk();
  if (k === 'KeyC') {
    setCamMode(1 - camMode);
    updateCamera(0, true);
  }
  if (k === 'KeyR') {
    setRadioStation((radioStation + 1) % RADIO.length);
    setNextNoteT(0);
    toast(radioStation ? 'Radio: ' + RADIO[radioStation].name : 'Radio spenta', 1.5);
  }
}
export function startGame() {
  initAudio();
  setState('play');
  setIntroT(0);
  if (!started) {
    setStarted(true);
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
    cars.push(s);
    for (let i = cars.length - 2; i >= 0; i--) {
      const c = cars[i];
      if (Math.hypot(c.x - s.x, c.y - s.y) < 70) cars.splice(i, 1);
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
    if (state === 'play') setState('pause');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') setState('pause');
  });
  glc.addEventListener('pointerdown', () => {
    glc.focus();
    initAudio();
    if (state === 'title') startGame();
    else if (state === 'pause' || state === 'map') setState('play');
  });
}
