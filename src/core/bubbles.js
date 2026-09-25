import {
  TILE,
  BUBBLE_SIZE,
  BUBBLE_SHOOT_SPEED,
  BUBBLE_SHOOT_FRAMES,
  BUBBLE_FLOAT_SPEED,
  BUBBLE_LIFETIME,
  TRAP_TIME,
  ANGRY_SPEED_MULT,
  HERO_PROFILES,
} from './constants.js';
import { tileAt } from './physics.js';
import { TILE_SOLID } from './level.js';
import { ENEMY_BASE_SPEED } from './enemies.js';

const TRAPPABLE_STATES = new Set(['walk', 'jump', 'angry']);

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Crea una burbuja disparada por un jugador, delante suyo en su `facing`.
 * @param {import('./game.js').GameState} state
 * @param {*} player
 */
export function spawnBubble(state, player) {
  const x = player.facing === 1 ? player.x + player.w : player.x - BUBBLE_SIZE;
  const y = player.y + (player.h - BUBBLE_SIZE) / 2;
  return {
    id: state.nextId++,
    x,
    y,
    vx: player.facing * BUBBLE_SHOOT_SPEED,
    vy: 0,
    ownerId: player.id,
    phase: 'shoot',
    age: 0,
    trapped: null,
    _enemyId: null,
  };
}

function windTargetX(wind) {
  const playfieldW = 32 * TILE;
  if (wind === 'left') return 2 * TILE;
  if (wind === 'right') return playfieldW - 3 * TILE;
  return playfieldW / 2 - BUBBLE_SIZE / 2; // 'center'
}

/**
 * Busca la cadena de burbujas atrapadas que se tocan entre sí a partir de
 * `start` (incluida) y las revienta todas en el mismo frame.
 */
function popEnemyChain(state, start, toRemove, player) {
  const visited = new Set();
  const queue = [start];
  const chain = [];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    chain.push(cur);
    for (const other of state.bubbles) {
      if (visited.has(other.id) || toRemove.has(other.id) || !other.trapped) continue;
      if (aabbOverlap(cur.x, cur.y, BUBBLE_SIZE, BUBBLE_SIZE, other.x, other.y, BUBBLE_SIZE, BUBBLE_SIZE)) {
        queue.push(other);
      }
    }
  }
  const n = chain.length;
  const points = Math.min(1000 * 2 ** (n - 1), 8000);
  for (const b of chain) {
    const enemy = state.enemies.find((e) => e.id === b._enemyId);
    if (enemy) {
      enemy.state = 'dying';
      enemy.combo = n;
      enemy.stateTimer = 0;
      enemy.vx = (state.rng() < 0.5 ? -1 : 1) * 1.5;
      enemy.vy = -2;
    }
    if (player) player.score += points;
    state.events.push({ type: 'popEnemy', x: b.x, y: b.y, points, combo: n, playerId: player?.id, enemyType: b.trapped.enemyType });
    toRemove.add(b.id);
  }
}

/**
 * Revienta una burbuja tocada por un jugador: vacía o con enemigo (con combo).
 */
function popBubble(state, bubble, toRemove, player) {
  if (toRemove.has(bubble.id)) return;
  if (!bubble.trapped) {
    player.score += 10;
    state.events.push({ type: 'pop', x: bubble.x, y: bubble.y, playerId: player.id });
    toRemove.add(bubble.id);
    return;
  }
  popEnemyChain(state, bubble, toRemove, player);
}

/**
 * Mueve y actualiza todas las burbujas: fase de disparo, atrapar enemigos,
 * flotación con viento, escape enojado, y montar/reventar por el jugador.
 * @param {import('./game.js').GameState} state
 */
export function updateBubbles(state) {
  const level = state.level;
  const toRemove = new Set();

  for (const b of state.bubbles) {
    if (toRemove.has(b.id)) continue;
    b.age++;

    if (b.phase === 'shoot') {
      b.x += b.vx;
      const col = b.vx > 0 ? Math.floor((b.x + BUBBLE_SIZE - 1) / TILE) : Math.floor(b.x / TILE);
      const rowTop = Math.floor(b.y / TILE);
      const rowBot = Math.floor((b.y + BUBBLE_SIZE - 1) / TILE);
      let hitWall = false;
      for (let r = rowTop; r <= rowBot; r++) {
        if (tileAt(level, col, r) === TILE_SOLID) {
          hitWall = true;
          break;
        }
      }

      // atrapar: una burbuja en fase shoot que toca un enemigo lo atrapa
      const pad = HERO_PROFILES[b.ownerId]?.trapPad || 0;
      for (const e of state.enemies) {
        if (!TRAPPABLE_STATES.has(e.state)) continue;
        if (aabbOverlap(b.x - pad, b.y - pad, BUBBLE_SIZE + pad * 2, BUBBLE_SIZE + pad * 2, e.x, e.y, e.w, e.h)) {
          // Laguna Clara: el Gomón de frente hace rebotar la burbuja.
          if (e.armoredFront && Math.sign(b.vx) === -e.facing) {
            b.vx = -b.vx;
            b.age = BUBBLE_SHOOT_FRAMES; // rebota y queda flotando, ya no atrapa
            state.events.push({ type: 'armorBlock', x: b.x + 8, y: b.y + 8 });
            break;
          }
          e.state = 'trapped';
          e.vx = 0;
          e.vy = 0;
          b.trapped = { enemyType: e.type, timer: TRAP_TIME };
          b._enemyId = e.id;
          state.events.push({ type: 'trap', x: b.x, y: b.y });
          break;
        }
      }

      if (hitWall || b.trapped || b.age >= BUBBLE_SHOOT_FRAMES) {
        b.phase = 'float';
        b.vx = 0;
        b.vy = -BUBBLE_FLOAT_SPEED;
      }
      continue;
    }

    if (b.phase === 'float') {
      if (b.trapped) {
        b.trapped.timer--;
        if (b.trapped.timer <= 0) {
          const enemy = state.enemies.find((e) => e.id === b._enemyId);
          if (enemy) {
            const dir = enemy.facing || 1;
            enemy.state = 'angry';
            enemy.x = b.x;
            enemy.y = b.y;
            enemy.facing = dir;
            enemy.vx = dir * ENEMY_BASE_SPEED * ANGRY_SPEED_MULT;
            enemy.vy = 0;
            enemy.onGround = false;
          }
          state.events.push({ type: 'escape', x: b.x, y: b.y });
          toRemove.add(b.id);
          continue;
        }
      }

      const topY = TILE * 2;
      if (b.y > topY) {
        b.vy = -BUBBLE_FLOAT_SPEED;
        b.vx = 0;
        b.y += b.vy;
      } else {
        b.y = Math.max(b.y, 0);
        b.vy = 0;
        const target = windTargetX(level.wind);
        if (b.x < target - 1) b.vx = BUBBLE_FLOAT_SPEED;
        else if (b.x > target + 1) b.vx = -BUBBLE_FLOAT_SPEED;
        else b.vx = 0;
        b.x += b.vx;
      }

      if (!b.trapped && b.age >= BUBBLE_LIFETIME) {
        state.events.push({ type: 'pop', x: b.x, y: b.y });
        toRemove.add(b.id);
      }
    }
  }

  // separación simple entre burbujas flotando, para no superponerse
  const floaters = state.bubbles.filter((b) => b.phase === 'float' && !toRemove.has(b.id));
  for (let i = 0; i < floaters.length; i++) {
    for (let j = i + 1; j < floaters.length; j++) {
      const a = floaters[i];
      const c = floaters[j];
      if (aabbOverlap(a.x, a.y, BUBBLE_SIZE, BUBBLE_SIZE, c.x, c.y, BUBBLE_SIZE, BUBBLE_SIZE)) {
        const dx = a.x - c.x;
        const push = dx === 0 ? 0.5 : Math.sign(dx) * 0.5;
        a.x += push;
        c.x -= push;
      }
    }
  }

  // jugadores: montar o reventar burbujas en float
  for (const p of state.players) {
    if (p.state !== 'alive') continue;
    for (const b of state.bubbles) {
      if (toRemove.has(b.id) || b.phase !== 'float') continue;
      if (!aabbOverlap(p.x, p.y, p.w, p.h, b.x, b.y, BUBBLE_SIZE, BUBBLE_SIZE)) continue;

      const playerBottom = p.y + p.h;
      const bubbleMid = b.y + BUBBLE_SIZE / 2;
      // zona superior de la burbuja: apoyarse ahí no la revienta, sea que el
      // jugador esté cayendo (se monta) o subiendo (recién rebotó, se aleja).
      const nearTop = playerBottom >= b.y - 4 && playerBottom <= bubbleMid + 1;

      if (nearTop) {
        if (p.vy >= 0) {
          p.onGround = true;
          p.vy = 0;
          p.y = b.y - p.h;
        }
        // p.vy < 0: se está alejando hacia arriba (rebote); no se monta ni revienta.
      } else {
        popBubble(state, b, toRemove, p);
      }
    }
  }

  state.bubbles = state.bubbles.filter((b) => !toRemove.has(b.id));
}
