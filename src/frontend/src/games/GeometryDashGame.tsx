import { useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;
const GROUND_Y = 240;
const BLOCK_SIZE = 32;
const PLAYER_X = 80;

type Obstacle =
  | { kind: "spike"; x: number; width: number; height: number }
  | { kind: "pillar"; x: number; width: number; height: number };

interface GameState {
  phase: "idle" | "running" | "over";
  playerY: number;
  playerVY: number;
  onGround: boolean;
  score: number;
  speed: number;
  frame: number;
  obstacles: Obstacle[];
  nextObstacleIn: number;
  deathFrame: number;
}

function makeState(): GameState {
  return {
    phase: "idle",
    playerY: GROUND_Y - BLOCK_SIZE,
    playerVY: 0,
    onGround: true,
    score: 0,
    speed: 3.5,
    frame: 0,
    obstacles: [],
    nextObstacleIn: 80,
    deathFrame: 0,
  };
}

function drawBlockFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.fillStyle = "#7C5230";
  ctx.fillRect(x, y, size, size);

  const grassH = Math.round(size * 0.28);
  ctx.fillStyle = "#5D8A2C";
  ctx.fillRect(x, y, size, grassH);

  ctx.fillStyle = "#6a9e32";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 4 + i * 9, y + 1, 5, 3);
  }

  ctx.strokeStyle = "#1a0e00";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + size - 2);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + size - 2, y + 2);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 6, y + grassH + 4, 7, 7);
  ctx.fillRect(x + size - 13, y + grassH + 4, 7, 7);
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 8, y + grassH + 6, 3, 3);
  ctx.fillRect(x + size - 11, y + grassH + 6, 3, 3);
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w / 2 - 4, baseY - h + 10);
  ctx.lineTo(x + w / 2, baseY - h + 6);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPillar(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  const blockH = 20;
  const numBlocks = Math.ceil(h / blockH);
  for (let i = 0; i < numBlocks; i++) {
    const by = baseY - (i + 1) * blockH;
    ctx.fillStyle = i % 2 === 0 ? "#666" : "#595959";
    ctx.fillRect(x, by, w, blockH);
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, by + 0.5, w - 1, blockH - 1);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(x + 4, by + blockH / 2);
    ctx.lineTo(x + w - 4, by + blockH / 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x, baseY - h, w, 3);
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  const blockW = 40;
  const numBlocks = Math.ceil(CANVAS_WIDTH / blockW) + 2;
  const startBlock = Math.floor(offset / blockW);

  for (let i = startBlock; i < startBlock + numBlocks; i++) {
    const bx = i * blockW - (offset % blockW);
    ctx.fillStyle = i % 2 === 0 ? "#555" : "#4a4a4a";
    ctx.fillRect(bx, GROUND_Y, blockW, CANVAS_HEIGHT - GROUND_Y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      bx + 0.5,
      GROUND_Y + 0.5,
      blockW - 1,
      CANVAS_HEIGHT - GROUND_Y - 1,
    );
    ctx.fillStyle = "#5D8A2C";
    ctx.fillRect(bx, GROUND_Y, blockW, 5);
    ctx.fillStyle = "#4a7020";
    ctx.fillRect(bx + 2, GROUND_Y, 8, 3);
    ctx.fillRect(bx + 20, GROUND_Y, 8, 3);
  }
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(`SCORE: ${score}`, 12, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`SCORE: ${score}`, 11, 25);
}

function drawBackground(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = "#2d2d2d";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  const offsetX = offset % gridSize;
  for (let x = -offsetX; x < CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  for (let y = 0; y < GROUND_Y; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

export default function GeometryDashGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeState());
  const rafRef = useRef<number>(0);
  const groundOffsetRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const offset = groundOffsetRef.current;

    drawBackground(ctx, offset);
    drawGround(ctx, offset);

    for (const obs of s.obstacles) {
      if (obs.kind === "spike") {
        drawSpike(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      } else {
        drawPillar(ctx, obs.x, GROUND_Y, obs.width, obs.height);
      }
    }

    const wobble = s.phase === "over" ? Math.sin(s.deathFrame * 0.5) * 4 : 0;
    drawBlockFace(ctx, PLAYER_X + wobble, s.playerY, BLOCK_SIZE);

    drawScore(ctx, s.score);

    if (s.phase === "idle") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.textAlign = "center";
      ctx.fillText(
        "PRESS SPACE TO START",
        CANVAS_WIDTH / 2 + 1,
        CANVAS_HEIGHT / 2 - 9,
      );
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        "PRESS SPACE TO START",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 10,
      );
      ctx.font = "12px monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(
        "or click the canvas",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 16,
      );
      ctx.textAlign = "left";
    }

    if (s.phase === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.textAlign = "center";
      ctx.font = "bold 22px monospace";
      ctx.fillStyle = "#E53935";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24);
      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(
        `SCORE: ${s.score}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 4,
      );
      ctx.font = "11px monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(
        "Press Space or click to restart",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 28,
      );
      ctx.textAlign = "left";
    }
  }, []);

  const spawnObstacle = useCallback((state: GameState) => {
    const isSpike = Math.random() < 0.55;
    if (isSpike) {
      const w = 28 + Math.random() * 16;
      const h = 32 + Math.random() * 28;
      state.obstacles.push({
        kind: "spike",
        x: CANVAS_WIDTH + 20,
        width: w,
        height: h,
      });
    } else {
      const w = 32 + Math.random() * 16;
      const h = 48 + Math.random() * 64;
      state.obstacles.push({
        kind: "pillar",
        x: CANVAS_WIDTH + 20,
        width: w,
        height: h,
      });
    }
  }, []);

  const checkCollision = useCallback((state: GameState): boolean => {
    const px = PLAYER_X;
    const py = state.playerY;
    const pw = BLOCK_SIZE - 4;
    const ph = BLOCK_SIZE - 4;
    const margin = 4;

    for (const obs of state.obstacles) {
      if (obs.kind === "spike") {
        const ox = obs.x + margin;
        const oy = GROUND_Y - obs.height;
        const ow = obs.width - margin * 2;
        const oh = obs.height;
        if (
          px + margin < ox + ow &&
          px + pw - margin > ox &&
          py + margin < oy + oh &&
          py + ph - margin > oy
        ) {
          return true;
        }
      } else {
        const ox = obs.x;
        const oy = GROUND_Y - obs.height;
        const ow = obs.width;
        const oh = obs.height;
        if (
          px + margin < ox + ow &&
          px + pw - margin > ox &&
          py + margin < oy + oh &&
          py + ph - margin > oy
        ) {
          return true;
        }
      }
    }
    return false;
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "running") {
      if (s.phase === "over") {
        s.deathFrame++;
        draw();
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    s.frame++;
    s.score = Math.floor(s.frame / 10);
    s.speed = 3.5 + s.frame * 0.0015;

    const GRAVITY = 0.65;
    s.playerVY += GRAVITY;
    s.playerY += s.playerVY;

    if (s.playerY >= GROUND_Y - BLOCK_SIZE) {
      s.playerY = GROUND_Y - BLOCK_SIZE;
      s.playerVY = 0;
      s.onGround = true;
    } else {
      s.onGround = false;
    }

    groundOffsetRef.current += s.speed;

    for (const obs of s.obstacles) {
      obs.x -= s.speed;
    }
    s.obstacles = s.obstacles.filter((o) => o.x + (o.width || 40) > -20);

    s.nextObstacleIn--;
    if (s.nextObstacleIn <= 0) {
      spawnObstacle(s);
      s.nextObstacleIn = Math.max(
        55,
        Math.floor(120 - s.frame * 0.05) + Math.random() * 40,
      );
    }

    if (checkCollision(s)) {
      s.phase = "over";
      s.deathFrame = 0;
      onGameOver(s.score);
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, spawnObstacle, checkCollision, onGameOver]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "idle" || s.phase === "over") {
      stateRef.current = makeState();
      stateRef.current.phase = "running";
      groundOffsetRef.current = 0;
      return;
    }
    if (s.onGround) {
      s.playerVY = -13;
      s.onGround = false;
    }
  }, []);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
    };
  }, [draw, tick, jump]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        jump();
      }
    },
    [jump],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={jump}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Geometry Dash game. Press Space or click to jump."
        data-ocid="geometry_dash.canvas_target"
        style={{
          cursor: "pointer",
          border: "2px solid #5D8A2C",
          borderRadius: 4,
          display: "block",
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
