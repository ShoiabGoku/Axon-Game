/* CUBE FOLD — which cube can this net fold into?
   The 11 cube nets are derived, not typed in: every hexomino is enumerated and "rolled" under a
   cube; the ones that touch six different faces are nets. Rolling also tells us which way each
   printed symbol points on the finished cube. An option is possible iff one of the 24 cube
   rotations shows exactly those three symbols in exactly those orientations (allowing for each
   symbol's own rotational symmetry). Every distractor is proven impossible that way. */

import { clamp, range } from '../core/rng.js';
import { norm2, key2, ROT24, mulMV, transpose3 } from '../core/poly.js';

export const meta = {
  id: 'cubefold', name: 'Cube Fold', title: 'Cube Folding', domain: 'spatial', kind: 'trial',
  icon: 'cube', tagline: 'Fold the net in your head',
  howTo: [
    'The flat net folds into a cube, with the printed side facing out.',
    'Pick the only cube that this net can make. Faces that are opposite each other can never be seen together.',
    'Watch which way the symbols point — on higher levels a turned symbol gives a fake away.',
  ],
  time: L => 45 + 8 * L,
  guess: () => 1 / 4,
  layout: 'split',
};

/* ------------------------------------------------ symbols (drawn in a −50…50 box) */
const SYMS = [
  { id: 'dot', order: 4, svg: c => `<circle r="17" fill="${c}"/>` },
  { id: 'ring', order: 4, svg: c => `<circle r="22" fill="none" stroke="${c}" stroke-width="9"/>` },
  { id: 'plus', order: 4, svg: c => `<path d="M-7-28h14v21h21v14h-21v21h-14v-21h-21v-14h21z" fill="${c}"/>` },
  { id: 'cross', order: 4, svg: c => `<path d="M-26-16l10-10 16 16 16-16 10 10-16 16 16 16-10 10-16-16-16 16-10-10 16-16z" fill="${c}"/>` },
  { id: 'square', order: 4, svg: c => `<rect x="-19" y="-19" width="38" height="38" rx="3" fill="${c}"/>` },
  { id: 'bars', order: 2, svg: c => `<rect x="-28" y="-20" width="56" height="12" rx="3" fill="${c}"/><rect x="-28" y="8" width="56" height="12" rx="3" fill="${c}"/>` },
  { id: 'diag', order: 2, svg: c => `<path d="M-30 22 L22 -30 L30 -22 L-22 30 Z" fill="${c}"/>` },
  { id: 'arrow', order: 1, svg: c => `<path d="M0-32 L24-6 H9 V30 H-9 V-6 H-24 Z" fill="${c}"/>` },
  { id: 'tri', order: 1, svg: c => `<path d="M0-28 L28 22 H-28 Z" fill="${c}"/>` },
  { id: 'ell', order: 1, svg: c => `<path d="M-22-28h14v42h30v14h-44z" fill="${c}"/>` },
  { id: 'half', order: 1, svg: c => `<rect x="-26" y="-26" width="52" height="52" fill="none" stroke="${c}" stroke-width="6"/><rect x="-26" y="-26" width="52" height="26" fill="${c}"/>` },
  { id: 'tee', order: 1, svg: c => `<path d="M-28-28h56v14h-21v42h-14v-42h-21z" fill="${c}"/>` },
  { id: 'flag', order: 1, svg: c => `<path d="M-20-30h8v60h-8z M-12-30 L26-17 L-12-4z" fill="${c}"/>` },
];
const SYM_COL = ['#38e1ff', '#ffc54d', '#ff5fa8', '#4cf3a3', '#9d7bff', '#ff8a3d', '#eaf6ff', '#38e1ff', '#ffc54d', '#ff5fa8', '#4cf3a3', '#9d7bff', '#ff8a3d'];

/* ------------------------------------------------ nets */
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function fixedPolyominoes(n) {
  let cur = new Map([['0,0', [[0, 0]]]]);
  for (let s = 1; s < n; s++) {
    const next = new Map();
    for (const cells of cur.values()) {
      const set = new Set(cells.map(c => c.join(',')));
      for (const [x, y] of cells) for (const [dx, dy] of D4) {
        if (set.has((x + dx) + ',' + (y + dy))) continue;
        const nc = norm2([...cells, [x + dx, y + dy]]);
        next.set(key2(nc), nc);
      }
    }
    cur = next;
  }
  return [...cur.values()];
}
const vkey = v => v.join(',');
const ROLL = {     // world rotation that brings the face on side d to the top
  '1,0': [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  '-1,0': [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  '0,1': [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  '0,-1': [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
};
const mul3 = (a, b) => a.map((row, i) => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
/** roll a cube under the net; returns per-cell { normal (local face), M } or null if not a net */
export function foldNet(cells) {
  const set = new Map(cells.map((c, i) => [c.join(','), i]));
  // a 2×2 block can never fold
  for (const [x, y] of cells) if (set.has((x + 1) + ',' + y) && set.has(x + ',' + (y + 1)) && set.has((x + 1) + ',' + (y + 1))) return null;
  const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const out = new Array(cells.length);
  out[0] = { M: I };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    const [x, y] = cells[i];
    for (const [dx, dy] of D4) {
      const j = set.get((x + dx) + ',' + (y + dy));
      if (j === undefined || out[j]) continue;
      // grid row grows downward, world y grows upward
      out[j] = { M: mul3(ROLL[dx + ',' + (-dy)], out[i].M) };
      queue.push(j);
    }
  }
  const normals = out.map(o => mulMV(transpose3(o.M), [0, 0, 1]));
  if (new Set(normals.map(vkey)).size !== 6) return null;
  return out.map((o, i) => ({ M: o.M, normal: normals[i] }));
}
export const NETS = fixedPolyominoes(6).filter(c => foldNet(c));

/* ------------------------------------------------ cube state */
const W_N = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];        // visible faces: top (+z), front-left (+x), front-right (+y)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const neg = a => [-a[0], -a[1], -a[2]];
function upEquivalent(sym, u1, u2) {
  const o = SYMS[sym].order;
  if (o === 4) return true;
  if (o === 2) return eq(u1, u2) || eq(u1, neg(u2));
  return eq(u1, u2);
}
export function buildFaces(cells, syms, rots) {
  const fold = foldNet(cells);
  const faces = {};
  fold.forEach((f, i) => {
    const r = rots[i] * Math.PI / 180;
    const upW = [Math.round(Math.sin(r)), Math.round(Math.cos(r)), 0];
    faces[vkey(f.normal)] = { sym: syms[i], up: mulMV(transpose3(f.M), upW), normal: f.normal };
  });
  return faces;
}
export function viewFrom(faces, Q) {
  return W_N.map(n => {
    const f = faces[vkey(mulMV(transpose3(Q), n))];
    return { sym: f.sym, up: mulMV(Q, f.up) };
  });
}
export function possible(faces, view) {
  return ROT24.some(Q => viewFrom(faces, Q).every((v, j) => v.sym === view[j].sym && upEquivalent(v.sym, v.up, view[j].up)));
}
const sameView = (a, b) => a.every((v, j) => v.sym === b[j].sym && upEquivalent(v.sym, v.up, b[j].up));

/* ------------------------------------------------ generate */
const LEVEL = {
  1: { pool: [0, 1, 2, 3, 4, 5], asym: 0, mods: ['opp', 'opp', 'swap'] },
  2: { pool: [0, 1, 2, 3, 4, 5, 6], asym: 0, mods: ['opp', 'swap', 'swap'] },
  3: { pool: [0, 1, 2, 3, 4, 5, 6, 7], asym: 1, mods: ['opp', 'swap', 'rot'] },
  4: { pool: [0, 1, 2, 3, 4, 5, 6, 7, 8], asym: 2, mods: ['opp', 'swap', 'rot'] },
  5: { pool: range(0, 12), asym: 2, mods: ['swap', 'rot', 'rot'] },
  6: { pool: range(0, 12), asym: 3, mods: ['opp', 'rot', 'rot'] },
  7: { pool: range(0, 12), asym: 4, mods: ['swap', 'rot', 'rot'] },
  8: { pool: range(0, 12), asym: 5, mods: ['rot', 'rot', 'swap'] },
  9: { pool: range(0, 12), asym: 6, mods: ['rot', 'rot', 'rot'] },
  10: { pool: range(0, 12), asym: 6, mods: ['rot', 'rot', 'rot'], hard: true },
};
// the cyclic map C(v) = (v_y, v_z, v_x) takes RIGHT→TOP, TOP→LEFT, LEFT→RIGHT
const C = v => [v[1], v[2], v[0]];
function moveUp(up, from, to) { let u = up, f = from; let guard = 0; while (f !== to && guard++ < 3) { u = C(u); f = { 1: 0, 0: 2, 2: 1 }[f]; } return u; }

function makeDistractor(rng, faces, base, kind) {
  const v = base.map(x => ({ sym: x.sym, up: x.up.slice() }));
  if (kind === 'opp') {
    const k = rng.int(0, 2), j = rng.pick([0, 1, 2].filter(x => x !== k));
    // the face opposite to face k in the cube
    const localK = Object.values(faces).find(f => f.sym === v[k].sym);
    const opp = faces[vkey(neg(localK.normal))];
    if (v.some(x => x.sym === opp.sym)) return null;
    const ups = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter(u => u[0] * W_N[j][0] + u[1] * W_N[j][1] + u[2] * W_N[j][2] === 0);
    v[j] = { sym: opp.sym, up: rng.pick(ups) };
    return { v, kind, why: `opposite:${v[k].sym}:${opp.sym}` };
  }
  if (kind === 'swap') {
    const [j, k] = rng.sample([0, 1, 2], 2);
    const a = v[j], b = v[k];
    v[j] = { sym: b.sym, up: moveUp(b.up, k, j) };
    v[k] = { sym: a.sym, up: moveUp(a.up, j, k) };
    return { v, kind, why: 'swap' };
  }
  // rot: turn one asymmetric symbol by 90° or 180° within its face
  const cand = [0, 1, 2].filter(j => SYMS[v[j].sym].order < 4);
  if (!cand.length) return null;
  const j = rng.pick(cand);
  const n = W_N[j];
  const turns = SYMS[v[j].sym].order === 2 ? 1 : rng.pick([1, 2, 3]);
  let u = v[j].up;
  for (let t = 0; t < turns; t++) u = cross(n, u);
  v[j] = { sym: v[j].sym, up: u };
  return { v, kind, why: `rot:${v[j].sym}` };
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  for (let attempt = 0; attempt < 400; attempt++) {
    const cells = rng.pick(NETS);
    const asymPool = cfg.pool.filter(s => SYMS[s].order === 1);
    const symPool = cfg.pool.filter(s => SYMS[s].order > 1);
    const nAsym = Math.min(cfg.asym, asymPool.length);
    if (symPool.length < 6 - nAsym) continue;
    const syms = rng.shuffle([...rng.sample(asymPool, nAsym), ...rng.sample(symPool, 6 - nAsym)]);
    const rots = cells.map(() => rng.pick([0, 90, 180, 270]));
    const faces = buildFaces(cells, syms, rots);
    const Q = rng.pick(ROT24);
    const correct = viewFrom(faces, Q);
    if (cfg.hard && correct.filter(x => SYMS[x.sym].order === 1).length < 2) continue;
    const opts = [{ v: correct, kind: 'ok' }];
    let ok = true;
    for (const kind of cfg.mods) {
      let d = null;
      for (let t = 0; t < 25 && !d; t++) {
        const base = viewFrom(faces, rng.pick(ROT24));
        const c = makeDistractor(rng, faces, base, kind);
        if (!c || possible(faces, c.v)) continue;
        if (opts.some(o => sameView(o.v, c.v))) continue;
        d = c;
      }
      if (!d) { ok = false; break; }
      opts.push(d);
    }
    if (!ok) continue;
    const order = rng.shuffle(range(0, opts.length - 1));
    const list = order.map(i => opts[i]);
    return {
      game: 'cubefold', level: L, cells, syms, rots, faces,
      opts: list.map(o => o.v), kinds: list.map(o => o.kind), whys: list.map(o => o.why || ''),
      answer: list.findIndex(o => o.kind === 'ok'),
      explain: explain(list),
    };
  }
  throw new Error('cubefold: generation failed');
}

function explain(list) {
  const L = 'ABCD';
  const items = list.map((o, i) => {
    if (o.kind === 'ok') return `<li><b>${L[i]}</b> — folds correctly: all three faces are neighbours in the net and every symbol points the right way.</li>`;
    if (o.why.startsWith('opposite')) {
      const [, a, b] = o.why.split(':').map(Number);
      return `<li><b>${L[i]}</b> — shows ${symIcon(a)} and ${symIcon(b)} side by side, but they are <b>opposite</b> faces of the cube.</li>`;
    }
    if (o.why.startsWith('rot')) {
      const s = +o.why.split(':')[1];
      return `<li><b>${L[i]}</b> — the ${symIcon(s)} symbol is <b>turned the wrong way</b> for where it sits.</li>`;
    }
    return `<li><b>${L[i]}</b> — the faces are arranged in <b>mirror order</b>; no way of holding the cube shows them like that.</li>`;
  });
  return `<ul class="rules">${items.join('')}</ul>`;
}

/* ------------------------------------------------ drawing */
export function symIcon(s) {
  return `<svg viewBox="-50 -50 100 100" class="cf-i"><rect x="-48" y="-48" width="96" height="96" rx="10" fill="#1a2152"/><g transform="scale(.8)">${SYMS[s].svg(SYM_COL[s])}</g></svg>`;
}
export function netSVG(cells, syms, rots) {
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
  const u = 30;
  const body = cells.map(([x, y], i) => `<g transform="translate(${x * u + u / 2} ${y * u + u / 2})">
      <rect x="${-u / 2}" y="${-u / 2}" width="${u}" height="${u}" fill="#1a2152" stroke="#8fa0ff" stroke-opacity=".55" stroke-width="1"/>
      <g transform="rotate(${rots[i]}) scale(.24)">${SYMS[syms[i]].svg(SYM_COL[syms[i]])}</g></g>`).join('');
  return `<svg viewBox="-3 -3 ${w * u + 6} ${h * u + 6}" class="cf-net" aria-label="cube net">${body}</svg>`;
}
const C30 = Math.cos(Math.PI / 6);
/* Isometric projection for a viewer at +(1,1,1) looking back at the cube (screen y points down).
   Screen-right is world (−1, 1, 0): the +x face is drawn on the LEFT and the +y face on the
   RIGHT. Using (x − y) here instead would draw the mirror image of the real view. */
const P = v => [(v[1] - v[0]) * C30, (v[0] + v[1]) * 0.5 - v[2]];
export const isoProject = P;
export function cubeSVG(view) {
  const S = 42, O = [50, 52];
  const scr = v => { const p = P(v); return [O[0] + p[0] * S, O[1] + p[1] * S]; };
  const facePts = [
    [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
  ];
  const centers = [[0.5, 0.5, 1], [1, 0.5, 0.5], [0.5, 1, 0.5]];
  const fills = ['#2a3478', '#1c2459', '#141a42'];
  let s = '';
  view.forEach((f, j) => {
    const pts = facePts[j].map(v => scr(v).map(x => x.toFixed(2)).join(',')).join(' ');
    s += `<polygon points="${pts}" fill="${fills[j]}" stroke="#8fa0ff" stroke-opacity=".7" stroke-width="1.1" stroke-linejoin="round"/>`;
    const up = f.up, right = cross(up, W_N[j]);
    const pr = P(right), pu = P(up), c = scr(centers[j]);
    const k = S / 100 * 0.78;
    s += `<g transform="matrix(${(pr[0] * k).toFixed(4)} ${(pr[1] * k).toFixed(4)} ${(-pu[0] * k).toFixed(4)} ${(-pu[1] * k).toFixed(4)} ${c[0].toFixed(2)} ${c[1].toFixed(2)})">${SYMS[f.sym].svg(SYM_COL[f.sym])}</g>`;
  });
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  ui.stage.innerHTML = `<div class="cf-wrap"><div class="rt-lab">Net</div>${netSVG(p.cells, p.syms, p.rots)}</div><p class="prompt">Which cube can this net fold into?</p>`;
  ui.choice(p.opts.map(cubeSVG), { cols: 4, cls: 'opt-tile', letters: true, mobileCols: 2 });
}
export function grade(p, r) { const ok = r === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-tile">${cubeSVG(p.opts[p.answer])}</div>`; }
