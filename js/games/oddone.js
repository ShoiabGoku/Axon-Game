/* ODD ONE OUT — every figure is described by a list of features (shape, colour, fill, dot count,
   parities, sides-vs-dots relations, inner shapes, handedness…). A puzzle is accepted only when
   exactly one figure is singled out by a 4-vs-1 split, across ALL features, so there is never a
   second defensible answer. */

import { shapeSVG, COLORS, COLOR_NAMES, TYPE_NAMES, TYPE_SIDES, INK, DARK, uid } from '../core/draw.js';
import { randomPolyomino, isChiral2, mirror2, norm2 } from '../core/poly.js';
import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'oddone', name: 'Odd One Out', title: 'Odd One Out', domain: 'pattern', kind: 'trial',
  icon: 'oddone', tagline: 'Find the figure that breaks the rule',
  howTo: [
    'All the figures but one share a hidden property — a shape, colour, count, relation or orientation.',
    'Tap the one that does not belong, then lock it in.',
    'Mirror images count as different: a figure flipped over is not the same as one turned around.',
  ],
  time: L => 40 + 5 * L,
  guess: p => 1 / p.figs.length,
};

const FILL_NAMES = ['outlined', 'solid', 'striped'];

const FEAT = {
  shape: f => f.shape,
  curved: f => f.shape === 4,
  sidesParity: f => (f.shape === 4 ? 'c' : TYPE_SIDES[f.shape] % 2),
  color: f => f.color,
  fill: f => f.fill,
  filled: f => f.fill !== 0,
  dots: f => f.dots,
  hasDots: f => f.dots > 0,
  dotsParity: f => f.dots % 2,
  size: f => f.size,
  dotsEqSides: f => f.shape !== 4 && f.dots === TYPE_SIDES[f.shape],
  sum: f => (f.shape === 4 ? -1 : f.dots + TYPE_SIDES[f.shape]),
  inner: f => f.inner,
  innerSame: f => f.inner === f.shape,
};

/** map: figure index → features that single it out as a lone minority */
export function oddCandidates(figs) {
  const cand = new Map();
  for (const [name, fn] of Object.entries(FEAT)) {
    const vals = figs.map(fn);
    const counts = new Map();
    vals.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    if (counts.size !== 2) continue;
    for (const [v, c] of counts) if (c === 1) {
      const i = vals.indexOf(v);
      if (!cand.has(i)) cand.set(i, []);
      cand.get(i).push(name);
    }
  }
  return cand;
}

const base = (o = {}) => ({ kind: 'shape', shape: 1, color: 0, fill: 0, dots: 0, size: 1, inner: -1, ...o });

const RULES = {
  shape(rng, n) {
    const a = rng.int(0, 4), b = rng.pick(range(0, 4).filter(x => x !== a));
    const common = { color: rng.int(0, 5), fill: rng.int(0, 2), size: 1 };
    const odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => base({ ...common, shape: i === odd ? b : a }));
    return { figs, odd, feature: 'shape', why: `All the others are ${TYPE_NAMES[a]}s — this is the only ${TYPE_NAMES[b]}.` };
  },
  color(rng, n) {
    const c0 = rng.int(0, 5), c1 = rng.pick(range(0, 5).filter(x => x !== c0));
    const fill = rng.int(0, 2), odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => base({ shape: rng.int(0, 3), color: i === odd ? c1 : c0, fill }));
    return { figs, odd, feature: 'color', why: `It is the only ${COLOR_NAMES[c1]} figure — the rest are ${COLOR_NAMES[c0]}.` };
  },
  fill(rng, n) {
    const f0 = rng.int(0, 2), f1 = rng.pick(range(0, 2).filter(x => x !== f0));
    const color = rng.int(0, 5), odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => base({ shape: rng.int(0, 4), color, fill: i === odd ? f1 : f0 }));
    return { figs, odd, feature: 'fill', why: `It is the only ${FILL_NAMES[f1]} figure — the others are all ${FILL_NAMES[f0]}.` };
  },
  dots(rng, n) {
    const k = rng.int(2, 5), k2 = rng.pick([k - 1, k + 1, k + 2].filter(x => x >= 1 && x <= 7));
    const odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => base({ shape: rng.int(0, 4), color: rng.int(0, 5), fill: rng.pick([0, 2]), dots: i === odd ? k2 : k }));
    return { figs, odd, feature: 'dots', why: `The others each contain ${k} dots — this one has ${k2}.` };
  },
  parity(rng, n) {
    const evenRule = rng.chance(0.5);
    const pool = evenRule ? [2, 4, 6] : [1, 3, 5, 7];
    const oddPool = evenRule ? [1, 3, 5, 7] : [2, 4, 6];
    const odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => base({
      shape: rng.int(0, 4), color: rng.int(0, 5), fill: rng.pick([0, 2]),
      dots: i === odd ? rng.pick(oddPool) : rng.pick(pool),
    }));
    const w = evenRule ? 'even' : 'odd', w2 = evenRule ? 'odd' : 'even';
    return { figs, odd, feature: 'dotsParity', why: `The others all have an ${w} number of dots — this one has ${figs[odd].dots}, an ${w2} number.` };
  },
  eqSides(rng, n) {
    const odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => {
      const shape = rng.int(0, 3), sides = TYPE_SIDES[shape];
      const dots = i === odd ? rng.pick([sides - 1, sides + 1].filter(x => x >= 1 && x <= 7)) : sides;
      return base({ shape, color: rng.int(0, 5), fill: rng.pick([0, 2]), dots });
    });
    const f = figs[odd];
    return { figs, odd, feature: 'dotsEqSides', why: `In every other figure the number of dots equals the number of sides — this ${TYPE_NAMES[f.shape]} has ${TYPE_SIDES[f.shape]} sides but ${f.dots} dots.` };
  },
  inner(rng, n) {
    const odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => {
      const shape = rng.int(0, 4);
      return base({ shape, color: rng.int(0, 5), fill: rng.pick([0, 2]), inner: i === odd ? rng.pick(range(0, 4).filter(x => x !== shape)) : shape });
    });
    const f = figs[odd];
    return { figs, odd, feature: 'innerSame', why: `In the others the inner shape matches the outer one — here a ${TYPE_NAMES[f.inner]} sits inside a ${TYPE_NAMES[f.shape]}.` };
  },
  sum(rng, n) {
    const K = rng.int(7, 9), odd = rng.int(0, n - 1);
    const figs = range(0, n - 1).map(i => {
      const shape = rng.pick(range(0, 3).filter(s => K - TYPE_SIDES[s] >= 1 && K - TYPE_SIDES[s] <= 7));
      let dots = K - TYPE_SIDES[shape];
      if (i === odd) dots = rng.pick([dots - 1, dots + 1].filter(x => x >= 1 && x <= 7));
      return base({ shape, color: rng.int(0, 5), fill: rng.pick([0, 2]), dots });
    });
    const f = figs[odd];
    return { figs, odd, feature: 'sum', why: `In the others, sides + dots always makes ${K} — here it is ${TYPE_SIDES[f.shape]} + ${f.dots} = ${TYPE_SIDES[f.shape] + f.dots}.` };
  },
  mirror(rng, n, cellsN, free) {
    let cells;
    for (let t = 0; t < 200; t++) { cells = randomPolyomino(rng, cellsN, 0.8); if (isChiral2(cells)) break; cells = null; }
    if (!cells) return null;
    const odd = rng.int(0, n - 1);
    const quarter = rng.shuffle([0, 90, 180, 270]);
    const color = rng.int(0, 5);
    const figs = range(0, n - 1).map(i => ({
      kind: 'poly', cells, flip: i === odd, color,
      angle: free ? rng.int(0, 359) : (i === odd ? rng.pick([0, 90, 180, 270]) : quarter[i % 4]),
    }));
    return { figs, odd, feature: 'mirror', why: 'The others are the same shape, just turned around — this one is its mirror image (flipped over).' };
  },
};

function pickRule(rng, L) {
  switch (L) {
    case 1: return ['shape', 5];
    case 2: return [rng.pick(['color', 'fill']), 5];
    case 3: return ['dots', 5];
    case 4: return ['parity', 5];
    case 5: return ['eqSides', 5];
    case 6: return ['mirror', 5, 5, false];
    case 7: return ['inner', 5];
    case 8: return ['mirror', 6, 6, true];
    case 9: return ['sum', rng.pick([5, 6])];
    default: return rng.chance(0.6) ? ['mirror', 6, 7, true] : ['sum', 6];
  }
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  for (let attempt = 0; attempt < 600; attempt++) {
    const [rule, n, cellsN, free] = pickRule(rng, L);
    const g = RULES[rule](rng, n, cellsN, free);
    if (!g) continue;
    if (rule !== 'mirror') {
      const cand = oddCandidates(g.figs);
      if (cand.size !== 1 || !cand.has(g.odd) || !cand.get(g.odd).includes(g.feature)) continue;
    }
    return { game: 'oddone', level: L, rule, figs: g.figs, answer: g.odd, explain: `<p>${g.why}</p>` };
  }
  throw new Error('oddone: generation failed');
}

/* ------------------------------------------------ drawing */
const R_BY_SIZE = [27, 34, 40];
const DOTS = [
  [], [[0, 0]], [[-0.5, -0.5], [0.5, 0.5]], [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
  [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
  [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]],
  [[-0.5, -0.62], [0.5, -0.62], [-0.5, 0], [0.5, 0], [-0.5, 0.62], [0.5, 0.62]],
  [[0, 0], ...range(0, 5).map(i => [0.66 * Math.cos(i * Math.PI / 3), 0.66 * Math.sin(i * Math.PI / 3)])],
];

export function figSVG(f) {
  if (f.kind === 'poly') return polySVG(f);
  const col = COLORS[f.color], R = R_BY_SIZE[f.size];
  let defs = '', fill = 'none';
  if (f.fill === 1) fill = col;
  if (f.fill === 2) {
    const id = uid('st');
    defs = `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.3" height="6" fill="${col}" opacity=".8"/></pattern></defs>`;
    fill = `url(#${id})`;
  }
  let s = defs + shapeSVG(f.shape, 50, 50, R, { fill, stroke: col, sw: 3 });
  if (f.inner >= 0) s += shapeSVG(f.inner, 50, 50, R * 0.42, { fill: f.fill === 1 ? DARK : 'none', stroke: f.fill === 1 ? DARK : INK, sw: 2.6, halo: f.fill !== 1 });
  if (f.dots) {
    const k = f.shape === 0 ? 0.3 : 0.42, dy = f.shape === 0 ? R * 0.1 : 0;
    const dc = f.fill === 1 ? DARK : INK;
    for (const [x, y] of DOTS[f.dots]) s += `<circle cx="${(50 + x * R * k * 1.5).toFixed(2)}" cy="${(50 + dy + y * R * k * 1.5).toFixed(2)}" r="${f.shape === 0 ? 3.1 : 3.8}" fill="${dc}" ${f.fill === 1 ? '' : `stroke="${DARK}" stroke-width="1.2"`}/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}

function polySVG(f) {
  const cells = norm2(f.flip ? mirror2(f.cells) : f.cells);
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
  const u = Math.min(15, 68 / Math.max(w, h));
  const ox = 50 - (w * u) / 2, oy = 50 - (h * u) / 2;
  const col = COLORS[f.color];
  const rects = cells.map(([x, y]) => `<rect x="${(ox + x * u).toFixed(2)}" y="${(oy + y * u).toFixed(2)}" width="${u.toFixed(2)}" height="${u.toFixed(2)}" rx="1.6" fill="${col}" fill-opacity=".85" stroke="${DARK}" stroke-width="1.6"/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(${f.angle} 50 50)">${rects}</g></svg>`;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  ui.stage.innerHTML = `<p class="prompt">Which figure does <b>not</b> belong?</p><div class="od-grid"></div>`;
  ui.choice(p.figs.map(figSVG), { into: ui.stage.querySelector('.od-grid'), cols: p.figs.length === 6 ? 3 : 5, cls: 'opt-tile big' });
}
export function grade(p, r) { const ok = r === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-tile">${figSVG(p.figs[p.answer])}</div>`; }
