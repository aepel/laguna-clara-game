import { COLS, ROWS, TILE, PLAYER_H, ENEMY_H } from './constants.js';

// Tipos de tile numéricos (ver CONTRACT.md §5)
export const TILE_EMPTY = 0;
export const TILE_SOLID = 1;
export const TILE_PLATFORM = 2;

const ENEMY_CHARS = { z: 'zen', m: 'mighta', o: 'monsta', p: 'pulpul', c: 'colilla', e: 'espuma', g: 'gomon', v: 'verdin', b: 'pila', l: 'lodo' };

// El marcador indica el tile donde van los pies: la entidad se apoya sobre el tile de abajo.
const feetY = (row, h) => (row + 1) * TILE - h;

/**
 * Convierte una definición de nivel (ASCII) en una grilla usable por el core.
 * @param {{ name: string, map: string[], wind: string }} def
 */
export function parseLevel(def) {
  const tiles = new Uint8Array(COLS * ROWS);
  const spawns = { p1: null, p2: null, enemies: [] };

  for (let row = 0; row < ROWS; row++) {
    const line = def.map[row] || '';
    for (let col = 0; col < COLS; col++) {
      const ch = line[col] || '.';
      let tile = TILE_EMPTY;
      if (ch === '#') tile = TILE_SOLID;
      else if (ch === '=') tile = TILE_PLATFORM;
      else if (ch === '1') spawns.p1 = { x: col * TILE, y: feetY(row, PLAYER_H) };
      else if (ch === '2') spawns.p2 = { x: col * TILE, y: feetY(row, PLAYER_H) };
      else if (ENEMY_CHARS[ch]) {
        spawns.enemies.push({ type: ENEMY_CHARS[ch], x: col * TILE, y: feetY(row, ENEMY_H) });
      }
      tiles[row * COLS + col] = tile;
    }
  }

  // Laguna Clara: boss/hard/zone/number viajan con el nivel parseado.
  const { boss = null, hard = false, zone = 0, number = 0 } = def;
  return { name: def.name, wind: def.wind, tiles, spawns, boss, hard, zone, number };
}
