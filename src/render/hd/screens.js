// Pantallas: título, pausa, nivel limpio (con mapa de la laguna), fin y victoria.

import { SCREEN_W, SCREEN_H, LEVEL_CLEAR_DELAY } from '../../core/constants.js';
import { FONT } from './fx.js';
import { drawHero } from './heroes.js';
import { mixHex, smoothstep } from './color.js';
import { ZONES, LEVELS_PER_ZONE } from '../../data/zones.js';
import { t as tx, zoneName } from '../../i18n.js';

function shadowText(ctx, str, x, y, size, color, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = 'rgba(6,28,46,0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function dim(ctx, a) {
  ctx.fillStyle = `rgba(4,16,28,${a})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

const demoHero = (id, facing) => ({ id, facing, onGround: true, anim: 'idle', state: 'alive', invuln: 0, vy: 0 });

export function drawTitle(ctx, t, state, meta = {}) {
  dim(ctx, 0.25);
  // Logo con burbujas que suben.
  for (let i = 0; i < 9; i++) {
    const y = SCREEN_H - ((t * (12 + i * 3) + i * 40) % (SCREEN_H + 20));
    const x = 40 + i * 22 + Math.sin(t + i) * 4;
    ctx.strokeStyle = 'rgba(230,250,255,0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  const float = Math.sin(t * 1.5) * 2;
  shadowText(ctx, 'Laguna', SCREEN_W / 2, 62 + float, 30, '#ff9ec0', 900);
  shadowText(ctx, 'Clara', SCREEN_W / 2, 90 + float, 30, '#7ee8c8', 900);

  drawHero(ctx, demoHero(1, 1), { face: 1, s: Math.sin(t * 2) * 0.04, blinkT: (t % 3) < 0.12 ? 1 : 0, phase: 0 }, t, SCREEN_W / 2 - 72, 104);
  drawHero(ctx, demoHero(2, -1), { face: -1, s: Math.cos(t * 2) * 0.04, blinkT: (t % 4) < 0.12 ? 1 : 0, phase: 1 }, t, SCREEN_W / 2 + 72, 104);

  const blinkA = 0.6 + Math.sin(t * 4) * 0.4;
  ctx.globalAlpha = blinkA;
  shadowText(ctx, tx('title.start1'), SCREEN_W / 2, 162, 8, '#eaf6ff', 700);
  shadowText(ctx, tx('title.start2'), SCREEN_W / 2, 174, 8, '#eaf6ff', 700);
  ctx.globalAlpha = 1;
  shadowText(ctx, tx('title.controls'), SCREEN_W / 2, 200, 5, 'rgba(234,246,255,0.7)', 600);
  shadowText(ctx, tx('title.story'), SCREEN_W / 2, 210, 5, 'rgba(126,232,200,0.8)', 600);
  shadowText(ctx, soundLine(meta), SCREEN_W / 2, 218, 5, 'rgba(234,246,255,0.6)', 600);

  // Selector de zona: solo si ya hay zonas desbloqueadas además de la primera.
  const zone = Math.floor((state?.levelIndex || 0) / LEVELS_PER_ZONE);
  if ((meta.unlockedZone || 0) > 0) {
    const left = zone > 0 ? '◀  ' : '    ';
    const right = zone < meta.unlockedZone ? '  ▶' : '    ';
    shadowText(ctx, `${left}${tx('title.zone', { n: zone + 1, name: zoneName(zone) })}${right}`, SCREEN_W / 2, 146, 7, '#ffd0e4', 700);
  }
}

/** Estado de música y efectos, con las teclas para cambiarlos. */
function soundLine(meta) {
  const on = (b) => tx(b === false ? 'sound.off' : 'sound.on');
  return tx('sound.line', { music: on(meta.musicOn), sfx: on(meta.sfxOn) });
}

export function drawPaused(ctx, meta = {}) {
  dim(ctx, 0.5);
  shadowText(ctx, tx('pause.title'), SCREEN_W / 2, SCREEN_H / 2 - 4, 20, '#eaf6ff');
  shadowText(ctx, tx('pause.resume'), SCREEN_W / 2, SCREEN_H / 2 + 14, 6, 'rgba(234,246,255,0.75)', 600);
  shadowText(ctx, soundLine(meta), SCREEN_W / 2, SCREEN_H / 2 + 24, 6, 'rgba(234,246,255,0.75)', 600);
}

/** Corte de la laguna: una franja por zona; la actual se llena nivel a nivel. */
function lagoonMap(ctx, state, k) {
  const n = ZONES.length;
  const zone = Math.floor(state.levelIndex / LEVELS_PER_ZONE);
  const within = state.levelIndex % LEVELS_PER_ZONE;
  const x = SCREEN_W / 2 - 50; const y = 116; const w = 100; const h = 80;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const by = y + (i / n) * h;
    const depth = i / (n - 1);
    ctx.fillStyle = '#3a3a34';
    ctx.fillRect(x, by, w, h / n + 0.5);
    let fill = i < zone ? 1 : 0;
    if (i === zone) fill = (within + smoothstep(0.25, 0.7, k)) / LEVELS_PER_ZONE;
    if (fill > 0) {
      ctx.fillStyle = mixHex('#46c3cf', '#154f80', depth);
      ctx.fillRect(x, by, w * fill, h / n + 0.5);
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(234,246,255,0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
  const my = y + ((zone + 0.5) / n) * h;
  ctx.fillStyle = '#ff9ec0';
  ctx.beginPath();
  ctx.arc(x + w + 6, my, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 5px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(`${zoneName(zone)} · ${within + 1}/${LEVELS_PER_ZONE}`, x + w + 11, my);
}

/** Cartel de inicio de nivel (zona nueva, desafío, jefe…), aparece y se va. */
export function drawBanner(ctx, lines, frame) {
  const a = smoothstep(0, 15, frame) * (1 - smoothstep(130, 170, frame));
  if (a <= 0) return;
  ctx.globalAlpha = a;
  let y = 78 - (lines.length - 1) * 8;
  for (const l of lines) {
    shadowText(ctx, l.text, SCREEN_W / 2, y, l.size, l.color);
    y += l.size + 4;
  }
  ctx.globalAlpha = 1;
}

export function drawLevelClear(ctx, state) {
  const k = Math.min(1, state.modeTimer / LEVEL_CLEAR_DELAY);
  dim(ctx, 0.35 * smoothstep(0.1, 0.3, k));
  const pop = 1 + Math.max(0, 0.3 - k) * 1.5;
  shadowText(ctx, tx('clear.title'), SCREEN_W / 2, 84, 20 * pop, '#7ee8c8');
  if (k > 0.2) {
    lagoonMap(ctx, state, k);
    shadowText(ctx, tx('clear.rescued', { n: state.rescued || 0 }), SCREEN_W / 2, 104, 7, '#ffd0e4', 700);
  }
}

export function drawGameOver(ctx, state, t) {
  const k = Math.min(1, state.modeTimer / 60);
  dim(ctx, 0.6 * k);
  shadowText(ctx, tx('gameover.title'), SCREEN_W / 2, SCREEN_H / 2 - 8, 16, '#ff9ec0');
  if (state.modeTimer > 60) {
    ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    shadowText(ctx, tx('gameover.retry'), SCREEN_W / 2, SCREEN_H / 2 + 12, 7, '#eaf6ff', 700);
    ctx.globalAlpha = 1;
  }
}
