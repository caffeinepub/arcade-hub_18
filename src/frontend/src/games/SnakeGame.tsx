import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CELL = 20;
const COLS = 25;
const ROWS = 25;
const W = COLS * CELL;
const H = ROWS * CELL;

type Pt = { x: number; y: number };
type GameMode = "classic" | "speedrun" | "portal" | "maze";
type PowerUpType = "star" | "clock" | "cherry" | "shield";

type SnakeSkin = {
  id: string;
  label: string;
  head: string;
  body: string;
  hasEyes?: boolean;
};

const SKINS: SnakeSkin[] = [
  { id: "grass", label: "Grass", head: "#6FAA46", body: "#5D8A3C" },
  {
    id: "creeper",
    label: "Creeper",
    head: "#3CB371",
    body: "#2E8B57",
    hasEyes: true,
  },
  { id: "gold", label: "Gold", head: "#FFD700", body: "#DAA520" },
  { id: "diamond", label: "Diamond", head: "#4FE0C8", body: "#38B2A0" },
  { id: "nether", label: "Nether", head: "#FF4500", body: "#CC3300" },
];

const MODES: { id: GameMode; label: string; desc: string }[] = [
  { id: "classic", label: "Classic", desc: "Standard rules" },
  { id: "speedrun", label: "Speed Run", desc: "Faster over time" },
  { id: "portal", label: "Portal", desc: "Walls wrap around" },
  { id: "maze", label: "Maze", desc: "Avoid obstacles" },
];

const MAZE_OBSTACLES: Pt[] = [
  { x: 3, y: 3 },
  { x: 4, y: 3 },
  { x: 3, y: 4 },
  { x: 21, y: 3 },
  { x: 20, y: 3 },
  { x: 21, y: 4 },
  { x: 3, y: 21 },
  { x: 4, y: 21 },
  { x: 3, y: 20 },
  { x: 21, y: 21 },
  { x: 20, y: 21 },
  { x: 21, y: 20 },
  { x: 9, y: 9 },
  { x: 10, y: 9 },
  { x: 9, y: 10 },
  { x: 15, y: 9 },
  { x: 14, y: 9 },
  { x: 15, y: 10 },
  { x: 9, y: 15 },
  { x: 10, y: 15 },
  { x: 9, y: 14 },
  { x: 15, y: 15 },
  { x: 14, y: 15 },
  { x: 15, y: 14 },
  { x: 12, y: 6 },
  { x: 12, y: 7 },
  { x: 12, y: 17 },
  { x: 12, y: 18 },
  { x: 6, y: 12 },
  { x: 7, y: 12 },
  { x: 17, y: 12 },
  { x: 18, y: 12 },
];

interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  date: string;
}

const LB_KEY = "snake_leaderboard";

function getLeaderboard(): LeaderboardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  localStorage.setItem(LB_KEY, JSON.stringify(entries));
}

function addToLeaderboard(entry: LeaderboardEntry) {
  const entries = getLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, 10));
}

function getBestKey(mode: GameMode) {
  return `snake_best_${mode}`;
}
function getBest(mode: GameMode): number {
  return Number.parseInt(localStorage.getItem(getBestKey(mode)) ?? "0", 10);
}
function setBest(mode: GameMode, score: number) {
  if (score > getBest(mode))
    localStorage.setItem(getBestKey(mode), String(score));
}
function getSkin(id: string): SnakeSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

function rndPos(snake: Pt[], obstacles: Pt[], exclude?: Pt): Pt {
  let p: Pt;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (
    snake.some((s) => s.x === p.x && s.y === p.y) ||
    obstacles.some((o) => o.x === p.x && o.y === p.y) ||
    (exclude && exclude.x === p.x && exclude.y === p.y)
  );
  return p;
}

function getSpeedrunTick(foodEaten: number): number {
  return Math.max(60, 180 - Math.floor(foodEaten / 3) * 8);
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  pad = 1,
) {
  const bx = x + pad;
  const by = y + pad;
  const bs = size - pad * 2;
  ctx.fillStyle = color;
  ctx.fillRect(bx, by, bs, bs);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, by + bs);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + bs, by);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(bx + bs, by);
  ctx.lineTo(bx + bs, by + bs);
  ctx.lineTo(bx, by + bs);
  ctx.stroke();
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  born: number;
}

interface PowerUp {
  type: PowerUpType;
  pos: Pt;
  spawnedAt: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  born: number;
  color?: string;
}

interface GameState {
  snake: Pt[];
  dir: Pt;
  nextDir: Pt;
  food: Pt;
  score: number;
  alive: boolean;
  mode: GameMode;
  skinId: string;
  foodEaten: number;
  powerUp: PowerUp | null;
  activePowerUp: PowerUpType | null;
  powerUpExpiry: number;
  scoreMultiplier: number;
  slowActive: boolean;
  combo: number;
  lastEatTime: number;
  floatingTexts: FloatingText[];
  particles: Particle[];
  paused: boolean;
  flashRed: number;
  shieldActive: boolean;
  shieldFlash: number;
  level: number;
}

export default function SnakeGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"setup" | "playing" | "gameover">("setup");
  const [selectedSkin, setSelectedSkin] = useState<string>("grass");
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [gameOverMode, setGameOverMode] = useState<GameMode>("classic");
  const [isNewBest, setIsNewBest] = useState(false);
  const [hudPowerUp, setHudPowerUp] = useState<{
    type: PowerUpType;
    remaining: number;
  } | null>(null);
  const [hudCombo, setHudCombo] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScores, setBestScores] = useState<Record<GameMode, number>>(
    () => ({
      classic: getBest("classic"),
      speedrun: getBest("speedrun"),
      portal: getBest("portal"),
      maze: getBest("maze"),
    }),
  );

  const gameRef = useRef<GameState>({
    snake: [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
    ],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 18, y: 10 },
    score: 0,
    alive: true,
    mode: "classic",
    skinId: "grass",
    foodEaten: 0,
    powerUp: null,
    activePowerUp: null,
    powerUpExpiry: 0,
    scoreMultiplier: 1,
    slowActive: false,
    combo: 0,
    lastEatTime: 0,
    floatingTexts: [],
    particles: [],
    paused: false,
    flashRed: 0,
    shieldActive: false,
    shieldFlash: 0,
    level: 1,
  });

  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  // ─── Render loop ─────────────────────────────────────────────────────────────
  const render = useCallback((timestamp: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;
    const skin = getSkin(g.skinId);
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];
    const now = Date.now();

    // Flash red death effect
    if (g.flashRed > 0) {
      const flashCycle = Math.floor((g.flashRed % 200) / 100);
      ctx.fillStyle = flashCycle === 0 ? "#CC0000" : "#1A1209";
      ctx.fillRect(0, 0, W, H);
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    // Shield flash (white)
    if (g.shieldFlash > 0) {
      const cycle = Math.floor((g.shieldFlash % 200) / 100);
      ctx.fillStyle = cycle === 0 ? "rgba(255,255,255,0.6)" : "#1A1209";
      ctx.fillRect(0, 0, W, H);
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    // Background
    ctx.fillStyle = "#1A1209";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "#2A1E0D";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // Portal mode gates — glowing cyan doorways on each wall
    if (g.mode === "portal") {
      const portalPulse = (Math.sin(timestamp / 400) + 1) / 2;
      const gateAlpha = 0.5 + portalPulse * 0.5;
      ctx.save();
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 12 + portalPulse * 10;
      ctx.globalAlpha = gateAlpha;
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3;
      // Top gate
      const mid = Math.floor(COLS / 2);
      ctx.strokeRect(mid * CELL - CELL, 0, CELL * 3, CELL * 0.5);
      // Bottom gate
      ctx.strokeRect(mid * CELL - CELL, H - CELL * 0.5, CELL * 3, CELL * 0.5);
      // Left gate
      const midR = Math.floor(ROWS / 2);
      ctx.strokeRect(0, midR * CELL - CELL, CELL * 0.5, CELL * 3);
      // Right gate
      ctx.strokeRect(W - CELL * 0.5, midR * CELL - CELL, CELL * 0.5, CELL * 3);
      // Fill portals
      ctx.fillStyle = "#00FFFF";
      ctx.globalAlpha = gateAlpha * 0.25;
      ctx.fillRect(mid * CELL - CELL, 0, CELL * 3, CELL * 0.5);
      ctx.fillRect(mid * CELL - CELL, H - CELL * 0.5, CELL * 3, CELL * 0.5);
      ctx.fillRect(0, midR * CELL - CELL, CELL * 0.5, CELL * 3);
      ctx.fillRect(W - CELL * 0.5, midR * CELL - CELL, CELL * 0.5, CELL * 3);
      ctx.restore();
    }

    // Maze obstacles
    if (g.mode === "maze") {
      for (const obs of obstacles) {
        drawBlock(ctx, obs.x * CELL, obs.y * CELL, CELL, "#6B6B6B", 1);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(obs.x * CELL + 5, obs.y * CELL + 5, 4, 4);
        ctx.fillRect(obs.x * CELL + 12, obs.y * CELL + 10, 3, 3);
      }
    }

    // Animated food — pulse scale
    const pulseCycle = (Math.sin(timestamp / 300) + 1) / 2;
    const foodScale = 0.8 + pulseCycle * 0.2;
    const foodPad = ((1 - foodScale) * CELL) / 2;
    ctx.save();
    ctx.shadowColor = "#4FE0C8";
    ctx.shadowBlur = 8 + pulseCycle * 6;
    drawBlock(
      ctx,
      g.food.x * CELL + foodPad,
      g.food.y * CELL + foodPad,
      CELL * foodScale,
      "#4FE0C8",
      3 * foodScale,
    );
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(
      g.food.x * CELL + CELL / 2 - 1,
      g.food.y * CELL + 4,
      2,
      CELL - 8,
    );
    ctx.fillRect(
      g.food.x * CELL + 4,
      g.food.y * CELL + CELL / 2 - 1,
      CELL - 8,
      2,
    );

    // Power-up on board
    if (g.powerUp) {
      const pu = g.powerUp;
      const px = pu.pos.x * CELL;
      const py = pu.pos.y * CELL;
      const age = now - pu.spawnedAt;
      const visible = age < 7000 || Math.floor(age / 250) % 2 === 0;
      if (visible) {
        const icons: Record<
          PowerUpType,
          { bg: string; shadow: string; icon: string }
        > = {
          star: { bg: "#FFD700", shadow: "#FFD700", icon: "★" },
          clock: { bg: "#2255CC", shadow: "#4488FF", icon: "⏱" },
          cherry: { bg: "#CC2222", shadow: "#FF3333", icon: "🍒" },
          shield: { bg: "#CCCC00", shadow: "#FFFF44", icon: "🛡" },
        };
        const info = icons[pu.type];
        ctx.save();
        ctx.shadowColor = info.shadow;
        ctx.shadowBlur = 10;
        drawBlock(ctx, px, py, CELL, info.bg, 2);
        ctx.restore();
        ctx.fillStyle = "#FFF8";
        ctx.font = "bold 12px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.icon, px + CELL / 2, py + CELL / 2 + 1);
      }
    }

    // ─── Snake (tail→head for gradient opacity) ───────────────────────────────
    const isGoldFlash =
      g.activePowerUp === "star" && Math.floor(now / 150) % 2 === 0;
    const isShieldFlashing = g.shieldActive && Math.floor(now / 200) % 2 === 0;
    const snakeLen = g.snake.length;

    // Draw tail to head-1
    for (let i = snakeLen - 1; i >= 1; i--) {
      const seg = g.snake[i];
      let color = skin.body;
      if (isGoldFlash) color = "#DAA520";
      else if (isShieldFlashing) color = "#E0E0FF";
      // Opacity gradient: tail=0.4, towards head=1.0
      const alpha = 0.4 + 0.6 * (1 - i / snakeLen);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBlock(ctx, seg.x * CELL, seg.y * CELL, CELL, color, 1);
      ctx.restore();
    }

    // Draw head (rounded rect, direction-aware eyes + mouth)
    if (snakeLen > 0) {
      const head = g.snake[0];
      let headColor = skin.head;
      if (isGoldFlash) headColor = "#FFD700";
      else if (isShieldFlashing) headColor = "#FFFFFF";

      const hx = head.x * CELL + 1;
      const hy = head.y * CELL + 1;
      const hs = CELL - 2;

      ctx.save();
      if (g.shieldActive) {
        ctx.shadowColor = "#FFFFAA";
        ctx.shadowBlur = 10;
      }
      drawRoundRect(ctx, hx, hy, hs, hs, 3);
      ctx.fillStyle = headColor;
      ctx.fill();
      // Bevel
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, hy + hs);
      ctx.lineTo(hx, hy);
      ctx.lineTo(hx + hs, hy);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.moveTo(hx + hs, hy);
      ctx.lineTo(hx + hs, hy + hs);
      ctx.lineTo(hx, hy + hs);
      ctx.stroke();
      ctx.restore();

      // Eyes
      const d = g.dir;
      const ex = head.x * CELL;
      const ey = head.y * CELL;
      const drawEye = (ex2: number, ey2: number) => {
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(ex2, ey2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(ex2 + d.x * 1, ey2 + d.y * 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      };

      if (d.x === 1) {
        drawEye(ex + 15, ey + 5);
        drawEye(ex + 15, ey + 14);
      } else if (d.x === -1) {
        drawEye(ex + 4, ey + 5);
        drawEye(ex + 4, ey + 14);
      } else if (d.y === -1) {
        drawEye(ex + 5, ey + 4);
        drawEye(ex + 14, ey + 4);
      } else {
        drawEye(ex + 5, ey + 15);
        drawEye(ex + 14, ey + 15);
      }

      // Tiny mouth curve
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (d.x === 1) {
        ctx.arc(ex + 17, ey + 10, 2, -0.5, 0.5);
      } else if (d.x === -1) {
        ctx.arc(ex + 2, ey + 10, 2, Math.PI - 0.5, Math.PI + 0.5);
      } else if (d.y === -1) {
        ctx.arc(ex + 10, ey + 2, 2, Math.PI + 0.5, Math.PI * 2 - 0.5);
      } else {
        ctx.arc(ex + 10, ey + 17, 2, 0.5, Math.PI - 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ─── Particles ────────────────────────────────────────────────────────────
    const PARTICLE_LIFETIME = 400;
    g.particles = g.particles.filter((p) => now - p.born < PARTICLE_LIFETIME);
    for (const p of g.particles) {
      const age = now - p.born;
      const progress = age / PARTICLE_LIFETIME;
      const alpha = 1 - progress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(
        p.x + p.vx * age * 0.05,
        p.y + p.vy * age * 0.05,
        p.size * (1 - progress * 0.5),
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    // ─── Floating texts ───────────────────────────────────────────────────────
    g.floatingTexts = g.floatingTexts.filter((ft) => now - ft.born < 1200);
    for (const ft of g.floatingTexts) {
      const age = now - ft.born;
      const alpha = 1 - age / 1200;
      const yOff = (age / 1200) * 35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color ?? "#FFD700";
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = ft.color ?? "#FF8800";
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y - yOff);
      ctx.restore();
    }

    // Pause overlay
    if (g.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#AA7700";
      ctx.shadowBlur = 12;
      ctx.fillText("PAUSED", W / 2, H / 2);
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillStyle = "#aaa";
      ctx.shadowBlur = 0;
      ctx.fillText("Press P or ESC to resume", W / 2, H / 2 + 30);
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  const stopGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleDeath = useCallback(
    (finalScore: number, mode: GameMode) => {
      const prevBest = getBest(mode);
      const newBest = finalScore > prevBest;
      setBest(mode, finalScore);
      setBestScores((prev) => ({
        ...prev,
        [mode]: Math.max(prev[mode], finalScore),
      }));
      setGameOverScore(finalScore);
      setGameOverMode(mode);
      setScore(finalScore);
      setIsNewBest(newBest);
      setScoreSaved(false);
      setShowNameInput(false);
      stopGame();
      setTimeout(() => {
        setPhase("gameover");
        cbRef.current(finalScore);
      }, 700);
    },
    [stopGame],
  );

  const restartTimer = useCallback((interval: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => stepRef.current(), interval);
  }, []); // eslint-disable-line

  const triggerDeath = useCallback(
    (g: GameState) => {
      // Shield absorbs one hit
      if (g.shieldActive) {
        g.shieldActive = false;
        g.activePowerUp = null;
        // White flash
        g.shieldFlash = 600;
        const flashStart = Date.now();
        const doFlash = () => {
          const elapsed = Date.now() - flashStart;
          g.shieldFlash = Math.max(0, 600 - elapsed);
          if (g.shieldFlash > 0) setTimeout(doFlash, 50);
          // After flash just continue
        };
        setTimeout(doFlash, 50);
        return;
      }
      g.alive = false;
      g.flashRed = 600;
      const flashStart = Date.now();
      const doFlash = () => {
        const elapsed = Date.now() - flashStart;
        g.flashRed = Math.max(0, 600 - elapsed);
        if (g.flashRed > 0) setTimeout(doFlash, 50);
        else handleDeath(g.score, g.mode);
      };
      setTimeout(doFlash, 50);
    },
    [handleDeath],
  );

  const step = useCallback(() => {
    const g = gameRef.current;
    if (!g.alive || g.paused || g.flashRed > 0 || g.shieldFlash > 0) return;
    g.dir = g.nextDir;
    const head = g.snake[0];
    let nx = head.x + g.dir.x;
    let ny = head.y + g.dir.y;

    if (g.mode === "portal") {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      triggerDeath(g);
      return;
    }

    const nh = { x: nx, y: ny };
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];

    if (
      g.snake.some((s) => s.x === nh.x && s.y === nh.y) ||
      obstacles.some((o) => o.x === nh.x && o.y === nh.y)
    ) {
      triggerDeath(g);
      return;
    }

    g.snake.unshift(nh);
    const now = Date.now();

    // Power-up expiry
    if (g.activePowerUp && now > g.powerUpExpiry) {
      g.activePowerUp = null;
      g.scoreMultiplier = 1;
      g.slowActive = false;
      g.shieldActive = false;
      setHudPowerUp(null);
      if (g.mode === "speedrun") {
        restartTimer(getSpeedrunTick(g.foodEaten));
      } else {
        restartTimer(140);
      }
    }

    // Power-up HUD update
    if (g.activePowerUp) {
      const remaining = Math.ceil((g.powerUpExpiry - now) / 1000);
      setHudPowerUp({ type: g.activePowerUp, remaining });
    }

    // Pick up power-up
    if (g.powerUp && nh.x === g.powerUp.pos.x && nh.y === g.powerUp.pos.y) {
      const pu = g.powerUp.type;
      g.powerUp = null;
      if (pu === "star") {
        g.activePowerUp = "star";
        g.scoreMultiplier = 2;
        g.powerUpExpiry = now + 5000;
        setHudPowerUp({ type: "star", remaining: 5 });
      } else if (pu === "clock") {
        g.activePowerUp = "clock";
        g.slowActive = true;
        g.powerUpExpiry = now + 5000;
        setHudPowerUp({ type: "clock", remaining: 5 });
        restartTimer(240);
      } else if (pu === "shield") {
        g.activePowerUp = "shield";
        g.shieldActive = true;
        g.powerUpExpiry = now + 15000; // shield lasts longer
        setHudPowerUp({ type: "shield", remaining: 15 });
        g.floatingTexts.push({
          text: "SHIELD!",
          x: nh.x * CELL + CELL / 2,
          y: nh.y * CELL,
          born: now,
          color: "#FFFF88",
        });
      } else {
        // cherry — instant +30
        g.score += 30;
        setScore(g.score);
        g.floatingTexts.push({
          text: "+30 CHERRY!",
          x: nh.x * CELL + CELL / 2,
          y: nh.y * CELL,
          born: now,
          color: "#FF6666",
        });
      }
    }

    // Power-up board lifespan
    if (g.powerUp && now - g.powerUp.spawnedAt > 10000) {
      g.powerUp = null;
    }

    // Eat food?
    if (nh.x === g.food.x && nh.y === g.food.y) {
      // Particle burst
      const fx = g.food.x * CELL + CELL / 2;
      const fy = g.food.y * CELL + CELL / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 1.5;
        g.particles.push({
          x: fx,
          y: fy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: "#4FE0C8",
          size: 3 + Math.random() * 2,
          born: now,
        });
      }

      // Combo
      const timeSinceLast = now - g.lastEatTime;
      if (g.lastEatTime > 0 && timeSinceLast < 3000) {
        g.combo += 1;
      } else {
        g.combo = 0;
      }
      g.lastEatTime = now;

      const comboBonus = g.combo * 5;
      const basePoints = 10 + comboBonus;
      g.score += basePoints * g.scoreMultiplier;
      g.foodEaten += 1;

      // Level check
      const newLevel = Math.floor(g.foodEaten / 5) + 1;
      if (newLevel > g.level) {
        g.level = newLevel;
        setLevel(newLevel);
        g.floatingTexts.push({
          text: "LEVEL UP!",
          x: W / 2,
          y: H / 2,
          born: now,
          color: "#44FF44",
        });
      }

      if (g.combo > 0) {
        const comboColor =
          g.combo >= 3 ? "#FF3333" : g.combo >= 2 ? "#FFD700" : "#FF8800";
        g.floatingTexts.push({
          text: `+COMBO x${g.combo + 1}`,
          x: nh.x * CELL + CELL / 2,
          y: nh.y * CELL - 10,
          born: now,
          color: comboColor,
        });
      }

      setScore(g.score);
      setHudCombo(g.combo);

      g.food = rndPos(g.snake, obstacles, g.powerUp?.pos);

      // Maybe spawn power-up
      if (!g.powerUp && Math.random() < 0.3) {
        const rand = Math.random();
        let t: PowerUpType;
        if (rand < 0.15) t = "shield";
        else if (rand < 0.43) t = "star";
        else if (rand < 0.71) t = "clock";
        else t = "cherry";
        g.powerUp = {
          type: t,
          pos: rndPos(g.snake, obstacles, g.food),
          spawnedAt: now,
        };
      }

      if (g.mode === "speedrun" && !g.slowActive) {
        restartTimer(getSpeedrunTick(g.foodEaten));
      }
    } else {
      g.snake.pop();
      if (g.lastEatTime > 0 && now - g.lastEatTime > 3000 && g.combo > 0) {
        g.combo = 0;
        setHudCombo(0);
      }
    }
  }, [triggerDeath, restartTimer]);

  const stepRef = useRef(step);
  stepRef.current = step;

  const startGame = useCallback(() => {
    const obstacles = selectedMode === "maze" ? MAZE_OBSTACLES : [];
    const initSnake = [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
    ];
    gameRef.current = {
      snake: initSnake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: rndPos(initSnake, obstacles),
      score: 0,
      alive: true,
      mode: selectedMode,
      skinId: selectedSkin,
      foodEaten: 0,
      powerUp: null,
      activePowerUp: null,
      powerUpExpiry: 0,
      scoreMultiplier: 1,
      slowActive: false,
      combo: 0,
      lastEatTime: 0,
      floatingTexts: [],
      particles: [],
      paused: false,
      flashRed: 0,
      shieldActive: false,
      shieldFlash: 0,
      level: 1,
    };
    setScore(0);
    setLevel(1);
    setHudCombo(0);
    setHudPowerUp(null);
    setShowLeaderboard(false);
    setPhase("playing");
  }, [selectedMode, selectedSkin]);

  const handleDpad = useCallback((dir: string) => {
    const g = gameRef.current;
    const d = g.dir;
    if (dir === "up" && d.y !== 1) g.nextDir = { x: 0, y: -1 };
    if (dir === "down" && d.y !== -1) g.nextDir = { x: 0, y: 1 };
    if (dir === "left" && d.x !== 1) g.nextDir = { x: -1, y: 0 };
    if (dir === "right" && d.x !== -1) g.nextDir = { x: 1, y: 0 };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    rafRef.current = requestAnimationFrame(render);
    const initInterval = selectedMode === "speedrun" ? 180 : 140;
    timerRef.current = window.setInterval(
      () => stepRef.current(),
      initInterval,
    );

    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const d = g.dir;
      if (e.key === "ArrowUp" && d.y !== 1) {
        g.nextDir = { x: 0, y: -1 };
        e.preventDefault();
      }
      if (e.key === "ArrowDown" && d.y !== -1) {
        g.nextDir = { x: 0, y: 1 };
        e.preventDefault();
      }
      if (e.key === "ArrowLeft" && d.x !== 1) {
        g.nextDir = { x: -1, y: 0 };
        e.preventDefault();
      }
      if (e.key === "ArrowRight" && d.x !== -1) {
        g.nextDir = { x: 1, y: 0 };
        e.preventDefault();
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        g.paused = !g.paused;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      stopGame();
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, render, stopGame, selectedMode]);

  const handleSaveScore = useCallback(() => {
    if (!playerName.trim() || scoreSaved) return;
    addToLeaderboard({
      name: playerName.trim().slice(0, 16),
      score: gameOverScore,
      mode: gameOverMode,
      date: new Date().toLocaleDateString(),
    });
    setLeaderboard(getLeaderboard());
    setScoreSaved(true);
    setShowLeaderboard(true);
    setShowNameInput(false);
  }, [playerName, gameOverScore, gameOverMode, scoreSaved]);

  const modeColor: Record<GameMode, string> = {
    classic: "#6FAA46",
    speedrun: "#FF4500",
    portal: "#00FFFF",
    maze: "#9B59B6",
  };

  // ─── Setup / Game Over screen ─────────────────────────────────────────────
  if (phase === "setup" || phase === "gameover") {
    const lb = getLeaderboard();
    return (
      <div
        className="flex flex-col items-center gap-4"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        <div className="text-center">
          <h2
            style={{
              color: "#6FAA46",
              fontSize: "2rem",
              textShadow: "3px 3px 0 #2A5A10",
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            SNAKE
          </h2>
          {phase === "gameover" && (
            <div style={{ marginTop: 6 }}>
              {isNewBest && (
                <div
                  style={{
                    color: "#FFD700",
                    fontSize: "0.85rem",
                    marginBottom: 4,
                    animation: "flashGold 0.5s infinite alternate",
                    textShadow: "0 0 10px #FFD700, 2px 2px 0 #AA6600",
                  }}
                >
                  🏆 NEW BEST!
                </div>
              )}
              <div style={{ color: "#FF4500", fontSize: "0.7rem" }}>
                GAME OVER — {gameOverScore} pts
              </div>
              {/* Save score section */}
              {!scoreSaved && !showNameInput && (
                <button
                  type="button"
                  data-ocid="snake.save_button"
                  onClick={() => setShowNameInput(true)}
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "rgba(111,170,70,0.25)",
                    border: "2px solid #6FAA46",
                    borderRadius: 6,
                    color: "#6FAA46",
                    fontSize: "0.45rem",
                    cursor: "pointer",
                  }}
                >
                  💾 SAVE SCORE
                </button>
              )}
              {showNameInput && !scoreSaved && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 6,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <input
                    data-ocid="snake.input"
                    type="text"
                    placeholder="Your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveScore()}
                    maxLength={16}
                    style={{
                      padding: "6px 8px",
                      background: "rgba(0,0,0,0.6)",
                      border: "2px solid #6FAA46",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: "0.45rem",
                      fontFamily: "'Press Start 2P', monospace",
                      width: 130,
                    }}
                  />
                  <button
                    type="button"
                    data-ocid="snake.submit_button"
                    onClick={handleSaveScore}
                    style={{
                      padding: "6px 10px",
                      background: "#6FAA46",
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: "0.45rem",
                      cursor: "pointer",
                    }}
                  >
                    OK
                  </button>
                </div>
              )}
              {scoreSaved && (
                <div
                  style={{
                    color: "#44FF44",
                    fontSize: "0.45rem",
                    marginTop: 6,
                  }}
                >
                  ✓ Score saved!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard toggle */}
        <div style={{ width: W, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            data-ocid="snake.open_modal_button"
            onClick={() => {
              setLeaderboard(getLeaderboard());
              setShowLeaderboard((v) => !v);
            }}
            style={{
              padding: "5px 10px",
              background: showLeaderboard
                ? "rgba(255,215,0,0.25)"
                : "rgba(0,0,0,0.4)",
              border: `2px solid ${showLeaderboard ? "#FFD700" : "#555"}`,
              borderRadius: 6,
              color: showLeaderboard ? "#FFD700" : "#888",
              fontSize: "0.6rem",
              cursor: "pointer",
            }}
          >
            🏆
          </button>
        </div>

        {/* Leaderboard panel */}
        {showLeaderboard && (
          <div
            data-ocid="snake.panel"
            style={{
              width: W,
              background: "rgba(0,0,0,0.85)",
              border: "2px solid #FFD700",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#FFD700",
                fontSize: "0.55rem",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              🏆 TOP SCORES
            </div>
            {lb.length === 0 ? (
              <div
                data-ocid="snake.empty_state"
                style={{
                  color: "#666",
                  fontSize: "0.4rem",
                  textAlign: "center",
                }}
              >
                No scores yet
              </div>
            ) : (
              lb.map((e, i) => (
                <div
                  key={`${e.name}-${e.score}-${i}`}
                  data-ocid={`snake.item.${i + 1}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 2px",
                    borderBottom: "1px solid #333",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      color: i < 3 ? "#FFD700" : "#888",
                      fontSize: "0.4rem",
                      minWidth: 16,
                    }}
                  >
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : `#${i + 1}`}
                  </span>
                  <span
                    style={{
                      color: "#fff",
                      fontSize: "0.4rem",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.name}
                  </span>
                  <span style={{ color: "#FFD700", fontSize: "0.45rem" }}>
                    {e.score}
                  </span>
                  <span
                    style={{
                      padding: "1px 4px",
                      background: `${modeColor[e.mode]}33`,
                      border: `1px solid ${modeColor[e.mode]}`,
                      borderRadius: 3,
                      color: modeColor[e.mode],
                      fontSize: "0.32rem",
                    }}
                  >
                    {e.mode}
                  </span>
                  <span style={{ color: "#555", fontSize: "0.32rem" }}>
                    {e.date}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Skin Picker */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "2px solid #5D8A3C",
            borderRadius: 8,
            padding: 12,
            width: W,
          }}
        >
          <div
            style={{ color: "#FFD700", fontSize: "0.55rem", marginBottom: 8 }}
          >
            CHOOSE YOUR SNAKE
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {SKINS.map((s) => (
              <button
                key={s.id}
                type="button"
                data-ocid="snake.skin.button"
                onClick={() => setSelectedSkin(s.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 10px",
                  background:
                    selectedSkin === s.id
                      ? "rgba(111,170,70,0.25)"
                      : "rgba(0,0,0,0.3)",
                  border: `2px solid ${selectedSkin === s.id ? s.head : "#444"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      background: s.head,
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      background: s.body,
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    color: selectedSkin === s.id ? s.head : "#aaa",
                    fontSize: "0.45rem",
                  }}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "2px solid #5D8A3C",
            borderRadius: 8,
            padding: 12,
            width: W,
          }}
        >
          <div
            style={{ color: "#FFD700", fontSize: "0.55rem", marginBottom: 8 }}
          >
            GAME MODE
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                data-ocid="snake.mode.button"
                onClick={() => setSelectedMode(m.id)}
                style={{
                  padding: "8px 6px",
                  background:
                    selectedMode === m.id
                      ? "rgba(111,170,70,0.3)"
                      : "rgba(0,0,0,0.3)",
                  border: `2px solid ${selectedMode === m.id ? "#6FAA46" : "#444"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    color: selectedMode === m.id ? "#6FAA46" : "#ccc",
                    fontSize: "0.5rem",
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{ color: "#888", fontSize: "0.38rem", marginTop: 3 }}
                >
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
          <div style={{ color: "#888", fontSize: "0.4rem", marginTop: 8 }}>
            BEST:{" "}
            <span style={{ color: "#FFD700" }}>{bestScores[selectedMode]}</span>
          </div>
        </div>

        <button
          type="button"
          data-ocid="snake.primary_button"
          onClick={startGame}
          style={{
            width: W,
            padding: "14px",
            background: "linear-gradient(180deg, #6FAA46 0%, #4A7A28 100%)",
            border: "3px solid #8FCF5C",
            borderRadius: 8,
            color: "#fff",
            fontSize: "1rem",
            letterSpacing: "0.2em",
            cursor: "pointer",
            textShadow: "2px 2px 0 #1A3A08",
            boxShadow: "0 4px 0 #2A5010",
          }}
        >
          ▶ PLAY
        </button>

        <canvas
          ref={canvasRef}
          width={0}
          height={0}
          style={{ display: "none" }}
        />

        <style>{`
          @keyframes flashGold {
            from { opacity: 1; text-shadow: 0 0 10px #FFD700, 2px 2px 0 #AA6600; }
            to { opacity: 0.4; text-shadow: 0 0 20px #FFD700, 2px 2px 0 #AA6600; }
          }
        `}</style>
      </div>
    );
  }

  // ─── Playing screen ───────────────────────────────────────────────────────
  const skin = getSkin(selectedSkin);
  const currentMode = MODES.find((m) => m.id === selectedMode);
  const puIcon = hudPowerUp
    ? hudPowerUp.type === "star"
      ? "⭐"
      : hudPowerUp.type === "clock"
        ? "⏱"
        : hudPowerUp.type === "shield"
          ? "🛡"
          : "🍒"
    : null;

  const comboColor =
    hudCombo >= 3 ? "#FF3333" : hudCombo >= 2 ? "#FFD700" : "#FF8800";
  const comboGlow = hudCombo >= 3 ? "0 0 8px #FF3333" : undefined;

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {/* HUD */}
      <div
        data-ocid="snake.panel"
        style={{
          width: W,
          background: "rgba(0,0,0,0.7)",
          border: "2px solid #5D8A3C",
          borderRadius: 6,
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div>
          <div style={{ color: "#888", fontSize: "0.4rem" }}>SCORE</div>
          <div style={{ color: "#FFD700", fontSize: "0.85rem" }}>{score}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          {/* Level */}
          <div style={{ color: "#44FF88", fontSize: "0.45rem" }}>
            LVL {level}
          </div>
          {hudPowerUp && (
            <div
              style={{
                background: "rgba(255,200,0,0.15)",
                border: "1px solid #FFD700",
                borderRadius: 4,
                padding: "2px 6px",
                color: "#FFD700",
                fontSize: "0.45rem",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>{puIcon}</span>
              <span>{hudPowerUp.remaining}s</span>
            </div>
          )}
          {hudCombo > 0 && (
            <div
              style={{
                color: comboColor,
                fontSize: "0.5rem",
                fontWeight: "bold",
                textShadow: comboGlow,
                animation:
                  hudCombo >= 3
                    ? "comboGlow 0.4s infinite alternate"
                    : undefined,
              }}
            >
              +COMBO x{hudCombo + 1}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: skin.head, fontSize: "0.4rem" }}>
            {skin.label}
          </div>
          <div style={{ color: "#4FE0C8", fontSize: "0.38rem", marginTop: 2 }}>
            {currentMode?.label}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#888", fontSize: "0.4rem" }}>BEST</div>
          <div style={{ color: "#FFD700", fontSize: "0.85rem" }}>
            {bestScores[selectedMode]}
          </div>
        </div>

        {/* Trophy button */}
        <button
          type="button"
          data-ocid="snake.open_modal_button"
          onClick={() => {
            setLeaderboard(getLeaderboard());
            setShowLeaderboard((v) => !v);
          }}
          style={{
            padding: "4px 6px",
            background: showLeaderboard
              ? "rgba(255,215,0,0.2)"
              : "rgba(0,0,0,0.4)",
            border: `1px solid ${showLeaderboard ? "#FFD700" : "#555"}`,
            borderRadius: 4,
            color: showLeaderboard ? "#FFD700" : "#888",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
        >
          🏆
        </button>
      </div>

      {/* Canvas with leaderboard overlay */}
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-lg"
          style={{
            border: `3px solid ${skin.head}`,
            boxShadow: `0 0 12px ${skin.head}44`,
            display: "block",
          }}
          tabIndex={0}
        />

        {/* Leaderboard overlay */}
        {showLeaderboard && (
          <div
            data-ocid="snake.panel"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.92)",
              borderRadius: 8,
              padding: 20,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ color: "#FFD700", fontSize: "0.65rem" }}>
                🏆 LEADERBOARD
              </div>
              <button
                type="button"
                data-ocid="snake.close_button"
                onClick={() => setShowLeaderboard(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            {leaderboard.length === 0 ? (
              <div
                data-ocid="snake.empty_state"
                style={{
                  color: "#555",
                  fontSize: "0.45rem",
                  textAlign: "center",
                  marginTop: 60,
                }}
              >
                No scores yet!
                <br />
                <br />
                Play a game to get on the board.
              </div>
            ) : (
              leaderboard.map((e, i) => (
                <div
                  key={`${e.name}-${e.score}-${i}`}
                  data-ocid={`snake.item.${i + 1}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 4px",
                    borderBottom: "1px solid #222",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: i < 3 ? "#FFD700" : "#666",
                      fontSize: "0.45rem",
                      minWidth: 20,
                    }}
                  >
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : `#${i + 1}`}
                  </span>
                  <span style={{ color: "#fff", fontSize: "0.45rem", flex: 1 }}>
                    {e.name}
                  </span>
                  <span style={{ color: "#FFD700", fontSize: "0.5rem" }}>
                    {e.score}
                  </span>
                  <span
                    style={{
                      padding: "2px 5px",
                      background: `${modeColor[e.mode]}33`,
                      border: `1px solid ${modeColor[e.mode]}`,
                      borderRadius: 3,
                      color: modeColor[e.mode],
                      fontSize: "0.35rem",
                    }}
                  >
                    {e.mode}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 44px 44px",
          gridTemplateRows: "44px 44px",
          gap: 4,
          marginTop: 4,
        }}
      >
        <div />
        <button
          type="button"
          data-ocid="snake.toggle"
          onPointerDown={() => handleDpad("up")}
          style={dpadStyle}
        >
          ▲
        </button>
        <div />
        <button
          type="button"
          data-ocid="snake.toggle"
          onPointerDown={() => handleDpad("left")}
          style={dpadStyle}
        >
          ◀
        </button>
        <button
          type="button"
          data-ocid="snake.toggle"
          onPointerDown={() => handleDpad("down")}
          style={dpadStyle}
        >
          ▼
        </button>
        <button
          type="button"
          data-ocid="snake.toggle"
          onPointerDown={() => handleDpad("right")}
          style={dpadStyle}
        >
          ▶
        </button>
      </div>
      <div style={{ color: "#555", fontSize: "0.35rem", marginTop: 2 }}>
        P / ESC to pause
      </div>

      <style>{`
        @keyframes comboGlow {
          from { text-shadow: 0 0 6px #FF3333; }
          to { text-shadow: 0 0 14px #FF3333, 0 0 20px #FF0000; }
        }
      `}</style>
    </div>
  );
}

const dpadStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  background: "rgba(0,0,0,0.7)",
  border: "2px solid #444",
  borderRadius: 6,
  color: "#aaa",
  fontSize: "1rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  touchAction: "none",
};
