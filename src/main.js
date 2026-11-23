// Avvio: inizializza i moduli nell'ordine giusto, popola la città e fa girare il ciclo di gioco.
import { scheduleRadio } from './audio/radio.js';
import { updateAudio } from './audio/sfx.js';
import { startGame } from './core/input.js';
import { camera, renderer, scene } from './core/render.js';
import { cars, mission, money, offers, peds, player, setClockT, setMoney, state, wanted } from './core/state.js';
import { update } from './core/update.js';
import { heli } from './entities/heli.js';
import { populate } from './entities/spawn.js';
import { tramRoutes, trams } from './entities/trams.js';
import { GARAGE } from './gameplay/garage.js';
import { ramps } from './gameplay/ramps.js';
import { tokens } from './gameplay/tokens.js';
import { camOverride, setCamOverride, updateCamera, updateEnv } from './render/camera.js';
import { perfCheck } from './render/quality.js';
import { syncScene } from './render/sync.js';
import { drawHUD } from './ui/hud.js';
import { LMX } from './world/city.js';
import { refreshChunks } from './world/ground.js';
import { DATA, SPAWN, signals, toW } from './world/map.js';
import { makeCar } from './entities/vehicles.js';
import { init as init_core_render } from './core/render.js';
import { init as init_core_util } from './core/util.js';
import { init as init_world_map } from './world/map.js';
import { init as init_world_ground } from './world/ground.js';
import { init as init_world_lights } from './world/lights.js';
import { init as init_world_city } from './world/city.js';
import { init as init_world_skyline } from './world/skyline.js';
import { init as init_world_weather, rain, setFogTarget, setFogW, setRain, setRainTarget } from './world/weather.js';
import { init as init_entities_trams } from './entities/trams.js';
import { init as init_core_state } from './core/state.js';
import { init as init_entities_vehicles } from './entities/vehicles.js';
import { init as init_entities_peds } from './entities/peds.js';
import { init as init_entities_traffic } from './entities/traffic.js';
import { init as init_entities_police } from './entities/police.js';
import { init as init_world_effects } from './world/effects.js';
import { init as init_gameplay_missions } from './gameplay/missions.js';
import { init as init_entities_spawn } from './entities/spawn.js';
import { init as init_render_models } from './render/models.js';
import { init as init_render_sync } from './render/sync.js';
import { init as init_render_camera } from './render/camera.js';
import { init as init_ui_hud } from './ui/hud.js';
import { init as init_gameplay_ramps } from './gameplay/ramps.js';
import { init as init_gameplay_tokens } from './gameplay/tokens.js';
import { init as init_gameplay_garage } from './gameplay/garage.js';
import { init as init_entities_heli } from './entities/heli.js';
import { init as init_render_quality } from './render/quality.js';
import { init as init_audio_sfx } from './audio/sfx.js';
import { init as init_audio_radio } from './audio/radio.js';
import { init as init_gameplay_player } from './gameplay/player.js';
import { init as init_core_input } from './core/input.js';

let ld, last;

export function frame(now) {
  const raw = (now - last) / 1000,
    dt = Math.min(0.033, raw);
  last = now;
  try {
    update(dt);
    syncScene(dt);
    updateCamera(dt, false);
    updateEnv();
    refreshChunks(dt);
    renderer.render(scene, camera);
    drawHUD();
    updateAudio(dt);
    scheduleRadio();
    perfCheck(raw);
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

init_core_render();
init_core_util();
await init_world_map();
init_world_ground();
init_world_lights();
init_world_city();
init_world_skyline();
init_world_weather();
init_entities_trams();
init_core_state();
init_entities_vehicles();
init_entities_peds();
init_entities_traffic();
init_entities_police();
init_world_effects();
init_gameplay_missions();
init_entities_spawn();
init_render_models();
init_render_sync();
init_render_camera();
init_ui_hud();
init_gameplay_ramps();
init_gameplay_tokens();
init_gameplay_garage();
init_entities_heli();
init_render_quality();
init_audio_sfx();
init_audio_radio();
init_gameplay_player();
init_core_input();
// ---------------- avvio ----------------
populate(SPAWN.x, SPAWN.y);
ld = document.getElementById('load');
if (ld) ld.remove();
last = performance.now();
requestAnimationFrame(frame);
// strumenti per test e debug (vedi tests/smoke.mjs)
window.__nr = {
  // fa avanzare la simulazione a passi fissi, indipendentemente dagli fps (i tasti premuti restano validi)
  step(sec) {
    for (let t = 0; t < sec; t += 1 / 30) update(1 / 30);
    syncScene(0);
  },
  // fa comparire un'auto ferma accanto al giocatore, orientata come la strada di partenza
  spawnCar(type, dist = 10) {
    const a = SPAWN.a,
      c = makeCar(type, player.x + Math.cos(a) * dist, player.y + Math.sin(a) * dist, a);
    cars.push(c);
    return cars.length - 1;
  },
  teleport(x, y) {
    player.x = x;
    player.y = y;
  },
  SPAWN,
  landmarks: LMX,
  L: DATA.L,
  toW,
  set cam(v) {
    setCamOverride(v);
  },
  get cam() {
    return camOverride;
  },
  setHour(h) {
    setClockT(((h - 17 + 24) % 24) * 15);
  },
  get rain() {
    return rain;
  },
  set fogT(v) {
    setFogTarget(v);
    setFogW(v);
  },
  trams,
  tramRoutes,
  set rainT(v) {
    setRainTarget(v);
    setRain(v);
  },
  signals,
  get heli() {
    return heli;
  },
  tokens,
  ramps,
  GARAGE,
  get money() {
    return money;
  },
  set money(v) {
    setMoney(v);
  },
  set clock(v) {
    setClockT(v);
  },
  get state() {
    return state;
  },
  player,
  get cars() {
    return cars;
  },
  get peds() {
    return peds;
  },
  wanted,
  get mission() {
    return mission;
  },
  get offers() {
    return offers;
  },
  startGame,
  renderer,
};
