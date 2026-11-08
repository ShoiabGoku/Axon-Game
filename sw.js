/* AXON service worker — offline-first.
   RELEASE RULE: bump VERSION whenever any file changes, and keep CORE listing every file the app
   loads (tests/verify.js fails if a file under js/, css/ or icons/ is missing from it). */

const VERSION = 'axon-v1.0.0';
const FONTS = 'axon-fonts';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/nav.js',
  'js/core/audio.js', 'js/core/avatars.js', 'js/core/campaign.js', 'js/core/cat.js', 'js/core/catalog.js', 'js/core/draw.js', 'js/core/fx.js',
  'js/core/irt.js', 'js/core/poly.js', 'js/core/pwa.js', 'js/core/rng.js', 'js/core/store.js', 'js/core/ui.js',
  'js/games/balance.js', 'js/games/codelock.js', 'js/games/compare.js', 'js/games/corsi.js', 'js/games/cubefold.js',
  'js/games/digitspan.js', 'js/games/lineup.js', 'js/games/matrix.js', 'js/games/oddone.js', 'js/games/rotation.js',
  'js/games/sequence.js', 'js/games/stroop.js', 'js/games/symbols.js', 'js/games/syllogism.js', 'js/games/truth.js',
  'js/screens/common.js', 'js/screens/daily.js', 'js/screens/home.js', 'js/screens/howto.js', 'js/screens/iq.js',
  'js/screens/launch.js', 'js/screens/map.js', 'js/screens/play.js', 'js/screens/profile.js', 'js/screens/result.js',
  'js/screens/settings.js', 'js/screens/title.js', 'js/screens/train.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google Fonts: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  // app shell: cache-first; navigations always get the cached shell (query strings ignored)
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r.ok) cache.put(req, r.clone());
      return r;
    } catch {
      return (await cache.match('index.html')) || Response.error();
    }
  })());
});
