// Burbujas iridiscentes y recompensas (semillas, perlas, lirios).
// Las frutas del core se reinterpretan por tipo:
//   Laguna Clara: lo que cae de un animal liberado es una cría de ajolote
//   (cria · crias2 · huevo con trillizos · criaDorada · criaArcoiris).

import { drawEnemy } from './enemies.js';

const TAU = Math.PI * 2;
const RIM = { 1: '255,190,220', 2: '170,255,225' };

// Radio visual por dueño (el hitbox del core es 16x16): Nilo atrapa con más
// margen (HERO_PROFILES.trapPad), así que su burbuja se ve más grande.
const BUBBLE_R = { 1: 9.5, 2: 7.5 };

export function drawBubble(ctx, b, c, t, cx, cy) {
  const sq = c ? c.s : 0;
  const tt = t + (c?.phase || 0);
  const r = BUBBLE_R[b.ownerId] || 8;

  if (b.phase === 'pop') {
    const k = Math.min(1, (c?.age || 0) / 8);
    ctx.strokeStyle = `rgba(235,252,255,${1 - k})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1 + k * 0.6), 0, TAU);
    ctx.stroke();
    return;
  }

  // Aviso de escape: tiembla y se oscurece cuando le queda poco.
  let warn = 0;
  if (b.trapped) warn = Math.max(0, 1 - b.trapped.timer / 150);
  const jitter = warn > 0 ? Math.sin(tt * 50) * warn * 0.8 : 0;
  const wob = Math.sin(tt * 3.2) * 0.04;

  ctx.save();
  ctx.translate(cx + jitter, cy);
  ctx.scale(1 - sq * 0.5 + wob, 1 + sq - wob);

  if (b.trapped) {
    drawEnemy(ctx, { type: b.trapped.enemyType, state: warn > 0.6 ? 'angry' : 'trapped', facing: 1 },
      c, t, 0, 0.5, { scale: r * 0.078, struggle: true }); // entra entero en la burbuja
  }

  // Película de jabón: centro casi transparente, borde con tornasol.
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.35, 'rgba(214,247,255,0.08)');
  g.addColorStop(0.82, b.trapped && warn > 0 ? `rgba(120,60,60,${0.25 + warn * 0.3})` : 'rgba(154,230,255,0.22)');
  g.addColorStop(1, `rgba(${RIM[b.ownerId] || RIM[1]},0.7)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // Tornasol que gira por el borde.
  const hue = (tt * 60) % 360;
  ctx.strokeStyle = `hsla(${hue},90%,78%,0.55)`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.4, tt, tt + 1.6);
  ctx.stroke();
  ctx.strokeStyle = `hsla(${(hue + 150) % 360},90%,80%,0.45)`;
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.4, tt + 3, tt + 4.2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(235,252,255,0.8)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  // Reflejos.
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(r * 0.45, r * 0.45, 0.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function glowAt(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0.5, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Cría de ajolote, unos 9 px de ancho, centrada en (0,0). */
function baby(ctx, t, body, gill, phase = 0) {
  const wig = Math.sin(t * 6 + phase) * 0.12;
  ctx.save();
  ctx.rotate(wig);
  ctx.fillStyle = gill;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 2.6, -1.2);
    ctx.quadraticCurveTo(s * 5.2, -3.6 + Math.sin(t * 5 + phase) * 0.4, s * 5.6, -1.6);
    ctx.quadraticCurveTo(s * 4.4, -0.6, s * 2.8, 0);
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 1.8, 2.8, 2, 0, 0, TAU); // cuerpito
  ctx.ellipse(0, -0.4, 3.4, 2.7, 0, 0, TAU); // cabeza
  ctx.fill();
  ctx.fillStyle = '#2a0f24';
  ctx.beginPath();
  ctx.arc(-1.3, -0.6, 0.55, 0, TAU);
  ctx.arc(1.3, -0.6, 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-1, -2, 1.2, 0.5, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function egg(ctx, t) {
  const g = ctx.createRadialGradient(-1.5, -2, 0.5, 0, 0, 7);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,220,235,0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 6.6, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.scale(0.5, 0.5);
  baby(ctx, t, '#ffc6da', '#ff8ab4', 0);
  ctx.translate(-5, 5); baby(ctx, t, '#ffc6da', '#ff8ab4', 2);
  ctx.translate(10, 0); baby(ctx, t, '#b8f5dd', '#4fbf9c', 4);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 6.6, 0, 0, TAU);
  ctx.stroke();
}

const GLOW = { cria: '255,190,215', crias2: '255,190,215', huevo: '255,230,240', criaDorada: '255,215,120', criaArcoiris: '255,255,220' };

/** Dibuja una cría (o varias) según su tipo. */
export function drawCria(ctx, kind, t) {
  switch (kind) {
    case 'crias2':
      ctx.save(); ctx.translate(-3, 0.5); baby(ctx, t, '#ffc6da', '#ff8ab4', 0); ctx.restore();
      ctx.save(); ctx.translate(3.2, -0.5); baby(ctx, t, '#b8f5dd', '#4fbf9c', 2); ctx.restore();
      break;
    case 'huevo': egg(ctx, t); break;
    case 'criaDorada': baby(ctx, t, '#ffe08a', '#f0b030', 0); break;
    case 'criaArcoiris': {
      const h = (t * 120) % 360;
      baby(ctx, t, `hsl(${h},85%,82%)`, `hsl(${(h + 120) % 360},85%,65%)`, 0);
      break;
    }
    default: baby(ctx, t, '#ffc6da', '#ff8ab4', 0);
  }
}

export function drawPickup(ctx, f, c, t, cx, cy) {
  const tt = t + (c?.phase || 0);
  // Parpadea cuando está por irse nadando.
  if (f.ttl < 90 && Math.floor(tt * 12) % 2 === 0) return;
  const bob = f.onGround ? Math.sin(tt * 3) * 0.6 : 0;
  ctx.save();
  ctx.translate(cx, cy + bob);
  glowAt(ctx, 0, 0, 9, GLOW[f.kind] || GLOW.cria, 0.45 + Math.sin(tt * 4) * 0.1);
  ctx.scale(1.15, 1.15);
  drawCria(ctx, f.kind, tt);
  ctx.restore();
}
