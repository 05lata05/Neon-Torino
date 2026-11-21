// Scuola di Management ed Economia dell'Università di Torino (corso Unione Sovietica 218 bis).
// Impronte, piani e tetti da OSM (edificio storico a 4 piani con tetto a capanna, blocco a 5 piani,
// Nuovo Polo Didattico a 3 piani). Piazza, rastrelliere e pennoni sono aggiunte di contorno.

export default function build(kit, L) {
  const S = L.sme; if (!S) return;
  const { THREE, M, GB } = kit;
  const area = kit.W(S.outer);
  const plaza = new GB(); kit.flat(plaza, area, [], 0.2, { tex: 3 });
  const [pc, pg] = kit.cv(128, 128); kit.noise(pg, 128, 128, '#cfc9bd', 500, 0.05); pg.strokeStyle = 'rgba(0,0,0,0.12)'; pg.lineWidth = 2;
  for (let k = 0; k <= 128; k += 32) { pg.beginPath(); pg.moveTo(k, 0); pg.lineTo(k, 128); pg.stroke(); pg.beginPath(); pg.moveTo(0, k); pg.lineTo(128, k); pg.stroke(); }
  kit.mesh(plaza, kit.std({ map: kit.tex(pc, true), roughness: 0.95 }), { cast: false });

  let main = null, best = 0;
  for (const b of S.buildings) {
    const t = b.tags, lv = parseInt(t['building:levels'] || '0', 10);
    let o;
    if (t.name && /Polo Didattico/i.test(t.name)) o = { style: 'glass', color: '#e9ecee', levels: lv || 3 };
    else if (t['roof:shape'] === 'gabled') o = { style: 'classic', color: '#c47a45', roofColor: '#a3472f', levels: lv || 4 };
    else o = { style: 'office', color: '#e4ddcf', levels: lv || 2, roofColor: '#8f9196' };
    const r = kit.tagBuilding(b, Object.assign(o, { mini: '#6b5a8e' }));
    const a = Math.abs(kit.area(r.ring)) * (t['roof:shape'] === 'gabled' ? 2 : 1);
    if (a > best) { best = a; main = r; }
    if (t.name) kit.obbSign(r.ob, kit.streetSide(r.ob), t.name.toUpperCase(), Math.min(r.wallH / M - 1.5, 4.5), 0.9, { bg: '#ffffff', fg: '#2b2b2b' });
  }
  if (main) {
    const side = kit.streetSide(main.ob, 'Corso Unione Sovietica');
    kit.obbSign(main.ob, side, 'SCUOLA DI MANAGEMENT ED ECONOMIA', main.wallH / M - 2.2, 1.5, { bg: '#fdfbf7', fg: '#8a1c24', family: 'Georgia,serif', glow: '#8a1c24' });
    kit.obbSign(main.ob, side, 'UNIVERSITÀ DEGLI STUDI DI TORINO', main.wallH / M - 3.9, 0.8, { bg: '#fdfbf7', fg: '#333333', family: 'Georgia,serif' });
    // pennoni con bandiere (Italia, Europa) e rastrelliere davanti all'ingresso
    const ob = main.ob, s = side[0] === '+' ? 1 : -1, ax = side[1], off = (ax === 'u' ? ob.len : ob.wid) / 2 + 6 * M;
    const flags = [['#009246', '#f1f2f1', '#ce2b37'], ['#003399']];
    flags.forEach((cols, i) => {
      const along = (i - 0.5) * 8 * M, [x, z] = ax === 'u' ? kit.local(ob, s * off, along) : kit.local(ob, along, s * off);
      const pole = new GB(); kit.box(pole, x, z, 0, 0.25 * M, 0.25 * M, 0, 10 * M); kit.mesh(pole, kit.std({ color: '#d0d4d8', metalness: 0.6 }));
      const [fc, fg] = kit.cv(96, 64); if (cols.length === 3) cols.forEach((c, k) => { fg.fillStyle = c; fg.fillRect(k * 32, 0, 32, 64); })
      else { fg.fillStyle = cols[0]; fg.fillRect(0, 0, 96, 64); fg.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; fg.beginPath(); fg.arc(48 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 3, 0, 6.3); fg.fill(); } }
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(2.4 * M, 1.6 * M).translate(1.2 * M, 0, 0), kit.std({ map: kit.tex(fc, false), side: THREE.DoubleSide }));
      fm.position.set(x, 9 * M, z); kit.scene.add(fm); kit.onTick((dt, t) => { fm.rotation.y = 0.5 + Math.sin(t * 0.7 + i) * 0.25; });
    });
    const racks = [];
    for (let k = 0; k < 8; k++) { const along = (k - 3.5) * 1.2 * M + 14 * M, [x, z] = ax === 'u' ? kit.local(ob, s * (off - 2 * M), along) : kit.local(ob, along, s * (off - 2 * M)); racks.push({ x, y: 0.5 * M, z, ry: -ob.ang + (ax === 'u' ? 0 : Math.PI / 2) }); }
    kit.instances(new THREE.TorusGeometry(0.45 * M, 0.06 * M, 5, 12, Math.PI), kit.std({ color: '#9aa3ab', metalness: 0.7 }), racks, { cast: false });
  }
  const [lx, lz] = kit.centroid(area);
  kit.label('Economia (SME)', lx, lz, 36, '#c4b5fd');
}
