/* Install prompt + service worker registration + update notice. */

let deferred = null;
const listeners = new Set();

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canInstall = () => !!deferred && !isStandalone();
export const onInstallChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
  listeners.forEach(fn => fn());
});
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(fn => fn()); });

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach(fn => fn());
  return outcome === 'accepted';
}

export function registerSW(onUpdate) {
  if (!('serviceWorker' in navigator)) return;
  if (location.search.includes('nosw')) {
    // development: drop any worker and caches from earlier loads so edits show up immediately
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
    return;
  }
  if (location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const notify = w => w && w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) onUpdate(() => w.postMessage('skip'));
    });
    if (reg.waiting && navigator.serviceWorker.controller) onUpdate(() => reg.waiting.postMessage('skip'));
    reg.addEventListener('updatefound', () => notify(reg.installing));
  }).catch(() => { /* offline-capable features simply unavailable */ });
  // reload only when a NEW version takes over — not when the very first worker claims the page
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}
