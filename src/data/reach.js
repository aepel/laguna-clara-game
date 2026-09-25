// Chequeo de alcanzabilidad para el generador de niveles: desde el spawn de P1
// tiene que poder llegarse a toda superficie pisable caminando, cayendo (con
// wrap vertical) o saltando hasta 4 tiles arriba y 5 de costado. Es la misma
// regla que valida tests/levels.test.js, que sigue siendo el control final.

import { COLS, ROWS } from '../core/constants.js';

const EMPTY = new Set(['.', '1', '2']);
const isEmptyCh = (ch) => EMPTY.has(ch) || /[a-z]/.test(ch);
const isSupport = (ch) => ch === '#' || ch === '=';

/** @param {string[]} map  ROWS strings de COLS caracteres */
export function isFullyReachable(map) {
  const at = (c, r) => map[r][c];
  const standable = (c, r) => {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    if (!isEmptyCh(at(c, r))) return false;
    const below = r + 1 >= ROWS ? '#' : at(c, r + 1);
    if (!isSupport(below)) return false;
    return r - 1 < 0 || isEmptyCh(at(c, r - 1));
  };

  let start = null;
  for (let r = 0; r < ROWS && !start; r++) {
    const c = map[r].indexOf('1');
    if (c >= 0) start = [c, r];
  }
  if (!start || !standable(start[0], start[1])) return false;

  const seen = new Set([`${start[0]},${start[1]}`]);
  const queue = [start];
  const push = (c, r) => {
    const k = `${c},${r}`;
    if (!seen.has(k)) { seen.add(k); queue.push([c, r]); }
  };
  const fallFrom = (c, r0) => {
    let r = r0;
    for (let i = 0; i < ROWS * 2; i++, r++) {
      if (r >= ROWS) r = 0;
      if (at(c, r) === '#') return;
      if (standable(c, r)) { push(c, r); return; }
    }
  };

  while (queue.length) {
    const [c, r] = queue.shift();
    if (standable(c - 1, r)) push(c - 1, r);
    if (standable(c + 1, r)) push(c + 1, r);
    fallFrom(c, r + 1);
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (nc >= 0 && nc < COLS && isEmptyCh(at(nc, r)) && !standable(nc, r)) fallFrom(nc, r);
    }
    for (let jr = Math.max(0, r - 4); jr < r; jr++) {
      for (let jc = Math.max(0, c - 5); jc <= Math.min(COLS - 1, c + 5); jc++) {
        if (standable(jc, jr)) push(jc, jr);
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (standable(c, r) && !seen.has(`${c},${r}`)) return false;
    }
  }
  return true;
}
