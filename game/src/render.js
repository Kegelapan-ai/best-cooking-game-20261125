// Everything the player sees, painted on one canvas in a fixed 1280x720
// logical field that scales to the window. No images: the kitchen, the food
// and the chef are drawn shapes and emoji, so the game needs no assets.

import { FIELD, INGREDIENTS, PALETTE, FONT, RECIPES } from './config.js';
import { ingredientById, matchRecipe, recipeById } from './kitchen.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

/** Clickable regions, in logical-field coordinates, for the caller to hit-test. */
export const LAYOUT = {
  bins: INGREDIENTS.map((_, i) => ({ x: 36 + i * 154, y: 492, w: 142, h: 138 })),
  cook: { x: 90, y: 388, w: 220, h: 56 },
  serve: { x: 970, y: 388, w: 220, h: 56 },
  trash: { x: 560, y: 388, w: 160, h: 56 },
  pass: [{ x: 900, y: 234, w: 150, h: 138 }, { x: 1070, y: 234, w: 150, h: 138 }],
  plate: { x: 470, y: 216, w: 360, h: 220 },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, weight = 700, align = 'left') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function patienceColour(fraction) {
  if (fraction > 0.5) return PALETTE.good;
  if (fraction > 0.25) return '#e8a13a';
  return PALETTE.bad;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawBackground() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, 10);
    // Wall tiles.
    ctx.strokeStyle = 'rgba(139,90,43,0.16)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 470); ctx.stroke();
    }
    for (let y = 90; y <= 470; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    // Floor strip behind the counter.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 470, FIELD.width, 250);
  }

  function drawTopBar(state, best) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 0, FIELD.width, 64);
    text(ctx, '🍛 DAPUR KILAT', 24, 33, 28, PALETTE.textLight, 800);
    const low = state.timeLeft <= 30;
    text(ctx, `⏱ ${formatTime(state.timeLeft)}`, 640, 33, 30, low ? '#ff8a7a' : PALETTE.textLight, 800, 'center');
    text(ctx, `SKOR ${state.score}`, 880, 26, 22, PALETTE.gold, 800);
    text(ctx, `TERBAIK ${best}`, 880, 50, 14, PALETTE.textLight, 600);
    const combo = state.combo > 1 ? `🔥 KOMBO x${state.combo}` : 'KOMBO —';
    text(ctx, combo, 1060, 26, 20, state.combo > 1 ? '#ff9f1c' : '#b8a894', 800);
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < 3 - state.strikes ? '❤️' : '🖤';
    text(ctx, hearts, 1060, 50, 18, PALETTE.textLight, 700);
  }

  function drawOrderBoard(state, now) {
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, 24, 76, 1232, 122, 14);
    ctx.fill();
    text(ctx, '📋 PAPAN PESANAN', 44, 100, 18, PALETTE.textLight, 800);
    text(ctx, 'Sajikan hidangan yang cocok sebelum pelanggan kabur!', 260, 100, 15, '#cbb894', 600);
    for (let slot = 0; slot < 3; slot += 1) {
      const x = 44 + slot * 404;
      const order = state.orders[slot];
      ctx.fillStyle = order ? PALETTE.ticket : 'rgba(255,248,231,0.14)';
      roundRect(ctx, x, 112, 384, 74, 10);
      ctx.fill();
      if (!order) {
        text(ctx, '— slot kosong —', x + 192, 149, 16, '#cbb894', 600, 'center');
        continue;
      }
      const recipe = recipeById(order.recipeId);
      const fraction = Math.max(0, order.patience / order.patienceMax);
      const ready = state.pass.some((dish) => dish.recipeId === order.recipeId);
      text(ctx, `${recipe.icon} ${recipe.name}`, x + 14, 132, 20, PALETTE.text, 800);
      text(ctx, ready ? '✅ SIAP DISAJIKAN!' : `⏳ ${Math.ceil(order.patience)} dtk`, x + 370, 132, 16, ready ? PALETTE.good : patienceColour(fraction), 800, 'right');
      // Needed ingredients as small chips.
      recipe.needs.forEach((id, i) => {
        const ingredient = ingredientById(id);
        const onPlate = state.plate.includes(id);
        ctx.fillStyle = onPlate ? '#d9f2c2' : '#efe3c8';
        ctx.beginPath();
        ctx.arc(x + 30 + i * 62, 164, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ingredient.icon, x + 30 + i * 62, 165);
      });
      // Patience bar.
      ctx.fillStyle = '#e5d9bd';
      roundRect(ctx, x + 268, 156, 102, 14, 7);
      ctx.fill();
      ctx.fillStyle = patienceColour(fraction);
      const pulse = fraction <= 0.25 ? 0.6 + 0.4 * Math.sin(now * 8) : 1;
      ctx.globalAlpha = pulse;
      roundRect(ctx, x + 268, 156, 102 * fraction, 14, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawWok(state, now) {
    const box = { x: 60, y: 216, w: 300, h: 160 };
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fill();
    text(ctx, '🔥 KOMPOR & WAJAN', box.x + 150, box.y + 20, 16, '#fff8e7', 800, 'center');
    // Flame under the wok, flickering.
    if (state.cooking) {
      const flicker = 0.75 + 0.25 * Math.sin(now * 14);
      ctx.fillStyle = PALETTE.flameHot;
      ctx.beginPath();
      ctx.moveTo(box.x + 90, box.y + 128);
      ctx.quadraticCurveTo(box.x + 150, box.y + 78 * flicker, box.x + 210, box.y + 128);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.flame;
      ctx.beginPath();
      ctx.moveTo(box.x + 110, box.y + 128);
      ctx.quadraticCurveTo(box.x + 150, box.y + 92 * flicker, box.x + 190, box.y + 128);
      ctx.closePath();
      ctx.fill();
    }
    // Wok.
    ctx.fillStyle = PALETTE.wok;
    ctx.beginPath();
    ctx.ellipse(box.x + 150, box.y + 108, 82, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a5058';
    ctx.beginPath();
    ctx.ellipse(box.x + 150, box.y + 102, 72, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.cooking) {
      const recipe = matchRecipe(state.cooking.ids);
      const label = recipe ? recipe.icon : '❓';
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, box.x + 150, box.y + 100);
      const fraction = state.cooking.progress / state.cooking.total;
      ctx.fillStyle = '#e5d9bd';
      roundRect(ctx, box.x + 40, box.y + 138, 220, 12, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.flame;
      roundRect(ctx, box.x + 40, box.y + 138, 220 * fraction, 12, 6);
      ctx.fill();
      text(ctx, `MEMASAK… ${Math.ceil(state.cooking.total - state.cooking.progress)}`, box.x + 150, box.y + 66, 15, '#fff8e7', 700, 'center');
    } else {
      text(ctx, 'Wajan kosong', box.x + 150, box.y + 100, 16, '#cbb894', 600, 'center');
    }
    // Cook button.
    const cook = LAYOUT.cook;
    const canCook = state.plate.length > 0 && state.cooking === null && state.pass.length < 2;
    ctx.fillStyle = canCook ? '#e07840' : '#9a8a76';
    roundRect(ctx, cook.x, cook.y, cook.w, cook.h, 12);
    ctx.fill();
    text(ctx, '🔥 MASAK  [C]', cook.x + cook.w / 2, cook.y + 29, 20, '#ffffff', 800, 'center');
  }

  function drawPlate(state) {
    const box = LAYOUT.plate;
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, box.x - 20, box.y - 14, box.w + 40, box.h + 28, 12);
    ctx.fill();
    text(ctx, '🍽️ PIRING RACIKAN', box.x + box.w / 2, box.y + 8, 16, '#fff8e7', 800, 'center');
    // The plate itself.
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + 128, 150, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.plateRim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + 128, 150, 62, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (state.plate.length === 0) {
      text(ctx, 'Piring kosong — klik bahan di bawah', box.x + box.w / 2, box.y + 128, 15, PALETTE.muted, 600, 'center');
    } else {
      const recipe = matchRecipe(state.plate);
      state.plate.forEach((id, i) => {
        const ingredient = ingredientById(id);
        const cx = box.x + 90 + i * 62;
        const cy = box.y + 128;
        ctx.fillStyle = ingredient.colour;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ingredient.icon, cx, cy + 1);
      });
      if (state.plate.length === 4) {
        text(ctx, recipe ? `✨ ${recipe.name} — siap dimasak!` : '❓ Bukan resep — buang saja', box.x + box.w / 2, box.y + 34, 16, recipe ? PALETTE.good : PALETTE.bad, 800, 'center');
      } else {
        text(ctx, `${state.plate.length}/4 bahan di piring`, box.x + box.w / 2, box.y + 34, 15, PALETTE.text, 600, 'center');
      }
    }
    // Trash button.
    const trash = LAYOUT.trash;
    ctx.fillStyle = state.plate.length > 0 ? '#8a5a2b' : '#9a8a76';
    roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 12);
    ctx.fill();
    text(ctx, '🗑 BUANG  [X]', trash.x + trash.w / 2, trash.y + 29, 18, '#ffffff', 800, 'center');
  }

  function drawPass(state, now) {
    const x = 880;
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, x, 202, 360, 178, 12);
    ctx.fill();
    text(ctx, '🛎️ MEJA SAJI — HIDANGAN SIAP', x + 180, 222, 16, '#fff8e7', 800, 'center');
    LAYOUT.pass.forEach((slot, i) => {
      const dish = state.pass[i];
      ctx.fillStyle = dish ? PALETTE.ticketDone : 'rgba(255,248,231,0.16)';
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 12);
      ctx.fill();
      if (!dish) {
        text(ctx, '— kosong —', slot.x + slot.w / 2, slot.y + 75, 15, '#cbb894', 600, 'center');
        return;
      }
      const recipe = recipeById(dish.recipeId);
      const matches = state.orders.some((order) => order.recipeId === dish.recipeId);
      if (matches) {
        ctx.strokeStyle = PALETTE.good;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 6);
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 12);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.font = '44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(recipe.icon, slot.x + slot.w / 2, slot.y + 58);
      text(ctx, recipe.name, slot.x + slot.w / 2, slot.y + 108, 16, PALETTE.text, 800, 'center');
      text(ctx, matches ? '✅ PESANAN COCOK!' : 'Belum dipesan', slot.x + slot.w / 2, slot.y + 132, 13, matches ? PALETTE.good : PALETTE.muted, 700, 'center');
    });
    const serve = LAYOUT.serve;
    const canServe = state.pass.some((dish) => state.orders.some((order) => order.recipeId === dish.recipeId));
    ctx.fillStyle = canServe ? PALETTE.good : '#9a8a76';
    roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 12);
    ctx.fill();
    text(ctx, '🍽️ SAJIKAN  [Enter]', serve.x + serve.w / 2, serve.y + 29, 20, '#ffffff', 800, 'center');
  }

  function drawCounter(state) {
    ctx.fillStyle = PALETTE.counter;
    ctx.fillRect(0, 470, FIELD.width, 22);
    text(ctx, '🧺 MEJA BAHAN — klik bahan atau tekan tombol 1–8', 36, 484, 17, '#fff8e7', 700);
    INGREDIENTS.forEach((ingredient, i) => {
      const bin = LAYOUT.bins[i];
      const used = state.plate.includes(ingredient.id);
      ctx.fillStyle = used ? '#e8d9b0' : PALETTE.boardPaper;
      roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 12);
      ctx.fill();
      ctx.strokeStyle = used ? PALETTE.good : '#d8c49a';
      ctx.lineWidth = 3;
      roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 12);
      ctx.stroke();
      ctx.font = '44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ingredient.icon, bin.x + bin.w / 2, bin.y + 48);
      text(ctx, ingredient.name, bin.x + bin.w / 2, bin.y + 96, 19, PALETTE.text, 800, 'center');
      ctx.fillStyle = PALETTE.board;
      ctx.beginPath();
      ctx.arc(bin.x + bin.w - 20, bin.y + 20, 15, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, ingredient.key, bin.x + bin.w - 20, bin.y + 21, 15, '#ffffff', 800, 'center');
      if (used) text(ctx, '✓ di piring', bin.x + bin.w / 2, bin.y + 122, 13, PALETTE.good, 700, 'center');
    });
  }

  function drawHints() {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 648, FIELD.width, 72);
    text(ctx, '1–8 bahan  •  C masak  •  Enter sajikan  •  X buang  •  P jeda  •  M suara', 640, 684, 18, PALETTE.textLight, 600, 'center');
  }

  function drawServePopup(state) {
    if (!state.lastServe) return;
    const age = state.elapsed - state.lastServeAt;
    if (age > 2.5) return;
    ctx.globalAlpha = Math.max(0, 1 - age / 2.5);
    const label = `+${state.lastServe.points}  ${state.lastServe.dishName} tersaji!`;
    ctx.font = `800 24px ${FONT}`;
    const width = ctx.measureText(label).width + 36;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 1060 - width / 2, 446, width, 38, 19);
    ctx.fill();
    ctx.strokeStyle = PALETTE.good;
    ctx.lineWidth = 3;
    roundRect(ctx, 1060 - width / 2, 446, width, 38, 19);
    ctx.stroke();
    text(ctx, label, 1060, 466, 24, PALETTE.good, 800, 'center');
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 290, 150, 700, 400, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    roundRect(ctx, 290, 150, 700, 400, 20);
    ctx.stroke();
    text(ctx, '🍛', 640, 215, 64, PALETTE.text, 700, 'center');
    text(ctx, 'DAPUR KILAT', 640, 285, 52, PALETTE.text, 800, 'center');
    text(ctx, 'Masak cepat, sajikan tepat — sebelum pelanggan kabur!', 640, 330, 20, PALETTE.muted, 600, 'center');
    text(ctx, 'Racik 4 bahan di piring → Masak di wajan → Sajikan ke pesanan yang cocok.', 640, 372, 18, PALETTE.text, 600, 'center');
    text(ctx, 'Pesanan yang kehabisan waktu = 1 hati hilang. 3 hati hilang = shift berakhir.', 640, 400, 18, PALETTE.text, 600, 'center');
    text(ctx, 'Shift 2½ menit • 5 resep • kombo menaikkan skor', 640, 428, 18, PALETTE.text, 600, 'center');
    ctx.fillStyle = '#e07840';
    roundRect(ctx, 490, 462, 300, 56, 14);
    ctx.fill();
    text(ctx, '▶  MULAI SHIFT', 640, 491, 24, '#ffffff', 800, 'center');
    if (best > 0) text(ctx, `Skor terbaik: ${best}`, 640, 532, 18, PALETTE.muted, 700, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, '⏸ JEDA', 640, 330, 56, '#ffffff', 800, 'center');
    text(ctx, 'Tekan P atau Enter untuk lanjut', 640, 390, 22, '#ffffff', 600, 'center');
  }

  function drawGameOver(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 340, 150, 600, 400, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    roundRect(ctx, 340, 150, 600, 400, 20);
    ctx.stroke();
    text(ctx, '🏁 SHIFT SELESAI', 640, 215, 40, PALETTE.text, 800, 'center');
    text(ctx, state.overReason, 640, 262, 19, PALETTE.muted, 600, 'center');
    text(ctx, `SKOR AKHIR  ${state.score}`, 640, 330, 36, '#e07840', 800, 'center');
    text(ctx, `🍽️ ${state.served} hidangan tersaji   •   🔥 kombo terbaik x${state.bestCombo}`, 640, 382, 20, PALETTE.text, 700, 'center');
    text(ctx, `Skor terbaik: ${best}`, 640, 420, 20, PALETTE.muted, 700, 'center');
    ctx.fillStyle = '#e07840';
    roundRect(ctx, 490, 462, 300, 56, 14);
    ctx.fill();
    text(ctx, '↻  MAIN LAGI', 640, 491, 24, '#ffffff', 800, 'center');
  }

  function draw(state, screen, best, now) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawBackground();
    drawTopBar(state, best);
    drawOrderBoard(state, now);
    drawWok(state, now);
    drawPlate(state);
    drawPass(state, now);
    drawCounter(state);
    drawHints();
    drawServePopup(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawGameOver(state, best);
  }

  return { draw };
}
