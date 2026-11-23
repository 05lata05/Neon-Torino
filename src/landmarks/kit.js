// Building kit for landmarks: geometry, canvas-drawn textures, collisions, minimap.
// Each landmark receives `kit` and works in "map" coordinates (metres) or "world" coordinates (1 m = 5 units).
// Conventions: world x = east, world z = south, y = up. Rings are arrays of [x, z].

export const M = 5; // game units per metre

export function makeKit(ctx) {
  const { THREE, scene } = ctx;
  const kit = { THREE, scene, ctx, M };

  // ------------------------------------------------------------ coordinates
  kit.W = ring => ring.map(ctx.toW); // map ring -> world ring
  kit.P = p => ctx.toW(p);
  kit.area = r => {
    let a = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i],
        q = r[(i + 1) % r.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
  };
  kit.centroid = r => {
    let x = 0,
      z = 0;
    for (const p of r) {
      x += p[0];
      z += p[1];
    }
    return [x / r.length, z / r.length];
  };
  kit.pointIn = (p, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i],
        b = r[j];
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  kit.len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  // minimum-area oriented rectangle: centre, axes, size (world)
  kit.obb = ring => {
    let best = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length],
        L = kit.len(a, b);
      if (L < 0.5) continue;
      const ux = (b[0] - a[0]) / L,
        uz = (b[1] - a[1]) / L;
      let u0 = 1e9,
        u1 = -1e9,
        v0 = 1e9,
        v1 = -1e9;
      for (const p of ring) {
        const u = p[0] * ux + p[1] * uz,
          v = -p[0] * uz + p[1] * ux;
        u0 = Math.min(u0, u);
        u1 = Math.max(u1, u);
        v0 = Math.min(v0, v);
        v1 = Math.max(v1, v);
      }
      const ar = (u1 - u0) * (v1 - v0);
      if (!best || ar < best.ar) best = { ar, ux, uz, u0, u1, v0, v1 };
    }
    let { ux, uz, u0, u1, v0, v1 } = best;
    if (v1 - v0 > u1 - u0) {
      [ux, uz] = [-uz, ux];
      [u0, u1, v0, v1] = [v0, v1, -u1, -u0];
    } // long axis = u
    const cu = (u0 + u1) / 2,
      cv = (v0 + v1) / 2;
    return {
      cx: cu * ux - cv * uz,
      cz: cu * uz + cv * ux,
      ux,
      uz,
      vx: -uz,
      vz: ux,
      len: u1 - u0,
      wid: v1 - v0,
      ang: Math.atan2(uz, ux),
      fill: Math.abs(kit.area(ring)) / ((u1 - u0) * (v1 - v0) || 1),
    };
  };
  kit.local = (ob, lu, lv) => [ob.cx + ob.ux * lu + ob.vx * lv, ob.cz + ob.uz * lu + ob.vz * lv];

  // ------------------------------------------------------------ geometry
  // triangle builder with normals, uvs and optional colours; one builder per material
  class GB {
    constructor() {
      this.p = [];
      this.n = [];
      this.u = [];
      this.c = [];
      this.col = [1, 1, 1];
    }
    tri(a, b, c, ua, ub, uc) {
      // a,b,c = [x,y,z]; normal is computed
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1],
        ny = e1[2] * e2[0] - e1[0] * e2[2],
        nz = e1[0] * e2[1] - e1[1] * e2[0];
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      for (const [v, uv] of [
        [a, ua],
        [b, ub],
        [c, uc],
      ]) {
        this.p.push(v[0], v[1], v[2]);
        this.n.push(nx, ny, nz);
        this.u.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
        this.c.push(...this.col);
      }
    }
    quad(a, b, c, d, ua, ub, uc, ud) {
      this.tri(a, b, c, ua, ub, uc);
      this.tri(a, c, d, ua, uc, ud);
    }
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      return g;
    }
    get empty() {
      return !this.p.length;
    }
  }
  kit.GB = GB;
  kit.mesh = (gb, mat, { cast = true, receive = true } = {}) => {
    if (gb.empty) return null;
    const m = new THREE.Mesh(gb.geo(), mat);
    m.castShadow = cast;
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  };

  // vertical walls along a ring (world), normals facing outwards; u in metres/texW, v in metres/texH
  kit.walls = (gb, ring, y0, y1, { texW = 8, texH = 8, u0 = 0, inside = false } = {}) => {
    // the A,B,C,D order gives normal (-dz, dx): we use it if it points out of the ring, otherwise we flip
    const sgn = kit.area(ring) > 0 ? 1 : -1;
    let u = u0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length],
        L = kit.len(a, b) / M;
      if (L < 0.05) continue;
      const ua = u / texW,
        ub = (u + L) / texW,
        va = y0 / M / texH,
        vb = y1 / M / texH;
      const A = [a[0], y0, a[1]],
        B = [b[0], y0, b[1]],
        C = [b[0], y1, b[1]],
        D = [a[0], y1, a[1]];
      // for a ring with positive (shoelace x,z) area the outside is at (dz, -dx), so the reverse order is needed
      const abcdOut = sgn < 0;
      if (abcdOut !== inside) gb.quad(A, B, C, D, [ua, va], [ub, va], [ub, vb], [ua, vb]);
      else gb.quad(B, A, D, C, [ub, va], [ua, va], [ua, vb], [ub, vb]);
      u += L;
    }
    return u;
  };

  // flat roof (holes allowed), facing up; uv in metres/tex
  kit.flat = (gb, ring, holes, y, { tex = 10, down = false } = {}) => {
    const c2 = ring.map(p => new THREE.Vector2(p[0], p[1])),
      h2 = (holes || []).map(r => r.map(p => new THREE.Vector2(p[0], p[1])));
    let tris;
    try {
      tris = THREE.ShapeUtils.triangulateShape(c2, h2);
    } catch (e) {
      return;
    }
    const all = [...ring];
    for (const h of holes || []) all.push(...h);
    for (const t of tris) {
      const [a, b, c] = t.map(i => all[i]);
      if (!a || !b || !c) continue;
      const up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      let v = up >= 0 ? [a, b, c] : [a, c, b];
      if (down) v = [v[0], v[2], v[1]];
      gb.tri(...v.map(p => [p[0], y, p[1]]), ...v.map(p => [p[0] / M / tex, p[1] / M / tex]));
    }
  };

  // pitched roofs on an oriented rectangle (world): hipped, gabled, round (barrel), skillion
  kit.roof = (gb, ob, y, h, shape, over = 0.6 * M) => {
    const L = ob.len / 2 + over,
      Wd = ob.wid / 2 + over,
      P = (u, v, yy) => {
        const q = kit.local(ob, u, v);
        return [q[0], yy, q[1]];
      };
    const uv = (u, v) => [u / M / 4, v / M / 4];
    if (shape === 'hipped' || shape === 'pyramidal') {
      const r = shape === 'pyramidal' ? L : Math.max(0, L - Wd);
      const a = P(-L, -Wd, y),
        b = P(L, -Wd, y),
        c = P(L, Wd, y),
        d = P(-L, Wd, y),
        e = P(-r, 0, y + h),
        f = P(r, 0, y + h);
      gb.quad(a, e, f, b, uv(-L, -Wd), uv(-r, 0), uv(r, 0), uv(L, -Wd));
      gb.quad(c, f, e, d, uv(L, Wd), uv(r, 0), uv(-r, 0), uv(-L, Wd));
      gb.tri(b, f, c, uv(0, 0), uv(1, 0.5), uv(0, 1));
      gb.tri(d, e, a, uv(0, 0), uv(1, 0.5), uv(0, 1));
    } else if (shape === 'gabled') {
      const a = P(-L, -Wd, y),
        b = P(L, -Wd, y),
        c = P(L, Wd, y),
        d = P(-L, Wd, y),
        e = P(-L, 0, y + h),
        f = P(L, 0, y + h);
      gb.quad(a, e, f, b, uv(-L, -Wd), uv(-L, 0), uv(L, 0), uv(L, -Wd));
      gb.quad(c, f, e, d, uv(L, Wd), uv(L, 0), uv(-L, 0), uv(-L, Wd));
      gb.tri(b, f, c, uv(0, 0), uv(0.5, 1), uv(1, 0));
      gb.tri(d, e, a, uv(0, 0), uv(0.5, 1), uv(1, 0));
    } else if (shape === 'round') {
      const N = 14;
      for (let i = 0; i < N; i++) {
        const t0 = (Math.PI * i) / N,
          t1 = (Math.PI * (i + 1)) / N;
        const v0 = -Math.cos(t0) * Wd,
          v1 = -Math.cos(t1) * Wd,
          y0 = y + Math.sin(t0) * h,
          y1 = y + Math.sin(t1) * h;
        gb.quad(P(-L, v0, y0), P(-L, v1, y1), P(L, v1, y1), P(L, v0, y0), uv(-L, i), uv(-L, i + 1), uv(L, i + 1), uv(L, i));
        gb.tri(P(-L, 0, y), P(-L, v1, y1), P(-L, v0, y0));
        gb.tri(P(L, 0, y), P(L, v0, y0), P(L, v1, y1));
      }
    } else if (shape === 'skillion') {
      const a = P(-L, -Wd, y + h),
        b = P(L, -Wd, y + h),
        c = P(L, Wd, y),
        d = P(-L, Wd, y);
      gb.quad(a, d, c, b, uv(-L, -Wd), uv(-L, Wd), uv(L, Wd), uv(L, -Wd));
    }
  };

  // hip roof for any footprint: slopes up to a ring shrunk by `inset`, then flat
  kit.insetRoof = (gb, ring, y, h, inset) => {
    const n = ring.length,
      s = kit.area(ring) > 0 ? 1 : -1,
      nrm = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i],
        b = ring[(i + 1) % n],
        L = kit.len(a, b) || 1;
      nrm.push([(-(b[1] - a[1]) / L) * s, ((b[0] - a[0]) / L) * s]);
    }
    const inner = [];
    for (let i = 0; i < n; i++) {
      const n1 = nrm[(i + n - 1) % n],
        n2 = nrm[i];
      let mx = n1[0] + n2[0],
        mz = n1[1] + n2[1];
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml;
      mz /= ml;
      const k = Math.min(3, 1 / Math.max(0.3, mx * n2[0] + mz * n2[1]));
      inner.push([ring[i][0] + mx * inset * k, ring[i][1] + mz * inset * k]);
    }
    const okInner =
      kit.area(inner) * kit.area(ring) > 0 &&
      Math.abs(kit.area(inner)) > 0.08 * Math.abs(kit.area(ring)) &&
      inner.every(p => kit.pointIn(p, ring));
    if (!okInner) {
      const c = kit.centroid(ring);
      for (let i = 0; i < n; i++) {
        const a = ring[i],
          b = ring[(i + 1) % n];
        gb.tri([a[0], y, a[1]], [b[0], y, b[1]], [c[0], y + h, c[1]]);
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = ring[i],
        b = ring[(i + 1) % n],
        c = inner[(i + 1) % n],
        d = inner[i];
      gb.quad(
        [a[0], y, a[1]],
        [b[0], y, b[1]],
        [c[0], y + h, c[1]],
        [d[0], y + h, d[1]],
        [0, 0],
        [kit.len(a, b) / M / 4, 0],
        [kit.len(a, b) / M / 4, h / M / 4],
        [0, h / M / 4],
      );
    }
    kit.flat(gb, inner, [], y + h);
  };

  // oriented box (world): centre, size along u/v, height range
  kit.box = (gb, cx, cz, ang, du, dv, y0, y1, texM = 4) => {
    const ux = Math.cos(ang),
      uz = Math.sin(ang),
      vx = -uz,
      vz = ux;
    const P = (u, v, y) => [cx + ux * u + vx * v, y, cz + uz * u + vz * v];
    const hu = du / 2,
      hv = dv / 2;
    const r = [
      [-hu, -hv],
      [hu, -hv],
      [hu, hv],
      [-hu, hv],
    ].map(([u, v]) => {
      const p = P(u, v, 0);
      return [p[0], p[2]];
    });
    kit.walls(gb, r, y0, y1, { texW: texM, texH: texM });
    kit.flat(gb, r, [], y1, { tex: texM });
  };

  // flat ribbon along a polyline (world)
  kit.ribbon = (gb, pts, w, y, uScale = 1) => {
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i],
        b = pts[i + 1],
        L = kit.len(a, b);
      if (L < 0.01) continue;
      const nx = ((-(b[1] - a[1]) / L) * w) / 2,
        nz = (((b[0] - a[0]) / L) * w) / 2;
      gb.quad(
        [a[0] + nx, y, a[1] + nz],
        [a[0] - nx, y, a[1] - nz],
        [b[0] - nx, y, b[1] - nz],
        [b[0] + nx, y, b[1] + nz],
        [0, (acc / M) * uScale],
        [1, (acc / M) * uScale],
        [1, ((acc + L) / M) * uScale],
        [0, ((acc + L) / M) * uScale],
      );
      acc += L;
    }
  };

  // instances of a geometry: items = [{x,y,z,ry,sx,sy,sz,col}]
  kit.instances = (geo, mat, items, { cast = true } = {}) => {
    if (!items.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, items.length),
      o = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y || 0, it.z);
      o.rotation.set(it.rx || 0, it.ry || 0, 0);
      o.scale.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (it.col) m.setColorAt(i, c.set(it.col));
    });
    m.castShadow = cast;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // ------------------------------------------------------------ materials and textures
  kit.cv = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  };
  kit.tex = (c, repeat = true) => ctx.canvasTex(c, repeat);
  kit.noise = (g, w, h, base, n = 2000, a = 0.05) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 1.2})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  };
  kit.std = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85 }, o));
  // OSM colour words ("green", "red"...) become building tints, not pure colours
  const NAMED = {
    green: '#4f7a4a',
    red: '#a3472f',
    white: '#f1f0ec',
    grey: '#8d8f94',
    gray: '#8d8f94',
    brown: '#7a5a40',
    black: '#2e2e2e',
    blue: '#3a5f8f',
    yellow: '#d9b85c',
    orange: '#c47a45',
    beige: '#e3d4b8',
  };
  kit.color = (c, def) => (!c ? def : c.startsWith('#') ? c : NAMED[c.toLowerCase()] || def);
  // material with windows that light up at night (emissiveMap); registered for the day/night cycle
  const nightMats = [];
  kit.lit = (map, emap, o = {}) => {
    const m = kit.std(
      Object.assign(
        { map, emissiveMap: emap, emissive: new THREE.Color(o.glow || '#ffe2b0'), emissiveIntensity: 0, vertexColors: !!o.vc },
        o.mat || {},
      ),
    );
    nightMats.push([m, o.day ?? 0.02, o.night ?? 0.95]);
    return m;
  };
  kit.onEnv = dk => {
    for (const [m, a, b] of nightMats) m.emissiveIntensity = a + (b - a) * dk;
  };

  // sign: text on a panel (texture + flat mesh), placed on a wall or free-standing
  kit.signTex = (
    text,
    {
      bg = '#ffffff',
      fg = '#111111',
      font = 'bold',
      h = 64,
      pad = 18,
      border = null,
      family = 'system-ui,Segoe UI,sans-serif',
      glow = null,
    } = {},
  ) => {
    const [m] = kit.cv(8, 8),
      mg = m.getContext('2d');
    mg.font = `${font} ${h * 0.62}px ${family}`;
    const w = Math.max(64, Math.ceil(mg.measureText(text).width + pad * 2));
    const [c, g] = kit.cv(w, h),
      [e, ge] = kit.cv(w, h);
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    } else g.clearRect(0, 0, w, h);
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = 4;
      g.strokeRect(2, 2, w - 4, h - 4);
    }
    for (const [cc, col] of [
      [g, fg],
      [ge, glow || fg],
    ]) {
      cc.font = `${font} ${h * 0.62}px ${family}`;
      cc.textAlign = 'center';
      cc.textBaseline = 'middle';
      cc.fillStyle = col;
      cc.fillText(text, w / 2, h / 2 + 2);
    }
    if (!glow) {
      ge.clearRect(0, 0, w, h);
    }
    return { map: kit.tex(c, false), emap: glow ? kit.tex(e, false) : null, aspect: w / h, transparent: !bg };
  };
  // vertical panel: centre (world), angle of the outward normal, height in metres
  kit.sign = (text, x, y, z, normalAng, hMeters, opts = {}) => {
    const s = kit.signTex(text, opts),
      hh = hMeters * M,
      ww = hh * s.aspect;
    const mat = s.emap
      ? kit.lit(s.map, s.emap, { glow: '#ffffff', day: 0.25, night: 1.4, mat: { transparent: s.transparent, roughness: 0.5 } })
      : kit.std({ map: s.map, transparent: s.transparent, roughness: 0.5 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), mat);
    m.position.set(x + Math.cos(normalAng) * 0.6, y, z + Math.sin(normalAng) * 0.6);
    m.rotation.y = -normalAng + Math.PI / 2;
    scene.add(m);
    return m;
  };
  // sign on one side of the oriented rectangle: side = '+u','-u','+v','-v'
  kit.obbSign = (ob, side, text, yMeters, hMeters, opts) => {
    const s = side[0] === '+' ? 1 : -1,
      ax = side[1];
    const off = (ax === 'u' ? ob.len : ob.wid) / 2;
    const [x, z] = ax === 'u' ? kit.local(ob, s * off, 0) : kit.local(ob, 0, s * off);
    const n = ax === 'u' ? Math.atan2(ob.uz * s, ob.ux * s) : Math.atan2(ob.vz * s, ob.vx * s);
    return kit.sign(text, x, yMeters * M, z, n, hMeters, opts);
  };
  // the side of the oriented rectangle facing a point (e.g. the street)
  kit.sideToward = (ob, x, z) => {
    const du = (x - ob.cx) * ob.ux + (z - ob.cz) * ob.uz,
      dv = (x - ob.cx) * ob.vx + (z - ob.cz) * ob.vz;
    return Math.abs(du) / ob.len > Math.abs(dv) / ob.wid ? (du > 0 ? '+u' : '-u') : dv > 0 ? '+v' : '-v';
  };
  // nearest point of a road (optionally with a given name) to (x, z)
  kit.nearestRoad = (x, z, name) => {
    if (!name) {
      const ne = ctx.nearestEdge(x, z, 900);
      return ne ? [ne.px, ne.py] : null;
    }
    let best = null,
      bd = 1e18;
    for (const e of ctx.edges) {
      if (e.name !== name) continue;
      for (let j = 0; j + 1 < e.pts.length; j++) {
        const a = e.pts[j],
          b = e.pts[j + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)),
          px = a[0] + t * dx,
          pz = a[1] + t * dz,
          d = (px - x) ** 2 + (pz - z) ** 2;
        if (d < bd) {
          bd = d;
          best = [px, pz];
        }
      }
    }
    return best;
  };
  kit.streetSide = (ob, name) => {
    const p = kit.nearestRoad(ob.cx, ob.cz, name) || kit.nearestRoad(ob.cx, ob.cz);
    return p ? kit.sideToward(ob, p[0], p[1]) : '+u';
  };
  kit.label = (text, x, z, hMeters, col) => {
    const tx = ctx.labelTex(text, col),
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, fog: false }));
    sp.scale.set((30 * tx.image.width) / 64, 30, 1);
    sp.position.set(x, hMeters * M, z);
    scene.add(sp);
    return sp;
  };

  // ------------------------------------------------------------ game world
  // collision: fills the grid (BUILD or WATER) with a height in metres; ring in world coordinates
  kit.solid = (ring, hMeters, tile) => {
    const t = tile ?? ctx.BUILD,
      h = hMeters * M;
    ctx.fillPoly([ring], i => {
      if (ctx.grid[i] === ctx.OUT) return;
      ctx.grid[i] = t;
      if (t === ctx.BUILD) ctx.hgrid[i] = Math.max(ctx.hgrid[i], h);
    });
  };
  kit.mini = (ring, color) => {
    const g = ctx.miniCv.getContext('2d'),
      s = ctx.MS;
    g.fillStyle = color;
    g.beginPath();
    ring.forEach((p, i) => (i ? g.lineTo(p[0] * s, p[1] * s) : g.moveTo(p[0] * s, p[1] * s)));
    g.closePath();
    g.fill();
  };
  kit.tileAt = (x, z) => ctx.tileAtPx(x, z);
  kit.ticks = [];
  kit.onTick = f => kit.ticks.push(f);
  kit.noRandomTrees = []; // rings (world) where the game must not plant random trees

  // mesh-panel fence along a ring (world), with an optional gap
  let netTex = null;
  kit.fence = (ring, { h = 2.2, gap = null, gapW = 6, color = '#3d4a40', closed = true } = {}) => {
    const posts = [],
      panels = new GB(),
      step = 2.5 * M;
    for (let i = 0; i < ring.length - (closed ? 0 : 1); i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length],
        Lg = kit.len(a, b);
      for (let s0 = 0; s0 < Lg - 0.1; s0 += step) {
        const t0 = s0 / Lg,
          t1 = Math.min(1, (s0 + step) / Lg),
          p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0],
          q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        if (gap && Math.hypot(p[0] - gap[0], p[1] - gap[1]) < gapW * M) continue;
        if (kit.tileAt(p[0], p[1]) === ctx.BUILD) continue;
        posts.push({ x: p[0], y: (h * M) / 2, z: p[1] });
        panels.quad([p[0], 0.1 * M, p[1]], [q[0], 0.1 * M, q[1]], [q[0], h * M, q[1]], [p[0], h * M, p[1]], [0, 0], [1, 0], [1, 1], [0, 1]);
      }
    }
    if (!netTex) {
      const [c, g] = kit.cv(64, 64);
      g.clearRect(0, 0, 64, 64);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      for (let k = 0; k <= 64; k += 16) {
        g.beginPath();
        g.moveTo(k, 0);
        g.lineTo(k, 64);
        g.stroke();
        g.beginPath();
        g.moveTo(0, k);
        g.lineTo(64, k);
        g.stroke();
      }
      netTex = kit.tex(c, true);
    }
    kit.mesh(panels, kit.std({ map: netTex, color, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), { cast: false });
    kit.instances(new THREE.BoxGeometry(0.22 * M, h * M, 0.22 * M), kit.std({ color }), posts, { cast: false });
  };

  // pools of light on the ground under lamps: they switch on when it gets dark
  let poolM = null;
  kit.lightPools = (pts, r = 9) => {
    if (!pts.length) return;
    if (!poolM) {
      const [c, g] = kit.cv(64, 64),
        gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,205,140,0.9)');
      gr.addColorStop(0.4, 'rgba(255,175,95,0.35)');
      gr.addColorStop(1, 'rgba(255,160,80,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      poolM = new THREE.MeshBasicMaterial({
        map: kit.tex(c, false),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
        fog: false,
      });
      ctx.envHooks.push(dk => {
        poolM.opacity = dk * 0.85;
      });
    }
    const m = kit.instances(
      new THREE.PlaneGeometry(r * 2 * M, r * 2 * M).rotateX(-Math.PI / 2),
      poolM,
      pts.map(([x, z]) => ({ x, y: 0.5, z })),
      { cast: false },
    );
    if (m) {
      m.receiveShadow = false;
      m.renderOrder = 1;
    }
  };

  // "real" trees: trunk + crown made of several spheres; items [{x,z,s}]
  kit.trees = (items, { col = ['#3f7d34', '#4a8a3a', '#567f2f', '#3b6f30'] } = {}) => {
    if (!items.length) return;
    const tr = [],
      cr = [];
    let sd = 777;
    const r = () => {
      sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0;
      return sd / 4294967296;
    };
    for (const t of items) {
      const s = (t.s || 1) * (0.85 + r() * 0.35),
        H = 26 * s;
      tr.push({ x: t.x, y: H * 0.35, z: t.z, sx: s, sy: s * 1.1, sz: s });
      for (let k = 0; k < 3; k++) {
        const a = r() * 6.28,
          d = k ? 5 * s : 0;
        cr.push({
          x: t.x + Math.cos(a) * d,
          y: H * (0.8 + k * 0.12),
          z: t.z + Math.sin(a) * d,
          s: (k ? 9 : 12) * s,
          ry: r() * 3,
          col: col[Math.floor(r() * col.length)],
        });
      }
    }
    kit.instances(new THREE.CylinderGeometry(1.6, 2.4, 20, 7), kit.std({ color: '#5d4433' }), tr);
    kit.instances(new THREE.IcosahedronGeometry(1, 1), kit.std({ color: '#ffffff', flatShading: true }), cr);
  };

  // ------------------------------------------------------------ building from OSM tags
  const num = v => {
    const f = parseFloat(String(v || '').replace(',', '.'));
    return isFinite(f) ? f : 0;
  };
  kit.heightOf = (tags, defLevels = 2) => {
    const lv = num(tags['building:levels']) || defLevels;
    const h = num(tags.height) || lv * 3.3 + 1;
    const rh = num(tags['roof:height']) || (tags['roof:shape'] && tags['roof:shape'] !== 'flat' ? Math.min(6, 2 + lv * 0.6) : 0);
    return { wall: Math.max(2.5, h - (num(tags.height) ? rh : 0)), roof: rh };
  };
  // generic parametric facade: grid of windows with a night map. module = 4 m x 3.3 m
  const facCache = {};
  kit.facade = (style = 'office', base = '#e9e4da') => {
    const key = style + base;
    if (facCache[key]) return facCache[key];
    const [c, g] = kit.cv(256, 256),
      [e, ge] = kit.cv(256, 256);
    ge.fillStyle = '#000';
    ge.fillRect(0, 0, 256, 256);
    kit.noise(g, 256, 256, base, 900, 0.04);
    const win = (x, y, w, h, glass = '#2b3a4c', frame = '#d9d3c7', litP = 0.4) => {
      g.fillStyle = frame;
      g.fillRect(x - 4, y - 4, w + 8, h + 8);
      g.fillStyle = glass;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(x + 2, y + 2, w * 0.3, h - 4);
      if (Math.random() < litP) {
        ge.fillStyle = Math.random() < 0.7 ? '#f3d29a' : '#cfe3ff';
        ge.fillRect(x, y, w, h);
      }
    };
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 2; k++) {
        const x0 = k * 128,
          y0 = r * 128;
        if (style === 'industrial') {
          g.fillStyle = 'rgba(0,0,0,0.08)';
          for (let x = x0; x < x0 + 128; x += 16) g.fillRect(x, y0, 2, 128);
          if (r === 0) win(x0 + 12, y0 + 50, 104, 22, '#3a4856', '#c9c9c9', 0.3);
        } else if (style === 'classic') {
          win(x0 + 40, y0 + 22, 48, 82, '#2c3846', '#f2ece0', 0.45);
          g.fillStyle = '#3f6b45';
          g.fillRect(x0 + 18, y0 + 22, 20, 82);
          g.fillRect(x0 + 90, y0 + 22, 20, 82);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          for (let y = y0 + 24; y < y0 + 104; y += 6) {
            g.fillRect(x0 + 18, y, 20, 2);
            g.fillRect(x0 + 90, y, 20, 2);
          }
          g.fillStyle = '#f4efe4';
          g.fillRect(x0 + 32, y0 + 10, 64, 8);
          g.fillRect(x0 + 34, y0 + 108, 60, 6);
          g.fillStyle = 'rgba(0,0,0,0.06)';
          g.fillRect(x0, y0 + 122, 128, 6);
        } else if (style === 'glass') {
          g.fillStyle = '#5d7385';
          g.fillRect(x0 + 4, y0 + 8, 120, 110);
          g.fillStyle = 'rgba(255,255,255,0.12)';
          g.fillRect(x0 + 8, y0 + 12, 40, 100);
          g.fillStyle = '#cfd5da';
          g.fillRect(x0, y0 + 118, 128, 10);
          g.fillRect(x0 + 62, y0 + 8, 4, 110);
          if (Math.random() < 0.5) {
            ge.fillStyle = '#e8f0ff';
            ge.fillRect(x0 + 4, y0 + 8, 120, 110);
          }
        } else if (style === 'pool') {
          g.fillStyle = '#4f7f99';
          g.fillRect(x0 + 8, y0 + 6, 112, 116);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(x0 + 12, y0 + 10, 30, 108);
          g.fillStyle = base;
          g.fillRect(x0 + 60, y0 + 6, 8, 116);
          ge.fillStyle = '#bfe6ff';
          ge.fillRect(x0 + 8, y0 + 6, 112, 116);
        } else if (style === 'rationalist') {
          // 1930s: white plaster, tall narrow windows, pilasters
          g.fillStyle = 'rgba(0,0,0,0.06)';
          g.fillRect(x0, y0, 10, 128);
          g.fillRect(x0 + 118, y0, 10, 128);
          for (const wx of [30, 76]) win(x0 + wx, y0 + 12, 22, 104, '#30404f', '#f4f1ea', 0.5);
          g.fillStyle = 'rgba(0,0,0,0.08)';
          g.fillRect(x0, y0 + 124, 128, 4);
        } else {
          // office / university
          win(x0 + 22, y0 + 26, 84, 66, '#2e3d4f', '#d7d2c8', 0.5);
          g.fillStyle = 'rgba(0,0,0,0.07)';
          g.fillRect(x0, y0 + 118, 128, 6);
        }
      }
    return (facCache[key] = [kit.tex(c), kit.tex(e)]);
  };
  // builds a whole building from its tags: walls on the real footprint, roof from the roof:shape tag
  kit.tagBuilding = (b, o = {}) => {
    const t = b.tags || {},
      ring = kit.W(b.outer),
      ob = kit.obb(ring);
    const { wall, roof } = kit.heightOf(t, o.levels ?? 2);
    const wallH = (o.wallH ?? wall) * M,
      style = o.style || 'office';
    const base = kit.color(o.color || t['building:colour'], '#e6e0d4');
    const [map, emap] = kit.facade(style, base);
    const mat = o.mat || kit.lit(map, emap, { glow: style === 'pool' ? '#cdeeff' : '#ffe2b0', night: style === 'industrial' ? 0.5 : 0.9 });
    const gw = new GB();
    kit.walls(gw, ring, 0, wallH, { texW: 8, texH: 6.6 });
    kit.mesh(gw, mat);
    const shape = o.roofShape || t['roof:shape'] || 'flat';
    const rcol = kit.color(o.roofColor || t['roof:colour'], '#8d8f94');
    const gr = new GB(),
      rh = (roof || Math.min(5, (ob.wid / M) * 0.35)) * M;
    if (shape === 'none') {
      /* roof built separately by the caller */
    } else if (shape !== 'flat' && ob.fill > 0.75) kit.roof(gr, ob, wallH, rh, shape, o.over ?? 0.4 * M);
    else if (shape !== 'flat')
      kit.insetRoof(gr, ring, wallH, rh, Math.min(6 * M, ob.wid * 0.4)); // L-shaped, U-shaped footprints...
    else {
      kit.flat(gr, ring, [], wallH);
    }
    kit.mesh(gr, kit.std({ color: rcol, roughness: 0.9, side: THREE.DoubleSide }));
    if (o.solid !== false) kit.solid(ring, (o.wallH ?? wall) + (roof || 0));
    kit.mini(ring, o.mini || '#22272f');
    return { ring, ob, wallH, roofH: roof * M };
  };

  return kit;
}
