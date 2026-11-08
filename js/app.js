/* AXON — boot. Registers screens, starts the background, audio unlock, PWA plumbing. */

import { S } from './core/store.js';
import { initFX } from './core/fx.js';
import { unlockAudio } from './core/audio.js';
import { toast } from './core/ui.js';
import { registerSW } from './core/pwa.js';
import { register, go } from './nav.js';
import { titleScreen } from './screens/title.js';
import { homeScreen } from './screens/home.js';
import { mapScreen } from './screens/map.js';
import { trainScreen } from './screens/train.js';
import { playScreen } from './screens/play.js';
import { resultScreen } from './screens/result.js';
import { iqScreen, iqResultScreen } from './screens/iq.js';
import { dailyScreen } from './screens/daily.js';
import { profileScreen } from './screens/profile.js';
import { settingsScreen } from './screens/settings.js';

register('title', titleScreen);
register('home', homeScreen);
register('map', mapScreen);
register('train', trainScreen);
register('play', playScreen);
register('result', resultScreen);
register('iq', iqScreen);
register('iqResult', iqResultScreen);
register('daily', dailyScreen);
register('profile', profileScreen);
register('settings', settingsScreen);

if (S.settings.reduced) document.body.classList.add('reduced');
initFX();

// any first gesture unlocks audio (title screen also does it explicitly)
const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

registerSW(apply => {
  const t = toast('<b>Update ready</b><small>Tap to load the new version</small>', { iconName: 'refresh', ms: 12000 });
  t.style.pointerEvents = 'auto'; t.style.cursor = 'pointer';
  t.addEventListener('click', apply);
});

// deep links: ?go=iq / ?go=daily / ?go=train (used by the manifest shortcuts)
const target = new URLSearchParams(location.search).get('go');
history.replaceState({ name: 'title', params: {} }, '');
if (target && ['iq', 'daily', 'train', 'map', 'profile'].includes(target)) go(target, {}, { replace: true });
else go('title', {}, { replace: true });

// test hook for automated play-testing
window.__AXON = { S, go };
