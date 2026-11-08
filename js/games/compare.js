/* QUICK COMPARE — a numerical speed sprint: tap the larger of two expressions.
   Levels move from plain numbers to products, fractions, percentages, powers and roots, while the
   gap between the two values narrows. */

import { clamp } from '../core/rng.js';

export const meta = {
  id: 'compare', name: 'Quick Compare', title: 'Quick Compare', domain: 'speed', kind: 'sprint', selfTimed: true,
  icon: 'compare', tagline: 'Which is bigger? Fast!',
  howTo: [
    'Two values appear. Tap the BIGGER one (or press ← / →).',
    'They are never equal. Each pair has a short time limit.',
    'Estimate cleverly: you rarely need the exact answer.',
  ],
  time: () => 0,
  guess: () => 0.5,
};

const frac = (a, b) => `<span class="frac"><i>${a}</i><i>${b}</i></span>`;
const GEN = {
  1: r => { const a = r.int(10, 99); return [{ v: a, h: a }]; },
  2: r => { const a = r.int(2, 20), b = r.int(2, 20); return [{ v: a + b, h: `${a} + ${b}` }]; },
  3: r => { const a = r.int(2, 9), b = r.int(2, 9); return [{ v: a * b, h: `${a} × ${b}` }]; },
  4: r => { const a = r.int(3, 12), b = r.int(3, 9), c = r.int(1, 30); return r.chance(0.5) ? [{ v: a * b, h: `${a} × ${b}` }] : [{ v: a * b - c, h: `${a} × ${b} − ${c}` }]; },
  5: r => { const b = r.int(2, 9), a = r.int(1, b - 1); return [{ v: a / b, h: frac(a, b) }]; },
  6: r => { const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), y = r.int(2, 20) * 10; return r.chance(0.5) ? [{ v: (p * y) / 100, h: `${p}% of ${y}` }] : [{ v: Math.round((p * y) / 100 + r.int(-8, 8)), h: null }]; },
  7: r => { const k = r.int(0, 2); if (k === 0) { const a = r.int(2, 12); return [{ v: a * a, h: `${a}²` }]; } if (k === 1) { const a = r.int(2, 5); return [{ v: a ** 3, h: `${a}³` }]; } const a = r.int(3, 9); return [{ v: 2 ** a, h: `2<sup>${a}</sup>` }]; },
  8: r => { if (r.chance(0.5)) { const b = r.int(3, 12), a = r.int(1, b - 1); return [{ v: a / b, h: frac(a, b) }]; } const d = r.int(5, 95) / 100; return [{ v: d, h: d.toFixed(2).replace(/^0/, '0') }]; },
  9: r => { const a = r.int(4, 15), b = r.int(3, 12), c = r.int(2, 40); const plus = r.chance(0.5); return [{ v: plus ? a * b + c : a * b - c, h: `${a} × ${b} ${plus ? '+' : '−'} ${c}` }]; },
  10: r => { const k = r.int(0, 2); if (k === 0) { const a = r.int(10, 150); return [{ v: Math.sqrt(a), h: `√${a}` }]; } if (k === 1) { const a = r.int(2, 4), b = r.int(2, 6); return [{ v: a ** b, h: `${a}<sup>${b}</sup>` }]; } const a = r.int(2, 12); return [{ v: a + r.int(0, 9) / 10, h: null }]; },
};
const MARGIN = { 1: 0.08, 2: 0.06, 3: 0.05, 4: 0.05, 5: 0.06, 6: 0.05, 7: 0.04, 8: 0.04, 9: 0.03, 10: 0.03 };

function item(r, L) {
  const [x] = GEN[L](r);
  if (x.h === null) x.h = Number.isInteger(x.v) ? String(x.v) : x.v.toFixed(1);
  return x;
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const N = 20;
  const deadline = Math.round(3500 - 180 * L);
  const pairs = [];
  while (pairs.length < N) {
    const a = item(rng, L), b = item(rng, L);
    if (a.h === b.h) continue;
    const rel = Math.abs(a.v - b.v) / Math.max(Math.abs(a.v), Math.abs(b.v), 1e-9);
    if (rel < MARGIN[L] || rel > 0.45) continue;
    pairs.push({ a, b, big: a.v > b.v ? 0 : 1 });
  }
  return { game: 'compare', level: L, N, deadline, pairs, answer: null, explain: '' };
}

export function render(p, ui) {
  ui.stage.innerHTML = `<div class="qc-stage"><div class="qc-count"></div><div class="qc-bar"><i></i></div>
    <div class="qc-pair"><button class="qc-card" data-s="0"></button><span class="qc-vs">vs</span><button class="qc-card" data-s="1"></button></div></div>`;
  ui.answers.innerHTML = '<p class="muted center">Tap the bigger value</p>';
  const cards = [...ui.stage.querySelectorAll('.qc-card')];
  const bar = ui.stage.querySelector('.qc-bar i'), cnt = ui.stage.querySelector('.qc-count');
  let i = -1, hits = 0, misses = 0, timeouts = 0, active = false, shownAt = 0, timer = null;
  const rts = [];
  const next = () => {
    i++;
    if (i >= p.N) { active = false; ui.submit({ hits, misses, timeouts, total: p.N, rts }); return; }
    const pr = p.pairs[i];
    cards[0].innerHTML = pr.a.h; cards[1].innerHTML = pr.b.h;
    cards.forEach(c => { c.classList.remove('good', 'bad', 'pop'); void c.offsetWidth; c.classList.add('pop'); });
    cnt.textContent = `${i + 1} / ${p.N}`;
    bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)'; void bar.offsetWidth;
    bar.style.transition = `transform ${p.deadline}ms linear`; bar.style.transform = 'scaleX(0)';
    shownAt = performance.now(); active = true;
    timer = ui.later(() => { if (!active) return; active = false; misses++; timeouts++; cards[pr.big].classList.add('good'); ui.sfx('wrong'); ui.later(next, 420); }, p.deadline);
  };
  const choose = s => {
    if (!active || ui.locked) return;
    active = false; clearTimeout(timer);
    const pr = p.pairs[i];
    if (s === pr.big) { hits++; rts.push(performance.now() - shownAt); cards[s].classList.add('good'); ui.sfx('pop'); }
    else { misses++; cards[s].classList.add('bad'); cards[pr.big].classList.add('good'); ui.sfx('wrong'); ui.buzz('bad'); }
    ui.later(next, s === pr.big ? 170 : 420);
  };
  cards.forEach(c => c.addEventListener('pointerdown', e => { e.preventDefault(); choose(+c.dataset.s); }));
  ui.onKey(e => { if (e.key === 'ArrowLeft') { choose(0); return true; } if (e.key === 'ArrowRight') { choose(1); return true; } return false; });
  ui.countdown(() => next());
}

export function grade(p, r) {
  if (!r) return { correct: false, score: 0 };
  const acc = r.hits / r.total;
  const mean = r.rts.length ? r.rts.reduce((s, x) => s + x, 0) / r.rts.length : p.deadline;
  const speed = Math.max(0.4, Math.min(1, 1.25 - mean / p.deadline));
  return { correct: acc >= 0.8, score: acc * speed, acc, mean };
}
export function answerHTML(p, r) {
  if (!r) return '';
  const g = grade(p, r);
  return `<div class="sprint-sum"><div><b>${r.hits}/${r.total}</b><span>correct</span></div><div><b>${Math.round(g.mean)} ms</b><span>avg time</span></div><div><b>${Math.round(g.acc * 100)}%</b><span>accuracy</span></div></div>`;
}
export function summary(p, r) {
  const g = grade(p, r);
  return `<p>${g.correct ? 'Sharp number sense!' : 'Close values are tricky — estimate the size first, then refine.'} Pass mark: 80% accuracy.</p>`;
}
