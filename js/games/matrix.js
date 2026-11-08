/* MATRIX REASONING — procedurally generated 3×3 progressive matrices.

   Every attribute of every tile follows a row rule (constant / progression / distribute-three /
   arithmetic / set operations). Before a puzzle is accepted, a solver re-derives the missing tile
   from the eight visible ones using EVERY rule family, row-wise AND column-wise; the puzzle is only
   kept if all interpretations agree on a single answer.

   Options are built as a balanced attribute tree (the I-RAVEN method): k attributes each get one
   alternative value and the options are all 2^k combinations, so every attribute value appears in
   exactly half of the options and the answer cannot be guessed from the options alone. */

import { shapeSVG, SHADES, INK, TYPE_NAMES, popcount, bitsOf, maskOf } from '../core/draw.js';
import { range, clamp } from '../core/rng.js';

export const meta = {
  id: 'matrix', name: 'Matrix', title: 'Matrix Reasoning', domain: 'pattern', kind: 'trial',
  icon: 'matrix', tagline: 'Complete the 3×3 pattern',
  howTo: [
    'Each row of tiles follows hidden rules: shape, size, shading, number, direction or lines change in a consistent way.',
    'Work the rules out from the first two rows, then choose the tile that completes the bottom row.',
    'Every wrong option breaks at least one rule — exactly one tile fits them all.',
  ],
  time: L => 60 + 6 * L,
  guess: p => 1 / p.options.length,
  layout: 'split',
};

const SIZE_NAMES = ['tiny', 'small', 'medium', 'large'];
const SHADE_NAMES = ['empty', 'faint', 'half-filled', 'mostly filled', 'solid'];
const DIR_NAMES = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'];

const DOM = { type: [0, 4], dtype: [1, 4], size: [0, 3], shade: [0, 4], oshade: [0, 2], count: [1, 9], count0: [0, 9], angle: [0, 7] };
const SET_N = { lines: 8, pos: 9 };
const isSet = k => k === 'lines' || k === 'pos';

const ATTR = {
  'shape.type': ['type', 'Shape'],
  'shape.size': ['size', 'Size'],
  'shape.shade': ['shade', 'Shading'],
  'outer.type': ['type', 'Outer shape'],
  'outer.shade': ['oshade', 'Outer shading'],
  'inner.type': ['type', 'Inner shape'],
  'inner.size': ['size', 'Inner size'],
  'inner.shade': ['shade', 'Inner shading'],
  'grid.count': ['count', 'Number of shapes'],
  'grid.pos': ['pos', 'Positions'],
  'grid.type': ['type', 'Shape'],
  'grid.size': ['size', 'Size'],
  'grid.shade': ['shade', 'Shading'],
  'lines.set': ['lines', 'Lines'],
  'core.type': ['type', 'Centre shape'],
  'core.shade': ['shade', 'Centre shading'],
  'dial.type': ['dtype', 'Frame'],
  'dial.shade': ['oshade', 'Frame shading'],
  'hand.angle': ['angle', 'Long arrow'],
  'hand2.angle': ['angle', 'Short arrow'],
};

const TPL = {
  single: ['shape.type', 'shape.size', 'shape.shade'],
  hand: ['dial.type', 'dial.shade', 'hand.angle'],
  hands2: ['dial.type', 'dial.shade', 'hand.angle', 'hand2.angle'],
  grid: ['grid.count', 'grid.type', 'grid.size', 'grid.shade'],
  gridpos: ['grid.pos', 'grid.type', 'grid.size', 'grid.shade'],
  outin: ['outer.type', 'outer.shade', 'inner.type', 'inner.size', 'inner.shade'],
  lines: ['lines.set'],
  linesShape: ['lines.set', 'core.type', 'core.shade'],
};

/* ---------------------------------------------------------------- level specs */
function govern(rng, keys, n, fams) {
  const g = {};
  for (const k of rng.sample(keys, n)) g[k] = rng.pick(fams);
  return g;
}
function pickSpec(rng, L) {
  const S = (tpl, governed, nOpts) => ({ tpl, governed, nOpts });
  const single = TPL.single, outin = TPL.outin;
  switch (L) {
    case 1: return S('single', govern(rng, single, 1, ['progression', 'progression', 'constant']), 4);
    case 2: {
      const [a, b] = rng.sample(single, 2);
      return S('single', { [a]: 'progression', [b]: rng.pick(['constant', 'distribute']) }, 4);
    }
    case 3: return rng.chance(0.55)
      ? S('single', govern(rng, single, 3, ['progression', 'distribute', 'constant']), 8)
      : S('hand', { 'hand.angle': 'progression', 'dial.type': rng.pick(['distribute', 'constant']) }, 8);
    case 4: return rng.chance(0.5)
      ? S('grid', { 'grid.count': rng.pick(['progression', 'distribute']), 'grid.type': rng.pick(['distribute', 'constant']) }, 8)
      : S('hand', { 'hand.angle': rng.pick(['progression', 'distribute']), 'dial.type': 'distribute', 'dial.shade': rng.pick(['progression', 'constant']) }, 8);
    case 5: return S('outin', govern(rng, outin, 3, ['progression', 'distribute', 'constant']), 8);
    case 6: return rng.chance(0.5)
      ? S('grid', { 'grid.count': rng.pick(['add', 'sub']), 'grid.type': rng.pick(['distribute', 'progression']), 'grid.shade': rng.pick(['constant', 'distribute']) }, 8)
      : S('gridpos', { 'grid.pos': 'distribute', 'grid.type': rng.pick(['progression', 'distribute']), 'grid.shade': rng.pick(['constant', 'progression']) }, 8);
    case 7: return S('lines', { 'lines.set': rng.pick(['xor', 'or', 'and', 'diff']) }, 8);
    case 8: return rng.chance(0.5)
      ? S('outin', govern(rng, outin, 4, ['progression', 'distribute']), 8)
      : S('gridpos', { 'grid.pos': rng.pick(['distribute', 'or', 'xor']), 'grid.type': 'distribute', 'grid.shade': rng.pick(['progression', 'distribute']) }, 8);
    case 9: return S('linesShape', { 'lines.set': rng.pick(['xor', 'or', 'and', 'diff']), 'core.type': rng.pick(['distribute', 'progression']), 'core.shade': rng.pick(['progression', 'distribute', 'constant']) }, 8);
    default: return rng.chance(0.5)
      ? S('gridpos', { 'grid.pos': rng.pick(['xor', 'and', 'diff']), 'grid.type': 'distribute', 'grid.size': rng.pick(['progression', 'distribute']), 'grid.shade': rng.pick(['progression', 'distribute']) }, 8)
      : S('hands2', { 'hand.angle': 'progression', 'hand2.angle': 'progression', 'dial.type': 'distribute', 'dial.shade': rng.pick(['progression', 'distribute']) }, 8);
  }
}

function globalValue(rng, key) {
  switch (key) {
    case 'shape.size': return rng.int(2, 3);
    case 'grid.size': return rng.int(1, 2);
    case 'inner.size': return rng.int(1, 2);
    case 'grid.count': return rng.int(2, 6);
    case 'outer.shade': case 'dial.shade': return rng.pick([0, 0, 1]);
    case 'core.shade': return rng.int(2, 4);
    default: { const [lo, hi] = DOM[ATTR[key][0]]; return rng.int(lo, hi); }
  }
}

/* ---------------------------------------------------------------- rule samplers */
function genScalar(rng, kind, fam) {
  let [lo, hi] = DOM[kind];
  if (kind === 'type' && fam === 'progression') hi = 3;          // progress through polygons only
  const M = [[], [], []];
  switch (fam) {
    case 'constant': {
      const vals = rng.sample(range(lo, hi), 3);
      for (let r = 0; r < 3; r++) M[r] = [vals[r], vals[r], vals[r]];
      return M;
    }
    case 'progression': {
      if (kind === 'angle') {
        const d = rng.pick([1, 2, 3, 5, 6, 7]);
        for (let r = 0; r < 3; r++) { const s = rng.int(0, 7); M[r] = [s, (s + d) % 8, (s + 2 * d) % 8]; }
        return M;
      }
      const steps = hi - lo >= 4 ? [1, -1, 1, -1, 2, -2] : [1, -1];
      const d = rng.pick(steps);
      const sLo = d > 0 ? lo : lo - 2 * d, sHi = d > 0 ? hi - 2 * d : hi;
      if (sLo > sHi) return null;
      for (let r = 0; r < 3; r++) { const s = rng.int(sLo, sHi); M[r] = [s, s + d, s + 2 * d]; }
      return M;
    }
    case 'distribute': {
      const row0 = rng.shuffle(rng.sample(range(lo, hi), 3));
      const k = rng.pick([1, 2]);
      for (let r = 0; r < 3; r++) M[r] = [0, 1, 2].map(c => row0[(c + r * k) % 3]);
      return M;
    }
    case 'add':
      for (let r = 0; r < 3; r++) { const a = rng.int(1, hi - 1), b = rng.int(1, hi - a); M[r] = [a, b, a + b]; }
      return M;
    case 'sub':
      for (let r = 0; r < 3; r++) { const b = rng.int(1, hi - 1), a = rng.int(b + 1, hi); M[r] = [a, b, a - b]; }
      return M;
  }
  return null;
}

const OPS = {
  xor: (a, b) => a ^ b, or: (a, b) => a | b, and: (a, b) => a & b,
  diff: (a, b) => a & ~b, rdiff: (a, b) => b & ~a,
};
function randMask(rng, n, kmin, kmax) { return maskOf(rng.sample(range(0, n - 1), rng.int(kmin, kmax))); }
function distinctMasks(rng, n, count, kmin, kmax) {
  const out = new Set();
  let guard = 0;
  while (out.size < count && guard++ < 200) out.add(randMask(rng, n, kmin, kmax));
  return out.size === count ? [...out] : null;
}
function genSet(rng, kind, fam) {
  const n = SET_N[kind], kmin = 2, kmax = kind === 'pos' ? 5 : 4;
  const M = [[], [], []];
  if (fam === 'constant' || fam === 'distribute') {
    const s = distinctMasks(rng, n, 3, kmin, kmax);
    if (!s) return null;
    if (fam === 'constant') { for (let r = 0; r < 3; r++) M[r] = [s[r], s[r], s[r]]; return M; }
    const row0 = rng.shuffle(s), k = rng.pick([1, 2]);
    for (let r = 0; r < 3; r++) M[r] = [0, 1, 2].map(c => row0[(c + r * k) % 3]);
    return M;
  }
  const op = OPS[fam];
  for (let r = 0; r < 3; r++) {
    let ok = false;
    for (let t = 0; t < 60 && !ok; t++) {
      const A = randMask(rng, n, kmin, kmax), B = randMask(rng, n, kmin, kmax), C = op(A, B);
      if (A !== B && C !== 0 && C !== A && C !== B) { M[r] = [A, B, C]; ok = true; }
    }
    if (!ok) return null;
  }
  return M;
}

/* ---------------------------------------------------------------- solver */
const transpose = M => [0, 1, 2].map(i => [0, 1, 2].map(j => M[j][i]));
const mapM = (M, f) => M.map(r => r.map(f));

function predictScalar(X, kind) {
  const [lo, hi] = DOM[kind];
  const cyc = kind === 'angle';
  const preds = new Set();
  const R = [X[0], X[1]], r2 = X[2];
  if (R.every(r => r[0] === r[1] && r[1] === r[2]) && r2[0] === r2[1]) preds.add(r2[0]);
  const dd = (a, b) => (cyc ? (((b - a) % 8) + 8) % 8 : b - a);
  const d = dd(R[0][0], R[0][1]);
  if (d !== 0 && R.every(r => dd(r[0], r[1]) === d && dd(r[1], r[2]) === d) && dd(r2[0], r2[1]) === d) {
    const p = cyc ? (r2[1] + d) % 8 : r2[1] + d;
    if (p >= lo && p <= hi) preds.add(p);
  }
  const s0 = new Set(R[0]);
  if (s0.size === 3 && R[1].every(v => s0.has(v)) && new Set(R[1]).size === 3 &&
      s0.has(r2[0]) && s0.has(r2[1]) && r2[0] !== r2[1]) {
    for (const v of s0) if (v !== r2[0] && v !== r2[1]) preds.add(v);
  }
  if (kind === 'count' || kind === 'count0') {
    if (R.every(r => r[2] === r[0] + r[1])) { const p = r2[0] + r2[1]; if (p <= hi) preds.add(p); }
    if (R.every(r => r[2] === r[0] - r[1])) { const p = r2[0] - r2[1]; if (p >= lo) preds.add(p); }
  }
  return preds;
}
function predictSet(X) {
  const preds = new Set();
  const R = [X[0], X[1]], r2 = X[2];
  if (R.every(r => r[0] === r[1] && r[1] === r[2]) && r2[0] === r2[1]) preds.add(r2[0]);
  const s0 = new Set(R[0]);
  if (s0.size === 3 && R[1].every(v => s0.has(v)) && new Set(R[1]).size === 3 &&
      s0.has(r2[0]) && s0.has(r2[1]) && r2[0] !== r2[1]) {
    for (const v of s0) if (v !== r2[0] && v !== r2[1]) preds.add(v);
  }
  for (const op of Object.values(OPS)) {
    if (R.every(r => r[2] === op(r[0], r[1]))) { const p = op(r2[0], r2[1]); if (p !== 0) preds.add(p); }
  }
  return preds;
}
function predict(M, kind) {
  const f = isSet(kind) ? predictSet : X => predictScalar(X, kind);
  const out = f(M);
  for (const v of f(transpose(M))) out.add(v);
  return out;
}
const LAYOUT = [[], [4], [2, 6], [2, 4, 6], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8], [0, 2, 3, 4, 5, 6, 8], [0, 1, 2, 3, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]];

/** true when every attribute (and every derived quantity a person might reason about) has exactly one answer */
export function verifyMatrix(tpl, mats) {
  for (const key of TPL[tpl]) {
    const P = predict(mats[key], ATTR[key][0]);
    if (P.size !== 1 || !P.has(mats[key][2][2])) return false;
  }
  if (tpl === 'gridpos' || tpl === 'lines' || tpl === 'linesShape') {
    const C = mapM(mats[tpl === 'gridpos' ? 'grid.pos' : 'lines.set'], popcount);
    for (const v of predict(C, 'count0')) if (v !== C[2][2]) return false;
  }
  if (tpl === 'grid') {
    const S = mapM(mats['grid.count'], c => maskOf(LAYOUT[c]));
    for (const v of predict(S, 'pos')) if (v !== S[2][2]) return false;
  }
  return true;
}

/* ---------------------------------------------------------------- options (balanced tree) */
function pickAlt(rng, kind, M, v) {
  const [lo, hi] = DOM[kind];
  const all = range(lo, hi).filter(x => x !== v);
  const plausible = new Set([M[2][0], M[2][1], M[0][2], M[1][2]]);
  if (kind === 'angle') { plausible.add((v + 1) % 8); plausible.add((v + 7) % 8); plausible.add((v + 4) % 8); }
  else { plausible.add(v + 1); plausible.add(v - 1); }
  const pl = all.filter(x => plausible.has(x));
  return pl.length ? rng.pick(pl) : all.length ? rng.pick(all) : null;
}
function buildOptions(rng, spec, mats) {
  const keys = TPL[spec.tpl];
  const ans = {};
  for (const k of keys) ans[k] = mats[k][2][2];
  const k = spec.nOpts === 8 ? 3 : 2;
  for (let attempt = 0; attempt < 30; attempt++) {
    const gov = [], glob = [];
    for (const key of keys) {
      const kind = ATTR[key][0], M = mats[key];
      if (isSet(kind)) {
        if (!spec.governed[key]) continue;
        const pref = M[2][0] | M[2][1] | M[0][2] | M[1][2];
        const bits = rng.shuffle(range(0, SET_N[kind] - 1)).sort((a, b) => ((pref >> b) & 1) - ((pref >> a) & 1));
        for (const b of bits.slice(0, 4)) gov.push({ key, bit: b });
      } else {
        const alt = pickAlt(rng, kind, M, ans[key]);
        if (alt !== null) (spec.governed[key] ? gov : glob).push({ key, alt });
      }
    }
    const chosen = [];
    const usedScalar = new Set();
    for (const d of [...rng.shuffle(gov), ...rng.shuffle(glob)]) {
      if (chosen.length === k) break;
      if (d.alt !== undefined) { if (usedScalar.has(d.key)) continue; usedScalar.add(d.key); }
      chosen.push(d);
    }
    if (chosen.length < k) return null;
    const list = [];
    for (let m = 0; m < 1 << k; m++) {
      const a = { ...ans };
      chosen.forEach((d, i) => {
        if (m & (1 << i)) { if (d.alt !== undefined) a[d.key] = d.alt; else a[d.key] ^= 1 << d.bit; }
      });
      list.push(a);
    }
    if (list.some(a => keys.some(key => isSet(ATTR[key][0]) && a[key] === 0))) continue;
    const order = rng.shuffle(range(0, list.length - 1));
    return { list: order.map(i => list[i]), answer: order.indexOf(0), dims: chosen.map(d => d.key) };
  }
  return null;
}

/* ---------------------------------------------------------------- explanation */
function valName(kind, v) {
  if (kind === 'type' || kind === 'dtype') return TYPE_NAMES[v];
  if (kind === 'size') return SIZE_NAMES[v];
  if (kind === 'shade' || kind === 'oshade') return SHADE_NAMES[v];
  if (kind === 'angle') return DIR_NAMES[v];
  return String(v);
}
function ruleLine(tpl, key, fam, M) {
  const kind = ATTR[key][0];
  const label = tpl === 'hand' && key === 'hand.angle' ? 'Arrow' : ATTR[key][1];
  const name = v => valName(kind, v);
  const b = s => `<b>${label}</b> — ${s}`;
  const things = kind === 'lines' ? 'lines' : 'dots';
  switch (fam) {
    case 'constant':
      return isSet(kind) ? b('stays the same along each row.') : b(`stays the same along each row (${M.map(r => name(r[0])).join(', ')}).`);
    case 'progression': {
      if (kind === 'angle') {
        const d = (M[0][1] - M[0][0] + 8) % 8, deg = (d <= 4 ? d : 8 - d) * 45;
        return b(d === 4 ? 'flips 180° at each step.' : `turns ${deg}° ${d < 4 ? 'clockwise' : 'anticlockwise'} at each step.`);
      }
      const d = M[0][1] - M[0][0], n = Math.abs(d), up = d > 0;
      const eg = `(${name(M[0][0])} → ${name(M[0][1])} → ${name(M[0][2])})`;
      if (kind === 'type' || kind === 'dtype') return b(`${up ? 'gains' : 'loses'} ${n === 1 ? 'one side' : n + ' sides'} at each step ${eg}.`);
      if (kind === 'size') return b(`${up ? 'grows' : 'shrinks'} one step at a time ${eg}.`);
      if (kind === 'shade' || kind === 'oshade') return b(`${up ? 'fills in' : 'empties out'} ${n === 1 ? 'one step' : 'two steps'} at a time ${eg}.`);
      return b(`goes ${up ? 'up' : 'down'} by ${n} each time ${eg}.`);
    }
    case 'distribute':
      if (isSet(kind)) return b(`every row uses the same three ${kind === 'lines' ? 'line patterns' : 'layouts'}, each once.`);
      return b(`every row contains ${[...new Set(M[0])].map(name).join(', ')} — each exactly once.`);
    case 'add': return b(`the third tile has as many as the first two together (e.g. ${M[0][0]} + ${M[0][1]} = ${M[0][2]}).`);
    case 'sub': return b(`the third tile has the first minus the second (e.g. ${M[0][0]} − ${M[0][1]} = ${M[0][2]}).`);
    case 'xor': return b(`the third tile shows the ${things} that appear in exactly one of the first two — ${things} they share cancel out.`);
    case 'or': return b(`the third tile combines all the ${things} of the first two.`);
    case 'and': return b(`the third tile keeps only the ${things} the first two have in common.`);
    case 'diff': return b(`the third tile is the first one with the second one's ${things} removed.`);
  }
  return '';
}
function explain(spec, mats) {
  const keys = TPL[spec.tpl];
  const lines = keys.filter(k => spec.governed[k]).map(k => `<li>${ruleLine(spec.tpl, k, spec.governed[k], mats[k])}</li>`);
  const rest = keys.some(k => !spec.governed[k]) ? '<p class="muted">Everything else stays the same in every tile.</p>' : '';
  return `<p>Rules along each row:</p><ul class="rules">${lines.join('')}</ul>${rest}`;
}

/* ---------------------------------------------------------------- generate */
export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  for (let attempt = 0; attempt < 500; attempt++) {
    const spec = pickSpec(rng, L);
    const keys = TPL[spec.tpl];
    const mats = {};
    let bad = false;
    for (const key of keys) {
      const kind = ATTR[key][0], fam = spec.governed[key];
      let M;
      if (fam) M = isSet(kind) ? genSet(rng, kind, fam) : genScalar(rng, kind, fam);
      else { const v = globalValue(rng, key); M = [[v, v, v], [v, v, v], [v, v, v]]; }
      if (!M) { bad = true; break; }
      mats[key] = M;
    }
    if (bad) continue;
    if (spec.tpl === 'hands2') {
      const st = k => (mats[k][0][1] - mats[k][0][0] + 8) % 8;
      if (st('hand.angle') === st('hand2.angle')) continue;
    }
    if (!verifyMatrix(spec.tpl, mats)) continue;
    const opts = buildOptions(rng, spec, mats);
    if (!opts) continue;
    const cells = [];
    for (let i = 0; i < 8; i++) {
      const a = {};
      for (const k of keys) a[k] = mats[k][Math.floor(i / 3)][i % 3];
      cells.push(a);
    }
    return {
      game: 'matrix', level: L, tpl: spec.tpl, governed: spec.governed, mats,
      cells, options: opts.list, answer: opts.answer, dims: opts.dims,
      explain: explain(spec, mats),
    };
  }
  throw new Error('matrix: generation failed');
}

/* ---------------------------------------------------------------- drawing */
const SIZE_R = [17, 23, 29, 35];
const INNER_R = [9, 12, 15, 18];
const GRID_R = [5.5, 7.5, 9.5, 11.5];
const OSHADES = ['none', 'rgba(234,246,255,0.14)', 'rgba(234,246,255,0.3)'];
const GX = [22, 50, 78];
const SEGS = [[20, 20, 80, 20], [80, 20, 80, 80], [20, 80, 80, 80], [20, 20, 20, 80], [20, 20, 80, 80], [80, 20, 20, 80], [50, 20, 50, 80], [20, 50, 80, 50]];

function hand(angle, len, color, w) {
  const a = (angle * 45 - 90) * Math.PI / 180;
  const tx = 50 + len * Math.cos(a), ty = 50 + len * Math.sin(a);
  const hx = 50 + (len - 9) * Math.cos(a), hy = 50 + (len - 9) * Math.sin(a);
  const px = -Math.sin(a) * 5.5, py = Math.cos(a) * 5.5;
  return `<line x1="50" y1="50" x2="${hx.toFixed(2)}" y2="${hy.toFixed(2)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<polygon points="${tx.toFixed(2)},${ty.toFixed(2)} ${(hx + px).toFixed(2)},${(hy + py).toFixed(2)} ${(hx - px).toFixed(2)},${(hy - py).toFixed(2)}" fill="${color}"/>`;
}

export function cellSVG(tpl, a) {
  let s = '';
  switch (tpl) {
    case 'single':
      s = shapeSVG(a['shape.type'], 50, 50, SIZE_R[a['shape.size']], { fill: SHADES[a['shape.shade']] });
      break;
    case 'outin':
      s = shapeSVG(a['outer.type'], 50, 50, 42, { fill: OSHADES[a['outer.shade']] }) +
        shapeSVG(a['inner.type'], 50, 50, INNER_R[a['inner.size']], { fill: SHADES[a['inner.shade']], halo: true, sw: 2.2 });
      break;
    case 'grid': case 'gridpos': {
      const pos = tpl === 'grid' ? LAYOUT[a['grid.count']] : bitsOf(a['grid.pos'], 9);
      for (const p of pos) s += shapeSVG(a['grid.type'], GX[p % 3], GX[Math.floor(p / 3)], GRID_R[a['grid.size']], { fill: SHADES[a['grid.shade']], sw: 2 });
      break;
    }
    case 'lines': case 'linesShape':
      for (const i of bitsOf(a['lines.set'], 8)) {
        const [x1, y1, x2, y2] = SEGS[i];
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>`;
      }
      // the centre shape sits on a dark disc so the lines crossing the middle never blur its outline
      if (tpl === 'linesShape') s += `<circle cx="50" cy="50" r="20" fill="#0c1030"/>` + shapeSVG(a['core.type'], 50, 50, 16, { fill: SHADES[a['core.shade']], sw: 2.4 });
      break;
    case 'hand': case 'hands2':
      s = shapeSVG(a['dial.type'], 50, 50, 43, { fill: OSHADES[a['dial.shade']], sw: 2.2 }) +
        hand(a['hand.angle'], 31, INK, 3.6);
      if (tpl === 'hands2') s += hand(a['hand2.angle'], 21, '#ffc54d', 4.4);
      s += `<circle cx="50" cy="50" r="3.4" fill="${INK}"/>`;
      break;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}

/* ---------------------------------------------------------------- UI */
export function render(p, ui) {
  const tiles = p.cells.map(a => `<div class="mx-cell">${cellSVG(p.tpl, a)}</div>`).join('');
  ui.stage.innerHTML = `<div class="mx-board">${tiles}<div class="mx-cell mx-q"><span>?</span></div></div>`;
  ui.choice(p.options.map(a => cellSVG(p.tpl, a)), { cols: 4, cls: 'opt-tile' });
}
export function grade(p, r) { const ok = r === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-tile">${cellSVG(p.tpl, p.options[p.answer])}</div>`; }
export function reveal(p, ui) {
  const q = ui.stage.querySelector('.mx-q');
  if (q) { q.innerHTML = cellSVG(p.tpl, p.options[p.answer]); q.classList.add('revealed'); }
}
