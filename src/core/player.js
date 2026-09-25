import {
  PLAYER_W,
  PLAYER_H,
  WALK_SPEED,
  JUMP_VEL,
  GRAVITY,
  MAX_FALL,
  SHOOT_COOLDOWN,
  HERO_PROFILES,
  START_LIVES,
  RESPAWN_INVULN,
} from './constants.js';
import { moveAndCollide, wrapVertical } from './physics.js';
import { spawnBubble } from './bubbles.js';

export const DYING_FRAMES = 90;

/** Un jugador pierde una vida: pasa a 'dying' y se emite playerHit. */
export function killPlayer(state, p) {
  p.state = 'dying';
  p.stateTimer = DYING_FRAMES;
  p.lives -= 1;
  p.vx = 0;
  p.vy = 0;
  state.events.push({ type: 'playerHit', playerId: p.id, x: p.x, y: p.y });
}

/**
 * Crea un jugador nuevo en su spawn point, con vidas y puntaje iniciales
 * (o conservados si se pasa `keep`).
 * @param {import('./game.js').GameState} state
 * @param {1|2} id
 * @param {{lives?:number, score?:number}} [keep]
 */
export function spawnPlayer(state, id, keep = {}) {
  const spawn = id === 1 ? state.level.spawns.p1 : state.level.spawns.p2;
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    state: 'alive',
    stateTimer: 0,
    invuln: RESPAWN_INVULN, // gracia al entrar al nivel
    lives: keep.lives ?? START_LIVES,
    score: keep.score ?? 0,
    shootCooldown: 0,
    anim: 'idle',
    _prevJump: false,
    _prevFire: false,
  };
}

/**
 * Reposiciona un jugador ya existente en su spawn (para respawn tras morir
 * o al pasar de nivel), conservando vidas y puntaje.
 * @param {import('./game.js').GameState} state
 * @param {*} player
 */
export function resetPlayerToSpawn(state, player) {
  const spawn = player.id === 1 ? state.level.spawns.p1 : state.level.spawns.p2;
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.anim = 'idle';
}

/**
 * Actualiza un jugador vivo durante un frame: input → movimiento → colisión →
 * wrap → disparo. Los jugadores en 'dying'/'respawning' se manejan en game.js.
 * @param {import('./game.js').GameState} state
 * @param {*} player
 * @param {import('./game.js').PlayerInput} input
 */
export function updatePlayer(state, player, input) {
  if (player.invuln > 0) player.invuln--;

  // horizontal input, sin aceleración
  if (input.left && !input.right) {
    player.vx = -WALK_SPEED;
    player.facing = -1;
  } else if (input.right && !input.left) {
    player.vx = WALK_SPEED;
    player.facing = 1;
  } else {
    player.vx = 0;
  }

  // salto: flanco de subida, solo desde el suelo (incluye burbujas montadas)
  const jumpEdge = input.jump && !player._prevJump;
  if (jumpEdge && player.onGround) {
    player.vy = JUMP_VEL;
    player.onGround = false;
    state.events.push({ type: 'jump', playerId: player.id, x: player.x, y: player.y });
  }
  player._prevJump = input.jump;

  // gravedad
  player.vy = Math.min(player.vy + GRAVITY, MAX_FALL);

  player.onGround = false;
  const res = moveAndCollide(player, state.level, { oneWay: true });
  if (res.landed) {
    player.onGround = true;
    player.vy = 0;
  }
  if (res.hitCeiling) player.vy = 0;

  wrapVertical(player);

  // disparo: flanco de subida y cooldown en 0
  if (player.shootCooldown > 0) player.shootCooldown--;
  const fireEdge = input.fire && !player._prevFire;
  if (fireEdge && player.shootCooldown === 0) {
    const bubble = spawnBubble(state, player);
    state.bubbles.push(bubble);
    player.shootCooldown = HERO_PROFILES[player.id]?.shootCooldown ?? SHOOT_COOLDOWN;
    state.events.push({ type: 'shoot', playerId: player.id, x: bubble.x, y: bubble.y });
  }
  player._prevFire = input.fire;

  // animación cosmética simple
  if (!player.onGround) player.anim = player.vy < 0 ? 'jump' : 'fall';
  else if (player.vx !== 0) player.anim = 'walk';
  else player.anim = 'idle';
}
