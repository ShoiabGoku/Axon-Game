/* RESULT — stars, XP, achievements and next steps after a campaign node, training or daily run. */

import { S, addXP, checkAchievements, levelInfo, rankOf, recordDaily, save, dailyStreakAlive } from '../core/store.js';
import { NODES, nodeState, ZONES } from '../core/campaign.js';
import { GAMES } from '../core/catalog.js';
import { h, icon, countUp, fmtTime, toast } from '../core/ui.js';
import { sfx, buzz } from '../core/audio.js';
import * as fx from '../core/fx.js';
import { go } from '../nav.js';
import { startNode, startTraining, startDaily } from './launch.js';

export function computeStars(summary) {
  const R = summary.results;
  const correct = R.filter(r => r.correct).length;
  const sprint = R.length === 1 && GAMES[R[0].game].meta.kind === 'sprint';
  let stars = 0;
  if (summary.mode === 'campaign') {
    if (sprint) { const a = R[0].acc ?? 0; stars = a >= 0.95 ? 3 : a >= 0.85 ? 2 : a >= 0.75 ? 1 : 0; }
    else if (!summary.outOfHearts && R.length >= summary.total) stars = Math.max(1, 3 - (summary.total - correct));
  } else if (summary.mode === 'training') {
    const a = sprint ? (R[0].acc ?? 0) : correct / Math.max(1, R.length);
    stars = a >= 0.9 ? 3 : a >= 0.7 ? 2 : a >= 0.5 ? 1 : 0;
  } else if (summary.mode === 'daily') {
    stars = correct >= R.length - 1 ? 3 : correct >= R.length * 0.6 ? 2 : correct > 0 ? 1 : 0;
  }
  return { stars, correct, sprint };
}

export function resultScreen({ summary }) {
  const { stars, correct, sprint } = computeStars(summary);
  const passed = summary.mode === 'daily' || stars > 0;
  const before = levelInfo();

  // apply rewards exactly once per finished session
  const key = 'axon-applied-' + summary.results.map(r => r.ms.toFixed(0)).join('.') + '-' + summary.points;
  let reward = null, ach = [], dailyFirst = false;
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1');
    let bonus = 0;
    if (summary.mode === 'campaign') {
      const n = summary.node;
      if (stars > (S.campaign[n] || 0)) S.campaign[n] = stars;
      bonus = passed ? 25 + stars * 15 : 0;
    } else if (summary.mode === 'training') bonus = stars * 10;
    else if (summary.mode === 'daily') { dailyFirst = recordDaily(summary.points); bonus = dailyFirst ? 60 : 10; }
    if (passed) S.stats.levels++;
    if (stars === 3) S.stats.perfect++;
    S.stats.sessions++;
    save();
    reward = addXP(summary.xp + bonus);
    reward.bonus = bonus;
    ach = checkAchievements();
  }
  const after = levelInfo();

  const titles = {
    campaign: passed ? (summary.node !== null && NODES[summary.node].boss ? 'BOSS DEFEATED' : 'LEVEL CLEAR') : 'OUT OF HEARTS',
    training: 'SESSION COMPLETE', daily: 'DAILY COMPLETE',
  };
  let sub = '';
  if (summary.mode === 'campaign') { const n = NODES[summary.node]; sub = `${ZONES[n.zone].name} · ${n.boss ? 'The Gauntlet' : GAMES[n.game].meta.title + ' · Lv ' + n.level}`; }
  else if (summary.mode === 'training') sub = `${GAMES[summary.gameId].meta.title}${summary.train && summary.train.adaptive ? ' · adaptive' : ''}`;
  else sub = `Streak ${dailyStreakAlive()} 🔥`;

  const el = h('div', { class: 'screen result' });
  const nextNode = summary.mode === 'campaign' && passed && summary.node + 1 < NODES.length ? NODES[summary.node + 1] : null;
  const nextOpen = nextNode && nodeState(S.campaign, nextNode).open;
  const maxLv = R => Math.max(...R.map(r => r.level));
  el.innerHTML = `<div class="scroll no-nav"><div class="wrap narrow">
    <div class="res-title ${passed ? 'win' : 'lose'}">${titles[summary.mode]}</div>
    <div class="res-sub">${sub}</div>
    <div class="res-stars">${[0, 1, 2].map(() => `<span class="st">${icon('star')}</span>`).join('')}</div>
    <div class="res-grid">
      <div><b>${sprint ? Math.round((summary.results[0].acc || 0) * 100) + '%' : `${correct}/${summary.results.length}`}</b><span>${sprint ? 'accuracy' : 'correct'}</span></div>
      <div><b>${fmtTime(summary.timeMs)}</b><span>time</span></div>
      <div><b>×${summary.bestCombo}</b><span>best combo</span></div>
      <div><b class="pts">0</b><span>points</span></div>
    </div>
    ${reward ? `<div class="card xp-box"><div class="xp-top"><span>Level ${after.level} · ${rankOf(after.level)}</span><b>+${reward.gained} XP</b></div><div class="bar"><i style="width:${(before.level === after.level ? before.frac : 0) * 100}%"></i></div>${reward.bonus ? `<p class="muted" style="margin:8px 0 0;font-size:12.5px">Includes +${reward.bonus} XP ${summary.mode === 'daily' ? 'daily' : 'completion'} bonus</p>` : ''}</div>` : ''}
    ${ach.length ? `<div class="ach-new">${ach.map(a => `<div class="ach-row">${icon(a.icon)}<div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}</div>` : ''}
    ${!sprint ? `<div class="res-items">${summary.results.map((r, i) => `<div class="res-item"><span class="${r.correct ? 'ok' : 'no'}">${icon(r.correct ? 'check' : 'x')}</span><span>${i + 1}. ${GAMES[r.game].meta.name}</span><span class="badge-lv">LV ${r.level}</span><span class="sp"></span><span class="muted">${r.timedOut ? 'time out' : fmtTime(r.ms)}</span></div>`).join('')}</div>` : ''}
    <div class="res-actions btn-row"></div>
  </div></div>`;
  const actions = el.querySelector('.res-actions');
  const btn = (label, cls, fn) => { const b = h('button', { class: `btn btn-lg ${cls}`, html: label }); b.addEventListener('click', fn); actions.append(b); return b; };
  if (summary.mode === 'campaign') {
    btn(`${icon('refresh')} Retry`, '', () => startNode(summary.node));
    if (nextOpen) btn(`Next ${icon('next')}`, 'btn-primary', () => startNode(summary.node + 1));
    btn(`${icon('map')} Map`, nextOpen ? 'btn-ghost' : 'btn-primary', () => go('map', {}, { replace: true }));
  } else if (summary.mode === 'training') {
    const tr = summary.train || {};
    const lvl = tr.adaptive ? Math.max(1, Math.min(10, maxLv(summary.results))) : tr.level;
    btn(`${icon('refresh')} Again`, 'btn-primary', () => startTraining(summary.gameId, { ...tr, level: lvl }));
    btn(`${icon('train')} Games`, '', () => go('train', {}, { replace: true }));
  } else {
    btn(`${icon('home')} Home`, 'btn-primary', () => go('home', {}, { replace: true }));
    btn(`${icon('calendar')} Calendar`, '', () => go('daily', {}, { replace: true }));
  }

  return {
    el,
    enter() {
      countUp(el.querySelector('.pts'), summary.points, { ms: 1100 });
      const st = [...el.querySelectorAll('.res-stars .st')];
      st.forEach((s, i) => setTimeout(() => {
        if (i < stars) { s.classList.add('on'); sfx('star' + i); buzz('tap'); fx.burstAt(s, '#ffc54d', 22); }
      }, 450 + i * 380));
      setTimeout(() => {
        if (passed) sfx('levelup'); else sfx('lose');
        if (stars === 3) fx.confetti();
        const bar = el.querySelector('.xp-box .bar i');
        if (bar) bar.style.width = (after.frac * 100) + '%';
      }, 450 + 3 * 380);
      ach.forEach((a, i) => setTimeout(() => { sfx('achieve'); toast(`<b>Achievement unlocked</b><small>${a.name} — ${a.desc}</small>`, { tone: 'gold', iconName: a.icon, ms: 3600 }); }, 1900 + i * 900));
      if (reward && reward.levelUp) setTimeout(() => levelUpTakeover(after.level), 2200);
    },
  };
}

export function levelUpTakeover(level) {
  const ov = h('div', { class: 'levelup', role: 'dialog', 'aria-label': 'Level up' });
  ov.innerHTML = `<div class="lu-in"><small>LEVEL UP</small><div class="big">${level}</div><div class="rank">${rankOf(level).toUpperCase()}</div><p class="muted" style="margin-top:22px">Tap to continue</p></div>`;
  document.body.append(ov);
  sfx('levelup'); buzz('win'); fx.confetti(180);
  const close = () => { ov.style.opacity = '0'; ov.style.transition = 'opacity .3s'; setTimeout(() => ov.remove(), 300); };
  ov.addEventListener('click', close);
  setTimeout(close, 4200);
}
