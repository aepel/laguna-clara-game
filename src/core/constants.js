// Constantes exactas de CONTRACT.md §3. No cambiar sin actualizar el contrato.

export const TILE = 8;
export const COLS = 56; // widescreen 2:1
export const ROWS = 26;
export const HUD_H = 16;
export const SCREEN_W = COLS * TILE; // 448
export const SCREEN_H = HUD_H + ROWS * TILE; // 224
export const FPS = 60;

export const GRAVITY = 0.25;
export const MAX_FALL = 2.5;
export const WALK_SPEED = 1.25;
export const JUMP_VEL = -4.2;

export const PLAYER_W = 14;
export const PLAYER_H = 16;
export const ENEMY_W = 14;
export const ENEMY_H = 16;

export const BUBBLE_SIZE = 16;
export const BUBBLE_SHOOT_SPEED = 4;
export const BUBBLE_SHOOT_FRAMES = 14;
export const BUBBLE_FLOAT_SPEED = 0.5;
export const BUBBLE_LIFETIME = 600;

export const SHOOT_COOLDOWN = 12;
export const TRAP_TIME = 480;
export const ANGRY_SPEED_MULT = 1.6;
export const RESPAWN_INVULN = 120;
export const START_LIVES = 3;
export const LEVEL_CLEAR_DELAY = 180;
export const FRUIT_TTL = 480;

// Laguna Clara: diferencias sutiles por personaje (1 = Nilo, 2 = Lirio).
// trapPad agranda solo el área con la que una burbuja en fase shoot atrapa.
export const HERO_PROFILES = {
  1: { shootCooldown: 14, trapPad: 3 },
  2: { shootCooldown: 8, trapPad: 0 },
};
