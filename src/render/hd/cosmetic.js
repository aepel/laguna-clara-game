// Estado cosmético por entidad (squash & stretch, parpadeo, giro suave),
// derivado del estado del core. Nunca escribe en el core.

import { seeded } from './color.js';

const rand = seeded(7);

function spring(c) {
  c.sv += -c.s * 0.28;
  c.sv *= 0.72;
  c.s += c.sv;
}

export function createCosmetics() {
  const map = new Map();
  let tick = 0;

  function get(key, init) {
    let c = map.get(key);
    if (!c) {
      c = { s: 0, sv: 0, face: init.facing || 1, blink: 60 + rand() * 120, blinkT: 0,
        shoot: 0, hurt: 0, prevGround: true, age: 0, seen: 0, phase: rand() * 10 };
      map.set(key, c);
    }
    c.seen = tick;
    return c;
  }

  function stepCommon(c, e) {
    c.age++;
    c.face += ((e.facing || 1) - c.face) * 0.35;
    if (--c.blink <= 0) { c.blinkT = 7; c.blink = 90 + rand() * 180; }
    if (c.blinkT > 0) c.blinkT--;
    if (c.shoot > 0) c.shoot--;
    if (c.hurt > 0) c.hurt--;
    spring(c);
  }

  return {
    step(state) {
      tick++;
      for (const p of state.players) {
        const c = get(`p${p.id}`, p);
        if (!c.prevGround && p.onGround) { c.s = -0.32; c.sv = 0; }        // aterriza: se aplasta
        if (c.prevGround && !p.onGround && p.vy < 0) { c.s = 0.28; c.sv = 0; } // salta: se estira
        c.prevGround = p.onGround;
        stepCommon(c, p);
      }
      for (const e of state.enemies) {
        const c = get(`e${e.id}`, e);
        if (!c.prevGround && e.onGround) { c.s = -0.25; c.sv = 0; }
        c.prevGround = e.onGround;
        stepCommon(c, e);
      }
      for (const b of state.bubbles) {
        const c = get(`b${b.id}`, b);
        if (c.age === 0) { c.s = 0.4; c.sv = 0; } // nace estirada y rebota
        if (b.trapped && !c.trapped) { c.s = -0.35; c.sv = 0; } // se deforma al envolver
        c.trapped = !!b.trapped;
        stepCommon(c, b);
      }
      for (const f of state.fruits) stepCommon(get(`f${f.id}`, f), f);
      for (const [k, c] of map) if (c.seen !== tick) map.delete(k);
    },

    onEvent(ev) {
      if (ev.type === 'shoot' && ev.playerId) {
        const c = map.get(`p${ev.playerId}`);
        if (c) { c.shoot = 12; c.s = -0.15; }
      } else if (ev.type === 'playerHit' && ev.playerId) {
        const c = map.get(`p${ev.playerId}`);
        if (c) c.hurt = 90;
      }
    },

    of(key) { return map.get(key); },
    clear() { map.clear(); },
  };
}
