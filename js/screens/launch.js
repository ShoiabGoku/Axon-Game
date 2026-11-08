/* Builders that turn a mode choice into a play-session config. */

import { NODES, nodeItems, ZONES } from '../core/campaign.js';
import { GAMES } from '../core/catalog.js';
import { makeRng } from '../core/rng.js';
import { todayKey } from '../core/store.js';
import { IQ_FULL, IQ_QUICK, pickIQ } from '../core/cat.js';
import { go } from '../nav.js';

export function startNode(index) {
  const node = NODES[index], z = ZONES[node.zone];
  const items = nodeItems(node);
  go('play', {
    mode: 'campaign', node: index, items, hearts: items.length > 1 ? 3 : null, timed: true,
    title: node.boss ? 'The Gauntlet' : GAMES[node.game].meta.title,
    kicker: `${z.name} · ${node.boss ? 'Boss' : 'Node ' + ((index % 10) + 1)}`, quitTo: 'map',
  });
}

export function trainingCount(id) {
  const G = GAMES[id];
  return G.meta.kind === 'sprint' ? 1 : G.meta.domain === 'memory' ? 8 : 10;
}
export function startTraining(gameId, { level = 1, adaptive = true, timed = true } = {}) {
  const G = GAMES[gameId];
  const count = trainingCount(gameId);
  go('play', {
    mode: 'training', gameId, train: { level, adaptive, timed }, levelStart: level, adaptive, timed, count,
    title: G.meta.title, kicker: adaptive ? 'Adaptive training' : `Training · Level ${level}`, quitTo: 'train',
    next: st => (st.i >= count ? null : { game: gameId, level: adaptive ? st.level : level }),
  });
}

export function dailyItems(key = todayKey()) {
  const rng = makeRng('axon-daily-' + key);
  const pool = rng.shuffle(['matrix', 'sequence', 'oddone', 'syllogism', 'truth', 'lineup', 'codelock', 'symbols', 'balance', 'rotation', 'cubefold', 'corsi', 'digitspan']);
  const levels = [3, 4, 4, 5, 5, 6, 7, 8];
  return pool.slice(0, 8).map((g, i) => ({ game: g, level: levels[i], seed: `axon-daily-${key}-${i}` }));
}
export function startDaily() {
  const k = todayKey();
  go('play', { mode: 'daily', items: dailyItems(k), timed: true, title: 'Daily Challenge', kicker: k, quitTo: 'daily' });
}

/* ------------------------------------------------ IQ test (computerised adaptive test, see core/cat.js) */
export { IQ_FULL, IQ_QUICK };
export function startIQ(kind = 'quick') {
  const bp = kind === 'full' ? IQ_FULL : IQ_QUICK;
  go('play', {
    mode: 'iq', feedback: 'none', timed: true, count: bp.length,
    title: kind === 'full' ? 'Full IQ Test' : 'Quick IQ Test', kicker: `${bp.length} questions · adaptive`, quitTo: 'iq',
    next: st => pickIQ(st, bp),
    onFinish: summary => go('iqResult', { summary, kind }, { replace: true }),
  });
}
