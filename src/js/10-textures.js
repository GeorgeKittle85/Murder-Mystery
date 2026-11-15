// ===== Procedural textures ==================================================
let MAX_ANISO = 4;
const TEX = {};

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function canvasTexture(w, h, draw, o = {}) {
  const c = makeCanvas(w, h); const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (o.repeat !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = MAX_ANISO;
  return t;
}
function speckle(g, w, h, colors, n, s0 = 1, s1 = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = s0 + Math.random() * (s1 - s0);
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}
function vary(base, amt) { const v = base + ((Math.random() * 2 - 1) * amt) | 0; return clamp(v, 0, 255); }

function textLines(g, lines, x, y, lh) { lines.forEach((l, i) => g.fillText(l, x, y + i * lh)); }

function buildTextures() {
  TEX.block = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#9d988f'; g.fillRect(0, 0, w, h);
    const rows = 8, rh = h / rows, cols = 4, cw = w / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * cw / 2;
      for (let c = -1; c <= cols; c++) {
        const v = vary(196, 7);
        g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        g.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    speckle(g, w, h, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.08)'], 1400, 1, 2);
  });
  TEX.ceiling = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#d8d6d0'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#b9b6ae', '#c8c5bd'], 900, 1, 1.6);
    g.strokeStyle = '#8f8c86'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  TEX.rubber = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#202226'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#2e3136', '#16171a', '#6a201b', '#3c4046', '#8d6a25'], 3000, 1, 2.4);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  TEX.tile = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#6c7178'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = vary(156, 8); g.fillStyle = `rgb(${v - 6},${v},${v + 6})`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
    speckle(g, w, h, ['rgba(0,0,0,.06)'], 500);
  });
  TEX.tileBlue = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#7d8c96'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = vary(196, 6); g.fillStyle = `rgb(${v - 14},${v - 2},${v + 8})`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
  });
  TEX.checker = canvasTexture(128, 128, (g, w, h) => {
    const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#e6e1d6' : '#9e2b25'; g.fillRect(i * s, j * s, s, s); }
    speckle(g, w, h, ['rgba(0,0,0,.07)', 'rgba(255,255,255,.06)'], 400);
  });
  TEX.wood = canvasTexture(256, 256, (g, w, h) => {
    const n = 6, s = h / n;
    for (let i = 0; i < n; i++) {
      const v = vary(120, 14);
      g.fillStyle = `rgb(${v + 30},${v - 6},${v - 44})`; g.fillRect(0, i * s, w, s);
      g.strokeStyle = 'rgba(40,20,5,.12)';
      for (let k = 0; k < 7; k++) { g.beginPath(); const y = i * s + Math.random() * s; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 3, w * .6, y - 3, w, y + 1); g.stroke(); }
      g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(0, i * s, w, 1.5);
      const cut = Math.random() * w; g.fillRect(cut, i * s, 1.5, s);
    }
  });
  TEX.carpetNavy = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#1d2a44'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#24345a', '#16203a', '#2b3d63', '#3a2f1a'], 2600, 1, 1.5);
  });
  TEX.carpetDark = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#26272c'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#2f3036', '#1e1f23', '#3b2422'], 2600, 1, 1.5);
    g.strokeStyle = 'rgba(160,40,30,.25)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(w / 2, h / 2, 12 + i * 14, 0, TAU); g.stroke(); }
  });
  TEX.concrete = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#6f7275'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#7d8083', '#64676a', '#5b5e61', '#86898c'], 5000, 1, 3);
    g.strokeStyle = 'rgba(30,30,30,.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, h * .3); g.lineTo(w * .4, h * .36); g.lineTo(w * .7, h * .28); g.stroke();
    g.strokeStyle = 'rgba(20,20,20,.5)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
  TEX.hall = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5d6168'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#6b6f76', '#555960', '#73777e'], 3200, 1, 2.2);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, w, h / 2);
    g.strokeStyle = 'rgba(15,15,15,.45)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
  TEX.stone = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#26292e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(${200 + Math.random() * 40},${180 + Math.random() * 30},140,${0.05 + Math.random() * 0.07})`; g.lineWidth = 1 + Math.random() * 2;
      g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (Math.random() - .3) * 50; y += (Math.random() - .5) * 40; g.lineTo(x, y); } g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });

  // Practice field turf: canvas x = world x (18..46), canvas y = world z (-14..14)
  TEX.field = canvasTexture(2048, 2048, (g, W, H) => {
    const m = W / 28, X = x => (x - 18) * m, Z = z => (z + 14) * m, YD = 0.9144;
    g.fillStyle = '#1f4a2b'; g.fillRect(0, 0, W, H);
    for (let k = -4; k <= 4; k++) {
      const x0 = 32 + k * 5 * YD - 2.5 * YD;
      g.fillStyle = (k % 2 === 0) ? '#2d6a3a' : '#296235';
      g.fillRect(X(x0), Z(-11), 5 * YD * m + 1, 22 * m);
    }
    speckle(g, W, H, ['rgba(0,0,0,.10)', 'rgba(120,200,120,.06)', 'rgba(20,60,25,.25)'], 60000, 1, 3);
    g.fillStyle = '#e8eee5';
    g.fillRect(0, Z(-11) - 0.1 * m, W, 0.2 * m); g.fillRect(0, Z(11) - 0.1 * m, W, 0.2 * m);
    for (let k = -3; k <= 3; k++) { const x = 32 + k * 5 * YD; g.fillRect(X(x) - 0.06 * m, Z(-11), 0.12 * m, 22 * m); }
    for (let y = -15; y <= 15; y++) {
      if (y % 5 === 0) continue;
      const x = X(32 + y * YD);
      [[-10.7, -10.1], [-3.2, -2.7], [2.7, 3.2], [10.1, 10.7]].forEach(([a, b]) => g.fillRect(x - 0.05 * m, Z(a), 0.1 * m, (b - a) * m));
    }
    g.font = `900 ${Math.round(1.9 * m)}px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const nums = [[-10, '4 0'], [0, '5 0'], [10, '4 0']];
    nums.forEach(([yd, txt]) => {
      const x = X(32 + yd * YD);
      g.save(); g.translate(x, Z(8.2)); g.fillText(txt, 0, 0); g.restore();
      g.save(); g.translate(x, Z(-8.2)); g.rotate(Math.PI); g.fillText(txt, 0, 0); g.restore();
    });
    // midfield logo
    g.save(); g.translate(X(32), Z(0));
    g.fillStyle = '#b02a22'; g.beginPath(); g.arc(0, 0, 2.3 * m, 0, TAU); g.fill();
    g.strokeStyle = '#e2b04a'; g.lineWidth = 0.22 * m; g.beginPath(); g.arc(0, 0, 2.05 * m, 0, TAU); g.stroke();
    g.fillStyle = '#f2ecdc'; g.font = `900 ${Math.round(2.6 * m)}px ${FONT_DISPLAY}`; g.fillText('B', 0, 0.12 * m);
    g.restore();
    // sideline team text
    g.fillStyle = 'rgba(232,238,229,.85)'; g.font = `900 ${Math.round(1.1 * m)}px ${FONT_DISPLAY}`;
    g.save(); g.translate(X(32), Z(12.6)); g.fillText('B A Y   C I T Y   B R U I S E R S', 0, 0); g.restore();
  }, { repeat: false });

  TEX.glow = canvasTexture(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,205,90,.85)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(w / 2 - 1, 6, 2, h - 12); g.fillRect(6, h / 2 - 1, w - 12, 2);
  }, { repeat: false });
  TEX.shadow = canvasTexture(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { repeat: false });
  TEX.rain = canvasTexture(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1a2c'); gr.addColorStop(1, '#14263a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(170,200,230,.35)'; g.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, l = 10 + Math.random() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + l); g.stroke(); }
  });
  TEX.footprint = canvasTexture(64, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(30,20,15,.85)';
    g.beginPath(); g.ellipse(w / 2, h * .3, w * .36, h * .26, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w / 2, h * .78, w * .3, h * .17, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0)'; g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) { g.fillRect(w * .2, h * (.12 + i * .06), w * .6, 3); }
    for (let i = 0; i < 3; i++) { g.fillRect(w * .26, h * (.7 + i * .06), w * .48, 3); }
  }, { repeat: false });
  TEX.spill = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(w / 2 + (Math.random() - .5) * 50, h / 2 + (Math.random() - .5) * 40, 10 + Math.random() * 26, 8 + Math.random() * 18, Math.random() * 3, 0, TAU); g.fill(); }
  }, { repeat: false });
  TEX.drag = canvasTexture(64, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,22,15,.55)'; g.lineWidth = 5;
    for (const x of [w * .3, w * .7]) { g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + (Math.random() - .5) * 4, y); g.stroke(); }
    speckle(g, w, h, ['rgba(40,30,20,.35)'], 200, 1, 3);
  }, { repeat: false });
}

function signTexture(text, o = {}) {
  const w = o.w || 512, h = o.h || 128;
  return canvasTexture(w, h, (g) => {
    g.fillStyle = o.bg || '#16191e'; g.fillRect(0, 0, w, h);
    if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, h - 10, w, 10); }
    g.fillStyle = o.fg || '#f0e9d8';
    g.font = `${o.weight || 900} ${o.size || Math.round(h * 0.56)}px ${o.font || FONT_DISPLAY}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.spacing) { try { g.letterSpacing = o.spacing + 'px'; } catch (e) { /* older canvas */ } }
    const lines = String(text).split('\n');
    const lh = (o.size || h * 0.56) * 1.05;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh + (o.dy || 0)));
  }, { repeat: false });
}

function boardTexture(title, lines, o = {}) {
  const w = o.w || 512, h = o.h || 256;
  return canvasTexture(w, h, (g) => {
    g.fillStyle = o.bg || '#f3f3ee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = o.border || '#9aa0a6'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
    g.fillStyle = o.titleColor || '#b02a22';
    g.font = `900 ${o.titleSize || 34}px ${FONT_DISPLAY}`; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(title, 22, 16);
    g.fillStyle = o.fg || '#20242a';
    g.font = `${o.lineSize || 22}px ${o.font || FONT_FILE}`;
    textLines(g, lines, 22, 16 + (o.titleSize || 34) + 14, (o.lineSize || 22) * 1.35);
  }, { repeat: false });
}

function playTexture(o = {}) {
  // An X's and O's play diagram, used for whiteboards and the film-room screen.
  const w = o.w || 512, h = o.h || 288;
  return canvasTexture(w, h, (g) => {
    g.fillStyle = o.bg || '#0f2a1a'; g.fillRect(0, 0, w, h);
    const ink = o.ink || '#e9f2ea';
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * h / 6); g.lineTo(w, i * h / 6); g.stroke(); }
    g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3;
    const los = h * 0.62;
    g.setLineDash([6, 6]); g.beginPath(); g.moveTo(20, los); g.lineTo(w - 20, los); g.stroke(); g.setLineDash([]);
    const ol = [-2, -1, 0, 1, 2].map(k => w / 2 + k * 34);
    ol.forEach(x => { g.beginPath(); g.arc(x, los + 22, 12, 0, TAU); g.stroke(); });
    // tight end, highlighted
    g.fillStyle = o.hi || '#e6b450'; g.beginPath(); g.arc(w / 2 + 3 * 34, los + 22, 13, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.font = `900 14px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('85', w / 2 + 3 * 34, los + 23);
    g.fillStyle = ink; g.strokeStyle = ink;
    [[w / 2, los + 64], [w / 2 - 150, los + 22], [w / 2 + 170, los + 22]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, TAU); g.stroke(); });
    // defense
    g.lineWidth = 3;
    [[-120, -40], [-60, -50], [0, -48], [60, -50], [120, -40], [-170, -95], [170, -95], [0, -130]].forEach(([dx, dy]) => {
      const x = w / 2 + dx, y = los + dy; g.beginPath(); g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); g.stroke();
    });
    // routes
    g.strokeStyle = o.hi || '#e6b450'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2 + 102, los + 8); g.lineTo(w / 2 + 102, los - 70); g.lineTo(w / 2 + 70, los - 92); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2 - 150, los + 8); g.lineTo(w / 2 - 150, los - 140); g.stroke();
    g.beginPath(); g.moveTo(w / 2 + 170, los + 8); g.lineTo(w / 2 + 170, los - 60); g.lineTo(w / 2 + 230, los - 110); g.stroke();
    g.fillStyle = ink; g.font = `900 ${o.titleSize || 24}px ${FONT_DISPLAY}`; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(o.title || 'RED RIGHT 85 Y-STICK', 16, 12);
  }, { repeat: false });
}

function numberTexture(num, fg, outline) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = `900 ${String(num).length > 2 ? 56 : 92}px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 9; g.strokeStyle = outline; g.strokeText(num, w / 2, h / 2 + 4);
    g.fillStyle = fg; g.fillText(num, w / 2, h / 2 + 4);
  }, { repeat: false });
}

function tagTexture(name, role, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = `900 52px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const tw = Math.min(w - 20, Math.max(g.measureText(name).width, 200) + 44);
    g.fillStyle = 'rgba(10,13,18,.78)';
    const x0 = (w - tw) / 2;
    g.beginPath(); g.roundRect ? g.roundRect(x0, 8, tw, 112, 14) : g.rect(x0, 8, tw, 112); g.fill();
    g.fillStyle = color || '#e6b450'; g.fillRect(x0, 8, 8, 112);
    g.fillStyle = '#f0e9d8'; g.fillText(name.toUpperCase(), w / 2 + 4, 62);
    g.font = `600 26px ${FONT_BODY}`; g.fillStyle = '#c9cfd6'; g.fillText(role.toUpperCase(), w / 2 + 4, 100);
  }, { repeat: false });
}
