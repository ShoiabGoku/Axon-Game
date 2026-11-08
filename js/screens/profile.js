/* PROFILE — identity, rank, neural radar, stats, mastery, trophies, IQ history. */

import { S, save, levelInfo, rankOf, domainIndex, domainCount, ACH, gameStats, dailyStreakAlive } from '../core/store.js';
import { GAMES, DOMAINS, DOMAIN_ORDER, ORDER } from '../core/catalog.js';
import { totalStars } from '../core/campaign.js';
import { h, icon, modal, esc, fmtTime, ringSVG } from '../core/ui.js';
import { avatarSVG, AVATAR_COUNT } from '../core/avatars.js';
import { sfx } from '../core/audio.js';
import { go } from '../nav.js';
import { navbar, playerName } from './common.js';

function radarSVG() {
  const N = DOMAIN_ORDER.length, cx = 180, cy = 170, R = 120;
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const val = d => { const n = domainCount(d); const idx = n ? domainIndex(d) : 100; return Math.max(0.08, Math.min(1, (idx - 55) / 90)); };
  let grid = '';
  for (const f of [0.25, 0.5, 0.75, 1]) grid += `<polygon points="${DOMAIN_ORDER.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="rgba(143,160,255,${f === 1 ? 0.35 : 0.14})"/>`;
  const axes = DOMAIN_ORDER.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(143,160,255,.14)"/>`; }).join('');
  const shape = DOMAIN_ORDER.map((d, i) => pt(i, R * val(d)).map(v => v.toFixed(1)).join(',')).join(' ');
  const labels = DOMAIN_ORDER.map((d, i) => {
    const [x, y] = pt(i, R + 26), D = DOMAINS[d], n = domainCount(d);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${D.color}">${D.name.toUpperCase()}</text><text x="${x.toFixed(1)}" y="${(y + 15).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#a2abdc">${n >= 3 ? domainIndex(d) : '—'}</text>`;
  }).join('');
  const dots = DOMAIN_ORDER.map((d, i) => { const [x, y] = pt(i, R * val(d)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${DOMAINS[d].color}"/>`; }).join('');
  return `<svg viewBox="0 0 360 350" class="radar" aria-label="Ability radar">
    <defs><radialGradient id="rf"><stop offset="0" stop-color="#9d7bff" stop-opacity=".55"/><stop offset="1" stop-color="#38e1ff" stop-opacity=".25"/></radialGradient></defs>
    ${grid}${axes}<polygon points="${shape}" fill="url(#rf)" stroke="#c9b8ff" stroke-width="2"/>${dots}${labels}</svg>`;
}

export function profileScreen() {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll' });
  const wrap = h('div', { class: 'wrap' });
  scroll.append(wrap); el.append(scroll, navbar('profile'));
  const li = levelInfo();
  const acc = S.stats.attempts ? Math.round((S.stats.correct / S.stats.attempts) * 100) + '%' : '—';
  const head = h('div', { class: 'card glow prof-head' });
  head.innerHTML = `<button class="avatar" style="border:0;background:none;padding:0;cursor:pointer" aria-label="Change avatar">${ringSVG(li.frac, { size: 84, stroke: 4, color: 'var(--gold)' })}<div class="face">${avatarSVG(S.avatar)}</div><span class="lvl">${li.level}</span></button>
    <div style="flex:1;min-width:0"><h2>${esc(playerName())}</h2><div class="rk" style="color:var(--cyan);font-weight:800;letter-spacing:.14em;font-size:12.5px;text-transform:uppercase;margin-top:3px">${rankOf(li.level)} · Level ${li.level}</div>
    <div class="bar" style="margin-top:10px"><i style="width:${(li.frac * 100).toFixed(1)}%"></i></div><small class="muted">${li.into} / ${li.need} XP to level ${li.level + 1}</small></div>
    <button class="btn btn-icon btn-ghost ed" aria-label="Edit profile">${icon('gear')}</button>`;
  head.querySelector('.avatar').addEventListener('click', editProfile);
  head.querySelector('.ed').addEventListener('click', () => go('settings'));
  wrap.append(h('div', { class: 'topbar', html: '<h1 class="h-title">Profile</h1>' }), head);

  wrap.append(h('div', { class: 'h-sec', html: 'Neural radar' }));
  wrap.append(h('div', { class: 'card', html: radarSVG() + '<p class="muted center" style="font-size:12.5px;margin:4px 0 0">Ability indexes on the IQ scale (100 = typical), updated after every puzzle you play.</p>' }));

  wrap.append(h('div', { class: 'h-sec', html: 'Stats' }));
  wrap.append(h('div', {
    class: 'stats-grid', html: `
    <div><b>${S.stats.correct.toLocaleString()}</b><span>solved</span></div>
    <div><b>${acc}</b><span>accuracy</span></div>
    <div><b>${fmtTime(S.stats.ms)}</b><span>time played</span></div>
    <div><b>×${S.stats.bestCombo}</b><span>best combo</span></div>
    <div><b>${totalStars(S.campaign)}</b><span>campaign ★</span></div>
    <div><b>${dailyStreakAlive()}</b><span>day streak</span></div>` }));

  wrap.append(h('div', { class: 'h-sec', html: 'Mastery' }));
  const mast = h('div', { class: 'card mastery' });
  mast.innerHTML = ORDER.map(id => {
    const G = GAMES[id], gs = gameStats(id);
    return `<div class="mrow" style="--gc:${DOMAINS[G.meta.domain].color}">${icon(G.meta.icon)}<div><div style="font-weight:700">${G.meta.title}</div><div class="mlv">${Array.from({ length: 10 }, (_, k) => `<i class="${k < gs.best ? 'on' : ''}"></i>`).join('')}</div></div><span class="muted" style="text-align:right;font-size:12.5px">${gs.best ? 'Lv ' + gs.best : 'new'}</span></div>`;
  }).join('');
  wrap.append(mast);

  wrap.append(h('div', { class: 'h-sec', html: `Trophies · ${Object.keys(S.ach).length}/${ACH.length}` }));
  wrap.append(h('div', { class: 'ach-grid', html: ACH.map(a => `<div class="ach ${S.ach[a.id] ? 'on' : ''}">${icon(S.ach[a.id] ? a.icon : 'lock')}<b>${a.name}</b><small>${a.desc}</small></div>`).join('') }));

  if (S.iq.length) {
    wrap.append(h('div', { class: 'h-sec', html: 'IQ history' }));
    const pts = S.iq.slice(-12);
    const W = 520, H = 140, mn = Math.min(...pts.map(p => p.iq)) - 8, mx = Math.max(...pts.map(p => p.iq)) + 8;
    const X = i => 30 + (pts.length === 1 ? (W - 60) / 2 : (i * (W - 60)) / (pts.length - 1));
    const Y = v => H - 22 - ((v - mn) / (mx - mn || 1)) * (H - 44);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.iq).toFixed(1)}`).join(' ');
    wrap.append(h('div', { class: 'card', html: `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block"><path d="${line}" fill="none" stroke="#c9b8ff" stroke-width="2.5"/>${pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.iq).toFixed(1)}" r="5" fill="#9d7bff"/><text x="${X(i).toFixed(1)}" y="${(Y(p.iq) - 11).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#eef1ff">${p.iq}</text>`).join('')}</svg>` }));
  }

  async function editProfile() {
    sfx('tap');
    let av = S.avatar;
    const box = h('div');
    box.innerHTML = `<label class="row-label" style="display:block;margin-top:0">Name</label><input class="field" maxlength="18" value="${esc(S.name)}" placeholder="Your name">
      <div class="row-label">Avatar</div><div class="avatars">${Array.from({ length: AVATAR_COUNT }, (_, i) => `<button data-a="${i}" class="${i === av ? 'on' : ''}" aria-label="Avatar ${i + 1}">${avatarSVG(i)}</button>`).join('')}</div>`;
    box.querySelectorAll('.avatars button').forEach(b => b.addEventListener('click', () => { av = +b.dataset.a; box.querySelectorAll('.avatars button').forEach(x => x.classList.toggle('on', x === b)); sfx('tap'); }));
    const v = await modal({ title: 'Edit profile', body: box, actions: [{ label: 'Cancel', value: null, cls: 'btn-ghost' }, { label: 'Save', value: 'save', cls: 'btn-primary' }] });
    if (v === 'save') {
      S.name = box.querySelector('input').value.trim().slice(0, 18);
      S.avatar = av;
      save(true);
      go('profile', {}, { replace: true });
    }
  }
  return { el };
}
