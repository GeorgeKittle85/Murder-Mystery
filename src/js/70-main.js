// ===== Movement & physics ====================================================
const PR = 0.3;
function pushOutBoxes(boxes) {
  for (const c of boxes) {
    const cx = clamp(P.x, c.x1, c.x2), cz = clamp(P.z, c.z1, c.z2);
    const dx = P.x - cx, dz = P.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= PR * PR) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); P.x = cx + dx / d * PR; P.z = cz + dz / d * PR; }
    else {
      const pl = P.x - c.x1, pr = c.x2 - P.x, pt = P.z - c.z1, pb = c.z2 - P.z, m = Math.min(pl, pr, pt, pb);
      if (m === pl) P.x = c.x1 - PR; else if (m === pr) P.x = c.x2 + PR; else if (m === pt) P.z = c.z1 - PR; else P.z = c.z2 + PR;
    }
  }
}
function pushOutCircle(x, z, r) {
  const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz), m = r + PR;
  if (d < m && d > 1e-6) { P.x = x + dx / d * m; P.z = z + dz / d * m; }
}
function sledBox() { const s = World.sled; return { x1: s.x - 0.85, x2: s.x + 0.55, z1: s.z - 1.3, z2: s.z + 1.3 }; }
function resolve() {
  pushOutBoxes(World.colliders);
  pushOutBoxes([sledBox()]);
  for (const s of G.suspects) pushOutCircle(s.x, s.z, s.radius);
  for (const d of World.dummies) pushOutCircle(d.x, d.z, 0.33);
  P.x = clamp(P.x, -29.6, 45.6); P.z = clamp(P.z, -13.6, 13.6);
}

function updatePlayer(dt) {
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('KeyA')) s -= 1;
  if (keys.has('ArrowLeft')) P.yaw += dt * 2.2;
  if (keys.has('ArrowRight')) P.yaw -= dt * 2.2;
  let mag = 1;
  if (joy.id !== null) { f += -joy.y; s += joy.x; mag = Math.min(1, Math.hypot(joy.x, joy.y) * 1.15); }
  const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.id !== null && mag > 0.98);
  const speed = (sprint ? 5.8 : 3.5) * (joy.id !== null ? Math.max(mag, 0.35) : 1);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let vx = (fx * f + rx * s) * speed, vz = (fz * f + rz * s) * speed;
  if (P.dash > 0) { vx += P.dx * 10; vz += P.dz * 10; P.dash -= dt; }
  const ox = P.x, oz = P.z;
  P.x += vx * dt; resolve(); P.z += vz * dt; resolve();
  const moved = Math.hypot(P.x - ox, P.z - oz);
  P.speed = moved / Math.max(dt, 1e-4);
  P.stepDist += moved;
  if (P.stepDist > (sprint ? 0.95 : 0.75)) { P.stepDist = 0; Sound.step(); }
  if (moved > 0.001) P.bob += moved * 3.4;
  P.blockCd = Math.max(0, P.blockCd - dt);
  P.kick = Math.max(0, P.kick - dt * 3);
}

function updateProps(dt, t) {
  for (const d of World.dummies) {
    d.vx += (-55 * d.ax - 3.2 * d.vx) * dt; d.vz += (-55 * d.az - 3.2 * d.vz) * dt;
    d.ax = clamp(d.ax + d.vx * dt, -1.2, 1.2); d.az = clamp(d.az + d.vz * dt, -1.2, 1.2);
    d.mesh.rotation.x = d.ax; d.mesh.rotation.z = d.az;
  }
  const s = World.sled;
  if (Math.abs(s.vx) + Math.abs(s.vz) > 0.01) {
    s.x = clamp(s.x + s.vx * dt, 19.5, 43.5); s.z = clamp(s.z + s.vz * dt, -12.2, 10.0);
    const k = Math.max(0, 1 - dt * 3.2); s.vx *= k; s.vz *= k;
    s.mesh.position.set(s.x, 0, s.z);
    s.hs.pos.set(s.x - 0.8, 1.0, s.z); s.hs.sparkle.position.set(s.x - 0.8, 1.32, s.z);
  }
  for (const fb of World.footballs) {
    if (fb.got) continue;
    fb.mesh.rotation.y = t * 1.6; fb.mesh.position.y = fb.y + Math.sin(t * 2 + fb.x) * 0.04;
    fb.glow.material.opacity = 0.45 + Math.sin(t * 3 + fb.z) * 0.15;
    if (G.state === 'play' && Math.hypot(P.x - fb.x, P.z - fb.z) < 1.15) {
      fb.got = true; fb.mesh.visible = false; fb.glow.visible = false; G.footballs++;
      Sound.pickup();
      if (G.footballs === 5) { toast('gold', 'Block party', 'All five golden footballs! You are the People\'s Tight End.', 5000); store.set('allFootballs', true); }
      else toast('gold', 'Golden football', `${G.footballs} of 5 found. Somewhere, a tight end just smiled.`);
    }
  }
  for (const hs of World.hotspots.values()) {
    if (!hs.sparkle.visible) continue;
    const k = 0.22 + Math.sin(t * 3 + hs.phase) * 0.06 + (G.target === hs ? 0.12 : 0);
    hs.sparkle.scale.setScalar(k);
    hs.sparkle.position.y = hs.pos.y + 0.32 + Math.sin(t * 1.6 + hs.phase) * 0.05;
  }
  if (World.beam) World.beam.material.opacity = 0.045 + Math.sin(t * 9) * 0.006;
  if (World.screenMat) World.screenMat.color.setScalar(0.72 + Math.sin(t * 11) * 0.02 + Math.sin(t * 0.8) * 0.04);
  TEX.rain.offset.y = (TEX.rain.offset.y - dt * 1.6) % 1;
}

function updateLightning(dt) {
  G.flash = Math.max(0, G.flash - dt * 2.8);
  G.nextLightning -= dt;
  if (G.nextLightning <= 0) {
    G.nextLightning = 12 + Math.random() * 20;
    G.flash = 1;
    setTimeout(() => { G.flash = Math.max(G.flash, 0.7); }, 160);
    const fieldNear = G.state !== 'play' || P.x > 10;
    Sound.thunder(0.5 + Math.random() * 1.4);
    if (!fieldNear) G.flash = 0.35;
  }
}

function findTarget() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  let best = null, bs = 1e9;
  const consider = (obj, x, z, range) => {
    const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
    if (d > range) return;
    const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
    if (d > 0.75 && dot < 0.55) return;
    const score = d * (1.7 - dot);
    if (score < bs) { bs = score; best = obj; }
  };
  for (const hs of World.hotspots.values()) if (hs.active) consider(hs, hs.pos.x, hs.pos.z, hs.range);
  for (const s of G.suspects) consider(s, s.x, s.z, 2.9);
  return best;
}
function updatePrompt() {
  const t = G.target;
  const prompt = $('#prompt'), act = $('#tAct');
  $('#crosshair').classList.toggle('hot', !!t);
  if (!t || G.overlay) { prompt.hidden = true; act.hidden = true; return; }
  let label, verb;
  if (t.kind === 'hs') {
    const ov = (G.C.hotspots && G.C.hotspots[t.id]) || {};
    label = ov.label || t.label; verb = t.id.startsWith('hide_') ? 'Search' : (t.id === 'body' ? '' : 'Inspect');
  } else { label = t.def.short; verb = 'Talk to'; }
  const isNew = t.kind === 'hs' ? !G.visited.has(t.id) : newLeads(t.id).length > 0;
  $('#promptText').innerHTML = esc((verb ? verb + ' ' : '') + label) + (isNew && t.kind !== 'hs' ? ' <span class="new">NEW LEAD</span>' : '');
  if (IS_TOUCH) { prompt.hidden = true; act.hidden = false; act.textContent = t.kind === 'hs' ? (verb === 'Search' ? 'Search' : 'Inspect') : 'Talk'; }
  else { prompt.hidden = false; act.hidden = true; }
}

// ===== Main loop =============================================================
let last = performance.now(), mapTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  updateLightning(dt);
  if (G.state === 'play') {
    if (!G.overlay) { G.elapsed += dt; updatePlayer(dt); }
    const room = roomAt(P.x, P.z);
    if (room !== G.roomNow) { G.roomNow = room; const name = ROOMS[room].name; showBanner(name); $('#mapRoom').textContent = name; }
    G.target = G.overlay ? null : findTarget();
    updatePrompt();
    $('#sbClock').textContent = fmtTime(G.elapsed);
    const bobY = REDUCED_MOTION ? 0 : Math.sin(P.bob) * 0.035 * clamp(P.speed / 3.5, 0, 1.4);
    camera.position.set(P.x, 1.68 + bobY, P.z);
    if (G.talkingTo) {
      const hp = G.talkingTo.headPos, dx = hp.x - P.x, dz = hp.z - P.z;
      P.yaw = angleLerp(P.yaw, Math.atan2(-dx, -dz), Math.min(1, dt * 4));
      P.pitch = lerp(P.pitch, Math.atan2(hp.y - 1.68, Math.hypot(dx, dz)), Math.min(1, dt * 4));
    }
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    const fov = G.baseFov + P.kick * 9;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
    mapTimer -= dt; if (mapTimer <= 0) { mapTimer = 0.08; drawMap($('#minimap'), false); }
    flashlight.intensity = 2.6;
    flashlight.position.copy(camera.position);
    const dir = new V3(0, 0, -1).applyEuler(camera.rotation);
    flashTarget.position.copy(camera.position).add(dir);
  } else {
    // title / briefing / result: slow orbit over the practice field
    const a = t * 0.06;
    camera.position.set(31 + Math.cos(a) * 10, 3.4 + Math.sin(t * 0.2) * 0.3, Math.sin(a) * 9);
    camera.lookAt(27 + Math.cos(a * 0.7) * 2, 1.0, 0);
    if (Math.abs(camera.fov - 62) > 0.05) { camera.fov = 62; camera.updateProjectionMatrix(); }
    flashlight.intensity = 0;
  }
  const lx = G.state === 'play' ? P.x : camera.position.x, lz = G.state === 'play' ? P.z : camera.position.z;
  updateLights(t, lx, lz);
  for (const s of G.suspects) s.update(dt, G.state === 'play' ? P.x : camera.position.x, G.state === 'play' ? P.z : camera.position.z, t);
  updateProps(dt, t);
  const fl = $('#flash'); fl.style.opacity = String(G.state === 'play' && P.x > 17 ? G.flash * 0.18 : 0);
  renderer.render(scene, camera);
}

function buildEnvironment() {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 12, 30), new THREE.MeshBasicMaterial({ color: 0x1e2329, side: THREE.BackSide })));
  const pm2 = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2), pm2); p.position.set(i * 7, 5.9, j * 7); p.rotation.x = Math.PI / 2; s.add(p); }
  const wallStrip = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.5), new THREE.MeshBasicMaterial({ color: 0x8a2a22 })); wallStrip.position.set(0, 0, -14.9); s.add(wallStrip);
  const env = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return env;
}

function resize() {
  const app = $('#app'); const w = app.clientWidth || window.innerWidth, h = app.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const a = w / h; G.baseFov = a < 1 ? clamp(2 * Math.atan(Math.tan(36 * Math.PI / 180) / a) * 180 / Math.PI, 72, 96) : 72;
  camera.updateProjectionMatrix();
}

async function boot() {
  if (!window.THREE) { $('#loading').hidden = true; $('#bootError').hidden = false; return; }
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`900 64px "Big Shoulders Display"`), document.fonts.load(`16px "Special Elite"`), document.fonts.load(`600 16px "Barlow"`)]),
      new Promise(r => setTimeout(r, 2500))
    ]);
  } catch (e) { /* fonts optional */ }
  const canvas = $('#scene');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
  } catch (e) {
    $('#loading').hidden = true; const be = $('#bootError'); be.hidden = false;
    be.querySelector('p').textContent = 'Your browser couldn\'t start WebGL, so the 3D facility can\'t be drawn. Try another browser or turn on hardware acceleration.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090c);
  scene.fog = new THREE.Fog(0x07090c, 18, 70);
  camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
  scene.environment = buildEnvironment();
  buildTextures(); initMaterials();
  for (const k in M) { const m = M[k]; if (m.isMeshStandardMaterial) m.envMapIntensity = 0.55; }
  buildWorld(scene);
  initLights();
  resetCaseLayer();
  setupInput(); setupUI();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('#app')); else window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.overlay) openPause(); });
  G.state = 'title';
  refreshTitle();
  $('#loading').hidden = true;
  requestAnimationFrame((n) => { last = n; frame(n); });
  window.__SD = { updatePlayer, updateProps, block, keys, G, P, World, setupCase, showBriefing, startPlay, inspect, talk, openNotebook, closeOverlays, finish, addClue, has, roomAt, SUSPECTS, renderer, scene, camera };
}
boot();
