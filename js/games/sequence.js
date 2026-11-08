/* NUMBER SEQUENCES — free-response series completion.

   Any finite list of numbers can be continued in infinitely many ways, so uniqueness is enforced
   against a library of 19 rule families (differences, ratios, recurrences, interleaving, primes…).
   Every family is fitted to the visible terms; the puzzle is kept only if all families that fit
   agree on the same missing number. For a gap in the middle, every candidate value in a wide
   range is tried against every family. */

import { clamp } from '../core/rng.js';

export const meta = {
  id: 'sequence', name: 'Sequence', title: 'Number Sequences', domain: 'pattern', kind: 'trial',
  icon: 'sequence', tagline: 'Crack the number pattern',
  howTo: [
    'Find the number that belongs in the empty slot — usually the next term, sometimes a gap in the middle.',
    'Look at the differences between terms, the ratios, alternating steps, or how each term is built from the ones before it.',
    'Type your answer on the keypad (use ± for negative numbers).',
  ],
  time: L => 45 + 6 * L,
  guess: () => 0,
};

const PRIMES = (() => {
  const N = 4000, s = new Uint8Array(N + 1), out = [];
  for (let i = 2; i <= N; i++) { if (!s[i]) { out.push(i); for (let j = i * i; j <= N; j += i) s[j] = 1; } }
  return out;
})();
const isInt = Number.isInteger;
const last = a => a[a.length - 1];
const diffs = s => s.slice(1).map((x, i) => x - s[i]);
const allEq = a => a.every(x => x === a[0]);
const sgn = d => (d >= 0 ? '+' + d : '−' + -d);
const fmt = n => (n < 0 ? '−' + -n : String(n));

/* ------------------------------------------------ rule families: predict the next term */
const PRED = {
  arith(s) { if (s.length < 3) return []; const d = diffs(s); return allEq(d) && d[0] !== 0 ? [last(s) + d[0]] : []; },
  geom(s) {
    if (s.length < 3 || s.some(x => x === 0)) return [];
    const num = s[1], den = s[0];
    if (num === den) return [];
    for (let i = 1; i < s.length - 1; i++) if (s[i + 1] * den !== s[i] * num) return [];
    const nx = (last(s) * num) / den;
    return isInt(nx) ? [nx] : [];
  },
  quad(s) {
    if (s.length < 4) return [];
    const d = diffs(s), d2 = diffs(d);
    return allEq(d2) && d2[0] !== 0 ? [last(s) + last(d) + d2[0]] : [];
  },
  cubic(s) {
    if (s.length < 5) return [];
    const d1 = diffs(s), d2 = diffs(d1), d3 = diffs(d2);
    return allEq(d3) && d3[0] !== 0 ? [last(s) + last(d1) + last(d2) + d3[0]] : [];
  },
  diffGeom(s) { if (s.length < 4) return []; return PRED.geom(diffs(s)).map(x => last(s) + x); },
  mulAdd(s) {
    if (s.length < 4) return [];
    const a = s[1] - s[0], b = s[2] - s[1];
    if (a === 0) return [];
    const m = b / a;
    if (!isInt(m) || m === 0 || m === 1) return [];
    const c = s[1] - m * s[0];
    for (let i = 0; i < s.length - 1; i++) if (s[i + 1] !== m * s[i] + c) return [];
    return [m * last(s) + c];
  },
  rec2(s) {
    if (s.length < 5) return [];
    const det = s[1] * s[1] - s[0] * s[2];
    if (det === 0) return [];
    const p = (s[2] * s[1] - s[0] * s[3]) / det, q = (s[1] * s[3] - s[2] * s[2]) / det;
    if (!isInt(p) || !isInt(q) || Math.abs(p) > 4 || Math.abs(q) > 4) return [];
    for (let i = 2; i < s.length; i++) if (s[i] !== p * s[i - 1] + q * s[i - 2]) return [];
    return [p * last(s) + q * s[s.length - 2]];
  },
  rec2c(s) {
    if (s.length < 5) return [];
    const c = s[2] - s[1] - s[0];
    for (let i = 2; i < s.length; i++) if (s[i] !== s[i - 1] + s[i - 2] + c) return [];
    return [last(s) + s[s.length - 2] + c];
  },
  trib(s) {
    if (s.length < 5) return [];
    for (let i = 3; i < s.length; i++) if (s[i] !== s[i - 1] + s[i - 2] + s[i - 3]) return [];
    return [last(s) + s[s.length - 2] + s[s.length - 3]];
  },
  per2(s) {
    if (s.length < 5) return [];
    const d = diffs(s);
    if (d[0] === d[1]) return [];
    for (let i = 2; i < d.length; i++) if (d[i] !== d[i - 2]) return [];
    return [last(s) + d[d.length - 2]];
  },
  per3(s) {
    if (s.length < 7) return [];
    const d = diffs(s);
    if (d[0] === d[1] && d[1] === d[2]) return [];
    for (let i = 3; i < d.length; i++) if (d[i] !== d[i - 3]) return [];
    return [last(s) + d[d.length - 3]];
  },
  altOps(s) {
    if (s.length < 5) return [];
    const cands = (x, y) => {
      const out = [];
      if (y !== x) out.push(['+', y - x]);
      if (x !== 0 && isInt(y / x) && y / x !== 1 && y / x !== 0) out.push(['*', y / x]);
      return out;
    };
    const apply = (op, x) => (op[0] === '+' ? x + op[1] : x * op[1]);
    const okFor = (op, parity) => {
      for (let i = parity; i < s.length - 1; i += 2) if (apply(op, s[i]) !== s[i + 1]) return false;
      return true;
    };
    const F = cands(s[0], s[1]).filter(op => okFor(op, 0));
    const G = cands(s[1], s[2]).filter(op => okFor(op, 1));
    if (!F.length || !G.length) return [];
    const nextParity = (s.length - 1) % 2;
    return (nextParity === 0 ? F : G).map(op => apply(op, last(s)));
  },
  mulInc(s) {
    if (s.length < 4 || s.some(x => x === 0)) return [];
    const r = s.slice(1).map((x, i) => x / s[i]);
    if (!r.every(isInt)) return [];
    const dr = diffs(r);
    if (!allEq(dr) || dr[0] === 0) return [];
    return [last(s) * (last(r) + dr[0])];
  },
  interleave(s) {
    if (s.length < 6) return [];
    const E = s.filter((_, i) => i % 2 === 0), O = s.filter((_, i) => i % 2 === 1);
    const sub = t => {
      if (t.length < 3) return null;
      const out = [];
      if (allEq(t)) out.push(t[0]);
      out.push(...PRED.arith(t), ...PRED.geom(t), ...PRED.quad(t));
      return out.length ? out : null;
    };
    const pe = sub(E), po = sub(O);
    if (!pe || !po) return [];
    return s.length % 2 === 0 ? pe : po;
  },
  diffPrimes(s) {
    if (s.length < 5) return [];
    const d = diffs(s), k = PRIMES.indexOf(d[0]);
    if (k < 0) return [];
    for (let i = 0; i < d.length; i++) if (d[i] !== PRIMES[k + i]) return [];
    return [last(s) + PRIMES[k + d.length]];
  },
  primeOff(s) {
    if (s.length < 4) return [];
    const out = [];
    for (let k = 0; k < 300; k++) {
      const c = s[0] - PRIMES[k];
      let ok = true;
      for (let i = 1; i < s.length && ok; i++) if (s[i] - PRIMES[k + i] !== c) ok = false;
      if (ok) out.push(PRIMES[k + s.length] + c);
    }
    return out;
  },
  diffFib(s) {
    if (s.length < 5) return [];
    const d = diffs(s);
    for (let i = 2; i < d.length; i++) if (d[i] !== d[i - 1] + d[i - 2]) return [];
    return [last(s) + last(d) + d[d.length - 2]];
  },
  product(s) {
    if (s.length < 4) return [];
    for (let i = 2; i < s.length; i++) if (s[i] !== s[i - 1] * s[i - 2]) return [];
    return [last(s) * s[s.length - 2]];
  },
};
const FAMILIES = Object.keys(PRED);

export function predictionsFor(shown) {
  const out = new Set();
  for (const f of FAMILIES) for (const v of PRED[f](shown)) out.add(v);
  return out;
}
function fitsSomeFamily(full) {
  const prefix = full.slice(0, -1), target = last(full);
  for (const f of FAMILIES) if (PRED[f](prefix).includes(target)) return true;
  return false;
}
/** all integer values that would make `terms` (with null at gapIndex) fit some family */
export function gapCandidates(terms, gapIndex) {
  const known = terms.filter(x => x !== null);
  const mn = Math.min(...known), mx = Math.max(...known), span = mx - mn + 20;
  const lo = Math.max(mn - span, -50000), hi = Math.min(mx + span, 50000);
  const out = [];
  const full = terms.slice();
  for (let c = lo; c <= hi; c++) { full[gapIndex] = c; if (fitsSomeFamily(full)) out.push(c); }
  return out;
}

/* ------------------------------------------------ generators */
const mk = (fam, s, rule, ops = null, work = null) => ({ fam, s, rule, ops, work });
const opTxt = op => (op[0] === '+' ? sgn(op[1]) : '×' + (op[1] < 0 ? '(' + fmt(op[1]) + ')' : op[1]));

const GEN = {
  arith(rng, L, n) {
    const d = L <= 1 ? rng.int(2, 9) : (rng.chance(0.3) ? -1 : 1) * rng.int(3, L <= 3 ? 14 : 30);
    const a = d > 0 ? rng.int(1, L <= 1 ? 20 : 60) : rng.int(-d * n + 1, -d * n + 60);
    const s = Array.from({ length: n }, (_, i) => a + i * d);
    return mk('arith', s, d > 0 ? `Add ${d} each time.` : `Subtract ${-d} each time.`, s.slice(1).map(() => sgn(d)));
  },
  geom(rng, L, n) {
    const r = L <= 2 ? 2 : rng.pick([2, 3, 3, -2]);
    const a = rng.int(1, Math.abs(r) === 2 ? 5 : 3);
    const s = Array.from({ length: n }, (_, i) => a * r ** i);
    const t = r < 0 ? `(${fmt(r)})` : r;
    return mk('geom', s, `Multiply by ${t} each time.`, s.slice(1).map(() => '×' + t));
  },
  squares(rng, L, n) {
    const m = rng.int(1, 5), c = rng.pick([0, 0, 1, -1, 2, 3]);
    const s = Array.from({ length: n }, (_, i) => (i + m) ** 2 + c);
    const tail = c ? ` ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}` : '';
    return mk('squares', s, `Square numbers${tail}: ${m}², ${m + 1}², ${m + 2}², …`, null,
      s.map((x, i) => `${i + m}²${c ? (c > 0 ? ' + ' + c : ' − ' + -c) : ''} = ${fmt(x)}`));
  },
  cubes(rng, L, n) {
    const m = rng.int(1, 3), c = rng.pick([0, 1, -1, 2, -2]);
    const s = Array.from({ length: n }, (_, i) => (i + m) ** 3 + c);
    const tail = c ? ` ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}` : '';
    return mk('cubes', s, `Cube numbers${tail}: ${m}³, ${m + 1}³, ${m + 2}³, …`, null,
      s.map((x, i) => `${i + m}³${c ? (c > 0 ? ' + ' + c : ' − ' + -c) : ''} = ${fmt(x)}`));
  },
  quad(rng, L, n) {
    const k = (L <= 3 ? rng.int(1, 2) : rng.int(1, 4)) * (L >= 5 && rng.chance(0.25) ? -1 : 1);
    const d1 = k > 0 ? rng.int(1, 6) : rng.int(10, 18), a = rng.int(1, 30);
    const s = [a];
    let d = d1;
    for (let i = 1; i < n; i++) { s.push(s[i - 1] + d); d += k; }
    const ds = diffs(s);
    return mk('quad', s, `The step ${k > 0 ? 'grows' : 'shrinks'} by ${Math.abs(k)} each time.`, ds.map(sgn));
  },
  diffGeom(rng, L, n) {
    const r = L <= 5 ? 2 : rng.pick([2, 3]), a = rng.int(1, 20);
    const s = [a];
    let d = rng.int(1, 4);
    for (let i = 1; i < n; i++) { s.push(last(s) + d); d *= r; }
    return mk('diffGeom', s, `The step is multiplied by ${r} each time.`, diffs(s).map(sgn));
  },
  mulAdd(rng, L, n) {
    const m = L <= 5 ? 2 : rng.pick([2, 3, 3, -2]);
    const c = rng.pick([1, -1, 2, -2, 3, -3]);
    const s = [rng.int(1, 6)];
    for (let i = 1; i < n; i++) s.push(m * last(s) + c);
    const mt = m < 0 ? `(${fmt(m)})` : m;
    return mk('mulAdd', s, `Multiply by ${mt}, then ${c > 0 ? 'add ' + c : 'subtract ' + -c}.`, s.slice(1).map(() => `×${mt} ${c > 0 ? '+' : '−'}${Math.abs(c)}`));
  },
  fib(rng, L, n) {
    const a = rng.int(1, 6), b = rng.int(a, 9);
    const s = [a, b];
    while (s.length < n) s.push(last(s) + s[s.length - 2]);
    return mk('fib', s, 'Each term is the sum of the two before it.', null,
      s.slice(2).map((x, i) => `${s[i]} + ${s[i + 1]} = ${x}`));
  },
  rec2(rng, L, n) {
    const [p, q] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 2]]);
    const s = [rng.int(1, 4), rng.int(1, 5)];
    while (s.length < n) s.push(p * last(s) + q * s[s.length - 2]);
    const t = (k, w) => (k === 1 ? w : `${k}×${w}`);
    return mk('rec2', s, `Each term = ${t(p, 'the previous term')} + ${t(q, 'the one before that')}.`, null,
      s.slice(2).map((x, i) => `${p === 1 ? '' : p + '×'}${s[i + 1]} + ${q === 1 ? '' : q + '×'}${s[i]} = ${x}`));
  },
  rec2c(rng, L, n) {
    const c = rng.pick([1, -1, 2, 3]);
    const s = [rng.int(1, 5), rng.int(2, 7)];
    while (s.length < n) s.push(last(s) + s[s.length - 2] + c);
    return mk('rec2c', s, `Add the two previous terms, then ${c > 0 ? 'add ' + c : 'subtract ' + -c}.`, null,
      s.slice(2).map((x, i) => `${s[i]} + ${s[i + 1]} ${c > 0 ? '+' : '−'} ${Math.abs(c)} = ${x}`));
  },
  trib(rng, L, n) {
    const s = [rng.int(0, 3), rng.int(1, 3), rng.int(1, 4)];
    while (s.length < n) s.push(last(s) + s[s.length - 2] + s[s.length - 3]);
    return mk('trib', s, 'Each term is the sum of the three before it.', null,
      s.slice(3).map((x, i) => `${s[i]} + ${s[i + 1]} + ${s[i + 2]} = ${x}`));
  },
  per2(rng, L, n) {
    let d0 = rng.int(2, L <= 4 ? 9 : 15), d1 = -rng.int(1, L <= 4 ? 6 : 12);
    if (rng.chance(0.5)) { const t = d0; d0 = d1; d1 = t; }
    if (rng.chance(0.3)) d1 = rng.int(1, 9) + (d0 > 0 ? d0 : 0);
    if (d1 === d0) d1 += 1;
    const a = rng.int(10, 40), s = [a];
    for (let i = 1; i < n; i++) s.push(last(s) + (i % 2 ? d0 : d1));
    return mk('per2', s, `Alternate ${sgn(d0)} and ${sgn(d1)}.`, diffs(s).map(sgn));
  },
  per3(rng, L, n) {
    const d = [rng.int(2, 9), -rng.int(1, 7), rng.int(1, 9) * rng.sign()];
    const a = rng.int(10, 40), s = [a];
    for (let i = 1; i < n; i++) s.push(last(s) + d[(i - 1) % 3]);
    return mk('per3', s, `Repeat the cycle ${d.map(sgn).join(', ')}.`, diffs(s).map(sgn));
  },
  altOps(rng, L, n) {
    const mul = ['*', L >= 9 ? rng.pick([2, 3, -2]) : rng.pick([2, 3])];
    const add = ['+', rng.int(1, L >= 9 ? 12 : 9) * rng.sign()];
    const [f, g] = rng.chance(0.5) ? [mul, add] : [add, mul];
    const s = [rng.int(1, 6)];
    for (let i = 1; i < n; i++) s.push((i % 2 ? f : g)[0] === '+' ? last(s) + (i % 2 ? f : g)[1] : last(s) * (i % 2 ? f : g)[1]);
    return mk('altOps', s, `Alternate ${opTxt(f)} and ${opTxt(g)}.`, s.slice(1).map((_, i) => opTxt(i % 2 ? g : f)));
  },
  mulInc(rng, L, n) {
    const k0 = rng.int(2, 3), a = rng.int(1, L >= 9 ? 5 : 3);
    const s = [a];
    for (let i = 1; i < n; i++) s.push(last(s) * (k0 + i - 1));
    return mk('mulInc', s, `Multiply by ${k0}, then ${k0 + 1}, then ${k0 + 2}, and so on.`, s.slice(1).map((_, i) => '×' + (k0 + i)));
  },
  interleave(rng, L, n) {
    const da = rng.int(2, 9) * rng.sign(), a0 = rng.int(da < 0 ? 40 : 1, da < 0 ? 70 : 20);
    const geo = L >= 7 && rng.chance(0.6);
    const b0 = geo ? rng.int(1, 4) : rng.int(1, 30), db = geo ? rng.pick([2, 3]) : rng.int(2, 11) * rng.sign();
    const A = i => a0 + i * da, B = i => (geo ? b0 * db ** i : b0 + i * db);
    const s = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? A(i / 2) : B((i - 1) / 2)));
    const ra = da > 0 ? `add ${da}` : `subtract ${-da}`;
    const rb = geo ? `multiply by ${db}` : db > 0 ? `add ${db}` : `subtract ${-db}`;
    return mk('interleave', s, `Two sequences take turns: the 1st, 3rd, 5th… terms ${ra} each time; the 2nd, 4th, 6th… terms ${rb} each time.`);
  },
  diffPrimes(rng, L, n) {
    const k = rng.int(0, 3), a = rng.int(1, 20), s = [a];
    for (let i = 1; i < n; i++) s.push(last(s) + PRIMES[k + i - 1]);
    return mk('diffPrimes', s, 'The steps are consecutive prime numbers.', diffs(s).map(sgn));
  },
  primeOff(rng, L, n) {
    const k = rng.int(1, 7), c = rng.pick([1, -1, 2, 3, 10]);
    const s = Array.from({ length: n }, (_, i) => PRIMES[k + i] + c);
    return mk('primeOff', s, `Consecutive prime numbers ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}.`, null,
      s.map((x, i) => `${PRIMES[k + i]} ${c > 0 ? '+' : '−'} ${Math.abs(c)} = ${x}`));
  },
  diffFib(rng, L, n) {
    const a = rng.int(1, 20), s = [a];
    let p = rng.int(1, 3), q = rng.int(1, 4);
    for (let i = 1; i < n; i++) { s.push(last(s) + p); const t = p + q; p = q; q = t; }   // steps p, q, p+q, …
    return mk('diffFib', s, 'Each step is the sum of the two steps before it.', diffs(s).map(sgn));
  },
  product(rng, L, n) {
    const [a, b] = rng.pick([[1, 2], [2, 1], [1, 3], [2, 3], [3, 1]]);
    const s = [a, b];
    while (s.length < n) s.push(last(s) * s[s.length - 2]);
    return mk('product', s, 'Each term is the product of the two before it.', null,
      s.slice(2).map((x, i) => `${s[i]} × ${s[i + 1]} = ${x}`));
  },
};

const LEVELS = {
  1: [['arith', 3, 5, 'end'], ['arith', 1, 6, 'mid']],
  2: [['arith', 2, 5, 'end'], ['geom', 2, 5, 'end'], ['geom', 1, 6, 'mid']],
  3: [['geom', 1, 5, 'end'], ['per2', 2, 6, 'end'], ['squares', 2, 5, 'end'], ['quad', 1, 5, 'end']],
  4: [['quad', 2, 5, 'end'], ['mulAdd', 2, 5, 'end'], ['diffGeom', 1, 5, 'end'], ['per2', 1, 6, 'mid']],
  5: [['fib', 2, 6, 'end'], ['interleave', 2, 7, 'end'], ['mulInc', 2, 5, 'end'], ['quad', 1, 6, 'mid']],
  6: [['altOps', 2, 6, 'end'], ['cubes', 1, 5, 'end'], ['diffPrimes', 2, 6, 'end'], ['mulAdd', 1, 5, 'end']],
  7: [['interleave', 2, 7, 'end'], ['rec2c', 2, 6, 'end'], ['per3', 1, 7, 'end'], ['diffGeom', 1, 5, 'end'], ['mulAdd', 1, 5, 'end']],
  8: [['trib', 2, 6, 'end'], ['rec2', 2, 6, 'end'], ['diffFib', 2, 6, 'end'], ['primeOff', 1, 5, 'end']],
  9: [['altOps', 2, 6, 'end'], ['product', 1, 5, 'end'], ['interleave', 1, 7, 'mid'], ['rec2', 2, 6, 'end'], ['cubes', 1, 6, 'mid']],
  10: [['rec2', 2, 5, 'end'], ['diffFib', 1, 5, 'end'], ['trib', 1, 5, 'end'], ['per3', 1, 7, 'mid'], ['altOps', 1, 6, 'mid']],
};

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const table = LEVELS[L];
  for (let attempt = 0; attempt < 400; attempt++) {
    const [fam, , shown, where] = rng.weighted(table, table.map(t => t[1]));
    const g = GEN[fam](rng, L, shown + 1);
    const s = g.s;
    if (s.some(x => !isInt(x) || Math.abs(x) > 99999)) continue;
    if (new Set(s).size < s.length - 1) continue;              // avoid degenerate repeats
    let gap = s.length - 1;
    if (where === 'mid') gap = rng.int(1, s.length - 2);
    const terms = s.map((x, i) => (i === gap ? null : x));
    if (gap === s.length - 1) {
      const P = predictionsFor(s.slice(0, -1));
      if (P.size !== 1 || !P.has(last(s))) continue;
    } else {
      const C = gapCandidates(terms, gap);
      if (C.length !== 1 || C[0] !== s[gap]) continue;
    }
    return {
      game: 'sequence', level: L, fam, terms, gap, answer: s[gap], full: s,
      explain: explain(g, gap),
    };
  }
  throw new Error('sequence: generation failed');
}

function explain(g, gap) {
  const s = g.s;
  let html = `<p><b>Rule:</b> ${g.rule}</p>`;
  if (g.ops) {
    html += '<div class="chain">' + s.map((x, i) =>
      (i ? `<i>${g.ops[i - 1]}</i>` : '') + `<span class="${i === gap ? 'hit' : ''}">${fmt(x)}</span>`).join('') + '</div>';
  } else if (g.work) {
    html += '<div class="work">' + g.work.map(w => `<div>${w}</div>`).join('') + '</div>';
  } else {
    html += '<div class="chain">' + s.map((x, i) => `<span class="${i === gap ? 'hit' : ''}${i % 2 ? ' alt' : ''}">${fmt(x)}</span>`).join('') + '</div>';
  }
  return html;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  const chips = p.terms.map(x => (x === null ? '<div class="sq-term sq-gap">?</div>' : `<div class="sq-term">${fmt(x)}</div>`));
  ui.stage.innerHTML = `<div class="sq-row">${chips.join('<span class="sq-comma"></span>')}</div>`;
  ui.keypad({ maxLen: 7, neg: true });
}
export function grade(p, r) { const ok = Number(r) === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-big">${fmt(p.answer)}</div>`; }
export function reveal(p, ui) {
  const g = ui.stage.querySelector('.sq-gap');
  if (g) { g.textContent = fmt(p.answer); g.classList.add('revealed'); }
}
