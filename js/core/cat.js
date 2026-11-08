/* Computerised adaptive testing for the IQ test: the question blueprints and the item picker.
   Pure (no DOM) so the Monte-Carlo check in tests/simulate-iq.js can run it under Node. */

import { eap, levelB } from './irt.js';

export const IQ_FULL = ['matrix', 'sequence', 'syllogism', 'rotation', 'symbols', 'truth', 'matrix', 'oddone', 'balance', 'cubefold', 'sequence', 'digitspan',
  'matrix', 'lineup', 'syllogism', 'rotation', 'symbols', 'truth', 'matrix', 'oddone', 'codelock', 'sequence', 'corsi', 'matrix'];
export const IQ_QUICK = ['matrix', 'sequence', 'syllogism', 'rotation', 'symbols', 'matrix', 'truth', 'oddone', 'cubefold', 'sequence', 'balance', 'matrix'];

/** next item: the level whose difficulty sits just above the current ability estimate (most
    informative for a 3PL item), with a little jitter so the sequence is not predictable */
export function pickIQ(st, blueprint, rng = Math.random) {
  if (st.i >= blueprint.length) return null;
  const resp = st.results.map(r => ({ b: levelB(r.level), c: r.guess || 0, x: r.correct ? 1 : 0 }));
  const theta = resp.length ? eap(resp).theta : -0.5;
  const target = theta + 0.15;
  let best = 1, bd = Infinity;
  for (let L = 1; L <= 10; L++) { const d = Math.abs(levelB(L) - target); if (d < bd) { bd = d; best = L; } }
  if (st.i > 0 && rng() < 0.25) best += rng() < 0.5 ? -1 : 1;
  return { game: blueprint[st.i], level: Math.max(1, Math.min(10, best)) };
}
