/* TRAINING — every game, grouped by cognitive domain, with level choice or adaptive difficulty. */

import { S, gameStats, domainIndex, domainCount, save } from '../core/store.js';
import { GAMES, DOMAINS, DOMAIN_ORDER, gamesIn } from '../core/catalog.js';
import { h, icon, modal } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { topbar, navbar } from './common.js';
import { startTraining, trainingCount } from './launch.js';

export function trainScreen(params = {}) {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll' });
  const wrap = h('div', { class: 'wrap' });
  scroll.append(wrap);
  el.append(scroll, navbar('train'));
  wrap.append(topbar({ title: 'Training' }));
  wrap.append(h('p', { class: 'muted', style: 'margin:-6px 2px 4px', html: 'Fifteen trials across six abilities. Adaptive mode raises the level after two right answers in a row and lowers it after a miss.' }));

  for (const d of DOMAIN_ORDER) {
    const D = DOMAINS[d];
    const sec = h('section', { class: 'train-dom', id: 'dom-' + d, style: `--dc:${D.color}` });
    sec.innerHTML = `<h3>${icon(D.icon)} ${D.long}<small>${domainCount(d) >= 3 ? `Index ${domainIndex(d)}` : D.desc}</small></h3>`;
    const grid = h('div', { class: 'games-grid' });
    for (const id of gamesIn(d)) {
      const G = GAMES[id], gs = gameStats(id);
      const card = h('button', { class: 'gcard', style: `--gc:${D.color}`, 'aria-label': `${G.meta.title}, best level ${gs.best}` });
      card.innerHTML = `<div class="g-ic">${icon(G.meta.icon)}</div><div class="g-tx"><b>${G.meta.title}</b><span>${G.meta.tagline}</span>
        <div class="mast">${Array.from({ length: 10 }, (_, k) => `<i class="${k < gs.best ? 'on' : ''}"></i>`).join('')}</div></div>`;
      card.addEventListener('click', () => { sfx('select'); setup(id); });
      grid.append(card);
    }
    sec.append(grid);
    wrap.append(sec);
  }

  async function setup(id) {
    const G = GAMES[id], D = DOMAINS[G.meta.domain], gs = gameStats(id);
    const pref = S.train[id] || { level: Math.max(1, Math.min(10, gs.best || 1)), adaptive: true, timed: S.settings.trainTimer };
    let level = pref.level, adaptive = pref.adaptive, timed = pref.timed;
    const box = h('div', { class: 'gsheet', style: `--gc:${D.color}` });
    const acc = gs.attempts ? Math.round((gs.correct / gs.attempts) * 100) + '%' : '—';
    box.innerHTML = `
      <div class="gs-head"><div class="g-ic">${icon(G.meta.icon)}</div><div><span class="chip" style="color:${D.color}">${icon(D.icon)} ${D.long}</span><h2 style="margin-top:6px">${G.meta.title}</h2></div></div>
      <ol class="howto">${G.meta.howTo.map(t => `<li>${t}</li>`).join('')}</ol>
      <div class="row-label">Mode</div>
      <div class="seg mode-seg"><button data-v="1">${icon('sparkles')} Adaptive</button><button data-v="0">Fixed level</button></div>
      <div class="row-label">${adaptive ? 'Starting level' : 'Level'}</div>
      <div class="lv-pick">${Array.from({ length: 10 }, (_, k) => `<button data-l="${k + 1}" class="${k < gs.best ? 'done' : ''}">${k + 1}</button>`).join('')}</div>
      ${G.meta.kind === 'trial' && !G.meta.selfTimed ? `<div class="row-label">Clock</div><div class="seg time-seg"><button data-v="1">${icon('timer')} Timed</button><button data-v="0">Relaxed</button></div>` : ''}
      <div class="stat-mini"><div><b>${gs.best || '—'}</b><span>best level</span></div><div><b>${acc}</b><span>accuracy</span></div><div><b>${gs.attempts}</b><span>played</span></div></div>
      <p class="muted" style="margin:12px 0 0;font-size:12.5px">${trainingCount(id) === 1 ? 'One timed sprint.' : `${trainingCount(id)} puzzles per session.`}</p>`;
    const paint = () => {
      box.querySelectorAll('.mode-seg button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === adaptive));
      box.querySelectorAll('.time-seg button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === timed));
      box.querySelectorAll('.lv-pick button').forEach(b => b.classList.toggle('on', +b.dataset.l === level));
      const lab = box.querySelectorAll('.row-label')[1];
      if (lab) lab.textContent = adaptive ? 'Starting level' : 'Level';
    };
    box.querySelectorAll('.mode-seg button').forEach(b => b.addEventListener('click', () => { adaptive = b.dataset.v === '1'; sfx('tap'); paint(); }));
    box.querySelectorAll('.time-seg button').forEach(b => b.addEventListener('click', () => { timed = b.dataset.v === '1'; sfx('tap'); paint(); }));
    box.querySelectorAll('.lv-pick button').forEach(b => b.addEventListener('click', () => { level = +b.dataset.l; sfx('tap'); paint(); }));
    paint();
    const v = await modal({ title: '', body: box, actions: [{ label: 'Close', value: null, cls: 'btn-ghost' }, { label: `${icon('play')} Start`, value: 'go', cls: 'btn-primary' }], cls: 'wide' });
    if (v === 'go') {
      S.train[id] = { level, adaptive, timed };
      S.seen[id] = true;
      save();
      startTraining(id, { level, adaptive, timed });
    }
  }

  return {
    el,
    enter() {
      if (params.domain) { const s = el.querySelector('#dom-' + params.domain); if (s) scroll.scrollTop = s.offsetTop - 10; }
    },
  };
}
