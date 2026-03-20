import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

type Pt = { x: number; y: number };

type GameMode = "classic" | "speedrun" | "portal" | "maze";

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
  { x: 16, y: 3 },
  { x: 15, y: 3 },
  { x: 16, y: 4 },
  { x: 3, y: 16 },
  { x: 4, y: 16 },
  { x: 3, y: 15 },
  { x: 16, y: 16 },
  { x: 15, y: 16 },
  { x: 16, y: 15 },
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 12, y: 7 },
  { x: 11, y: 7 },
  { x: 7, y: 12 },
  { x: 8, y: 12 },
  { x: 12, y: 12 },
  { x: 11, y: 12 },
];

function getBestKey(mode: GameMode) {
  return `snake_best_${mode}`;
}

function getBest(mode: GameMode): number {
  return Number.parseInt(localStorage.getItem(getBestKey(mode)) ?? "0", 10);
}

function setBest(mode: GameMode, score: number) {
  if (score > getBest(mode)) {
    localStorage.setItem(getBestKey(mode), String(score));
  }
}

function getSkin(id: string): SnakeSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

function rndFood(snake: Pt[], obstacles: Pt[]): Pt {
  let p: Pt;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (
    snake.some((s) => s.x === p.x && s.y === p.y) ||
    obstacles.some((o) => o.x === p.x && o.y === p.y)
  );
  return p;
}

function getTickInterval(score: number): number {
  return Math.max(60, 140 - Math.floor(score / 30) * 10);
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

export default function SnakeGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"setup" | "playing" | "gameover">("setup");
  const [selectedSkin, setSelectedSkin] = useState<string>("grass");
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");
  const [score, setScore] = useState(0);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [bestScores, setBestScores] = useState<Record<GameMode, number>>(
    () => ({
      classic: getBest("classic"),
      speedrun: getBest("speedrun"),
      portal: getBest("portal"),
      maze: getBest("maze"),
    }),
  );

  const gameRef = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ] as Pt[],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 8 } as Pt,
    score: 0,
    alive: true,
    mode: "classic" as GameMode,
    skinId: "grass",
  });
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onGameOver);
  cbRef.current = onGameOver;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;
    const skin = getSkin(g.skinId);
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];

    ctx.fillStyle = "#1A1209";
    ctx.fillRect(0, 0, W, H);

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

    if (g.mode === "maze") {
      for (const obs of obstacles) {
        drawBlock(ctx, obs.x * CELL, obs.y * CELL, CELL, "#6B6B6B", 1);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(obs.x * CELL + 5, obs.y * CELL + 5, 4, 4);
        ctx.fillRect(obs.x * CELL + 12, obs.y * CELL + 10, 3, 3);
      }
    }

    // Food - diamond block (cyan)
    drawBlock(ctx, g.food.x * CELL, g.food.y * CELL, CELL, "#4FE0C8", 3);
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

    // Snake
    g.snake.forEach((seg, i) => {
      const color = i === 0 ? skin.head : skin.body;
      drawBlock(ctx, seg.x * CELL, seg.y * CELL, CELL, color, 1);
      if (i === 0 && skin.hasEyes) {
        ctx.fillStyle = "#111";
        const ex = seg.x * CELL;
        const ey = seg.y * CELL;
        if (g.dir.x === 1) {
          ctx.fillRect(ex + 14, ey + 4, 3, 3);
          ctx.fillRect(ex + 14, ey + 12, 3, 3);
        } else if (g.dir.x === -1) {
          ctx.fillRect(ex + 3, ey + 4, 3, 3);
          ctx.fillRect(ex + 3, ey + 12, 3, 3);
        } else if (g.dir.y === -1) {
          ctx.fillRect(ex + 4, ey + 3, 3, 3);
          ctx.fillRect(ex + 12, ey + 3, 3, 3);
        } else {
          ctx.fillRect(ex + 4, ey + 14, 3, 3);
          ctx.fillRect(ex + 12, ey + 14, 3, 3);
        }
      }
    });
  }, []);

  const stopGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDeath = useCallback(
    (finalScore: number, mode: GameMode) => {
      setBest(mode, finalScore);
      setBestScores((prev) => ({
        ...prev,
        [mode]: Math.max(prev[mode], finalScore),
      }));
      setGameOverScore(finalScore);
      setScore(finalScore);
      stopGame();
      setTimeout(() => {
        setPhase("gameover");
        cbRef.current(finalScore);
      }, 600);
    },
    [stopGame],
  );

  const step = useCallback(() => {
    const g = gameRef.current;
    if (!g.alive) return;
    g.dir = g.nextDir;
    const head = g.snake[0];
    let nx = head.x + g.dir.x;
    let ny = head.y + g.dir.y;

    if (g.mode === "portal") {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      g.alive = false;
      draw();
      handleDeath(g.score, g.mode);
      return;
    }

    const nh = { x: nx, y: ny };
    const obstacles = g.mode === "maze" ? MAZE_OBSTACLES : [];

    if (
      g.snake.some((s) => s.x === nh.x && s.y === nh.y) ||
      obstacles.some((o) => o.x === nh.x && o.y === nh.y)
    ) {
      g.alive = false;
      draw();
      handleDeath(g.score, g.mode);
      return;
    }

    g.snake.unshift(nh);
    if (nh.x === g.food.x && nh.y === g.food.y) {
      g.score += 10;
      g.food = rndFood(g.snake, obstacles);
      setScore(g.score);
      if (g.mode === "speedrun" && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = window.setInterval(step, getTickInterval(g.score));
      }
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw, handleDeath]);

  const startGame = useCallback(() => {
    const obstacles = selectedMode === "maze" ? MAZE_OBSTACLES : [];
    gameRef.current = {
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: rndFood(
        [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        obstacles,
      ),
      score: 0,
      alive: true,
      mode: selectedMode,
      skinId: selectedSkin,
    };
    setScore(0);
    setPhase("playing");
  }, [selectedMode, selectedSkin]);

  useEffect(() => {
    if (phase !== "playing") return;
    draw();
    timerRef.current = window.setInterval(step, 140);

    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const d = g.dir;
      if (e.key === "ArrowUp" && d.y !== 1) g.nextDir = { x: 0, y: -1 };
      if (e.key === "ArrowDown" && d.y !== -1) g.nextDir = { x: 0, y: 1 };
      if (e.key === "ArrowLeft" && d.x !== 1) g.nextDir = { x: -1, y: 0 };
      if (e.key === "ArrowRight" && d.x !== -1) g.nextDir = { x: 1, y: 0 };
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      stopGame();
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, draw, step, stopGame]);

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
            <div style={{ color: "#FF4500", fontSize: "0.8rem", marginTop: 4 }}>
              GAME OVER — {gameOverScore} pts
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

        {/* Play button */}
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

        {/* Hidden canvas for skin preview reference */}
        <canvas
          ref={canvasRef}
          width={0}
          height={0}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  // Playing screen
  const skin = getSkin(selectedSkin);
  const currentMode = MODES.find((m) => m.id === selectedMode);
  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
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
        }}
      >
        <div>
          <div style={{ color: "#888", fontSize: "0.45rem" }}>SCORE</div>
          <div style={{ color: "#FFD700", fontSize: "0.9rem" }}>{score}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: skin.head, fontSize: "0.45rem" }}>
            {skin.label} Snake
          </div>
          <div style={{ color: "#4FE0C8", fontSize: "0.4rem", marginTop: 2 }}>
            {currentMode?.label}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#888", fontSize: "0.45rem" }}>BEST</div>
          <div style={{ color: "#FFD700", fontSize: "0.9rem" }}>
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
    </div>
  );
}
