/* AXON generator verification.
   Generates many puzzles per game and level and re-checks them with INDEPENDENT solvers written
   here (not the generators' own checks wherever practical): uniqueness, answer correctness,
   option balance, rendering, and generation speed.
   Run:  node tests/verify.js            (quick, ~60 puzzles per level)
         node tests/verify.js --n=300    (thorough) */

import fs from 'node:fs';
import { makeRng } from '../js/core/rng.js';
import * as matrix from '../js/games/matrix.js';
import * as sequence from '../js/games/sequence.js';
import * as oddone from '../js/games/oddone.js';
import * as syllogism from '../js/games/syllogism.js';
import * as truth from '../js/games/truth.js';
import * as lineup from '../js/games/lineup.js';
import * as codelock from '../js/games/codelock.js';
import * as symbols from '../js/games/symbols.js';
import * as balance from '../js/games/balance.js';
import * as rotation from '../js/games/rotation.js';
import * as cubefold from '../js/games/cubefold.js';
import * as corsi from '../js/games/corsi.js';
import * as digitspan from '../js/games/digitspan.js';
import * as stroop from '../js/games/stroop.js';
import * as compare from '../js/games/compare.js';
import { canon2, canon3, mirror2, norm2, cubeVisibility, ROT24, mulMV, transpose3, key2 } from '../js/core/poly.js';

const arg = process.argv.find(a => a.startsWith('--n='));
const N = arg ? +arg.slice(4) : 60;
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);

let failures = 0, checks = 0;
const fail = (game, L, seed, msg) => { failures++; if (failures <= 40) console.log(`  ✗ ${game} L${L} seed=${seed}: ${msg}`); };
const ok = (cond, game, L, seed, msg) => { checks++; if (!cond) fail(game, L, seed, msg); return cond; };

/* ---------------------------------------------------------------- independent checkers */
const CHECK = {
  matrix(p, L, s) {
    const n = p.options.length;
    ok(n === (L <= 2 ? 4 : 8), 'matrix', L, s, `option count ${n}`);
    ok(matrix.verifyMatrix(p.tpl, p.mats), 'matrix', L, s, 'verify failed');
    const keys = Object.keys(p.mats);
    const ans = {}; keys.forEach(k => { ans[k] = p.mats[k][2][2]; });
    ok(keys.every(k => p.options[p.answer][k] === ans[k]), 'matrix', L, s, 'answer option mismatch');
    const sig = new Set(p.options.map(o => JSON.stringify(o)));
    ok(sig.size === n, 'matrix', L, s, 'duplicate options');
    const consistent = p.options.filter(o => keys.every(k => o[k] === ans[k])).length;
    ok(consistent === 1, 'matrix', L, s, `${consistent} consistent options`);
    // balance: for every perturbed scalar attribute the answer value is in exactly half the options
    for (const k of new Set(p.dims)) {
      const same = p.options.filter(o => o[k] === ans[k]).length;
      if (p.dims.filter(d => d === k).length === 1) ok(same === n / 2, 'matrix', L, s, `unbalanced ${k}: ${same}/${n}`);
    }
    p.options.forEach(o => ok(matrix.cellSVG(p.tpl, o).includes('<svg'), 'matrix', L, s, 'render'));
  },
  sequence(p, L, s) {
    ok(Number.isInteger(p.answer), 'sequence', L, s, 'non-integer answer');
    ok(p.terms.filter(x => x === null).length === 1, 'sequence', L, s, 'gap count');
    if (p.gap === p.terms.length - 1) {
      const P = sequence.predictionsFor(p.terms.slice(0, -1));
      ok(P.size === 1 && P.has(p.answer), 'sequence', L, s, `ambiguous next term {${[...P]}} vs ${p.answer}`);
    } else {
      const C = sequence.gapCandidates(p.terms, p.gap);
      ok(C.length === 1 && C[0] === p.answer, 'sequence', L, s, `ambiguous gap [${C}] vs ${p.answer}`);
    }
    ok(Math.abs(p.answer) <= 99999, 'sequence', L, s, 'answer too large');
  },
  oddone(p, L, s) {
    if (p.rule === 'mirror') {
      const flips = p.figs.map(f => f.flip);
      ok(flips.filter(Boolean).length === 1 && flips[p.answer], 'oddone', L, s, 'mirror marking');
      ok(canon2(p.figs[0].cells) !== canon2(mirror2(p.figs[0].cells)), 'oddone', L, s, 'not chiral');
    } else {
      const c = oddone.oddCandidates(p.figs);
      ok(c.size === 1 && c.has(p.answer), 'oddone', L, s, `candidates ${[...c.keys()]}`);
    }
    p.figs.forEach(f => ok(oddone.figSVG(f).includes('<svg'), 'oddone', L, s, 'render'));
  },
  syllogism(p, L, s) {
    ok(['T', 'F', 'C'].includes(p.answer), 'syllogism', L, s, 'bad answer');
    if (p.type === 'cat') {
      // independent Venn-model enumeration
      const { prem, concl } = p._raw;
      const holds = (st, m) => {
        let any = false;
        for (let r = 1; r < 8; r++) {
          if (!((m >> (r - 1)) & 1)) continue;
          const inX = (r >> st.x) & 1, inY = (r >> st.y) & 1;
          if ((st.f === 'A' || st.f === 'O') && inX && !inY) any = true;
          if ((st.f === 'E' || st.f === 'I') && inX && inY) any = true;
        }
        return st.f === 'A' || st.f === 'E' ? !any : any;
      };
      let t = 0, f = 0;
      for (let m = 1; m < 128; m++) {
        let nonempty = true;
        for (let k = 0; k < 3; k++) { let has = false; for (let r = 1; r < 8; r++) if (((m >> (r - 1)) & 1) && ((r >> k) & 1)) has = true; if (!has) nonempty = false; }
        if (!nonempty || !prem.every(st => holds(st, m))) continue;
        if (holds(concl, m)) t++; else f++;
      }
      const v = t && !f ? 'T' : f && !t ? 'F' : 'C';
      ok(t + f > 0, 'syllogism', L, s, 'inconsistent premises');
      ok(v === p.answer, 'syllogism', L, s, `cat verdict ${v} vs ${p.answer}`);
    } else {
      const { prem, c, n } = p._raw;
      const lit = (w, i, ng) => (((w >> i) & 1) === 1) !== !!ng;
      const ev = (q, w) => {
        const A = lit(w, q.a, q.na), B = q.b === undefined ? null : lit(w, q.b, q.nb);
        switch (q.t) {
          case 'fact': return A;
          case 'impl': case 'onlyIf': return !A || B;
          case 'or': case 'unless': return A || B;
          case 'xor': return A !== B;
          case 'nand': return !(A && B);
          case 'iff': return A === B;
          case 'and': return A && B;
        }
        throw new Error('form ' + q.t);
      };
      let t = 0, f = 0;
      for (let w = 0; w < 1 << n; w++) { if (!prem.every(q => ev(q, w))) continue; if (ev(c, w)) t++; else f++; }
      const v = t && !f ? 'T' : f && !t ? 'F' : 'C';
      ok(v === p.answer, 'syllogism', L, s, `prop verdict ${v} vs ${p.answer}`);
    }
  },
  truth(p, L, s) {
    const sols = truth.solveTruth(p.n, p._stmts);
    ok(sols.length === 1 && sols[0].every((x, i) => x === p.answer[i]), 'truth', L, s, `${sols.length} solutions`);
  },
  lineup(p, L, s) {
    // independent clue semantics
    const pos = []; p.answer.forEach((who, seat) => { pos[who] = seat; });
    const n = p.n;
    const ev = (c, P) => {
      const A = P[c.a], B = P[c.b], C = P[c.c];
      switch (c.k) {
        case 'left': return A < B; case 'imm': return B === A + 1; case 'adj': return Math.abs(A - B) === 1;
        case 'nadj': return Math.abs(A - B) >= 2; case 'end': return A === 0 || A === n - 1; case 'nend': return A > 0 && A < n - 1;
        case 'at': return A === c.v; case 'nat': return A !== c.v; case 'gap': return Math.abs(A - B) - 1 === c.v;
        case 'between': return (B < A && A < C) || (C < A && A < B); case 'rightBoth': return A > B && A > C;
      }
      throw new Error(c.k);
    };
    ok(p._clues.every(c => ev(c, pos)), 'lineup', L, s, 'answer violates a clue');
    let count = 0;
    const permute = (arr, k) => {
      if (k === arr.length) { const P = []; arr.forEach((w, seat) => { P[w] = seat; }); if (p._clues.every(c => ev(c, P))) count++; return; }
      for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; permute(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
    };
    permute([...Array(n).keys()], 0);
    ok(count === 1, 'lineup', L, s, `${count} arrangements`);
  },
  codelock(p, L, s) {
    const fb = (code, g) => { let a = 0, b = 0; g.forEach((d, i) => { if (code[i] === d) a++; else if (code.includes(d)) b++; }); return [a, b]; };
    let count = 0, found = null;
    const k = p.k;
    const rec = pre => {
      if (pre.length === k) { if (p.clues.every(c => { const [a, b] = fb(pre, c.g); return a === c.a && b === c.b; })) { count++; found = pre; } return; }
      for (let d = 0; d <= 9; d++) if (!pre.includes(d)) rec([...pre, d]);
    };
    rec([]);
    ok(count === 1 && found.join('') === p.answer.join(''), 'codelock', L, s, `${count} codes`);
  },
  symbols(p, L, s) {
    // independent evaluator via JS arithmetic
    const val = (tokens, v) => Function('return ' + tokens.map(t => (typeof t === 'number' ? v[t] : t === '×' ? '*' : t === '−' ? '-' : '+')).join(' '))();
    const idx = p.syms;
    let count = 0;
    const v = new Array(6).fill(0);
    const rec = i => {
      if (count > 1) return;
      if (i === idx.length) { if (p.eqs.every(e => val(e.lhs, v) === e.rhs)) count++; return; }
      for (let x = 1; x <= 20; x++) { v[idx[i]] = x; rec(i + 1); }
    };
    if (idx.length <= 3) rec(0); else count = symbols.countSolutions(idx.length, p.eqs.map(e => ({ lhs: e.lhs.map(t => (typeof t === 'number' ? idx.indexOf(t) : t)), rhs: e.rhs }))).found;
    ok(count === 1, 'symbols', L, s, `${count} solutions`);
    const vv = new Array(6).fill(0); idx.forEach((sIdx, j) => { vv[sIdx] = p.values[j]; });
    ok(p.eqs.every(e => val(e.lhs, vv) === e.rhs), 'symbols', L, s, 'stored values do not satisfy equations');
    ok(val(p.question, vv) === p.answer, 'symbols', L, s, 'answer mismatch');
  },
  balance(p, L, s) {
    const tot = (items, w) => items.reduce((a, i) => a + w[i], 0);
    ok(p.scales.every(sc => tot(sc.L, p.weights) === tot(sc.R, p.weights)), 'balance', L, s, 'weights do not balance');
    ok(tot(p.q.L, p.weights) === p.answer * p.weights[p.q.target], 'balance', L, s, 'answer mismatch');
    const A = balance.checkBalance(p.k, p.scales, p.q);
    ok(A.size === 1 && A.has(p.answer), 'balance', L, s, `answers {${[...A]}}`);
  },
  rotation(p, L, s) {
    if (p.d === 2) {
      const ct = canon2(p.target.cells);
      const same = p.opts.filter(o => canon2(o.cells) === ct).length;
      ok(same === 1 && canon2(p.opts[p.answer].cells) === ct, 'rotation', L, s, `${same} rotation-equal options`);
    } else {
      const ct = canon3(p.target.cells);
      const same = p.opts.filter(o => canon3(o.cells) === ct).length;
      ok(same === 1 && canon3(p.opts[p.answer].cells) === ct, 'rotation', L, s, `${same} rotation-equal options`);
      for (const o of [p.target, ...p.opts]) ok(Math.min(...cubeVisibility(o.cells, o.R, 72)) >= 0.2, 'rotation', L, s, 'hidden cube');
    }
  },
  cubefold(p, L, s) {
    const poss = p.opts.map(v => cubefold.possible(p.faces, v));
    ok(poss.filter(Boolean).length === 1 && poss[p.answer], 'cubefold', L, s, `possible: ${poss}`);
  },
  corsi(p, L, s) { ok(new Set(p.seq).size === p.span && p.answer.length === p.span, 'corsi', L, s, 'sequence'); },
  digitspan(p, L, s) { ok(p.digits.length === p.span && p.answer.length === p.span, 'digitspan', L, s, 'digits'); },
  stroop(p, L, s) { ok(p.trials.length === p.N && p.trials.every(t => t.target >= 0 && t.target < p.nCols), 'stroop', L, s, 'trials'); },
  compare(p, L, s) { ok(p.pairs.length === p.N && p.pairs.every(q => q.a.v !== q.b.v && (q.a.v > q.b.v) === (q.big === 0)), 'compare', L, s, 'pairs'); },
};

/* ---------------------------------------------------------------- structural unit tests */
function unitTests() {
  // the 11 cube nets
  const free = new Set(cubefold.NETS.map(c => {
    const forms = [];
    let cur = c;
    for (let m = 0; m < 2; m++) {
      for (let r = 0; r < 4; r++) { forms.push(key2(cur)); cur = cur.map(([x, y]) => [-y, x]); }
      cur = mirror2(cur);
    }
    return forms.sort()[0];
  }));
  ok(free.size === 11, 'cubefold', 0, '-', `expected 11 free nets, got ${free.size}`);
  // belt test: four cells in a row with arrows pointing along the row wrap consistently
  const belt = [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]];
  const fold = cubefold.foldNet(belt);
  ok(!!fold, 'cubefold', 0, '-', 'cross net did not fold');
  if (fold) {
    const n = i => fold[i].normal;
    const negEq = (a, b) => a.every((x, j) => x === -b[j]);
    ok(negEq(n(0), n(2)) && negEq(n(1), n(3)) && negEq(n(4), n(5)), 'cubefold', 0, '-', 'opposite faces wrong');
    const crossP = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const axes = [0, 1, 2, 3].map(i => crossP(n(i), mulMV(transpose3(fold[i].M), [1, 0, 0])).join(','));
    ok(new Set(axes).size === 1, 'cubefold', 0, '-', `belt arrows inconsistent ${axes}`);
  }
  // hand-worked physical case: cross net U / L F R / D / B. With F in front and U on top, R must be
  // on the right — never the left (that would be the mirror image of a real cube).
  {
    const cells = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]], names = ['U', 'L', 'F', 'R', 'D', 'B'];
    const symOf = { U: 7, L: 0, F: 8, R: 11, D: 1, B: 2 };
    const nrm = norm2(cells);
    const syms = nrm.map(c => symOf[names[cells.findIndex(d => d[0] === c[0] && d[1] === c[1])]]);
    const faces = cubefold.buildFaces(nrm, syms, nrm.map(() => 0));
    const views = ROT24.map(Q => cubefold.viewFrom(faces, Q).map(v => v.sym).join(','));
    ok(views.includes('7,8,11'), 'cubefold', 0, '-', 'cross net cannot show U top, F front-left, R front-right');
    ok(!views.includes('7,11,8'), 'cubefold', 0, '-', 'cross net shows the mirrored arrangement');
    // the drawn top face must wind counter-clockwise (y up) as a real viewer outside the cube sees it
    const pts = [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]].map(v => { const p = cubefold.isoProject(v); return [p[0], -p[1]]; });
    let area = 0;
    for (let i = 0; i < 4; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4]; area += x1 * y2 - x2 * y1; }
    ok(area > 0, 'cubefold', 0, '-', 'isometric projection is mirrored');
  }
  ok(ROT24.length === 24, 'poly', 0, '-', 'ROT24');
  // every shipped file must be precached by the service worker, or the app breaks offline
  const root = new URL('..', import.meta.url);
  const swSrc = fs.readFileSync(new URL('sw.js', root), 'utf8');
  const listed = new Set([...swSrc.matchAll(/'([^']+\.(?:js|css|png|svg|html|webmanifest))'/g)].map(m => m[1]));
  const walk = dir => fs.readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
  for (const f of [...walk('js/'), ...walk('css/'), ...walk('icons/').filter(f => !/icon-(square|maskable)\.svg$/.test(f)), 'index.html', 'manifest.webmanifest']) {
    ok(listed.has(f), 'sw', 0, '-', `${f} missing from sw.js CORE`);
  }
  for (const f of listed) ok(fs.existsSync(new URL(f, root)), 'sw', 0, '-', `sw.js lists missing file ${f}`);
  // the manifest must parse and carry installable icons
  const man = JSON.parse(fs.readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
  ok(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512'), 'manifest', 0, '-', 'needs 192 and 512 icons');
  ok(man.icons.some(i => i.purpose === 'maskable'), 'manifest', 0, '-', 'needs a maskable icon');
}

/* ---------------------------------------------------------------- run */
const GAMES = { matrix, sequence, oddone, syllogism, truth, lineup, codelock, symbols, balance, rotation, cubefold, corsi, digitspan, stroop, compare };
console.log(`AXON generator verification — ${N} puzzles per level\n`);
unitTests();
const t0 = Date.now();
for (const [id, G] of Object.entries(GAMES)) {
  if (only && id !== only) continue;
  const times = [];
  const verdicts = { T: 0, F: 0, C: 0 };
  const before = failures;
  for (let L = 1; L <= 10; L++) {
    for (let i = 0; i < N; i++) {
      const seed = `${id}-${L}-${i}`;
      const a = performance.now();
      let p;
      try { p = G.generate(makeRng(seed), L); }
      catch (e) { fail(id, L, seed, 'THREW ' + e.message); continue; }
      times.push(performance.now() - a);
      try { CHECK[id](p, L, seed); } catch (e) { fail(id, L, seed, 'CHECK THREW ' + e.stack); }
      ok(typeof p.explain === 'string', id, L, seed, 'explain missing');
      if (id === 'syllogism') verdicts[p.answer]++;
      // determinism
      if (i === 0) {
        const q = G.generate(makeRng(seed), L);
        ok(JSON.stringify(q.answer) === JSON.stringify(p.answer), id, L, seed, 'not deterministic');
      }
    }
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((s, x) => s + x, 0) / times.length;
  const extra = id === 'syllogism' ? `  verdicts T/F/C = ${verdicts.T}/${verdicts.F}/${verdicts.C}` : '';
  console.log(`${failures === before ? '✓' : '✗'} ${id.padEnd(10)} mean ${mean.toFixed(1).padStart(6)} ms   p99 ${times[Math.floor(times.length * 0.99)].toFixed(1).padStart(6)} ms   max ${times[times.length - 1].toFixed(0).padStart(5)} ms${extra}`);
}
console.log(`\n${checks} checks, ${failures} failures, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failures ? 1 : 0);
