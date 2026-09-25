// Saca las capturas del README con Electron (sin ventana visible):
//   npm run screenshots
// Carga el juego ya compilado (dist/ y mobile/www/), prepara cada escena con
// el hook de depuración window.__bb y guarda JPEG en docs/screenshots/.

import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'screenshots');
const DESKTOP = pathToFileURL(join(root, 'index.html')).href;
const MOBILE = pathToFileURL(join(root, 'mobile', 'www', 'index.html')).href;

// Arranca una partida de un jugador en el nivel `n` (0-based).
const start = (n) => `__bb.startAt(${n});
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit1' }));`;
// Deja solo `keep` enemigos: el agua se ve casi limpia.
const clearMost = (keep) => `__bb.state.enemies.splice(${keep});`;
// Nilo tira burbujas cada tanto mientras se espera.
const shootEvery = (ms) => `setInterval(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 60);
}, ${ms});`;

const SHOTS = [
  { name: 'title-es', lang: 'es', setup: '', wait: 1200 },
  { name: 'title-en', lang: 'en', setup: '', wait: 1200 },
  { name: 'gameplay-dirty', lang: 'es', setup: start(12) + shootEvery(700), wait: 4200 },
  { name: 'gameplay-clean', lang: 'en', setup: start(31) + shootEvery(500), after: clearMost(2), afterWait: 2500, wait: 3500 },
  { name: 'boss', lang: 'es', setup: start(29) + shootEvery(400), wait: 6500 },
  { name: 'intro', lang: 'en', intro: true, setup: `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));`, wait: 3200 },
  { name: 'ending', lang: 'es', setup: start(0) + `setTimeout(() => { const s = __bb.state; s.mode = 'victory'; s.modeTimer = 60 * 25; s.rescued = 48; }, 300);`, wait: 1500 },
  {
    name: 'mobile', lang: 'es', url: MOBILE, size: [844, 390],
    setup: `document.body.dispatchEvent(new PointerEvent('pointerdown', { clientX: 400, clientY: 120, bubbles: true }));` + shootEvery(800),
    wait: 4500,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(shot) {
  const [w, h] = shot.size || [1344, 672];
  const win = new BrowserWindow({
    width: w, height: h, show: false, useContentSize: true,
    webPreferences: { offscreen: true, contextIsolation: true },
  });
  win.webContents.setFrameRate(60);
  // Primero se fijan idioma e intro en el storage y después se carga de nuevo.
  const url = shot.url || DESKTOP;
  await win.loadURL(url);
  await win.webContents.executeJavaScript(`
    localStorage.setItem('lagunaClara.lang', '${shot.lang}');
    ${shot.intro ? "localStorage.removeItem('lagunaClara.introSeen');" : "localStorage.setItem('lagunaClara.introSeen', '1');"}
    localStorage.setItem('lagunaClara.music', '${shot.url ? 1 : 0}');
    localStorage.setItem('lagunaClara.sfx', '${shot.url ? 1 : 0}');
    localStorage.setItem('lagunaClara.unlockedZone', '0');
    0;`);
  await win.loadURL(url);
  await sleep(800);
  await win.webContents.executeJavaScript(shot.setup || '0');
  if (shot.after) {
    await sleep(shot.afterWait);
    await win.webContents.executeJavaScript(shot.after);
  }
  await sleep(shot.wait);
  const img = (await win.webContents.capturePage()).resize({ width: Math.min(w, 1120), quality: 'best' });
  writeFileSync(join(out, `${shot.name}.jpg`), img.toJPEG(86));
  console.log(`docs/screenshots/${shot.name}.jpg`);
  win.destroy();
}

app.disableHardwareAcceleration();
// Cada captura abre y cierra su ventana: la app no debe salir entre una y otra.
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  mkdirSync(out, { recursive: true });
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-') && !a.endsWith('.mjs'));
  for (const shot of SHOTS) if (!only.length || only.includes(shot.name)) await shoot(shot);
  app.quit();
});
