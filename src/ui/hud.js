// HUD: soldi, ricercato, minimappa, tachimetro, messaggi, schermata iniziale.
import * as THREE from 'three';
import { RADIO } from '../audio/radio.js';
import { G } from '../core/game.js';
import { DPR, H, W, camera, ctx } from '../core/render.js';
import { offers, player, save, toasts, wanted } from '../core/state.js';
import { TAU, clamp, rr } from '../core/util.js';
import { heli } from '../entities/heli.js';
import { roadPath } from '../entities/police.js';
import { GARAGE, drawGarage } from '../gameplay/garage.js';
import { MT } from '../gameplay/missions.js';
import { tokens } from '../gameplay/tokens.js';
import { hour } from '../render/camera.js';
import { quality } from '../render/quality.js';
import { drawBigMap, gpsTarget } from './map.js';
import { MS, miniCv } from '../world/ground.js';
import { nearestEdge } from '../world/map.js';

export let _p, streetT, curStreet, HUDF, CONTROLS;

export function project(x, y, h) {
  _p.set(x, h, y).project(camera);
  return {
    x: ((_p.x + 1) / 2) * W,
    y: ((1 - _p.y) / 2) * H,
    behind: _p.z > 1,
    in: Math.abs(_p.x) <= 1 && Math.abs(_p.y) <= 1 && _p.z < 1 && _p.z > -1,
  };
}
export function outlineText(s, x, y, col, lw) {
  ctx.lineWidth = lw || 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}
export function drawHUD() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (G.state === 'title') {
    drawOverlay('NEON TORINO', ['Santa Rita e dintorni: strade e palazzi veri da OpenStreetMap.'], true);
    return;
  }
  ctx.font = 'bold 13px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of G.bubbles) {
    const e = b.ent;
    if (Math.hypot(e.x - camera.position.x, e.y - camera.position.z) > 900) continue;
    const pr = project(e.x, e.y, e.d ? 22 : 20);
    if (!pr.in) continue;
    const w = ctx.measureText(b.text).width + 14,
      sx = pr.x,
      y = pr.y - 14;
    ctx.globalAlpha = Math.min(1, b.t * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    rr(ctx, sx - w / 2, y - 11, w, 22, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx - 5, y + 10);
    ctx.lineTo(sx + 5, y + 10);
    ctx.lineTo(sx, y + 17);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillText(b.text, sx, y);
  }
  ctx.globalAlpha = 1;
  let tg = null;
  if (G.mission && G.mission.type !== 'colpo') tg = G.mission.steps[G.mission.idx];
  if (tg) {
    const pr = project(tg.x, tg.y, 30);
    if (!pr.in) {
      let dx = pr.x - W / 2,
        dy = pr.y - H / 2;
      if (pr.behind) {
        dx = -dx;
        dy = -dy;
      }
      const a = Math.atan2(dy, dx),
        ex = W / 2 - 60,
        ey = H / 2 - 60;
      const s = Math.min(Math.abs(ex / (Math.cos(a) || 1e-9)), Math.abs(ey / (Math.sin(a) || 1e-9))),
        ax = W / 2 + Math.cos(a) * s,
        ay = H / 2 + Math.sin(a) * s;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = MT[G.mission.type].col;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -13);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 13);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }
  const rx = W - 22;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const h = hour(),
    hh = Math.floor(h),
    mm = Math.floor((h - hh) * 60);
  ctx.font = 'bold 18px ' + HUDF;
  outlineText(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), rx, 34, '#e8f1ff', 4);
  ctx.font = 'bold 30px ' + HUDF;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 12;
  outlineText('€ ' + G.money.toLocaleString('it-IT'), rx, 72, '#ffe3f1');
  ctx.shadowBlur = 0;
  {
    const segW = 22,
      gap = 5,
      x0 = rx - 5 * segW - 4 * gap,
      y0 = 86,
      blink = wanted.level > 0 && !wanted.seen && Math.floor(G.gtime * 3) % 2 === 0,
      fl = wanted.flash > 0 && Math.floor(G.gtime * 10) % 2 === 0;
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'right';
    outlineText('CALORE', x0 - 8, y0 + 11, '#cbd5e1', 3);
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * (segW + gap),
        on = i < wanted.level;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      rr(ctx, x - 2, y0 - 2, segW + 4, 16, 4);
      ctx.fill();
      if (on && !blink) ctx.fillStyle = fl ? '#ffffff' : Math.floor(G.gtime * 6 + i) % 2 ? '#ff2d3c' : '#2d7bff';
      else ctx.fillStyle = on ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
      rr(ctx, x, y0, segW, 12, 3);
      ctx.fill();
    }
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 13px system-ui,sans-serif';
  outlineText('GETTONI ' + tokens.filter(t => t.got).length + '/' + tokens.length, rx, 124, '#ffd23f', 3);
  if (G.mission && G.mission.type !== 'colpo') {
    const t = Math.max(0, G.mission.time),
      s = Math.floor(t) % 60,
      m = Math.floor(t / 60);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px ' + HUDF;
    outlineText(m + ':' + String(s).padStart(2, '0'), W / 2, 48, t < 10 && Math.floor(G.gtime * 4) % 2 ? '#ff4d4d' : '#ffffff');
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let label = null,
    col = '#fff';
  if (G.mission) {
    label =
      G.mission.type === 'colpo'
        ? wanted.level > 0
          ? 'Semina la polizia! (resta fuori dalla loro vista)'
          : 'Fatto!'
        : G.mission.steps[G.mission.idx].label;
    col = MT[G.mission.type].col;
  } else if (G.introT < 30) label = 'Raggiungi un fascio di luce missione (C · R · T · €) — li vedi sulla minimappa';
  if (G.state === 'play') {
    if (!(streetT > G.gtime)) {
      streetT = G.gtime + 0.3;
      const ne = nearestEdge(player.x, player.y, 90);
      curStreet = ne && ne.e.name ? ne.e.name : '';
    }
    if (curStreet) {
      ctx.font = 'italic bold 19px ' + HUDF;
      outlineText(curStreet, W / 2, label ? H - 80 : H - 44, '#fff7e0', 4);
    }
  }
  if (label) {
    ctx.font = 'bold 16px system-ui,sans-serif';
    const w = ctx.measureText(label).width + 36;
    ctx.fillStyle = 'rgba(8,10,20,0.72)';
    rr(ctx, W / 2 - w / 2, H - 58, w, 34, 17);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillText(label, W / 2, H - 41);
  }
  if (!player.car && G.bustT <= 0) {
    let best = null,
      bd = 50;
    for (const c of G.cars) {
      if (c.wreck) continue;
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) {
      const t = best.type === 'polizia' ? "[E] Ruba l'auto della polizia" : best.driver === 'npc' ? "[E] Ruba l'auto" : '[E] Sali';
      const pr = project(best.x, best.y, 24);
      if (pr.in) {
        ctx.font = 'bold 13px system-ui,sans-serif';
        const w = ctx.measureText(t).width + 16;
        ctx.fillStyle = 'rgba(8,10,20,0.75)';
        rr(ctx, pr.x - w / 2, pr.y - 30, w, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(t, pr.x, pr.y - 19);
      }
    }
  }
  if (player.car) {
    const c = player.car,
      kmh = Math.round(Math.hypot(c.vx, c.vy) * 0.38);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 40px ' + HUDF;
    outlineText(String(kmh), W - 70, H - 34, '#ffffff');
    ctx.font = 'bold 14px system-ui,sans-serif';
    outlineText('km/h', W - 22, H - 36, '#cbd5e1', 3);
    outlineText(c.d.name, W - 22, H - 84, '#e2e8f0', 3);
    const hp = c.hp / c.d.hp;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, W - 142, H - 24, 120, 8, 4);
    ctx.fill();
    ctx.fillStyle = hp > 0.5 ? '#3ae374' : hp > 0.25 ? '#ffd32a' : '#ff4d4d';
    rr(ctx, W - 142, H - 24, 120 * Math.max(0, hp), 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, W - 142, H - 13, 120, 6, 3);
    ctx.fill();
    ctx.fillStyle = player.boosting ? '#ffffff' : '#38bdf8';
    rr(ctx, W - 142, H - 13, 120 * c.nitro, 6, 3);
    ctx.fill();
    ctx.font = 'bold 12px system-ui,sans-serif';
    ctx.textAlign = 'right';
    outlineText(G.radioStation ? '♪ ' + RADIO[G.radioStation].name : 'radio spenta', W - 22, H - 104, '#c4b5fd', 3);
  }
  {
    const R = Math.round(clamp(Math.min(W, H) * 0.13, 58, 92)),
      mx = 20 + R,
      my = H - 20 - R,
      sc = 0.045,
      k = sc / MS,
      cx = player.x,
      cy = player.y,
      rot = G.camMode === 0 ? -G.camYaw - Math.PI / 2 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, R, 0, TAU);
    ctx.fillStyle = '#123b5c';
    ctx.fill();
    ctx.clip();
    ctx.translate(mx, my);
    ctx.rotate(rot);
    ctx.drawImage(miniCv, -cx * sc, -cy * sc, miniCv.width * k, miniCv.height * k);
    const blip = (wx, wy, colr, sz, txt) => {
      let dx = (wx - cx) * sc,
        dy = (wy - cy) * sc;
      const d = Math.hypot(dx, dy);
      if (d > R - 7) {
        dx *= (R - 7) / d;
        dy *= (R - 7) / d;
      }
      ctx.fillStyle = colr;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, sz, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (txt) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(-rot);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 8px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 0, 0.5);
        ctx.restore();
      }
    };
    const gp = gpsTarget();
    if (gp) {
      const pts = [[cx, cy]].concat(roadPath(cx, cy, gp.x, gp.y));
      ctx.strokeStyle = gp.col;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      pts.forEach((q, i) => {
        const X = (q[0] - cx) * sc,
          Y = (q[1] - cy) * sc;
        if (i) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const t of tokens) if (!t.got && Math.hypot(t.x - cx, t.y - cy) < 260) blip(t.x, t.y, '#ffd23f', 2.6);
    blip(GARAGE.x, GARAGE.y, '#38bdf8', 6, 'G');
    if (!G.mission) for (const o of offers) blip(o.x, o.y, MT[o.type].col, 6, MT[o.type].ic);
    if (G.mission && G.mission.type !== 'colpo') {
      const s = G.mission.steps[G.mission.idx];
      blip(s.x, s.y, MT[G.mission.type].col, 5 + Math.sin(G.gtime * 6) * 1.5);
    }
    const on = Math.floor(G.gtime * 6) % 2 === 0;
    for (const c of G.cars) if (c.driver === 'cop') blip(c.x, c.y, on ? '#ff2d3c' : '#2d7bff', 3.2);
    if (heli) blip(heli.x, heli.y, '#e2e8f0', 5, 'H');
    ctx.save();
    ctx.rotate(player.a);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5.5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mx, my, R, 0, TAU);
    ctx.stroke();
    const na = rot - Math.PI / 2;
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    outlineText('N', mx + Math.cos(na) * (R - 10), my + Math.sin(na) * (R - 10), '#fff', 3);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui,sans-serif';
  toasts.forEach((t, i) => {
    const y = (G.mission && G.mission.type !== 'colpo' ? 88 : 40) + i * 32,
      w = ctx.measureText(t.s).width + 30;
    ctx.globalAlpha = Math.min(1, t.t * 2.5);
    ctx.fillStyle = 'rgba(8,10,20,0.78)';
    rr(ctx, W / 2 - w / 2, y - 14, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(t.s, W / 2, y);
  });
  ctx.globalAlpha = 1;
  if (G.big) {
    const a = Math.min(1, G.big.t / 0.5, (G.big.max - G.big.t) / 0.25 + 0.2);
    ctx.globalAlpha = clamp(a, 0, 1);
    const fs = Math.round(clamp(W / 14, 30, 64));
    ctx.font = 'bold ' + fs + 'px ' + HUDF;
    ctx.shadowColor = G.big.col;
    ctx.shadowBlur = 18;
    outlineText(G.big.title, W / 2, H * 0.3, G.big.col, 7);
    ctx.shadowBlur = 0;
    if (G.big.sub) {
      ctx.font = 'bold ' + Math.round(fs * 0.32) + 'px system-ui,sans-serif';
      outlineText(G.big.sub, W / 2, H * 0.3 + fs * 0.75, '#ffffff', 4);
    }
    ctx.globalAlpha = 1;
  }
  if (G.bustT > 0) {
    ctx.fillStyle = `rgba(20,40,110,${0.25 * Math.min(1, (3.2 - G.bustT) * 2)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '12px system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(
    '[C] telecamera: ' +
      (G.camMode === 0 ? 'inseguimento' : "dall'alto") +
      '    [M] mappa    [R] radio    [V] audio ' +
      (G.audioOn ? 'sì' : 'no') +
      '    [Q] grafica ' +
      (quality ? 'alta' : 'bassa'),
    14,
    20,
  );
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px system-ui,sans-serif';
  ctx.fillText('Mappa © OpenStreetMap contributors', 14, 36);
  if (G.state === 'pause')
    drawOverlay(
      'PAUSA',
      ['Missioni completate: ' + save.done + '   ·   Gettoni: ' + tokens.filter(t => t.got).length + '/' + tokens.length],
      true,
    );
  if (G.state === 'map') drawBigMap();
  if (G.state === 'garage') drawGarage();
}
export function drawOverlay(title, lines, showControls) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,6,30,0.72)');
  g.addColorStop(1, 'rgba(30,6,40,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const fs = Math.round(clamp(W / 9, 40, 104));
  let y = H * 0.2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic bold ' + fs + 'px ' + HUDF;
  const tg = ctx.createLinearGradient(W / 2 - fs * 3, 0, W / 2 + fs * 3, 0);
  tg.addColorStop(0, '#ff2e88');
  tg.addColorStop(0.5, '#ffd1f0');
  tg.addColorStop(1, '#00e5ff');
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 30;
  ctx.fillStyle = tg;
  ctx.fillText(title, W / 2, y);
  ctx.shadowBlur = 0;
  y += fs * 0.72;
  ctx.font = 'bold ' + Math.round(fs * 0.2) + 'px system-ui,sans-serif';
  for (const l of lines) {
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(l, W / 2, y);
    y += fs * 0.3;
  }
  if (showControls) {
    y += 10;
    const bw = Math.min(480, W - 40),
      bh = CONTROLS.length * 25 + 22;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    rr(ctx, W / 2 - bw / 2, y, bw, bh, 12);
    ctx.fill();
    CONTROLS.forEach(([k, v], i) => {
      const yy = y + 22 + i * 25;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 15px system-ui,sans-serif';
      ctx.fillText(k, W / 2 - 8, yy);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '15px system-ui,sans-serif';
      ctx.fillText(v, W / 2 + 8, yy);
    });
    y += bh + 28;
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px system-ui,sans-serif';
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.gtime * 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(G.state === 'title' ? 'Clicca o premi INVIO per giocare' : 'Clicca o premi P per riprendere', W / 2, Math.min(H - 30, y));
  ctx.globalAlpha = 1;
  ctx.font = '12px system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Dati mappa © OpenStreetMap contributors (ODbL)', W / 2, H - 12);
}

export function init() {
  // ---------------- HUD 2D ----------------
  _p = new THREE.Vector3();
  streetT = 0;
  curStreet = '';
  HUDF = '"Arial Black","Segoe UI Black",Impact,system-ui,sans-serif';
  CONTROLS = [
    ['W / S', 'avanti · indietro (o frena)'],
    ['A / D', 'sterza · gira'],
    ['Spazio', 'freno a mano (derapate!)'],
    ['Shift', 'nitro in auto · corri a piedi'],
    ['E oppure F', "sali · scendi · ruba un'auto"],
    ['M', 'mappa con GPS'],
    ['R', 'cambia stazione radio'],
    ['C', 'cambia telecamera'],
    ['H · V · Q', 'clacson · audio · grafica'],
    ['P / Esc', 'pausa'],
  ];
}
