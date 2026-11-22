// Aggiornamento logico a ogni frame: mondo, giocatore, missioni, spawn.
import { G } from './game.js';
import { camera } from './render.js';
import { parts, player, toasts, wanted } from './state.js';
import { rand } from './util.js';
import { collideCars } from '../entities/collisions.js';
import { updateHeli } from '../entities/heli.js';
import { updatePeds } from '../entities/peds.js';
import { copAI, makeCop, respawnAfterBust, updateWanted } from '../entities/police.js';
import { manageSpawns } from '../entities/spawn.js';
import { trafficAI } from '../entities/traffic.js';
import { updateTrams } from '../entities/trams.js';
import { carPhysics } from '../entities/vehicles.js';
import { updateGarage } from '../gameplay/garage.js';
import { updateMission } from '../gameplay/missions.js';
import { boundaryCheck, playerCarCollide, updatePlayer } from '../gameplay/player.js';
import { updateTokens } from '../gameplay/tokens.js';
import { freeSprites, puff } from '../world/effects.js';
import { SPAWN } from '../world/map.js';
import { updateWeather } from '../world/weather.js';

// ---------------- aggiornamento logico ----------------
export function updateWorld(dt) {
  updateTrams(dt);
  for (const c of G.cars) {
    if (c === player.car) continue;
    if (c.wreck || !c.driver || c.driver === 'idle') carPhysics(c, 0, 0, true, dt);
    else if (c.driver === 'npc') {
      if (wanted.level > 0 && c.type === 'polizia' && G.state === 'play' && Math.hypot(c.x - player.x, c.y - player.y) < 650) {
        makeCop(c);
        copAI(c, dt);
      } else trafficAI(c, dt);
    } else if (c.driver === 'cop') copAI(c, dt);
  }
  collideCars();
  for (const c of G.cars) {
    if (c.heatCd > 0) c.heatCd -= dt;
    if (Math.abs(c.x - camera.position.x) > 1300 || Math.abs(c.y - camera.position.z) > 1300) continue;
    if (c.wreck) {
      if (c.burn > 0) {
        c.burn -= dt;
        if (Math.random() < 0.5)
          puff(
            c.x + rand(-8, 8),
            c.y + rand(-6, 6),
            Math.random() < 0.5 ? '#ff8c1a' : '#ffd23f',
            rand(4, 7),
            rand(0.3, 0.6),
            rand(-10, 10),
            rand(-10, 10),
            14,
            0.9,
            10,
            rand(15, 35),
          );
      }
      if (Math.random() < 0.25)
        puff(c.x, c.y, '#333333', rand(6, 10), rand(1.2, 2.2), rand(-15, 15), rand(-15, 15), 14, 0.5, 14, rand(20, 40));
    } else if (c.hp < c.d.hp * 0.35 && Math.random() < 0.2)
      puff(
        c.x + Math.cos(c.a) * c.d.len * 0.4,
        c.y + Math.sin(c.a) * c.d.len * 0.4,
        '#999999',
        rand(4, 7),
        rand(0.8, 1.5),
        rand(-10, 10),
        rand(-10, 10),
        12,
        0.45,
        9,
        rand(15, 30),
      );
  }
  updatePeds(dt);
  if (G.state === 'play' && !player.car && G.bustT <= 0) playerCarCollide();
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      p.s.visible = false;
      freeSprites.push(p.s);
      parts.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.h += p.vh * dt;
    p.r += p.grow * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.grow === 0) p.vh -= 200 * dt;
  }
  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    G.bubbles[i].t -= dt;
    if (G.bubbles[i].t <= 0) G.bubbles.splice(i, 1);
  }
}
export function update(dt) {
  if (G.state === 'pause' || G.state === 'map' || G.state === 'garage') return;
  G.gtime += dt;
  G.lightT += dt;
  G.clockT += dt;
  G.shake *= Math.exp(-dt * 6);
  updateWeather(dt);
  for (let i = toasts.length - 1; i >= 0; i--) {
    toasts[i].t -= dt;
    if (toasts[i].t <= 0) toasts.splice(i, 1);
  }
  if (G.big) {
    G.big.t -= dt;
    if (G.big.t <= 0) G.big = null;
  }
  if (G.state === 'title') {
    updateWorld(dt);
    manageSpawns(dt, SPAWN.x, SPAWN.y);
    return;
  }
  G.introT += dt;
  if (G.bustT > 0) {
    G.bustT -= dt;
    if (G.bustT <= 0) respawnAfterBust();
  } else updatePlayer(dt);
  updateWorld(dt);
  if (G.bustT <= 0) {
    updateWanted(dt);
    updateMission(dt);
    updateTokens();
    updateGarage();
    boundaryCheck();
  }
  updateHeli(dt);
  manageSpawns(dt, player.x, player.y);
}
