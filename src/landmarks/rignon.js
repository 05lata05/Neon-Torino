// Parco Rignon e Villa Amoretti (biblioteca civica). Da OSM: perimetro del parco, sentieri,
// filari di tigli, alberi singoli, panchine e cestini, area giochi, area cani, pista di pattinaggio,
// la giostra e gli edifici storici (Arancera, Sala dei Centomila, Centro d'incontro) con colori e tetti.

export default function build(kit, L) {
  const R = L.rignon;
  if (L.villaAmoretti) villa(kit, L.villaAmoretti);
  if (!R) return;
  const { THREE, M, GB } = kit;
  const park = kit.W(R.outer);
  kit.noRandomTrees.push(park);

  // --- sentieri (larghezza e colore dal tipo e dalla superficie)
  const SURF = { compacted: '#cdbd98', paving_stones: '#b9b4aa', concrete: '#c9c7c1', asphalt: '#7d7f84' };
  const byCol = {},
    lampPts = [],
    pathSegs = [];
  for (const p of R.paths || []) {
    const t = p.tags,
      pts = kit.W(p.pts),
      w = t.highway === 'pedestrian' ? 5 : t.highway === 'steps' ? 3 : 3;
    const col = t.highway === 'steps' ? '#a9a59c' : SURF[t.surface] || '#cdbd98';
    byCol[col] = byCol[col] || new GB();
    kit.ribbon(byCol[col], pts, w * M, 0.16 + (t.highway === 'pedestrian' ? 0.01 : 0));
    for (let i = 0; i + 1 < pts.length; i++) pathSegs.push([pts[i], pts[i + 1]]);
    if (t.lit === 'yes') {
      let acc = 10 * M,
        side = 1;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i],
          b = pts[i + 1],
          Lg = kit.len(a, b);
        if (Lg < 1) continue;
        const nx = -(b[1] - a[1]) / Lg,
          nz = (b[0] - a[0]) / Lg;
        while (acc < Lg) {
          const t0 = acc / Lg;
          lampPts.push([
            a[0] + (b[0] - a[0]) * t0 + nx * (w / 2 + 0.8) * M * side,
            a[1] + (b[1] - a[1]) * t0 + nz * (w / 2 + 0.8) * M * side,
          ]);
          side = -side;
          acc += 28 * M;
        }
        acc -= Lg;
      }
    }
  }
  for (const col in byCol) kit.mesh(byCol[col], kit.std({ color: col, roughness: 1 }), { cast: false });
  const distPath = (x, z) => {
    let d = 1e9,
      dir = 0;
    for (const [a, b] of pathSegs) {
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        L2 = dx * dx + dz * dz || 1,
        t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)),
        e = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
      if (e < d) {
        d = e;
        dir = Math.atan2(dz, dx);
      }
    }
    return [d, dir];
  };

  // --- lampioni da parco (lanterna su palo verde scuro)
  const lamps = lampPts.filter(
    (p, i) => lampPts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 12 * M) === i && kit.tileAt(p[0], p[1]) !== kit.ctx.BUILD,
  );
  kit.instances(
    new THREE.CylinderGeometry(0.12 * M, 0.18 * M, 4 * M, 6),
    kit.std({ color: '#24382c', metalness: 0.4 }),
    lamps.map(([x, z]) => ({ x, y: 2 * M, z })),
    { cast: false },
  );
  const head = kit.lit(null, null, { glow: '#ffd59a', day: 0.05, night: 2.2, mat: { color: '#f3ead2' } });
  kit.instances(
    new THREE.CylinderGeometry(0.35 * M, 0.22 * M, 0.7 * M, 6),
    head,
    lamps.map(([x, z]) => ({ x, y: 4.3 * M, z })),
    { cast: false },
  );
  kit.lightPools(lamps, 8);

  // --- aree speciali: giochi, cani, pattinaggio
  for (const a of R.areas || []) {
    const ring = kit.W(a.outer),
      ob = kit.obb(ring),
      t = a.tags;
    if (t.leisure === 'playground') {
      const g = new GB();
      kit.flat(g, ring, [], 0.18);
      kit.mesh(g, kit.std({ color: '#b65f4c', roughness: 1 }), { cast: false });
      playground(kit, ob);
    } else if (t.leisure === 'dog_park') {
      kit.fence(ring, { h: 1.2, color: '#2f3b33', gap: ring[0], gapW: 2 });
    } else if (t.sport === 'roller_skating') {
      const g = new GB();
      kit.flat(g, ring, [], 0.2);
      kit.mesh(g, kit.std({ color: '#bdbcb6', roughness: 0.7 }), { cast: false });
      const line = new GB(),
        N = 40,
        pts = [];
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        pts.push(kit.local(ob, Math.cos(th) * ob.len * 0.4, Math.sin(th) * ob.wid * 0.35));
      }
      kit.ribbon(line, pts, 0.3 * M, 0.24);
      kit.mesh(line, kit.std({ color: '#f4f4f4' }), { cast: false });
    }
  }

  // --- panchine e cestini (posizioni vere), orientate lungo il sentiero più vicino
  const bench = new GB();
  kit.box(bench, 0, 0, 0, 1.8 * M, 0.45 * M, 0.42 * M, 0.5 * M);
  kit.box(bench, 0, -0.22 * M, 0, 1.8 * M, 0.08 * M, 0.5 * M, 0.95 * M);
  for (const s of [-0.75, 0.75]) kit.box(bench, s * M, 0, 0, 0.08 * M, 0.45 * M, 0, 0.45 * M);
  const benches = [],
    bins = [];
  for (const p of R.points || []) {
    const [x, z] = kit.P(p.pos);
    if (p.tags.amenity === 'bench') {
      const [, dir] = distPath(x, z);
      benches.push({ x, z, ry: -dir });
    } else if (p.tags.amenity === 'waste_basket') bins.push({ x, y: 0.45 * M, z });
  }
  kit.instances(bench.geo(), kit.std({ color: '#7b5a3c', roughness: 0.9 }), benches, { cast: false });
  kit.instances(new THREE.CylinderGeometry(0.28 * M, 0.24 * M, 0.9 * M, 8), kit.std({ color: '#2d4a38' }), bins, { cast: false });

  // --- edifici del parco (tranne la villa, già fatta): colori e tetti dai tag
  for (const b of R.buildings) {
    const t = b.tags;
    if (t.attraction === 'carousel') {
      carousel(kit, b);
      continue;
    }
    if (t.building === 'garage') {
      kit.tagBuilding(b, { style: 'industrial', color: '#d8d2c4', levels: 1, roofShape: 'flat' });
      continue;
    }
    const pub = t.building === 'public';
    const r = kit.tagBuilding(b, {
      style: pub ? 'classic' : 'office',
      color: t['building:colour'] ? warm(t['building:colour']) : '#e9e0cf',
      levels: parseInt(t['building:levels'] || '1', 10),
      roofShape: t['roof:shape'] === 'hipped' ? 'none' : undefined,
      roofColor: kit.color(t['roof:colour'], '#8d8f94'),
    });
    if (t['roof:shape'] === 'hipped') {
      const g = new GB();
      kit.insetRoof(g, r.ring, r.wallH, 3 * M, Math.min(5 * M, r.ob.wid * 0.45));
      kit.mesh(g, kit.std({ color: kit.color(t['roof:colour'], '#883333'), side: THREE.DoubleSide }));
    }
    if (t.name) kit.label(t.name.replace(/"/g, ''), r.ob.cx, r.ob.cz, r.wallH / M + 9, '#fde68a');
  }

  // --- alberi: filari di tigli, alberi censiti e qualche albero in più sui prati lontano dai sentieri
  const trees = [];
  for (const row of R.treeRows || []) {
    const pts = kit.W(row.pts);
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i],
        b = pts[i + 1],
        Lg = kit.len(a, b);
      while (acc < Lg) {
        const t0 = acc / Lg;
        trees.push({ x: a[0] + (b[0] - a[0]) * t0, z: a[1] + (b[1] - a[1]) * t0, s: 1.05 });
        acc += 8 * M;
      }
      acc -= Lg;
    }
  }
  for (const p of R.trees || []) {
    const [x, z] = kit.P(p);
    trees.push({ x, z, s: 1.15 });
  }
  const ob = kit.obb(park);
  let sd = 4242;
  const rnd = () => {
    sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0;
    return sd / 4294967296;
  };
  const blocked = (x, z) =>
    kit.tileAt(x, z) === kit.ctx.BUILD ||
    distPath(x, z)[0] < 4 * M ||
    trees.some(t => Math.hypot(t.x - x, t.z - z) < 8 * M) ||
    (R.areas || []).some(a => kit.pointIn([x, z], kit.W(a.outer)));
  for (let u = -ob.len / 2; u < ob.len / 2; u += 16 * M)
    for (let v = -ob.wid / 2; v < ob.wid / 2; v += 16 * M) {
      const [x, z] = kit.local(ob, u + (rnd() - 0.5) * 10 * M, v + (rnd() - 0.5) * 10 * M);
      if (kit.pointIn([x, z], park) && !blocked(x, z) && rnd() < 0.7) trees.push({ x, z, s: 0.8 + rnd() * 0.5 });
    }
  kit.trees(trees, { col: ['#4b8a3b', '#3f7d34', '#5a9442', '#467f39'] });

  const [cx, cz] = kit.centroid(park);
  kit.label('Parco Rignon', cx, cz, 22, '#86efac');
}

const warm = hex => (hex.toLowerCase() === '#eedddd' ? '#ecd4c8' : hex); // il rosa di OSM, un po' più caldo come l'intonaco vero

function villa(kit, V) {
  const { THREE, M, GB } = kit;
  const ring = kit.W(V.outer),
    ob = kit.obb(ring),
    H = 11.5;
  // facciata barocca: zoccolo bugnato, cornici marcapiano, finestre con cornice e persiane verdi
  const [c, g] = kit.cv(128, 384),
    [e, ge] = kit.cv(128, 384);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 128, 384);
  kit.noise(g, 128, 384, '#ecd4c8', 700, 0.04);
  g.fillStyle = '#e2c6b8';
  g.fillRect(0, 256, 128, 128);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 268; y < 384; y += 16) g.fillRect(0, y, 128, 2);
  g.fillStyle = '#f5ece2';
  for (const y of [0, 124, 250]) {
    g.fillRect(0, y, 128, 8);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, y + 8, 128, 3);
    g.fillStyle = '#f5ece2';
  }
  g.fillStyle = '#e6cbbd';
  g.fillRect(0, 0, 10, 384);
  g.fillRect(118, 0, 10, 384);
  for (const [y0, h, arch] of [
    [22, 84, false],
    [146, 88, false],
    [278, 92, true],
  ]) {
    g.fillStyle = '#f7efe6';
    g.fillRect(34, y0 - 8, 60, h + 14);
    g.fillStyle = '#2c3540';
    if (arch) {
      g.beginPath();
      g.moveTo(42, y0 + h);
      g.lineTo(42, y0 + 22);
      g.arc(64, y0 + 22, 22, Math.PI, 0);
      g.lineTo(86, y0 + h);
      g.fill();
    } else g.fillRect(42, y0, 44, h);
    if (Math.random() < 0.45) {
      ge.fillStyle = '#f2d199';
      ge.fillRect(42, y0 + 4, 44, h - 4);
    }
    if (!arch) {
      g.fillStyle = '#3f6b45';
      g.fillRect(20, y0, 20, h);
      g.fillRect(88, y0, 20, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = y0 + 3; y < y0 + h; y += 6) {
        g.fillRect(20, y, 20, 2);
        g.fillRect(88, y, 20, 2);
      }
    }
    g.fillStyle = '#f7efe6';
    g.fillRect(30, y0 - 18, 68, 8);
  }
  const gw = new GB();
  kit.walls(gw, ring, 0, H * M, { texW: 4.2, texH: H });
  kit.mesh(gw, kit.lit(kit.tex(c), kit.tex(e), { night: 0.85 }));
  // cornicione e tetto a padiglione in coppi
  const corn = new GB();
  kit.walls(corn, ring, (H - 0.5) * M, H * M + 1, { texW: 4, texH: 1 });
  kit.mesh(corn, kit.std({ color: '#f5ece2' }));
  const [rc, rg] = kit.cv(64, 64);
  kit.noise(rg, 64, 64, '#8a3a2e', 300, 0.06);
  rg.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < 64; y += 8) rg.fillRect(0, y, 64, 2);
  const roof = new GB();
  kit.insetRoof(roof, ring, H * M, 4 * M, Math.min(6 * M, ob.wid * 0.42));
  kit.mesh(roof, kit.std({ map: kit.tex(rc, true), color: '#c06a5a', side: THREE.DoubleSide }));
  // portale con scalinata e balcone, sul lato verso il centro del parco
  const side = kit.streetSide(ob);
  const s = side[0] === '+' ? 1 : -1,
    ax = side[1],
    off = (ax === 'u' ? ob.len : ob.wid) / 2;
  const at = (out, along) => (ax === 'u' ? kit.local(ob, s * (off + out), along) : kit.local(ob, along, s * (off + out)));
  const rot = ob.ang + (ax === 'u' ? Math.PI / 2 : 0);
  const stone = new GB();
  for (let k = 0; k < 3; k++) {
    const [x, z] = at((2.2 - k * 0.6) * M, 0);
    kit.box(stone, x, z, rot, (6 - k) * M, 0.6 * M, 0, (0.18 + k * 0.18) * M);
  }
  for (const a of [-1.8, 1.8]) {
    const [x, z] = at(0.3 * M, a * M);
    kit.box(stone, x, z, rot, 0.7 * M, 0.6 * M, 0, 4.4 * M);
  }
  {
    const [x, z] = at(0.3 * M, 0);
    kit.box(stone, x, z, rot, 4.4 * M, 0.7 * M, 4.2 * M, 4.8 * M);
  }
  {
    const [x, z] = at(1.1 * M, 0);
    kit.box(stone, x, z, rot, 4.6 * M, 1.8 * M, 4.8 * M, 5.1 * M);
    kit.box(stone, ...at(1.95 * M, 0), rot, 4.6 * M, 0.15 * M, 5.1 * M, 6.1 * M);
  }
  kit.mesh(stone, kit.std({ color: '#f1e8dc' }));
  const door = new GB();
  kit.box(door, ...at(0.12 * M, 0), rot, 2.6 * M, 0.2 * M, 0.5 * M, 4.1 * M);
  kit.mesh(door, kit.std({ color: '#5a3b26' }));
  const pn = ax === 'u' ? Math.atan2(ob.uz * s, ob.ux * s) : Math.atan2(ob.vz * s, ob.vx * s);
  const [px, pz] = at(0, 3.3 * M);
  kit.sign('BIBLIOTECA CIVICA VILLA AMORETTI', px, 2.6 * M, pz, pn, 0.5, {
    bg: '#f7f3ea',
    fg: '#333333',
    family: 'Georgia,serif',
    border: '#b8a88a',
  });
  kit.solid(ring, H + 4);
  kit.mini(ring, '#c98f7d');
  kit.label('Villa Amoretti', ob.cx, ob.cz, H + 12, '#fde68a');
}

function playground(kit, ob) {
  const { THREE, M, GB } = kit;
  const steel = new GB(),
    red = new GB(),
    yel = new GB();
  const U = Math.min(ob.len * 0.3, 8 * M);
  // altalena: due cavalletti, trave e due seggiolini
  const [sx, sz] = kit.local(ob, -U, 0);
  for (const d of [-1.6, 1.6])
    for (const k of [-0.7, 0.7]) kit.box(steel, ...kit.local(ob, -U + k * M, d * M), ob.ang, 0.15 * M, 0.15 * M, 0, 2.6 * M);
  kit.box(steel, sx, sz, ob.ang + Math.PI / 2, 3.4 * M, 0.15 * M, 2.5 * M, 2.7 * M);
  for (const d of [-0.7, 0.7]) kit.box(red, ...kit.local(ob, -U, d * M), ob.ang, 0.4 * M, 0.6 * M, 0.6 * M, 0.7 * M);
  // scivolo: scaletta e piano inclinato
  const [lx, lz] = kit.local(ob, U, 0);
  kit.box(yel, lx, lz, ob.ang, 1.4 * M, 1.4 * M, 1.6 * M, 1.8 * M);
  for (const d of [-0.6, 0.6]) kit.box(steel, ...kit.local(ob, U - 0.6 * M, d * M), ob.ang, 0.12 * M, 0.12 * M, 0, 1.8 * M);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(3.2 * M, 0.12 * M, 0.9 * M), kit.std({ color: '#e5484d' }));
  const [qx, qz] = kit.local(ob, U + 2 * M, 0);
  sl.position.set(qx, 1 * M, qz);
  sl.rotation.set(0, -ob.ang, -0.5);
  sl.castShadow = true;
  kit.scene.add(sl);
  // dondolo
  const [cx, cz] = kit.local(ob, 0, Math.min(ob.wid * 0.25, 4 * M));
  kit.box(steel, cx, cz, ob.ang, 0.3 * M, 0.3 * M, 0, 0.5 * M);
  kit.box(yel, cx, cz, ob.ang + 0.08, 3.6 * M, 0.3 * M, 0.5 * M, 0.62 * M);
  kit.mesh(steel, kit.std({ color: '#5f6b75', metalness: 0.5 }));
  kit.mesh(red, kit.std({ color: '#d64545' }));
  kit.mesh(yel, kit.std({ color: '#f2c14e' }));
}

function carousel(kit, b) {
  const { THREE, M } = kit;
  const ring = kit.W(b.outer),
    [x, z] = kit.centroid(ring),
    ob = kit.obb(ring),
    R = Math.min(ob.len, ob.wid) / 2;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  kit.scene.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.6 * M, 24), kit.std({ color: '#c9a227' }));
  base.position.y = 0.3 * M;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * M, 0.4 * M, 4.5 * M, 10), kit.std({ color: '#f1e3c0', metalness: 0.4 }));
  pole.position.y = 2.6 * M;
  g.add(pole);
  const [c, cg] = kit.cv(256, 64);
  for (let k = 0; k < 16; k++) {
    cg.fillStyle = k % 2 ? '#d93a3a' : '#f7f1e3';
    cg.fillRect(k * 16, 0, 16, 64);
  }
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(R * 1.1, 2.2 * M, 24, 1, true),
    kit.std({ map: kit.tex(c, false), side: THREE.DoubleSide }),
  );
  roof.position.y = 5.9 * M;
  roof.castShadow = true;
  g.add(roof);
  const lights = kit.lit(null, null, { glow: '#ffe7a3', day: 0.4, night: 2, mat: { color: '#fff3c4' } });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.08, 0.12 * M, 5, 32).rotateX(Math.PI / 2), lights);
  rim.position.y = 4.8 * M;
  g.add(rim);
  const rot = new THREE.Group();
  g.add(rot);
  const horses = [],
    cols = ['#ffffff', '#d9b38c', '#2f2f2f', '#f2d16b'];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2,
      h = new THREE.Group();
    h.position.set(Math.cos(a) * R * 0.72, 1.6 * M, Math.sin(a) * R * 0.72);
    h.rotation.y = -a;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5 * M, 0.7 * M, 1.6 * M), kit.std({ color: cols[k % 4] }));
    h.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4 * M, 0.9 * M, 0.4 * M), kit.std({ color: cols[k % 4] }));
    neck.position.set(0, 0.6 * M, 0.7 * M);
    h.add(neck);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * M, 0.06 * M, 4 * M, 5), kit.std({ color: '#e6d3a3', metalness: 0.6 }));
    bar.position.y = 1.4 * M;
    h.add(bar);
    rot.add(h);
    horses.push(h);
  }
  kit.onTick((dt, t) => {
    rot.rotation.y = t * 0.5;
    horses.forEach((h, k) => {
      h.position.y = 1.6 * M + Math.sin(t * 2.4 + k) * 0.35 * M;
    });
  });
  kit.solid(ring, 6.5);
  kit.mini(ring, '#c9a227');
}
