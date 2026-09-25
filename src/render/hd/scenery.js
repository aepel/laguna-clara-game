// Escenografía compartida por la intro y el cierre: agua, rayos de luz,
// fondo con algas, burbujas, motas, la mancha de petróleo, el caño y el logo.

import { SCREEN_W, SCREEN_H } from '../../core/constants.js';
import { FONT } from './fx.js';
import { mix, mixHex } from './color.js';

const TAU = Math.PI * 2;
const W = SCREEN_W;
const H = SCREEN_H;

export function water(ctx, clean, depth = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#5b5a47', mixHex('#46c3cf', '#2a7fae', depth), clean));
  g.addColorStop(0.55, mix('#3b3d34', depth > 0.5 ? '#123e66' : '#1d86a3', clean));
  g.addColorStop(1, mix('#1c1e1b', depth > 0.5 ? '#050f22' : '#0c3f60', clean));
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, W + 20, H + 20);
}

export function rays(ctx, t, a) {
  if (a <= 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < Math.ceil(W / 64); i++) {
    const bx = 20 + i * 64 + Math.sin(t * 0.3 + i * 1.7) * 12;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(200,245,255,${0.18 * a})`);
    g.addColorStop(1, 'rgba(200,245,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, -4); ctx.lineTo(bx + 18, -4); ctx.lineTo(bx + 64, H); ctx.lineTo(bx + 20, H);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function seabed(ctx, t, clean, y = 196) {
  ctx.fillStyle = mix('#2a2924', '#1e6a5a', clean);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05) * 5 + Math.sin(x * 0.13) * 2);
  ctx.lineTo(W, H);
  ctx.fill();
  // Algas y lirios (se marchitan con la suciedad).
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.ceil(W / 18); i++) {
    const x = 8 + i * 18 + (i % 3) * 4;
    const h = (18 + (i * 37) % 26) * (0.35 + 0.65 * clean);
    const sway = Math.sin(t * 1.3 + i) * 3 * (0.3 + clean);
    const base = y + Math.sin(x * 0.05) * 5;
    ctx.strokeStyle = mix('#5a5440', '#4fd08a', clean);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, base + 2);
    ctx.quadraticCurveTo(x + sway * 0.5, base - h * 0.5, x + sway, base - h);
    ctx.stroke();
    if (i % 4 === 1 && clean > 0.5) {
      ctx.fillStyle = `rgba(255,158,192,${(clean - 0.5) * 2})`;
      ctx.beginPath();
      ctx.arc(x + sway, base - h, 2.2, 0, TAU);
      ctx.fill();
    }
  }
}

export function risingBubbles(ctx, t, n, a = 0.6) {
  ctx.lineWidth = 0.5;
  for (let i = 0; i < n; i++) {
    const sp = 10 + (i * 7) % 14;
    const y = H - ((t * sp + i * 53) % (H + 20));
    const x = (i * 71) % W + Math.sin(t * 2 + i) * 3;
    ctx.strokeStyle = `rgba(230,250,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + (i % 3) * 0.6, 0, TAU);
    ctx.stroke();
  }
}

export function motes(ctx, t, clean) {
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % W + Math.sin(t * 0.6 + i) * 3;
    const y = ((i * 57) % H - t * (2 + (i % 4))) % H;
    ctx.fillStyle = clean > 0.5 ? `rgba(235,252,255,${0.4 * clean})` : `rgba(120,110,80,${0.55 * (1 - clean)})`;
    ctx.beginPath();
    ctx.arc(x, (y + H) % H, 0.6, 0, TAU);
    ctx.fill();
  }
}

export function oilStain(ctx, t, k) {
  // Mancha que baja desde la superficie.
  const g = ctx.createLinearGradient(W * 0.5, 0, W, H);
  g.addColorStop(0, '#120f1a');
  g.addColorStop(0.5, '#2a2040');
  g.addColorStop(0.65, '#3e6f78');
  g.addColorStop(0.8, '#6a4a8a');
  g.addColorStop(1, '#120f1a');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(W * 0.45, 0);
  const bottom = 30 + k * (H - 30);
  for (let y = 0; y <= bottom; y += 10) {
    ctx.lineTo(W * 0.62 - Math.sin(y * 0.05 + t) * 16 - (y / H) * 20, y);
  }
  ctx.lineTo(W + 10, bottom);
  ctx.lineTo(W + 10, 0);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function pipe(ctx, t, x, y) {
  ctx.fillStyle = '#3a3a34';
  ctx.fillRect(x, y - 9, 70, 18);
  ctx.fillStyle = '#4a4a44';
  ctx.fillRect(x, y - 9, 70, 4);
  ctx.fillStyle = '#2a2a26';
  ctx.beginPath();
  ctx.ellipse(x, y, 5, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0c0a10';
  ctx.beginPath();
  ctx.ellipse(x, y, 3.5, 8, 0, 0, TAU);
  ctx.fill();
  // Chorro de mugre.
  for (let i = 0; i < 14; i++) {
    const k = ((t * 0.5 + i / 14) % 1);
    ctx.fillStyle = `rgba(18,15,26,${0.8 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(x - 6 - k * 60, y + Math.sin(k * 6 + i) * 6 - k * 20, 3 + k * 8, 0, TAU);
    ctx.fill();
  }
}

export function title(ctx, str, x, y, size, color) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = 'rgba(6,28,46,0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
