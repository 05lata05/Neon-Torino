// Centrale del Latte di Torino (via Filadelfia 220): area industriale e capannoni da OSM,
// compreso il capannone a volta (18 m, volta di 12 m) e la torre dell'acqua da 22 m.
// Dettagli aggiunti (non in OSM): recinzione con cancello, insegne, autocisterne nel piazzale.

export default function build(kit, L) {
  const C = L.centraleLatte; if (!C) return;
  const { THREE, M, GB } = kit;
  const area = kit.W(C.outer);
  // piazzale asfaltato
  const yard = new GB(); kit.flat(yard, area, [], 0.2); kit.mesh(yard, kit.std({ color: '#86888c', roughness: 0.95 }), { cast: false });
  kit.mini(area, '#4c4f57');

  let main = null, mainA = 0;
  for (const b of C.buildings) {
    const t = b.tags;
    if (t.man_made === 'water_tower') { waterTower(kit, b); continue; }
    const shape = t['roof:shape'] === 'round' ? 'round' : t['roof:shape'] === 'gabled' ? 'gabled' : 'flat';
    const r = kit.tagBuilding(b, { style: 'industrial', color: '#eef0f1', levels: 1, roofShape: shape,
      roofColor: t['roof:colour'] || (shape === 'round' ? '#b9bcc0' : '#9da1a6'), over: 0.2 * M, mini: '#9da1a6' });
    const a = Math.abs(kit.area(r.ring));
    if (a > mainA && shape === 'flat') { mainA = a; main = r; }
    // fascia blu, portoni a scorrimento e banchine di carico
    const band = new GB(); kit.walls(band, r.ring, r.wallH - 1.2 * M, r.wallH - 0.5 * M, { texW: 4, texH: 4 });
    kit.mesh(band, kit.std({ color: '#1f5fae', roughness: 0.6 }), { cast: false });
  }
  if (main) {
    const side = kit.streetSide(main.ob, 'Via Filadelfia');
    kit.obbSign(main.ob, side, 'CENTRALE DEL LATTE DI TORINO', main.wallH / M - 1.6, 1.6, { bg: '#ffffff', fg: '#1f5fae', glow: '#1f5fae', family: '"Arial Black",Impact,sans-serif' });
    // portoni sul lato strada
    const s = side[0] === '+' ? 1 : -1, ax = side[1], ob = main.ob, span = ax === 'u' ? ob.wid : ob.len, off = (ax === 'u' ? ob.len : ob.wid) / 2 + 0.3;
    const doors = new GB();
    for (let k = -1; k <= 1; k++) {
      const along = k * span * 0.28, [x, z] = ax === 'u' ? kit.local(ob, s * off, along) : kit.local(ob, along, s * off);
      kit.box(doors, x, z, ob.ang + (ax === 'u' ? Math.PI / 2 : 0), 4.5 * M, 0.3 * M, 0, 4.2 * M);
    }
    kit.mesh(doors, kit.std({ color: '#a7adb4', metalness: 0.5, roughness: 0.5 }), { cast: false });
  }

  // recinzione sul perimetro, con il cancello verso via Filadelfia
  const [gx, gz] = kit.nearestRoad(...kit.centroid(area), 'Via Filadelfia') || kit.centroid(area);
  let gi = 0, gd = 1e18; area.forEach((p, i) => { const d = (p[0] - gx) ** 2 + (p[1] - gz) ** 2; if (d < gd) { gd = d; gi = i; } });
  kit.fence(area, { gap: area[gi] });
  const gp = area[gi], gn = Math.atan2(gz - gp[1], gx - gp[0]);
  kit.sign('CENTRALE DEL LATTE', gp[0] + Math.cos(gn) * 3 * M, 3.4 * M, gp[1] + Math.sin(gn) * 3 * M, gn, 1.2, { bg: '#1f5fae', fg: '#ffffff', glow: '#ffffff' });

  // autocisterne del latte parcheggiate nel piazzale (aggiunta di colore)
  const ob = kit.obb(area); let n = 0;
  for (let k = 0; k < 40 && n < 3; k++) {
    const u = (k * 0.618 % 1 - 0.5) * ob.len * 0.8, v = ((k * 0.382 + 0.2) % 1 - 0.5) * ob.wid * 0.8, [x, z] = kit.local(ob, u, v);
    let ok = kit.pointIn([x, z], area); for (const [du, dv] of [[11, 3], [-11, 3], [11, -3], [-11, -3]]) { const [qx, qz] = kit.local(ob, u + du * M, v + dv * M); if (kit.tileAt(qx, qz) === kit.ctx.BUILD || !kit.pointIn([qx, qz], area)) ok = false; }
    if (!ok) continue; truck(kit, x, z, ob.ang); n++;
  }
  kit.label('Centrale del Latte', ob.cx, ob.cz, 28, '#93c5fd');
}

function waterTower(kit, b) {
  const { THREE, M } = kit;
  const ring = kit.W(b.outer), [x, z] = kit.centroid(ring), ob = kit.obb(ring), R = Math.max(ob.len, ob.wid) / 2;
  const H = (parseFloat(b.tags.height) || 22) * M, conc = kit.std({ color: '#d8d4cc' });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.38, R * 0.45, H * 0.62, 16), conc); shaft.position.set(x, H * 0.31, z);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.55, H * 0.3, 24), conc); tank.position.set(x, H * 0.77, z);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.2, R * 1.04, H * 0.08, 24), kit.std({ color: '#8e9297' })); cap.position.set(x, H * 0.96, z);
  for (const m of [shaft, tank, cap]) { m.castShadow = m.receiveShadow = true; kit.scene.add(m); }
  const s = kit.signTex('CENTRALE DEL LATTE', { bg: null, fg: '#1f5fae' });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 0.9, H * 0.08, 24, 1, true), kit.std({ map: s.map, transparent: true }));
  s.map.wrapS = THREE.RepeatWrapping; s.map.repeat.set(2, 1); band.position.set(x, H * 0.8, z); kit.scene.add(band);
  kit.solid(ring, H / M); kit.mini(ring, '#d8d4cc');
}

function truck(kit, x, z, ang) {
  const { THREE, M, GB } = kit;
  const cab = new GB(), tank = new THREE.Mesh(new THREE.CylinderGeometry(1.25 * M, 1.25 * M, 9 * M, 18).rotateZ(Math.PI / 2), kit.std({ color: '#d9dde2', metalness: 0.8, roughness: 0.25 }));
  const [cx, cz] = [x + Math.cos(ang) * 6 * M, z + Math.sin(ang) * 6 * M];
  kit.box(cab, cx, cz, ang, 2.6 * M, 2.5 * M, 0.6 * M, 3.4 * M); kit.mesh(cab, kit.std({ color: '#f4f6f8' }));
  const glass = new GB(); kit.box(glass, cx + Math.cos(ang) * 1.32 * M, cz + Math.sin(ang) * 1.32 * M, ang, 0.1 * M, 2.2 * M, 2 * M, 3.1 * M); kit.mesh(glass, kit.std({ color: '#22303d', roughness: 0.1 }));
  const blue = new GB(); kit.box(blue, cx, cz, ang, 2.62 * M, 2.52 * M, 1.2 * M, 1.7 * M); kit.mesh(blue, kit.std({ color: '#1f5fae' }));
  tank.position.set(x - Math.cos(ang) * 0.5 * M, 2.4 * M, z - Math.sin(ang) * 0.5 * M); tank.rotation.y = -ang; tank.castShadow = true; kit.scene.add(tank);
  const wheels = []; for (const u of [5.8, -2, -4.5]) for (const v of [-1.1, 1.1]) wheels.push({ x: x + Math.cos(ang) * u * M - Math.sin(ang) * v * M, y: 0.55 * M, z: z + Math.sin(ang) * u * M + Math.cos(ang) * v * M, ry: -ang });
  kit.instances(new THREE.CylinderGeometry(0.55 * M, 0.55 * M, 0.4 * M, 12).rotateX(Math.PI / 2), kit.std({ color: '#151515' }), wheels, { cast: false });
  kit.solid([[-6.5, -1.4], [7.5, -1.4], [7.5, 1.4], [-6.5, 1.4]].map(([u, v]) => [x + Math.cos(ang) * u * M - Math.sin(ang) * v * M, z + Math.sin(ang) * u * M + Math.cos(ang) * v * M]), 3.6);
}
