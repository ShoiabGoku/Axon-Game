/* PULSE PATH — a spatial working-memory span task in the Corsi block-tapping tradition.
   Blocks flash in sequence; repeat the path forward, or backward on higher levels. */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'corsi', name: 'Pulse Path', title: 'Spatial Span', domain: 'memory', kind: 'trial', selfTimed: true,
  icon: 'corsi', tagline: 'Repeat the flashing path',
  howTo: [
    'Watch the nodes light up one after another.',
    'Then tap them in exactly the same order — or in REVERSE order when the round says so.',
    'Paths get longer as you level up.',
  ],
  time: L => 12 + 3 * LEVEL[clamp(L, 1, 10)][0],
  guess: () => 0,
};

const LEVEL = { 1: [3, 'F'], 2: [4, 'F'], 3: [5, 'F'], 4: [6, 'F'], 5: [4, 'B'], 6: [7, 'F'], 7: [5, 'B'], 8: [8, 'F'], 9: [6, 'B'], 10: [7, 'B'] };
export const BLOCKS = [[17, 17], [49, 9], [83, 21], [31, 43], [66, 39], [12, 72], [45, 68], [80, 63], [60, 90]];
const TONES = [0, 2, 4, 7, 9, 12, 14, 16, 19];

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const [span, dir] = LEVEL[L];
  const seq = rng.sample(range(0, 8), span);
  const expected = dir === 'B' ? seq.slice().reverse() : seq.slice();
  return {
    game: 'corsi', level: L, span, dir, seq, answer: expected,
    explain: `<p>The numbers on the board show the order the nodes flashed. ${dir === 'B'
      ? `Tapped in reverse, the answer was ${expected.map(b => `<b class="nd">${seq.indexOf(b) + 1}</b>`).join(' → ')}.`
      : 'Tapping them 1, 2, 3… in that order was the answer.'}</p><p class="muted">Tip: trace the path as a shape — a zig-zag or a loop is easier to hold than separate dots.</p>`,
  };
}

function miniBoard(seq) {
  const dots = BLOCKS.map(([x, y], i) => {
    const k = seq.indexOf(i);
    return `<g><rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="4" fill="${k >= 0 ? '#ff5fa8' : '#1b2150'}" stroke="#ff5fa8" stroke-opacity=".5"/>${k >= 0 ? `<text x="${x}" y="${y + 3.6}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#1a0612">${k + 1}</text>` : ''}</g>`;
  }).join('');
  const path = seq.map(i => BLOCKS[i].join(',')).join(' ');
  return `<svg viewBox="0 0 100 100" class="cs-mini"><polyline points="${path}" fill="none" stroke="#ff5fa8" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 3"/>${dots}</svg>`;
}

export function render(p, ui) {
  ui.stage.innerHTML = `<div class="cs-board">${BLOCKS.map(([x, y], i) => `<button class="cs-node" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="node ${i + 1}" disabled></button>`).join('')}</div>`;
  const nodes = [...ui.stage.querySelectorAll('.cs-node')];
  const L = p.level;
  const on = L >= 6 ? 560 : 680, gap = 260;
  const taps = [];
  ui.setStatus('Watch the path…', 'watch');
  const flash = (i, cls = 'lit', ms = on) => {
    nodes[i].classList.add(cls);
    ui.tone(TONES[i]);
    ui.later(() => nodes[i].classList.remove(cls), ms);
  };
  let t = 700;
  p.seq.forEach(i => { ui.later(() => flash(i), t); t += on + gap; });
  ui.later(() => {
    ui.setStatus(p.dir === 'B' ? 'Your turn — tap the path in REVERSE order' : 'Your turn — tap the path in the same order', p.dir === 'B' ? 'warn' : 'go');
    nodes.forEach(n => { n.disabled = false; });
    ui.startClock(meta.time(L));
  }, t + 100);
  nodes.forEach((n, i) => n.addEventListener('click', () => {
    if (ui.locked || n.disabled) return;
    taps.push(i);
    flash(i, 'tap', 240);
    ui.buzz('tap');
    if (taps.length === p.span) { nodes.forEach(x => { x.disabled = true; }); ui.later(() => ui.submit(taps.slice()), 250); }
  }));
}
export function grade(p, r) { const ok = Array.isArray(r) && r.length === p.answer.length && r.every((x, i) => x === p.answer[i]); return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return miniBoard(p.seq); }
