// Qué tan limpia está la laguna en el nivel actual, en [0, 1].
// Lo usan el renderer (color del agua, plantas) y el audio (capas de música).
// Función pura: solo lee el estado del core.

/** @param {import('../core/game.js').GameState} state */
export function cleanliness(state) {
  if (state.mode === 'levelClear' || state.mode === 'victory') return 1;
  // Nivel de jefe: la limpieza es la vida que le falta al jefe.
  if (state.level?.boss && state.mode !== 'title') {
    const b = state.boss;
    return b ? 1 - b.hp / b.maxHp : 1;
  }
  const total = state.level?.spawns?.enemies?.length || 0;
  if (total === 0 || state.mode === 'title') return 0;

  let dirt = 0;
  for (const e of state.enemies) {
    if (e.state === 'dying') continue; // ya liberado, cayendo como semilla
    dirt += e.state === 'trapped' ? 0.5 : 1;
  }
  return Math.max(0, Math.min(1, 1 - dirt / total));
}
