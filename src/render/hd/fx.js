// Efectos cosméticos del renderer HD: partículas, textos flotantes, sacudida y
// destello de pantalla. Se actualizan a 60 Hz en step() y se dibujan en draw().

import { rgba } from './color.js';

export const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif';
const MAX_PARTICLES = 400;

export function createFx() {
  const parts = [];
  const floaters = [];
  let shake = 0;
  let flash = 0;
  let flashColor = '#ffffff';

  function add(p) {
    if (parts.length >= MAX_PARTICLES) parts.shift();
    parts.push({ vx: 0, vy: 0, grav: 0, drag: 0.98, size: 1, spin: 0, rot: 0, ...p, max: p.life });
  }

  return {
    add,

    burst(x, y, n, make) {
      for (let i = 0; i < n; i++) add(make(i, n));
    },

    text(x, y, str, color = '#ffffff', size = 7) {
      floaters.push({ x, y, str, color, size, life: 50, max: 50 });
    },

    shake(amount) { shake = Math.max(shake, amount); },
    flash(color = '#ffffff', amount = 0.6) { flash = Math.max(flash, amount); flashColor = color; },

    clear() { parts.length = 0; floaters.length = 0; shake = 0; flash = 0; },

    step() {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.grav;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        if (--p.life <= 0) parts.splice(i, 1);
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.y -= 0.35 * (f.life / f.max) + 0.05;
        if (--f.life <= 0) floaters.splice(i, 1);
      }
      shake *= 0.86;
      if (shake < 0.05) shake = 0;
      flash *= 0.9;
      if (flash < 0.01) flash = 0;
    },

    /** Desplazamiento de cámara para este frame (en unidades lógicas). */
    offset(t) {
      if (!shake) return [0, 0];
      return [Math.sin(t * 91) * shake, Math.cos(t * 77) * shake * 0.7];
    },

    drawParticles(ctx, t) {
      for (const p of parts) {
        const k = p.life / p.max;
        switch (p.kind) {
          case 'spark': {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = rgba(p.color, 0.9 * k);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(p.color, 0.25 * k);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            break;
          }
          case 'bubble': {
            const wob = Math.sin(t * 6 + p.x) * 0.4;
            ctx.strokeStyle = `rgba(230,250,255,${0.75 * k})`;
            ctx.lineWidth = 0.35;
            ctx.beginPath();
            ctx.arc(p.x + wob, p.y, p.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,255,255,${0.6 * k})`;
            ctx.beginPath();
            ctx.arc(p.x + wob - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'ink': {
            const r = p.size * (1.6 - k * 0.6);
            ctx.fillStyle = rgba(p.color, 0.5 * k);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'shard': {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.strokeStyle = `rgba(235,252,255,${k})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(p.size, 0);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'petal': {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = rgba(p.color, Math.min(1, k * 1.5));
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
          }
          default: break;
        }
      }
    },

    drawFloaters(ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of floaters) {
        const k = f.life / f.max;
        const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.font = `700 ${f.size * pop}px ${FONT}`;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(10,30,50,0.85)';
        ctx.lineJoin = 'round';
        ctx.strokeText(f.str, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.str, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },

    drawFlash(ctx, w, h) {
      if (!flash) return;
      ctx.fillStyle = rgba(flashColor, flash * 0.5);
      ctx.fillRect(0, 0, w, h);
    },
  };
}
