// Cierre de Laguna Clara: se dibuja en modo 'victory' en función del tiempo
// (state.modeTimer). La colonia rescatada (state.rescued) acompaña a Nilo y
// Lirio en la última escena: cuantas más crías, más grande el cardumen.

import { SCREEN_W, SCREEN_H } from '../../core/constants.js';
import { FONT } from './fx.js';
import { t as tx, fmt, zoneName } from '../../i18n.js';
import { smoothstep, mix } from './color.js';
import { water, rays, seabed, risingBubbles, motes, pipe, title } from './scenery.js';
import { drawHero } from './heroes.js';
import { drawBubble, drawCria } from './items.js';
import { ZONES } from '../../data/zones.js';

const TAU = Math.PI * 2;
const W = SCREEN_W;
const H = SCREEN_H;
// Las escenas se compusieron para 256 px: lo central se corre OX al centro.
const OX = (W - 256) / 2;

// [inicio en s, clave del texto (i18n)]
const PANELS = [
  [0, 'end.1'],
  [6, 'end.2'],
  [12, 'end.3'],
  [21, 'end.4'],
  [31, null], // créditos
];

const hero = (id, facing, extra = {}) => ({ id, facing, onGround: true, anim: 'idle', state: 'alive', invuln: 0, vy: 0, ...extra });
const cos = (face, extra = {}) => ({ face, s: 0, blinkT: 0, shoot: 0, phase: face > 0 ? 0 : 1.3, ...extra });

function panelAt(time) {
  let i = 0;
  while (i + 1 < PANELS.length && time >= PANELS[i + 1][0]) i++;
  const start = PANELS[i][0];
  const end = i + 1 < PANELS.length ? PANELS[i + 1][0] : Infinity;
  return { i, local: time - start, dur: end - start };
}

function sparklesAndSeeds(ctx, t) {
  water(ctx, 0.5, 1);
  seabed(ctx, t, 0.5);
  pipe(ctx, t * 0.2, W - 56, 184);
  const glow = ctx.createRadialGradient(OX + 120, 150, 2, OX + 120, 150, 80 + t * 16);
  glow.addColorStop(0, 'rgba(255,248,192,0.6)');
  glow.addColorStop(1, 'rgba(184,240,122,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU;
    const r = t * (18 + (i % 5) * 6);
    ctx.fillStyle = `rgba(255,248,192,${Math.max(0, 1 - t / 5)})`;
    ctx.beginPath();
    ctx.arc(OX + 120 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.6, 1.3, 0, TAU);
    ctx.fill();
  }
  // Crías que quedaron libres, cayendo suave.
  for (let i = 0; i < 14; i++) {
    ctx.save();
    ctx.translate(30 + i * (W - 60) / 13, 40 + ((t * 14 + i * 23) % 150));
    drawCria(ctx, i % 5 === 4 ? 'criaDorada' : 'cria', t + i);
    ctx.restore();
  }
}

function giantBubble(ctx, t, dur) {
  water(ctx, 0.55, 1);
  seabed(ctx, t, 0.55);
  pipe(ctx, t * 0.2, W - 66, 170);
  const k = smoothstep(0.8, dur - 1.5, t);
  drawHero(ctx, hero(1, 1), cos(1, { shoot: 1, s: -0.1 }), t, OX + 70, 150);
  drawHero(ctx, hero(2, 1), cos(1, { shoot: 1, s: -0.1 }), t, OX + 96, 156);
  const bx = OX + 120 + k * 70; const by = 164 + Math.sin(t * 2) * 2;
  ctx.save();
  ctx.translate(bx, by);
  const sc = 1 + k * 2.8;
  ctx.scale(sc, sc);
  drawBubble(ctx, { phase: 'float', ownerId: 1 }, { s: 0, phase: 0 }, t, 0, 0);
  ctx.restore();
  if (k >= 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (t - dur + 1.5))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function rise(ctx, t, dur) {
  // La cámara sube del fondo a la superficie: el agua se aclara y cada zona florece.
  const k = smoothstep(0, dur, t);
  water(ctx, 0.6 + k * 0.4, 1 - k);
  rays(ctx, t, k);
  const n = ZONES.length;
  const zone = Math.min(n - 1, Math.floor((1 - k) * n));
  ctx.save();
  ctx.translate(0, (k * n * 40) % 40);
  for (let row = -1; row < 7; row++) {
    const y = row * 40;
    ctx.strokeStyle = mix('#2f8a5a', '#5fd68a', k);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < Math.ceil(W / 44); i++) {
      const x = 20 + i * 44 + (row % 2) * 20;
      const sway = Math.sin(t * 1.4 + i + row) * 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 40);
      ctx.quadraticCurveTo(x + sway, y + 25, x + sway * 1.5, y + 12);
      ctx.stroke();
      ctx.fillStyle = '#ff9ec0';
      ctx.beginPath();
      ctx.arc(x + sway * 1.5, y + 12, 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  risingBubbles(ctx, t, 24, 0.7);
  drawHero(ctx, hero(1, 1, { onGround: false, vy: -1 }), cos(1), t, OX + 100, 120 + Math.sin(t * 2) * 4);
  drawHero(ctx, hero(2, 1, { onGround: false, vy: -1 }), cos(1), t, OX + 130, 128 + Math.cos(t * 2) * 4);
  ctx.font = `700 7px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234,246,255,0.8)';
  ctx.fillText(zoneName(zone), W / 2, 40);
}

function surface(ctx, t, rescued) {
  water(ctx, 1, 0);
  rays(ctx, t, 1);
  ctx.fillStyle = 'rgba(200,245,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 44 + Math.sin(x * 0.06 + t * 1.5) * 3);
  ctx.lineTo(W, 0);
  ctx.fill();
  seabed(ctx, t, 1);
  // La colonia rescatada nada alrededor.
  const n = Math.min(rescued, 60);
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * TAU + t * 0.4;
    const r = 30 + (i % 6) * 12;
    ctx.save();
    ctx.translate(W / 2 + Math.cos(a) * r * 1.6, 110 + Math.sin(a) * r * 0.7);
    const kind = i % 17 === 16 ? 'criaArcoiris' : i % 7 === 6 ? 'criaDorada' : 'cria';
    drawCria(ctx, kind, t + i);
    ctx.restore();
  }
  drawHero(ctx, hero(1, 1), cos(1), t, OX + 104, 50 + Math.sin(t * 2) * 2);
  drawHero(ctx, hero(2, -1), cos(-1), t, OX + 138, 52 + Math.cos(t * 2) * 2);
  ctx.font = `700 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd0e4';
  ctx.fillText(rescued > 0 ? tx('end.rescued', { n: rescued }) : tx('end.shine'), W / 2, 186);
}

function credits(ctx, t, state) {
  water(ctx, 1, 0.2);
  rays(ctx, t, 0.8);
  motes(ctx, t, 1);
  title(ctx, 'Laguna', W / 2, 44, 28, '#ff9ec0');
  title(ctx, 'Clara', W / 2, 70, 28, '#7ee8c8');
  const score = state.players.reduce((a, p) => a + p.score, 0);
  ctx.font = `700 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(tx('end.score', { score: fmt(score), n: state.rescued || 0 }), W / 2, 100);
  ctx.font = `italic 600 6px ${FONT}`;
  ctx.fillStyle = 'rgba(126,232,200,0.9)';
  const lines = [
    tx('end.fact1'),
    tx('end.fact2'),
    tx('end.fact3'),
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 130 + i * 10));
  ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
  ctx.font = `700 7px ${FONT}`;
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(tx('end.again'), W / 2, 190);
  ctx.globalAlpha = 1;
}

/** Dibuja el cierre para el estado en modo 'victory'. */
export function drawEnding(ctx, state) {
  const time = state.modeTimer / 60;
  const { i, local, dur } = panelAt(time);
  const t = local;
  if (i === 0) sparklesAndSeeds(ctx, t);
  else if (i === 1) giantBubble(ctx, t, dur);
  else if (i === 2) rise(ctx, t, dur);
  else if (i === 3) surface(ctx, t, state.rescued || 0);
  else credits(ctx, t, state);

  const text = PANELS[i][1];
  if (text) {
    ctx.fillStyle = '#02080f';
    ctx.fillRect(0, H - 30, W, 30);
    const a = smoothstep(0.5, 1.2, local) * (dur === Infinity ? 1 : 1 - smoothstep(dur - 0.8, dur - 0.2, local));
    ctx.globalAlpha = a;
    ctx.font = `italic 600 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7ee8c8';
    ctx.fillText(`“${tx(text)}”`, W / 2, H - 16);
    ctx.globalAlpha = 1;
  }
  // Fundido entre viñetas.
  const fade = Math.max(1 - smoothstep(0, 0.6, local), dur === Infinity ? 0 : smoothstep(dur - 0.6, dur, local));
  if (fade > 0) {
    ctx.fillStyle = `rgba(2,8,15,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}
