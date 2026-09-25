// IA completa de enemigos (CONTRACT.md §9) y conversión a fruta al morir.
// G reemplaza el stub de A manteniendo las firmas exportadas.

import { ENEMY_W, ENEMY_H, GRAVITY, MAX_FALL, TILE, ANGRY_SPEED_MULT, FRUIT_TTL } from './constants.js';
import { moveAndCollide, wrapVertical, tileAt } from './physics.js';
import { TILE_SOLID, TILE_PLATFORM } from './level.js';

export const ENEMY_BASE_SPEED = 0.6;

// Velocidad de salto de los enemigos de tierra (zen, mighta). No está en
// CONTRACT.md §3 (esa tabla solo define JUMP_VEL para el jugador); se elige
// un valor propio, más chico que el del jugador, para que los saltos de
// borde/persecución se vean naturales sin llegar tan alto como el jugador.
const ENEMY_JUMP_VEL = -3.2;

// Cooldown entre saltos de un mismo enemigo, para no disparar un salto por
// frame mientras la condición (jugador arriba / borde de plataforma) siga activa.
const JUMP_COOLDOWN = 30;

// mighta: camina MIGHTA_WALK_FRAMES y se detiene MIGHTA_PAUSE_FRAMES (§9: "cada
// 180 frames se detiene 20 frames").
const MIGHTA_WALK_FRAMES = 180;
const MIGHTA_PAUSE_FRAMES = 20;
const MIGHTA_CYCLE = MIGHTA_WALK_FRAMES + MIGHTA_PAUSE_FRAMES;

// pulpul: gira cada 60-120 frames al azar (§9).
const PULPUL_TURN_MIN = 60;
const PULPUL_TURN_RANGE = 61; // 60..120 inclusive

// colilla: más lenta, deja rastro tóxico en el piso cada TRAIL_EVERY frames.
const COLILLA_SPEED_MULT = 0.7;
const TRAIL_EVERY = 14;
const TRAIL_LIFE = 150;
// espuma: al escaparse enojada de una burbuja se divide en dos más chicas.
const SMALL_SIZE = 10;

// gomon: neumático que rueda rápido, no salta y de frente hace rebotar las burbujas.
const GOMON_SPEED_MULT = 1.5;
// verdin: alga quieta que brota a su lado cada VERDIN_SPROUT frames.
const VERDIN_SPROUT = 420;
const VERDIN_MAX = 8;
// pila: se carga PILA_CHARGE frames y suelta una descarga alrededor.
const PILA_EVERY = 200;
const PILA_CHARGE = 45;
const ZAP_SIZE = 34;
const ZAP_LIFE = 18;
// lodo: se pega al techo y cae sobre el jugador.
const LODO_DROP_RANGE = 10;

// Laguna Clara: en vez de fruta, cada animal liberado suelta crías de ajolote
// que estaban atrapadas en la contaminación. Mismos puntos que §9; `crias`
// es cuántas se rescatan al agarrarla.
const FRUIT_TABLE = [
  { kind: 'cria', points: 100, crias: 1 },
  { kind: 'crias2', points: 500, crias: 2 },
  { kind: 'huevo', points: 1000, crias: 3 },
  { kind: 'criaDorada', points: 2000, crias: 1 },
  { kind: 'criaArcoiris', points: 5000, crias: 1 },
];

function fruitForCombo(combo) {
  const n = Math.max(1, combo || 1);
  return FRUIT_TABLE[Math.min(n, FRUIT_TABLE.length) - 1];
}

// El puntaje del combo lo acredita bubbles.js al jugador que revienta la cadena.

function isAtPlatformEdge(e, level) {
  const aheadX = e.facing > 0 ? e.x + e.w : e.x - 1;
  const aheadCol = Math.floor(aheadX / TILE);
  const belowRow = Math.floor((e.y + e.h) / TILE);
  const t = tileAt(level, aheadCol, belowRow);
  return t !== TILE_SOLID && t !== TILE_PLATFORM;
}

function speedOf(e) {
  const kind = e.type === 'colilla' ? COLILLA_SPEED_MULT : e.type === 'gomon' ? GOMON_SPEED_MULT : 1;
  return ENEMY_BASE_SPEED * kind * (e.state === 'angry' ? ANGRY_SPEED_MULT : 1);
}

function doJump(e) {
  e.vy = ENEMY_JUMP_VEL;
  e.onGround = false;
  e._jumpCooldown = JUMP_COOLDOWN;
  if (e.state === 'walk') e.state = 'jump';
}

/** zen y mighta: caminan y dan vuelta en paredes, saltan o se dejan caer en bordes. */
function updateGroundEnemy(state, e) {
  const level = state.level;
  const speed = speedOf(e);

  if (e.type === 'mighta') {
    e._pauseTimer = ((e._pauseTimer ?? 0) + 1) % MIGHTA_CYCLE;
  }
  if (e.type === 'colilla' && e.onGround && ++e._trailTimer >= TRAIL_EVERY) {
    e._trailTimer = 0;
    state.hazards.push({ x: e.x + 2, y: e.y + e.h - 3, w: 10, h: 3, life: TRAIL_LIFE, max: TRAIL_LIFE });
  }
  const paused = e.type === 'mighta' && e._pauseTimer >= MIGHTA_WALK_FRAMES;

  e.vx = paused ? 0 : e.facing * speed;
  e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);

  const res = moveAndCollide(e, level, { oneWay: true });
  wrapVertical(e);

  if (res.landed) {
    e.onGround = true;
    e.vy = 0;
    if (e.state === 'jump') e.state = 'walk';
  } else {
    e.onGround = false;
  }

  if (res.hitWall) {
    e.facing *= -1;
    e._edgeRolled = false;
  }

  if (e._jumpCooldown > 0) e._jumpCooldown--;

  if (e.onGround && !paused) {
    const playerAbove = state.players.some(
      (p) => p.state === 'alive' && Math.abs(p.x - e.x) <= 2 * TILE && p.y < e.y
    );
    const edge = isAtPlatformEdge(e, level);

    if (e.type === 'gomon') {
      // Rueda: no salta, se deja caer por los bordes.
    } else if (playerAbove && e._jumpCooldown <= 0) {
      doJump(e);
    } else if (edge) {
      if (!e._edgeRolled) {
        e._edgeRolled = true;
        if (state.rng() < 0.5) doJump(e);
        // si no, se deja caer: no hace nada especial, sigue caminando al vacío.
      }
    } else {
      e._edgeRolled = false;
    }
  }

  e.anim = e.state === 'angry' ? 'angry' : e.onGround ? 'walk' : 'jump';
}

/** monsta: ignora la gravedad, rebota en diagonal contra paredes y techo/piso. */
function updateMonsta(state, e) {
  const speed = speedOf(e);
  e.vx = e._dirX * speed;
  e.vy = e._dirY * speed;

  const res = moveAndCollide(e, state.level, { oneWay: false });
  wrapVertical(e);

  if (res.hitWall) e._dirX *= -1;
  if (res.landed || res.hitCeiling) e._dirY *= -1;

  e.onGround = false;
  e.facing = e._dirX !== 0 ? e._dirX : e.facing;
  e.anim = e.state === 'angry' ? 'angry' : 'walk';
}

/** pulpul: vuela en línea recta, con giros de 90° al azar cada 60-120 frames. */
function updatePulpul(state, e) {
  const speed = speedOf(e);
  e.vx = e._dirX * speed;
  e.vy = e._dirY * speed;

  const res = moveAndCollide(e, state.level, { oneWay: false });
  wrapVertical(e);

  e._turnTimer--;
  const forcedTurn = res.hitWall || res.hitCeiling || res.landed;
  if (e._turnTimer <= 0 || forcedTurn) {
    const dx = e._dirX;
    const dy = e._dirY;
    // giro de 90° al azar, a la izquierda o a la derecha del rumbo actual.
    if (state.rng() < 0.5) {
      e._dirX = -dy;
      e._dirY = dx;
    } else {
      e._dirX = dy;
      e._dirY = -dx;
    }
    e._turnTimer = PULPUL_TURN_MIN + Math.floor(state.rng() * PULPUL_TURN_RANGE);
  }

  e.onGround = false;
  if (e._dirX !== 0) e.facing = e._dirX;
  e.anim = e.state === 'angry' ? 'angry' : 'walk';
}

function updateDying(state, e) {
  e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);
  const res = moveAndCollide(e, state.level, { oneWay: true });
  wrapVertical(e);
  e.anim = 'die';

  if (res.landed) {
    const fruit = fruitForCombo(e.combo);
    state.fruits.push({
      id: state.nextId++,
      x: e.x,
      y: e.y,
      vy: 0,
      kind: fruit.kind,
      points: fruit.points,
      crias: fruit.crias,
      ttl: FRUIT_TTL,
      onGround: true,
    });
    state.events.push({ type: 'fruitSpawn', x: e.x, y: e.y });
    e._dead = true;
  }
}

/**
 * @param {import('./game.js').GameState} state
 */
export function spawnEnemies(state) {
  state.enemies = state.level.spawns.enemies.map((sp, i) => {
    const e = makeEnemy(state, sp.type, sp.x, sp.y);
    // Nivel "bien difícil": la mitad arranca enojada (más rápida).
    if (state.level.hard && i % 2 === 0) {
      e.state = 'angry';
      e.anim = 'angry';
      if (e.vx) e.vx *= ANGRY_SPEED_MULT;
    }
    return e;
  });
}

/** Crea un enemigo listo para simular (lo usan los spawns y los jefes). */
export function makeEnemy(state, type, x, y) {
  const facing = -1;
  const e = {
    id: state.nextId++,
    type,
    x,
    y,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: 0,
    vy: 0,
    facing,
    onGround: false,
    state: 'walk',
    stateTimer: 0,
    anim: 'walk',
    combo: 0,
    _edgeRolled: false,
    _jumpCooldown: 0,
    _pauseTimer: 0,
  };

  if (type === 'colilla') e._trailTimer = 0;
  if (type === 'gomon') e.armoredFront = true;
  if (type === 'verdin') e._sprout = Math.floor(state.rng() * VERDIN_SPROUT);
  if (type === 'pila') e._zapTimer = Math.floor(state.rng() * PILA_EVERY * 0.5);
  if (type === 'lodo') e._mode = 'rise';
  if (type === 'monsta' || type === 'pulpul' || type === 'espuma' || type === 'pila') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const d = dirs[Math.floor(state.rng() * dirs.length)];
    e._dirX = d[0];
    e._dirY = d[1];
    e._turnTimer = PULPUL_TURN_MIN + Math.floor(state.rng() * PULPUL_TURN_RANGE);
    if (d[0] !== 0) e.facing = d[0];
    if (type === 'espuma') { // rebota en diagonal, como monsta
      e._dirX = state.rng() < 0.5 ? -1 : 1;
      e._dirY = state.rng() < 0.5 ? -1 : 1;
      e.facing = e._dirX;
    }
  } else {
    e.vx = facing * ENEMY_BASE_SPEED;
  }

  return e;
}

/** verdin: quieto sobre su plataforma; cada tanto brota otro al lado. */
function updateVerdin(state, e) {
  e.vx = 0;
  e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);
  const res = moveAndCollide(e, state.level, { oneWay: true });
  wrapVertical(e);
  e.onGround = res.landed;
  if (res.landed) e.vy = 0;
  e.anim = e.state === 'angry' ? 'angry' : 'walk';
  if (!e.onGround || ++e._sprout < VERDIN_SPROUT) return;
  e._sprout = 0;
  if (state.enemies.filter((o) => o.type === 'verdin' && o.state !== 'dying').length >= VERDIN_MAX) return;
  const dir = state.rng() < 0.5 ? -1 : 1;
  const nx = e.x + dir * (e.w + 2);
  const below = tileAt(state.level, Math.floor((nx + e.w / 2) / TILE), Math.floor((e.y + e.h) / TILE));
  const blocked = tileAt(state.level, Math.floor((nx + e.w / 2) / TILE), Math.floor((e.y + e.h / 2) / TILE));
  if ((below === TILE_SOLID || below === TILE_PLATFORM) && blocked !== TILE_SOLID) {
    const kid = makeEnemy(state, 'verdin', nx, e.y);
    state.enemies.push(kid);
    state.events.push({ type: 'enemySprout', x: nx, y: e.y });
  }
}

/** pila: vuela como pulpul; se carga (se queda quieta) y suelta una descarga. */
function updatePila(state, e) {
  e._zapTimer++;
  const every = e.state === 'angry' ? PILA_EVERY * 0.6 : PILA_EVERY;
  e.charging = e._zapTimer > every - PILA_CHARGE;
  if (e.charging) {
    e.anim = 'angry';
    if (e._zapTimer >= every) {
      e._zapTimer = 0;
      state.hazards.push({ kind: 'zap', x: e.x + e.w / 2 - ZAP_SIZE / 2, y: e.y + e.h / 2 - ZAP_SIZE / 2, w: ZAP_SIZE, h: ZAP_SIZE, life: ZAP_LIFE, max: ZAP_LIFE });
      state.events.push({ type: 'enemyZap', x: e.x, y: e.y });
    }
    return;
  }
  updatePulpul(state, e);
}

/** lodo: sube hasta el techo, anda pegado ahí y cae cuando un jugador pasa abajo. */
function updateLodo(state, e) {
  const mode = e._mode || 'rise';
  if (mode === 'ground') { updateGroundEnemy(state, e); return; }
  if (mode === 'rise') {
    e.vx = 0;
    e.vy = -1;
    const res = moveAndCollide(e, state.level, { oneWay: false });
    if (res.hitCeiling || e.y <= TILE) e._mode = 'ceiling';
  } else if (mode === 'ceiling') {
    e.vx = e.facing * speedOf(e);
    e.vy = 0;
    const res = moveAndCollide(e, state.level, { oneWay: false });
    if (res.hitWall) e.facing *= -1;
    const below = state.players.some((p) => p.state === 'alive' && p.y > e.y && Math.abs(p.x - e.x) < LODO_DROP_RANGE);
    if (below) { e._mode = 'drop'; state.events.push({ type: 'enemyDrop', x: e.x, y: e.y }); }
  } else if (mode === 'drop') {
    e.vx = 0;
    e.vy = Math.min(e.vy + GRAVITY, MAX_FALL * 1.4);
    const res = moveAndCollide(e, state.level, { oneWay: true });
    wrapVertical(e);
    if (res.landed) { e._mode = 'ground'; e.vy = 0; e.onGround = true; }
  }
  e.onGround = e._mode === 'ground';
  e.anim = e.state === 'angry' ? 'angry' : 'walk';
}

/** Espuma que se escapó enojada: se achica y suelta una gemela chica. */
function splitFoam(state, e) {
  e.small = true;
  e.w = SMALL_SIZE;
  e.h = SMALL_SIZE;
  const twin = makeEnemy(state, 'espuma', e.x, e.y);
  Object.assign(twin, { small: true, w: SMALL_SIZE, h: SMALL_SIZE, state: 'angry', anim: 'angry', _dirX: -e._dirX, _dirY: e._dirY });
  state.enemies.push(twin);
  state.events.push({ type: 'enemySplit', x: e.x, y: e.y });
}

/** Rastro tóxico de las colillas: se desvanece solo. */
function updateHazards(state) {
  for (const h of state.hazards) h.life--;
  state.hazards = state.hazards.filter((h) => h.life > 0);
}

/**
 * @param {import('./game.js').GameState} state
 */
export function updateEnemies(state) {
  if (!state.hazards) state.hazards = [];
  updateHazards(state);
  for (const e of [...state.enemies]) {
    const was = e._prevState;
    e._prevState = e.state;
    if (e.state === 'trapped') continue; // fuera de la simulación normal, lo maneja bubbles.js
    if (e.type === 'espuma' && !e.small && e.state === 'angry' && was === 'trapped') splitFoam(state, e);

    if (e.state === 'dying') {
      updateDying(state, e);
      continue;
    }

    if (e.type === 'monsta' || e.type === 'espuma') updateMonsta(state, e);
    else if (e.type === 'pulpul') updatePulpul(state, e);
    else if (e.type === 'pila') updatePila(state, e);
    else if (e.type === 'verdin') updateVerdin(state, e);
    else if (e.type === 'lodo') updateLodo(state, e);
    else updateGroundEnemy(state, e); // zen, mighta
  }

  state.enemies = state.enemies.filter((e) => !e._dead);
}
