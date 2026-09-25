import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { buildLevel, frameInput } from './a-helpers.js';

function stripNonSerializable(state) {
  const { rng, levels, ...rest } = state;
  return JSON.stringify(rest);
}

test('determinismo: misma semilla + mismos inputs -> mismo estado tras 600 frames', () => {
  const levelDef = buildLevel({
    spawns: { p1: { row: 24, col: 5 }, enemies: [{ ch: 'z', row: 24, col: 10 }] },
  });

  const stateA = createGame({ levels: [levelDef], seed: 42 });
  const stateB = createGame({ levels: [levelDef], seed: 42 });

  for (let i = 0; i < 600; i++) {
    const input = frameInput({
      start1: i === 0,
      p1: {
        left: i % 15 < 5,
        right: i % 15 >= 5 && i % 15 < 10,
        jump: i % 20 === 0,
        fire: i % 13 === 0,
      },
    });
    step(stateA, input);
    step(stateB, input);
  }

  assert.equal(stripNonSerializable(stateA), stripNonSerializable(stateB));
});
