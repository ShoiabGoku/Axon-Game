/* TITLE — the attract screen. The first tap also unlocks audio (browsers require a gesture). */

import { S, save } from '../core/store.js';
import { unlockAudio, sfx, buzz } from '../core/audio.js';
import { h, icon, modal, esc } from '../core/ui.js';
import { avatarSVG, AVATAR_COUNT } from '../core/avatars.js';
import * as fx from '../core/fx.js';
import { go } from '../nav.js';

export function titleScreen() {
  const el = h('div', { class: 'screen title-screen', role: 'button', tabindex: '0', 'aria-label': 'Tap to begin' });
  el.innerHTML = `<div class="logo">AXON</div><div class="tagline">NEURAL&nbsp;TRIALS</div>
    <div class="tap-start">Tap to begin</div>
    <div class="title-foot">Reasoning · Logic · Numbers · Space · Memory · Speed</div>`;
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    unlockAudio();
    sfx('levelup'); buzz('good');
    fx.fire('#38e1ff', 14); fx.fire('#9d7bff', 10);
    el.querySelector('.tap-start').textContent = 'Initialising…';
    if (!S.name) await onboarding();
    go('home', {}, { replace: true });
  };
  el.addEventListener('click', start);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') start(); });
  return { el, enter() { el.focus({ preventScroll: true }); } };
}

async function onboarding() {
  let av = Math.floor(Math.random() * AVATAR_COUNT);
  const box = h('div');
  box.innerHTML = `<p style="margin-top:0">Fifteen trials of reasoning, logic, numbers, space, memory and speed — every puzzle freshly generated and checked to have exactly one answer.</p>
    <label class="row-label" style="display:block">What should we call you?</label>
    <input class="field" maxlength="18" placeholder="Your name" value="${esc(S.name)}">
    <div class="row-label">Pick your core</div>
    <div class="avatars">${Array.from({ length: AVATAR_COUNT }, (_, i) => `<button data-a="${i}" class="${i === av ? 'on' : ''}" aria-label="Avatar ${i + 1}">${avatarSVG(i)}</button>`).join('')}</div>`;
  box.querySelectorAll('.avatars button').forEach(b => b.addEventListener('click', () => { av = +b.dataset.a; box.querySelectorAll('.avatars button').forEach(x => x.classList.toggle('on', x === b)); sfx('tap'); }));
  setTimeout(() => box.querySelector('input').focus(), 120);
  box.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') box.closest('.modal').querySelector('.btn-primary').click(); });
  await modal({ title: `${icon('sparkles')} Welcome to AXON`, body: box, actions: [{ label: `Begin ${icon('next')}`, value: 1, cls: 'btn-primary' }], dismiss: false });
  S.name = box.querySelector('input').value.trim().slice(0, 18) || 'Player';
  S.avatar = av;
  save(true);
}
