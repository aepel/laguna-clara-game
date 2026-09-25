// Controles táctiles de Laguna Clara (solo mobile, un jugador: Nilo).
// Traduce toques a las mismas teclas que ya escucha src/input/keys.js y
// src/main.js, y le pide al juego los textos táctiles (i18n, plataforma 'touch').

import { setPlatform, toggleLang, getLang } from '../../src/i18n.js';

// --- Teclas sintéticas -------------------------------------------------------

function capture(el, id) {
  try { el.setPointerCapture(id); } catch { /* puntero ya liberado */ }
}
function key(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}
function tap(code) { key(code, true); key(code, false); }

// --- Audio -------------------------------------------------------------------
// El juego crea el AudioContext con el primer keydown, que acá llega desde un
// touchstart; iOS solo lo deja sonar tras un toque completo. Se guardan los
// contextos creados y se reanudan al levantar el dedo.

const contexts = [];
for (const name of ['AudioContext', 'webkitAudioContext']) {
  const AC = window[name];
  if (!AC) continue;
  window[name] = class extends AC {
    constructor(...args) { super(...args); contexts.push(this); }
  };
}
function resumeAudio() {
  for (const c of contexts) if (c.state !== 'running') c.resume().catch(() => {});
}
window.addEventListener('touchend', resumeAudio, { passive: true });
window.addEventListener('pointerup', resumeAudio, { passive: true });

// --- Textos en pantalla --------------------------------------------------------
// El juego pide los textos táctiles (tocá, botones) en vez de los de teclado.

setPlatform('touch');

// --- Controles -----------------------------------------------------------------

const pad = document.getElementById('pad');
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');
const PLAY_MODES = new Set(['playing', 'paused', 'levelClear']);
const mode = () => window.__bb?.state?.mode;
const scene = () => window.__bb?.scene;
const hasZones = () => { try { return Number(localStorage.getItem('lagunaClara.unlockedZone')) > 0; } catch { return false; } };

/** Un botón que mantiene apretada una tecla mientras el dedo esté encima. */
function holdButton(el, code) {
  const up = (e) => {
    if (!el.classList.contains('on')) return;
    el.classList.remove('on');
    key(code, false);
    e.preventDefault();
  };
  el.addEventListener('pointerdown', (e) => {
    capture(el, e.pointerId);
    el.classList.add('on');
    key(code, true);
    e.preventDefault();
  });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}
holdButton(document.getElementById('jump'), 'ArrowUp');
holdButton(document.getElementById('fire'), 'Space');

// ♪ música y FX efectos: el juego guarda el estado; el botón se tacha si está apagado.
const SOUND = { mute: ['KeyM', 'lagunaClara.music'], fx: ['KeyN', 'lagunaClara.sfx'] };
function syncSound() {
  for (const [id, [, store]] of Object.entries(SOUND)) {
    let off = false;
    try { off = localStorage.getItem(store) === '0'; } catch { /* sin storage */ }
    document.getElementById(id).classList.toggle('off', off);
  }
}
for (const [id, code] of [['pause', 'KeyP'], ['mute', 'KeyM'], ['fx', 'KeyN']]) {
  document.getElementById(id).addEventListener('pointerdown', (e) => { e.preventDefault(); tap(code); syncSound();

// Idioma: solo en el título.
const langBtn = document.getElementById('lang');
const showLang = () => { langBtn.textContent = getLang() === 'es' ? 'EN' : 'ES'; };
langBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleLang(); showLang(); });
showLang(); });
}
syncSound();

// Joystick: izquierda / derecha para nadar, arriba del todo también salta.
const RADIUS = 44;
const DEAD_X = 16;
const JUMP_Y = -32;
const held = { ArrowLeft: false, ArrowRight: false, ArrowUp: false };
let stickId = null;

function setHeld(code, on) {
  if (held[code] === on) return;
  held[code] = on;
  key(code, on);
}
function moveStick(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy);
  if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  setHeld('ArrowLeft', dx < -DEAD_X);
  setHeld('ArrowRight', dx > DEAD_X);
  setHeld('ArrowUp', dy < JUMP_Y);
}
function releaseStick() {
  stickId = null;
  stick.classList.remove('on');
  knob.style.transform = '';
  for (const code of Object.keys(held)) setHeld(code, false);
}
stick.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  capture(stick, e.pointerId);
  stick.classList.add('on');
  moveStick(e);
  e.preventDefault();
});
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);
stick.addEventListener('lostpointercapture', releaseStick);

// Toque en cualquier otro lado: avanza las pantallas de fuera del juego.
// En el título, tocar a la izquierda o derecha del centro cambia de zona.
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('#pad > *')) return;
  const m = mode();
  if (scene() !== 'game') { tap('Enter'); return; }
  if (m === 'title') {
    const third = window.innerWidth / 3;
    if (hasZones() && e.clientX < third) tap('ArrowLeft');
    else if (hasZones() && e.clientX > 2 * third) tap('ArrowRight');
    else tap('Digit1');
    return;
  }
  if (m === 'gameOver' || m === 'victory') tap('Digit1');
});

// Mostrar los controles de juego solo mientras se juega.
function syncPad() {
  const playing = scene() === 'game' && PLAY_MODES.has(mode());
  pad.classList.toggle('titled', scene() === 'game' && mode() === 'title');
  pad.classList.toggle('hidden', !playing);
  if (!playing && stickId === null) releaseStick();
  requestAnimationFrame(syncPad);
}
requestAnimationFrame(syncPad);

// Si la app pasa a segundo plano, se sueltan las teclas y se pausa.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  releaseStick();
  if (mode() === 'playing') tap('KeyP');
});
