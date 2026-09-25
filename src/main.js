import { createGame, step } from './core/game.js';
import { FPS } from './core/constants.js';
import { LEVELS } from './data/levels.js';
import { LEVELS_PER_ZONE } from './data/zones.js';
import { createRenderer } from './render/hd/index.js';
import { createAudio } from './audio/lagoon.js';
import { createInput } from './input/keys.js';
import { createIntro } from './render/hd/intro.js';
import { getLang, setLang, toggleLang } from './i18n.js';

const STEP_MS = 1000 / FPS;
const MAX_STEPS_PER_FRAME = 5;

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(window);

setLang(getLang()); // fija <html lang> con el idioma elegido

const newSeed = () => (Date.now() & 0x7fffffff) || 1;
let state = createGame({ levels: LEVELS, seed: newSeed() });

// Autoplay policy: the AudioContext can only start after a user gesture.
window.addEventListener('keydown', () => audio.unlock(), { once: true });

// Música (M) y efectos (N) se apagan por separado y se recuerdan.
const MUSIC_KEY = 'lagunaClara.music';
const SFX_KEY = 'lagunaClara.sfx';
audio.setMusicOn(storageGet(MUSIC_KEY) !== '0');
audio.setSfxOn(storageGet(SFX_KEY) !== '0');
const showSound = () => renderer.setMeta({ musicOn: audio.musicOn, sfxOn: audio.sfxOn });
input.onKey('KeyM', () => { audio.setMusicOn(!audio.musicOn); storageSet(MUSIC_KEY, audio.musicOn ? '1' : '0'); showSound(); });
input.onKey('KeyN', () => { audio.setSfxOn(!audio.sfxOn); storageSet(SFX_KEY, audio.sfxOn ? '1' : '0'); showSound(); });

// Intro: la primera vez se muestra una pantalla previa (que habilita el audio
// con la primera tecla) y después la historia. Desde el título, I la repite.
const INTRO_KEY = 'lagunaClara.introSeen';
const intro = createIntro();
let scene = storageGet(INTRO_KEY) ? 'game' : 'splash';

function storageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* sin storage: se repite */ } }

// Progreso por zona: se guarda la zona más honda alcanzada y desde el título
// se puede arrancar al inicio de cualquier zona desbloqueada (← →).
const ZONE_KEY = 'lagunaClara.unlockedZone';
let unlockedZone = Number(storageGet(ZONE_KEY)) || 0;
let selectedZone = unlockedZone;
renderer.setMeta({ unlockedZone });
showSound();
state = createGame({ levels: LEVELS, seed: newSeed(), startLevel: selectedZone * LEVELS_PER_ZONE });

function selectZone(delta) {
  const z = Math.max(0, Math.min(unlockedZone, selectedZone + delta));
  if (z === selectedZone) return;
  selectedZone = z;
  state = createGame({ levels: LEVELS, seed: newSeed(), startLevel: z * LEVELS_PER_ZONE });
}

function saveProgress() {
  const z = Math.floor(state.levelIndex / LEVELS_PER_ZONE);
  if (state.mode === 'playing' && z > unlockedZone) {
    unlockedZone = z;
    selectedZone = z;
    storageSet(ZONE_KEY, String(z));
    renderer.setMeta({ unlockedZone });
  }
}

window.addEventListener('keydown', (e) => {
  if (scene === 'splash') { scene = 'intro'; intro.restart(); return; }
  if (scene === 'game' && state.mode === 'title') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') selectZone(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') selectZone(1);
  }
  if (scene === 'intro' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) intro.skip();
  else if (scene === 'game' && state.mode === 'title' && e.code === 'KeyI') { scene = 'intro'; intro.restart(); }
  else if (scene === 'game' && state.mode === 'title' && e.code === 'KeyL') toggleLang();
});

// After game over / victory, a start key begins a fresh game with a new seed.
function restartIfFinished(frameInput) {
  if ((state.mode === 'gameOver' || state.mode === 'victory') && state.modeTimer > 60
      && (frameInput.start1 || frameInput.start2)) {
    state = createGame({ levels: LEVELS, seed: newSeed(), startLevel: selectedZone * LEVELS_PER_ZONE });
  }
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = now - last;
  last = now;

  if (scene !== 'game') {
    if (scene === 'intro') {
      intro.update(Math.min(dt, 100) / 1000);
      audio.update({ mode: 'title' }, intro.clean);
      if (intro.done) { scene = 'game'; storageSet(INTRO_KEY, '1'); }
    }
    renderer.drawIntro(intro, scene === 'splash');
    requestAnimationFrame(frame);
    return;
  }

  acc += dt;

  let steps = 0;
  while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
    const frameInput = input.read();
    restartIfFinished(frameInput);
    step(state, frameInput);
    renderer.step(state);
    audio.handle(state.events);
    audio.update(state);
    saveProgress();
    acc -= STEP_MS;
    steps++;
  }
  // Drop backlog (e.g. after the tab was hidden) instead of spiralling.
  if (steps === MAX_STEPS_PER_FRAME) acc = 0;

  renderer.draw(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Debug hook for playtesting from the devtools console.
window.__bb = {
  get state() { return state; },
  /** 'splash' | 'intro' | 'game' */
  get scene() { return scene; },
  startAt(levelIndex) { state = createGame({ levels: LEVELS, seed: newSeed(), startLevel: levelIndex }); },
};
