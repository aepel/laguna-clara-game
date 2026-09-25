import { COLS, ROWS, TILE } from './constants.js';
import { TILE_EMPTY, TILE_SOLID, TILE_PLATFORM } from './level.js';

// Epsilon para hallar la fila/columna del borde de salida (derecho/inferior)
// de una hitbox sin que el redondeo la corra una celda de más cuando el
// movimiento es fraccionario (velocidades en px/frame no enteras).
const EPS = 1e-6;

/**
 * @param {import('./level.js').Level} level
 * @param {number} col
 * @param {number} row
 * @returns {0|1|2}
 */
export function tileAt(level, col, row) {
  if (col < 0 || col >= COLS) return TILE_SOLID;
  if (row < 0 || row >= ROWS) return TILE_EMPTY;
  return level.tiles[row * COLS + col];
}

/**
 * Mueve una entidad según su vx/vy y resuelve colisiones contra los tiles.
 * La entidad debe tener x, y, vx, vy, w, h.
 * @param {{x:number,y:number,vx:number,vy:number,w:number,h:number}} entity
 * @param {import('./level.js').Level} level
 * @param {{ oneWay?: boolean }} [opts]
 */
export function moveAndCollide(entity, level, opts = {}) {
  const oneWay = opts.oneWay !== false;
  const w = entity.w;
  const h = entity.h;
  let hitWall = false;
  let landed = false;
  let hitCeiling = false;

  // --- horizontal ---
  if (entity.vx !== 0) {
    entity.x += entity.vx;
    const topRow = Math.floor(entity.y / TILE);
    const bottomRow = Math.floor((entity.y + h - EPS) / TILE);
    if (entity.vx > 0) {
      const rightCol = Math.floor((entity.x + w - EPS) / TILE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (tileAt(level, rightCol, r) === TILE_SOLID) {
          entity.x = rightCol * TILE - w;
          entity.vx = 0;
          hitWall = true;
          break;
        }
      }
    } else {
      const leftCol = Math.floor(entity.x / TILE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (tileAt(level, leftCol, r) === TILE_SOLID) {
          entity.x = (leftCol + 1) * TILE;
          entity.vx = 0;
          hitWall = true;
          break;
        }
      }
    }
  }

  // --- vertical ---
  if (entity.vy !== 0) {
    const prevBottom = entity.y + h;
    const prevTop = entity.y;
    entity.y += entity.vy;
    const leftCol = Math.floor(entity.x / TILE);
    const rightCol = Math.floor((entity.x + w - EPS) / TILE);

    if (entity.vy > 0) {
      const bottomRow = Math.floor((entity.y + h - EPS) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        const t = tileAt(level, c, bottomRow);
        const isSolid = t === TILE_SOLID;
        const isPlatformLanding =
          oneWay && t === TILE_PLATFORM && prevBottom <= bottomRow * TILE;
        if (isSolid || isPlatformLanding) {
          entity.y = bottomRow * TILE - h;
          entity.vy = 0;
          landed = true;
          break;
        }
      }
    } else if (entity.vy < 0) {
      const topRow = Math.floor(entity.y / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        if (tileAt(level, c, topRow) === TILE_SOLID) {
          entity.y = (topRow + 1) * TILE;
          entity.vy = 0;
          hitCeiling = true;
          break;
        }
      }
    }
    void prevTop;
  }

  return { hitWall, landed, hitCeiling };
}

/**
 * Wrap vertical: lo que sale por abajo del playfield reaparece arriba, y viceversa.
 * @param {{y:number,h:number}} entity
 */
export function wrapVertical(entity) {
  const bottom = ROWS * TILE;
  if (entity.y > bottom) {
    entity.y = -entity.h;
  } else if (entity.y + entity.h < 0) {
    entity.y = bottom;
  }
}
