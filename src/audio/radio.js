// Radio with music generated on the fly.
import { AC, noiseBuf, radioBus } from './sfx.js';

// state owned by this module: other modules read it and change it with the set…() functions
export let nextNoteT, radioStation;
export function setNextNoteT(v) {
  nextNoteT = v;
}
export function setRadioStation(v) {
  radioStation = v;
}

export let RADIO, rStep, mf, SYN, LNG;

export function rKick(t, v) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g);
  g.connect(radioBus);
  o.start(t);
  o.stop(t + 0.3);
}
export function rNoise(t, dur, vol, hp) {
  const s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = noiseBuf;
  f.type = 'highpass';
  f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(radioBus);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.02);
}
export function rNote(t, m, dur, type, vol, cut, att, det) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.value = mf(m);
  if (det) o.detune.value = det;
  const a = att || 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.02));
  let n = o;
  if (cut) {
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cut;
    o.connect(f);
    n = f;
  }
  n.connect(g);
  g.connect(radioBus);
  o.start(t);
  o.stop(t + Math.max(dur, a + 0.02) + 0.05);
}
export function playStep(st, s, t, s16) {
  const bar = Math.floor(s / 16) % 4,
    b = s % 16;
  if (st.kind === 'synth') {
    const ch = SYN[bar];
    if (b % 4 === 0) rKick(t, 0.55);
    if (b === 4 || b === 12) rNoise(t, 0.18, 0.22, 1800);
    if (b % 4 === 2) rNoise(t, 0.05, 0.07, 7000);
    if (b % 2 === 0) rNote(t, ch[0] - 12 + (b % 4 === 2 ? 12 : 0), s16 * 1.8, 'sawtooth', 0.1, 700);
    const arp = [ch[0], ch[1], ch[2], ch[0] + 12];
    rNote(t, arp[b % 4] + 24, s16 * 0.9, 'square', 0.03, 2600);
    if (b === 0)
      for (const n of ch) {
        rNote(t, n + 12, s16 * 16, 'sawtooth', 0.022, 1400, 0.4, 7);
        rNote(t, n + 12, s16 * 16, 'sawtooth', 0.022, 1400, 0.4, -7);
      }
  } else {
    const ch = LNG[bar];
    if (b % 4 === 0) rNote(t, ch[b / 4] - 12, s16 * 3.6, 'triangle', 0.16, 800);
    if (b === 0 || b === 6 || b === 10)
      for (const n of ch) rNote(t + (b === 6 ? s16 * 0.33 : 0), n + 12, s16 * 3, 'sine', 0.04, 3000, 0.01);
    if (b % 4 === 0) rNoise(t, 0.12, 0.045, 6000);
    if (b === 4 || b === 12) rNoise(t, 0.2, 0.06, 2500);
  }
}
export function scheduleRadio() {
  if (!AC || !radioBus || radioStation === 0) return;
  const st = RADIO[radioStation],
    s16 = 60 / st.bpm / 4;
  if (nextNoteT < AC.currentTime - 0.1) nextNoteT = AC.currentTime + 0.05;
  while (nextNoteT < AC.currentTime + 0.15) {
    playStep(st, rStep, nextNoteT, s16);
    nextNoteT += s16;
    rStep = (rStep + 1) % 64;
  }
}

export function init() {
  // ---------------- radio (generated music) ----------------
  RADIO = [null, { name: 'Radio Mole FM', bpm: 104, kind: 'synth' }, { name: 'Po Lounge', bpm: 86, kind: 'lounge' }];
  radioStation = 1;
  nextNoteT = 0;
  rStep = 0;
  mf = m => 440 * Math.pow(2, (m - 69) / 12);
  SYN = [
    [45, 48, 52],
    [41, 45, 48],
    [48, 52, 55],
    [43, 47, 50],
  ];
  LNG = [
    [50, 53, 57, 60],
    [55, 59, 62, 65],
    [48, 52, 55, 59],
    [57, 61, 64, 67],
  ];
}
