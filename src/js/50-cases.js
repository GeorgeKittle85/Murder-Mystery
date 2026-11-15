// ===== Random case generator: Overtime ======================================
const ROOM_ACT = {
  weight: 'getting a late lift in', locker: 'icing down and stretching', training: 'soaking in the cold tub',
  equipment: 'sorting Sunday\'s gear', cafeteria: 'raiding the late-night snack table', film: 'watching cut-ups of Sunday\'s opponent',
  coach: 'going over the game plan', gm: 'going over contracts', lobby: 'waiting out the storm by the front doors'
};
const ROOM_ERRAND = {
  weight: 'grab my lifting belt', locker: 'grab my phone charger', training: 'get an ice bag', equipment: 'find a dry hoodie',
  cafeteria: 'grab a protein bar', film: 'grab my tablet', coach: 'drop off some notes', gm: 'drop off some paperwork', lobby: 'check if the storm had let up'
};
const LOG_NAME = { haskins: 'H. HASKINS', pruitt: 'D. PRUITT', jet: 'M. JENNINGS', tony: 'T. BIANCHI', osei: 'L. OSEI', lou: 'L. OKAFOR', pepper: 'P. VANCE', rhett: 'R. CALLOWAY' };
const HOME_SPOT = {
  haskins: { x: -1.8, z: 8.4, yaw: Math.PI * 0.9 }, pruitt: { x: 4.4, z: 9.2, yaw: Math.PI }, jet: { x: -10.6, z: -6.3, yaw: 2.8 },
  tony: { x: 10.2, z: -6.2, yaw: 0.2 }, osei: { x: 1.1, z: -8.5, yaw: -1.4 }, lou: { x: -22.6, z: -5.6, yaw: 2.6 },
  pepper: { x: -25.6, z: 12.25, yaw: Math.PI }, rhett: { x: 13.0, z: 6.2, yaw: Math.PI * 0.8 }
};
const WEAPON_HS_LABEL = { dumbbell: 'Dumbbell rack', trophy: 'Trophy case', whistle: 'Whistle hook', cable: 'Projector cart', shake: 'Shake station', syringe: 'Medicine cabinet' };
function roomRef(r) { return r === 'coach' ? "Coach's Office" : 'the ' + ROOMS[r].name; }
function RoomRef(r) { const s = roomRef(r); return s[0].toUpperCase() + s.slice(1); }

function buildRandomCase(seed) {
  const rng = mulberry32(seed);
  const killer = pick(rng, SUSPECT_IDS), weapon = pick(rng, WEAPON_IDS), room = pick(rng, ROOM_IDS);
  const K = SUSPECTS[killer], W = WEAPONS[weapon], cause = CAUSES[W.cat];
  const big = K.shoe >= 12, handWord = K.hand === 'L' ? 'left' : 'right';
  const stash = pick(rng, Object.keys(World.hides).filter(h => World.hides[h].room !== room));
  const stashSpot = World.hides[stash];

  const innocents = shuffle(rng, SUSPECT_IDS.filter(s => s !== killer));
  const otherRooms = shuffle(rng, ROOM_IDS.filter(r => r !== room));
  const pairs = [0, 1, 2].map(i => ({ a: innocents[i * 2], b: innocents[i * 2 + 1], room: otherRooms[i] }));
  const solo = { s: innocents[6], room: otherRooms[3] };
  const variant = rng() < 0.5 ? 'A' : 'B';
  let lie;
  if (variant === 'A') { const p = pick(rng, pairs); lie = { room: p.room, withId: rng() < 0.5 ? p.a : p.b, pair: p }; }
  else lie = { room: otherRooms[4] };

  const t = (m) => `11:${String(m).padStart(2, '0')}`;
  const alibi = {}, sight = {}, sightClue = {};
  pairs.forEach(p => {
    const tm = 10 + Math.floor(rng() * 8);
    for (const [me, other] of [[p.a, p.b], [p.b, p.a]]) {
      alibi[me] = `From about ${t(tm)} until the lights flickered at midnight, I was in ${roomRef(p.room)} with ${SUSPECTS[other].short}. We were ${ROOM_ACT[p.room]}. Just the two of us, and neither of us was out of the other's sight for more than a minute.`;
    }
    p.t = tm;
  });
  alibi[solo.s] = `I was in ${roomRef(solo.room)}, ${ROOM_ACT[solo.room]}. Alone, from about 11:20 on. Check the door log if you don't believe me.`;
  if (variant === 'A') alibi[killer] = `I was in ${roomRef(lie.room)} with ${SUSPECTS[lie.withId].short}, ${ROOM_ACT[lie.room]}. All night. Ask ${SUSPECTS[lie.withId].short}.`;
  else alibi[killer] = `I was in ${roomRef(lie.room)}, ${ROOM_ACT[lie.room]}. By myself, from about 11:15 until the lights flickered.`;

  const C = {
    id: 'random', seed, title: 'Overtime', fileNo: 'CASE FILE #' + seed,
    victimName: 'Sterling Calloway',
    suspects: SUSPECT_IDS.slice(),
    spawn: { x: 14.5, z: 0, yaw: -Math.PI / 2 },
    totalClues: null,
    placements: HOME_SPOT,
    truth: { killer, weapon, room, stash, variant }
  };
  C.briefing = [
    '<p>Sunday, 12:04 AM. Championship Eve just became Championship Day.</p>',
    '<p>Team owner <b>Sterling Calloway</b> was found under a towel on the 50-yard line of the indoor practice field while the storm hammered the roof. <span class="em">He didn\'t die there. Somebody moved him.</span></p>',
    '<p>The building is in storm lockdown until 6 AM. Eight people are inside with you, and every one of them had a reason.</p>',
    '<p class="cf-goal">Find <b>WHO</b> did it, <b>WITH WHAT</b>, and <b>WHERE</b>. Every case is reshuffled. You have four downs.</p>'
  ].join('');

  // witnesses
  const pool = shuffle(rng, innocents);
  const take = (exclude = []) => { const i = pool.findIndex(s => !exclude.includes(s)); return i < 0 ? null : pool.splice(i, 1)[0]; };
  C.clues = {
    c_autopsy: { title: 'Autopsy on the 50', kind: 'phys', room: 'field', text: `${cause.label}. ${cause.text} Time of death: around 11:40 PM. He died somewhere else and was dragged out to the field.` },
    c_scene: { title: `The real scene: ${ROOMS[room].name}`, kind: 'phys', room, text: `Overturned chair and spilled ${World.struggle[room].spill}. A clear shoe print: ${big ? 'size 12 or bigger' : 'size 11 or smaller'}.` },
    c_stash: { title: `${W.name}, hidden`, kind: 'phys', room: stashSpot.room, text: `Stashed in the ${stashSpot.label.toLowerCase()} in ${roomRef(stashSpot.room)}. One clear print: a ${handWord.toUpperCase()} hand. The killer is ${handWord}-handed.` },
    c_log: { title: 'Door-badge log', kind: 'rec', room: 'lobby', text: '' }
  };
  WEAPON_IDS.forEach(w => {
    const missing = w === weapon;
    C.clues['w_' + w] = { title: `${WEAPONS[w].name}: ${missing ? 'MISSING' : 'accounted for'}`, kind: 'phys', room: WEAPONS[w].home, text: missing ? WEAPONS[w].missing : WEAPONS[w].present };
  });
  if (variant === 'B') {
    const w1 = take();
    sight[w1] = `Around 11:40 I ducked into ${roomRef(lie.room)} for a second to ${ROOM_ERRAND[lie.room]}. Lights off. Nobody in there. Not a soul.`;
    sightClue[w1] = 't_empty';
    C.clues.t_empty = { title: `${ROOMS[lie.room].name} was empty at 11:40`, kind: 'test', who: w1, text: `${SUSPECTS[w1].short}: ${roomRef(lie.room)} was dark and empty at 11:40.` };
  } else {
    const w4 = take([lie.pair.a, lie.pair.b]);
    if (w4) {
      sight[w4] = `I walked past ${roomRef(lie.room)} around 11:35. ${SUSPECTS[lie.pair.a].short} and ${SUSPECTS[lie.pair.b].short} were in there. Just the two of them.`;
      sightClue[w4] = 't_pair';
      C.clues.t_pair = { title: `Only two in ${ROOMS[lie.room].name}`, kind: 'test', who: w4, text: `${SUSPECTS[w4].short}: at 11:35 only ${SUSPECTS[lie.pair.a].short} and ${SUSPECTS[lie.pair.b].short} were in ${roomRef(lie.room)}.` };
    }
  }
  const w2 = take();
  if (w2) {
    sight[w2] = `Right around 11:40 I heard a crash. Something heavy hitting the floor, over in the ${ROOMS[room].wing} wing.`;
    sightClue[w2] = 't_crash';
    C.clues.t_crash = { title: `A crash in the ${ROOMS[room].wing} wing`, kind: 'test', who: w2, text: `${SUSPECTS[w2].short}: heard something heavy hit the floor in the ${ROOMS[room].wing} wing around 11:40.` };
  }
  const w3 = take();
  if (w3) {
    sight[w3] = 'Just before midnight I saw somebody hauling something heavy down the main hall toward the field. Hood up. Couldn\'t tell who. The emergency lights were barely on.';
    sightClue[w3] = 't_drag';
    C.clues.t_drag = { title: 'Something dragged to the field', kind: 'test', who: w3, text: `${SUSPECTS[w3].short}: just before midnight, a hooded figure hauled something heavy down the main hall toward the field.` };
  }
  SUSPECT_IDS.forEach(s => { if (!sight[s]) sight[s] = SUSPECTS[s].quiet; });

  // door log
  const entries = [];
  pairs.forEach(p => { entries.push({ m: p.t, room: p.room, who: p.a }); entries.push({ m: p.t + 1 + Math.floor(rng() * 3), room: p.room, who: p.b }); });
  entries.push({ m: 19 + Math.floor(rng() * 6), room: solo.room, who: solo.s });
  entries.push({ m: 33 + Math.floor(rng() * 4), room, who: null, tier: K.tier, key: true });
  entries.push({ m: 54 + Math.floor(rng() * 3), room: 'field', who: null, tier: K.tier });
  const decoy = pick(rng, entries.filter(e => e.who && e.who !== solo.s));
  decoy.tier = SUSPECTS[decoy.who].tier; decoy.who = null;
  entries.sort((a, b) => a.m - b.m);
  const logHtml = '<p>Tonight\'s badge swipes. A power surge scrambled some names, but the badge class survived.</p><div class="log">' +
    entries.map(e => `<span>23:${String(e.m).padStart(2, '0')}</span><span>${(e.room === 'field' ? 'PRACTICE FIELD' : ROOMS[e.room].name).toUpperCase()}</span>` +
      (e.who ? `<span>${LOG_NAME[e.who]}</span>` : `<span class="bad">▓▓▓▓▓ · ${e.tier}</span>`)).join('') +
    '<span class="sys">Badge classes: PLAYER, STAFF, FRONT OFFICE.</span></div>';
  C.clues.c_log.text = 'Scrambled entries: ' + entries.filter(e => !e.who).map(e => `23:${String(e.m).padStart(2, '0')} ${(e.room === 'field' ? 'Practice Field' : ROOMS[e.room].name)} (${e.tier})`).join('; ') + '.';

  C.hotspots = { hs_security: { label: 'Door-badge log', html: logHtml, clue: 'c_log' } };
  WEAPON_IDS.forEach(w => {
    const wh = World.weaponHome[w];
    C.hotspots[wh.hs] = { label: WEAPON_HS_LABEL[w], text: w === weapon ? WEAPONS[w].missing : WEAPONS[w].present, clue: 'w_' + w };
  });
  C.hotspots[stash] = { label: stashSpot.label, clue: 'c_stash', text: `Stuffed down in the ${stashSpot.label.toLowerCase()}: the ${W.name.toLowerCase()}!\n\nYou dust it. One clear print, smudged but readable: a ${handWord.toUpperCase()} hand wrapped around it. Whoever hid this is ${handWord}-handed.` };
  const sp = World.struggle[room];
  C.extraHotspots = [
    { id: 'body', room: 'field', x: 32, y: 0.4, z: 0, label: 'Examine the body', clue: 'c_autopsy', range: 2.8,
      text: `Sterling Calloway, 68, owner of the Bay City Bruisers, under a team towel on the 50-yard line.\n\nCause of death: ${cause.label.toLowerCase()}. ${cause.text}\n\nTime of death: around 11:40 PM. But the lividity is wrong for where he's lying. He died somewhere else, and drag marks lead back toward the main hall.` },
    { id: 'struggle', room, x: sp.x, y: 0.5, z: sp.z, label: 'Overturned chair', clue: 'c_scene', range: 2.6,
      text: `The chair is knocked over and there's ${sp.spill} spilled across the floor. Somebody stepped right in it: a clear shoe print, ${big ? 'big. Size 12 or bigger.' : 'on the small side. Size 11 or under.'}\n\nThis is where it happened. Sterling Calloway died in ${roomRef(room)}.` },
    { id: 'hs_film_desk', room: 'film', x: -16.6, y: 0.95, z: 11.95, label: "Coordinator's desk", text: 'Call sheets, color-coded and laminated. Somebody here loves a good red-zone package.' }
  ];
  C.topics = {}; C.greets = {};
  SUSPECT_IDS.forEach(s => {
    C.greets[s] = SUSPECTS[s].greet;
    C.topics[s] = [
      { id: s + '_a', label: 'Where were you around 11:40?', alibi: true, text: alibi[s] },
      { id: s + '_m', label: 'How did you get along with Mr. Calloway?', text: SUSPECTS[s].motive },
      { id: s + '_s', label: 'See or hear anything strange tonight?', text: sight[s], grants: sightClue[s] ? [sightClue[s]] : undefined }
    ];
  });
  C.accuse = [
    { key: 'killer', label: 'Who did it?', options: SUSPECT_IDS.map(id => ({ id, label: SUSPECTS[id].name })) },
    { key: 'weapon', label: 'With what?', options: WEAPON_IDS.map(id => ({ id, label: WEAPONS[id].name })) },
    { key: 'room', label: 'Where?', options: ROOM_IDS.map(id => ({ id, label: ROOMS[id].name })) }
  ];
  C.answer = { killer, weapon, room };
  C.autoStrike = (has) => ({ weapon: WEAPON_IDS.filter(w => w !== weapon && has('w_' + w)) });
  C.board = (has) => {
    const ruled = WEAPON_IDS.filter(w => w !== weapon && has('w_' + w)).map(w => WEAPONS[w].name);
    const wKnown = has('c_stash') || has('w_' + weapon);
    return [
      { k: 'Victim', v: 'Sterling Calloway, team owner. Found on the 50-yard line, moved after death.', known: true },
      { k: 'Cause of death', v: has('c_autopsy') ? `${cause.label}: the ${WEAPONS[cause.weapons[0]].name} or the ${WEAPONS[cause.weapons[1]].name}` : null },
      { k: 'Weapon', v: wKnown ? `${W.name} (missing from ${roomRef(W.home)})` : (ruled.length ? 'Ruled out: ' + ruled.join(', ') : null) },
      { k: 'Murder scene', v: has('c_scene') ? ROOMS[room].name : null },
      { k: "Killer's shoe size", v: has('c_scene') ? (big ? '12 or bigger' : '11 or smaller') : null },
      { k: "Killer's dominant hand", v: has('c_stash') ? (K.hand === 'L' ? 'Left' : 'Right') : null },
      { k: "Killer's badge class", v: (has('c_log') && has('c_scene')) ? `${K.tier} (scrambled swipe into the ${ROOMS[room].name})` : (has('c_log') ? 'Find the murder room, then match its scrambled log entry' : null) }
    ];
  };
  const homeOf = w => `the ${WEAPONS[w].name} (${roomRef(WEAPONS[w].home)})`;
  C.hints = [
    { done: has => has('c_autopsy'), text: 'Start with the body on the 50-yard line. The Practice Field is at the east end of the main hall.' },
    { done: has => has('c_stash') || has('w_' + weapon), text: () => `The autopsy narrows it to two weapons: ${homeOf(cause.weapons[0])} or ${homeOf(cause.weapons[1])}. See which one is missing.` },
    { done: has => has('c_scene'), text: () => `He was dragged to the field. Look for an overturned chair in the ${ROOMS[room].wing} wing.` },
    { done: has => has('c_log'), text: 'The security desk in the Lobby logs door badges. A surge scrambled names, not badge classes.' },
    { done: has => has('c_stash'), text: 'The killer stashed the weapon. Check bins, bags and other hiding spots in rooms you haven\'t searched.' },
    { done: (has, g) => g.met.size >= SUSPECT_IDS.length, text: 'Talk to everyone. Watch their hands and their shoes; the Playbook records what you notice.' },
    { done: () => false, text: 'Shoe size, dominant hand, badge class. Only one suspect fits all three. Then make the call.' }
  ];
  C.solution = () => [
    `<p class="who">${K.name}. The ${W.name}. ${ROOMS[room].name}.</p>`,
    `<p>"${K.confess}"</p>`,
    `<p>${K.short} took the ${W.name.toLowerCase()} from ${roomRef(W.home)}, confronted Sterling Calloway in ${roomRef(room)} around 11:40, then dragged him down the main hall to the 50-yard line. The ${W.name.toLowerCase()} went into the ${stashSpot.label.toLowerCase()} in ${roomRef(stashSpot.room)}.</p>`,
    `<p>The tells: a ${big ? 'size 12+' : 'size 11-or-under'} shoe print at the scene, a ${handWord}-handed print on the weapon, a ${K.tier} badge on the scrambled log entry, and an alibi that ${variant === 'A' ? `${SUSPECTS[lie.withId].short} flatly contradicted` : 'a witness walked right through'}.</p>`
  ].join('');
  return C;
}
