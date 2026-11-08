/* HOME — the hub: campaign, IQ test, daily challenge, training, profile, neural profile. */

import { S, domainIndex, domainCount, dailyStreakAlive, todayKey, ACH } from '../core/store.js';
import { NODES, ZONES, currentNode, totalStars } from '../core/campaign.js';
import { GAMES, DOMAINS, DOMAIN_ORDER } from '../core/catalog.js';
import { h, icon, modal } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { canInstall, promptInstall, isIOS, isStandalone, onInstallChange } from '../core/pwa.js';
import { go } from '../nav.js';
import { topbar, navbar } from './common.js';
import { startNode } from './launch.js';

export function homeScreen() {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll' });
  const wrap = h('div', { class: 'wrap' });
  scroll.append(wrap);
  el.append(scroll, navbar('home'));
  wrap.append(topbar());

  const node = currentNode(S.campaign);
  const zone = ZONES[node.zone];
  const allDone = NODES.every(n => S.campaign[n.index] > 0);
  const stars = totalStars(S.campaign);
  const lastIQ = S.iq.length ? S.iq[S.iq.length - 1] : null;
  const doneToday = todayKey() in S.daily.history;
  const streak = dailyStreakAlive();
  const achCount = Object.keys(S.ach).length;

  const hero = h('div', { class: 'hero' });
  hero.innerHTML = `
    <button class="mode big camp" style="--mc:${zone.color}">
      <div>
        <div class="m-ic">${icon('map')}</div>
        <div class="chip" style="margin-top:14px;color:${zone.color}">CAMPAIGN · ZONE ${node.zone + 1} OF 6</div>
        <h3>${allDone ? 'Campaign complete!' : zone.name}</h3>
        <p>${allDone ? 'Every node cleared. Go back for three stars everywhere.' : `${zone.sub}. Next up: <b style="color:var(--text)">${node.boss ? 'The Gauntlet' : GAMES[node.game].meta.title}</b> · level ${node.level}.`}</p>
      </div>
      <div class="m-foot"><span class="m-stat">${icon('star')} ${stars} / ${NODES.length * 3} stars</span><span class="go">${icon('play')}</span></div>
    </button>
    <button class="mode iq" style="--mc:#9d7bff">
      <div class="m-ic">${icon('brain')}</div>
      <h3>IQ Test</h3>
      <p>Adaptive assessment across reasoning, logic, numbers, space and memory.</p>
      <div class="m-foot"><span class="m-stat">${lastIQ ? `${icon('chart')} Last score ${lastIQ.iq}` : `${icon('sparkles')} Find your score`}</span><span class="go">${icon('next')}</span></div>
    </button>
    <button class="mode daily" style="--mc:#ff8a3d">
      <div class="m-ic">${icon('calendar')}</div>
      <h3>Daily Challenge</h3>
      <p>${doneToday ? 'Done for today — come back tomorrow for a fresh set.' : '8 fresh puzzles. The same set for everyone today.'}</p>
      <div class="m-foot"><span class="m-stat">${icon('flame')} ${streak} day streak</span><span class="go">${icon(doneToday ? 'check' : 'next')}</span></div>
    </button>`;
  hero.querySelector('.camp').addEventListener('click', () => { sfx('select'); if (allDone) go('map'); else startNode(node.index); });
  hero.querySelector('.iq').addEventListener('click', () => { sfx('select'); go('iq'); });
  hero.querySelector('.daily').addEventListener('click', () => { sfx('select'); go('daily'); });
  wrap.append(hero);

  const row = h('div', { class: 'modes-row' });
  row.innerHTML = `
    <button class="mode tr" style="--mc:#4cf3a3"><div class="m-ic">${icon('train')}</div><h3>Training</h3><p>All 15 trials. Pick a level or let it adapt.</p></button>
    <button class="mode pf" style="--mc:#ff5fa8"><div class="m-ic">${icon('trophy')}</div><h3>Trophies</h3><p>${achCount} of ${ACH.length} achievements unlocked.</p></button>`;
  row.querySelector('.tr').addEventListener('click', () => { sfx('select'); go('train'); });
  row.querySelector('.pf').addEventListener('click', () => { sfx('select'); go('profile'); });
  wrap.append(row);

  wrap.append(h('div', { class: 'h-sec', html: 'Neural profile' }));
  const strip = h('div', { class: 'domain-strip' });
  for (const d of DOMAIN_ORDER) {
    const D = DOMAINS[d];
    const n = domainCount(d);
    const b = h('button', { class: 'dom-chip', style: `--dc:${D.color}`, 'aria-label': `${D.long}: ${n >= 3 ? domainIndex(d) : 'not rated yet'}`, html: `${icon(D.icon)}<b>${n >= 3 ? domainIndex(d) : '—'}</b><span>${D.name}</span>` });
    b.addEventListener('click', () => { sfx('tap'); go('train', { domain: d }); });
    strip.append(b);
  }
  wrap.append(strip);

  const installBox = h('div');
  const paintInstall = () => {
    installBox.innerHTML = '';
    if (isStandalone()) return;
    if (canInstall() || isIOS()) {
      const card = h('div', { class: 'card install-cta glow' });
      card.innerHTML = `<div class="m-ic" style="--mc:var(--cyan);width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(56,225,255,.14);color:var(--cyan)">${icon('install')}</div>
        <div class="txt"><b>Install AXON</b>Play full-screen and offline, straight from your home screen.</div>
        <button class="btn btn-primary btn-sm">Install</button>`;
      card.querySelector('button').addEventListener('click', async () => {
        if (canInstall()) await promptInstall();
        else modal({ title: 'Install on iPhone / iPad', body: '<ol><li>Tap the <b>Share</b> button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open AXON from your home screen — it runs full-screen and offline.</li></ol>', actions: [{ label: 'Got it', value: 1, cls: 'btn-primary' }] });
      });
      installBox.append(card);
    }
  };
  paintInstall();
  const off = onInstallChange(paintInstall);
  wrap.append(installBox);

  wrap.append(h('p', { class: 'muted center', style: 'font-size:12.5px;margin-top:26px', html: 'Every puzzle is generated fresh and checked by a solver — there is always exactly one right answer.' }));

  return { el, leave() { off(); } };
}
