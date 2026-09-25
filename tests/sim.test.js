import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { LEVELS } from '../src/data/levels.js';
import { SCREEN_W, SCREEN_H, HUD_H, ROWS, TILE } from '../src/core/constants.js';

// PRNG simple con semilla para inputs aleatorios (no Math.random)
function createTestRng(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state * 1103515245 + 12345) >>> 0;
    return (state / 4294967296) & 0.999999;
  };
}

function createRandomInput(rng) {
  return {
    p1: {
      left: rng() < 0.15,
      right: rng() < 0.15,
      jump: rng() < 0.1,
      fire: rng() < 0.1,
    },
    p2: {
      left: rng() < 0.15,
      right: rng() < 0.15,
      jump: rng() < 0.1,
      fire: rng() < 0.1,
    },
    start1: false,
    start2: false,
    pause: false,
  };
}

function validateEntityBounds(entity, name) {
  // x debe estar en [0, SCREEN_W]
  assert.ok(
    !isNaN(entity.x),
    `${name}: x is NaN`
  );
  assert.ok(
    entity.x >= 0 && entity.x <= SCREEN_W,
    `${name}: x=${entity.x} fuera de bounds [0,${SCREEN_W}]`
  );

  // y debe estar en [-32, HUD_H + ROWS * TILE]
  assert.ok(
    !isNaN(entity.y),
    `${name}: y is NaN`
  );
  assert.ok(
    entity.y >= -32 && entity.y <= HUD_H + ROWS * TILE,
    `${name}: y=${entity.y} fuera de bounds [-32,${HUD_H + ROWS * TILE}]`
  );

  // velocidades no deben ser NaN
  assert.ok(!isNaN(entity.vx), `${name}: vx is NaN`);
  assert.ok(!isNaN(entity.vy), `${name}: vy is NaN`);
}

function validateGameState(state, frame) {
  // mode debe estar en el conjunto válido
  const validModes = ['title', 'playing', 'paused', 'levelClear', 'gameOver', 'victory'];
  assert.ok(validModes.includes(state.mode), `frame ${frame}: mode '${state.mode}' inválido`);

  // Validar entidades
  for (const p of state.players) {
    validateEntityBounds(p, `P${p.id} en frame ${frame}`);
  }

  for (const e of state.enemies) {
    validateEntityBounds(e, `Enemy ${e.id} en frame ${frame}`);
  }

  for (const b of state.bubbles) {
    validateEntityBounds(b, `Bubble ${b.id} en frame ${frame}`);
  }

  for (const f of state.fruits) {
    validateEntityBounds(f, `Fruit ${f.id} en frame ${frame}`);
  }
}

test('Simulación: 10.000 frames sin excepciones ni NaN (semilla 1)', () => {
  const gameState = createGame({ levels: LEVELS, seed: 1 });
  const rng = createTestRng(42);

  // Iniciar 2 jugadores
  step(gameState, { p1: {}, p2: {}, start1: false, start2: true, pause: false });

  for (let frame = 1; frame <= 10000; frame++) {
    const input = createRandomInput(rng);
    assert.doesNotThrow(() => {
      step(gameState, input);
    }, `no debe tirar excepción en frame ${frame}`);

    validateGameState(gameState, frame);
  }
});

test('Simulación: 10.000 frames sin excepciones ni NaN (semilla 2)', () => {
  const gameState = createGame({ levels: LEVELS, seed: 2 });
  const rng = createTestRng(123);

  step(gameState, { p1: {}, p2: {}, start1: false, start2: true, pause: false });

  for (let frame = 1; frame <= 10000; frame++) {
    const input = createRandomInput(rng);
    assert.doesNotThrow(() => {
      step(gameState, input);
    }, `no debe tirar excepción en frame ${frame}`);

    validateGameState(gameState, frame);
  }
});

test('Simulación: 10.000 frames sin excepciones ni NaN (semilla 3)', () => {
  const gameState = createGame({ levels: LEVELS, seed: 3 });
  const rng = createTestRng(999);

  step(gameState, { p1: {}, p2: {}, start1: false, start2: true, pause: false });

  for (let frame = 1; frame <= 10000; frame++) {
    const input = createRandomInput(rng);
    assert.doesNotThrow(() => {
      step(gameState, input);
    }, `no debe tirar excepción en frame ${frame}`);

    validateGameState(gameState, frame);
  }
});

test('Determinismo: misma semilla + inputs dan el mismo estado a los 3.000 frames', () => {
  // Primera ejecución
  const gameState1 = createGame({ levels: LEVELS, seed: 777, players: 2 });
  const rng1 = createTestRng(555);
  const inputs1 = [];

  step(gameState1, { p1: {}, p2: {}, start1: false, start2: true, pause: false });

  for (let frame = 0; frame < 3000; frame++) {
    const input = createRandomInput(rng1);
    inputs1.push(input);
    step(gameState1, input);
  }

  // Segunda ejecución con los mismos inputs
  const gameState2 = createGame({ levels: LEVELS, seed: 777, players: 2 });
  step(gameState2, { p1: {}, p2: {}, start1: false, start2: true, pause: false });

  for (let frame = 0; frame < 3000; frame++) {
    step(gameState2, inputs1[frame]);
  }

  // Comparar estados (sin rng)
  const json1 = JSON.stringify(gameState1, (key) => (key === 'rng' ? undefined : gameState1[key]));
  const json2 = JSON.stringify(gameState2, (key) => (key === 'rng' ? undefined : gameState2[key]));

  assert.equal(json1, json2, 'estados deben ser idénticos tras 3000 frames con la misma semilla e inputs');
});
