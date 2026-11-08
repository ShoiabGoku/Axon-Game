/* DIGIT SPAN — verbal working memory. Digits flash one at a time; type them back forward,
   backward, or sorted smallest-to-largest (sequencing) depending on the level. */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'digitspan', name: 'Digit Span', title: 'Digit Span', domain: 'memory', kind: 'trial', selfTimed: true,
  icon: 'digits', tagline: 'Hold the numbers in mind',
  howTo: [
    'Digits flash one at a time. Hold them in your head.',
    'Then type them back: in the SAME order, in REVERSE order, or from SMALLEST to LARGEST — the round tells you which.',
    'Tip: group digits into chunks of two or three.',
  ],
  time: L => 10 + 2.5 * LEVEL[clamp(L, 1, 10)][0],
  guess: () => 0,
};

const LEVEL = { 1: [4, 'F'], 2: [5, 'F'], 3: [6, 'F'], 4: [7, 'F'], 5: [4, 'B'], 6: [8, 'F'], 7: [5, 'B'], 8: [6, 'S'], 9: [6, 'B'], 10: [8, 'S'] };
const MODE_TEXT = { F: 'in the SAME order', B: 'in REVERSE order', S: 'from SMALLEST to LARGEST' };

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const [span, mode] = LEVEL[L];
  let digits;
  if (mode === 'S') digits = rng.sample(range(0, 9), span);
  else {
    digits = [rng.int(0, 9)];
    while (digits.length < span) { const d = rng.int(0, 9); if (d !== digits[digits.length - 1] && digits.filter(x => x === d).length < 2) digits.push(d); }
  }
  const answer = mode === 'B' ? digits.slice().reverse() : mode === 'S' ? digits.slice().sort((a, b) => a - b) : digits.slice();
  return {
    game: 'digitspan', level: L, span, mode, digits, answer,
    explain: `<p>The digits were <b class="mono">${digits.join(' ')}</b>. Typed ${MODE_TEXT[mode].toLowerCase()}, that is <b class="mono">${answer.join(' ')}</b>.</p>`,
  };
}

export function render(p, ui) {
  ui.stage.innerHTML = `<div class="ds-stage"><div class="ds-digit" aria-live="polite"></div><div class="ds-pips">${p.digits.map(() => '<i></i>').join('')}</div></div>`;
  const box = ui.stage.querySelector('.ds-digit');
  const pips = [...ui.stage.querySelectorAll('.ds-pips i')];
  const on = p.level >= 6 ? 720 : 820, gap = 230;
  ui.setStatus('Memorise the digits…', 'watch');
  let t = 650;
  p.digits.forEach((d, i) => {
    ui.later(() => { box.textContent = d; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); pips[i].classList.add('on'); ui.tone(5 + d); ui.speak(String(d)); }, t);
    ui.later(() => { box.textContent = ''; }, t + on);
    t += on + gap;
  });
  ui.later(() => {
    ui.stage.querySelector('.ds-stage').classList.add('done');
    box.textContent = '';
    ui.setStatus(`Type them ${MODE_TEXT[p.mode]}`, p.mode === 'F' ? 'go' : 'warn');
    ui.keypad({ maxLen: p.span, neg: false, exact: p.span, spaced: true });
    ui.startClock(meta.time(p.level));
  }, t + 50);
}
export function grade(p, r) {
  const s = String(r ?? '').replace(/\D/g, '');
  const ok = s === p.answer.join('');
  return { correct: ok, score: ok ? 1 : 0 };
}
export function answerHTML(p) { return `<div class="ans-big mono">${p.answer.join(' ')}</div>`; }
