/* VERDICT — deductive logic.
   Two item families:
   • categorical syllogisms about nonsense groups ("All ZORBS are FLEEMS"), decided by enumerating
     every possible Venn diagram (each region empty or not, every group non-empty);
   • propositional reasoning ("If the gate is open, the bell rings…"), decided by truth table.
   The verdict is MUST BE TRUE / MUST BE FALSE / CAN'T TELL, computed exactly — never authored.
   Explanations draw the Venn diagram (or the table of possible worlds) that proves it. */

import { cap, uid, esc } from '../core/draw.js';
import { clamp, range } from '../core/rng.js';

export const meta = {
  id: 'syllogism', name: 'Verdict', title: 'Logic Verdict', domain: 'logic', kind: 'trial',
  icon: 'verdict', tagline: 'Must it be true?',
  howTo: [
    'Treat every statement as true, even if it sounds strange. Ignore real-world knowledge.',
    'Decide whether the conclusion MUST be true, MUST be false, or CAN\'T be determined from the statements.',
    'Every group mentioned has at least one member. "Some" means "at least one". "A only if B" means "if A then B". "A unless B" means "if not B, then A".',
  ],
  time: L => 50 + 7 * L,
  guess: () => 1 / 3,
};

export const VERDICTS = ['T', 'F', 'C'];
const VERDICT_TEXT = { T: 'Must be true', F: 'Must be false', C: "Can't tell" };

/* ================================================ categorical */
const WORDS = ['zorbs', 'fleems', 'wugs', 'blicks', 'glorps', 'snarfs', 'mibbles', 'quoffs', 'tazzles', 'vorns',
  'yibbits', 'krells', 'plonks', 'drells', 'fizzits', 'gromps', 'jaxons', 'nurbs'];
const REG = [1, 2, 3, 4, 5, 6, 7];
const inM = (m, r) => (m >> (r - 1)) & 1;
const CAT_MODELS = range(1, 127).filter(m => [0, 1, 2].every(t => REG.some(r => (r & (1 << t)) && inM(m, r))));

function regionsFor(st) {
  const xb = 1 << st.x, yb = 1 << st.y;
  if (st.f === 'A' || st.f === 'O') return REG.filter(r => (r & xb) && !(r & yb));
  return REG.filter(r => (r & xb) && (r & yb));
}
export function evalCat(st, m) {
  const any = regionsFor(st).some(r => inM(m, r));
  return st.f === 'A' || st.f === 'E' ? !any : any;
}
function catText(st, T) {
  const X = `<b class="term">${T[st.x].toUpperCase()}</b>`, Y = `<b class="term">${T[st.y].toUpperCase()}</b>`;
  return { A: `All ${X} are ${Y}.`, E: `No ${X} are ${Y}.`, I: `Some ${X} are ${Y}.`, O: `Some ${X} are not ${Y}.` }[st.f];
}
export function verdictOf(premises, concl, evalFn, models) {
  const ok = models.filter(m => premises.every(p => evalFn(p, m)));
  if (!ok.length) return null;
  const t = ok.filter(m => evalFn(concl, m)).length;
  return { v: t === ok.length ? 'T' : t === 0 ? 'F' : 'C', ok };
}

function genCategorical(rng, L, target) {
  const forms = L <= 1 ? ['A', 'E'] : L <= 2 ? ['A', 'E', 'I'] : ['A', 'E', 'I', 'O'];
  const terms = rng.sample(WORDS, 3);
  const [a, b, c] = rng.shuffle([0, 1, 2]);
  for (let attempt = 0; attempt < 80; attempt++) {
    const orient = (x, y) => (rng.chance(0.5) ? [x, y] : [y, x]);
    const prem = [];
    let [x, y] = orient(a, b); prem.push({ f: rng.pick(forms), x, y });
    [x, y] = orient(b, c); prem.push({ f: rng.pick(forms), x, y });
    if (L >= 6) { [x, y] = orient(a, rng.pick([b, c])); prem.push({ f: rng.pick(forms), x, y }); }
    if (!verdictOf(prem, prem[0], evalCat, CAT_MODELS)) continue;
    const cands = [];
    for (const f of ['A', 'E', 'I', 'O']) for (const p of [0, 1, 2]) for (const q of [0, 1, 2]) {
      if (p === q) continue;
      const st = { f, x: p, y: q };
      if (prem.some(s => s.f === f && s.x === p && s.y === q)) continue;
      const r = verdictOf(prem, st, evalCat, CAT_MODELS);
      if (r && r.v === target) cands.push({ st, r });
    }
    if (!cands.length) continue;
    // prefer conclusions linking the two end terms when possible
    const ends = cands.filter(k => (k.st.x === a && k.st.y === c) || (k.st.x === c && k.st.y === a));
    const pickd = rng.pick(ends.length && rng.chance(0.75) ? ends : cands);
    return {
      type: 'cat', terms, premises: prem.map(s => catText(s, terms)), conclusion: catText(pickd.st, terms),
      answer: target, explain: explainCat(terms, prem, pickd.st, pickd.r), _raw: { prem, concl: pickd.st },
    };
  }
  return null;
}

/* Venn diagram: circles A, B, C */
const VC = [[37, 39], [63, 39], [50, 62]], VR = 22.5;
const ANCHOR = { 1: [26, 33], 2: [74, 33], 4: [50, 75], 3: [50, 29], 5: [37, 57], 6: [63, 57], 7: [50, 47] };
function vennSVG(terms, { shade = [], marks = [], dots = [] } = {}) {
  const id = uid('vn');
  let defs = '';
  VC.forEach(([cx, cy], t) => {
    defs += `<clipPath id="${id}c${t}"><circle cx="${cx}" cy="${cy}" r="${VR}"/></clipPath>`;
    defs += `<mask id="${id}m${t}"><rect width="100" height="100" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${VR}" fill="#000"/></mask>`;
  });
  let body = '';
  for (const r of shade) {
    let g = '<rect width="100" height="100" fill="rgba(255,77,109,0.42)"/>';
    for (let t = 0; t < 3; t++) g = r & (1 << t) ? `<g clip-path="url(#${id}c${t})">${g}</g>` : `<g mask="url(#${id}m${t})">${g}</g>`;
    body += g;
  }
  const cols = ['#38e1ff', '#ffc54d', '#ff5fa8'];
  VC.forEach(([cx, cy], t) => { body += `<circle cx="${cx}" cy="${cy}" r="${VR}" fill="none" stroke="${cols[t]}" stroke-width="1.4"/>`; });
  for (const r of dots) { const [x, y] = ANCHOR[r]; body += `<circle cx="${x}" cy="${y}" r="3.2" fill="#4cf3a3" stroke="#05261a" stroke-width="1"/>`; }
  for (const m of marks) {
    const pts = m.map(r => ANCHOR[r]);
    const x = pts.reduce((s, p) => s + p[0], 0) / pts.length, y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    body += `<text x="${x}" y="${y + 3.6}" text-anchor="middle" font-size="11" font-weight="700" fill="#4cf3a3">✱</text>`;
  }
  const lab = [[14, 11, 'start'], [86, 11, 'end'], [50, 97, 'middle']];
  terms.forEach((w, t) => { body += `<text x="${lab[t][0]}" y="${lab[t][1]}" text-anchor="${lab[t][2]}" font-size="7.2" font-weight="700" letter-spacing=".4" fill="${cols[t]}">${esc(w.toUpperCase())}</text>`; });
  return `<svg viewBox="0 0 100 100" class="venn"><defs>${defs}</defs>${body}</svg>`;
}

function explainCat(terms, prem, concl, r) {
  const ok = r.ok;
  const forcedEmpty = REG.filter(reg => ok.every(m => !inM(m, reg)));
  if (r.v === 'C') {
    const t = ok.filter(m => evalCat(concl, m)), f = ok.filter(m => !evalCat(concl, m));
    const simplest = arr => arr.slice().sort((p, q) => bits(p) - bits(q))[0];
    const draw = m => vennSVG(terms, { shade: REG.filter(reg => !inM(m, reg)), dots: REG.filter(reg => inM(m, reg)) });
    return `<p>Both of these situations fit every statement, but the conclusion is true in one and false in the other — so you <b>can't tell</b>.</p>
      <div class="venn-pair"><figure>${draw(simplest(t))}<figcaption>Conclusion true</figcaption></figure><figure>${draw(simplest(f))}<figcaption>Conclusion false</figcaption></figure></div>
      <p class="muted">Green dots = something is there. Red = empty.</p>`;
  }
  const marks = [];
  for (const s of prem) if (s.f === 'I' || s.f === 'O') {
    const live = regionsFor(s).filter(reg => !forcedEmpty.includes(reg));
    if (live.length && live.length <= 2) marks.push(live);
  }
  const verdict = r.v === 'T' ? 'so the conclusion <b>must be true</b>' : 'which rules the conclusion out — it <b>must be false</b>';
  return `<p>Drawing the statements as a diagram (red = must be empty, ✱ = something must be in this zone or on this line), every arrangement left over agrees, ${verdict}.</p>
    <div class="venn-one">${vennSVG(terms, { shade: forcedEmpty, marks })}</div>`;
}
const bits = m => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };

/* ================================================ propositional */
const ATOMS = [
  ['the gate is open', 'the gate is not open', 'Gate open'],
  ['the lamp is on', 'the lamp is not on', 'Lamp on'],
  ['the bell rings', 'the bell does not ring', 'Bell rings'],
  ['the robot sings', 'the robot does not sing', 'Robot sings'],
  ['the river is frozen', 'the river is not frozen', 'River frozen'],
  ['the alarm sounds', 'the alarm does not sound', 'Alarm sounds'],
  ['the crystal glows', 'the crystal does not glow', 'Crystal glows'],
  ['the drone is flying', 'the drone is not flying', 'Drone flying'],
  ['the tower is lit', 'the tower is not lit', 'Tower lit'],
  ['the engine hums', 'the engine does not hum', 'Engine hums'],
];
const LIT = (A, i, neg) => A[i][neg ? 1 : 0];
const val = (v, i, neg) => (v[i] ? !neg : !!neg);

const PF = {
  fact: { n: 1, ev: (v, p) => val(v, p.a, p.na), tx: (A, p) => cap(LIT(A, p.a, p.na)) + '.' },
  impl: { n: 2, ev: (v, p) => !val(v, p.a, p.na) || val(v, p.b, p.nb), tx: (A, p) => `If ${LIT(A, p.a, p.na)}, then ${LIT(A, p.b, p.nb)}.` },
  or: { n: 2, ev: (v, p) => val(v, p.a, p.na) || val(v, p.b, p.nb), tx: (A, p) => `Either ${LIT(A, p.a, p.na)} or ${LIT(A, p.b, p.nb)} (or both).` },
  xor: { n: 2, ev: (v, p) => val(v, p.a, p.na) !== val(v, p.b, p.nb), tx: (A, p) => `Either ${LIT(A, p.a, p.na)} or ${LIT(A, p.b, p.nb)}, but not both.` },
  nand: { n: 2, ev: (v, p) => !(val(v, p.a, p.na) && val(v, p.b, p.nb)), tx: (A, p) => `It is not true that both ${LIT(A, p.a, p.na)} and ${LIT(A, p.b, p.nb)}.` },
  onlyIf: { n: 2, ev: (v, p) => !val(v, p.a, p.na) || val(v, p.b, p.nb), tx: (A, p) => `${cap(LIT(A, p.a, p.na))} only if ${LIT(A, p.b, p.nb)}.` },
  unless: { n: 2, ev: (v, p) => val(v, p.a, p.na) || val(v, p.b, p.nb), tx: (A, p) => `${cap(LIT(A, p.a, p.na))} unless ${LIT(A, p.b, p.nb)}.` },
  iff: { n: 2, ev: (v, p) => val(v, p.a, p.na) === val(v, p.b, p.nb), tx: (A, p) => `${cap(LIT(A, p.a, p.na))} if, and only if, ${LIT(A, p.b, p.nb)}.` },
  and: { n: 2, ev: (v, p) => val(v, p.a, p.na) && val(v, p.b, p.nb), tx: (A, p) => `Both ${LIT(A, p.a, p.na)} and ${LIT(A, p.b, p.nb)}.` },
};
const evalProp = (p, v) => PF[p.t].ev(v, p);

const PROP_LEVEL = {
  1: { vars: 2, forms: ['impl'], prem: 2, negP: 0.15 },
  2: { vars: 2, forms: ['impl'], prem: 2, negP: 0.4 },
  3: { vars: 2, forms: ['impl', 'or'], prem: 2, negP: 0.4 },
  4: { vars: 3, forms: ['impl', 'or', 'xor', 'nand'], prem: 3, negP: 0.35 },
  5: { vars: 3, forms: ['impl', 'impl', 'or'], prem: 3, negP: 0.35 },
  6: { vars: 3, forms: ['impl', 'or', 'xor', 'nand', 'iff'], prem: 3, negP: 0.4 },
  7: { vars: 3, forms: ['impl', 'onlyIf', 'unless', 'or', 'xor'], prem: 3, negP: 0.4 },
  8: { vars: 4, forms: ['impl', 'iff', 'xor', 'or', 'onlyIf', 'nand'], prem: 4, negP: 0.4 },
  9: { vars: 4, forms: ['impl', 'iff', 'xor', 'or', 'onlyIf', 'unless', 'nand'], prem: 4, negP: 0.45, compound: true },
  10: { vars: 4, forms: ['impl', 'iff', 'xor', 'or', 'onlyIf', 'unless', 'nand'], prem: 5, negP: 0.45, compound: true },
};

function genPropositional(rng, L, target) {
  const cfg = PROP_LEVEL[L];
  const A = rng.sample(ATOMS, cfg.vars);
  const n = cfg.vars;
  const worlds = range(0, (1 << n) - 1).map(w => range(0, n - 1).map(i => !!((w >> i) & 1)));
  for (let attempt = 0; attempt < 120; attempt++) {
    const prem = [];
    const used = new Set();
    for (let k = 0; k < cfg.prem; k++) {
      const isFact = k === cfg.prem - 1 && rng.chance(0.85);
      if (isFact) {
        const a = rng.int(0, n - 1);
        prem.push({ t: 'fact', a, na: rng.chance(cfg.negP + 0.1) });
        used.add(a);
      } else {
        const [a, b] = rng.sample(range(0, n - 1), 2);
        prem.push({ t: rng.pick(cfg.forms), a, b, na: rng.chance(cfg.negP), nb: rng.chance(cfg.negP) });
        used.add(a); used.add(b);
      }
    }
    if (used.size < n) continue;
    const ok = worlds.filter(v => prem.every(p => evalProp(p, v)));
    if (!ok.length) continue;
    const concls = [];
    for (let i = 0; i < n; i++) for (const neg of [false, true]) concls.push({ t: 'fact', a: i, na: neg });
    if (cfg.compound) for (const t of ['and', 'or', 'impl']) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) concls.push({ t, a: i, b: j, na: rng.chance(0.3), nb: rng.chance(0.3) });
    const goodC = concls.filter(c => {
      if (prem.some(p => p.t === c.t && p.a === c.a && p.na === c.na && (c.t === 'fact' || (p.b === c.b && p.nb === c.nb)))) return false;
      if (c.t === 'fact' && prem.some(p => p.t === 'fact' && p.a === c.a)) return false;   // no restating a given fact
      const t = ok.filter(v => evalProp(c, v)).length;
      const v = t === ok.length ? 'T' : t === 0 ? 'F' : 'C';
      return v === target;
    });
    if (!goodC.length) continue;
    const c = rng.pick(goodC);
    return {
      type: 'prop', premises: rng.shuffle(prem).map(p => PF[p.t].tx(A, p)), conclusion: PF[c.t].tx(A, c),
      answer: target, explain: explainProp(A, ok, c, target), _raw: { prem, c, n },
    };
  }
  return null;
}

function explainProp(A, ok, c, v) {
  const head = A.map(a => `<th>${a[2]}?</th>`).join('') + '<th class="cc">Conclusion</th>';
  const rows = ok.map(w => '<tr>' + w.map(x => `<td class="${x ? 'y' : 'n'}">${x ? '✓' : '✗'}</td>`).join('') +
    `<td class="cc ${evalProp(c, w) ? 'y' : 'n'}">${evalProp(c, w) ? 'true' : 'false'}</td></tr>`).join('');
  const lead = ok.length === 1 ? 'Only one situation makes every statement true:' : `These ${ok.length} situations are the only ones where every statement is true:`;
  const tail = v === 'T' ? 'The conclusion is true in all of them, so it <b>must be true</b>.'
    : v === 'F' ? 'The conclusion is false in all of them, so it <b>must be false</b>.'
      : 'The conclusion is true in some and false in others, so you <b>can\'t tell</b>.';
  return `<p>${lead}</p><div class="tt-wrap"><table class="tt"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div><p>${tail}</p>`;
}

/* ================================================ generate / UI */
export function generate(rng, level) {
  const L = clamp(Math.round(level), 1, 10);
  const pCat = L <= 4 ? 0.5 : L <= 7 ? 0.4 : 0.3;
  for (let attempt = 0; attempt < 200; attempt++) {
    const target = rng.pick(VERDICTS);
    const g = rng.chance(pCat) ? genCategorical(rng, L, target) : genPropositional(rng, L, target);
    if (g) return { game: 'syllogism', level: L, ...g };
  }
  throw new Error('syllogism: generation failed');
}

export function render(p, ui) {
  ui.stage.innerHTML = `
    <div class="sy-box">
      <div class="sy-label">Statements</div>
      <ol class="sy-prem">${p.premises.map(s => `<li>${s}</li>`).join('')}</ol>
      <div class="sy-label">Conclusion</div>
      <div class="sy-concl">${p.conclusion}</div>
      ${p.type === 'cat' ? '<p class="sy-note">Every group has at least one member.</p>' : ''}
    </div>`;
  ui.choice(VERDICTS.map(v => `<span class="verdict-${v}">${VERDICT_TEXT[v]}</span>`), { cols: 3, cls: 'opt-text' });
}
export function grade(p, r) { const ok = VERDICTS[r] === p.answer; return { correct: ok, score: ok ? 1 : 0 }; }
export const answerIndex = p => VERDICTS.indexOf(p.answer);
export function answerHTML(p) { return `<div class="ans-big small verdict-${p.answer}">${VERDICT_TEXT[p.answer]}</div>`; }
