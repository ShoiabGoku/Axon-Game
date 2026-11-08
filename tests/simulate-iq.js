/* Monte-Carlo check of the adaptive IQ test: simulated examinees with a known true ability answer
   each item with the model's own probability; we compare the estimated IQ with the true IQ.
   This validates the item selection + EAP scoring pipeline (not the real-world calibration of
   puzzle difficulty, which would need data from real players).
   Run: node tests/simulate-iq.js */

import { makeRng } from '../js/core/rng.js';
import { pCorrect, levelB, eap, toIQ } from '../js/core/irt.js';
import { pickIQ, IQ_QUICK, IQ_FULL } from '../js/core/cat.js';

const GUESS = { matrix: 1 / 8, oddone: 1 / 5, rotation: 1 / 4, cubefold: 1 / 4, syllogism: 1 / 3, truth: 1 / 16 };

function simulate(theta, blueprint, rng) {
  const st = { i: 0, results: [] };
  for (; st.i < blueprint.length; st.i++) {
    const item = pickIQ(st, blueprint, () => rng.next());
    const c = GUESS[item.game] || 0;
    const x = rng.next() < pCorrect(theta, levelB(item.level), c) ? 1 : 0;
    st.results.push({ game: item.game, level: item.level, correct: !!x, guess: c });
  }
  const est = eap(st.results.map(r => ({ b: levelB(r.level), c: r.guess, x: r.correct ? 1 : 0 })));
  return { iq: toIQ(est.theta), se: est.se * 15 };
}

const rng = makeRng('iq-sim');
for (const [name, bp] of [['Quick (12)', IQ_QUICK], ['Full (24)', IQ_FULL]]) {
  console.log(`\n${name}: true IQ → mean estimate ± SD (mean reported SE)`);
  let rmseAll = 0, n = 0;
  for (const trueIQ of [70, 85, 100, 115, 130, 145]) {
    const theta = (trueIQ - 100) / 15;
    const runs = Array.from({ length: 1500 }, () => simulate(theta, bp, rng));
    const mean = runs.reduce((s, r) => s + r.iq, 0) / runs.length;
    const sd = Math.sqrt(runs.reduce((s, r) => s + (r.iq - mean) ** 2, 0) / runs.length);
    const se = runs.reduce((s, r) => s + r.se, 0) / runs.length;
    const rmse = Math.sqrt(runs.reduce((s, r) => s + (r.iq - trueIQ) ** 2, 0) / runs.length);
    rmseAll += rmse * rmse; n++;
    console.log(`  ${String(trueIQ).padStart(3)} → ${mean.toFixed(1).padStart(6)} ± ${sd.toFixed(1).padStart(4)}   (SE ${se.toFixed(1)}, RMSE ${rmse.toFixed(1)})`);
  }
  console.log(`  overall RMSE ${Math.sqrt(rmseAll / n).toFixed(1)} IQ points`);
}
