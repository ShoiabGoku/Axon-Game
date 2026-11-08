/* SETTINGS — audio, haptics, motion, install, save data, about. */

import { S, save, resetAll, exportSave, importSave } from '../core/store.js';
import { applyVolumes, sfx, unlockAudio, speak } from '../core/audio.js';
import { h, icon, modal, toast } from '../core/ui.js';
import { canInstall, promptInstall, isIOS, isStandalone } from '../core/pwa.js';
import { go } from '../nav.js';
import { topbar } from './common.js';

export const APP_VERSION = '1.0.0';

export function settingsScreen() {
  const el = h('div', { class: 'screen' });
  const scroll = h('div', { class: 'scroll no-nav' });
  const wrap = h('div', { class: 'wrap narrow' });
  scroll.append(wrap); el.append(scroll);
  wrap.append(topbar({ title: 'Settings', backTo: 'home' }));

  const sec = (title, rows) => {
    wrap.append(h('div', { class: 'h-sec', html: title }));
    const c = h('div', { class: 'card set-list' });
    rows.forEach(r => c.append(r));
    wrap.append(c);
  };
  const row = (ic, label, sub, control) => {
    const r = h('div', { class: 'set-row' });
    r.innerHTML = `${icon(ic)}<div class="lb"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    r.append(control);
    return r;
  };
  const toggle = (key, after) => {
    const b = h('button', { class: `switch ${S.settings[key] ? 'on' : ''}`, role: 'switch', 'aria-checked': String(!!S.settings[key]) });
    b.addEventListener('click', () => {
      S.settings[key] = !S.settings[key];
      b.classList.toggle('on', S.settings[key]); b.setAttribute('aria-checked', String(S.settings[key]));
      save(); sfx('tap'); if (after) after(S.settings[key]);
    });
    return b;
  };
  const slider = (key, after) => {
    const s = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(S.settings[key]), 'aria-label': key });
    s.addEventListener('input', () => { S.settings[key] = +s.value; save(); applyVolumes(); if (after) after(); });
    s.addEventListener('change', () => sfx('select'));
    return s;
  };

  sec('Sound & feel', [
    row('sound', 'Sound effects', 'Clicks, chimes and alerts', slider('sfx')),
    row('music', 'Ambient music', 'A calm generative soundtrack', slider('music', () => unlockAudio())),
    row('vibrate', 'Haptics', 'Vibration feedback on supported phones', toggle('haptics', on => { if (on && navigator.vibrate) navigator.vibrate(20); })),
    row('digits', 'Speak digits', 'Read numbers aloud in Digit Span', toggle('voice', on => { if (on) speak('Voice on'); })),
    row('eye', 'Reduce motion', 'Calmer background, no confetti', toggle('reduced', on => { document.body.classList.toggle('reduced', on); })),
    row('timer', 'Timer in training', 'Default for new training sessions', toggle('trainTimer')),
  ]);

  const installBtn = h('button', { class: 'btn btn-primary btn-sm', html: isStandalone() ? 'Installed' : 'Install' });
  if (isStandalone()) installBtn.disabled = true;
  installBtn.addEventListener('click', async () => {
    if (canInstall()) { await promptInstall(); return; }
    modal({
      title: 'Install AXON', body: isIOS()
        ? '<ol><li>Open AXON in <b>Safari</b>.</li><li>Tap <b>Share</b>, then <b>Add to Home Screen</b>.</li></ol>'
        : '<ol><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li></ol><p class="muted">On desktop Chrome or Edge, use the install icon in the address bar.</p>',
      actions: [{ label: 'Got it', value: 1, cls: 'btn-primary' }],
    });
  });
  sec('App', [row('install', 'Install app', 'Full-screen, offline, on your home screen', installBtn)]);

  const exp = h('button', { class: 'btn btn-sm', html: `${icon('download')} Export` });
  exp.addEventListener('click', () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `axon-save-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    toast('Save exported', { iconName: 'download' });
  });
  const imp = h('button', { class: 'btn btn-sm', html: 'Import' });
  imp.addEventListener('click', () => {
    const f = h('input', { type: 'file', accept: 'application/json,.json' });
    f.addEventListener('change', async () => {
      try { importSave(await f.files[0].text()); toast('Save imported', { iconName: 'check' }); go('home', {}, { replace: true }); }
      catch (e) { toast('That file is not an AXON save', { iconName: 'x' }); }
    });
    f.click();
  });
  const reset = h('button', { class: 'btn btn-sm btn-danger', html: 'Reset' });
  reset.addEventListener('click', async () => {
    const v = await modal({ title: 'Reset all progress?', body: '<p>This erases your level, stars, stats, trophies and IQ history on this device. It cannot be undone.</p>', actions: [{ label: 'Cancel', value: null, cls: 'btn-ghost' }, { label: 'Erase everything', value: 'yes', cls: 'btn-danger' }] });
    if (v === 'yes') { resetAll(); toast('Progress reset'); go('home', {}, { replace: true }); }
  });
  const ioRow = h('div', { style: 'display:flex;gap:8px' }, exp, imp);
  sec('Your data', [
    row('chart', 'Backup', 'Progress lives only on this device', ioRow),
    row('refresh', 'Reset progress', 'Start over from scratch', reset),
  ]);

  wrap.append(h('div', { class: 'h-sec', html: 'About' }));
  wrap.append(h('div', {
    class: 'card', html: `<p style="margin-top:0"><b class="grad-text" style="font-family:var(--display);font-size:20px">AXON</b> <span class="muted">v${APP_VERSION}</span></p>
    <p class="muted" style="line-height:1.6">Fifteen procedurally generated trials across six abilities: pattern reasoning, deductive logic, quantitative reasoning, spatial reasoning, working memory and processing speed. Every puzzle is built from a random seed and checked by a solver before you see it, so each has exactly one correct answer — and each comes with an explanation.</p>
    <p class="muted" style="line-height:1.6"><b style="color:var(--text)">Scoring.</b> Points reward accuracy, speed and combos. Ability ratings and the IQ estimate use item response theory (a 3-parameter logistic model with an EAP estimate). Difficulty levels are calibrated by design, not normed on a population: the IQ figure is a practice estimate, not a clinical result.</p>
    <p class="muted" style="margin-bottom:0">Works offline once installed. No accounts and no tracking: your progress is stored only on this device. (The two typefaces are fetched from Google Fonts the first time the app loads.)</p>`,
  }));
  return { el };
}
