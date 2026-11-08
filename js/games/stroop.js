/* COLOUR CLASH — a Stroop interference sprint. Tap the colour of the INK, not the word.
   From level 6 a cue sometimes switches the rule to the WORD (task switching). */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'stroop', name: 'Colour Clash', title: 'Colour Clash', domain: 'speed', kind: 'sprint', selfTimed: true,
  icon: 'stroop', tagline: 'Beat the brain’s autopilot',
  howTo: [
    'A colour word appears, printed in a coloured ink. Tap the button for the INK colour — ignore what the word says.',
    'From level 6, watch the cue: when it says WORD, tap the colour the word names instead.',
    'Each word has a short time limit. Accuracy first, then speed.',
  ],
  time: () => 0,
  guess: () => 0,
};

const COLS = [
  { name: 'RED', css: '#ff4d6d' }, { name: 'BLUE', css: '#4d8bff' }, { name: 'GREEN', css: '#3ddc84' },
  { name: 'YELLOW', css: '#ffd23d' }, { name: 'PURPLE', css: '#b77bff' },
];

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const nCols = L >= 8 ? 5 : 4;
  const N = L <= 3 ? 20 : L <= 7 ? 24 : 28;
  const deadline = Math.round(2600 - 150 * L);
  const pInc = 0.5 + 0.04 * L;
  const pSwitch = L >= 6 ? 0.25 + 0.04 * (L - 6) : 0;
  const trials = [];
  for (let i = 0; i < N; i++) {
    const ink = rng.int(0, nCols - 1);
    const word = rng.chance(pInc) ? rng.pick(range(0, nCols - 1).filter(c => c !== ink)) : ink;
    const rule = rng.chance(pSwitch) ? 'word' : 'ink';
    trials.push({ word, ink, rule, target: rule === 'ink' ? ink : word });
  }
  return { game: 'stroop', level: L, nCols, N, deadline, trials, answer: null, explain: '' };
}

export function render(p, ui) {
  ui.stage.innerHTML = `<div class="sp-stage"><div class="sp-cue"></div><div class="sp-word"></div><div class="sp-bar"><i></i></div><div class="sp-count"></div></div>`;
  ui.answers.innerHTML = `<div class="sp-btns n${p.nCols}">${range(0, p.nCols - 1).map(c => `<button class="sp-btn" data-c="${c}" style="--c:${COLS[c].css}" aria-label="${COLS[c].name}"><span></span>${COLS[c].name}</button>`).join('')}</div>`;
  const cue = ui.stage.querySelector('.sp-cue'), word = ui.stage.querySelector('.sp-word');
  const bar = ui.stage.querySelector('.sp-bar i'), cnt = ui.stage.querySelector('.sp-count');
  const btns = [...ui.answers.querySelectorAll('.sp-btn')];
  let i = -1, shownAt = 0, hits = 0, misses = 0, timeouts = 0;
  const rts = [];
  let timer = null, active = false;
  const next = () => {
    i++;
    if (i >= p.N) { active = false; ui.submit({ hits, misses, timeouts, total: p.N, rts }); return; }
    const t = p.trials[i];
    cue.textContent = t.rule === 'ink' ? 'INK' : 'WORD';
    cue.className = 'sp-cue ' + t.rule;
    word.textContent = COLS[t.word].name;
    word.style.color = COLS[t.ink].css;
    word.classList.remove('pop'); void word.offsetWidth; word.classList.add('pop');
    cnt.textContent = `${i + 1} / ${p.N}`;
    bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
    void bar.offsetWidth;
    bar.style.transition = `transform ${p.deadline}ms linear`; bar.style.transform = 'scaleX(0)';
    shownAt = performance.now();
    active = true;
    timer = ui.later(() => { if (!active) return; active = false; timeouts++; misses++; ui.sfx('wrong'); flashWord('bad'); ui.later(next, 260); }, p.deadline);
  };
  const flashWord = cls => { word.classList.add(cls); ui.later(() => word.classList.remove(cls), 220); };
  const answer = c => {
    if (!active || ui.locked) return;
    active = false;
    clearTimeout(timer);
    const t = p.trials[i];
    const ok = c === t.target;
    if (ok) { hits++; rts.push(performance.now() - shownAt); ui.sfx('pop'); flashWord('good'); }
    else { misses++; ui.sfx('wrong'); ui.buzz('bad'); flashWord('bad'); }
    ui.later(next, 160);
  };
  btns.forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); answer(+b.dataset.c); }));
  ui.onKey(e => { const k = +e.key; if (k >= 1 && k <= p.nCols) { answer(k - 1); return true; } return false; });
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
  return `<p>${g.correct ? 'Solid control — you kept the word from hijacking your answer.' : 'The word kept winning. Slow down slightly and focus on the ink.'} Pass mark: 80% accuracy.</p>`;
}
