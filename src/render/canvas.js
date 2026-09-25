// render/canvas.js — dueño: R (Renderer canvas)
// Implementa la API de CONTRACT.md §10: createRenderer(canvas, sprites, { scale }).
// Dibuja únicamente a partir de GameState (§4) y GameEvent (§6). No muta state.

const TILE = 8;
const COLS = 32;
const ROWS = 26;
const HUD_H = 16;
const SCREEN_W = COLS * TILE; // 256
const SCREEN_H = HUD_H + ROWS * TILE; // 224

const SPRITE_SIZE = 16;
const TILE_SIZE = 8;

// -----------------------------------------------------------------------
// Mini font bitmap 3x5 (mayúsculas, dígitos y algo de puntuación). Se dibuja
// pixel a pixel escalado, para look retro sin depender de fuentes del SO.
// -----------------------------------------------------------------------
const FONT_W = 3;
const FONT_H = 5;
const FONT = {
  'A': ['111', '101', '111', '101', '101'],
  'B': ['110', '101', '110', '101', '110'],
  'C': ['111', '100', '100', '100', '111'],
  'D': ['110', '101', '101', '101', '110'],
  'E': ['111', '100', '111', '100', '111'],
  'F': ['111', '100', '111', '100', '100'],
  'G': ['111', '100', '101', '101', '111'],
  'H': ['101', '101', '111', '101', '101'],
  'I': ['111', '010', '010', '010', '111'],
  'J': ['001', '001', '001', '101', '111'],
  'K': ['101', '110', '100', '110', '101'],
  'L': ['100', '100', '100', '100', '111'],
  'M': ['101', '111', '111', '101', '101'],
  'N': ['101', '111', '111', '111', '101'],
  'O': ['111', '101', '101', '101', '111'],
  'P': ['111', '101', '111', '100', '100'],
  'Q': ['111', '101', '101', '111', '001'],
  'R': ['111', '101', '111', '110', '101'],
  'S': ['111', '100', '111', '001', '111'],
  'T': ['111', '010', '010', '010', '010'],
  'U': ['101', '101', '101', '101', '111'],
  'V': ['101', '101', '101', '101', '010'],
  'W': ['101', '101', '111', '111', '101'],
  'X': ['101', '101', '010', '101', '101'],
  'Y': ['101', '101', '010', '010', '010'],
  'Z': ['111', '001', '010', '100', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ' ': ['000', '000', '000', '000', '000'],
  '-': ['000', '000', '111', '000', '000'],
  '.': ['000', '000', '000', '000', '010'],
  ':': ['000', '010', '000', '010', '000'],
  '!': ['010', '010', '010', '000', '010'],
};

/** Dibuja texto pixel-art con `drawText`. `scale` = tamaño de cada "pixel" del font. */
function drawText(ctx, text, x, y, color, scale = 1, spacing = 1) {
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const glyph = FONT[ch] || FONT[' '];
    ctx.fillStyle = color;
    for (let row = 0; row < FONT_H; row++) {
      for (let col = 0; col < FONT_W; col++) {
        if (glyph[row][col] === '1') {
          ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    cx += (FONT_W + spacing) * scale;
  }
  return cx - x; // ancho total dibujado
}

function textWidth(text, scale = 1, spacing = 1) {
  return String(text).length * (FONT_W + spacing) * scale - spacing * scale;
}

// -----------------------------------------------------------------------
// Precálculo de sprites en canvases offscreen (con versión espejada).
// -----------------------------------------------------------------------

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Dibuja un frame (array de strings de chars hex) en un canvas de tamaño size. */
function paintFrame(rows, palette, size) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < size; x++) {
      const ch = row[x] || '.';
      let color = '#00000000';
      if (ch !== '.' && ch !== '0') {
        const idx = parseInt(ch, 16);
        color = palette[idx] || '#00000000';
      } else if (ch === '0') {
        color = palette[0] || '#00000000';
      }
      const rgba = hexToRgba(color);
      const i = (y * size + x) * 4;
      img.data[i] = rgba[0];
      img.data[i + 1] = rgba[1];
      img.data[i + 2] = rgba[2];
      img.data[i + 3] = rgba[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function hexToRgba(hex) {
  if (!hex) return [0, 0, 0, 0];
  let h = hex.replace('#', '');
  if (h.length === 6) h += 'ff';
  if (h.length !== 8) return [0, 0, 0, 0];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = parseInt(h.slice(6, 8), 16);
  return [r, g, b, a];
}

function mirrorCanvas(src, size) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Precalcula todos los sprites de `sprites.SPRITES` en canvases (normal + mirror). */
function precalcSprites(sprites) {
  const out = {};
  for (const key of Object.keys(sprites.SPRITES)) {
    const def = sprites.SPRITES[key];
    const palette = sprites.PALETTES[def.palette] || [];
    const size = key.startsWith('tile.') ? TILE_SIZE : SPRITE_SIZE;
    const frames = def.frames.map((rows) => {
      const normal = paintFrame(rows, palette, size);
      const mirrored = mirrorCanvas(normal, size);
      return { normal, mirrored };
    });
    out[key] = { frames, fps: def.fps || 1, size };
  }
  return out;
}

/** Busca la key más cercana con fallback: exacta → .walk → .idle → null. */
function resolveSpriteKey(cache, entity, anim) {
  const direct = `${entity}.${anim}`;
  if (cache[direct]) return direct;
  const walk = `${entity}.walk`;
  if (cache[walk]) return walk;
  const idle = `${entity}.idle`;
  if (cache[idle]) return idle;
  return null;
}

function frameIndexFor(cache, key, frame) {
  const entry = cache[key];
  const n = entry.frames.length;
  if (n <= 1) return 0;
  const fps = entry.fps || 1;
  return Math.floor((frame * fps) / 60) % n;
}

// -----------------------------------------------------------------------
// createRenderer
// -----------------------------------------------------------------------

export function createRenderer(canvas, sprites, { scale = 3 } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let cache;
  try {
    cache = precalcSprites(sprites);
  } catch (err) {
    cache = {};
  }

  let curScale = scale;
  applyScale(curScale);

  function applyScale(s) {
    curScale = s;
    canvas.width = SCREEN_W * s;
    canvas.height = SCREEN_H * s;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // Estado cosmético interno derivado de events (popups de puntos, etc).
  const floaters = []; // { x, y, text, life, maxLife, color }

  function pushFloater(x, y, text, color = '#ffffff') {
    floaters.push({ x, y, text, life: 40, maxLife: 40, color });
  }

  function updateFloaters() {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life--;
      f.y -= 0.3;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  function consumeEvents(events) {
    if (!events || !events.length) return;
    for (const ev of events) {
      if (ev.type === 'popEnemy' && typeof ev.points === 'number') {
        pushFloater(ev.x ?? 0, ev.y ?? 0, ev.points, '#ffe14d');
      } else if (ev.type === 'fruitCollect' && typeof ev.points === 'number') {
        pushFloater(ev.x ?? 0, ev.y ?? 0, ev.points, '#a0f0a0');
      }
    }
  }

  function drawSprite(entityKey, anim, frame, x, y, facing = 1) {
    const key = resolveSpriteKey(cache, entityKey, anim);
    if (!key) {
      // Fallback: rectángulo de color sólido, sin tirar errores.
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(Math.round(x), Math.round(y), SPRITE_SIZE, SPRITE_SIZE);
      return;
    }
    const entry = cache[key];
    const idx = frameIndexFor(cache, key, frame);
    const pair = entry.frames[idx];
    const c = facing === -1 ? pair.mirrored : pair.normal;
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }

  function drawTile(kind, levelSkin, col, row) {
    const key = `tile.${kind}.level${levelSkin}`;
    const entry = cache[key];
    const x = col * TILE_SIZE;
    const y = HUD_H + row * TILE_SIZE;
    if (!entry) {
      ctx.fillStyle = kind === 'solid' ? '#606878' : '#a8b0c0';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      return;
    }
    ctx.drawImage(entry.frames[0].normal, x, y);
  }

  function drawBackground() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function drawLevel(state) {
    const level = state.level;
    if (!level || !level.tiles) return;
    const skin = ((state.levelIndex % 4) + 4) % 4;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = level.tiles[row * COLS + col];
        if (t === 1) drawTile('solid', skin, col, row);
        else if (t === 2) drawTile('platform', skin, col, row);
      }
    }
  }

  function fruitKeyFromKind(kind) {
    return `fruit.${kind}`;
  }

  // NOTA: fruits/enemies/players/bubbles usan coordenadas relativas al playfield
  // (y = 0 en el borde superior del área de juego, igual que level.tiles), así que
  // sumamos HUD_H al dibujar, igual que con los tiles.

  function drawFruitsReal(state) {
    for (const f of state.fruits || []) {
      const key = fruitKeyFromKind(f.kind);
      const entry = cache[key];
      const x = Math.round(f.x);
      const y = Math.round(HUD_H + f.y);
      if (!entry) {
        ctx.fillStyle = '#ff8fa0';
        ctx.fillRect(x, y, SPRITE_SIZE, SPRITE_SIZE);
        continue;
      }
      ctx.drawImage(entry.frames[0].normal, x, y);
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies || []) {
      if (e.state === 'trapped') continue; // se dibujan junto a su burbuja
      let anim = e.anim;
      if (!anim) {
        if (e.state === 'angry') anim = 'angry';
        else if (e.state === 'dying') anim = 'die';
        else anim = 'walk';
      }
      const x = Math.round(e.x);
      const y = Math.round(HUD_H + e.y);
      drawSprite(e.type, anim, state.frame, x, y, e.facing);
    }
  }

  function drawBubbles(state) {
    for (const b of state.bubbles || []) {
      const x = Math.round(b.x);
      const y = Math.round(HUD_H + b.y);
      if (b.trapped) {
        // Enemigo atrapado adentro, más el overlay de burbuja encima.
        drawSprite(b.trapped.enemyType, 'walk', state.frame, x, y, 1);
        drawSprite('bubble', 'trapped', state.frame, x, y, 1);
      } else if (b.phase === 'pop') {
        drawSprite('bubble', 'pop', state.frame, x, y, 1);
      } else {
        drawSprite('bubble', 'normal', state.frame, x, y, 1);
      }
    }
  }

  function drawPlayers(state) {
    for (const p of state.players || []) {
      if (p.state === 'dead') continue;
      if (p.invuln > 0 && Math.floor(state.frame / 4) % 2 === 0) continue; // parpadeo
      const entity = p.id === 2 ? 'bob' : 'bub';
      const anim = p.anim || 'idle';
      const x = Math.round(p.x);
      const y = Math.round(HUD_H + p.y);
      drawSprite(entity, anim, state.frame, x, y, p.facing);
    }
  }

  function drawFloaters() {
    for (const f of floaters) {
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = alpha;
      drawText(ctx, String(f.text), Math.round(f.x), Math.round(HUD_H + f.y), f.color, 1);
      ctx.globalAlpha = 1;
    }
  }

  function player(state, id) {
    return (state.players || []).find((p) => p.id === id);
  }

  function drawHud(state) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SCREEN_W, HUD_H);

    const p1 = player(state, 1);
    const p2 = player(state, 2);

    // 1UP a la izquierda.
    drawText(ctx, '1UP', 4, 2, '#ff5050', 1);
    drawText(ctx, String(p1 ? p1.score : 0), 4, 9, '#ffffff', 1);

    // 2UP a la derecha, solo si existe.
    if (p2) {
      const label = '2UP';
      const w = textWidth(label, 1);
      drawText(ctx, label, SCREEN_W - 4 - w, 2, '#50a0ff', 1);
      const scoreStr = String(p2.score);
      const sw = textWidth(scoreStr, 1);
      drawText(ctx, scoreStr, SCREEN_W - 4 - sw, 9, '#ffffff', 1);
    }

    // Round al centro.
    const roundText = `ROUND ${state.levelIndex + 1}`;
    const rw = textWidth(roundText, 1);
    drawText(ctx, roundText, Math.round((SCREEN_W - rw) / 2), 2, '#ffffff', 1);

    // Vidas como iconos chicos (cuadraditos), debajo del centro.
    const lifeIconsY = 9;
    let lx = Math.round((SCREEN_W - rw) / 2);
    if (p1) {
      for (let i = 0; i < p1.lives; i++) {
        ctx.fillStyle = '#ff5050';
        ctx.fillRect(lx + i * 5, lifeIconsY, 3, 3);
      }
    }
    if (p2) {
      const startX = Math.round((SCREEN_W - rw) / 2) + 40;
      for (let i = 0; i < p2.lives; i++) {
        ctx.fillStyle = '#50a0ff';
        ctx.fillRect(startX + i * 5, lifeIconsY, 3, 3);
      }
    }
  }

  function centeredText(text, y, color, scale = 2) {
    const w = textWidth(text, scale);
    drawText(ctx, text, Math.round((SCREEN_W - w) / 2), y, color, scale);
  }

  function drawTitleScreen(state) {
    drawBackground();
    centeredText('BUBBLE BOBBLE', 80, '#ffffff', 2);
    if (Math.floor(state.frame / 30) % 2 === 0) {
      centeredText('PRESS 1 OR 2', 130, '#ffe14d', 1);
    }
  }

  function drawOverlay(text, color = '#ffffff') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, HUD_H, SCREEN_W, SCREEN_H - HUD_H);
    centeredText(text, Math.round(SCREEN_H / 2) - 4, color, 2);
  }

  function drawGame(state) {
    drawBackground();
    drawLevel(state);
    drawFruitsReal(state);
    drawEnemies(state);
    drawBubbles(state);
    drawPlayers(state);
    drawFloaters();
    drawHud(state);
  }

  function draw(state) {
    updateFloaters();
    consumeEvents(state.events);

    if (state.mode === 'title') {
      drawTitleScreen(state);
      return;
    }

    drawGame(state);

    if (state.mode === 'paused') {
      drawOverlay('PAUSED', '#ffffff');
    } else if (state.mode === 'levelClear') {
      drawOverlay('ROUND CLEAR', '#a0f0a0');
    } else if (state.mode === 'gameOver') {
      drawOverlay('GAME OVER', '#ff5050');
    } else if (state.mode === 'victory') {
      drawOverlay('VICTORY!', '#ffe14d');
    }
  }

  function resize(newScale) {
    applyScale(newScale);
  }

  return { draw, resize };
}
