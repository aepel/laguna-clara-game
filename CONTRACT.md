# CONTRACT.md — Bubble Bobble (nodo 0)

Este documento es la **única fuente de verdad** para los subagentes de las olas 1 y 2.
Cada subagente recibe este archivo más su propia sección. **Nadie cambia el contrato por su cuenta**: si un subagente necesita algo que no está acá, lo implementa de la forma más simple compatible y lo reporta al lead en su resumen final bajo "Pedidos de cambio al contrato".

---

## 1. Convenciones generales

- **Lenguaje:** JavaScript moderno (ES2022), módulos ES (`import`/`export`). Sin TypeScript. Tipos documentados con JSDoc cuando ayuda.
- **Sin dependencias en runtime.** Solo dependencias de desarrollo: `esbuild` y `electron`.
- **Tests:** `node --test` (el runner nativo de Node 20+). Sin Jest ni Vitest.
- **El core es puro:** nada en `src/core/` puede tocar `window`, `document`, `performance`, `Math.random` ni `Date`. Solo recibe datos y devuelve o muta estado.
- **Determinismo:** toda aleatoriedad del core pasa por `state.rng()` (ver §4). Con la misma semilla y los mismos inputs, el resultado es idéntico.
- **Timestep fijo:** 60 pasos por segundo. Todas las velocidades están en **píxeles por frame** y todos los tiempos en **frames**.
- **Estilo:** 2 espacios, comillas simples, `;` al final, nombres en inglés en el código. Comentarios cortos, solo donde algo no es obvio.
- **Propiedad de archivos:** cada archivo tiene un único dueño (ver §11). Nadie edita archivos que no son suyos.

## 2. Estructura y build

```
package.json            # E
index.html              # E
electron/main.js        # E
dist/game.js            # generado por esbuild (no se commitea)
src/
  main.js               # X   une todo, loop del browser
  core/
    constants.js        # A   constantes de §3 (valores exactos)
    rng.js              # A   PRNG con semilla
    game.js             # A   createGame, step
    physics.js          # A   colisiones con tiles, wrap vertical
    player.js           # A   movimiento, salto, disparo, montar burbujas
    bubbles.js          # A   burbujas: disparo, flotación, atrapar, reventar
    enemies.js          # A crea un stub → G es el dueño final
    rules.js            # G   puntaje, frutas, vidas, flujo de niveles
    level.js            # A   parseLevel (ASCII → grilla)
  data/
    levels.js           # L
    sprites.js          # B
  render/canvas.js      # R
  audio/sfx.js          # S
  input/keys.js         # I
tests/
  *.test.js             # T (A y G pueden agregar tests propios con prefijo a-/g-)
```

**Scripts de `package.json`** (los define E):

| Script | Qué hace |
|---|---|
| `npm run build` | `esbuild src/main.js --bundle --format=iife --outfile=dist/game.js` |
| `npm run dev` | lo mismo con `--watch --sourcemap` |
| `npm run desktop` | build y después `electron .` |
| `npm test` | `node --test "tests/**/*.test.js"` |

- `index.html` carga `dist/game.js` como **script clásico** (no `type="module"`), así funciona abriéndolo con `file://`.
- `package.json` lleva `"type": "module"` y `"main": "electron/main.js"`.

## 3. Pantalla y constantes

Coordenadas en píxeles lógicos. Origen arriba a la izquierda, **y crece hacia abajo**.

| Constante | Valor | Nota |
|---|---|---|
| `TILE` | 8 | px por tile |
| `COLS` | 56 | tiles de ancho (widescreen 2:1; era 32) |
| `ROWS` | 26 | tiles de alto del playfield |
| `HUD_H` | 16 | px de HUD arriba del playfield |
| `SCREEN_W` | 448 | `COLS * TILE` |
| `SCREEN_H` | 224 | `HUD_H + ROWS * TILE` |
| `FPS` | 60 | |
| `GRAVITY` | 0.25 | px/frame² |
| `MAX_FALL` | 2.5 | velocidad máxima de caída |
| `WALK_SPEED` | 1.25 | |
| `JUMP_VEL` | -4.2 | alcanza ~35 px, suficiente para subir 4 tiles |
| `PLAYER_W`, `PLAYER_H` | 14, 16 | hitbox (el sprite es 16×16) |
| `ENEMY_W`, `ENEMY_H` | 14, 16 | |
| `BUBBLE_SIZE` | 16 | hitbox cuadrada |
| `BUBBLE_SHOOT_SPEED` | 4 | px/frame horizontal |
| `BUBBLE_SHOOT_FRAMES` | 14 | fase de disparo antes de flotar |
| `BUBBLE_FLOAT_SPEED` | 0.5 | |
| `BUBBLE_LIFETIME` | 600 | frames hasta reventar sola (vacía) |
| `SHOOT_COOLDOWN` | 12 | |
| `TRAP_TIME` | 480 | frames que un enemigo queda atrapado |
| `ANGRY_SPEED_MULT` | 1.6 | |
| `RESPAWN_INVULN` | 120 | frames de invulnerabilidad al reaparecer |
| `START_LIVES` | 3 | |
| `LEVEL_CLEAR_DELAY` | 180 | frames entre "sin enemigos" y el siguiente nivel |
| `FRUIT_TTL` | 480 | |

El renderer escala la pantalla por un **factor entero** (×3 por defecto) con `imageSmoothingEnabled = false`.

**Laguna Clara:** `HERO_PROFILES` en `constants.js` define diferencias por personaje. Nilo (1) tiene `shootCooldown` 14 y `trapPad` 3, que agranda solo el área con la que su burbuja atrapa en fase `shoot`. Lirio (2) tiene `shootCooldown` 8 y `trapPad` 0. El resto de la física de burbujas usa `BUBBLE_SIZE`.

## 4. Estado del juego (`GameState`)

Es un objeto plano y serializable a JSON, salvo `rng`, que es una función. El core lo muta en `step`, y el renderer y el audio solo lo leen.

```js
/** @typedef {{ left:boolean, right:boolean, jump:boolean, fire:boolean }} PlayerInput */
/** @typedef {{ p1: PlayerInput, p2: PlayerInput, start1:boolean, start2:boolean, pause:boolean }} FrameInput */

GameState = {
  mode: 'title' | 'playing' | 'paused' | 'levelClear' | 'gameOver' | 'victory',
  frame: 0,                 // frames desde createGame
  levelIndex: 0,            // 0-based
  level: Level,             // ver §5 (ya parseado)
  players: Player[],        // 1 o 2
  enemies: Enemy[],
  bubbles: Bubble[],
  fruits: Fruit[],
  events: GameEvent[],      // se vacía al inicio de cada step (ver §6)
  modeTimer: 0,             // frames en el modo actual
  nextId: 1,                // contador de ids de entidades
  rng: () => number,        // [0,1), creado con rng.js a partir de la semilla
}

Player = {
  id: 1 | 2, x, y, vx, vy,  // x,y = esquina superior izquierda del hitbox
  facing: -1 | 1,
  onGround: boolean,
  state: 'alive' | 'dying' | 'dead' | 'respawning',
  stateTimer: number,
  invuln: number,           // frames restantes
  lives: number, score: number,
  shootCooldown: number,
  anim: string,             // 'idle'|'walk'|'jump'|'fall'|'shoot'|'die' → lo usa el renderer
}

Enemy = {
  id, type: 'zen' | 'mighta' | 'monsta' | 'pulpul',
  x, y, vx, vy, facing: -1 | 1, onGround: boolean,
  state: 'walk' | 'jump' | 'trapped' | 'angry' | 'dying',
  stateTimer: number,
  anim: string,             // 'walk'|'jump'|'angry'|'die'
}

Bubble = {
  id, x, y, vx, vy,
  ownerId: 1 | 2,
  phase: 'shoot' | 'float' | 'pop',
  age: number,
  trapped: null | { enemyType: string, timer: number },   // timer descendente desde TRAP_TIME
}

Fruit = { id, x, y, vy, kind: string, points: number, ttl: number, onGround: boolean }
```

Todas las entidades tienen un `id` único tomado de `state.nextId++`.

## 5. Formato de niveles (`src/data/levels.js`)

```js
export const LEVELS = [
  {
    name: 'Round 1',
    map: [            // exactamente ROWS (26) strings de COLS (56) caracteres
      '################################',
      '#..............................#',
      // ...
    ],
    wind: 'center',   // hacia dónde se juntan las burbujas arriba: 'center' | 'left' | 'right'
  },
  // 8 a 10 niveles
];
```

| Carácter | Significado |
|---|---|
| `#` | Sólido. Se usa para paredes laterales, techo y piso. |
| `=` | Plataforma de un solo sentido: se atraviesa desde abajo y se pisa desde arriba. |
| `.` | Vacío |
| `1`, `2` | Spawn de P1 y P2 (exactamente uno de cada uno por nivel). El tile es vacío. |

Los marcadores de spawn indican el tile de los **pies**: `parseLevel` ubica la entidad con `y = (row + 1) * TILE - alto`, apoyada sobre el tile de abajo.
| `z` `m` `o` `p` | Spawn de enemigo: zen, mighta, monsta, pulpul. El tile es vacío. |

Reglas de diseño que valida T:
- Las columnas 0 y 31 son `#` en todas las filas (paredes laterales).
- Las filas 0 y 25 tienen **al menos un hueco de 2+ tiles** (`.`) alineado verticalmente. Por ahí funciona el wrap: lo que cae por el hueco del piso reaparece arriba.
- Desde cada spawn de jugador se tiene que poder llegar a todas las plataformas con saltos de ≤ 4 tiles de altura.
- Cada nivel tiene entre 5 y 12 enemigos (1,5× el diseño de 32 columnas; los difíciles, 12). La dificultad crece: los niveles 1–2 usan solo `z`, y `p` recién aparece del 6 en adelante.

`parseLevel(def)` (en `core/level.js`) devuelve:

```js
Level = {
  name, wind,
  tiles: Uint8Array(COLS*ROWS),   // 0 vacío, 1 sólido, 2 plataforma
  spawns: { p1:{x,y}, p2:{x,y}, enemies:[{type,x,y}] },   // en píxeles
}
```

## 6. Eventos (`GameEvent`)

El core no reproduce sonido ni dibuja efectos: **emite eventos** en `state.events` durante el frame. Audio y renderer los consumen.

```js
GameEvent = { type: string, x?: number, y?: number, playerId?: 1|2, points?: number, combo?: number }
```

| `type` | Cuándo |
|---|---|
| `jump` | un jugador salta, incluido el rebote sobre una burbuja |
| `shoot` | un jugador dispara una burbuja |
| `trap` | una burbuja atrapa a un enemigo |
| `pop` | revienta una burbuja vacía |
| `popEnemy` | revienta una burbuja con un enemigo (`points`, `combo`) |
| `escape` | un enemigo se escapa enojado |
| `fruitSpawn` | aparece una fruta |
| `fruitCollect` | un jugador agarra una fruta (`points`) |
| `playerHit` | un jugador muere |
| `levelStart` | empieza un nivel |
| `levelClear` | no quedan enemigos |
| `gameOver` | |
| `victory` | se completó el último nivel |
| `regenerate` | un jugador reaparece tras perder una vida (Laguna Clara) |
| `bossIntro`, `bossHit`, `bossPhase`, `bossShot`, `bossSpawn`, `bossBlock`, `bossHeal`, `bossDefeated` | jefes (`core/boss.js`) |
| `criaEscape` | una cría no recogida vuelve al fondo |
| `enemySplit`, `enemySprout`, `enemyZap`, `enemyDrop`, `armorBlock` | mecánicas de los enemigos de las zonas 5 a 10 |

`popEnemy` además lleva `enemyType`, y el renderer lo usa para mostrar el animal que el enemigo supo ser.

## 7. API del core

```js
// core/game.js
export function createGame({ levels, seed = 1, players = 1 }): GameState
export function step(state, input /* FrameInput */): void   // avanza exactamente 1 frame

// core/level.js
export function parseLevel(def): Level

// core/rng.js
export function createRng(seed): () => number                // mulberry32

// core/physics.js
export function tileAt(level, col, row): 0 | 1 | 2           // fuera del rango horizontal = 1, fuera del vertical = 0
export function moveAndCollide(entity, level, { oneWay = true }): { hitWall:boolean, landed:boolean, hitCeiling:boolean }
export function wrapVertical(entity): void                   // y > playfield → aparece arriba, y al revés

// core/enemies.js   (A escribe un stub; G lo reemplaza sin cambiar la firma)
export function spawnEnemies(state): void
export function updateEnemies(state): void

// core/rules.js     (G)
export function updateRules(state, input): void              // modos, vidas, frutas, puntaje, cambio de nivel
```

**Orden dentro de `step`** (A lo implementa y G no lo cambia):

1. `state.events = []`, `state.frame++`, `state.modeTimer++`
2. `updateRules(state, input)`. Maneja title, pausa, levelClear, gameOver y victory. Si `mode !== 'playing'`, termina acá.
3. Actualizar jugadores (input → movimiento → colisión → wrap → disparo).
4. `updateEnemies(state)`
5. Actualizar burbujas (movimiento, atrapar enemigos, montarse encima, reventar).
6. Colisiones: jugador contra enemigo (el jugador muere salvo que tenga `invuln`) y jugador contra fruta.
7. Limpiar entidades muertas o vencidas.

`step` arranca con `mode: 'title'`. Con `start1` pasa a 1 jugador y con `start2` a 2 jugadores, ambos en `levelIndex 0`.

**Stub de A para `rules.js`**, hasta que G lo complete: `title` → `playing` al presionar start, y nada más.

## 8. Mecánicas (comportamiento esperado)

- **Movimiento:** la velocidad horizontal es fija (`WALK_SPEED`), sin aceleración. El control en el aire es igual que en el suelo.
- **Salto:** solo desde el suelo o desde una burbuja. Se dispara con el flanco de subida de `jump` (presionarlo, no mantenerlo).
- **Plataformas `=`:** se atraviesan subiendo (`vy < 0`) y se pisan cayendo, solo si el pie estaba por encima del borde en el frame anterior.
- **Disparo:** con el flanco de `fire` y `shootCooldown == 0`. La burbuja nace delante del jugador y viaja `BUBBLE_SHOOT_FRAMES` frames en dirección `facing`, o hasta chocar una pared. Después pasa a `float`.
- **Flotación:** sube a `BUBBLE_FLOAT_SPEED`. Arriba de todo deriva hacia la posición definida por `level.wind`. Las burbujas se empujan entre sí para no superponerse (separación simple).
- **Atrapar:** una burbuja en fase `shoot` que toca un enemigo en `walk`, `jump` o `angry` lo atrapa. El enemigo pasa a `trapped` (sale de la simulación normal) y la burbuja recibe `trapped = { enemyType, timer: TRAP_TIME }`.
- **Escape enojado:** si `trapped.timer` llega a 0, la burbuja desaparece y el enemigo reaparece ahí con estado `angry`, multiplicando su velocidad por `ANGRY_SPEED_MULT`.
- **Reventar:** un jugador que toca una burbuja en `float` la revienta. Si tenía un enemigo, ese enemigo pasa a `dying`: sale despedido en arco, y al tocar el suelo se convierte en fruta. **Combo:** todas las burbujas con enemigo que se tocan (en cadena) con la que se revienta explotan en el mismo frame.
- **Montar burbujas:** si un jugador cae (`vy > 0`) sobre la mitad superior de una burbuja en `float`, se apoya encima (`onGround = true`, no la revienta). Si presiona `jump` estando apoyado, rebota con `JUMP_VEL` y la burbuja **no** revienta. Tocar la burbuja de costado o desde abajo sí la revienta.
- **Muerte:** al tocar un enemigo `walk`, `jump` o `angry` sin `invuln`, el jugador pasa a `dying` durante 90 frames y pierde una vida. Si le quedan vidas, reaparece en su spawn con `invuln = RESPAWN_INVULN`. Si no, queda `dead`. `gameOver` ocurre cuando todos los jugadores están `dead`.
- **Wrap vertical:** jugadores, enemigos y frutas que caen por un hueco del piso reaparecen arriba en la misma columna. Las burbujas no hacen wrap.

## 9. Reglas de juego y puntaje (G)

| Evento | Puntos |
|---|---|
| Reventar burbuja vacía | 10 |
| Reventar con enemigo (combo n = cantidad de enemigos en la cadena) | 1000 × 2^(n−1) por enemigo, con un máximo de 8000 |
| Frutas por tipo | `cherry` 100 · `banana` 500 · `peach` 1000 · `watermelon` 2000 · `diamond` 5000 |

- El tipo de fruta depende del combo: n=1 cherry, n=2 banana, n=3 peach, n=4 watermelon, n≥5 diamond.
- **Laguna Clara:** la "fruta" es una cría de ajolote rescatada, con los mismos puntos: n=1 `cria`, n=2 `crias2` (2 crías), n=3 `huevo` (3), n=4 `criaDorada`, n≥5 `criaArcoiris`. Al agarrarla se suma a `state.rescued` y `fruitCollect` lleva `crias`. Si vence su `ttl` se emite `criaEscape` y no suma.
- Cuando no quedan enemigos (vivos, atrapados ni en `dying`), el modo pasa a `levelClear`. Tras `LEVEL_CLEAR_DELAY` frames se carga el siguiente nivel: las posiciones vuelven a los spawns y se conservan puntaje y vidas. Después del último nivel el modo pasa a `victory`.
- Si un jugador muere en modo 2 jugadores, el otro sigue jugando. Un jugador `dead` puede reincorporarse con su tecla de start (`start1`/`start2`) con `START_LIVES` vidas y puntaje en 0.

**IA de enemigos (G):**

| Tipo | Comportamiento |
|---|---|
| `zen` | Camina y da vuelta en paredes. En los bordes de plataforma, 50% de las veces salta y 50% se deja caer. Si un jugador está arriba en la misma columna ±2 tiles, salta. |
| `mighta` | Como zen, pero cada 180 frames se detiene 20 frames (en v2 lanzaría rocas; por ahora solo la pausa). |
| `monsta` | Ignora la gravedad y rebota en diagonal contra paredes y techo. |
| `pulpul` | Vuela en línea recta, con giros de 90° al azar cada 60–120 frames. |

## 10. APIs de plataforma (browser y Electron)

```js
// render/canvas.js  (R)
export function createRenderer(canvas, sprites, { scale = 3 } = {}): { draw(state): void, resize(scale): void }
//  - Dibuja HUD (1UP/2UP con puntaje, vidas, número de round), tiles, frutas, enemigos, burbujas, jugadores y efectos.
//  - Pantallas: title ("PRESS 1 OR 2"), paused, levelClear, gameOver, victory.
//  - Solo lee el estado. Puede tener su propio estado cosmético (partículas) derivado de state.events.
//  - Los jugadores parpadean mientras invuln > 0.

// audio/sfx.js  (S)
export function createAudio(): { unlock(): void, handle(events: GameEvent[]): void, setMuted(b: boolean): void }
//  - unlock() se llama en el primer keydown (política de autoplay).
//  - Un sonido distinto por type de §6. Web Audio puro, sin archivos. Silenciar tipos desconocidos.

// input/keys.js  (I)
export function createInput(target = window): { read(): FrameInput, onKey(code, fn): void, dispose(): void }
//  - Usa KeyboardEvent.code. Es estado de teclas mantenidas: el core detecta los flancos.
//  - preventDefault en las teclas de juego (flechas, Space).
```

**Teclas:**

| Acción | P1 | P2 |
|---|---|---|
| Izquierda / derecha | `ArrowLeft` / `ArrowRight` | `KeyA` / `KeyD` |
| Saltar | `ArrowUp` | `KeyW` |
| Disparar | `Space` | `KeyF` |
| Start | `Digit1` | `Digit2` |
| Pausa / mute (globales) | `KeyP` / `KeyM` | |

**`src/main.js` (X):** crea el game, el renderer, el audio y el input, y corre un loop con `requestAnimationFrame` y acumulador de timestep fijo (máximo 5 steps por frame para no espiralar). En cada step: `step(state, input.read())` → `audio.handle(state.events)`. Después del loop: `renderer.draw(state)`.

**`electron/main.js` (E):** abre un `BrowserWindow` de 1344×672 (×3), con `useContentSize`, `resizable: true`, sin menú, `contextIsolation: true` y sin `nodeIntegration`. Carga `index.html`. No necesita preload.

**`index.html` (E):** fondo negro, `<canvas id="game">` centrado y `<script src="dist/game.js">`.

## 11. Entregables por nodo

Cada subagente termina con un resumen de: archivos creados, cómo se prueba, decisiones propias y "Pedidos de cambio al contrato" (o "ninguno").

| Nodo | Archivos (dueño) | Criterio de aceptación |
|---|---|---|
| **A** Core física | `core/constants.js`, `rng.js`, `level.js`, `physics.js`, `player.js`, `bubbles.js`, `game.js`, stubs de `enemies.js` y `rules.js`, `tests/a-*.test.js` | `npm test` pasa. Tests que cubren: salto que sube 4 tiles, plataforma one-way, wrap vertical, disparo y flotación, atrapar un enemigo stub, montar una burbuja y rebotar, determinismo (misma semilla + inputs → mismo estado tras 600 frames). |
| **B** Sprites | `data/sprites.js` | Exporta `SPRITES` con el formato de §12. Incluye: bub y bob (idle, walk×2, jump, fall, shoot, die×2), los 4 enemigos (walk×2, angry×2, die), bubble (normal×2, pop), 5 frutas y tiles (sólido, plataforma) para 4 paletas de nivel. Todas las filas con el mismo largo. |
| **L** Niveles | `data/levels.js` | Entre 8 y 10 niveles que cumplen las reglas de §5. Cada uno con un diseño distinto (no espejados). |
| **S** Audio | `audio/sfx.js` | Implementa la API de §10. Un sonido por evento, todos de ≤ 400 ms. `handle` limita a 1 sonido por tipo por frame. |
| **I** Input | `input/keys.js` | Implementa la API de §10 con las teclas de la tabla. Sin teclas "pegadas" al perder foco (`blur` resetea todo). |
| **E** Electron + build | `package.json`, `index.html`, `electron/main.js`, `.gitignore` | `npm run build` genera `dist/game.js` (con un `src/main.js` placeholder mientras X no exista) y `npm run desktop` abre la ventana. |
| **R** Renderer | `render/canvas.js` | Dibuja todos los modos y entidades. Probado con un estado armado a mano en un HTML de prueba (`tests/render-preview.html`, dueño R). |
| **G** Reglas | `core/enemies.js`, `core/rules.js`, `tests/g-*.test.js` | Tests de: combo de puntaje, tipo de fruta según combo, escape enojado, levelClear → siguiente nivel, gameOver, reincorporación en 2 jugadores. |
| **T** Tests | `tests/levels.test.js`, `tests/sim.test.js` | Valida §5 en todos los niveles, incluida la alcanzabilidad por BFS sobre la grilla con salto ≤ 4 tiles. Simulación de 10.000 frames con input aleatorio con semilla: sin NaN ni excepciones, y ninguna entidad fuera de los límites. |
| **X** Integración | `src/main.js` | El juego corre completo en el browser (`file://`) y en Electron: 1 y 2 jugadores, todos los niveles. |

## 12. Formato de sprites (`src/data/sprites.js`)

```js
export const PALETTES = {
  bub:   ['#00000000', '#000000', '#3cbc3c', '#a0f0a0', '#ffffff', '#f8d878', '#e03030'],
  // ... una por personaje, más 'level0'..'level3' para los tiles
};

export const SPRITES = {
  'bub.walk': { palette: 'bub', frames: [
    [ '................',   // 16 caracteres por fila, 16 filas
      '.....1111.......',   // cada carácter es un índice en hex (0-f) de la paleta
      // ...
    ],
    [ /* frame 2 */ ],
  ], fps: 8 },
  // clave = '<entidad>.<anim>'; bob usa las mismas formas que bub con otra paleta
};
```

- `'.'` y `'0'` son transparentes.
- Tamaños: personajes, enemigos, burbujas y frutas son de **16×16**. Los tiles son de **8×8**.
- Claves de tiles: `'tile.solid.level0'`, `'tile.platform.level0'`… hasta level3. El nivel `i` usa `level(i % 4)`.
- Los sprites miran a la derecha. El renderer los espeja cuando `facing === -1`.
- El renderer precalcula cada frame en un canvas offscreen al crearse.

---

## Orden de ejecución

- **Ola 1:** A, B, L, S, I y E en paralelo. Solo dependen de este contrato.
- **Ola 2:** R (necesita B), G (necesita A) y T (necesita A y L), en paralelo.
- **Después:** X integra, P hace el playtest y F corrige.
