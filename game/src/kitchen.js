// The game's rules and state, with no drawing and no browser in it: the
// order board, the plate being assembled, the wok, the pass shelf, the shift
// timer, score, combo and strikes. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react (and play sounds)
// without the kitchen knowing about screens or speakers.

import {
  BOARD_SLOTS,
  COOK_SECONDS,
  INGREDIENTS,
  ORDER_INTERVAL,
  ORDER_PATIENCE,
  PASS_SLOTS,
  RECIPES,
  SCORE,
  SHIFT_SECONDS,
  STRIKES_MAX,
} from './config.js';

export const EVENT_ORDER = 1;
export const EVENT_COOK_DONE = 2;
export const EVENT_SERVED = 4;
export const EVENT_EXPIRED = 8;
export const EVENT_OVER = 16;
export const EVENT_WRONG = 32;

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) ?? null;
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

/** The dish a set of ingredients makes, or null when it matches no recipe. */
export function matchRecipe(ids) {
  if (ids.length !== 4) return null;
  const sorted = [...ids].sort().join(',');
  return RECIPES.find((recipe) => [...recipe.needs].sort().join(',') === sorted) ?? null;
}

function pickRecipe(random, avoidId) {
  const pool = RECIPES.filter((recipe) => recipe.id !== avoidId);
  return pool[Math.floor(random() * pool.length)];
}

export function createKitchen(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    strikes: 0,
    served: 0,
    orders: [],
    plate: [],
    cooking: null,
    pass: [],
    orderTimer: 4,
    lastServe: null,
    lastServeAt: 0,
    over: false,
    overReason: '',
  };
  let orderSerial = 0;

  function spawnOrder() {
    if (state.orders.length >= BOARD_SLOTS) return false;
    const avoid = state.orders.length > 0 ? state.orders[state.orders.length - 1].recipeId : '';
    const recipe = pickRecipe(random, avoid);
    orderSerial += 1;
    state.orders.push({
      id: orderSerial,
      recipeId: recipe.id,
      patience: ORDER_PATIENCE,
      patienceMax: ORDER_PATIENCE,
    });
    return true;
  }

  function orderInterval() {
    const minutes = state.elapsed / 60;
    return Math.max(
      ORDER_INTERVAL.min,
      ORDER_INTERVAL.start - ORDER_INTERVAL.shrinkPerMinute * minutes,
    );
  }

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.strikes = 0;
    state.served = 0;
    state.orders = [];
    state.plate = [];
    state.cooking = null;
    state.pass = [];
    state.orderTimer = 4;
    state.lastServe = null;
    state.over = false;
    state.overReason = '';
    orderSerial = 0;
    spawnOrder();
    spawnOrder();
  }

  /** Add one ingredient to the plate. Returns 'ok' | 'full' | 'wrong' | 'busy'. */
  function addIngredient(id) {
    if (state.over) return 'busy';
    if (state.cooking !== null) return 'busy';
    if (state.plate.length >= 4) return 'full';
    const recipe = matchRecipe([...state.plate, id]);
    const wanted = state.orders.some((order) => {
      const wantedRecipe = recipeById(order.recipeId);
      return wantedRecipe.needs.includes(id) && !state.plate.includes(id);
    });
    state.plate.push(id);
    if (!wanted && recipe === null) return 'wrong';
    return 'ok';
  }

  /** Throw the plate's contents away and start over. */
  function trashPlate() {
    if (state.cooking !== null || state.plate.length === 0) return false;
    state.plate = [];
    state.combo = 0;
    return true;
  }

  /** Send the plate to the wok. Returns false when there is nothing to cook. */
  function startCooking() {
    if (state.over || state.cooking !== null) return false;
    if (state.plate.length === 0 || state.pass.length >= PASS_SLOTS) return false;
    state.cooking = { ids: [...state.plate], progress: 0, total: COOK_SECONDS };
    state.plate = [];
    return true;
  }

  /**
   * Serve the first pass dish that matches an open order. Returns the served
   * dish and its order, or null when nothing on the pass matches any ticket.
   */
  function serve() {
    if (state.over) return null;
    for (let passIndex = 0; passIndex < state.pass.length; passIndex += 1) {
      const dish = state.pass[passIndex];
      const orderIndex = state.orders.findIndex((order) => order.recipeId === dish.recipeId);
      if (orderIndex === -1) continue;
      const order = state.orders[orderIndex];
      const patienceLeft = Math.max(0, order.patience / order.patienceMax);
      const gained = SCORE.base + Math.round(SCORE.patienceBonus * patienceLeft) + state.combo * SCORE.comboStep;
      state.score += gained;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.served += 1;
      state.orders.splice(orderIndex, 1);
      state.pass.splice(passIndex, 1);
      state.lastServe = { dishName: recipeById(dish.recipeId).name, points: gained, combo: state.combo };
      state.lastServeAt = state.elapsed;
      return { dish, order, points: gained };
    }
    return null;
  }

  function endShift(reason) {
    state.over = true;
    state.overReason = reason;
  }

  /** One fixed step. Returns event flags for the caller to react to. */
  function step(dt) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    if (state.timeLeft <= 0) {
      endShift('Shift selesai — waktunya habis!');
      return events | EVENT_OVER;
    }

    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      if (spawnOrder()) events |= EVENT_ORDER;
      state.orderTimer += orderInterval();
    }

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(index, 1);
        state.strikes += 1;
        state.combo = 0;
        events |= EVENT_EXPIRED;
        if (state.strikes >= STRIKES_MAX) {
          endShift('Tiga pesanan kabur — dapur kewalahan!');
          return events | EVENT_OVER;
        }
      }
    }

    if (state.cooking !== null) {
      state.cooking.progress += dt;
      if (state.cooking.progress >= state.cooking.total) {
        const recipe = matchRecipe(state.cooking.ids);
        if (recipe !== null && state.pass.length < PASS_SLOTS) {
          state.pass.push({ recipeId: recipe.id, ids: [...state.cooking.ids] });
          events |= EVENT_COOK_DONE;
        } else {
          events |= EVENT_WRONG;
        }
        state.cooking = null;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, addIngredient, trashPlate, startCooking, serve };
}
