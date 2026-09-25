import { RESPAWN_INVULN } from './constants.js';
import { createRng } from './rng.js';
import { parseLevel } from './level.js';
import { updatePlayer, resetPlayerToSpawn, killPlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateBubbles } from './bubbles.js';
import { updateRules } from './rules.js';
import { updateBoss } from './boss.js';

/** @typedef {{ left:boolean, right:boolean, jump:boolean, fire:boolean }} PlayerInput */
/** @typedef {{ p1: PlayerInput, p2: PlayerInput, start1:boolean, start2:boolean, pause:boolean }} FrameInput */

const FRUIT_SIZE = 16; // ver CONTRACT.md §12: frutas son sprites de 16x16

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function emptyInput(input) {
  return {
    left: false,
    right: false,
    jump: false,
    fire: false,
    ...input,
  };
}

/**
 * @param {{ levels: any[], seed?: number, players?: number }} opts
 * @returns {import('./game.js').GameState}
 */
export function createGame({ levels, seed = 1, players = 1, startLevel = 0 }) {
  const rng = createRng(seed);
  const levelIndex = Math.max(0, Math.min(startLevel, levels.length - 1));
  const level = parseLevel(levels[levelIndex]);
  return {
    mode: 'title',
    frame: 0,
    levelIndex,
    level,
    levels, // definiciones crudas, para recargar niveles al avanzar (uso de rules.js)
    players: [],
    enemies: [],
    bubbles: [],
    fruits: [],
    hazards: [],
    rescued: 0, // crías de ajolote rescatadas en la partida
    boss: null,
    bossShots: [],
    events: [],
    modeTimer: 0,
    nextId: 1,
    rng,
    // Nota: `players` (cantidad sugerida) no fuerza el modo; el juego siempre
    // arranca en 'title' y espera start1/start2, por §7.
    _requestedPlayers: players,
  };
}

/**
 * Avanza exactamente un frame de simulación.
 * @param {import('./game.js').GameState} state
 * @param {FrameInput} input
 */
export function step(state, input) {
  state.events = [];
  state.frame++;
  state.modeTimer++;

  updateRules(state, input);
  if (state.mode !== 'playing') return;

  const p1Input = emptyInput(input.p1);
  const p2Input = emptyInput(input.p2);

  // 3. jugadores: input -> movimiento -> colisión -> wrap -> disparo
  for (const p of state.players) {
    if (p.state === 'dying') {
      p.stateTimer--;
      if (p.stateTimer <= 0) {
        if (p.lives > 0) {
          p.state = 'alive';
          resetPlayerToSpawn(state, p);
          p.invuln = RESPAWN_INVULN;
          state.events.push({ type: 'regenerate', playerId: p.id, x: p.x, y: p.y });
        } else {
          p.state = 'dead';
        }
      }
      continue;
    }
    if (p.state === 'dead') continue;
    updatePlayer(state, p, p.id === 1 ? p1Input : p2Input);
  }

  // 4. enemigos
  updateEnemies(state);

  // 5. burbujas
  updateBubbles(state);

  // 5b. jefe (Laguna Clara): lee burbujas y eventos de este frame
  updateBoss(state);

  // 6. colisiones jugador-enemigo y jugador-fruta
  for (const p of state.players) {
    if (p.state !== 'alive') continue;

    if (p.invuln <= 0) {
      const hit = state.enemies.find(
        (e) =>
          (e.state === 'walk' || e.state === 'jump' || e.state === 'angry') &&
          aabbOverlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)
      );
      // Rastro tóxico de las colillas (Laguna Clara).
      const burn = (state.hazards || []).find((h) => aabbOverlap(p.x, p.y, p.w, p.h, h.x, h.y, h.w, h.h));
      if (hit || burn) {
        killPlayer(state, p);
        continue;
      }
    }

    for (const f of state.fruits) {
      if (aabbOverlap(p.x, p.y, p.w, p.h, f.x, f.y, FRUIT_SIZE, FRUIT_SIZE)) {
        p.score += f.points;
        f._collected = true;
        state.rescued = (state.rescued || 0) + (f.crias || 1);
        state.events.push({ type: 'fruitCollect', playerId: p.id, points: f.points, kind: f.kind, crias: f.crias || 1, x: f.x, y: f.y });
      }
    }
  }

  // 7. limpiar entidades muertas o vencidas
  state.fruits = state.fruits.filter((f) => {
    if (f._collected) return false;
    f.ttl -= 1;
    // Si nadie la agarra, la cría vuelve nadando al fondo (no suma).
    if (f.ttl <= 0) state.events.push({ type: 'criaEscape', kind: f.kind, x: f.x, y: f.y });
    return f.ttl > 0;
  });
}
