/* IQ TEST — intro and results. The test itself runs in the play engine as a computerised adaptive
   test (see launch.js pickIQ); results are scored with the 3PL/EAP model in core/irt.js. */

import { S, save, addXP, checkAchievements } from '../core/store.js';
import { GAMES, DOMAINS, DOMAIN_ORDER } from '../core/catalog.js';
import { eap, levelB, toIQ, normCdf, iqBand } from '../core/irt.js';
import { h, icon, countUp, fmtTime, toast } from '../core/ui.js';
import { sfx, buzz } from '../core/audio.js';
import * as fx from '../core/fx.js';
import { go } from '../nav.js';
import { topbar } from './common.js';
import { startIQ, IQ_FULL, IQ_QUICK } from './launch.js';
import { levelUpTakeover } from './result.js';
import { playerName } from './common.js';

export function iqScreen() {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll no-nav' });
  const wrap = h('div', { class: 'wrap narrow' });
  scroll.append(wrap); el.append(scroll);
  wrap.append(topbar({ title: 'IQ Test', backTo: 'home' }));
  let kind = 'quick';
  const hist = S.iq.slice(-6).reverse();
  const card = h('div', { class: 'card glow iq-hero', style: '--c1:#9d7bff;--c2:#38e1ff' });
  card.innerHTML = `
    <div class="brain">${icon('brain')}</div>
    <h2 class="h-title grad-text">Measure your reasoning</h2>
    <p class="muted" style="margin:10px auto 0;max-width:460px;line-height:1.55">An adaptive test: every answer adjusts the difficulty of the next question, so it homes in on your level quickly. Questions mix matrices, number series, logic, spatial rotation, cube folding, symbol algebra and working memory.</p>
    <div class="iq-choice">
      <button class="iq-opt" data-k="quick"><b>Quick</b><span>${IQ_QUICK.length} questions · about 10 min</span></button>
      <button class="iq-opt" data-k="full"><b>Full</b><span>${IQ_FULL.length} questions · about 20 min · tighter estimate</span></button>
    </div>
    <ul class="iq-rules" style="text-align:left;margin-top:18px">
      <li>Each question has its own timer. Running out counts as a miss.</li>
      <li>No feedback during the test — and no going back.</li>
      <li>Find a quiet place. Paper and pen are allowed.</li>
    </ul>
    <button class="btn btn-primary btn-lg btn-block go">${icon('play')} Begin test</button>`;
  const paint = () => card.querySelectorAll('.iq-opt').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
  card.querySelectorAll('.iq-opt').forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; sfx('tap'); paint(); }));
  card.querySelector('.go').addEventListener('click', () => { sfx('select'); startIQ(kind); });
  paint();
  wrap.append(card);
  if (hist.length) {
    wrap.append(h('div', { class: 'h-sec', html: 'Your results' }));
    const list = h('div', { class: 'res-items' });
    list.innerHTML = hist.map(r => `<div class="res-item"><span style="font-family:var(--display);font-weight:900;font-size:18px;color:#c9b8ff">${r.iq}</span><span>${iqBand(r.iq).label}</span><span class="sp"></span><span class="muted">${r.mode === 'full' ? 'Full' : 'Quick'} · ${new Date(r.date).toLocaleDateString()}</span></div>`).join('');
    wrap.append(list);
  }
  wrap.append(h('p', { class: 'disclaimer', html: 'AXON estimates IQ on the standard scale (mean 100, SD 15) from your answers using item response theory. Item difficulties are set by design rather than normed on a tested population, so treat the number as a practice estimate — not a clinical or professional assessment.' }));
  return { el };
}

/* ------------------------------------------------ results */
function bellSVG(iq) {
  const W = 560, H = 190, x0 = 30, x1 = W - 30, lo = 55, hi = 145;
  const X = v => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const Y = v => H - 34 - 130 * Math.exp(-0.5 * ((v - 100) / 15) ** 2);
  let d = '', fillD = `M${X(lo)},${H - 34}`;
  for (let v = lo; v <= hi; v += 1) { d += `${v === lo ? 'M' : 'L'}${X(v).toFixed(1)},${Y(v).toFixed(1)} `; }
  const cap = Math.max(lo, Math.min(hi, iq));
  for (let v = lo; v <= cap; v += 1) fillD += ` L${X(v).toFixed(1)},${Y(v).toFixed(1)}`;
  fillD += ` L${X(cap).toFixed(1)},${H - 34} Z`;
  const ticks = [70, 85, 100, 115, 130].map(v => `<line x1="${X(v)}" y1="${H - 34}" x2="${X(v)}" y2="${H - 28}" stroke="#6670a0"/><text x="${X(v)}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#a2abdc">${v}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="bell" aria-label="Bell curve with your score at ${iq}">
    <defs><linearGradient id="bf" x1="0" x2="1"><stop offset="0" stop-color="#38e1ff" stop-opacity=".15"/><stop offset="1" stop-color="#9d7bff" stop-opacity=".55"/></linearGradient></defs>
    <path d="${fillD}" fill="url(#bf)"/>
    <path d="${d}" fill="none" stroke="#c9b8ff" stroke-width="2.5"/>
    <line x1="${x0}" y1="${H - 34}" x2="${x1}" y2="${H - 34}" stroke="#3a4278"/>
    ${ticks}
    <line x1="${X(cap)}" y1="${Y(cap) - 14}" x2="${X(cap)}" y2="${H - 34}" stroke="#ffc54d" stroke-width="2.5" stroke-dasharray="4 3"/>
    <circle cx="${X(cap)}" cy="${Y(cap)}" r="7" fill="#ffc54d" stroke="#2a1600" stroke-width="2"/>
    <text x="${X(cap)}" y="${Y(cap) - 22}" text-anchor="middle" font-size="14" font-weight="800" fill="#ffc54d" font-family="Orbitron, sans-serif">YOU</text>
  </svg>`;
}

export function scoreIQ(results) {
  const resp = results.map(r => ({ b: levelB(r.level), c: r.guess || 0, x: r.correct ? 1 : 0 }));
  const { theta, se } = eap(resp);
  const iq = Math.round(Math.max(55, Math.min(160, toIQ(theta))));
  const domains = {};
  for (const d of DOMAIN_ORDER) {
    const rs = results.filter(r => GAMES[r.game].meta.domain === d);
    if (!rs.length) continue;
    const t = eap(rs.map(r => ({ b: levelB(r.level), c: r.guess || 0, x: r.correct ? 1 : 0 })), { mean: theta, sd: 0.7 }).theta;
    domains[d] = { idx: Math.round(toIQ(t)), n: rs.length, correct: rs.filter(r => r.correct).length };
  }
  return { theta, se, iq, ci: Math.round(1.645 * 15 * se), pct: normCdf(theta) * 100, domains };
}

export function iqResultScreen({ summary, kind }) {
  const R = summary.results;
  const sc = scoreIQ(R);
  const band = iqBand(sc.iq);
  const key = 'axon-iq-' + R.map(r => r.ms.toFixed(0)).join('.');
  let reward = null, ach = [];
  if (!sessionStorage.getItem(key) && R.length) {
    sessionStorage.setItem(key, '1');
    S.iq.push({ date: Date.now(), iq: sc.iq, se: +sc.se.toFixed(3), mode: kind, items: R.length, correct: R.filter(r => r.correct).length, domains: Object.fromEntries(Object.entries(sc.domains).map(([d, v]) => [d, v.idx])) });
    save();
    reward = addXP(summary.xp + (kind === 'full' ? 300 : 150));
    ach = checkAchievements();
  }
  const pctText = sc.pct >= 99.5 ? 'top 0.5%' : sc.pct < 1 ? 'bottom 1%' : `higher than ${Math.round(sc.pct)}% of people`;
  const el = h('div', { class: 'screen result' });
  const correct = R.filter(r => r.correct).length;
  el.innerHTML = `<div class="scroll no-nav"><div class="wrap narrow">
    <div class="res-sub" style="margin-top:18px;letter-spacing:.3em;font-weight:800">ESTIMATED IQ</div>
    <div class="iq-score">0</div>
    <div class="iq-band ${band.tone}">${band.label.toUpperCase()}</div>
    <p class="muted" style="margin:12px 0 0">90% range <b style="color:var(--text)">${sc.iq - sc.ci}–${sc.iq + sc.ci}</b> · ${pctText}</p>
    ${bellSVG(sc.iq)}
    <div class="res-grid">
      <div><b>${correct}/${R.length}</b><span>correct</span></div>
      <div><b>${fmtTime(summary.timeMs)}</b><span>time</span></div>
      <div><b>${Math.max(...R.map(r => r.level))}</b><span>peak level</span></div>
      <div><b>${Math.round(sc.pct)}<small style="font-size:12px">th</small></b><span>percentile</span></div>
    </div>
    <div class="card" style="margin-top:16px;text-align:left">
      <div class="h-sec" style="margin-top:0">Ability profile</div>
      <div class="dom-bars">${Object.entries(sc.domains).map(([d, v]) => `<div class="dom-bar" style="--dc:${DOMAINS[d].color}"><span>${DOMAINS[d].name}</span><div class="bar"><i style="width:0" data-w="${Math.max(4, Math.min(100, ((v.idx - 55) / 90) * 100))}"></i></div><b>${v.idx}</b></div>`).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin:12px 0 0">Profile scores rest on only a few questions each — read them as a direction, not a verdict.</p>
    </div>
    ${ach.length ? `<div class="ach-new">${ach.map(a => `<div class="ach-row">${icon(a.icon)}<div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}</div>` : ''}
    <div class="res-actions btn-row">
      <button class="btn btn-lg btn-gold cert">${icon('download')} Certificate</button>
      <button class="btn btn-lg share">${icon('share')} Share</button>
      <button class="btn btn-lg btn-primary home">${icon('home')} Home</button>
    </div>
    <p class="disclaimer">Scored with a 3-parameter item response model (EAP estimate, IQ = 100 + 15θ). Difficulty is calibrated by design, not against a normed population — an estimate for practice and fun, not a clinical assessment.</p>
  </div></div>`;
  el.querySelector('.home').addEventListener('click', () => go('home', {}, { replace: true }));
  el.querySelector('.cert').addEventListener('click', () => certificate(sc, band, kind, false));
  el.querySelector('.share').addEventListener('click', () => certificate(sc, band, kind, true));
  return {
    el,
    enter() {
      countUp(el.querySelector('.iq-score'), sc.iq, { ms: 1800, from: 60 });
      setTimeout(() => { sfx('levelup'); buzz('win'); fx.confetti(sc.iq >= 115 ? 200 : 90); }, 1700);
      setTimeout(() => el.querySelectorAll('.dom-bar .bar i').forEach(i => { i.style.width = i.dataset.w + '%'; }), 600);
      ach.forEach((a, i) => setTimeout(() => { sfx('achieve'); toast(`<b>Achievement unlocked</b><small>${a.name}</small>`, { tone: 'gold', iconName: a.icon }); }, 2400 + i * 900));
      if (reward && reward.levelUp) setTimeout(() => levelUpTakeover(reward.to), 3200);
    },
  };
}

/* ------------------------------------------------ certificate (canvas → PNG) */
async function certificate(sc, band, kind, share) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 800;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 1200, 800);
  bg.addColorStop(0, '#0b0f2e'); bg.addColorStop(1, '#1b1450');
  g.fillStyle = bg; g.fillRect(0, 0, 1200, 800);
  // neural flourish
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 1200, y = Math.random() * 800;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '56,225,255' : '157,123,255'},${(0.15 + Math.random() * 0.35).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, 1 + Math.random() * 2.5, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(201,184,255,.55)'; g.lineWidth = 3; g.strokeRect(36, 36, 1128, 728);
  g.strokeStyle = 'rgba(56,225,255,.3)'; g.lineWidth = 1; g.strokeRect(50, 50, 1100, 700);
  try { await document.fonts.load('900 40px Orbitron'); } catch { /* fallback font */ }
  g.textAlign = 'center';
  g.fillStyle = '#7ff1ff'; g.font = '900 54px Orbitron, sans-serif'; g.fillText('AXON', 600, 140);
  g.fillStyle = '#a2abdc'; g.font = '700 22px "Exo 2", sans-serif'; g.fillText('C E R T I F I C A T E   O F   R E A S O N I N G', 600, 185);
  g.fillStyle = '#eef1ff'; g.font = '800 44px "Exo 2", sans-serif'; g.fillText(playerName(), 600, 275);
  g.fillStyle = '#a2abdc'; g.font = '600 22px "Exo 2", sans-serif'; g.fillText(`completed the ${kind === 'full' ? 'Full' : 'Quick'} Adaptive IQ Test and scored`, 600, 320);
  const sg = g.createLinearGradient(0, 360, 0, 520); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#c9b8ff');
  g.fillStyle = sg; g.font = '900 170px Orbitron, sans-serif'; g.fillText(String(sc.iq), 600, 510);
  g.fillStyle = '#ffc54d'; g.font = '800 30px Orbitron, sans-serif'; g.fillText(band.label.toUpperCase(), 600, 565);
  g.fillStyle = '#a2abdc'; g.font = '600 22px "Exo 2", sans-serif';
  g.fillText(`Percentile ${Math.round(sc.pct)} · 90% range ${sc.iq - sc.ci}–${sc.iq + sc.ci} · ${new Date().toLocaleDateString()}`, 600, 610);
  const ds = Object.entries(sc.domains);
  const w = 150, gap = 22, start = 600 - (ds.length * w + (ds.length - 1) * gap) / 2;
  ds.forEach(([d, v], i) => {
    const x = start + i * (w + gap);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, 640, w, 60);
    g.fillStyle = DOMAINS[d].color; g.font = '800 15px "Exo 2", sans-serif'; g.fillText(DOMAINS[d].name.toUpperCase(), x + w / 2, 664);
    g.fillStyle = '#eef1ff'; g.font = '900 22px Orbitron, sans-serif'; g.fillText(String(v.idx), x + w / 2, 692);
  });
  g.fillStyle = '#6670a0'; g.font = '500 15px "Exo 2", sans-serif'; g.fillText('Estimate for practice and fun — not a clinical assessment.', 600, 740);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const name = `axon-iq-${sc.iq}.png`;
  if (share && navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: 'image/png' })] })) {
    try { await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: 'My AXON IQ', text: `I scored ${sc.iq} on the AXON adaptive IQ test.` }); return; } catch { /* cancelled */ }
  } else if (share && navigator.share) {
    try { await navigator.share({ title: 'My AXON IQ', text: `I scored ${sc.iq} (${band.label}) on the AXON adaptive IQ test.` }); return; } catch { /* cancelled */ }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  toast('Certificate saved', { iconName: 'download' });
}
