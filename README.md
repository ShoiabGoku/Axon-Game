# AXON — Neural Trials

An installable brain game (PWA) that tests **reasoning, logic, quantitative skill, spatial ability,
working memory and processing speed** — with an adaptive IQ test, a 60-node campaign, daily
challenges, training mode, ranks, trophies and a neural ability profile.

No build step, no dependencies, no accounts. Works offline once installed.

## The 15 trials

| Domain | Trials |
|---|---|
| Pattern | Matrix Reasoning (procedural 3×3 matrices) · Number Sequences · Odd One Out |
| Logic | Verdict (syllogisms + propositional logic) · Truthbots & Glitchbots · Line-Up · Code Lock |
| Numeric | Symbol Math · Balance Scales |
| Spatial | Mental Rotation (2D polyominoes, 3D cube figures) · Cube Folding |
| Memory | Pulse Path (spatial span) · Digit Span (forward / reverse / sequencing) |
| Speed | Colour Clash (Stroop with rule switching) · Quick Compare |

Every trial has 10 difficulty levels and a worked explanation after each answer.

## Every puzzle is generated — and proven to have exactly one answer

Puzzles are built from a seed and checked by a solver before they are shown:

- **Matrices** — every attribute is re-derived from the 8 visible tiles under every rule family
  (row- *and* column-wise); options form a balanced attribute tree (I-RAVEN style) so the answer
  can't be guessed from the options alone.
- **Sequences** — 19 rule families are fitted; all fitting families must agree on the missing term.
- **Logic** — verdicts come from enumerating every Venn model / truth-table row; truth-teller,
  line-up and code-lock puzzles are brute-forced to a unique solution, then minimised.
- **Spatial** — distractors are checked against all 24 cube rotations; 3D views are rasterised to
  reject hidden cubes; cube nets are derived by rolling a cube over every hexomino.

`tests/verify.js` regenerates thousands of puzzles and re-checks them with independent solvers.

## The IQ estimate

A computerised adaptive test (quick: 12 questions, full: 24) scored with a 3-parameter item
response model and an EAP ability estimate; IQ = 100 + 15θ, reported with a 90% range and a
percentile. `tests/simulate-iq.js` runs thousands of simulated test-takers of known ability:
the estimate is unbiased mid-scale, with an RMS error of about 7 points (quick) / 5 points (full),
and the reported uncertainty matches the observed spread.

Item difficulties are calibrated **by design**, not normed on a tested population, so the score
is a practice estimate — not a clinical assessment. The app says so wherever the score appears.

## Run it

```bash
node tools/serve.js 8795
```

Open <http://localhost:8795/?nosw> while developing (`?nosw` removes any service worker and its
cache so edits show immediately). Any static host works for production, e.g. GitHub Pages.

## Test

```bash
node tests/verify.js          # quick: 60 puzzles per game per level
node tests/verify.js --n=300  # thorough
node tests/simulate-iq.js     # Monte-Carlo check of the adaptive IQ test
```

## Release rule

The service worker is cache-first. **Whenever any file changes, bump `VERSION` in `sw.js`**, and
keep its `CORE` list complete — `tests/verify.js` fails if a shipped file is missing from it.
Players then get an "Update ready" toast.

Icons are rendered from `icons/icon.svg` with headless Edge/Chrome: `node tools/make-icons.js`.

## Layout

```
index.html  manifest.webmanifest  sw.js
css/style.css
js/app.js  js/nav.js
js/core/    rng, draw, poly (2D/3D geometry), irt, cat (adaptive test), catalog, campaign,
            store (save, XP, achievements), audio (synthesised SFX + music), fx (neural background), ui, pwa
js/games/   one module per trial: meta · generate(rng, level) · render(p, ui) · grade · explanation
js/screens/ title, home, map, train, play (session engine), result, iq, daily, profile, settings
tests/      verify.js, simulate-iq.js
tools/      serve.js, make-icons.js
```
