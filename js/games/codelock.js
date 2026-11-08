/* CODE LOCK — deduce a code with distinct digits from earlier guesses and their feedback
   (● right digit, right place · ○ right digit, wrong place). Clue guesses are added until exactly
   one of the 720 (3-digit) or 5040 (4-digit) codes survives, then redundant clues are removed. */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'codelock', name: 'Code Lock', title: 'Code Lock', domain: 'logic', kind: 'trial',
  icon: 'lock', tagline: 'Deduce the secret code',
  howTo: [
    'Each line is an earlier guess at the code, with feedback on how close it was.',
    '● = a digit that is correct and in the right place. ○ = a digit that is in the code but in the wrong place.',
    'No digit appears twice in the code. Only one code fits every clue — dial it in and unlock.',
  ],
  time: L => 60 + 15 * L,
  guess: () => 0,
};

export function feedback(code, guess) {
  let a = 0, b = 0;
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) a++;
    else if (code.includes(guess[i])) b++;
  }
  return [a, b];
}
const ALL = {};
function allCodes(k) {
  if (ALL[k]) return ALL[k];
  const out = [];
  const rec = (pre) => {
    if (pre.length === k) { out.push(pre); return; }
    for (let d = 0; d <= 9; d++) if (!pre.includes(d)) rec([...pre, d]);
  };
  rec([]);
  return (ALL[k] = out);
}
export function solveLock(k, clues) {
  return allCodes(k).filter(c => clues.every(cl => { const [a, b] = feedback(c, cl.g); return a === cl.a && b === cl.b; }));
}

const LEVEL = {
  1: { k: 3, maxClues: 5, wantZero: true },
  2: { k: 3, maxClues: 5, wantZero: true },
  3: { k: 3, maxClues: 5, wantZero: true },
  4: { k: 3, maxClues: 5, wantZero: false },
  5: { k: 3, maxClues: 5, wantZero: false, noZero: true },
  6: { k: 4, maxClues: 7, wantZero: true },
  7: { k: 4, maxClues: 7, wantZero: true },
  8: { k: 4, maxClues: 7, wantZero: false },
  9: { k: 4, maxClues: 7, wantZero: false, noZero: true },
  10: { k: 4, maxClues: 6, wantZero: false, noZero: true },
};

function words(a, b) {
  const num = x => ['', 'One', 'Two', 'Three', 'Four'][x];
  if (!a && !b) return 'Nothing is correct.';
  const parts = [];
  if (a) parts.push(`${num(a)} digit${a > 1 ? 's are' : ' is'} correct and well placed`);
  if (b) parts.push(`${parts.length ? num(b).toLowerCase() : num(b)} digit${b > 1 ? 's are' : ' is'} correct but wrongly placed`);
  return parts.join('; ') + '.';
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  const k = cfg.k;
  for (let attempt = 0; attempt < 400; attempt++) {
    const code = rng.sample(range(0, 9), k);
    let live = allCodes(k);
    const clues = [];
    for (let t = 0; t < 60 && live.length > 1; t++) {
      // guesses share some digits with the code so the feedback is informative
      const share = rng.int(0, Math.min(k, 3));
      const inCode = rng.sample(code, share);
      const outCode = rng.sample(range(0, 9).filter(d => !code.includes(d)), k - share);
      const g = rng.shuffle([...inCode, ...outCode]);
      const [a, b] = feedback(code, g);
      if (cfg.noZero && a === 0 && b === 0) continue;
      if (a === k) continue;
      if (clues.some(c => c.g.join('') === g.join(''))) continue;
      const next = live.filter(c => { const [x, y] = feedback(c, g); return x === a && y === b; });
      if (next.length < live.length) { clues.push({ g, a, b }); live = next; }
    }
    if (live.length !== 1) continue;
    let min = clues.slice();
    for (const c of rng.shuffle(clues.slice())) {
      const without = min.filter(x => x !== c);
      if (solveLock(k, without).length === 1) min = without;
    }
    if (min.length > cfg.maxClues || min.length < 3) continue;
    if (cfg.wantZero && !min.some(c => !c.a && !c.b)) continue;
    const order = rng.shuffle(min);
    return {
      game: 'codelock', level: L, k, answer: code, clues: order.map(c => ({ g: c.g, a: c.a, b: c.b, text: words(c.a, c.b) })),
      explain: explain(code, order),
    };
  }
  throw new Error('codelock: generation failed');
}

function pegs(a, b, k) {
  return '<span class="pegs">' + '●'.repeat(a).split('').map(() => '<i class="pg a">●</i>').join('') +
    '○'.repeat(b).split('').map(() => '<i class="pg b">○</i>').join('') +
    new Array(k - a - b).fill('<i class="pg n">·</i>').join('') + '</span>';
}
function explain(code, clues) {
  const rows = clues.map(c => {
    const marks = c.g.map((d, i) => d === code[i] ? `<b class="d a">${d}</b>` : code.includes(d) ? `<b class="d b">${d}</b>` : `<b class="d n">${d}</b>`).join('');
    return `<li><span class="cl-g">${marks}</span> ${pegs(c.a, c.b, code.length)}</li>`;
  }).join('');
  return `<p>The code is <b class="code-ans">${code.join(' ')}</b> — check it against every clue (green = right place, gold = wrong place):</p><ul class="cl-check">${rows}</ul><p class="muted">It is the only code that satisfies all of them.</p>`;
}

/* ------------------------------------------------ UI */
export function render(p, ui) {
  const k = p.k;
  const val = new Array(k).fill(0);
  let cursor = 0;
  ui.stage.innerHTML = `
    <ul class="cl-list">${p.clues.map(c => `<li><span class="cl-g">${c.g.map(d => `<b class="d">${d}</b>`).join('')}</span><span class="cl-t">${pegs(c.a, c.b, k)}<span>${c.text}</span></span></li>`).join('')}</ul>`;
  ui.answers.innerHTML = `
    <div class="lock">
      <svg viewBox="0 0 60 44" class="lock-shackle" aria-hidden="true"><path d="M14 44 V22 a16 16 0 0 1 32 0 V44" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>
      <div class="lock-body">
        ${range(0, k - 1).map(i => `<div class="dial" data-i="${i}"><button class="dial-up" aria-label="Digit ${i + 1} up">▲</button><div class="dial-win"><span>0</span></div><button class="dial-dn" aria-label="Digit ${i + 1} down">▼</button></div>`).join('')}
      </div>
    </div>`;
  const lock = ui.lock({ label: 'Unlock', onSubmit: () => ui.submit(val.slice()) });
  lock.enable(true);
  const dials = [...ui.answers.querySelectorAll('.dial')];
  const paint = () => dials.forEach((d, i) => {
    d.querySelector('.dial-win span').textContent = val[i];
    d.classList.toggle('cur', i === cursor);
  });
  dials.forEach((d, i) => {
    d.querySelector('.dial-up').addEventListener('click', () => { if (ui.locked) return; val[i] = (val[i] + 1) % 10; cursor = i; ui.sfx('tick'); paint(); });
    d.querySelector('.dial-dn').addEventListener('click', () => { if (ui.locked) return; val[i] = (val[i] + 9) % 10; cursor = i; ui.sfx('tick'); paint(); });
    d.querySelector('.dial-win').addEventListener('click', () => { cursor = i; paint(); });
    let y0 = null;
    d.addEventListener('pointerdown', e => { y0 = e.clientY; });
    d.addEventListener('pointerup', e => {
      if (y0 === null || ui.locked) return;
      const dy = e.clientY - y0; y0 = null;
      if (Math.abs(dy) > 18) { val[i] = (val[i] + (dy < 0 ? 1 : 9)) % 10; cursor = i; ui.sfx('tick'); paint(); }
    });
  });
  ui.onKey(e => {
    if (ui.locked) return false;
    if (/^[0-9]$/.test(e.key)) { val[cursor] = +e.key; cursor = Math.min(k - 1, cursor + 1); ui.sfx('tick'); paint(); return true; }
    if (e.key === 'ArrowLeft') { cursor = Math.max(0, cursor - 1); paint(); return true; }
    if (e.key === 'ArrowRight') { cursor = Math.min(k - 1, cursor + 1); paint(); return true; }
    if (e.key === 'ArrowUp') { val[cursor] = (val[cursor] + 1) % 10; paint(); return true; }
    if (e.key === 'ArrowDown') { val[cursor] = (val[cursor] + 9) % 10; paint(); return true; }
    return false;
  });
  paint();
}
export function grade(p, r) { const ok = Array.isArray(r) && r.every((x, i) => x === p.answer[i]); return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) { return `<div class="ans-big mono">${p.answer.join(' ')}</div>`; }
export function reveal(p, ui, r, ok) {
  const lock = ui.answers.querySelector('.lock');
  if (lock) lock.classList.add(ok ? 'open' : 'shake');
  if (!ok) ui.answers.querySelectorAll('.dial').forEach((d, i) => { d.querySelector('.dial-win span').textContent = p.answer[i]; d.classList.add('fixed'); });
}
