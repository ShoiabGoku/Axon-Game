/* Seeded random numbers. Every puzzle is generated from a seed, so daily challenges are the
   same for everyone and every generator can be replayed exactly in the test harness. */

export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  const next = () => {                       // mulberry32
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    float: (lo = 0, hi = 1) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),     // inclusive
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
    sample: (arr, k) => r.shuffle(arr).slice(0, k),
    weighted(items, weights) {
      const total = weights.reduce((s, w) => s + w, 0);
      let x = next() * total;
      for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
      return items[items.length - 1];
    },
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return r;
}

export function randomSeed() {
  return Math.floor(Math.random() * 4294967296).toString(36) + Date.now().toString(36);
}

export const range = (lo, hi) => { const a = []; for (let i = lo; i <= hi; i++) a.push(i); return a; };
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
