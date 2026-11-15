// ===== Cast, weapons and the hand-written case ==============================
const SUSPECTS = {
  haskins: {
    id: 'haskins', name: 'Hank "Hammer" Haskins', short: 'Coach Haskins', role: 'Head Coach', tier: 'STAFF', shoe: 13, hand: 'R', color: '#a3271f', initials: 'HH',
    look: { height: 1.8, width: 0.62, skin: '#e2b896', top: '#a3271f', pants: '#c7b48c', shoes: '#e9e6df', hair: '#9a9a96', hairStyle: 'cap', capColor: '#a3271f', whistle: true, chestText: 'COACH' },
    handNote: 'Scribbles plays on his clipboard with his right hand.', shoeNote: 'Size 13 coaching sneakers, laces double-knotted.',
    greet: 'Eighty-Five. Good. I need somebody who runs through contact, not around it. Find who did this.',
    motive: 'He told the whole staff on Tuesday: win Sunday or clean out my office. Thirty-one years in this league and he talks to me like a ball boy.',
    quiet: 'I was too deep in my own head to notice anything. The game plan doesn\'t care who died.',
    block: 'Whoa! Save the pancake blocks for Sunday, Eighty-Five.',
    confess: 'Thirty-one years. He was going to throw me out like a used mouthguard. I went to talk to him. Just talk. Then he laughed.'
  },
  pruitt: {
    id: 'pruitt', name: 'Dana Pruitt', short: 'Dana Pruitt', role: 'General Manager', tier: 'FRONT OFFICE', shoe: 8, hand: 'L', color: '#1f2a44', initials: 'DP',
    look: { height: 1.68, width: 0.47, skin: '#f0c8a4', top: '#1f2a44', pants: '#1f2a44', shoes: '#111', hair: '#2b1d14', hairStyle: 'bob', collar: '#e8e4dc', sleeves: '#1f2a44' },
    handNote: 'Signs a stack of contracts with her left hand without looking up.', shoeNote: 'Size 8 heels. Expensive ones.',
    greet: 'Detective. I\'d appreciate this being handled quickly and quietly. We have a championship to play.',
    motive: 'He was about to hand my job to his son. After I built this roster out of spare parts and pure spite.',
    quiet: 'I keep my door closed. Other people\'s business is usually expensive.',
    block: 'Touch me again and I\'ll trade you to a team in the Arctic Circle.',
    confess: 'I built this team. Every contract, every trade, every cap miracle. And he was going to hand it to Rhett with a bow on top.'
  },
  jet: {
    id: 'jet', name: 'Marcus "Jet" Jennings', short: 'Jet Jennings', role: 'Wide Receiver', tier: 'PLAYER', shoe: 11, hand: 'L', color: '#e6b450', initials: 'MJ',
    look: { height: 1.86, width: 0.52, skin: '#6b4228', top: '#a3271f', pants: '#d9b45a', shoes: '#e6b450', socks: '#a3271f', hair: '#120c08', hairStyle: 'short', headband: '#f2ecdc', number: '11', pads: true, forearm: 'skin', gloves: '#e6b450' },
    handNote: 'You toss him a football. He snags it one-handed without looking. Left hand.', shoeNote: 'Size 11 gold cleats. Very gold.',
    greet: 'Yo, Eighty-Five! I grew up watching your highlights. You blocked like the grass owed you money.',
    motive: 'He wouldn\'t extend my contract. Went on the radio and called me "replaceable." Replaceable! I had fourteen hundred yards!',
    quiet: 'I had my headphones in. Block Party Mix, Volume 3. Couldn\'t hear a thing.',
    block: 'Ay! Watch the hamstrings, those are insured!',
    confess: 'Replaceable. On the radio. My mom heard that. I just wanted him to say it to my face. He did.'
  },
  tony: {
    id: 'tony', name: 'Tony Bianchi', short: 'Tony Bianchi', role: 'Equipment Manager', tier: 'STAFF', shoe: 10, hand: 'R', color: '#55606b', initials: 'TB',
    look: { height: 1.7, width: 0.6, skin: '#d6a57d', top: '#55606b', pants: '#34465e', shoes: '#4a3a2a', hair: '#1d1712', hairStyle: 'backcap', capColor: '#16191e', chestText: 'EQUIP' },
    handNote: 'Spins a screwdriver in his right hand. Never stops.', shoeNote: 'Size 10 work boots with grease on the toes.',
    greet: 'Detective! Hey. Hi. You need anything? Gloves? Mouthguard? A real nice helmet? Very shiny?',
    motive: 'He was cutting my whole staff to save money. Twenty-two years I\'ve been washing this team\'s socks.',
    quiet: 'I was elbow-deep in helmet padding. You would not believe what grows in there.',
    block: 'Hey! I just got my back fixed!',
    confess: 'Twenty-two years. He was going to replace me with an app. An app, Detective! It can\'t even fold a towel.'
  },
  osei: {
    id: 'osei', name: 'Dr. Lena Osei', short: 'Dr. Osei', role: 'Team Physician', tier: 'STAFF', shoe: 12, hand: 'L', color: '#2f6f73', initials: 'LO',
    look: { height: 1.8, width: 0.48, skin: '#5a3824', top: '#eef0f2', pants: '#2f6f73', shoes: '#f2f2ee', hair: '#120c08', hairStyle: 'bun', glasses: true, coat: true, collar: '#2f6f73' },
    handNote: 'Writes her notes left-handed in tiny, perfect print.', shoeNote: 'Size 12 running shoes. Tall, and quick on her feet.',
    greet: 'Detective. I\'ve seen every kind of injury in this sport. I hadn\'t seen this one.',
    motive: 'He pressured me to clear injured players for Sunday. I refused. He threatened my contract, then my license.',
    quiet: 'I was charting. When I\'m charting, the building could fall down around me.',
    block: 'Do that again and I will put you in concussion protocol myself.',
    confess: 'He wanted me to send a boy with a cracked vertebra onto the field. I said no. He said he\'d end my career. I ended his first.'
  },
  lou: {
    id: 'lou', name: '"Big Lou" Okafor', short: 'Big Lou', role: 'Offensive Tackle', tier: 'PLAYER', shoe: 16, hand: 'R', color: '#7a5a1e', initials: 'LO',
    look: { height: 2.0, width: 0.76, skin: '#4a2c1c', top: '#a3271f', pants: '#d9b45a', shoes: '#111', socks: '#a3271f', hairStyle: 'bald', number: '77', pads: true, forearm: 'skin', shoeScale: 1.2 },
    handNote: 'Writes in a tiny poetry notebook, right-handed. The pen looks like a toothpick in his fist.', shoeNote: 'Size 16 cleats. Like two canoes.',
    greet: 'Detective. I\'m sorry about all this. He wasn\'t a nice man, but nobody deserves that.',
    motive: 'He traded my best friend to Buffalo during his daughter\'s birthday party. I wrote a poem about it. It was not a happy poem.',
    quiet: 'Nothing. I was counting reps out loud, and I count very loud.',
    block: 'Ha! Good pad level! That was a real Kittle special. Respect.',
    confess: 'I tried to write it out. I tried, Detective. Nine poems. Nothing rhymes with "traded at a birthday party."'
  },
  pepper: {
    id: 'pepper', name: 'Pepper Vance', short: 'Pepper Vance', role: 'Team Chef', tier: 'STAFF', shoe: 9, hand: 'L', color: '#8a3b1d', initials: 'PV',
    look: { height: 1.64, width: 0.5, skin: '#c98e62', top: '#f4f1ea', pants: '#202326', shoes: '#202326', hair: '#8a3b1d', hairStyle: 'chef', belt: '#a3271f' },
    handNote: 'Chops parsley left-handed, fast enough to scare you.', shoeNote: 'Size 9 kitchen clogs. Non-slip.',
    greet: 'If you\'re hungry, there\'s pasta. If you\'re here to accuse me, there\'s also pasta.',
    motive: 'He was replacing my kitchen with a meal-kit sponsor. Meal kits. For professional athletes.',
    quiet: 'I was elbow-deep in tomorrow\'s brunch. Twelve dozen eggs don\'t scramble themselves.',
    block: 'Not near the stove! NOT near the stove!',
    confess: 'Meal kits. Six years of feeding this team like family, and he wanted to replace me with a cardboard box.'
  },
  rhett: {
    id: 'rhett', name: 'Rhett Calloway', short: 'Rhett Calloway', role: 'VP of Marketing', tier: 'FRONT OFFICE', shoe: 13, hand: 'L', color: '#6f93b8', initials: 'RC',
    look: { height: 1.86, width: 0.54, skin: '#efc6a6', top: '#6f93b8', pants: '#e8e4dc', shoes: '#6b3a1e', hair: '#d9b26a', hairStyle: 'slick', shades: true, collar: '#ffffff', sleeves: '#6f93b8' },
    handNote: 'Takes selfies left-handed. Constantly.', shoeNote: 'Size 13 designer loafers, no socks.',
    greet: 'Detective! Big fan. Huge. Can we keep my name out of the press? Unless it\'s positive press.',
    motive: 'Dad was cutting me out of the will. He announced it at Thanksgiving. In front of the caterers.',
    quiet: 'I was on my phone. Engagement was way up tonight. Is that weird to say? That\'s weird to say.',
    block: 'Bro! This blazer is linen!',
    confess: 'He announced it in front of the caterers. The caterers, Detective. I just wanted him to take it back.'
  }
};
const SUSPECT_IDS = Object.keys(SUSPECTS);

const WEAPONS = {
  dumbbell: { id: 'dumbbell', name: '45-lb Dumbbell', cat: 'blunt', home: 'weight',
    present: 'The 45-pound hex dumbbell sits in its slot on the rack, chalk dust undisturbed. Whatever killed him, it wasn\'t this.',
    missing: 'There\'s an empty slot on the rack where the 45-pound dumbbell should be. The chalk dust is smeared, like someone grabbed it in a hurry.' },
  trophy: { id: 'trophy', name: 'Championship Trophy', cat: 'blunt', home: 'lobby',
    present: 'The 1994 championship trophy gleams in the case. Dust-free. Fingerprint-free. Untouched.',
    missing: 'The center of the trophy case is empty: a clean ring in the dust where the championship trophy stood. The glass door is unlatched.' },
  whistle: { id: 'whistle', name: 'Whistle Lanyard', cat: 'strangle', home: 'coach',
    present: 'Coach\'s lucky whistle hangs on its hook, the red lanyard neatly coiled. Not the weapon.',
    missing: 'The hook where Coach\'s lanyard whistle always hangs is empty.' },
  cable: { id: 'cable', name: 'Projector Cable', cat: 'strangle', home: 'film',
    present: 'The long projector cable is plugged in and coiled. The loop keeps playing. Not the weapon.',
    missing: 'The projector\'s long spare cable is gone. The coil hook on the cart is bent, like it was yanked off.' },
  shake: { id: 'shake', name: 'Spiked Protein Shake', cat: 'poison', home: 'cafeteria',
    present: 'Every labeled shaker bottle is lined up and sealed, including the owner\'s. Not the weapon.',
    missing: 'One shaker bottle is missing from the line-up: the one labeled S. CALLOWAY. A spilled scoop of white powder sits next to the gap. It isn\'t protein.' },
  syringe: { id: 'syringe', name: 'Sedative Syringe', cat: 'poison', home: 'training',
    present: 'The sedative kit is sealed and accounted for. Dr. Osei\'s count matches. Not the weapon.',
    missing: 'The sedative kit has been opened. One loaded syringe is missing from its slot.' }
};
const WEAPON_IDS = Object.keys(WEAPONS);
const CAUSES = {
  blunt: { label: 'Blunt force', text: 'A single heavy blow to the back of the head. Something dense and solid.', weapons: ['dumbbell', 'trophy'] },
  strangle: { label: 'Strangulation', text: 'Ligature marks around the neck. Thin and strong: a cord or a strap.', weapons: ['whistle', 'cable'] },
  poison: { label: 'Poisoning', text: 'No wounds at all. Pinpoint pupils and blue lips. Something got into his system.', weapons: ['shake', 'syringe'] }
};

const KITTLE_QUIPS = [
  'That\'s a big-time clue. Big-time.',
  'Yards after clue: plenty.',
  'You\'d spike this if it weren\'t evidence.',
  'Into the Playbook it goes.',
  'Wide open, like a seam route against Cover 3.',
  'Block party at the evidence locker.',
  'You don\'t need speed to find this stuff. You need want-to.',
  'Somewhere, a tight end coach just nodded.',
  'Pancaked that mystery a little flatter.'
];

// ---------------------------------------------------------------------------
// STORY CASE: The Last Playbook
// ---------------------------------------------------------------------------
const GIL_LOOK = { height: 1.78, width: 0.54, skin: '#e8c2a0', top: '#a3271f', pants: '#5d636b', shoes: '#2a1a10', hair: '#b9b6ae', hairStyle: 'gray', glasses: true, collar: '#e6b450', sleeves: '#a3271f' };

function buildStoryCase() {
  const C = {
    id: 'story', title: 'The Last Playbook', fileNo: 'CASE FILE 01',
    victimName: 'Gil Brennan',
    suspects: ['haskins', 'pruitt', 'jet', 'osei', 'tony', 'lou', 'pepper'],
    spawn: { x: -12, z: -0.4, yaw: Math.PI },
    totalClues: 20,
    placements: {
      haskins: { x: -1.8, z: 8.4, yaw: Math.PI * 0.9 },
      pruitt: { x: 4.4, z: 9.2, yaw: Math.PI },
      jet: { x: -2.72, z: -9.6, yaw: Math.PI / 2, pose: 'sit', seatY: 0.84 },
      osei: { x: 1.1, z: -8.5, yaw: -1.4 },
      tony: { x: 10.2, z: -6.2, yaw: 0.2 },
      lou: { x: -22.6, z: -5.6, yaw: 2.6 },
      pepper: { x: -25.6, z: 12.25, yaw: Math.PI }
    }
  };
  C.briefing = [
    '<p>Saturday, 11:52 PM. Championship Eve.</p>',
    '<p>At 10:30 a storm knocked out main power. The Bruisers\' performance center is running on emergency lights and in full lockdown: magnetic locks sealed every outside door until 6 AM. <span class="em">Nobody got in. Nobody got out.</span></p>',
    '<p>Offensive coordinator <b>Gil "The Professor" Brennan</b> was found dead in the Film Room by Head Coach Hank Haskins. The team\'s secret playbook tablet is missing.</p>',
    '<p>Seven people are locked inside with you. One of them did it.</p>',
    '<p class="cf-goal">Find <b>WHO</b> killed Gil, <b>HOW</b>, and <b>WHY</b>. You have four downs.</p>'
  ].join('');
  C.clues = {
    c_body: { title: 'Not a heart attack', kind: 'phys', room: 'film', text: 'Pinpoint pupils, blue lips, no wounds. A sedative overdose. Death came between 11:35 and 11:45 PM.' },
    c_cup: { title: 'Poisoned coffee', kind: 'phys', room: 'film', text: 'Gil\'s 11:30 black coffee was laced with crushed pills. White sludge at the bottom of the mug.' },
    c_sync: { title: 'Tablet undocked at 11:45 PM', kind: 'rec', room: 'film', text: 'The playbook tablet was pulled from its dock at 11:45, after Gil had been poisoned.' },
    c_email: { title: 'Gil\'s draft email to the League', kind: 'phys', room: 'film', text: 'Gil planned to report the GM for paying players off the books through "Gridiron Holdings LLC," right after the game.' },
    c_cabinet: { title: 'Sedative missing from the cabinet', kind: 'phys', room: 'training', text: 'A bottle of Somnalex disappeared after the 6 PM inventory. The cabinet was opened with a key, not forced.' },
    c_taping: { title: 'Taping log', kind: 'rec', room: 'training', text: 'Dr. Osei treated Jet from 11:15 to 11:45 PM. They alibi each other.' },
    c_security: { title: 'Door-badge log', kind: 'rec', room: 'lobby', text: 'Dana: Training Room 10:47, Cafeteria 11:24, Film Room 11:31. Tony: Film Room 11:44. Coach: Film Room 11:52.' },
    c_phone: { title: 'Dana\'s call ended at 11:12', kind: 'rec', room: 'gm', text: 'Dana says she was on the phone with the League until midnight. Her phone says 12 minutes, ending at 11:12.' },
    c_shredder: { title: 'Shredded Gridiron Holdings records', kind: 'phys', room: 'gm', text: 'Dana was shredding records of payments from "Gridiron Holdings LLC" to players tonight.' },
    c_check: { title: 'A $250,000 "appreciation" check', kind: 'phys', room: 'locker', text: 'Jet received $250,000 from Gridiron Holdings LLC. Off the books.' },
    c_resign: { title: 'Gil\'s resignation letter', kind: 'phys', room: 'coach', text: 'Gil was leaving to become head coach of the Las Vegas Vipers. Coach scrawled TRAITOR across it, then wrote "Proud of you."' },
    c_texts: { title: 'Texts from "Sal"', kind: 'phys', room: 'equipment', text: 'Tony owes a bookie $40,000. The bookie wants the playbook instead.' },
    c_tablet: { title: 'The missing playbook tablet', kind: 'phys', room: 'equipment', text: 'The playbook tablet was stuffed in the bottom of the ball bag in Tony\'s equipment room.' },
    t_masterkey: { title: 'Two keys to the cabinet', kind: 'test', who: 'osei', text: 'Dr. Osei: only two keys exist. Hers, which never left her lanyard, and Dana Pruitt\'s master key.' },
    t_coffee: { title: 'Dana carried the coffee', kind: 'test', who: 'pepper', text: 'Pepper: Dana asked for Gil\'s coffee at 11:25 and insisted on carrying it to him herself. "A peace offering."' },
    t_lou_saw: { title: 'Lou saw Dana with a cup', kind: 'test', who: 'lou', text: 'Lou: around 11:30, Dana was in the hall carrying a coffee cup with both hands, "like a live grenade."' },
    t_coach_alibi: { title: 'Coach was with Lou', kind: 'test', who: 'lou', text: 'Lou: Coach Haskins was in the weight room with him from 11:20 until about 11:50.' },
    t_dana_admit: { title: 'Dana admits she brought the coffee', kind: 'test', who: 'pruitt', text: 'Dana: she stepped out and brought Gil a coffee as a "peace offering." Claims he was alive when she left.' },
    t_tony_confess: { title: 'Tony took the tablet', kind: 'test', who: 'tony', text: 'Tony: he went in at 11:44 and Gil was already dead. He took the tablet to pay off Sal, and hid it in the ball bag.' },
    t_jet_payment: { title: 'Gil knew about the payments', kind: 'test', who: 'jet', text: 'Jet: Dana called it an "appreciation bonus." Gil found out last week and was going to the League after Sunday.' }
  };
  C.hotspots = {
    hs_projector: { label: 'Projector laptop', text: 'The projector is still looping the same play: RED RIGHT 85 Y-STICK. A tight end play. Gil had taste.\n\nThe laptop\'s sync log reads: "Playbook tablet undocked: 11:45 PM." Gil was already dying by then. Someone else took that tablet.', clue: 'c_sync' },
    hs_cabinet: { label: 'Medicine cabinet', text: 'Locked. No scratches, no pry marks: whoever opened it had a key. Every slot is full except one, labeled SOMNALEX 50MG (SEDATIVE).\n\nDr. Osei\'s inventory sheet from 6:00 PM shows that slot was full.', clue: 'c_cabinet' },
    hs_taping: { label: 'Taping station', text: 'A pile of fresh tape scraps and Dr. Osei\'s treatment log:\n\n11:15 PM – 11:45 PM: M. JENNINGS. Left ankle, tape and stim.\n\nThe tape job is immaculate. Jet wasn\'t going anywhere.', clue: 'c_taping' },
    hs_security: {
      label: 'Door-badge log', clue: 'c_security',
      html: '<p>The badge log survived the outage. Tonight\'s entries:</p><div class="log">' +
        [['22:47', 'TRAINING ROOM', 'D. PRUITT'], ['23:02', 'GM OFFICE', 'D. PRUITT'], ['23:14', 'TRAINING ROOM', 'L. OSEI'], ['23:16', 'TRAINING ROOM', 'M. JENNINGS'], ['23:19', 'WEIGHT ROOM', 'H. HASKINS'], ['23:20', 'WEIGHT ROOM', 'L. OKAFOR'], ['23:24', 'CAFETERIA', 'D. PRUITT'], ['23:31', 'FILM ROOM', 'D. PRUITT'], ['23:44', 'FILM ROOM', 'T. BIANCHI'], ['23:46', 'EQUIPMENT RM', 'T. BIANCHI'], ['23:52', 'FILM ROOM', 'H. HASKINS']]
          .map(r => `<span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span>`).join('') + '</div>'
    },
    hs_phone: { label: 'Desk phone', text: 'Dana\'s desk phone. The call log reads:\n\nLEAGUE OFFICE — 11:00 PM — 12 MIN\n\nThe call ended at 11:12. Whatever Dana was doing at 11:30, it wasn\'t talking to the League.', clue: 'c_phone' },
    hs_shredder: { label: 'Paper shredder', text: 'The bin is stuffed, but a few strips are wide enough to read:\n\n"...GRIDIRON HOLDINGS LLC... wire... M. JENNINGS... $250,000... appreciation..."\n\nSomeone was shredding in a hurry tonight. The motor\'s still warm.', clue: 'c_shredder' },
    hs_jet_locker: { label: "Jet's locker", text: 'Gold cleats, size 11, polished. Tucked behind a shoebox: an envelope from GRIDIRON HOLDINGS LLC. Inside, a check stub for $250,000. Memo line: "appreciation."\n\nThat is a lot of appreciation.', clue: 'c_check' },
    hs_coach_desk: { label: "Coach's desk", text: 'A resignation letter from Gil: "Effective after Sunday, I accept the head coaching position with the Las Vegas Vipers."\n\nAcross it, in angry red marker: TRAITOR. Below that, in calmer pencil: Proud of you, Professor.', clue: 'c_resign' },
    hs_workbench: { label: 'Workbench', text: 'Helmet padding, a screwdriver, and Tony\'s phone, face up. Three texts from SAL:\n\n"Forty grand by Monday."\n"Or the playbook. Your pick."\n"Tick tock, Tony."', clue: 'c_texts' },
    hide_equipment: { label: 'Ball bag', text: 'Footballs, inflated to exactly 13 PSI... and under them, something flat and hard. The missing playbook tablet!\n\nIt\'s still logged in to Gil\'s account.', clue: 'c_tablet' },
    hs_coffee: { label: 'Coffee machine', text: 'Industrial coffee machine. A sticky note on the side in Pepper\'s handwriting: GIL — 11:30 — BLACK. EVERY NIGHT.' }
  };
  C.extraHotspots = [
    { id: 'body', room: 'film', x: -16.6, y: 1.0, z: 11.4, label: 'Examine Gil Brennan', clue: 'c_body', range: 2.6,
      text: 'Gil "The Professor" Brennan, 58, offensive coordinator. Slumped back in his chair like he dozed off mid-film.\n\nNo wounds. No sign of a struggle. But his pupils are pinpoints and his lips have a blue tinge. That isn\'t a heart attack.\n\nSomeone put him to sleep. Permanently.' },
    { id: 'hs_cup', room: 'film', x: -16.05, y: 0.85, z: 12.2, label: 'Coffee mug', clue: 'c_cup', range: 2.2,
      text: 'A Bruisers mug, half full of black coffee gone cold. At the bottom, a gritty white sludge that never dissolved.\n\nCrushed pills. Gil\'s last drink was the murder weapon.' },
    { id: 'hs_gil_bag', room: 'film', x: -17.45, y: 0.3, z: 11.0, label: "Gil's bag", clue: 'c_email', range: 2.2,
      text: 'A worn leather bag. Inside, a printed draft email to the League Office:\n\n"I have documented proof that our General Manager is paying players off the books through a shell company, Gridiron Holdings LLC. I will deliver everything after Sunday\'s game. I didn\'t want to distract the players."\n\n— Gil' }
  ];
  C.topics = {
    haskins: [
      { id: 'h1', label: 'Where were you tonight?', alibi: true, text: 'Weight room with Big Lou from about 11:20. Kid wanted to go over protections against their blitz package. At 11:52 I walked down to the Film Room to make peace with Gil. That\'s when I found him.' },
      { id: 'h2', label: 'You and Gil argued tonight.', text: 'At nine. Loud. Half the building heard it. He took the head job with the Vegas Vipers, effective after Sunday, and I heard about it from a reporter. But you don\'t kill a man over that. You beat him twice a year for the rest of his life.' },
      { id: 'h3', label: 'Who would want Gil dead?', text: 'Gil was a straight arrow. Too straight for this building. The last few weeks he kept asking questions upstairs. Front office questions. Dana didn\'t care for it.' },
      { id: 'h4', label: 'Ask about the TRAITOR note', requires: ['c_resign'], text: 'I wrote that at 9:05, mad as a hornet. I wrote the other part at 11:45. "Proud of you." I was going to give it to him tonight. Never got the chance.' },
      { id: 'h5', label: 'Did Gil drink coffee at night?', requires: ['c_cup'], text: 'Black coffee, 11:30, every night for eleven years. Like a metronome. Pepper makes it. Usually Gil walks down and gets it himself.' }
    ],
    pruitt: [
      { id: 'p1', label: 'Where were you around 11:30?', alibi: true, text: 'Right here. On a call with the League office from eleven until... well, until Hank started shouting down the hall. Cap compliance. Riveting stuff.' },
      { id: 'p2', label: 'What did you think of Gil?', text: 'Brilliant offensive mind. Terrible at minding his own business. Technically, those are both compliments.' },
      { id: 'p3', label: 'Your call ended at 11:12.', requires: ['c_phone'], grants: ['t_dana_admit'], text: '...Fine. I stepped out. Gil and I had been at odds, so I brought him a coffee. A peace offering. He was alive when I left. Very alive. Complaining that it was too hot.' },
      { id: 'p4', label: 'You have a key to the medicine cabinet.', requires: ['c_cabinet', 't_masterkey'], text: 'I have a master key to every lock in this building. It\'s my building. Owning a key isn\'t a crime, Detective.' },
      { id: 'p5', label: 'What is Gridiron Holdings?', requiresAny: ['c_shredder', 'c_email', 'c_check'], text: 'A marketing vendor. I fail to see the relevance. ...Are we done here? I have a championship to prepare for.' },
      { id: 'p6', label: 'Your badge opened the Training Room at 10:47.', requires: ['c_security'], text: 'I was looking for Lena. About a player\'s hamstring. She wasn\'t there, so I left. Is that a crime now too?' }
    ],
    jet: [
      { id: 'j1', label: 'Where were you around 11:30?', alibi: true, text: 'Right here on this table, getting my ankle taped. Doc had me from like 11:15 to 11:45. Didn\'t leave once. Ask her.' },
      { id: 'j2', label: 'How did you get along with Gil?', text: 'He benched me for the opening drive. Said I was freelancing my routes. I was heated, for real. But Gil made me. Taught me to read a Cover 2 when I was a rookie who couldn\'t read a menu. I would never.' },
      { id: 'j3', label: 'Ask about Gridiron Holdings', requiresAny: ['c_check', 'c_shredder'], grants: ['t_jet_payment'], text: '...Okay. Okay. Ms. Pruitt said it was an "appreciation bonus." Off the books, keeps us under the cap. Gil found out last week. He told me to get a lawyer, because after Sunday he was taking all of it to the League.' }
    ],
    osei: [
      { id: 'o1', label: 'Where were you around 11:30?', alibi: true, text: 'Taping Jet\'s ankle, from about 11:15 until 11:45. Before that, inventory. I logged everything. I always log everything.' },
      { id: 'o2', label: 'How did Gil die?', requires: ['c_body'], text: 'Pinpoint pupils, shallow breathing at the end, blue lips. A heavy sedative overdose. Something like Somnalex. Which, yes, I am aware I keep in that cabinet.' },
      { id: 'o3', label: 'Who has keys to the cabinet?', requires: ['c_cabinet'], grants: ['t_masterkey'], text: 'Two keys exist. Mine never leaves my lanyard; it was on me all night. The other is Dana Pruitt\'s master key. She insisted on a master key to every lock in the building when she took over.' },
      { id: 'o4', label: 'What was Gil like?', text: 'Kind. Punctual to the point of being annoying. Last week he asked me whether anyone had ever pressured me to sign off on things I shouldn\'t. Not medical things. Money things. I think he was building a case.' }
    ],
    tony: [
      { id: 't1', label: 'Where were you around 11:30?', alibi: true, text: 'Here! All night! Forty-two helmets, polished. You can see your face in \'em. Look. Look at your face.' },
      { id: 't2', label: 'What did you think of Gil?', text: 'Gil tipped me at Christmas. Every year. Wrote a card, too. Who does that anymore?' },
      { id: 't3', label: 'Your badge opened the Film Room at 11:44.', requires: ['c_security'], text: 'I... dropped off headset batteries. For the coaches\' headsets. That\'s all. In and out. Real quick.' },
      { id: 't4', label: 'The tablet. And Sal.', requiresAny: ['c_texts', 'c_tablet', 'c_sync'], grants: ['t_tony_confess'], text: 'Okay! OKAY. I went in at 11:44 with the batteries. Gil was already... he wasn\'t moving. I swear on my mother. The tablet was sitting right there, and I owe Sal forty grand, and I panicked. I took it. It\'s in the ball bag. But I didn\'t hurt nobody! He was gone when I got there!' }
    ],
    lou: [
      { id: 'l1', label: 'Where were you around 11:30?', alibi: true, grants: ['t_coach_alibi'], text: 'Weight room with Coach Haskins from about 11:20. We talked blitz pickups while I did calf raises. He left around 11:50. Said he was going to go make peace with Coach Gil.' },
      { id: 'l2', label: 'Did you see anything strange?', grants: ['t_lou_saw'], text: 'Around 11:30 I stepped out to fill my water jug. Ms. Pruitt was in the hall carrying a coffee cup. With both hands. Real careful. Like it was a live grenade. I have never seen her carry anything for anybody.' },
      { id: 'l3', label: 'Got any words for Gil?', text: 'I wrote him a poem. "Ode to the Professor." ...\n\n"He drew up plays in pencil,\nand never raised his voice.\nHe threw it to the tight end,\nbecause it was the right choice."\n\nIt\'s not finished.' }
    ],
    pepper: [
      { id: 'v1', label: 'Where were you around 11:30?', alibi: true, text: 'Right here, prepping tomorrow\'s pre-game brunch. Twelve dozen eggs don\'t crack themselves. I didn\'t leave this kitchen once.' },
      { id: 'v2', label: 'What did you think of Gil?', text: 'He sent compliments to the chef after every single meal. Six years. Do you know how rare that is in this building?' },
      { id: 'v3', label: 'Did Gil eat or drink anything tonight?', requiresAny: ['c_cup', 'c_body'], grants: ['t_coffee'], text: 'Black coffee, 11:30 sharp, every night. Usually he walks down for it. Tonight Dana came in at 11:25 and asked for it herself. Said she\'d bring it to him. "A peace offering." In six years, that woman has never carried so much as a napkin for anyone.' }
    ]
  };
  C.greets = {
    haskins: 'Eighty-Five. Thank God. I found him at 11:52. Gil was a pain in my neck for eleven years and I\'d give anything to hear him nag me one more time. Find who did this.',
    pruitt: SUSPECTS.pruitt.greet + ' In fourteen hours.',
    jet: SUSPECTS.jet.greet,
    osei: 'Detective. I\'ve treated broken legs, torn ACLs and one man who was bitten by a mascot. I wasn\'t ready for tonight.',
    tony: SUSPECTS.tony.greet,
    lou: 'Detective. I\'m sorry about all this. Coach Gil learned my daughter\'s name before he learned my position. Nobody deserved this. Him least of all.',
    pepper: SUSPECTS.pepper.greet
  };
  C.accuse = [
    { key: 'killer', label: 'Who did it?', options: C.suspects.map(id => ({ id, label: SUSPECTS[id].name })) },
    { key: 'method', label: 'How?', options: [
      { id: 'coffee', label: 'Sedative slipped into his coffee' }, { id: 'blunt', label: 'A blow to the head' },
      { id: 'strangle', label: 'Strangled with a cable' }, { id: 'shake', label: 'A spiked protein shake' }, { id: 'natural', label: 'Natural causes: his heart' }] },
    { key: 'motive', label: 'Why?', options: [
      { id: 'cap', label: 'To bury the payment scheme Gil was exposing' }, { id: 'playbook', label: 'To steal and sell the playbook' },
      { id: 'bench', label: 'Revenge for being benched' }, { id: 'rival', label: 'Rage over Gil leaving for a rival' }, { id: 'medical', label: 'To hide a medical cover-up' }] }
  ];
  C.answer = { killer: 'pruitt', method: 'coffee', motive: 'cap' };
  C.board = (has) => [
    { k: 'Victim', v: 'Gil "The Professor" Brennan, offensive coordinator', known: true },
    { k: 'Cause of death', v: has('c_body') ? 'Sedative overdose, between 11:35 and 11:45 PM' : null },
    { k: 'How it got in him', v: has('c_cup') ? 'Crushed pills in his 11:30 black coffee' : null },
    { k: 'Where the drug came from', v: has('c_cabinet') ? 'Training Room cabinet, opened with a key' : null },
    { k: 'Who has a key', v: has('t_masterkey') ? 'Dr. Osei (on her all night) and Dana Pruitt\'s master key' : null },
    { k: 'Who carried the coffee', v: (has('t_coffee') || has('t_lou_saw') || has('t_dana_admit')) ? 'Dana Pruitt' : null },
    { k: 'Motive lead', v: (has('c_email') || has('c_shredder') || has('c_check') || has('t_jet_payment')) ? 'Gridiron Holdings LLC: off-books payments Gil was about to report' : null },
    { k: 'The missing tablet', v: (has('t_tony_confess') || has('c_tablet')) ? 'Tony took it at 11:44, after Gil was already dead' : (has('c_sync') ? 'Undocked at 11:45, after the poisoning' : null) }
  ];
  C.hints = [
    { need: 'c_body', text: 'Start where it ended. Gil is in the Film Room, south side of the main hall. Examine him.' },
    { need: 'c_cup', text: 'A sedative has to get into him somehow. Look at what\'s on Gil\'s desk.' },
    { need: 't_coffee', text: 'Who makes Gil\'s coffee every night? Ask in the Cafeteria.' },
    { need: 'c_cabinet', text: 'Sedatives live in the Training Room. Check the medicine cabinet.' },
    { need: 't_masterkey', text: 'The cabinet wasn\'t forced. Ask Dr. Osei who has a key.' },
    { need: 'c_security', text: 'The security desk in the Lobby still logs every door badge.' },
    { need: 'c_phone', text: 'Somebody\'s alibi is a phone call. Phones keep logs. Check the GM Office.' },
    { need: ['c_shredder', 'c_email', 'c_check'], any: true, text: 'You need a why. Check Gil\'s bag in the Film Room, or what\'s being shredded in the GM Office.' },
    { need: 't_tony_confess', text: 'Someone took the tablet after Gil died. Red herrings still need to be cleared. Lean on Tony.' },
    { need: null, text: 'You have the who, the how, and the why. Open the Playbook and make the call.' }
  ];
  C.solution = () => [
    '<p class="who">Dana Pruitt. Sedative in the coffee. To bury Gridiron Holdings.</p>',
    '<p>"Gridiron Holdings was going to win us a championship," Dana says, very calmly. "Gil was going to hand it to the League with a bow on top. So I brought him his coffee. He even said thank you."</p>',
    '<p>She took the Somnalex from the training room at 10:47 with her master key, while Dr. Osei was still doing inventory elsewhere. At 11:25 she asked Pepper for Gil\'s coffee and carried it to the Film Room herself. Her call with the League had ended at 11:12.</p>',
    '<p>Tony found Gil dead at 11:44 and panicked over his debt to Sal. He took the tablet. He returns it and gets a lawyer. Coach Haskins keeps the "Proud of you" note.</p>',
    '<p>Sunday, the Bruisers win by a field goal. The tight end finishes with 9 catches for 141 yards and two pancake blocks, and dedicates the game to the Professor.</p>'
  ].join('');
  return C;
}
