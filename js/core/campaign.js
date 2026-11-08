/* The campaign: six zones of ten nodes. Nine puzzle nodes per zone, then a Gauntlet boss
   that mixes domains. Built deterministically so node n is always the same game and level. */

import { GAMES } from './catalog.js';

export const ZONES = [
  { name: 'Awakening', sub: 'First sparks', color: '#38e1ff', lo: 1, hi: 2, gate: 0 },
  { name: 'Synapse Fields', sub: 'Connections form', color: '#9d7bff', lo: 2, hi: 4, gate: 12 },
  { name: 'Cortex Spires', sub: 'Climbing higher', color: '#ffc54d', lo: 3, hi: 5, gate: 30 },
  { name: 'Echo Labyrinth', sub: 'Mind the maze', color: '#4cf3a3', lo: 5, hi: 7, gate: 50 },
  { name: 'Quantum Lattice', sub: 'Where rules bend', color: '#ff5fa8', lo: 6, hi: 8, gate: 75 },
  { name: 'Singularity', sub: 'The final trial', color: '#ff8a3d', lo: 8, hi: 10, gate: 100 },
];

// which games appear in each zone (9 each, every game appears at least three times overall)
const ZONE_GAMES = [
  ['matrix', 'sequence', 'oddone', 'symbols', 'syllogism', 'corsi', 'rotation', 'truth', 'stroop'],
  ['balance', 'lineup', 'matrix', 'digitspan', 'codelock', 'cubefold', 'sequence', 'compare', 'oddone'],
  ['truth', 'symbols', 'rotation', 'syllogism', 'corsi', 'matrix', 'lineup', 'stroop', 'balance'],
  ['cubefold', 'sequence', 'codelock', 'oddone', 'digitspan', 'matrix', 'truth', 'compare', 'symbols'],
  ['syllogism', 'rotation', 'lineup', 'matrix', 'corsi', 'balance', 'cubefold', 'stroop', 'sequence'],
  ['codelock', 'matrix', 'truth', 'digitspan', 'oddone', 'syllogism', 'cubefold', 'compare', 'symbols'],
];

export const NODES = (() => {
  const out = [];
  ZONES.forEach((z, zi) => {
    ZONE_GAMES[zi].forEach((g, j) => {
      const level = Math.round(z.lo + (j / 8) * (z.hi - z.lo));
      out.push({ index: out.length, zone: zi, game: g, level, boss: false });
    });
    out.push({ index: out.length, zone: zi, game: null, level: z.hi, boss: true });
  });
  return out;
})();

/** items for a node: regular nodes give 5 puzzles (or one sprint); bosses give 6 mixed puzzles */
export function nodeItems(node) {
  if (!node.boss) {
    const G = GAMES[node.game];
    if (G.meta.kind === 'sprint') return [{ game: node.game, level: node.level }];
    return Array.from({ length: 5 }, () => ({ game: node.game, level: node.level }));
  }
  const pick = [['matrix', 'sequence', 'oddone'], ['truth', 'lineup', 'codelock', 'syllogism'], ['symbols', 'balance'], ['rotation', 'cubefold'], ['corsi', 'digitspan'], ['matrix', 'sequence']];
  return pick.map((opts, i) => ({ game: opts[(node.zone + i) % opts.length], level: node.level }));
}

export function zoneStars(campaign, zi) {
  return NODES.filter(n => n.zone === zi).reduce((s, n) => s + (campaign[n.index] || 0), 0);
}
export function totalStars(campaign) { return NODES.reduce((s, n) => s + (campaign[n.index] || 0), 0); }

export function nodeState(campaign, node) {
  const stars = campaign[node.index] || 0;
  if (stars) return { open: true, stars };
  const prevOk = node.index === 0 || (campaign[node.index - 1] || 0) > 0;
  const zone = ZONES[node.zone];
  const gateOk = totalStars(campaign) >= zone.gate;
  return { open: prevOk && gateOk, stars: 0, gated: prevOk && !gateOk };
}
export function currentNode(campaign) {
  for (const n of NODES) if (!(campaign[n.index] > 0)) return n;
  return NODES[NODES.length - 1];
}
