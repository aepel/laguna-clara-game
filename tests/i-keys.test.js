// Mapeo de teclas: Nilo (P1) con flechas + Espacio, Lirio (P2) con W A D + F.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input/keys.js';

function press(target, code, type = 'keydown') {
  const e = new Event(type);
  e.code = code;
  e.repeat = false;
  e.preventDefault = () => {};
  target.dispatchEvent(e);
}

test('P1 usa las flechas y Espacio; P2 usa W A D y F', () => {
  const target = new EventTarget();
  const input = createInput(target);
  for (const code of ['ArrowLeft', 'ArrowUp', 'Space', 'KeyD', 'KeyW', 'KeyF']) press(target, code);
  const f = input.read();
  assert.deepEqual(f.p1, { left: true, right: false, jump: true, fire: true });
  assert.deepEqual(f.p2, { left: false, right: true, jump: true, fire: true });
});

test('las teclas viejas ya no mueven a P1', () => {
  const target = new EventTarget();
  const input = createInput(target);
  press(target, 'KeyA');
  press(target, 'Enter');
  const f = input.read();
  assert.equal(f.p1.left, false);
  assert.equal(f.p2.fire, false);
  assert.equal(f.p2.left, true);
});

test('start y pausa siguen iguales', () => {
  const target = new EventTarget();
  const input = createInput(target);
  press(target, 'Digit2');
  press(target, 'KeyP');
  const f = input.read();
  assert.equal(f.start2, true);
  assert.equal(f.pause, true);
});
