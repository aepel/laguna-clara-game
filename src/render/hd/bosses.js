// Jefes y sus proyectiles. Cada jefe se dibuja dentro de su caja del core
// (b.x, b.y, b.w, b.h) con coordenadas de pantalla (y ya incluye HUD_H).

const TAU = Math.PI * 2;

function eyes(ctx, x1, x2, y, r, phase, hurt, t) {
  for (const x of [x1, x2]) {
    ctx.fillStyle = hurt ? '#ffffff' : phase === 3 ? '#ffb08a' : '#ff4a3a';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0606';
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 2) * r * 0.2, y + r * 0.1, r * 0.45, 0, TAU);
    ctx.fill();
  }
  // Cejas enojadas.
  ctx.strokeStyle = '#1a1020';
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1 - r, y - r * 1.4); ctx.lineTo(x1 + r * 0.8, y - r * 0.8);
  ctx.moveTo(x2 + r, y - r * 1.4); ctx.lineTo(x2 - r * 0.8, y - r * 0.8);
  ctx.stroke();
}

/** Botellón: botella de plástico acostada que rueda. */
function botellon(ctx, b, t, y) {
  const cx = b.x + b.w / 2;
  const cy = y + b.h / 2;
  const face = b.dir || -1;
  const aim = b.mode === 'aim' ? Math.min(1, b.modeTimer / 20) : 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-face * aim * 0.28);
  ctx.scale(face, 1);

  // Cuerpo translúcido.
  const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2);
  g.addColorStop(0, 'rgba(200,236,240,0.75)');
  g.addColorStop(0.5, 'rgba(120,170,180,0.55)');
  g.addColorStop(1, 'rgba(60,90,100,0.8)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-b.w / 2, -b.h / 2, b.w - 8, b.h, 8);
  ctx.fill();
  // Cuello y tapa (del lado hacia donde rueda).
  ctx.beginPath();
  ctx.moveTo(b.w / 2 - 9, -b.h / 2 + 3);
  ctx.quadraticCurveTo(b.w / 2 - 3, -4, b.w / 2 - 2, -3);
  ctx.lineTo(b.w / 2 - 2, 3);
  ctx.quadraticCurveTo(b.w / 2 - 3, 4, b.w / 2 - 9, b.h / 2 - 3);
  ctx.fill();
  ctx.fillStyle = '#d0402a';
  ctx.beginPath();
  ctx.roundRect(b.w / 2 - 3, -4, 4, 8, 1.2);
  ctx.fill();

  // Etiqueta desteñida que gira con el rodar.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-b.w / 2, -b.h / 2, b.w - 8, b.h, 8);
  ctx.clip();
  const roll = ((b.x * 0.9) % 14 + 14) % 14;
  ctx.fillStyle = 'rgba(210,90,70,0.55)';
  for (let k = -2; k < 5; k++) ctx.fillRect(-b.w / 2 + k * 14 - roll, -b.h / 2 + 4, 7, b.h - 8);
  ctx.restore();

  // Brillo del plástico.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-b.w / 2 + 5, -b.h / 2 + 3);
  ctx.lineTo(b.w / 2 - 14, -b.h / 2 + 3);
  ctx.stroke();

  // Grietas en fase 3.
  if (b.phase === 3) {
    ctx.strokeStyle = 'rgba(30,40,40,0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, -b.h / 2); ctx.lineTo(-3, -3); ctx.lineTo(-7, 4);
    ctx.stroke();
  }

  eyes(ctx, 2, 10, -2, 2.8, b.phase, b.hurt > 0, t);
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  if (aim > 0) ctx.ellipse(7, 5.5, 2.5, 1.5 + aim * 1.5, 0, 0, TAU);
  else ctx.ellipse(7, 6, 3.2, 1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Red Fantasma: red de pesca abandonada con ojos y basura enredada. */
function redFantasma(ctx, b, t, y) {
  const x0 = b.x; const x1 = b.x + b.w;
  const sag = (u) => Math.sin(u * Math.PI) * 6 + Math.sin(t * 2 + u * 6) * 1.5;
  ctx.save();
  // Silueta de la red: borde superior recto que ondula, borde inferior colgando.
  ctx.beginPath();
  ctx.moveTo(x0, y + Math.sin(t * 2) * 1.5);
  for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(x0 + u * b.w, y + Math.sin(t * 2 + u * 4) * 1.5);
  for (let u = 1; u >= -0.001; u -= 0.1) ctx.lineTo(x0 + u * b.w, y + b.h + sag(u));
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,170,160,0.18)';
  ctx.fill();
  ctx.clip();
  // Malla.
  ctx.strokeStyle = b.hurt > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(190,210,200,0.55)';
  ctx.lineWidth = 0.5;
  for (let k = -b.h; k < b.w + b.h; k += 5) {
    ctx.beginPath();
    ctx.moveTo(x0 + k, y - 2); ctx.lineTo(x0 + k + b.h + 8, y + b.h + 8);
    ctx.moveTo(x0 + k, y - 2); ctx.lineTo(x0 + k - b.h - 8, y + b.h + 8);
    ctx.stroke();
  }
  // Basura enredada.
  ctx.fillStyle = 'rgba(200,210,220,0.7)';
  ctx.beginPath();
  ctx.ellipse(x0 + b.w * 0.2, y + b.h * 0.6, 3, 2, 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#a8483a';
  ctx.fillRect(x0 + b.w * 0.78, y + b.h * 0.45, 3, 4);
  ctx.restore();

  // Cuerda superior y boyas.
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y + Math.sin(t * 2) * 1.5);
  for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(x0 + u * b.w, y + Math.sin(t * 2 + u * 4) * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#ff8a3a';
  for (const u of [0, 0.5, 1]) {
    ctx.beginPath();
    ctx.ellipse(x0 + u * b.w, y + Math.sin(t * 2 + u * 4) * 1.5, 2.6, 2, 0, 0, TAU);
    ctx.fill();
  }
  // Hilos sueltos que cuelgan.
  ctx.strokeStyle = 'rgba(190,210,200,0.5)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const u = (i + 0.5) / 5;
    const hx = x0 + u * b.w; const hy = y + b.h + sag(u);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + Math.sin(t * 3 + i) * 3, hy + 5, hx + Math.sin(t * 2 + i) * 2, hy + 9);
    ctx.stroke();
  }
  // Ojos fantasmales.
  const ex = x0 + b.w / 2;
  const glow = ctx.createRadialGradient(ex, y + b.h * 0.45, 1, ex, y + b.h * 0.45, 16);
  glow.addColorStop(0, 'rgba(255,90,70,0.35)');
  glow.addColorStop(1, 'rgba(255,90,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ex - 16, y + b.h * 0.45 - 16, 32, 32);
  eyes(ctx, ex - 6, ex + 6, y + b.h * 0.45, 2.6, b.phase, b.hurt > 0, t);
}

/** Capitán Lata: cangrejo ermitaño metido en un tacho de metal. */
function capitanLata(ctx, b, t, y) {
  const cx = b.x + b.w / 2;
  const hiding = b.mode === 'spin';
  ctx.save();
  ctx.translate(cx, y + b.h / 2);
  if (hiding) ctx.rotate((b.x * 0.12) % (Math.PI * 2));
  const air = b.mode === 'jump' ? Math.min(1, Math.abs(b.vy) / 5) : 0;

  if (!hiding) {
    // Patas y pinzas asomando.
    ctx.strokeStyle = b.phase === 3 ? '#ff5a3a' : '#c8674a';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 8, 12);
      ctx.lineTo(s * (13 + i * 2), 16 + Math.sin(t * 10 + i) * 1.2 - air * 4);
      ctx.stroke();
    }
    ctx.fillStyle = b.phase === 3 ? '#ff5a3a' : '#c8674a';
    for (const s of [-1, 1]) {
      const snap = Math.sin(t * 6 + s) * 0.3;
      ctx.save();
      ctx.translate(s * 17, -2 - air * 6);
      ctx.rotate(s * (0.4 + snap));
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(s * 1, 0); ctx.lineTo(s * 6, -1.5 - snap * 2); ctx.lineTo(s * 6, 1.5);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = b.phase === 3 ? '#ff5a3a' : '#c8674a';
    }
  }

  // Tacho.
  const g = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
  g.addColorStop(0, '#5a606a');
  g.addColorStop(0.35, b.hurt > 0 ? '#ffffff' : '#d8dde4');
  g.addColorStop(0.6, '#8a929e');
  g.addColorStop(1, '#3a4048');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-b.w / 2 + 2, -b.h / 2 + 3, b.w - 4, b.h - 3, 3);
  ctx.fill();
  ctx.fillStyle = '#6a707a';
  ctx.beginPath();
  ctx.roundRect(-b.w / 2, -b.h / 2, b.w, 5, 2);
  ctx.fill();
  // Aros, abolladura y óxido.
  ctx.strokeStyle = 'rgba(40,44,50,0.5)';
  ctx.lineWidth = 0.8;
  for (const yy of [-4, 6]) { ctx.beginPath(); ctx.moveTo(-b.w / 2 + 2, yy); ctx.lineTo(b.w / 2 - 2, yy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(140,80,40,0.5)';
  ctx.beginPath();
  ctx.ellipse(8, 9, 4, 2.5, 0.3, 0, TAU);
  ctx.fill();

  if (!hiding) {
    // Ojos sobre pedúnculos asomando por arriba.
    ctx.strokeStyle = '#c8674a';
    ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 4, -b.h / 2 + 1);
      ctx.lineTo(s * 5, -b.h / 2 - 7 - air * 3);
      ctx.stroke();
    }
    eyes(ctx, -5, 5, -b.h / 2 - 9 - air * 3, 2.6, b.phase, b.hurt > 0, t);
    // Gorro de capitán hecho con una tapita.
    ctx.fillStyle = '#d0402a';
    ctx.beginPath();
    ctx.ellipse(0, -b.h / 2 - 1, 7, 2, 0, 0, TAU);
    ctx.fill();
  } else {
    // Escondido: solo se ve la boca del tacho girando.
    ctx.fillStyle = '#1a1a20';
    ctx.beginPath();
    ctx.ellipse(0, -b.h / 2 + 2.5, b.w / 2 - 3, 2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

const SWARM_COLORS = ['#ff5ab4', '#5ad0ff', '#ffd24a', '#7ae87a', '#ff8a4a', '#b07aff'];

/** Enjambre Arcoíris: una nube de fragmentos que toma forma. */
function enjambre(ctx, b, t, y) {
  const cx = b.x + b.w / 2;
  const cy = y + b.h / 2;
  const charging = b.mode === 'charge';
  const ang = charging ? Math.atan2(b.vy, b.vx) : 0;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    let px; let py;
    if (charging) {
      // Flecha que apunta hacia donde embiste.
      const along = (u - 0.5) * 36;
      const spread = (1 - Math.abs(u - 0.8) * 2.2) * 12 * Math.sin(i * 7.3);
      px = Math.cos(ang) * along - Math.sin(ang) * spread;
      py = Math.sin(ang) * along + Math.cos(ang) * spread;
    } else {
      // Remolino que respira.
      const a = u * TAU * 3 + t * (1.2 + b.phase * 0.4);
      const r = 6 + (i % 7) * 2.2 + Math.sin(t * 2 + i) * 1.5;
      px = Math.cos(a) * r;
      py = Math.sin(a) * r * 0.85;
    }
    ctx.save();
    ctx.translate(cx + px, cy + py);
    ctx.rotate(t * 3 + i);
    ctx.fillStyle = b.hurt > 0 ? '#ffffff' : SWARM_COLORS[i % SWARM_COLORS.length];
    ctx.fillRect(-1.6, -1.2, 3.2, 2.4);
    ctx.restore();
  }
  // Ojo central.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = b.phase === 3 ? '#d01a1a' : '#1a1a2a';
  ctx.beginPath();
  ctx.arc(cx + Math.cos(ang) * 1.5, cy + Math.sin(ang) * 1.5, 2.4, 0, TAU);
  ctx.fill();
}

/** Humareda: nube de humo negro con brasas por ojos. */
function humareda(ctx, b, t, y) {
  const puffs = 9;
  for (let i = 0; i < puffs; i++) {
    const u = i / (puffs - 1);
    const px = b.x + 6 + u * (b.w - 12) + Math.sin(t * 1.5 + i) * 2;
    const py = y + b.h * 0.5 + Math.sin(t * 2 + i * 1.3) * 3 - Math.sin(u * Math.PI) * 5;
    const r = 7 + Math.sin(u * Math.PI) * 5 + Math.sin(t * 3 + i) * 1;
    ctx.fillStyle = b.hurt > 0 ? 'rgba(230,230,230,0.9)' : `rgba(${34 + i * 3},${30 + i * 2},${38 + i * 2},0.92)`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
  }
  // Brasas por ojos, más chicas a medida que se debilita.
  const ex = b.x + b.w / 2;
  const glow = ctx.createRadialGradient(ex, y + b.h * 0.45, 1, ex, y + b.h * 0.45, 18);
  glow.addColorStop(0, 'rgba(255,140,40,0.35)');
  glow.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ex - 18, y + b.h * 0.45 - 18, 36, 36);
  eyes(ctx, ex - 7, ex + 7, y + b.h * 0.45, 2.8 - (b.phase - 1) * 0.4, b.phase, b.hurt > 0, t);
  ctx.strokeStyle = '#ff8a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ex, y + b.h * 0.72, 4, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/** Espuma Madre: una burbuja de espuma sucia enorme que respira. */
function espumaMadre(ctx, b, t, y) {
  const inf = b.inflate ?? 0.5;
  const cx = b.x + b.w / 2;
  const cy = y + b.h / 2;
  const R = (b.w / 2) * (0.85 + inf * 0.25);
  const cells = [[0, 0, 1], [-0.55, 0.35, 0.55], [0.55, 0.3, 0.58], [-0.35, -0.55, 0.5], [0.4, -0.5, 0.48], [0, 0.65, 0.45]];
  for (const [dx, dy, rr] of cells) {
    const g = ctx.createRadialGradient(cx + dx * R - R * 0.2, cy + dy * R - R * 0.2, 1, cx + dx * R, cy + dy * R, R * rr);
    g.addColorStop(0, b.hurt > 0 ? '#ffffff' : 'rgba(250,250,245,0.95)');
    g.addColorStop(1, b.phase === 3 ? 'rgba(170,150,130,0.9)' : 'rgba(190,196,200,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx + dx * R, cy + dy * R + Math.sin(t * 3 + dx * 4) * 1, R * rr, 0, TAU);
    ctx.fill();
  }
  // Brillo tornasolado de jabón.
  ctx.strokeStyle = `hsla(${(t * 60) % 360},80%,75%,0.5)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.9, t, t + 1.4);
  ctx.stroke();
  // Manchas de mugre.
  ctx.fillStyle = 'rgba(90,80,60,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.3, cy + R * 0.4, 4, 2.5, 0.4, 0, TAU);
  ctx.ellipse(cx + R * 0.45, cy - R * 0.1, 3, 2, -0.3, 0, TAU);
  ctx.fill();
  eyes(ctx, cx - 6, cx + 6, cy - 2, 3, b.phase, b.hurt > 0, t);
  ctx.fillStyle = '#3a3040';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 4 + inf * 2, 1.5 + inf * 2, 0, 0, TAU);
  ctx.fill();
}

/** Gran Rueda: neumático de camión que gira y rebota. */
function granRueda(ctx, b, t, y) {
  const cx = b.x + b.w / 2; const cy = y + b.h / 2; const R = b.w / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.spin || 0);
  ctx.fillStyle = b.hurt > 0 ? '#ffffff' : '#1c1c20';
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  // Dibujo de la banda de rodadura.
  ctx.fillStyle = '#34343c';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(R - 4, -2, 4, 4);
    ctx.restore();
  }
  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6a707a';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a505a';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25, 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // La cara no gira: queda sobre la llanta.
  eyes(ctx, cx - 6, cx + 6, cy - 2, 3, b.phase, b.hurt > 0, t);
  ctx.strokeStyle = '#ff4a3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 4, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/** Floración: manto de algas tóxicas con una flor venenosa en el centro. */
function floracion(ctx, b, t, y) {
  // Manto ondulante con lianas.
  ctx.fillStyle = b.hurt > 0 ? 'rgba(230,255,230,0.9)' : 'rgba(40,120,60,0.92)';
  ctx.beginPath();
  ctx.moveTo(b.x, y);
  for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(b.x + u * b.w, y + Math.sin(t * 2 + u * 7) * 2);
  for (let u = 1; u >= -0.001; u -= 0.05) {
    const hang = b.h + Math.sin(u * 23) * 4 + Math.sin(t * 1.5 + u * 9) * 2;
    ctx.lineTo(b.x + u * b.w, y + hang);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,90,0.8)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    const hx = b.x + u * b.w; const hy = y + b.h + Math.sin(u * 23) * 4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + Math.sin(t * 2 + i) * 3, hy + 6, hx + Math.sin(t * 1.3 + i) * 2, hy + 11);
    ctx.stroke();
  }
  // Flor venenosa central.
  const cx = b.x + b.w / 2; const cy = y + b.h * 0.55;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + t * 0.5;
    ctx.fillStyle = b.phase === 3 ? '#d04a8a' : '#a04ad0';
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 5, 2.6, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#e0ff60';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, TAU);
  ctx.fill();
  eyes(ctx, cx - 2.4, cx + 2.4, cy, 1.6, b.phase, b.hurt > 0, t);
}

/** Anguila Voltio: anguila hecha de pilas; brilla cuando se carga. */
function anguilaVoltio(ctx, b, t, y) {
  const n = 7;
  const face = (b.vx || 1) >= 0 ? 1 : -1;
  const cy = y + b.h / 2;
  const seg = b.w / n;
  if (b.charging) {
    const g = ctx.createRadialGradient(b.x + b.w / 2, cy, 2, b.x + b.w / 2, cy, 34);
    g.addColorStop(0, `rgba(122,240,255,${0.35 + Math.sin(t * 40) * 0.15})`);
    g.addColorStop(1, 'rgba(122,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x - 12, cy - 34, b.w + 24, 68);
  }
  for (let i = 0; i < n; i++) {
    const k = face > 0 ? i : n - 1 - i;
    const x = b.x + k * seg + seg / 2;
    const wy = cy + Math.sin(t * 5 - i * 0.8) * 3;
    ctx.fillStyle = b.hurt > 0 ? '#ffffff' : i % 2 ? '#3a3a44' : '#d0a030';
    ctx.beginPath();
    ctx.roundRect(x - seg / 2, wy - 5, seg + 0.6, 10, 2);
    ctx.fill();
    if (i % 2 === 0) {
      ctx.fillStyle = '#f0e0a0';
      ctx.fillRect(x - 1, wy - 3.5, 2, 1.2);
    }
  }
  // Cabeza.
  const hx = face > 0 ? b.x + b.w : b.x;
  const hy = cy + Math.sin(t * 5 + 0.8) * 3;
  ctx.fillStyle = '#2a2a34';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7, 6, 0, 0, TAU);
  ctx.fill();
  eyes(ctx, hx - 2.5 * face, hx + 2.5 * face, hy - 1, 2, b.phase, b.hurt > 0, t);
  if (b.charging) {
    ctx.strokeStyle = '#7af0ff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 10;
      ctx.moveTo(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8);
      ctx.lineTo(hx + Math.cos(a + 0.3) * 13, hy + Math.sin(a + 0.3) * 13);
    }
    ctx.stroke();
  }
}

/** La Gran Mancha: el derrame con cara. Más chica y clara a medida que la limpiás. */
function granMancha(ctx, b, t, y) {
  const k = b.hp / b.maxHp; // 1 = entera
  const cx = b.x + b.w / 2;
  const base = y + b.h;
  const w = b.w * (0.7 + 0.3 * k);
  const h = b.h * (0.65 + 0.35 * k);
  const g = ctx.createLinearGradient(cx - w / 2, base - h, cx + w / 2, base);
  const dark = b.phase === 3 ? '#2a2438' : '#120f1a';
  g.addColorStop(0, b.hurt > 0 ? '#ffffff' : dark);
  g.addColorStop(0.5, b.phase === 1 ? '#2a2040' : '#4a5a70');
  g.addColorStop(0.65, '#3e6f78');
  g.addColorStop(0.8, '#6a4a8a');
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.quadraticCurveTo(cx - w / 2 - 6, base - h * 0.7, cx - w * 0.2, base - h);
  ctx.quadraticCurveTo(cx + Math.sin(t * 2) * 4, base - h - 6, cx + w * 0.25, base - h + 2);
  ctx.quadraticCurveTo(cx + w / 2 + 6, base - h * 0.6, cx + w / 2, base);
  for (let x = w / 2; x >= -w / 2; x -= 8) {
    ctx.quadraticCurveTo(cx + x - 4, base + 3 + Math.sin(t * 4 + x) * 1.5, cx + x - 8, base);
  }
  ctx.closePath();
  ctx.fill();
  // Brillo iridiscente.
  ctx.strokeStyle = 'rgba(150,220,230,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx - 4, base - h * 0.7, w * 0.3, h * 0.15, -0.2, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  const ey = base - h * 0.6;
  eyes(ctx, cx - 9, cx + 9, ey, 4.5 * (0.7 + 0.3 * k), b.phase, b.hurt > 0, t);
  ctx.strokeStyle = b.phase === 3 ? '#ffb08a' : '#ff4a3a';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (b.mode === 'flee') ctx.arc(cx, ey + 12, 5, Math.PI * 0.1, Math.PI * 0.9);
  else ctx.arc(cx, ey + 16, 8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/** El caño viejo de la arena final, a la derecha. */
export function drawPipe(ctx, t, hud) {
  const x = 256 - 8; const y = hud + 200 - 16;
  ctx.fillStyle = '#3a3a34';
  ctx.fillRect(x - 10, y - 10, 18, 20);
  ctx.fillStyle = '#4a4a44';
  ctx.fillRect(x - 10, y - 10, 18, 4);
  ctx.fillStyle = '#2a2a26';
  ctx.beginPath();
  ctx.ellipse(x - 10, y, 4, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0c0a10';
  ctx.beginPath();
  ctx.ellipse(x - 10, y, 2.6, 8, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.6 + i / 5) % 1;
    ctx.fillStyle = `rgba(18,15,26,${0.6 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(x - 14 - k * 20, y - k * 10, 2 + k * 4, 0, TAU);
    ctx.fill();
  }
}

const DRAW = { botellon, redFantasma, capitanLata, enjambre, humareda, espumaMadre, granRueda, floracion, anguilaVoltio, granMancha };

/** @param {number} hud  desplazamiento vertical del playfield (HUD_H) */
export function drawBoss(ctx, b, t, hud) {
  const y = b.y + hud;
  ctx.save();
  if (b.state === 'dying') {
    const k = Math.min(1, b.timer / 120);
    ctx.globalAlpha = 1 - k;
    const cx = b.x + b.w / 2; const cy = y + b.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 30) * 0.08 * (1 - k));
    ctx.scale(1 - k * 0.6, 1 - k * 0.6);
    ctx.translate(-cx, -cy);
  } else if (b.state === 'intro') {
    ctx.globalAlpha = Math.min(1, b.timer / 45);
  }
  // Sombra en el piso.
  ctx.fillStyle = 'rgba(0,10,20,0.25)';
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, hud + 200, b.w * 0.45, 2, 0, 0, TAU);
  ctx.fill();
  (DRAW[b.type] || botellon)(ctx, b, t, y);
  ctx.restore();
}

export function drawBossShots(ctx, shots, t, hud) {
  for (const s of shots) {
    const y = s.y + hud;
    ctx.save();
    ctx.translate(s.x, y);
    if (s.kind === 'gravel') {
      ctx.fillStyle = '#8a8070';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.8, 1.3, t * 5 + s.id, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'spore') {
      const g = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 5);
      g.addColorStop(0, 'rgba(230,255,120,0.95)');
      g.addColorStop(1, 'rgba(160,80,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'vine') {
      ctx.fillStyle = '#3aa05a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.2, 3.6, Math.sin(t * 6 + s.id) * 0.3, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'bolt') {
      ctx.strokeStyle = '#7af0ff';
      ctx.lineWidth = 1.2;
      const a = Math.atan2(s.vy, s.vx);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(-2, -2); ctx.lineTo(1, 1.5); ctx.lineTo(5, 0);
      ctx.stroke();
    } else if (s.kind === 'drop') {
      ctx.fillStyle = '#1a1622';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(3, 0.5, 0, 2.6);
      ctx.quadraticCurveTo(-3, 0.5, 0, -4);
      ctx.fill();
      ctx.fillStyle = 'rgba(106,74,138,0.8)';
      ctx.beginPath();
      ctx.arc(-0.6, 0.4, 0.7, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'ash') {
      ctx.fillStyle = 'rgba(90,85,80,0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6, 1.1, t * 3 + s.id, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,0.7)';
      ctx.beginPath();
      ctx.arc(0.4, 0, 0.5, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'smoke') {
      ctx.fillStyle = 'rgba(40,36,44,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, s.r + Math.sin(t * 8 + s.id) * 0.6, 0, TAU);
      ctx.fill();
    } else if (s.kind === 'foam') {
      ctx.fillStyle = 'rgba(245,245,240,0.92)';
      for (const [x, yy, r] of [[0, 0, s.r], [-2, 1.5, s.r * 0.6], [2.5, 1, s.r * 0.5]]) {
        ctx.beginPath();
        ctx.arc(x, yy, r, 0, TAU);
        ctx.fill();
      }
    } else if (s.kind === 'wave') {
      // Onda de agua sucia que corre por el piso.
      ctx.fillStyle = 'rgba(120,110,80,0.75)';
      ctx.beginPath();
      ctx.moveTo(-6, 3);
      ctx.quadraticCurveTo(-2, -5 - Math.sin(t * 20) * 1, 4 * Math.sign(s.vx || 1), 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,240,220,0.6)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-1, -4, 3 * Math.sign(s.vx || 1), 1);
      ctx.stroke();
    } else if (s.kind === 'can') {
      ctx.rotate(t * 8 + s.id);
      ctx.fillStyle = '#b0b6c0';
      ctx.fillRect(-2.5, -3.5, 5, 7);
      ctx.fillStyle = '#a8483a';
      ctx.fillRect(-2.5, -1, 5, 2.5);
    } else if (s.kind === 'shard') {
      ctx.rotate(t * 12 + s.id);
      ctx.fillStyle = SWARM_COLORS[s.id % SWARM_COLORS.length];
      ctx.fillRect(-2, -1.4, 4, 2.8);
    } else if (s.kind === 'sinker') {
      // Plomada de pesca.
      ctx.fillStyle = '#6a707a';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(3.4, 1, 0, 3.6);
      ctx.quadraticCurveTo(-3.4, 1, 0, -4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,210,200,0.6)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(0, -10);
      ctx.stroke();
    } else {
      // Tapita que gira.
      ctx.rotate(t * 10 + s.id);
      ctx.fillStyle = '#d0402a';
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#8a2014';
      ctx.lineWidth = 0.5;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s.r * 0.6, Math.sin(a) * s.r * 0.6);
        ctx.lineTo(Math.cos(a) * s.r, Math.sin(a) * s.r);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
