import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { wrapVertical } from '../src/core/physics.js';
import { TILE, ROWS } from '../src/core/constants.js';
import { buildLevel, frameInput } from './a-helpers.js';

test('salto: sube al menos 4 tiles', () => {
  const level = buildLevel({ spawns: { p1: { row: 24, col: 5 } } });
  const state = createGame({ levels: [level], seed: 1 });

  step(state, frameInput({ start1: true })); // arranca y se asienta en el piso
  const p = state.players[0];
  const startY = p.y;
  assert.equal(p.onGround, true);

  step(state, frameInput({ p1: { jump: true } })); // flanco de salto
  let minY = p.y;
  for (let i = 0; i < 120; i++) {
    step(state, frameInput({}));
    if (p.y < minY) minY = p.y;
  }

  const risen = startY - minY;
  assert.ok(risen >= 4 * TILE - 2, `esperaba subir ~4 tiles (${4 * TILE}px), subió ${risen}px`);
});

test('plataforma one-way: se atraviesa subiendo y se pisa cayendo', () => {
  const platformRow = 22;
  const level = buildLevel({
    spawns: { p1: { row: 24, col: 5 } },
    platform: { row: platformRow, colStart: 2, colEnd: 10 },
  });
  const state = createGame({ levels: [level], seed: 2 });

  step(state, frameInput({ start1: true }));
  const p = state.players[0];

  step(state, frameInput({ p1: { jump: true } }));

  let passedThrough = false;
  let landedOnPlatform = false;
  for (let i = 0; i < 200; i++) {
    step(state, frameInput({}));
    const bottomRow = Math.floor((p.y + p.h - 1e-6) / TILE);
    if (p.vy < 0 && bottomRow <= platformRow) passedThrough = true;
    if (p.onGround && p.y + p.h === platformRow * TILE) {
      landedOnPlatform = true;
      break;
    }
  }

  assert.ok(passedThrough, 'debería atravesar la plataforma (subiendo, sin bloquearse) al llegar a su fila');
  assert.ok(landedOnPlatform, 'debería quedar parado justo sobre la plataforma al caer');
});

test('wrap vertical: reaparece arriba al pasar el fondo, y viceversa', () => {
  const bottom = ROWS * TILE;

  const fallingThrough = { y: bottom + 1, h: 16 };
  wrapVertical(fallingThrough);
  assert.equal(fallingThrough.y, -16);

  const risingThrough = { y: -20, h: 16 };
  wrapVertical(risingThrough);
  assert.equal(risingThrough.y, bottom);

  const inBounds = { y: 100, h: 16 };
  wrapVertical(inBounds);
  assert.equal(inBounds.y, 100, 'no debería tocar una entidad dentro del playfield');
});
