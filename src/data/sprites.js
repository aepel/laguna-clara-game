// data/sprites.js — dueño: B (Sprites)
// Formato: ver CONTRACT.md §12. Cada sprite es { palette, frames, fps }.
// frames = arrays de filas (strings), cada carácter es un índice hex en PALETTES[palette].
// '.' y '0' son transparentes. Personajes/enemigos/burbujas/frutas: 16x16. Tiles: 8x8.
//
// Las formas se generan con pequeños helpers geométricos (rect/circle/ring) en vez de
// tipearse a mano fila por fila: son más fáciles de mantener y de reusar (p.ej. bob
// reutiliza literalmente los arrays de frames de bub, solo cambia la paleta).

const SIZE = 16;
const TSIZE = 8;

/** Crea una grilla NxN llena de '.' (transparente). */
function blank(n) {
  return Array.from({ length: n }, () => Array(n).fill('.'));
}

/** Convierte una grilla (array de arrays) en un frame (array de strings). */
function toRows(g) {
  return g.map((row) => row.join(''));
}

/** Pinta un pixel si cae dentro de la grilla (fuera de rango = no-op). */
function px(g, x, y, ch) {
  const yi = Math.round(y);
  const xi = Math.round(x);
  if (yi >= 0 && yi < g.length && xi >= 0 && xi < g[0].length) g[yi][xi] = ch;
}

/** Rectángulo relleno inclusive [x0,x1]x[y0,y1]. */
function rect(g, x0, y0, x1, y1, ch) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) px(g, x, y, ch);
  }
}

/** Círculo relleno de centro (cx,cy) y radio r. */
function circle(g, cx, cy, r, ch) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) px(g, x, y, ch);
    }
  }
}

/** Anillo (borde de círculo) de espesor `thickness`. */
function ring(g, cx, cy, r, ch, thickness = 1) {
  const rOuter2 = r * r;
  const rInner = Math.max(0, r - thickness);
  const rInner2 = rInner * rInner;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= rOuter2 && d2 >= rInner2) px(g, x, y, ch);
    }
  }
}

/** Desplaza la grilla `n` filas hacia abajo (para animaciones de caída/muerte). */
function shiftDown(g, n) {
  const h = g.length;
  const g2 = blank(h);
  for (let y = 0; y < h; y++) {
    const sy = y - n;
    if (sy >= 0 && sy < h) g2[y] = g[sy].slice();
  }
  return g2;
}

/** Espeja horizontalmente (para variar el 2do frame de muerte). */
function flipH(g) {
  return g.map((row) => row.slice().reverse());
}

// ---------------------------------------------------------------------------
// bub / bob — dragoncitos. Dibujados a mano fila por fila (en vez de con los
// helpers geométricos) para poder controlar bien la silueta: cabeza grande y
// redonda mirando a la derecha, ojo grande, hocico redondeado, cuerpo redondo
// con panza clara, cresta de púas en el lomo, patitas cortas y colita.
// Esquema de índices compartido con el resto de los sprites: 1 = contorno/
// oscuro, 2 = cuerpo base, 3 = resalte claro del lomo, 4 = blanco (ojo/púas),
// 5 = acento secundario (panza), 6 = acento rojo (no usado acá).
// ---------------------------------------------------------------------------

// Filas 0-13: cabeza + cuerpo + panza + cresta, comunes a casi todas las
// animaciones. Las filas 14-15 (patas) y algunas filas puntuales (ojo/boca)
// se sobreescriben por animación más abajo.
const DRAGON_BODY = [
  '................',
  '......4.4.4.....',
  '......12221.....',
  '....133222221...',
  '...13322224421..',
  '...12222224411..',
  '..1222222222231.',
  '..1222222222211.',
  '..122222222221..',
  '..1225555555221.',
  '..12555555555221',
  '...12555555521..',
  '...12555555521..',
  '.21.12222221....',
];

function dragonFrame({ legRows, eyeRows, mouthRows } = {}) {
  const rows = DRAGON_BODY.slice();
  if (eyeRows) {
    rows[4] = eyeRows[0];
    rows[5] = eyeRows[1];
  }
  if (mouthRows) {
    rows[7] = mouthRows[0];
    rows[8] = mouthRows[1];
  }
  rows.push(...(legRows || ['................', '................']));
  return rows;
}

// patas: pie izquierdo y derecho, más su punta (usadas para caminar).
const LEGS_STAND = ['......11.11.....', '.......1.1......'];
const LEGS_WALK1 = ['......11.11.....', '.......1........']; // pierna izq. adelante
const LEGS_WALK2 = ['......11.11.....', '.........1......']; // pierna der. adelante
const LEGS_TUCKED = ['................', '................']; // saltando/recogidas
const LEGS_SPREAD = ['....1......1....', '...1........1...']; // cayendo

// ojos cerrados en X, para la animación de muerte.
const EYES_CLOSED = ['...13322221121..', '...12222221111..'];
// boca abierta (disparando burbuja), en vez de la boca cerrada de DRAGON_BODY.
const MOUTH_OPEN = ['..1222222222111.', '..1222222222111.'];

const dragonIdle = dragonFrame({ legRows: LEGS_STAND });
const dragonWalk1 = dragonFrame({ legRows: LEGS_WALK1 });
const dragonWalk2 = dragonFrame({ legRows: LEGS_WALK2 });
const dragonJump = dragonFrame({ legRows: LEGS_TUCKED });
const dragonFall = dragonFrame({ legRows: LEGS_SPREAD });
const dragonShoot = dragonFrame({ legRows: LEGS_STAND, mouthRows: MOUTH_OPEN });
const dragonDie1 = dragonFrame({ legRows: LEGS_TUCKED, eyeRows: EYES_CLOSED });
const dragonDie2 = toRows(flipH(shiftDown(dragonDie1.map((row) => row.split('')), 1)));

const DRAGON_FRAMES = {
  idle: [dragonIdle],
  walk: [dragonWalk1, dragonWalk2],
  jump: [dragonJump],
  fall: [dragonFall],
  shoot: [dragonShoot],
  die: [dragonDie1, dragonDie2],
};

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

function zenBody(legPhase) {
  const g = blank(SIZE);
  rect(g, 3, 3, 12, 10, '2');
  rect(g, 4, 4, 11, 6, '3');
  circle(g, 8, 5, 1.3, '4');
  px(g, 8, 5, '1');
  rect(g, 6, 8, 9, 8, '5');
  px(g, 7, 1, '1');
  px(g, 7, 2, '1');
  px(g, 8, 1, '5');
  rect(g, 3, 3, 12, 3, '1');
  rect(g, 3, 10, 12, 10, '1');
  rect(g, 3, 3, 3, 10, '1');
  rect(g, 12, 3, 12, 10, '1');
  const a = legPhase === 0 ? 13 : 12;
  const b = legPhase === 0 ? 12 : 13;
  rect(g, 4, 11, 6, a, '1');
  rect(g, 9, 11, 11, b, '1');
  return g;
}

function mightaBody(phase) {
  const g = blank(SIZE);
  for (let y = 2; y <= 6; y++) {
    const half = y - 1;
    rect(g, 8 - half, y, 8 + half, y, '2');
  }
  rect(g, 3, 7, 12, 12, '2');
  rect(g, 4, 8, 11, 11, '3');
  rect(g, 6, 5, 9, 6, '1');
  px(g, 6, 5, '4');
  px(g, 9, 5, '4');
  const handY = phase === 0 ? 9 : 10;
  circle(g, 4, handY, 1, '5');
  circle(g, 11, handY, 1, '5');
  const hem = phase === 0 ? 13 : 12;
  rect(g, 3, 13, 12, hem, '1');
  return g;
}

function monstaBody(phase) {
  const g = blank(SIZE);
  circle(g, 8, 7, 6, '2');
  circle(g, 6, 5, 3, '3');
  circle(g, 13, 9, 2, '2');
  circle(g, 6, 7, 1.4, '4');
  circle(g, 10, 7, 1.4, '4');
  px(g, 6, 7, '1');
  px(g, 10, 7, '1');
  const wave = phase === 0 ? [0, 1, 0, 1] : [1, 0, 1, 0];
  for (let i = 0; i < 4; i++) {
    const x0 = 3 + i * 3;
    const y0 = 12 + wave[i];
    rect(g, x0, y0, x0 + 2, 13 + wave[i], '2');
  }
  return g;
}

function pulpulBody(phase) {
  const g = blank(SIZE);
  circle(g, 8, 6, 5, '2');
  circle(g, 6, 4, 2.2, '3');
  circle(g, 6, 6, 1.4, '4');
  circle(g, 10, 6, 1.4, '4');
  px(g, 6, 6, '1');
  px(g, 10, 6, '1');
  const off = phase === 0 ? 0 : 1;
  for (let i = 0; i < 4; i++) {
    const x0 = 3 + i * 3;
    const y0 = 10 + ((i + off) % 2);
    rect(g, x0, y0, x0 + 1, y0 + 3, '2');
  }
  return g;
}

/** "Poof" genérico para el frame de muerte de cualquier enemigo. */
function poofFrame() {
  const g = blank(SIZE);
  circle(g, 8, 8, 6, '3');
  ring(g, 8, 8, 6, '1', 1);
  const spikes = [
    [3, 3], [12, 3], [3, 12], [12, 12], [8, 2], [8, 13], [2, 8], [13, 8],
  ];
  for (const [x, y] of spikes) px(g, x, y, '1');
  return g;
}

const ZEN_WALK = [toRows(zenBody(0)), toRows(zenBody(1))];
const ZEN_DIE = [toRows(poofFrame())];

const MIGHTA_WALK = [toRows(mightaBody(0)), toRows(mightaBody(1))];
const MIGHTA_DIE = [toRows(poofFrame())];

const MONSTA_WALK = [toRows(monstaBody(0)), toRows(monstaBody(1))];
const MONSTA_DIE = [toRows(poofFrame())];

const PULPUL_WALK = [toRows(pulpulBody(0)), toRows(pulpulBody(1))];
const PULPUL_DIE = [toRows(poofFrame())];

// ---------------------------------------------------------------------------
// Burbujas
// ---------------------------------------------------------------------------

function bubbleFrame(variant) {
  const g = blank(SIZE);
  circle(g, 8, 8, 6, '2');
  ring(g, 8, 8, 6, '1', 1);
  if (variant === 0) {
    circle(g, 6, 6, 1.4, '3');
  } else {
    circle(g, 10, 6, 1.2, '3');
    circle(g, 6, 6, 0.8, '3');
  }
  return g;
}

function bubblePopFrame() {
  const g = blank(SIZE);
  circle(g, 8, 8, 2, '3');
  ring(g, 8, 8, 3, '1', 1);
  const spikes = [
    [8, 1], [8, 15], [1, 8], [15, 8], [3, 3], [13, 3], [3, 13], [13, 13],
  ];
  for (const [x, y] of spikes) {
    px(g, x, y, '1');
    const dx = x < 8 ? 1 : x > 8 ? -1 : 0;
    const dy = y < 8 ? 1 : y > 8 ? -1 : 0;
    px(g, x + dx, y + dy, '4');
  }
  return g;
}

function bubbleTrappedFrame() {
  const g = blank(SIZE);
  ring(g, 8, 8, 6, '1', 1);
  ring(g, 8, 8, 5, '4', 1);
  return g;
}

const BUBBLE_NORMAL = [toRows(bubbleFrame(0)), toRows(bubbleFrame(1))];
const BUBBLE_POP = [toRows(bubblePopFrame())];
const BUBBLE_TRAPPED = [toRows(bubbleTrappedFrame())];

// ---------------------------------------------------------------------------
// Frutas
// ---------------------------------------------------------------------------

function cherryFrame() {
  const g = blank(SIZE);
  rect(g, 8, 2, 8, 5, '1');
  rect(g, 9, 2, 9, 4, '1');
  circle(g, 6, 10, 3, '2');
  circle(g, 11, 11, 3, '2');
  circle(g, 5, 9, 1, '3');
  circle(g, 10, 10, 1, '3');
  return g;
}

function bananaFrame() {
  const g = blank(SIZE);
  for (let y = 3; y <= 12; y++) {
    const x0 = 5 + Math.round(3 * Math.sin(((y - 3) / 9) * Math.PI));
    rect(g, x0, y, x0 + 3, y, '2');
  }
  px(g, 5, 3, '1');
  px(g, 9, 12, '1');
  circle(g, 6, 5, 0.8, '3');
  return g;
}

function peachFrame() {
  const g = blank(SIZE);
  circle(g, 8, 9, 6, '2');
  circle(g, 6, 6, 2.5, '3');
  rect(g, 8, 3, 8, 8, '1');
  px(g, 8, 2, '1');
  return g;
}

function watermelonFrame() {
  const g = blank(SIZE);
  circle(g, 8, 9, 6, '1');
  circle(g, 8, 9, 5, '2');
  for (let y = 4; y <= 14; y++) {
    for (let x = 8; x <= 13; x++) {
      if ((x - 8) * (x - 8) + (y - 9) * (y - 9) <= 16) px(g, x, y, '3');
    }
  }
  circle(g, 10, 8, 0.6, '4');
  circle(g, 11, 10, 0.6, '4');
  return g;
}

function diamondFrame() {
  const g = blank(SIZE);
  for (let y = 3; y <= 12; y++) {
    const half = y <= 6 ? (y - 2) * 2 : (12 - y) * 1.6 + 2;
    rect(g, 8 - half, y, 8 + half, y, '2');
  }
  ring(g, 8, 7, 5, '1', 1);
  px(g, 8, 3, '3');
  px(g, 5, 6, '3');
  return g;
}

// ---------------------------------------------------------------------------
// Tiles (8x8)
// ---------------------------------------------------------------------------

function solidTile() {
  const g = blank(TSIZE);
  rect(g, 0, 0, 7, 7, '2');
  rect(g, 0, 0, 7, 0, '1');
  rect(g, 0, 7, 7, 7, '1');
  rect(g, 0, 0, 0, 7, '1');
  rect(g, 7, 0, 7, 7, '1');
  rect(g, 0, 3, 3, 3, '1');
  rect(g, 4, 0, 4, 3, '1');
  rect(g, 4, 4, 7, 4, '1');
  px(g, 1, 1, '3');
  px(g, 5, 5, '3');
  px(g, 2, 5, '3');
  px(g, 6, 1, '3');
  return g;
}

function platformTile() {
  const g = blank(TSIZE);
  rect(g, 0, 0, 7, 2, '2');
  rect(g, 0, 0, 7, 0, '1');
  rect(g, 0, 2, 7, 2, '1');
  px(g, 1, 1, '3');
  px(g, 4, 1, '3');
  px(g, 6, 1, '3');
  return g;
}

const TILE_SOLID = toRows(solidTile());
const TILE_PLATFORM = toRows(platformTile());

// ---------------------------------------------------------------------------
// Paletas
// ---------------------------------------------------------------------------

export const PALETTES = {
  bub: ['#00000000', '#000000', '#3cbc3c', '#a0f0a0', '#ffffff', '#f8d878', '#e03030'],
  bob: ['#00000000', '#000000', '#3060e0', '#90c0ff', '#ffffff', '#f8d878', '#e03030'],

  zen: ['#00000000', '#101010', '#8f97a3', '#c7ced6', '#ffffff', '#ffd23f', '#e03030'],
  zenAngry: ['#00000000', '#200000', '#a33232', '#e07a7a', '#ffffff', '#ffd23f', '#ffffff'],

  mighta: ['#00000000', '#100018', '#6a2fae', '#b98cf0', '#ffe9a8', '#ffffff', '#e03030'],
  mightaAngry: ['#00000000', '#200000', '#ae2f3f', '#f08c9c', '#ffe9a8', '#ffffff', '#ffffff'],

  monsta: ['#00000000', '#180030', '#6a3fae', '#b28cf0', '#ffffff', '#e9d9ff', '#e03030'],
  monstaAngry: ['#00000000', '#300000', '#ae3f4f', '#f08ca0', '#ffffff', '#ffd9d9', '#ffffff'],

  pulpul: ['#00000000', '#2a0030', '#c33fae', '#ff9fe0', '#ffffff', '#ffe9ff', '#e03030'],
  pulpulAngry: ['#00000000', '#300000', '#c3423f', '#ff9f9f', '#ffffff', '#ffe9e9', '#ffffff'],

  bubble: ['#00000000', '#2050a0', '#a8dcff', '#ffffff', '#5090ff'],

  fruitCherry: ['#00000000', '#5a3418', '#e0303f', '#ff8fa0'],
  fruitBanana: ['#00000000', '#7a5a10', '#ffe14d', '#fff6b0'],
  fruitPeach: ['#00000000', '#7a2a10', '#ff9d5c', '#ffd9a0'],
  fruitWatermelon: ['#00000000', '#123c17', '#3fae52', '#ff4d5e', '#ffffff'],
  fruitDiamond: ['#00000000', '#104060', '#5fd0ff', '#ffffff'],

  level0: ['#00000000', '#202028', '#606878', '#a8b0c0'],
  level1: ['#00000000', '#2a1008', '#a04030', '#e0a070'],
  level2: ['#00000000', '#0c2410', '#2f7a3f', '#8fe0a0'],
  level3: ['#00000000', '#180830', '#4a3aa0', '#a898ff'],
};

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

export const SPRITES = {
  'bub.idle': { palette: 'bub', frames: DRAGON_FRAMES.idle, fps: 1 },
  'bub.walk': { palette: 'bub', frames: DRAGON_FRAMES.walk, fps: 8 },
  'bub.jump': { palette: 'bub', frames: DRAGON_FRAMES.jump, fps: 1 },
  'bub.fall': { palette: 'bub', frames: DRAGON_FRAMES.fall, fps: 1 },
  'bub.shoot': { palette: 'bub', frames: DRAGON_FRAMES.shoot, fps: 1 },
  'bub.die': { palette: 'bub', frames: DRAGON_FRAMES.die, fps: 6 },

  // bob usa exactamente los mismos arrays de frames que bub, solo cambia la paleta.
  'bob.idle': { palette: 'bob', frames: DRAGON_FRAMES.idle, fps: 1 },
  'bob.walk': { palette: 'bob', frames: DRAGON_FRAMES.walk, fps: 8 },
  'bob.jump': { palette: 'bob', frames: DRAGON_FRAMES.jump, fps: 1 },
  'bob.fall': { palette: 'bob', frames: DRAGON_FRAMES.fall, fps: 1 },
  'bob.shoot': { palette: 'bob', frames: DRAGON_FRAMES.shoot, fps: 1 },
  'bob.die': { palette: 'bob', frames: DRAGON_FRAMES.die, fps: 6 },

  'zen.walk': { palette: 'zen', frames: ZEN_WALK, fps: 8 },
  'zen.angry': { palette: 'zenAngry', frames: ZEN_WALK, fps: 12 },
  'zen.die': { palette: 'zen', frames: ZEN_DIE, fps: 1 },

  'mighta.walk': { palette: 'mighta', frames: MIGHTA_WALK, fps: 8 },
  'mighta.angry': { palette: 'mightaAngry', frames: MIGHTA_WALK, fps: 12 },
  'mighta.die': { palette: 'mighta', frames: MIGHTA_DIE, fps: 1 },

  'monsta.walk': { palette: 'monsta', frames: MONSTA_WALK, fps: 8 },
  'monsta.angry': { palette: 'monstaAngry', frames: MONSTA_WALK, fps: 12 },
  'monsta.die': { palette: 'monsta', frames: MONSTA_DIE, fps: 1 },

  'pulpul.walk': { palette: 'pulpul', frames: PULPUL_WALK, fps: 8 },
  'pulpul.angry': { palette: 'pulpulAngry', frames: PULPUL_WALK, fps: 12 },
  'pulpul.die': { palette: 'pulpul', frames: PULPUL_DIE, fps: 1 },

  'bubble.normal': { palette: 'bubble', frames: BUBBLE_NORMAL, fps: 10 },
  'bubble.pop': { palette: 'bubble', frames: BUBBLE_POP, fps: 1 },
  'bubble.trapped': { palette: 'bubble', frames: BUBBLE_TRAPPED, fps: 1 },

  'fruit.cherry': { palette: 'fruitCherry', frames: [toRows(cherryFrame())], fps: 1 },
  'fruit.banana': { palette: 'fruitBanana', frames: [toRows(bananaFrame())], fps: 1 },
  'fruit.peach': { palette: 'fruitPeach', frames: [toRows(peachFrame())], fps: 1 },
  'fruit.watermelon': { palette: 'fruitWatermelon', frames: [toRows(watermelonFrame())], fps: 1 },
  'fruit.diamond': { palette: 'fruitDiamond', frames: [toRows(diamondFrame())], fps: 1 },

  'tile.solid.level0': { palette: 'level0', frames: [TILE_SOLID], fps: 1 },
  'tile.solid.level1': { palette: 'level1', frames: [TILE_SOLID], fps: 1 },
  'tile.solid.level2': { palette: 'level2', frames: [TILE_SOLID], fps: 1 },
  'tile.solid.level3': { palette: 'level3', frames: [TILE_SOLID], fps: 1 },

  'tile.platform.level0': { palette: 'level0', frames: [TILE_PLATFORM], fps: 1 },
  'tile.platform.level1': { palette: 'level1', frames: [TILE_PLATFORM], fps: 1 },
  'tile.platform.level2': { palette: 'level2', frames: [TILE_PLATFORM], fps: 1 },
  'tile.platform.level3': { palette: 'level3', frames: [TILE_PLATFORM], fps: 1 },
};
