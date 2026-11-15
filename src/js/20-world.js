// ===== World: the Bruisers performance center ===============================
// Coordinates: x runs west(-) to east(+), z runs north(-) to south(+). 1 unit = 1 meter.
const ROOMS = {
  weight:    { name: 'Weight Room',    x1: -30, x2: -18, z1: -14, z2: -2.5, wing: 'north', door: [-24, -2.5] },
  locker:    { name: 'Locker Room',    x1: -18, x2: -6,  z1: -14, z2: -2.5, wing: 'north', door: [-12, -2.5] },
  training:  { name: 'Training Room',  x1: -6,  x2: 6,   z1: -14, z2: -2.5, wing: 'north', door: [0, -2.5] },
  equipment: { name: 'Equipment Room', x1: 6,   x2: 18,  z1: -14, z2: -2.5, wing: 'north', door: [12, -2.5] },
  cafeteria: { name: 'Cafeteria',      x1: -30, x2: -18, z1: 2.5, z2: 14,   wing: 'south', door: [-24, 2.5] },
  film:      { name: 'Film Room',      x1: -18, x2: -6,  z1: 2.5, z2: 14,   wing: 'south', door: [-12, 2.5] },
  coach:     { name: "Coach's Office", x1: -6,  x2: 0,   z1: 2.5, z2: 14,   wing: 'south', door: [-3, 2.5] },
  gm:        { name: 'GM Office',      x1: 0,   x2: 6,   z1: 2.5, z2: 14,   wing: 'south', door: [3, 2.5] },
  lobby:     { name: 'Lobby',          x1: 6,   x2: 18,  z1: 2.5, z2: 14,   wing: 'south', door: [12, 2.5] },
  hall:      { name: 'Main Hall',      x1: -30, x2: 18,  z1: -2.5, z2: 2.5 },
  field:     { name: 'Practice Field', x1: 18,  x2: 46,  z1: -14, z2: 14 }
};
const ROOM_IDS = ['weight', 'locker', 'training', 'equipment', 'cafeteria', 'film', 'coach', 'gm', 'lobby'];
function roomAt(x, z) {
  for (const id of ROOM_IDS) { const r = ROOMS[id]; if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return id; }
  if (x >= 18) return 'field';
  return 'hall';
}

const World = {
  root: null, colliders: [], hotspots: new Map(), fixtures: [], weaponHome: {}, struggle: {}, hides: {},
  dummies: [], sled: null, footballs: [], anim: [], screens: [], windows: [], caseLayer: null, beam: null, rainTex: []
};

let M = null;
const H = 4, FH = 10, WT = 0.3;

// ---- static batching ----
const batches = new Map();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
let T = { x: 0, z: 0, ry: 0 };
function at(x, z, ry, fn) { const prev = T; T = { x, z, ry }; fn(); T = prev; }
function tx(lx, lz) { const c = Math.cos(T.ry), s = Math.sin(T.ry); return [T.x + lx * c + lz * s, T.z - lx * s + lz * c]; }

function addStatic(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m4.compose(_p, _q, _s);
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  g.applyMatrix4(_m4);
  let b = batches.get(mat); if (!b) { b = []; batches.set(mat, b); }
  b.push(g);
}
function flushStatic(parent) {
  for (const [mat, geoms] of batches) {
    let n = 0; for (const g of geoms) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of geoms) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c; g.dispose();
    }
    const sc = mat.userData.uvScale;
    if (sc) {
      for (let i = 0; i < n; i++) {
        const nx = nor[i * 3], ny = nor[i * 3 + 1], x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        let u, v;
        if (Math.abs(ny) > 0.6) { u = x / sc; v = z / sc; } else if (Math.abs(nx) > 0.6) { u = z / sc; v = y / sc; } else { u = x / sc; v = y / sc; }
        uv[i * 2] = u; uv[i * 2 + 1] = v;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat); mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    parent.add(mesh);
  }
  batches.clear();
}

function collide(x, z, w, d) { World.colliders.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 }); }
function collideR(x, z, w, d, ry) { const sw = Math.abs(Math.sin(ry)) > 0.5; collide(x, z, sw ? d : w, sw ? w : d); }

// y is the BOTTOM for box/cyl; cylC/sph use center y
function box(w, h, d, mat, x, y, z, o = {}) {
  const [wx, wz] = tx(x, z); const ry = (o.ry || 0) + T.ry;
  addStatic(new THREE.BoxGeometry(w, h, d), mat, wx, y + h / 2, wz, o.rx || 0, ry, o.rz || 0);
  if (o.col) collideR(wx, wz, w, d, ry);
}
function cyl(rt, rb, h, mat, x, y, z, o = {}) {
  const [wx, wz] = tx(x, z);
  addStatic(new THREE.CylinderGeometry(rt, rb, h, o.seg || 16, 1, !!o.open), mat, wx, y + h / 2, wz, 0, T.ry, 0);
  if (o.col) { const r = Math.max(rt, rb) * 2; collide(wx, wz, r, r); }
}
function cylC(rt, rb, h, mat, x, y, z, o = {}) {
  const [wx, wz] = tx(x, z);
  addStatic(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14), mat, wx, y, wz, o.rx || 0, (o.ry || 0) + T.ry, o.rz || 0);
}
function sph(r, mat, x, y, z, o = {}) {
  const [wx, wz] = tx(x, z);
  addStatic(new THREE.SphereGeometry(r, o.seg || 14, o.seg2 || 10), mat, wx, y, wz, o.rx || 0, (o.ry || 0) + T.ry, o.rz || 0, o.sx || 1, o.sy || 1, o.sz || 1);
}

function plane(w, h, material, x, y, z, ry, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  (parent || World.root).add(m); return m;
}
function sign(text, x, y, z, ry, w, h, o = {}) {
  const tex = signTexture(text, Object.assign({ w: Math.round(512 * Math.max(1, w / h / 4)), h: 128 }, o));
  return plane(w, h, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: !!o.transparent }), x, y, z, ry);
}
function picture(tex, x, y, z, ry, w, h, lit) {
  const mat = lit ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }) : new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  return plane(w, h, mat, x, y, z, ry);
}

function initMaterials() {
  const S = (p, uvScale) => { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8 }, p)); if (uvScale) m.userData.uvScale = uvScale; return m; };
  M = {
    wall: S({ map: TEX.block, roughness: 0.95 }, 1.6),
    ceiling: S({ map: TEX.ceiling, roughness: 1, color: 0x8f8d86 }, 1.2),
    fieldCeil: S({ color: 0x1a1e24, roughness: 1 }),
    rubber: S({ map: TEX.rubber, roughness: 0.95 }, 2),
    tile: S({ map: TEX.tile, roughness: 0.45 }, 1.2),
    tileBlue: S({ map: TEX.tileBlue, roughness: 0.35 }, 1.2),
    checker: S({ map: TEX.checker, roughness: 0.5 }, 0.9),
    wood: S({ map: TEX.wood, roughness: 0.6 }, 2.2),
    carpetNavy: S({ map: TEX.carpetNavy, roughness: 1 }, 1.6),
    carpetDark: S({ map: TEX.carpetDark, roughness: 1 }, 1.6),
    concrete: S({ map: TEX.concrete, roughness: 0.85 }, 3),
    hall: S({ map: TEX.hall, roughness: 0.32 }, 3),
    stone: S({ map: TEX.stone, roughness: 0.22 }, 3),
    turf: S({ map: TEX.field, roughness: 0.95 }),
    red: S({ color: 0xa3271f, roughness: 0.6 }),
    redPad: S({ color: 0x8c211b, roughness: 0.85 }),
    gold: S({ color: 0xd8a53e, roughness: 0.28, metalness: 0.85 }),
    goldPaint: S({ color: 0xd0a040, roughness: 0.55 }),
    steel: S({ color: 0xb4bbc2, roughness: 0.35, metalness: 0.45 }),
    darkSteel: S({ color: 0x3d4248, roughness: 0.45, metalness: 0.6 }),
    black: S({ color: 0x1a1b1e, roughness: 0.7 }),
    white: S({ color: 0xe6e3dc, roughness: 0.6 }),
    offwhite: S({ color: 0xc9c4ba, roughness: 0.7 }),
    woodDark: S({ color: 0x4f3320, roughness: 0.62 }),
    woodLight: S({ color: 0x9a6a3e, roughness: 0.6 }),
    pad: S({ color: 0x9a2a23, roughness: 0.75 }),
    navy: S({ color: 0x1f2a44, roughness: 0.7 }),
    gray: S({ color: 0x5d636b, roughness: 0.7 }),
    lightGray: S({ color: 0xa9aeb4, roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa9cfe0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.18, depthWrite: false }),
    frame: S({ color: 0x2b2e33, roughness: 0.55, metalness: 0.35 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff1d8 }),
    lightCool: new THREE.MeshBasicMaterial({ color: 0xcfe0ff }),
    yellow: S({ color: 0xe8c320, roughness: 0.5 }),
    plant: S({ color: 0x3f7d3c, roughness: 0.8 }),
    orange: S({ color: 0xe07220, roughness: 0.45 }),
    water: new THREE.MeshStandardMaterial({ color: 0x4aa8cc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8, emissive: 0x0a3446 }),
    waterHot: new THREE.MeshStandardMaterial({ color: 0x6fb6a8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8, emissive: 0x1a3a30 }),
    mirror: S({ color: 0xc4d0d8, roughness: 0.05, metalness: 0.95 }),
    leather: S({ color: 0x6b3a1e, roughness: 0.55 }),
    helmet: S({ color: 0xa82820, roughness: 0.22, metalness: 0.25 }),
    helmetGold: S({ color: 0xd2a645, roughness: 0.25, metalness: 0.5 }),
    cloth: S({ color: 0xd9d4c8, roughness: 0.95 }),
    jerseyRed: S({ color: 0xa3271f, roughness: 0.9 }),
    jerseyWhite: S({ color: 0xe9e5dc, roughness: 0.9 }),
    chalkboard: S({ color: 0x1d2b22, roughness: 0.9 }),
    screenGlow: new THREE.MeshBasicMaterial({ color: 0x88ccff })
  };
}

// ---- walls ----
// gaps: [center, width, height, noFrame]
function wallX(z, x1, x2, h, gaps = []) {
  gaps = gaps.slice().sort((a, b) => a[0] - b[0]); let cur = x1;
  for (const [cx, gw, gh, nf] of gaps) {
    const a = cx - gw / 2, b = cx + gw / 2;
    if (a > cur + 0.01) box(a - cur, h, WT, M.wall, (cur + a) / 2, 0, z, { col: true });
    if (gh < h) box(gw, h - gh, WT, M.wall, cx, gh, z);
    if (!nf) { box(0.1, gh, WT + 0.08, M.frame, a + 0.05, 0, z); box(0.1, gh, WT + 0.08, M.frame, b - 0.05, 0, z); box(gw, 0.1, WT + 0.08, M.frame, cx, gh - 0.1, z); }
    cur = b;
  }
  if (x2 > cur + 0.01) box(x2 - cur, h, WT, M.wall, (cur + x2) / 2, 0, z, { col: true });
}
function wallZ(x, z1, z2, h, gaps = []) {
  gaps = gaps.slice().sort((a, b) => a[0] - b[0]); let cur = z1;
  for (const [cz, gw, gh, nf] of gaps) {
    const a = cz - gw / 2, b = cz + gw / 2;
    if (a > cur + 0.01) box(WT, h, a - cur, M.wall, x, 0, (cur + a) / 2, { col: true });
    if (gh < h) box(WT, h - gh, gw, M.wall, x, gh, cz);
    if (!nf) { box(WT + 0.08, gh, 0.1, M.frame, x, 0, a + 0.05); box(WT + 0.08, gh, 0.1, M.frame, x, 0, b - 0.05); box(WT + 0.08, 0.1, gw, M.frame, x, gh - 0.1, cz); }
    cur = b;
  }
  if (z2 > cur + 0.01) box(WT, h, z2 - cur, M.wall, x, 0, (cur + z2) / 2, { col: true });
}
function floorRect(x1, z1, x2, z2, mat) { box(x2 - x1, 0.04, z2 - z1, mat, (x1 + x2) / 2, -0.04, (z1 + z2) / 2); }
const stripeMats = {};
function roomStripe(r, color, skipEast) {
  const m = stripeMats[color] || (stripeMats[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  const o = WT / 2 + 0.012, y = 2.95, hh = 0.22;
  box(r.x2 - r.x1 - 0.3, hh, 0.02, m, (r.x1 + r.x2) / 2, y, r.z1 + o);
  box(r.x2 - r.x1 - 0.3, hh, 0.02, m, (r.x1 + r.x2) / 2, y, r.z2 - o);
  box(0.02, hh, r.z2 - r.z1 - 0.3, m, r.x1 + o, y, (r.z1 + r.z2) / 2);
  if (!skipEast) box(0.02, hh, r.z2 - r.z1 - 0.3, m, r.x2 - o, y, (r.z1 + r.z2) / 2);
}

// ---- fixtures, hotspots ----
function fixture(x, y, z, color, intensity, room, o = {}) {
  World.fixtures.push({ pos: new V3(x, y - 0.25, z), color: new THREE.Color(color), intensity: intensity * 2.2, room, flicker: !!o.flicker, dist: o.dist || 14, mul: 1 });
  if (!o.noPanel) {
    const big = y > 6;
    box(big ? 2.4 : 1.2, 0.05, big ? 1.0 : 0.6, o.cool ? M.lightCool : M.light, x - (big ? 0 : 0.8), y - 0.05, z);
    if (!big) box(1.2, 0.05, 0.6, o.cool ? M.lightCool : M.light, x + 0.8, y - 0.05, z);
  }
}
let sparkleMat = null;
function hotspot(id, room, x, y, z, label, text, o = {}) {
  if (!sparkleMat) sparkleMat = new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 });
  const sp = new THREE.Sprite(sparkleMat); sp.scale.setScalar(0.28); sp.position.set(x, y + 0.32, z);
  (o.parent || World.root).add(sp);
  const hs = { id, room, pos: new V3(x, y, z), label, text, range: o.range || 2.5, kind: 'hs', active: true, sparkle: sp, extra: !!o.extra, phase: Math.random() * 6 };
  World.hotspots.set(id, hs);
  return hs;
}
function removeHotspot(id) { const hs = World.hotspots.get(id); if (!hs) return; hs.sparkle.parent && hs.sparkle.parent.remove(hs.sparkle); World.hotspots.delete(id); }

// ---- dynamic helpers ----
function mesh(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (parent || World.root).add(m); return m; }

function makeWeaponMesh(id) {
  const g = new THREE.Group();
  if (id === 'dumbbell') {
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), M.steel, 0, 0, 0, g)).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) { const h = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 6), M.black, s * 0.2, 0, 0, g); h.rotation.z = Math.PI / 2; const b = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.025, 6), M.gold, s * 0.2, 0, 0, g); b.rotation.z = Math.PI / 2; }
  } else if (id === 'trophy') {
    mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 16), M.woodDark, 0, 0.06, 0, g);
    mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 12), M.gold, 0, 0.27, 0, g);
    const cup = mesh(new THREE.CylinderGeometry(0.17, 0.06, 0.32, 18, 1, true), M.gold, 0, 0.58, 0, g); cup.material = M.gold;
    for (const s of [-1, 1]) { const hdl = mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI), M.gold, s * 0.19, 0.6, 0, g); hdl.rotation.z = s * -Math.PI / 2; }
    mesh(new THREE.SphereGeometry(0.06, 12, 8), M.gold, 0, 0.8, 0, g).scale.set(1, 1.4, 0.7);
  } else if (id === 'whistle') {
    const lan = mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0xb02a22, roughness: 0.8 }), 0, 0, 0, g); lan.scale.y = 1.4; lan.rotation.y = Math.PI / 2;
    const w = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), M.steel, 0, -0.26, 0.0, g); w.rotation.z = Math.PI / 2;
  } else if (id === 'cable') {
    for (let i = 0; i < 4; i++) { const t = mesh(new THREE.TorusGeometry(0.16 + i * 0.012, 0.012, 6, 28), M.black, 0, 0.012 + i * 0.022, 0, g); t.rotation.x = Math.PI / 2; }
    mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), M.steel, 0.2, 0.03, 0, g);
  } else if (id === 'shake') {
    mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.2, 14), new THREE.MeshStandardMaterial({ color: 0xc23a2c, roughness: 0.3, transparent: true, opacity: 0.85 }), 0, 0.1, 0, g);
    mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 14), M.black, 0, 0.225, 0, g);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), M.black, 0.03, 0.27, 0, g);
  } else if (id === 'syringe') {
    const b = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xdfeff5, roughness: 0.1, transparent: true, opacity: 0.7 }), 0, 0, 0, g); b.rotation.z = Math.PI / 2;
    const n = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 6), M.steel, 0.115, 0, 0, g); n.rotation.z = Math.PI / 2;
    const p = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), M.white, -0.11, 0, 0, g); p.rotation.z = Math.PI / 2;
    const c = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.006, 10), M.white, -0.15, 0, 0, g); c.rotation.z = Math.PI / 2;
  }
  return g;
}

function makeChair(seatMat) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const fm = M.darkSteel;
  mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), seatMat || M.gray, 0, 0.46, 0, g);
  mesh(new THREE.BoxGeometry(0.46, 0.34, 0.04), seatMat || M.gray, 0, 0.72, -0.21, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(0.03, sz < 0 ? 0.9 : 0.46, 0.03), fm, sx * 0.21, sz < 0 ? 0.45 : 0.23, sz * 0.2, g);
  return g;
}

function makeFootball(mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat || M.leather); m.scale.set(1.55, 1, 1);
  return m;
}

function makeDummy() {
  const pivot = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 18), M.black, 0, 0.07, 0, pivot);
  mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.55, 18), M.red, 0, 0.92, 0, pivot);
  mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.12, 18), M.black, 0, 1.25, 0, pivot);
  mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.12, 18), M.black, 0, 0.6, 0, pivot);
  mesh(new THREE.SphereGeometry(0.27, 18, 10, 0, TAU, 0, Math.PI / 2), M.red, 0, 1.69, 0, pivot);
  return pivot;
}

// ---- the build ----
function buildWorld(scene) {
  const root = new THREE.Group(); scene.add(root); World.root = root;
  World.caseLayer = new THREE.Group(); scene.add(World.caseLayer);

  // floors
  floorRect(-30, -14, -18, -2.5, M.rubber);
  floorRect(-18, -14, -6, -2.5, M.tile);
  floorRect(-6, -14, 6, -2.5, M.tileBlue);
  floorRect(6, -14, 18, -2.5, M.concrete);
  floorRect(-30, -2.5, 18, 2.5, M.hall);
  floorRect(-30, 2.5, -18, 14, M.checker);
  floorRect(-18, 2.5, -6, 14, M.carpetDark);
  floorRect(-6, 2.5, 0, 14, M.wood);
  floorRect(0, 2.5, 6, 14, M.carpetNavy);
  floorRect(6, 2.5, 18, 14, M.stone);
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), M.turf); turf.rotation.x = -Math.PI / 2; turf.position.set(32, 0, 0); root.add(turf);

  // ceilings
  box(48, 0.06, 28, M.ceiling, -6, H, 0);
  box(28, 0.1, 28, M.fieldCeil, 32, FH, 0);

  // outer walls
  wallX(-14, -30, 18, H); wallX(-14, 18, 46, FH);
  wallX(14, -30, 6, H); wallX(14, 6, 18, H, [[12, 3, 2.8]]); wallX(14, 18, 46, FH);
  wallZ(-30, -14, 14, H); wallZ(46, -14, 14, FH);
  // corridor walls
  wallX(-2.5, -30, 18, H, [[-24, 2.2, 2.7], [-12, 2.2, 2.7], [0, 2.2, 2.7], [12, 2.2, 2.7]]);
  wallX(2.5, -30, 18, H, [[-24, 2.2, 2.7], [-12, 2.2, 2.7], [-3, 1.8, 2.7], [3, 1.8, 2.7], [12, 4, 2.85]]);
  // dividers
  for (const x of [-18, -6, 6]) wallZ(x, -14, -2.5, H);
  for (const x of [-18, -6, 0, 6]) wallZ(x, 2.5, 14, H);
  wallZ(18, -14, -2.5, FH); wallZ(18, 2.5, 14, FH); wallZ(18, -2.5, 2.5, FH, [[0, 5, 4, true]]);
  // locked front doors collider
  collide(12, 14, 3, 0.3);

  // room stripes
  roomStripe(ROOMS.weight, 0xa3271f); roomStripe(ROOMS.locker, 0xd0a040); roomStripe(ROOMS.training, 0x3e7fa0);
  roomStripe(ROOMS.equipment, 0x6b7280); roomStripe(ROOMS.cafeteria, 0xd0a040); roomStripe(ROOMS.film, 0x7a2a26);
  roomStripe(ROOMS.coach, 0xa3271f); roomStripe(ROOMS.gm, 0x1f2a44); roomStripe(ROOMS.lobby, 0xd0a040);
  roomStripe(ROOMS.hall, 0xa3271f, true);

  // door signs (hall side)
  const signO = { bg: '#14171c', fg: '#f0e9d8', stripe: '#a3271f', size: 70 };
  for (const id of ROOM_IDS) {
    const r = ROOMS[id]; const north = r.wing === 'north';
    sign(r.name.toUpperCase(), r.door[0], 3.48, north ? -2.33 : 2.33, north ? 0 : Math.PI, id === 'lobby' ? 3.2 : 2.2, 0.48, signO);
  }

  buildHall(); buildWeight(); buildLocker(); buildTraining(); buildEquipment();
  buildCafeteria(); buildFilm(); buildCoach(); buildGM(); buildLobby(); buildField();

  // golden footballs
  const fbMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.2, metalness: 0.9, emissive: 0x6a4a10 });
  [['fb1', -29.2, 0.25, -13.2], ['fb2', -17.0, 2.45, -13.5], ['fb3', 9.6, 0.13, -8.0], ['fb4', 45.0, 0.3, -12.9], ['fb5', 16.7, 0.2, 12.4]].forEach(([id, x, y, z]) => {
    const m = makeFootball(fbMat); m.position.set(x, y, z); root.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    glow.scale.setScalar(0.7); glow.position.set(x, y, z); root.add(glow);
    World.footballs.push({ id, mesh: m, glow, x, y, z, got: false });
  });

  flushStatic(root);
}

function buildHall() {
  box(48, 0.004, 0.36, M.red, -6, 0.002, 0);
  box(48, 0.004, 0.06, M.goldPaint, -6, 0.002, 0.26); box(48, 0.004, 0.06, M.goldPaint, -6, 0.002, -0.26);
  for (const [x, z] of [[-18, -2.08], [6, -2.08], [-7.5, 2.08]]) {
    box(2.4, 0.06, 0.42, M.woodLight, x, 0.42, z, { col: true });
    box(0.08, 0.42, 0.36, M.black, x - 1.0, 0, z); box(0.08, 0.42, 0.36, M.black, x + 1.0, 0, z);
  }
  // vending machine
  box(1.0, 1.95, 0.8, M.red, -29.45, 0, -1.2, { col: true });
  box(0.02, 1.2, 0.6, M.lightCool, -28.94, 0.55, -1.25);
  hotspot('hs_vending', 'hall', -28.85, 1.1, -1.2, 'Vending machine', 'Sold out of everything except kale chips. A crime, but not tonight\'s crime.');
  // banners & poster
  sign('BAY CITY BRUISERS', -6, 1.85, -2.33, 0, 8, 1.1, { bg: '#9e2620', fg: '#f2ecdc', stripe: '#e2b04a', w: 1024, h: 140, size: 92 });
  sign('BLOCK.  CATCH.  REPEAT.', -18, 1.85, 2.33, Math.PI, 8, 1.1, { bg: '#16191e', fg: '#e6b450', stripe: '#a3271f', w: 1024, h: 140, size: 88 });
  sign('PRACTICE FIELD  →', 15.5, 2.05, -2.33, 0, 3, 0.45, { bg: '#16191e', fg: '#f0e9d8', size: 64 });
  const poster = canvasTexture(256, 384, (g, w, h) => {
    g.fillStyle = '#a3271f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e6b450'; g.font = `900 150px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.fillText('85', w / 2, 190);
    g.fillStyle = '#f2ecdc'; g.font = `900 40px ${FONT_DISPLAY}`; g.fillText('EVERY SUNDAY', w / 2, 270); g.fillText('IS A', w / 2, 310); g.fillText('BLOCK PARTY', w / 2, 350);
  }, { repeat: false });
  picture(poster, 7, 1.55, 2.34, Math.PI, 1.3, 1.95);
  hotspot('hs_poster', 'hall', 7, 1.4, 2.0, 'Block Party poster', 'A poster of a tight end mid-pancake-block, mouth wide open in pure joy. EVERY SUNDAY IS A BLOCK PARTY.\n\nYou feel seen.');
  for (const x of [-24, -12, 0, 12]) fixture(x, 3.98, 0, 0xffe6c4, 9, 'hall', { flicker: x === -12 });
}

function squatRack(x, z) {
  const w = 1.3, d = 1.0, h = 2.4;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, h, 0.08, M.darkSteel, x + sx * w / 2, 0, z + sz * d / 2);
  box(w + 0.08, 0.08, 0.08, M.darkSteel, x, h - 0.08, z - d / 2); box(w + 0.08, 0.08, 0.08, M.darkSteel, x, h - 0.08, z + d / 2);
  box(0.08, 0.08, d, M.darkSteel, x - w / 2, h - 0.08, z); box(0.08, 0.08, d, M.darkSteel, x + w / 2, h - 0.08, z);
  cylC(0.025, 0.025, 2.2, M.steel, x, 1.4, z + 0.45, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) { cylC(0.23, 0.23, 0.06, M.black, x + s * 0.86, 1.4, z + 0.45, { rz: Math.PI / 2 }); cylC(0.18, 0.18, 0.05, M.red, x + s * 0.93, 1.4, z + 0.45, { rz: Math.PI / 2 }); }
  collide(x, z, w + 0.3, d + 0.2);
}
function benchPress(x, z) {
  box(0.34, 0.1, 1.25, M.pad, x, 0.38, z);
  box(0.08, 0.38, 0.08, M.darkSteel, x, 0, z - 0.5); box(0.08, 0.38, 0.08, M.darkSteel, x, 0, z + 0.5);
  for (const s of [-1, 1]) box(0.06, 1.1, 0.06, M.darkSteel, x + s * 0.5, 0, z - 0.68);
  cylC(0.025, 0.025, 2.0, M.steel, x, 1.08, z - 0.66, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) cylC(0.2, 0.2, 0.06, M.black, x + s * 0.78, 1.08, z - 0.66, { rz: Math.PI / 2 });
  collide(x, z - 0.15, 1.3, 1.5);
}

function buildWeight() {
  const r = ROOMS.weight;
  box(0.02, 2.2, 7, M.mirror, -29.84, 0.35, -8.25);
  squatRack(-27, -12.6); squatRack(-21.5, -12.6);
  benchPress(-26.5, -7.6); benchPress(-21.8, -7.6);
  // dumbbell rack (east wall)
  const rx = -18.45;
  box(0.55, 0.06, 7.0, M.darkSteel, rx, 0.42, -8.5); box(0.55, 0.06, 7.0, M.darkSteel, rx, 0.74, -8.5);
  for (const z of [-11.9, -8.5, -5.1]) box(0.5, 0.74, 0.06, M.darkSteel, rx, 0, z);
  for (let i = 0; i < 14; i++) {
    const z = -11.75 + i * 0.5;
    for (const [y, tier] of [[0.55, 0], [0.87, 1]]) {
      if (tier === 1 && Math.abs(z - -8.5 + 0.25) < 0.01) continue;
      const s = 0.055 + (i % 7) * 0.006 + tier * 0.004;
      cylC(0.016, 0.016, 0.34, M.steel, rx, y, z, { rz: Math.PI / 2 });
      cylC(s, s, 0.09, M.black, rx - 0.17, y, z, { rz: Math.PI / 2, seg: 6 });
      cylC(s, s, 0.09, M.black, rx + 0.17, y, z, { rz: Math.PI / 2, seg: 6 });
    }
  }
  collide(rx, -8.5, 0.6, 7.1);
  sign('THE 45s', rx - 0.29, 1.05, -8.75, -Math.PI / 2, 0.6, 0.16, { bg: '#e6b450', fg: '#14171c', size: 80 });
  World.weaponHome.dumbbell = { pos: new V3(rx, 0.89, -8.75), ry: 0, room: 'weight', hs: 'hs_dumbbell' };
  hotspot('hs_dumbbell', 'weight', -18.85, 0.95, -8.75, 'Dumbbell rack', 'Hex dumbbells from 5 to 150 pounds. The 45s are worn smooth. Somebody\'s been doing a lot of curls.');
  // plate tree
  cyl(0.04, 0.04, 1.3, M.darkSteel, -28.8, 0, -4.2); cyl(0.3, 0.3, 0.04, M.darkSteel, -28.8, 0, -4.2);
  for (let i = 0; i < 4; i++) cylC(0.23 - i * 0.03, 0.23 - i * 0.03, 0.05, i % 2 ? M.red : M.black, -28.8, 0.3 + i * 0.25, -4.2 + (i % 2 ? 0.08 : -0.08), { rx: Math.PI / 2 });
  collide(-28.8, -4.2, 0.7, 0.7);
  // boombox
  box(0.5, 0.7, 1.0, M.black, -29.55, 0, -6.2, { col: true });
  box(0.22, 0.26, 0.56, M.gray, -29.6, 0.7, -6.2);
  for (const s of [-1, 1]) cylC(0.08, 0.08, 0.02, M.black, -29.48, 0.83, -6.2 + s * 0.17, { rz: Math.PI / 2 });
  hotspot('hs_boombox', 'weight', -29.3, 0.95, -6.2, 'Boombox', 'A battered boombox with a cassette labeled BLOCK PARTY MIX VOL. 3. You press play.\n\nPure, glorious heavy metal fills the weight room. Your head nods on its own. You are not proud. You are not ashamed.');
  // records board
  picture(boardTexture('TEAM RECORDS', ['SQUAT ......... B. OKAFOR  705', 'BENCH ......... B. OKAFOR  485', 'VERTICAL ...... M. JENNINGS 41"', 'MOST JOYFUL BLOCK (ALL-TIME)', '  #85 .... OFF THE CHARTS']), -24.25, 1.65, -13.83, 0, 2.4, 1.2, true);
  hotspot('hs_records', 'weight', -24.25, 1.6, -13.3, 'Team records board', 'TEAM RECORDS. Squat: B. Okafor, 705. Bench: B. Okafor, 485.\n\nMost Joyful Block (all-time): #85. Next to it someone wrote "off the charts, literally, we ran out of whiteboard."');
  // towel bin (hiding spot)
  cyl(0.36, 0.3, 0.8, M.offwhite, -19.4, 0, -3.4, { col: true });
  sph(0.3, M.white, -19.4, 0.82, -3.4, { sy: 0.4 });
  World.hides.hide_weight = { room: 'weight', pos: new V3(-19.4, 0.85, -3.4), label: 'Towel bin', empty: 'Damp towels. Smells like a fourth-quarter comeback. Nothing else in here.' };
  hotspot('hide_weight', 'weight', -19.6, 0.9, -3.4, 'Towel bin', World.hides.hide_weight.empty);
  World.struggle.weight = { x: -23.8, z: -4.9, ry: 0.4, spill: 'lifting chalk', spillColor: 0xe9e6de };
  fixture(-24, 3.98, -8.25, 0xffe2c0, 16, 'weight');
}

function lockerUnit(jerseyMat) {
  box(0.9, 2.3, 0.04, M.woodDark, 0, 0, -0.28);
  box(0.04, 2.3, 0.6, M.woodDark, -0.43, 0, 0); box(0.04, 2.3, 0.6, M.woodDark, 0.43, 0, 0);
  box(0.86, 0.04, 0.56, M.woodDark, 0, 1.82, 0); box(0.9, 0.05, 0.6, M.woodDark, 0, 2.3, 0);
  box(0.86, 0.42, 0.56, M.woodLight, 0, 0, 0);
  box(0.5, 0.72, 0.06, jerseyMat, 0, 1.0, -0.18);
  box(0.62, 0.16, 0.08, jerseyMat, 0, 1.56, -0.18);
  sph(0.15, M.helmet, 0, 2.0, -0.05, { sy: 0.92 });
  box(0.5, 0.07, 0.02, M.goldPaint, 0, 1.87, 0.29);
}
function buildLocker() {
  for (let i = 0; i < 11; i++) at(-17.0 + i * 0.95, -13.55, 0, () => lockerUnit(i % 2 ? M.jerseyWhite : M.jerseyRed));
  for (let i = 0; i < 8; i++) at(-17.55, -12.4 + i * 0.95, Math.PI / 2, () => lockerUnit(i % 2 ? M.jerseyRed : M.jerseyWhite));
  for (let i = 0; i < 7; i++) at(-6.45, -12.4 + i * 0.95, -Math.PI / 2, () => lockerUnit(i % 2 ? M.jerseyWhite : M.jerseyRed));
  collide(-12.25, -13.55, 10.4, 0.62); collide(-17.55, -9.1, 0.62, 7.6); collide(-6.45, -9.55, 0.62, 6.7);
  // Jet & Lou extras
  box(0.12, 0.08, 0.28, M.goldPaint, -9.5, 0.42, -13.4); box(0.12, 0.08, 0.28, M.goldPaint, -9.3, 0.42, -13.4);
  box(0.16, 0.1, 0.36, M.black, -15.2, 0.42, -13.4); box(0.16, 0.1, 0.36, M.black, -14.98, 0.42, -13.4);
  sign('JENNINGS  11', -9.4, 2.17, -13.24, 0, 0.8, 0.14, { bg: '#e6b450', fg: '#14171c', size: 84 });
  sign('OKAFOR  77', -15.1, 2.17, -13.24, 0, 0.8, 0.14, { bg: '#e6b450', fg: '#14171c', size: 84 });
  hotspot('hs_jet_locker', 'locker', -9.4, 1.2, -13.0, "Jet's locker", 'Gold cleats, size 11, and receiver gloves with enough tack to catch a bowling ball. A note taped inside: I AM NOT REPLACEABLE.');
  hotspot('hs_lou_locker', 'locker', -15.1, 1.2, -13.0, "Big Lou's locker", 'Size 16 cleats, like a pair of canoes. A notebook labeled POEMS (DO NOT READ).\n\nYou do not read it. You are a professional.');
  // center bench
  box(6.0, 0.08, 0.42, M.woodLight, -12, 0.38, -9.0, { col: true });
  for (const x of [-14.6, -12, -9.4]) box(0.1, 0.38, 0.32, M.black, x, 0, -9.0);
  // belt display
  box(0.06, 0.95, 1.4, M.woodDark, -6.19, 1.15, -4.6);
  box(0.03, 0.2, 1.16, M.black, -6.15, 1.52, -4.6); box(0.04, 0.4, 0.46, M.gold, -6.14, 1.42, -4.6);
  sph(0.07, M.red, -6.12, 1.62, -4.6, { sx: 0.4 });
  box(0.02, 0.9, 1.34, M.glass, -6.1, 1.17, -4.6);
  hotspot('hs_belt', 'locker', -6.55, 1.6, -4.6, 'Championship belt', 'A heavyweight-style title belt in a glass frame, engraved THE PEOPLE\'S TIGHT END. It goes each year to the player who finishes the most blocks with a smile.\n\nYou resist the urge to hoist it over your head and play to the crowd. Barely.');
  // hamper (hiding spot)
  box(0.85, 0.85, 0.6, M.gray, -16.6, 0, -3.45, { col: true });
  sph(0.34, M.cloth, -16.6, 0.85, -3.45, { sx: 1.1, sy: 0.4 });
  World.hides.hide_locker = { room: 'locker', pos: new V3(-16.6, 0.8, -3.45), label: 'Laundry hamper', empty: 'Socks. So many socks. Nothing useful, unless the murder weapon was smell.' };
  hotspot('hide_locker', 'locker', -16.6, 0.9, -3.75, 'Laundry hamper', World.hides.hide_locker.empty);
  World.struggle.locker = { x: -12.4, z: -5.6, ry: -0.3, spill: 'shower water', spillColor: 0x8fb4c8 };
  fixture(-12, 3.98, -8.25, 0xfff0d8, 15, 'locker');
}

function buildTraining() {
  for (const z of [-12.0, -9.6, -7.2]) {
    box(1.7, 0.72, 0.6, M.offwhite, -3.6, 0, z); box(1.95, 0.12, 0.74, M.pad, -3.6, 0.72, z);
    collide(-3.6, z, 1.95, 0.76);
  }
  // tubs
  cyl(1.0, 1.0, 0.95, M.lightGray, 4.0, 0, -12.0, { seg: 24 }); cyl(0.92, 0.92, 0.02, M.water, 4.0, 0.95, -12.0, { seg: 24 }); collide(4.0, -12.0, 2.0, 2.0);
  cyl(0.8, 0.8, 0.9, M.lightGray, 1.5, 0, -12.6, { seg: 24 }); cyl(0.72, 0.72, 0.02, M.waterHot, 1.5, 0.9, -12.6, { seg: 24 }); collide(1.5, -12.6, 1.6, 1.6);
  sign('NO CANNONBALLS — THIS MEANS YOU, 85', 4.0, 1.75, -13.84, 0, 2.6, 0.24, { bg: '#f2f2ee', fg: '#a3271f', size: 70 });
  hotspot('hs_tub', 'training', 3.6, 1.0, -10.8, 'Cold plunge tub', 'Thirty-nine degrees Fahrenheit. A laminated sign: NO CANNONBALLS — THIS MEANS YOU, 85.\n\nRude. Accurate, but rude.');
  // medicine cabinet
  box(1.2, 1.0, 0.35, M.white, -0.6, 1.0, -13.67); collide(-0.6, -13.67, 1.2, 0.36);
  box(1.1, 0.03, 0.3, M.offwhite, -0.6, 1.33, -13.67); box(1.1, 0.03, 0.3, M.offwhite, -0.6, 1.66, -13.67);
  const bottleColors = [M.orange, M.red, M.white, M.goldPaint, M.lightGray];
  for (let i = 0; i < 8; i++) cyl(0.04, 0.04, 0.14, bottleColors[i % 5], -1.05 + i * 0.13, i < 4 ? 1.69 : 1.69, -13.7);
  for (let i = 0; i < 5; i++) cyl(0.035, 0.035, 0.12, bottleColors[(i + 2) % 5], -1.0 + i * 0.12, 1.03, -13.7);
  box(1.12, 0.92, 0.02, M.glass, -0.6, 1.04, -13.49);
  sign('MEDICAL — LOCKED', -0.6, 2.15, -13.84, 0, 1.2, 0.18, { bg: '#f2f2ee', fg: '#a3271f', size: 76 });
  World.weaponHome.syringe = { pos: new V3(-0.35, 1.4, -13.65), ry: 0, room: 'training', hs: 'hs_cabinet' };
  hotspot('hs_cabinet', 'training', -0.6, 1.5, -13.2, 'Medicine cabinet', 'Locked, labeled, alphabetized. Dr. Osei runs a tight cabinet.');
  // taping station
  box(0.7, 0.92, 3.0, M.offwhite, 5.5, 0, -7.6, { col: true }); box(0.74, 0.04, 3.04, M.steel, 5.5, 0.92, -7.6);
  for (let i = 0; i < 6; i++) cylC(0.05, 0.05, 0.05, M.white, 5.45, 1.0, -8.8 + i * 0.22, { rx: Math.PI / 2 });
  cyl(0.09, 0.09, 0.16, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 5.45, 0.96, -6.6);
  hotspot('hs_taping', 'training', 5.0, 1.05, -7.6, 'Taping station', 'Tape, pre-wrap, scissors, and a jar of jelly beans labeled FOR BRAVE PATIENTS ONLY.\n\nYou take two. You were brave today.');
  // ice machine (hiding spot)
  box(0.8, 1.6, 0.8, M.steel, 5.45, 0, -4.0, { col: true }); box(0.5, 0.3, 0.02, M.black, 5.04, 1.0, -4.0, { ry: Math.PI / 2 });
  World.hides.hide_training = { room: 'training', pos: new V3(5.2, 1.0, -4.0), label: 'Ice machine', empty: 'Ice. Just ice. You eat a piece. Hydration matters.' };
  hotspot('hide_training', 'training', 4.95, 1.0, -4.0, 'Ice machine', World.hides.hide_training.empty);
  World.struggle.training = { x: 0.6, z: -5.8, ry: 1.1, spill: 'ice-bath water', spillColor: 0x9cc4d6 };
  fixture(0, 3.98, -8.25, 0xeaf2ff, 17, 'training', { cool: true });
}

function shelfUnit(len, contents) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 2.4, 0.05, M.darkSteel, sx * (len / 2 - 0.03), 0, sz * 0.27);
  for (const y of [0.1, 0.7, 1.3, 1.9]) {
    box(len, 0.04, 0.6, M.darkSteel, 0, y, 0);
    const n = Math.floor(len / 0.42);
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + 0.25 + i * 0.42;
      if (contents === 'helmets') sph(0.16, (i + Math.round(y * 10)) % 5 === 0 ? M.helmetGold : M.helmet, x, y + 0.2, 0, { sy: 0.92 });
      else if (contents === 'balls') { sph(0.11, M.leather, x - 0.08, y + 0.12, 0.05, { sx: 1.55 }); sph(0.11, M.leather, x + 0.1, y + 0.12, -0.1, { sx: 1.55, ry: 0.6 }); }
      else box(0.36, 0.18 + ((i * 7 + y * 13) % 3) * 0.05, 0.4, i % 2 ? M.jerseyRed : M.jerseyWhite, x, y + 0.04, 0);
    }
  }
}
function buildEquipment() {
  at(8.0, -13.5, 0, () => shelfUnit(3.0, 'helmets'));
  at(11.4, -13.5, 0, () => shelfUnit(3.0, 'balls'));
  at(14.8, -13.5, 0, () => shelfUnit(3.0, 'jerseys'));
  collide(11.4, -13.5, 10.2, 0.66);
  at(17.5, -9.6, -Math.PI / 2, () => shelfUnit(3.0, 'jerseys'));
  collide(17.5, -9.6, 0.66, 3.1);
  hotspot('hs_helmets', 'equipment', 8.0, 1.3, -12.9, 'Helmet shelves', 'Forty-two helmets lined up and gleaming. One at the end has a facemask bent from blocking. It has been bent for years. Nobody has the heart to fix it.');
  // workbench
  box(2.2, 0.86, 0.9, M.woodLight, 9.0, 0, -8.0, { col: true }); box(2.3, 0.05, 1.0, M.darkSteel, 9.0, 0.86, -8.0);
  sph(0.16, M.helmet, 8.3, 1.06, -8.1, { sy: 0.92 });
  box(0.3, 0.04, 0.06, M.steel, 9.1, 0.91, -8.2); box(0.08, 0.02, 0.15, M.black, 9.5, 0.91, -7.8);
  hotspot('hs_workbench', 'equipment', 9.0, 1.0, -7.4, 'Workbench', 'Helmet padding, facemask screws, and half a sandwich. This is basically Tony\'s office.');
  // ball bag (hiding spot)
  cyl(0.45, 0.42, 0.9, new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9, transparent: true, opacity: 0.75 }), 15.6, 0, -4.0, { col: true });
  for (let i = 0; i < 6; i++) sph(0.11, M.leather, 15.6 + Math.cos(i) * 0.2, 0.8 + (i % 2) * 0.08, -4.0 + Math.sin(i) * 0.2, { sx: 1.55, ry: i });
  World.hides.hide_equipment = { room: 'equipment', pos: new V3(15.6, 0.9, -4.0), label: 'Ball bag', empty: 'Footballs, inflated to exactly 13 PSI. Tony takes pride in this.' };
  hotspot('hide_equipment', 'equipment', 15.2, 0.9, -4.0, 'Ball bag', World.hides.hide_equipment.empty);
  // laundry carts
  box(1.1, 0.9, 0.7, M.gray, 13.2, 0, -7.4, { col: true }); sph(0.4, M.cloth, 13.2, 0.9, -7.4, { sx: 1.3, sy: 0.35 });
  box(1.1, 0.9, 0.7, M.gray, 14.8, 0, -6.4, { col: true });
  World.struggle.equipment = { x: 11.2, z: -4.6, ry: -0.8, spill: 'helmet polish', spillColor: 0x6b4a2a };
  fixture(12, 3.98, -8.25, 0xfff0d0, 14, 'equipment');
}

function buildCafeteria() {
  box(8.0, 0.9, 0.75, M.offwhite, -25.5, 0, 13.45); box(8.05, 0.04, 0.8, M.steel, -25.5, 0.9, 13.45);
  collide(-25.5, 13.45, 8.0, 0.8);
  box(1.1, 2.1, 0.8, M.steel, -20.2, 0, 13.4, { col: true }); box(0.04, 0.6, 0.04, M.darkSteel, -20.7, 0.9, 12.98);
  hotspot('hs_fridge', 'cafeteria', -20.2, 1.2, 12.75, 'Walk-in fridge', 'Inside: a whole crate of Iowa sweet corn.\n\nSomeone on this staff knows what\'s up. The Hawkeye State does not miss.');
  box(0.45, 0.55, 0.4, M.black, -28.2, 0.92, 13.4); box(0.06, 0.06, 0.02, M.red, -28.1, 1.3, 13.19);
  cyl(0.06, 0.05, 0.12, M.white, -27.95, 0.94, 13.15);
  hotspot('hs_coffee', 'cafeteria', -28.2, 1.2, 12.95, 'Coffee machine', 'Industrial coffee machine, still warm. A sticky note on the side reads: DECAF IS A LIE.');
  cyl(0.09, 0.07, 0.3, M.black, -24.0, 0.92, 13.45);
  const bottleM = [M.red, M.goldPaint, M.lightGray, M.red, M.goldPaint];
  for (let i = 0; i < 5; i++) { cyl(0.055, 0.05, 0.2, bottleM[i], -23.55 + i * 0.16 + (i > 1 ? 0.16 : 0), 0.92, 13.45); }
  sign('SHAKE STATION', -23.2, 1.55, 13.83, Math.PI, 1.4, 0.24, { bg: '#a3271f', fg: '#f2ecdc', size: 80 });
  World.weaponHome.shake = { pos: new V3(-23.23, 0.92, 13.45), ry: 0, room: 'cafeteria', hs: 'hs_shakes' };
  hotspot('hs_shakes', 'cafeteria', -23.2, 1.15, 13.0, 'Shake station', 'A labeled shaker bottle for every player. The tight end\'s just says EXTRA EVERYTHING.');
  picture(boardTexture('TONIGHT', ['Pre-game pasta', 'Block Party brownies', 'Kale chips', '  (nobody touches these)'], { bg: '#1d2b22', fg: '#e9efe6', titleColor: '#e6b450', border: '#5a3b24' }), -29.83, 1.6, 8.0, Math.PI / 2, 2.2, 1.1);
  hotspot('hs_menu', 'cafeteria', -29.4, 1.6, 8.0, 'Menu board', 'TONIGHT: Pre-game pasta. Block Party brownies. Kale chips (nobody touches these).');
  for (const [x, z] of [[-27, 6.0], [-22, 6.0], [-27, 9.4], [-22, 9.4]]) {
    box(2.0, 0.05, 0.9, M.white, x, 0.72, z); box(0.12, 0.72, 0.12, M.darkSteel, x - 0.7, 0, z); box(0.12, 0.72, 0.12, M.darkSteel, x + 0.7, 0, z);
    for (const sx of [-0.5, 0.5]) for (const sz of [-1, 1]) {
      box(0.42, 0.05, 0.4, M.red, x + sx, 0.45, z + sz * 0.68); box(0.42, 0.4, 0.05, M.red, x + sx, 0.5, z + sz * 0.88);
      box(0.04, 0.45, 0.04, M.darkSteel, x + sx, 0, z + sz * 0.68);
    }
    collide(x, z, 2.2, 1.9);
  }
  cyl(0.3, 0.26, 0.75, M.gray, -18.75, 0, 3.3, { col: true });
  World.hides.hide_cafeteria = { room: 'cafeteria', pos: new V3(-18.75, 0.8, 3.3), label: 'Trash can', empty: 'Banana peels, an empty pasta tray, and three bags of kale chips. Unopened. Tragic.' };
  hotspot('hide_cafeteria', 'cafeteria', -19.05, 0.85, 3.45, 'Trash can', World.hides.hide_cafeteria.empty);
  World.struggle.cafeteria = { x: -24.6, z: 11.4, ry: 2.3, spill: 'marinara sauce', spillColor: 0x8a1f14 };
  fixture(-24, 3.98, 8.25, 0xffe2b8, 16, 'cafeteria');
}

function buildFilm() {
  World.screenTex = playTexture({ w: 1024, h: 512, title: 'RED RIGHT 85 Y-STICK', titleSize: 40 });
  World.screenMat = new THREE.MeshBasicMaterial({ map: World.screenTex, toneMapped: false, color: 0xbfd1c4 });
  plane(6.2, 3.1, World.screenMat, -12, 2.05, 13.76, Math.PI);
  box(6.5, 3.3, 0.04, M.black, -12, 0.42, 13.83);
  // projector cart + beam
  box(0.8, 0.95, 0.6, M.black, -7.0, 0, 4.0, { col: true }); box(0.42, 0.2, 0.45, M.gray, -7.0, 0.95, 4.0);
  cylC(0.06, 0.06, 0.06, M.black, -7.0, 1.05, 4.24, { rx: Math.PI / 2 });
  const from = new V3(-7.0, 1.06, 4.27), to = new V3(-12, 2.05, 13.78), dir = from.clone().sub(to), L = dir.length();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 1.9, L, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfd6ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.copy(from.clone().add(to).multiplyScalar(0.5)); beam.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize()); World.root.add(beam); World.beam = beam;
  World.weaponHome.cable = { pos: new V3(-6.57, 0.62, 4.0), rot: [0, 0, Math.PI / 2], room: 'film', hs: 'hs_projector' };
  hotspot('hs_projector', 'film', -7.35, 1.1, 4.45, 'Projector', 'The projector loops a play called RED RIGHT 85 Y-STICK. The tight end is the first read.\n\nCorrect.');
  // seats
  for (const z of [6.6, 8.4, 10.2]) {
    for (const x of [-14.4, -12.8, -11.2, -9.6, -8.0]) {
      box(0.62, 0.12, 0.55, M.red, x, 0.4, z); box(0.62, 0.62, 0.1, M.red, x, 0.45, z - 0.27);
      box(0.06, 0.25, 0.5, M.black, x - 0.34, 0.35, z); box(0.4, 0.4, 0.4, M.black, x, 0, z);
    }
    box(0.06, 0.25, 0.5, M.black, -7.66, 0.35, z);
    collide(-11.2, z, 7.1, 0.72);
  }
  // coordinator's desk + chair
  box(1.7, 0.74, 0.8, M.woodDark, -16.6, 0, 12.4, { col: true }); box(1.76, 0.04, 0.86, M.woodDark, -16.6, 0.74, 12.4);
  box(0.4, 0.02, 0.28, M.darkSteel, -17.0, 0.78, 12.45); box(0.4, 0.26, 0.02, M.screenGlow, -17.0, 0.8, 12.6);
  box(0.5, 0.06, 0.48, M.black, -16.6, 0.46, 11.5); box(0.5, 0.55, 0.06, M.black, -16.6, 0.5, 11.25); box(0.06, 0.46, 0.06, M.darkSteel, -16.6, 0, 11.5);
  collide(-16.6, 11.5, 0.6, 0.6);
  World.struggle.film = { x: -17.0, z: 4.6, ry: 0.9, spill: 'soda', spillColor: 0x3b2414 };
  World.hides.hide_film = { room: 'film', pos: new V3(-14.8, 0.25, 6.6), label: 'Under the back row', empty: 'Gum wrappers, a lost mouthguard and a playbook page with a doodle of a tight end flexing. Gross, but innocent.' };
  hotspot('hide_film', 'film', -15.25, 0.45, 6.6, 'Under the back row', World.hides.hide_film.empty);
  fixture(-12, 3.98, 8.25, 0x9fb4ff, 8, 'film', { cool: true });
}

function buildCoach() {
  box(2.0, 0.76, 0.9, M.woodDark, -3.0, 0, 11.4, { col: true });
  box(0.36, 0.06, 0.28, M.red, -3.5, 0.76, 11.3); box(0.3, 0.06, 0.08, M.goldPaint, -2.4, 0.76, 11.0);
  box(0.5, 0.06, 0.48, M.black, -3.0, 0.46, 12.4); box(0.5, 0.6, 0.06, M.black, -3.0, 0.5, 12.65); box(0.06, 0.46, 0.06, M.darkSteel, -3.0, 0, 12.4);
  collide(-3.0, 12.4, 0.6, 0.6);
  box(2.4, 1.8, 0.4, M.woodDark, -3.0, 0, 13.6, { col: true });
  for (let i = 0; i < 5; i++) { cyl(0.05, 0.07, 0.04, M.woodLight, -3.9 + i * 0.45, 1.25, 13.55); cylC(0.06, 0.03, 0.18, M.gold, -3.9 + i * 0.45, 1.38, 13.55); }
  hotspot('hs_coach_desk', 'coach', -3.0, 1.0, 10.75, "Coach's desk", 'A headset, a red playbook binder and a nameplate: H. HASKINS. Under the binder, a memo on owner\'s letterhead: WIN SUNDAY OR CLEAN OUT YOUR DESK. Coach has circled it in red. Twice.');
  picture(playTexture({ bg: '#f2f2ee', ink: '#20242a', hi: '#a3271f', title: 'Y-STICK: BLOCK THE BACKER, BEAT THE SAFETY' }), -5.84, 1.65, 7.5, Math.PI / 2, 2.6, 1.3, true);
  hotspot('hs_whiteboard', 'coach', -5.4, 1.6, 7.5, 'Play whiteboard', 'Y-STICK: BLOCK THE BACKER, THEN BEAT THE SAFETY. The Y in every single play is circled twice.\n\nCoach knows who the engine of this offense is.');
  box(0.9, 0.45, 2.0, M.leather, -5.4, 0, 4.4, { col: true }); box(0.25, 0.45, 2.0, M.leather, -5.72, 0.45, 4.4);
  box(0.06, 0.06, 0.06, M.steel, -0.17, 1.72, 6.0);
  World.weaponHome.whistle = { pos: new V3(-0.24, 1.6, 6.0), ry: 0, room: 'coach', hs: 'hs_whistle' };
  hotspot('hs_whistle', 'coach', -0.55, 1.5, 6.0, 'Whistle on a hook', "Coach's lucky whistle on a red lanyard. Thirty-one seasons of blowing it at people who deserved it.");
  box(0.6, 1.3, 0.6, M.gray, -0.55, 0, 13.4, { col: true });
  for (let i = 0; i < 3; i++) box(0.4, 0.03, 0.02, M.steel, -0.55, 0.3 + i * 0.4, 13.09);
  World.hides.hide_coach = { room: 'coach', pos: new V3(-0.55, 1.0, 13.3), label: 'Filing cabinet', empty: 'Old playbooks going back to 1994. A lot of tight end screens. Coach has taste.' };
  hotspot('hide_coach', 'coach', -0.9, 0.9, 13.0, 'Filing cabinet', World.hides.hide_coach.empty);
  World.struggle.coach = { x: -3.8, z: 9.9, ry: 0.2, spill: 'coffee', spillColor: 0x3a2412 };
  fixture(-3, 3.98, 8.25, 0xffe2c0, 10, 'coach');
}

function buildGM() {
  box(2.0, 0.04, 0.9, M.glass, 3.0, 0.74, 11.4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.04, 0.74, 0.04, M.steel, 3.0 + sx * 0.92, 0, 11.4 + sz * 0.38);
  collide(3.0, 11.4, 2.0, 0.92);
  box(0.6, 0.38, 0.04, M.black, 2.6, 0.82, 11.6); box(0.56, 0.32, 0.01, M.screenGlow, 2.6, 0.85, 11.575);
  box(0.22, 0.06, 0.16, M.black, 3.7, 0.78, 11.3);
  box(0.55, 0.07, 0.5, M.black, 3.0, 0.48, 12.4); box(0.55, 0.75, 0.07, M.black, 3.0, 0.5, 12.66); box(0.06, 0.48, 0.06, M.steel, 3.0, 0, 12.4);
  collide(3.0, 12.4, 0.6, 0.6);
  hotspot('hs_phone', 'gm', 3.7, 1.0, 10.75, 'Desk phone', 'A voicemail on speaker, from the owner: "Dana. Rhett starts shadowing you Monday. Teach him everything. Then pack."\n\nOof.');
  box(0.45, 0.7, 0.35, M.black, 5.3, 0, 12.85, { col: true }); box(0.4, 0.02, 0.06, M.steel, 5.3, 0.7, 12.85);
  hotspot('hs_shredder', 'gm', 4.95, 0.8, 12.55, 'Paper shredder', 'You piece a few strips back together: RELOCATION FEASIBILITY: LAS VEGAS.\n\nThe owner was shopping the team. No wonder everybody in this building is tense.');
  picture(boardTexture('SALARY CAP 2026', ['Committed ...... $255,400,000', 'Cap ............ $255,400,000', 'Remaining ...... $0.00', '', '              (somehow)'], { titleColor: '#1f2a44' }), 5.84, 1.6, 7.0, -Math.PI / 2, 2.2, 1.1, true);
  hotspot('hs_capboard', 'gm', 5.4, 1.6, 7.0, 'Salary cap board', 'SALARY CAP REMAINING: $0.00. Underneath, in smaller handwriting: somehow.');
  cyl(0.28, 0.22, 0.5, M.woodDark, 0.65, 0, 13.35, { col: true });
  for (let i = 0; i < 6; i++) sph(0.26, M.plant, 0.65 + Math.cos(i) * 0.14, 0.75 + (i % 3) * 0.22, 13.35 + Math.sin(i) * 0.14);
  World.hides.hide_gm = { room: 'gm', pos: new V3(0.65, 0.55, 13.3), label: 'Potted plant', empty: 'A fake plant. Even the dirt is fake. Very on brand for a GM office.' };
  hotspot('hide_gm', 'gm', 1.0, 0.8, 13.0, 'Potted plant', World.hides.hide_gm.empty);
  World.struggle.gm = { x: 2.3, z: 9.9, ry: -0.5, spill: 'sparkling water', spillColor: 0xa9c8d8 };
  fixture(3, 3.98, 8.25, 0xfff0dc, 10, 'gm');
}

function buildLobby() {
  const logo = canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#a3271f'; g.beginPath(); g.arc(w / 2, h / 2, 250, 0, TAU); g.fill();
    g.strokeStyle = '#e2b04a'; g.lineWidth = 16; g.beginPath(); g.arc(w / 2, h / 2, 222, 0, TAU); g.stroke();
    g.fillStyle = '#f2ecdc'; g.font = `900 280px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', w / 2, h / 2 + 14);
    g.font = `900 40px ${FONT_DISPLAY}`; g.fillStyle = '#e2b04a';
    const txt = 'BAY CITY BRUISERS · EST. 1961 · ';
    for (let i = 0; i < txt.length; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i / txt.length * TAU); g.fillText(txt[i], 0, -190); g.restore(); }
  }, { repeat: false });
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshStandardMaterial({ map: logo, transparent: true, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }));
  lm.rotation.x = -Math.PI / 2; lm.position.set(12, 0.006, 8.4); World.root.add(lm);
  // trophy case
  box(3.1, 0.8, 0.7, M.woodDark, 8.05, 0, 13.45); box(3.1, 0.06, 0.7, M.woodDark, 8.05, 2.2, 13.45);
  box(3.1, 1.4, 0.7, M.glass, 8.05, 0.8, 13.45); collide(8.05, 13.45, 3.1, 0.72);
  for (const x of [6.9, 7.35, 8.8, 9.25]) { cyl(0.07, 0.09, 0.06, M.woodDark, x, 0.8, 13.5); cylC(0.08, 0.03, 0.22, M.gold, x, 1.0, 13.5); }
  World.weaponHome.trophy = { pos: new V3(8.05, 0.8, 13.45), ry: 0, room: 'lobby', hs: 'hs_trophy' };
  hotspot('hs_trophy', 'lobby', 8.05, 1.3, 12.85, 'Trophy case', 'The 1994 championship trophy, polished to a mirror shine. The Bruisers haven\'t won one since. Sunday was supposed to change that.');
  // front doors
  for (const s of [-1, 1]) { box(1.44, 2.75, 0.05, M.glass, 12 + s * 0.74, 0, 14.0); box(0.6, 0.05, 0.08, M.steel, 12 + s * 0.6, 1.05, 13.94); }
  box(0.08, 2.8, 0.12, M.frame, 12, 0, 14.0);
  World.rainTex.push(TEX.rain);
  World.doorRain = plane(3.2, 2.9, new THREE.MeshBasicMaterial({ map: TEX.rain, toneMapped: false }), 12, 1.45, 14.32, Math.PI);
  hotspot('hs_frontdoor', 'lobby', 12, 1.4, 13.45, 'Front doors', 'Magnetic locks engaged. A screen reads STORM LOCKDOWN UNTIL 6:00 AM. Rain hammers the glass.\n\nNobody leaves. Nobody arrives.');
  // umbrella stand (hiding spot)
  cyl(0.22, 0.2, 0.6, M.black, 10.4, 0, 13.5, { col: true });
  for (let i = 0; i < 3; i++) cyl(0.015, 0.015, 0.9, i === 1 ? M.red : M.goldPaint, 10.35 + i * 0.06, 0, 13.45 + (i - 1) * 0.06);
  World.hides.hide_lobby = { room: 'lobby', pos: new V3(10.4, 0.5, 13.5), label: 'Umbrella stand', empty: 'Three umbrellas, all team-branded, all turned inside out by the wind tonight.' };
  hotspot('hide_lobby', 'lobby', 10.4, 0.7, 13.15, 'Umbrella stand', World.hides.hide_lobby.empty);
  // security desk
  box(2.6, 1.05, 0.8, M.woodDark, 14.8, 0, 11.0, { col: true }); box(2.7, 0.05, 0.9, M.stone, 14.8, 1.05, 11.0);
  box(2.62, 0.08, 0.02, M.gold, 14.8, 0.9, 10.59);
  const camTex = canvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0d1a14'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3cd27a'; g.lineWidth = 2; g.strokeRect(6, 6, w / 2 - 9, h / 2 - 9); g.strokeRect(w / 2 + 3, 6, w / 2 - 9, h / 2 - 9); g.strokeRect(6, h / 2 + 3, w / 2 - 9, h / 2 - 9); g.strokeRect(w / 2 + 3, h / 2 + 3, w / 2 - 9, h / 2 - 9);
    g.fillStyle = '#3cd27a'; g.font = `700 13px ${FONT_BODY}`; g.fillText('CAM 1 HALL', 12, 22); g.fillText('CAM 2 FIELD', w / 2 + 9, 22); g.fillText('NO SIGNAL', 12, h / 2 + 20); g.fillText('DOOR LOG', w / 2 + 9, h / 2 + 20);
    speckle(g, w, h, ['rgba(60,210,120,.25)'], 600, 1, 2);
  }, { repeat: false });
  for (const s of [-1, 1]) {
    box(0.62, 0.42, 0.06, M.black, 14.8 + s * 0.45, 1.1, 11.15);
    plane(0.56, 0.36, new THREE.MeshBasicMaterial({ map: camTex, toneMapped: false }), 14.8 + s * 0.45, 1.31, 11.115, Math.PI);
  }
  hotspot('hs_security', 'lobby', 14.8, 1.25, 10.45, 'Security desk', 'Camera feeds, mostly static since the storm hit. The door-badge log is still running on backup power.');
  // hall of fame
  sign('HALL OF FAME', 17.83, 2.55, 6.4, -Math.PI / 2, 3.2, 0.45, { bg: '#14171c', fg: '#e6b450', size: 76 });
  [[4.4, '12'], [6.4, '85'], [8.4, '77']].forEach(([z, n]) => {
    box(0.06, 1.15, 0.95, M.woodDark, 17.82, 1.05, z);
    const jt = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, h);
      g.fillStyle = n === '85' ? '#a3271f' : '#8a2620';
      g.beginPath(); g.moveTo(40, 40); g.lineTo(96, 24); g.lineTo(160, 24); g.lineTo(216, 40); g.lineTo(236, 100); g.lineTo(196, 110); g.lineTo(196, 236); g.lineTo(60, 236); g.lineTo(60, 110); g.lineTo(20, 100); g.closePath(); g.fill();
      g.fillStyle = '#e6b450'; g.font = `900 110px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, w / 2, 150);
      if (n === '85') { g.fillStyle = 'rgba(60,110,40,.55)'; g.beginPath(); g.ellipse(90, 200, 30, 14, .4, 0, TAU); g.fill(); g.strokeStyle = '#1b1d22'; g.lineWidth = 4; g.beginPath(); g.moveTo(175, 40); g.lineTo(200, 75); g.stroke(); }
    }, { repeat: false });
    picture(jt, 17.78, 1.62, z, -Math.PI / 2, 0.82, 0.98, true);
  });
  hotspot('hs_jersey85', 'lobby', 17.35, 1.7, 6.4, 'Framed #85 jersey', 'A grass-stained #85 jersey, torn at the shoulder, framed like a holy relic. The plaque reads: BLOCKED LIKE IT WAS A PARTY. CAUGHT LIKE IT WAS PERSONAL.\n\nYour old jersey. You stand up a little straighter.');
  // seating
  box(0.85, 0.42, 2.2, M.leather, 6.6, 0, 6.6, { col: true }); box(0.22, 0.45, 2.2, M.leather, 6.28, 0.42, 6.6);
  box(0.7, 0.4, 1.0, M.woodDark, 7.8, 0, 6.6, { col: true });
  World.struggle.lobby = { x: 9.2, z: 10.0, ry: 2.8, spill: 'rainwater', spillColor: 0x7d98a8 };
  fixture(12, 3.98, 8.25, 0xffe8c8, 16, 'lobby');
}

function buildField() {
  box(28, 2.0, 0.12, M.redPad, 32, 0, -13.79); box(28, 2.0, 0.12, M.redPad, 32, 0, 13.79);
  box(0.12, 2.0, 28, M.redPad, 45.79, 0, 0);
  box(0.12, 2.0, 11.5, M.redPad, 18.21, 0, -8.25); box(0.12, 2.0, 11.5, M.redPad, 18.21, 0, 8.25);
  sign('BRUISERS', 32, 5.4, -13.82, 0, 12, 2.0, { bg: '#9e2620', fg: '#f2ecdc', stripe: '#e2b04a', w: 1024, h: 170, size: 150 });
  sign('EVERY SUNDAY IS A BLOCK PARTY', 32, 5.4, 13.82, Math.PI, 14, 1.4, { bg: '#16191e', fg: '#e6b450', stripe: '#a3271f', w: 1600, h: 160, size: 110 });
  // windows (storm)
  for (const z of [-9, -3, 3, 9]) {
    const mat = new THREE.MeshBasicMaterial({ map: TEX.rain, toneMapped: false, color: 0x9fb2c8 });
    World.windows.push(mat);
    plane(5.2, 2.4, mat, 45.83, 7.3, z, -Math.PI / 2);
    box(0.1, 2.6, 0.12, M.frame, 45.8, 6.1, z - 2.65); box(0.1, 2.6, 0.12, M.frame, 45.8, 6.1, z + 2.65);
  }
  for (const x of [22, 28, 34, 40]) box(0.3, 0.5, 28, M.darkSteel, x, 9.3, 0);
  for (const [x, z] of [[25, -6], [25, 6], [39, -6], [39, 6]]) fixture(x, 9.3, z, 0xf2f6ff, 85, 'field', { dist: 26 });
  // goal post
  cyl(0.13, 0.13, 3.05, M.yellow, 44.95, 0, 0); collide(44.95, 0, 0.4, 0.4);
  cylC(0.08, 0.08, 0.6, M.yellow, 44.7, 3.05, 0, { rz: Math.PI / 2 });
  cylC(0.07, 0.07, 5.6, M.yellow, 44.4, 3.05, 0, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) cyl(0.06, 0.06, 6.0, M.yellow, 44.4, 3.05, s * 2.8);
  box(0.4, 1.9, 0.4, M.redPad, 44.95, 0, 0);
  // bleachers
  box(20, 0.45, 2.45, M.darkSteel, 32, 0, 12.62); box(20, 0.45, 1.63, M.darkSteel, 32, 0.45, 13.03); box(20, 0.45, 0.82, M.darkSteel, 32, 0.9, 13.44);
  for (const [y, z] of [[0.45, 11.6], [0.9, 12.42], [1.35, 13.24]]) box(20, 0.05, 0.3, M.red, 32, y, z);
  collide(32, 12.62, 20, 2.45);
  // hydration station
  box(1.6, 0.8, 0.7, M.white, 20.6, 0, -11.2, { col: true });
  cyl(0.22, 0.22, 0.48, M.orange, 20.3, 0.8, -11.2); cyl(0.23, 0.23, 0.05, M.white, 20.3, 1.28, -11.2);
  for (let i = 0; i < 4; i++) cyl(0.04, 0.035, 0.1, M.white, 20.9 + (i % 2) * 0.1, 0.8, -11.3 + Math.floor(i / 2) * 0.12);
  hotspot('hs_cooler', 'field', 20.6, 1.1, -10.65, 'Hydration station', 'An orange cooler, full to the brim. You feel the ancient urge to dump it over someone\'s head.\n\nNot yet. Close the case first.');
  // ball cart
  box(1.2, 0.6, 0.7, M.darkSteel, 43.0, 0, -11.3, { col: true });
  for (let i = 0; i < 6; i++) sph(0.11, M.leather, 42.6 + (i % 3) * 0.35, 0.68, -11.45 + Math.floor(i / 3) * 0.3, { sx: 1.55, ry: i });
  // cones
  for (const x of [23, 25, 27, 29]) { cyl(0.02, 0.15, 0.42, M.orange, x, 0, 4); collide(x, 4, 0.3, 0.3); }
  for (const [x, z, r] of [[30.5, -3.2, 0.4], [35.2, 6.5, 1.8], [27.4, 9.2, 2.6], [42.5, -6.8, 1.1]]) sph(0.11, M.leather, x, 0.11, z, { sx: 1.55, ry: r });
  // dummies
  [[37.5, -5], [37.5, -1.5], [37.5, 2], [40.5, -3.2], [40.5, 0.3], [40.5, 3.8]].forEach(([x, z]) => {
    const d = makeDummy(); d.position.set(x, 0, z); World.root.add(d);
    World.dummies.push({ mesh: d, x, z, ax: 0, az: 0, vx: 0, vz: 0 });
  });
  // blocking sled
  const sled = new THREE.Group();
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(2.0, 0.08, 0.12), M.darkSteel, 0, 0.04, s * 1.15, sled);
  mesh(new THREE.BoxGeometry(0.1, 0.9, 2.5), M.darkSteel, -0.4, 0.45, 0, sled);
  mesh(new THREE.BoxGeometry(1.0, 0.06, 0.06), M.darkSteel, 0.1, 0.9, 0, sled);
  for (const z of [-0.85, 0, 0.85]) mesh(new THREE.BoxGeometry(0.3, 0.9, 0.6), M.red, -0.62, 0.95, z, sled);
  sled.position.set(26.5, 0, -7.5); World.root.add(sled);
  World.sled = { mesh: sled, x: 26.5, z: -7.5, vx: 0, vz: 0 };
  World.sled.hs = hotspot('hs_sled', 'field', 25.7, 1.0, -7.5, 'Blocking sled', IS_TOUCH ? 'A five-man blocking sled. Hit the BLOCK button while facing it. Seriously. Do it.' : 'A five-man blocking sled. Face it and press F to block. Seriously. Do it.');
}

// ---- case-layer helpers (body, struggle, stash) ----
function resetCaseLayer() {
  while (World.caseLayer.children.length) World.caseLayer.remove(World.caseLayer.children[0]);
  for (const [id, hs] of Array.from(World.hotspots)) if (hs.extra) removeHotspot(id);
  for (const id of ROOM_IDS) {
    const s = World.struggle[id];
    const ch = makeChair(M.gray); ch.position.set(s.x, 0, s.z); ch.rotation.y = s.ry; World.caseLayer.add(ch); s.chair = ch;
  }
  for (const k in World.weaponHome) {
    const wh = World.weaponHome[k];
    const m = makeWeaponMesh(k); m.position.copy(wh.pos); if (wh.rot) m.rotation.set(...wh.rot); World.caseLayer.add(m); wh.mesh = m;
  }
  for (const fb of World.footballs) { fb.got = false; fb.mesh.visible = true; fb.glow.visible = true; }
}
function decal(tex, color, w, h, x, z, ry, opacity) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: opacity == null ? 0.9 : opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry || 0; m.position.set(x, 0.012, z); World.caseLayer.add(m); return m;
}
function setStruggle(roomId, bigShoe) {
  const s = World.struggle[roomId];
  s.chair.rotation.set(0, s.ry + 0.7, Math.PI / 2); s.chair.position.y = 0.22;
  decal(TEX.spill, s.spillColor, 1.5, 1.2, s.x + 0.7, s.z + 0.3, 0.4, 0.8);
  const len = bigShoe ? 0.36 : 0.26;
  decal(TEX.footprint, 0x2a1d14, len * 0.45, len, s.x + 1.35, s.z + 0.55, -0.5);
  decal(TEX.footprint, 0x2a1d14, len * 0.45, len, s.x + 1.7, s.z + 1.0, -0.5, 0.7);
  return s;
}
function makeEvidenceTent(n, x, z) {
  const t = canvasTexture(64, 64, (g) => { g.fillStyle = '#f2c11e'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; g.font = `900 46px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 32, 36); }, { repeat: false });
  const geo = new THREE.ConeGeometry(0.1, 0.16, 3); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  m.position.set(x, 0.08, z); World.caseLayer.add(m); return m;
}
