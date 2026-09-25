// Utilidades compartidas por los tests de A (core física). No es un archivo
// *.test.js: node --test no lo corre solo, pero los tests lo importan.

import { COLS, ROWS } from '../src/core/constants.js';

/**
 * Arma una definición de nivel (ROWS strings de COLS caracteres) para tests,
 * con paredes laterales, piso sólido opcional, una plataforma opcional y
 * spawns de jugadores/enemigos en las celdas indicadas.
 */
export function buildLevel({
  floorRow = 25,
  platform = null,
  spawns = {},
} = {}) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array(COLS).fill('.');
    row[0] = '#';
    row[COLS - 1] = '#';
    grid.push(row);
  }

  if (floorRow != null) {
    for (let c = 1; c < COLS - 1; c++) grid[floorRow][c] = '#';
  }

  if (platform) {
    for (let c = platform.colStart; c <= platform.colEnd; c++) {
      grid[platform.row][c] = '=';
    }
  }

  if (spawns.p1) grid[spawns.p1.row][spawns.p1.col] = '1';
  if (spawns.p2) grid[spawns.p2.row][spawns.p2.col] = '2';
  for (const e of spawns.enemies || []) {
    grid[e.row][e.col] = e.ch;
  }

  return {
    name: 'Test level',
    map: grid.map((row) => row.join('')),
    wind: 'center',
  };
}

/** Construye un FrameInput completo, con defaults en false. */
export function frameInput(overrides = {}) {
  return {
    p1: { left: false, right: false, jump: false, fire: false, ...(overrides.p1 || {}) },
    p2: { left: false, right: false, jump: false, fire: false, ...(overrides.p2 || {}) },
    start1: !!overrides.start1,
    start2: !!overrides.start2,
    pause: !!overrides.pause,
  };
}
