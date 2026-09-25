// Jefes (core/boss.js), niveles difíciles y arranque desde una zona.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { LEVELS } from '../src/data/levels.js';
import { BUBBLE_DAMAGE, POP_DAMAGE, BOSS_TYPES } from '../src/core/boss.js';
import { cleanliness } from '../src/shared/cleanliness.js';
import { SCREEN_W } from '../src/core/constants.js';
import { frameInput } from './a-helpers.js';
import { ZONES } from '../src/data/zones.js';

// Nivel (0-based) de cada jefe implementado.
const BOSS_LEVEL = Object.fromEntries(ZONES.map((z, i) => [z.boss, i * 10 + 9]).filter(([b]) => b));

function bossGame(levelIndex = 9, players = 1) {
  const state = createGame({ levels: LEVELS, seed: 11, startLevel: levelIndex });
  step(state, frameInput(players === 2 ? { start2: true } : { start1: true }));
  return state;
}

/** Salta la entrada del jefe y deja a los jugadores quietos e invulnerables. */
function toFight(state) {
  state.boss.state = 'fight';
  state.boss.timer = 0;
  state.enemies = [];
  for (const p of state.players) p.invuln = 9999;
}

test('startLevel arranca la partida en ese nivel', () => {
  const state = createGame({ levels: LEVELS, seed: 1, startLevel: 20 });
  assert.equal(state.levelIndex, 20);
  step(state, frameInput({ start1: true }));
  assert.equal(state.mode, 'playing');
  assert.equal(state.level.zone, 2);
});

test('cada jefe implementado aparece en su nivel', () => {
  assert.deepEqual(BOSS_TYPES, ZONES.map((z) => z.boss));
  for (const type of BOSS_TYPES) {
    const state = bossGame(BOSS_LEVEL[type]);
    assert.equal(state.boss.type, type);
    assert.equal(state.boss.state, 'intro');
    assert.ok(state.events.some((e) => e.type === 'bossIntro'));
  }
});

test('durante la entrada el jefe no se mueve', () => {
  for (const type of BOSS_TYPES) {
    const state = bossGame(BOSS_LEVEL[type]);
    const { x, y } = state.boss;
    for (let i = 0; i < 60; i++) step(state, frameInput());
    assert.deepEqual([state.boss.x, state.boss.y], [x, y], type);
  }
});

test('en dos jugadores el jefe tiene más vida', () => {
  assert.ok(bossGame(9, 2).boss.maxHp > bossGame(9, 1).boss.maxHp);
});

test('durante la entrada el jefe no recibe daño', () => {
  const state = bossGame();
  const b = state.boss;
  state.bubbles.push({ id: state.nextId++, x: b.x + 4, y: b.y + 2, vx: 0, vy: 0, ownerId: 1, phase: 'shoot', age: 0, trapped: null });
  step(state, frameInput());
  assert.equal(b.hp, b.maxHp);
});

test('una burbuja disparada que lo toca le saca vida y se consume', () => {
  const state = bossGame();
  toFight(state);
  const b = state.boss;
  const bubble = { id: state.nextId++, x: b.x + b.w / 2 - 8, y: b.y + 2, vx: 0, vy: 0, ownerId: 1, phase: 'shoot', age: 0, trapped: null };
  state.bubbles.push(bubble);
  step(state, frameInput());
  assert.equal(b.hp, b.maxHp - BUBBLE_DAMAGE);
  assert.ok(!state.bubbles.includes(bubble));
  assert.ok(state.events.some((e) => e.type === 'bossHit'));
  assert.ok(cleanliness(state) > 0);
});

test('reventar un enemigo atrapado al lado del jefe le saca mucha vida', () => {
  const state = bossGame();
  toFight(state);
  const b = state.boss;
  const p = state.players[0];
  // Burbuja con un Crudo atrapado, justo arriba del jefe, y el jugador tocándola.
  const enemy = { id: state.nextId++, type: 'zen', x: 0, y: 0, w: 14, h: 16, vx: 0, vy: 0, facing: 1, state: 'trapped', stateTimer: 0, anim: 'walk' };
  state.enemies.push(enemy);
  const bx = b.x + b.w / 2 - 8; const by = b.y - 18;
  state.bubbles.push({ id: state.nextId++, x: bx, y: by, vx: 0, vy: 0, ownerId: 1, phase: 'float', age: 30, trapped: { enemyType: 'zen', timer: 400 }, _enemyId: enemy.id });
  Object.assign(p, { x: bx + 1, y: by + 2, vx: 0, vy: 0 });
  step(state, frameInput());
  assert.ok(b.hp <= b.maxHp - POP_DAMAGE, `hp ${b.hp} de ${b.maxHp}`);
});

test('las fases cambian con la vida y al vencerlo el nivel queda limpio', () => {
  const state = bossGame();
  toFight(state);
  const b = state.boss;
  b.hp = Math.floor(b.maxHp / 3) + 1;
  b.phase = 2;
  const hitOnce = () => state.bubbles.push({ id: state.nextId++, x: b.x + b.w / 2 - 8, y: b.y + 2, vx: 0, vy: 0, ownerId: 1, phase: 'shoot', age: 0, trapped: null });
  hitOnce();
  step(state, frameInput());
  assert.equal(b.phase, 3);
  assert.ok(state.events.some((e) => e.type === 'bossPhase' && e.phase === 3));

  b.hp = 1;
  hitOnce();
  step(state, frameInput());
  assert.equal(b.state, 'dying');
  assert.ok(state.events.some((e) => e.type === 'bossDefeated'));

  let cleared = false;
  for (let i = 0; i < 400 && !cleared; i++) {
    step(state, frameInput());
    if (state.mode === 'levelClear') cleared = true;
  }
  assert.ok(cleared, 'el nivel pasa a levelClear');
  assert.equal(state.boss, null);
});

test('tocar al jefe cuesta una vida', () => {
  const state = bossGame();
  toFight(state);
  const b = state.boss;
  const p = state.players[0];
  p.invuln = 0;
  Object.assign(p, { x: b.x + 4, y: b.y + 2 });
  step(state, frameInput());
  assert.equal(p.state, 'dying');
});

test('cada jefe dispara y trae secuaces con el tiempo', () => {
  for (const type of BOSS_TYPES) {
    const state = bossGame(BOSS_LEVEL[type]);
    toFight(state);
    let shots = 0; let minions = 0;
    for (let i = 0; i < 1500; i++) {
      for (const p of state.players) p.invuln = 9999;
      step(state, frameInput());
      shots += state.events.filter((e) => e.type === 'bossShot').length;
      minions += state.events.filter((e) => e.type === 'bossSpawn').length;
      for (const e of state.bossShots) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), type);
    }
    assert.ok(shots > 0, `${type} disparó`);
    assert.ok(minions > 0, `${type} trajo secuaces`);
    assert.ok(state.boss.x >= 0 && state.boss.x + state.boss.w <= SCREEN_W, `${type} queda en pantalla`);
  }
});

test('Capitán Lata escondido en el tacho hace rebotar las burbujas', () => {
  const state = bossGame(BOSS_LEVEL.capitanLata);
  toFight(state);
  const b = state.boss;
  b.phase = 3;
  b.mode = 'spin';
  b.dir = 1;
  const bubble = { id: state.nextId++, x: b.x + 4, y: b.y + 6, vx: 4, vy: 0, ownerId: 1, phase: 'shoot', age: 0, trapped: null };
  state.bubbles.push(bubble);
  step(state, frameInput());
  assert.equal(b.hp, b.maxHp);
  assert.ok(state.events.some((e) => e.type === 'bossBlock'));
});

test('en un nivel difícil la mitad de los enemigos arranca enojada', () => {
  const idx = LEVELS.findIndex((l) => l.hard);
  const state = createGame({ levels: LEVELS, seed: 3, startLevel: idx });
  step(state, frameInput({ start1: true }));
  const angry = state.enemies.filter((e) => e.state === 'angry').length;
  assert.equal(angry, Math.ceil(state.enemies.length / 2));
});
