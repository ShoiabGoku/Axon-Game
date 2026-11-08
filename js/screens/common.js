/* Shared chrome: the player header and the floating bottom navigation. */

import { S, levelInfo, rankOf } from '../core/store.js';
import { h, icon, ringSVG, esc } from '../core/ui.js';
import { avatarSVG } from '../core/avatars.js';
import { sfx } from '../core/audio.js';
import { go } from '../nav.js';

export function playerName() { return S.name || 'Player'; }

export function topbar({ title = null, backTo = null } = {}) {
  const li = levelInfo();
  const bar = h('div', { class: 'topbar' });
  if (title) {
    bar.innerHTML = `${backTo ? `<button class="btn btn-icon btn-ghost bk" aria-label="Back">${icon('back')}</button>` : ''}<h1 class="h-title" style="flex:1">${title}</h1>
      <button class="btn btn-icon btn-ghost st" aria-label="Settings">${icon('gear')}</button>`;
    if (backTo) bar.querySelector('.bk').addEventListener('click', () => { sfx('tap'); go(backTo); });
  } else {
    bar.innerHTML = `
      <button class="player" aria-label="Open profile">
        <div class="avatar">${ringSVG(li.frac, { size: 52, stroke: 3.5, color: 'var(--gold)' })}<div class="face">${avatarSVG(S.avatar)}</div><span class="lvl">${li.level}</span></div>
        <div class="who"><div class="nm">${esc(playerName())}</div><div class="rk">${rankOf(li.level)}</div><div class="bar"><i style="width:${(li.frac * 100).toFixed(1)}%"></i></div></div>
      </button>
      <button class="btn btn-icon btn-ghost st" aria-label="Settings">${icon('gear')}</button>`;
    bar.querySelector('.player').addEventListener('click', () => { sfx('tap'); go('profile'); });
  }
  bar.querySelector('.st').addEventListener('click', () => { sfx('tap'); go('settings'); });
  return bar;
}

export function navbar(active) {
  const items = [['home', 'home', 'Home'], ['map', 'map', 'Campaign'], ['train', 'train', 'Train'], ['profile', 'user', 'Profile']];
  const nav = h('nav', { class: 'navbar', 'aria-label': 'Main' });
  for (const [screen, ic, label] of items) {
    const b = h('button', { class: active === screen ? 'on' : '', html: `${icon(ic)}<span>${label}</span>`, 'aria-current': active === screen ? 'page' : null });
    b.addEventListener('click', () => { if (active === screen) return; sfx('tap'); go(screen); });
    nav.append(b);
  }
  return nav;
}
