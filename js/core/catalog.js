/* The game catalogue: every puzzle module, grouped into six cognitive domains. */

import * as matrix from '../games/matrix.js';
import * as sequence from '../games/sequence.js';
import * as oddone from '../games/oddone.js';
import * as syllogism from '../games/syllogism.js';
import * as truth from '../games/truth.js';
import * as lineup from '../games/lineup.js';
import * as codelock from '../games/codelock.js';
import * as symbols from '../games/symbols.js';
import * as balance from '../games/balance.js';
import * as rotation from '../games/rotation.js';
import * as cubefold from '../games/cubefold.js';
import * as corsi from '../games/corsi.js';
import * as digitspan from '../games/digitspan.js';
import * as stroop from '../games/stroop.js';
import * as compare from '../games/compare.js';

export const GAMES = { matrix, sequence, oddone, syllogism, truth, lineup, codelock, symbols, balance, rotation, cubefold, corsi, digitspan, stroop, compare };
export const ORDER = Object.keys(GAMES);

export const DOMAINS = {
  pattern: { name: 'Pattern', long: 'Pattern Reasoning', color: '#38e1ff', icon: 'matrix', desc: 'Fluid intelligence — spotting the rule behind shapes and numbers.' },
  logic: { name: 'Logic', long: 'Deductive Logic', color: '#9d7bff', icon: 'verdict', desc: 'Reasoning step by step to conclusions that must be true.' },
  numeric: { name: 'Numeric', long: 'Quantitative Reasoning', color: '#ffc54d', icon: 'symbols', desc: 'Working with unknowns, ratios and equations.' },
  spatial: { name: 'Spatial', long: 'Spatial Reasoning', color: '#4cf3a3', icon: 'cube', desc: 'Rotating and folding objects in your mind.' },
  memory: { name: 'Memory', long: 'Working Memory', color: '#ff5fa8', icon: 'corsi', desc: 'Holding and manipulating information in mind.' },
  speed: { name: 'Speed', long: 'Processing Speed', color: '#ff8a3d', icon: 'bolt', desc: 'Fast, accurate decisions under pressure.' },
};
export const DOMAIN_ORDER = Object.keys(DOMAINS);

export const game = id => GAMES[id];
export const domainOf = id => GAMES[id].meta.domain;
export const colorOf = id => DOMAINS[domainOf(id)].color;
export const gamesIn = d => ORDER.filter(id => GAMES[id].meta.domain === d);
export const REASONING = ORDER.filter(id => GAMES[id].meta.kind === 'trial' && !['corsi', 'digitspan'].includes(id));
/** index of the correct option for choice-based games (some store the answer as a label) */
export const answerIndex = (id, p) => (GAMES[id].answerIndex ? GAMES[id].answerIndex(p) : p.answer);
