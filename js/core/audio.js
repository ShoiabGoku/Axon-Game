/* Sound: every effect is synthesised once into an AudioBuffer and played from sample 0
   (scheduling envelopes against currentTime made first clicks silent on this platform before).
   Music is a pre-rendered 32-second ambient loop. Also: speech and haptics. */

import { S } from './store.js';

let ctx = null, master = null, sfxBus = null, musicBus = null;
const buffers = {};
const toneCache = {};
let musicBuf = null, musicSrc = null, musicWanted = false, rendering = false;

export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    applyVolumes();
    buildSfx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (S.settings.music > 0 && !musicSrc) startMusic();
}
export function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = S.settings.sfx;
  musicBus.gain.value = S.settings.music * 0.55;
  if (S.settings.music > 0 && !musicSrc && ctx) startMusic();
  if (S.settings.music === 0) stopMusic();
}

/* ------------------------------------------------ synthesis into arrays */
function render(dur, fill, channels = 1, rate = 0) {
  const sr = rate || ctx.sampleRate, n = Math.ceil(dur * sr);
  const b = ctx.createBuffer(channels, n, sr);
  const data = [];
  for (let c = 0; c < channels; c++) data.push(b.getChannelData(c));
  fill(channels === 1 ? data[0] : data, sr);
  return b;
}
function tone(d, sr, { f, t0 = 0, dur, amp = 0.3, type = 'sine', attack = 0.004, f2 = null, tail = 5 }) {
  const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
  let ph = 0;
  for (let i = 0; i < n && i0 + i < d.length; i++) {
    const t = i / sr;
    const fr = f2 ? f * Math.pow(f2 / f, t / dur) : f;
    ph += (2 * Math.PI * fr) / sr;
    let s;
    if (type === 'sine') s = Math.sin(ph);
    else if (type === 'tri') s = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else if (type === 'square') s = 0.8 * (Math.sin(ph) + Math.sin(3 * ph) / 3 + Math.sin(5 * ph) / 5 + Math.sin(7 * ph) / 7);
    else if (type === 'bell') s = Math.sin(ph) + 0.45 * Math.sin(2.76 * ph) * Math.exp(-t * 9) + 0.22 * Math.sin(5.4 * ph) * Math.exp(-t * 16);
    else s = Math.sin(ph) + 0.35 * Math.sin(4 * ph) * Math.exp(-t * 30);          // marimba-ish
    const env = (t < attack ? t / attack : 1) * Math.exp(-Math.max(0, t - attack) * (tail / dur));
    d[i0 + i] += s * env * amp;
  }
}
function noise(d, sr, { t0 = 0, dur, amp = 0.2, from = 0.05, to = 0.6 }) {
  const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
  let y = 0;
  for (let i = 0; i < n && i0 + i < d.length; i++) {
    const t = i / n;
    const k = from + (to - from) * t;                    // one-pole low-pass coefficient sweep
    y += k * ((Math.random() * 2 - 1) - y);
    const env = Math.sin(Math.PI * t) ** 2;
    d[i0 + i] += y * env * amp;
  }
}
const N = s => 440 * Math.pow(2, (s - 9) / 12);    // semitones from C4… (s=12 → C5)

function buildSfx() {
  const B = (name, dur, fn) => { buffers[name] = render(dur, fn); };
  B('tap', 0.06, (d, sr) => { tone(d, sr, { f: 1250, dur: 0.05, amp: 0.18 }); noise(d, sr, { dur: 0.02, amp: 0.05, from: 0.4, to: 0.8 }); });
  B('select', 0.1, (d, sr) => tone(d, sr, { f: 880, f2: 1046, dur: 0.09, amp: 0.2, type: 'tri' }));
  B('pop', 0.1, (d, sr) => tone(d, sr, { f: 1046, f2: 1320, dur: 0.08, amp: 0.22, type: 'sine' }));
  B('correct', 0.7, (d, sr) => { [N(24), N(28), N(31)].forEach((f, i) => tone(d, sr, { f, t0: i * 0.075, dur: 0.5, amp: 0.17, type: 'bell' })); });
  B('wrong', 0.45, (d, sr) => { tone(d, sr, { f: 233, f2: 196, dur: 0.22, amp: 0.13, type: 'square' }); tone(d, sr, { f: 175, f2: 147, t0: 0.12, dur: 0.3, amp: 0.13, type: 'square' }); });
  B('tick', 0.04, (d, sr) => tone(d, sr, { f: 1900, dur: 0.025, amp: 0.13 }));
  B('tickHi', 0.05, (d, sr) => tone(d, sr, { f: 2500, dur: 0.035, amp: 0.2 }));
  B('whoosh', 0.4, (d, sr) => noise(d, sr, { dur: 0.36, amp: 0.22, from: 0.02, to: 0.35 }));
  [0, 1, 2].forEach(i => B('star' + i, 0.9, (d, sr) => { tone(d, sr, { f: N(24 + [0, 4, 7][i]), dur: 0.8, amp: 0.22, type: 'bell' }); tone(d, sr, { f: N(36 + [0, 4, 7][i]), t0: 0.03, dur: 0.5, amp: 0.07, type: 'bell' }); }));
  B('levelup', 1.6, (d, sr) => { [12, 16, 19, 24, 28, 31, 36].forEach((s, i) => tone(d, sr, { f: N(s + 12), t0: i * 0.075, dur: 1.0, amp: 0.13, type: 'bell' })); noise(d, sr, { t0: 0.45, dur: 1.0, amp: 0.05, from: 0.5, to: 0.9 }); });
  B('unlock', 0.8, (d, sr) => { noise(d, sr, { dur: 0.05, amp: 0.25, from: 0.5, to: 0.9 }); tone(d, sr, { f: N(31), t0: 0.06, dur: 0.6, amp: 0.2, type: 'bell' }); tone(d, sr, { f: N(36), t0: 0.14, dur: 0.6, amp: 0.15, type: 'bell' }); });
  B('achieve', 1.0, (d, sr) => { tone(d, sr, { f: N(28), dur: 0.8, amp: 0.2, type: 'bell' }); tone(d, sr, { f: N(33), t0: 0.12, dur: 0.8, amp: 0.2, type: 'bell' }); tone(d, sr, { f: N(40), t0: 0.24, dur: 0.7, amp: 0.12, type: 'bell' }); });
  B('count', 0.16, (d, sr) => tone(d, sr, { f: 660, dur: 0.14, amp: 0.2, type: 'tri' }));
  B('go', 0.4, (d, sr) => { tone(d, sr, { f: 990, dur: 0.32, amp: 0.2, type: 'tri' }); tone(d, sr, { f: 1320, dur: 0.32, amp: 0.1, type: 'sine' }); });
  B('lose', 0.8, (d, sr) => tone(d, sr, { f: 440, f2: 196, dur: 0.7, amp: 0.16, type: 'tri' }));
  B('combo', 0.16, (d, sr) => tone(d, sr, { f: 660, f2: 1320, dur: 0.13, amp: 0.15, type: 'tri' }));
  B('open', 0.3, (d, sr) => { tone(d, sr, { f: 520, f2: 780, dur: 0.18, amp: 0.12, type: 'tri' }); noise(d, sr, { dur: 0.2, amp: 0.06 }); });
}

export function sfx(name) {
  if (!ctx || !buffers[name] || S.settings.sfx <= 0) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.connect(sfxBus);
  src.start();
}
/** pentatonic-ish note for memory games; semitone offset from C5 */
export function playTone(k) {
  if (!ctx || S.settings.sfx <= 0) return;
  if (!toneCache[k]) toneCache[k] = render(0.45, (d, sr) => tone(d, sr, { f: N(12 + k), dur: 0.42, amp: 0.22, type: 'mallet' }));
  const src = ctx.createBufferSource();
  src.buffer = toneCache[k];
  src.connect(sfxBus);
  src.start();
}

/* ------------------------------------------------ ambient music loop */
function renderMusic() {
  const LOOP = 32, TAIL = 4;
  const chords = [[45, 52, 55, 59, 60], [41, 48, 52, 57, 60], [48, 55, 59, 62, 64], [43, 50, 55, 57, 62]];     // Am9 Fmaj9 Cmaj7 G6
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return render(LOOP + TAIL, (ch, sr) => {
    const [L, R] = ch;
    const pad = (f, t0, dur, amp, pan) => {
      const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
      let p1 = 0, p2 = 0;
      for (let i = 0; i < n && i0 + i < L.length; i++) {
        const t = i / sr;
        p1 += (2 * Math.PI * f * 1.0015) / sr; p2 += (2 * Math.PI * f * 0.9985) / sr;
        const env = Math.min(1, t / 2.6) * Math.min(1, (dur - t) / 2.6);
        const s = (Math.sin(p1) + Math.sin(p2) + 0.18 * Math.sin(2 * p1)) * env * amp;
        L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
      }
    };
    chords.forEach((c, ci) => {
      const t0 = ci * 8;
      c.forEach((m, k) => pad(midi(m), t0, 10.5, 0.028, k % 2 ? 0.35 : 0.65));
      pad(midi(c[0] - 12), t0, 10.5, 0.05, 0.5);
    });
    // soft shimmer arpeggio with a ping-pong echo
    const arpL = new Float32Array(L.length), arpR = new Float32Array(L.length);
    for (let s = 0; s < LOOP / 0.5; s++) {
      if (rnd() < 0.42) continue;
      const c = chords[Math.floor((s * 0.5) / 8) % 4];
      const m = c[1 + Math.floor(rnd() * 4)] + 12 + (rnd() < 0.3 ? 12 : 0);
      const f = midi(m), i0 = Math.floor(s * 0.5 * sr), n = Math.floor(1.6 * sr);
      let ph = 0;
      const pan = rnd();
      for (let i = 0; i < n && i0 + i < L.length; i++) {
        const t = i / sr;
        ph += (2 * Math.PI * f) / sr;
        const v = (Math.sin(ph) + 0.3 * Math.sin(2.76 * ph) * Math.exp(-t * 6)) * Math.exp(-t * 2.6) * Math.min(1, t / 0.01) * 0.035;
        arpL[i0 + i] += v * (1 - pan); arpR[i0 + i] += v * pan;
      }
    }
    const dl = Math.floor(0.375 * sr);
    for (let i = dl; i < L.length; i++) { arpL[i] += arpR[i - dl] * 0.38; arpR[i] += arpL[i - dl] * 0.38; }
    for (let i = 0; i < L.length; i++) { L[i] += arpL[i]; R[i] += arpR[i]; }
    // fold the tail back onto the start for a seamless loop
    const n = Math.floor(LOOP * sr);
    for (let i = n; i < L.length; i++) { L[i - n] += L[i]; R[i - n] += R[i]; }
  }, 2, 22050);      // pads and bells sit well below 11 kHz, so half rate halves the render cost
}
export function startMusic() {
  musicWanted = true;
  if (!ctx || musicSrc || rendering) return;
  if (!musicBuf) {
    rendering = true;
    setTimeout(() => {
      try { musicBuf = renderMusic(); } catch { musicBuf = null; }
      rendering = false;
      if (musicWanted) startMusic();
    }, 400);
    return;
  }
  musicSrc = ctx.createBufferSource();
  musicSrc.buffer = musicBuf;
  musicSrc.loop = true;
  musicSrc.loopEnd = 32;
  musicSrc.connect(musicBus);
  musicSrc.start();
}
export function stopMusic() {
  musicWanted = false;
  if (musicSrc) { try { musicSrc.stop(); } catch { /* already stopped */ } musicSrc = null; }
}

/* ------------------------------------------------ speech + haptics */
export function speak(text) {
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.0; u.volume = Math.min(1, S.settings.sfx + 0.2);
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
const PATTERNS = { tap: 8, good: 18, bad: [30, 40, 30], win: [20, 40, 20, 40, 70], lose: [80] };
export function buzz(kind) {
  if (!S.settings.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[kind] || 10); } catch { /* ignore */ }
}
export const audioReady = () => !!ctx;
