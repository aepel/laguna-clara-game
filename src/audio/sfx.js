/**
 * Audio synthesis module for Bubble Bobble.
 * Uses Web Audio API to generate chiptune-style sounds.
 * Can be imported in Node without errors; requires unlock() before playing.
 */

let audioContext = null;
let masterGain = null;
let isMuted = false;

/**
 * Creates the audio system.
 * @returns {{ unlock: () => void, handle: (events: Array) => void, setMuted: (b: boolean) => void }}
 */
export function createAudio() {
  // Track which sound types have been played this frame
  let playedThisFrame = new Set();

  return {
    unlock() {
      if (audioContext) return; // Already unlocked

      // Only access window/AudioContext when explicitly called
      if (typeof window === 'undefined') return; // Running in Node, skip

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = isMuted ? 0 : 0.2;
      masterGain.connect(audioContext.destination);
    },

    handle(events) {
      if (!audioContext) return; // Not unlocked yet

      playedThisFrame.clear();

      if (!events || events.length === 0) return;

      for (const event of events) {
        // Limit to 1 sound per type per frame
        if (playedThisFrame.has(event.type)) continue;
        playedThisFrame.add(event.type);

        switch (event.type) {
          case 'jump':
            playJump();
            break;
          case 'shoot':
            playShoot();
            break;
          case 'trap':
            playTrap();
            break;
          case 'pop':
            playPop();
            break;
          case 'popEnemy':
            playPopEnemy(event.combo || 1);
            break;
          case 'escape':
            playEscape();
            break;
          case 'fruitSpawn':
            playFruitSpawn();
            break;
          case 'fruitCollect':
            playFruitCollect();
            break;
          case 'playerHit':
            playPlayerHit();
            break;
          case 'levelStart':
            playLevelStart();
            break;
          case 'levelClear':
            playLevelClear();
            break;
          case 'gameOver':
            playGameOver();
            break;
          case 'victory':
            playVictory();
            break;
          // Unknown types silently ignored
        }
      }
    },

    setMuted(b) {
      isMuted = b;
      if (masterGain) {
        masterGain.gain.value = isMuted ? 0 : 0.2;
      }
    },
  };
}

// ============= Sound synthesis helpers =============

/**
 * Jump: ascending square wave sweep (120 ms)
 */
function playJump() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);

  env.gain.setValueAtTime(0.3, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.12);
}

/**
 * Shoot: "blup" sound with quick sine wave burst (80 ms)
 */
function playShoot() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.linearRampToValueAtTime(280, now + 0.08);

  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.02, now + 0.08);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Trap: two short beeps, second slightly higher (150 ms)
 */
function playTrap() {
  const now = audioContext.currentTime;

  // First beep
  playBeep(now, 450, 0.06);
  // Second beep, slightly delayed and higher
  playBeep(now + 0.07, 550, 0.06);
}

/**
 * Pop: sharp click using high-pass filtered noise (50 ms)
 */
function playPop() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1200, now);

  env.gain.setValueAtTime(0.2, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Pop Enemy: ascending arpeggio (higher combo = higher pitch range) (200 ms)
 */
function playPopEnemy(combo) {
  const now = audioContext.currentTime;

  // Determine pitch range based on combo
  const baseFreq = 300 + combo * 100;
  const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

  for (let i = 0; i < freqs.length; i++) {
    const startTime = now + i * 0.05;
    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[i], startTime);

    env.gain.setValueAtTime(0.15, startTime);
    env.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    osc.connect(env);
    env.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }
}

/**
 * Escape: rising warning beep (120 ms)
 */
function playEscape() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.linearRampToValueAtTime(600, now + 0.12);

  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.12);
}

/**
 * Fruit Spawn: light pop (60 ms)
 */
function playFruitSpawn() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

  env.gain.setValueAtTime(0.15, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * Fruit Collect: ding (bell-like tone, 200 ms)
 */
function playFruitCollect() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);

  env.gain.setValueAtTime(0.2, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Player Hit: descending tone (200 ms)
 */
function playPlayerHit() {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Level Start: rising jingle (300 ms)
 */
function playLevelStart() {
  const now = audioContext.currentTime;

  // Three note rising pattern
  playBeep(now, 400, 0.08);
  playBeep(now + 0.1, 500, 0.08);
  playBeep(now + 0.2, 600, 0.1);
}

/**
 * Level Clear: ascending jingle (350 ms)
 */
function playLevelClear() {
  const now = audioContext.currentTime;

  // Four note rising pattern
  playBeep(now, 500, 0.07);
  playBeep(now + 0.08, 600, 0.07);
  playBeep(now + 0.16, 700, 0.07);
  playBeep(now + 0.24, 800, 0.1);
}

/**
 * Game Over: descending sad tone (300 ms)
 */
function playGameOver() {
  const now = audioContext.currentTime;

  // Descending pattern
  playBeep(now, 600, 0.08);
  playBeep(now + 0.1, 500, 0.08);
  playBeep(now + 0.2, 400, 0.12);
}

/**
 * Victory: triumphant rising jingle (380 ms)
 */
function playVictory() {
  const now = audioContext.currentTime;

  // Triumphant pattern: low-mid-high-high
  playBeep(now, 400, 0.08);
  playBeep(now + 0.09, 550, 0.08);
  playBeep(now + 0.18, 700, 0.08);
  playBeep(now + 0.27, 700, 0.08);
}

/**
 * Helper: play a single beep
 */
function playBeep(startTime, frequency, duration) {
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  env.gain.setValueAtTime(0.15, startTime);
  env.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.connect(env);
  env.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
