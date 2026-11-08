import { GAMES, DOMAINS } from '../core/catalog.js';
import { S, save } from '../core/store.js';
import { icon, modal } from '../core/ui.js';

const TIPS = {
  sequence: 'Tip: you can type on your keyboard too — Enter submits.',
  symbols: 'Tip: you can type on your keyboard too — Enter submits.',
  balance: 'Tip: you can type on your keyboard too — Enter submits.',
  truth: 'Tip: try assuming one robot is a Truthbot and follow the consequences — a contradiction tells you it lies.',
  lineup: 'Tip: start with the most restrictive clues — ends, fixed positions and "directly" clues.',
  codelock: 'Tip: "Nothing is correct" lines rule out digits everywhere. Type digits on the keyboard, arrows move between dials.',
  corsi: 'The clock starts when it is your turn to answer.',
  digitspan: 'The clock starts when it is your turn to type. Turn on "Speak digits" in Settings to hear them too.',
  stroop: 'A 3-2-1 countdown, then go! Keys 1–5 also work.',
  compare: 'A 3-2-1 countdown, then go! The ← and → keys also work.',
};

export async function showHowTo(id, { first = false } = {}) {
  const G = GAMES[id], D = DOMAINS[G.meta.domain];
  const body = `
    <div class="gsheet" style="--gc:${D.color}">
      <div class="gs-head"><div class="g-ic">${icon(G.meta.icon)}</div>
        <div><span class="chip" style="color:${D.color}">${icon(D.icon)} ${D.long}</span><h2 style="margin-top:6px">${G.meta.title}</h2></div></div>
      <ol class="howto">${G.meta.howTo.map(t => `<li>${t}</li>`).join('')}</ol>
      <p class="muted">${TIPS[id] || (G.meta.kind === 'sprint' ? 'This is a timed sprint: a quick countdown, then go!' : 'Tip: tap an option twice (or press Enter) to lock it in. Keys 1–8 pick options.')}</p>
    </div>`;
  await modal({ title: first ? 'New trial unlocked' : 'How to play', body, actions: [{ label: first ? `Let's go ${icon('next')}` : 'Got it', value: 1, cls: 'btn-primary' }], dismiss: !first, cls: 'wide' });
  S.seen[id] = true;
  save();
}
