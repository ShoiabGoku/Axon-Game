/* MENTAL ROTATION — 2D polyominoes (levels 1–5) and 3D cube figures (levels 6–10).
   Distractors are mirror images or structurally different figures; every distractor is checked
   NOT to be a rotation of the target (canonical forms over all 4 / 24 rotations), every figure is
   chiral, and every 3D view is rasterised to make sure no cube is hidden behind the others. */

import { COLORS, DARK } from '../core/draw.js';
import { clamp, range } from '../core/rng.js';
import {
  randomPolyomino, isChiral2, canon2, mirror2, norm2,
  canon3, mirror3, randomRotation, rotDistance, cubeVisibility, cubesSVG,
} from '../core/poly.js';

export const meta = {
  id: 'rotation', name: 'Rotation', title: 'Mental Rotation', domain: 'spatial', kind: 'trial',
  icon: 'rotate', tagline: 'Turn it in your mind',
  howTo: [
    'Find the option that is the same object as the target — just turned to a different angle.',
    'Mirror images do NOT count: a flipped object cannot be turned into the original.',
    'Higher levels use 3D block figures. Imagine picking the object up and rotating it.',
  ],
  time: L => 35 + 6 * L,
  guess: () => 1 / 4,
  layout: 'split',
};

const LEVEL = {
  1: { d: 2, cells: 5, free: false, mix: ['mirror', 'mod', 'mod'] },
  2: { d: 2, cells: 6, free: false, mix: ['mirror', 'mirror', 'mod'] },
  3: { d: 2, cells: 6, free: true, mix: ['mirror', 'mirror', 'mod'] },
  4: { d: 2, cells: 7, free: true, mix: ['mirror', 'mirror', 'mirror'] },
  5: { d: 2, cells: 8, free: true, mix: ['mirror', 'mirror', 'mod'] },
  6: { d: 3, cubes: 7, minAngle: 50, mix: ['mirror', 'mod', 'mod'] },
  7: { d: 3, cubes: 8, minAngle: 60, mix: ['mirror', 'mirror', 'mod'] },
  8: { d: 3, cubes: 9, minAngle: 70, mix: ['mirror', 'mirror', 'mirror'] },
  9: { d: 3, cubes: 9, minAngle: 90, mix: ['mirror', 'mirror', 'mod'] },
  10: { d: 3, cubes: 10, minAngle: 100, mix: ['mirror', 'mirror', 'mirror'] },
};

/* ------------------------------------------------ 2D */
function modify2(rng, cells) {
  // move one cell to a different free neighbouring spot, keeping the shape connected
  const key = c => c[0] + ',' + c[1];
  for (let t = 0; t < 60; t++) {
    const i = rng.int(0, cells.length - 1);
    const rest = cells.filter((_, j) => j !== i);
    const set = new Set(rest.map(key));
    if (!connected2(rest)) continue;
    const spots = [];
    for (const [x, y] of rest) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (x + dx) + ',' + (y + dy);
      if (!set.has(k) && k !== key(cells[i])) spots.push([x + dx, y + dy]);
    }
    if (!spots.length) continue;
    const out = norm2([...rest, rng.pick(spots)]);
    return out;
  }
  return null;
}
function connected2(cells) {
  if (!cells.length) return false;
  const set = new Set(cells.map(c => c[0] + ',' + c[1]));
  const seen = new Set([cells[0][0] + ',' + cells[0][1]]);
  const st = [cells[0]];
  while (st.length) {
    const [x, y] = st.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (x + dx) + ',' + (y + dy);
      if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); }
    }
  }
  return seen.size === cells.length;
}

function gen2(rng, cfg) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const cells = randomPolyomino(rng, cfg.cells, 0.85);
    if (!isChiral2(cells)) continue;
    const mir = norm2(mirror2(cells));
    const cOrig = canon2(cells), cMir = canon2(mir);
    const angTarget = cfg.free ? rng.int(0, 359) : 0;
    const angle = () => (cfg.free ? rng.int(0, 359) : rng.pick([0, 90, 180, 270]));
    let corrAng;
    do { corrAng = angle(); } while (Math.abs(((corrAng - angTarget + 540) % 360) - 180) < 40);
    const opts = [{ cells, angle: corrAng, kind: 'same' }];
    const mods = new Set();
    let ok = true;
    for (const k of cfg.mix) {
      if (k === 'mirror') opts.push({ cells: mir, angle: angle(), kind: 'mirror' });
      else {
        let m = null;
        for (let t = 0; t < 20 && !m; t++) {
          const c = modify2(rng, cells);
          if (!c) continue;
          const cc = canon2(c);
          if (cc === cOrig || cc === cMir || mods.has(cc) || !connected2(c)) continue;
          mods.add(cc); m = c;
        }
        if (!m) { ok = false; break; }
        opts.push({ cells: m, angle: angle(), kind: 'mod' });
      }
    }
    if (!ok) continue;
    // no two options may look identical
    const sig = o => canon2(o.cells) + '@' + (((o.angle % 360) + 360) % 360);
    if (new Set(opts.map(sig)).size !== opts.length) continue;
    return { d: 2, target: { cells, angle: angTarget }, opts };
  }
  return null;
}

function polySVG(cells, angle, color = COLORS[0]) {
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
  const u = Math.min(15, 64 / Math.max(w, h));
  const cx = cells.reduce((s, c) => s + c[0] + 0.5, 0) / cells.length, cy = cells.reduce((s, c) => s + c[1] + 0.5, 0) / cells.length;
  const rects = cells.map(([x, y]) => `<rect x="${(50 + (x - cx) * u).toFixed(2)}" y="${(50 + (y - cy) * u).toFixed(2)}" width="${u.toFixed(2)}" height="${u.toFixed(2)}" rx="1.8" fill="${color}" fill-opacity=".88" stroke="${DARK}" stroke-width="1.6"/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(${angle} 50 50)">${rects}</g></svg>`;
}

/* ------------------------------------------------ 3D */
const AX = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const axisOf = d => (d[0] ? 0 : d[1] ? 1 : 2);
function figure3(rng, n) {
  for (let t = 0; t < 300; t++) {
    const cells = [[0, 0, 0]];
    const set = new Set(['0,0,0']);
    let prev = -1, cur = [0, 0, 0], ok = true;
    const axesUsed = new Set();
    while (cells.length < n && ok) {
      const dirs = AX.filter(d => axisOf(d) !== prev);
      const d = rng.pick(dirs);
      const len = Math.min(rng.int(2, 3), n - cells.length);
      for (let s = 0; s < len; s++) {
        cur = [cur[0] + d[0], cur[1] + d[1], cur[2] + d[2]];
        const k = cur.join(',');
        if (set.has(k)) { ok = false; break; }
        set.add(k); cells.push(cur);
      }
      prev = axisOf(d); axesUsed.add(prev);
    }
    if (!ok || axesUsed.size < 3) continue;
    // reject figures with touching non-consecutive cubes (ambiguous structure)
    if (!chainClean(cells)) continue;
    if (canon3(cells) === canon3(mirror3(cells))) continue;
    return cells;
  }
  return null;
}
function chainClean(cells) {
  const idx = new Map(cells.map((c, i) => [c.join(','), i]));
  for (let i = 0; i < cells.length; i++) {
    for (const d of AX) {
      const j = idx.get([cells[i][0] + d[0], cells[i][1] + d[1], cells[i][2] + d[2]].join(','));
      if (j !== undefined && Math.abs(i - j) !== 1) return false;
    }
  }
  return true;
}
function modify3(rng, cells) {
  // bend the last arm: move the final cube(s) to a different perpendicular direction
  for (let t = 0; t < 40; t++) {
    const cut = rng.int(1, 2);
    const keep = cells.slice(0, cells.length - cut);
    const base = keep[keep.length - 1], before = keep[keep.length - 2];
    const prevDir = [base[0] - before[0], base[1] - before[1], base[2] - before[2]];
    const d = rng.pick(AX.filter(x => axisOf(x) !== axisOf(prevDir)));
    const out = keep.slice();
    let cur = base, ok = true;
    const set = new Set(keep.map(c => c.join(',')));
    for (let s = 0; s < cut; s++) {
      cur = [cur[0] + d[0], cur[1] + d[1], cur[2] + d[2]];
      if (set.has(cur.join(','))) { ok = false; break; }
      set.add(cur.join(',')); out.push(cur);
    }
    if (ok && chainClean(out)) return out;
  }
  return null;
}
function goodView(rng, cells, avoid = null, minAngle = 0) {
  for (let t = 0; t < 80; t++) {
    const R = randomRotation(rng);
    if (avoid && rotDistance(avoid, R) < minAngle) continue;
    const vis = cubeVisibility(cells, R, 72);
    if (Math.min(...vis) >= 0.22) return R;
  }
  return null;
}

function gen3(rng, cfg) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const cells = figure3(rng, cfg.cubes);
    if (!cells) continue;
    const mir = mirror3(cells);
    const cO = canon3(cells), cM = canon3(mir);
    const R0 = goodView(rng, cells);
    if (!R0) continue;
    const R1 = goodView(rng, cells, R0, cfg.minAngle);
    if (!R1) continue;
    const opts = [{ cells, R: R1, kind: 'same' }];
    const seen = new Set();
    let ok = true;
    for (const k of cfg.mix) {
      let c = mir;
      if (k === 'mod') {
        c = null;
        for (let t = 0; t < 10 && !c; t++) {
          const m = modify3(rng, cells);
          if (!m) continue;
          const cc = canon3(m);
          if (cc === cO || cc === cM || seen.has(cc)) continue;
          seen.add(cc); c = m;
        }
        if (!c) { ok = false; break; }
      }
      const R = goodView(rng, c, R0, 25);
      if (!R) { ok = false; break; }
      opts.push({ cells: c, R, kind: k === 'mod' ? 'mod' : 'mirror' });
    }
    if (!ok) continue;
    return { d: 3, target: { cells, R: R0 }, opts };
  }
  return null;
}

/* ------------------------------------------------ generate */
export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  for (let attempt = 0; attempt < 20; attempt++) {
    const g = cfg.d === 2 ? gen2(rng, cfg) : gen3(rng, cfg);
    if (!g) continue;
    const order = rng.shuffle(range(0, g.opts.length - 1));
    const opts = order.map(i => g.opts[i]);
    const answer = opts.findIndex(o => o.kind === 'same');
    const letters = 'ABCD';
    const mirrors = opts.map((o, i) => (o.kind === 'mirror' ? letters[i] : null)).filter(Boolean);
    const mods = opts.map((o, i) => (o.kind === 'mod' ? letters[i] : null)).filter(Boolean);
    let why = `<p><b>${letters[answer]}</b> is the target turned to a new angle.</p><ul class="rules">`;
    if (mirrors.length) why += `<li>${mirrors.join(', ')} ${mirrors.length > 1 ? 'are mirror images' : 'is a mirror image'} — flipped, so no rotation can line ${mirrors.length > 1 ? 'them' : 'it'} up with the target.</li>`;
    if (mods.length) why += `<li>${mods.join(', ')} ${mods.length > 1 ? 'have' : 'has'} a block in a different place.</li>`;
    why += '</ul>';
    return {
      game: 'rotation', level: L, d: g.d, target: g.target, opts, answer,
      explain: why,
    };
  }
  throw new Error('rotation: generation failed');
}

export function figureSVG(p, o, big = false) {
  if (p.d === 2) return polySVG(o.cells, o.angle, big ? COLORS[4] : COLORS[0]);
  return cubesSVG(o.cells, o.R, { size: 100, hue: big ? 265 : 188 });
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  ui.stage.innerHTML = `<div class="rt-target"><div class="rt-lab">Target</div><div class="rt-fig">${figureSVG(p, p.target, true)}</div></div>
    <p class="prompt">Which option is the same object, only rotated?</p>`;
  ui.choice(p.opts.map(o => figureSVG(p, o)), { cols: 4, cls: 'opt-tile', letters: true, mobileCols: 2 });
}
export function grade(p, r) { const ok = r === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-tile">${figureSVG(p, p.opts[p.answer])}</div>`; }
