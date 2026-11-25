// Keyboard and mouse, read as one input: keys 1-8 pick ingredients, C cooks,
// Enter or Space serves, X trashes the plate, P pauses, M mutes. Clicks are
// reported as logical-field coordinates; the caller hit-tests them.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_COOK = 4;
export const ACTION_SERVE = 8;
export const ACTION_TRASH = 16;
export const ACTION_MUTE = 32;

export function createInput(canvas) {
  let actions = 0;
  let ingredientKey = null;
  let click = null;
  const held = new Set();

  function press(action) {
    actions |= action;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '8') {
      ingredientKey = Number(key) - 1;
      event.preventDefault();
      return;
    }
    if (key === 'enter' || key === ' ') { press(ACTION_CONFIRM | ACTION_SERVE); event.preventDefault(); }
    else if (key === 'p' || key === 'escape') press(ACTION_PAUSE);
    else if (key === 'c') press(ACTION_COOK);
    else if (key === 's') press(ACTION_SERVE);
    else if (key === 'x') press(ACTION_TRASH);
    else if (key === 'm') press(ACTION_MUTE);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    press(ACTION_CONFIRM);
  }

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** Actions pressed since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Index 0-7 of the ingredient key pressed since the last call, or null. */
    takeIngredientKey() {
      const taken = ingredientKey;
      ingredientKey = null;
      return taken;
    },
    /** Logical-field click since the last call, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    held,
  };
}
