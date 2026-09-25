// Flujo de juego (CONTRACT.md §9): modos, pausa, física de frutas, vidas,
// puntaje de frutas (ya sumado por game.js en fruitCollect) y cambio de nivel.
// G reemplaza el stub de A manteniendo la firma exportada.

import { LEVEL_CLEAR_DELAY, START_LIVES, RESPAWN_INVULN, GRAVITY, MAX_FALL, TILE, ROWS } from './constants.js';
import { tileAt } from './physics.js';
import { TILE_SOLID, TILE_PLATFORM, parseLevel } from './level.js';
import { spawnPlayer, resetPlayerToSpawn } from './player.js';
import { spawnEnemies } from './enemies.js';
import { spawnBoss } from './boss.js';

const FRUIT_SIZE = 16; // ver CONTRACT.md §12: frutas son sprites de 16x16
const EPS = 1e-6;

/** Flanco de subida: guarda el valor anterior en `state[key]`. */
function risingEdge(state, key, cur) {
  const prev = !!state[key];
  state[key] = !!cur;
  return !!cur && !prev;
}

/**
 * Física simple de frutas: gravedad, apoyo en el suelo (tiles sólidos y
 * plataformas) y wrap vertical. El ttl lo maneja game.js (ya decrementa y
 * filtra `state.fruits` en la limpieza de cada step).
 */
function updateFruitsPhysics(state) {
  const level = state.level;
  const bottom = ROWS * TILE;

  for (const f of state.fruits) {
    if (f.onGround) {
      f.vy = 0;
    } else {
      f.vy = Math.min((f.vy || 0) + GRAVITY, MAX_FALL);
      f.y += f.vy;

      const leftCol = Math.floor(f.x / TILE);
      const rightCol = Math.floor((f.x + FRUIT_SIZE - EPS) / TILE);
      const bottomRow = Math.floor((f.y + FRUIT_SIZE - EPS) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        const t = tileAt(level, c, bottomRow);
        if (t === TILE_SOLID || t === TILE_PLATFORM) {
          f.y = bottomRow * TILE - FRUIT_SIZE;
          f.vy = 0;
          f.onGround = true;
          break;
        }
      }
    }

    if (f.y > bottom) {
      f.y = -FRUIT_SIZE;
      f.onGround = false;
    } else if (f.y + FRUIT_SIZE < 0) {
      f.y = bottom;
      f.onGround = false;
    }
  }
}

/** Reincorpora a un jugador muerto con vidas y puntaje frescos (§9). */
function rejoin(state, id) {
  const idx = state.players.findIndex((p) => p.id === id);
  if (idx === -1) return; // nunca existió en esta partida (modo 1 jugador)
  if (state.players[idx].state !== 'dead') return;
  state.players[idx] = spawnPlayer(state, id, { lives: START_LIVES, score: 0 });
}

/** Pasa al siguiente nivel conservando puntaje/vidas, o victoria si era el último. */
function advanceLevel(state) {
  const nextIndex = state.levelIndex + 1;
  if (nextIndex >= state.levels.length) {
    state.mode = 'victory';
    state.modeTimer = 0;
    state.events.push({ type: 'victory' });
    return;
  }

  state.levelIndex = nextIndex;
  state.level = parseLevel(state.levels[nextIndex]);
  state.bubbles = [];
  state.fruits = [];
  state.hazards = [];

  for (const p of state.players) {
    if (p.state === 'dead') continue;
    p.state = 'alive';
    p.stateTimer = 0;
    p.invuln = RESPAWN_INVULN;
    resetPlayerToSpawn(state, p);
  }

  spawnEnemies(state);
  spawnBoss(state);
  state.mode = 'playing';
  state.modeTimer = 0;
  state.events.push({ type: 'levelStart' });
}

/**
 * @param {import('./game.js').GameState} state
 * @param {import('./game.js').FrameInput} input
 */
export function updateRules(state, input) {
  const pauseEdge = risingEdge(state, '_prevPause', input.pause);
  const start1Edge = risingEdge(state, '_prevStart1', input.start1);
  const start2Edge = risingEdge(state, '_prevStart2', input.start2);

  if (state.mode === 'title') {
    if (input.start1 || input.start2) {
      state.players = [spawnPlayer(state, 1)];
      if (input.start2) state.players.push(spawnPlayer(state, 2));
      spawnEnemies(state);
      spawnBoss(state);
      state.mode = 'playing';
      state.modeTimer = 0;
      state.events.push({ type: 'levelStart' });
    }
    return;
  }

  if (state.mode === 'playing') {
    if (pauseEdge) {
      state.mode = 'paused';
      state.modeTimer = 0;
      return;
    }

    if (start1Edge) rejoin(state, 1);
    if (start2Edge) rejoin(state, 2);

    updateFruitsPhysics(state);

    // Solo hay "level clear" si el nivel tenía enemigos para empezar; algunos
    // niveles usados en tests (sin `spawns.enemies`) no deben auto-completarse.
    const hasFoes = state.level.spawns.enemies.length > 0 || !!state.level.boss;
    if (hasFoes && state.enemies.length === 0 && !state.boss) {
      state.mode = 'levelClear';
      state.modeTimer = 0;
      state.events.push({ type: 'levelClear' });
      return;
    }

    if (state.players.length > 0 && state.players.every((p) => p.state === 'dead')) {
      state.mode = 'gameOver';
      state.modeTimer = 0;
      state.events.push({ type: 'gameOver' });
    }
    return;
  }

  if (state.mode === 'paused') {
    if (pauseEdge) {
      state.mode = 'playing';
      state.modeTimer = 0;
    }
    return;
  }

  if (state.mode === 'levelClear') {
    if (state.modeTimer >= LEVEL_CLEAR_DELAY) {
      advanceLevel(state);
    }
    return;
  }

  // gameOver, victory: modos terminales, nada más que hacer.
}
