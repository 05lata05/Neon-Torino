// Stadio Olimpico Grande Torino, Torre Maratona, Braciere Olimpico (Olympic cauldron) and Inalpi Arena.
// Shapes from OpenStreetMap (outer and inner stadium rings, pitch, tower, arena);
// heights: tower 40 m and cauldron 57 m from OSM, arena 12 m from OSM, stands and roof estimated.

export default function build(kit, L) {
  if (L.stadium) stadium(kit, L.stadium);
  if (L.maratonaTower) maratonaTower(kit, L.maratonaTower);
  if (L.cauldron) cauldron(kit, L.cauldron);
  if (L.arena) arena(kit, L.arena);
}

// distance along a ray to the edge of a ring (the farthest or the nearest)
function rayHit(ring, cx, cz, dx, dz, far) {
  let best = far ? -1 : 1e9;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length],
      ex = b[0] - a[0],
      ez = b[1] - a[1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a[0] - cx) * ez - (a[1] - cz) * ex) / den,
      s = ((a[0] - cx) * dz - (a[1] - cz) * dx) / den;
    if (t > 0 && s >= 0 && s <= 1) best = far ? Math.max(best, t) : Math.min(best, t);
  }
  return best > 0 && best < 1e9 ? best : null;
}

function stadium(kit, S) {
  const { THREE, M, GB } = kit;
  const outer = kit.W(S.outer),
    hole = S.holes && S.holes[0] ? kit.W(S.holes[0]) : null;
  const pitch = S.pitch ? kit.W(S.pitch) : hole;
  const [cx, cz] = kit.centroid(pitch);
  const N = 144,
    H = 19.5,
    ROOF_O = 27,
    ROOF_I = 25;
  const samp = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2,
      dx = Math.cos(a),
      dz = Math.sin(a);
    const ro = rayHit(outer, cx, cz, dx, dz, true),
      ri = hole ? rayHit(hole, cx, cz, dx, dz, false) : ro * 0.62;
    samp.push({ a, dx, dz, ro: ro || 400, ri: Math.min(ri || 250, (ro || 400) - 14 * M) });
  }
  const P = (s, r, y) => [cx + s.dx * r, y * M, cz + s.dz * r];

  // --- textures
  const facTex = (() => {
    const [c, g] = kit.cv(512, 512),
      [e, ge] = kit.cv(512, 512);
    ge.fillStyle = '#000';
    ge.fillRect(0, 0, 512, 512);
    kit.noise(g, 512, 512, '#e7e3da', 3000, 0.04);
    for (let x = 0; x < 512; x += 64) {
      g.fillStyle = '#d6d1c6';
      g.fillRect(x, 0, 18, 512);
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(x + 18, 0, 3, 512);
    }
    g.fillStyle = '#cfc9bd';
    g.fillRect(0, 0, 512, 26);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 26, 512, 4);
    for (let x = 0; x < 512; x += 64) {
      g.fillStyle = '#2d3640';
      g.fillRect(x + 26, 150, 34, 70);
      ge.fillStyle = Math.random() < 0.5 ? '#f2d59a' : '#000';
      ge.fillRect(x + 26, 150, 34, 70);
    }
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(0, 240, 512, 6);
    for (let x = 0; x < 512; x += 128) {
      // entrance gates
      g.fillStyle = '#3a3f46';
      g.fillRect(x + 30, 400, 68, 112);
      g.fillStyle = '#7a1f2b';
      g.fillRect(x + 30, 392, 68, 8);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      for (let k = 0; k < 6; k++) g.fillRect(x + 34 + k * 11, 404, 3, 108);
      ge.fillStyle = '#d8c090';
      ge.fillRect(x + 30, 470, 68, 42);
    }
    return [kit.tex(c), kit.tex(e)];
  })();
  const seatTex = (() => {
    const [c, g] = kit.cv(128, 128);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, y + 11, 128, 5);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(0, y, 128, 2);
      for (let x = 0; x < 128; x += 8) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x, y + 2, 1, 9);
      }
    }
    return kit.tex(c);
  })();
  const ledTex = (() => {
    const msgs = [
      ['NEON TORINO', '#00e5ff'],
      ['SANTA RITA', '#ff2e88'],
      ['BAR SPORT', '#fffb96'],
      ['FORZA RAGAZZI', '#05ffa1'],
      ['RADIO MOLE FM', '#b967ff'],
      ['PIZZERIA', '#ff9f43'],
    ];
    const [c, g] = kit.cv(2048, 64),
      [e, ge] = kit.cv(2048, 64);
    msgs.forEach(([t, col], i) => {
      for (const [cc, bg] of [
        [g, '#10141c'],
        [ge, '#000'],
      ]) {
        cc.fillStyle = bg;
        cc.fillRect(i * 341, 0, 341, 64);
        cc.fillStyle = col;
        cc.font = 'bold 40px "Arial Black",Impact,sans-serif';
        cc.textAlign = 'center';
        cc.textBaseline = 'middle';
        cc.fillText(t, i * 341 + 170, 34);
      }
    });
    return [kit.tex(c), kit.tex(e)];
  })();

  // --- outer facade, two-tier stands, top concourse
  const fac = new GB(),
    seats = new GB(),
    conc = new GB(),
    led = new GB();
  let u = 0;
  const SEAT = ['#7c1d2a', '#83202e', '#761a27'];
  for (let i = 0; i < N; i++) {
    const s = samp[i],
      t = samp[(i + 1) % N];
    const seg = kit.len([cx + s.dx * s.ro, cz + s.dz * s.ro], [cx + t.dx * t.ro, cz + t.dz * t.ro]) / M;
    // facade (outward normal: vertex order chosen for s -> t clockwise on the plane)
    fac.quad(
      P(t, t.ro, 0),
      P(s, s.ro, 0),
      P(s, s.ro, H),
      P(t, t.ro, H),
      [(u + seg) / 12, 0],
      [u / 12, 0],
      [u / 12, 1],
      [(u + seg) / 12, 1],
    );
    u += seg;
    const d = r => [s.ri + (s.ro - s.ri) * r, t.ri + (t.ro - t.ri) * r];
    const tiers = [
      [0, 0.47, 2.4, 9.2],
      [0.53, 0.93, 10.4, 18.6],
    ];
    const aisle = i % 9 === 0;
    for (const [r0, r1, y0, y1] of tiers) {
      const [s0, t0] = d(r0),
        [s1, t1] = d(r1),
        rows = Math.round(((r1 - r0) * (s.ro - s.ri)) / M / 0.85);
      seats.col = aisle ? [0.62, 0.62, 0.6] : new THREE.Color(SEAT[i % 3]).toArray();
      seats.quad(P(s, s0, y0), P(t, t0, y0), P(t, t1, y1), P(s, s1, y1), [0, 0], [1, 0], [1, rows / 8], [0, rows / 8]);
    }
    // walkway between the two tiers and concourse at the top
    const [sa, ta] = d(0.47),
      [sb, tb] = d(0.53),
      [sc, tc] = d(0.93);
    conc.quad(P(s, sa, 9.2), P(t, ta, 9.2), P(t, ta, 9.6), P(s, sa, 9.6));
    conc.quad(P(s, sa, 9.6), P(t, ta, 9.6), P(t, tb, 9.6), P(s, sb, 9.6));
    conc.quad(P(s, sb, 9.6), P(t, tb, 9.6), P(t, tb, 10.4), P(s, sb, 10.4));
    conc.quad(P(s, sc, 18.6), P(t, tc, 18.6), P(t, t.ro, 18.6), P(s, s.ro, 18.6));
    conc.quad(P(s, s.ro - 0.6 * M, 18.6), P(t, t.ro - 0.6 * M, 18.6), P(t, t.ro - 0.6 * M, H), P(s, s.ro - 0.6 * M, H));
    conc.quad(P(s, s.ro - 0.6 * M, H), P(t, t.ro - 0.6 * M, H), P(t, t.ro, H), P(s, s.ro, H));
    // pitch-side wall with LED advertising boards
    led.quad(
      P(s, s.ri, 0),
      P(t, t.ri, 0),
      P(t, t.ri, 2.4),
      P(s, s.ri, 2.4),
      [(i / N) * 6, 0],
      [((i + 1) / N) * 6, 0],
      [((i + 1) / N) * 6, 1],
      [(i / N) * 6, 1],
    );
  }
  kit.mesh(fac, kit.lit(facTex[0], facTex[1], { night: 0.8 }));
  kit.mesh(seats, kit.std({ map: seatTex, vertexColors: true, roughness: 0.7 }));
  kit.mesh(conc, kit.std({ color: '#cfcac0', side: THREE.DoubleSide }));
  ledTex[0].wrapS = ledTex[1].wrapS = THREE.RepeatWrapping;
  const ledM = kit.lit(ledTex[0], ledTex[1], { glow: '#ffffff', day: 0.9, night: 1.6, mat: { side: THREE.DoubleSide } });
  kit.mesh(led, ledM, { cast: false });
  kit.onTick((dt, t) => {
    ledTex[0].offset.x = ledTex[1].offset.x = (t * 0.035) % 1;
  });

  // --- roof: white membrane on radial steel beams, lights on the inner edge
  const roof = new GB(),
    steel = new GB(),
    lights = new GB();
  const rIn = s => s.ri + (s.ro - s.ri) * 0.1;
  for (let i = 0; i < N; i++) {
    const s = samp[i],
      t = samp[(i + 1) % N];
    roof.quad(
      P(s, s.ro + 1.2 * M, ROOF_O),
      P(t, t.ro + 1.2 * M, ROOF_O),
      P(t, rIn(t), ROOF_I),
      P(s, rIn(s), ROOF_I),
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    );
    lights.quad(
      P(s, rIn(s) + 0.4 * M, ROOF_I - 0.35),
      P(t, rIn(t) + 0.4 * M, ROOF_I - 0.35),
      P(t, rIn(t), ROOF_I - 0.35),
      P(s, rIn(s), ROOF_I - 0.35),
    );
    if (i % 8 === 0) {
      const r0 = s.ro + 1.2 * M,
        r1 = rIn(s),
        mid = (r0 + r1) / 2,
        len = r0 - r1;
      const [bx, , bz] = P(s, mid, 0);
      // main beam sloped like the roof, with a post above the facade
      kit.box(steel, bx, bz, s.a, len, 0.9 * M, ((ROOF_I + ROOF_O) / 2) * M - 0.2 * M, ((ROOF_I + ROOF_O) / 2) * M + 1.4 * M);
      const [px, , pz] = P(s, s.ro + 0.6 * M, 0);
      kit.box(steel, px, pz, s.a, 1.1 * M, 1.1 * M, H * M, ROOF_O * M + 2.2 * M);
    }
  }
  kit.mesh(roof, kit.std({ color: '#f4f5f6', roughness: 0.6, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  kit.mesh(steel, kit.std({ color: '#9aa2ab', metalness: 0.6, roughness: 0.4 }));
  const lightM = new THREE.MeshBasicMaterial({ color: 0x888888, toneMapped: false, side: THREE.DoubleSide });
  kit.mesh(lights, lightM, { cast: false });
  // floodlight glows on the roof edge, visible at night
  const glowT = kit.tex(
    (() => {
      const [c, g] = kit.cv(64, 64),
        gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,245,1)');
      gr.addColorStop(0.3, 'rgba(255,250,230,0.5)');
      gr.addColorStop(1, 'rgba(255,250,230,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return c;
    })(),
    false,
  );
  const glowM = new THREE.SpriteMaterial({
    map: glowT,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  for (let i = 0; i < N; i += 6) {
    const s = samp[i],
      sp = new THREE.Sprite(glowM),
      [x, y, z] = P(s, rIn(s) + 0.2 * M, ROOF_I - 0.6);
    sp.position.set(x, y, z);
    sp.scale.set(14 * M, 14 * M, 1);
    kit.scene.add(sp);
  }
  kit.ctx.envHooks.push(dk => {
    lightM.color.setScalar(0.35 + dk * 1.9);
    glowM.opacity = dk * 0.9;
  });

  // --- playing field: synthetic surround, striped pitch with lines and goals
  if (hole) {
    const g = new GB();
    kit.flat(g, hole, [], 0.25 * M);
    kit.mesh(g, kit.std({ color: '#2f6e35', roughness: 0.95 }), { cast: false });
  }
  if (S.pitch) {
    const ob = kit.obb(pitch),
      [c, g] = kit.cv(1050, 680);
    for (let k = 0; k < 14; k++) {
      g.fillStyle = k % 2 ? '#3b8f3e' : '#348437';
      g.fillRect(k * 75, 0, 75, 680);
    }
    g.strokeStyle = '#f4f4f4';
    g.lineWidth = 6;
    const m = 20;
    g.strokeRect(m, m, 1050 - 2 * m, 680 - 2 * m);
    g.beginPath();
    g.moveTo(525, m);
    g.lineTo(525, 680 - m);
    g.stroke();
    g.beginPath();
    g.arc(525, 340, 91.5, 0, 6.29);
    g.stroke();
    for (const sx of [1, -1]) {
      const x0 = sx > 0 ? m : 1050 - m;
      g.strokeRect(Math.min(x0, x0 + sx * 165), 340 - 201, 165, 403);
      g.strokeRect(Math.min(x0, x0 + sx * 55), 340 - 92, 55, 183);
      g.beginPath();
      g.arc(x0 + sx * 110, 340, 4, 0, 6.29);
      g.fillStyle = '#f4f4f4';
      g.fill();
    }
    g.beginPath();
    g.arc(525, 340, 5, 0, 6.29);
    g.fill();
    // at night the floodlights "light up" the pitch: emissiveMap = the same grass texture
    const ptex = kit.tex(c, false),
      pmat = kit.std({ map: ptex, emissiveMap: ptex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.9 });
    kit.ctx.envHooks.push(dk => {
      pmat.emissiveIntensity = dk * 0.55;
    });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(ob.len, ob.wid).rotateX(-Math.PI / 2), pmat);
    pm.position.set(ob.cx, 0.35 * M, ob.cz);
    pm.rotation.y = -ob.ang;
    pm.receiveShadow = true;
    kit.scene.add(pm);
    const goal = new GB(),
      net = new GB(),
      gw = 7.32 * M,
      gh = 2.44 * M;
    for (const sx of [1, -1]) {
      const u0 = sx * (ob.len / 2 - (20 / 1050) * ob.len);
      for (const v of [-gw / 2, gw / 2]) {
        const [x, z] = kit.local(ob, u0, v);
        kit.box(goal, x, z, ob.ang, 0.6, 0.6, 0, gh);
      }
      const [x, z] = kit.local(ob, u0, 0);
      kit.box(goal, x, z, ob.ang + Math.PI / 2, gw, 0.6, gh - 0.6, gh);
      const [nx, nz] = kit.local(ob, u0 + sx * 1.6 * M, 0);
      kit.box(net, nx, nz, ob.ang, 2.2 * M, gw, 0, gh * 0.95);
    }
    kit.mesh(goal, kit.std({ color: '#ffffff', roughness: 0.4 }));
    kit.mesh(net, kit.std({ color: '#ffffff', transparent: true, opacity: 0.28, wireframe: true }), { cast: false });
    kit.mini(pitch, '#2f8a3f');
  }

  // --- signs: lettering on the facade towards corso Agnelli (west) and big screen on the south end
  const west = samp[Math.round(N / 2) % N];
  kit.sign('STADIO OLIMPICO GRANDE TORINO', cx + west.dx * west.ro, 14.5 * M, cz + west.dz * west.ro, Math.PI, 2.2, {
    bg: '#f6f3ec',
    fg: '#7a1f2b',
    family: 'Georgia,serif',
  });
  const south = samp[Math.round(N / 4)];
  const sx = cx + south.dx * (south.ro - 3 * M),
    sz = cz + south.dz * (south.ro - 3 * M);
  const sc = new GB();
  kit.box(sc, sx, sz, south.a + Math.PI / 2, 26 * M, 1.5 * M, 18.6 * M, 26 * M);
  kit.mesh(sc, kit.std({ color: '#2a2d33' }));
  kit.sign('TORINO  0 - 0  OSPITI', sx - south.dx * 0.9 * M, 22.3 * M, sz - south.dz * 0.9 * M, south.a + Math.PI, 5.2, {
    bg: '#0b0e14',
    fg: '#ffd166',
    glow: '#ffd166',
    family: '"Courier New",monospace',
  });

  kit.solid(outer, H);
  kit.mini(outer, '#5b6070');
  if (S.pitch) kit.mini(pitch, '#2f8a3f');
  kit.label('Stadio Olimpico Grande Torino', cx, cz, 48, '#c0394b');
}

function maratonaTower(kit, T) {
  const { THREE, M, GB } = kit;
  const ring = kit.W(T.outer),
    ob = kit.obb(ring),
    H = T.h || 40,
    shaft = H - 6;
  const [c, g] = kit.cv(256, 512),
    [e, ge] = kit.cv(256, 512);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 256, 512);
  kit.noise(g, 256, 512, '#ece3cf', 1500, 0.04);
  for (let k = 0; k < 3; k++) {
    const x = 48 + k * 64;
    g.fillStyle = '#d9cfb8';
    g.fillRect(x - 8, 40, 32, 440);
    g.fillStyle = '#2e3742';
    g.fillRect(x, 50, 16, 420);
    ge.fillStyle = '#e8c88a';
    ge.fillRect(x, 300, 16, 170);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < 512; y += 64) g.fillRect(0, y, 256, 2);
  const gw = new GB();
  kit.walls(gw, ring, 0, shaft * M, { texW: Math.max(ob.len, ob.wid) / M, texH: shaft });
  kit.mesh(gw, kit.lit(kit.tex(c), kit.tex(e), { night: 0.7 }));
  // belvedere: corner pillars, dark core, roof slab, flagpole
  const st = new GB(),
    dark = new GB(),
    hu = ob.len / 2,
    hv = ob.wid / 2,
    p = 1.0 * M;
  for (const [su, sv] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const [x, z] = kit.local(ob, su * (hu - p / 2), sv * (hv - p / 2));
    kit.box(st, x, z, ob.ang, p, p, shaft * M, (H - 0.8) * M);
  }
  kit.box(st, ob.cx, ob.cz, ob.ang, ob.len + 0.8 * M, ob.wid + 0.8 * M, (H - 0.8) * M, H * M);
  kit.box(st, ob.cx, ob.cz, ob.ang, ob.len + 0.4 * M, ob.wid + 0.4 * M, (shaft - 0.2) * M, shaft * M + 1);
  kit.box(dark, ob.cx, ob.cz, ob.ang, ob.len * 0.55, ob.wid * 0.55, shaft * M, (H - 0.8) * M);
  kit.box(st, ob.cx, ob.cz, 0, 0.35 * M, 0.35 * M, H * M, (H + 7) * M);
  kit.mesh(st, kit.std({ color: '#efe7d4' }));
  kit.mesh(dark, kit.std({ color: '#30353d' }));
  const [fc, fg] = kit.cv(96, 64);
  ['#009246', '#f1f2f1', '#ce2b37'].forEach((col, i) => {
    fg.fillStyle = col;
    fg.fillRect(i * 32, 0, 32, 64);
  });
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(3 * M, 2 * M, 8, 1).translate(1.5 * M, 0, 0),
    kit.std({ map: kit.tex(fc, false), side: THREE.DoubleSide, roughness: 0.8 }),
  );
  flag.position.set(ob.cx, (H + 5.8) * M, ob.cz);
  kit.scene.add(flag);
  const fp = flag.geometry.attributes.position,
    base = fp.array.slice();
  kit.onTick((dt, t) => {
    flag.rotation.y = -0.6 + Math.sin(t * 0.3) * 0.4;
    for (let i = 0; i < fp.count; i++) {
      const x = base[i * 3];
      fp.array[i * 3 + 2] = Math.sin(t * 4 + x * 0.25) * x * 0.06;
    }
    fp.needsUpdate = true;
  });
  kit.solid(ring, H);
  kit.mini(ring, '#efe7d4');
  kit.label('Torre Maratona', ob.cx, ob.cz, H + 12, '#ffd166');
}

function cauldron(kit, B) {
  const { THREE, M, GB } = kit;
  const [x, z] = kit.P(B.pos),
    H = (B.h || 57) * M;
  const steel = kit.std({ color: '#dfe3e8', metalness: 0.7, roughness: 0.35 });
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  kit.scene.add(g);
  const strut = (p0, p1, r) => {
    const L = p0.distanceTo(p1),
      m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, L, 6), steel);
    m.position.copy(p0).add(p1).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    m.castShadow = true;
    g.add(m);
  };
  const R0 = 5 * M,
    R1 = 1.6 * M,
    top = H - 5 * M;
  const at = (k, y) => {
    const r = R0 + (R1 - R0) * (y / top),
      a = k * 2.094;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  };
  for (let k = 0; k < 3; k++) strut(at(k, 0), at(k, top), 0.5 * M);
  for (let y = 0; y + 1 < top; y += 7 * M) {
    // lattice rings and bracing
    const y1 = Math.min(top, y + 7 * M);
    if (y > 0) {
      const r = R0 + (R1 - R0) * (y / top),
        ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.18 * M, 5, 18).rotateX(Math.PI / 2), steel);
      ring.position.y = y;
      g.add(ring);
    }
    for (let k = 0; k < 3; k++) strut(at(k, y), at(k + 1, y1), 0.22 * M);
  }
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6 * M, 1.4 * M, 3 * M, 20, 1, true),
    kit.std({ color: '#c7ccd2', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }),
  );
  bowl.position.y = top + 1.5 * M;
  bowl.castShadow = true;
  g.add(bowl);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6 * M, 8, 6), new THREE.MeshBasicMaterial({ color: 0x550000, toneMapped: false }));
  lamp.position.y = top + 3.4 * M;
  g.add(lamp);
  kit.onTick((dt, t) => lamp.material.color.set(Math.floor(t * 1.2) % 2 ? '#ff2030' : '#3a0005'));
  const sq = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [x + a * R0, z + b * R0]);
  kit.solid(sq, 4);
  kit.mini(sq, '#dfe3e8');
  kit.label('Braciere Olimpico', x, z, (B.h || 57) + 8, '#ff9f43');
}

function arena(kit, A) {
  const { THREE, M, GB } = kit;
  const ring = kit.W(A.outer),
    ob = kit.obb(ring),
    H = A.h || 12;
  const [c, g] = kit.cv(512, 256),
    [e, ge] = kit.cv(512, 256);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 512, 256);
  kit.noise(g, 512, 256, '#c8cdd3', 1800, 0.035);
  for (let x = 0; x < 512; x += 32) {
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(x, 0, 2, 190);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(x + 2, 0, 2, 190);
  }
  for (const y of [60, 124]) {
    g.fillStyle = '#9ea5ad';
    g.fillRect(0, y, 512, 8);
  }
  g.fillStyle = '#26303b';
  g.fillRect(0, 190, 512, 66);
  g.fillStyle = '#b8bec5';
  for (let x = 0; x < 512; x += 64) g.fillRect(x, 190, 4, 66);
  ge.fillStyle = '#ffe6bf';
  ge.fillRect(0, 194, 512, 62);
  const gw = new GB();
  kit.walls(gw, ring, 0, H * M, { texW: 24, texH: H });
  kit.mesh(gw, kit.lit(kit.tex(c), kit.tex(e), { night: 1.0, mat: { metalness: 0.45, roughness: 0.35 } }));
  // panelled roof with a perimeter parapet and plant units
  const [rc, rg] = kit.cv(128, 128);
  kit.noise(rg, 128, 128, '#a2a8af', 400, 0.04);
  rg.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = 0; k < 128; k += 32) {
    rg.fillRect(k, 0, 2, 128);
    rg.fillRect(0, k, 128, 2);
  }
  const gr = new GB();
  kit.flat(gr, ring, [], H * M, { tex: 12 });
  kit.mesh(gr, kit.std({ map: kit.tex(rc), roughness: 0.8 }));
  const par = new GB();
  kit.walls(par, ring, H * M, (H + 1.1) * M, { texW: 4, texH: 4 });
  kit.walls(par, ring, H * M, (H + 1.1) * M, { texW: 4, texH: 4, inside: true });
  kit.mesh(par, kit.std({ color: '#b9bec4', metalness: 0.4, roughness: 0.4 }));
  const hv = new GB();
  for (const [u, v] of [
    [-0.3, -0.25],
    [-0.1, 0.28],
    [0.15, -0.2],
    [0.33, 0.22],
  ])
    kit.box(hv, ...kit.local(ob, u * ob.len, v * ob.wid), ob.ang, 9 * M, 4 * M, H * M, (H + 2.2) * M);
  kit.mesh(hv, kit.std({ color: '#c9cdd2', metalness: 0.3 }));
  const sky = new GB();
  for (const v of [-0.25, 0, 0.25]) {
    const a = kit.local(ob, -ob.len * 0.42, v * ob.wid),
      b = kit.local(ob, ob.len * 0.42, v * ob.wid);
    kit.ribbon(sky, [a, b], 3 * M, H * M + 0.6 * M);
  }
  kit.mesh(sky, kit.lit(null, null, { glow: '#cfe3ff', day: 0, night: 0.7, mat: { color: '#5d7385', roughness: 0.2, metalness: 0.4 } }), {
    cast: false,
  });
  for (const side of ['+v', '-v'])
    kit.obbSign(ob, side, 'INALPI ARENA', H - 4, 5, {
      bg: '#1b2230',
      fg: '#ffffff',
      glow: '#ffffff',
      family: '"Arial Black",Impact,sans-serif',
    });
  kit.solid(ring, H);
  kit.mini(ring, '#8f959c');
  kit.label('Inalpi Arena', ob.cx, ob.cz, H + 14, '#7dd3fc');
}
