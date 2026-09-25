import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { BUBBLE_SHOOT_FRAMES } from '../src/core/constants.js';
import { buildLevel, frameInput } from './a-helpers.js';

test('disparo: la burbuja pasa de shoot a float', () => {
  const level = buildLevel({ spawns: { p1: { row: 24, col: 5 } } });
  const state = createGame({ levels: [level], seed: 3 });

  step(state, frameInput({ start1: true }));
  step(state, frameInput({ p1: { fire: true } }));

  assert.equal(state.bubbles.length, 1);
  const bubble = state.bubbles[0];
  assert.equal(bubble.phase, 'shoot');

  for (let i = 0; i < BUBBLE_SHOOT_FRAMES + 2; i++) step(state, frameInput({}));

  assert.equal(bubble.phase, 'float');
});

test('atrapar: una burbuja en fase shoot atrapa a un enemigo stub', () => {
  const level = buildLevel({
    spawns: { p1: { row: 24, col: 5 }, enemies: [{ ch: 'z', row: 24, col: 7 }] },
  });
  const state = createGame({ levels: [level], seed: 4 });

  step(state, frameInput({ start1: true }));
  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0].type, 'zen');

  step(state, frameInput({ p1: { fire: true } }));

  let trapped = false;
  for (let i = 0; i < 10 && !trapped; i++) {
    step(state, frameInput({}));
    if (state.enemies[0].state === 'trapped') trapped = true;
  }

  assert.ok(trapped, 'el enemigo debería quedar atrapado');
  const bubble = state.bubbles.find((b) => b.trapped);
  assert.ok(bubble, 'debería existir una burbuja con el enemigo atrapado');
  assert.equal(bubble.trapped.enemyType, 'zen');
  assert.equal(bubble.trapped.timer > 0, true);
});

test('montar una burbuja: se apoya y rebota sin reventarla', () => {
  const level = buildLevel({ spawns: { p1: { row: 2, col: 5 } } });
  const state = createGame({ levels: [level], seed: 5 });

  step(state, frameInput({ start1: true }));
  const p = state.players[0];

  const bubble = {
    id: state.nextId++,
    x: p.x,
    y: p.y + 100,
    vx: 0,
    vy: 0,
    ownerId: 1,
    phase: 'float',
    age: 0,
    trapped: null,
    _enemyId: null,
  };
  state.bubbles.push(bubble);

  let mounted = false;
  for (let i = 0; i < 80 && !mounted; i++) {
    step(state, frameInput({}));
    if (p.onGround && p.y + p.h === bubble.y) mounted = true;
  }

  assert.ok(mounted, 'el jugador debería apoyarse sobre la burbuja');
  assert.equal(state.bubbles.length, 1, 'la burbuja no debería reventar al montarla');

  const bubbleId = bubble.id;
  step(state, frameInput({ p1: { jump: true } }));

  assert.ok(p.vy < 0, 'debería rebotar hacia arriba con JUMP_VEL');
  assert.ok(
    state.bubbles.some((b) => b.id === bubbleId),
    'la burbuja debería seguir existiendo tras el rebote'
  );
});

test('reventar tocando de costado', () => {
  const level = buildLevel({ spawns: { p1: { row: 10, col: 5 } } });
  const state = createGame({ levels: [level], seed: 6 });

  step(state, frameInput({ start1: true }));
  const p = state.players[0];

  // burbuja a la misma altura del jugador (contacto de costado, no por arriba)
  const bubble = {
    id: state.nextId++,
    x: p.x + 4,
    y: p.y,
    vx: 0,
    vy: 0,
    ownerId: 1,
    phase: 'float',
    age: 0,
    trapped: null,
    _enemyId: null,
  };
  state.bubbles.push(bubble);

  step(state, frameInput({}));

  assert.equal(state.bubbles.length, 0, 'la burbuja debería reventar al tocarla de costado');
  assert.equal(p.onGround, false, 'no debería montarse en una burbuja tocada de costado');
});
