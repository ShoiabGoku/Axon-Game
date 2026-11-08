/* LINE-UP — seat everyone so that every clue holds.
   Clues are drawn from those true of a hidden arrangement and added until only one of the n!
   arrangements survives; then redundant clues are stripped one at a time, so on harder levels
   every remaining clue is necessary. */

import { clamp, range } from '../core/rng.js';
import { ordinal } from '../core/draw.js';

export const meta = {
  id: 'lineup', name: 'Line-Up', title: 'Line-Up Logic', domain: 'logic', kind: 'trial',
  icon: 'lineup', tagline: 'Seat everyone correctly',
  howTo: [
    'Place everyone so that every clue is true. Exactly one arrangement works.',
    'Tap a person, then tap a seat (or a floor). Tap a placed person to send them back.',
    '"Next to" means directly beside. "Somewhere left of" can be any distance away.',
  ],
  time: L => 60 + 15 * L,
  guess: p => 1 / [1, 1, 2, 6, 24, 120, 720][p.n],
};

export const PEOPLE = [
  { name: 'Ava', color: '#38e1ff' }, { name: 'Ben', color: '#ffc54d' }, { name: 'Cleo', color: '#ff5fa8' },
  { name: 'Dev', color: '#4cf3a3' }, { name: 'Eli', color: '#9d7bff' }, { name: 'Faye', color: '#ff8a3d' },
];
const P = i => `<b class="pp" style="--c:${PEOPLE[i].color}">${PEOPLE[i].name}</b>`;

const EV = {
  left: (p, c) => p[c.a] < p[c.b],
  imm: (p, c) => p[c.b] - p[c.a] === 1,
  adj: (p, c) => Math.abs(p[c.a] - p[c.b]) === 1,
  nadj: (p, c) => Math.abs(p[c.a] - p[c.b]) > 1,
  end: (p, c, n) => p[c.a] === 0 || p[c.a] === n - 1,
  nend: (p, c, n) => p[c.a] !== 0 && p[c.a] !== n - 1,
  at: (p, c) => p[c.a] === c.v,
  nat: (p, c) => p[c.a] !== c.v,
  gap: (p, c) => Math.abs(p[c.a] - p[c.b]) === c.v + 1,
  between: (p, c) => Math.min(p[c.b], p[c.c]) < p[c.a] && p[c.a] < Math.max(p[c.b], p[c.c]),
  rightBoth: (p, c) => p[c.a] > p[c.b] && p[c.a] > p[c.c],
};

function clueText(c, n, floors) {
  const A = P(c.a), B = c.b !== undefined ? P(c.b) : '', C = c.c !== undefined ? P(c.c) : '';
  if (!floors) {
    switch (c.k) {
      case 'left': return `${A} sits somewhere to the left of ${B}.`;
      case 'imm': return `${A} sits directly to the left of ${B}.`;
      case 'adj': return `${A} sits next to ${B}.`;
      case 'nadj': return `${A} does not sit next to ${B}.`;
      case 'end': return `${A} sits at one of the two ends.`;
      case 'nend': return `${A} is not at either end.`;
      case 'at': return `${A} is ${ordinal(c.v + 1)} from the left.`;
      case 'nat': return `${A} is not ${ordinal(c.v + 1)} from the left.`;
      case 'gap': return c.v === 1 ? `Exactly one person sits between ${A} and ${B}.` : `Exactly ${c.v} people sit between ${A} and ${B}.`;
      case 'between': return `${A} sits somewhere between ${B} and ${C}.`;
      case 'rightBoth': return `${A} sits to the right of both ${B} and ${C}.`;
    }
  } else {
    switch (c.k) {
      case 'left': return `${A} lives on a lower floor than ${B}.`;
      case 'imm': return `${A} lives directly below ${B}.`;
      case 'adj': return `${A} and ${B} live on neighbouring floors.`;
      case 'nadj': return `${A} and ${B} do not live on neighbouring floors.`;
      case 'end': return `${A} lives on either the top or the bottom floor.`;
      case 'nend': return `${A} lives on neither the top nor the bottom floor.`;
      case 'at': return `${A} lives on floor ${c.v + 1}.`;
      case 'nat': return `${A} does not live on floor ${c.v + 1}.`;
      case 'gap': return c.v === 1 ? `Exactly one floor lies between ${A} and ${B}.` : `Exactly ${c.v} floors lie between ${A} and ${B}.`;
      case 'between': return `${A} lives somewhere between ${B} and ${C}.`;
      case 'rightBoth': return `${A} lives above both ${B} and ${C}.`;
    }
  }
  return '';
}

const LEVEL = {
  1: { n: 3, types: ['left', 'imm', 'at', 'end', 'adj'], maxAt: 1, minimize: false },
  2: { n: 4, types: ['left', 'imm', 'at', 'end', 'adj', 'nadj'], maxAt: 1, minimize: false },
  3: { n: 4, types: ['left', 'imm', 'adj', 'nadj', 'end', 'nend', 'at'], maxAt: 1, minimize: true },
  4: { n: 5, types: ['left', 'imm', 'adj', 'nadj', 'end', 'gap', 'at'], maxAt: 1, minimize: true },
  5: { n: 5, types: ['left', 'imm', 'adj', 'nadj', 'nend', 'gap', 'between'], maxAt: 0, minimize: true },
  6: { n: 5, types: ['left', 'imm', 'adj', 'nadj', 'nend', 'gap', 'between', 'rightBoth', 'nat'], maxAt: 0, minimize: true, floors: 0.5 },
  7: { n: 6, types: ['left', 'imm', 'adj', 'nadj', 'gap', 'between', 'nend', 'at'], maxAt: 1, minimize: true, floors: 0.4 },
  8: { n: 6, types: ['left', 'imm', 'adj', 'nadj', 'gap', 'between', 'rightBoth', 'nend', 'nat'], maxAt: 0, minimize: true, floors: 0.4 },
  9: { n: 6, types: ['left', 'adj', 'nadj', 'nadj', 'gap', 'between', 'nend', 'nat', 'nat', 'rightBoth'], maxAt: 0, minimize: true, floors: 0.4 },
  10: { n: 6, types: ['left', 'nadj', 'nadj', 'gap', 'between', 'rightBoth', 'nat', 'nat', 'imm'], maxAt: 0, minimize: true, floors: 0.4 },
};

function perms(n) {
  const out = [];
  const rec = (arr, rest) => {
    if (!rest.length) { out.push(arr); return; }
    rest.forEach((x, i) => rec([...arr, x], rest.filter((_, j) => j !== i)));
  };
  rec([], range(0, n - 1));
  return out;          // each: seat index → person
}
const PERMS = {};
const posOf = seatArr => { const p = []; seatArr.forEach((person, seat) => { p[person] = seat; }); return p; };

function allTrueClues(pos, n, types) {
  const out = [];
  const add = c => { if (EV[c.k](pos, c, n)) out.push(c); };
  for (const k of types) {
    for (let a = 0; a < n; a++) {
      if (k === 'end' || k === 'nend') { add({ k, a }); continue; }
      if (k === 'at' || k === 'nat') { for (let v = 0; v < n; v++) add({ k, a, v }); continue; }
      for (let b = 0; b < n; b++) {
        if (b === a) continue;
        if (k === 'gap') { for (let v = 1; v <= n - 2; v++) if (a < b) add({ k, a, b, v }); continue; }
        if ((k === 'adj' || k === 'nadj') && a > b) continue;
        if (k === 'between' || k === 'rightBoth') { for (let c = b + 1; c < n; c++) if (c !== a) add({ k, a, b, c }); continue; }
        add({ k, a, b });
      }
    }
  }
  return out;
}

export function solveLineup(n, clues) {
  const all = PERMS[n] || (PERMS[n] = perms(n).map(s => ({ seats: s, pos: posOf(s) })));
  return all.filter(x => clues.every(c => EV[c.k](x.pos, c, n)));
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  const n = cfg.n;
  for (let attempt = 0; attempt < 300; attempt++) {
    const seats = rng.shuffle(range(0, n - 1));
    const pos = posOf(seats);
    const floors = cfg.floors ? rng.chance(cfg.floors) : false;
    const pool = rng.shuffle(allTrueClues(pos, n, [...new Set(cfg.types)]));
    // weight duplicates in the type list by moving those types forward
    const weight = c => cfg.types.filter(t => t === c.k).length + rng.next();
    pool.sort((x, y) => weight(y) - weight(x));
    const mixed = rng.shuffle(pool.slice(0, Math.max(12, pool.length >> 1))).concat(pool.slice(Math.max(12, pool.length >> 1)));
    let chosen = [];
    let live = solveLineup(n, []);
    for (const c of mixed) {
      if ((c.k === 'at') && chosen.filter(x => x.k === 'at').length >= cfg.maxAt) continue;
      const next = live.filter(x => EV[c.k](x.pos, c, n));
      if (next.length < live.length) { chosen.push(c); live = next; }
      if (live.length === 1) break;
    }
    if (live.length !== 1) continue;
    if (cfg.minimize) {
      for (const c of rng.shuffle(chosen.slice())) {
        const without = chosen.filter(x => x !== c);
        if (solveLineup(n, without).length === 1) chosen = without;
      }
    }
    if (chosen.length > n + 3) continue;
    if (L >= 7 && chosen.length < n - 1) continue;
    const order = rng.shuffle(chosen);
    return {
      game: 'lineup', level: L, n, floors, answer: seats, clues: order.map(c => clueText(c, n, floors)),
      explain: explain(n, seats, order, floors), _clues: order,
    };
  }
  throw new Error('lineup: generation failed');
}

function explain(n, seats, clues, floors) {
  const arr = floors ? seats.slice().reverse() : seats;
  const lead = floors ? 'From top floor to bottom:' : 'From left to right:';
  return `<p>${lead}</p><div class="lu-final ${floors ? 'v' : ''}">${arr.map(i => P(i)).join('<span class="sep">›</span>')}</div>
    <p>Every clue checks out:</p><ul class="rules ticks">${clues.map(c => `<li>${clueText(c, n, floors)}</li>`).join('')}</ul>`;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  const n = p.n;
  const seats = new Array(n).fill(null);
  let picked = null;
  const slotLabel = i => (p.floors ? `Floor ${i + 1}` : ordinal(i + 1));
  const slotOrder = p.floors ? range(0, n - 1).reverse() : range(0, n - 1);
  ui.stage.innerHTML = `
    <ol class="lu-clues">${p.clues.map(c => `<li>${c}</li>`).join('')}</ol>
    <div class="lu-board ${p.floors ? 'floors' : 'row'}">
      ${slotOrder.map(i => `<button class="lu-slot" data-s="${i}" aria-label="${slotLabel(i)}"><span class="lu-lab">${slotLabel(i)}</span><span class="lu-in"></span></button>`).join('')}
    </div>
    <div class="lu-tray">${range(0, n - 1).map(i => `<button class="lu-tok" data-p="${i}" style="--c:${PEOPLE[i].color}"><span class="dot">${PEOPLE[i].name[0]}</span>${PEOPLE[i].name}</button>`).join('')}</div>`;
  const lock = ui.lock({ label: 'Lock in', onSubmit: () => ui.submit(seats.slice()) });
  const tray = ui.stage.querySelector('.lu-tray');
  const sync = () => {
    ui.stage.querySelectorAll('.lu-slot').forEach(el => {
      const s = +el.dataset.s, who = seats[s];
      el.querySelector('.lu-in').innerHTML = who === null ? '' : `<span class="lu-placed" style="--c:${PEOPLE[who].color}"><span class="dot">${PEOPLE[who].name[0]}</span>${PEOPLE[who].name}</span>`;
      el.classList.toggle('filled', who !== null);
      el.classList.toggle('target', picked !== null && who === null);
    });
    tray.querySelectorAll('.lu-tok').forEach(el => {
      const i = +el.dataset.p;
      el.classList.toggle('used', seats.includes(i));
      el.classList.toggle('picked', picked === i);
    });
    lock.enable(seats.every(x => x !== null));
  };
  tray.addEventListener('click', e => {
    const t = e.target.closest('.lu-tok');
    if (!t || ui.locked) return;
    const i = +t.dataset.p;
    if (seats.includes(i)) { seats[seats.indexOf(i)] = null; picked = i; }
    else picked = picked === i ? null : i;
    ui.sfx('tap'); sync();
  });
  ui.stage.querySelector('.lu-board').addEventListener('click', e => {
    const sl = e.target.closest('.lu-slot');
    if (!sl || ui.locked) return;
    const s = +sl.dataset.s;
    if (picked !== null) {
      const prev = seats.indexOf(picked);
      if (prev >= 0) seats[prev] = null;
      seats[s] = picked; picked = null;
      ui.sfx('select');
    } else if (seats[s] !== null) {
      picked = seats[s]; seats[s] = null; ui.sfx('tap');
    }
    sync();
  });
  sync();
}
export function grade(p, r) { const ok = Array.isArray(r) && r.every((x, i) => x === p.answer[i]); return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) {
  const arr = p.floors ? p.answer.slice().reverse() : p.answer;
  return `<div class="lu-final ${p.floors ? 'v' : ''}">${arr.map(i => P(i)).join('<span class="sep">›</span>')}</div>`;
}
export function reveal(p, ui, r) {
  ui.stage.querySelectorAll('.lu-slot').forEach(el => {
    const s = +el.dataset.s, who = p.answer[s];
    const wrong = Array.isArray(r) && r[s] !== who;
    el.querySelector('.lu-in').innerHTML = `<span class="lu-placed" style="--c:${PEOPLE[who].color}"><span class="dot">${PEOPLE[who].name[0]}</span>${PEOPLE[who].name}</span>`;
    el.classList.add(wrong ? 'bad' : 'good');
  });
}
