// PRNG determinístico (mulberry32). Toda aleatoriedad del core pasa por acá.

/**
 * @param {number} seed
 * @returns {() => number} función que devuelve un número en [0,1)
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
