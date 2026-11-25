# Dapur Kilat — Game Masak

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Kegelapan-ai/best-cooking-game-20261125/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Kegelapan-ai/best-cooking-game-20261125/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

An entry for the [make.fun bounty “Make the best cooking game”](https://make.fun/bounty/best-cooking-game-20261125-0137): a complete, original cooking game that plays offline in a desktop browser from static files.

## The game

You run a small Indonesian kitchen for one 2½-minute shift. Orders land on the board with a patience timer; each dish is a set of four ingredients. Click the ingredients on the counter (or press keys 1–8) to build the dish on the plate, cook it in the wok (C), then serve the finished dish from the pass shelf (Enter) to the matching order before the customer walks out. Serve fast for a patience bonus, chain serves for a combo, and don't let three orders expire — that ends the shift.

Five original recipes: Nasi Goreng, Mie Ayam, Soto Ayam, Gado-Gado, and Ayam Kecap. Wrong ingredients land on the plate too — trash them (X) and start over. Every sound is synthesised in the browser with WebAudio; the art is drawn shapes and emoji, so the game loads no files from the network.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static server. Keyboard: 1–8 ingredients, C cook, Enter serve, X trash, P pause, M mute. Mouse works for everything too.

## Files

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` + `game/src/` — the game itself: `config.js` (recipes, tuning), `kitchen.js` (orders, plate, wok, pass, score), `render.js` (all drawing), `input.js` (keyboard + mouse), `audio.js` (synth sounds), `random.js` (seeded RNG), `shots.js` (staged screenshot scenes), `main.js` (boot and loop).
- `screenshots/` — 4 real renders of the game's own code: the shift start, mid-shift rush, the serve moment, and the final-seconds rush.
- `shots.json` — the `?shot=` scenes each screenshot was taken from.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
