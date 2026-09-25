// Helpers de color y matemática chica para el renderer HD.

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const cache = new Map();
function parse(hex) {
  let c = cache.get(hex);
  if (!c) {
    const h = hex.replace('#', '');
    c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cache.set(hex, c);
  }
  return c;
}

/** Mezcla dos colores hex en espacio RGB y devuelve `rgb()` / `rgba()`. */
export function mix(a, b, t, alpha = 1) {
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(lerp(ca[0], cb[0], t));
  const g = Math.round(lerp(ca[1], cb[1], t));
  const bl = Math.round(lerp(ca[2], cb[2], t));
  return alpha >= 1 ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha})`;
}

/** Igual que mix() pero devuelve hex, para volver a mezclar el resultado. */
export function mixHex(a, b, t) {
  const ca = parse(a);
  const cb = parse(b);
  return '#' + [0, 1, 2].map((i) => Math.round(lerp(ca[i], cb[i], t)).toString(16).padStart(2, '0')).join('');
}

export function rgba(hex, alpha) {
  const c = parse(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/** PRNG chico y determinista para decoración (no toca el rng del core). */
export function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
