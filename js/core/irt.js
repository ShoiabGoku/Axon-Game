/* Item response theory for the adaptive IQ test and the per-domain ability ratings.

   Model: 3-parameter logistic, P(correct | θ) = c + (1 − c) / (1 + e^(−1.7·a·(θ − b)))
     θ  ability on the standard-normal scale (population mean 0, SD 1)
     b  item difficulty — set from the puzzle level by design (see levelB)
     c  guessing floor (1 / number of options for multiple choice, 0 for typed answers)
   Ability is the posterior mean (EAP) on a grid with a N(0, 1) prior; IQ = 100 + 15·θ.

   The level→difficulty mapping is a designed calibration, not norms from a tested population,
   so results are estimates for practice and fun — the UI says so. */

export const levelB = L => -2.4 + (Math.max(1, Math.min(10, L)) - 1) * (4.8 / 9);
export const A_DISC = 1.0;

export function pCorrect(theta, b, c = 0, a = A_DISC) {
  return c + (1 - c) / (1 + Math.exp(-1.7 * a * (theta - b)));
}

/** responses: [{ b, c, x }] with x = 1 correct, 0 wrong */
export function eap(responses, prior = { mean: 0, sd: 1 }) {
  const G = 241, lo = -4.5, hi = 4.5;
  const thetas = new Float64Array(G), logp = new Float64Array(G);
  let mx = -Infinity;
  for (let i = 0; i < G; i++) {
    const t = lo + ((hi - lo) * i) / (G - 1);
    thetas[i] = t;
    let lp = -0.5 * ((t - prior.mean) / prior.sd) ** 2;
    for (const r of responses) {
      const p = Math.min(1 - 1e-9, Math.max(1e-9, pCorrect(t, r.b, r.c || 0)));
      lp += Math.log(r.x ? p : 1 - p);
    }
    logp[i] = lp;
    if (lp > mx) mx = lp;
  }
  let w = 0, m = 0, m2 = 0;
  for (let i = 0; i < G; i++) { const e = Math.exp(logp[i] - mx); w += e; m += e * thetas[i]; m2 += e * thetas[i] * thetas[i]; }
  const mean = m / w;
  return { theta: mean, se: Math.sqrt(Math.max(0, m2 / w - mean * mean)) };
}

/** Fisher information of an item at θ (3PL) — used to pick the most informative next level */
export function info(theta, b, c = 0, a = A_DISC) {
  const p = pCorrect(theta, b, c, a);
  const q = 1 - p;
  const k = 1.7 * a;
  return (k * k * q * ((p - c) ** 2)) / (p * (1 - c) ** 2);
}

export const toIQ = theta => 100 + 15 * theta;

export function normCdf(x) {
  // Abramowitz–Stegun 7.1.26 on erf
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

export function iqBand(iq) {
  if (iq >= 145) return { label: 'Exceptional', tone: 'gold' };
  if (iq >= 130) return { label: 'Very superior', tone: 'gold' };
  if (iq >= 120) return { label: 'Superior', tone: 'violet' };
  if (iq >= 110) return { label: 'High average', tone: 'cyan' };
  if (iq >= 90) return { label: 'Average', tone: 'green' };
  if (iq >= 80) return { label: 'Low average', tone: 'orange' };
  return { label: 'Developing', tone: 'pink' };
}

/** quick Elo-style update of a domain rating after one item */
export function updateRating(r, b, x, c = 0) {
  const n = r.n || 0;
  const K = Math.max(0.12, 0.7 / Math.sqrt(n + 1));
  const p = pCorrect(r.theta || 0, b, c);
  const theta = Math.max(-3.5, Math.min(3.5, (r.theta || 0) + K * (x - p) * (1 - c)));
  return { theta, n: n + 1 };
}
