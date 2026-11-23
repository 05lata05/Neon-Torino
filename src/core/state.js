// Game state: player, wanted level, save data, lists of cars and pedestrians.
import { SPAWN } from '../world/map.js';

// state owned by this module: other modules read it and change it with the set…() functions
export let big, bubbles, bustT, camMode, camYaw, cars, clockT, frameN, gtime, introT, lightT, mission, money, shake, started, state;
export function setBig(v) {
  big = v;
}
export function setBubbles(v) {
  bubbles = v;
}
export function setBustT(v) {
  bustT = v;
}
export function setCamMode(v) {
  camMode = v;
}
export function setCamYaw(v) {
  camYaw = v;
}
export function setCars(v) {
  cars = v;
}
export function setClockT(v) {
  clockT = v;
}
export function setFrameN(v) {
  frameN = v;
}
export function setGtime(v) {
  gtime = v;
}
export function setIntroT(v) {
  introT = v;
}
export function setLightT(v) {
  lightT = v;
}
export function setMission(v) {
  mission = v;
}
export function setMoney(v) {
  money = v;
}
export function setShake(v) {
  shake = v;
}
export function setStarted(v) {
  started = v;
}
export function setState(v) {
  state = v;
}

export let save, peds, parts, toasts, offers, offerQueue, SKINS, player, wanted;

export function saveMoney() {
  try {
    localStorage.setItem('neonriviera3d_save', JSON.stringify({ money: money, tokens: save.tokens, owned: save.owned, done: save.done }));
  } catch (e) {}
}

export function init() {
  // ---------------- state ----------------
  state = 'title';
  gtime = 0;
  lightT = 0;
  clockT = 0;
  shake = 0;
  bustT = 0;
  introT = 0;
  frameN = 0;
  camMode = 0;
  camYaw = 0;
  money = 0;
  save = { tokens: [], owned: {}, done: 0 };
  try {
    const sv = JSON.parse(localStorage.getItem('neonriviera3d_save') || 'null');
    if (sv) {
      money = sv.money || 0;
      save.tokens = sv.tokens || [];
      save.owned = sv.owned || {};
      save.done = sv.done || 0;
    } else money = parseInt(localStorage.getItem('neonriviera_money') || '0', 10) || 0;
  } catch (e) {}
  cars = [];
  peds = [];
  parts = [];
  bubbles = [];
  toasts = [];
  big = null;
  offers = [];
  mission = null;
  offerQueue = [];
  SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  player = {
    x: SPAWN.x,
    y: SPAWN.y,
    a: 0,
    car: null,
    stun: 0,
    t: 0,
    moving: false,
    shirt: '#00e08a',
    hair: '#1b1b1b',
    skin: '#e0ac69',
    lastCar: null,
    down: 0,
  };
  wanted = { level: 0, lost: 0, seen: false, bust: 0, lastX: 0, lastY: 0, flash: 0 };
  started = false;
}
