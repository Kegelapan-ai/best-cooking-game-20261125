// Staged scenes for screenshots: ?shot=start|play|serve|end (with &seed=N)
// builds a fixed kitchen state instead of running the loop, paints it twice
// and sets window.__shotReady, so a screenshot is a real render of the
// game's own code. Every staged scene shows the full kitchen: order board,
// ingredients on the counter, a dish mid-assembly, the timer and a plate
// ready to serve.

import { SCREEN_PLAY } from './render.js';

function setOrders(kitchen, recipeIds, patiences) {
  kitchen.state.orders = recipeIds.map((recipeId, i) => ({
    id: i + 1,
    recipeId,
    patience: patiences[i],
    patienceMax: 48,
  }));
}

export function stageShot(name, kitchen) {
  const state = kitchen.state;
  kitchen.reset();
  if (name === 'start') {
    // Opening moment of the shift: no title card over the kitchen, so the
    // cover shows the whole game at once — order board, ingredients on the
    // counter, a dish half-built on the plate, the wok hot, a finished dish
    // on the pass, and the timer at 2:30 with score 0.
    setOrders(kitchen, ['nasi-goreng', 'mie-ayam'], [42, 30]);
    state.plate = ['nasi', 'telur'];
    state.cooking = { ids: ['mie', 'ayam', 'sayur', 'kecap'], progress: 1.8, total: 3 };
    state.pass = [{ recipeId: 'gado-gado', ids: ['sayur', 'telur', 'tomat', 'kecap'] }];
    state.score = 0;
    state.timeLeft = 150;
    state.elapsed = 0;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play') {
    // Mid-shift rush: three tickets, a dish mid-assembly, the wok cooking,
    // one finished dish on the pass, timer running, score and combo up.
    setOrders(kitchen, ['nasi-goreng', 'mie-ayam', 'soto-ayam'], [36, 22, 44]);
    state.plate = ['nasi', 'telur'];
    state.cooking = { ids: ['ayam', 'kecap', 'cabai', 'nasi'], progress: 1.2, total: 3 };
    state.pass = [{ recipeId: 'mie-ayam', ids: ['mie', 'ayam', 'sayur', 'kecap'] }];
    state.score = 350;
    state.combo = 2;
    state.bestCombo = 2;
    state.served = 3;
    state.timeLeft = 107;
    state.elapsed = 43;
    return { screen: SCREEN_PLAY, best: 350 };
  }
  if (name === 'serve') {
    // The serve moment: the pass dish matches the first ticket, the score
    // popup names that same dish (Nasi Goreng, just served — a second one
    // is already cooked and waiting on the pass for the next ticket), and
    // the plate already holds the next dish's first ingredients.
    setOrders(kitchen, ['nasi-goreng', 'gado-gado', 'ayam-kecap'], [40, 18, 33]);
    state.plate = ['ayam', 'kecap'];
    state.pass = [{ recipeId: 'nasi-goreng', ids: ['nasi', 'telur', 'ayam', 'cabai'] }];
    state.score = 512;
    state.combo = 3;
    state.bestCombo = 3;
    state.served = 4;
    state.timeLeft = 88;
    state.elapsed = 62;
    state.lastServe = { dishName: 'Nasi Goreng', points: 162, combo: 3 };
    state.lastServeAt = state.elapsed;
    return { screen: SCREEN_PLAY, best: 512 };
  }
  // end: the final seconds of the shift — a full-kitchen rush, not the
  // game-over card. The old version staged SCREEN_OVER, whose modal covered
  // most of the kitchen, so the fourth screenshot showed almost no kitchen,
  // board, ingredients or pass shelf. This one keeps everything visible:
  // three tickets (one about to walk out), a dish 3/4 built on the plate,
  // the wok nearly done, a finished dish on the pass matching a ticket, and
  // the timer at 0:12 in red. The real game-over card still exists in live
  // play (drawGameOver); it just is not what the cover set shows.
  setOrders(kitchen, ['nasi-goreng', 'mie-ayam', 'ayam-kecap'], [6, 14, 28]);
  state.plate = ['nasi', 'telur', 'ayam'];
  state.cooking = { ids: ['ayam', 'kecap', 'cabai', 'nasi'], progress: 2.4, total: 3 };
  state.pass = [{ recipeId: 'mie-ayam', ids: ['mie', 'ayam', 'sayur', 'kecap'] }];
  state.score = 1180;
  state.combo = 4;
  state.bestCombo = 4;
  state.served = 8;
  state.strikes = 1;
  state.timeLeft = 12;
  state.elapsed = 138;
  return { screen: SCREEN_PLAY, best: 1180 };
}
