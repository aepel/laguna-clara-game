// Las 10 zonas de Laguna Clara: 10 niveles cada una (9 comunes + jefe).
// `enemy` es el tipo que la zona presenta; `char` es su letra en los mapas.

export const LEVELS_PER_ZONE = 10;

export const ZONES = [
  { name: 'La Orilla', enemy: 'zen', char: 'z', enemyName: 'Crudo', boss: 'botellon', bossName: 'Botellón' },
  { name: 'El Juncal', enemy: 'monsta', char: 'o', enemyName: 'Bolsamedusa', boss: 'redFantasma', bossName: 'Red Fantasma' },
  { name: 'Los Nenúfares', enemy: 'mighta', char: 'm', enemyName: 'Latita', boss: 'capitanLata', bossName: 'Capitán Lata' },
  { name: 'Los Canales', enemy: 'pulpul', char: 'p', enemyName: 'Microplásticos', boss: 'enjambre', bossName: 'Enjambre Arcoíris' },
  { name: 'Las Raíces', enemy: 'colilla', char: 'c', enemyName: 'Colillas', boss: 'humareda', bossName: 'Humareda' },
  { name: 'La Cueva', enemy: 'espuma', char: 'e', enemyName: 'Espumosos', boss: 'espumaMadre', bossName: 'Espuma Madre' },
  { name: 'El Lodo', enemy: 'gomon', char: 'g', enemyName: 'Gomones', boss: 'granRueda', bossName: 'Gran Rueda' },
  { name: 'La Floración', enemy: 'verdin', char: 'v', enemyName: 'Verdín', boss: 'floracion', bossName: 'Floración' },
  { name: 'El Abismo', enemy: 'pila', char: 'b', enemyName: 'Pilas', boss: 'anguilaVoltio', bossName: 'Anguila Voltio' },
  { name: 'El Caño', enemy: 'lodo', char: 'l', enemyName: 'Lodos químicos', boss: 'granMancha', bossName: 'La Gran Mancha' },
];

export const zoneOf = (levelIndex) => Math.floor(levelIndex / LEVELS_PER_ZONE);
export const isBossSlot = (levelIndex) => levelIndex % LEVELS_PER_ZONE === LEVELS_PER_ZONE - 1;

export const TOTAL_LEVELS = ZONES.length * LEVELS_PER_ZONE;

/**
 * Niveles "bien difíciles": uno cada 8 (8, 16, 24… en base 1). Si cae en el
 * nivel de un jefe, el desafío pasa al nivel anterior.
 */
export function isHardSlot(levelIndex) {
  if (isBossSlot(levelIndex)) return false;
  const n = levelIndex + 1;
  if (n % 8 === 0) return true;
  return isBossSlot(levelIndex + 1) && (n + 1) % 8 === 0;
}
