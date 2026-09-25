// Los dos idiomas tienen los mismos textos, y los parámetros coinciden.

import test from 'node:test';
import assert from 'node:assert/strict';
import { DICT, TOUCH, ZONE_NAMES, LANGS, t, setLang, setPlatform } from '../src/i18n.js';
import { ZONES } from '../src/data/zones.js';

const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('español e inglés tienen las mismas claves y parámetros', () => {
  for (const table of [DICT, TOUCH]) {
    const es = Object.keys(table.es).sort();
    assert.deepEqual(Object.keys(table.en).sort(), es);
    for (const k of es) assert.deepEqual(params(table.en[k]), params(table.es[k]), k);
  }
  for (const k of Object.keys(TOUCH.es)) assert.ok(k in DICT.es, `la variante táctil ${k} existe en DICT`);
});

test('cada zona tiene nombre, enemigo y jefe en los dos idiomas', () => {
  for (const l of LANGS) {
    assert.equal(ZONE_NAMES[l].length, ZONES.length);
    for (const row of ZONE_NAMES[l]) assert.equal(row.filter(Boolean).length, 3);
  }
  // Los nombres en español son los mismos que usa data/zones.js.
  ZONES.forEach((z, i) => assert.deepEqual(ZONE_NAMES.es[i], [z.name, z.enemyName, z.bossName]));
});

test('t() cambia de idioma, completa parámetros y usa la variante táctil', () => {
  setLang('en');
  assert.equal(t('hud.level', { n: 7 }), 'Level 7');
  setLang('es');
  assert.equal(t('hud.level', { n: 7 }), 'Nivel 7');
  setPlatform('touch');
  assert.equal(t('title.start1'), 'Tocá para jugar');
  setPlatform('keys');
  assert.equal(t('title.start1'), 'Pulsá 1 · un jugador');
});
