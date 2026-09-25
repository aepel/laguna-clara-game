// Arenas de jefe, diseñadas a mano para la pantalla ancha (56 columnas).
// Mismo formato de mapa que los niveles (CONTRACT.md §5), sin enemigos: el jefe
// los trae él mismo. Cada arena se describe por sus huecos de techo/piso y sus
// plataformas; por defecto la mitad izquierda se espeja a la derecha.

import { COLS, ROWS } from '../core/constants.js';

/**
 * @param {number[]} gaps  columnas abiertas en techo y piso (wrap vertical)
 * @param {Array<[number, number[][], boolean?]>} tiers  [fila, segmentos [c0, c1], espejar = true]
 */
function arena(gaps, tiers) {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array(COLS).fill('.');
    row[0] = '#';
    row[COLS - 1] = '#';
    if (r === 0 || r === ROWS - 1) for (let c = 1; c < COLS - 1; c++) row[c] = gaps.includes(c) ? '.' : '#';
    g.push(row);
  }
  for (const [r, segs, mirror = true] of tiers) {
    for (const [c0, c1] of segs) {
      for (let c = c0; c <= c1; c++) {
        g[r][c] = '=';
        if (mirror) g[r][COLS - 1 - c] = '=';
      }
    }
  }
  g[ROWS - 2][3] = '1';
  g[ROWS - 2][COLS - 4] = '2';
  return g.map((row) => row.join(''));
}

const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const BOSS_ARENAS = {
  // Botellón rueda por el piso: piso ancho y refugios altos a los costados.
  botellon: arena(span(26, 29), [
    [21, [[3, 10]]],
    [17, [[11, 22]]],
    [13, [[3, 11]]],
    [9, [[16, 27]]],
  ]),
  // La Red Fantasma barre desde arriba: muchas plataformas cortas para esquivar.
  redFantasma: arena([...span(8, 11), ...span(44, 47)], [
    [21, [[3, 8], [15, 20], [26, 27]]],
    [17, [[9, 14], [21, 25]]],
    [13, [[3, 8], [15, 20], [26, 27]]],
    [9, [[9, 14], [21, 25]]],
    [5, [[4, 9], [16, 21]]],
  ]),
  // Capitán Lata salta y levanta ondas por el piso: refugios bajos para saltarlas.
  capitanLata: arena(span(22, 25), [
    [21, [[8, 13], [21, 25]]],
    [17, [[3, 9], [16, 20]]],
    [13, [[10, 14], [22, 27]]],
    [9, [[5, 11], [17, 21]]],
  ]),
  // El Enjambre embiste en cualquier dirección: arena abierta con pocos obstáculos.
  enjambre: arena([...span(8, 11), ...span(44, 47)], [
    [21, [[12, 15], [24, 26]]],
    [17, [[5, 10], [18, 21]]],
    [13, [[12, 16], [24, 27]]],
    [9, [[5, 10], [18, 21]]],
  ]),
  // Humareda recorre el techo: plataformas altas para acercarle burbujas.
  humareda: arena([7, 8, 47, 48], [
    [20, [[3, 9], [15, 20]]],
    [16, [[10, 15], [21, 27]]],
    [12, [[3, 10], [16, 21]]],
    [8, [[7, 14], [20, 25]]],
  ]),
  // Espuma Madre ocupa el centro: plataformas a los costados para esquivar sus bolas.
  espumaMadre: arena([...span(18, 21), ...span(34, 37)], [
    [21, [[3, 8], [14, 17]]],
    [17, [[9, 13]]],
    [13, [[3, 8], [14, 17]]],
    [9, [[9, 13]]],
    [5, [[3, 8], [14, 17]]],
  ]),
  // Gran Rueda rebota por toda la arena: plataformas altas y separadas.
  granRueda: arena(span(22, 25), [
    [21, [[9, 14], [21, 25]]],
    [17, [[3, 8], [16, 20]]],
    [13, [[10, 15], [22, 27]]],
    [9, [[3, 8], [16, 20]]],
  ]),
  // Floración tapa la luz desde arriba: se juega en la mitad de abajo.
  floracion: arena([...span(8, 11), ...span(44, 47)], [
    [21, [[3, 8], [16, 21]]],
    [17, [[10, 15], [22, 27]]],
    [13, [[3, 8], [16, 21]]],
    [9, [[10, 15], [22, 27]]],
  ]),
  // Anguila Voltio cruza todo el alto: plataformas cortas para esquivar rayos.
  anguilaVoltio: arena([...span(18, 21), ...span(34, 37)], [
    [21, [[4, 7], [13, 16], [22, 25]]],
    [17, [[8, 11], [18, 21]]],
    [13, [[4, 7], [13, 16], [25, 27]]],
    [9, [[8, 11], [18, 21]]],
    [5, [[4, 7], [13, 16], [25, 27]]],
  ]),
  // La Gran Mancha: arena abierta con el caño a la derecha y pocas plataformas.
  granMancha: arena(span(26, 29), [
    [21, [[8, 17], [33, 42]], false],
    [17, [[3, 12], [40, 48]], false],
    [13, [[18, 36]], false],
    [9, [[10, 16]], false],
  ]),
};
