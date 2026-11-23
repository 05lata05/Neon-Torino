// Gettoni neon da collezionare.
import { REWARDS } from '../config.js';
import * as THREE from 'three';
import { sfx } from '../audio/sfx.js';
import { scene } from '../core/render.js';
import { money, player, save, saveMoney, setMoney } from '../core/state.js';
import { bigMsg, puffTex, toast } from '../world/effects.js';
import { GH, GW, OPEN, PARK, SPAWN, T, nearestEdge, tileAt } from '../world/map.js';

export let gseed, grnd, tokens, coinGeo, coinM, coinGlowM;

export function updateTokens() {
  for (const t of tokens) {
    if (t.got) continue;
    if (Math.hypot(t.x - player.x, t.y - player.y) < 26 && (!player.car || player.car.z < 20)) {
      t.got = true;
      if (t.mesh) scene.remove(t.mesh);
      save.tokens.push(t.id);
      setMoney(money + REWARDS.token);
      const n = tokens.filter(o => o.got).length;
      sfx.coin();
      if (n === tokens.length) {
        setMoney(money + REWARDS.allTokens);
        bigMsg('TUTTI I GETTONI!', 'Hai esplorato tutta la città: +€' + REWARDS.allTokens.toLocaleString('it-IT'), '#ffd23f', 4);
        sfx.win();
      } else toast('Gettone neon ' + n + '/' + tokens.length + '  (+€' + REWARDS.token + ')', 2);
      saveMoney();
    }
  }
}

export function init() {
  // ---------------- gettoni neon ----------------
  gseed = 4242;
  grnd = () => {
    gseed = (Math.imul(gseed, 1664525) + 1013904223) >>> 0;
    return gseed / 4294967296;
  };
  tokens = [];
  for (let tries = 0; tries < 20000 && tokens.length < 25; tries++) {
    const tx = Math.floor(grnd() * GW),
      ty = Math.floor(grnd() * GH),
      t = tileAt(tx, ty);
    if (!(t === PARK || t === OPEN)) continue;
    if (t === OPEN) {
      const ne = nearestEdge((tx + 0.5) * T, (ty + 0.5) * T, 60);
      if (!ne || ne.d < ne.e.w / 2 + 2 || ne.d > ne.e.w / 2 + 16) continue;
    }
    const x = (tx + 0.5) * T,
      y = (ty + 0.5) * T;
    if (Math.hypot(x - SPAWN.x, y - SPAWN.y) < 250) continue;
    if (tokens.some(o => Math.hypot(o.x - x, o.y - y) < 900)) continue;
    tokens.push({ id: tokens.length, x, y, got: save.tokens.includes(tokens.length), mesh: null, coin: null });
  }
  coinGeo = new THREE.CylinderGeometry(7, 7, 1.8, 24).rotateX(Math.PI / 2);
  coinM = new THREE.MeshStandardMaterial({
    color: '#ffd23f',
    emissive: '#ff2e88',
    emissiveIntensity: 0.55,
    metalness: 0.6,
    roughness: 0.3,
  });
  coinGlowM = new THREE.SpriteMaterial({
    map: puffTex,
    color: '#ff7ac8',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.7,
  });
  for (const t of tokens) {
    if (t.got) continue;
    const g = new THREE.Group();
    const m = new THREE.Mesh(coinGeo, coinM);
    m.castShadow = true;
    g.add(m);
    const s = new THREE.Sprite(coinGlowM);
    s.scale.set(34, 34, 1);
    g.add(s);
    g.position.set(t.x, 12, t.y);
    scene.add(g);
    t.mesh = g;
    t.coin = m;
  }
}
