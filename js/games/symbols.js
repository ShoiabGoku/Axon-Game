/* SYMBOL MATH — each symbol is a whole number. Equations are built so the system has exactly one
   positive-integer solution, confirmed by brute force over every assignment. The final line uses
   normal order of operations (× before + and −). */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'symbols', name: 'Symbol Math', title: 'Symbol Equations', domain: 'numeric', kind: 'trial',
  icon: 'symbols', tagline: 'Find what each symbol is worth',
  howTo: [
    'Every symbol stands for a whole number (1 or more). The same symbol always has the same value.',
    'Use the equations to work out each value, then solve the last line.',
    'Normal order of operations applies: multiply before you add or subtract.',
  ],
  time: L => 45 + 11 * L,
  guess: () => 0,
};

export const SYM_NAMES = ['gem', 'sun', 'moon', 'leaf', 'bolt', 'drop'];
const SYM_COLORS = ['#38e1ff', '#ffc54d', '#9d7bff', '#4cf3a3', '#ff8a3d', '#4d8bff'];
const SYM_PATHS = [
  '<polygon points="12,2.5 21.5,9 12,21.5 2.5,9" fill="{c}" fill-opacity=".85" stroke="{c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.5 9 H21.5 M8 9 L12 21.5 L16 9 M8 9 L12 2.5 L16 9" stroke="#071024" stroke-width="1" fill="none" opacity=".55"/>',
  '<circle cx="12" cy="12" r="5" fill="{c}"/><g stroke="{c}" stroke-width="2" stroke-linecap="round"><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1"/></g>',
  '<path d="M15.5 2.5a9.5 9.5 0 1 0 6 16.9A8 8 0 0 1 15.5 2.5z" fill="{c}"/>',
  '<path d="M4 20C4 9 10 4 21 3c0 11-6 17-17 17z" fill="{c}" fill-opacity=".9"/><path d="M4 20L15 9" stroke="#071024" stroke-width="1.3" opacity=".6"/>',
  '<polygon points="13.5,1.5 4,13.5 11,13.5 9.5,22.5 20,9.5 12.8,9.5" fill="{c}" stroke="{c}" stroke-width=".8" stroke-linejoin="round"/>',
  '<path d="M12 2.5C12 2.5 4.5 11 4.5 15.5a7.5 7.5 0 0 0 15 0C19.5 11 12 2.5 12 2.5z" fill="{c}" fill-opacity=".9"/><path d="M8.5 15.5a3.5 3.5 0 0 0 3.5 3.5" stroke="#fff" stroke-width="1.3" fill="none" opacity=".55" stroke-linecap="round"/>',
];
export const symSVG = (i, cls = 'sym') => `<svg viewBox="0 0 24 24" class="${cls}" role="img" aria-label="${SYM_NAMES[i]}">${SYM_PATHS[i].replace(/\{c\}/g, SYM_COLORS[i])}</svg>`;

/* expression = tokens: numbers are symbol indices, strings are operators */
export function evalExpr(tokens, v) {
  const nums = [], ops = [];
  tokens.forEach(t => (typeof t === 'number' ? nums.push(v[t]) : ops.push(t)));
  // multiply first
  const n2 = [nums[0]], o2 = [];
  ops.forEach((op, i) => { if (op === '×') n2[n2.length - 1] *= nums[i + 1]; else { o2.push(op); n2.push(nums[i + 1]); } });
  return o2.reduce((acc, op, i) => (op === '+' ? acc + n2[i + 1] : acc - n2[i + 1]), n2[0]);
}
const exprHTML = (tokens, cls) => tokens.map(t => (typeof t === 'number' ? symSVG(t, cls) : `<span class="op">${t}</span>`)).join('');

const LEVEL = {
  1: { n: 2, ops: ['+'], vmax: 10 },
  2: { n: 3, ops: ['+'], vmax: 12 },
  3: { n: 3, ops: ['+', '×'], vmax: 9 },
  4: { n: 3, ops: ['+', '×', '−'], vmax: 10, prec: true },
  5: { n: 3, ops: ['+', '−', '×'], vmax: 12, prec: true },
  6: { n: 3, ops: ['+', '−', '×'], vmax: 14, sim: true, prec: true },
  7: { n: 4, ops: ['+', '−', '×'], vmax: 12, prec: true },
  8: { n: 4, ops: ['+', '−', '×'], vmax: 14, sim: true, prec: true },
  9: { n: 4, ops: ['+', '−', '×'], vmax: 12, prec: true, sq: true, sim: true },
  10: { n: 4, ops: ['+', '−', '×'], vmax: 15, prec: true, free: true },
};
const BRUTE_MAX = 20;

/** brute force with pruning: an equation is checked as soon as its last symbol is assigned */
export function countSolutions(n, eqs, limit = 2) {
  const byMax = range(0, n - 1).map(() => []);
  for (const e of eqs) {
    let m = -1;
    for (const t of e.lhs) if (typeof t === 'number' && t > m) m = t;
    if (m >= 0) byMax[m].push(e);
  }
  const v = new Array(n).fill(0);
  let found = 0, sol = null;
  const rec = i => {
    if (i === n) { found++; sol = v.slice(); return; }
    for (let x = 1; x <= BRUTE_MAX && found < limit; x++) {
      v[i] = x;
      let ok = true;
      for (const e of byMax[i]) if (evalExpr(e.lhs, v) !== e.rhs) { ok = false; break; }
      if (ok) rec(i + 1);
    }
  };
  rec(0);
  return { found, sol };
}

function randExpr(rng, syms, ops, len) {
  const t = [rng.pick(syms)];
  for (let i = 1; i < len; i++) { t.push(rng.pick(ops)); t.push(rng.pick(syms)); }
  return t;
}
/** every symbol in the expression must actually matter (rules out things like ◆ − ◆ + ●) */
function sensitive(tokens, v) {
  const base = evalExpr(tokens, v);
  for (const s of new Set(tokens.filter(x => typeof x === 'number'))) {
    const w = v.slice(); w[s] += 1;
    if (evalExpr(tokens, w) === base) return false;
  }
  return true;
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  const n = cfg.n;
  for (let attempt = 0; attempt < 400; attempt++) {
    const syms = rng.sample(range(0, 5), n);                      // which icons appear
    const v = new Array(6).fill(0);
    const pool = rng.sample(range(L <= 2 ? 1 : 2, cfg.vmax), n);
    syms.forEach((s, i) => { v[s] = pool[i]; });
    const eqs = [], steps = [];
    let ok = true;
    if (cfg.free) {
      // random interlocking equations; uniqueness decided by brute force below
      for (let k = 0; k < n; k++) {
        const len = rng.int(2, 3);
        const lhs = randExpr(rng, syms, cfg.ops, len);
        const rhs = evalExpr(lhs, v);
        if (rhs <= 0 || rhs > 250 || !sensitive(lhs, v)) { ok = false; break; }
        eqs.push({ lhs, rhs });
      }
      if (!ok) continue;
    } else {
      const known = [];
      let i = 0;
      // first line: repeated symbol (or a square at high levels)
      const s0 = syms[0];
      const reps = rng.int(2, L <= 1 ? 2 : 3);
      const first = cfg.sq && rng.chance(0.5) ? [s0, '×', s0] : range(1, reps).flatMap((_, j) => (j ? ['+', s0] : [s0]));
      eqs.push({ lhs: first, rhs: evalExpr(first, v) });
      steps.push({ eq: 0, solve: [s0] });
      known.push(s0); i = 1;
      while (i < n) {
        if (cfg.sim && i + 1 < n && rng.chance(0.55)) {
          const [x, y] = v[syms[i]] > v[syms[i + 1]] ? [syms[i], syms[i + 1]] : [syms[i + 1], syms[i]];
          if (v[x] === v[y]) { ok = false; break; }
          const a = rng.pick([[x, '+', y], [x, '+', x, '+', y]]);
          const b = [x, '−', y];
          eqs.push({ lhs: a, rhs: evalExpr(a, v) });
          eqs.push({ lhs: b, rhs: evalExpr(b, v) });
          steps.push({ eq: eqs.length - 2, eq2: eqs.length - 1, solve: [x, y], sim: true });
          known.push(x, y); i += 2;
          continue;
        }
        const s = syms[i];
        let lhs = null;
        for (let t = 0; t < 40 && !lhs; t++) {
          const len = rng.int(2, L >= 5 ? 3 : 2);
          const cand = randExpr(rng, [...known, s], cfg.ops, len);
          if (!cand.includes(s)) cand[cand.length - 1] = s;
          const rhs = evalExpr(cand, v);
          if (rhs > 0 && rhs <= 200 && sensitive(cand, v)) lhs = cand;
        }
        if (!lhs) { ok = false; break; }
        eqs.push({ lhs, rhs: evalExpr(lhs, v) });
        steps.push({ eq: eqs.length - 1, solve: [s] });
        known.push(s); i++;
      }
      if (!ok) continue;
    }
    // map icons to dense indices for the brute-force check
    const idx = new Map(syms.map((s, j) => [s, j]));
    const dense = eqs.map(e => ({ lhs: e.lhs.map(t => (typeof t === 'number' ? idx.get(t) : t)), rhs: e.rhs }));
    const { found } = countSolutions(n, dense);
    if (found !== 1) continue;
    // question line uses every symbol at least once where possible
    let q = null;
    for (let t = 0; t < 40 && !q; t++) {
      const len = rng.int(Math.min(3, n), Math.min(4, n + 1));
      const ops = cfg.prec ? cfg.ops : cfg.ops.filter(o => o !== '−');
      const cand = rng.shuffle(syms).slice(0, len);
      while (cand.length < len) cand.push(rng.pick(syms));
      const tokens = [];
      cand.forEach((s, j) => { if (j) tokens.push(rng.pick(ops)); tokens.push(s); });
      if (cfg.prec && L >= 4 && !tokens.includes('×')) continue;
      if (!cfg.prec && tokens.includes('×') && tokens.some(o => o === '+' || o === '−')) continue;
      const ans = evalExpr(tokens, v);
      if (ans >= 0 && ans <= 999 && sensitive(tokens, v) && !eqs.some(e => e.lhs.join() === tokens.join())) q = { tokens, ans };
    }
    if (!q) continue;
    return {
      game: 'symbols', level: L, syms, values: syms.map(s => v[s]), eqs, question: q.tokens, answer: q.ans,
      explain: explain(syms, v, eqs, steps, q, cfg.free),
    };
  }
  throw new Error('symbols: generation failed');
}

function explain(syms, v, eqs, steps, q, free) {
  const sv = s => `${symSVG(s, 'sym-i')}&nbsp;=&nbsp;<b>${v[s]}</b>`;
  let html = '';
  if (free) {
    html += `<p>The values are ${syms.map(sv).join(', ')} — the only whole numbers that make every line true:</p><ul class="rules ticks">` +
      eqs.map(e => `<li>${exprHTML(e.lhs, 'sym-i')} <span class="op">=</span> ${e.rhs}</li>`).join('') + '</ul>';
  } else {
    html += '<ol class="steps">' + steps.map(st => {
      const e = eqs[st.eq];
      if (st.sim) {
        const e2 = eqs[st.eq2];
        return `<li>Lines ${st.eq + 1} &amp; ${st.eq2 + 1}: ${exprHTML(e.lhs, 'sym-i')} = ${e.rhs} and ${exprHTML(e2.lhs, 'sym-i')} = ${e2.rhs}. Adding them cancels ${symSVG(st.solve[1], 'sym-i')}, giving ${sv(st.solve[0])}; then ${sv(st.solve[1])}.</li>`;
      }
      return `<li>Line ${st.eq + 1}: ${exprHTML(e.lhs, 'sym-i')} = ${e.rhs} &nbsp;→&nbsp; ${sv(st.solve[0])}</li>`;
    }).join('') + '</ol>';
  }
  const numbers = q.tokens.map(t => (typeof t === 'number' ? v[t] : t)).join(' ');
  const hasMul = q.tokens.includes('×') && q.tokens.some(t => t === '+' || t === '−');
  html += `<p>Last line: ${exprHTML(q.tokens, 'sym-i')} = ${numbers} = <b>${q.ans}</b>${hasMul ? ' <span class="muted">(multiplication first)</span>' : ''}.</p>`;
  return html;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  const rows = p.eqs.map(e => `<div class="sm-row">${exprHTML(e.lhs, 'sym')}<span class="op eq">=</span><span class="sm-num">${e.rhs}</span></div>`).join('');
  ui.stage.innerHTML = `<div class="sm-box">${rows}<div class="sm-row q">${exprHTML(p.question, 'sym')}<span class="op eq">=</span><span class="sm-num sm-q">?</span></div></div>`;
  ui.keypad({ maxLen: 4, neg: false });
}
export function grade(p, r) { const ok = Number(r) === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-big">${p.answer}</div>`; }
export function reveal(p, ui) { const q = ui.stage.querySelector('.sm-q'); if (q) { q.textContent = p.answer; q.classList.add('revealed'); } }
