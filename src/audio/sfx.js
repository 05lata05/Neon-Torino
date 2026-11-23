// Audio: motore, sirene, elicottero, pioggia ed effetti.
import { rain, rainA, setRainA } from '../world/weather.js';
import { radioStation } from './radio.js';
import { keys } from '../core/input.js';
import { bustT, camYaw, cars, gtime, player, state } from '../core/state.js';
import { clamp } from '../core/util.js';
import { heli } from '../entities/heli.js';

// stato di proprietà di questo modulo: gli altri moduli lo leggono e lo cambiano con le funzioni set…()
export let audioOn;
export function setAudioOn(v) {
  audioOn = v;
}

export let AC, master, noiseBuf, eng, skidA, sirenA, heliA, radioBus, sfx;

export function initAudio() {
  if (AC) {
    if (AC.state === 'suspended') AC.resume();
    return;
  }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    AC = null;
    return;
  }
  master = AC.createGain();
  master.gain.value = audioOn ? 0.8 : 0;
  const comp = AC.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  {
    const o1 = AC.createOscillator(),
      o2 = AC.createOscillator(),
      f = AC.createBiquadFilter(),
      g = AC.createGain();
    o1.type = 'sawtooth';
    o2.type = 'square';
    f.type = 'lowpass';
    f.frequency.value = 700;
    g.gain.value = 0;
    o1.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(master);
    o1.start();
    o2.start();
    eng = { o1, o2, f, g };
  }
  {
    const n = AC.createBufferSource(),
      bp = AC.createBiquadFilter(),
      g = AC.createGain();
    n.buffer = noiseBuf;
    n.loop = true;
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 3;
    g.gain.value = 0;
    n.connect(bp);
    bp.connect(g);
    g.connect(master);
    n.start();
    skidA = { g };
  }
  {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = 'triangle';
    g.gain.value = 0;
    o.connect(g);
    let pan = null;
    if (AC.createStereoPanner) {
      pan = AC.createStereoPanner();
      g.connect(pan);
      pan.connect(master);
    } else g.connect(master);
    o.start();
    sirenA = { o, g, pan };
  }
  {
    const n = AC.createBufferSource(),
      lp = AC.createBiquadFilter(),
      am = AC.createGain(),
      g = AC.createGain(),
      lfo = AC.createOscillator(),
      lg = AC.createGain();
    n.buffer = noiseBuf;
    n.loop = true;
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    am.gain.value = 0.5;
    lfo.frequency.value = 13;
    lg.gain.value = 0.5;
    g.gain.value = 0;
    lfo.connect(lg);
    lg.connect(am.gain);
    n.connect(lp);
    lp.connect(am);
    am.connect(g);
    g.connect(master);
    n.start();
    lfo.start();
    heliA = { g };
  }
  {
    const n = AC.createBufferSource(),
      bp = AC.createBiquadFilter(),
      g = AC.createGain();
    n.buffer = noiseBuf;
    n.loop = true;
    bp.type = 'highpass';
    bp.frequency.value = 1400;
    g.gain.value = 0;
    n.connect(bp);
    bp.connect(g);
    g.connect(master);
    n.start();
    setRainA({ g });
  }
  radioBus = AC.createGain();
  radioBus.gain.value = 0;
  radioBus.connect(master);
}
export function tone(f, dur, type, vol, delay, slide) {
  if (!AC) return;
  const t = AC.currentTime + (delay || 0),
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export function noiseHit(vol, dur, freq) {
  if (!AC) return;
  const t = AC.currentTime,
    s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(Math.max(0.001, vol), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}
export function updateAudio(dt) {
  if (!AC) return;
  const t = AC.currentTime,
    live = state === 'play' && bustT <= 0;
  const c = live && player.car && !player.car.wreck ? player.car : null;
  if (c) {
    const sp = Math.hypot(c.vx, c.vy),
      ratio = Math.min(1.35, sp / c.d.max) * 4,
      gear = Math.min(4, Math.floor(ratio)),
      rpm = gear < 4 ? ratio - gear : 1 + (ratio - 4) * 0.5;
    const base =
        c.type === 'van' || c.type === 'armored' || c.type === 'bus'
          ? 36
          : c.type === 'compact'
            ? 58
            : c.type === 'lightning'
              ? 62
              : 50,
      f = base + (0.25 + rpm * 0.75) * 120 + (player.boosting ? 40 : 0),
      thr = keys.KeyW || keys.ArrowUp;
    eng.o1.frequency.setTargetAtTime(f, t, 0.06);
    eng.o2.frequency.setTargetAtTime(f * 0.502, t, 0.06);
    eng.f.frequency.setTargetAtTime(thr ? 1600 + rpm * 1200 : 700, t, 0.08);
    eng.g.gain.setTargetAtTime(thr ? 0.075 : 0.045, t, 0.08);
    skidA.g.gain.setTargetAtTime(c.skid && c.z < 1 ? 0.07 : 0, t, 0.05);
  } else {
    eng.g.gain.setTargetAtTime(0, t, 0.1);
    skidA.g.gain.setTargetAtTime(0, t, 0.05);
  }
  let best = null,
    bd = 900;
  if (live)
    for (const o of cars)
      if (o.siren) {
        const d = Math.hypot(o.x - player.x, o.y - player.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
  if (best) {
    sirenA.o.frequency.setTargetAtTime(Math.floor(gtime * 1.7) % 2 ? 740 : 988, t, 0.01);
    sirenA.g.gain.setTargetAtTime(0.05 * (1 - bd / 900), t, 0.1);
    if (sirenA.pan) {
      const rx = Math.cos(camYaw + Math.PI / 2),
        ry = Math.sin(camYaw + Math.PI / 2);
      sirenA.pan.pan.setTargetAtTime(clamp(((best.x - player.x) * rx + (best.y - player.y) * ry) / Math.max(60, bd), -1, 1) * 0.8, t, 0.1);
    }
  } else sirenA.g.gain.setTargetAtTime(0, t, 0.15);
  heliA.g.gain.setTargetAtTime(live && heli ? 0.16 * clamp(1 - Math.hypot(heli.x - player.x, heli.y - player.y) / 1400, 0, 1) : 0, t, 0.2);
  radioBus.gain.setTargetAtTime(live && player.car && radioStation ? 0.32 : 0, t, 0.3);
  if (rainA) rainA.g.gain.setTargetAtTime(state !== 'title' ? 0.05 * rain : 0, t, 0.3);
}

export function init() {
  // ---------------- audio ----------------
  AC = null;
  master = null;
  noiseBuf = null;
  eng = null;
  skidA = null;
  sirenA = null;
  heliA = null;
  radioBus = null;
  audioOn = true;
  sfx = {
    crash(imp) {
      if (!AC) return;
      const v = Math.min(0.5, imp / 700);
      noiseHit(v, 0.35, 700);
      tone(70, 0.3, 'sine', v * 0.8, 0, 35);
    },
    boom() {
      noiseHit(0.6, 1.0, 400);
      tone(55, 0.8, 'sine', 0.5, 0, 25);
    },
    horn() {
      tone(392, 0.4, 'square', 0.05);
      tone(494, 0.4, 'square', 0.04);
    },
    coin() {
      tone(988, 0.09, 'square', 0.05);
      tone(1319, 0.16, 'square', 0.05, 0.08);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, i * 0.11));
    },
    fail() {
      [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.15));
    },
    heat() {
      tone(1200, 0.08, 'square', 0.04);
      tone(1200, 0.08, 'square', 0.04, 0.13);
    },
    stunt() {
      tone(300, 0.5, 'sawtooth', 0.05, 0, 1200);
    },
    land(imp) {
      noiseHit(Math.min(0.35, imp / 900), 0.2, 500);
    },
    nitro() {
      noiseHit(0.18, 0.6, 2500);
      tone(200, 0.5, 'sawtooth', 0.04, 0, 600);
    },
    ui() {
      tone(660, 0.06, 'square', 0.04);
    },
  };
}
