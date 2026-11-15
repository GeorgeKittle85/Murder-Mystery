// ===== Game state ===========================================================
const G = {
  state: 'loading', overlay: null, mode: null, C: null,
  clues: new Map(), clueOrder: [], visited: new Set(), asked: new Set(), met: new Set(), alibis: {},
  strikes: { killer: new Set(), weapon: new Set(), room: new Set(), method: new Set(), motive: new Set() },
  pick: {}, wrong: 0, timeouts: 3, hintsUsed: 0, lastHint: '', elapsed: 0, footballs: 0,
  suspects: [], susById: {}, roomNow: null, target: null, callArmed: false, callMsg: '', callBad: false, nbTab: 'case', talkingTo: null,
  flash: 0, nextLightning: 8, sens: Number(store.get('sens', 1)) || 1
};
const has = (id) => G.clues.has(id);

let renderer, scene, camera, hemi, flashlight, flashTarget;
const pool = [];
const P = { x: 0, z: 0, yaw: 0, pitch: 0, bob: 0, stepDist: 0, dash: 0, dx: 0, dz: 0, blockCd: 0, kick: 0, speed: 0 };
const keys = new Set();
let locked = false, lockFailed = false, dragging = false;
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, lookT = { id: null, lx: 0, ly: 0 };

// ===== Lights ================================================================
function initLights() {
  hemi = new THREE.HemisphereLight(0xb8c6d8, 0x2c241c, 0.6); scene.add(hemi);
  const n = IS_TOUCH ? 6 : 8;
  for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 14, 2); scene.add(l); pool.push(l); }
  flashlight = new THREE.SpotLight(0xfff0d4, 0, 14, 0.62, 0.85, 2);
  flashTarget = new THREE.Object3D(); scene.add(flashTarget); flashlight.target = flashTarget; scene.add(flashlight);
}
function flickerVal(t) { const s = Math.sin(t * 13.1) + Math.sin(t * 7.7 + 1.3) + Math.sin(t * 29.3); return s > 2.2 ? 0.15 : (Math.sin(t * 0.7) > 0.93 ? 0.4 : 1); }
function updateLights(t, cx, cz) {
  const sorted = World.fixtures.map(f => ({ f, d: (f.pos.x - cx) ** 2 + (f.pos.z - cz) ** 2 })).sort((a, b) => a.d - b.d);
  pool.forEach((l, i) => {
    const s = sorted[i]; if (!s) { l.intensity = 0; return; }
    const f = s.f; l.position.copy(f.pos); l.color.copy(f.color); l.distance = f.dist;
    l.intensity = f.intensity * (f.flicker ? flickerVal(t) : 1);
  });
  hemi.intensity = 0.6 + G.flash * 2.2;
  World.windows.forEach(m => m.color.setScalar(0.6 + G.flash * 3));
}

// ===== HUD helpers ===========================================================
function toast(kind, tag, text, ms = 3400) {
  const box = $('#toasts');
  const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
  el.innerHTML = (tag ? `<span class="tk">${esc(tag)}</span>` : '') + `<span>${esc(text)}</span>`;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, ms);
}
let bannerTimer = 0;
function showBanner(text) {
  const b = $('#roomBanner'); b.textContent = text; b.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 2200);
}
function updateHUD() {
  const n = G.clues.size;
  $('#sbClues').textContent = G.C && G.C.totalClues ? `${n}/${G.C.totalClues}` : String(n);
  $('#sbDown').textContent = ordinal(G.wrong + 1);
  $('#sbCase').textContent = G.C ? G.C.title : '';
}
function hutText(t) {
  const el = document.createElement('div'); el.className = 'hutt'; el.textContent = t; $('#hud').appendChild(el); setTimeout(() => el.remove(), 650);
}

// ===== Clues & alerts =========================================================
function addClue(id, quiet) {
  if (!id || G.clues.has(id)) return null;
  const def = G.C.clues[id]; if (!def) return null;
  G.clues.set(id, Object.assign({ id, at: G.elapsed }, def)); G.clueOrder.push(id);
  Sound.clue(); updateHUD(); updateAlerts();
  if (!quiet) toast('', 'Evidence', def.title);
  return def;
}
function topicAvailable(t) {
  if (t.requires && !t.requires.every(has)) return false;
  if (t.requiresAny && !t.requiresAny.some(has)) return false;
  return true;
}
function newLeads(sid) { return (G.C.topics[sid] || []).filter(t => (t.requires || t.requiresAny) && topicAvailable(t) && !G.asked.has(t.id)); }
function updateAlerts() { G.suspects.forEach(s => { s.alert.visible = newLeads(s.id).length > 0; }); }

// ===== Typewriter ============================================================
let twTimer = null, twDone = null;
function typeText(el, prefixHTML, text) {
  clearInterval(twTimer);
  el.innerHTML = prefixHTML + '<span class="tw"></span>';
  const span = el.querySelector('.tw');
  if (REDUCED_MOTION) { span.textContent = text; twDone = null; return; }
  let i = 0;
  twDone = () => { clearInterval(twTimer); span.textContent = text; twDone = null; };
  twTimer = setInterval(() => { i += 3; span.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(twTimer); twDone = null; } }, 16);
}
function finishTyping() { if (twDone) { twDone(); return true; } return false; }

// ===== Pointer lock ==========================================================
function requestLock() {
  if (IS_TOUCH || G.state !== 'play' || G.overlay) return;
  try {
    const r = renderer.domElement.requestPointerLock();
    if (r && r.catch) r.catch(() => { lockFailed = true; updateResumeHint(); });
  } catch (e) { lockFailed = true; }
  updateResumeHint();
}
function exitLock() { if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* ignore */ } } }
function updateResumeHint() {
  if (lockFailed && !G.dragHintUntil) { G.dragHintUntil = performance.now() + 5000; setTimeout(updateResumeHint, 5100); }
  const show = !IS_TOUCH && G.state === 'play' && !G.overlay && !locked && (!lockFailed || performance.now() < G.dragHintUntil);
  const el = $('#resumeHint'); el.hidden = !show;
  el.textContent = lockFailed ? 'Drag with the mouse to look around' : 'Click to look around';
}

// ===== Overlays ==============================================================
function openOverlay(name) { G.overlay = name; exitLock(); keys.clear(); joy.id = null; $('#joy').classList.remove('on'); $('#prompt').hidden = true; $('#tAct').hidden = true; updateResumeHint(); }
function closeOverlays(relock = true) {
  ['#inspectPanel', '#dialogPanel', '#notebook', '#pauseMenu'].forEach(s => { $(s).hidden = true; });
  if (G.talkingTo) { G.talkingTo.talking = false; G.talkingTo = null; }
  G.overlay = null; clearInterval(twTimer); twDone = null;
  if (relock) requestLock();
  updateResumeHint();
}

// ---- inspect ----
function inspect(hs) {
  const ov = (G.C.hotspots && G.C.hotspots[hs.id]) || {};
  const label = ov.label || hs.label;
  const text = ov.text != null ? ov.text : hs.text;
  const clueId = ov.clue || hs.clue;
  const firstVisit = !G.visited.has(hs.id);
  G.visited.add(hs.id); hs.sparkle.visible = false;
  const clue = clueId ? addClue(clueId, true) : null;
  if (hs.id === 'hs_boombox') { Sound.riff(); }
  if (hs.id === 'hs_belt') { Sound.pop(); }
  if (hs.id === 'hs_frontdoor') { G.flash = 1; Sound.thunder(0.15); }
  openOverlay('inspect');
  $('#inspRoom').textContent = (ROOMS[hs.room] || ROOMS.hall).name;
  $('#inspTitle').textContent = label;
  const tEl = $('#inspText');
  if (ov.html) { clearInterval(twTimer); twDone = null; tEl.innerHTML = ov.html; }
  else typeText(tEl, '', text);
  const logged = $('#inspLogged');
  if (clue) { logged.hidden = false; $('#inspClueTitle').textContent = clue.title; setTimeout(() => Sound.stamp(), 250); }
  else if (clueId && G.clues.has(clueId) && !firstVisit) { logged.hidden = false; $('#inspClueTitle').textContent = 'Already in your Playbook.'; }
  else logged.hidden = true;
  $('#inspQuip').textContent = clue ? pick(Math.random, KITTLE_QUIPS) : '';
  $('#inspectPanel').hidden = false;
  $('#inspClose').focus({ preventScroll: true });
}

// ---- dialogue ----
function talk(s) {
  openOverlay('dialog');
  G.talkingTo = s; s.talking = true;
  const def = s.def;
  const first = !G.met.has(s.id); G.met.add(s.id);
  const pt = $('#dlgPortrait'); pt.textContent = def.initials; pt.style.background = def.color; pt.style.color = '#f0e9d8';
  $('#dlgName').textContent = def.name;
  $('#dlgRole').textContent = def.role + (G.mode === 'random' ? ` · ${def.tier} badge` : '');
  typeText($('#dlgText'), '', G.C.greets[s.id] || def.greet);
  $('#dlgObs').innerHTML = G.mode === 'random' ? `<b>You notice:</b> ${esc(def.shoeNote)} ${esc(def.handNote)}` : '';
  if (first && G.mode === 'random') toast('dark', 'Noted', `${def.short}: size ${def.shoe}, ${def.hand === 'L' ? 'left' : 'right'}-handed`, 2600);
  renderTopics(s);
  Sound.talk();
  $('#dialogPanel').hidden = false;
  updateAlerts();
}
function renderTopics(s) {
  const box = $('#dlgTopics'); box.innerHTML = '';
  const list = (G.C.topics[s.id] || []).filter(topicAvailable);
  list.forEach((t, i) => {
    const b = document.createElement('button');
    const asked = G.asked.has(t.id), isNew = !asked && (t.requires || t.requiresAny);
    b.className = 'topic' + (asked ? ' asked' : '');
    b.innerHTML = `<span class="n">${i + 1}</span><span>${esc(t.label)}</span>` + (isNew ? '<span class="tag">New lead</span>' : '');
    b.addEventListener('click', () => askTopic(s, t));
    box.appendChild(b);
  });
}
function askTopic(s, t) {
  Sound.click();
  G.asked.add(t.id);
  if (t.alibi) G.alibis[s.id] = t.text;
  typeText($('#dlgText'), `<span class="q">You: ${esc(t.label)}</span>`, t.text);
  (t.grants || []).forEach(id => { const c = addClue(id, true); if (c) toast('', 'Testimony', c.title); });
  renderTopics(s); updateAlerts();
}

// ---- notebook ----
function openNotebook(tab) {
  if (tab) G.nbTab = tab;
  openOverlay('notebook');
  G.callArmed = false;
  $('#notebook').hidden = false;
  renderNotebook();
}
function portraitHTML(def, small) { return `<div class="portrait" style="background:${def.color};color:#f0e9d8${small ? '' : ''}">${def.initials}</div>`; }
function renderNotebook() {
  $$('#nbTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === G.nbTab)));
  const body = $('#nbBody'); const C = G.C;
  let h = '';
  if (G.nbTab === 'case') {
    const facts = C.board(has);
    h += `<div class="nb-section"><h3>${esc(C.fileNo)} · ${esc(C.title)}</h3><div class="card"><div class="file">${C.briefing}</div></div></div>`;
    h += `<div class="nb-section"><h3>What you know</h3><div class="facts">` + facts.map(f => `<div class="fact ${f.v ? 'known' : ''}"><span class="k">${esc(f.k)}</span><span class="v ${f.v ? '' : 'unk'}">${f.v ? esc(f.v) : 'Unknown'}</span></div>`).join('') + `</div></div>`;
    h += `<div class="nb-section"><h3>Timeouts</h3><div class="timeout-box"><p>Stuck? Call a timeout and the sideline whispers a hint. <b>${G.timeouts} left.</b> Each one costs 6 rating points.</p><button class="btn-ghost" id="btnTimeout" ${G.timeouts ? '' : 'disabled'}>Call timeout</button></div>${G.lastHint ? `<p class="hint-out">“${esc(G.lastHint)}”</p>` : ''}</div>`;
  } else if (G.nbTab === 'evidence') {
    if (!G.clueOrder.length) h += `<p class="empty">Nothing yet. Inspect anything that sparkles and talk to everyone in the building.</p>`;
    const kinds = { phys: ['phys', 'Physical'], rec: ['rec', 'Record'], test: ['test', 'Testimony'] };
    h += `<div class="nb-grid">` + G.clueOrder.slice().reverse().map(id => {
      const c = G.clues.get(id); const k = kinds[c.kind] || kinds.phys;
      const where = c.who ? SUSPECTS[c.who].short : (c.room ? (ROOMS[c.room] || ROOMS.hall).name : '');
      return `<div class="card"><span><span class="pill ${k[0]}">${k[1]}</span></span><h4>${esc(c.title)}</h4><p class="file">${esc(c.text)}</p><span class="meta">${esc(where)} · ${fmtTime(c.at)}</span></div>`;
    }).join('') + `</div>`;
  } else if (G.nbTab === 'suspects') {
    h += `<p class="empty" style="margin:0 0 12px">Tap “Cross off” to rule someone out. It also greys them out when you make the call.</p><div class="nb-grid">`;
    h += C.suspects.map(id => {
      const d = SUSPECTS[id], met = G.met.has(id), struck = G.strikes.killer.has(id);
      let obs = `<dl class="obs"><dt>Role</dt><dd>${esc(d.role)}</dd>`;
      if (G.mode === 'random') {
        obs += `<dt>Badge</dt><dd>${esc(d.tier)}</dd>`;
        obs += `<dt>Shoe</dt><dd>${met ? 'Size ' + d.shoe : '<span class="empty">Not met yet</span>'}</dd>`;
        obs += `<dt>Hand</dt><dd>${met ? (d.hand === 'L' ? 'Left' : 'Right') : '<span class="empty">Not met yet</span>'}</dd>`;
      }
      obs += `</dl>`;
      const al = G.alibis[id] ? `<p class="file">“${esc(G.alibis[id])}”</p>` : `<p class="empty">${met ? 'Alibi not asked yet.' : 'Not interviewed yet.'}</p>`;
      const loc = G.susById[id] ? (ROOMS[roomAt(G.susById[id].x, G.susById[id].z)] || ROOMS.hall).name : '';
      return `<div class="card sus-card ${struck ? 'struck' : ''}"><div class="sus-top">${portraitHTML(d, true)}<div><h4>${esc(d.name)}</h4><span class="meta">Waiting in: ${esc(loc)}</span></div></div>${obs}${al}<button class="strike" data-strike="${id}">${struck ? 'Restore' : 'Cross off'}</button></div>`;
    }).join('') + `</div>`;
  } else if (G.nbTab === 'map') {
    h += `<canvas id="bigmap" width="1520" height="600"></canvas><p class="empty" style="margin-top:8px">Gold arrow: you. Dots: people you've met. North wing on top, south wing below, practice field to the east.</p>`;
  } else if (G.nbTab === 'call') {
    const auto = C.autoStrike ? C.autoStrike(has) : {};
    h += `<div class="downs">` + [1, 2, 3, 4].map(n => `<span class="down ${n <= G.wrong ? 'used' : ''} ${n === G.wrong + 1 ? 'now' : ''}">${ordinal(n)}</span>`).join('') + `<span class="call-msg">${G.wrong === 3 ? 'Fourth down. Miss and the killer walks.' : 'Each wrong call burns a down.'}</span></div>`;
    C.accuse.forEach(grp => {
      const strikeSet = new Set([...(G.strikes[grp.key] || []), ...((auto[grp.key]) || [])]);
      h += `<div class="call-group"><h3>${esc(grp.label)}</h3><div class="choices">` + grp.options.map(o => `<button class="choice ${strikeSet.has(o.id) ? 'struck' : ''}" data-grp="${grp.key}" data-opt="${o.id}" aria-pressed="${G.pick[grp.key] === o.id}">${esc(o.label)}</button>`).join('') + `</div></div>`;
    });
    h += `<div class="call-actions"><button class="btn-primary" id="btnCall">${G.callArmed ? 'Snap it. This uses a down.' : 'Make the call'}</button><span class="call-msg ${G.callBad ? 'bad' : ''}" id="callMsg">${esc(G.callMsg)}</span></div>`;
  }
  body.innerHTML = h;
  if (G.nbTab === 'map') drawMap($('#bigmap'), true);
  const bt = $('#btnTimeout'); if (bt) bt.addEventListener('click', callTimeout);
  $$('.strike', body).forEach(b => b.addEventListener('click', () => { const id = b.dataset.strike; G.strikes.killer.has(id) ? G.strikes.killer.delete(id) : G.strikes.killer.add(id); Sound.click(); renderNotebook(); }));
  $$('.choice', body).forEach(b => b.addEventListener('click', () => { G.pick[b.dataset.grp] = b.dataset.opt; G.callArmed = false; G.callMsg = ''; Sound.click(); renderNotebook(); }));
  const bc = $('#btnCall'); if (bc) bc.addEventListener('click', makeCall);
}
function callTimeout() {
  if (!G.timeouts) return;
  const C = G.C;
  const h = C.hints.find(x => x.done ? !x.done(has, G) : (x.need === null ? false : (Array.isArray(x.need) ? (x.any ? !x.need.some(has) : !x.need.every(has)) : !has(x.need)))) || C.hints[C.hints.length - 1];
  G.timeouts--; G.hintsUsed++;
  G.lastHint = typeof h.text === 'function' ? h.text() : h.text;
  Sound.whistle();
  renderNotebook();
}
function makeCall() {
  const C = G.C;
  const missing = C.accuse.filter(g => !G.pick[g.key]);
  if (missing.length) { G.callMsg = 'Pick one answer in every group first.'; G.callBad = true; renderNotebook(); return; }
  if (!G.callArmed) { G.callArmed = true; G.callMsg = 'Sure? Tap again to snap the ball.'; G.callBad = false; renderNotebook(); return; }
  G.callArmed = false;
  let right = 0; C.accuse.forEach(g => { if (G.pick[g.key] === C.answer[g.key]) right++; });
  Sound.whistle();
  if (right === C.accuse.length) { finish(true); return; }
  G.wrong++;
  updateHUD();
  if (G.wrong >= 4) { finish(false); return; }
  Sound.fail();
  G.callMsg = `${right} of ${C.accuse.length} right. The Commissioner isn't buying it. It's ${ordinal(G.wrong + 1)} down.`;
  G.callBad = true;
  toast('dark', 'Flag', `Incomplete. ${right} of ${C.accuse.length} right. ${ordinal(G.wrong + 1)} down.`);
  renderNotebook();
}

// ---- map drawing ----
function drawMap(cv, full) {
  if (!cv) return;
  const ctx = cv.getContext('2d'), W = cv.width, Hh = cv.height;
  ctx.clearRect(0, 0, W, Hh);
  ctx.save();
  let scale, cx, cz;
  if (full) { scale = Math.min(W / 80, Hh / 31); cx = 8; cz = 0; }
  else { scale = W / 34; cx = P.x; cz = P.z; ctx.beginPath(); ctx.arc(W / 2, Hh / 2, W / 2 - 2, 0, TAU); ctx.clip(); }
  ctx.translate(W / 2, Hh / 2); ctx.scale(scale, scale); ctx.translate(-cx, -cz);
  const cur = roomAt(P.x, P.z);
  const areas = ['hall', 'field', ...ROOM_IDS];
  areas.forEach(id => {
    const r = ROOMS[id];
    ctx.fillStyle = id === cur ? 'rgba(230,180,80,.32)' : (id === 'field' ? 'rgba(60,130,80,.35)' : 'rgba(150,165,180,.16)');
    ctx.fillRect(r.x1, r.z1, r.x2 - r.x1, r.z2 - r.z1);
    ctx.strokeStyle = 'rgba(240,233,216,.55)'; ctx.lineWidth = 0.18; ctx.strokeRect(r.x1, r.z1, r.x2 - r.x1, r.z2 - r.z1);
  });
  ctx.fillStyle = '#e6b450';
  ROOM_IDS.forEach(id => { const d = ROOMS[id].door; const w = id === 'lobby' ? 4 : (id === 'coach' || id === 'gm' ? 1.8 : 2.2); ctx.fillRect(d[0] - w / 2, d[1] - 0.25, w, 0.5); });
  if (full || scale > 4) {
    ctx.fillStyle = 'rgba(240,233,216,.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = full ? 1.05 : 1.25;
    ctx.font = `800 ${fs}px ${FONT_BODY}`;
    const short = { coach: "COACH'S\nOFFICE", gm: 'GM\nOFFICE', equipment: 'EQUIPMENT\nROOM', training: 'TRAINING\nROOM' };
    areas.forEach(id => {
      const r = ROOMS[id]; const lines = (short[id] || r.name.toUpperCase()).split('\n');
      const y0 = id === 'hall' ? 0 : (id === 'field' ? -6 : (r.wing === 'north' ? r.z1 + 2 : r.z2 - 2.2));
      lines.forEach((l, i) => ctx.fillText(l, (r.x1 + r.x2) / 2, y0 + (i - (lines.length - 1) / 2) * fs * 1.15));
    });
    if (full) { ctx.fillStyle = 'rgba(230,180,80,.85)'; ctx.font = `800 1.0px ${FONT_BODY}`; ctx.fillText('NORTH WING', -6, -14.9); ctx.fillText('SOUTH WING', -6, 14.9); }
  }
  // body
  if (G.mode === 'random') { ctx.strokeStyle = '#d03c2f'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(31.2, -0.8); ctx.lineTo(32.8, 0.8); ctx.moveTo(32.8, -0.8); ctx.lineTo(31.2, 0.8); ctx.stroke(); }
  else if (G.mode === 'story') { ctx.strokeStyle = '#d03c2f'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-17.4, 10.7); ctx.lineTo(-15.8, 12.3); ctx.moveTo(-15.8, 10.7); ctx.lineTo(-17.4, 12.3); ctx.stroke(); }
  // suspects
  G.suspects.forEach(s => {
    if (!G.met.has(s.id) && !full) return;
    ctx.fillStyle = G.met.has(s.id) ? s.def.color : 'rgba(240,233,216,.4)';
    ctx.beginPath(); ctx.arc(s.x, s.z, full ? 0.55 : 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f0e9d8'; ctx.lineWidth = 0.12; ctx.stroke();
    if (full && G.met.has(s.id)) { ctx.fillStyle = '#f0e9d8'; ctx.font = `700 0.85px ${FONT_BODY}`; ctx.fillText(s.def.short, s.x, s.z + 1.25); }
  });
  // player
  ctx.save(); ctx.translate(P.x, P.z); ctx.rotate(-P.yaw + Math.PI);
  ctx.fillStyle = '#e6b450'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 0.15;
  ctx.beginPath(); ctx.moveTo(0, 1.2); ctx.lineTo(0.75, -0.7); ctx.lineTo(0, -0.25); ctx.lineTo(-0.75, -0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  if (!full) { ctx.strokeStyle = 'rgba(240,233,216,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, Hh / 2, W / 2 - 2, 0, TAU); ctx.stroke(); }
}

// ---- pause ----
function openPause() {
  if (G.state !== 'play' || G.overlay) return;
  openOverlay('pause'); G.pauseAt = performance.now();
  $('#pauseMenu').hidden = false;
  $('#btnPauseSound').textContent = 'Sound: ' + (Sound.muted ? 'off' : 'on');
  $('#sens2').value = G.sens;
  $('#btnResume').focus({ preventScroll: true });
}

// ===== Case setup ============================================================
function setupCase(mode, seed) {
  resetCaseLayer();
  G.mode = mode; G.suspects = []; G.susById = {};
  G.clues = new Map(); G.clueOrder = []; G.visited = new Set(); G.asked = new Set(); G.met = new Set(); G.alibis = {};
  G.strikes = { killer: new Set(), weapon: new Set(), room: new Set(), method: new Set(), motive: new Set() };
  G.pick = {}; G.wrong = 0; G.timeouts = 3; G.hintsUsed = 0; G.lastHint = ''; G.elapsed = 0; G.footballs = 0;
  G.callArmed = false; G.callMsg = ''; G.callBad = false; G.nbTab = 'case'; G.roomNow = null;
  const C = mode === 'story' ? buildStoryCase() : buildRandomCase(seed);
  G.C = C;
  for (const hs of World.hotspots.values()) { hs.sparkle.visible = true; }
  (C.extraHotspots || []).forEach(e => { const hs = hotspot(e.id, e.room, e.x, e.y, e.z, e.label, e.text, { extra: true, range: e.range, parent: World.caseLayer }); hs.clue = e.clue; });
  C.suspects.forEach(id => { const s = new Suspect(SUSPECTS[id], C.placements[id]); G.suspects.push(s); G.susById[id] = s; });
  if (mode === 'story') {
    placeSlumpedVictim(GIL_LOOK, -16.6, 11.5, 0);
    const mug = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), M.red, 0, 0.05, 0, mug);
    const hd = mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), M.red, 0.05, 0.05, 0, mug); hd.rotation.y = 0;
    mesh(new THREE.CircleGeometry(0.04, 14), new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.2 }), 0, 0.08, 0, mug).rotation.x = -Math.PI / 2;
    mug.position.set(-16.05, 0.78, 12.2); World.caseLayer.add(mug);
    const bag = new THREE.Group(); mesh(new THREE.BoxGeometry(0.45, 0.3, 0.16), M.leather, 0, 0.15, 0, bag); mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16, Math.PI), M.black, 0, 0.3, 0, bag);
    bag.position.set(-17.45, 0, 11.0); bag.rotation.y = 0.4; World.caseLayer.add(bag);
  } else {
    placeSheetedVictim(32, 0);
    decal(TEX.drag, 0xffffff, 0.6, 12.2, 24.9, 0, Math.PI / 2, 0.9);
    const tr = C.truth;
    setStruggle(tr.room, SUSPECTS[tr.killer].shoe >= 12);
    const wh = World.weaponHome[tr.weapon]; wh.mesh.visible = false;
    const sp = World.hides[tr.stash];
    const wm = makeWeaponMesh(tr.weapon); wm.position.copy(sp.pos); wm.rotation.set(0.5, 0.8, 0.3); World.caseLayer.add(wm);
  }
  P.x = C.spawn.x; P.z = C.spawn.z; P.yaw = C.spawn.yaw; P.pitch = -0.05; P.dash = 0; P.blockCd = 0;
  updateHUD(); updateAlerts();
}

function showBriefing(mode) {
  Sound.init();
  const seed = mode === 'random' ? 1000 + Math.floor(Math.random() * 89000) : 0;
  setupCase(mode, seed);
  G.state = 'brief';
  $('#titleScreen').hidden = true; $('#resultScreen').hidden = true;
  $('#briefNo').textContent = G.C.fileNo; $('#briefTitle').textContent = G.C.title;
  $('#briefBody').innerHTML = G.C.briefing;
  $('#briefControls').innerHTML = IS_TOUCH
    ? '<span>Left thumb: move</span><span>Right thumb: look</span><span>Gold button: inspect / talk</span><span>Playbook: notes &amp; accusation</span>'
    : '<span><kbd>WASD</kbd> move</span><span><kbd>Mouse</kbd> look</span><span><kbd>E</kbd> inspect / talk</span><span><kbd>F</kbd> block</span><span><kbd>Tab</kbd> Playbook</span>';
  $('#briefScreen').hidden = false;
  $('#btnBegin').focus({ preventScroll: true });
}
function startPlay() {
  G.state = 'play';
  $('#briefScreen').hidden = true; $('#hud').hidden = false;
  $('#touchUI').hidden = !IS_TOUCH;
  $('#app').classList.toggle('touch', IS_TOUCH);
  G.elapsed = 0; G.nextLightning = 6;
  updateHUD();
  requestLock(); updateResumeHint();
  toast('dark', 'Kickoff', G.mode === 'story' ? 'Gil is in the Film Room, right across the hall.' : 'The body is on the 50. Head east down the main hall.', 4200);
}
function quitToTitle() {
  closeOverlays(false); exitLock();
  G.state = 'title';
  $('#hud').hidden = true; $('#resultScreen').hidden = true; $('#briefScreen').hidden = true; $('#titleScreen').hidden = false;
  refreshTitle();
}

// ===== Finish ================================================================
function finish(win) {
  closeOverlays(false); exitLock();
  G.state = 'result';
  $('#hud').hidden = true;
  const mins = G.elapsed / 60, par = G.mode === 'story' ? 16 : 11;
  let rating = 158.3 - G.wrong * 30 - G.hintsUsed * 6 - Math.max(0, Math.min(45, (mins - par) * 2.5));
  rating = win ? clamp(rating, 39.6, 158.3) : 0;
  const tiers = [[150, 'Perfect game', 'Flawless. Somewhere, a tight end is doing a wrestling pose in your honor.'], [125, 'Pro Bowl', 'Pro Bowl work. Block, catch, solve, repeat.'], [100, 'Starter', 'Solid drive. You moved the chains.'], [70, 'Rotation', 'You got there. It wasn\'t pretty, but neither is a goal-line plunge.'], [0, 'Practice squad', 'A win\'s a win. Film session Monday, though.']];
  const tier = tiers.find(t => rating >= t[0]);
  $('#resKicker').textContent = win ? `Case closed · ${G.C.title}` : `The killer walks · ${G.C.title}`;
  const tEl = $('#resTitle'); tEl.textContent = win ? 'Touchdown!' : 'Turnover on downs'; tEl.classList.toggle('lose', !win);
  $('#resRating').textContent = rating.toFixed(1);
  $('#resTier').textContent = win ? tier[1] : 'Benched';
  const stats = [
    [fmtTime(G.elapsed), 'Game clock'],
    [G.C.totalClues ? `${G.clues.size}/${G.C.totalClues}` : String(G.clues.size), 'Evidence'],
    [String(G.wrong + (win ? 1 : 0)), 'Downs used'],
    [String(G.hintsUsed), 'Timeouts'],
    [`${G.footballs}/5`, 'Golden footballs']
  ];
  $('#resStats').innerHTML = stats.map(s => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('');
  $('#resStory').innerHTML = (win ? `<p>${esc(tier[2])}</p>` : '<p>Fourth down, and the call was wrong. Here\'s what really happened.</p>') + G.C.solution();
  $('#btnAgainStory').textContent = G.mode === 'story' ? 'Replay the story case' : 'Play the story case';
  $('#resultScreen').hidden = false; $('#resultScreen').scrollTop = 0;
  if (win) {
    Sound.cheer();
    const key = G.mode === 'story' ? 'bestStory' : 'bestRandom';
    if (rating > Number(store.get(key, 0))) store.set(key, Number(rating.toFixed(1)));
    store.set('solved_' + G.mode, Number(store.get('solved_' + G.mode, 0)) + 1);
    if (!REDUCED_MOTION) celebrate();
  } else Sound.fail();
}
function celebrate() {
  const app = $('#app');
  const dump = document.createElement('div'); dump.className = 'dump'; app.appendChild(dump); setTimeout(() => dump.remove(), 1700);
  const colors = ['#e6b450', '#d03c2f', '#f0e9d8', '#52a467'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % 4];
    c.style.animationDuration = (2.2 + Math.random() * 2.2) + 's'; c.style.animationDelay = (Math.random() * 0.8) + 's';
    app.appendChild(c); setTimeout(() => c.remove(), 5500);
  }
}

// ===== Blocking ==============================================================
function block() {
  if (P.blockCd > 0 || G.overlay || G.state !== 'play') return;
  P.blockCd = 0.85; P.dash = 0.2; P.dx = -Math.sin(P.yaw); P.dz = -Math.cos(P.yaw); P.kick = 1;
  Sound.block(); hutText(pick(Math.random, ['HUT!', 'BLOCK!', 'PANCAKE!', 'HUT!']));
  setTimeout(() => {
    const fx = P.dx, fz = P.dz;
    const inFront = (x, z, r) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); return d < r && (dx * fx + dz * fz) / (d || 1) > 0.35; };
    let hit = false;
    World.dummies.forEach(dm => { if (inFront(dm.x, dm.z, 1.9)) { dm.vx += fz * 7; dm.vz += -fx * 7; hit = true; } });
    const sl = World.sled; if (inFront(sl.x, sl.z, 2.4)) { sl.vx += fx * 3.2; sl.vz += fz * 3.2; hit = true; }
    G.suspects.forEach(s => { if (inFront(s.x, s.z, 1.7)) { s.stagger = 0.6; hit = true; toast('dark', s.def.short, s.def.block, 2600); } });
    if (hit) { Sound.thud(); }
  }, 110);
}

// ===== Input =================================================================
function look(dx, dy, k) {
  const s = (k || 0.0022) * G.sens;
  P.yaw -= dx * s; P.pitch = clamp(P.pitch - dy * s, -1.3, 1.25);
}
function interact() {
  if (G.state !== 'play' || G.overlay) return;
  const t = G.target; if (!t) return;
  Sound.init();
  if (t.kind === 'hs') inspect(t); else talk(t);
}
function setupInput() {
  const canvas = renderer.domElement;
  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (G.state === 'title') { if (k === 'Escape' && !$('#howPanel').hidden) $('#howPanel').hidden = true; return; }
    if (G.state !== 'play') return;
    if (G.overlay) {
      if (k === 'Escape') { e.preventDefault(); if (G.overlay === 'pause' && performance.now() - (G.pauseAt || 0) < 450) return; closeOverlays(); return; }
      if (G.overlay === 'inspect' && (k === 'KeyE' || k === 'Space' || k === 'Enter')) { e.preventDefault(); if (!finishTyping()) closeOverlays(); return; }
      if (G.overlay === 'dialog') {
        if (/^Digit[1-9]$/.test(k)) { const btn = $$('#dlgTopics .topic')[Number(k.slice(5)) - 1]; if (btn) btn.click(); return; }
        if (k === 'Space' || k === 'Enter') { if (finishTyping()) e.preventDefault(); return; }
        if (k === 'KeyE') { e.preventDefault(); if (!finishTyping()) closeOverlays(); return; }
      }
      if (G.overlay === 'notebook' && (k === 'Tab' || k === 'KeyJ')) { e.preventDefault(); closeOverlays(); return; }
      if (G.overlay === 'notebook' && k === 'KeyM') { G.nbTab = 'map'; renderNotebook(); return; }
      return;
    }
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    keys.add(k);
    if (e.repeat) return;
    if (k === 'KeyE' || k === 'Space' || k === 'Enter') interact();
    else if (k === 'KeyF') block();
    else if (k === 'Tab' || k === 'KeyJ') openNotebook();
    else if (k === 'KeyM') openNotebook('map');
    else if (k === 'Escape') openPause();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('click', () => { Sound.init(); if (G.state === 'play' && !G.overlay && !locked) requestLock(); });
  canvas.addEventListener('mousedown', () => { dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('mousemove', (e) => {
    if (G.state !== 'play' || G.overlay) return;
    if (locked) look(e.movementX, e.movementY);
    else if (dragging && !IS_TOUCH) look(e.movementX, e.movementY, 0.004);
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked) lockFailed = false;
    if (!locked && G.state === 'play' && !G.overlay) openPause();
    updateResumeHint();
  });
  document.addEventListener('pointerlockerror', () => { lockFailed = true; updateResumeHint(); });

  // touch
  const layer = $('#touchLayer');
  layer.addEventListener('pointerdown', (e) => {
    if (G.state !== 'play' || G.overlay) return;
    Sound.init();
    const w = layer.clientWidth;
    if (e.clientX < w * 0.45 && joy.id === null) {
      joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
      const j = $('#joy'); const r = $('#app').getBoundingClientRect(); j.style.left = (e.clientX - r.left) + 'px'; j.style.top = (e.clientY - r.top) + 'px'; j.classList.add('on');
      $('#joyKnob').style.transform = 'translate(0,0)'; $('#joyGhost').hidden = true;
    } else if (lookT.id === null) { lookT.id = e.pointerId; lookT.lx = e.clientX; lookT.ly = e.clientY; }
    try { layer.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  layer.addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) {
      let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx *= max / d; dy *= max / d; }
      joy.x = dx / max; joy.y = dy / max; $('#joyKnob').style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === lookT.id) {
      look(e.clientX - lookT.lx, e.clientY - lookT.ly, 0.0055); lookT.lx = e.clientX; lookT.ly = e.clientY;
    }
  });
  const endTouch = (e) => {
    if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('#joy').classList.remove('on'); }
    if (e.pointerId === lookT.id) lookT.id = null;
  };
  layer.addEventListener('pointerup', endTouch); layer.addEventListener('pointercancel', endTouch);
  $('#tAct').addEventListener('click', () => interact());
  $('#tBlock').addEventListener('click', () => block());
}

// ===== UI wiring =============================================================
function refreshTitle() {
  const bs = store.get('bestStory', 0), br = store.get('bestRandom', 0);
  $('#bestStory').textContent = bs ? ` · Best rating ${Number(bs).toFixed(1)}` : '';
  $('#bestRandom').textContent = br ? ` · Best rating ${Number(br).toFixed(1)}` : '';
  $('#btnSound').textContent = 'Sound: ' + (Sound.muted ? 'off' : 'on');
  $('#sens').value = G.sens;
  const allFb = store.get('allFootballs', false);
  const bc = $('#ballCount'); bc.hidden = !allFb; bc.textContent = 'Block Party trophy unlocked';
  const tips = [
    '<b>Tip:</b> Watch their hands. Lefties leave lefty prints.',
    '<b>Tip:</b> Press F to block. It solves nothing. It feels incredible.',
    '<b>Tip:</b> Five golden footballs are hidden around the building.',
    '<b>Tip:</b> A gold “!” over someone\'s head means your evidence gave you a new question.',
    '<b>Tip:</b> Timeouts give hints. Use them wisely; there are only three per half.',
    '<b>Tip:</b> The tight end is always the first read. On the field and in this case.'
  ];
  $('#titleTip').innerHTML = pick(Math.random, tips);
}
function setupUI() {
  $('#btnStory').addEventListener('click', () => showBriefing('story'));
  $('#btnRandom').addEventListener('click', () => showBriefing('random'));
  $('#btnHow').addEventListener('click', () => { $('#howPanel').hidden = false; $('#howClose').focus(); });
  $('#howClose').addEventListener('click', () => { $('#howPanel').hidden = true; });
  $('#howPanel').addEventListener('click', (e) => { if (e.target.id === 'howPanel') $('#howPanel').hidden = true; });
  const setSound = (btn) => { Sound.init(); Sound.setMuted(!Sound.muted); btn.textContent = 'Sound: ' + (Sound.muted ? 'off' : 'on'); };
  $('#btnSound').addEventListener('click', (e) => setSound(e.currentTarget));
  $('#btnPauseSound').addEventListener('click', (e) => setSound(e.currentTarget));
  const setSens = (v) => { G.sens = Number(v); store.set('sens', G.sens); };
  $('#sens').addEventListener('input', (e) => setSens(e.target.value));
  $('#sens2').addEventListener('input', (e) => setSens(e.target.value));
  $('#btnBegin').addEventListener('click', startPlay);
  $('#btnBriefBack').addEventListener('click', () => { resetCaseLayer(); G.state = 'title'; $('#briefScreen').hidden = true; $('#titleScreen').hidden = false; refreshTitle(); });
  $('#inspClose').addEventListener('click', () => { if (!finishTyping()) closeOverlays(); });
  $('#inspText').addEventListener('click', () => finishTyping());
  $('#dlgText').addEventListener('click', () => finishTyping());
  $('#dlgClose').addEventListener('click', () => closeOverlays());
  $('#nbClose').addEventListener('click', () => closeOverlays());
  $$('#nbTabs button').forEach(b => b.addEventListener('click', () => { G.nbTab = b.dataset.tab; G.callArmed = false; Sound.click(); renderNotebook(); }));
  $('#btnNotebook').addEventListener('click', () => { if (G.state === 'play' && !G.overlay) openNotebook(); });
  $('#btnMenu').addEventListener('click', () => { if (G.state === 'play' && !G.overlay) openPause(); });
  $('#mapWrap').addEventListener('click', () => { if (G.state === 'play' && !G.overlay) openNotebook('map'); });
  $('#btnResume').addEventListener('click', () => closeOverlays());
  $('#btnPauseNotebook').addEventListener('click', () => { closeOverlays(false); openNotebook(); });
  $('#btnQuit').addEventListener('click', quitToTitle);
  $('#btnAgainRandom').addEventListener('click', () => showBriefing('random'));
  $('#btnAgainStory').addEventListener('click', () => showBriefing('story'));
  $('#btnToTitle').addEventListener('click', quitToTitle);
  $('#pauseControls').innerHTML = IS_TOUCH
    ? 'Left thumb moves. Right thumb looks. Gold button inspects and talks. Block button blocks.'
    : '<kbd>WASD</kbd> move · <kbd>Mouse</kbd> look · <kbd>E</kbd> inspect / talk · <kbd>F</kbd> block · <kbd>Shift</kbd> sprint · <kbd>Tab</kbd> Playbook · <kbd>M</kbd> map';
}
