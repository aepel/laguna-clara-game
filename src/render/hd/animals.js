// Los animales que los enemigos "supieron ser". Al reventar la burbuja, la
// contaminación se desprende y aparece el animal original, que se queda
// nadando por el nivel. Cada dibujo mide unos 16 px, centrado en (0,0) y
// mirando a la derecha.

const TAU = Math.PI * 2;

/** Tipo de enemigo → animal original. */
export const ORIGINAL = {
  zen: 'pez', mighta: 'cangrejo', monsta: 'tortuga', pulpul: 'cardumen', colilla: 'camaron',
  espuma: 'pezGlobo', gomon: 'caracol', verdin: 'rana', pila: 'anguila', lodo: 'renacuajo',
};

function eye(ctx, x, y, r = 1) {
  ctx.fillStyle = '#1a1010';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.35, 0, TAU);
  ctx.fill();
}

function fish(ctx, t, color, scale = 1) {
  const wag = Math.sin(t * 12) * 1.2;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-5, 0); ctx.lineTo(-10, -4 + wag); ctx.lineTo(-10, 4 + wag); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.5, 4.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-0.5, -1.8, 4, 1.4, 0, 0, TAU);
  ctx.fill();
  eye(ctx, 3, -1, 1.1);
  ctx.restore();
}

const DRAW = {
  pez: (ctx, t) => fish(ctx, t, '#ffb86a'),
  cardumen: (ctx, t) => {
    for (const [x, y, ph] of [[-5, -4, 0], [4, -1, 1.3], [-3, 4, 2.6]]) {
      ctx.save(); ctx.translate(x, y); fish(ctx, t + ph, '#7ad7ff', 0.5); ctx.restore();
    }
  },
  cangrejo: (ctx, t) => {
    ctx.fillStyle = '#ff7a5a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 6.5, -2 + Math.sin(t * 8 + s) * 0.6, 2.4, 1.8, 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#ff7a5a';
    ctx.lineWidth = 0.8;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 2, 2);
      ctx.lineTo(s * (4 + i * 1.5), 4.5 + Math.sin(t * 12 + i) * 0.4);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 3.8, 0, 0, TAU);
    ctx.fill();
    eye(ctx, -1.6, -3.6, 0.9);
    eye(ctx, 1.6, -3.6, 0.9);
  },
  tortuga: (ctx, t) => {
    const paddle = Math.sin(t * 6) * 0.4;
    ctx.fillStyle = '#7ad090';
    for (const [x, y] of [[-4.5, -3], [4.5, -3], [-4, 3], [4, 3]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 1.1, Math.sign(x) * (0.5 + paddle), 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(6.2, 0, 2, 0, TAU);
    ctx.fill();
    eye(ctx, 6.8, -0.6, 0.6);
    ctx.fillStyle = '#3a9a6a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#a6f0bc';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.moveTo(0, -3); ctx.lineTo(0, 3);
    ctx.stroke();
  },
  camaron: (ctx, t) => {
    ctx.strokeStyle = '#ff9a8a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, Math.PI * 0.8, Math.PI * 2.1);
    ctx.stroke();
    ctx.strokeStyle = '#ffc4b8';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(4, -1);
      ctx.quadraticCurveTo(9, -6 + i * 2 + Math.sin(t * 6) * 0.5, 11, -4 + i * 3);
      ctx.stroke();
    }
    eye(ctx, 4.2, -1.5, 0.7);
  },
  pezGlobo: (ctx, t) => {
    const puff = 1 + Math.sin(t * 3) * 0.08;
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(0, 0, 5.2 * puff, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0b030';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 5.6 * puff, Math.sin(a) * 5.6 * puff, 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(-8, -2.5); ctx.lineTo(-8, 2.5); ctx.closePath();
    ctx.fill();
    eye(ctx, 2.4, -1.4, 1.1);
  },
  caracol: (ctx, t) => {
    ctx.fillStyle = '#c8b08a';
    ctx.beginPath();
    ctx.ellipse(1, 3, 7, 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c8b08a';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(6, 2); ctx.lineTo(7.5, -2 + Math.sin(t * 3) * 0.4);
    ctx.stroke();
    eye(ctx, 7.6, -2.2, 0.6);
    ctx.fillStyle = '#e0906a';
    ctx.beginPath();
    ctx.arc(-1, -1, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#a05a3a';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(-1, -1, 2.6, 0, Math.PI * 1.6);
    ctx.stroke();
  },
  rana: (ctx, t) => {
    const kick = Math.sin(t * 6) * 0.3;
    ctx.fillStyle = '#5fcf6a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 5, 3.5, 3, 1.2, s * (0.4 + kick), 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 1, 5.5, 4, 0, 0, TAU);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 2.6, -2.8, 2, 0, TAU);
      ctx.fill();
      eye(ctx, s * 2.6, -3, 0.9);
    }
    ctx.strokeStyle = '#2a7a3a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 1, 2.4, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  },
  anguila: (ctx, t) => {
    ctx.strokeStyle = '#6aa060';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, Math.sin(t * 6) * 2);
    for (let x = -10; x <= 7; x += 3) ctx.lineTo(x, Math.sin(t * 6 + x * 0.5) * 2);
    ctx.stroke();
    eye(ctx, 6.5, Math.sin(t * 6 + 3.5) * 2 - 0.5, 0.7);
  },
  renacuajo: (ctx, t) => {
    ctx.strokeStyle = '#4a4a3a';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-6, Math.sin(t * 14) * 3, -10, Math.sin(t * 14 + 1) * 2);
    ctx.stroke();
    ctx.fillStyle = '#4a4a3a';
    ctx.beginPath();
    ctx.ellipse(1, 0, 4, 3.2, 0, 0, TAU);
    ctx.fill();
    eye(ctx, 2.8, -1, 0.8);
  },
};

/** Dibuja el animal original de un tipo de enemigo, centrado en (0,0). */
export function drawAnimal(ctx, enemyType, t, face = 1) {
  const fn = DRAW[ORIGINAL[enemyType]] || DRAW.pez;
  ctx.save();
  ctx.scale(face < 0 ? -1 : 1, 1);
  fn(ctx, t);
  ctx.restore();
}

const TRANSFORM = 40; // frames que dura la transformación
const MAX_SWIMMERS = 16;

/**
 * Animales liberados que se quedan nadando por el nivel. Viven en el
 * renderer (no afectan la simulación) y se borran al empezar otro nivel.
 */
export function createLife() {
  const swimmers = [];
  return {
    free(type, x, y, rnd) {
      if (swimmers.length >= MAX_SWIMMERS) swimmers.shift();
      swimmers.push({
        type, x, y, age: 0, face: rnd() < 0.5 ? -1 : 1,
        vx: 0, vy: 0, ph: rnd() * 6.28, homeY: 30 + rnd() * 160,
      });
    },
    clear() { swimmers.length = 0; },
    step(width) {
      for (const s of swimmers) {
        s.age++;
        if (s.age < TRANSFORM) continue;
        // Nado tranquilo: avanza, ondula y da la vuelta en los bordes.
        const speed = s.type === 'mighta' || s.type === 'gomon' ? 0.25 : 0.45;
        s.vx += (s.face * speed - s.vx) * 0.05;
        s.vy = Math.sin(s.age * 0.03 + s.ph) * 0.25 + (s.homeY - s.y) * 0.004;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 14) s.face = 1;
        if (s.x > width - 14) s.face = -1;
      }
    },
    /** Dibuja la transformación y a los que ya nadan. */
    draw(ctx, t, drawEnemy) {
      for (const s of swimmers) {
        const k = Math.min(1, s.age / TRANSFORM);
        ctx.save();
        ctx.translate(s.x, s.y);
        if (k < 1) {
          // Destello y anillo mientras la contaminación se desprende.
          const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
          glow.addColorStop(0, `rgba(255,248,192,${0.7 * (1 - k)})`);
          glow.addColorStop(1, 'rgba(184,240,122,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(-16, -16, 32, 32);
          ctx.strokeStyle = `rgba(235,252,255,${1 - k})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, 4 + k * 14, 0, TAU);
          ctx.stroke();
          // El enemigo se desvanece mientras aparece el animal.
          ctx.globalAlpha = 1 - k;
          drawEnemy(ctx, { type: s.type, state: 'walk', facing: s.face }, null, t, 0, 0);
          ctx.globalAlpha = k;
          const pop = 0.6 + k * 0.4 + Math.sin(k * Math.PI) * 0.25;
          ctx.scale(pop, pop);
        } else {
          ctx.globalAlpha = 0.9;
        }
        drawAnimal(ctx, s.type, t + s.ph, s.face);
        ctx.restore();
      }
    },
  };
}
