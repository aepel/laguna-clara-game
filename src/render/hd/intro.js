// Intro de Laguna Clara: 6 viñetas animadas (storyboard aprobado), unos 45 s.
// Todo se dibuja en función del tiempo, sin estado de simulación, así que el
// módulo se puede borrar sin tocar nada más que main.js.

import { SCREEN_W, SCREEN_H } from '../../core/constants.js';
import { FONT } from './fx.js';
import { t as tx } from '../../i18n.js';
import { smoothstep, clamp01 } from './color.js';
import { water, rays, seabed, risingBubbles, motes, oilStain, pipe, title } from './scenery.js';
import { drawHero } from './heroes.js';
import { drawEnemy } from './enemies.js';
import { drawBubble, drawPickup } from './items.js';
import { drawAnimal } from './animals.js';

const TAU = Math.PI * 2;
const W = SCREEN_W;
const H = SCREEN_H;
const FADE = 0.6;
// Las viñetas se compusieron para 256 px de ancho: el fondo ocupa toda la
// pantalla y los personajes se centran corridos OX.
const OX = (W - 256) / 2;

// [duración en s, clave del texto (i18n), limpieza del agua para la música]
const PANELS = [
  [7, 'intro.1', 1],
  [7, 'intro.2', 0.5],
  [7, 'intro.3', 0],
  [6, 'intro.4', 0],
  [6.5, 'intro.5', 0.6],
  [9, 'intro.6', 0.3],
];
const TOTAL = PANELS.reduce((a, p) => a + p[0], 0);

const hero = (id, facing, extra = {}) => ({ id, facing, onGround: true, anim: 'idle', state: 'alive', invuln: 0, vy: 0, ...extra });
const cos = (face, extra = {}) => ({ face, s: 0, blinkT: 0, shoot: 0, phase: face > 0 ? 0 : 1.3, ...extra });

// ---------- viñetas ----------

function panel1(ctx, t) {
  water(ctx, 1);
  rays(ctx, t, 1);
  seabed(ctx, t, 1);
  // Peces amigos.
  for (let i = 0; i < 3; i++) {
    const x = ((t * (14 + i * 5) + i * 90) % (W + 40)) - 20;
    ctx.save();
    ctx.translate(x, 40 + i * 26);
    drawAnimal(ctx, ['zen', 'pulpul', 'monsta'][i], t + i, 1);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(OX, 0);
  const hop = Math.abs(Math.sin(t * 2.4)) * 10;
  drawHero(ctx, hero(1, 1, { onGround: hop < 1 }), cos(1, { s: hop < 1.5 ? -0.15 : 0.1 }), t, 88, 150 - hop);
  drawHero(ctx, hero(2, -1), cos(-1, { shoot: Math.sin(t * 3) > 0.6 ? 1 : 0 }), t, 150, 150);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.4 + i / 3) % 1;
    drawBubble(ctx, { phase: 'float', ownerId: 2 }, { s: 0, phase: i }, t, 146 - k * 30, 150 - k * 110);
  }
  ctx.restore();
  risingBubbles(ctx, t, 18);
  motes(ctx, t, 1);
}

function panel2(ctx, t, dur) {
  const k = clamp01(t / dur);
  const clean = 1 - k * 0.7;
  water(ctx, clean);
  rays(ctx, t, clean * 0.8);
  seabed(ctx, t, clean);
  oilStain(ctx, t, k);
  ctx.save();
  ctx.translate(OX, 0);
  for (let i = 0; i < 3; i++) {
    const y = -20 + ((t * 12 + i * 40) % 140);
    drawEnemy(ctx, { type: 'monsta', state: 'walk', facing: 1 }, null, t + i, 40 + i * 50, y);
  }
  drawEnemy(ctx, { type: 'pulpul', state: 'walk', facing: 1 }, null, t, 150, 30 + k * 60);
  drawHero(ctx, hero(1, 1), cos(1, { blinkT: 0 }), t, 50, 160);
  drawHero(ctx, hero(2, 1), cos(1), t, 74, 162);
  ctx.restore();
  motes(ctx, t, clean);
}

function panel3(ctx, t, dur) {
  const k = smoothstep(1.5, dur - 2, t);
  water(ctx, 0);
  seabed(ctx, t, 0);
  motes(ctx, t, 0);
  ctx.save();
  ctx.translate(OX, 0);
  const x = 130 + Math.sin(t * 0.8) * 10;
  // El pez amigo queda cubierto de petróleo.
  ctx.save();
  ctx.translate(x, 100);
  ctx.scale(1.8, 1.8);
  ctx.globalAlpha = 1 - k;
  drawAnimal(ctx, 'zen', t, -1);
  ctx.globalAlpha = k;
  drawEnemy(ctx, { type: 'zen', state: k > 0.8 ? 'angry' : 'walk', facing: -1 }, null, t, 0, 0);
  ctx.restore();
  drawEnemy(ctx, { type: 'mighta', state: 'walk', facing: 1 }, null, t, 50, 184);
  drawEnemy(ctx, { type: 'pulpul', state: 'walk', facing: 1 }, null, t, 210, 60);
  ctx.restore();
}

function panel4(ctx, t, dur) {
  water(ctx, 0);
  seabed(ctx, t, 0);
  motes(ctx, t, 0);
  ctx.save();
  ctx.translate(OX, 0);
  const shootAt = 1.8;
  const k = smoothstep(shootAt, shootAt + 1.2, t);
  const crudoX = 190;
  drawHero(ctx, hero(2, 1), cos(1, { shoot: t > shootAt && t < shootAt + 0.4 ? 1 : 0, s: t > shootAt && t < shootAt + 0.2 ? -0.2 : 0 }), t, 40, 140);
  const trapped = k >= 1;
  if (!trapped) drawEnemy(ctx, { type: 'zen', state: 'angry', facing: -1 }, null, t, crudoX, 148);
  if (t > shootAt) {
    const bx = 60 + (crudoX - 60) * k;
    const by = 148 - Math.max(0, t - shootAt - 1.2) * 8;
    ctx.save();
    ctx.translate(bx, by);
    const sc = trapped ? 2.2 : 1 + k * 0.5;
    ctx.scale(sc, sc);
    drawBubble(ctx, { phase: 'float', ownerId: 2, trapped: trapped ? { enemyType: 'zen', timer: 400 } : null }, { s: trapped && t < shootAt + 1.5 ? -0.3 : 0, phase: 0 }, t, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function panel5(ctx, t) {
  const CX = W / 2;
  const popAt = 1.2;
  const k = smoothstep(popAt, popAt + 3, t);
  water(ctx, 0);
  seabed(ctx, t, 0);
  // Círculo de agua limpia que se expande desde la burbuja.
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, 110, 20 + k * W * 0.8, 0, TAU);
  ctx.clip();
  water(ctx, 1);
  rays(ctx, t, k);
  seabed(ctx, t, 1);
  ctx.restore();
  motes(ctx, t, k);
  if (t < popAt) {
    ctx.save();
    ctx.translate(CX, 110);
    ctx.scale(2.2, 2.2);
    drawBubble(ctx, { phase: 'float', ownerId: 2, trapped: { enemyType: 'zen', timer: 400 } }, { s: 0, phase: 0 }, t, 0, 0);
    ctx.restore();
  } else {
    const p = t - popAt;
    // Destellos radiales.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r = 10 + p * 60;
      ctx.fillStyle = `rgba(255,248,192,${Math.max(0, 1 - p)})`;
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a) * r, 110 + Math.sin(a) * r, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(CX + p * 10, 100 - Math.sin(p) * 10);
    ctx.scale(2, 2);
    drawAnimal(ctx, 'zen', t, 1);
    ctx.restore();
    drawPickup(ctx, { kind: 'cria', ttl: 999, onGround: false }, null, t, CX, 130 + Math.min(p, 1.5) * 30);
  }
}

function panel6(ctx, t, dur) {
  const k = smoothstep(0, dur, t);
  // La cámara baja hacia el fondo.
  water(ctx, 0.35, 1);
  motes(ctx, t, 0.2);
  ctx.save();
  ctx.translate(0, -k * 40);
  seabed(ctx, t, 0, 236);
  pipe(ctx, t, W - 76, 220);
  ctx.restore();
  const dive = smoothstep(1, 5, t);
  drawHero(ctx, hero(1, 1, { onGround: false, vy: 1 }), cos(1), t, OX + 40 + dive * 60, 60 + dive * 80);
  drawHero(ctx, hero(2, 1, { onGround: false, vy: 1 }), cos(1), t, OX + 20 + dive * 60, 80 + dive * 80);
  // Logo.
  const logo = smoothstep(4.5, 6.5, t);
  if (logo > 0) {
    ctx.globalAlpha = logo;
    title(ctx, 'Laguna', W / 2, 46, 30, '#ff9ec0');
    title(ctx, 'Clara', W / 2, 74, 30, '#7ee8c8');
    ctx.globalAlpha = 1;
  }
}


const DRAW = [panel1, panel2, panel3, panel4, panel5, panel6];

// ---------- controlador ----------

export function createIntro() {
  let time = 0;
  let done = false;

  function locate() {
    let acc = 0;
    for (let i = 0; i < PANELS.length; i++) {
      if (time < acc + PANELS[i][0]) return { i, local: time - acc, dur: PANELS[i][0] };
      acc += PANELS[i][0];
    }
    return { i: PANELS.length - 1, local: PANELS[PANELS.length - 1][0], dur: PANELS[PANELS.length - 1][0] };
  }

  return {
    get done() { return done; },
    /** Limpieza del agua en la viñeta actual (para la música). */
    get clean() { return PANELS[locate().i][2]; },

    update(dt) {
      if (done) return;
      time += dt;
      if (time >= TOTAL) done = true;
    },
    skip() { done = true; },
    restart() { time = 0; done = false; },

    /** Pantalla previa a la intro: habilita el audio con la primera tecla. */
    drawSplash(ctx, t) {
      water(ctx, 0.7);
      rays(ctx, t, 0.6);
      seabed(ctx, t, 0.7);
      risingBubbles(ctx, t, 16);
      ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.45;
      ctx.font = `700 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eaf6ff';
      ctx.fillText(tx('intro.press'), W / 2, H / 2);
      ctx.globalAlpha = 1;
      ctx.font = `600 5px ${FONT}`;
      ctx.fillStyle = 'rgba(234,246,255,0.6)';
      ctx.fillText(tx('intro.headphones'), W / 2, H / 2 + 14);
    },

    draw(ctx) {
      const { i, local, dur } = locate();
      DRAW[i](ctx, local, dur);

      // Barras de cine y subtítulo.
      ctx.fillStyle = '#02080f';
      ctx.fillRect(0, 0, W, 18);
      ctx.fillRect(0, H - 30, W, 30);
      const textA = smoothstep(0.6, 1.4, local) * (1 - smoothstep(dur - 1, dur - 0.4, local));
      ctx.globalAlpha = textA;
      ctx.font = `italic 600 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#7ee8c8';
      ctx.fillText(`“${tx(PANELS[i][1])}”`, W / 2, H - 16);
      ctx.globalAlpha = 1;
      ctx.font = `600 4.5px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(234,246,255,0.45)';
      ctx.fillText(tx('intro.skip'), W - 6, 9);

      // Fundido entre viñetas.
      const fade = Math.max(1 - smoothstep(0, FADE, local), smoothstep(dur - FADE, dur, local));
      if (fade > 0) {
        ctx.fillStyle = `rgba(2,8,15,${fade})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}
