// Música de Laguna Clara: un tema por zona y uno por jefe, sintetizados con
// Web Audio. Cada tema es un secuenciador de pasos con capas:
//  - en las zonas, las capas se abren con la limpieza del nivel (`at`);
//  - en los jefes, con la fase de la pelea (`phase`).
// El motor también maneja la tensión previa al jefe, la entrada del jefe y los
// remates al vencerlo. No conoce el estado del juego: lagoon.js le dice qué tocar.

const TAU = Math.PI * 2;

// Escalas en semitonos.
const S = {
  majPenta: [0, 2, 4, 7, 9],
  minPenta: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  whole: [0, 2, 4, 6, 8, 10],
  dim: [0, 2, 3, 5, 6, 8, 9, 11],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
};

// Raíces (octava 4).
const R = { C: 261.63, Db: 277.18, D: 293.66, Eb: 311.13, E: 329.63, F: 349.23, Gb: 369.99, G: 392, Ab: 415.3, A: 440, Bb: 466.16, B: 493.88 };

// ---------- temas ----------
// Patrones: tokens separados por espacio. En instrumentos melódicos cada token
// es un grado de la escala (puede ser negativo) o '.' (silencio); en percusión,
// 'x' (golpe), 'X' (acento) o '.'. Cada patrón se repite por su largo, así que
// patrones de largos distintos se desfasan (polimetría).

// `prog` es la progresión de acordes: el grado de la escala sobre el que se
// arma cada compás (16 pasos, o `steps`). Las capas con `chord: true` se tocan
// relativas a ese acorde (0 = fundamental, 2 = tercera, 4 = quinta, 7 = octava),
// así el bajo, los arpegios y el estribillo se mueven juntos y siempre suenan bien.
// Orden de las capas en las zonas: pulso (siempre), arpegio (25 %), estribillo
// y batería (50 %), contracanto brillante (75 %).
export const ZONE_THEMES = {
  // 1 · La Orilla: pop luminoso, I–V–vi–IV.
  orilla: {
    bpm: 96, root: R.D, scale: S.major, wet: 0.3, prog: [0, 4, 5, 3],
    drone: { deg: [0, 4], oct: 2, type: 'triangle', cutoff: 800, gain: 0.04 },
    motif: [4, 4, 2, 4, 7, 6, 4],
    layers: [
      { at: 0, inst: 'kick', gain: 0.14, pat: 'X . . . x . . . X . . . x . . .' },
      { at: 0, inst: 'sub', oct: 2, gain: 0.26, len: 2, chord: true, pat: '0 . . 0 . . 0 . 0 . . 0 . 4 . .' },
      { at: 0.25, inst: 'kalimba', oct: 4, gain: 0.1, chord: true, pat: '0 2 4 2 7 4 2 4' },
      { at: 0.5, inst: 'marimba', oct: 5, gain: 0.13, chord: true, pat: '4 . 4 . 2 . 4 . 7 . . . 6 . 4 . 4 . 2 . 0 . 2 . 4 . . . . . . .' },
      { at: 0.5, inst: 'snare', gain: 0.06, pat: '. . . . X . . . . . . . X . . x' },
      { at: 0.5, inst: 'shaker', gain: 0.04, pat: 'x x X x' },
      { at: 0.75, inst: 'bell', oct: 6, gain: 0.04, chord: true, pat: '. . . . . . 4 . . . . . . . 2 . . . . . . . 7 . . . . . 4 . . .' },
    ],
  },
  // 2 · El Juncal: juncos al viento, mixolidio, flauta que silba.
  juncal: {
    bpm: 104, root: R.G, scale: S.mixo, wet: 0.3, prog: [0, 6, 3, 0],
    drone: { deg: [0], oct: 2, type: 'triangle', cutoff: 900, gain: 0.04 },
    motif: [7, 6, 7, 4, 2, 4],
    layers: [
      { at: 0, inst: 'wood', gain: 0.07, pat: 'X . x . . x . x X . x . . x x .' },
      { at: 0, inst: 'sub', oct: 2, gain: 0.24, len: 2, chord: true, pat: '0 . . . 4 . . . 0 . . 0 . . 4 .' },
      { at: 0.25, inst: 'pluck', oct: 4, gain: 0.11, chord: true, pat: '0 4 7 4 2 4 7 9' },
      { at: 0.5, inst: 'flute', oct: 5, gain: 0.07, len: 2, chord: true, pat: '7 . . 6 7 . 4 . 2 . 4 . . . . . 7 . . 6 7 . 9 . 7 . 4 . . . . .' },
      { at: 0.5, inst: 'kick', gain: 0.16, pat: 'X . . . X . . . X . . . X . . .' },
      { at: 0.5, inst: 'shaker', gain: 0.05, pat: '. x . x . x . X' },
      { at: 0.75, inst: 'kalimba', oct: 6, gain: 0.05, chord: true, pat: '. . 4 . . . 2 . . . 4 . 7 . . . . . 4 . . . 2 . . . 0 . . . . .' },
    ],
  },
  // 3 · Los Nenúfares: vals soñador en 12/8, lidio.
  nenufares: {
    bpm: 80, root: R.F, scale: S.lydian, wet: 0.45, steps: 12, prog: [0, 1, 0, 4],
    drone: { deg: [0, 4], oct: 2, type: 'sine', cutoff: 1200, gain: 0.07 },
    motif: [4, 3, 4, 7, 6, 4],
    layers: [
      { at: 0, inst: 'tom', gain: 0.12, pat: 'X . . . . . x . . x . .' },
      { at: 0, inst: 'marimba', oct: 2, gain: 0.22, chord: true, pat: '0 . . . . . 4 . . . . .' },
      { at: 0.25, inst: 'bell', oct: 4, gain: 0.06, chord: true, pat: '0 2 4 7 4 2 0 2 4 7 4 2' },
      { at: 0.5, inst: 'flute', oct: 5, gain: 0.07, len: 3, chord: true, pat: '4 . . 3 . 4 7 . . . . . 6 . . 4 . 2 4 . . . . .' },
      { at: 0.5, inst: 'drip', gain: 0.05, pat: '. . . . x . . . . . . x' },
      { at: 0.75, inst: 'kalimba', oct: 5, gain: 0.06, chord: true, pat: '. . . 7 . . . . . 9 . . . . . 11 . . . . . 9 . .' },
    ],
  },
  // 4 · Los Canales: corriente con swing, dórica y funky.
  canales: {
    bpm: 112, root: R.A, scale: S.dorian, wet: 0.22, prog: [0, 3, 0, 6],
    drone: { deg: [0], oct: 2, type: 'sawtooth', cutoff: 500, gain: 0.04 },
    motif: [0, 2, 4, 2, 0, 7],
    layers: [
      { at: 0, inst: 'kick', gain: 0.16, pat: 'X . . x . . X . . x . . X . x .' },
      { at: 0, inst: 'sub', oct: 2, gain: 0.26, len: 1, chord: true, pat: '0 . 0 7 . 0 . 4 0 . 0 7 . 4 . 2' },
      { at: 0.25, inst: 'marimba', oct: 4, gain: 0.12, chord: true, pat: '0 2 4 2 0 2 4 7 4 2 0 2 4 2 0 -1' },
      { at: 0.5, inst: 'pluck', oct: 5, gain: 0.1, chord: true, pat: '0 . 2 4 . 2 0 . 7 . 6 . 4 . . . 0 . 2 4 . 2 0 . 2 . 1 . 0 . . .' },
      { at: 0.5, inst: 'wood', gain: 0.07, pat: '. . X . . x . x . . X . . x . .' },
      { at: 0.5, inst: 'hat', gain: 0.04, pat: 'x x X x' },
      { at: 0.75, inst: 'bell', oct: 5, gain: 0.05, chord: true, pat: '. . . . 7 . . . . . . . 9 . 7 . . . . . 4 . . . . . . . 2 . . .' },
    ],
  },
  // 5 · Las Raíces: tribal y cálida, menor con tambores.
  raices: {
    bpm: 88, root: R.E, scale: S.minor, wet: 0.35, prog: [0, 5, 2, 6],
    drone: { deg: [0], oct: 1, type: 'sawtooth', cutoff: 400, gain: 0.06 },
    motif: [4, 2, 4, 5, 4, 2],
    layers: [
      { at: 0, inst: 'tom', gain: 0.2, pat: 'X . . x . . x . X . . . x . x .' },
      { at: 0, inst: 'sub', oct: 1, gain: 0.3, len: 3, chord: true, pat: '0 . . . . . 0 . 4 . . . 0 . . .' },
      { at: 0.25, inst: 'kalimba', oct: 3, gain: 0.14, chord: true, pat: '0 . 2 4 . 2 0 . 4 . 7 4 . 2 . .' },
      { at: 0.5, inst: 'flute', oct: 4, gain: 0.08, len: 2, chord: true, pat: '4 . . 2 . . 4 . 5 . 4 . 2 . . . 4 . . 2 . . 0 . 1 . 0 . . . . .' },
      { at: 0.5, inst: 'shaker', gain: 0.05, pat: 'x . x x x . x X' },
      { at: 0.75, inst: 'marimba', oct: 5, gain: 0.07, chord: true, pat: '. . . . . . 7 . . . 4 . . . . . . . . . . . 7 . 9 . . . . . . .' },
    ],
  },
  // 6 · La Cueva: misteriosa, ecos largos y gotas.
  cueva: {
    bpm: 76, root: R.B, scale: S.harmMinor, wet: 0.65, prog: [0, 5, 3, 4],
    drone: { deg: [0], oct: 1, type: 'sine', cutoff: 800, gain: 0.09 },
    motif: [7, 4, 6, 7, 4, 2],
    layers: [
      { at: 0, inst: 'drip', gain: 0.09, pat: 'x . . . . . . x . . x . . . . .' },
      { at: 0, inst: 'kick', gain: 0.12, pat: 'X . . . . . . . X . . . . . x .' },
      { at: 0, inst: 'sub', oct: 1, gain: 0.26, len: 6, chord: true, pat: '0 . . . . . . . 4 . . . . . . .' },
      { at: 0.25, inst: 'bell', oct: 4, gain: 0.06, chord: true, pat: '0 . 4 . 7 . 4 . 2 . 4 . 7 . 9 .' },
      { at: 0.5, inst: 'kalimba', oct: 4, gain: 0.13, chord: true, pat: '7 . . . 4 . 6 . 7 . . . . . . . 4 . . . 2 . 1 . 0 . . . . . . .' },
      { at: 0.5, inst: 'shaker', gain: 0.03, pat: '. . x . . . x .' },
      { at: 0.75, inst: 'pad', oct: 3, gain: 0.04, len: 14, chord: true, pat: '2 . . . . . . . . . . . . . . .' },
    ],
  },
  // 7 · El Lodo: pantanoso y groovero, bajo que se arrastra.
  lodo: {
    bpm: 92, root: R.C, scale: S.minor, wet: 0.3, prog: [0, 5, 3, 4],
    drone: { deg: [0], oct: 1, type: 'sawtooth', cutoff: 300, gain: 0.07 },
    motif: [0, 0, 2, 3, 4, 3],
    layers: [
      { at: 0, inst: 'kick', gain: 0.22, pat: 'X . . x . . x . X . . . x . . .' },
      { at: 0, inst: 'glide', oct: 2, gain: 0.15, len: 3, chord: true, pat: '0 . . . . . 4 . . . . . 3 . 2 .' },
      { at: 0.25, inst: 'marimba', oct: 3, gain: 0.18, chord: true, pat: '0 . 0 2 . 4 . 2 0 . 0 -1 . 0 . .' },
      { at: 0.5, inst: 'pluck', oct: 4, gain: 0.11, chord: true, pat: '0 . 0 2 . 3 . 4 . . 3 . 2 . 0 . 0 . 0 2 . 3 . 4 . . 6 . 7 . . .' },
      { at: 0.5, inst: 'clank', gain: 0.04, pat: '. . . . X . . . . . . . X . . .' },
      { at: 0.5, inst: 'hat', gain: 0.03, pat: '. x . x' },
      { at: 0.75, inst: 'bell', oct: 5, gain: 0.05, chord: true, pat: '. . . . . . . . 7 . 4 . . . . . . . . . . . . . 9 . 7 . . . . .' },
    ],
  },
  // 8 · La Floración: brillante y bailable, cuatro en el piso.
  floracion: {
    bpm: 108, root: R.Ab, scale: S.major, wet: 0.4, prog: [0, 3, 5, 4],
    drone: { deg: [0], oct: 2, type: 'triangle', cutoff: 1400, gain: 0.04 },
    motif: [4, 5, 4, 2, 0, 2, 4],
    layers: [
      { at: 0, inst: 'kick', gain: 0.16, pat: 'X . . . X . . . X . . . X . . .' },
      { at: 0, inst: 'sub', oct: 2, gain: 0.24, len: 1, chord: true, pat: '. . 0 . . . 0 . . . 0 . . . 4 .' },
      { at: 0.25, inst: 'bell', oct: 5, gain: 0.05, chord: true, pat: '0 2 4 7 4 2 4 7 0 2 4 7 9 7 4 2' },
      { at: 0.5, inst: 'flute', oct: 5, gain: 0.07, len: 2, chord: true, pat: '4 . 5 4 2 . 0 . 2 . 4 . 7 . . . 4 . 5 4 2 . 0 . 1 . 0 . . . . .' },
      { at: 0.5, inst: 'shaker', gain: 0.05, pat: 'x x X x x x X x' },
      { at: 0.5, inst: 'snare', gain: 0.05, pat: '. . . . X . . . . . . . X . . .' },
      { at: 0.75, inst: 'kalimba', oct: 5, gain: 0.07, chord: true, pat: '. 7 . . . 9 . . . 7 . . . 4 . . . 7 . . . 9 . . . 11 . . . 9 . .' },
    ],
  },
  // 9 · El Abismo: lento, profundo, latido y sonar.
  abismo: {
    bpm: 66, root: R.D, scale: S.phrygian, wet: 0.6, prog: [0, 1, 0, 6],
    drone: { deg: [0], oct: 1, type: 'sine', cutoff: 500, gain: 0.11 },
    motif: [0, 2, 4, 3, 2, 1, 0],
    layers: [
      { at: 0, inst: 'kick', gain: 0.18, pat: 'X . . x . . . . X . . x . . . .' },
      { at: 0, inst: 'sonar', oct: 5, gain: 0.05, pat: '0 . . . . . . . . . . . . . . .' },
      { at: 0.25, inst: 'sub', oct: 1, gain: 0.28, len: 7, chord: true, pat: '0 . . . . . . . 4 . . . . . . .' },
      { at: 0.5, inst: 'bell', oct: 4, gain: 0.07, chord: true, pat: '0 . . . 2 . . . 4 . . . 3 . . . 2 . . . 1 . . . 0 . . . . . . .' },
      { at: 0.5, inst: 'hat', gain: 0.025, pat: '. . x .' },
      { at: 0.75, inst: 'pad', oct: 3, gain: 0.05, len: 14, chord: true, pat: '4 . . . . . . . . . . . . . . .' },
    ],
  },
  // 10 · El Caño: industrial y urgente.
  cano: {
    bpm: 116, root: R.E, scale: S.phrygian, wet: 0.28, prog: [0, 1, 0, 6],
    drone: { deg: [0], oct: 1, type: 'square', cutoff: 350, gain: 0.04 },
    motif: [4, 4, 3, 4, 7, 6],
    layers: [
      { at: 0, inst: 'clank', gain: 0.06, pat: 'X . . x . . x . . x . . x . . .' },
      { at: 0, inst: 'kick', gain: 0.2, pat: 'X . . . x . . . X . . . x . x .' },
      { at: 0, inst: 'fm', oct: 2, gain: 0.14, chord: true, pat: '0 0 . 0 7 . 0 . 0 0 . 3 . 1 . .' },
      { at: 0.25, inst: 'marimba', oct: 4, gain: 0.11, chord: true, pat: '0 . 1 . 3 . 4 . 3 . 1 . 0 . 7 .' },
      { at: 0.5, inst: 'square', oct: 4, gain: 0.05, chord: true, pat: '4 . 4 3 4 . 7 . 6 . 4 . 3 . 1 . 4 . 4 3 4 . 7 . 8 . 7 . 6 . 4 .' },
      { at: 0.5, inst: 'hat', gain: 0.05, pat: 'x X x x' },
      { at: 0.75, inst: 'bell', oct: 5, gain: 0.05, chord: true, pat: '. . . . 7 . . . . . . . 4 . . . . . . . 7 . . . 9 . . . . . . .' },
    ],
  },
};

// Temas de jefe: más tempo, bajo y percusión desde la fase 1; la fase 2 suma
// contracanto y platillos; la 3 acelera y agrega el tema principal.
export const BOSS_THEMES = {
  // Botellón: rueda en 3 contra 4; golpe de vidrio.
  botellon: {
    bpm: 120, root: R.D, scale: S.minor, wet: 0.25,
    drone: { deg: [0], oct: 1, type: 'sawtooth', cutoff: 500, gain: 0.06 },
    layers: [
      { phase: 1, inst: 'sub', oct: 1, gain: 0.32, len: 1, pat: '0 . 0 . 0 3 . 4' },
      { phase: 1, inst: 'glass', oct: 5, gain: 0.1, pat: '0 . . 2 . . 4 . . 2 . .' },
      { phase: 1, inst: 'kick', gain: 0.3, pat: 'X . . . x . . . X . . x x . . .' },
      { phase: 2, inst: 'hat', gain: 0.05, pat: 'x x X x' },
      { phase: 2, inst: 'marimba', oct: 3, gain: 0.16, pat: '0 . 2 . 3 . 4 . 3 . 2 . 0 . -1 .' },
      { phase: 3, inst: 'lead', oct: 4, gain: 0.07, len: 2, pat: '7 . 6 . 4 . . . 3 . 4 . 6 . . . 7 . 8 . 9 . . . 8 . 7 . 4 . . .' },
    ],
  },
  // Red Fantasma: escala de tonos enteros, trémolo y 6/8 flotante.
  redFantasma: {
    bpm: 90, root: R.E, scale: S.whole, wet: 0.6, steps: 12,
    drone: { deg: [0, 3], oct: 2, type: 'triangle', cutoff: 900, gain: 0.06 },
    layers: [
      { phase: 1, inst: 'bell', oct: 4, gain: 0.07, pat: '0 . 2 . 4 . 3 . 1 . 5 .' },
      { phase: 1, inst: 'tom', gain: 0.18, pat: 'X . . x . . X . . . x .' },
      { phase: 1, inst: 'sub', oct: 1, gain: 0.25, len: 6, pat: '0 . . . . . 3 . . . . .' },
      { phase: 2, inst: 'pad', oct: 3, gain: 0.05, len: 12, pat: '0 . . . . . . . . . . . 2 . . . . . . . . . . .' },
      { phase: 2, inst: 'shaker', gain: 0.05, pat: 'x x x x x X' },
      { phase: 3, inst: 'flute', oct: 5, gain: 0.07, len: 2, pat: '6 . 5 . 4 . 3 . . . 4 . 6 . 7 . 8 . . . 7 . . .' },
    ],
  },
  // Capitán Lata: marcha militar con redoblante y metales.
  capitanLata: {
    bpm: 112, root: R.Bb, scale: S.major, wet: 0.2,
    drone: { deg: [0], oct: 1, type: 'sawtooth', cutoff: 400, gain: 0.05 },
    layers: [
      { phase: 1, inst: 'snare', gain: 0.12, pat: 'X . x x X . x . X . x x X x x x' },
      { phase: 1, inst: 'kick', gain: 0.3, pat: 'X . . . X . . . X . . . X . . .' },
      { phase: 1, inst: 'sub', oct: 1, gain: 0.3, len: 1, pat: '0 . 4 . 0 . 4 . 3 . 7 . 4 . -3 .' },
      { phase: 2, inst: 'clank', gain: 0.06, pat: '. . X . . . X .' },
      { phase: 2, inst: 'brass', oct: 3, gain: 0.06, len: 2, pat: '0 . . 0 4 . . . 3 . . 3 2 . . .' },
      { phase: 3, inst: 'brass', oct: 4, gain: 0.07, len: 1, pat: '4 . 4 4 7 . 4 . 3 . 3 3 6 . 3 . 4 . 4 4 7 . 9 . 8 . 7 . 4 . . .' },
    ],
  },
  // Enjambre Arcoíris: arpegios veloces que zumban.
  enjambre: {
    bpm: 132, root: R.C, scale: S.dim, wet: 0.25,
    drone: { deg: [0, 4], oct: 2, type: 'sawtooth', cutoff: 1200, gain: 0.03, trem: 18 },
    layers: [
      { phase: 1, inst: 'square', oct: 4, gain: 0.05, pat: '0 2 4 6 8 6 4 2 1 3 5 7 9 7 5 3' },
      { phase: 1, inst: 'kick', gain: 0.28, pat: 'X . . x . . X . . . X . . x . .' },
      { phase: 1, inst: 'sub', oct: 1, gain: 0.25, len: 2, pat: '0 . . 0 . . 1 . 0 . . 0 . . -1 .' },
      { phase: 2, inst: 'hat', gain: 0.05, pat: 'x X x x' },
      { phase: 2, inst: 'pluck', oct: 5, gain: 0.07, pat: '8 . 6 . 4 . 2 . 9 . 7 . 5 . 3 .' },
      { phase: 3, inst: 'lead', oct: 4, gain: 0.06, len: 1, pat: '8 9 8 6 . . 4 5 4 2 . . 0 1 2 4' },
    ],
  },
  // Humareda: lenta y asfixiante; segundas menores y humo.
  humareda: {
    bpm: 72, root: R.Gb, scale: S.phrygian, wet: 0.5,
    drone: { deg: [0, 1], oct: 1, type: 'sawtooth', cutoff: 350, gain: 0.09 },
    layers: [
      { phase: 1, inst: 'smoke', gain: 0.08, pat: 'x . . . . . . . . . . . . . . .' },
      { phase: 1, inst: 'tom', gain: 0.26, pat: 'X . . . . . x . X . . . . . . .' },
      { phase: 1, inst: 'pad', oct: 2, gain: 0.07, len: 8, pat: '0 . . . . . . . 1 . . . . . . .' },
      { phase: 2, inst: 'bell', oct: 4, gain: 0.06, pat: '0 . . 1 . . . . 0 . . -1 . . . .' },
      { phase: 2, inst: 'kick', gain: 0.22, pat: '. . . . X . . . . . . . X . x .' },
      { phase: 3, inst: 'lead', oct: 3, gain: 0.07, len: 4, pat: '4 . . . 5 . . . 4 . 3 . 1 . . . 0 . . . 1 . . . 3 . . . 1 . . .' },
    ],
  },
  // Espuma Madre: burbujeante y nerviosa.
  espumaMadre: {
    bpm: 108, root: R.A, scale: S.harmMinor, wet: 0.35,
    drone: { deg: [0], oct: 2, type: 'triangle', cutoff: 800, gain: 0.06 },
    layers: [
      { phase: 1, inst: 'marimba', oct: 4, gain: 0.14, pat: '0 2 4 . 0 2 4 . 6 4 2 . 1 2 4 .' },
      { phase: 1, inst: 'popper', gain: 0.1, pat: 'x . x . . x . . x . . x . x . .' },
      { phase: 1, inst: 'sub', oct: 1, gain: 0.28, len: 2, pat: '0 . . . 0 . . . 3 . . . 4 . . .' },
      { phase: 2, inst: 'kick', gain: 0.26, pat: 'X . . x X . . . X . . x X . x .' },
      { phase: 2, inst: 'hat', gain: 0.04, pat: '. x . x' },
      { phase: 3, inst: 'flute', oct: 5, gain: 0.07, len: 2, pat: '7 . 6 . 4 . 6 . 7 . 8 . 7 . . . 4 . 3 . 1 . 3 . 4 . 6 . 4 . . .' },
    ],
  },
  // Gran Rueda: mecánica en 7; bajo de goma.
  granRueda: {
    bpm: 116, root: R.G, scale: S.minor, wet: 0.2, steps: 14,
    drone: { deg: [0], oct: 1, type: 'square', cutoff: 300, gain: 0.05 },
    layers: [
      { phase: 1, inst: 'glide', oct: 2, gain: 0.2, len: 2, pat: '0 . 0 . 4 . . 0 . 0 . 3 . .' },
      { phase: 1, inst: 'kick', gain: 0.3, pat: 'X . . x . . . X . x . . x .' },
      { phase: 1, inst: 'clank', gain: 0.06, pat: '. . X . . x . . . X . . x .' },
      { phase: 2, inst: 'wood', gain: 0.08, pat: 'x x . x x . x' },
      { phase: 2, inst: 'marimba', oct: 3, gain: 0.14, pat: '0 . 2 . 3 . 4 4 . 3 . 2 . .' },
      { phase: 3, inst: 'lead', oct: 4, gain: 0.07, len: 2, pat: '7 . 6 . 4 . . 3 . 4 . 6 . . 7 . 8 . 10 . . 9 . 7 . 4 . .' },
    ],
  },
  // Floración (jefe): belleza tóxica; campanas lidias sobre un cluster disonante.
  floracion: {
    bpm: 84, root: R.Db, scale: S.lydian, wet: 0.55,
    drone: { deg: [0, 3], oct: 2, type: 'sawtooth', cutoff: 700, gain: 0.05 },
    layers: [
      { phase: 1, inst: 'bell', oct: 5, gain: 0.05, pat: '0 3 4 7 3 4 7 10' },
      { phase: 1, inst: 'tom', gain: 0.2, pat: 'X . . . x . . . X . . x . . x .' },
      { phase: 1, inst: 'pad', oct: 3, gain: 0.05, len: 16, pat: '0 . . . . . . . . . . . . . . . 3 . . . . . . . . . . . . . . .' },
      { phase: 2, inst: 'sub', oct: 1, gain: 0.25, len: 4, pat: '0 . . . 3 . . . 1 . . . 4 . . .' },
      { phase: 2, inst: 'shaker', gain: 0.05, pat: 'x x X x' },
      { phase: 3, inst: 'flute', oct: 4, gain: 0.07, len: 3, pat: '7 . . 8 . . 10 . . . . . 9 . . 7 . . 3 . . 4 . . . . .' },
    ],
  },
  // Anguila Voltio: eléctrica; cuadradas y chispazos.
  anguilaVoltio: {
    bpm: 128, root: R.F, scale: S.dim, wet: 0.25,
    drone: { deg: [0], oct: 1, type: 'square', cutoff: 600, gain: 0.04, trem: 11 },
    layers: [
      { phase: 1, inst: 'square', oct: 3, gain: 0.07, pat: '0 . 0 3 . 0 5 . 0 . 0 3 . 6 . 5' },
      { phase: 1, inst: 'kick', gain: 0.3, pat: 'X . . . X . . x X . . . X . x .' },
      { phase: 1, inst: 'zap', gain: 0.05, pat: '. . . . . . . x . . . . . . . .' },
      { phase: 2, inst: 'hat', gain: 0.05, pat: 'x x X x x x X x' },
      { phase: 2, inst: 'fm', oct: 2, gain: 0.14, pat: '0 . . 0 . . 3 . 0 . . 0 . . 6 .' },
      { phase: 3, inst: 'lead', oct: 4, gain: 0.06, len: 1, pat: '8 . 7 5 . 3 5 . 8 . 10 . 9 8 5 .' },
    ],
  },
  // La Gran Mancha: el final. Coro oscuro, tambores enormes, todo junto.
  granMancha: {
    bpm: 96, root: R.D, scale: S.harmMinor, wet: 0.45,
    drone: { deg: [0, 4], oct: 1, type: 'sawtooth', cutoff: 400, gain: 0.09 },
    layers: [
      { phase: 1, inst: 'choir', oct: 3, gain: 0.07, len: 8, pat: '0 . . . . . . . -1 . . . . . . . 0 . . . . . . . 1 . . . -1 . . .' },
      { phase: 1, inst: 'tom', gain: 0.28, pat: 'X . . x . . X . . . X . x . . .' },
      { phase: 1, inst: 'sub', oct: 1, gain: 0.32, len: 2, pat: '0 . . 0 . . 0 . -1 . . -1 . . 1 .' },
      { phase: 2, inst: 'kick', gain: 0.3, pat: 'X . . . X . . x X . . . X . x x' },
      { phase: 2, inst: 'clank', gain: 0.05, pat: '. . x . . . x .' },
      { phase: 2, inst: 'marimba', oct: 3, gain: 0.14, pat: '0 2 3 . 4 3 2 . 0 2 3 . 6 4 3 .' },
      { phase: 3, inst: 'brass', oct: 4, gain: 0.07, len: 2, pat: '7 . . 6 7 . 9 . 7 . . 6 4 . . . 3 . . 4 6 . 7 . 6 . 4 . 3 . . .' },
      { phase: 3, inst: 'hat', gain: 0.05, pat: 'x X x x' },
    ],
  },
};

/** Tema de cada zona en el orden de data/zones.js. */
export const ZONE_THEME_KEYS = ['orilla', 'juncal', 'nenufares', 'canales', 'raices', 'cueva', 'lodo', 'floracion', 'abismo', 'cano'];

const parse = (pat) => pat.split(/\s+/).map((tk) => (tk === '.' ? null : tk === 'x' ? 1 : tk === 'X' ? 2 : Number(tk)));
for (const group of [ZONE_THEMES, BOSS_THEMES]) {
  for (const th of Object.values(group)) for (const l of th.layers) l.seq = parse(l.pat);
}

// ---------- motor ----------

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} out  destino de la música (el bus de música del juego)
 */
export function createMusic(ctx, out) {
  const noise = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  // Cadena: voces → theme (volumen del tema) → tone (filtro de tensión) → out
  //                                         ↘ send → reverb → out
  const theme = ctx.createGain();
  const toneF = ctx.createBiquadFilter(); toneF.type = 'lowpass'; toneF.frequency.value = 18000; toneF.Q.value = 0.5;
  const send = ctx.createGain(); send.gain.value = 0.3;
  const verb = ctx.createConvolver();
  verb.buffer = (() => {
    const len = ctx.sampleRate * 3.2; const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    return b;
  })();
  theme.connect(toneF); toneF.connect(out);
  theme.connect(send); send.connect(verb); verb.connect(out);
  // Efectos de tensión y de entrada: van directo, sin el filtro.
  const fxBus = ctx.createGain(); fxBus.connect(out); fxBus.connect(send);

  const m = {
    key: null, def: null, kind: null, // 'zone' | 'boss'
    step: 0, nextT: 0, clean: 0, phase: 1, tension: 0,
    holdUntil: 0, // silencio de la entrada del jefe
    drone: null,
    beatT: 0, // próximo latido de tensión
    chord: 0, // acorde que suena ahora (grado de la escala)
    chordQueue: [], // cambios de acorde ya programados: [tiempo, grado]
  };

  /** Acorde que suena en este momento (los cambios se programan por adelantado). */
  function currentChord() {
    const now = ctx.currentTime;
    while (m.chordQueue.length && m.chordQueue[0][0] <= now) m.chord = m.chordQueue.shift()[1];
    return m.chord;
  }

  // ---------- instrumentos ----------
  function envGain(t, a, peak, dec, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    g.connect(dest);
    return g;
  }
  function osc(type, f, t, a, dur, peak, dest, f1) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(envGain(t, a, peak, dur, dest));
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function nz(t, dur, peak, type, f, q, dest, f1) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(fl); fl.connect(envGain(t, 0.004, peak, dur, dest));
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function filtered(type, f, t, a, dur, peak, cutoff, dest, detune = 0) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; fl.Q.value = 1;
    fl.connect(envGain(t, a, peak, dur, dest));
    for (const d of detune ? [-detune, detune] : [0]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d;
      o.connect(fl); o.start(t); o.stop(t + a + dur + 0.05);
    }
    return fl;
  }

  const INST = {
    kalimba(f, t, g, _l, d) { osc('sine', f, t, 0.004, 1.0, g, d); osc('sine', f * 5.4, t, 0.002, 0.12, g * 0.25, d); osc('triangle', f * 2, t, 0.003, 0.3, g * 0.15, d); },
    marimba(f, t, g, _l, d) { osc('sine', f, t, 0.003, 0.6, g, d); osc('sine', f * 4, t, 0.002, 0.08, g * 0.3, d); },
    bell(f, t, g, _l, d) { osc('sine', f, t, 0.003, 1.8, g, d); osc('sine', f * 2.76, t, 0.003, 0.9, g * 0.4, d); osc('sine', f * 5.4, t, 0.002, 0.4, g * 0.2, d); },
    glass(f, t, g, _l, d) { osc('sine', f, t, 0.002, 0.5, g, d); osc('sine', f * 3.1, t, 0.002, 0.2, g * 0.4, d); nz(t, 0.03, g * 0.6, 'bandpass', f * 2, 8, d); },
    pluck(f, t, g, _l, d) { filtered('triangle', f, t, 0.002, 0.25, g, f * 4, d); osc('sine', f * 2, t, 0.002, 0.08, g * 0.3, d); },
    sub(f, t, g, l, d) { osc('sine', f, t, 0.01, l * 0.9, g, d); osc('triangle', f * 2, t, 0.01, l * 0.4, g * 0.15, d); },
    glide(f, t, g, l, d) { const fl = filtered('sawtooth', f, t, 0.01, l, g, 500, d); fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(200, t + l); },
    flute(f, t, g, l, d) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = f * 0.008;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(envGain(t, 0.08, g, l, d));
      o.start(t); lfo.start(t); o.stop(t + l + 0.2); lfo.stop(t + l + 0.2);
      nz(t, 0.12, g * 0.25, 'bandpass', f * 2, 3, d);
    },
    pad(f, t, g, l, d) { filtered('sawtooth', f, t, l * 0.3, l * 0.9, g, 900, d, 9); filtered('sawtooth', f * 1.5, t, l * 0.35, l * 0.8, g * 0.6, 900, d, 7); },
    choir(f, t, g, l, d) {
      for (const [ff, q] of [[700, 6], [1100, 7]]) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
        bp.connect(envGain(t, l * 0.3, g * 3, l, d));
        for (const dt of [-12, 0, 12]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
          o.connect(bp); o.start(t); o.stop(t + l * 1.4);
        }
      }
    },
    lead(f, t, g, l, d) { filtered('sawtooth', f, t, 0.01, l * 0.9, g, 2200, d, 6); },
    brass(f, t, g, l, d) { const fl = filtered('sawtooth', f, t, 0.03, l * 0.9, g, 600, d, 5); fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(2400, t + 0.08); },
    square(f, t, g, _l, d) { filtered('square', f, t, 0.002, 0.14, g, 3000, d); },
    fm(f, t, g, _l, d) {
      const c = ctx.createOscillator(); c.frequency.value = f;
      const mo = ctx.createOscillator(); mo.frequency.value = f * 3.5; const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 4, t); mg.gain.exponentialRampToValueAtTime(f * 0.2, t + 0.3);
      mo.connect(mg); mg.connect(c.frequency);
      c.connect(envGain(t, 0.004, g, 0.35, d));
      c.start(t); mo.start(t); c.stop(t + 0.45); mo.stop(t + 0.45);
    },
    sonar(f, t, g, _l, d) { osc('sine', f, t, 0.005, 2.2, g, d); osc('sine', f * 1.01, t + 0.5, 0.005, 1.6, g * 0.4, d); },
    // Percusión (f se ignora; v = 1 golpe, 2 acento).
    kick(_f, t, g, _l, d, v) { osc('sine', 110, t, 0.002, 0.3, g * (v > 1 ? 1.2 : 0.85), d, 38); },
    tom(_f, t, g, _l, d, v) { osc('sine', v > 1 ? 120 : 95, t, 0.002, 0.4, g, d, 55); nz(t, 0.05, g * 0.2, 'lowpass', 900, 1, d); },
    snare(_f, t, g, _l, d, v) { nz(t, v > 1 ? 0.16 : 0.08, g * (v > 1 ? 1.3 : 0.7), 'highpass', 1600, 0.8, d); osc('triangle', 200, t, 0.001, 0.06, g * 0.5, d, 120); },
    hat(_f, t, g, _l, d, v) { nz(t, v > 1 ? 0.09 : 0.03, g * (v > 1 ? 1.2 : 0.8), 'highpass', 7000, 1, d); },
    shaker(_f, t, g, _l, d, v) { nz(t, 0.06, g * (v > 1 ? 1.3 : 0.8), 'bandpass', 5500, 2, d); },
    wood(_f, t, g, _l, d, v) { osc('sine', v > 1 ? 1100 : 850, t, 0.001, 0.05, g, d); nz(t, 0.01, g * 0.5, 'bandpass', 2500, 4, d); },
    clank(_f, t, g, _l, d, v) { nz(t, 0.12, g * (v > 1 ? 1.4 : 1), 'bandpass', 2300, 12, d); osc('square', 587, t, 0.001, 0.1, g * 0.2, d); osc('square', 831, t, 0.001, 0.08, g * 0.15, d); },
    drip(_f, t, g, _l, d) { const f = 900 + Math.random() * 700; osc('sine', f, t, 0.002, 0.07, g, d, f * 2.2); },
    popper(_f, t, g, _l, d) { const f = 400 + Math.random() * 500; osc('sine', f, t, 0.002, 0.08, g, d, f * 2.5); },
    zap(_f, t, g, _l, d) { nz(t, 0.2, g * 2, 'highpass', 3000, 1, d); osc('sawtooth', 1500, t, 0.001, 0.18, g * 0.6, d, 200); },
    smoke(_f, t, g, _l, d) { nz(t, 2.5, g * 2, 'lowpass', 200, 2, d, 900); },
  };

  // ---------- secuenciador ----------
  const stepDur = () => 60 / (m.def.bpm * (m.kind === 'boss' && m.phase >= 3 ? 1.08 : 1)) / 2;
  function freq(deg, oct) {
    const sc = m.def.scale; const n = sc.length;
    const i = ((deg % n) + n) % n;
    const semi = sc[i] + 12 * Math.floor(deg / n) + 12 * (oct - 4);
    return m.def.root * Math.pow(2, semi / 12);
  }
  const barLen = () => m.def.steps || 16;
  /** Grado de la escala del acorde que suena en el paso `step`. */
  function chordAt(step) {
    const pr = m.def.prog;
    return pr ? pr[Math.floor(step / barLen()) % pr.length] : 0;
  }
  function active(l) {
    return m.kind === 'boss' ? m.phase >= l.phase : m.clean >= l.at;
  }

  function startDrone() {
    stopDrone();
    const dr = m.def.drone; if (!dr) return;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(dr.gain, ctx.currentTime, 0.8);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = dr.cutoff;
    const nodes = [];
    const voices = [];
    for (const deg of dr.deg) {
      for (const dt of [-6, 6]) {
        const o = ctx.createOscillator(); o.type = dr.type; o.frequency.value = freq(deg, dr.oct); o.detune.value = dt;
        o.connect(lp); o.start(); nodes.push(o); voices.push([o, deg]);
      }
    }
    let out = lp;
    if (dr.trem) {
      const tg = ctx.createGain(); tg.gain.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = dr.trem; const lg = ctx.createGain(); lg.gain.value = 0.4;
      lfo.connect(lg); lg.connect(tg.gain); lfo.start(); nodes.push(lfo);
      lp.connect(tg); out = tg;
    }
    out.connect(g); g.connect(theme);
    m.drone = { g, nodes, voices, oct: dr.oct };
  }
  function stopDrone() {
    if (!m.drone) return;
    const { g, nodes } = m.drone; const t = ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.3);
    for (const n of nodes) n.stop(t + 1.5);
    m.drone = null;
  }

  function schedule() {
    if (!m.def) return;
    const horizon = ctx.currentTime + 0.2;
    while (m.nextT < horizon) {
      const t = m.nextT; const s = m.step; const sd = stepDur();
      const cr = chordAt(s);
      // Cambio de acorde: el drone se reafina y los efectos siguen la armonía.
      if (s % barLen() === 0) {
        if (m.drone) for (const [o, deg] of m.drone.voices) o.frequency.setTargetAtTime(freq(deg + cr, m.drone.oct), t, 0.08);
        m.chordQueue.push([t, cr]);
      }
      if (t >= m.holdUntil) {
        for (const l of m.def.layers) {
          if (!active(l)) continue;
          const v = l.seq[s % l.seq.length];
          if (v === null) continue;
          const f = l.oct ? freq(v + (l.chord ? cr : 0), l.oct) : 0;
          INST[l.inst](f, t, l.gain, (l.len || 1) * sd, theme, v);
        }
      }
      m.nextT += sd;
      m.step++;
    }
    // Latido de tensión (antes del jefe): cada vez más seguido y fuerte.
    if (m.tension > 0.02) {
      while (m.beatT < horizon) {
        const k = m.tension;
        INST.kick(0, m.beatT, 0.22 * k, 0, fxBus, 1);
        INST.kick(0, m.beatT + 0.22, 0.14 * k, 0, fxBus, 1);
        m.beatT += 1.3 - 0.55 * k;
      }
    } else m.beatT = ctx.currentTime + 0.1;
  }

  function applyTone() {
    const t = ctx.currentTime;
    // La tensión cierra el filtro y agrega eco: el tema se oye lejano y turbio.
    toneF.frequency.setTargetAtTime(18000 * Math.pow(0.03, m.tension), t, 0.4);
    send.gain.setTargetAtTime((m.def ? m.def.wet : 0.3) + 0.3 * m.tension, t, 0.4);
  }

  function play(kind, key, { at = ctx.currentTime + 0.05, fade = 0.5 } = {}) {
    const def = (kind === 'boss' ? BOSS_THEMES : ZONE_THEMES)[key];
    if (!def || (m.kind === kind && m.key === key)) return;
    const t = ctx.currentTime;
    theme.gain.setTargetAtTime(0, t, fade / 4);
    const start = Math.max(at, t + fade);
    m.kind = kind; m.key = key; m.def = def; m.step = 0; m.nextT = start;
    m.chord = 0; m.chordQueue = [];
    theme.gain.setTargetAtTime(1, start, 0.2);
    startDrone();
    applyTone();
  }

  return {
    get current() { return m.key && { kind: m.kind, key: m.key }; },
    /** Tema de una zona (índice 0..9 o clave). */
    playZone(z, opts) { play('zone', typeof z === 'number' ? ZONE_THEME_KEYS[z] : z, opts); },
    playBoss(key, opts) { m.phase = 1; play('boss', key, opts); },
    setClean(v) { m.clean = v; },
    setPhase(p) {
      if (p === m.phase) return;
      m.phase = p;
      if (m.kind === 'boss') {
        const t = ctx.currentTime;
        INST.tom(0, t, 0.3, 0, fxBus, 2); INST.snare(0, t + 0.1, 0.12, 0, fxBus, 2);
        nz(t, 0.8, 0.12, 'bandpass', 300, 2, fxBus, 2400);
      }
    },
    /** 0..1: sube en el nivel previo al jefe. */
    setTension(k) { m.tension = Math.max(0, Math.min(1, k)); applyTone(); },
    /** Entrada del jefe: crescendo, silencio y arranca su tema. Dura ~3,4 s. */
    bossEntrance(key) {
      const t = ctx.currentTime;
      m.tension = 0; applyTone();
      theme.gain.setTargetAtTime(0, t, 0.25);
      stopDrone();
      // Crescendo: ruido que sube, dos sierras que se abren, redoble acelerando.
      nz(t, 2.6, 0.22, 'bandpass', 120, 2, fxBus, 2600);
      for (const [f0, f1] of [[55, 110], [58, 116.5]]) {
        const fl = filtered('sawtooth', f0, t, 2.4, 0.3, 0.1, 300, fxBus);
        fl.frequency.setValueAtTime(200, t); fl.frequency.exponentialRampToValueAtTime(3000, t + 2.6);
      }
      let dt = 0.34;
      for (let x = 0; x < 2.6; x += dt, dt = Math.max(0.05, dt * 0.84)) INST.tom(0, t + x, 0.1 + x * 0.08, 0, fxBus, x > 1.8 ? 2 : 1);
      // Golpe final y silencio antes del tema.
      INST.kick(0, t + 2.7, 0.5, 0, fxBus, 2); nz(t + 2.7, 1.2, 0.2, 'lowpass', 3000, 1, fxBus, 100);
      m.phase = 1;
      m.kind = null; m.key = null;
      play('boss', key, { at: t + 3.4, fade: 0.1 });
      m.holdUntil = t + 3.4;
    },
    /** Remate al vencer al jefe: acorde mayor luminoso; después vuelve la zona. */
    bossDefeated() {
      const t = ctx.currentTime;
      theme.gain.setTargetAtTime(0, t, 0.3);
      stopDrone();
      m.kind = null; m.key = null; m.def = null;
      const root = 293.66;
      [0, 4, 7, 12, 16].forEach((s, i) => {
        const f = root * Math.pow(2, s / 12);
        INST.bell(f, t + 0.1 + i * 0.12, 0.08, 0, fxBus);
        filtered('sawtooth', f / 2, t + 0.1, 0.4, 3, 0.03, 1400, fxBus, 8);
      });
      INST.kick(0, t, 0.4, 0, fxBus, 2);
    },
    /**
     * Frecuencia de un grado relativo al acorde que suena, en la escala del tema
     * actual: los efectos (burbujas, combos, crías) quedan en tonalidad.
     */
    note(deg, oct = 4) {
      if (!m.def) return 293.66 * Math.pow(2, ([0, 2, 4, 7, 9][((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5) + 12 * (oct - 4)) / 12);
      return freq(deg + currentChord(), oct);
    },
    /** Se abrió una capa de la música (limpieza 25/50/75/100 %): destello ascendente. */
    milestone(k) {
      if (!m.def) return;
      const t = ctx.currentTime; const cr = currentChord();
      const steps = [0, 2, 4, 7, 9, 11].slice(0, 3 + k);
      steps.forEach((d, i) => INST.bell(freq(d + cr, 5), t + i * 0.055, 0.07, 0, fxBus));
      nz(t, 0.5, 0.06, 'bandpass', 800, 1.5, fxBus, 6000);
      INST.kalimba(freq(cr + 7 + 2 * k, 4), t + steps.length * 0.055, 0.12, 0, fxBus);
    },
    /** Queda un solo enemigo: subida corta que pide terminar. */
    lastOne() {
      if (!m.def) return;
      const t = ctx.currentTime; const cr = currentChord();
      [0, 2, 4, 6, 7].forEach((d, i) => INST.pluck(freq(d + cr, 4), t + i * 0.07, 0.12, 0, fxBus));
      INST.snare(0, t + 0.35, 0.08, 0, fxBus, 2);
    },
    /** El motivo de la zona tocado rápido, como fanfarria (inicio o fin de nivel). */
    jingle(big = false) {
      if (!m.def?.motif) return;
      const t = ctx.currentTime + 0.05; const sd = 0.1;
      m.def.motif.forEach((d, i) => {
        INST.marimba(freq(d, 5), t + i * sd, 0.14, 0, fxBus);
        if (big) INST.bell(freq(d + 7, 5), t + i * sd, 0.05, 0, fxBus);
      });
      if (big) {
        const end = t + m.def.motif.length * sd;
        [0, 2, 4, 7].forEach((d) => INST.bell(freq(d, 4), end, 0.07, 0, fxBus));
        INST.kick(0, end, 0.3, 0, fxBus, 2);
      }
    },
    stop() {
      theme.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      stopDrone();
      m.kind = null; m.key = null; m.def = null; m.tension = 0; applyTone();
    },
    /** Llamar cada frame. */
    update() { schedule(); },
  };
}
