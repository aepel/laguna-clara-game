// HUD: pastillas redondeadas sobre el agua con retrato, puntaje, vidas (brotes)
// y la barra de limpieza del nivel.

import { SCREEN_W } from '../../core/constants.js';
import { FONT } from './fx.js';
import { drawHeroIcon } from './heroes.js';
import { mix } from './color.js';
import { ZONES } from '../../data/zones.js';
import { t as tx, fmt, bossName } from '../../i18n.js';
import { drawCria } from './items.js';

function pill(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4,20,34,0.42)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,240,255,0.14)';
  ctx.lineWidth = 0.4;
  ctx.stroke();
}

function leaf(ctx, x, y, s, on) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = on ? '#7ae6a0' : 'rgba(160,190,200,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.quadraticCurveTo(-3, -1, -1.8, -3);
  ctx.quadraticCurveTo(-0.6, -3.6, 0, -2);
  ctx.quadraticCurveTo(0.6, -3.6, 1.8, -3);
  ctx.quadraticCurveTo(3, -1, 0, 1.5);
  ctx.fill();
  ctx.restore();
}

function playerPill(ctx, p, x, alignRight) {
  const w = 62;
  const px = alignRight ? x - w : x;
  pill(ctx, px, 3, w, 11);
  const iconX = alignRight ? px + w - 6.5 : px + 6.5;
  if (p.state !== 'dead') drawHeroIcon(ctx, p.id, iconX, 8.6, 8);
  ctx.font = `700 6.2px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.fillStyle = p.state === 'dead' ? 'rgba(234,246,255,0.5)' : '#eaf6ff';
  const textX = alignRight ? px + w - 13 : px + 13;
  ctx.fillText(p.state === 'dead' ? tx('hud.join', { id: p.id }) : fmt(p.score), textX, 8.8);
  for (let i = 0; i < Math.min(p.lives, 5); i++) {
    const lx = alignRight ? px + 5 + i * 5 : px + w - 5 - i * 5;
    leaf(ctx, lx, 9.2, 0.9, true);
  }
}

export function drawHud(ctx, state, clean) {
  const p1 = state.players.find((p) => p.id === 1);
  const p2 = state.players.find((p) => p.id === 2);
  if (p1) playerPill(ctx, p1, 4, false);
  if (p2) playerPill(ctx, p2, SCREEN_W - 4, true);

  rescuedPill(ctx, state);
  if (state.level.boss) { bossBar(ctx, state); return; }

  // Centro: nivel + barra de limpieza.
  const w = 76;
  const x = (SCREEN_W - w) / 2;
  pill(ctx, x, 3, w, 11);
  ctx.font = `700 5.4px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(tx('hud.level', { n: state.levelIndex + 1 }), x + 5, 8.8);
  const bx = x + 30; const bw = w - 35;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(bx, 6.8, bw, 4, 2);
  ctx.fill();
  if (clean > 0.01) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#46c3cf');
    g.addColorStop(1, '#7ae6a0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(bx, 6.8, Math.max(4, bw * clean), 4, 2);
    ctx.fill();
  }
  ctx.fillStyle = mix('#c8ccb8', '#ffffff', clean);
  ctx.font = `700 3.6px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(clean * 100)}%`, bx + bw / 2, 8.9);
}

/** Nivel de jefe: nombre y vida (la limpieza que falta). */
function bossBar(ctx, state) {
  const b = state.boss;
  const name = ZONES[state.level.zone] ? bossName(state.level.zone) : tx('hud.boss');
  ctx.font = `800 5.2px ${FONT}`;
  const nameW = ctx.measureText(name).width;
  const barW = 50;
  const w = nameW + barW + 14;
  const x = (SCREEN_W - w) / 2;
  pill(ctx, x, 3, w, 11);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff9ec0';
  ctx.fillText(name, x + 5, 8.8);
  const bx = x + nameW + 9; const bw = barW;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(bx, 6.8, bw, 4, 2);
  ctx.fill();
  const life = b ? b.hp / b.maxHp : 0;
  if (life > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#2a2040');
    g.addColorStop(1, '#6a4a8a');
    ctx.fillStyle = b.hurt > 0 ? '#ffffff' : g;
    ctx.beginPath();
    ctx.roundRect(bx, 6.8, Math.max(4, bw * life), 4, 2);
    ctx.fill();
  }
}

/** Contador de crías rescatadas, debajo del centro. */
function rescuedPill(ctx, state) {
  const n = state.rescued || 0;
  const label = `${n}`;
  ctx.font = `700 5px ${FONT}`;
  const w = ctx.measureText(label).width + 16;
  const x = (SCREEN_W - w) / 2;
  pill(ctx, x, 16, w, 9);
  ctx.save();
  ctx.translate(x + 6, 20.8);
  ctx.scale(0.7, 0.7);
  drawCria(ctx, 'cria', 0);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd0e4';
  ctx.fillText(label, x + 11, 20.8);
}
