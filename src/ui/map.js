// GPS e mappa grande.
import { G } from '../core/game.js';
import { H, W, ctx } from '../core/render.js';
import { offers, peds, player } from '../core/state.js';
import { TAU } from '../core/util.js';
import { heli } from '../entities/heli.js';
import { roadPath } from '../entities/police.js';
import { GARAGE } from '../gameplay/garage.js';
import { MT } from '../gameplay/missions.js';
import { HUDF } from './hud.js';
import { miniCv } from '../world/ground.js';
import { WORLD, WX, WY } from '../world/map.js';

// ---------------- GPS e mappa grande ----------------
export function gpsTarget() {
  if (G.mission && G.mission.type !== 'colpo') {
    const s = G.mission.steps[G.mission.idx];
    return { x: s.x, y: s.y, col: MT[G.mission.type].col };
  }
  return null;
}
export function clearPax() {
  if (G.mission && G.mission.pax) {
    const i = peds.indexOf(G.mission.pax);
    if (i >= 0) peds.splice(i, 1);
    G.mission.pax = null;
  }
}
export function drawBigMap() {
  ctx.fillStyle = 'rgba(5,8,20,0.9)';
  ctx.fillRect(0, 0, W, H);
  const S = Math.min(W, H - 90) * 0.92,
    ox = (W - S) / 2,
    oy = (H - S) / 2 + 12,
    k = S / WORLD,
    Pp = (x, y) => [ox + x * k, oy + y * k];
  ctx.drawImage(miniCv, ox, oy, WX * k, WY * k);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, WX * k, WY * k);
  const icon = (x, y, col, r, txt) => {
    const [X, Y] = Pp(x, y);
    ctx.fillStyle = col;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X, Y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (txt) {
      ctx.fillStyle = '#111';
      ctx.font = 'bold ' + Math.round(r * 1.2) + 'px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, X, Y + 0.5);
    }
  };
  const gp = gpsTarget();
  if (gp) {
    const pts = [[player.x, player.y]].concat(roadPath(player.x, player.y, gp.x, gp.y));
    ctx.strokeStyle = gp.col;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((q, i) => {
      const [X, Y] = Pp(q[0], q[1]);
      if (i) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.stroke();
    icon(gp.x, gp.y, gp.col, 8);
  }
  icon(GARAGE.x, GARAGE.y, '#38bdf8', 10, 'G');
  if (!G.mission) for (const o of offers) icon(o.x, o.y, MT[o.type].col, 10, MT[o.type].ic);
  for (const c of G.cars) if (c.driver === 'cop') icon(c.x, c.y, Math.floor(G.gtime * 6) % 2 ? '#ff2d3c' : '#2d7bff', 4);
  if (heli) icon(heli.x, heli.y, '#e2e8f0', 7, 'H');
  {
    const [X, Y] = Pp(player.x, player.y);
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(player.a);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic bold 26px ' + HUDF;
  ctx.fillStyle = '#ffd1f0';
  ctx.fillText('MAPPA: SANTA RITA, TORINO', W / 2, Math.max(22, oy - 22));
  ctx.font = '13px system-ui,sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    'C consegna · R corsa · T taxi · € colpo · G garage · arancione = rampe    —    M per chiudere',
    W / 2,
    Math.min(H - 14, oy + S + 20),
  );
}
