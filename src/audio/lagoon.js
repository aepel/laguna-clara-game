// Audio de Laguna Clara: efectos orgánicos y acuáticos + música adaptativa por
// capas que se abre a medida que se limpia el nivel. Todo sintetizado con
// Web Audio, sin archivos. Misma API que audio/sfx.js más update(state).
// Se puede importar en Node: nada toca `window` hasta unlock().

import { cleanliness } from '../shared/cleanliness.js';
import { createMusic } from './music.js';
import { LEVELS_PER_ZONE } from '../data/zones.js';

const MASTER = 0.8;
const PENTA = [0, 2, 4, 7, 9]; // pentatónica mayor de Re
const note = (deg, oct = 4) => {
  const n = PENTA[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5);
  return 293.66 * Math.pow(2, (n + 12 * (oct - 4)) / 12);
};

export function createAudio() {
  let ctx = null;
  let master; let murk; let dry; let wet; let musicBus; let sfx; let noiseBuf;
  let muted = false;
  let musicOn = true;
  let sfxOn = true;
  let tracks = null; // motor de temas (music.js)
  const played = new Set();
  const streak = { 1: { n: 0, at: -9 }, 2: { n: 0, at: -9 } };
  const music = { clean: 0, mode: 'title', holdUntil: 0, level: -1, milestone: 0, lastOne: false, jingleAt: -1 };

  // ---------- bloques de síntesis ----------
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, t, dur, peak, dest = sfx, a = 0.005) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a, peak, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + dur + 0.05);
  }
  function nz(t, dur, peak, type, f, q = 1, f1) {
    const s = ctx.createBufferSource(); const fl = ctx.createBiquadFilter(); const g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(sfx);
    s.start(t); s.stop(t + dur + 0.05);
  }
  const kalimba = (f, t, peak = 0.25, dec = 1.1, dest = sfx) => {
    tone('sine', f, 0, t, dec, peak, dest);
    tone('sine', f * 5.4, 0, t, 0.12, peak * 0.25, dest);
    tone('triangle', f * 2, 0, t, 0.3, peak * 0.15, dest);
  };
  const marimba = (f, t, peak = 0.3, dest = sfx) => {
    tone('sine', f, 0, t, 0.6, peak, dest);
    tone('sine', f * 4, 0, t, 0.08, peak * 0.3, dest);
  };
  const bell = (f, t, peak = 0.12, dest = sfx) => {
    tone('sine', f, 0, t, 1.8, peak, dest);
    tone('sine', f * 2.76, 0, t, 0.9, peak * 0.4, dest);
    tone('sine', f * 5.4, 0, t, 0.4, peak * 0.2, dest);
  };
  const bubble = (f0, f1, t, dur, peak) => tone('sine', f0, f1, t, dur, peak, sfx, 0.003);

  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec; const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  // ---------- efectos ----------
  // Notas en la tonalidad y el acorde del tema que suena (música y efectos riman).
  const nt = (deg, oct) => (tracks ? tracks.note(deg, oct) : note(deg, oct));

  const SFX = {
    jump(t) { bubble(220, 520, t, 0.14, 0.35); nz(t, 0.08, 0.05, 'bandpass', 900, 3, 2000); },
    shoot(t, ev) {
      if (ev.playerId === 2) { // Lirio: ráfaga aguda
        bubble(520, 1200, t, 0.06, 0.35); bubble(700, 1500, t + 0.045, 0.05, 0.25); bubble(600, 1300, t + 0.09, 0.05, 0.18);
      } else { // Nilo: burbuja grave y grande
        bubble(160, 420, t, 0.16, 0.5); bubble(300, 700, t + 0.05, 0.07, 0.15); nz(t, 0.12, 0.06, 'bandpass', 500, 4, 1200);
      }
    },
    trap(t) {
      const o = ctx.createOscillator(); const l = ctx.createOscillator(); const lg = ctx.createGain(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 330; l.frequency.value = 14; lg.gain.value = 40;
      l.connect(lg); lg.connect(o.frequency); env(g, t, 0.01, 0.3, 0.35); o.connect(g); g.connect(sfx);
      o.start(t); l.start(t); o.stop(t + 0.45); l.stop(t + 0.45);
      tone('sine', 1320, 1760, t + 0.05, 0.3, 0.05);
    },
    pop(t) { tone('sine', 1500, 280, t, 0.05, 0.45, sfx, 0.001); nz(t, 0.02, 0.12, 'highpass', 3000); },
    popEnemy(t, ev) {
      const combo = Math.min(ev.combo || 1, 6);
      SFX.pop(t);
      for (let i = 0; i < 3 + combo; i++) kalimba(nt(combo + i * 2, 4), t + 0.04 + i * 0.07, 0.2, 0.8);
      for (let i = 0; i < 6; i++) tone('sine', 2500 + Math.random() * 2500, 0, t + 0.1 + i * 0.03, 0.15, 0.03);
    },
    escape(t) { nz(t, 0.5, 0.25, 'lowpass', 200, 6, 900); tone('sawtooth', 70, 110, t, 0.45, 0.08); tone('sawtooth', 73, 105, t, 0.45, 0.06); },
    fruitSpawn(t) { marimba(nt(4, 5), t, 0.18); nz(t, 0.03, 0.05, 'bandpass', 1800, 5); },
    fruitCollect(t, ev) {
      // Cada recolección seguida (en menos de 1,5 s) sube un escalón.
      const s = streak[ev.playerId] || streak[1];
      s.n = t - s.at < 1.5 ? Math.min(s.n + 1, 7) : 0;
      s.at = t;
      kalimba(nt(5 + s.n, 4), t, 0.28, 1);
      tone('sine', nt(5 + s.n, 6), 0, t + 0.03, 0.5, 0.04);
    },
    playerHit(t) { tone('sine', 180, 60, t, 0.35, 0.6); nz(t, 0.25, 0.2, 'lowpass', 600, 1, 150); tone('triangle', 440, 220, t + 0.05, 0.3, 0.08); },
    regenerate(t) { for (let i = 0; i < 8; i++) tone('sine', nt(i, 4), 0, t + i * 0.06, 0.5, 0.07, sfx, 0.02); },
    levelStart(t) { nz(t, 0.9, 0.12, 'bandpass', 300, 1, 1500); },
    levelClear(t) {
      [0, 2, 4, 5].forEach((d, i) => tone('sine', nt(d, 3), 0, t, 2.4, 0.08, sfx, 0.5 + i * 0.1));
      for (let i = 0; i < 8; i++) kalimba(nt(i, 4), t + 0.3 + i * 0.08, 0.18, 0.9);
      bell(nt(10, 4), t + 1, 0.12);
    },
    gameOver(t) { [7, 5, 4, 2, 0].forEach((d, i) => marimba(nt(d, 3), t + i * 0.28, 0.22)); tone('sine', nt(0, 2), 0, t + 1.2, 1.8, 0.15, sfx, 0.3); },
    bossHit(t, ev) {
      tone('sine', 140, 70, t, 0.18, 0.4);
      if (ev.amount > 1) { SFX.popEnemy(t, { combo: 3 }); nz(t, 0.3, 0.18, 'lowpass', 400, 2, 120); }
    },
    bossShot(t) { bubble(300, 120, t, 0.12, 0.25); nz(t, 0.05, 0.08, 'bandpass', 700, 4); },
    armorBlock(t) { tone('triangle', 900, 600, t, 0.1, 0.12); },
    enemyZap(t) { nz(t, 0.18, 0.18, 'highpass', 2500); tone('sawtooth', 1200, 300, t, 0.15, 0.05); },
    enemySprout(t) { tone('sine', 300, 600, t, 0.12, 0.08); },
    enemyDrop(t) { tone('sine', 500, 150, t, 0.25, 0.12); },
    enemySplit(t) { bubble(400, 900, t, 0.08, 0.2); bubble(500, 1100, t + 0.05, 0.08, 0.15); },
    bossHeal(t) { tone('sawtooth', 110, 60, t, 0.8, 0.1); nz(t, 0.8, 0.15, 'lowpass', 300, 3, 100); },
    bossBlock(t) { tone('triangle', 1800, 1200, t, 0.12, 0.12); tone('sine', 2600, 0, t, 0.2, 0.05); },
    bossSpawn(t) { nz(t, 0.35, 0.15, 'lowpass', 250, 5, 700); },
    bossDefeated(t) { nz(t, 1.5, 0.2, 'lowpass', 120, 1, 3000); },
    victory(t) {
      [0, 2, 4, 5, 7].forEach((d) => tone('triangle', nt(d, 3), 0, t, 3, 0.05, sfx, 0.3));
      [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => bell(nt(d, 5), t + i * 0.12, 0.1));
      for (let i = 0; i < 5; i++) kalimba(nt(i * 2, 4), t + 1 + i * 0.1, 0.2);
    },
  };

  // ---------- música adaptativa ----------
  // Los temas viven en music.js; acá se decide qué suena según el estado:
  // tema de la zona, tensión en el nivel previo al jefe, entrada y fases del
  // jefe, y el remate al vencerlo.
  const PRE_BOSS = LEVELS_PER_ZONE - 2;

  // Premios sonoros de un nivel común: cada capa que se abre suena como un
  // logro, avisa cuando queda un solo enemigo y toca el motivo de la zona al
  // empezar el nivel.
  function rewards(state, clean) {
    if (music.level !== state.levelIndex) {
      music.level = state.levelIndex; music.milestone = 0; music.lastOne = false;
      if (sfxOn) tracks.jingle(false);
    }
    const reached = clean >= 1 ? 4 : clean >= 0.75 ? 3 : clean >= 0.5 ? 2 : clean >= 0.25 ? 1 : 0;
    if (reached > music.milestone) {
      music.milestone = reached;
      if (sfxOn) tracks.milestone(reached);
    }
    const left = state.enemies.filter((e) => e.state !== 'dying' && e.state !== 'trapped').length;
    const total = state.level?.spawns?.enemies?.length || 0;
    if (!music.lastOne && total >= 3 && left === 1) {
      music.lastOne = true;
      if (sfxOn) tracks.lastOne();
    }
  }

  function followState(state, clean) {
    const t = ctx.currentTime;
    tracks.setClean(clean);
    if (t < music.holdUntil) return;
    const b = state.boss;
    if (b && b.state !== 'dying') {
      if (tracks.current?.key !== b.type) tracks.playBoss(b.type);
      tracks.setPhase(b.phase || 1);
      tracks.setTension(0);
      return;
    }
    const idx = state.levelIndex || 0;
    const zone = state.mode === 'victory' ? 0 : Math.floor(idx / LEVELS_PER_ZONE);
    tracks.playZone(zone);
    if (state.mode === 'playing') rewards(state, clean);
    // Nivel anterior al jefe: la tensión crece a medida que se limpia.
    const pre = state.mode === 'playing' && idx % LEVELS_PER_ZONE === PRE_BOSS;
    tracks.setTension(pre ? 0.2 + 0.6 * clean : 0);
  }

  const levelFor = (mode) => (mode === 'paused' ? 0.35 : mode === 'gameOver' ? 0 : 1);

  function setMusicMode(mode) {
    if (mode === music.mode) return;
    music.mode = mode;
    const t = ctx.currentTime;
    // En pausa baja la música; en game over se apaga el ambiente.
    musicBus.gain.setTargetAtTime(musicOn ? levelFor(mode) : 0, t, 0.4);
  }

  function setClean(v) {
    music.clean = v;
    const t = ctx.currentTime;
    murk.frequency.setTargetAtTime(1200 * Math.pow(15, v), t, 0.3); // 1,2 kHz → 18 kHz
    wet.gain.setTargetAtTime(0.55 - 0.25 * v, t, 0.3);
    dry.gain.setTargetAtTime(0.7 + 0.3 * v, t, 0.3);
  }

  return {
    unlock() {
      if (ctx || typeof window === 'undefined') return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3;
      master = ctx.createGain(); master.gain.value = muted ? 0 : MASTER;
      murk = ctx.createBiquadFilter(); murk.type = 'lowpass'; murk.Q.value = 0.7;
      dry = ctx.createGain(); wet = ctx.createGain();
      const verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.2);
      musicBus = ctx.createGain(); musicBus.gain.value = 1;
      musicBus.connect(master);
      master.connect(murk); murk.connect(dry); murk.connect(verb); verb.connect(wet);
      dry.connect(comp); wet.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      sfx = ctx.createGain(); sfx.gain.value = sfxOn ? 1 : 0; sfx.connect(master);
      musicBus.gain.value = musicOn ? 1 : 0;
      tracks = createMusic(ctx, musicBus);
      setClean(0.6);
      setInterval(() => tracks.update(), 50);
    },

    handle(events) {
      if (!ctx) return;
      played.clear();
      if (!events || events.length === 0) return;
      const t = ctx.currentTime;
      for (const ev of events) {
        if (played.has(ev.type)) continue; // 1 sonido por tipo por frame
        played.add(ev.type);
        if (ev.type === 'bossIntro') { tracks.bossEntrance(ev.boss); music.holdUntil = t + 3.4; }
        if (ev.type === 'bossDefeated') { tracks.bossDefeated(); music.holdUntil = t + 4.5; }
        if (ev.type === 'levelClear' && sfxOn) tracks.jingle(true);
        const fn = SFX[ev.type];
        if (fn) fn(t, ev);
      }
    },

    /**
     * Una vez por paso: la música sigue el modo y la limpieza del nivel.
     * `cleanOverride` permite que la intro fije el ánimo de cada viñeta.
     */
    update(state, cleanOverride) {
      if (!ctx) return;
      setMusicMode(state.mode);
      const target = cleanOverride ?? (state.mode === 'title' ? 0.6 : state.mode === 'victory' ? 1 : cleanliness(state));
      if (Math.abs(target - music.clean) > 0.01) setClean(music.clean + (target - music.clean) * 0.05);
      followState(state, music.clean);
    },

    setMuted(b) {
      muted = b;
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
    },

    /** Música y efectos se apagan por separado. */
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; },
    setMusicOn(on) {
      musicOn = on;
      if (ctx) musicBus.gain.setTargetAtTime(on ? levelFor(music.mode) : 0, ctx.currentTime, 0.1);
    },
    setSfxOn(on) {
      sfxOn = on;
      if (sfx) sfx.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
    },
  };
}
