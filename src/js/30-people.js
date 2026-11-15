// ===== People ===============================================================
const pmatCache = new Map();
function matC(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!pmatCache.has(k)) pmatCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(hex), roughness: 0.78 }, o)));
  return pmatCache.get(k);
}
function capsule(r, len) { return new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10); }

function addHair(hp, p, hr) {
  const hm = matC(p.hair || '#2a1d14', { roughness: 0.9 });
  const capGeo = (r, t) => new THREE.SphereGeometry(r, 20, 12, 0, TAU, 0, t);
  const y0 = hr * 1.05;
  const add = (geo, mat, x, y, z, rx = 0, s = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.scale.set(...s); hp.add(m); return m; };
  switch (p.hairStyle) {
    case 'short': add(capGeo(hr * 1.04, Math.PI * 0.5), hm, 0, y0 + hr * 0.12, -hr * 0.05, -0.25, [0.93, 1.05, 1.02]); break;
    case 'gray': add(capGeo(hr * 1.04, Math.PI * 0.47), hm, 0, y0 + hr * 0.15, -hr * 0.06, -0.3, [0.93, 1.0, 1.02]); break;
    case 'bob': add(capGeo(hr * 1.12, Math.PI * 0.66), hm, 0, y0 + hr * 0.1, -hr * 0.12, -0.55, [0.98, 1.1, 1.05]); break;
    case 'bun': add(capGeo(hr * 1.05, Math.PI * 0.52), hm, 0, y0 + hr * 0.1, -hr * 0.06, -0.3, [0.93, 1.05, 1.02]); add(new THREE.SphereGeometry(hr * 0.42, 12, 10), hm, 0, y0 + hr * 0.9, -hr * 0.8); break;
    case 'slick': add(capGeo(hr * 1.06, Math.PI * 0.42), hm, 0, y0 + hr * 0.22, -hr * 0.02, -0.15, [0.95, 1.1, 1.08]); break;
    case 'curly': add(capGeo(hr * 1.14, Math.PI * 0.62), hm, 0, y0 + hr * 0.12, -hr * 0.1, -0.45, [1, 1.05, 1.05]); break;
    case 'cap': case 'backcap': {
      const cm = matC(p.capColor || '#a3271f', { roughness: 0.7 });
      add(capGeo(hr * 1.08, Math.PI * 0.5), cm, 0, y0 + hr * 0.2, 0, 0, [0.96, 0.95, 1.02]);
      const dir = p.hairStyle === 'cap' ? 1 : -1;
      add(new THREE.BoxGeometry(hr * 1.5, hr * 0.08, hr * 0.9), cm, 0, y0 + hr * 0.3, dir * hr * 1.25, dir * -0.12);
      break;
    }
    case 'chef':
      add(capGeo(hr * 1.04, Math.PI * 0.5), hm, 0, y0 + hr * 0.1, -hr * 0.05, -0.3, [0.93, 1.0, 1.02]);
      add(new THREE.CylinderGeometry(hr * 0.95, hr * 0.85, hr * 1.4, 16), matC('#f4f1ea'), 0, y0 + hr * 1.55, -hr * 0.05);
      add(new THREE.SphereGeometry(hr * 1.05, 14, 10), matC('#f4f1ea'), 0, y0 + hr * 2.25, -hr * 0.05, 0, [1, 0.55, 1]);
      break;
    default: break;
  }
  if (p.glasses) {
    const gm = matC('#1a1a1a', { roughness: 0.3, metalness: 0.5 });
    for (const s of [-1, 1]) { const r = add(new THREE.TorusGeometry(hr * 0.2, hr * 0.03, 6, 16), gm, s * hr * 0.34, y0 + hr * 0.12, hr * 0.9); r.rotation.x = 0; }
    add(new THREE.BoxGeometry(hr * 0.25, hr * 0.04, hr * 0.04), gm, 0, y0 + hr * 0.15, hr * 0.95);
  }
  if (p.shades) add(new THREE.BoxGeometry(hr * 1.2, hr * 0.22, hr * 0.12), matC('#111', { roughness: 0.2 }), 0, y0 + hr * 0.95, hr * 0.55, -0.4);
  if (p.headband) add(new THREE.TorusGeometry(hr * 0.98, hr * 0.12, 8, 24), matC(p.headband), 0, y0 + hr * 0.45, 0, Math.PI / 2 - 0.15);
}

function makePerson(p) {
  const H = p.height, W = p.width;
  const root = new THREE.Group();
  const skin = matC(p.skin, { roughness: 0.6 }), top = matC(p.top), pants = matC(p.pants), shoeM = matC(p.shoes || '#141414');
  const legLen = H * 0.47, hipY = legLen, thighL = legLen * 0.52, shinL = legLen * 0.5;
  const legR = 0.058 + W * 0.03;
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * W * 0.19, hipY, 0); root.add(hip);
    const thigh = new THREE.Mesh(capsule(legR, thighL), pants); thigh.position.y = -thighL / 2; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -thighL + legR * 0.4; hip.add(knee);
    const shin = new THREE.Mesh(capsule(legR * 0.86, shinL), p.socks ? matC(p.socks) : pants); shin.position.y = -shinL / 2; knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(legR * 2.2, 0.08, 0.27 * (p.shoeScale || 1)), shoeM); foot.position.set(0, -shinL + 0.02, 0.05); knee.add(foot);
    legs.push({ hip, knee });
  }
  const torsoH = H * 0.3;
  const torso = new THREE.Group(); torso.position.y = hipY - 0.05; root.add(torso);
  const tr = W * 0.31;
  const chest = new THREE.Mesh(capsule(tr, torsoH + tr * 0.6), top); chest.scale.set(1, 1, 0.62); chest.position.y = torsoH * 0.5; torso.add(chest);
  if (p.pads) { const pad = new THREE.Mesh(new THREE.SphereGeometry(tr * 1.02, 16, 10), top); pad.scale.set(1.45, 0.5, 0.78); pad.position.y = torsoH * 0.88; torso.add(pad); }
  if (p.coat) {
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.98, tr * 1.18, legLen * 0.5, 14, 1, true), matC(p.top, { side: THREE.DoubleSide }));
    coat.scale.z = 0.66; coat.position.y = -legLen * 0.2; torso.add(coat);
  }
  if (p.collar) { const c = new THREE.Mesh(new THREE.BoxGeometry(tr * 0.7, torsoH * 0.35, 0.02), matC(p.collar)); c.position.set(0, torsoH * 0.78, tr * 0.6); torso.add(c); }
  if (p.belt) { const b = new THREE.Mesh(new THREE.CylinderGeometry(tr * 1.0, tr * 1.0, 0.06, 16), matC(p.belt)); b.scale.z = 0.64; b.position.y = 0.02; torso.add(b); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.026, H * 0.03, 0.12, 10), skin); neck.position.y = torsoH + 0.06; torso.add(neck);
  const headPivot = new THREE.Group(); headPivot.position.y = torsoH + 0.09; torso.add(headPivot);
  const hr = H * 0.064;
  const head = new THREE.Mesh(new THREE.SphereGeometry(hr, 20, 16), skin); head.scale.set(0.9, 1.08, 0.98); head.position.y = hr * 1.05; headPivot.add(head);
  const eyeM = matC('#16110d', { roughness: 0.25 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.11, 8, 6), eyeM); e.position.set(s * hr * 0.33, hr * 1.13, hr * 0.86); headPivot.add(e); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.14, 8, 6), skin); nose.position.set(0, hr * 0.98, hr * 0.97); headPivot.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.2, 8, 6), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * hr * 0.9, hr * 1.05, 0); headPivot.add(ear); }
  addHair(headPivot, p, hr);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * (tr * 1.05 + 0.04), torsoH * 0.9, 0); torso.add(sh);
    const al = H * 0.17, ar = H * 0.028 + W * 0.018;
    const upper = new THREE.Mesh(capsule(ar, al), p.sleeves ? matC(p.sleeves) : top); upper.position.y = -al / 2; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -al + ar * 0.5; sh.add(elbow);
    const lower = new THREE.Mesh(capsule(ar * 0.88, al * 0.95), p.forearm === 'skin' ? skin : (p.sleeves ? matC(p.sleeves) : top)); lower.position.y = -al * 0.46; elbow.add(lower);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(ar * 1.08, 10, 8), p.gloves ? matC(p.gloves) : skin); hand.position.y = -al * 0.98; elbow.add(hand);
    sh.rotation.z = s * 0.1;
    arms.push({ sh, elbow });
  }
  if (p.number) {
    const nt = numberTexture(p.number, p.numColor || '#e6b450', p.numOutline || '#14171c');
    const nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true, toneMapped: true });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(tr * 1.2, tr * 1.2), nm); f.position.set(0, torsoH * 0.52, tr * 0.64); torso.add(f);
    const b = f.clone(); b.position.z = -tr * 0.64; b.rotation.y = Math.PI; torso.add(b);
  }
  if (p.chestText) {
    const ct = signTexture(p.chestText, { w: 256, h: 64, bg: 'rgba(0,0,0,0)', fg: p.chestColor || '#e6b450', size: 46, transparent: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tr * 1.1, tr * 0.28), new THREE.MeshBasicMaterial({ map: ct, transparent: true }));
    m.position.set(-tr * 0.3, torsoH * 0.72, tr * 0.635); m.scale.x = 0.7; torso.add(m);
  }
  if (p.whistle) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(tr * 0.5, 0.008, 6, 20), matC('#b02a22')); w.position.set(0, torsoH * 0.78, tr * 0.25); w.rotation.x = 1.2; torso.add(w);
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 10), matC('#c0c4c8', { metalness: 0.8, roughness: 0.3 })); wh.rotation.z = Math.PI / 2; wh.position.set(0, torsoH * 0.55, tr * 0.66); torso.add(wh);
  }
  if (p.tablet) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), matC('#16191e')); t.position.set(0, -H * 0.17 * 0.95, 0.06); arms[1].elbow.add(t); }
  return { root, torso, headPivot, arms, legs, H, W };
}

function shadowBlob(r) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.015; return m;
}

class Suspect {
  constructor(def, spot) {
    this.def = def; this.id = def.id;
    const fig = makePerson(def.look);
    this.fig = fig; this.root = fig.root;
    this.x = spot.x; this.z = spot.z; this.baseYaw = spot.yaw || 0; this.yaw = this.baseYaw;
    this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.yaw;
    this.radius = 0.28 + def.look.width * 0.14;
    this.t = Math.random() * 10; this.stagger = 0; this.talking = false;
    this.pose = spot.pose || 'stand';
    this.root.add(shadowBlob(0.5));
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(def.short || def.name, def.role, def.color), transparent: true, depthWrite: false }));
    this.tag.scale.set(1.2, 0.3, 1); this.tag.position.set(this.x, fig.H + 0.42, this.z);
    this.alert = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture('!', { w: 64, h: 64, bg: '#e6b450', fg: '#14171c', size: 54, dy: 3 }), transparent: false }));
    this.alert.scale.set(0.26, 0.26, 1); this.alert.position.set(this.x, fig.H + 0.78, this.z); this.alert.visible = false;
    World.caseLayer.add(this.root, this.tag, this.alert);
    if (this.pose === 'sit') this.sit(spot.seatY || 0.5);
  }
  get headPos() { return new V3(this.x, this.root.position.y + this.fig.H * 0.92, this.z); }
  sit(seatY) {
    const f = this.fig;
    f.legs.forEach(l => { l.hip.rotation.x = -Math.PI / 2; l.knee.rotation.x = Math.PI / 2; });
    this.root.position.y = seatY - f.legs[0].hip.position.y + 0.05;
  }
  update(dt, px, pz, now) {
    const f = this.fig; this.t += dt;
    const dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz);
    const target = (d < 5.5 || this.talking) ? Math.atan2(dx, dz) : this.baseYaw;
    if (this.pose !== 'sit') { this.yaw = angleLerp(this.yaw, target, Math.min(1, dt * 3)); this.root.rotation.y = this.yaw; }
    else {
      let rel = ((Math.atan2(dx, dz) - this.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
      f.headPivot.rotation.y = lerp(f.headPivot.rotation.y, d < 5 ? clamp(rel, -1, 1) : 0, Math.min(1, dt * 3));
    }
    const b = Math.sin(this.t * 1.7);
    f.torso.scale.y = 1 + b * 0.008;
    f.arms[0].sh.rotation.x = Math.sin(this.t * 0.9) * 0.04;
    f.arms[1].sh.rotation.x = -Math.sin(this.t * 0.9 + 0.6) * 0.04;
    if (this.talking) { f.headPivot.rotation.x = Math.sin(this.t * 7) * 0.035; f.arms[1].sh.rotation.x = -0.25 + Math.sin(this.t * 3.3) * 0.15; f.arms[1].elbow.rotation.x = -0.6; }
    else { f.headPivot.rotation.x = lerp(f.headPivot.rotation.x, 0, dt * 4); f.arms[1].elbow.rotation.x = lerp(f.arms[1].elbow.rotation.x, 0, dt * 3); }
    if (this.stagger > 0) { this.stagger -= dt; f.torso.rotation.x = Math.sin(this.stagger * 18) * this.stagger * 0.5; } else f.torso.rotation.x = 0;
    this.tag.visible = d < 9 && d > 1.6 && !this.talking;
    this.tag.material.opacity = clamp((9 - d) / 3, 0, 1) * clamp((d - 1.6) / 1.2, 0, 1);
    this.alert.position.y = f.H + 0.82 + Math.sin(now * 3) * 0.05 + (this.pose === 'sit' ? this.root.position.y : 0);
    this.tag.position.y = f.H + 0.42 + (this.pose === 'sit' ? this.root.position.y : 0);
  }
}

// Victim for the story: slumped in the film-room desk chair.
function placeSlumpedVictim(look, x, z, yaw) {
  const f = makePerson(look);
  f.root.position.set(x, 0, z); f.root.rotation.y = yaw;
  f.legs.forEach((l, i) => { l.hip.rotation.x = -Math.PI / 2 + 0.1; l.hip.rotation.z = (i ? -1 : 1) * 0.08; l.knee.rotation.x = Math.PI / 2 - 0.15; });
  f.root.position.y = 0.52 - f.legs[0].hip.position.y;
  f.torso.rotation.x = -0.32; f.torso.rotation.z = 0.12;
  f.headPivot.rotation.x = 0.75; f.headPivot.rotation.z = 0.35;
  f.arms[0].sh.rotation.z = -0.25; f.arms[1].sh.rotation.z = 0.35; f.arms[1].sh.rotation.x = 0.2;
  World.caseLayer.add(f.root);
  return f;
}
// Victim for random cases: under a sheet on the 50.
function placeSheetedVictim(x, z) {
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.95 }));
  sheet.scale.set(0.62, 0.3, 1.9); sheet.position.y = 0.12; g.add(sheet);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), sheet.material); head.position.set(0, 0.16, -0.98); head.scale.y = 0.8; g.add(head);
  for (const s of [-1, 1]) { const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.26), matC('#2a1a10', { roughness: 0.4 })); shoe.position.set(s * 0.13, 0.09, 1.0); shoe.rotation.x = -0.5; g.add(shoe); }
  g.position.set(x, 0, z); g.rotation.y = Math.PI / 2;
  World.caseLayer.add(g);
  makeEvidenceTent(1, x - 1.3, z - 0.8); makeEvidenceTent(2, x + 1.5, z + 0.9);
  return g;
}
