// Stato della partita: giocatore, ricercato, salvataggio, liste di auto e pedoni.
import { G } from './game.js';
import { SPAWN } from '../world/map.js';

export let save, peds, parts, toasts, offers, offerQueue, SKINS, player, wanted;

export function saveMoney() {
  try {
    localStorage.setItem('neonriviera3d_save', JSON.stringify({ money: G.money, tokens: save.tokens, owned: save.owned, done: save.done }));
  } catch (e) {}
}

export function init() {
  // ---------------- stato ----------------
  G.state = 'title';
  G.gtime = 0;
  G.lightT = 0;
  G.clockT = 0;
  G.shake = 0;
  G.bustT = 0;
  G.introT = 0;
  G.frameN = 0;
  G.camMode = 0;
  G.camYaw = 0;
  G.money = 0;
  save = { tokens: [], owned: {}, done: 0 };
  try {
    const sv = JSON.parse(localStorage.getItem('neonriviera3d_save') || 'null');
    if (sv) {
      G.money = sv.money || 0;
      save.tokens = sv.tokens || [];
      save.owned = sv.owned || {};
      save.done = sv.done || 0;
    } else G.money = parseInt(localStorage.getItem('neonriviera_money') || '0', 10) || 0;
  } catch (e) {}
  G.cars = [];
  peds = [];
  parts = [];
  G.bubbles = [];
  toasts = [];
  G.big = null;
  offers = [];
  G.mission = null;
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
  G.started = false;
}
