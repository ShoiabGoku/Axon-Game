/* Visual effects: the living neural-network background (nodes drift, signals travel along
   connections and set off chain reactions) and an overlay for bursts, rings and confetti. */

import { S } from './store.js';

const PALETTE = ['#38e1ff', '#9d7bff', '#ff5fa8', '#4cf3a3', '#ffc54d'];
let bg, bctx, ov, octx, W = 0, H = 0, DPR = 1;
let nodes = [], pulses = [], parts = [], rings = [];
let rafBg = 0, rafOv = 0, lastBg = 0, spawnT = 0;
let mood = null, calm = 0, calmTarget = 0;
const sprites = {};

function sprite(color) {
  if (sprites[color]) return sprites[color];
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  grd.addColorStop(0, color); grd.addColorStop(0.25, color + 'aa'); grd.addColorStop(1, color + '00');
  g.fillStyle = grd; g.fillRect(0, 0, 48, 48);
  return (sprites[color] = c);
}

export function initFX() {
  bg = document.getElementById('bg'); bctx = bg.getContext('2d');
  ov = document.getElementById('fx'); octx = ov.getContext('2d');
  resize();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(rafBg); else startBg(); });
  startBg();
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  for (const c of [bg, ov]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); c.style.width = W + 'px'; c.style.height = H + 'px'; }
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const target = Math.round(Math.min(90, Math.max(30, (W * H) / 17000)));
  while (nodes.length < target) nodes.push(newNode());
  nodes.length = target;
  if (S.settings.reduced) drawBg(0);
}
function newNode() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.11, vy: (Math.random() - 0.5) * 0.11,
    r: 0.8 + Math.random() * 1.7, c: PALETTE[Math.floor(Math.random() * PALETTE.length)], glow: 0,
  };
}

function neighbours(i, D) {
  const a = nodes[i], out = [];
  for (let j = 0; j < nodes.length; j++) {
    if (j === i) continue;
    const dx = nodes[j].x - a.x, dy = nodes[j].y - a.y;
    if (dx * dx + dy * dy < D * D) out.push(j);
  }
  return out;
}
function spawnPulse(from = -1, color = null) {
  const D = linkDist();
  const i = from >= 0 ? from : Math.floor(Math.random() * nodes.length);
  const nb = neighbours(i, D);
  if (!nb.length) return;
  const j = nb[Math.floor(Math.random() * nb.length)];
  pulses.push({ a: i, b: j, t: 0, v: 0.012 + Math.random() * 0.012, c: color || mood || nodes[i].c, gen: 0 });
}
const linkDist = () => Math.min(170, Math.max(110, Math.sqrt(W * H) / 7));

function drawBg(dt) {
  const D = linkDist();
  calm += (calmTarget - calm) * 0.05;
  bctx.clearRect(0, 0, W, H);
  const k = dt / 16.7;
  for (const n of nodes) {
    n.x += n.vx * k; n.y += n.vy * k;
    if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
    if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
    n.glow *= 0.94;
  }
  const lineA = 0.2 * (1 - calm * 0.55);
  bctx.lineWidth = 1;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 > D * D) continue;
      const al = (1 - Math.sqrt(d2) / D) * lineA;
      bctx.strokeStyle = `rgba(140,160,255,${al.toFixed(3)})`;
      bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(b.x, b.y); bctx.stroke();
    }
  }
  // signals
  for (let p = pulses.length - 1; p >= 0; p--) {
    const s = pulses[p];
    s.t += s.v * k;
    const a = nodes[s.a], b = nodes[s.b];
    if (!a || !b) { pulses.splice(p, 1); continue; }
    if (s.t >= 1) {
      b.glow = 1;
      pulses.splice(p, 1);
      if (s.gen < 5 && Math.random() < 0.55) {
        const nb = neighbours(s.b, D).filter(j => j !== s.a);
        if (nb.length) pulses.push({ a: s.b, b: nb[Math.floor(Math.random() * nb.length)], t: 0, v: s.v, c: s.c, gen: s.gen + 1 });
      }
      continue;
    }
    const x = a.x + (b.x - a.x) * s.t, y = a.y + (b.y - a.y) * s.t;
    const g = sprite(s.c);
    bctx.globalAlpha = 0.9 * (1 - calm * 0.5);
    bctx.drawImage(g, x - 9, y - 9, 18, 18);
    bctx.globalAlpha = 1;
  }
  for (const n of nodes) {
    const g = sprite(n.c);
    const s = 7 + n.r * 4 + n.glow * 22;
    bctx.globalAlpha = (0.35 + n.glow * 0.65) * (1 - calm * 0.45);
    bctx.drawImage(g, n.x - s / 2, n.y - s / 2, s, s);
  }
  bctx.globalAlpha = 1;
}

function startBg() {
  cancelAnimationFrame(rafBg);
  if (S.settings.reduced) { drawBg(0); return; }
  const loop = t => {
    const dt = Math.min(50, t - (lastBg || t));
    // 30 fps is plenty for ambience on small screens
    if (W > 700 || dt >= 30 || !lastBg) {
      lastBg = t;
      spawnT += dt;
      if (spawnT > 900) { spawnT = 0; if (pulses.length < 14) spawnPulse(); }
      drawBg(dt || 16.7);
    }
    rafBg = requestAnimationFrame(loop);
  };
  rafBg = requestAnimationFrame(loop);
}

/* ------------------------------------------------ public API */
export function setMood(color) { mood = color; }
export function setCalm(on) { calmTarget = on ? 1 : 0; }
export function fire(color, n = 6) {
  if (S.settings.reduced) return;
  for (let i = 0; i < n; i++) spawnPulse(-1, color);
  for (let i = 0; i < 4; i++) nodes[Math.floor(Math.random() * nodes.length)].glow = 1;
}

function startOv() {
  if (rafOv) return;
  let last = 0;
  const loop = t => {
    const dt = Math.min(40, t - (last || t)) / 16.7 || 1;
    last = t;
    octx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.decay * dt; p.rot += p.vr * dt;
      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      octx.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.kind === 'conf') {
        octx.save(); octx.translate(p.x, p.y); octx.rotate(p.rot);
        octx.fillStyle = p.c; octx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        octx.restore();
      } else {
        const g = sprite(p.c);
        octx.drawImage(g, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += 0.035 * dt;
      if (r.t >= 1) { rings.splice(i, 1); continue; }
      octx.globalAlpha = (1 - r.t) * 0.8;
      octx.strokeStyle = r.c; octx.lineWidth = 3 * (1 - r.t) + 1;
      octx.beginPath(); octx.arc(r.x, r.y, 12 + r.t * r.R, 0, Math.PI * 2); octx.stroke();
    }
    octx.globalAlpha = 1;
    if (parts.length || rings.length) rafOv = requestAnimationFrame(loop);
    else { rafOv = 0; octx.clearRect(0, 0, W, H); }
  };
  rafOv = requestAnimationFrame(loop);
}

export function burst(x, y, color = '#4cf3a3', n = 26) {
  if (S.settings.reduced) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: 0.12, drag: 0.95, life: 1, decay: 0.022 + Math.random() * 0.02, s: 3 + Math.random() * 5, c: color, rot: 0, vr: 0 });
  }
  rings.push({ x, y, t: 0, R: 90, c: color });
  startOv();
}
export function ring(x, y, color, R = 120) {
  if (S.settings.reduced) return;
  rings.push({ x, y, t: 0, R, c: color });
  startOv();
}
export function confetti(n = 140) {
  if (S.settings.reduced) return;
  const cols = ['#38e1ff', '#9d7bff', '#ff5fa8', '#4cf3a3', '#ffc54d', '#ff8a3d', '#ffffff'];
  for (let i = 0; i < n; i++) {
    parts.push({ kind: 'conf', x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 10, g: 0.28, drag: 0.985, life: 1.6, decay: 0.006 + Math.random() * 0.006, s: 7 + Math.random() * 7, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
  }
  startOv();
}
export function burstAt(el, color, n) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, n);
}
