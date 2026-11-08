/* CAMPAIGN MAP — six zones of nodes along a glowing neural pathway. */

import { S } from '../core/store.js';
import { NODES, ZONES, nodeState, zoneStars, totalStars, currentNode } from '../core/campaign.js';
import { GAMES, DOMAINS } from '../core/catalog.js';
import { h, icon, modal, starsHTML } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { go } from '../nav.js';
import { navbar } from './common.js';
import { startNode } from './launch.js';
import { showHowTo } from './howto.js';

const STEP = 104, ZONE_H = 150;

export function mapScreen() {
  const el = h('div', { class: 'screen' });
  const total = totalStars(S.campaign);
  el.innerHTML = `<div class="map-head"><button class="btn btn-icon btn-ghost bk" aria-label="Home">${icon('home')}</button>
    <div class="t"><h1 class="h-title">Campaign</h1><small>Six zones · ${NODES.length} nodes</small></div>
    <span class="chip">${icon('star')} ${total} / ${NODES.length * 3}</span></div>
    <div class="map-scroll"><div class="map"></div></div>`;
  el.append(navbar('map'));
  el.querySelector('.bk').addEventListener('click', () => go('home'));
  const mapEl = el.querySelector('.map');
  const scroller = el.querySelector('.map-scroll');

  function build() {
    const W = Math.min(560, mapEl.clientWidth || 380);
    const pts = [];
    let y = 16;
    const parts = [];
    ZONES.forEach((z, zi) => {
      const zs = zoneStars(S.campaign, zi);
      const gateOk = total >= z.gate;
      parts.push(`<div class="zone-title ${gateOk ? '' : 'locked'}" style="position:absolute;left:0;right:0;top:${y}px;--zc:${z.color}">
        <div class="zn">${zi + 1}</div><div><h3>${z.name}</h3><small>${z.sub} · levels ${z.lo}–${z.hi}</small></div>
        <div class="zs">${icon('star')} ${zs}/30${gateOk ? '' : `<br><small style="color:var(--muted);font-family:var(--font)">needs ${z.gate} ★</small>`}</div></div>`);
      y += ZONE_H;
      NODES.filter(n => n.zone === zi).forEach((n, j) => {
        const x = W / 2 + Math.sin(n.index * 0.92 + 0.6) * W * 0.29;
        const ny = y + j * STEP + (n.boss ? 18 : 0);
        pts.push({ x, y: ny, n });
      });
      y += 10 * STEP + 40;
    });
    const height = y + 20;
    const cur = currentNode(S.campaign);
    // smooth path (Catmull-Rom → cubic Bézier)
    const path = arr => {
      if (arr.length < 2) return '';
      let d = `M${arr[0].x.toFixed(1)},${arr[0].y.toFixed(1)}`;
      for (let i = 0; i < arr.length - 1; i++) {
        const p0 = arr[i - 1] || arr[i], p1 = arr[i], p2 = arr[i + 1], p3 = arr[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return d;
    };
    const doneIdx = pts.findIndex(p => p.n.index === cur.index);
    const donePts = pts.slice(0, Math.max(1, doneIdx + 1));
    const svg = `<svg class="path-svg" viewBox="0 0 ${W} ${height}" style="height:${height}px" preserveAspectRatio="none">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">${ZONES.map((z, i) => `<stop offset="${(i / 5).toFixed(2)}" stop-color="${z.color}"/>`).join('')}</linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <path d="${path(pts)}" fill="none" stroke="rgba(143,160,255,.16)" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12"/>
      <path d="${path(donePts)}" fill="none" stroke="url(#pg)" stroke-width="8" stroke-linecap="round" filter="url(#glow)" opacity=".7"/>
      <path d="${path(donePts)}" fill="none" stroke="url(#pg)" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`;
    const nodesHTML = pts.map(({ x, y: ny, n }) => {
      const s = nodeState(S.campaign, n);
      const z = ZONES[n.zone];
      const ic = n.boss ? 'crown' : GAMES[n.game].meta.icon;
      const isCur = n.index === cur.index && s.open;
      return `<button class="node ${n.boss ? 'boss' : ''} ${s.open ? '' : 'locked'} ${isCur ? 'current' : ''}" data-i="${n.index}" style="left:${x.toFixed(1)}px;top:${ny.toFixed(1)}px;--nc:${z.color}" aria-label="${n.boss ? 'Gauntlet' : GAMES[n.game].meta.title} level ${n.level}${s.open ? '' : ', locked'}">
        <span class="hex">${s.open ? icon(ic) : ''}</span>${s.open ? '' : `<span class="lockico">${icon('lock')}</span>`}
        <span class="nlv">${n.level}</span>${s.stars ? `<span class="nst">${starsHTML(s.stars)}</span>` : ''}${isCur ? '<span class="here">PLAY</span>' : ''}</button>`;
    }).join('');
    mapEl.style.height = height + 'px';
    mapEl.innerHTML = svg + parts.join('') + `<div class="nodes">${nodesHTML}</div>`;
    mapEl.querySelectorAll('.node').forEach(b => b.addEventListener('click', () => openNode(+b.dataset.i)));
    return pts.find(p => p.n.index === cur.index);
  }

  async function openNode(i) {
    const n = NODES[i], s = nodeState(S.campaign, n), z = ZONES[n.zone];
    sfx('tap');
    if (!s.open) {
      const need = z.gate - totalStars(S.campaign);
      modal({ title: `${icon('lock')} Locked`, body: s.gated ? `<p>Zone ${n.zone + 1} opens at <b>${z.gate} stars</b>. You need <b>${need}</b> more — replay earlier nodes for 3 stars.</p>` : '<p>Clear the previous node first.</p>', actions: [{ label: 'OK', value: 1, cls: 'btn-primary' }] });
      return;
    }
    let body;
    if (n.boss) {
      body = `<div class="gsheet" style="--gc:${z.color}"><div class="gs-head"><div class="g-ic">${icon('crown')}</div><div><span class="chip" style="color:${z.color}">${z.name} · BOSS</span><h2 style="margin-top:6px">The Gauntlet</h2></div></div>
        <p class="muted" style="margin-top:14px">Six mixed trials at level ${n.level}: pattern, logic, numbers, space, memory — and one more matrix. Three hearts. Lose them all and the gauntlet wins.</p>
        <div style="margin-top:10px">${starsHTML(s.stars)}</div></div>`;
    } else {
      const G = GAMES[n.game], D = DOMAINS[G.meta.domain];
      body = `<div class="gsheet" style="--gc:${D.color}"><div class="gs-head"><div class="g-ic">${icon(G.meta.icon)}</div><div><span class="chip" style="color:${D.color}">${D.long}</span><h2 style="margin-top:6px">${G.meta.title}</h2></div></div>
        <p class="muted" style="margin-top:14px">${G.meta.tagline}. ${G.meta.kind === 'sprint' ? 'One timed sprint — accuracy earns the stars.' : '5 puzzles, 3 hearts. Every mistake costs a heart; finish with all three for ★★★.'}</p>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px"><span class="badge-lv">LEVEL ${n.level}</span>${starsHTML(s.stars)}</div></div>`;
    }
    const actions = [{ label: `${icon('play')} Play`, value: 'play', cls: 'btn-primary' }];
    if (!n.boss) actions.unshift({ label: 'How to play', value: 'how' });
    const v = await modal({ title: '', body, actions, cls: 'wide' });
    if (v === 'play') startNode(i);
    if (v === 'how') { await showHowTo(n.game); openNode(i); }
  }

  return {
    el,
    enter() {
      const cur = build();
      if (cur) scroller.scrollTop = Math.max(0, cur.y - scroller.clientHeight * 0.45);
      const onR = () => build();
      addEventListener('resize', onR);
      this._off = () => removeEventListener('resize', onR);
    },
    leave() { if (this._off) this._off(); },
  };
}
