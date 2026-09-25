// Renderer HD de Laguna Clara. Reemplaza a render/canvas.js con la misma API
// (createRenderer → { draw, resize }) y suma step(state), que main.js llama una
// vez por paso de simulación para consumir eventos y animar a 60 Hz fijos.
//
// La simulación sigue en su espacio lógico de 256x224; acá solo se escala el
// dibujo a la resolución real de la pantalla, sin pixelar.

import { SCREEN_W, SCREEN_H, HUD_H } from '../../core/constants.js';
import { cleanliness } from '../../shared/cleanliness.js';
import { createFx } from './fx.js';
import { createCosmetics } from './cosmetic.js';
import { createWorld } from './world.js';
import { drawHero } from './heroes.js';
import { drawEnemy, drawHazards } from './enemies.js';
import { drawBubble, drawPickup } from './items.js';
import { drawHud } from './hud.js';
import { drawTitle, drawPaused, drawLevelClear, drawGameOver, drawBanner } from './screens.js';
import { drawEnding } from './ending.js';
import { drawBoss, drawBossShots, drawPipe } from './bosses.js';
import { createLife } from './animals.js';
import { seeded } from './color.js';
import { ZONES, LEVELS_PER_ZONE } from '../../data/zones.js';
import { t as tx, fmt, zoneName, enemyName, bossName } from '../../i18n.js';

const rand = seeded(31);
const center = (e, w = 16, h = 16) => [e.x + w / 2, HUD_H + e.y + h / 2];
const PLAYER_COLOR = { 1: '#ffabc8', 2: '#9fe6cf' };

/** Líneas del cartel de inicio: zona nueva, enemigo nuevo, desafío o jefe. */
function bannerFor(state) {
  const level = state.level;
  const z = ZONES[level.zone] ? level.zone : 0;
  const zone = ZONES[z];
  const within = state.levelIndex % LEVELS_PER_ZONE;
  const lines = [];
  if (within === 0) lines.push({ text: tx('banner.zone', { n: level.zone + 1, name: zoneName(z) }), size: 14, color: '#eaf6ff' });
  if (level.boss) lines.push({ text: tx('banner.boss', { name: bossName(z) }), size: 16, color: '#ff9ec0' });
  else if (level.hard) lines.push({ text: tx('banner.hard'), size: 16, color: '#ffb86a' });
  else lines.push({ text: tx('banner.level', { n: state.levelIndex + 1 }), size: within === 0 ? 8 : 12, color: '#eaf6ff' });
  if (within === 0 && zone.char) lines.push({ text: tx('banner.new', { name: enemyName(z) }), size: 7, color: '#7ee8c8' });
  return lines;
}

export function createRenderer(canvas, _sprites, { maxDpr = 2 } = {}) {
  const ctx = canvas.getContext('2d');
  const fx = createFx();
  const cos = createCosmetics();
  const world = createWorld();
  const life = createLife(); // animales liberados que nadan por el nivel
  let scale = 1;
  let shownClean = 0;
  let lastLevel = -1;
  let lastState = null;
  let banner = null; // { lines, t } cartel de inicio de nivel
  let meta = { unlockedZone: 0 };

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const s = Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H);
    const cssW = Math.floor(SCREEN_W * s);
    const cssH = Math.floor(SCREEN_H * s);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = canvas.width / SCREEN_W;
    world.invalidate();
  }
  fit();
  window.addEventListener('resize', fit);

  function onEvent(ev) {
    cos.onEvent(ev);
    const [cx, cy] = ev.x !== undefined ? center(ev) : [SCREEN_W / 2, SCREEN_H / 2];
    switch (ev.type) {
      case 'jump':
        fx.burst(cx, cy + 7, 3, () => ({ kind: 'bubble', x: cx + (rand() - 0.5) * 8, y: cy + 7, vy: -0.4 - rand() * 0.3, size: 0.6 + rand() * 0.6, life: 30 }));
        break;
      case 'shoot':
        fx.burst(cx, cy, 4, () => ({ kind: 'bubble', x: cx, y: cy, vx: (rand() - 0.5) * 1.2, vy: -0.3 - rand() * 0.5, size: 0.5 + rand() * 0.7, life: 26 }));
        break;
      case 'trap':
        fx.shake(0.6);
        fx.burst(cx, cy, 8, (i, n) => { const a = (i / n) * Math.PI * 2; return { kind: 'spark', color: '#d6f7ff', x: cx, y: cy, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, size: 0.6, life: 16, drag: 0.85 }; });
        break;
      case 'pop':
        fx.burst(cx, cy, 8, (i, n) => { const a = (i / n) * Math.PI * 2; return { kind: 'shard', x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, rot: a, size: 1.2, life: 12, drag: 0.85 }; });
        break;
      case 'popEnemy': {
        const n = ev.combo || 1;
        if (ev.enemyType) life.free(ev.enemyType, cx, cy, rand);
        fx.shake(0.8 + n * 0.5);
        if (n >= 3) fx.flash('#fff8c0', 0.25 + n * 0.05);
        fx.burst(cx, cy, 14 + n * 4, () => { const a = rand() * Math.PI * 2; const sp = 0.8 + rand() * 2; return { kind: 'spark', color: rand() < 0.5 ? '#fff8c0' : '#b8f07a', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 0.5 + rand() * 0.6, life: 24 + rand() * 16, drag: 0.9 }; });
        // La contaminación se deshace: manchas oscuras que se disipan.
        fx.burst(cx, cy, 6, () => ({ kind: 'ink', color: '#1a1622', x: cx + (rand() - 0.5) * 8, y: cy + (rand() - 0.5) * 8, vx: (rand() - 0.5) * 0.6, vy: -0.2 - rand() * 0.3, size: 2 + rand() * 2, life: 40 }));
        fx.burst(cx, cy, 8, (i, n2) => { const a = (i / n2) * Math.PI * 2; return { kind: 'shard', x: cx + Math.cos(a) * 7, y: cy + Math.sin(a) * 7, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, rot: a, size: 1.4, life: 14, drag: 0.85 }; });
        if (ev.points) fx.text(cx, cy - 6, fmt(ev.points), n >= 3 ? '#fff3a8' : '#ffffff', 6 + Math.min(n, 5));
        break;
      }
      case 'escape':
        fx.shake(1.2);
        fx.burst(cx, cy, 10, () => ({ kind: 'ink', color: '#2a0f14', x: cx, y: cy, vx: (rand() - 0.5) * 1.6, vy: (rand() - 0.5) * 1.6, size: 2 + rand() * 2.5, life: 36 }));
        break;
      case 'fruitSpawn':
        fx.burst(cx, cy, 6, () => ({ kind: 'spark', color: '#b8f07a', x: cx, y: cy, vx: (rand() - 0.5) * 1.2, vy: -rand() * 1.2, size: 0.5, life: 20 }));
        break;
      case 'fruitCollect':
        fx.burst(cx, cy, 10, () => { const a = rand() * Math.PI * 2; return { kind: 'spark', color: '#fff3a8', x: cx, y: cy, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2 - 0.4, size: 0.5, life: 20, drag: 0.9 }; });
        fx.text(cx, cy - 6, ev.crias > 1 ? tx('fx.crias', { n: ev.crias }) : tx('fx.cria'), '#ffd0e4', 6);
        break;
      case 'playerHit':
        fx.shake(2.5);
        fx.flash('#ff9ec0', 0.45);
        fx.burst(cx, cy, 12, () => { const a = rand() * Math.PI * 2; return { kind: 'petal', color: PLAYER_COLOR[ev.playerId] || '#ffabc8', x: cx, y: cy, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, spin: (rand() - 0.5) * 0.3, size: 1.2, life: 40, drag: 0.92 }; });
        break;
      case 'criaEscape':
        // La cría que nadie agarró vuelve nadando al fondo.
        fx.burst(cx, cy, 6, () => ({ kind: 'bubble', x: cx + (rand() - 0.5) * 6, y: cy, vx: (rand() - 0.5) * 0.4, vy: -0.5 - rand() * 0.4, size: 0.6 + rand() * 0.5, life: 30 }));
        fx.add({ kind: 'spark', color: '#ffd0e4', x: cx, y: cy, vy: 1.2, size: 0.8, life: 40, drag: 1 });
        break;
      case 'regenerate':
        fx.burst(cx, cy, 16, (i, n) => { const a = (i / n) * Math.PI * 2; return { kind: 'spark', color: PLAYER_COLOR[ev.playerId] || '#ffabc8', x: cx + Math.cos(a) * 12, y: cy + Math.sin(a) * 12, vx: -Math.cos(a) * 0.7, vy: -Math.sin(a) * 0.7, size: 0.7, life: 18, drag: 0.95 }; });
        break;
      case 'levelStart':
        banner = { lines: bannerFor(lastState), t: 0 };
        fx.clear();
        life.clear();
        fx.burst(0, 0, 30, () => ({ kind: 'bubble', x: 10 + rand() * (SCREEN_W - 20), y: SCREEN_H + rand() * 20, vy: -1 - rand() * 1.5, size: 0.6 + rand() * 1.4, life: 150 }));
        break;
      case 'levelClear':
        fx.flash('#b8f5d8', 0.5);
        fx.burst(0, 0, 50, () => ({ kind: 'petal', color: rand() < 0.5 ? '#ff9ec0' : '#ffd0e4', x: rand() * SCREEN_W, y: -rand() * 60, vx: (rand() - 0.5) * 0.4, vy: 0.4 + rand() * 0.5, spin: (rand() - 0.5) * 0.2, size: 1 + rand(), life: 170, drag: 1 }));
        break;
      case 'victory':
        fx.flash('#fff8c0', 0.6);
        break;
      case 'bossIntro':
        fx.shake(2);
        break;
      case 'bossHit': {
        const big = ev.amount > 1;
        fx.shake(big ? 2.2 : 0.7);
        if (big) fx.flash('#fff8c0', 0.3);
        fx.burst(ev.x, HUD_H + ev.y, big ? 24 : 8, () => { const a = rand() * Math.PI * 2; const sp = 0.6 + rand() * (big ? 2.4 : 1.2); return { kind: 'spark', color: rand() < 0.5 ? '#fff8c0' : '#b8f07a', x: ev.x, y: HUD_H + ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 0.6, life: 26, drag: 0.9 }; });
        fx.burst(ev.x, HUD_H + ev.y, big ? 8 : 3, () => ({ kind: 'ink', color: '#1a1622', x: ev.x, y: HUD_H + ev.y, vx: (rand() - 0.5), vy: -0.3 - rand() * 0.4, size: 2 + rand() * 2, life: 40 }));
        if (big) fx.text(ev.x, HUD_H + ev.y - 8, tx('fx.clean'), '#fff3a8', 8);
        break;
      }
      case 'bossPhase':
        fx.shake(3);
        fx.flash('#ffffff', 0.35);
        break;
      case 'bossDefeated':
        fx.shake(4);
        fx.flash('#fff8c0', 0.7);
        fx.burst(ev.x, HUD_H + ev.y, 60, () => { const a = rand() * Math.PI * 2; const sp = 0.8 + rand() * 3; return { kind: 'spark', color: rand() < 0.5 ? '#fff8c0' : '#7ee8c8', x: ev.x, y: HUD_H + ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 0.8, life: 60, drag: 0.94 }; });
        break;
      case 'enemyZap':
        fx.shake(0.8);
        fx.burst(cx, cy, 10, () => { const a = rand() * Math.PI * 2; return { kind: 'spark', color: '#7af0ff', x: cx, y: cy, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, size: 0.5, life: 14 }; });
        break;
      case 'enemySprout':
        fx.burst(cx, cy, 6, () => ({ kind: 'spark', color: '#6aa03a', x: cx, y: cy + 4, vx: (rand() - 0.5), vy: -rand(), size: 0.5, life: 20 }));
        break;
      case 'bossHeal':
        fx.text(ev.x, HUD_H + ev.y - 6, tx('fx.escape'), '#ff9ec0', 7);
        fx.burst(ev.x, HUD_H + ev.y, 12, () => ({ kind: 'ink', color: '#1a1622', x: ev.x, y: HUD_H + ev.y, vx: (rand() - 0.5) * 1.5, vy: -rand(), size: 2 + rand() * 2, life: 40 }));
        break;
      case 'enemySplit':
        fx.burst(cx, cy, 10, () => ({ kind: 'bubble', x: cx, y: cy, vx: (rand() - 0.5) * 2, vy: (rand() - 0.5) * 2, size: 0.8 + rand(), life: 30 }));
        break;
      case 'armorBlock':
      case 'bossBlock':
        fx.burst(ev.x, HUD_H + ev.y, 6, () => ({ kind: 'spark', color: '#d8dde4', x: ev.x, y: HUD_H + ev.y, vx: (rand() - 0.5) * 2, vy: (rand() - 0.5) * 2, size: 0.5, life: 12 }));
        break;
      case 'bossSpawn':
        fx.burst(cx, cy, 8, () => ({ kind: 'ink', color: '#1a1622', x: cx, y: cy, vx: (rand() - 0.5) * 1.2, vy: (rand() - 0.5) * 1.2, size: 2, life: 30 }));
        break;
      default: break;
    }
  }

  function step(state) {
    if (state !== lastState) { lastState = state; fx.clear(); cos.clear(); life.clear(); lastLevel = -1; }
    if (state.levelIndex !== lastLevel) { lastLevel = state.levelIndex; shownClean = cleanliness(state); }
    for (const ev of state.events) onEvent(ev);
    cos.step(state);
    fx.step();
    life.step(SCREEN_W);
    if (banner && ++banner.t > 170) banner = null;

    const target = cleanliness(state);
    shownClean += (target - shownClean) * 0.035;

    // Ambientales: humo de enemigos enojados, brillo de regeneración, burbujas de agua limpia.
    if (state.mode === 'playing') {
      for (const e of state.enemies) {
        if (e.state === 'angry' && rand() < 0.25) {
          const [cx, cy] = center(e, 14, 16);
          fx.add({ kind: 'ink', color: '#1a0a10', x: cx, y: cy, vy: -0.3, vx: (rand() - 0.5) * 0.4, size: 1.5, life: 30 });
        }
      }
      for (const p of state.players) {
        if (p.state === 'dying' && rand() < 0.6) {
          const [cx, cy] = center(p, 14, 16);
          fx.add({ kind: 'spark', color: PLAYER_COLOR[p.id], x: cx + (rand() - 0.5) * 14, y: cy + 6, vy: -0.4 - rand() * 0.4, size: 0.5, life: 30 });
        }
      }
      if (shownClean > 0.5 && rand() < shownClean * 0.08) {
        fx.add({ kind: 'bubble', x: 10 + rand() * (SCREEN_W - 20), y: SCREEN_H - 10, vy: -0.4 - rand() * 0.5, size: 0.4 + rand() * 0.8, life: 200 });
      }
    }
  }

  function vignette() {
    const g = ctx.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.35, SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,8,16,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function draw(state) {
    const t = performance.now() / 1000;
    if (state !== lastState) step(state);
    world.ensure(state, scale);

    if (state.mode === 'victory') {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      drawEnding(ctx, state);
      vignette();
      fx.drawFlash(ctx, SCREEN_W, SCREEN_H);
      return;
    }

    const title = state.mode === 'title';
    const clean = title ? 1 : shownClean;
    const [sx, sy] = fx.offset(t);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.translate(sx, sy);
    world.drawBackground(ctx, state, t, clean);
    world.drawPlants(ctx, t, clean);
    world.drawTerrain(ctx, clean);

    if (!title) {
      life.draw(ctx, t, drawEnemy);
      for (const f of state.fruits) { const [cx, cy] = center(f); drawPickup(ctx, f, cos.of(`f${f.id}`), t, cx, cy + 2); }
      if (state.hazards?.length) drawHazards(ctx, state.hazards, t);
      for (const e of state.enemies) {
        if (e.state === 'trapped') continue;
        const [cx, cy] = center(e, e.w || 14, e.h || 16);
        drawEnemy(ctx, e, cos.of(`e${e.id}`), t, cx, cy);
      }
      if (state.level.boss === 'granMancha') drawPipe(ctx, t, HUD_H);
      if (state.boss) drawBoss(ctx, state.boss, t, HUD_H);
      for (const b of state.bubbles) { const [cx, cy] = center(b); drawBubble(ctx, b, cos.of(`b${b.id}`), t, cx, cy); }
      if (state.bossShots?.length) drawBossShots(ctx, state.bossShots, t, HUD_H);
      for (const p of state.players) {
        if (p.state === 'dead') continue;
        drawHero(ctx, p, cos.of(`p${p.id}`), t, p.x, HUD_H + p.y);
      }
    }
    fx.drawParticles(ctx, t);
    world.drawMotes(ctx, t, clean);
    fx.drawFloaters(ctx);
    ctx.restore();

    vignette();
    if (title) drawTitle(ctx, t, state, meta);
    else drawHud(ctx, state, shownClean);
    if (banner && state.mode === 'playing') drawBanner(ctx, banner.lines, banner.t);

    if (state.mode === 'paused') drawPaused(ctx, meta);
    else if (state.mode === 'levelClear') drawLevelClear(ctx, state);
    else if (state.mode === 'gameOver') drawGameOver(ctx, state, t);

    fx.drawFlash(ctx, SCREEN_W, SCREEN_H);
  }

  /** Dibuja la intro (o su pantalla previa) en lugar del juego. */
  function drawIntro(intro, splash) {
    const t = performance.now() / 1000;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (splash) intro.drawSplash(ctx, t);
    else intro.draw(ctx, t);
    vignette();
  }

  /** Datos fuera del estado del core que el título necesita (zonas desbloqueadas). */
  function setMeta(m) { meta = { ...meta, ...m }; }

  return { draw, step, drawIntro, setMeta, resize: fit };
}
