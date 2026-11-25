// Every tuning number, recipe and colour in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no
// rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** One shift lasts this long; when it ends the game is over. */
export const SHIFT_SECONDS = 150;

/** A missed or expired order costs one of these; three ends the shift. */
export const STRIKES_MAX = 3;

/** Seconds an order waits on the board before it walks out. */
export const ORDER_PATIENCE = 48;

/** Seconds between new orders arriving; shrinks as the rush grows. */
export const ORDER_INTERVAL = { start: 13, min: 7, shrinkPerMinute: 1.5 };

/** Seconds the wok needs to turn a plated set of ingredients into a dish. */
export const COOK_SECONDS = 3;

/** How many finished dishes the pass shelf holds at once. */
export const PASS_SLOTS = 2;

/** At most this many tickets wait on the order board. */
export const BOARD_SLOTS = 3;

/** Score for a served dish: base + patience left + combo bonus each. */
export const SCORE = { base: 100, patienceBonus: 100, comboStep: 25, wrongIngredient: -10 };

/** The eight ingredients on the counter, in key order 1-8. */
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', key: '1', icon: '🍚', colour: '#f5f0dc' },
  { id: 'mie', name: 'Mie', key: '2', icon: '🍜', colour: '#f2c94c' },
  { id: 'ayam', name: 'Ayam', key: '3', icon: '🍗', colour: '#e07840' },
  { id: 'telur', name: 'Telur', key: '4', icon: '🥚', colour: '#fdf3d0' },
  { id: 'sayur', name: 'Sayur', key: '5', icon: '🥬', colour: '#5fbf5a' },
  { id: 'tomat', name: 'Tomat', key: '6', icon: '🍅', colour: '#e5534b' },
  { id: 'cabai', name: 'Cabai', key: '7', icon: '🌶️', colour: '#d7263d' },
  { id: 'kecap', name: 'Kecap', key: '8', icon: '🍶', colour: '#6b4226' },
];

/** The menu: every dish is a set of four ingredients, in any order. */
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', needs: ['nasi', 'telur', 'ayam', 'cabai'], icon: '🍛', price: 100 },
  { id: 'mie-ayam', name: 'Mie Ayam', needs: ['mie', 'ayam', 'sayur', 'kecap'], icon: '🍜', price: 100 },
  { id: 'soto-ayam', name: 'Soto Ayam', needs: ['ayam', 'mie', 'telur', 'tomat'], icon: '🍲', price: 100 },
  { id: 'gado-gado', name: 'Gado-Gado', needs: ['sayur', 'telur', 'tomat', 'kecap'], icon: '🥗', price: 100 },
  { id: 'ayam-kecap', name: 'Ayam Kecap', needs: ['ayam', 'kecap', 'cabai', 'nasi'], icon: '🍗', price: 100 },
];

export const PALETTE = {
  wall: '#f7e8c9',
  wallTop: '#e8b04b',
  floor: '#c98f4e',
  counter: '#8a5a2b',
  counterTop: '#a9743c',
  board: '#3b2f23',
  boardPaper: '#fff8e7',
  ticket: '#fff3d6',
  ticketDone: '#d9f2c2',
  plate: '#f8f9fa',
  plateRim: '#d64545',
  wok: '#2f333a',
  flame: '#ff9f1c',
  flameHot: '#e5534b',
  text: '#2b2118',
  textLight: '#fff8e7',
  muted: '#7a6a58',
  good: '#2e9e4f',
  bad: '#d7263d',
  gold: '#f2c94c',
  panel: '#fff8e7',
  shadow: 'rgba(43,33,24,0.25)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';
