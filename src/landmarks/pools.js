// Swimming pools of Santa Rita: Stadio Monumentale (1933), Nuova Piscina Olimpica (2006), Aquatica and the outdoor pool
// next to the stadium; Piscina Sebastopoli and Torino Nuoto near Parco Rignon. Footprints from OSM.

const POOLS = {
  piscinaMonumentale: {
    h: 11,
    style: 'rationalist',
    color: '#f3f0e8',
    sign: 'PISCINA MONUMENTALE',
    font: 'Georgia,serif',
    fg: '#7a1f2b',
    street: 'Via Filadelfia',
  },
  piscinaOlimpica: { h: 12, style: 'glass', color: '#dfe5ea', sign: 'PISCINA OLIMPICA', fg: '#0b5e8e' },
  aquatica: { h: 7, style: 'pool', color: '#d6ebe7', sign: 'AQUATICA', fg: '#0f766e' },
  piscinaSebastopoli: { h: 9, style: 'pool', color: '#e3cfb4', sign: 'PISCINA SEBASTOPOLI', fg: '#1d4f91', street: 'Corso Sebastopoli' },
  torinoNuoto: { h: 8, style: 'pool', color: '#e9e3d6', sign: 'TORINO NUOTO', fg: '#0b5e8e' },
};

export default function build(kit, L) {
  for (const id in POOLS) if (L[id]) hall(kit, L[id], POOLS[id]);
  if (L.outdoorPool) outdoorPool(kit, L.outdoorPool);
}

function hall(kit, P, o) {
  const { M, GB } = kit;
  const r = kit.tagBuilding(
    { outer: P.outer, tags: P.tags },
    { wallH: o.h, style: o.style, color: o.color, roofShape: 'flat', mini: '#5b8fb0' },
  );
  const ob = r.ob,
    side = kit.streetSide(ob, o.street);
  // entrance canopy and sign on the street side
  const s = side[0] === '+' ? 1 : -1,
    ax = side[1],
    off = (ax === 'u' ? ob.len : ob.wid) / 2;
  const [x, z] = ax === 'u' ? kit.local(ob, s * (off + 1.5 * M), 0) : kit.local(ob, 0, s * (off + 1.5 * M));
  const can = new GB();
  kit.box(
    can,
    x,
    z,
    ob.ang + (ax === 'u' ? 0 : Math.PI / 2),
    3 * M,
    Math.min(14 * M, (ax === 'u' ? ob.wid : ob.len) * 0.5),
    3.4 * M,
    3.8 * M,
  );
  kit.mesh(can, kit.std({ color: '#e8ecef', metalness: 0.3, roughness: 0.4 }));
  kit.obbSign(ob, side, o.sign, o.h - 2, 1.7, { bg: '#ffffff', fg: o.fg, family: o.font || 'system-ui,sans-serif', glow: o.fg });
  // skylights on the indoor pool roof
  const sky = new GB();
  for (const v of [-0.2, 0.2])
    kit.ribbon(sky, [kit.local(ob, -ob.len * 0.38, v * ob.wid), kit.local(ob, ob.len * 0.38, v * ob.wid)], 2.2 * M, r.wallH + 0.5 * M);
  kit.mesh(
    sky,
    kit.lit(null, null, { glow: '#bfe6ff', day: 0.05, night: 0.8, mat: { color: '#6f93ab', roughness: 0.15, metalness: 0.3 } }),
    { cast: false },
  );
  kit.label(P.name, ob.cx, ob.cz, o.h + 10, '#38bdf8');
}

function outdoorPool(kit, V) {
  const { THREE, M, GB } = kit;
  const ring = kit.W(V.outer),
    ob = kit.obb(ring);
  // pool edge and sun deck
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(ob.len + 6 * M, ob.wid + 6 * M).rotateX(-Math.PI / 2),
    kit.std({ color: '#d9d4c8', roughness: 0.9 }),
  );
  deck.position.set(ob.cx, 0.3 * M, ob.cz);
  deck.rotation.y = -ob.ang;
  deck.receiveShadow = true;
  kit.scene.add(deck);
  // water: lanes painted on the bottom, moving reflections
  const lanes = Math.max(4, Math.min(10, Math.round(ob.wid / M / 2.5)));
  const [c, g] = kit.cv(512, 256);
  const grd = g.createLinearGradient(0, 0, 512, 256);
  grd.addColorStop(0, '#3fa9d8');
  grd.addColorStop(1, '#2f8fc4');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(10,40,80,0.55)';
  for (let k = 0; k < lanes; k++) {
    const y = ((k + 0.5) * 256) / lanes;
    g.fillRect(20, y - 3, 472, 6);
    g.fillRect(20, y - 12, 6, 24);
    g.fillRect(486, y - 12, 6, 24);
  }
  const water = kit.tex(c, false);
  const [cc, cg] = kit.cv(256, 256);
  cg.clearRect(0, 0, 256, 256);
  cg.strokeStyle = 'rgba(255,255,255,0.35)';
  cg.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    cg.beginPath();
    const x = Math.random() * 256,
      y = Math.random() * 256;
    cg.moveTo(x, y);
    cg.bezierCurveTo(x + 10, y - 8, x + 20, y + 8, x + 34, y);
    cg.stroke();
  }
  const caus = kit.tex(cc, true);
  caus.repeat.set(ob.len / M / 8, ob.wid / M / 8);
  const wm = new THREE.Mesh(
    new THREE.PlaneGeometry(ob.len, ob.wid).rotateX(-Math.PI / 2),
    kit.std({ map: water, roughness: 0.08, metalness: 0.1 }),
  );
  wm.position.set(ob.cx, 0.45 * M, ob.cz);
  wm.rotation.y = -ob.ang;
  kit.scene.add(wm);
  const cm = new THREE.Mesh(
    new THREE.PlaneGeometry(ob.len, ob.wid).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: caus, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  cm.position.set(ob.cx, 0.5 * M, ob.cz);
  cm.rotation.y = -ob.ang;
  kit.scene.add(cm);
  kit.onTick((dt, t) => {
    caus.offset.set(t * 0.02, Math.sin(t * 0.5) * 0.03);
  });
  // lane ropes and starting blocks
  const rope = new GB(),
    blk = new GB();
  for (let k = 1; k < lanes; k++) {
    const v = -ob.wid / 2 + (k * ob.wid) / lanes;
    kit.box(rope, ...kit.local(ob, 0, v), ob.ang, ob.len * 0.98, 0.25 * M, 0.42 * M, 0.62 * M);
  }
  for (let k = 0; k < lanes; k++) {
    const v = -ob.wid / 2 + ((k + 0.5) * ob.wid) / lanes;
    kit.box(blk, ...kit.local(ob, -ob.len / 2 - 0.5 * M, v), ob.ang, 0.8 * M, 0.6 * M, 0.3 * M, 1.0 * M);
  }
  kit.mesh(rope, kit.std({ color: '#e63946', roughness: 0.5 }), { cast: false });
  kit.mesh(blk, kit.std({ color: '#f1f1f1' }));
  kit.solid(ring, 0, kit.ctx.WATER);
  kit.mini(ring, '#3fa9d8');
}
