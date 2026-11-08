/* PLAY — the session engine behind every mode (campaign, training, daily, IQ test).
   A session is a list of items (or a function that picks the next item adaptively). Each item is
   generated from a seed, rendered by its game module through the `ui` toolkit below, graded,
   scored, recorded, and followed by a feedback sheet (or nothing, in the IQ test). */

import { GAMES, DOMAINS, answerIndex } from '../core/catalog.js';
import { makeRng, randomSeed } from '../core/rng.js';
import { S, recordItem, save } from '../core/store.js';
import { sfx, playTone, speak, buzz } from '../core/audio.js';
import * as fx from '../core/fx.js';
import { h, icon, modal, ringSVG } from '../core/ui.js';
import { go } from '../nav.js';
import { showHowTo } from './howto.js';

const TIMEOUT = { __timeout: true };

export function playScreen(cfg) {
  const el = h('div', { class: 'screen play' });
  el.innerHTML = `
    <div class="hud">
      <button class="btn btn-icon btn-ghost quit" aria-label="Pause">${icon('pause')}</button>
      <div class="pips"></div>
      <div class="hearts"></div>
      <div class="timer" hidden></div>
    </div>
    <div class="titlerow">
      <div class="g-ic"></div><div class="nm"></div><span class="badge-lv"></span>
      <button class="btn btn-icon btn-ghost help" aria-label="How to play">${icon('info')}</button>
      <div class="sp"></div><span class="combo-slot"></span><span class="score">0</span>
    </div>
    <div class="status" hidden></div>
    <div class="play-body"><div class="stage"></div><div class="answers"></div></div>`;
  const $ = s => el.querySelector(s);
  const stage = $('.stage'), answers = $('.answers'), statusEl = $('.status'), timerEl = $('.timer');

  const st = {
    i: 0, results: [], combo: 0, bestCombo: 0, points: 0, xp: 0,
    hearts: cfg.hearts ?? null, maxHearts: cfg.hearts ?? null, level: cfg.levelStart || 1, up: 0, t0: Date.now(),
  };
  const total = cfg.items ? cfg.items.length : (cfg.count || null);
  let cur = null;            // { item, G, p, ui, t0 }
  let sheetEl = null, paused = false, finished = false;
  const keyHandlers = [];

  /* ---------------------------------------------- HUD */
  function paintPips() {
    const pips = $('.pips');
    if (!total) { pips.innerHTML = `<span class="count">#${st.i + 1}</span>`; return; }
    let s = '';
    for (let k = 0; k < total; k++) {
      const r = st.results[k];
      // the IQ test never reveals right/wrong while it is running
      const done = cfg.mode === 'iq' ? 'done' : r && r.correct ? 'ok' : 'no';
      s += `<i class="${r ? done : k === st.i ? 'cur' : ''}"></i>`;
    }
    pips.innerHTML = s;
  }
  function paintHearts() {
    const hEl = $('.hearts');
    if (st.hearts === null) { hEl.innerHTML = ''; return; }
    hEl.innerHTML = Array.from({ length: st.maxHearts }, (_, k) => icon('heart', k < st.hearts ? '' : 'lost')).join('');
  }
  function paintScore() {
    $('.score').textContent = cfg.mode === 'iq' || !st.points ? '' : st.points.toLocaleString();
    $('.combo-slot').innerHTML = st.combo >= 2 && cfg.mode !== 'iq' ? `<span class="combo">×${st.combo} COMBO</span>` : '';
  }

  /* ---------------------------------------------- the per-item ui toolkit */
  function makeUI(item, G, p) {
    const timers = new Set();
    let locked = false, lockBtn = null, clock = null, clockEnd = 0, clockTotal = 0, lastSec = -1, remaining = null;
    const ui = {
      stage, answers, mode: cfg.mode, level: item.level,
      get locked() { return locked; },
      later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
      every(fn, ms) { const id = setInterval(fn, ms); timers.add(id); return id; },
      onKey(fn) { keyHandlers.push(fn); },
      sfx, tone: playTone, speak, buzz,
      setStatus(text, tone = '') { statusEl.hidden = false; statusEl.className = 'status ' + tone; statusEl.textContent = text; },
      startClock(sec) {
        clockTotal = sec; clockEnd = performance.now() + sec * 1000; timerEl.hidden = false; lastSec = -1;
        clearInterval(clock);
        const tick = () => {
          const left = Math.max(0, (clockEnd - performance.now()) / 1000);
          const s = Math.ceil(left);
          timerEl.innerHTML = ringSVG(left / clockTotal, { size: 46, stroke: 4, color: left <= 10 ? 'var(--bad)' : 'var(--cyan)' }) + `<div class="tt">${s}</div>`;
          timerEl.classList.toggle('low', left <= 10);
          if (s !== lastSec && s <= 5 && s > 0) sfx('tickHi');
          lastSec = s;
          if (left <= 0) { clearInterval(clock); clock = null; ui.submit(TIMEOUT); }
        };
        tick();
        clock = setInterval(tick, 120);
      },
      stopClock() { clearInterval(clock); clock = null; },
      pauseClock() { if (clock) { remaining = (clockEnd - performance.now()) / 1000; clearInterval(clock); clock = null; } },
      resumeClock() { if (remaining !== null) { const keepTotal = clockTotal; ui.startClock(remaining); clockTotal = keepTotal; remaining = null; } },
      countdown(cb) {
        const ov = h('div', { class: 'overlay' });
        el.append(ov);
        const seq = ['3', '2', '1', 'GO'];
        seq.forEach((t, k) => ui.later(() => {
          ov.innerHTML = `<div class="count-num">${t}</div>`;
          sfx(t === 'GO' ? 'go' : 'count');
        }, k * 650));
        ui.later(() => { ov.remove(); cb(); }, seq.length * 650 - 100);
      },
      lock({ label = 'Lock in', onSubmit }) {
        if (!lockBtn) { lockBtn = h('button', { class: 'btn btn-primary btn-lg btn-lock', disabled: true }); answers.append(lockBtn); }
        lockBtn.innerHTML = `${icon('check')}<span>${label}</span>`;
        lockBtn.disabled = true;
        lockBtn.onclick = () => { if (!locked && !lockBtn.disabled) onSubmit(); };
        ui._lockSubmit = () => { if (!locked && !lockBtn.disabled) onSubmit(); };
        return { enable(b) { if (!locked) lockBtn.disabled = !b; }, el: lockBtn };
      },
      choice(items, { cols = 4, cls = '', into = null, letters = false, mobileCols = 0 } = {}) {
        const wrap = h('div', { class: `choices cols-${cols}${mobileCols ? ' m' + mobileCols : ''}` });
        let sel = -1;
        const L = 'ABCDEFGH';
        const btns = items.map((html, i) => {
          const b = h('button', { class: `opt ${cls}`, 'aria-label': `Option ${letters ? L[i] : i + 1}`, html: (letters ? `<span class="opt-l">${L[i]}</span>` : '') + html });
          b.addEventListener('click', () => pick(i));
          wrap.append(b);
          return b;
        });
        (into || answers).append(wrap);
        const hint = h('div', { class: 'choice-hint' });
        answers.append(hint);
        const lk = ui.lock({ label: 'Lock in', onSubmit: () => { if (sel >= 0) ui.submit(sel); } });
        function pick(i) {
          if (locked) return;
          if (sel === i) { ui.submit(i); return; }
          sel = i;
          btns.forEach((b, j) => b.classList.toggle('sel', j === i));
          lk.enable(true);
          sfx('select');
          hint.textContent = 'Tap again or press Lock in';
        }
        ui.onKey(e => {
          const k = e.key.length === 1 ? e.key.toUpperCase() : '';
          let idx = -1;
          if (/^[1-8]$/.test(k)) idx = +k - 1;
          else if (letters && L.includes(k) && k) idx = L.indexOf(k);
          if (idx >= 0 && idx < items.length) { pick(idx); return true; }
          return false;
        });
        ui._choice = {
          btns,
          mark(correct, chosen) {
            btns.forEach((b, j) => {
              b.disabled = true;
              if (j === correct) b.classList.add('correct');
              else if (j === chosen) b.classList.add('wrong');
              else b.classList.add('dim');
            });
            hint.textContent = '';
          },
          freeze() { btns.forEach(b => { b.disabled = true; }); hint.textContent = ''; },
          selected: () => btns[sel],
        };
      },
      keypad({ maxLen = 6, neg = false, exact = 0, spaced = false } = {}) {
        let val = '';
        const kp = h('div', { class: 'kp' });
        const disp = h('div', { class: `kp-display ${spaced ? 'spaced' : ''}`, 'aria-live': 'polite' });
        const grid = h('div', { class: 'kp-grid' });
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', neg ? '±' : '', '0', '⌫'];
        keys.forEach(k => {
          const b = h('button', { class: k === '⌫' || k === '±' ? 'fn' : '', 'aria-label': k === '⌫' ? 'Delete' : k === '±' ? 'Plus minus' : k, html: k || '&nbsp;' });
          if (!k) b.disabled = true; else b.addEventListener('click', () => press(k));
          grid.append(b);
        });
        const ok = h('button', { class: 'ok', html: 'SUBMIT' });
        ok.addEventListener('click', () => { if (valid()) ui.submit(val); });
        grid.append(ok);
        kp.append(disp, grid);
        answers.append(kp);
        const digits = () => val.replace('-', '').length;
        const valid = () => digits() > 0 && (!exact || digits() === exact);
        function paint() {
          disp.innerHTML = val ? `<span class="v">${val.replace('-', '−')}</span><span class="caret"></span>` : `<span class="ph">${exact ? `TYPE ${exact} DIGITS` : 'TYPE YOUR ANSWER'}</span><span class="caret"></span>`;
          ok.disabled = !valid();
        }
        function press(k) {
          if (locked) return;
          if (k === '⌫') val = val.slice(0, -1);
          else if (k === '±') val = val.startsWith('-') ? val.slice(1) : '-' + val;
          else if (digits() < maxLen) val += k;
          sfx('tap');
          paint();
        }
        ui.onKey(e => {
          if (/^[0-9]$/.test(e.key)) { press(e.key); return true; }
          if (e.key === 'Backspace') { press('⌫'); return true; }
          if (e.key === '-' && neg) { press('±'); return true; }
          if (e.key === 'Enter' && valid()) { ui.submit(val); return true; }
          return false;
        });
        paint();
      },
      submit(r) {
        if (locked || finished) return;
        locked = true;
        ui.stopClock();
        if (lockBtn) lockBtn.disabled = true;
        onSubmit(r);
      },
      _cleanup() { timers.forEach(id => clearTimeout(id)); timers.clear(); clearInterval(clock); keyHandlers.length = 0; },
    };
    return ui;
  }

  /* ---------------------------------------------- items */
  function nextItem() {
    if (cfg.items) return cfg.items[st.i] || null;
    if (cfg.next) return cfg.next(st);
    return null;
  }

  async function showItem() {
    const item = nextItem();
    if (!item) { finish(); return; }
    const G = GAMES[item.game];
    const seed = item.seed || (cfg.seedBase ? `${cfg.seedBase}:${st.i}` : randomSeed());
    let p;
    try { p = G.generate(makeRng(seed), item.level); }
    catch (e) { console.error(e); p = G.generate(makeRng(seed + 'x'), item.level); }
    const color = DOMAINS[G.meta.domain].color;
    el.style.setProperty('--gc', color);
    el.classList.toggle('split', G.meta.layout === 'split');
    $('.g-ic').innerHTML = icon(G.meta.icon);
    $('.nm').textContent = G.meta.name;
    $('.badge-lv').textContent = `LV ${item.level}`;
    stage.innerHTML = ''; answers.innerHTML = '';
    statusEl.hidden = true; timerEl.hidden = true;
    stage.scrollTop = 0;
    fx.setMood(color);
    paintPips(); paintHearts(); paintScore();
    if (!S.seen[item.game]) { await showHowTo(item.game, { first: true }); if (finished) return; }
    const ui = makeUI(item, G, p);
    cur = { item, G, p, ui, t0: performance.now(), seed };
    G.render(p, ui);
    if (cfg.timed !== false && !G.meta.selfTimed && G.meta.kind === 'trial') ui.startClock(G.meta.time(item.level));
    cur.t0 = performance.now();
  }

  /* ---------------------------------------------- grading */
  function onSubmit(r) {
    const { item, G, p, ui } = cur;
    const ms = performance.now() - cur.t0;
    const timedOut = r === TIMEOUT;
    const resp = timedOut ? null : r;
    const g = G.grade(p, resp);
    const iq = cfg.mode === 'iq';
    const sprint = G.meta.kind === 'sprint';
    if (ui._choice) { if (iq) ui._choice.freeze(); else ui._choice.mark(answerIndex(item.game, p), timedOut ? -1 : resp); }
    if (!iq && G.reveal) { try { G.reveal(p, ui, resp, g.correct); } catch (e) { console.error(e); } }

    // scoring
    const base = 60 + 10 * item.level;
    let pts = 0;
    if (g.correct) st.combo++; else st.combo = 0;
    st.bestCombo = Math.max(st.bestCombo, st.combo);
    if (st.combo > S.stats.bestCombo) S.stats.bestCombo = st.combo;
    if (sprint) pts = Math.round(base * 2 * g.score);
    else if (g.correct) {
      const lim = G.meta.time(item.level) * 1000;
      const speed = !G.meta.selfTimed && cfg.timed !== false ? Math.max(0, 1 - ms / (0.5 * lim)) * 0.5 : 0;
      pts = Math.round(base * (1 + speed) * (1 + 0.1 * Math.min(st.combo - 1, 10)));
    }
    st.points += pts;
    const xp = Math.round(pts / 8) + (g.correct ? 0 : 2);
    st.xp += xp;
    recordItem({ game: item.game, level: item.level, correct: g.correct, ms, score: g.score, guess: G.meta.guess(p) });
    if (g.correct && p.span) S.stats.bestSpan = Math.max(S.stats.bestSpan || 0, p.span);
    st.results.push({ game: item.game, level: item.level, correct: g.correct, score: g.score, acc: g.acc, ms, timedOut, pts, guess: G.meta.guess(p) });
    if (!g.correct && st.hearts !== null && !sprint) st.hearts--;
    if (cfg.adaptive) {
      if (g.correct) { st.up++; if (st.up >= 2) { st.level = Math.min(10, st.level + 1); st.up = 0; } }
      else { st.level = Math.max(1, st.level - 1); st.up = 0; }
    }
    save();

    // effects
    const color = DOMAINS[G.meta.domain].color;
    if (iq) { sfx('select'); }
    else if (g.correct) {
      sfx('correct'); buzz('good'); fx.fire(color, 8);
      flash('good');
      const target = ui._choice && ui._choice.selected() ? ui._choice.selected() : stage;
      fx.burstAt(target, '#3dffa2', 28);
      if (st.combo >= 3) setTimeout(() => sfx('combo'), 220);
    } else {
      sfx(timedOut ? 'lose' : 'wrong'); buzz('bad'); flash('bad');
      stage.classList.remove('shake-x'); void stage.offsetWidth; stage.classList.add('shake-x');
    }
    paintPips(); paintHearts(); paintScore();

    if (iq) { setTimeout(advance, 420); return; }
    setTimeout(() => showSheet(G, p, resp, g, pts, timedOut, sprint), sprint ? 150 : 380);
  }

  function flash(kind) {
    if (S.settings.reduced) return;
    const f = h('div', { class: `flash ${kind}` });
    el.append(f); setTimeout(() => f.remove(), 520);
  }

  function showSheet(G, p, r, g, pts, timedOut, sprint) {
    if (finished) return;
    const good = g.correct;
    const title = sprint ? (good ? 'Round passed!' : 'Round over') : good ? rnd(['Correct!', 'Brilliant!', 'Nailed it!', 'Sharp!', 'Exactly!']) : timedOut ? "Time's up" : 'Not quite';
    const ans = sprint ? G.answerHTML(p, r) : G.answerHTML(p);
    const why = sprint ? (G.summary ? G.summary(p, r) : '') : p.explain;
    const outOfHearts = st.hearts === 0;
    const isLast = (total && st.i + 1 >= total) || outOfHearts;
    sheetEl = h('div', { class: `sheet ${good ? 'good' : 'bad'}` });
    sheetEl.innerHTML = `<div class="sheet-in" role="dialog" aria-label="${title}">
      <div class="fb-head"><div class="fb-badge">${icon(good ? 'check' : timedOut ? 'timer' : 'x')}</div><div class="fb-title">${title}</div>${pts ? `<div class="fb-pts">+${pts}</div>` : ''}</div>
      ${ans ? `<div class="fb-ans">${sprint ? '' : `<span class="lab">${good ? 'Answer' : 'Correct answer'}</span>`}${ans}</div>` : ''}
      ${why ? (sprint ? `<div class="fb-explain">${why}</div>` : `<details class="fb-why" ${good ? '' : 'open'}><summary>${icon('info')} Why?</summary><div class="fb-explain">${why}</div></details>`) : ''}
      ${outOfHearts ? '<p class="muted" style="margin:12px 0 0">Out of hearts — but every attempt makes you sharper.</p>' : ''}
      <div class="fb-actions"><button class="btn btn-primary btn-lg cont">${isLast ? 'See results' : 'Continue'} ${icon('next')}</button></div>
    </div>`;
    el.append(sheetEl);
    const btn = sheetEl.querySelector('.cont');
    btn.addEventListener('click', advance);
    setTimeout(() => btn.focus({ preventScroll: true }), 60);
  }
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  function advance() {
    if (finished) return;
    if (sheetEl) { const s = sheetEl; s.classList.add('out'); setTimeout(() => s.remove(), 260); sheetEl = null; }
    if (cur) cur.ui._cleanup();
    st.i++;
    if (st.hearts === 0 || (total && st.i >= total)) { finish(); return; }
    sfx('whoosh');
    showItem();
  }

  /* ---------------------------------------------- finish */
  function finish() {
    if (finished) return;
    finished = true;
    if (cur) cur.ui._cleanup();
    fx.setMood(null);
    fx.setCalm(false);
    const summary = {
      mode: cfg.mode, title: cfg.title, node: cfg.node ?? null, gameId: cfg.gameId || null, train: cfg.train || null,
      results: st.results, points: st.points, xp: st.xp, bestCombo: st.bestCombo,
      timeMs: Date.now() - st.t0, outOfHearts: st.hearts === 0, total: total || st.results.length,
    };
    if (cfg.onFinish) cfg.onFinish(summary);
    else go('result', { summary }, { replace: true });
  }

  /* ---------------------------------------------- pause / quit */
  async function pause() {
    if (paused || finished) return;
    paused = true;
    const selfTimed = cur && cur.G.meta.selfTimed;
    if (cur) cur.ui.pauseClock();
    stage.style.filter = 'blur(10px)';
    const actions = [{ label: `${icon('play')} Resume`, value: 'resume', cls: 'btn-primary' }];
    if (cfg.mode !== 'iq' && cfg.mode !== 'daily') actions.push({ label: `${icon('refresh')} Restart`, value: 'restart' });
    actions.push({ label: `${icon('close')} Quit`, value: 'quit', cls: 'btn-danger' });
    const v = await modal({
      title: 'Paused',
      body: cfg.mode === 'iq' ? '<p>Quitting ends the test without a score.</p>' : selfTimed ? '<p>Resuming restarts this round from the beginning.</p>' : '<p>Take a breath. The clock is frozen.</p>',
      actions, dismiss: true,
    });
    stage.style.filter = '';
    paused = false;
    if (finished) return;
    if (v === 'quit') { finished = true; if (cur) cur.ui._cleanup(); fx.setCalm(false); go(cfg.quitTo || 'home', {}, { replace: true }); return; }
    if (v === 'restart') { if (cur) cur.ui._cleanup(); finished = true; go('play', cfg, { replace: true }); return; }
    if (selfTimed && cur && !cur.ui.locked) {
      cur.ui._cleanup();
      stage.innerHTML = ''; answers.innerHTML = '';
      const ui = makeUI(cur.item, cur.G, cur.p);
      cur.ui = ui; cur.t0 = performance.now();
      cur.G.render(cur.p, ui);
    } else if (cur) cur.ui.resumeClock();
  }

  $('.quit').addEventListener('click', pause);
  $('.help').addEventListener('click', async () => {
    if (!cur) return;
    cur.ui.pauseClock();
    await showHowTo(cur.item.game, { first: false });
    if (!cur.ui.locked) cur.ui.resumeClock();
  });

  const onKey = e => {
    if (document.querySelector('.modal-back')) return;
    if (e.key === 'Escape') { e.preventDefault(); pause(); return; }
    if (sheetEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); return; }
    if (!cur || cur.ui.locked) return;
    for (const fn of keyHandlers.slice()) if (fn(e)) { e.preventDefault(); return; }
    if (e.key === 'Enter' && cur.ui._lockSubmit) { e.preventDefault(); cur.ui._lockSubmit(); }
  };

  return {
    el,
    enter() {
      document.addEventListener('keydown', onKey);
      fx.setCalm(true);
      const first = nextItem();
      if (first && cfg.banner !== false) {
        const G = GAMES[first.game];
        const ov = h('div', { class: 'overlay' });
        ov.innerHTML = `<div class="banner" style="--gc:${DOMAINS[G.meta.domain].color}"><small>${cfg.kicker || ''}</small><b>${cfg.title || G.meta.title}</b></div>`;
        el.append(ov);
        setTimeout(() => ov.remove(), 1300);
        sfx('open');
      }
      showItem();
    },
    leave() {
      document.removeEventListener('keydown', onKey);
      if (cur) cur.ui._cleanup();
      finished = true;
      fx.setCalm(false);
      fx.setMood(null);
    },
    onBack() { if (finished) return false; pause(); return true; },
  };
}
