/* Minimal screen router with browser-history integration (so the Android back button works). */

import { closeAllModals } from './core/ui.js';

const registry = {};
let current = null;
const root = () => document.getElementById('app');

export function register(name, factory) { registry[name] = factory; }
export const currentScreen = () => current;

export function go(name, params = {}, opts = {}) {
  if (!registry[name]) throw new Error('No screen ' + name);
  closeAllModals();
  if (current && current.inst.leave) { try { current.inst.leave(); } catch (e) { console.error(e); } }
  const old = root().querySelectorAll('.screen');
  old.forEach(o => { o.classList.add('out'); setTimeout(() => o.remove(), 230); });
  const inst = registry[name](params);
  root().append(inst.el);
  current = { name, params, inst };
  if (inst.enter) requestAnimationFrame(() => inst.enter());
  if (!opts.noHistory) {
    const state = { name, params: safe(params) };
    if (opts.replace) history.replaceState(state, ''); else history.pushState(state, '');
  }
  window.scrollTo(0, 0);
}

function safe(p) { try { return JSON.parse(JSON.stringify(p)); } catch { return {}; } }

export function back(fallback = 'home') {
  if (history.state && history.length > 1) history.back();
  else go(fallback, {}, { replace: true });
}

window.addEventListener('popstate', e => {
  if (current && current.inst.onBack) {
    const handled = current.inst.onBack();
    if (handled) { history.pushState({ name: current.name, params: safe(current.params) }, ''); return; }
  }
  const st = e.state;
  if (!st || !registry[st.name] || st.name === 'play' || st.name === 'title') { go('home', {}, { noHistory: true }); return; }
  go(st.name, st.params || {}, { noHistory: true });
});
