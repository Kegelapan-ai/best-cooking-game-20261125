// Boot and the one loop: input is read every frame, the kitchen advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over. Clicks land on the ingredient bins, the cook
// and serve buttons, the trash and the pass plates; keys 1-8, C, Enter, X,
// P and M do the same.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. 'end' stages the final seconds of
// the shift as live gameplay (timer 0:12), not the game-over card, so the
// kitchen stays fully visible in the screenshot.
import { BEST_KEY, INGREDIENTS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_COOK_DONE,
  EVENT_EXPIRED,
  EVENT_ORDER,
  EVENT_OVER,
  EVENT_WRONG,
  createKitchen,
} from './kitchen.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_COOK,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_SERVE,
  ACTION_TRASH,
  createInput,
} from './input.js';
import {
  LAYOUT,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function inside(point, rect) {
  return point && point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Bermain. Sajikan pesanan sebelum pelanggan kabur.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (kitchen.state.score > best) {
      best = kitchen.state.score;
      saveBest(best);
    }
    audio.over();
    announce(`Shift selesai. Skor ${kitchen.state.score}. Terbaik ${best}.`);
  }

  function addIngredient(index) {
    const ingredient = INGREDIENTS[index];
    if (!ingredient) return;
    const result = kitchen.addIngredient(ingredient.id);
    if (result === 'ok') audio.add();
    else if (result === 'wrong') { audio.error(); announce(`${ingredient.name} tidak dipesan — buang dengan X bila salah racik.`); }
    else if (result === 'full') audio.error();
  }

  function cook() {
    if (kitchen.startCooking()) audio.cook();
    else audio.error();
  }

  function serve() {
    const served = kitchen.serve();
    if (served) {
      audio.serve();
      announce(`${served.points} poin: pesanan tersaji.`);
    } else {
      audio.error();
      announce('Belum ada hidangan di meja saji yang cocok dengan pesanan.');
    }
  }

  function handleClick(point) {
    if (!point) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    audio.unlock();
    for (let i = 0; i < LAYOUT.bins.length; i += 1) {
      if (inside(point, LAYOUT.bins[i])) { addIngredient(i); return; }
    }
    if (inside(point, LAYOUT.cook)) { cook(); return; }
    if (inside(point, LAYOUT.serve)) { serve(); return; }
    if (inside(point, LAYOUT.trash)) {
      if (kitchen.trashPlate()) audio.chop();
      return;
    }
    for (const slot of LAYOUT.pass) {
      if (inside(point, slot)) { serve(); return; }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const ingredientKey = input.takeIngredientKey();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Jeda.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Bermain.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        announce('Bermain.');
      }
      return;
    }
    if (ingredientKey !== null) addIngredient(ingredientKey);
    if (actions & ACTION_COOK) cook();
    if (actions & ACTION_SERVE) serve();
    if (actions & ACTION_TRASH && kitchen.trashPlate()) audio.chop();
    handleClick(click);
  }

  function step() {
    const events = kitchen.step(STEP);
    if (events & EVENT_ORDER) audio.order();
    if (events & EVENT_COOK_DONE) audio.ready();
    if (events & EVENT_EXPIRED) {
      audio.error();
      announce('Satu pesanan kabur! Satu hati hilang.');
    }
    if (events & EVENT_WRONG) audio.error();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
