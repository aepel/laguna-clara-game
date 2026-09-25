// Diferencias jugables entre Nilo (P1) y Lirio (P2) y el evento `regenerate`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { HERO_PROFILES, RESPAWN_INVULN } from '../src/core/constants.js';
import { buildLevel, frameInput } from './a-helpers.js';

function twoPlayerGame() {
  const level = buildLevel({ spawns: { p1: { row: 24, col: 5 }, p2: { row: 24, col: 20 } } });
  const state = createGame({ levels: [level], seed: 5 });
  step(state, frameInput({ start2: true }));
  return state;
}

test('Lirio dispara más seguido que Nilo', () => {
  assert.ok(HERO_PROFILES[2].shootCooldown < HERO_PROFILES[1].shootCooldown);

  const state = twoPlayerGame();
  step(state, frameInput({ p1: { fire: true }, p2: { fire: true } }));
  const [nilo, lirio] = state.players;
  assert.equal(nilo.shootCooldown, HERO_PROFILES[1].shootCooldown);
  assert.equal(lirio.shootCooldown, HERO_PROFILES[2].shootCooldown);
});

test('la burbuja de Nilo atrapa a un enemigo que la de Lirio no alcanza', () => {
  const pad = HERO_PROFILES[1].trapPad;
  assert.ok(pad > HERO_PROFILES[2].trapPad);

  // Enemigo justo por encima del camino de la burbuja, a `pad` px de rozarla.
  const run = (ownerId) => {
    const level = buildLevel({ spawns: { p1: { row: 24, col: 5 }, p2: { row: 24, col: 12 } } });
    const state = createGame({ levels: [level], seed: 6 });
    step(state, frameInput({ start2: true }));
    const shooter = state.players[ownerId - 1];
    const bubbleY = shooter.y + (shooter.h - 16) / 2;
    state.enemies.push({
      id: state.nextId++, type: 'zen', x: shooter.x + 40, y: bubbleY - 16 - (pad - 1), w: 14, h: 16,
      vx: 0, vy: 0, facing: 1, onGround: false, state: 'walk', stateTimer: 0, anim: 'walk',
    });
    const enemy = state.enemies[state.enemies.length - 1];
    const fire = ownerId === 1 ? { p1: { fire: true } } : { p2: { fire: true } };
    step(state, frameInput(fire));
    for (let i = 0; i < 14; i++) {
      // quieto para aislar el hitbox
      enemy.x = shooter.x + 40; enemy.y = bubbleY - 16 - (pad - 1); enemy.vx = 0; enemy.vy = 0;
      step(state, frameInput({}));
    }
    return enemy.state;
  };

  assert.equal(run(1), 'trapped');
  assert.notEqual(run(2), 'trapped');
});

test('al reaparecer se emite regenerate', () => {
  const state = twoPlayerGame();
  const p = state.players[0];
  p.state = 'dying';
  p.stateTimer = 1;
  p.lives = 2;
  step(state, frameInput({}));
  assert.equal(p.state, 'alive');
  assert.equal(p.invuln, RESPAWN_INVULN);
  assert.ok(state.events.some((e) => e.type === 'regenerate' && e.playerId === 1));
});
