/* Save data (localStorage), XP and ranks, domain ratings, achievements. */

import { updateRating, levelB } from './irt.js';
import { GAMES, ORDER } from './catalog.js';
import { NODES } from './campaign.js';

const KEY = 'axon.save.v1';

function defaults() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    v: 1, name: '', avatar: 0, created: Date.now(), xp: 0,
    settings: { sfx: 0.8, music: 0.3, haptics: true, reduced, voice: false, trainTimer: true },
    stats: { attempts: 0, correct: 0, ms: 0, bestCombo: 0, sessions: 0, levels: 0, perfect: 0, fastest: null, bestSpan: 0 },
    games: {},
    domains: {},
    campaign: {},
    daily: { streak: 0, best: 0, last: null, history: {} },
    iq: [],
    ach: {},
    seen: {},
    train: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, stats: { ...base.stats, ...(d.stats || {}) }, daily: { ...base.daily, ...(d.daily || {}) } };
  } catch { return defaults(); }
}

export const S = load();
let saveTimer = null;
export function save(now = false) {
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage full or blocked */ } };
  clearTimeout(saveTimer);
  if (now) write(); else saveTimer = setTimeout(write, 150);
}
export function resetAll() {
  localStorage.removeItem(KEY);
  Object.keys(S).forEach(k => delete S[k]);
  Object.assign(S, defaults());
  save(true);
}
export function exportSave() { return JSON.stringify(S); }
export function importSave(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 1) throw new Error('Not an AXON save');
  Object.keys(S).forEach(k => delete S[k]);
  Object.assign(S, defaults(), d);
  save(true);
}

/* ------------------------------------------------ XP and ranks */
export const xpForLevel = L => 80 * (L - 1) + 20 * (L - 1) * L;      // cumulative XP to reach level L
export function levelInfo(xp = S.xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  const a = xpForLevel(L), b = xpForLevel(L + 1);
  return { level: L, into: xp - a, need: b - a, frac: (xp - a) / (b - a) };
}
export const RANKS = [
  [1, 'Spark'], [3, 'Signal'], [6, 'Pulse'], [10, 'Circuit'], [15, 'Network'],
  [21, 'Cortex'], [28, 'Oracle'], [36, 'Savant'], [45, 'Polymath'], [55, 'Singularity'],
];
export function rankOf(level) { let r = RANKS[0][1]; for (const [L, n] of RANKS) if (level >= L) r = n; return r; }
export function addXP(n) {
  const before = levelInfo().level;
  S.xp += Math.max(0, Math.round(n));
  const after = levelInfo().level;
  save();
  return { gained: Math.round(n), levelUp: after > before, from: before, to: after, rankUp: rankOf(after) !== rankOf(before) };
}

/* ------------------------------------------------ recording results */
export function gameStats(id) {
  return (S.games[id] = S.games[id] || { attempts: 0, correct: 0, ms: 0, best: 0, plays: 0 });
}
export function recordItem({ game, level, correct, ms, score = correct ? 1 : 0, guess = 0, rated = true }) {
  const g = gameStats(game);
  g.attempts++; S.stats.attempts++;
  if (correct) { g.correct++; S.stats.correct++; }
  g.ms += ms; S.stats.ms += ms;
  if (correct && level > g.best) g.best = level;
  if (rated) {
    const d = GAMES[game].meta.domain;
    S.domains[d] = updateRating(S.domains[d] || { theta: 0, n: 0 }, levelB(level), GAMES[game].meta.kind === 'sprint' ? score : correct ? 1 : 0, guess);
  }
  if (correct && GAMES[game].meta.kind === 'trial' && !GAMES[game].meta.selfTimed && level >= 3) {
    if (S.stats.fastest === null || ms < S.stats.fastest) S.stats.fastest = ms;
  }
  save();
}
export const domainIndex = d => Math.round(100 + 15 * ((S.domains[d] && S.domains[d].theta) || 0));
export const domainCount = d => (S.domains[d] && S.domains[d].n) || 0;

export function todayKey(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function recordDaily(score) {
  const k = todayKey();
  const first = !(k in S.daily.history);
  if (first) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.daily.streak = S.daily.last === todayKey(y) ? S.daily.streak + 1 : 1;
    S.daily.last = k;
    S.daily.history[k] = score;
  } else S.daily.history[k] = Math.max(S.daily.history[k], score);
  S.daily.best = Math.max(S.daily.best, score);
  save();
  return first;
}
export function dailyStreakAlive() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return S.daily.last === todayKey() || S.daily.last === todayKey(y) ? S.daily.streak : 0;
}

/* ------------------------------------------------ achievements */
const solvedIn = d => ORDER.filter(id => GAMES[id].meta.domain === d).reduce((s, id) => s + ((S.games[id] && S.games[id].correct) || 0), 0);
export const ACH = [
  { id: 'first', name: 'First Spark', desc: 'Solve your first puzzle.', icon: 'sparkles', test: () => S.stats.correct >= 1 },
  { id: 'combo5', name: 'Chain Reaction', desc: 'Reach a 5× combo.', icon: 'bolt', test: () => S.stats.bestCombo >= 5 },
  { id: 'combo10', name: 'Overclocked', desc: 'Reach a 10× combo.', icon: 'bolt', test: () => S.stats.bestCombo >= 10 },
  { id: 'perfect', name: 'Flawless', desc: 'Finish a level with 3 stars.', icon: 'star', test: () => S.stats.perfect >= 1 },
  { id: 'perfect10', name: 'Perfectionist', desc: 'Earn 3 stars on 10 levels.', icon: 'crown', test: () => S.stats.perfect >= 10 },
  { id: 'fast', name: 'Lightning Mind', desc: 'Solve a level 3+ reasoning puzzle in under 6 seconds.', icon: 'bolt', test: () => S.stats.fastest !== null && S.stats.fastest < 6000 },
  { id: 'logic50', name: 'Logician', desc: 'Solve 50 logic puzzles.', icon: 'verdict', test: () => solvedIn('logic') >= 50 },
  { id: 'pattern50', name: 'Pattern Seeker', desc: 'Solve 50 pattern puzzles.', icon: 'matrix', test: () => solvedIn('pattern') >= 50 },
  { id: 'numeric50', name: 'Number Cruncher', desc: 'Solve 50 numeric puzzles.', icon: 'symbols', test: () => solvedIn('numeric') >= 50 },
  { id: 'spatial50', name: 'Shape Shifter', desc: 'Solve 50 spatial puzzles.', icon: 'cube', test: () => solvedIn('spatial') >= 50 },
  { id: 'span8', name: 'Elephant', desc: 'Recall a sequence of 8 or more.', icon: 'corsi', test: () => S.stats.bestSpan >= 8 },
  { id: 'matrix10', name: 'Matrix Master', desc: 'Solve a level 10 matrix.', icon: 'matrix', test: () => (S.games.matrix && S.games.matrix.best >= 10) },
  { id: 'truth5', name: 'Lie Detector', desc: 'Solve a 5-robot Truth & Lies puzzle.', icon: 'robot', test: () => (S.games.truth && S.games.truth.best >= 9) },
  { id: 'lock4', name: 'Safecracker', desc: 'Crack a 4-digit lock.', icon: 'lock', test: () => (S.games.codelock && S.games.codelock.best >= 6) },
  { id: 'cube8', name: 'Origami Brain', desc: 'Solve a level 8 Cube Fold.', icon: 'cube', test: () => (S.games.cubefold && S.games.cubefold.best >= 8) },
  { id: 'all', name: 'Explorer', desc: 'Play every one of the 15 games.', icon: 'map', test: () => ORDER.every(id => S.games[id] && S.games[id].attempts > 0) },
  { id: 'poly', name: 'Polymath', desc: 'Clear level 5 in every game.', icon: 'medal', test: () => ORDER.every(id => S.games[id] && S.games[id].best >= 5) },
  { id: 'daily3', name: 'Habit Forming', desc: 'Keep a 3-day daily streak.', icon: 'flame', test: () => S.daily.streak >= 3 },
  { id: 'daily7', name: 'On Fire', desc: 'Keep a 7-day daily streak.', icon: 'flame', test: () => S.daily.streak >= 7 },
  { id: 'daily30', name: 'Unstoppable', desc: 'Keep a 30-day daily streak.', icon: 'flame', test: () => S.daily.streak >= 30 },
  { id: 'iq', name: 'Measured', desc: 'Complete an IQ test.', icon: 'brain', test: () => S.iq.length >= 1 },
  { id: 'iq120', name: 'Bright Spark', desc: 'Score 120+ on an IQ test.', icon: 'brain', test: () => S.iq.some(r => r.iq >= 120) },
  { id: 'iq135', name: 'Luminary', desc: 'Score 135+ on an IQ test.', icon: 'crown', test: () => S.iq.some(r => r.iq >= 135) },
  { id: 'zone1', name: 'Awakened', desc: 'Clear every node in zone 1.', icon: 'map', test: () => NODES.filter(n => n.zone === 0).every(n => S.campaign[n.index] > 0) },
  { id: 'zone6', name: 'Singularity', desc: 'Clear the whole campaign.', icon: 'trophy', test: () => NODES.every(n => S.campaign[n.index] > 0) },
  { id: 'c100', name: 'Centurion', desc: 'Solve 100 puzzles.', icon: 'target', test: () => S.stats.correct >= 100 },
  { id: 'c1000', name: 'Thousand Minds', desc: 'Solve 1,000 puzzles.', icon: 'trophy', test: () => S.stats.correct >= 1000 },
  { id: 'owl', name: 'Night Owl', desc: 'Solve a puzzle between midnight and 4 am.', icon: 'eye', test: () => { const h = new Date().getHours(); return h < 4 && S.stats.correct > 0; } },
];
export function checkAchievements() {
  const fresh = [];
  for (const a of ACH) {
    if (S.ach[a.id]) continue;
    let pass = false;
    try { pass = !!a.test(); } catch { pass = false; }
    if (pass) { S.ach[a.id] = Date.now(); fresh.push(a); }
  }
  if (fresh.length) save();
  return fresh;
}
