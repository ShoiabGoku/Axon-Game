/* Geometry helpers for the spatial puzzles:
   - 2D polyominoes (rotation-only canonical forms, chirality)
   - 3D cube figures (the 24 proper rotations, canonical forms, mirror images)
   - a tiny orthographic renderer + occlusion test for cube figures */

/* ------------------------------ 2D ------------------------------ */
export function norm2(cells) {
  let mx = Infinity, my = Infinity;
  for (const [x, y] of cells) { if (x < mx) mx = x; if (y < my) my = y; }
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
export const key2 = cells => norm2(cells).map(c => c[0] + ',' + c[1]).join(';');
export const rot90 = cells => cells.map(([x, y]) => [-y, x]);
export const mirror2 = cells => cells.map(([x, y]) => [-x, y]);
export function canon2(cells) {
  let best = null, c = cells;
  for (let i = 0; i < 4; i++) { const k = key2(c); if (best === null || k < best) best = k; c = rot90(c); }
  return best;
}
export const isChiral2 = cells => canon2(cells) !== canon2(mirror2(cells));

/** random connected polyomino; `spread` biases growth toward branchy, less blobby shapes */
export function randomPolyomino(rng, n, spread = 0.7) {
  const cells = [[0, 0]];
  const has = new Set(['0,0']);
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let guard = 0;
  while (cells.length < n && guard++ < 5000) {
    const frontier = [];
    for (const [x, y] of cells) for (const [dx, dy] of D) {
      const k = (x + dx) + ',' + (y + dy);
      if (has.has(k)) continue;
      let nb = 0;
      for (const [ex, ey] of D) if (has.has((x + dx + ex) + ',' + (y + dy + ey))) nb++;
      frontier.push({ x: x + dx, y: y + dy, w: nb === 1 ? 1 : 1 - spread * 0.9 });
    }
    const pickd = rng.weighted(frontier, frontier.map(f => f.w));
    const k = pickd.x + ',' + pickd.y;
    if (!has.has(k)) { has.add(k); cells.push([pickd.x, pickd.y]); }
  }
  return norm2(cells);
}

/* ------------------------------ 3D ------------------------------ */
function det3(m) {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}
export const ROT24 = (() => {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const out = [];
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) m[i][p[i]] = (s >> i) & 1 ? -1 : 1;
    if (det3(m) === 1) out.push(m);
  }
  return out;
})();
export const mulMV = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
export const mulMM = (a, b) => a.map((row, i) => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
export const transpose3 = m => [0, 1, 2].map(i => [0, 1, 2].map(j => m[j][i]));

export function key3(cells) {
  let mx = Infinity, my = Infinity, mz = Infinity;
  for (const [x, y, z] of cells) { if (x < mx) mx = x; if (y < my) my = y; if (z < mz) mz = z; }
  return cells.map(([x, y, z]) => (x - mx) + ',' + (y - my) + ',' + (z - mz)).sort().join(';');
}
export function canon3(cells) {
  let best = null;
  for (const m of ROT24) { const k = key3(cells.map(c => mulMV(m, c))); if (best === null || k < best) best = k; }
  return best;
}
export const mirror3 = cells => cells.map(([x, y, z]) => [-x, y, z]);

/** rotation matrix from axis (unit) and angle (radians) */
export function axisAngle(ax, ang) {
  const [x, y, z] = ax, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}
/** uniformly random rotation (via random unit quaternion) */
export function randomRotation(rng) {
  const u1 = rng.next(), u2 = rng.next(), u3 = rng.next();
  const q = [Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2), Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
    Math.sqrt(u1) * Math.sin(2 * Math.PI * u3), Math.sqrt(u1) * Math.cos(2 * Math.PI * u3)];
  const [x, y, z, w] = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}
/** angle (degrees) between two rotations */
export function rotDistance(a, b) {
  const r = mulMM(transpose3(a), b);
  const tr = r[0][0] + r[1][1] + r[2][2];
  return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) * 180 / Math.PI;
}

const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

/**
 * Orthographic projection of a cube figure under rotation R (camera looks down −z, screen y down).
 * Painter's order by cube-centre depth is exact for lattice-aligned unit cubes under any
 * orthographic view: for every axis on which two cubes differ there is a separating plane, and
 * the nearer cube is on the viewer's side of all of them.
 * Returns polygons in draw order: { cube, pts: [[x,y]…], shade }.
 */
export function projectCubes(cells, R) {
  const set = new Set(cells.map(c => c.join(',')));
  let cx = 0, cy = 0, cz = 0;
  for (const [x, y, z] of cells) { cx += x + 0.5; cy += y + 0.5; cz += z + 0.5; }
  cx /= cells.length; cy /= cells.length; cz /= cells.length;
  const light = (() => { const l = [-0.45, -0.7, 0.55]; const m = Math.hypot(...l); return l.map(v => v / m); })();
  const order = cells.map((c, i) => {
    const p = mulMV(R, [c[0] + 0.5 - cx, c[1] + 0.5 - cy, c[2] + 0.5 - cz]);
    return { i, depth: p[2] };
  }).sort((a, b) => a.depth - b.depth);
  const polys = [];
  for (const { i } of order) {
    const [x, y, z] = cells[i];
    for (const f of FACES) {
      if (set.has((x + f.n[0]) + ',' + (y + f.n[1]) + ',' + (z + f.n[2]))) continue;   // hidden internal face
      const nn = mulMV(R, f.n);
      if (nn[2] <= 1e-6) continue;                                                     // back face
      const pts = f.v.map(v => {
        const p = mulMV(R, [x + v[0] - cx, y + v[1] - cy, z + v[2] - cz]);
        return [p[0], -p[1]];
      });
      const lam = Math.max(0, nn[0] * light[0] + nn[1] * -light[1] + nn[2] * light[2]);
      polys.push({ cube: i, pts, shade: 0.35 + 0.65 * lam });
    }
  }
  return polys;
}

function insideConvex(pts, x, y) {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c !== 0) { const s = c > 0 ? 1 : -1; if (sign === 0) sign = s; else if (s !== sign) return false; }
  }
  return true;
}

/**
 * Rasterises the painter's-order polygons into an id buffer and reports, per cube, the visible
 * pixel count relative to what it would show alone. Used to reject views that hide a cube.
 */
export function cubeVisibility(cells, R, res = 96) {
  const polys = projectCubes(cells, R);
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const p of polys) for (const [x, y] of p.pts) { mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); }
  const scale = (res - 2) / Math.max(mxx - mnx, mxy - mny);
  const buf = new Int16Array(res * res).fill(-1);
  const alone = new Array(cells.length).fill(0);
  for (const p of polys) {
    const P = p.pts.map(([x, y]) => [(x - mnx) * scale + 1, (y - mny) * scale + 1]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    for (let py = Math.max(0, Math.floor(y0)); py <= Math.min(res - 1, Math.ceil(y1)); py++) {
      for (let px = Math.max(0, Math.floor(x0)); px <= Math.min(res - 1, Math.ceil(x1)); px++) {
        if (insideConvex(P, px + 0.5, py + 0.5)) { buf[py * res + px] = p.cube; alone[p.cube]++; }
      }
    }
  }
  const vis = new Array(cells.length).fill(0);
  for (let i = 0; i < buf.length; i++) if (buf[i] >= 0) vis[buf[i]]++;
  return vis.map((v, i) => (alone[i] ? v / alone[i] : 0));
}

/** SVG markup for a cube figure, fitted into a size×size box */
export function cubesSVG(cells, R, { size = 100, hue = 190, pad = 8 } = {}) {
  const polys = projectCubes(cells, R);
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const p of polys) for (const [x, y] of p.pts) { mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); }
  const s = (size - 2 * pad) / Math.max(mxx - mnx, mxy - mny);
  const ox = (size - (mxx - mnx) * s) / 2, oy = (size - (mxy - mny) * s) / 2;
  let out = '';
  for (const p of polys) {
    const pts = p.pts.map(([x, y]) => ((x - mnx) * s + ox).toFixed(2) + ',' + ((y - mny) * s + oy).toFixed(2)).join(' ');
    const L = Math.round(22 + 48 * p.shade);
    out += `<polygon points="${pts}" fill="hsl(${hue} 80% ${L}%)" stroke="hsl(${hue} 60% 12%)" stroke-width="1.1" stroke-linejoin="round"/>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" class="cubes">${out}</svg>`;
}
