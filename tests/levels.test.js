import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data/levels.js';
import { parseLevel, TILE_EMPTY, TILE_SOLID, TILE_PLATFORM } from '../src/core/level.js';
import { COLS, ROWS, TILE } from '../src/core/constants.js';

// Validar reglas de §5 para cada nivel
for (let levelIdx = 0; levelIdx < LEVELS.length; levelIdx++) {
  const def = LEVELS[levelIdx];

  test(`Level ${levelIdx + 1}: "${def.name}" - estructura básica`, () => {
    // 26 filas de 32 caracteres
    assert.equal(def.map.length, ROWS, `debe tener exactamente ${ROWS} filas`);
    for (let i = 0; i < def.map.length; i++) {
      assert.equal(
        def.map[i].length,
        COLS,
        `fila ${i} debe tener exactamente ${COLS} caracteres (tiene ${def.map[i].length})`
      );
    }

    // Caracteres válidos
    const validChars = new Set(['#', '=', '.', '1', '2', 'z', 'm', 'o', 'p', 'c', 'e', 'g', 'v', 'b', 'l']);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = def.map[r][c];
        assert.ok(validChars.has(ch), `fila ${r} col ${c}: carácter inválido '${ch}'`);
      }
    }

    // Columnas 0 y 31 son '#' en todas las filas (paredes laterales)
    for (let r = 0; r < ROWS; r++) {
      assert.equal(def.map[r][0], '#', `fila ${r} columna 0 debe ser '#' (pared izquierda)`);
      assert.equal(def.map[r][COLS - 1], '#', `fila ${r} columna ${COLS - 1} debe ser '#' (pared derecha)`);
    }
  });

  test(`Level ${levelIdx + 1}: "${def.name}" - spawns`, () => {
    // Exactamente un '1' y un '2'
    let count1 = 0;
    let count2 = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (def.map[r][c] === '1') count1++;
        if (def.map[r][c] === '2') count2++;
      }
    }
    assert.equal(count1, 1, 'debe haber exactamente un spawn "1" (P1)');
    assert.equal(count2, 1, 'debe haber exactamente un spawn "2" (P2)');

    // Entre 5 y 12 enemigos (1,5× el diseño original, por la pantalla ancha)
    let enemyCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = def.map[r][c];
        if ('zmopcegvbl'.includes(ch)) {
          enemyCount++;
        }
      }
    }
    // Las arenas de jefe no traen enemigos: el jefe los genera.
    if (def.boss) assert.equal(enemyCount, 0, 'una arena de jefe no lleva enemigos en el mapa');
    else assert.ok(enemyCount >= 5 && enemyCount <= 12, `debe haber entre 5 y 12 enemigos (tiene ${enemyCount})`);
  });

  test(`Level ${levelIdx + 1}: "${def.name}" - progresión de dificultad`, () => {
    // Niveles 1-2: solo 'z'
    // Nivel 3+: 'm' permitido
    // Nivel 4+: 'o' permitido
    // Nivel 6+: 'p' permitido
    const level = levelIdx + 1; // 1-based
    const hasZ = def.map.some((r) => r.includes('z'));
    const hasM = def.map.some((r) => r.includes('m'));
    const hasO = def.map.some((r) => r.includes('o'));
    const hasP = def.map.some((r) => r.includes('p'));

    if (level <= 2) {
      assert.ok(!hasM, `nivel ${level}: no debería tener 'mighta' (m)`);
      assert.ok(!hasO, `nivel ${level}: no debería tener 'monsta' (o)`);
      assert.ok(!hasP, `nivel ${level}: no debería tener 'pulpul' (p)`);
    }
    if (level < 3) {
      assert.ok(!hasM, `nivel ${level}: 'mighta' (m) solo a partir del 3`);
    }
    if (level < 4) {
      assert.ok(!hasO, `nivel ${level}: 'monsta' (o) solo a partir del 4`);
    }
    if (level < 6) {
      assert.ok(!hasP, `nivel ${level}: 'pulpul' (p) solo a partir del 6`);
    }
  });

  test(`Level ${levelIdx + 1}: "${def.name}" - huecos para wrap`, () => {
    // Filas 0 y 25 tienen al menos un hueco de 2+ tiles alineado verticalmente
    const checkWrapGaps = (rowIdx) => {
      const row = def.map[rowIdx];
      let gapStart = -1;
      let gapLen = 0;

      for (let c = 0; c < COLS; c++) {
        if (row[c] === '.') {
          if (gapStart === -1) gapStart = c;
          gapLen++;
        } else {
          if (gapLen >= 2) return true;
          gapStart = -1;
          gapLen = 0;
        }
      }
      return gapLen >= 2;
    };

    assert.ok(checkWrapGaps(0), 'fila 0 (techo) debe tener al menos un hueco de 2+ tiles');
    assert.ok(checkWrapGaps(ROWS - 1), `fila ${ROWS - 1} (piso) debe tener al menos un hueco de 2+ tiles`);
  });

  test(`Level ${levelIdx + 1}: "${def.name}" - parseLevel válido`, () => {
    // parseLevel no tira error
    let level;
    assert.doesNotThrow(() => {
      level = parseLevel(def);
    }, 'parseLevel no debe tirar excepción');

    // Devuelve spawns coherentes
    assert.ok(level.spawns.p1, 'debe tener spawn p1');
    assert.ok(level.spawns.p2, 'debe tener spawn p2');
    assert.ok(Array.isArray(level.spawns.enemies), 'spawns.enemies debe ser un array');

    // Posiciones están en píxeles válidos
    for (const pos of [level.spawns.p1, level.spawns.p2]) {
      assert.ok(pos.x >= 0 && pos.x < COLS * TILE, `x debe estar en [0, ${COLS * TILE})`);
      assert.ok(pos.y >= 0 && pos.y < ROWS * TILE, `y debe estar en [0, ${ROWS * TILE})`);
    }
    for (const enemy of level.spawns.enemies) {
      assert.ok(enemy.x >= 0 && enemy.x < COLS * TILE, `enemy x debe estar en [0, ${COLS * TILE})`);
      assert.ok(enemy.y >= 0 && enemy.y < ROWS * TILE, `enemy y debe estar en [0, ${ROWS * TILE})`);
    }
  });

  test(`Level ${levelIdx + 1}: "${def.name}" - alcanzabilidad BFS desde P1`, () => {
    const level = parseLevel(def);
    const p1Spawn = level.spawns.p1;

    // Nueva convención: el marcador de spawn indica el tile de los PIES.
    // Nodo = celda de los pies, con suelo en row+1 y row-1 libre para la cabeza.
    // Un nodo es alcanzable si:
    // - El tile de los pies (row) es vacío
    // - El tile debajo (row+1) tiene soporte (sólido o plataforma)
    // - El tile arriba (row-1) es vacío (para la cabeza)
    const isStandable = (col, row) => {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
      const tile = level.tiles[row * COLS + col];
      if (tile !== TILE_EMPTY) return false;
      const tileBelow = row + 1 >= ROWS ? TILE_SOLID : level.tiles[(row + 1) * COLS + col];
      if (!(tileBelow === TILE_SOLID || tileBelow === TILE_PLATFORM)) return false;
      const tileAbove = row - 1 < 0 ? TILE_EMPTY : level.tiles[(row - 1) * COLS + col];
      if (tileAbove !== TILE_EMPTY) return false;
      return true;
    };

    // Convertir spawn (en píxeles) a tile de los pies
    // y = (row + 1) * TILE - height (para player height=16)
    // y = (row + 1) * 8 - 16
    // Los pies están en (y + height - 1) / TILE
    // = (y + 16 - 1) / 8 = (y + 15) / 8
    // Pero usar floor((y + 15) / TILE) = floor de la última línea de píxeles del jugador / 8
    const p1Col = Math.floor(p1Spawn.x / TILE);
    const p1Row = Math.floor((p1Spawn.y + 15) / TILE);

    const visited = new Set();
    const queue = [];

    if (isStandable(p1Col, p1Row)) {
      queue.push([p1Col, p1Row]);
      visited.add(`${p1Col},${p1Row}`);
    }

    while (queue.length > 0) {
      const [col, row] = queue.shift();

      const neighbors = [];

      // Caminar horizontal
      if (col - 1 >= 0 && isStandable(col - 1, row)) neighbors.push([col - 1, row]);
      if (col + 1 < COLS && isStandable(col + 1, row)) neighbors.push([col + 1, row]);

      // Caer: en la misma columna o saliendo por el borde (col ± 1). Si cae por
      // un hueco del piso, hace wrap y sigue cayendo desde arriba (§8).
      const fallFrom = (c, startRow) => {
        let r = startRow;
        for (let steps = 0; steps < ROWS * 2; steps++, r++) {
          if (r >= ROWS) r = 0;
          const tile = level.tiles[r * COLS + c];
          if (tile === TILE_SOLID) return;
          if (isStandable(c, r)) { neighbors.push([c, r]); return; }
        }
      };
      fallFrom(col, row + 1);
      for (const dc of [-1, 1]) {
        const c = col + dc;
        if (c >= 0 && c < COLS && level.tiles[row * COLS + c] === TILE_EMPTY && !isStandable(c, row)) fallFrom(c, row);
      }

      // Saltar hasta 4 tiles arriba (los pies suben 4 tiles), ±5 horizontal
      for (let r = Math.max(0, row - 4); r < row; r++) {
        for (let c = Math.max(0, col - 5); c <= Math.min(COLS - 1, col + 5); c++) {
          if (isStandable(c, r)) {
            neighbors.push([c, r]);
          }
        }
      }

      for (const [nc, nr] of neighbors) {
        const key = `${nc},${nr}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nc, nr]);
        }
      }
    }

    // Toda superficie pisable tiene que ser alcanzable desde P1 (§5).
    let totalStandable = 0;
    let reachable = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isStandable(c, r)) {
          totalStandable++;
          const key = `${c},${r}`;
          if (visited.has(key)) {
            reachable++;
          }
        }
      }
    }

    const unreachable = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isStandable(c, r) && !visited.has(`${c},${r}`)) unreachable.push(`(${c},${r})`);
      }
    }
    assert.equal(reachable, totalStandable, `superficies inalcanzables: ${unreachable.join(' ')}`);
  });
}
