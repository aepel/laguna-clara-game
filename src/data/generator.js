// Generador determinista de los 100 niveles de Laguna Clara. Cada nivel sale
// de una semilla fija (su número), así que siempre es igual. Los niveles
// comunes se arman con plantillas de plataformas escalonadas cada 4 filas
// (la altura máxima de salto) y se validan con isFullyReachable; si uno no
// pasa, se prueba la siguiente variante.

import { COLS, ROWS } from '../core/constants.js';
import { ZONES, LEVELS_PER_ZONE, TOTAL_LEVELS, zoneOf, isBossSlot, isHardSlot } from './zones.js';
import { BOSS_ARENAS } from './arenas.js';
import { isFullyReachable } from './reach.js';

const TIERS = [21, 17, 13, 9, 5]; // filas de plataformas (los pies quedan una fila arriba)
const MID = COLS / 2; // la mitad izquierda son las columnas 0..MID-1; se espeja la derecha
const P1 = { row: 24, col: 3 };
const P2 = { row: 24, col: COLS - 4 };
const MAX_ATTEMPTS = 80;
export const HARD_ENEMIES = 12;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

// Huecos alineados en techo y piso para el wrap vertical (§5).
const GAPS = [
  [MID - 1, MID],
  [MID - 2, MID - 1, MID, MID + 1],
  [12, 13, COLS - 14, COLS - 13],
  [18, 19, COLS - 20, COLS - 19],
  [8, 9, MID - 1, MID, COLS - 10, COLS - 9],
];

/** Segmentos [c0, c1] de la mitad izquierda (cols 2..MID-1); se espejan después. */
const HALF_PATTERNS = {
  wings: (r) => { const i = int(r, 2, 6); return [[i, Math.min(MID - 1, i + int(r, 8, 15))]]; },
  center: (r) => [[MID - int(r, 5, 12), MID - 1]],
  three: (r) => { const i = int(r, 2, 4); const j = int(r, 12, 15); return [[i, i + int(r, 4, 7)], [j, j + int(r, 3, 6)], [MID - 2, MID - 1]]; },
  split: (r) => [[int(r, 2, 9), MID - 5]],
  edge: (r) => [[2, 2 + int(r, 6, 11)]],
  steps: (r) => { const j = int(r, 10, 13); return [[2, 2 + int(r, 3, 5)], [j, j + int(r, 4, 7)]]; },
};

function blankGrid(gapCols) {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array(COLS).fill('.');
    row[0] = '#';
    row[COLS - 1] = '#';
    if (r === 0 || r === ROWS - 1) {
      for (let c = 1; c < COLS - 1; c++) row[c] = gapCols.includes(c) ? '.' : '#';
    }
    g.push(row);
  }
  return g;
}

function paintTier(g, row, segs, mirror) {
  for (const [c0, c1] of segs) {
    for (let c = c0; c <= c1; c++) {
      g[row][c] = '=';
      if (mirror) g[row][COLS - 1 - c] = '=';
    }
  }
}

function layout(rnd, hard) {
  const g = blankGrid(pick(rnd, GAPS));
  const names = Object.keys(HALF_PATTERNS);
  for (let i = 0; i < TIERS.length; i++) {
    const row = TIERS[i];
    if (i === TIERS.length - 1 && rnd() < 0.3) continue; // a veces el techo queda abierto
    const mirror = rnd() < 0.75;
    let segs = HALF_PATTERNS[pick(rnd, names)](rnd);
    // Nivel difícil: plataformas más cortas, menos refugio.
    if (hard) segs = segs.map(([a, b]) => [a, Math.max(a + 2, b - 3)]);
    if (mirror) {
      paintTier(g, row, segs, true);
    } else {
      paintTier(g, row, segs, false);
      const other = HALF_PATTERNS[pick(rnd, names)](rnd).map(([a, b]) => [COLS - 1 - b, COLS - 1 - a]);
      paintTier(g, row, other, false);
    }
  }
  return g;
}

/** Tipos de enemigo vistos hasta la zona `z`; el de la zona sale más seguido. */
function enemyPool(z) {
  const chars = ZONES.slice(0, z + 1).map((zone) => zone.char);
  return { chars, fresh: ZONES[z].char };
}

function placeEnemies(g, rnd, count, pool) {
  const spots = [];
  for (const row of TIERS) {
    for (let c = 1; c < COLS - 1; c++) {
      if (g[row][c] === '=' && g[row - 1][c] === '.') spots.push([row - 1, c]);
    }
  }
  for (let c = 10; c < COLS - 10; c++) if (g[ROWS - 1][c] === '#') spots.push([ROWS - 2, c]);
  for (let i = 0; i < count && spots.length; i++) {
    const k = Math.floor(rnd() * spots.length);
    const [r, c] = spots.splice(k, 1)[0];
    // El enemigo de la zona aparece más seguido que los viejos.
    const ch = pool.fresh && rnd() < 0.5 ? pool.fresh : pick(rnd, pool.chars);
    g[r][c] = ch;
    // No apilar dos enemigos pegados.
    for (let j = spots.length - 1; j >= 0; j--) if (spots[j][0] === r && Math.abs(spots[j][1] - c) < 2) spots.splice(j, 1);
  }
}

function commonLevel(index, { hard }) {
  const z = zoneOf(index);
  const within = index % LEVELS_PER_ZONE;
  const pool = enemyPool(z);
  // Pantalla ancha: 1,5× los enemigos del diseño de 32 columnas (3..8 → 5..12).
  const base = 3 + Math.floor((within / (LEVELS_PER_ZONE - 2)) * 4) + (z >= 5 ? 1 : 0);
  const count = hard ? HARD_ENEMIES : Math.min(HARD_ENEMIES, Math.round(base * 1.5));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rnd = mulberry32((index + 1) * 7919 + attempt * 104729);
    const g = layout(rnd, hard);
    g[P1.row][P1.col] = '1';
    g[P2.row][P2.col] = '2';
    placeEnemies(g, rnd, count, pool);
    const map = g.map((row) => row.join(''));
    if (isFullyReachable(map)) return { map, wind: pick(rnd, ['center', 'left', 'right']) };
  }
  throw new Error(`generator: no pude armar un nivel alcanzable para ${index + 1}`);
}

/** Definición del nivel `index` (0-based), con los campos de CONTRACT.md §5 y extras de Laguna Clara. */
export function generateLevel(index) {
  const z = zoneOf(index);
  const zone = ZONES[z];
  const within = index % LEVELS_PER_ZONE;
  const base = { zone: z, number: index + 1 };

  if (isBossSlot(index)) {
    return { ...base, name: zone.bossName, map: BOSS_ARENAS[zone.boss], wind: 'center', boss: zone.boss };
  }
  const hard = isHardSlot(index);
  const { map, wind } = commonLevel(index, { hard });
  return { ...base, name: `${zone.name} ${within + 1}`, map, wind, ...(hard ? { hard: true } : {}) };
}

export function generateCampaign() {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => generateLevel(i));
}
