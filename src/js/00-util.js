// ===== Utilities ============================================================
const V3 = THREE.Vector3;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const FONT_DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
const FONT_FILE = '"Special Elite", "Courier New", monospace';
const FONT_BODY = '"Barlow", "Segoe UI", system-ui, sans-serif';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }
function ordinal(n) { return ['1st', '2nd', '3rd', '4th'][n - 1] || n + 'th'; }

const store = {
  get(k, d) { try { const v = localStorage.getItem('suddendeath_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('suddendeath_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};

const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
const REDUCED_MOTION = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Sound (all synthesized) ==============================================
const Sound = (() => {
  let ctx = null, master = null, rainGain = null, nb = null;
  let muted = !!store.get('muted', false);
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.35;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
      rainGain = ctx.createGain(); rainGain.gain.value = 0.045;
      src.connect(bp); bp.connect(lp); lp.connect(rainGain); rainGain.connect(master); src.start();
    } catch (e) { ctx = null; }
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(freq, dur, o = {}) {
    if (!ctx) return;
    const t = now() + (o.when || 0);
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = ctx.createGain(); env(g, t, o.attack || 0.01, o.vol || 0.2, dur);
    let node = osc;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); node = f; }
    node.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o = {}) {
    if (!ctx) return;
    const t = now() + (o.when || 0);
    const src = ctx.createBufferSource(); src.buffer = nb;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 800, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
    f.Q.value = o.q || 0.7;
    const g = ctx.createGain(); env(g, t, o.attack || 0.005, o.vol || 0.3, dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 1.2); src.stop(t + dur + 0.05);
  }
  return {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = m; store.set('muted', m); if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, now(), 0.05); },
    thunder(delay = 0.4) { noise(3.2, { when: delay, freq: 220, freqEnd: 50, vol: 0.55, attack: 0.04 }); noise(0.8, { when: delay, freq: 1200, freqEnd: 200, vol: 0.16 }); },
    step() { noise(0.06, { freq: 420 + Math.random() * 260, type: 'bandpass', q: 1.4, vol: 0.06 }); },
    click() { tone(880, 0.05, { type: 'square', vol: 0.025, filter: 2400 }); },
    clue() { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.38, { type: 'triangle', vol: 0.12, when: i * 0.09 })); },
    stamp() { noise(0.12, { freq: 320, vol: 0.3 }); tone(110, 0.16, { vol: 0.22 }); },
    pickup() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.26, { vol: 0.1, when: i * 0.07 })); },
    talk() { tone(330, 0.08, { type: 'triangle', vol: 0.05 }); tone(440, 0.08, { type: 'triangle', vol: 0.05, when: 0.07 }); },
    whistle() { tone(2900, 0.55, { vol: 0.09 }); tone(3080, 0.55, { vol: 0.05 }); tone(2900, 0.2, { vol: 0.09, when: 0.65 }); },
    block() { noise(0.2, { freq: 240, vol: 0.5 }); tone(72, 0.22, { vol: 0.38, slide: 38 }); },
    thud() { noise(0.25, { freq: 160, vol: 0.32 }); },
    fail() { tone(233, 0.6, { type: 'sawtooth', vol: 0.08, slide: 110, filter: 900 }); tone(175, 0.8, { type: 'sawtooth', vol: 0.06, slide: 90, filter: 700, when: 0.25 }); },
    cheer() {
      noise(2.6, { type: 'bandpass', freq: 1100, q: 0.5, vol: 0.26, attack: 0.35 });
      noise(2.2, { type: 'bandpass', freq: 2300, q: 0.8, vol: 0.12, attack: 0.3, when: 0.2 });
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, { type: 'square', vol: 0.045, when: 0.1 + i * 0.12, filter: 2200 }));
    },
    pop() { noise(1.5, { type: 'bandpass', freq: 1500, q: 0.6, vol: 0.24, attack: 0.08 }); },
    riff() {
      const n = [82.4, 82.4, 98, 82.4, 110, 103.8, 98, 73.4, 82.4, 82.4, 98, 82.4, 123.5, 110, 98, 110];
      n.forEach((f, i) => {
        tone(f, 0.17, { type: 'sawtooth', vol: 0.085, when: i * 0.15, filter: 1100 });
        tone(f * 1.5, 0.17, { type: 'sawtooth', vol: 0.055, when: i * 0.15, filter: 1100 });
        if (i % 2 === 0) noise(0.05, { when: i * 0.15, freq: 5000, type: 'highpass', vol: 0.04 });
        if (i % 4 === 0) tone(60, 0.12, { vol: 0.25, when: i * 0.15, slide: 40 });
      });
    },
    setRain(v) { if (rainGain) rainGain.gain.setTargetAtTime(v, now(), 0.6); }
  };
})();
