// ─── Web Audio Sound Engine ───────────────────────────────────────────────────
// All sounds are procedurally generated via Web Audio API — no external files.

const MUTE_KEY = "arcadeHub_muted";

let _ctx: AudioContext | null = null;
let _muted: boolean = localStorage.getItem(MUTE_KEY) === "true";

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

export function getMuted(): boolean {
  return _muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  localStorage.setItem(MUTE_KEY, String(_muted));
  return _muted;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tone(
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  duration: number,
  gain = 0.25,
  startTime?: number,
): void {
  const ac = ctx();
  const t = startTime ?? ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(endFreq, 1),
    t + duration,
  );
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function noise(duration: number, gain = 0.15, highpass = 0): void {
  const ac = ctx();
  const t = ac.currentTime;
  const bufSize = Math.ceil(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  if (highpass > 0) {
    const filter = ac.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    src.connect(filter);
    filter.connect(g);
  } else {
    src.connect(g);
  }
  g.connect(ac.destination);
  src.start(t);
  src.stop(t + duration + 0.01);
}

// ─── Sound Functions ───────────────────────────────────────────────────────────

/** short upward chirp: sine, 200→600Hz, 0.12s */
export function playJump(): void {
  if (_muted) return;
  tone("sine", 200, 600, 0.12);
}

/** soft blip: sine, 440→880Hz, 0.1s */
export function playEat(): void {
  if (_muted) return;
  tone("sine", 440, 880, 0.1, 0.2);
}

/** descending buzz: sawtooth, 400→50Hz, 0.5s */
export function playDeath(): void {
  if (_muted) return;
  tone("sawtooth", 400, 50, 0.5, 0.3);
}

/** cheerful ding: triangle, 660Hz, 0.2s */
export function playScore(): void {
  if (_muted) return;
  tone("triangle", 660, 660, 0.2, 0.2);
}

/** ascending scale: 3 quick tones 400→600→800Hz */
export function playLevelUp(): void {
  if (_muted) return;
  const ac = ctx();
  const t = ac.currentTime;
  tone("triangle", 400, 400, 0.08, 0.2, t);
  tone("triangle", 600, 600, 0.08, 0.2, t + 0.1);
  tone("triangle", 800, 800, 0.12, 0.25, t + 0.2);
}

/** short noise burst: white noise, 50ms, high-pass filter */
export function playShoot(): void {
  if (_muted) return;
  noise(0.05, 0.15, 2000);
}

/** low boom: sine, 120→30Hz, 0.6s, high gain */
export function playExplosion(): void {
  if (_muted) return;
  tone("sine", 120, 30, 0.6, 0.5);
}

/** dull thud: sine, 200→80Hz, 0.15s */
export function playHit(): void {
  if (_muted) return;
  tone("sine", 200, 80, 0.15, 0.25);
}

/** short tick: square, 800Hz, 0.05s, low gain */
export function playClick(): void {
  if (_muted) return;
  tone("square", 800, 800, 0.05, 0.08);
}

/** soft whoosh: sine, 300→150Hz, 0.08s */
export function playFlap(): void {
  if (_muted) return;
  tone("sine", 300, 150, 0.08, 0.15);
}

/** light snap: triangle 1200→600Hz, 0.1s */
export function playCardFlip(): void {
  if (_muted) return;
  tone("triangle", 1200, 600, 0.1, 0.15);
}

/** double chime: two tones, 880Hz then 1100Hz */
export function playMatch(): void {
  if (_muted) return;
  const ac = ctx();
  const t = ac.currentTime;
  tone("triangle", 880, 880, 0.12, 0.2, t);
  tone("triangle", 1100, 1100, 0.12, 0.2, t + 0.14);
}

/** sad bloop: sine, 220→110Hz, 0.2s */
export function playMiss(): void {
  if (_muted) return;
  tone("sine", 220, 110, 0.2, 0.2);
}

/** spring boing: sine, 150→400Hz, 0.15s */
export function playBounce(): void {
  if (_muted) return;
  tone("sine", 150, 400, 0.15, 0.2);
}

/** engine rumble: sawtooth 80Hz, 0.1s, low volume */
export function playDrift(): void {
  if (_muted) return;
  tone("sawtooth", 80, 90, 0.1, 0.08);
}

/** satisfying tap: triangle 600→300Hz, 0.12s */
export function playMine(): void {
  if (_muted) return;
  tone("triangle", 600, 300, 0.12, 0.18);
}

/** sci-fi zap: square 800→200Hz, 0.1s */
export function playLaser(): void {
  if (_muted) return;
  const ac = ctx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.11);
}

/** victory fanfare: 3 ascending tones with slight delay */
export function playWin(): void {
  if (_muted) return;
  const ac = ctx();
  const t = ac.currentTime;
  tone("triangle", 523, 523, 0.15, 0.25, t);
  tone("triangle", 659, 659, 0.15, 0.25, t + 0.18);
  tone("triangle", 784, 784, 0.25, 0.3, t + 0.36);
}

/** rising shimmer: sine 600→1200Hz, 0.25s */
export function playCombo(): void {
  if (_muted) return;
  tone("sine", 600, 1200, 0.25, 0.2);
}

/** sparkle: triangle 500→1000→500Hz, 0.3s */
export function playPowerUp(): void {
  if (_muted) return;
  const ac = ctx();
  const t = ac.currentTime;
  tone("triangle", 500, 1000, 0.15, 0.2, t);
  tone("triangle", 1000, 500, 0.15, 0.15, t + 0.15);
}
