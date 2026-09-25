// Enemigos = animales de la laguna tomados por la contaminación. Los tipos del
// core se mantienen y solo cambia su aspecto:
//   zen → Crudo (pez con petróleo)      mighta → Latita (cangrejo metido en una lata)
//   monsta → Bolsamedusa (bolsa plástica) pulpul → Microplásticos (enjambre)
// Al liberarlos, el animal original lo dibuja animals.js y acá cae la cría.

import { HUD_H } from '../../core/constants.js';
import { drawCria } from './items.js';

// Qué cría cae según el combo (mismo orden que la tabla del core).
const CRIA_BY_COMBO = ['cria', 'crias2', 'huevo', 'criaDorada', 'criaArcoiris'];

const TAU = Math.PI * 2;

function oilGradient(ctx, r) {
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#120f1a');
  g.addColorStop(0.45, '#2a2040');
  g.addColorStop(0.6, '#3e6f78');
  g.addColorStop(0.72, '#6a4a8a');
  g.addColorStop(1, '#120f1a');
  return g;
}

function angryEyes(ctx, x, y, r, angry, blink) {
  ctx.fillStyle = angry ? '#ff3a2a' : '#ff6a4a';
  ctx.beginPath();
  if (blink) ctx.ellipse(x, y, r, r * 0.25, 0, 0, TAU);
  else ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  if (!blink) {
    ctx.fillStyle = '#1a0606';
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y, r * 0.45, 0, TAU);
    ctx.fill();
  }
}

function crudo(ctx, t, angry, blink) {
  const wag = Math.sin(t * (angry ? 18 : 9)) * 1.2;
  ctx.fillStyle = oilGradient(ctx, 8);
  ctx.beginPath(); // cola
  ctx.moveTo(-5, 0);
  ctx.lineTo(-10.5, -4.5 + wag);
  ctx.lineTo(-10.5, 4.5 + wag);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // cuerpo
  ctx.ellipse(0, 0, 7, 5.4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1424';
  ctx.beginPath(); // aleta dorsal
  ctx.moveTo(-2, -5);
  ctx.quadraticCurveTo(1, -8.5, 3.5, -4.6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,220,230,0.35)'; // brillo iridiscente
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(-0.5, -1, 5, 3.4, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  angryEyes(ctx, 3.2, -1.2, 1.9, angry, blink);
  ctx.strokeStyle = angry ? '#ff3a2a' : '#c2503a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(4.2, 3.4, 1.4, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  const d = (t * 2) % 1; // goteo de petróleo
  ctx.save();
  ctx.globalAlpha *= 1 - d;
  ctx.fillStyle = '#120f1a';
  ctx.beginPath();
  ctx.ellipse(-1, 5.5 + d * 3, 0.6, 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function latita(ctx, t, angry, blink) {
  const snap = Math.sin(t * (angry ? 14 : 5));
  // Patas.
  ctx.strokeStyle = angry ? '#c0402a' : '#9a5a44';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const lx = s * (2 + i * 1.6);
    ctx.beginPath();
    ctx.moveTo(lx, 4);
    ctx.lineTo(lx + s * 1.6, 7 + Math.sin(t * 12 + i) * 0.5);
    ctx.stroke();
  }
  // Pinzas.
  ctx.fillStyle = angry ? '#ff5a3a' : '#c8674a';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 7, -1);
    ctx.rotate(s * (0.3 + snap * 0.15));
    ctx.beginPath();
    ctx.ellipse(s * 1.5, 0, 2.6, 1.9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(s * 1.5, 0);
    ctx.lineTo(s * 4.2, -0.6 - snap * 0.6);
    ctx.lineTo(s * 4.2, 0.6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = angry ? '#ff5a3a' : '#c8674a';
  }
  // Lata.
  const g = ctx.createLinearGradient(-5, 0, 5, 0);
  g.addColorStop(0, '#6a707a');
  g.addColorStop(0.35, '#d8dde4');
  g.addColorStop(0.55, '#9aa2ae');
  g.addColorStop(1, '#4a505a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-5, -4.5, 10, 9.5, 1.6);
  ctx.fill();
  ctx.fillStyle = '#a8483a'; // etiqueta desteñida
  ctx.fillRect(-5, -1, 10, 3);
  ctx.fillStyle = 'rgba(80,60,40,0.5)'; // óxido
  ctx.beginPath();
  ctx.ellipse(2.5, 3.2, 1.6, 0.9, 0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c8ced6'; // anilla
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(1.5, -5.3, 1.5, 0.7, 0, 0, TAU);
  ctx.stroke();
  // Ojos sobre pedúnculos.
  ctx.strokeStyle = '#9a5a44';
  ctx.lineWidth = 0.7;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 2, -4.5);
    ctx.lineTo(s * 2.6, -8);
    ctx.stroke();
    angryEyes(ctx, s * 2.6, -8.4, 1.3, angry, blink);
  }
}

function bolsa(ctx, t, angry, blink) {
  const pulse = Math.sin(t * (angry ? 8 : 3));
  ctx.save();
  ctx.scale(1 + pulse * 0.06, 1 - pulse * 0.06);
  const g = ctx.createLinearGradient(0, -8, 0, 2);
  g.addColorStop(0, angry ? 'rgba(255,220,220,0.92)' : 'rgba(242,244,247,0.9)');
  g.addColorStop(1, 'rgba(185,194,207,0.55)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6.5, 0);
  ctx.quadraticCurveTo(-6.5, -8, 0, -8);
  ctx.quadraticCurveTo(6.5, -8, 6.5, 0);
  for (let i = 5; i >= -5; i -= 2.6) ctx.quadraticCurveTo(i + 0.4, 2, i - 1.3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 0.4;
  ctx.stroke();
  // Asas.
  ctx.strokeStyle = 'rgba(223,228,234,0.9)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-3.5, -7.4); ctx.quadraticCurveTo(-5, -11, -2, -10.4);
  ctx.moveTo(3.5, -7.4); ctx.quadraticCurveTo(5, -11, 2, -10.4);
  ctx.stroke();
  ctx.restore();
  // Tentáculos (tiras de plástico).
  ctx.strokeStyle = 'rgba(200,208,218,0.85)';
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x0 = -4.2 + i * 2.8;
    const w = Math.sin(t * 4 + i) * 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, 0.5);
    ctx.quadraticCurveTo(x0 + w, 4, x0 - w * 0.6, 8);
    ctx.stroke();
  }
  ctx.fillStyle = angry ? '#b01a1a' : '#3a4a5a';
  for (const ex of [-2.2, 2.2]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, -3.5, 1.2, 0.3, 0, 0, TAU);
    else ctx.arc(ex, -3.5, 1.1, 0, TAU);
    ctx.fill();
  }
}

const MICRO_COLORS = ['#ff5ab4', '#5ad0ff', '#ffd24a', '#7ae87a', '#ff8a4a', '#b07aff'];

function micro(ctx, t, angry, blink) {
  const speed = angry ? 5 : 2.2;
  for (let i = 0; i < 6; i++) {
    const a = t * speed + (i / 6) * TAU;
    const r = 5.2 + Math.sin(t * 3 + i) * 1.2;
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r * 0.8);
    ctx.rotate(a * 1.5);
    ctx.fillStyle = MICRO_COLORS[i];
    ctx.beginPath();
    ctx.roundRect(-1.6, -1.3, 3.2, 2.6, 0.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = angry ? '#ffd0d0' : '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = angry ? '#d01a1a' : '#1a1a2a';
  ctx.beginPath();
  if (blink) ctx.ellipse(0, 0, 1.6, 0.4, 0, 0, TAU);
  else ctx.arc(0.5, 0, 1.4, 0, TAU);
  ctx.fill();
}

function colilla(ctx, t, angry, blink) {
  // Gusano-filtro de cigarrillo que avanza ondulando.
  const wig = Math.sin(t * (angry ? 14 : 7));
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(-4, -2 + wig * 2, 0, 2);
  ctx.quadraticCurveTo(3, 5 - wig * 2, 5, 2);
  ctx.stroke();
  ctx.strokeStyle = angry ? '#ff7a3a' : '#e0a060'; // filtro
  ctx.beginPath();
  ctx.moveTo(5, 2);
  ctx.lineTo(8, 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,70,60,0.8)'; // punta quemada
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-9, 2.5);
  ctx.lineTo(-8, 2);
  ctx.stroke();
  angryEyes(ctx, 7, -0.5, 1.1, angry, blink);
  // Humito.
  ctx.fillStyle = 'rgba(160,160,150,0.35)';
  const k = (t * 1.5) % 1;
  ctx.beginPath();
  ctx.arc(-10 - k * 2, -1 - k * 6, 1 + k * 2, 0, TAU);
  ctx.fill();
}

function espuma(ctx, t, angry, blink) {
  const p = Math.sin(t * (angry ? 9 : 4)) * 0.6;
  ctx.fillStyle = angry ? 'rgba(255,225,225,0.92)' : 'rgba(242,244,247,0.9)';
  for (const [x, y, r] of [[-3, 1, 4.5], [3, -1, 5.2], [5, 3.5, 3], [-5.5, -2.5, 3]]) {
    ctx.beginPath();
    ctx.arc(x, y + p, r, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(180,190,200,0.6)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(3, -1 + p, 5.2, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.fillStyle = angry ? '#b01a1a' : '#3a4a5a';
  for (const ex of [-1, 3.5]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, -1 + p, 1.1, 0.3, 0, 0, TAU);
    else ctx.arc(ex, -1 + p, 1, 0, TAU);
    ctx.fill();
  }
}

function gomon(ctx, t, angry, blink) {
  // Neumático-caracol: la cubierta gira y el caracol asoma adelante.
  const roll = t * (angry ? 9 : 5);
  ctx.fillStyle = '#9a8060';
  ctx.beginPath();
  ctx.ellipse(6, 4.5, 4, 2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#9a8060';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(8, 3); ctx.lineTo(9.5, -0.5);
  ctx.stroke();
  angryEyes(ctx, 9.6, -1, 1, angry, blink);
  ctx.fillStyle = '#1c1c20';
  ctx.beginPath();
  ctx.arc(-1, 0, 7, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3a3a42';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2, 1.6]);
  ctx.lineDashOffset = -roll * 3;
  ctx.beginPath();
  ctx.arc(-1, 0, 6.2, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = angry ? '#5a2020' : '#2a4a5a';
  ctx.beginPath();
  ctx.arc(-1, 0, 2.8, 0, TAU);
  ctx.fill();
}

function verdin(ctx, t, angry, blink) {
  const sway = Math.sin(t * 2) * 0.8;
  ctx.fillStyle = angry ? '#6aa03a' : '#3fa05a';
  ctx.beginPath();
  ctx.moveTo(-7, 7);
  ctx.quadraticCurveTo(-8 + sway, -5, -3 + sway, -8);
  ctx.quadraticCurveTo(-4, -2, -1, 0);
  ctx.quadraticCurveTo(0 + sway, -9, 4 + sway, -9);
  ctx.quadraticCurveTo(2, -2, 3, 0);
  ctx.quadraticCurveTo(7 + sway, -6, 9 + sway, -4);
  ctx.quadraticCurveTo(6, 2, 7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,255,120,0.25)';
  ctx.beginPath();
  ctx.ellipse(-1, -3, 2, 4, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = angry ? '#ffd040' : '#d0ff60';
  for (const ex of [-2, 2.6]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, 2, 1.4, 0.3, 0, 0, TAU);
    else ctx.arc(ex, 2, 1.4, 0, TAU);
    ctx.fill();
  }
  if (!blink) {
    ctx.fillStyle = '#0a1a0a';
    for (const ex of [-2, 2.6]) { ctx.beginPath(); ctx.arc(ex, 2, 0.6, 0, TAU); ctx.fill(); }
  }
}

function pila(ctx, t, angry, blink, e) {
  const charging = e && e.charging;
  const shake = charging ? Math.sin(t * 60) * 0.6 : 0;
  ctx.translate(shake, 0);
  const cells = [['#d0a030', -9], ['#3a3a44', -4.5], ['#d0a030', 0]];
  for (const [c, x] of cells) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(x - 2.2, -2.6 + Math.sin(t * 5 + x) * 0.6, 4.4, 5.2, 1);
    ctx.fill();
  }
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath();
  ctx.roundRect(2.5, -3.4, 7, 6.8, 3);
  ctx.fill();
  angryEyes(ctx, 7, -0.6, 1.2, angry || charging, blink);
  if (charging) {
    ctx.strokeStyle = `rgba(122,240,255,${0.5 + Math.sin(t * 40) * 0.4})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + t * 6;
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a + 0.4) * 11, Math.sin(a + 0.4) * 8);
    }
    ctx.stroke();
  }
}

function lodo(ctx, t, angry, blink, e) {
  const ceiling = e && e._mode === 'ceiling';
  if (ceiling) ctx.scale(1, -1); // colgado del techo, boca abajo
  const drip = Math.sin(t * 3) * 0.8;
  ctx.fillStyle = angry ? '#c0ff4a' : '#9aff4a';
  ctx.beginPath();
  ctx.moveTo(-7, 6);
  ctx.quadraticCurveTo(-8, -6, 0, -7);
  ctx.quadraticCurveTo(8, -6, 7, 6);
  for (let x = 5; x >= -5; x -= 2.5) ctx.quadraticCurveTo(x + 1, 8 + drip * (x % 2 ? 1 : -1), x - 1.2, 6);
  ctx.closePath();
  ctx.fill();
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  glow.addColorStop(0, 'rgba(154,255,74,0.25)');
  glow.addColorStop(1, 'rgba(154,255,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-12, -12, 24, 24);
  ctx.fillStyle = '#0a1a0a';
  for (const ex of [-2.4, 2.4]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, -1, 1.3, 0.3, 0, 0, TAU);
    else ctx.arc(ex, -1, 1.3, 0, TAU);
    ctx.fill();
  }
}

const DRAW = { zen: crudo, mighta: latita, monsta: bolsa, pulpul: micro, colilla, espuma, gomon, verdin, pila, lodo };

/**
 * Dibuja un enemigo centrado en (cx, cy).
 * @param {{ type:string, state:string, facing:number }} e
 */
export function drawEnemy(ctx, e, c, t, cx, cy, opts = {}) {
  const angry = e.state === 'angry';
  const blink = !!(c && c.blinkT > 0);
  const face = c?.face ?? e.facing ?? 1;
  const sq = c ? c.s : 0;
  const tt = t + (c?.phase || 0);

  ctx.save();
  ctx.translate(cx, cy);

  if (e.state === 'dying') {
    // El animal ya quedó libre (lo dibuja animals.js); lo que cae es la cría
    // que estaba atrapada, dentro de una burbujita.
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
    glow.addColorStop(0, 'rgba(255,208,228,0.5)');
    glow.addColorStop(1, 'rgba(255,208,228,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.rotate(Math.sin(tt * 6) * 0.25);
    drawCria(ctx, CRIA_BY_COMBO[Math.min(e.combo || 1, 5) - 1], tt);
    ctx.strokeStyle = 'rgba(235,252,255,0.7)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (angry) {
    const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
    aura.addColorStop(0, 'rgba(255,40,30,0.35)');
    aura.addColorStop(1, 'rgba(60,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-12, -12, 24, 24);
  }

  const scale = (opts.scale || 1) * (e.small ? 0.7 : 1);
  ctx.scale(scale * (1 - sq * 0.5) * (e.type === 'pulpul' || e.type === 'espuma' || e.type === 'verdin' ? 1 : face), scale * (1 + sq));
  if (opts.struggle) ctx.rotate(Math.sin(tt * 14) * 0.18);
  (DRAW[e.type] || crudo)(ctx, tt, angry, blink, e);
  ctx.restore();
}

/** Peligros del piso: rastro de colilla, descarga de pila, mancha de petróleo. */
export function drawHazards(ctx, hazards, t) {
  for (const h of hazards) {
    const k = h.life / h.max;
    if (h.kind === 'zap') {
      const cx = h.x + h.w / 2; const cy = h.y + h.h / 2 + HUD_H;
      ctx.strokeStyle = `rgba(122,240,255,${k})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + t * 20;
        let px = cx; let py = cy;
        ctx.moveTo(px, py);
        for (let j = 1; j <= 3; j++) {
          px = cx + Math.cos(a + Math.sin(t * 50 + j) * 0.3) * (h.w / 2) * (j / 3);
          py = cy + Math.sin(a + Math.sin(t * 50 + j) * 0.3) * (h.h / 2) * (j / 3);
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(122,240,255,${0.15 * k})`;
      ctx.beginPath();
      ctx.arc(cx, cy, h.w / 2, 0, TAU);
      ctx.fill();
      continue;
    }
    if (h.kind === 'oil') {
      const g = ctx.createLinearGradient(h.x, 0, h.x + h.w, 0);
      g.addColorStop(0, `rgba(18,15,26,${0.8 * k})`);
      g.addColorStop(0.5, `rgba(62,111,120,${0.8 * k})`);
      g.addColorStop(1, `rgba(106,74,138,${0.8 * k})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, h.y + HUD_H + h.h - 0.5, h.w / 2 + 2, 1.8, 0, 0, TAU);
      ctx.fill();
      continue;
    }
    const y = h.y + HUD_H; // las coordenadas del core son del playfield
    ctx.fillStyle = `rgba(150,170,60,${0.55 * k})`;
    ctx.beginPath();
    ctx.ellipse(h.x + h.w / 2, y + h.h - 0.5, h.w / 2 + 1, 1.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(200,220,120,${0.6 * k})`;
    const b = (t * 2 + h.x) % 1;
    ctx.beginPath();
    ctx.arc(h.x + 3 + (h.x % 5), y + h.h - 1 - b * 5, 0.6 + b * 0.4, 0, TAU);
    ctx.fill();
  }
}
