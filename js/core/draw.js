/* Shared SVG drawing helpers for the visual puzzles. Pure string builders — no DOM access,
   so the generators that use them can be imported by the Node test harness. */

export const INK = '#eaf6ff';
export const DARK = '#070a1c';
export const SHADES = ['none', 'rgba(234,246,255,0.26)', 'rgba(234,246,255,0.52)', 'rgba(234,246,255,0.78)', '#eaf6ff'];
export const COLORS = ['#38e1ff', '#ff5fa8', '#ffc54d', '#4cf3a3', '#9d7bff', '#ff8a3d'];
export const COLOR_NAMES = ['cyan', 'pink', 'gold', 'green', 'violet', 'orange'];
export const TYPE_SIDES = [3, 4, 5, 6, 0];
export const TYPE_NAMES = ['triangle', 'square', 'pentagon', 'hexagon', 'circle'];

let uidCounter = 0;
export const uid = (p = 'u') => p + (++uidCounter).toString(36);

const f2 = x => (Math.round(x * 100) / 100).toString();

/** points of a regular n-gon, first vertex at the top, rotated by `rot` degrees */
export function ngonPts(n, cx, cy, r, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (-90 + rot + (i * 360) / n) * Math.PI / 180;
    pts.push(f2(cx + r * Math.cos(a)) + ',' + f2(cy + r * Math.sin(a)));
  }
  return pts.join(' ');
}

/** type: 0 triangle, 1 square, 2 pentagon, 3 hexagon, 4 circle */
export function shapeSVG(type, cx, cy, r, o = {}) {
  const fill = o.fill ?? 'none';
  const stroke = o.stroke ?? INK;
  const sw = o.sw ?? 2.5;
  const extra = o.extra ?? '';
  let body;
  if (type === 4) {
    body = (s, w, fl) => `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r * 0.92)}" fill="${fl}" stroke="${s}" stroke-width="${w}" ${extra}/>`;
  } else {
    const n = TYPE_SIDES[type];
    const rr = n === 3 ? r * 1.1 : n === 4 ? r * 1.0 : r;
    const rot = (n === 4 ? 45 : 0) + (o.rot ?? 0);
    const pts = ngonPts(n, cx, cy, rr, rot);
    body = (s, w, fl) => `<polygon points="${pts}" fill="${fl}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round" ${extra}/>`;
  }
  // a dark halo keeps nested shapes readable on top of shaded ones
  return (o.halo ? body(DARK, sw + 3.2, 'none') : '') + body(stroke, sw, fill);
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const popcount = m => { let c = 0; while (m) { c += m & 1; m >>>= 1; } return c; };
export const bitsOf = (m, n) => { const out = []; for (let i = 0; i < n; i++) if (m & (1 << i)) out.push(i); return out; };
export const maskOf = list => list.reduce((m, b) => m | (1 << b), 0);
