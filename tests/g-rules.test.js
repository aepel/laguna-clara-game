import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/game.js';
import { LEVEL_CLEAR_DELAY, TRAP_TIME, ANGRY_SPEED_MULT } from '../src/core/constants.js';
import { ENEMY_BASE_SPEED } from '../src/core/enemies.js';
import { buildLevel, frameInput } from './a-helpers.js';

test('tipo de cría según combo', () => {
  const cases = [
    { combo: 1, points: 1000, kind: 'cria' },
    { combo: 2, points: 2000, kind: 'crias2' },
    { combo: 3, points: 4000, kind: 'huevo' },
    { combo: 4, points: 8000, kind: 'criaDorada' },
    { combo: 5, points: 8000, kind: 'criaArcoiris' }, // 1000*2^4=16000, tope 8000
    { combo: 8, points: 8000, kind: 'criaArcoiris' },
  ];

  for (const c of cases) {
    const level = buildLevel({
      spawns: { p1: { row: 24, col: 2 }, enemies: [{ ch: 'z', row: 24, col: 20 }] },
    });
    const state = createGame({ levels: [level], seed: 1 });
    step(state, frameInput({ start1: true }));

    const p = state.players[0];
    const enemy = state.enemies[0];
    // Simulamos lo que bubbles.js hace al reventar un combo de `c.combo`
    // enemigos (ver enemies.js: usa `enemy.combo` si está presente).
    enemy.state = 'dying';
    enemy.stateTimer = 0;
    enemy.combo = c.combo;
    enemy.vx = 1.5;
    enemy.vy = -2;
    // ponemos al enemigo justo sobre el jugador para que el crédito de
    // puntaje (jugador vivo más cercano) sea inequívoco.
    enemy.x = p.x;
    enemy.y = p.y - 20;

    let landed = false;
    for (let i = 0; i < 120 && !landed; i++) {
      step(state, frameInput({}));
      if (state.fruits.length > 0) landed = true;
    }

    assert.ok(landed, `combo=${c.combo}: el enemigo debería convertirse en fruta`);
    assert.equal(state.fruits.length, 1);
    assert.equal(state.fruits[0].kind, c.kind, `combo=${c.combo}: tipo de fruta`);
  }
});

test('combo de puntaje: reventar una cadena acredita al jugador que la revienta', () => {
  for (const n of [1, 2, 3, 5]) {
    const level = buildLevel({ spawns: { p1: { row: 24, col: 2 } } });
    const state = createGame({ levels: [level], seed: 1 });
    step(state, frameInput({ start1: true }));
    const p = state.players[0];

    // n burbujas con enemigo encadenadas (se superponen), la primera tocando al jugador de costado.
    for (let i = 0; i < n; i++) {
      const enemy = { id: state.nextId++, type: 'zen', x: 0, y: 0, vx: 0, vy: 0, w: 14, h: 16,
        facing: 1, onGround: false, state: 'trapped', stateTimer: 0, anim: 'walk' };
      state.enemies.push(enemy);
      state.bubbles.push({ id: state.nextId++, x: p.x + 8 + i * 12, y: p.y, vx: 0, vy: 0, ownerId: 1,
        phase: 'float', age: 0, trapped: { enemyType: 'zen', timer: 480 }, _enemyId: enemy.id });
    }

    const before = p.score;
    step(state, frameInput({}));
    const perEnemy = Math.min(1000 * 2 ** (n - 1), 8000);
    assert.equal(p.score - before, perEnemy * n, `n=${n}: puntos`);
    assert.ok(state.enemies.every((e) => e.state === 'dying' && e.combo === n), `n=${n}: enemigos en dying con combo`);
  }
});

test('escape enojado: al vencer el timer de atrapado, el enemigo escapa más rápido', () => {
  const level = buildLevel({
    spawns: { p1: { row: 24, col: 2 }, enemies: [{ ch: 'z', row: 24, col: 10 }] },
  });
  const state = createGame({ levels: [level], seed: 2 });
  step(state, frameInput({ start1: true }));

  const enemy = state.enemies[0];
  // Atrapamos al enemigo a mano con una burbuja en fase float (como haría
  // bubbles.js tras la fase shoot), justo con el timer por vencerse.
  enemy.state = 'trapped';
  enemy.vx = 0;
  enemy.vy = 0;
  const bubble = {
    id: state.nextId++,
    x: enemy.x,
    y: enemy.y,
    vx: 0,
    vy: 0,
    ownerId: 1,
    phase: 'float',
    age: 0,
    trapped: { enemyType: enemy.type, timer: 1 },
    _enemyId: enemy.id,
  };
  state.bubbles.push(bubble);

  step(state, frameInput({}));

  assert.equal(enemy.state, 'angry', 'el enemigo debería escapar enojado');
  assert.equal(state.bubbles.length, 0, 'la burbuja debería desaparecer al escapar');
  const escapeEvent = state.events.find((e) => e.type === 'escape');
  assert.ok(escapeEvent, 'debería emitir el evento escape');

  step(state, frameInput({}));
  assert.ok(
    Math.abs(enemy.vx) > ENEMY_BASE_SPEED,
    'la velocidad enojada debería ser mayor a la base'
  );
  assert.ok(
    Math.abs(Math.abs(enemy.vx) - ENEMY_BASE_SPEED * ANGRY_SPEED_MULT) < 1e-9,
    'la velocidad enojada debería ser BASE * ANGRY_SPEED_MULT'
  );
});

test('levelClear: sin enemigos pasa al siguiente nivel tras LEVEL_CLEAR_DELAY, conservando puntaje y vidas', () => {
  const level1 = buildLevel({
    spawns: { p1: { row: 24, col: 2 }, enemies: [{ ch: 'z', row: 24, col: 10 }] },
  });
  const level2 = buildLevel({ spawns: { p1: { row: 24, col: 6 } } });

  const state = createGame({ levels: [level1, level2], seed: 3 });
  step(state, frameInput({ start1: true }));

  const p = state.players[0];
  p.score = 500;
  p.lives = 2;

  // matamos al único enemigo directamente (sin pasar por bubbles.js)
  state.enemies = [];

  step(state, frameInput({})); // detecta 0 enemigos -> levelClear
  assert.equal(state.mode, 'levelClear');
  const clearEvent = state.events.find((e) => e.type === 'levelClear');
  assert.ok(clearEvent);

  for (let i = 0; i < LEVEL_CLEAR_DELAY + 2; i++) step(state, frameInput({}));

  assert.equal(state.mode, 'playing');
  assert.equal(state.levelIndex, 1);
  assert.equal(state.level.name, 'Test level');
  assert.equal(p.score, 500, 'conserva el puntaje');
  assert.equal(p.lives, 2, 'conserva las vidas');
  assert.equal(p.x, 6 * 8, 'jugador repuesto en el spawn del nuevo nivel');
  assert.equal(state.bubbles.length, 0);
  assert.equal(state.fruits.length, 0);
});

test('victoria tras completar el último nivel', () => {
  const level = buildLevel({
    spawns: { p1: { row: 24, col: 2 }, enemies: [{ ch: 'z', row: 24, col: 10 }] },
  });
  const state = createGame({ levels: [level], seed: 4 });
  step(state, frameInput({ start1: true }));

  state.enemies = [];
  step(state, frameInput({}));
  assert.equal(state.mode, 'levelClear');

  let victoryEvent = null;
  for (let i = 0; i < LEVEL_CLEAR_DELAY + 2; i++) {
    step(state, frameInput({}));
    victoryEvent = victoryEvent || state.events.find((e) => e.type === 'victory');
  }

  assert.equal(state.mode, 'victory');
  assert.ok(victoryEvent);
});

test('gameOver cuando todos los jugadores están muertos', () => {
  const level = buildLevel({
    spawns: { p1: { row: 24, col: 2 }, enemies: [{ ch: 'z', row: 24, col: 10 }] },
  });
  const state = createGame({ levels: [level], seed: 5 });
  step(state, frameInput({ start1: true }));

  const p = state.players[0];
  p.state = 'dead';
  p.lives = 0;

  step(state, frameInput({}));

  assert.equal(state.mode, 'gameOver');
  const goEvent = state.events.find((e) => e.type === 'gameOver');
  assert.ok(goEvent);
});

test('reincorporación en 2 jugadores: un jugador muerto puede volver a entrar con su start', () => {
  const level = buildLevel({
    spawns: {
      p1: { row: 24, col: 2 },
      p2: { row: 24, col: 4 },
      enemies: [{ ch: 'z', row: 24, col: 10 }],
    },
  });
  const state = createGame({ levels: [level], seed: 6 });
  step(state, frameInput({ start1: true, start2: true }));

  const p1 = state.players.find((p) => p.id === 1);
  const p2 = state.players.find((p) => p.id === 2);
  p1.state = 'dead';
  p1.lives = 0;
  p1.score = 999;

  // mientras p1 está muerto pero p2 sigue vivo, no debería ser gameOver
  step(state, frameInput({}));
  assert.equal(state.mode, 'playing');

  step(state, frameInput({ start1: true }));

  const revived = state.players.find((p) => p.id === 1);
  assert.equal(revived.state, 'alive', 'p1 debería reincorporarse');
  assert.equal(revived.lives, 3, 'vidas frescas (START_LIVES)');
  assert.equal(revived.score, 0, 'puntaje en 0');
  assert.equal(p2.state, 'alive', 'p2 sigue como estaba');
});
