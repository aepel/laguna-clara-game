// Estructura de la campaña de 100 niveles (Laguna Clara).

import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data/levels.js';
import { generateLevel, HARD_ENEMIES } from '../src/data/generator.js';
import { ZONES, isBossSlot, isHardSlot } from '../src/data/zones.js';

test('la campaña tiene 100 niveles en 10 zonas', () => {
  assert.equal(LEVELS.length, 100);
  assert.equal(ZONES.length, 10);
  LEVELS.forEach((l, i) => assert.equal(l.zone, Math.floor(i / 10)));
});

test('el generador es determinista', () => {
  for (const i of [0, 7, 42, 98]) assert.deepEqual(generateLevel(i), generateLevel(i));
});

test('cada 10 niveles hay un jefe con su arena', () => {
  for (let i = 0; i < 100; i++) {
    const zone = ZONES[Math.floor(i / 10)];
    if (isBossSlot(i)) assert.equal(LEVELS[i].boss, zone.boss, `nivel ${i + 1}`);
    else assert.equal(LEVELS[i].boss, undefined, `nivel ${i + 1}`);
  }
  assert.equal(LEVELS[9].boss, 'botellon');
  assert.equal(LEVELS[19].boss, 'redFantasma');
});

test('cada 8 niveles hay uno bien difícil, nunca en un jefe', () => {
  const hard = LEVELS.filter((l) => l.hard).map((l) => l.number);
  assert.deepEqual(hard, [8, 16, 24, 32, 39, 48, 56, 64, 72, 79, 88, 96]);
  for (let i = 0; i < 100; i++) if (isHardSlot(i)) assert.ok(!isBossSlot(i));
  const enemies = (l) => l.map.join('').replace(/[^zmopcegvbl]/g, '').length;
  for (const l of LEVELS.filter((x) => x.hard)) assert.equal(enemies(l), HARD_ENEMIES, `nivel ${l.number}`);
});

test('cada zona presenta su enemigo: no aparece antes de su zona', () => {
  const firstZone = {};
  LEVELS.forEach((l) => {
    for (const ch of new Set(l.map.join('').replace(/[^zmopcegvbl]/g, ''))) firstZone[ch] ??= l.zone;
  });
  assert.deepEqual(firstZone, { z: 0, o: 1, m: 2, p: 3, c: 4, e: 5, g: 6, v: 7, b: 8, l: 9 });
});
