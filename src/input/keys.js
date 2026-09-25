/**
 * Input handler for Bubble Bobble.
 * Reads keyboard state and manages key callbacks.
 * Works in both browser (window) and Node (EventTarget mock).
 */

/**
 * @typedef {{ left:boolean, right:boolean, jump:boolean, fire:boolean }} PlayerInput
 * @typedef {{ p1: PlayerInput, p2: PlayerInput, start1:boolean, start2:boolean, pause:boolean }} FrameInput
 */

/**
 * Creates an input handler that tracks keyboard state.
 * @param {EventTarget} target - The event target to listen on (default: window)
 * @returns {{ read(): FrameInput, onKey(code: string, fn: Function): void, dispose(): void }}
 */
export function createInput(target = typeof window !== 'undefined' ? window : null) {
  if (!target) {
    // Node.js environment without window
    target = new EventTarget();
  }

  // Key state tracking
  const keyStates = new Map();
  // Keys pressed since the last read(): a tap shorter than one frame still counts once.
  const tapped = new Set();
  const isDown = (code) => keyStates.get(code) || tapped.has(code);

  // Key code mappings
  // P1 (Nilo) juega con las flechas y Espacio; P2 (Lirio) con W A D y F.
  const p1Keys = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'jump',
    Space: 'fire',
  };

  const p2Keys = {
    KeyA: 'left',
    KeyD: 'right',
    KeyW: 'jump',
    KeyF: 'fire',
  };

  const globalKeys = {
    Digit1: 'start1',
    Digit2: 'start2',
    KeyP: 'pause',
  };

  /** Estado de un jugador a partir de su mapa tecla → acción. */
  function readPlayer(keys) {
    const out = { left: false, right: false, jump: false, fire: false };
    for (const [code, action] of Object.entries(keys)) out[action] = out[action] || isDown(code);
    return out;
  }

  // Keys that should call preventDefault
  const gameKeys = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space',
    'KeyA', 'KeyD', 'KeyW', 'KeyF',
  ]);

  // Callbacks registered via onKey()
  const callbacks = new Map();

  /**
   * Handles keydown events.
   * @param {KeyboardEvent} e
   */
  function handleKeyDown(e) {
    const { code, repeat } = e;

    // Set key state
    keyStates.set(code, true);
    if (!repeat) tapped.add(code);

    // Call registered callbacks (ignore auto-repeat)
    if (!repeat && callbacks.has(code)) {
      callbacks.get(code).forEach(fn => fn(e));
    }

    // Prevent default for game keys
    if (gameKeys.has(code)) {
      e.preventDefault();
    }
  }

  /**
   * Handles keyup events.
   * @param {KeyboardEvent} e
   */
  function handleKeyUp(e) {
    const { code } = e;
    keyStates.set(code, false);
  }

  /**
   * Handles blur events: reset all key states.
   */
  function handleBlur() {
    keyStates.clear();
    tapped.clear();
  }

  /**
   * Reads the current frame input from key states.
   * @returns {FrameInput}
   */
  function read() {
    const input = {
      p1: readPlayer(p1Keys),
      p2: readPlayer(p2Keys),
      start1: false,
      start2: false,
      pause: false,
    };
    for (const [code, action] of Object.entries(globalKeys)) input[action] = input[action] || isDown(code);
    tapped.clear();
    return input;
  }

  /**
   * Registers a callback for a specific key code (keydown only, ignores repeat).
   * @param {string} code - The key code (e.g., 'KeyM')
   * @param {Function} fn - The callback function
   */
  function onKey(code, fn) {
    if (!callbacks.has(code)) {
      callbacks.set(code, []);
    }
    callbacks.get(code).push(fn);
  }

  /**
   * Removes all listeners and clears state.
   */
  function dispose() {
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('keyup', handleKeyUp);
    target.removeEventListener('blur', handleBlur);
    keyStates.clear();
    callbacks.clear();
  }

  // Attach listeners
  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('keyup', handleKeyUp);
  target.addEventListener('blur', handleBlur);

  return { read, onKey, dispose };
}
