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
type PowerUpType = "star" | "clock" | "cherry";

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

// 25x25 maze obstacles — spread proportionally
const MAZE_OBSTACLES: Pt[] = [
  // Corners
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
  // Mid clusters
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
  // Center cross arms
  { x: 12, y: 6 },
  { x: 12, y: 7 },
  { x: 12, y: 17 },
  { x: 12, y: 18 },
  { x: 6, y: 12 },
  { x: 7, y: 12 },
  { x: 17, y: 12 },
  { x: 18, y: 12 },
];

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
  paused: boolean;
  flashRed: number; // countdown flashes remaining
}

export default function SnakeGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"setup" | "playing" | "gameover">("setup");
  const [selectedSkin, setSelectedSkin] = useState<string>("grass");
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");
  const [score, setScore] = useState(0);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hudPowerUp, setHudPowerUp] = useState<{
    type: PowerUpType;
    remaining: number;
  } | null>(null);
  const [hudCombo, setHudCombo] = useState(0);
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
    paused: false,
    flashRed: 0,
  });

  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  // ─── Render loop ────────────────────────────────────────────────────────────
  const render = useCallback((timestamp: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;
    const skin = getSkin(g.skinId);
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];

    // Flash red death effect
    if (g.flashRed > 0) {
      const flashCycle = Math.floor((g.flashRed % 200) / 100);
      ctx.fillStyle = flashCycle === 0 ? "#CC0000" : "#1A1209";
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

    // Maze obstacles
    if (g.mode === "maze") {
      for (const obs of obstacles) {
        drawBlock(ctx, obs.x * CELL, obs.y * CELL, CELL, "#6B6B6B", 1);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(obs.x * CELL + 5, obs.y * CELL + 5, 4, 4);
        ctx.fillRect(obs.x * CELL + 12, obs.y * CELL + 10, 3, 3);
      }
    }

    // Animated food — pulse scale 0.8→1.0
    const pulseCycle = (Math.sin(timestamp / 300) + 1) / 2; // 0..1
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
    // cross highlight
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
      const age = Date.now() - pu.spawnedAt;
      // Blink when about to expire (last 3s)
      const visible = age < 7000 || Math.floor(age / 250) % 2 === 0;
      if (visible) {
        if (pu.type === "star") {
          ctx.save();
          ctx.shadowColor = "#FFD700";
          ctx.shadowBlur = 10;
          drawBlock(ctx, px, py, CELL, "#FFD700", 2);
          ctx.restore();
          // star icon — simple star dots
          ctx.fillStyle = "#FFF8";
          ctx.font = "bold 12px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", px + CELL / 2, py + CELL / 2);
        } else if (pu.type === "clock") {
          ctx.save();
          ctx.shadowColor = "#4488FF";
          ctx.shadowBlur = 10;
          drawBlock(ctx, px, py, CELL, "#2255CC", 2);
          ctx.restore();
          ctx.fillStyle = "#FFF8";
          ctx.font = "bold 12px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⏱", px + CELL / 2, py + CELL / 2);
        } else {
          ctx.save();
          ctx.shadowColor = "#FF3333";
          ctx.shadowBlur = 10;
          drawBlock(ctx, px, py, CELL, "#CC2222", 2);
          ctx.restore();
          ctx.fillStyle = "#FFF8";
          ctx.font = "bold 12px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🍒", px + CELL / 2, py + CELL / 2 + 1);
        }
      }
    }

    // Snake
    const isGoldFlash =
      g.activePowerUp === "star" && Math.floor(Date.now() / 150) % 2 === 0;
    g.snake.forEach((seg, i) => {
      let color = i === 0 ? skin.head : skin.body;
      if (isGoldFlash) color = i === 0 ? "#FFD700" : "#DAA520";
      drawBlock(ctx, seg.x * CELL, seg.y * CELL, CELL, color, 1);
      if (i === 0 && skin.hasEyes) {
        ctx.fillStyle = "#111";
        const ex = seg.x * CELL;
        const ey = seg.y * CELL;
        const d = g.dir;
        if (d.x === 1) {
          ctx.fillRect(ex + 14, ey + 4, 3, 3);
          ctx.fillRect(ex + 14, ey + 12, 3, 3);
        } else if (d.x === -1) {
          ctx.fillRect(ex + 3, ey + 4, 3, 3);
          ctx.fillRect(ex + 3, ey + 12, 3, 3);
        } else if (d.y === -1) {
          ctx.fillRect(ex + 4, ey + 3, 3, 3);
          ctx.fillRect(ex + 12, ey + 3, 3, 3);
        } else {
          ctx.fillRect(ex + 4, ey + 14, 3, 3);
          ctx.fillRect(ex + 12, ey + 14, 3, 3);
        }
      }
    });

    // Floating texts
    const now = Date.now();
    g.floatingTexts = g.floatingTexts.filter((ft) => now - ft.born < 1000);
    for (const ft of g.floatingTexts) {
      const age = now - ft.born;
      const alpha = 1 - age / 1000;
      const yOff = (age / 1000) * 30;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#FF8800";
      ctx.shadowBlur = 6;
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
      setScore(finalScore);
      setIsNewBest(newBest);
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
    timerRef.current = window.setInterval(() => step(), interval);
  }, []); // eslint-disable-line

  const step = useCallback(() => {
    const g = gameRef.current;
    if (!g.alive || g.paused) return;
    g.dir = g.nextDir;
    const head = g.snake[0];
    let nx = head.x + g.dir.x;
    let ny = head.y + g.dir.y;

    if (g.mode === "portal") {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
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
      return;
    }

    const nh = { x: nx, y: ny };
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];

    if (
      g.snake.some((s) => s.x === nh.x && s.y === nh.y) ||
      obstacles.some((o) => o.x === nh.x && o.y === nh.y)
    ) {
      g.alive = false;
      g.flashRed = 600;
      const flashStart2 = Date.now();
      const doFlash2 = () => {
        const elapsed = Date.now() - flashStart2;
        g.flashRed = Math.max(0, 600 - elapsed);
        if (g.flashRed > 0) setTimeout(doFlash2, 50);
        else handleDeath(g.score, g.mode);
      };
      setTimeout(doFlash2, 50);
      return;
    }

    g.snake.unshift(nh);
    const now = Date.now();

    // Power-up expiry check
    if (g.activePowerUp && now > g.powerUpExpiry) {
      g.activePowerUp = null;
      g.scoreMultiplier = 1;
      g.slowActive = false;
      setHudPowerUp(null);
      // restart timer at normal speed
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

    // Check pick up power-up
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
        restartTimer(240); // slow
      } else {
        // cherry — instant +30
        g.score += 30;
        setScore(g.score);
        g.floatingTexts.push({
          text: "+30 CHERRY!",
          x: nh.x * CELL + CELL / 2,
          y: nh.y * CELL,
          born: now,
        });
      }
    }

    // Power-up board lifespan
    if (g.powerUp && now - g.powerUp.spawnedAt > 10000) {
      g.powerUp = null;
    }

    // Eat food?
    if (nh.x === g.food.x && nh.y === g.food.y) {
      // Combo check
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

      if (g.combo > 0) {
        g.floatingTexts.push({
          text: `+${comboBonus} COMBO!`,
          x: nh.x * CELL + CELL / 2,
          y: nh.y * CELL - 10,
          born: now,
        });
      }

      setScore(g.score);
      setHudCombo(g.combo);

      g.food = rndPos(g.snake, obstacles, g.powerUp?.pos);

      // Maybe spawn power-up
      if (!g.powerUp && Math.random() < 0.3) {
        const types: PowerUpType[] = ["star", "clock", "cherry"];
        const t = types[Math.floor(Math.random() * types.length)];
        g.powerUp = {
          type: t,
          pos: rndPos(g.snake, obstacles, g.food),
          spawnedAt: now,
        };
      }

      // Speed run tick update
      if (g.mode === "speedrun" && !g.slowActive) {
        restartTimer(getSpeedrunTick(g.foodEaten));
      }
    } else {
      g.snake.pop();
      // Combo timeout reset
      if (g.lastEatTime > 0 && now - g.lastEatTime > 3000 && g.combo > 0) {
        g.combo = 0;
        setHudCombo(0);
      }
    }
  }, [handleDeath, restartTimer]);

  // keep restartTimer referencing latest step via ref
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
      paused: false,
      flashRed: 0,
    };
    setScore(0);
    setHudCombo(0);
    setHudPowerUp(null);
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

  // ─── Setup / Game Over screen ────────────────────────────────────────────────
  if (phase === "setup" || phase === "gameover") {
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
            </div>
          )}
        </div>

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

  // ─── Playing screen ──────────────────────────────────────────────────────────
  const skin = getSkin(selectedSkin);
  const currentMode = MODES.find((m) => m.id === selectedMode);
  const puIcon = hudPowerUp
    ? hudPowerUp.type === "star"
      ? "⭐"
      : hudPowerUp.type === "clock"
        ? "⏱"
        : "🍒"
    : null;

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
          gap: 8,
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
          {hudCombo > 1 && (
            <div style={{ color: "#FF8800", fontSize: "0.45rem" }}>
              x{hudCombo + 1} COMBO
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
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg"
        style={{
          border: `3px solid ${skin.head}`,
          boxShadow: `0 0 12px ${skin.head}44`,
        }}
        tabIndex={0}
      />

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
