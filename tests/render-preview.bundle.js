(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/render/canvas.js
  var TILE = 8;
  var COLS = 32;
  var ROWS = 26;
  var HUD_H = 16;
  var SCREEN_W = COLS * TILE;
  var SCREEN_H = HUD_H + ROWS * TILE;
  var SPRITE_SIZE = 16;
  var TILE_SIZE = 8;
  var FONT_W = 3;
  var FONT_H = 5;
  var FONT = {
    "A": ["111", "101", "111", "101", "101"],
    "B": ["110", "101", "110", "101", "110"],
    "C": ["111", "100", "100", "100", "111"],
    "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "111", "100", "111"],
    "F": ["111", "100", "111", "100", "100"],
    "G": ["111", "100", "101", "101", "111"],
    "H": ["101", "101", "111", "101", "101"],
    "I": ["111", "010", "010", "010", "111"],
    "J": ["001", "001", "001", "101", "111"],
    "K": ["101", "110", "100", "110", "101"],
    "L": ["100", "100", "100", "100", "111"],
    "M": ["101", "111", "111", "101", "101"],
    "N": ["101", "111", "111", "111", "101"],
    "O": ["111", "101", "101", "101", "111"],
    "P": ["111", "101", "111", "100", "100"],
    "Q": ["111", "101", "101", "111", "001"],
    "R": ["111", "101", "111", "110", "101"],
    "S": ["111", "100", "111", "001", "111"],
    "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "111"],
    "V": ["101", "101", "101", "101", "010"],
    "W": ["101", "101", "111", "111", "101"],
    "X": ["101", "101", "010", "101", "101"],
    "Y": ["101", "101", "010", "010", "010"],
    "Z": ["111", "001", "010", "100", "111"],
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    " ": ["000", "000", "000", "000", "000"],
    "-": ["000", "000", "111", "000", "000"],
    ".": ["000", "000", "000", "000", "010"],
    ":": ["000", "010", "000", "010", "000"],
    "!": ["010", "010", "010", "000", "010"]
  };
  function drawText(ctx, text, x, y, color, scale = 1, spacing = 1) {
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
      const glyph = FONT[ch] || FONT[" "];
      ctx.fillStyle = color;
      for (let row = 0; row < FONT_H; row++) {
        for (let col = 0; col < FONT_W; col++) {
          if (glyph[row][col] === "1") {
            ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
          }
        }
      }
      cx += (FONT_W + spacing) * scale;
    }
    return cx - x;
  }
  function textWidth(text, scale = 1, spacing = 1) {
    return String(text).length * (FONT_W + spacing) * scale - spacing * scale;
  }
  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  function paintFrame(rows, palette, size) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < size; x++) {
        const ch = row[x] || ".";
        let color = "#00000000";
        if (ch !== "." && ch !== "0") {
          const idx = parseInt(ch, 16);
          color = palette[idx] || "#00000000";
        } else if (ch === "0") {
          color = palette[0] || "#00000000";
        }
        const rgba = hexToRgba(color);
        const i = (y * size + x) * 4;
        img.data[i] = rgba[0];
        img.data[i + 1] = rgba[1];
        img.data[i + 2] = rgba[2];
        img.data[i + 3] = rgba[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  function hexToRgba(hex) {
    if (!hex) return [0, 0, 0, 0];
    let h = hex.replace("#", "");
    if (h.length === 6) h += "ff";
    if (h.length !== 8) return [0, 0, 0, 0];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16);
    return [r, g, b, a];
  }
  function mirrorCanvas(src, size) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext("2d");
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return c;
  }
  function precalcSprites(sprites) {
    const out = {};
    for (const key of Object.keys(sprites.SPRITES)) {
      const def = sprites.SPRITES[key];
      const palette = sprites.PALETTES[def.palette] || [];
      const size = key.startsWith("tile.") ? TILE_SIZE : SPRITE_SIZE;
      const frames = def.frames.map((rows) => {
        const normal = paintFrame(rows, palette, size);
        const mirrored = mirrorCanvas(normal, size);
        return { normal, mirrored };
      });
      out[key] = { frames, fps: def.fps || 1, size };
    }
    return out;
  }
  function resolveSpriteKey(cache, entity, anim) {
    const direct = `${entity}.${anim}`;
    if (cache[direct]) return direct;
    const walk = `${entity}.walk`;
    if (cache[walk]) return walk;
    const idle = `${entity}.idle`;
    if (cache[idle]) return idle;
    return null;
  }
  function frameIndexFor(cache, key, frame) {
    const entry = cache[key];
    const n = entry.frames.length;
    if (n <= 1) return 0;
    const fps = entry.fps || 1;
    return Math.floor(frame * fps / 60) % n;
  }
  function createRenderer(canvas2, sprites, { scale = 3 } = {}) {
    const ctx = canvas2.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let cache;
    try {
      cache = precalcSprites(sprites);
    } catch (err) {
      cache = {};
    }
    let curScale = scale;
    applyScale(curScale);
    function applyScale(s) {
      curScale = s;
      canvas2.width = SCREEN_W * s;
      canvas2.height = SCREEN_H * s;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    const floaters = [];
    function pushFloater(x, y, text, color = "#ffffff") {
      floaters.push({ x, y, text, life: 40, maxLife: 40, color });
    }
    function updateFloaters() {
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life--;
        f.y -= 0.3;
        if (f.life <= 0) floaters.splice(i, 1);
      }
    }
    function consumeEvents(events) {
      if (!events || !events.length) return;
      for (const ev of events) {
        if (ev.type === "popEnemy" && typeof ev.points === "number") {
          pushFloater(ev.x ?? 0, ev.y ?? 0, ev.points, "#ffe14d");
        } else if (ev.type === "fruitCollect" && typeof ev.points === "number") {
          pushFloater(ev.x ?? 0, ev.y ?? 0, ev.points, "#a0f0a0");
        }
      }
    }
    function drawSprite(entityKey, anim, frame, x, y, facing = 1) {
      const key = resolveSpriteKey(cache, entityKey, anim);
      if (!key) {
        ctx.fillStyle = "#ff00ff";
        ctx.fillRect(Math.round(x), Math.round(y), SPRITE_SIZE, SPRITE_SIZE);
        return;
      }
      const entry = cache[key];
      const idx = frameIndexFor(cache, key, frame);
      const pair = entry.frames[idx];
      const c = facing === -1 ? pair.mirrored : pair.normal;
      ctx.drawImage(c, Math.round(x), Math.round(y));
    }
    function drawTile(kind, levelSkin, col, row) {
      const key = `tile.${kind}.level${levelSkin}`;
      const entry = cache[key];
      const x = col * TILE_SIZE;
      const y = HUD_H + row * TILE_SIZE;
      if (!entry) {
        ctx.fillStyle = kind === "solid" ? "#606878" : "#a8b0c0";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        return;
      }
      ctx.drawImage(entry.frames[0].normal, x, y);
    }
    function drawBackground() {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    function drawLevel(state2) {
      const level2 = state2.level;
      if (!level2 || !level2.tiles) return;
      const skin = (state2.levelIndex % 4 + 4) % 4;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const t = level2.tiles[row * COLS + col];
          if (t === 1) drawTile("solid", skin, col, row);
          else if (t === 2) drawTile("platform", skin, col, row);
        }
      }
    }
    function fruitKeyFromKind(kind) {
      return `fruit.${kind}`;
    }
    function drawFruitsReal(state2) {
      for (const f of state2.fruits || []) {
        const key = fruitKeyFromKind(f.kind);
        const entry = cache[key];
        const x = Math.round(f.x);
        const y = Math.round(HUD_H + f.y);
        if (!entry) {
          ctx.fillStyle = "#ff8fa0";
          ctx.fillRect(x, y, SPRITE_SIZE, SPRITE_SIZE);
          continue;
        }
        ctx.drawImage(entry.frames[0].normal, x, y);
      }
    }
    function drawEnemies(state2) {
      for (const e of state2.enemies || []) {
        if (e.state === "trapped") continue;
        let anim = e.anim;
        if (!anim) {
          if (e.state === "angry") anim = "angry";
          else if (e.state === "dying") anim = "die";
          else anim = "walk";
        }
        const x = Math.round(e.x);
        const y = Math.round(HUD_H + e.y);
        drawSprite(e.type, anim, state2.frame, x, y, e.facing);
      }
    }
    function drawBubbles(state2) {
      for (const b of state2.bubbles || []) {
        const x = Math.round(b.x);
        const y = Math.round(HUD_H + b.y);
        if (b.trapped) {
          drawSprite(b.trapped.enemyType, "walk", state2.frame, x, y, 1);
          drawSprite("bubble", "trapped", state2.frame, x, y, 1);
        } else if (b.phase === "pop") {
          drawSprite("bubble", "pop", state2.frame, x, y, 1);
        } else {
          drawSprite("bubble", "normal", state2.frame, x, y, 1);
        }
      }
    }
    function drawPlayers(state2) {
      for (const p of state2.players || []) {
        if (p.state === "dead") continue;
        if (p.invuln > 0 && Math.floor(state2.frame / 4) % 2 === 0) continue;
        const entity = p.id === 2 ? "bob" : "bub";
        const anim = p.anim || "idle";
        const x = Math.round(p.x);
        const y = Math.round(HUD_H + p.y);
        drawSprite(entity, anim, state2.frame, x, y, p.facing);
      }
    }
    function drawFloaters() {
      for (const f of floaters) {
        const alpha = Math.max(0, f.life / f.maxLife);
        ctx.globalAlpha = alpha;
        drawText(ctx, String(f.text), Math.round(f.x), Math.round(HUD_H + f.y), f.color, 1);
        ctx.globalAlpha = 1;
      }
    }
    function player(state2, id) {
      return (state2.players || []).find((p) => p.id === id);
    }
    function drawHud(state2) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, SCREEN_W, HUD_H);
      const p1 = player(state2, 1);
      const p2 = player(state2, 2);
      drawText(ctx, "1UP", 4, 2, "#ff5050", 1);
      drawText(ctx, String(p1 ? p1.score : 0), 4, 9, "#ffffff", 1);
      if (p2) {
        const label = "2UP";
        const w = textWidth(label, 1);
        drawText(ctx, label, SCREEN_W - 4 - w, 2, "#50a0ff", 1);
        const scoreStr = String(p2.score);
        const sw = textWidth(scoreStr, 1);
        drawText(ctx, scoreStr, SCREEN_W - 4 - sw, 9, "#ffffff", 1);
      }
      const roundText = `ROUND ${state2.levelIndex + 1}`;
      const rw = textWidth(roundText, 1);
      drawText(ctx, roundText, Math.round((SCREEN_W - rw) / 2), 2, "#ffffff", 1);
      const lifeIconsY = 9;
      let lx = Math.round((SCREEN_W - rw) / 2);
      if (p1) {
        for (let i = 0; i < p1.lives; i++) {
          ctx.fillStyle = "#ff5050";
          ctx.fillRect(lx + i * 5, lifeIconsY, 3, 3);
        }
      }
      if (p2) {
        const startX = Math.round((SCREEN_W - rw) / 2) + 40;
        for (let i = 0; i < p2.lives; i++) {
          ctx.fillStyle = "#50a0ff";
          ctx.fillRect(startX + i * 5, lifeIconsY, 3, 3);
        }
      }
    }
    function centeredText(text, y, color, scale2 = 2) {
      const w = textWidth(text, scale2);
      drawText(ctx, text, Math.round((SCREEN_W - w) / 2), y, color, scale2);
    }
    function drawTitleScreen(state2) {
      drawBackground();
      centeredText("BUBBLE BOBBLE", 80, "#ffffff", 2);
      if (Math.floor(state2.frame / 30) % 2 === 0) {
        centeredText("PRESS 1 OR 2", 130, "#ffe14d", 1);
      }
    }
    function drawOverlay(text, color = "#ffffff") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, HUD_H, SCREEN_W, SCREEN_H - HUD_H);
      centeredText(text, Math.round(SCREEN_H / 2) - 4, color, 2);
    }
    function drawGame(state2) {
      drawBackground();
      drawLevel(state2);
      drawFruitsReal(state2);
      drawEnemies(state2);
      drawBubbles(state2);
      drawPlayers(state2);
      drawFloaters();
      drawHud(state2);
    }
    function draw(state2) {
      updateFloaters();
      consumeEvents(state2.events);
      if (state2.mode === "title") {
        drawTitleScreen(state2);
        return;
      }
      drawGame(state2);
      if (state2.mode === "paused") {
        drawOverlay("PAUSED", "#ffffff");
      } else if (state2.mode === "levelClear") {
        drawOverlay("ROUND CLEAR", "#a0f0a0");
      } else if (state2.mode === "gameOver") {
        drawOverlay("GAME OVER", "#ff5050");
      } else if (state2.mode === "victory") {
        drawOverlay("VICTORY!", "#ffe14d");
      }
    }
    function resize(newScale) {
      applyScale(newScale);
    }
    return { draw, resize };
  }

  // src/data/sprites.js
  var sprites_exports = {};
  __export(sprites_exports, {
    PALETTES: () => PALETTES,
    SPRITES: () => SPRITES
  });
  var SIZE = 16;
  var TSIZE = 8;
  function blank(n) {
    return Array.from({ length: n }, () => Array(n).fill("."));
  }
  function toRows(g) {
    return g.map((row) => row.join(""));
  }
  function px(g, x, y, ch) {
    const yi = Math.round(y);
    const xi = Math.round(x);
    if (yi >= 0 && yi < g.length && xi >= 0 && xi < g[0].length) g[yi][xi] = ch;
  }
  function rect(g, x0, y0, x1, y1, ch) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) {
      for (let x = Math.round(x0); x <= Math.round(x1); x++) px(g, x, y, ch);
    }
  }
  function circle(g, cx, cy, r, ch) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) px(g, x, y, ch);
      }
    }
  }
  function ring(g, cx, cy, r, ch, thickness = 1) {
    const rOuter2 = r * r;
    const rInner = Math.max(0, r - thickness);
    const rInner2 = rInner * rInner;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= rOuter2 && d2 >= rInner2) px(g, x, y, ch);
      }
    }
  }
  function shiftDown(g, n) {
    const h = g.length;
    const g2 = blank(h);
    for (let y = 0; y < h; y++) {
      const sy = y - n;
      if (sy >= 0 && sy < h) g2[y] = g[sy].slice();
    }
    return g2;
  }
  function flipH(g) {
    return g.map((row) => row.slice().reverse());
  }
  var DRAGON_BODY = [
    "................",
    "......4.4.4.....",
    "......12221.....",
    "....133222221...",
    "...13322224421..",
    "...12222224411..",
    "..1222222222231.",
    "..1222222222211.",
    "..122222222221..",
    "..1225555555221.",
    "..12555555555221",
    "...12555555521..",
    "...12555555521..",
    ".21.12222221...."
  ];
  function dragonFrame({ legRows, eyeRows, mouthRows } = {}) {
    const rows = DRAGON_BODY.slice();
    if (eyeRows) {
      rows[4] = eyeRows[0];
      rows[5] = eyeRows[1];
    }
    if (mouthRows) {
      rows[7] = mouthRows[0];
      rows[8] = mouthRows[1];
    }
    rows.push(...legRows || ["................", "................"]);
    return rows;
  }
  var LEGS_STAND = ["......11.11.....", ".......1.1......"];
  var LEGS_WALK1 = ["......11.11.....", ".......1........"];
  var LEGS_WALK2 = ["......11.11.....", ".........1......"];
  var LEGS_TUCKED = ["................", "................"];
  var LEGS_SPREAD = ["....1......1....", "...1........1..."];
  var EYES_CLOSED = ["...13322221121..", "...12222221111.."];
  var MOUTH_OPEN = ["..1222222222111.", "..1222222222111."];
  var dragonIdle = dragonFrame({ legRows: LEGS_STAND });
  var dragonWalk1 = dragonFrame({ legRows: LEGS_WALK1 });
  var dragonWalk2 = dragonFrame({ legRows: LEGS_WALK2 });
  var dragonJump = dragonFrame({ legRows: LEGS_TUCKED });
  var dragonFall = dragonFrame({ legRows: LEGS_SPREAD });
  var dragonShoot = dragonFrame({ legRows: LEGS_STAND, mouthRows: MOUTH_OPEN });
  var dragonDie1 = dragonFrame({ legRows: LEGS_TUCKED, eyeRows: EYES_CLOSED });
  var dragonDie2 = toRows(flipH(shiftDown(dragonDie1.map((row) => row.split("")), 1)));
  var DRAGON_FRAMES = {
    idle: [dragonIdle],
    walk: [dragonWalk1, dragonWalk2],
    jump: [dragonJump],
    fall: [dragonFall],
    shoot: [dragonShoot],
    die: [dragonDie1, dragonDie2]
  };
  function zenBody(legPhase) {
    const g = blank(SIZE);
    rect(g, 3, 3, 12, 10, "2");
    rect(g, 4, 4, 11, 6, "3");
    circle(g, 8, 5, 1.3, "4");
    px(g, 8, 5, "1");
    rect(g, 6, 8, 9, 8, "5");
    px(g, 7, 1, "1");
    px(g, 7, 2, "1");
    px(g, 8, 1, "5");
    rect(g, 3, 3, 12, 3, "1");
    rect(g, 3, 10, 12, 10, "1");
    rect(g, 3, 3, 3, 10, "1");
    rect(g, 12, 3, 12, 10, "1");
    const a = legPhase === 0 ? 13 : 12;
    const b = legPhase === 0 ? 12 : 13;
    rect(g, 4, 11, 6, a, "1");
    rect(g, 9, 11, 11, b, "1");
    return g;
  }
  function mightaBody(phase) {
    const g = blank(SIZE);
    for (let y = 2; y <= 6; y++) {
      const half = y - 1;
      rect(g, 8 - half, y, 8 + half, y, "2");
    }
    rect(g, 3, 7, 12, 12, "2");
    rect(g, 4, 8, 11, 11, "3");
    rect(g, 6, 5, 9, 6, "1");
    px(g, 6, 5, "4");
    px(g, 9, 5, "4");
    const handY = phase === 0 ? 9 : 10;
    circle(g, 4, handY, 1, "5");
    circle(g, 11, handY, 1, "5");
    const hem = phase === 0 ? 13 : 12;
    rect(g, 3, 13, 12, hem, "1");
    return g;
  }
  function monstaBody(phase) {
    const g = blank(SIZE);
    circle(g, 8, 7, 6, "2");
    circle(g, 6, 5, 3, "3");
    circle(g, 13, 9, 2, "2");
    circle(g, 6, 7, 1.4, "4");
    circle(g, 10, 7, 1.4, "4");
    px(g, 6, 7, "1");
    px(g, 10, 7, "1");
    const wave = phase === 0 ? [0, 1, 0, 1] : [1, 0, 1, 0];
    for (let i = 0; i < 4; i++) {
      const x0 = 3 + i * 3;
      const y0 = 12 + wave[i];
      rect(g, x0, y0, x0 + 2, 13 + wave[i], "2");
    }
    return g;
  }
  function pulpulBody(phase) {
    const g = blank(SIZE);
    circle(g, 8, 6, 5, "2");
    circle(g, 6, 4, 2.2, "3");
    circle(g, 6, 6, 1.4, "4");
    circle(g, 10, 6, 1.4, "4");
    px(g, 6, 6, "1");
    px(g, 10, 6, "1");
    const off = phase === 0 ? 0 : 1;
    for (let i = 0; i < 4; i++) {
      const x0 = 3 + i * 3;
      const y0 = 10 + (i + off) % 2;
      rect(g, x0, y0, x0 + 1, y0 + 3, "2");
    }
    return g;
  }
  function poofFrame() {
    const g = blank(SIZE);
    circle(g, 8, 8, 6, "3");
    ring(g, 8, 8, 6, "1", 1);
    const spikes = [
      [3, 3],
      [12, 3],
      [3, 12],
      [12, 12],
      [8, 2],
      [8, 13],
      [2, 8],
      [13, 8]
    ];
    for (const [x, y] of spikes) px(g, x, y, "1");
    return g;
  }
  var ZEN_WALK = [toRows(zenBody(0)), toRows(zenBody(1))];
  var ZEN_DIE = [toRows(poofFrame())];
  var MIGHTA_WALK = [toRows(mightaBody(0)), toRows(mightaBody(1))];
  var MIGHTA_DIE = [toRows(poofFrame())];
  var MONSTA_WALK = [toRows(monstaBody(0)), toRows(monstaBody(1))];
  var MONSTA_DIE = [toRows(poofFrame())];
  var PULPUL_WALK = [toRows(pulpulBody(0)), toRows(pulpulBody(1))];
  var PULPUL_DIE = [toRows(poofFrame())];
  function bubbleFrame(variant) {
    const g = blank(SIZE);
    circle(g, 8, 8, 6, "2");
    ring(g, 8, 8, 6, "1", 1);
    if (variant === 0) {
      circle(g, 6, 6, 1.4, "3");
    } else {
      circle(g, 10, 6, 1.2, "3");
      circle(g, 6, 6, 0.8, "3");
    }
    return g;
  }
  function bubblePopFrame() {
    const g = blank(SIZE);
    circle(g, 8, 8, 2, "3");
    ring(g, 8, 8, 3, "1", 1);
    const spikes = [
      [8, 1],
      [8, 15],
      [1, 8],
      [15, 8],
      [3, 3],
      [13, 3],
      [3, 13],
      [13, 13]
    ];
    for (const [x, y] of spikes) {
      px(g, x, y, "1");
      const dx = x < 8 ? 1 : x > 8 ? -1 : 0;
      const dy = y < 8 ? 1 : y > 8 ? -1 : 0;
      px(g, x + dx, y + dy, "4");
    }
    return g;
  }
  function bubbleTrappedFrame() {
    const g = blank(SIZE);
    ring(g, 8, 8, 6, "1", 1);
    ring(g, 8, 8, 5, "4", 1);
    return g;
  }
  var BUBBLE_NORMAL = [toRows(bubbleFrame(0)), toRows(bubbleFrame(1))];
  var BUBBLE_POP = [toRows(bubblePopFrame())];
  var BUBBLE_TRAPPED = [toRows(bubbleTrappedFrame())];
  function cherryFrame() {
    const g = blank(SIZE);
    rect(g, 8, 2, 8, 5, "1");
    rect(g, 9, 2, 9, 4, "1");
    circle(g, 6, 10, 3, "2");
    circle(g, 11, 11, 3, "2");
    circle(g, 5, 9, 1, "3");
    circle(g, 10, 10, 1, "3");
    return g;
  }
  function bananaFrame() {
    const g = blank(SIZE);
    for (let y = 3; y <= 12; y++) {
      const x0 = 5 + Math.round(3 * Math.sin((y - 3) / 9 * Math.PI));
      rect(g, x0, y, x0 + 3, y, "2");
    }
    px(g, 5, 3, "1");
    px(g, 9, 12, "1");
    circle(g, 6, 5, 0.8, "3");
    return g;
  }
  function peachFrame() {
    const g = blank(SIZE);
    circle(g, 8, 9, 6, "2");
    circle(g, 6, 6, 2.5, "3");
    rect(g, 8, 3, 8, 8, "1");
    px(g, 8, 2, "1");
    return g;
  }
  function watermelonFrame() {
    const g = blank(SIZE);
    circle(g, 8, 9, 6, "1");
    circle(g, 8, 9, 5, "2");
    for (let y = 4; y <= 14; y++) {
      for (let x = 8; x <= 13; x++) {
        if ((x - 8) * (x - 8) + (y - 9) * (y - 9) <= 16) px(g, x, y, "3");
      }
    }
    circle(g, 10, 8, 0.6, "4");
    circle(g, 11, 10, 0.6, "4");
    return g;
  }
  function diamondFrame() {
    const g = blank(SIZE);
    for (let y = 3; y <= 12; y++) {
      const half = y <= 6 ? (y - 2) * 2 : (12 - y) * 1.6 + 2;
      rect(g, 8 - half, y, 8 + half, y, "2");
    }
    ring(g, 8, 7, 5, "1", 1);
    px(g, 8, 3, "3");
    px(g, 5, 6, "3");
    return g;
  }
  function solidTile() {
    const g = blank(TSIZE);
    rect(g, 0, 0, 7, 7, "2");
    rect(g, 0, 0, 7, 0, "1");
    rect(g, 0, 7, 7, 7, "1");
    rect(g, 0, 0, 0, 7, "1");
    rect(g, 7, 0, 7, 7, "1");
    rect(g, 0, 3, 3, 3, "1");
    rect(g, 4, 0, 4, 3, "1");
    rect(g, 4, 4, 7, 4, "1");
    px(g, 1, 1, "3");
    px(g, 5, 5, "3");
    px(g, 2, 5, "3");
    px(g, 6, 1, "3");
    return g;
  }
  function platformTile() {
    const g = blank(TSIZE);
    rect(g, 0, 0, 7, 2, "2");
    rect(g, 0, 0, 7, 0, "1");
    rect(g, 0, 2, 7, 2, "1");
    px(g, 1, 1, "3");
    px(g, 4, 1, "3");
    px(g, 6, 1, "3");
    return g;
  }
  var TILE_SOLID = toRows(solidTile());
  var TILE_PLATFORM = toRows(platformTile());
  var PALETTES = {
    bub: ["#00000000", "#000000", "#3cbc3c", "#a0f0a0", "#ffffff", "#f8d878", "#e03030"],
    bob: ["#00000000", "#000000", "#3060e0", "#90c0ff", "#ffffff", "#f8d878", "#e03030"],
    zen: ["#00000000", "#101010", "#8f97a3", "#c7ced6", "#ffffff", "#ffd23f", "#e03030"],
    zenAngry: ["#00000000", "#200000", "#a33232", "#e07a7a", "#ffffff", "#ffd23f", "#ffffff"],
    mighta: ["#00000000", "#100018", "#6a2fae", "#b98cf0", "#ffe9a8", "#ffffff", "#e03030"],
    mightaAngry: ["#00000000", "#200000", "#ae2f3f", "#f08c9c", "#ffe9a8", "#ffffff", "#ffffff"],
    monsta: ["#00000000", "#180030", "#6a3fae", "#b28cf0", "#ffffff", "#e9d9ff", "#e03030"],
    monstaAngry: ["#00000000", "#300000", "#ae3f4f", "#f08ca0", "#ffffff", "#ffd9d9", "#ffffff"],
    pulpul: ["#00000000", "#2a0030", "#c33fae", "#ff9fe0", "#ffffff", "#ffe9ff", "#e03030"],
    pulpulAngry: ["#00000000", "#300000", "#c3423f", "#ff9f9f", "#ffffff", "#ffe9e9", "#ffffff"],
    bubble: ["#00000000", "#2050a0", "#a8dcff", "#ffffff", "#5090ff"],
    fruitCherry: ["#00000000", "#5a3418", "#e0303f", "#ff8fa0"],
    fruitBanana: ["#00000000", "#7a5a10", "#ffe14d", "#fff6b0"],
    fruitPeach: ["#00000000", "#7a2a10", "#ff9d5c", "#ffd9a0"],
    fruitWatermelon: ["#00000000", "#123c17", "#3fae52", "#ff4d5e", "#ffffff"],
    fruitDiamond: ["#00000000", "#104060", "#5fd0ff", "#ffffff"],
    level0: ["#00000000", "#202028", "#606878", "#a8b0c0"],
    level1: ["#00000000", "#2a1008", "#a04030", "#e0a070"],
    level2: ["#00000000", "#0c2410", "#2f7a3f", "#8fe0a0"],
    level3: ["#00000000", "#180830", "#4a3aa0", "#a898ff"]
  };
  var SPRITES = {
    "bub.idle": { palette: "bub", frames: DRAGON_FRAMES.idle, fps: 1 },
    "bub.walk": { palette: "bub", frames: DRAGON_FRAMES.walk, fps: 8 },
    "bub.jump": { palette: "bub", frames: DRAGON_FRAMES.jump, fps: 1 },
    "bub.fall": { palette: "bub", frames: DRAGON_FRAMES.fall, fps: 1 },
    "bub.shoot": { palette: "bub", frames: DRAGON_FRAMES.shoot, fps: 1 },
    "bub.die": { palette: "bub", frames: DRAGON_FRAMES.die, fps: 6 },
    // bob usa exactamente los mismos arrays de frames que bub, solo cambia la paleta.
    "bob.idle": { palette: "bob", frames: DRAGON_FRAMES.idle, fps: 1 },
    "bob.walk": { palette: "bob", frames: DRAGON_FRAMES.walk, fps: 8 },
    "bob.jump": { palette: "bob", frames: DRAGON_FRAMES.jump, fps: 1 },
    "bob.fall": { palette: "bob", frames: DRAGON_FRAMES.fall, fps: 1 },
    "bob.shoot": { palette: "bob", frames: DRAGON_FRAMES.shoot, fps: 1 },
    "bob.die": { palette: "bob", frames: DRAGON_FRAMES.die, fps: 6 },
    "zen.walk": { palette: "zen", frames: ZEN_WALK, fps: 8 },
    "zen.angry": { palette: "zenAngry", frames: ZEN_WALK, fps: 12 },
    "zen.die": { palette: "zen", frames: ZEN_DIE, fps: 1 },
    "mighta.walk": { palette: "mighta", frames: MIGHTA_WALK, fps: 8 },
    "mighta.angry": { palette: "mightaAngry", frames: MIGHTA_WALK, fps: 12 },
    "mighta.die": { palette: "mighta", frames: MIGHTA_DIE, fps: 1 },
    "monsta.walk": { palette: "monsta", frames: MONSTA_WALK, fps: 8 },
    "monsta.angry": { palette: "monstaAngry", frames: MONSTA_WALK, fps: 12 },
    "monsta.die": { palette: "monsta", frames: MONSTA_DIE, fps: 1 },
    "pulpul.walk": { palette: "pulpul", frames: PULPUL_WALK, fps: 8 },
    "pulpul.angry": { palette: "pulpulAngry", frames: PULPUL_WALK, fps: 12 },
    "pulpul.die": { palette: "pulpul", frames: PULPUL_DIE, fps: 1 },
    "bubble.normal": { palette: "bubble", frames: BUBBLE_NORMAL, fps: 10 },
    "bubble.pop": { palette: "bubble", frames: BUBBLE_POP, fps: 1 },
    "bubble.trapped": { palette: "bubble", frames: BUBBLE_TRAPPED, fps: 1 },
    "fruit.cherry": { palette: "fruitCherry", frames: [toRows(cherryFrame())], fps: 1 },
    "fruit.banana": { palette: "fruitBanana", frames: [toRows(bananaFrame())], fps: 1 },
    "fruit.peach": { palette: "fruitPeach", frames: [toRows(peachFrame())], fps: 1 },
    "fruit.watermelon": { palette: "fruitWatermelon", frames: [toRows(watermelonFrame())], fps: 1 },
    "fruit.diamond": { palette: "fruitDiamond", frames: [toRows(diamondFrame())], fps: 1 },
    "tile.solid.level0": { palette: "level0", frames: [TILE_SOLID], fps: 1 },
    "tile.solid.level1": { palette: "level1", frames: [TILE_SOLID], fps: 1 },
    "tile.solid.level2": { palette: "level2", frames: [TILE_SOLID], fps: 1 },
    "tile.solid.level3": { palette: "level3", frames: [TILE_SOLID], fps: 1 },
    "tile.platform.level0": { palette: "level0", frames: [TILE_PLATFORM], fps: 1 },
    "tile.platform.level1": { palette: "level1", frames: [TILE_PLATFORM], fps: 1 },
    "tile.platform.level2": { palette: "level2", frames: [TILE_PLATFORM], fps: 1 },
    "tile.platform.level3": { palette: "level3", frames: [TILE_PLATFORM], fps: 1 }
  };

  // tests/render-preview.js
  var COLS2 = 32;
  var ROWS2 = 26;
  function buildLevelMap() {
    const rows = [];
    for (let r = 0; r < ROWS2; r++) {
      let row;
      if (r === 0 || r === ROWS2 - 1) {
        row = "#".repeat(COLS2);
        row = row.slice(0, 15) + ".." + row.slice(17);
      } else {
        row = "#" + ".".repeat(COLS2 - 2) + "#";
      }
      rows.push(row);
    }
    function setPlatform(row, c0, c1) {
      let r = rows[row].split("");
      for (let c = c0; c <= c1; c++) r[c] = "=";
      rows[row] = r.join("");
    }
    setPlatform(20, 3, 9);
    setPlatform(16, 12, 20);
    setPlatform(12, 22, 28);
    setPlatform(8, 5, 12);
    return rows;
  }
  function tilesFromMap(map2) {
    const tiles = new Uint8Array(COLS2 * ROWS2);
    for (let r = 0; r < ROWS2; r++) {
      for (let c = 0; c < COLS2; c++) {
        const ch = map2[r][c];
        tiles[r * COLS2 + c] = ch === "#" ? 1 : ch === "=" ? 2 : 0;
      }
    }
    return tiles;
  }
  var map = buildLevelMap();
  var level = {
    name: "Preview level",
    wind: "center",
    tiles: tilesFromMap(map)
  };
  function makePlayer(id, x, y, facing, anim, extra = {}) {
    return {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      facing,
      onGround: true,
      state: "alive",
      stateTimer: 0,
      invuln: 0,
      lives: 3,
      score: id === 1 ? 12340 : 5670,
      shootCooldown: 0,
      anim,
      ...extra
    };
  }
  function makeEnemy(id, type, x, y, facing, state2, anim) {
    return { id, type, x, y, vx: 0.3, vy: 0, facing, onGround: true, state: state2, stateTimer: 0, anim };
  }
  function makeBubble(id, x, y, phase, trapped) {
    return { id, x, y, vx: 0, vy: -0.5, ownerId: 1, phase, age: 0, trapped };
  }
  function makeFruit(id, x, y, kind, points) {
    return { id, x, y, vy: 0, kind, points, ttl: 400, onGround: true };
  }
  function buildState() {
    return {
      mode: "playing",
      frame: 0,
      levelIndex: 0,
      level,
      players: [
        makePlayer(1, 40, 160, 1, "walk"),
        makePlayer(2, 80, 160, -1, "idle")
      ],
      enemies: [
        makeEnemy(1, "zen", 120, 160, 1, "walk", "walk"),
        makeEnemy(2, "mighta", 180, 100, -1, "angry", "angry"),
        makeEnemy(3, "monsta", 220, 60, 1, "walk", "walk")
      ],
      bubbles: [
        makeBubble(1, 60, 120, "float", null),
        makeBubble(2, 150, 80, "float", { enemyType: "pulpul", timer: 300 }),
        makeBubble(3, 200, 150, "shoot", null)
      ],
      fruits: [
        makeFruit(1, 100, 190, "cherry", 100),
        makeFruit(2, 140, 190, "watermelon", 2e3)
      ],
      events: [],
      modeTimer: 0,
      nextId: 10,
      rng: () => Math.random()
    };
  }
  var state = buildState();
  var canvas = document.getElementById("game");
  var renderer = createRenderer(canvas, sprites_exports, { scale: 3 });
  var MODE_KEYS = {
    Digit1: "title",
    Digit2: "playing",
    Digit3: "paused",
    Digit4: "levelClear",
    Digit5: "gameOver",
    Digit6: "victory"
  };
  window.addEventListener("keydown", (e) => {
    if (MODE_KEYS[e.code]) {
      state.mode = MODE_KEYS[e.code];
      state.modeTimer = 0;
    }
  });
  function loop() {
    state.frame++;
    state.modeTimer++;
    state.events = [];
    if (state.frame % 90 === 0) {
      state.events.push({ type: "popEnemy", x: 120, y: 160, points: 1e3, combo: 1 });
    }
    if (state.frame % 150 === 0) {
      state.events.push({ type: "fruitCollect", x: 100, y: 190, points: 100 });
    }
    renderer.draw(state);
    requestAnimationFrame(loop);
  }
  loop();
})();
