/* DOM helpers, the icon set, toasts and modals. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtTime = ms => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`; };
export const fmtNum = n => Math.round(n).toLocaleString();
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------ icons (24×24, stroke) */
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.4-4 4.4-6 8-6s6.6 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="currentColor"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z" fill="currentColor"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" fill="currentColor"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.5-6-5.7 0-3.5 2.6-5.4 3.6-8.8.3 2 1.4 3 2.4 3.6.3-2.6 1.8-5 3.6-6.6-.3 3 3.4 5.6 3.4 10 0 4.2-3.1 7.5-7 7.5z" fill="currentColor"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.6 4M16 6h3.5a3 3 0 0 1-3.6 4M12 13v4M8.5 20.5h7M10 17h4"/>',
  crown: '<path d="M4 18h16l1-10-5 4-4-6-4 6-5-4z" fill="currentColor"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M10 2.8h4M18 6.5l1.5-1.5"/>',
  brain: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.3A3 3 0 0 0 6.5 18 3 3 0 0 0 12 19.5V5.5A3 3 0 0 0 9 4.5z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.3 3 3 0 0 1-2.5 5.2A3 3 0 0 1 12 19.5"/><path d="M8.5 9.5h1.5M14 12h1.5M8.5 14.5h1.5"/>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  music: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  vibrate: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7M2 10.5v3M22 10.5v3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4.5V9h-4.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor"/>',
  install: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7.5M9 11.5l3 3 3-3"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 6 3h4l2 4 2-4h4l-2.5 7.5"/><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" fill="currentColor"/>',
  /* game icons */
  matrix: '<rect x="3.5" y="3.5" width="5" height="5" rx="1"/><rect x="9.5" y="3.5" width="5" height="5" rx="1"/><rect x="15.5" y="3.5" width="5" height="5" rx="1"/><rect x="3.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="15.5" y="9.5" width="5" height="5" rx="1"/><rect x="3.5" y="15.5" width="5" height="5" rx="1"/><rect x="9.5" y="15.5" width="5" height="5" rx="1"/><path d="M17 17.2c0-1 .7-1.6 1.6-1.6s1.4.6 1.4 1.3c0 1-1.3 1.2-1.3 2.1M18.7 20.6v.1"/>',
  sequence: '<path d="M3 17l4-5 4 3 5-7 5 4"/><circle cx="3" cy="17" r="1.2" fill="currentColor"/><circle cx="7" cy="12" r="1.2" fill="currentColor"/><circle cx="11" cy="15" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/>',
  oddone: '<circle cx="6" cy="7" r="2.6"/><circle cx="12" cy="7" r="2.6"/><circle cx="18" cy="7" r="2.6"/><circle cx="6" cy="16" r="2.6"/><rect x="9.6" y="13.6" width="4.8" height="4.8" rx=".8" fill="currentColor"/><circle cx="18" cy="16" r="2.6"/>',
  verdict: '<path d="M12 3.5v17M5 7.5h14M5 7.5l-2.5 6h5zM19 7.5l-2.5 6h5zM8 20.5h8"/>',
  robot: '<rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 7V4"/><circle cx="12" cy="3.5" r="1"/><circle cx="9.3" cy="12" r="1.3" fill="currentColor"/><circle cx="14.7" cy="12" r="1.3" fill="currentColor"/><path d="M2.5 11v3M21.5 11v3"/>',
  lineup: '<circle cx="5" cy="9" r="2.3"/><circle cx="12" cy="9" r="2.3"/><circle cx="19" cy="9" r="2.3"/><path d="M2 18c.6-2.6 1.6-3.8 3-3.8s2.4 1.2 3 3.8M9 18c.6-2.6 1.6-3.8 3-3.8s2.4 1.2 3 3.8M16 18c.6-2.6 1.6-3.8 3-3.8s2.4 1.2 3 3.8"/>',
  symbols: '<path d="M6 3.5l3.5 3.5L6 10.5 2.5 7z"/><circle cx="17" cy="7" r="3.3"/><path d="M4 17h4M6 15v4M14.5 15.2h5M14.5 18.8h5"/>',
  balance: '<path d="M12 4v15M7 20.5h10M4 7.5h16M6 7.5l-3 6.5h6zM18 7.5l-3 6.5h6z"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5V9h-4.5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  cube: '<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M12 12l8-4.6M12 12L4 7.4M12 12v9.2"/>',
  corsi: '<rect x="3" y="4" width="5" height="5" rx="1.2"/><rect x="15" y="3" width="5" height="5" rx="1.2" fill="currentColor"/><rect x="9" y="11" width="5" height="5" rx="1.2"/><rect x="4" y="16" width="5" height="5" rx="1.2" fill="currentColor"/><rect x="16" y="15" width="5" height="5" rx="1.2"/>',
  digits: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7.5 10l1.5-1v6M12 9.5c.5-.6 1.1-.8 1.7-.8 1 0 1.6.6 1.6 1.4 0 1.4-3.3 2.6-3.3 4.9h3.4"/>',
  stroop: '<path d="M4 6.5h7M7.5 6.5v11"/><path d="M14 17.5V6.5h3.2a2.6 2.6 0 0 1 0 5.2H14"/><circle cx="19" cy="17.5" r="2.5" fill="currentColor"/>',
  compare: '<path d="M4 18V10M9 18V6M15 18v-5M20 18V8"/><path d="M8 3.5l1 1.5 1-1.5"/>',
};
export function icon(name, cls = '') {
  return `<svg viewBox="0 0 24 24" class="ic ${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;
}

/* ------------------------------------------------ toast + modal */
let toastBox = null;
export function toast(html, { tone = 'info', ms = 2600, iconName = null } = {}) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.append(toastBox); }
  const t = h('div', { class: `toast ${tone}`, html: (iconName ? icon(iconName) : '') + `<div>${html}</div>` });
  toastBox.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  return t;
}

const openModals = new Set();
/** close every open modal (resolving with null) — called whenever the screen changes */
export function closeAllModals() { [...openModals].forEach(close => close(null)); }

export function modal({ title = '', body = '', actions = [], cls = '', dismiss = true } = {}) {
  return new Promise(resolve => {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: `modal ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title.replace(/<[^>]+>/g, '') });
    if (title) box.append(h('h2', { class: 'modal-title', html: title }));
    const content = h('div', { class: 'modal-body' });
    if (typeof body === 'string') content.innerHTML = body; else if (body) content.append(body);
    box.append(content);
    const row = h('div', { class: 'modal-actions' });
    const close = v => {
      if (!openModals.has(close)) return;
      openModals.delete(close);
      back.classList.add('out'); setTimeout(() => back.remove(), 250);
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    openModals.add(close);
    actions.forEach(a => row.append(h('button', { class: `btn ${a.cls || ''}`, onclick: () => close(a.value), html: a.label })));
    if (actions.length) box.append(row);
    back.append(box);
    if (dismiss) back.addEventListener('click', e => { if (e.target === back) close(null); });
    const onKey = e => { if (e.key === 'Escape' && dismiss) close(null); };
    document.addEventListener('keydown', onKey);
    document.body.append(back);
    requestAnimationFrame(() => back.classList.add('in'));
    const first = box.querySelector('.btn-primary') || box.querySelector('button');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  });
}

export function countUp(el, to, { from = 0, ms = 900, fmt = fmtNum } = {}) {
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function starsHTML(n, max = 3, cls = '') {
  let s = `<span class="stars ${cls}">`;
  for (let i = 0; i < max; i++) s += `<span class="st ${i < n ? 'on' : ''}">${icon('star')}</span>`;
  return s + '</span>';
}

export function ringSVG(frac, { size = 44, stroke = 4, color = 'var(--cyan)', track = 'rgba(255,255,255,.08)', label = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" class="ring" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.max(0, Math.min(1, frac)))).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    ${label ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" class="ring-label">${label}</text>` : ''}
  </svg>`;
}
