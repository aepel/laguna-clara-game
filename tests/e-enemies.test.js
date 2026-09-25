// Enemigos nuevos de Laguna Clara: Colilla (rastro tóxico) y Espumoso (se divide).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { buildLevel, frameInput } from './a-helpers.js';

function gameWith(ch) {
  const level = buildLevel({ spawns: { p1: { row: 24, col: 3 }, p2: { row: 24, col: 28 }, enemies: [{ ch, row: 24, col: 16 }] } });
  const state = createGame({ levels: [level], seed: 9 });
  step(state, frameInput({ start1: true }));
  return state;
}

test('las letras c y e crean Colilla y Espumoso', () => {
  assert.equal(gameWith('c').enemies[0].type, 'colilla');
  assert.equal(gameWith('e').enemies[0].type, 'espuma');
});

test('la Colilla deja un rastro tóxico que se desvanece', () => {
  const state = gameWith('c');
  for (let i = 0; i < 60; i++) step(state, frameInput());
  assert.ok(state.hazards.length > 0, 'dejó rastro');
  state.enemies = [];
  state.level.spawns.enemies = []; // que el nivel no se dé por limpio
  for (let i = 0; i < 200; i++) step(state, frameInput());
  assert.equal(state.hazards.length, 0, 'el rastro se desvaneció');
});

test('pisar el rastro cuesta una vida', () => {
  const state = gameWith('c');
  const p = state.players[0];
  p.invuln = 0;
  state.enemies = [];
  state.level.spawns.enemies = []; // que el nivel no se dé por limpio
  state.hazards.push({ x: p.x, y: p.y + p.h - 3, w: 10, h: 3, life: 100, max: 100 });
  step(state, frameInput());
  assert.equal(p.state, 'dying');
});

test('la Colilla es más lenta que un Crudo', () => {
  const speed = (ch) => {
    const state = gameWith(ch);
    for (let i = 0; i < 40; i++) step(state, frameInput());
    return Math.abs(state.enemies[0].vx);
  };
  assert.ok(speed('c') < speed('z'));
});

test('un Espumoso que se escapa enojado se divide en dos chicos', () => {
  const state = gameWith('e');
  const foam = state.enemies[0];
  // Simula el escape de una burbuja (lo que hace bubbles.js al vencer el timer).
  foam.state = 'trapped';
  step(state, frameInput());
  foam.state = 'angry';
  step(state, frameInput());
  const foams = state.enemies.filter((e) => e.type === 'espuma');
  assert.equal(foams.length, 2);
  assert.ok(foams.every((e) => e.small && e.w < 14));

  // Los chicos no se vuelven a dividir.
  for (const f of foams) f.state = 'trapped';
  step(state, frameInput());
  for (const f of foams) f.state = 'angry';
  step(state, frameInput());
  assert.equal(state.enemies.filter((e) => e.type === 'espuma').length, 2);
});

test('agarrar crías suma al contador de rescatadas; si se escapan, no', () => {
  const state = gameWith('z');
  state.level.spawns.enemies = []; // que el nivel no se dé por limpio
  state.enemies = [];
  const p = state.players[0];
  state.fruits.push({ id: state.nextId++, x: p.x, y: p.y, vy: 0, kind: 'huevo', points: 1000, crias: 3, ttl: 100, onGround: true });
  step(state, frameInput());
  assert.equal(state.rescued, 3);
  assert.ok(state.events.some((e) => e.type === 'fruitCollect' && e.crias === 3));

  state.fruits.push({ id: state.nextId++, x: 200, y: 20, vy: 0, kind: 'cria', points: 100, crias: 1, ttl: 2, onGround: true });
  let escaped = false;
  for (let i = 0; i < 3; i++) { step(state, frameInput()); escaped ||= state.events.some((e) => e.type === 'criaEscape'); }
  assert.ok(escaped);
  assert.equal(state.rescued, 3);
});

test('al Gomón de frente la burbuja le rebota; desde atrás lo atrapa', () => {
  const run = (fromBehind) => {
    const state = gameWith('g');
    state.level.spawns.enemies = [];
    const g = state.enemies[0];
    const p = state.players[0];
    p.invuln = 9999;
    Object.assign(g, { x: 100, y: p.y, facing: fromBehind ? 1 : -1 }); // el jugador está a la izquierda
    state.bubbles.push({ id: state.nextId++, x: 86, y: p.y, vx: 4, vy: 0, ownerId: 1, phase: 'shoot', age: 0, trapped: null });
    for (let i = 0; i < 4; i++) { g.x = 100; step(state, frameInput()); }
    return g.state;
  };
  assert.notEqual(run(false), 'trapped');
  assert.equal(run(true), 'trapped');
});

test('el Verdín brota otro a su lado con el tiempo', () => {
  const state = gameWith('v');
  for (let i = 0; i < 900; i++) { for (const p of state.players) p.invuln = 9999; step(state, frameInput()); }
  assert.ok(state.enemies.filter((e) => e.type === 'verdin').length > 1);
});

test('la Pila se carga y suelta una descarga', () => {
  const state = gameWith('b');
  let zap = false;
  for (let i = 0; i < 400 && !zap; i++) {
    for (const p of state.players) p.invuln = 9999;
    step(state, frameInput());
    zap = state.hazards.some((h) => h.kind === 'zap');
  }
  assert.ok(zap);
});

test('el Lodo sube al techo y cae cuando el jugador pasa abajo', () => {
  const state = gameWith('l');
  const lodo = state.enemies[0];
  for (let i = 0; i < 300 && lodo._mode !== 'ceiling'; i++) { for (const p of state.players) p.invuln = 9999; step(state, frameInput()); }
  assert.equal(lodo._mode, 'ceiling');
  const p = state.players[0];
  p.x = lodo.x;
  let dropped = false;
  for (let i = 0; i < 10 && !dropped; i++) { p.invuln = 9999; p.x = lodo.x; step(state, frameInput()); dropped = lodo._mode !== 'ceiling'; }
  assert.ok(dropped);
});
