/* DAILY CHALLENGE — eight seeded puzzles, the same for everyone on a given date. */

import { S, todayKey, dailyStreakAlive } from '../core/store.js';
import { GAMES, DOMAINS } from '../core/catalog.js';
import { h, icon } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { topbar } from './common.js';
import { startDaily, dailyItems } from './launch.js';

export function dailyScreen() {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll no-nav' });
  const wrap = h('div', { class: 'wrap narrow' });
  scroll.append(wrap); el.append(scroll);
  wrap.append(topbar({ title: 'Daily Challenge', backTo: 'home' }));
  const k = todayKey();
  const done = k in S.daily.history;
  const items = dailyItems(k);
  const streak = dailyStreakAlive();
  const card = h('div', { class: 'card glow', style: '--c1:#ff8a3d;--c2:#ff5fa8' });
  card.innerHTML = `
    <div class="streak-big">${icon('flame')}<div><b>${streak}</b><span class="muted">day streak · best score ${S.daily.best.toLocaleString()}</span></div></div>
    <div class="h-sec">Today · ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <div class="games-grid" style="grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px">${items.map((it, i) => {
      const G = GAMES[it.game], D = DOMAINS[G.meta.domain];
      return `<div class="gcard" style="--gc:${D.color};cursor:default"><div class="g-ic" style="width:40px;height:40px">${icon(G.meta.icon)}</div><div class="g-tx"><b style="font-size:13.5px">${i + 1}. ${G.meta.name}</b><span>Level ${it.level}</span></div></div>`;
    }).join('')}</div>
    <p class="muted" style="font-size:13px;margin:14px 0">${done ? `Today's score: <b style="color:var(--gold)">${S.daily.history[k].toLocaleString()}</b>. Replays can only raise it — your streak is safe.` : 'Finish all eight to extend your streak. Speed and combos boost your score.'}</p>
    <button class="btn ${done ? '' : 'btn-gold'} btn-lg btn-block go">${icon('play')} ${done ? 'Play again' : 'Start today’s challenge'}</button>`;
  card.querySelector('.go').addEventListener('click', () => { sfx('select'); startDaily(); });
  wrap.append(card);

  // calendar for the current month
  wrap.append(h('div', { class: 'h-sec', html: 'This month' }));
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  let cal = '<div class="cal">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="dh">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cal += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const key = todayKey(new Date(now.getFullYear(), now.getMonth(), d));
    cal += `<div class="dd ${key in S.daily.history ? 'done' : ''} ${d === now.getDate() ? 'today' : ''}">${d}</div>`;
  }
  cal += '</div>';
  wrap.append(h('div', { class: 'card', html: cal }));
  return { el };
}
