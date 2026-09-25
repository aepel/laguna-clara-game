// Nilo (P1, rosado) y Lirio (P2, verde agua): ajolotes dibujados con paths.
// La geometría sale del boceto aprobado (unidades de ~160 px) y se escala al
// hitbox del jugador (14x16 lógicos). Vista 3/4: ojos y cola se corren según `face`.

const K = 0.175; // unidades de boceto -> píxeles lógicos

const SKINS = {
  1: {
    hi: '#ffe6ef', mid: '#ffabc8', lo: '#e67aa2', gill: '#ff7aa8', gillHi: '#ffb3cc',
    eye: '#2a0f24', mouth: '#a63a66', cheek: 'rgba(255,106,154,0.5)', glow: '255,184,210', sprout: false,
  },
  2: {
    hi: '#eafff6', mid: '#9fe6cf', lo: '#5cbfa4', gill: '#4fbf9c', gillHi: '#8fe3c6',
    eye: '#0f2a24', mouth: '#2a7a64', cheek: 'rgba(255,158,192,0.5)', glow: '159,245,216', sprout: true,
  },
};

function bodyGradient(ctx, s, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1);
  g.addColorStop(0, s.hi);
  g.addColorStop(0.7, s.mid);
  g.addColorStop(1, s.lo);
  return g;
}

function gills(ctx, s, flow, t) {
  // Tres frondas por lado; `flow` las tira hacia atrás al saltar/caer.
  const wave = Math.sin(t * 5) * 2;
  const fronds = [
    [-30, -22, -64, -48 + wave, -34, -20],
    [-34, -10, -76, -20 - wave, -38, -4],
    [-34, 2, -74, 4 + wave, -36, 8],
  ];
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-flow * 0.25);
    for (let i = 0; i < fronds.length; i++) {
      const [x0, y0, x1, y1, x2, y2] = fronds[i];
      ctx.fillStyle = i === 1 ? s.gillHi : s.gill;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 - 4, (y0 + y1) / 2 - 10, x1, y1 + flow * 10);
      ctx.quadraticCurveTo((x2 + x1) / 2, (y2 + y1) / 2 + 6, x2, y2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p  jugador del core
 * @param {object} c  estado cosmético (cosmetic.js)
 * @param {number} t  tiempo en segundos
 */
export function drawHero(ctx, p, c, t, x, y) {
  const s = SKINS[p.id] || SKINS[1];
  const face = c ? c.face : p.facing;
  const sq = c ? c.s : 0;
  const walking = p.anim === 'walk' && p.onGround;
  const airborne = !p.onGround;
  const flow = airborne ? (p.vy < 0 ? 0.8 : -0.4) : 0;
  const bob = walking ? Math.abs(Math.sin(t * 12)) * -1.2 : Math.sin(t * 2.2 + (c?.phase || 0)) * 0.35;

  let alpha = 1;
  if (p.state === 'dying') alpha = 0.35 + Math.sin(t * 20) * 0.1;
  else if (p.invuln > 0) alpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 9));

  const footX = x + 7;
  const footY = y + 16;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Halo propio: los héroes se leen bien incluso en agua turbia.
  const halo = ctx.createRadialGradient(footX, footY - 8, 1, footX, footY - 8, 16);
  halo.addColorStop(0, `rgba(${s.glow},0.35)`);
  halo.addColorStop(1, `rgba(${s.glow},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(footX - 16, footY - 24, 32, 32);

  // Sombra de contacto.
  if (p.onGround) {
    ctx.fillStyle = 'rgba(0,10,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(footX, footY, 6.5 * (1 - sq * 0.6), 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(footX, footY + bob);
  ctx.scale((1 - sq * 0.6) * K, (1 + sq) * K);
  ctx.translate(0, -47);

  const lean = face * 5; // desplazamiento 3/4 hacia donde mira

  // Cola del lado opuesto a la mirada.
  ctx.save();
  ctx.scale(-Math.sign(face || 1), 1);
  const tailWag = Math.sin(t * (walking ? 10 : 3)) * 4;
  ctx.fillStyle = s.mid;
  ctx.beginPath();
  ctx.moveTo(18, 22);
  ctx.quadraticCurveTo(50, 30 + tailWag, 70, 6 + tailWag);
  ctx.quadraticCurveTo(62, 40, 18, 38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Patas (se alternan al caminar).
  const step = walking ? Math.sin(t * 12) * 4 : 0;
  ctx.fillStyle = s.lo;
  ctx.beginPath();
  ctx.ellipse(-14 + lean * 0.3, 42 + step, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(14 + lean * 0.3, 42 - step, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo.
  ctx.fillStyle = bodyGradient(ctx, s, 0, 26, 28);
  ctx.beginPath();
  ctx.ellipse(lean * 0.3, 26, 28, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cabeza + branquias.
  ctx.save();
  ctx.translate(lean * 0.5, -4);
  gills(ctx, s, flow, t + (c?.phase || 0));
  ctx.fillStyle = bodyGradient(ctx, s, 0, 0, 38);
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.sprout) {
    const sway = Math.sin(t * 2) * 2;
    ctx.fillStyle = '#6ad08a';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(-6 + sway, -40, 6 + sway, -48);
    ctx.quadraticCurveTo(8 + sway, -36, 0, -26);
    ctx.fill();
    ctx.fillStyle = '#8ae29a';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(10 + sway, -34, 18 + sway, -30);
    ctx.quadraticCurveTo(10 + sway, -22, 0, -26);
    ctx.fill();
  }

  // Cara (se corre hacia donde mira).
  const fx = lean * 1.4;
  const blink = c && c.blinkT > 0;
  ctx.fillStyle = s.eye;
  for (const ex of [-14, 14]) {
    ctx.beginPath();
    if (blink || p.state === 'dying') ctx.ellipse(fx + ex, -4, 6, 1.6, 0, 0, Math.PI * 2);
    else ctx.ellipse(fx + ex, -6, 5.8, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!blink && p.state !== 'dying') {
    ctx.fillStyle = '#ffffff';
    for (const ex of [-14, 14]) {
      ctx.beginPath();
      ctx.arc(fx + ex + 2 + face, -9, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = s.cheek;
  ctx.beginPath();
  ctx.ellipse(fx - 24, 6, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(fx + 24, 6, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = s.mouth;
  ctx.fillStyle = s.mouth;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  if (c && c.shoot > 0) {
    // Sopla: boca en "o".
    ctx.beginPath();
    ctx.ellipse(fx + face * 3, 10, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.state === 'dying') {
    ctx.beginPath();
    ctx.arc(fx, 14, 5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(fx - 9, 8);
    ctx.quadraticCurveTo(fx, 15, fx + 9, 8);
    ctx.stroke();
  }

  // Brillo especular.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-8, -8, 22, 16, 0, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** Mini retrato para el HUD. */
export function drawHeroIcon(ctx, id, x, y, size) {
  const s = SKINS[id] || SKINS[1];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 80, size / 80);
  gills(ctx, s, 0, 0);
  ctx.fillStyle = bodyGradient(ctx, s, 0, 0, 38);
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.eye;
  ctx.beginPath();
  ctx.ellipse(-14, -6, 5.8, 6.8, 0, 0, Math.PI * 2);
  ctx.ellipse(14, -6, 5.8, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = s.mouth;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, 8);
  ctx.quadraticCurveTo(0, 15, 9, 8);
  ctx.stroke();
  ctx.restore();
}
