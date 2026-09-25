// Mundo de la laguna: fondo en capas, terreno (rocas y plataformas), plantas
// que crecen con la limpieza y partículas ambientales. Todo se interpola entre
// una versión "sucia" y una "limpia" según `clean` ∈ [0,1].

import { COLS, ROWS, TILE, HUD_H, SCREEN_W, SCREEN_H } from '../../core/constants.js';
import { mix, mixHex, rgba, smoothstep, seeded } from './color.js';

const SOLID = 1;
const PLATFORM = 2;

// Paletas: índice 0 = sucio, 1 = limpio. La profundidad (nivel) oscurece el limpio.
const WATER_DIRTY = ['#5b5a47', '#3b3d34', '#1c1e1b'];
const WATER_SHALLOW = ['#46c3cf', '#1d86a3', '#0c3f60'];
const WATER_DEEP = ['#2a7fae', '#154f80', '#081c3c'];

const ROCK = {
  dirty: { top: '#6b6552', body: '#4a483d', dark: '#2a2924', lip: '#8a846c' },
  clean: { top: '#62d69a', body: '#2d6f73', dark: '#163c48', lip: '#a6f0cc' },
};

function tileAt(level, c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 0;
  return level.tiles[r * COLS + c];
}

/** Rectángulos que cubren los tiles sólidos (fusión greedy horizontal + vertical). */
function solidRects(level) {
  const used = new Uint8Array(COLS * ROWS);
  const rects = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (used[r * COLS + c] || tileAt(level, c, r) !== SOLID) continue;
      let w = 1;
      while (c + w < COLS && !used[r * COLS + c + w] && tileAt(level, c + w, r) === SOLID) w++;
      let h = 1;
      outer: while (r + h < ROWS) {
        for (let i = 0; i < w; i++) if (used[(r + h) * COLS + c + i] || tileAt(level, c + i, r + h) !== SOLID) break outer;
        h++;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) used[(r + y) * COLS + c + x] = 1;
      rects.push({ c, r, w, h });
    }
  }
  return rects;
}

/** Tramos horizontales de plataformas one-way. */
function platformRuns(level) {
  const runs = [];
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      if (tileAt(level, c, r) !== PLATFORM) { c++; continue; }
      const c0 = c;
      while (c < COLS && tileAt(level, c, r) === PLATFORM) c++;
      runs.push({ c: c0, r, w: c - c0 });
    }
  }
  return runs;
}

/** Bordes superiores expuestos (donde se apoyan cosas y crecen plantas). */
function exposedTops(level) {
  const tops = [];
  for (let r = 1; r < ROWS; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const t = tileAt(level, c, r);
      if ((t === SOLID || t === PLATFORM) && tileAt(level, c, r - 1) === 0) tops.push({ c, r });
    }
  }
  return tops;
}

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Pinta el terreno completo con una paleta; se precalcula sucio y limpio. */
function paintTerrain(ctx, level, pal, rnd, isClean) {
  const rects = solidRects(level);
  const runs = platformRuns(level);
  const Y = (r) => HUD_H + r * TILE;

  // Rocas sólidas: cuerpo con degradé vertical y guijarros.
  for (const q of rects) {
    const x = q.c * TILE; const y = Y(q.r); const w = q.w * TILE; const h = q.h * TILE;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, pal.body);
    g.addColorStop(1, pal.dark);
    ctx.fillStyle = g;
    roundRect(ctx, x - 0.5, y - 0.5, w + 1, h + 1, 2.5);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  for (const q of rects) ctx.rect(q.c * TILE, Y(q.r), q.w * TILE, q.h * TILE);
  ctx.clip();
  for (const q of rects) {
    const n = Math.ceil(q.w * q.h * 0.9);
    for (let i = 0; i < n; i++) {
      const px = (q.c + rnd() * q.w) * TILE;
      const py = Y(q.r) + rnd() * q.h * TILE;
      ctx.fillStyle = rgba(rnd() < 0.5 ? pal.dark : pal.lip, 0.18 + rnd() * 0.15);
      ctx.beginPath();
      ctx.ellipse(px, py, 1 + rnd() * 2.2, 0.8 + rnd() * 1.4, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Plataformas: cápsulas de piedra con brillo arriba y sombra abajo.
  for (const run of runs) {
    const x = run.c * TILE; const y = Y(run.r); const w = run.w * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(ctx, x + 1, y + 5, w - 2, 5, 2.5);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + TILE);
    g.addColorStop(0, pal.top);
    g.addColorStop(0.35, pal.body);
    g.addColorStop(1, pal.dark);
    ctx.fillStyle = g;
    roundRect(ctx, x, y + 0.5, w, TILE - 1, 3.5);
    ctx.fill();
    ctx.fillStyle = rgba(pal.lip, 0.75);
    roundRect(ctx, x + 2.5, y + 1.3, Math.min(w * 0.45, 22), 0.9, 0.45);
    ctx.fill();
  }

  // Borde superior expuesto: musgo (limpio) o costra con goteo (sucio).
  for (const t of exposedTops(level)) {
    const x = t.c * TILE; const y = Y(t.r);
    if (isClean) {
      ctx.fillStyle = pal.top;
      for (let i = 0; i < 3; i++) {
        const bx = x + rnd() * TILE; const bh = 0.8 + rnd() * 1.6;
        ctx.beginPath();
        ctx.ellipse(bx, y + 0.6, 1.2 + rnd(), bh, 0, Math.PI, 0);
        ctx.fill();
      }
    } else if (rnd() < 0.35) {
      ctx.fillStyle = rgba('#1a1812', 0.55);
      const dx = x + rnd() * TILE;
      ctx.beginPath();
      ctx.ellipse(dx, y + TILE - 0.5, 0.7, 1.2 + rnd() * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createWorld() {
  let key = '';
  let terrain = null; // { dirty, clean } canvases
  let deco = null; // plantas, rocas de fondo, motas

  function build(state, scale) {
    const level = state.level;
    const w = Math.round(SCREEN_W * scale);
    const h = Math.round(SCREEN_H * scale);
    const rndSeed = (state.levelIndex + 1) * 97;
    terrain = {};
    for (const variant of ['dirty', 'clean']) {
      const cv = makeCanvas(w, h);
      const cx = cv.getContext('2d');
      cx.setTransform(scale, 0, 0, scale, 0, 0);
      paintTerrain(cx, level, ROCK[variant], seeded(rndSeed), variant === 'clean');
      terrain[variant] = cv;
    }

    const rnd = seeded(rndSeed + 1);
    const tops = exposedTops(level).filter((t) => tileAt(level, t.c, t.r - 2) === 0);
    const plants = [];
    for (const t of tops) {
      if (rnd() > 0.34) continue;
      const kind = rnd() < 0.72 ? 'kelp' : 'lily';
      plants.push({
        x: t.c * TILE + rnd() * TILE, y: HUD_H + t.r * TILE + 1,
        h: kind === 'kelp' ? 8 + rnd() * (t.r > ROWS - 3 ? 26 : 12) : 5 + rnd() * 4,
        th: rnd() * 0.8, // umbral de limpieza a partir del cual crece
        ph: rnd() * 6.28, kind, hue: rnd(),
      });
    }
    const rocks = [];
    for (let i = 0; i < 7; i++) rocks.push({ x: rnd() * SCREEN_W, w: 30 + rnd() * 60, h: 20 + rnd() * 50 });
    const reeds = [];
    for (let i = 0; i < 14; i++) reeds.push({ x: rnd() * SCREEN_W, h: 25 + rnd() * 60, ph: rnd() * 6.28 });
    const motes = [];
    for (let i = 0; i < 46; i++) motes.push({ x: rnd() * SCREEN_W, y: rnd() * SCREEN_H, s: 0.3 + rnd() * 0.8, sp: 0.2 + rnd() * 0.8, ph: rnd() * 6.28 });
    deco = { plants, rocks, reeds, motes };
  }

  function ensure(state, scale) {
    const k = `${state.levelIndex}|${scale.toFixed(3)}|${state.level?.name}`;
    if (k !== key) { key = k; build(state, scale); }
  }

  /** Profundidad normalizada del nivel actual: 0 = superficie, 1 = fondo. */
  function depthOf(state) {
    const n = state.levels?.length || 1;
    return n > 1 ? state.levelIndex / (n - 1) : 0;
  }

  function drawBackground(ctx, state, t, clean) {
    const depth = depthOf(state);
    const c = [0, 1, 2].map((i) => mixHex(WATER_SHALLOW[i], WATER_DEEP[i], depth));
    const top = mix(WATER_DIRTY[0], c[0], clean);
    const midc = mix(WATER_DIRTY[1], c[1], clean);
    const bot = mix(WATER_DIRTY[2], c[2], clean);
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, top);
    g.addColorStop(0.55, midc);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(-8, -8, SCREEN_W + 16, SCREEN_H + 16);

    // Superficie ondulada con cáusticas (solo se ve limpia y en niveles altos).
    const surf = clean * (1 - depth * 0.8);
    if (surf > 0.02) {
      ctx.fillStyle = `rgba(220,250,255,${0.12 * surf})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= SCREEN_W; x += 8) ctx.lineTo(x, 10 + Math.sin(x * 0.07 + t * 1.3) * 2.5);
      ctx.lineTo(SCREEN_W, 0);
      ctx.fill();
    }

    // Rayos de luz.
    const rays = clean * (0.9 - depth * 0.55) + 0.04;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const bx = 30 + i * 62 + Math.sin(t * 0.25 + i * 1.7) * 14;
      const rg = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
      rg.addColorStop(0, `rgba(200,245,255,${0.16 * rays})`);
      rg.addColorStop(1, 'rgba(200,245,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(bx, -4);
      ctx.lineTo(bx + 16 + i * 3, -4);
      ctx.lineTo(bx + 60 + i * 6, SCREEN_H);
      ctx.lineTo(bx + 18, SCREEN_H);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Capa lejana: rocas y juncos en silueta (parallax suave con el tiempo).
    const far = mix('#2a2a24', mixHex(WATER_DEEP[1], WATER_DEEP[2], 0.5), clean);
    ctx.fillStyle = far;
    ctx.globalAlpha = 0.55;
    for (const r of deco.rocks) {
      ctx.beginPath();
      ctx.ellipse(r.x + Math.sin(t * 0.1) * 2, SCREEN_H, r.w, r.h, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.strokeStyle = far;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (const r of deco.reeds) {
      const sway = Math.sin(t * 0.8 + r.ph) * 4;
      ctx.beginPath();
      ctx.moveTo(r.x, SCREEN_H);
      ctx.quadraticCurveTo(r.x + sway * 0.4, SCREEN_H - r.h * 0.5, r.x + sway, SCREEN_H - r.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawTerrain(ctx, clean) {
    ctx.drawImage(terrain.dirty, 0, 0, SCREEN_W, SCREEN_H);
    if (clean > 0.001) {
      ctx.globalAlpha = clean;
      ctx.drawImage(terrain.clean, 0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlants(ctx, t, clean) {
    ctx.lineCap = 'round';
    for (const p of deco.plants) {
      const grow = smoothstep(p.th, p.th + 0.25, clean);
      if (grow <= 0.01) continue;
      const sway = Math.sin(t * 1.4 + p.ph);
      if (p.kind === 'kelp') {
        const h = p.h * grow;
        ctx.strokeStyle = mix('#2f8a5a', '#5fd68a', p.hue);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x + sway * 2, p.y - h * 0.35, p.x - sway * 2.5, p.y - h * 0.7, p.x + sway * 3, p.y - h);
        ctx.stroke();
        ctx.fillStyle = mix('#3aa06a', '#7ae6a0', p.hue);
        for (let k = 0.35; k < 1; k += 0.3) {
          const lx = p.x + sway * 2.5 * k; const ly = p.y - h * k;
          ctx.beginPath();
          ctx.ellipse(lx + 1.5, ly, 1.8, 0.8, -0.5 + sway * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Lirio de agua: tallo corto con brote que abre al final.
        const h = p.h * grow;
        ctx.strokeStyle = '#46b07a';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(p.x + sway, p.y - h * 0.6, p.x + sway * 1.5, p.y - h);
        ctx.stroke();
        const open = smoothstep(0.75, 1, clean);
        const fx = p.x + sway * 1.5; const fy = p.y - h;
        ctx.fillStyle = mix('#ff9ec0', '#ffd0e4', p.hue);
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * (0.25 + open * 0.35);
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(a) * 1.2 * open, fy + Math.sin(a) * 1.2 * open, 0.9 + open * 0.6, 2, a + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (open > 0.5) {
          ctx.fillStyle = '#fff3a8';
          ctx.beginPath();
          ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawMotes(ctx, t, clean) {
    for (const m of deco.motes) {
      const y = ((m.y - t * m.sp * 6) % SCREEN_H + SCREEN_H) % SCREEN_H;
      const x = m.x + Math.sin(t * 0.7 + m.ph) * 3;
      if (clean > 0.5) {
        ctx.fillStyle = `rgba(235,252,255,${0.45 * (clean - 0.3)})`;
      } else {
        ctx.fillStyle = `rgba(120,110,80,${0.5 * (1 - clean)})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { ensure, drawBackground, drawTerrain, drawPlants, drawMotes, invalidate() { key = ''; } };
}
