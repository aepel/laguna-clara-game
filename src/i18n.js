// Textos de Laguna Clara en español e inglés. `t(clave, params)` devuelve el
// texto en el idioma actual; con la plataforma 'touch' (mobile) primero busca
// la variante táctil, que habla de toques y botones en vez de teclas.
// El idioma sale del navegador la primera vez y después se recuerda.

export const ZONE_NAMES = {
  es: [
    ['La Orilla', 'Crudo', 'Botellón'],
    ['El Juncal', 'Bolsamedusa', 'Red Fantasma'],
    ['Los Nenúfares', 'Latita', 'Capitán Lata'],
    ['Los Canales', 'Microplásticos', 'Enjambre Arcoíris'],
    ['Las Raíces', 'Colillas', 'Humareda'],
    ['La Cueva', 'Espumosos', 'Espuma Madre'],
    ['El Lodo', 'Gomones', 'Gran Rueda'],
    ['La Floración', 'Verdín', 'Floración'],
    ['El Abismo', 'Pilas', 'Anguila Voltio'],
    ['El Caño', 'Lodos químicos', 'La Gran Mancha'],
  ],
  en: [
    ['The Shore', 'Crude', 'Big Bottle'],
    ['The Reeds', 'Bagjelly', 'Ghost Net'],
    ['The Lily Pads', 'Canny', 'Captain Can'],
    ['The Canals', 'Microplastics', 'Rainbow Swarm'],
    ['The Roots', 'Cig Butts', 'Smog Cloud'],
    ['The Cave', 'Foamies', 'Mother Foam'],
    ['The Mud', 'Tirelings', 'Great Wheel'],
    ['The Bloom', 'Greenscum', 'Toxic Bloom'],
    ['The Abyss', 'Batteries', 'Volt Eel'],
    ['The Drain', 'Toxic Sludge', 'The Great Stain'],
  ],
};

export const DICT = {
  es: {
    'title.start1': 'Pulsá 1 · un jugador',
    'title.start2': 'Pulsá 2 · dos jugadores',
    'title.controls': 'Nilo: ← → ↑ + Espacio   ·   Lirio: A D W + F',
    'title.story': 'I · ver la historia   ·   L · English',
    'title.zone': 'Zona {n} · {name}',
    'sound.line': 'M · música: {music}   N · efectos: {sfx}',
    'sound.on': 'sí',
    'sound.off': 'no',
    'pause.title': 'Pausa',
    'pause.resume': 'P para seguir',
    'clear.title': '¡Agua limpia!',
    'clear.rescued': 'Crías rescatadas: {n}',
    'gameover.title': 'La laguna te espera',
    'gameover.retry': 'Pulsá 1 o 2 para volver a intentar',
    'hud.level': 'Nivel {n}',
    'hud.join': 'Pulsá {id}',
    'hud.boss': 'Jefe',
    'banner.zone': 'Zona {n} · {name}',
    'banner.boss': 'Jefe: {name}',
    'banner.hard': '¡Nivel desafío!',
    'banner.level': 'Nivel {n}',
    'banner.new': 'Nuevo: {name}',
    'fx.cria': '+1 cría',
    'fx.crias': '+{n} crías',
    'fx.clean': '¡Limpieza!',
    'fx.escape': '¡Se escapa al caño!',
    'intro.press': 'Pulsá cualquier tecla',
    'intro.headphones': 'Mejor con auriculares',
    'intro.skip': 'Espacio para saltear',
    'intro.1': 'La laguna era nuestro mundo entero.',
    'intro.2': 'Hasta que el agua empezó a cambiar.',
    'intro.3': 'Nuestros vecinos ya no se parecían a sí mismos.',
    'intro.4': 'Hasta que Lirio sopló.',
    'intro.5': 'Y el agua volvió a ser agua.',
    'intro.6': 'Vamos a limpiarla. Hasta el fondo.',
    'end.1': 'Y la mancha dejó de ser mancha.',
    'end.2': 'Soplamos juntos, bien fuerte.',
    'end.3': 'Piso por piso, el agua se acordó de su color.',
    'end.4': 'Nuestra laguna. Otra vez.',
    'end.rescued': 'Rescataste {n} crías de ajolote',
    'end.shine': 'La laguna volvió a brillar',
    'end.score': 'Puntaje: {score}   ·   Crías rescatadas: {n}',
    'end.fact1': 'El ajolote vive en unos pocos canales de agua dulce,',
    'end.fact2': 'y la contaminación es una de sus principales amenazas.',
    'end.fact3': 'Cuidar el agua es cuidar a quienes viven en ella.',
    'end.again': 'Pulsá 1 o 2 para jugar de nuevo',
  },
  en: {
    'title.start1': 'Press 1 · one player',
    'title.start2': 'Press 2 · two players',
    'title.controls': 'Nilo: ← → ↑ + Space   ·   Lirio: A D W + F',
    'title.story': 'I · watch the story   ·   L · Español',
    'title.zone': 'Zone {n} · {name}',
    'sound.line': 'M · music: {music}   N · effects: {sfx}',
    'sound.on': 'on',
    'sound.off': 'off',
    'pause.title': 'Paused',
    'pause.resume': 'P to resume',
    'clear.title': 'Clean water!',
    'clear.rescued': 'Babies rescued: {n}',
    'gameover.title': 'The lagoon awaits',
    'gameover.retry': 'Press 1 or 2 to try again',
    'hud.level': 'Level {n}',
    'hud.join': 'Press {id}',
    'hud.boss': 'Boss',
    'banner.zone': 'Zone {n} · {name}',
    'banner.boss': 'Boss: {name}',
    'banner.hard': 'Challenge level!',
    'banner.level': 'Level {n}',
    'banner.new': 'New: {name}',
    'fx.cria': '+1 baby',
    'fx.crias': '+{n} babies',
    'fx.clean': 'Squeaky clean!',
    'fx.escape': 'It slipped down the drain!',
    'intro.press': 'Press any key',
    'intro.headphones': 'Best with headphones',
    'intro.skip': 'Space to skip',
    'intro.1': 'The lagoon was our whole world.',
    'intro.2': 'Until the water began to change.',
    'intro.3': 'Our neighbors no longer looked like themselves.',
    'intro.4': 'Until Lirio blew a bubble.',
    'intro.5': 'And the water was water again.',
    'intro.6': "Let's clean it up. All the way down.",
    'end.1': 'And the stain was a stain no more.',
    'end.2': 'We blew together, as hard as we could.',
    'end.3': 'Floor by floor, the water remembered its color.',
    'end.4': 'Our lagoon. Once again.',
    'end.rescued': 'You rescued {n} axolotl babies',
    'end.shine': 'The lagoon shines again',
    'end.score': 'Score: {score}   ·   Babies rescued: {n}',
    'end.fact1': 'Axolotls live in only a few freshwater canals,',
    'end.fact2': 'and pollution is one of their greatest threats.',
    'end.fact3': 'Caring for water means caring for everyone who lives in it.',
    'end.again': 'Press 1 or 2 to play again',
  },
};

// Variantes para pantallas táctiles (un jugador).
export const TOUCH = {
  es: {
    'title.start1': 'Tocá para jugar',
    'title.start2': '',
    'title.controls': 'Joystick para nadar · Saltar · Burbuja',
    'title.story': '',
    'sound.line': '♪ música: {music}   FX efectos: {sfx}',
    'pause.resume': 'Tocá ❚❚ para seguir',
    'gameover.retry': 'Tocá para volver a intentar',
    'hud.join': '',
    'intro.press': 'Tocá la pantalla',
    'intro.skip': 'Tocá para saltear',
    'end.again': 'Tocá para jugar de nuevo',
  },
  en: {
    'title.start1': 'Tap to play',
    'title.start2': '',
    'title.controls': 'Joystick to swim · Jump · Bubble',
    'title.story': '',
    'sound.line': '♪ music: {music}   FX effects: {sfx}',
    'pause.resume': 'Tap ❚❚ to resume',
    'gameover.retry': 'Tap to try again',
    'hud.join': '',
    'intro.press': 'Tap the screen',
    'intro.skip': 'Tap to skip',
    'end.again': 'Tap to play again',
  },
};

export const LANGS = ['es', 'en'];
const LANG_KEY = 'lagunaClara.lang';

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* sin storage */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let lang = typeof window === 'undefined' ? 'es' : detect();
let platform = 'keys';

export const getLang = () => lang;

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* sin storage */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

/** 'keys' (teclado) o 'touch' (mobile). */
export function setPlatform(p) { platform = p; }

export function t(key, params) {
  const touch = platform === 'touch' ? TOUCH[lang][key] : undefined;
  let s = touch ?? DICT[lang][key] ?? DICT.es[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
  return s;
}

/** Números con separador de miles del idioma. */
export const fmt = (n) => n.toLocaleString(lang === 'es' ? 'es-AR' : 'en-US');

export const zoneName = (i) => ZONE_NAMES[lang][i][0];
export const enemyName = (i) => ZONE_NAMES[lang][i][1];
export const bossName = (i) => ZONE_NAMES[lang][i][2];
