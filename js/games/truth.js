/* TRUTH & LIES — Truthbots always tell the truth, Glitchbots always lie.
   Each robot's statement is a boolean function of the hidden assignment; a speaker is consistent
   when (speaker is a truthbot) ⇔ (statement is true). Puzzles are kept only when exactly one of the
   2^n assignments is consistent, checked by brute force. */

import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'truth', name: 'Truth & Lies', title: 'Truthbots & Glitchbots', domain: 'logic', kind: 'trial',
  icon: 'robot', tagline: 'Expose the liars',
  howTo: [
    'TRUTHBOTS always tell the truth. GLITCHBOTS always lie — everything they say is false.',
    'Use what the robots say to work out who is who. Exactly one combination works.',
    'Tap a robot to switch it between ? → Truthbot → Glitchbot, then lock in your answer.',
  ],
  time: L => 60 + 14 * L,
  guess: p => 1 / 2 ** p.n,
};

export const NAMES = ['ADA', 'BIX', 'CYD', 'DOT', 'EON'];
export const ROBOT_COLORS = ['#38e1ff', '#ffc54d', '#ff5fa8', '#4cf3a3', '#9d7bff'];
const count = t => t.filter(Boolean).length;
const kind = b => (b ? 'truthbot' : 'glitchbot');
const kinds = b => (b ? 'truthbots' : 'glitchbots');
const N = i => `<b class="rb rb${i}">${NAMES[i]}</b>`;

/* statement templates: (s = speaker, n, args) → { tx, ev(t) } */
const TPL = {
  isT: { min: 1, need: 1, f: (s, n, [x]) => ({ tx: `${N(x)} is a truthbot.`, ev: t => t[x] }) },
  isL: { min: 1, need: 1, f: (s, n, [x]) => ({ tx: `${N(x)} is a glitchbot.`, ev: t => !t[x] }) },
  sameMe: { min: 1, need: 1, f: (s, n, [x]) => ({ tx: `${N(x)} and I are the same kind.`, ev: t => t[x] === t[s] }) },
  diffMe: { min: 1, need: 1, f: (s, n, [x]) => ({ tx: `${N(x)} and I are different kinds.`, ev: t => t[x] !== t[s] }) },
  oneOfUsL: { min: 2, need: 0, f: (s, n) => ({ tx: n === 2 ? 'At least one of us is a glitchbot.' : 'At least one of us is a glitchbot.', ev: t => count(t) < n }) },
  bothT: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `${N(x)} and ${N(y)} are both truthbots.`, ev: t => t[x] && t[y] }) },
  bothL: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `${N(x)} and ${N(y)} are both glitchbots.`, ev: t => !t[x] && !t[y] }) },
  exactlyOneT: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `Exactly one of ${N(x)} and ${N(y)} is a truthbot.`, ev: t => t[x] !== t[y] }) },
  atLeastOneL: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `At least one of ${N(x)} and ${N(y)} is a glitchbot.`, ev: t => !t[x] || !t[y] }) },
  sameXY: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `${N(x)} and ${N(y)} are the same kind.`, ev: t => t[x] === t[y] }) },
  countT: { min: 3, need: 0, f: (s, n, a, rng) => { const k = rng.int(0, n); return { tx: k === 0 ? 'None of us are truthbots.' : k === n ? 'All of us are truthbots.' : `Exactly ${k} of us ${k === 1 ? 'is a truthbot' : 'are truthbots'}.`, ev: t => count(t) === k }; } },
  atLeastL: { min: 3, need: 0, f: (s, n, a, rng) => { const k = rng.int(2, n - 1); return { tx: `At least ${k} of us are glitchbots.`, ev: t => n - count(t) >= k }; } },
  ifThen: { min: 3, need: 2, f: (s, n, [x, y], rng) => { const px = rng.chance(0.5), py = rng.chance(0.5); return { tx: `If ${N(x)} is a ${kind(px)}, then ${N(y)} is a ${kind(py)}.`, ev: t => t[x] !== px || t[y] === py }; } },
  selfOr: { min: 2, need: 1, f: (s, n, [x]) => ({ tx: `Either I am a glitchbot, or ${N(x)} is a truthbot.`, ev: t => !t[s] || t[x] }) },
  wouldSay: { min: 3, need: 2, f: (s, n, [x, y]) => ({ tx: `${N(x)} would tell you that ${N(y)} is a glitchbot.`, ev: t => t[x] === !t[y] }) },
  moreT: { min: 3, need: 0, f: (s, n) => ({ tx: 'There are more truthbots than glitchbots among us.', ev: t => count(t) * 2 > n }) },
  evenT: { min: 4, need: 0, f: (s, n) => ({ tx: 'An even number of us are truthbots.', ev: t => count(t) % 2 === 0 }) },
};

const LEVEL = {
  1: { n: 2, pool: ['isT', 'isL', 'sameMe', 'diffMe'] },
  2: { n: 2, pool: ['isT', 'isL', 'sameMe', 'diffMe', 'oneOfUsL', 'selfOr'] },
  3: { n: 3, pool: ['isT', 'isL', 'sameMe', 'diffMe'] },
  4: { n: 3, pool: ['isL', 'sameMe', 'diffMe', 'bothT', 'bothL', 'exactlyOneT', 'atLeastOneL', 'sameXY'] },
  5: { n: 3, pool: ['sameMe', 'diffMe', 'bothL', 'exactlyOneT', 'atLeastOneL', 'sameXY', 'countT', 'selfOr'] },
  6: { n: 4, pool: ['isL', 'sameMe', 'diffMe', 'bothT', 'exactlyOneT', 'atLeastOneL', 'sameXY', 'countT'] },
  7: { n: 4, pool: ['diffMe', 'exactlyOneT', 'atLeastOneL', 'sameXY', 'countT', 'atLeastL', 'ifThen', 'selfOr'], silent: 0.35 },
  8: { n: 4, pool: ['exactlyOneT', 'atLeastOneL', 'sameXY', 'countT', 'atLeastL', 'ifThen', 'wouldSay', 'moreT'], silent: 0.35 },
  9: { n: 5, pool: ['sameMe', 'diffMe', 'exactlyOneT', 'atLeastOneL', 'sameXY', 'countT', 'atLeastL', 'ifThen', 'wouldSay'], silent: 0.3 },
  10: { n: 5, pool: ['exactlyOneT', 'atLeastOneL', 'sameXY', 'countT', 'atLeastL', 'ifThen', 'wouldSay', 'moreT', 'evenT', 'selfOr'], silent: 0.35 },
};

export function solveTruth(n, stmts) {
  const sols = [];
  for (let w = 0; w < 1 << n; w++) {
    const t = range(0, n - 1).map(i => !!((w >> i) & 1));
    if (stmts.every((st, s) => !st || st.ev(t) === t[s])) sols.push(t);
  }
  return sols;
}

export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const cfg = LEVEL[L];
  const n = cfg.n;
  for (let attempt = 0; attempt < 1500; attempt++) {
    const sol = range(0, n - 1).map(() => rng.chance(0.5));
    const silent = cfg.silent && rng.chance(cfg.silent) ? rng.int(0, n - 1) : -1;
    const stmts = [];
    let ok = true;
    for (let s = 0; s < n && ok; s++) {
      if (s === silent) { stmts.push(null); continue; }
      let st = null;
      for (let t = 0; t < 40 && !st; t++) {
        const key = rng.pick(cfg.pool), T = TPL[key];
        if (n < T.min) continue;
        const others = range(0, n - 1).filter(i => i !== s);
        if (others.length < T.need) continue;
        const cand = T.f(s, n, rng.sample(others, T.need), rng);
        if (cand.ev(sol) === sol[s]) st = { ...cand, key };
      }
      if (!st) ok = false; else stmts.push(st);
    }
    if (!ok) continue;
    const sols = solveTruth(n, stmts);
    if (sols.length !== 1) continue;
    // reject puzzles that are pure chains of "X is a truthbot/glitchbot" above level 3
    if (L >= 4 && stmts.every(st => !st || st.key === 'isT' || st.key === 'isL')) continue;
    return {
      game: 'truth', level: L, n, answer: sol,
      statements: stmts.map(st => (st ? st.tx : null)),
      explain: explain(n, stmts, sol),
      _stmts: stmts,
    };
  }
  throw new Error('truth: generation failed');
}

function explain(n, stmts, sol) {
  const lines = range(0, n - 1).map(i => {
    if (!stmts[i]) return `<li>${N(i)} is a <b class="${sol[i] ? 'tk' : 'gk'}">${kind(sol[i])}</b> — it said nothing; the others' statements pin it down.</li>`;
    const v = stmts[i].ev(sol);
    return `<li>${N(i)} is a <b class="${sol[i] ? 'tk' : 'gk'}">${kind(sol[i])}</b> and its statement is <b>${v ? 'true' : 'false'}</b> ✓</li>`;
  }).join('');
  // show why flipping each robot fails
  const flips = [];
  for (let i = 0; i < n && flips.length < 2; i++) {
    const t = sol.slice(); t[i] = !t[i];
    const k = range(0, n - 1).find(s => stmts[s] && stmts[s].ev(t) !== t[s]);
    if (k === undefined) continue;
    flips.push(`<li>If ${N(i)} were a ${kind(t[i])}, ${N(k)} (then a ${kind(t[k])}) would be making a <b>${stmts[k].ev(t) ? 'true' : 'false'}</b> statement — impossible.</li>`);
  }
  return `<p>The only consistent answer:</p><ul class="rules">${lines}</ul>` +
    (flips.length ? `<p>Any change breaks something, for example:</p><ul class="rules">${flips.join('')}</ul>` : '');
}

/* ------------------------------------------------ UI */
export function robotSVG(i) {
  const c = ROBOT_COLORS[i % ROBOT_COLORS.length];
  return `<svg viewBox="0 0 80 80" class="robot" aria-hidden="true">
    <line x1="40" y1="10" x2="40" y2="2" stroke="${c}" stroke-width="2.5"/><circle class="ant" cx="40" cy="3" r="3.2" fill="${c}"/>
    <rect x="14" y="10" width="52" height="38" rx="12" fill="#121735" stroke="${c}" stroke-width="2.5"/>
    <rect x="21" y="17" width="38" height="24" rx="7" fill="#05071a"/>
    <g class="eyes-q"><text x="40" y="35" text-anchor="middle" font-size="16" font-weight="800" fill="#7f88b8">? ?</text></g>
    <g class="eyes-t" stroke="#4cf3a3" stroke-width="3" fill="none" stroke-linecap="round"><path d="M27 31 q4 -6 8 0"/><path d="M45 31 q4 -6 8 0"/></g>
    <g class="eyes-g" stroke="#ff4d6d" stroke-width="3" stroke-linecap="round"><path d="M27 25 l7 8 M34 25 l-7 8"/><path d="M46 25 l7 8 M53 25 l-7 8"/></g>
    <rect x="22" y="51" width="36" height="22" rx="8" fill="#121735" stroke="${c}" stroke-width="2.5"/>
    <circle cx="33" cy="62" r="3" fill="${c}"/><circle cx="47" cy="62" r="3" fill="${c}" opacity=".5"/>
  </svg>`;
}

export function render(p, ui) {
  const state = new Array(p.n).fill(null);
  const cards = range(0, p.n - 1).map(i => `
    <button class="rb-card" data-i="${i}" aria-label="${NAMES[i]}: unknown">
      <div class="rb-bubble">${p.statements[i] ? p.statements[i] : '<i class="muted">…says nothing.</i>'}</div>
      ${robotSVG(i)}
      <div class="rb-name">${NAMES[i]}</div>
      <div class="rb-tag">?</div>
    </button>`).join('');
  ui.stage.innerHTML = `<div class="rb-grid n${p.n}">${cards}</div>`;
  const lock = ui.lock({ label: 'Lock in', onSubmit: () => ui.submit(state.slice()) });
  ui.stage.querySelectorAll('.rb-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (ui.locked) return;
      const i = +btn.dataset.i;
      state[i] = state[i] === null ? true : state[i] ? false : null;
      btn.classList.toggle('is-t', state[i] === true);
      btn.classList.toggle('is-g', state[i] === false);
      btn.querySelector('.rb-tag').textContent = state[i] === null ? '?' : state[i] ? 'TRUTHBOT' : 'GLITCHBOT';
      btn.setAttribute('aria-label', `${NAMES[i]}: ${state[i] === null ? 'unknown' : kind(state[i])}`);
      ui.sfx('tap');
      lock.enable(state.every(x => x !== null));
    });
  });
}
export function grade(p, r) { const ok = Array.isArray(r) && r.every((x, i) => x === p.answer[i]); return { correct: ok, score: ok ? 1 : 0 }; }
export function answerHTML(p) {
  return '<div class="ans-row">' + p.answer.map((t, i) => `<span class="chip ${t ? 'tk' : 'gk'}">${NAMES[i]} · ${t ? 'Truthbot' : 'Glitchbot'}</span>`).join('') + '</div>';
}
export function reveal(p, ui, r) {
  ui.stage.querySelectorAll('.rb-card').forEach(btn => {
    const i = +btn.dataset.i, t = p.answer[i];
    btn.classList.toggle('is-t', t); btn.classList.toggle('is-g', !t);
    btn.querySelector('.rb-tag').textContent = t ? 'TRUTHBOT' : 'GLITCHBOT';
    if (Array.isArray(r) && r[i] !== null && r[i] !== t) btn.classList.add('was-wrong');
  });
}
