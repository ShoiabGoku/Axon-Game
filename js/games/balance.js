/* BALANCE — every scale is level, so each one is a linear equation between shape weights.
   Shapes are introduced one scale at a time; the final question asks how many of one shape balance
   a mixed pan. Uniqueness: every positive weight assignment (up to 12) satisfying all scales is
   enumerated and must give the same answer. */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'balance', name: 'Balance', title: 'Balance Scales', domain: 'numeric', kind: 'trial',
  icon: 'balance', tagline: 'Weigh it up',
  howTo: [
    'Every scale shown is perfectly balanced: both pans weigh the same.',
    'Identical shapes always weigh the same. Work out how they compare.',
    'Then answer: how many of the asked-for shape would balance the last scale?',
  ],
  time: L => 45 + 11 * L,
  guess: () => 0,
};

const SH = ['circle', 'square', 'triangle', 'star', 'hex'];
const SH_COL = ['#38e1ff', '#ffc54d', '#ff5fa8', '#4cf3a3', '#9d7bff'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const total = (items, w) => items.reduce((s, i) => s + w[i], 0);

export function shapeIcon(i, x, y, r = 9) {
  const c = SH_COL[i], st = 'stroke="#070a1c" stroke-width="1.4"';
  switch (i) {
    case 0: return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st}/>`;
    case 1: return `<rect x="${x - r * 0.9}" y="${y - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" rx="2" fill="${c}" ${st}/>`;
    case 2: return `<polygon points="${x},${y - r * 1.05} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}" fill="${c}" ${st} stroke-linejoin="round"/>`;
    case 3: {
      const pts = range(0, 9).map(k => { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r * 1.08; return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`; }).join(' ');
      return `<polygon points="${pts}" fill="${c}" ${st} stroke-linejoin="round"/>`;
    }
    default: {
      const pts = range(0, 5).map(k => { const a = k * Math.PI / 3; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
      return `<polygon points="${pts}" fill="${c}" ${st} stroke-linejoin="round"/>`;
    }
  }
}
const icon = i => `<svg viewBox="-12 -12 24 24" class="bl-i">${shapeIcon(i, 0, 0, 9)}</svg>`;

const LEVEL = {
  1: { k: 2, qItems: [2, 3] }, 2: { k: 2, qItems: [2, 4] }, 3: { k: 3, qItems: [2, 3] },
  4: { k: 3, qItems: [3, 4] }, 5: { k: 3, qItems: [3, 4], mixed: true }, 6: { k: 3, qItems: [3, 5], mixed: true },
  7: { k: 4, qItems: [3, 4], mixed: true }, 8: { k: 4, qItems: [3, 5], mixed: true },
  9: { k: 4, qItems: [4, 5], mixed: true, altTarget: true }, 10: { k: 5, qItems: [4, 5], mixed: true, altTarget: true },
};

/** all multisets of `pool` indices with size between 1 and maxN, as arrays */
function multisets(pool, maxN) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push(cur.slice());
    if (cur.length === maxN) return;
    for (let i = start; i < pool.length; i++) { cur.push(pool[i]); rec(i, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

export function checkBalance(k, scales, q) {
  // enumerate weights 1..12 per shape that satisfy every scale (each scale is tested as soon as
  // all of its shapes have a weight); collect the question's answer for every survivor
  const answers = new Set();
  const byMax = range(0, k - 1).map(() => []);
  for (const s of scales) byMax[Math.max(...s.L, ...s.R)].push(s);
  const w = new Array(k).fill(1);
  const rec = i => {
    if (i === k) {
      const t = total(q.L, w);
      answers.add(t % w[q.target] === 0 ? t / w[q.target] : 'frac');
      return;
    }
    for (let x = 1; x <= 12; x++) {
      w[i] = x;
      if (byMax[i].every(s => total(s.L, w) === total(s.R, w))) rec(i + 1);
    }
  };
  rec(0);
  return answers;
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  const k = cfg.k;
  for (let attempt = 0; attempt < 400; attempt++) {
    const shapes = rng.sample(range(0, 4), k);                 // icon per weight slot
    let w = rng.sample(range(1, L <= 3 ? 6 : 9), k).sort((a, b) => a - b);
    if (rng.chance(0.5)) w = [w[0], ...rng.shuffle(w.slice(1))];
    const g = w.reduce(gcd);
    w = w.map(x => x / g);
    const scales = [];
    let ok = true;
    for (let i = 1; i < k && ok; i++) {
      const known = range(0, i - 1);
      const opts = [];
      for (let a = 1; a <= 3; a++) {
        const lefts = [new Array(a).fill(i)];
        if (cfg.mixed) for (const extra of known) lefts.push([...new Array(a).fill(i), extra]);
        for (const Lm of lefts) {
          const need = total(Lm, w);
          for (const R of multisets(known, 5)) {
            if (total(R, w) !== need) continue;
            if (Lm.length + R.length > 7) continue;
            if (Lm.some(x => R.includes(x))) continue;
            opts.push({ L: Lm, R });
          }
        }
      }
      if (!opts.length) { ok = false; break; }
      // prefer compact equations
      opts.sort((x, y) => (x.L.length + x.R.length) - (y.L.length + y.R.length));
      const pickd = rng.pick(opts.slice(0, Math.max(3, Math.ceil(opts.length / 3))));
      scales.push(rng.chance(0.5) ? pickd : { L: pickd.R, R: pickd.L });
    }
    if (!ok) continue;
    // question
    const target = cfg.altTarget && rng.chance(0.5) ? rng.int(0, k - 1) : 0;
    let q = null;
    for (let t = 0; t < 60 && !q; t++) {
      const n = rng.int(cfg.qItems[0], cfg.qItems[1]);
      const items = range(1, n).map(() => rng.int(0, k - 1));
      if (!items.some(x => x !== target)) continue;
      if (k >= 3 && !items.some(x => x === k - 1)) items[0] = k - 1;
      const tot = total(items, w);
      if (tot % w[target] || tot / w[target] < 2 || tot / w[target] > 24) continue;
      q = { L: items.sort((a, b) => b - a), target, answer: tot / w[target] };
    }
    if (!q) continue;
    // never ask something a scale already shows outright
    const same = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
    if (scales.some(s => same(s.L, q.L) || same(s.R, q.L))) continue;
    const A = checkBalance(k, scales, q);
    if (A.size !== 1 || !A.has(q.answer)) continue;
    return {
      game: 'balance', level: L, k, shapes, weights: w, scales, q, answer: q.answer,
      explain: explain(shapes, w, scales, q),
    };
  }
  throw new Error('balance: generation failed');
}

function pan(items, shapes) { return items.map(i => icon(shapes[i])).join(''); }
function explain(shapes, w, scales, q) {
  const unit = q.target;
  let html = `<p>Give each shape a weight that makes every scale balance — for example ${shapes.map((s, i) => `${icon(s)}&nbsp;=&nbsp;<b>${w[i]}</b>`).join(', ')}:</p><ul class="rules ticks">`;
  html += scales.map((s, j) => `<li>Scale ${j + 1}: ${pan(s.L, shapes)} = ${s.L.map(i => w[i]).join(' + ')} = <b>${total(s.L, w)}</b>, and ${pan(s.R, shapes)} = ${s.R.map(i => w[i]).join(' + ')} = <b>${total(s.R, w)}</b></li>`).join('');
  html += '</ul>';
  const tot = total(q.L, w);
  html += `<p>Last scale: ${pan(q.L, shapes)} = ${q.L.map(i => w[i]).join(' + ')} = <b>${tot}</b>. Each ${icon(shapes[unit])} weighs ${w[unit]}, so it takes ${tot} ÷ ${w[unit]} = <b>${q.answer}</b>.</p>`;
  return html;
}

/* ------------------------------------------------ drawing */
function stack(items, shapes, cx, baseY) {
  // rows of up to 4, stacked bottom-up on the pan
  let s = '';
  const per = 4, r = 10;
  items.forEach((it, j) => {
    const row = Math.floor(j / per), col = j % per;
    const inRow = Math.min(per, items.length - row * per);
    const x = cx + (col - (inRow - 1) / 2) * 21.5;
    const y = baseY - r - 1 - row * 19.5;
    s += shapeIcon(shapes[it], x, y, r);
  });
  return s;
}
/** a compact, level balance: pans are wide enough for four shapes per row */
export function scaleSVG(s, shapes, question = false, qShape = 0) {
  const right = question
    ? `<text x="178" y="88" text-anchor="middle" font-size="22" font-weight="800" fill="#ffc54d" font-family="Orbitron, sans-serif">?×</text>${shapeIcon(shapes[qShape], 210, 80, 10)}`
    : stack(s.R, shapes, 190, 92);
  return `<svg viewBox="0 0 240 122" class="bl-scale ${question ? 'q' : ''}">
    <polygon points="120,30 107,112 133,112" fill="#1b2150" stroke="#38e1ff" stroke-opacity=".35" stroke-width="1.3"/>
    <rect x="90" y="110" width="60" height="8" rx="4" fill="#1b2150"/>
    <line x1="40" y1="30" x2="200" y2="30" stroke="#cfd7ff" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="120" cy="30" r="4.5" fill="#38e1ff"/>
    <line x1="50" y1="30" x2="10" y2="92" stroke="#7f88b8" stroke-width="1.1"/><line x1="50" y1="30" x2="90" y2="92" stroke="#7f88b8" stroke-width="1.1"/>
    <line x1="190" y1="30" x2="150" y2="92" stroke="#7f88b8" stroke-width="1.1"/><line x1="190" y1="30" x2="230" y2="92" stroke="#7f88b8" stroke-width="1.1"/>
    <path d="M4 92 H96 Q90 102 50 102 Q10 102 4 92 Z" fill="#20285e" stroke="#cfd7ff" stroke-opacity=".5"/>
    <path d="M144 92 H236 Q230 102 190 102 Q150 102 144 92 Z" fill="#20285e" stroke="#cfd7ff" stroke-opacity=".5"/>
    ${stack(s.L, shapes, 50, 92)}${right}
  </svg>`;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  ui.stage.innerHTML = `<div class="bl-wrap">${p.scales.map((s, j) => `<figure class="bl-fig"><figcaption>${j + 1}</figcaption>${scaleSVG(s, p.shapes)}</figure>`).join('')}
    <figure class="bl-fig q"><figcaption>?</figcaption>${scaleSVG(p.q, p.shapes, true, p.q.target)}</figure></div>
    <p class="prompt">How many ${icon(p.shapes[p.q.target])} balance the last scale?</p>`;
  ui.keypad({ maxLen: 3, neg: false });
}
export function grade(p, r) { const ok = Number(r) === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-big">${p.answer} ${icon(p.shapes[p.q.target])}</div>`; }
