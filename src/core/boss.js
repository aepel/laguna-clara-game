// Jefes de Laguna Clara (uno cada 10 niveles). Sistema común + un
// comportamiento por jefe. No toca bubbles.js: lee las burbujas y los eventos
// `popEnemy` que ya se emitieron en este frame.
//
// Daño: una burbuja en fase `shoot` que lo toca → BUBBLE_DAMAGE. Un enemigo
// atrapado reventado cerca del jefe → POP_DAMAGE por burbuja de la cadena.
// La vida del jefe se ve como la barra de limpieza (shared/cleanliness.js).

import { TILE, ROWS, SCREEN_W } from './constants.js';
import { makeEnemy } from './enemies.js';
import { killPlayer } from './player.js';

export const BUBBLE_DAMAGE = 1;
export const POP_DAMAGE = 6;
const POP_RADIUS = 28; // distancia máxima (px) entre la burbuja reventada y el jefe
const INTRO_FRAMES = 90; // entra en escena, invulnerable
const DEFEAT_FRAMES = 120;
const HURT_FRAMES = 12;
const FLOOR_Y = (ROWS - 1) * TILE; // borde superior del piso
const PLAY_W = SCREEN_W;

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function nearestPlayer(state, b) {
  let best = null;
  let bestD = Infinity;
  for (const p of state.players) {
    if (p.state !== 'alive') continue;
    const d = Math.abs(p.x - (b.x + b.w / 2));
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function shoot(state, b, shot) {
  state.bossShots.push({ id: state.nextId++, grav: 0, r: 3, life: 300, ...shot });
  state.events.push({ type: 'bossShot', x: shot.x, y: shot.y, kind: shot.kind });
}

function spawnMinion(state, b, max) {
  const alive = state.enemies.filter((e) => e.state !== 'dying').length;
  if (alive >= max) return;
  const x = Math.max(TILE, Math.min(PLAY_W - 3 * TILE, b.x + b.w / 2 - 7));
  const e = makeEnemy(state, b.minion, x, b.y + b.h - 16);
  state.enemies.push(e);
  state.events.push({ type: 'bossSpawn', x: e.x, y: e.y });
}

// ---------------- comportamientos ----------------

const DEFS = {
  /** Botellón: rueda por el piso, frena, apunta y escupe tapitas. */
  botellon: {
    w: 40, h: 22, hp: 30, minion: 'zen',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = FLOOR_Y - b.h;
      b.dir = -1;
      b.mode = 'roll';
      b.modeTimer = 0;
    },
    update(state, b) {
      const speed = [0.6, 0.9, 1.25][b.phase - 1];
      const rollFor = [220, 180, 140][b.phase - 1];
      b.modeTimer++;
      if (b.mode === 'roll') {
        b.vx = b.dir * speed;
        b.x += b.vx;
        if (b.x < TILE) { b.x = TILE; b.dir = 1; }
        if (b.x + b.w > PLAY_W - TILE) { b.x = PLAY_W - TILE - b.w; b.dir = -1; }
        if (b.modeTimer >= rollFor) { b.mode = 'aim'; b.modeTimer = 0; b.vx = 0; }
      } else if (b.mode === 'aim' && b.modeTimer >= 50) {
        const target = nearestPlayer(state, b);
        const tx = target ? target.x + 7 : PLAY_W / 2;
        const cx = b.dir > 0 ? b.x + b.w : b.x;
        const n = b.phase;
        for (let i = 0; i < n; i++) {
          const spread = (i - (n - 1) / 2) * 0.6;
          const vx = Math.max(-2.2, Math.min(2.2, (tx - cx) / 70)) + spread;
          shoot(state, b, { kind: 'cap', x: cx, y: b.y + 4, vx, vy: -3.4, grav: 0.12, r: 3 });
        }
        if (state.rng() < 0.5 + b.phase * 0.1) spawnMinion(state, b, b.phase + 1);
        b.mode = 'roll';
        b.modeTimer = 0;
        if (target) b.dir = target.x < b.x ? -1 : 1;
      }
    },
  },

  /** Red Fantasma: flota arriba, barre bajando y suelta plomadas. */
  redFantasma: {
    w: 56, h: 24, hp: 30, minion: 'monsta',
    init(b) {
      b.baseY = 3 * TILE;
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = b.baseY;
      b.t = 0;
      b.mode = 'drift';
      b.modeTimer = 0;
    },
    update(state, b) {
      const every = [300, 240, 180][b.phase - 1];
      b.t += [0.012, 0.016, 0.02][b.phase - 1];
      b.w = b.phase === 3 ? 72 : 56;
      const range = (PLAY_W - 2 * TILE - b.w) / 2;
      b.x = PLAY_W / 2 - b.w / 2 + Math.sin(b.t) * range;
      b.modeTimer++;
      if (b.mode === 'drift') {
        b.y += (b.baseY - b.y) * 0.08;
        if (b.modeTimer % [180, 110, 80][b.phase - 1] === 0) {
          shoot(state, b, { kind: 'sinker', x: b.x + b.w / 2, y: b.y + b.h, vx: 0, vy: 0.5, grav: 0.08, r: 3 });
        }
        if (b.modeTimer % 400 === 200) spawnMinion(state, b, b.phase + 1);
        if (b.modeTimer >= every) { b.mode = 'sweep'; b.modeTimer = 0; }
      } else {
        // Baja hasta cerca del piso, espera y vuelve a subir.
        const low = FLOOR_Y - b.h - 3 * TILE;
        if (b.modeTimer < 60) b.y += (low - b.y) * 0.07;
        else if (b.modeTimer > 100) b.y += (b.baseY - b.y) * 0.07;
        if (b.modeTimer >= 170) { b.mode = 'drift'; b.modeTimer = 0; }
      }
    },
  },

  /** Capitán Lata: cangrejo ermitaño en un tacho. Salta hacia vos y al caer
   *  levanta ondas por el piso; en fase 2 tira latas; en fase 3 se esconde y gira. */
  capitanLata: {
    w: 34, h: 30, hp: 34, minion: 'mighta',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = FLOOR_Y - b.h;
      b.vy = 0;
      b.dir = 1;
      b.mode = 'wait';
      b.modeTimer = 0;
    },
    update(state, b) {
      const ground = FLOOR_Y - b.h;
      b.modeTimer++;
      if (b.mode === 'wait') {
        const wait = [70, 55, 40][b.phase - 1];
        if (b.modeTimer >= wait) {
          b.modeTimer = 0;
          if (b.phase === 3 && state.rng() < 0.45) {
            b.mode = 'spin';
            b.dir = state.rng() < 0.5 ? -1 : 1;
          } else {
            const target = nearestPlayer(state, b);
            const tx = target ? target.x + 7 : PLAY_W / 2;
            b.mode = 'jump';
            b.vy = -5.2;
            b.vx = Math.max(-1.6, Math.min(1.6, (tx - (b.x + b.w / 2)) / 55));
            b.dir = b.vx < 0 ? -1 : 1;
          }
        }
      } else if (b.mode === 'jump') {
        b.vy += 0.2;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < TILE) { b.x = TILE; b.vx = -b.vx; }
        if (b.x + b.w > PLAY_W - TILE) { b.x = PLAY_W - TILE - b.w; b.vx = -b.vx; }
        if (b.y >= ground) {
          b.y = ground;
          b.vy = 0;
          b.mode = 'wait';
          b.modeTimer = 0;
          // Al caer, dos ondas por el piso (hay que saltarlas).
          for (const dir of [-1, 1]) {
            shoot(state, b, { kind: 'wave', slide: true, x: b.x + b.w / 2 + dir * (b.w / 2), y: FLOOR_Y - 3, vx: dir * (1.4 + b.phase * 0.25), vy: 0, r: 3, life: 200 });
          }
          if (b.phase >= 2) {
            const target = nearestPlayer(state, b);
            const tx = target ? target.x + 7 : PLAY_W / 2;
            shoot(state, b, { kind: 'can', x: b.x + b.w / 2, y: b.y, vx: (tx - (b.x + b.w / 2)) / 80, vy: -3.8, grav: 0.12, r: 3 });
          }
          if (state.rng() < 0.35) spawnMinion(state, b, b.phase + 1);
        }
      } else if (b.mode === 'spin') {
        // Escondido en el tacho, rueda de pared a pared (las burbujas rebotan).
        b.x += b.dir * 2.4;
        if (b.x < TILE) { b.x = TILE; b.dir = 1; b.bounces = (b.bounces || 0) + 1; }
        if (b.x + b.w > PLAY_W - TILE) { b.x = PLAY_W - TILE - b.w; b.dir = -1; b.bounces = (b.bounces || 0) + 1; }
        if ((b.bounces || 0) >= 2) { b.bounces = 0; b.mode = 'wait'; b.modeTimer = 0; }
      }
      b.shielded = b.mode === 'spin';
    },
  },

  /** Enjambre Arcoíris: millones de fragmentos que forman figuras. Flota,
   *  embiste hacia un jugador y estalla en esquirlas de colores. */
  enjambre: {
    w: 40, h: 40, hp: 34, minion: 'pulpul',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = 6 * TILE;
      b.t = 0;
      b.mode = 'drift';
      b.modeTimer = 0;
      b.vx = 0;
      b.vy = 0;
    },
    update(state, b) {
      b.modeTimer++;
      b.t += 0.02;
      const every = [240, 190, 150][b.phase - 1];
      if (b.mode === 'drift') {
        const hx = PLAY_W / 2 - b.w / 2 + Math.sin(b.t) * 70;
        const hy = 6 * TILE + Math.sin(b.t * 1.7) * 3 * TILE;
        b.x += (hx - b.x) * 0.05;
        b.y += (hy - b.y) * 0.05;
        if (b.modeTimer % 150 === 75) spawnMinion(state, b, b.phase + 1);
        if (b.modeTimer >= every) {
          b.modeTimer = 0;
          const target = nearestPlayer(state, b);
          if (target) {
            // Toma forma de flecha y embiste hacia el jugador.
            const dx = target.x + 7 - (b.x + b.w / 2);
            const dy = target.y + 8 - (b.y + b.h / 2);
            const d = Math.max(1, Math.hypot(dx, dy));
            const sp = 2 + b.phase * 0.4;
            b.vx = (dx / d) * sp;
            b.vy = (dy / d) * sp;
            b.mode = 'charge';
          }
        }
      } else if (b.mode === 'charge') {
        if (b.modeTimer < 20) return; // se prepara (el renderer lo muestra como flecha)
        b.x += b.vx;
        b.y += b.vy;
        const hitWall = b.x < TILE || b.x + b.w > PLAY_W - TILE || b.y < TILE || b.y + b.h > FLOOR_Y;
        if (hitWall || b.modeTimer > 110) {
          b.x = Math.max(TILE, Math.min(PLAY_W - TILE - b.w, b.x));
          b.y = Math.max(TILE, Math.min(FLOOR_Y - b.h, b.y));
          // Estalla en esquirlas y vuelve a juntarse.
          const n = 4 + b.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            shoot(state, b, { kind: 'shard', x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, r: 2, life: 90 });
          }
          b.mode = 'drift';
          b.modeTimer = 0;
        }
      }
    },
  },

  /** Humareda: nube de humo que recorre el techo, deja caer ceniza y suelta
   *  columnas de humo hacia abajo. En fase 3 persigue al jugador. */
  humareda: {
    w: 60, h: 26, hp: 36, minion: 'colilla',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = 2 * TILE;
      b.t = 0;
      b.modeTimer = 0;
      b.mode = 'drift';
    },
    update(state, b) {
      b.modeTimer++;
      b.t += [0.01, 0.014, 0.018][b.phase - 1];
      const target = nearestPlayer(state, b);
      let hx = PLAY_W / 2 - b.w / 2 + Math.sin(b.t) * (PLAY_W / 2 - b.w / 2 - TILE);
      if (b.phase === 3 && target) hx = target.x + 7 - b.w / 2;
      b.x += (hx - b.x) * (b.phase === 3 ? 0.03 : 0.08);
      b.x = Math.max(TILE, Math.min(PLAY_W - TILE - b.w, b.x));
      b.y = 2 * TILE + Math.sin(b.t * 3) * 4;
      // Ceniza liviana que cae todo el tiempo.
      if (b.modeTimer % [40, 30, 22][b.phase - 1] === 0) {
        shoot(state, b, { kind: 'ash', x: b.x + 6 + state.rng() * (b.w - 12), y: b.y + b.h, vx: (state.rng() - 0.5) * 0.4, vy: 0.4, grav: 0.02, r: 2, life: 260 });
      }
      // Columna de humo: una hilera de bocanadas que bajan rápido.
      const every = [200, 160, 120][b.phase - 1];
      if (b.modeTimer % every === every - 1) {
        const cx = target ? Math.max(b.x + 6, Math.min(b.x + b.w - 6, target.x + 7)) : b.x + b.w / 2;
        for (let i = 0; i < 5; i++) {
          shoot(state, b, { kind: 'smoke', x: cx, y: b.y + b.h - i * 7, vx: 0, vy: 2.2, grav: 0, r: 4, life: 110 });
        }
      }
      if (b.modeTimer % 360 === 180) spawnMinion(state, b, b.phase + 1);
    },
  },

  /** Espuma Madre: burbuja de espuma sucia gigante. Se infla y desinfla,
   *  larga bolas de espuma que rebotan y en fase 3 rebota por la arena. */
  espumaMadre: {
    w: 48, h: 44, hp: 36, minion: 'espuma',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = 9 * TILE;
      b.t = 0;
      b.dx = 1;
      b.dy = 1;
      b.modeTimer = 0;
    },
    update(state, b) {
      b.modeTimer++;
      b.t += 0.03;
      b.inflate = 0.5 + Math.sin(b.t) * 0.5; // 0..1, el renderer la dibuja más grande
      if (b.phase === 3) {
        b.x += b.dx * 1.1;
        b.y += b.dy * 0.9;
        if (b.x < TILE || b.x + b.w > PLAY_W - TILE) b.dx = -b.dx;
        if (b.y < 2 * TILE || b.y + b.h > FLOOR_Y) b.dy = -b.dy;
        b.x = Math.max(TILE, Math.min(PLAY_W - TILE - b.w, b.x));
        b.y = Math.max(2 * TILE, Math.min(FLOOR_Y - b.h, b.y));
      } else {
        b.x += (PLAY_W / 2 - b.w / 2 + Math.sin(b.t * 0.4) * 50 - b.x) * 0.04;
      }
      // En el pico de inflado larga bolas de espuma a los costados.
      if (b.inflate > 0.98 && b.modeTimer - (b.lastBurst || -99) > 60) {
        b.lastBurst = b.modeTimer;
        const n = 1 + b.phase;
        for (let i = 0; i < n; i++) {
          const dir = i % 2 ? 1 : -1;
          shoot(state, b, { kind: 'foam', bounce: true, x: b.x + b.w / 2, y: b.y + 6, vx: dir * (0.8 + i * 0.35), vy: -2.6, grav: 0.1, r: 4, life: 360 });
        }
        if (state.rng() < 0.5) spawnMinion(state, b, b.phase + 1);
      }
    },
  },

  /** Gran Rueda: neumático de camión que rebota por la arena y levanta
   *  piedritas en cada pique. En fase 3 también rueda a toda velocidad. */
  granRueda: {
    w: 40, h: 40, hp: 38, minion: 'gomon',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = 6 * TILE;
      b.vx = 1.2;
      b.vy = 0;
      b.spin = 0;
    },
    update(state, b) {
      const ground = FLOOR_Y - b.h;
      const speed = [1.2, 1.6, 2][b.phase - 1];
      b.vx = Math.sign(b.vx || 1) * speed;
      b.vy += 0.16;
      b.x += b.vx;
      b.y += b.vy;
      b.spin += b.vx * 0.08;
      if (b.x < TILE) { b.x = TILE; b.vx = speed; }
      if (b.x + b.w > PLAY_W - TILE) { b.x = PLAY_W - TILE - b.w; b.vx = -speed; }
      if (b.y >= ground) {
        b.y = ground;
        // Pique: vuelve a saltar, más alto en fases avanzadas; en fase 3 a veces rueda al ras.
        const roll = b.phase === 3 && state.rng() < 0.3;
        b.vy = roll ? -1.5 : -[5, 5.6, 6.2][b.phase - 1];
        for (const dir of [-1, 1]) {
          shoot(state, b, { kind: 'gravel', x: b.x + b.w / 2 + dir * 12, y: FLOOR_Y - 4, vx: dir * (0.8 + state.rng()), vy: -2.2 - state.rng(), grav: 0.14, r: 2 });
        }
        if (state.rng() < 0.18) spawnMinion(state, b, b.phase + 1);
      }
    },
  },

  /** Floración: manto de algas tóxicas que tapa la luz desde arriba; suelta
   *  esporas que te siguen, deja caer lianas y hace brotar Verdín. */
  floracion: {
    w: 84, h: 22, hp: 38, minion: 'verdin',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.baseY = 2 * TILE;
      b.y = b.baseY;
      b.t = 0;
      b.modeTimer = 0;
    },
    update(state, b) {
      b.modeTimer++;
      b.t += 0.012;
      b.x = PLAY_W / 2 - b.w / 2 + Math.sin(b.t) * (PLAY_W / 2 - b.w / 2 - TILE);
      // En fase 3 baja un poco y oprime más.
      const targetY = b.phase === 3 ? 6 * TILE : b.baseY;
      b.y += (targetY - b.y) * 0.02;
      if (b.modeTimer % [120, 90, 70][b.phase - 1] === 0) {
        const target = nearestPlayer(state, b);
        const cx = b.x + b.w / 2; const cy = b.y + b.h;
        const dx = target ? target.x + 7 - cx : 0;
        const dy = target ? target.y - cy : 1;
        const d = Math.max(1, Math.hypot(dx, dy));
        shoot(state, b, { kind: 'spore', x: cx, y: cy, vx: (dx / d) * 0.7, vy: (dy / d) * 0.7, r: 3, life: 280 });
      }
      if (b.modeTimer % [260, 200, 150][b.phase - 1] === 130) {
        // Liana: una hilera que cae rápido desde el manto.
        const vx = b.x + 10 + state.rng() * (b.w - 20);
        for (let i = 0; i < 6; i++) shoot(state, b, { kind: 'vine', x: vx, y: b.y + b.h - i * 6, vx: 0, vy: 2.4, r: 3, life: 120 });
      }
      if (b.modeTimer % 380 === 190) spawnMinion(state, b, b.phase + 2);
    },
  },

  /** Anguila Voltio: anguila hecha de pilas que ondula por el agua; se
   *  carga y dispara rayos en cruz (en fase 3, también en diagonal). */
  anguilaVoltio: {
    w: 44, h: 18, hp: 40, minion: 'pila',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = 8 * TILE;
      b.t = 0;
      b.mode = 'swim';
      b.modeTimer = 0;
    },
    update(state, b) {
      b.modeTimer++;
      if (b.mode === 'swim') {
        b.t += [0.015, 0.02, 0.026][b.phase - 1];
        b.x = PLAY_W / 2 - b.w / 2 + Math.sin(b.t) * (PLAY_W / 2 - b.w / 2 - TILE);
        b.y = 11 * TILE + Math.sin(b.t * 2.3) * 7 * TILE;
        b.vx = Math.cos(b.t);
        if (b.modeTimer >= [200, 160, 120][b.phase - 1]) { b.mode = 'charge'; b.modeTimer = 0; }
        if (b.modeTimer === 100) spawnMinion(state, b, b.phase + 1);
      } else if (b.mode === 'charge') {
        b.charging = true;
        if (b.modeTimer >= 50) {
          const dirs = b.phase === 3 ? 8 : 4;
          for (let i = 0; i < dirs; i++) {
            const a = (i / dirs) * Math.PI * 2;
            shoot(state, b, { kind: 'bolt', x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6, r: 2.5, life: 120 });
          }
          b.mode = 'swim';
          b.modeTimer = 0;
          b.charging = false;
        }
      }
    },
  },

  /** La Gran Mancha (nivel 100): el derrame con cara. Fase 1: lluvia de
   *  petróleo y Crudos. Fase 2: embiste por el piso dejando manchas. Fase 3:
   *  intenta volver al caño; si llega, recupera vida. */
  granMancha: {
    w: 64, h: 44, hp: 50, minion: 'lodo',
    init(b) {
      b.x = PLAY_W / 2 - b.w / 2;
      b.y = FLOOR_Y - b.h;
      b.dir = -1;
      b.mode = 'idle';
      b.modeTimer = 0;
    },
    update(state, b) {
      b.modeTimer++;
      const ground = FLOOR_Y - b.h;
      b.y = ground;
      const pipeX = PLAY_W - TILE - b.w; // el caño está a la derecha
      if (b.mode === 'idle') {
        b.x += (PLAY_W / 2 - b.w / 2 - b.x) * 0.02;
        // Lluvia de petróleo desde el techo.
        if (b.modeTimer % [26, 22, 18][b.phase - 1] === 0) {
          shoot(state, b, { kind: 'drop', x: TILE + state.rng() * (PLAY_W - 2 * TILE), y: TILE, vx: 0, vy: 0.6, grav: 0.08, r: 2.5 });
        }
        if (b.modeTimer % 240 === 120) {
          b.minion = state.rng() < 0.5 ? 'zen' : 'lodo';
          spawnMinion(state, b, b.phase + 2);
        }
        if (b.modeTimer >= 260) {
          b.modeTimer = 0;
          if (b.phase === 1) return;
          if (b.phase === 3 && state.rng() < 0.5) { b.mode = 'flee'; return; }
          b.mode = 'dash';
          const target = nearestPlayer(state, b);
          b.dir = target && target.x < b.x ? -1 : 1;
        }
      } else if (b.mode === 'dash') {
        b.x += b.dir * 2.4;
        if (b.modeTimer % 6 === 0) {
          state.hazards.push({ kind: 'oil', x: b.x + b.w / 2 - 6, y: FLOOR_Y - 3, w: 12, h: 3, life: 200, max: 200 });
        }
        if (b.x < TILE || b.x > pipeX) {
          b.x = Math.max(TILE, Math.min(pipeX, b.x));
          b.mode = 'idle';
          b.modeTimer = 0;
        }
      } else if (b.mode === 'flee') {
        // Vuelve hacia el caño: hay que frenarla antes de que llegue.
        b.x += 0.9;
        if (b.x >= pipeX) {
          b.x = pipeX;
          b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * 0.1));
          state.events.push({ type: 'bossHeal', x: b.x + b.w / 2, y: b.y });
          b.mode = 'idle';
          b.modeTimer = 0;
        }
      }
    },
  },
};

export const BOSS_TYPES = Object.keys(DEFS);

/** Crea el jefe del nivel actual, si lo tiene. */
export function spawnBoss(state) {
  state.bossShots = [];
  const type = state.level.boss;
  const def = type && DEFS[type];
  if (!def) { state.boss = null; return; }
  const players = Math.max(1, state.players.length);
  const maxHp = Math.round(def.hp * (players > 1 ? 1.5 : 1));
  const b = {
    type, w: def.w, h: def.h, x: 0, y: 0, vx: 0, vy: 0,
    hp: maxHp, maxHp, phase: 1, state: 'intro', timer: 0, hurt: 0, minion: def.minion,
  };
  def.init(b);
  state.boss = b;
  state.events.push({ type: 'bossIntro', boss: type });
}

function damage(state, b, amount, x, y) {
  if (b.state !== 'fight') return;
  b.hp = Math.max(0, b.hp - amount);
  b.hurt = HURT_FRAMES;
  state.events.push({ type: 'bossHit', amount, x, y });
  const phase = b.hp > (b.maxHp * 2) / 3 ? 1 : b.hp > b.maxHp / 3 ? 2 : 3;
  if (phase !== b.phase) {
    b.phase = phase;
    state.events.push({ type: 'bossPhase', phase });
  }
  if (b.hp === 0) defeat(state, b);
}

function defeat(state, b) {
  b.state = 'dying';
  b.timer = 0;
  state.bossShots = [];
  // Los secuaces quedan libres junto con el jefe.
  for (const e of state.enemies) {
    if (e.state === 'dying') continue;
    e.state = 'dying';
    e.combo = 1;
    e.vx = (state.rng() < 0.5 ? -1 : 1) * 1.2;
    e.vy = -2;
  }
  state.bubbles = state.bubbles.filter((bb) => !bb.trapped);
  state.events.push({ type: 'bossDefeated', boss: b.type, x: b.x + b.w / 2, y: b.y + b.h / 2 });
}

function updateShots(state) {
  for (const s of state.bossShots) {
    s.vy += s.grav;
    s.x += s.vx;
    s.y += s.vy;
    s.life--;
    if (s.slide) {
      // Onda que corre por el piso y se deshace contra la pared.
      if (s.x < TILE || s.x > PLAY_W - TILE) s.life = 0;
    } else if (s.bounce && s.y > FLOOR_Y - s.r) {
      // Bola que rebota en el piso, cada vez más bajo.
      s.y = FLOOR_Y - s.r;
      s.vy = -Math.abs(s.vy) * 0.75;
      if (Math.abs(s.vy) < 0.8) s.life = Math.min(s.life, 20);
    } else {
      if (s.y > FLOOR_Y - s.r) { s.y = FLOOR_Y - s.r; s.life = Math.min(s.life, 20); s.vx *= 0.8; s.vy = 0; }
    }
    if (!s.slide && (s.x < TILE || s.x > PLAY_W - TILE)) s.vx = -s.vx;
    for (const p of state.players) {
      if (p.state !== 'alive' || p.invuln > 0) continue;
      if (s.x > p.x && s.x < p.x + p.w && s.y > p.y && s.y < p.y + p.h) { killPlayer(state, p); s.life = 0; }
    }
  }
  state.bossShots = state.bossShots.filter((s) => s.life > 0);
}

/** Un frame del jefe. Se llama después de updateBubbles. */
export function updateBoss(state) {
  const b = state.boss;
  if (!b) return;
  b.timer++;
  if (b.hurt > 0) b.hurt--;

  if (b.state === 'dying') {
    if (b.timer >= DEFEAT_FRAMES) state.boss = null;
    return;
  }
  // Durante la entrada el jefe aparece pero no ataca ni se mueve.
  if (b.state === 'intro') {
    if (b.timer >= INTRO_FRAMES) { b.state = 'fight'; b.timer = 0; }
    return;
  }

  DEFS[b.type].update(state, b);

  // Daño: burbujas disparadas que lo tocan (se consumen al pegarle).
  const box = { x: b.x, y: b.y, w: b.w, h: b.h };
  state.bubbles = state.bubbles.filter((bb) => {
    if (bb.phase !== 'shoot' || bb.trapped) return true;
    if (!overlap(box, { x: bb.x, y: bb.y, w: 16, h: 16 })) return true;
    if (b.shielded) { bb.vx = -bb.vx; state.events.push({ type: 'bossBlock', x: bb.x + 8, y: bb.y + 8 }); return true; }
    damage(state, b, BUBBLE_DAMAGE, bb.x + 8, bb.y + 8);
    return false;
  });
  // Daño grande: enemigos atrapados reventados al lado del jefe.
  for (const ev of state.events) {
    if (ev.type !== 'popEnemy') continue;
    const cx = ev.x + 8; const cy = ev.y + 8;
    const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w));
    const dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
    if (dx * dx + dy * dy <= POP_RADIUS * POP_RADIUS) damage(state, b, POP_DAMAGE, cx, cy);
  }
  if (b.state === 'dying') return;

  // Contacto con el cuerpo del jefe.
  for (const p of state.players) {
    if (p.state === 'alive' && p.invuln <= 0 && overlap(box, p)) killPlayer(state, p);
  }
  updateShots(state);
}
