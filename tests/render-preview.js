// tests/render-preview.js — dueño: R (Renderer canvas)
// Arma a mano un GameState de ejemplo (sin depender de src/core/, todavía en desarrollo)
// y lo dibuja en loop con createRenderer. Teclas 1-6 alternan `mode`.

import { createRenderer } from '../src/render/canvas.js';
import * as sprites from '../src/data/sprites.js';

const TILE = 8;
const COLS = 32;
const ROWS = 26;
const HUD_H = 16;

// ---------------------------------------------------------------------
// Nivel simple 26x32: paredes laterales, piso y techo con huecos de wrap,
// algunas plataformas sueltas.
// ---------------------------------------------------------------------
function buildLevelMap() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let row;
    if (r === 0 || r === ROWS - 1) {
      // techo/piso con hueco de wrap de 2 tiles en el medio
      row = '#'.repeat(COLS);
      row = row.slice(0, 15) + '..' + row.slice(17);
    } else {
      row = '#' + '.'.repeat(COLS - 2) + '#';
    }
    rows.push(row);
  }
  // algunas plataformas '='
  function setPlatform(row, c0, c1) {
    let r = rows[row].split('');
    for (let c = c0; c <= c1; c++) r[c] = '=';
    rows[row] = r.join('');
  }
  setPlatform(20, 3, 9);
  setPlatform(16, 12, 20);
  setPlatform(12, 22, 28);
  setPlatform(8, 5, 12);

  return rows;
}

function tilesFromMap(map) {
  const tiles = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = map[r][c];
      tiles[r * COLS + c] = ch === '#' ? 1 : ch === '=' ? 2 : 0;
    }
  }
  return tiles;
}

const map = buildLevelMap();
const level = {
  name: 'Preview level',
  wind: 'center',
  tiles: tilesFromMap(map),
};

function makePlayer(id, x, y, facing, anim, extra = {}) {
  return {
    id,
    x, y, vx: 0, vy: 0,
    facing,
    onGround: true,
    state: 'alive',
    stateTimer: 0,
    invuln: 0,
    lives: 3,
    score: id === 1 ? 12340 : 5670,
    shootCooldown: 0,
    anim,
    ...extra,
  };
}

function makeEnemy(id, type, x, y, facing, state, anim) {
  return { id, type, x, y, vx: 0.3, vy: 0, facing, onGround: true, state, stateTimer: 0, anim };
}

function makeBubble(id, x, y, phase, trapped) {
  return { id, x, y, vx: 0, vy: -0.5, ownerId: 1, phase, age: 0, trapped };
}

function makeFruit(id, x, y, kind, points) {
  return { id, x, y, vy: 0, kind, points, ttl: 400, onGround: true };
}

function buildState() {
  return {
    mode: 'playing',
    frame: 0,
    levelIndex: 0,
    level,
    players: [
      makePlayer(1, 40, 160, 1, 'walk'),
      makePlayer(2, 80, 160, -1, 'idle'),
    ],
    enemies: [
      makeEnemy(1, 'zen', 120, 160, 1, 'walk', 'walk'),
      makeEnemy(2, 'mighta', 180, 100, -1, 'angry', 'angry'),
      makeEnemy(3, 'monsta', 220, 60, 1, 'walk', 'walk'),
    ],
    bubbles: [
      makeBubble(1, 60, 120, 'float', null),
      makeBubble(2, 150, 80, 'float', { enemyType: 'pulpul', timer: 300 }),
      makeBubble(3, 200, 150, 'shoot', null),
    ],
    fruits: [
      makeFruit(1, 100, 190, 'cherry', 100),
      makeFruit(2, 140, 190, 'watermelon', 2000),
    ],
    events: [],
    modeTimer: 0,
    nextId: 10,
    rng: () => Math.random(),
  };
}

const state = buildState();

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas, sprites, { scale: 3 });

const MODE_KEYS = {
  Digit1: 'title',
  Digit2: 'playing',
  Digit3: 'paused',
  Digit4: 'levelClear',
  Digit5: 'gameOver',
  Digit6: 'victory',
};

window.addEventListener('keydown', (e) => {
  if (MODE_KEYS[e.code]) {
    state.mode = MODE_KEYS[e.code];
    state.modeTimer = 0;
  }
});

function loop() {
  state.frame++;
  state.modeTimer++;
  // Fake some events periodically so floaters are visible in the preview.
  state.events = [];
  if (state.frame % 90 === 0) {
    state.events.push({ type: 'popEnemy', x: 120, y: 160, points: 1000, combo: 1 });
  }
  if (state.frame % 150 === 0) {
    state.events.push({ type: 'fruitCollect', x: 100, y: 190, points: 100 });
  }
  renderer.draw(state);
  requestAnimationFrame(loop);
}

loop();
